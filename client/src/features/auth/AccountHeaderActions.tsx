'use client';

import AccountBalanceWalletRounded from '@mui/icons-material/AccountBalanceWalletRounded';
import FavoriteRounded from '@mui/icons-material/FavoriteRounded';
import HomeWorkRounded from '@mui/icons-material/HomeWorkRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import PersonRounded from '@mui/icons-material/PersonRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import AdminPanelSettingsRounded from '@mui/icons-material/AdminPanelSettingsRounded';
import LoginRounded from '@mui/icons-material/LoginRounded';
import { Avatar, Box, Button, CircularProgress, Divider, IconButton, ListItemIcon, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MouseEvent, useState } from 'react';
import { useAuth } from './use-auth';
import { disconnectRealtime } from '@/features/realtime/realtime-client';
import { useAuthDialog } from './AuthDialogProvider';
import { NotificationsButton } from '@/features/notifications/NotificationsButton';

const accountItems = [
  { href: '/account', label: 'Обзор', icon: <PersonRounded fontSize="small" /> },
  { href: '/account/homes', label: 'Моё жильё', icon: <HomeWorkRounded fontSize="small" /> },
  { href: '/account/exchanges', label: 'Обмены', icon: <SwapHorizRounded fontSize="small" /> },
  { href: '/account/favorites', label: 'Избранное', icon: <FavoriteRounded fontSize="small" /> },
  { href: '/account/searches', label: 'Сохранённые поиски', icon: <SearchRounded fontSize="small" /> },
  { href: '/account/points', label: 'ДомБаллы', icon: <AccountBalanceWalletRounded fontSize="small" /> },
  { href: '/account/settings', label: 'Настройки', icon: <SettingsRounded fontSize="small" /> },
];

export function AccountHeaderActions() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { openAuth } = useAuthDialog();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (isLoading) return <Box sx={{ width: { xs: 40, sm: 190 }, display: 'grid', placeItems: 'center' }}><CircularProgress size={22} /></Box>;
  if (!user) return <>
    <Tooltip title="Войти"><IconButton aria-label="Войти" onClick={() => openAuth({ mode: 'login' })} sx={{ display: { sm: 'none' } }}><LoginRounded /></IconButton></Tooltip>
    <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', sm: 'flex' } }}><Button onClick={() => openAuth({ mode: 'login' })} variant="outlined" color="inherit">Войти</Button><Button onClick={() => openAuth({ mode: 'register' })} variant="contained">Регистрация</Button></Stack>
  </>;

  const openMenu = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget);
  const closeMenu = () => setAnchor(null);
  return <>
    <NotificationsButton />
    <Button color="inherit" onClick={openMenu} aria-controls={anchor ? 'account-menu' : undefined} aria-haspopup="true" aria-expanded={anchor ? 'true' : undefined} sx={{ textTransform: 'none', gap: 1, minWidth: 0, px: { xs: 0.5, sm: 1 } }}>
      <Avatar src={user.profile.avatarUrl ?? undefined} alt={user.profile.displayName} sx={{ width: 38, height: 38 }}>{user.profile.displayName.slice(0, 1)}</Avatar>
      <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left' }}><Typography variant="body2" fontWeight={800} maxWidth={150} noWrap>{user.profile.displayName}</Typography><Typography variant="caption" color="text.secondary">{user.points.available} ДомБаллов</Typography></Box>
    </Button>
    <Menu id="account-menu" anchorEl={anchor} open={Boolean(anchor)} onClose={closeMenu} slotProps={{ paper: { sx: { width: 260, mt: 1 } } }}>
      {accountItems.map((item) => <MenuItem key={item.href} component={Link} href={item.href} onClick={closeMenu}><ListItemIcon>{item.icon}</ListItemIcon>{item.label}</MenuItem>)}
      {(user.role === 'ADMIN' || user.role === 'MODERATOR') && <><Divider /><MenuItem component={Link} href="/admin/moderation" onClick={closeMenu}><ListItemIcon><AdminPanelSettingsRounded fontSize="small" /></ListItemIcon>Модерация</MenuItem></>}
      <Divider />
      <MenuItem onClick={async () => { closeMenu(); disconnectRealtime(); await logout().catch(() => undefined); router.push('/'); router.refresh(); }}><ListItemIcon><LogoutRounded fontSize="small" /></ListItemIcon>Выйти</MenuItem>
    </Menu>
  </>;
}
