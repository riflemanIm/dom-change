import HomeRounded from '@mui/icons-material/HomeRounded';
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import Link from 'next/link';

export function Header() {
  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: 76, gap: 3 }}>
          <Box component={Link} href="/" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main', textDecoration: 'none' }}>
            <HomeRounded />
            <Typography variant="h6" fontWeight={800}>DomObmen</Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Button component={Link} href="/homes" color="inherit">Найти жильё</Button>
          <Button variant="outlined">Войти</Button>
          <Button variant="contained">Разместить жильё</Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
