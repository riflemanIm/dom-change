import { Box, Container, Stack } from '@mui/material';
import { ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { AccountNavigation } from '@/features/account/AccountNavigation';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <><Header /><Box component="main" sx={{ bgcolor: '#f8faf8', minHeight: 'calc(100vh - 76px)', py: { xs: 2, md: 5 } }}><Container maxWidth="xl"><Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 4 }}><AccountNavigation /><Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box></Stack></Container></Box></>;
}
