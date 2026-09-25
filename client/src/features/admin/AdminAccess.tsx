'use client';

import { Alert, CircularProgress, Stack } from '@mui/material';
import { ReactNode } from 'react';
import { useAuth } from '@/features/auth/use-auth';

export function AdminAccess({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Stack alignItems="center" py={8}><CircularProgress /></Stack>;
  if (user?.role !== 'ADMIN') return <Alert severity="error">Раздел доступен только администратору.</Alert>;
  return children;
}
