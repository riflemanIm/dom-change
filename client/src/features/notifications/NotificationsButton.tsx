'use client';

import NotificationsNoneRounded from '@mui/icons-material/NotificationsNoneRounded';
import { Badge, IconButton } from '@mui/material';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { notificationsApi } from './notifications-api';

export function NotificationsButton() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!sessionStorage.getItem('accessToken')) return;
    notificationsApi.list().then((result) => setUnread(result.unread)).catch(() => undefined);
  }, []);
  return <IconButton component={Link} href="/account/notifications" aria-label="Уведомления"><Badge badgeContent={unread} color="error"><NotificationsNoneRounded /></Badge></IconButton>;
}
