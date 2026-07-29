# DomObmen

Web-сервис временного обмена жильём через внутренние «ДомБаллы» и прямой обмен.

## Структура

- `server` — NestJS API, Prisma и PostgreSQL;
- `client` — Next.js App Router и Material UI;
- `compose.yaml` — PostgreSQL, Redis, MinIO и Mailpit.

## Локальный запуск

Требуются Node.js 22+, npm и Docker.

```bash
cp .env.example .env
npm install
docker compose up -d
npm run prisma:generate --workspace server
npm run dev
```

Клиент: http://localhost:3000  
API: http://localhost:4000/api/v1  
Swagger: http://localhost:4000/docs  
Mailpit: http://localhost:8025  
MinIO Console: http://localhost:9001

PostgreSQL доступен на `localhost:5433`, чтобы не конфликтовать с локальной установкой на стандартном порту.

## Принципы MVP

- никаких денежных расчётов и банковских данных;
- итоговая стоимость проживания рассчитывается только сервером;
- баланс строится по журналу транзакций;
- точный адрес жилья не публикуется до подтверждения обмена;
- backend реализуется как модульный монолит.
