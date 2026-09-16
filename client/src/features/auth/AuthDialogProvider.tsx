'use client';

import CloseRounded from '@mui/icons-material/CloseRounded';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import NextLink from 'next/link';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { AuthForm } from './AuthForm';

type AuthMode = 'login' | 'register';
type OpenAuthOptions = { mode?: AuthMode; onSuccess?: () => void | Promise<void> };
type AuthDialogContextValue = {
  openAuth: (options?: OpenAuthOptions) => void;
  closeAuth: () => void;
};

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null);

export function AuthDialogProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [successAction, setSuccessAction] = useState<OpenAuthOptions['onSuccess']>();

  const closeAuth = useCallback(() => {
    setOpen(false);
    setSuccessAction(undefined);
  }, []);
  const openAuth = useCallback((options: OpenAuthOptions = {}) => {
    setMode(options.mode ?? 'login');
    setSuccessAction(() => options.onSuccess);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ openAuth, closeAuth }), [closeAuth, openAuth]);

  const completeAuth = async () => {
    const action = successAction;
    closeAuth();
    try {
      await action?.();
    } catch {
      // The originating feature owns errors from its resumed action.
    }
  };

  return (
    <AuthDialogContext.Provider value={value}>
      {children}
      <Dialog open={open} onClose={closeAuth} fullWidth maxWidth="xs" fullScreen={fullScreen} aria-labelledby="auth-dialog-title">
        <DialogTitle id="auth-dialog-title" sx={{ pt: { xs: 3, sm: 4 }, px: { xs: 3, sm: 4 }, pr: 7 }}>
          {mode === 'login' ? 'С возвращением' : 'Создайте аккаунт'}
          <IconButton aria-label="Закрыть" onClick={closeAuth} sx={{ position: 'absolute', top: 16, right: 16 }}>
            <CloseRounded />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 3, sm: 4 }, pb: { xs: 3, sm: 4 } }}>
          <Typography color="text.secondary" mb={3}>
            {mode === 'login'
              ? 'Войдите, чтобы управлять поездками, гостями и ДомБаллами.'
              : 'Откройте свой дом для гостей и путешествуйте по-домашнему.'}
          </Typography>
          <AuthForm key={mode} mode={mode} onSuccess={completeAuth} onForgotPassword={closeAuth} />
          <Stack direction="row" justifyContent="center" spacing={0.7} mt={3}>
            <Typography color="text.secondary">
              {mode === 'login' ? 'Нет аккаунта?' : 'Уже зарегистрированы?'}
            </Typography>
            <Link component="button" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
            </Link>
          </Stack>
          {mode === 'register' && (
            <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={2}>
              Подробности доступны в <Link component={NextLink} href="/help" onClick={closeAuth}>центре помощи</Link>.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog() {
  const context = useContext(AuthDialogContext);
  if (!context) throw new Error('useAuthDialog must be used inside AuthDialogProvider');
  return context;
}
