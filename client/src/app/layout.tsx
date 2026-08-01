import type { Metadata } from 'next';
import { CssBaseline } from '@mui/material';
import { Providers } from './providers';
import { Suspense } from 'react';
import { RouteLoadingBar } from '@/components/navigation/RouteLoadingBar';

export const metadata: Metadata = {
  title: { default: 'DomObmen — путешествуйте по-домашнему', template: '%s | DomObmen' },
  description: 'Обменивайтесь жильём напрямую или путешествуйте за ДомБаллы.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body style={{ margin: 0 }}>
        <Providers>
          <CssBaseline />
          <Suspense fallback={null}><RouteLoadingBar /></Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}
