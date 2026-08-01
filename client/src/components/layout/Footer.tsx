import HomeRounded from '@mui/icons-material/HomeRounded';
import { Box, Container, Grid, Link as MuiLink, Stack, Typography } from '@mui/material';
import Link from 'next/link';

const columns = [
  { title: 'Сервис', links: [['Как это работает', '/#how-it-works'], ['Поиск жилья', '/homes'], ['Правила обмена', '/#help']] },
  { title: 'Сообщество', links: [['Блог', '/#community'], ['Отзывы', '/#community'], ['Мероприятия', '/#community']] },
  { title: 'Поддержка', links: [['Помощь', '/#help'], ['Безопасность', '/#help'], ['Связаться с нами', '/#help']] },
];

export function Footer() {
  return <Box component="footer" sx={{ bgcolor: 'white', py: 6 }}><Container maxWidth="lg"><Grid container spacing={4}>
    <Grid size={{ xs: 12, md: 4 }}><Stack direction="row" spacing={1} color="primary.dark"><HomeRounded /><Typography fontWeight={800}>Обмен домами</Typography></Stack><Typography color="text.secondary" mt={2} maxWidth={280}>Путешествуйте как местные, обмениваясь домами по всему миру.</Typography></Grid>
    {columns.map((column) => <Grid key={column.title} size={{ xs: 6, sm: 4, md: 2 }}><Typography fontWeight={750} mb={2}>{column.title}</Typography><Stack spacing={1}>{column.links.map(([label, href]) => <MuiLink key={label} component={Link} href={href} color="text.secondary" underline="hover">{label}</MuiLink>)}</Stack></Grid>)}
  </Grid><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" mt={6} pt={3} borderTop="1px solid" borderColor="divider"><Typography variant="body2" color="text.secondary">© 2026 Обмен домами. Все права защищены.</Typography><Typography variant="body2" color="text.secondary">Условия использования · Политика конфиденциальности</Typography></Stack></Container></Box>;
}
