import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { CssBaseline } from '@mui/material';
import { Providers } from './providers';

const manrope = Manrope({ subsets: ['cyrillic', 'latin'], variable: '--font-manrope' });

export const metadata: Metadata = {
  title: { default: 'DomObmen — путешествуйте по-домашнему', template: '%s | DomObmen' },
  description: 'Обменивайтесь жильём напрямую или путешествуйте за ДомБаллы.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body style={{ margin: 0 }}>
        <Providers>
          <CssBaseline />
          {children}
        </Providers>
      </body>
    </html>
  );
}
