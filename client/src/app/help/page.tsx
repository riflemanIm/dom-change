import AccountBalanceWalletRounded from '@mui/icons-material/AccountBalanceWalletRounded';
import AccountCircleRounded from '@mui/icons-material/AccountCircleRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import HomeWorkRounded from '@mui/icons-material/HomeWorkRounded';
import NotificationsNoneRounded from '@mui/icons-material/NotificationsNoneRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import SecurityRounded from '@mui/icons-material/SecurityRounded';
import StarOutlineRounded from '@mui/icons-material/StarOutlineRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import type { Metadata } from 'next';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'Центр помощи',
  description: 'Полное руководство по регистрации, обмену жильём, ДомБаллам и безопасности в DomObmen.',
};

const navigation = [
  ['О проекте', 'about'],
  ['Регистрация и аккаунт', 'registration'],
  ['Как добавить жильё', 'listing'],
  ['Поиск жилья', 'search'],
  ['Виды обмена', 'exchange-types'],
  ['ДомБаллы', 'points'],
  ['Как проходит обмен', 'exchange-flow'],
  ['Чат и уведомления', 'communication'],
  ['Отмена обмена', 'cancellation'],
  ['Отзывы', 'reviews'],
  ['Безопасность', 'safety'],
  ['Частые вопросы', 'faq'],
  ['Поддержка', 'support'],
] as const;

function HelpSection({ id, icon, title, lead, children }: { id: string; icon: ReactNode; title: string; lead?: string; children: ReactNode }) {
  return (
    <Box component="section" id={id} sx={{ scrollMarginTop: 24, py: { xs: 4, md: 5 } }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
        <Box sx={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 2.5, color: 'primary.main', bgcolor: 'rgba(14, 111, 94, .09)' }}>{icon}</Box>
        <Typography variant="h4" component="h2">{title}</Typography>
      </Stack>
      {lead && <Typography color="text.secondary" sx={{ maxWidth: 780, lineHeight: 1.75, mb: 3 }}>{lead}</Typography>}
      {children}
    </Box>
  );
}

function NumberedSteps({ items }: { items: Array<{ title: string; text: string }> }) {
  return (
    <Stack spacing={2}>
      {items.map((item, index) => (
        <Stack key={item.title} direction="row" spacing={2} alignItems="flex-start">
          <Box sx={{ flex: '0 0 auto', display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}>{index + 1}</Box>
          <Box><Typography fontWeight={700}>{item.title}</Typography><Typography color="text.secondary" lineHeight={1.7}>{item.text}</Typography></Box>
        </Stack>
      ))}
    </Stack>
  );
}

function Faq({ question, children }: { question: string; children: ReactNode }) {
  return (
    <Box component="details" sx={{ py: 2, borderBottom: '1px solid', borderColor: 'divider', '& summary': { cursor: 'pointer', fontWeight: 700, listStylePosition: 'inside' }, '&[open] summary': { color: 'primary.main' } }}>
      <Box component="summary">{question}</Box>
      <Typography component="div" color="text.secondary" sx={{ pt: 1.5, pl: { sm: 2.5 }, lineHeight: 1.75 }}>{children}</Typography>
    </Box>
  );
}

export default function HelpPage() {
  return (
    <>
      <Header />
      <Box component="main" sx={{ bgcolor: '#f7f9f7' }}>
        <Box sx={{ background: 'linear-gradient(135deg, #e5f3ef 0%, #f8f4ec 100%)', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
            <Chip icon={<HelpOutlineRounded />} label="Центр помощи" color="primary" variant="outlined" />
            <Typography component="h1" sx={{ mt: 2.5, maxWidth: 780, fontSize: { xs: 40, md: 60 }, lineHeight: 1.08, letterSpacing: '-.04em', fontWeight: 550 }}>Всё, что нужно знать об обмене домами</Typography>
            <Typography color="text.secondary" sx={{ mt: 2.5, maxWidth: 720, fontSize: { xs: 17, md: 19 }, lineHeight: 1.75 }}>Как устроен DomObmen, как подготовить жильё, договориться с хозяином и путешествовать с помощью прямого обмена или ДомБаллов.</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mt={4}>
              <Button component={Link} href="/homes" variant="contained" size="large" endIcon={<ArrowForwardRounded />}>Найти жильё</Button>
              <Button component={Link} href="/register" variant="outlined" size="large">Создать аккаунт</Button>
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
          <Grid container spacing={{ xs: 3, md: 5 }} alignItems="flex-start">
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper component="nav" aria-label="Разделы справки" sx={{ p: 2.5, position: { md: 'sticky' }, top: { md: 20 } }}>
                <Typography fontWeight={750} mb={1.5}>Содержание</Typography>
                <Stack>
                  {navigation.map(([label, id]) => <MuiLink key={id} href={`#${id}`} underline="none" color="text.secondary" sx={{ py: .7, '&:hover': { color: 'primary.main' } }}>{label}</MuiLink>)}
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 9 }}>
              <Paper sx={{ px: { xs: 2.5, sm: 4, md: 5 } }}>
                <HelpSection id="about" icon={<SwapHorizRounded />} title="О проекте" lead="DomObmen помогает участникам временно жить в домах друг друга и открывать новые места без оплаты проживания деньгами.">
                  <Grid container spacing={2}>
                    {[
                      ['Обмен за ДомБаллы', 'Гость использует внутренние баллы, а хозяин получает их после завершения поездки. Встречный обмен в те же даты не нужен.'],
                      ['Прямой обмен', 'Два участника предлагают друг другу свои дома и договариваются об обмене. ДомБаллы при этом не списываются.'],
                      ['Сообщество', 'Объявления проходят модерацию, а завершённые поездки формируют отзывы и рейтинг участников.'],
                    ].map(([title, text]) => <Grid key={title} size={{ xs: 12, sm: 4 }}><Box sx={{ height: '100%', p: 2.25, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}><Typography fontWeight={750} mb={1}>{title}</Typography><Typography variant="body2" color="text.secondary" lineHeight={1.7}>{text}</Typography></Box></Grid>)}
                  </Grid>
                  <Alert severity="info" sx={{ mt: 3 }}>Текущая версия — MVP. В сервисе нет денежных расчётов и привязки банковских карт. ДомБаллы нельзя купить, вывести или обменять на деньги.</Alert>
                </HelpSection>
                <Divider />

                <HelpSection id="registration" icon={<AccountCircleRounded />} title="Регистрация и аккаунт" lead="Аккаунт нужен, чтобы добавлять жильё, отправлять заявки, общаться и управлять ДомБаллами.">
                  <NumberedSteps items={[
                    { title: 'Создайте аккаунт', text: 'Укажите email, имя, которое увидят другие участники, и пароль не короче 10 символов — минимум с одной буквой и одной цифрой.' },
                    { title: 'Подтвердите email', text: 'Перейдите по ссылке из письма. Без подтверждённой почты объявление нельзя отправить на модерацию.' },
                    { title: 'Заполните профиль', text: 'Добавьте фотографию и сведения о себе. Понятный профиль повышает доверие хозяев и гостей.' },
                    { title: 'Защитите доступ', text: 'Не передавайте пароль другим людям. Если забыли его, воспользуйтесь восстановлением пароля на странице входа.' },
                  ]} />
                  <Stack direction="row" spacing={1.5} mt={3} flexWrap="wrap" useFlexGap>
                    <Button component={Link} href="/account/settings" variant="outlined">Настройки аккаунта</Button>
                    <Button component={Link} href="/forgot-password" color="inherit">Восстановить пароль</Button>
                  </Stack>
                </HelpSection>
                <Divider />

                <HelpSection id="listing" icon={<HomeWorkRounded />} title="Как добавить жильё" lead="Объявление создаётся как черновик. Его можно спокойно заполнять по шагам и отправить на проверку, когда всё готово.">
                  <NumberedSteps items={[
                    { title: 'Опишите дом', text: 'Выберите тип жилья, укажите город и адрес, вместимость, спальни, кровати, удобства и правила проживания.' },
                    { title: 'Расскажите важное', text: 'Добавьте понятный заголовок и подробное описание: кому подойдёт дом, что есть рядом и какие особенности нужно учитывать.' },
                    { title: 'Настройте условия', text: 'Выберите обмен за ДомБаллы, прямой обмен или оба варианта; задайте цену за ночь и ограничения по длительности.' },
                    { title: 'Добавьте фотографии', text: 'Загрузите светлые актуальные фотографии. Поддерживаются JPEG, PNG и WebP; размер одного файла — до 10 МБ.' },
                    { title: 'Укажите доступность', text: 'Отметьте периоды и формат, в котором жильё доступно: ДомБаллы, прямой обмен, оба варианта, по запросу или недоступно.' },
                    { title: 'Отправьте на модерацию', text: 'После проверки объявление получит статус «Опубликовано» либо вернётся с комментарием о необходимых изменениях.' },
                  ]} />
                  <Alert severity="warning" sx={{ mt: 3 }}>Во время модерации редактирование ограничено. Опубликованное объявление можно временно скрыть, а архивное — восстановить в черновик.</Alert>
                  <Button component={Link} href="/account/homes" variant="outlined" sx={{ mt: 2.5 }}>Мои объявления</Button>
                </HelpSection>
                <Divider />

                <HelpSection id="search" icon={<SearchRounded />} title="Поиск жилья" lead="Каталог помогает найти опубликованные дома, подходящие под город, даты и состав поездки.">
                  <Typography color="text.secondary" lineHeight={1.75}>Введите город, страну или регион, выберите даты, количество гостей и вид обмена. В расширенных фильтрах доступны характеристики и удобства. Даты важны: сервис проверяет период доступности, ограничения по числу ночей и уже подтверждённые поездки. Интересные варианты можно добавить в избранное, а параметры — сохранить как поиск.</Typography>
                  <Button component={Link} href="/homes" variant="outlined" sx={{ mt: 2.5 }}>Открыть каталог</Button>
                </HelpSection>
                <Divider />

                <HelpSection id="exchange-types" icon={<SwapHorizRounded />} title="Виды обмена">
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}><Box sx={{ p: 2.5, borderRadius: 3, bgcolor: '#edf7f4', height: '100%' }}><Typography variant="h6" mb={1}>За ДомБаллы</Typography><Typography color="text.secondary" lineHeight={1.7}>Вы выбираете доступный дом и оплачиваете ночи внутренними баллами. Хозяин сможет потратить полученные баллы на другую поездку — необязательно в ваш дом и необязательно в те же даты.</Typography></Box></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><Box sx={{ p: 2.5, borderRadius: 3, bgcolor: '#faf3e8', height: '100%' }}><Typography variant="h6" mb={1}>Прямой обмен</Typography><Typography color="text.secondary" lineHeight={1.7}>В заявке вы предлагаете хозяину одно из своих опубликованных объявлений. Оба дома должны поддерживать прямой обмен и быть свободны в выбранный период.</Typography></Box></Grid>
                  </Grid>
                </HelpSection>
                <Divider />

                <HelpSection id="points" icon={<AccountBalanceWalletRounded />} title="ДомБаллы" lead="ДомБаллы — внутренняя единица сервиса, которая разделяет поездку гостя и встречную поездку хозяина.">
                  <Stack spacing={1.2} color="text.secondary">
                    <Typography>• При регистрации в текущей конфигурации начисляется 500 приветственных ДомБаллов, после подтверждения email — ещё 100. Размер бонусов может меняться.</Typography>
                    <Typography>• Хозяин сам задаёт стоимость ночи для своего жилья и может менять её для отдельных периодов доступности.</Typography>
                    <Typography>• При подтверждении заявки нужная сумма резервируется на балансе гостя: потратить её второй раз нельзя.</Typography>
                    <Typography>• После завершения поездки резерв списывается у гостя и зачисляется хозяину.</Typography>
                    <Typography>• При отмене подтверждённой поездки в текущем MVP зарезервированные баллы возвращаются гостю.</Typography>
                  </Stack>
                  <Box sx={{ mt: 3, p: 2.5, borderRadius: 3, border: '1px dashed', borderColor: 'primary.main' }}><Typography fontWeight={750}>Пример расчёта</Typography><Typography color="text.secondary" mt={.5}>Жильё стоит 120 ДомБаллов за ночь. За 5 ночей сервис рассчитает 120 × 5 = <strong>600 ДомБаллов</strong>. Итоговая сумма всегда рассчитывается сервером.</Typography></Box>
                  <Alert severity="info" sx={{ mt: 3 }}>Доступный баланс можно тратить, зарезервированный ждёт завершения поездки. Все начисления, резервы, возвраты и списания отражаются в истории операций.</Alert>
                  <Button component={Link} href="/account/points" variant="outlined" sx={{ mt: 2.5 }}>Баланс и история</Button>
                </HelpSection>
                <Divider />

                <HelpSection id="exchange-flow" icon={<CheckCircleOutlineRounded />} title="Как проходит обмен" lead="Заявка проходит несколько понятных этапов. Её текущий статус всегда виден в личном кабинете.">
                  <NumberedSteps items={[
                    { title: 'Заявка отправлена', text: 'Гость выбирает даты, число гостей и вид обмена. Хозяин получает уведомление и видит новую заявку со статусом «Ожидает решения».' },
                    { title: 'Предварительное согласие', text: 'Хозяин проверяет условия и предварительно одобряет заявку. До этого момента ДомБаллы не резервируются.' },
                    { title: 'Подтверждение гостем', text: 'Гость подтверждает поездку. Для обмена за ДомБаллы в этот момент проверяется баланс и резервируется полная сумма.' },
                    { title: 'Поездка', text: 'Участники согласуют детали в чате и соблюдают договорённости, правила дома и выбранные даты.' },
                    { title: 'Завершение', text: 'После даты выезда участник отмечает обмен завершённым. ДомБаллы переходят хозяину, и обе стороны могут оставить отзывы.' },
                  ]} />
                  <Button component={Link} href="/account/exchanges" variant="outlined" sx={{ mt: 2.5 }}>Мои обмены</Button>
                </HelpSection>
                <Divider />

                <HelpSection id="communication" icon={<ChatBubbleOutlineRounded />} title="Чат и уведомления" lead="Для каждой заявки создаётся отдельный диалог, связанный с конкретным обменом.">
                  <Typography color="text.secondary" lineHeight={1.75}>Используйте чат, чтобы обсудить время прибытия, состав гостей, передачу ключей, правила, животных и другие бытовые детали. Новые сообщения и изменения статуса заявки приходят в реальном времени; непрочитанные уведомления можно отметить прочитанными. Не переносите важные договорённости в сторонние мессенджеры — история в заявке помогает обеим сторонам восстановить контекст.</Typography>
                </HelpSection>
                <Divider />

                <HelpSection id="cancellation" icon={<NotificationsNoneRounded />} title="Отмена и отклонение заявки">
                  <Typography color="text.secondary" lineHeight={1.75}>До окончательного подтверждения гость может отменить заявку, а хозяин — отклонить её. Подтверждённую поездку также можно отменить, но потребуется указать причину. В текущей версии зарезервированные ДомБаллы возвращаются гостю полностью.</Typography>
                  <Alert severity="warning" sx={{ mt: 2.5 }}>Перед отменой напишите второй стороне в чат. Частые или поздние отмены мешают сообществу; правила штрафов для следующих версий сервиса ещё не введены.</Alert>
                </HelpSection>
                <Divider />

                <HelpSection id="reviews" icon={<StarOutlineRounded />} title="Отзывы и рейтинг" lead="Отзывы доступны только участникам завершённого обмена, поэтому связаны с реальным опытом поездки.">
                  <Typography color="text.secondary" lineHeight={1.75}>После завершения можно оценить общее впечатление, чистоту и общение, а также оставить содержательный комментарий. Пишите о фактах, соблюдайте уважительный тон и не публикуйте адреса, телефоны или другие персональные данные. Оценки обновляют рейтинг участника.</Typography>
                </HelpSection>
                <Divider />

                <HelpSection id="safety" icon={<SecurityRounded />} title="Безопасность" lead="Безопасный обмен начинается с проверяемого профиля, честного объявления и ясных договорённостей.">
                  <Grid container spacing={2}>
                    {[
                      ['Проверьте профиль', 'Посмотрите подтверждение email, описание участника, историю обменов и отзывы.'],
                      ['Обсудите детали', 'Заранее проговорите гостей, ключи, животных, курение, уборку и экстренные контакты.'],
                      ['Берегите данные', 'В открытом каталоге используйте только приблизительное расположение. Точный адрес сообщайте участнику после подтверждения.'],
                      ['Не переводите деньги', 'MVP не требует оплаты проживания, данных карты или перевода «залога» через сторонние ссылки.'],
                      ['Фиксируйте договорённости', 'Сохраняйте важные условия в чате конкретной заявки и следите за изменениями её статуса.'],
                      ['Сообщайте о проблемах', 'Не подтверждайте сомнительную заявку. Сохраните переписку и обратитесь к администратору проекта.'],
                    ].map(([title, text]) => <Grid key={title} size={{ xs: 12, sm: 6 }}><Stack direction="row" spacing={1.3}><CheckCircleOutlineRounded color="primary" sx={{ mt: .25 }} /><Box><Typography fontWeight={700}>{title}</Typography><Typography variant="body2" color="text.secondary" lineHeight={1.65}>{text}</Typography></Box></Stack></Grid>)}
                  </Grid>
                </HelpSection>
                <Divider />

                <HelpSection id="faq" icon={<HelpOutlineRounded />} title="Частые вопросы">
                  <Faq question="Обязательно ли предлагать свой дом тому же человеку?">Нет. При обмене за ДомБаллы хозяин получает баллы и позже выбирает любое другое жильё. Встречное жильё требуется только для прямого обмена.</Faq>
                  <Faq question="Когда списываются ДомБаллы?">При окончательном подтверждении они сначала резервируются. Фактическое списание и начисление хозяину происходят после завершения поездки.</Faq>
                  <Faq question="Можно ли отправить несколько заявок на одинаковые даты?">Сервис ограничивает пересекающиеся активные заявки и не позволяет подтвердить занятый период. Это защищает участников от двойного бронирования.</Faq>
                  <Faq question="Почему объявление не отправляется на модерацию?">Проверьте подтверждение email, обязательные поля, описание, выбранный вид обмена и наличие хотя бы одной успешно обработанной фотографии.</Faq>
                  <Faq question="Можно ли изменить опубликованное объявление?">Да, но существенные изменения могут потребовать повторной проверки. Во время активной модерации редактирование ограничено.</Faq>
                  <Faq question="Есть ли комиссия или оплата проживания?">В текущем MVP денежных платежей и комиссии нет. Обмен проходит напрямую либо за внутренние ДомБаллы.</Faq>
                  <Faq question="Что делать, если письмо подтверждения не пришло?">Проверьте папку «Спам», правильность email и запросите отправку письма повторно в аккаунте. Ссылки подтверждения имеют ограниченный срок действия.</Faq>
                </HelpSection>
                <Divider />

                <HelpSection id="support" icon={<HelpOutlineRounded />} title="Поддержка" lead="Отдельная форма обращений в текущем MVP ещё не подключена.">
                  <Typography color="text.secondary" lineHeight={1.75}>Если возникла проблема, сохраните ссылку на объявление или заявку, опишите ожидаемый и фактический результат и приложите снимок экрана. До решения спорной ситуации не подтверждайте обмен и не передавайте платёжные данные. Системные уведомления и комментарии модератора доступны в личном кабинете.</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mt={3}>
                    <Button component={Link} href="/account" variant="contained">Перейти в аккаунт</Button>
                    <Button component={Link} href="/homes" variant="outlined">Вернуться к поиску</Button>
                  </Stack>
                </HelpSection>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
