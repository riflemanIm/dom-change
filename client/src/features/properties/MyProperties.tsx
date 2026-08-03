'use client';

import AddHomeRounded from '@mui/icons-material/AddHomeRounded';
import ArchiveRounded from '@mui/icons-material/ArchiveRounded';
import CancelScheduleSendRounded from '@mui/icons-material/CancelScheduleSendRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import RestoreRounded from '@mui/icons-material/RestoreRounded';
import VisibilityOffRounded from '@mui/icons-material/VisibilityOffRounded';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { OwnedPropertySummary, propertyApi } from './property-api';

type Item = OwnedPropertySummary;
type LifecycleAction = 'cancelSubmission' | 'hide' | 'restore' | 'archive';

const statusLabels: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING_MODERATION: 'На модерации',
  PUBLISHED: 'Опубликовано',
  CHANGES_REQUESTED: 'Нужны исправления',
  REJECTED: 'Отклонено',
  HIDDEN: 'Скрыто',
  ARCHIVED: 'В архиве',
};

const actionCopy: Record<LifecycleAction, { title: string; description: string; confirm: string }> = {
  cancelSubmission: {
    title: 'Отменить модерацию?',
    description: 'Объявление вернётся в черновик, и его можно будет редактировать.',
    confirm: 'Отменить отправку',
  },
  hide: {
    title: 'Скрыть объявление?',
    description: 'Оно исчезнет из каталога. Вы сможете вернуть его без повторной модерации.',
    confirm: 'Скрыть',
  },
  restore: {
    title: 'Восстановить объявление?',
    description: 'Скрытое объявление вернётся в каталог, а архивное — в черновик.',
    confirm: 'Восстановить',
  },
  archive: {
    title: 'Архивировать объявление?',
    description: 'Оно будет снято с публикации. Архив можно восстановить, если у жилья нет активных заявок.',
    confirm: 'В архив',
  },
};

export function MyProperties() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState<{ property: Item; action: LifecycleAction } | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuProperty, setMenuProperty] = useState<Item | null>(null);
  const reload = useCallback(() => propertyApi.listMine().then(setItems), []);

  useEffect(() => {
    reload().catch((reason: Error) => setError(reason.message));
  }, [reload]);

  const runAction = async () => {
    if (!pendingAction) return;
    setBusy(true);
    setError('');
    try {
      await propertyApi[pendingAction.action](pendingAction.property.id);
      await reload();
      setPendingAction(null);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const chooseAction = (action: LifecycleAction) => {
    if (menuProperty) setPendingAction({ property: menuProperty, action });
    setMenuAnchor(null);
    setMenuProperty(null);
  };

  if (!items) {
    return error
      ? <Alert severity="error">{error}</Alert>
      : <Stack alignItems="center" py={10}><CircularProgress /></Stack>;
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h3" fontWeight={750}>Моё жильё</Typography>
        <Button component={Link} href="/account/homes/new" variant="contained" startIcon={<AddHomeRounded />}>Добавить</Button>
      </Stack>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {!items.length ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="h5">У вас пока нет объявлений</Typography>
          <Typography color="text.secondary" mt={1}>Добавьте жильё и укажите, когда готовы принять гостей.</Typography>
        </Paper>
      ) : items.map((property) => (
        <Paper key={property.id} sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
            <div>
              <Typography variant="h6" fontWeight={750}>{property.title}</Typography>
              <Typography color="text.secondary">Обновлено {new Date(property.updatedAt).toLocaleDateString('ru')}</Typography>
              {property.moderationHistory[0]?.comment && (
                <Alert severity={property.status === 'REJECTED' ? 'error' : 'warning'} sx={{ mt: 2 }}>
                  Комментарий модератора: {property.moderationHistory[0].comment}
                </Alert>
              )}
            </div>
            <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={1}>
              <Typography color="primary" fontWeight={700}>{statusLabels[property.status] ?? property.status}</Typography>
              <Stack direction="row" flexWrap="wrap" justifyContent={{ sm: 'flex-end' }}>
                {property.status === 'PENDING_MODERATION' ? (
                  <Button size="small" startIcon={<EditRounded />} disabled>На модерации</Button>
                ) : (
                  <Button component={Link} href={`/account/homes/${property.id}/edit`} size="small" startIcon={<EditRounded />}>Редактировать</Button>
                )}
                <Button component={Link} href={`/account/homes/${property.id}/photos`} size="small">Фотографии</Button>
                <Button component={Link} href={`/account/homes/${property.id}/availability`} size="small">Календарь</Button>
                <IconButton
                  size="small"
                  aria-label={`Действия с объявлением ${property.title}`}
                  onClick={(event) => {
                    setMenuAnchor(event.currentTarget);
                    setMenuProperty(property);
                  }}
                >
                  <MoreVertRounded />
                </IconButton>
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      ))}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => { setMenuAnchor(null); setMenuProperty(null); }}
      >
        {menuProperty?.status === 'PENDING_MODERATION' && (
          <MenuItem onClick={() => chooseAction('cancelSubmission')}>
            <ListItemIcon><CancelScheduleSendRounded fontSize="small" /></ListItemIcon>Отменить модерацию
          </MenuItem>
        )}
        {menuProperty?.status === 'PUBLISHED' && (
          <MenuItem onClick={() => chooseAction('hide')}>
            <ListItemIcon><VisibilityOffRounded fontSize="small" /></ListItemIcon>Скрыть из каталога
          </MenuItem>
        )}
        {(menuProperty?.status === 'HIDDEN' || menuProperty?.status === 'ARCHIVED') && (
          <MenuItem onClick={() => chooseAction('restore')}>
            <ListItemIcon><RestoreRounded fontSize="small" /></ListItemIcon>Восстановить
          </MenuItem>
        )}
        {menuProperty?.status !== 'PENDING_MODERATION' && menuProperty?.status !== 'ARCHIVED' && (
          <MenuItem onClick={() => chooseAction('archive')} sx={{ color: 'error.main' }}>
            <ListItemIcon><ArchiveRounded fontSize="small" color="error" /></ListItemIcon>В архив
          </MenuItem>
        )}
      </Menu>
      <Dialog open={Boolean(pendingAction)} onClose={busy ? undefined : () => setPendingAction(null)}>
        <DialogTitle>{pendingAction ? actionCopy[pendingAction.action].title : ''}</DialogTitle>
        <DialogContent>
          <DialogContentText>{pendingAction ? actionCopy[pendingAction.action].description : ''}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingAction(null)} disabled={busy}>Нет, оставить</Button>
          <Button onClick={runAction} disabled={busy} color={pendingAction?.action === 'archive' ? 'error' : 'primary'} variant="contained">
            {busy ? <CircularProgress size={20} color="inherit" /> : pendingAction ? actionCopy[pendingAction.action].confirm : ''}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
