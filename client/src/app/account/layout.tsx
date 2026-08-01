import { Box, Container } from '@mui/material';
import { ReactNode } from 'react';
import { Header } from '@/components/layout/Header';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <><Header /><Box component="main" sx={{ bgcolor: '#f8faf8', minHeight: 'calc(100vh - 76px)', py: { xs: 2, md: 5 } }}><Container maxWidth="lg">{children}</Container></Box></>;
}
