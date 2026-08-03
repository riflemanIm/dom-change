'use client';

import NotificationsNoneRounded from '@mui/icons-material/NotificationsNoneRounded';
import { Badge, IconButton } from '@mui/material';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { notificationsApi } from './notifications-api';
import { connectRealtime } from '@/features/realtime/realtime-client';
import type { NotificationItem } from './notifications-api';

export function NotificationsButton() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!sessionStorage.getItem('accessToken')) return;
    let active = true;
    const refresh = () => notificationsApi.list().then((result) => { if (active) setUnread(result.unread); }).catch(() => undefined);
    const add = (notification: NotificationItem) => { if (active && !notification.readAt) setUnread((value) => value + 1); };
    const read = () => { if (active) setUnread((value) => Math.max(0, value - 1)); };
    const readAll = () => { if (active) setUnread(0); };
    void refresh();
    let cleanup: () => void = () => undefined;
    connectRealtime().then((socket) => {
      if (!active) return;
      socket.on('notification:new', add);
      socket.on('notification:read', read);
      socket.on('notifications:read-all', readAll);
      socket.on('notifications:refresh', refresh);
      socket.on('connect', refresh);
      cleanup = () => {
        socket.off('notification:new', add);
        socket.off('notification:read', read);
        socket.off('notifications:read-all', readAll);
        socket.off('notifications:refresh', refresh);
        socket.off('connect', refresh);
      };
    }).catch(() => undefined);
    return () => { active = false; cleanup(); };
  }, []);
  return <IconButton component={Link} href="/account/notifications" aria-label="Уведомления"><Badge badgeContent={unread} color="error"><NotificationsNoneRounded /></Badge></IconButton>;
}
