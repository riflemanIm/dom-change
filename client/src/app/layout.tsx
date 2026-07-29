import type { Metadata } from 'next';
import { CssBaseline } from '@mui/material';
import { Providers } from './providers';

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
          {children}
        </Providers>
      </body>
    </html>
  );
}
