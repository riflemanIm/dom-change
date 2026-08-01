import HomeRounded from '@mui/icons-material/HomeRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import { AppBar, Box, Button, Container, IconButton, Stack, Toolbar, Typography } from '@mui/material';
import Link from 'next/link';
import { AccountHeaderActions } from '@/features/auth/AccountHeaderActions';

export function Header() {
  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ bgcolor: 'background.paper' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: 76, gap: 3 }}>
          <Box component={Link} href="/" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.dark', textDecoration: 'none' }}>
            <HomeRounded />
            <Typography variant="h6" fontWeight={800}>Обмен домами</Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ ml: 'auto', mr: { md: 'auto' }, display: { xs: 'none', md: 'flex' } }}>
            <Button component={Link} href="/#how-it-works" color="inherit">Как это работает</Button>
            <Button component={Link} href="/homes" color="inherit">Поиск жилья</Button>
            <Button component={Link} href="/#community" color="inherit">Сообщество</Button>
            <Button component={Link} href="/#help" color="inherit">Помощь</Button>
          </Stack>
          <Box sx={{ ml: { xs: 'auto', md: 0 } }}><AccountHeaderActions /></Box>
          <IconButton component={Link} href="/homes" aria-label="Перейти к поиску жилья" sx={{ display: { sm: 'none' } }}><SearchRounded /></IconButton>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
