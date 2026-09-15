# Учебный разбор серверных эндпоинтов

Этот документ разбирает три разных типа HTTP-операций в DomObmen:

1. `POST /api/v1/auth/login` — публичная команда с DTO, rate limit, паролем, JWT и cookie.
2. `GET /api/v1/properties/locations?q=Москва` — публичный запрос на чтение и преобразование данных.
3. `PUT /api/v1/favorites/:propertyId` — защищённая идемпотентная команда с JWT, параметром пути и записью в БД.

Мы не добавляем учебные комментарии в рабочие классы: они быстро устаревают и мешают читать production-код. Ниже приведены копии важных фрагментов с комментариями почти к каждой значимой строке.

## Как NestJS получает итоговый URL

В `main.ts` задан общий префикс:

```ts
// Все HTTP-маршруты приложения начинаются с /api.
app.setGlobalPrefix('api');

// Версия API добавляется в URL; версия по умолчанию — 1.
app.enableVersioning({
  // URI-вариант означает, что версия выглядит как /v1.
  type: VersioningType.URI,
  // Контроллер без отдельной версии будет относиться к v1.
  defaultVersion: '1',
});
```

Поэтому контроллер с `path: 'auth'`, версией `1` и методом `@Post('login')` получает адрес:

```text
/api + /v1 + /auth + /login = POST /api/v1/auth/login
```

Глобальный `ValidationPipe` применяется ко всем DTO:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    // Удаляет поля, которых нет в DTO.
    whitelist: true,
    // Преобразует входные значения в типы DTO, когда это возможно.
    transform: true,
    // Не просто удаляет лишние поля, а отвечает ошибкой 400 при их наличии.
    forbidNonWhitelisted: true,
  }),
);
```

---

## 1. Вход: `POST /api/v1/auth/login`

### Запрос и ответ

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "oleg@example.com",
  "password": "StrongPassword123"
}
```

Успешный ответ имеет код `200`, возвращает короткоживущий `accessToken` и пользователя. `refreshToken` не попадает в JSON: сервер записывает его в защищённую cookie.

### DTO: проверка тела запроса

```ts
// Класс описывает допустимое тело запроса.
export class LoginDto {
  // Добавляет поле и пример в Swagger-документацию.
  @ApiProperty({ example: 'anna@example.com' })
  // class-validator проверяет корректный формат email.
  @IsEmail()
  // ! сообщает TypeScript, что поле заполнит ValidationPipe.
  email!: string;

  // Документирует пароль в Swagger.
  @ApiProperty({ example: 'StrongPassword123' })
  // Проверяет, что пароль пришёл строкой.
  @IsString()
  // Реальное значение появится после разбора JSON.
  password!: string;
}
```

Здесь DTO проверяет только тип пароля. Требования к сложности нужны при регистрации и смене пароля, но не при входе: старый сохранённый пароль должен просто пройти проверку хеша.

### Контроллер: HTTP-слой

```ts
// Группирует методы контроллера в разделе auth в Swagger.
@ApiTags('auth')
// Задаёт часть пути /auth и версию /v1.
@Controller({ path: 'auth', version: '1' })
// Экспорт позволяет подключить контроллер в AuthModule.
export class AuthController {
  // NestJS передаёт зависимости через конструктор.
  constructor(
    // AuthService содержит бизнес-логику авторизации.
    private readonly auth: AuthService,
    // ConfigService читает настройки cookie и окружения.
    private readonly config: ConfigService,
    // RateLimitService защищает вход от перебора паролей.
    private readonly rateLimit: RateLimitService,
  ) {}

  // Регистрирует обработчик POST /api/v1/auth/login.
  @Post('login')
  // Явно устанавливает успешный HTTP-код 200, а не стандартный для POST код 201.
  @HttpCode(HttpStatus.OK)
  // Показывает назначение операции в Swagger.
  @ApiOperation({ summary: 'Вход по email и паролю' })
  // async нужен, потому что лимит, БД и криптография асинхронны.
  async login(
    // @Body берёт JSON-тело и прогоняет его через LoginDto и ValidationPipe.
    @Body() dto: LoginDto,
    // @Req предоставляет Express-запрос: IP, заголовки и cookie.
    @Req() request: Request,
    // passthrough разрешает менять ответ, но оставить сериализацию результата NestJS.
    @Res({ passthrough: true }) response: Response,
  ) {
    // До дорогой проверки пароля ограничиваем частоту попыток по IP и email.
    await this.limitLogin(request, dto.email);
    // Передаём проверенные данные и сведения об устройстве в бизнес-слой.
    const result = await this.auth.login(dto, this.metadata(request));
    // Refresh token кладём в httpOnly cookie, недоступную JavaScript в браузере.
    this.setRefreshCookie(response, result.refreshToken);
    // Деструктуризация отделяет refreshToken от остальных полей результата.
    // Имя _ показывает, что извлечённое значение намеренно не используется.
    const { refreshToken: _, ...body } = result;
    // NestJS сериализует body в JSON и отправляет клиенту.
    return body;
  }
}
```

### Ограничение попыток входа

```ts
private limitLogin(request: Request, email: string) {
  // Обе проверки выполняются параллельно; запрос продолжится, только если прошли обе.
  return Promise.all([
    // Один IP может сделать до 30 попыток за 15 минут.
    this.rateLimit.consume('login-ip', request.ip, 30, 15 * 60),
    // Для одного email разрешено до 10 попыток за 15 минут с любых IP.
    this.rateLimit.consume('login-email', email, 10, 15 * 60),
  ]);
}
```

Два ограничения нужны против разных атак: перебора множества аккаунтов с одного адреса и перебора одного аккаунта с множества адресов.

### Сервис: проверка пользователя

```ts
// Метод получает уже провалидированный DTO и метаданные сессии.
async login(dto: LoginDto, metadata: SessionMetadata) {
  // Убираем пробелы и приводим email к единому регистру для стабильного поиска.
  const email = dto.email.trim().toLocaleLowerCase('ru');
  // Ищем пользователя по уникальному email.
  const user = await this.prisma.user.findUnique({
    // Prisma построит условие WHERE email = ... .
    where: { email },
    // Профиль нужен для ответа, pointAccount — для текущего баланса.
    include: { profile: true, pointAccount: true },
  });
  // Если пользователя нет ИЛИ Argon2 не подтвердил пароль, вход запрещён.
  if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
    // Одинаковый текст не позволяет атакующему узнать, существует ли такой email.
    throw new UnauthorizedException('Неверный email или пароль');
  }
  // Даже с правильным паролем заблокированный аккаунт не может войти.
  if (user.status !== 'ACTIVE') {
    throw new UnauthorizedException('Аккаунт ограничен');
  }

  // Обновляем время последней активности для аудита и интерфейса.
  await this.prisma.user.update({
    // Изменяем только найденного пользователя.
    where: { id: user.id },
    // new Date() фиксирует серверное время успешного входа.
    data: { lastActiveAt: new Date() },
  });
  // Создаём запись сессии, refresh token и access token.
  const tokens = await this.createSession(user.id, metadata);
  // Объединяем токены с безопасным представлением пользователя.
  return { ...tokens, user: this.presentUser(user) };
}
```

Проверка `!user || ...` использует short-circuit: если пользователя нет, правая часть с `user.passwordHash` не выполняется и ошибка обращения к `null` не возникает.

### Создание сессии и токенов

```ts
private async createSession(userId: string, metadata: SessionMetadata) {
  // Генерируем UUID, который свяжет JWT с записью сессии в БД.
  const sessionId = randomUUID();
  // Refresh-сессия живёт 30 суток; значение здесь задано в секундах.
  const refreshExpiresInSeconds = 30 * 24 * 60 * 60;
  // Подписываем refresh JWT.
  const refreshToken = await this.jwt.signAsync<RefreshPayload>(
    // sub — стандартное JWT-поле subject; type не даёт спутать два вида токенов.
    { sub: userId, sessionId, type: 'refresh' },
    {
      // Отдельный секрет из окружения используется только для refresh token.
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      // Библиотека добавит время истечения токена.
      expiresIn: refreshExpiresInSeconds,
    },
  );
  // Сохраняем серверную часть сессии.
  await this.prisma.userSession.create({
    data: {
      // ID в БД совпадает с sessionId внутри обоих JWT.
      id: sessionId,
      // Сессия принадлежит вошедшему пользователю.
      userId,
      // В БД хранится дорогой Argon2-хеш, а не сам refresh token.
      refreshTokenHash: await argon2.hash(refreshToken, { type: argon2.argon2id }),
      // Ограничиваем длину непроверенного заголовка User-Agent.
      userAgent: metadata.userAgent?.slice(0, 500),
      // IP хешируется, чтобы не хранить его открытым текстом.
      ipHash: metadata.ip ? this.hashCode(metadata.ip) : null,
      // Срок записи в БД совпадает со сроком refresh JWT.
      expiresAt: new Date(Date.now() + refreshExpiresInSeconds * 1000),
    },
  });
  // Формируем payload короткоживущего access token.
  const accessPayload: AccessTokenPayload = { sub: userId, sessionId, type: 'access' };
  // Подписываем access JWT другим секретом.
  const accessToken = await this.jwt.signAsync(accessPayload, {
    // Компрометация одного секрета не должна автоматически раскрывать второй.
    secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    // Access token действует 15 минут.
    expiresIn: '15m',
  });
  // 900 — те же 15 минут в секундах; клиент знает, когда обновлять токен.
  return { accessToken, refreshToken, expiresIn: 900 };
}
```

### Cookie refresh token

```ts
private setRefreshCookie(response: Response, token: string) {
  // Express добавляет заголовок Set-Cookie к HTTP-ответу.
  response.cookie('refreshToken', token, {
    // Подставляем общие параметры безопасности.
    ...this.cookieOptions(),
    // Браузер хранит cookie максимум 30 дней.
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

private cookieOptions() {
  return {
    // JavaScript на странице не может прочитать refresh token.
    httpOnly: true,
    // В production cookie отправляется только по HTTPS.
    secure: this.config.get<string>('NODE_ENV') === 'production',
    // Браузер не отправляет cookie в cross-site запросах.
    sameSite: 'strict' as const,
    // Cookie доступна только auth-маршрутам, а не всему API.
    path: '/api/v1/auth',
  };
}
```

### Возможные ответы

| Код | Причина |
| --- | --- |
| `200` | Вход выполнен, access token находится в JSON, refresh token — в cookie |
| `400` | Невалидный email, неверный тип поля или лишнее поле |
| `401` | Неверные данные или аккаунт ограничен |
| `429` | Превышен лимит попыток входа |

---

## 2. Подсказки локаций: `GET /api/v1/properties/locations`

Это публичный read-only endpoint. Ему не нужны JWT, DTO тела или транзакция.

### Контроллер

```ts
// Все методы класса начинаются с /api/v1/properties.
@Controller({ path: 'properties', version: '1' })
class PropertiesController {
  // NestJS внедряет экземпляр PropertiesService.
  constructor(private readonly properties: PropertiesService) {}

  // Регистрирует GET /api/v1/properties/locations.
  @Get('locations')
  // Описание появляется в Swagger UI.
  @ApiOperation({ summary: 'Подсказки городов, регионов и стран' })
  // @Query('q') извлекает только параметр q; вопросительный знак делает его необязательным.
  locations(@Query('q') query?: string) {
    // Контроллер ничего не знает о Prisma и делегирует работу сервису.
    return this.properties.listPublicLocations(query);
  }
}
```

Запрос без `q` возвращает первые варианты. Запрос `?q=мос` фильтрует города, регионы и страны без учёта регистра.

### Сервис и Prisma

```ts
async listPublicLocations(rawQuery?: string) {
  // Флаг окружения управляет видимостью тестовых объявлений.
  const includeFake = this.config.get<string>('INCLUDE_FAKE_PROPERTIES', 'false') === 'true';
  // Берём текст до первой запятой, удаляем пробелы и ограничиваем длину 80 символами.
  const query = rawQuery?.split(',')[0].trim().slice(0, 80);
  // Запрашиваем адреса объявлений через Prisma.
  const addresses = await this.prisma.propertyAddress.findMany({
    where: {
      // Фильтр идёт через relation PropertyAddress -> Property.
      property: {
        // В подсказках участвуют только опубликованные объявления.
        status: PropertyStatus.PUBLISHED,
        // Мягко удалённые объявления исключаются.
        deletedAt: null,
        // undefined говорит Prisma не добавлять условие isFake вообще.
        isFake: includeFake ? undefined : false,
      },
      // Если query пустой, OR становится undefined и текстовый фильтр не применяется.
      OR: query
        ? [
            // contains соответствует поиску подстроки; insensitive игнорирует регистр.
            { city: { contains: query, mode: 'insensitive' } },
            // Совпадение может быть найдено по региону.
            { region: { contains: query, mode: 'insensitive' } },
            // Или по стране.
            { country: { contains: query, mode: 'insensitive' } },
          ]
        : undefined,
    },
    // Из БД забираются только поля, необходимые для подсказок.
    select: { city: true, region: true, country: true },
    // Убираем полностью одинаковые тройки город–регион–страна на уровне БД.
    distinct: ['city', 'region', 'country'],
    // Получаем стабильный порядок результатов.
    orderBy: [{ country: 'asc' }, { city: 'asc' }],
  });
  // Set автоматически удалит одинаковые готовые строки.
  const labels = new Set<string>();
  // Проходим по каждому уникальному адресу.
  for (const address of addresses) {
    // Добавляем вариант «Москва, Россия».
    labels.add(`${address.city}, ${address.country}`);
    // Регион может быть null, поэтому добавляем его только при наличии.
    if (address.region) labels.add(`${address.region}, ${address.country}`);
    // Отдельно добавляем страну.
    labels.add(address.country);
  }
  // Превращаем Set обратно в массив.
  return [...labels]
    // Повторная фильтрация нужна для составных строк, созданных уже после SQL-запроса.
    .filter((label) => !query || label.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')))
    // Сортируем готовые русскоязычные подписи по локали ru.
    .sort((left, right) => left.localeCompare(right, 'ru'))
    // Autocomplete получает максимум 20 вариантов.
    .slice(0, 20);
}
```

### Почему фильтрация выполняется дважды

Prisma сначала выбирает адрес, если запрос совпал хотя бы с одним из трёх полей. Затем код создаёт из одного адреса сразу несколько подписей. Например, совпавший город мог бы породить несвязанную подсказку страны. Финальный `.filter()` оставляет только готовые подписи, которые сами содержат введённый текст.

### Возможные ответы

| Код | Причина |
| --- | --- |
| `200` | Массив строк; пустой массив тоже является успешным ответом |
| `500` | База данных или сервер недоступны |

---

## 3. Добавление в избранное: `PUT /api/v1/favorites/:propertyId`

Пример запроса:

```http
PUT /api/v1/favorites/cc219af5-2c4c-4072-b8f5-cd5a29ddfb67
Authorization: Bearer <accessToken>
```

Метод `PUT` выбран потому, что операция идемпотентна: повторный запрос оставляет ресурс в том же состоянии «добавлено в избранное» и не создаёт дубликаты.

### Контроллер и авторизация

```ts
// Объединяет endpoints в секцию favorites в Swagger.
@ApiTags('favorites')
// Сообщает Swagger, что методы ожидают Bearer access token.
@ApiBearerAuth()
// Guard применяется сразу ко всем методам контроллера.
@UseGuards(JwtAuthGuard)
// Формирует базовый путь /api/v1/favorites.
@Controller({ path: 'favorites', version: '1' })
class FavoritesController {
  // Внедряем бизнес-логику избранного.
  constructor(private readonly favorites: FavoritesService) {}

  // :propertyId — динамический сегмент URL.
  @Put(':propertyId')
  // Документирует операцию.
  @ApiOperation({ summary: 'Добавить объявление в избранное' })
  add(
    // После Guard в request.user находится payload проверенного access token.
    @Req() request: Request & AuthenticatedRequest,
    // @Param извлекает propertyId, а ParseUUIDPipe отклоняет невалидный UUID.
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    // sub — ID текущего пользователя; брать userId из тела запроса небезопасно.
    return this.favorites.add(request.user.sub, propertyId);
  }
}
```

### Что делает `JwtAuthGuard`

```ts
// Guard доступен системе dependency injection NestJS.
@Injectable()
// Стандартный Passport AuthGuard запускает стратегию с именем jwt.
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

Стратегия извлекает и проверяет токен:

```ts
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    // ConfigService предоставляет секрет подписи.
    config: ConfigService,
    // Prisma нужен для проверки, что сессия всё ещё активна.
    private readonly prisma: PrismaService,
  ) {
    // Настраиваем passport-jwt.
    super({
      // Читаем JWT из заголовка Authorization: Bearer ... .
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Проверяем подпись секретом access token.
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      // Истёкший JWT автоматически отклоняется.
      ignoreExpiration: false,
    });
  }

  // validate запускается только после успешной проверки подписи и срока JWT.
  async validate(payload: AccessTokenPayload) {
    // Проверяем назначение токена и обязательные идентификаторы.
    if (payload.type !== 'access' || !payload.sub || !payload.sessionId) {
      throw new UnauthorizedException('Некорректный access token');
    }
    // JWT может быть корректным, но сессия уже могла завершиться.
    const session = await this.prisma.userSession.findFirst({
      where: {
        // Сессия из БД должна совпадать с payload токена.
        id: payload.sessionId,
        // Сессия должна принадлежать тому же пользователю.
        userId: payload.sub,
        // logout устанавливает revokedAt, поэтому активная сессия имеет null.
        revokedAt: null,
        // Сервер дополнительно проверяет срок сессии в БД.
        expiresAt: { gt: new Date() },
        // Заблокированный или удалённый пользователь не проходит Guard.
        user: { status: 'ACTIVE', deletedAt: null },
      },
      // Нужен только факт существования, поэтому выбираем одно маленькое поле.
      select: { id: true },
    });
    // Отсутствие записи означает завершённую или недействительную сессию.
    if (!session) throw new UnauthorizedException('Сессия завершена');
    // Passport положит возвращённый payload в request.user.
    return payload;
  }
}
```

### Сервис и запись в БД

```ts
async add(userId: string, propertyId: string) {
  // Сначала убеждаемся, что объявление доступно пользователю.
  const property = await this.prisma.property.findFirst({
    where: {
      // ID пришёл из URL и уже проверен ParseUUIDPipe.
      id: propertyId,
      // Нельзя добавить черновик, скрытое или отклонённое объявление.
      status: PropertyStatus.PUBLISHED,
      // Нельзя добавить мягко удалённое объявление.
      deletedAt: null,
    },
    // Для следующих проверок нужны только ID объявления и владельца.
    select: { id: true, ownerId: true },
  });
  // Одинаковый 404 не раскрывает детали непубличного объявления.
  if (!property) throw new NotFoundException('Объявление не найдено');
  // Собственное жильё не добавляется; это не ошибка запроса.
  if (property.ownerId === userId) return { favorite: false };
  // upsert означает «создай, если нет; иначе обнови существующее».
  await this.prisma.favorite.upsert({
    // Составной первичный ключ однозначно находит пару пользователь–объявление.
    where: { userId_propertyId: { userId, propertyId } },
    // При отсутствии строки создаём связь.
    create: { userId, propertyId },
    // При наличии строки ничего менять не требуется.
    update: {},
  });
  // Клиент получает подтверждение итогового состояния.
  return { favorite: true };
}
```

Составной ключ в Prisma гарантирует отсутствие дубликатов даже при двух одновременных запросах:

```prisma
model Favorite {
  // Первая часть ключа и внешний ключ на User.
  userId     String   @db.Uuid
  // Вторая часть ключа и внешний ключ на Property.
  propertyId String   @db.Uuid
  // Время создания связи выставляет база данных.
  createdAt  DateTime @default(now())
  // При удалении пользователя его избранное удаляется каскадно.
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // При удалении объявления соответствующее избранное тоже удаляется.
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  // Пара полей является первичным ключом и всегда уникальна.
  @@id([userId, propertyId])
}
```

### Возможные ответы

| Код | Причина |
| --- | --- |
| `200` | `{ "favorite": true }` или `false` для собственного объявления |
| `400` | `propertyId` не является UUID |
| `401` | Access token отсутствует, истёк, повреждён или сессия завершена |
| `404` | Опубликованное неудалённое объявление не найдено |

---

## Что общего и чем endpoints отличаются

| Этап | Login | Locations | Favorite |
| --- | --- | --- | --- |
| HTTP-метод | `POST` | `GET` | `PUT` |
| Меняет состояние | Да | Нет | Да |
| Нужен access JWT | Нет | Нет | Да |
| Входные данные | JSON body | Query string | Path parameter |
| Валидация | `LoginDto` | Ручная нормализация | `ParseUUIDPipe` |
| Защита | Rate limit | Только публичные записи | JWT + проверка сессии |
| Работа с БД | Чтение, update, create session | Чтение | Чтение и upsert |
| Идемпотентность | Нет | Да | Да |

Основная архитектурная граница одна и та же:

```text
HTTP request
  → middleware (CORS, cookies, security headers)
  → guard, если он есть
  → pipe и валидация
  → controller
  → service
  → Prisma
  → controller result
  → JSON HTTP response
```

Контроллер отвечает за HTTP-контракт: путь, код ответа, извлечение входных данных и авторизацию. Сервис отвечает за бизнес-правила. Prisma отвечает за типобезопасное обращение к базе, а ограничения схемы обеспечивают целостность данных на самом нижнем уровне.

## Наблюдения код-ревью

Это не ошибки учебного документа, а потенциальные улучшения текущей реализации:

1. `limitLogin()` получает исходный `dto.email`, а `AuthService.login()` нормализует email позже. Лучше применять одинаковую нормализацию до rate limit, иначе разный регистр может создавать разные ключи ограничения.
2. `listPublicLocations()` ограничивает результат до 20 только после чтения всех уникальных адресов. На большой базе стоит ограничить объём выборки или вынести формирование подсказок в специализированный SQL-запрос/поисковый индекс.
3. `FavoritesService.add()` проверяет публикацию и удаление, но не учитывает `INCLUDE_FAKE_PROPERTIES`. При выключенных fake-данных известный UUID тестового объявления всё ещё можно передать напрямую.
4. `AuthService.login()` намеренно возвращает одинаковое сообщение для неизвестного email и неверного пароля. Однако путь для неизвестного пользователя не выполняет Argon2-проверку и может отличаться по времени; при повышенных требованиях безопасности используют проверку фиктивного хеша.

Исправлять эти пункты лучше отдельными маленькими коммитами с интеграционными тестами, потому что они меняют защитные правила и поведение запросов, а не только комментарии.
