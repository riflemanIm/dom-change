'use client';

import FavoriteRounded from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import { IconButton, Tooltip } from '@mui/material';
import { useRouter } from 'next/navigation';
import { MouseEvent, useEffect, useState } from 'react';
import { FavoritesApiError, favoritesApi } from './favorites-api';

export function FavoriteButton({ propertyId, onChange }: { propertyId: string; onChange?: (favorite: boolean) => void }) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    favoritesApi.ids()
      .then((ids) => { if (active) setFavorite(ids.includes(propertyId)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [propertyId]);

  const toggle = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setPending(true);
    const hadToken = Boolean(sessionStorage.getItem('accessToken'));
    try {
      if (favorite) {
        await favoritesApi.remove(propertyId);
        setFavorite(false);
        onChange?.(false);
      } else {
        const result = await favoritesApi.add(propertyId);
        setFavorite(result.favorite);
        onChange?.(result.favorite);
      }
    } catch (reason) {
      if (!hadToken || (reason instanceof FavoritesApiError && reason.status === 401)) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
    } finally {
      setPending(false);
    }
  };

  const label = favorite ? 'Удалить из избранного' : 'Добавить в избранное';
  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        disabled={pending}
        onClick={toggle}
        sx={{ bgcolor: 'rgba(255,255,255,.92)', '&:hover': { bgcolor: 'white' } }}
      >
        {favorite ? <FavoriteRounded color="error" /> : <FavoriteBorderRounded />}
      </IconButton>
    </Tooltip>
  );
}
