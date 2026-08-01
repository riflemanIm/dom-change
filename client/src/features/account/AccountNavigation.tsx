'use client';

import AccountBalanceWalletRounded from '@mui/icons-material/AccountBalanceWalletRounded';
import FavoriteRounded from '@mui/icons-material/FavoriteRounded';
import HomeWorkRounded from '@mui/icons-material/HomeWorkRounded';
import NotificationsRounded from '@mui/icons-material/NotificationsRounded';
import PersonRounded from '@mui/icons-material/PersonRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import { Badge, Box, Button, Divider, Paper, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { exchangesApi } from '@/features/exchanges/exchanges-api';
import { notificationsApi } from '@/features/notifications/notifications-api';

const items: Array<{ href: string; label: string; icon: ReactNode; badge?: 'exchanges' | 'notifications' }> = [
  { href: '/account', label: 'Обзор', icon: <PersonRounded /> },
  { href: '/account/homes', label: 'Моё жильё', icon: <HomeWorkRounded /> },
  { href: '/account/exchanges', label: 'Обмены', icon: <SwapHorizRounded />, badge: 'exchanges' },
  { href: '/account/favorites', label: 'Избранное', icon: <FavoriteRounded /> },
  { href: '/account/searches', label: 'Поиски', icon: <SearchRounded /> },
  { href: '/account/points', label: 'ДомБаллы', icon: <AccountBalanceWalletRounded /> },
  { href: '/account/notifications', label: 'Уведомления', icon: <NotificationsRounded />, badge: 'notifications' },
  { href: '/account/settings', label: 'Настройки', icon: <SettingsRounded /> },
];

export function AccountNavigation() {
  const pathname = usePathname();
  const [badges, setBadges] = useState({ exchanges: 0, notifications: 0 });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [incoming, outgoing, notifications] = await Promise.all([
          exchangesApi.list('incoming'), exchangesApi.list('outgoing'), notificationsApi.list(),
        ]);
        if (active) setBadges({
          exchanges: incoming.filter(({ status }) => status === 'PENDING').length + outgoing.filter(({ status }) => status === 'PREAPPROVED').length,
          notifications: notifications.unread,
        });
      } catch { /* child pages show authorization errors */ }
    };
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return (
    <Paper component="nav" variant="outlined" sx={{ width: { md: 238 }, flexShrink: 0, p: { xs: 1, md: 2 }, position: { md: 'sticky' }, top: { md: 24 }, alignSelf: { md: 'flex-start' }, overflowX: { xs: 'auto', md: 'visible' } }}>
      <Box sx={{ display: { xs: 'none', md: 'block' }, px: 1, pb: 1.5 }}><Typography fontWeight={800}>Личный кабинет</Typography><Typography variant="body2" color="text.secondary">Управление поездками</Typography></Box>
      <Divider sx={{ display: { xs: 'none', md: 'block' }, mb: 1 }} />
      <Stack direction={{ xs: 'row', md: 'column' }} spacing={0.5} sx={{ minWidth: { xs: 'max-content', md: 0 } }}>
        {items.map((item) => {
          const selected = item.href === '/account' ? pathname === item.href : pathname.startsWith(item.href);
          const badge = item.badge ? badges[item.badge] : 0;
          return <Button key={item.href} component={Link} href={item.href} color={selected ? 'primary' : 'inherit'} variant={selected ? 'contained' : 'text'} startIcon={<Badge badgeContent={badge} color="error">{item.icon}</Badge>} sx={{ justifyContent: 'flex-start', whiteSpace: 'nowrap', px: 1.5 }}>{item.label}</Button>;
        })}
      </Stack>
    </Paper>
  );
}
