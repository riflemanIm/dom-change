'use client';

import BookmarkAddRounded from '@mui/icons-material/BookmarkAddRounded';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, TextField } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SavedSearchApiError, savedSearchesApi } from './saved-searches-api';
import { useAuth } from '@/features/auth/auth-context';

export function SaveSearchButton({ query, defaultName, disabled }: { query: string; defaultName: string; disabled: boolean }) {
  const router = useRouter();
  const { isAuthenticated, state } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    if (name.trim().length < 2) return;
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    setPending(true);
    setError('');
    try {
      await savedSearchesApi.create(name.trim(), query);
      setOpen(false);
      setMessage('Поиск сохранён');
    } catch (reason) {
      if (reason instanceof SavedSearchApiError && reason.status === 401) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      } else {
        setError((reason as Error).message);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button size="small" startIcon={<BookmarkAddRounded />} disabled={disabled || state.status === 'loading'} onClick={() => {
        if (!isAuthenticated) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }
        setName(defaultName); setError(''); setOpen(true);
      }}>Сохранить поиск</Button>
      <Dialog open={open} onClose={() => !pending && setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Сохранить поиск</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField autoFocus fullWidth label="Название" value={name} onChange={(event) => setName(event.target.value.slice(0, 80))} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button disabled={pending} onClick={() => setOpen(false)}>Отмена</Button>
          <Button disabled={pending || name.trim().length < 2} variant="contained" onClick={() => void save()}>Сохранить</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage('')} message={message} />
    </>
  );
}
