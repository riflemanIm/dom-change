'use client';

import AddHomeRounded from '@mui/icons-material/AddHomeRounded';
import ArchiveRounded from '@mui/icons-material/ArchiveRounded';
import BedRounded from '@mui/icons-material/BedRounded';
import CancelScheduleSendRounded from '@mui/icons-material/CancelScheduleSendRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import HomeWorkRounded from '@mui/icons-material/HomeWorkRounded';
import LocationOnRounded from '@mui/icons-material/LocationOnRounded';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import RestoreRounded from '@mui/icons-material/RestoreRounded';
import VisibilityOffRounded from '@mui/icons-material/VisibilityOffRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItemIcon,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { OwnedPropertySummary, propertyApi } from './property-api';

type Item = OwnedPropertySummary;
type LifecycleAction = 'cancelSubmission' | 'hide' | 'restore' | 'archive';
type ListingFilter = 'all' | 'active' | 'drafts' | 'archived';

const statusLabels: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING_MODERATION: 'На модерации',
  PUBLISHED: 'Опубликовано',
  CHANGES_REQUESTED: 'Нужны исправления',
  REJECTED: 'Отклонено',
  HIDDEN: 'Скрыто',
  ARCHIVED: 'В архиве',
};

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  DRAFT: 'default',
  PENDING_MODERATION: 'warning',
  PUBLISHED: 'success',
  CHANGES_REQUESTED: 'warning',
  REJECTED: 'error',
  HIDDEN: 'primary',
  ARCHIVED: 'default',
};

const actionCopy: Record<LifecycleAction, { title: string; description: string; confirm: string }> = {
  cancelSubmission: { title: 'Отменить модерацию?', description: 'Объявление вернётся в черновик, и его можно будет редактировать.', confirm: 'Отменить отправку' },
  hide: { title: 'Скрыть объявление?', description: 'Оно исчезнет из каталога. Вы сможете вернуть его без повторной модерации.', confirm: 'Скрыть' },
  restore: { title: 'Восстановить объявление?', description: 'Скрытое объявление вернётся в каталог, а архивное — в черновик.', confirm: 'Восстановить' },
  archive: { title: 'Архивировать объявление?', description: 'Оно будет снято с публикации. Архив можно восстановить, если у жилья нет активных заявок.', confirm: 'В архив' },
};

export function MyProperties() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ListingFilter>('all');
  const [pendingAction, setPendingAction] = useState<{ property: Item; action: LifecycleAction } | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuProperty, setMenuProperty] = useState<Item | null>(null);
  const reload = useCallback(() => propertyApi.listMine().then(setItems), []);

  useEffect(() => { reload().catch((reason: Error) => setError(reason.message)); }, [reload]);

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

  if (!items) return error ? <Alert severity="error">{error}</Alert> : <Stack alignItems="center" py={10}><CircularProgress /></Stack>;

  const groups: Record<ListingFilter, Item[]> = {
    all: items,
    active: items.filter(({ status }) => ['PUBLISHED', 'PENDING_MODERATION', 'HIDDEN'].includes(status)),
    drafts: items.filter(({ status }) => ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(status)),
    archived: items.filter(({ status }) => status === 'ARCHIVED'),
  };
  const visibleItems = groups[filter];

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h3" fontWeight={750}>Моё жильё</Typography>
        <Button component={Link} href="/account/homes/new" variant="contained" startIcon={<AddHomeRounded />}>Добавить</Button>
      </Stack>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {items.length > 0 && (
        <Paper variant="outlined" sx={{ px: { xs: 0.5, sm: 1.5 } }}>
          <Tabs value={filter} onChange={(_, value: ListingFilter) => setFilter(value)} variant="scrollable" scrollButtons="auto" aria-label="Фильтр объявлений">
            <Tab value="all" label={`Все · ${groups.all.length}`} />
            <Tab value="active" label={`Активные · ${groups.active.length}`} />
            <Tab value="drafts" label={`Черновики · ${groups.drafts.length}`} />
            <Tab value="archived" label={`Архив · ${groups.archived.length}`} />
          </Tabs>
        </Paper>
      )}
      {!items.length ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}><Typography variant="h5">У вас пока нет объявлений</Typography><Typography color="text.secondary" mt={1}>Добавьте жильё и укажите, когда готовы принять гостей.</Typography></Paper>
      ) : !visibleItems.length ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center' }}><Typography variant="h6">В этом разделе пока нет объявлений</Typography></Paper>
      ) : visibleItems.map((property) => <ListingCard key={property.id} property={property} openMenu={(anchor) => { setMenuAnchor(anchor); setMenuProperty(property); }} />)}

      <LifecycleMenu anchor={menuAnchor} property={menuProperty} close={() => { setMenuAnchor(null); setMenuProperty(null); }} choose={chooseAction} />
      <Dialog open={Boolean(pendingAction)} onClose={busy ? undefined : () => setPendingAction(null)}>
        <DialogTitle>{pendingAction ? actionCopy[pendingAction.action].title : ''}</DialogTitle>
        <DialogContent><DialogContentText>{pendingAction ? actionCopy[pendingAction.action].description : ''}</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingAction(null)} disabled={busy}>Нет, оставить</Button>
          <Button onClick={runAction} disabled={busy} color={pendingAction?.action === 'archive' ? 'error' : 'primary'} variant="contained">{busy ? <CircularProgress size={20} color="inherit" /> : pendingAction ? actionCopy[pendingAction.action].confirm : ''}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function ListingCard({ property, openMenu }: { property: Item; openMenu: (anchor: HTMLElement) => void }) {
  const photo = property.photos.find(({ isPrimary }) => isPrimary) ?? property.photos[0];
  const imageUrl = photo?.previewUrl ?? photo?.url;
  const { completion, nextStep } = getCompletion(property);
  const canContinue = ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(property.status) && completion < 100;
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', boxShadow: '0 8px 28px rgba(31,50,45,.05)' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' }, minHeight: { md: 188 } }}>
        <Box sx={{ position: 'relative', minHeight: { xs: 190, md: '100%' }, bgcolor: 'grey.100' }}>
          {imageUrl ? <Image src={imageUrl} alt={property.title} fill unoptimized sizes="(max-width: 900px) 100vw, 220px" style={{ objectFit: 'cover' }} /> : <Stack alignItems="center" justifyContent="center" height="100%" color="text.disabled"><HomeWorkRounded sx={{ fontSize: 54 }} /><Typography variant="body2">Добавьте фото</Typography></Stack>}
          <Chip size="small" color={statusColors[property.status] ?? 'default'} label={statusLabels[property.status] ?? property.status} sx={{ position: 'absolute', top: 12, left: 12, fontWeight: 700, bgcolor: ['DRAFT', 'ARCHIVED'].includes(property.status) ? 'background.paper' : undefined }} />
        </Box>
        <Stack p={{ xs: 2, sm: 2.5 }} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} minWidth={0}>
          <Box minWidth={0}>
            <Typography variant="h6" fontWeight={800} noWrap>{property.title}</Typography>
            <Stack direction="row" alignItems="center" spacing={0.5} color="text.secondary" mt={0.5}><LocationOnRounded fontSize="small" /><Typography variant="body2" noWrap>{property.address ? `${property.address.city}, ${property.address.country}` : 'Локация не указана'}</Typography></Stack>
            <Stack direction="row" spacing={2} mt={2} color="text.secondary" flexWrap="wrap" useFlexGap>
              <Stack direction="row" spacing={0.5} alignItems="center"><BedRounded fontSize="small" /><Typography variant="body2">{property.bedroomsCount} спальни</Typography></Stack>
              <Stack direction="row" spacing={0.5} alignItems="center"><GroupsRounded fontSize="small" /><Typography variant="body2">до {property.maxGuests} гостей</Typography></Stack>
            </Stack>
            <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>{property.acceptsPoints && <Chip size="small" variant="outlined" color="primary" label={`${property.pointsPerNight} баллов / ночь`} />}{property.acceptsDirect && <Chip size="small" variant="outlined" label="Прямой обмен" />}</Stack>
            <Box mt={2} maxWidth={380}>
              <Stack direction="row" justifyContent="space-between" mb={0.5}><Typography variant="caption" fontWeight={700}>Готовность к публикации</Typography><Typography variant="caption" color="text.secondary">{completion}%</Typography></Stack>
              <LinearProgress color={completion === 100 ? 'success' : 'primary'} variant="determinate" value={completion} sx={{ height: 6, borderRadius: 3 }} />
            </Box>
            {property.moderationHistory[0]?.comment && <Alert severity={property.status === 'REJECTED' ? 'error' : 'warning'} sx={{ mt: 2, py: 0 }}>Комментарий модератора: {property.moderationHistory[0].comment}</Alert>}
          </Box>
          <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} justifyContent="space-between" spacing={1} flexShrink={0}>
            <Typography variant="caption" color="text.secondary">Обновлено {new Date(property.updatedAt).toLocaleDateString('ru')}</Typography>
            <Stack direction="row" flexWrap="wrap" justifyContent={{ sm: 'flex-end' }}>
              {property.status === 'PENDING_MODERATION' ? (
                <Button size="small" startIcon={<EditRounded />} disabled>На модерации</Button>
              ) : canContinue ? (
                <Button component={Link} href={`/account/homes/${property.id}/edit?step=${nextStep}`} size="small" variant="contained">Продолжить · {completion}%</Button>
              ) : (
                <Button component={Link} href={`/account/homes/${property.id}/edit`} size="small" startIcon={<EditRounded />}>Изменить</Button>
              )}
              <Button component={Link} href={`/account/homes/${property.id}/photos`} size="small">Фото</Button>
              <Button component={Link} href={`/account/homes/${property.id}/availability`} size="small">Календарь</Button>
              <IconButton size="small" aria-label={`Действия с объявлением ${property.title}`} onClick={(event) => openMenu(event.currentTarget)}><MoreVertRounded /></IconButton>
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}

function getCompletion(property: Item) {
  const today = new Date().toISOString().slice(0, 10);
  const requirements = {
    location: Boolean(property.address?.country.trim() && property.address.city.trim()),
    title: property.title.trim().length >= 5,
    description: property.description.trim().length >= 50,
    exchange: property.acceptsPoints || property.acceptsDirect,
    photo: property.photos.some(({ processingStatus }) => processingStatus === 'READY'),
    availability: property.availability.some(({ type, endsOn }) => type !== 'UNAVAILABLE' && endsOn.slice(0, 10) >= today),
  };
  const completed = Object.values(requirements).filter(Boolean).length;
  const completion = Math.round((completed / Object.keys(requirements).length) * 100);
  const nextStep = !requirements.location
    ? 1
    : !requirements.title || !requirements.description
      ? 5
      : !requirements.exchange
        ? 6
        : !requirements.photo
          ? 7
          : !requirements.availability
            ? 8
            : 9;
  return { completion, nextStep };
}

function LifecycleMenu({ anchor, property, close, choose }: { anchor: HTMLElement | null; property: Item | null; close: () => void; choose: (action: LifecycleAction) => void }) {
  return <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
    {property?.status === 'PENDING_MODERATION' && <MenuItem onClick={() => choose('cancelSubmission')}><ListItemIcon><CancelScheduleSendRounded fontSize="small" /></ListItemIcon>Отменить модерацию</MenuItem>}
    {property?.status === 'PUBLISHED' && <MenuItem onClick={() => choose('hide')}><ListItemIcon><VisibilityOffRounded fontSize="small" /></ListItemIcon>Скрыть из каталога</MenuItem>}
    {(property?.status === 'HIDDEN' || property?.status === 'ARCHIVED') && <MenuItem onClick={() => choose('restore')}><ListItemIcon><RestoreRounded fontSize="small" /></ListItemIcon>Восстановить</MenuItem>}
    {property && property.status !== 'PENDING_MODERATION' && property.status !== 'ARCHIVED' && <MenuItem onClick={() => choose('archive')} sx={{ color: 'error.main' }}><ListItemIcon><ArchiveRounded fontSize="small" color="error" /></ListItemIcon>В архив</MenuItem>}
  </Menu>;
}
