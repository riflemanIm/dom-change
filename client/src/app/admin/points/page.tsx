import { Container } from '@mui/material';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { AdminPointsManager } from '@/features/points/AdminPointsManager';

export const metadata: Metadata = { title: 'Управление ДомБаллами' };

export default function AdminPointsPage() {
  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <AdminPointsManager />
      </Container>
    </>
  );
}
