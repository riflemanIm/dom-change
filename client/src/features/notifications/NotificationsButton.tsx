'use client';

import DoneAllRounded from '@mui/icons-material/DoneAllRounded';
import NotificationsNoneRounded from '@mui/icons-material/NotificationsNoneRounded';
import { Badge, Box, Button, CircularProgress, Divider, IconButton, ListItemText, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MouseEvent, useEffect, useRef, useState } from 'react';
import { startRouteLoading } from '@/components/navigation/RouteLoadingBar';
import { useAuth } from '@/features/auth/use-auth';
import { connectRealtime } from '@/features/realtime/realtime-client';
import { NotificationItem, notificationsApi } from './notifications-api';
import { formatRuDateTime } from '@/utils/date-format';
import { getNotificationAppearance, NotificationTypeIcon } from './notification-appearance';

const previewLimit = 6;

export function NotificationsButton() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');
  const itemsRef = useRef<NotificationItem[]>([]);

  const replaceItems = (next: NotificationItem[]) => {
    itemsRef.current = next;
    setItems(next);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      replaceItems([]);
      setUnread(0);
      return;
    }

    let active = true;
    const refresh = () => notificationsApi.list()
      .then((result) => {
        if (!active) return;
        replaceItems(result.items);
        setUnread(result.unread);
        setError('');
      })
      .catch(() => { if (active) setError('Не удалось загрузить уведомления'); });
    const add = (notification: NotificationItem) => {
      if (!active || itemsRef.current.some(({ id }) => id === notification.id)) return;
      replaceItems([notification, ...itemsRef.current]);
      if (!notification.readAt) setUnread((value) => value + 1);
    };
    const markRead = ({ id }: { id: string }) => {
      if (!active) return;
      const current = itemsRef.current.find((item) => item.id === id);
      if (!current?.readAt) setUnread((value) => Math.max(0, value - 1));
      replaceItems(itemsRef.current.map((item) => item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item));
    };
    const markAllRead = ({ readAt }: { readAt: string }) => {
      if (!active) return;
      replaceItems(itemsRef.current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
      setUnread(0);
    };

    void refresh();
    let cleanup = () => undefined;
    connectRealtime().then((socket) => {
      if (!active) return;
      socket.on('notification:new', add);
      socket.on('notification:read', markRead);
      socket.on('notifications:read-all', markAllRead);
      socket.on('notifications:refresh', refresh);
      socket.on('connect', refresh);
      cleanup = () => {
        socket.off('notification:new', add);
        socket.off('notification:read', markRead);
        socket.off('notifications:read-all', markAllRead);
        socket.off('notifications:refresh', refresh);
        socket.off('connect', refresh);
      };
    }).catch(() => { if (active) setError('Нет соединения с уведомлениями'); });

    return () => {
      active = false;
      cleanup();
    };
  }, [isAuthenticated]);

  const closeMenu = () => setAnchor(null);
  const read = (item: NotificationItem) => {
    if (item.readAt) return;
    replaceItems(itemsRef.current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
    setUnread((value) => Math.max(0, value - 1));
    void notificationsApi.read(item.id).catch(() => void notificationsApi.list().then((result) => {
      replaceItems(result.items);
      setUnread(result.unread);
    }));
  };
  const openNotification = (item: NotificationItem) => {
    read(item);
    closeMenu();
    if (item.link) {
      startRouteLoading();
      router.push(item.link);
    }
  };
  const readAll = () => {
    const readAt = new Date().toISOString();
    replaceItems(itemsRef.current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
    setUnread(0);
    void notificationsApi.readAll().catch(() => void notificationsApi.list().then((result) => {
      replaceItems(result.items);
      setUnread(result.unread);
    }));
  };

  return (
    <>
      <Tooltip title="Уведомления">
        <IconButton
          aria-label={unread ? `Уведомления: ${unread} непрочитанных` : 'Уведомления'}
          aria-controls={anchor ? 'notifications-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={anchor ? 'true' : undefined}
          onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
        >
          <Badge badgeContent={unread} max={99} color="error" invisible={unread === 0}><NotificationsNoneRounded /></Badge>
        </IconButton>
      </Tooltip>
      <Menu
        id="notifications-menu"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={closeMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { width: { xs: 'calc(100vw - 24px)', sm: 390 }, maxWidth: 390, mt: 1, overflow: 'hidden' } } }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" px={2} py={1}>
          <Box><Typography fontWeight={750}>Уведомления</Typography><Typography variant="caption" color="text.secondary">{unread ? `Непрочитанных: ${unread}` : 'Всё прочитано'}</Typography></Box>
          {unread > 0 && <Button size="small" startIcon={<DoneAllRounded />} onClick={readAll}>Прочитать все</Button>}
        </Stack>
        <Divider />
        {items === null ? (
          <Stack alignItems="center" py={4}><CircularProgress size={24} /></Stack>
        ) : error && !items.length ? (
          <Typography color="error" variant="body2" px={2} py={3}>{error}</Typography>
        ) : !items.length ? (
          <Typography color="text.secondary" variant="body2" px={2} py={3}>Новых событий пока нет.</Typography>
        ) : items.slice(0, previewLimit).map((item) => {
          const appearance = getNotificationAppearance(item);
          return (
            <MenuItem
              key={item.id}
              onClick={() => openNotification(item)}
              sx={{
                alignItems: 'flex-start',
                gap: 1.25,
                py: 1.4,
                whiteSpace: 'normal',
                bgcolor: appearance.background,
                borderLeft: '3px solid',
                borderColor: item.readAt ? 'transparent' : appearance.color,
                '&:hover': { bgcolor: appearance.background },
              }}
            >
              <NotificationTypeIcon item={item} />
              <ListItemText
                primary={item.title}
                secondary={<><Typography component="span" variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{item.body}</Typography><Typography component="span" variant="caption" color="text.disabled" display="block" mt={0.5}>{formatRuDateTime(item.createdAt)}</Typography></>}
                slotProps={{ primary: { fontWeight: item.readAt ? 500 : 750 } }}
              />
            </MenuItem>
          );
        })}
        <Divider />
        <Box textAlign="center" py={0.5}><Button component={Link} href="/account/notifications" size="small" onClick={closeMenu}>Все уведомления</Button></Box>
      </Menu>
    </>
  );
}
