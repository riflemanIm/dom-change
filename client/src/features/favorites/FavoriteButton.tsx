'use client';

import FavoriteRounded from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import { IconButton, Tooltip } from '@mui/material';
import { MouseEvent, useEffect, useState } from 'react';
import { FavoritesApiError, favoritesApi } from './favorites-api';
import { useAuth } from '@/features/auth/use-auth';
import { useAuthDialog } from '@/features/auth/AuthDialogProvider';

export function FavoriteButton({ propertyId, onChange }: { propertyId: string; onChange?: (favorite: boolean) => void }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { openAuth } = useAuthDialog();
  const [favorite, setFavorite] = useState(false);
  const [pending, setPending] = useState(false);

  const addFavorite = async () => {
    setPending(true);
    try {
      const result = await favoritesApi.add(propertyId);
      setFavorite(result.favorite);
      onChange?.(result.favorite);
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setFavorite(false);
      return;
    }
    let active = true;
    favoritesApi.ids()
      .then((ids) => { if (active) setFavorite(ids.includes(propertyId)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [propertyId, isAuthenticated, isLoading]);

  const toggle = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) {
      openAuth({ mode: 'login', onSuccess: addFavorite });
      return;
    }
    setPending(true);
    try {
      if (favorite) {
        await favoritesApi.remove(propertyId);
        setFavorite(false);
        onChange?.(false);
      } else {
        await addFavorite();
      }
    } catch (reason) {
      if (reason instanceof FavoritesApiError && reason.status === 401) {
        openAuth({ mode: 'login' });
      }
    } finally { setPending(false); }
  };

  const label = favorite ? 'Удалить из избранного' : 'Добавить в избранное';
  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        disabled={pending || isLoading}
        onClick={toggle}
        sx={{ bgcolor: 'rgba(255,255,255,.92)', '&:hover': { bgcolor: 'white' } }}
      >
        {favorite ? <FavoriteRounded color="error" /> : <FavoriteBorderRounded />}
      </IconButton>
    </Tooltip>
  );
}
