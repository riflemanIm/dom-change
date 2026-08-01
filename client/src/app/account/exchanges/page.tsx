import { Container } from '@mui/material';
import { Header } from '@/components/layout/Header';
import { ExchangeRequestsList } from '@/features/exchanges/ExchangeRequestsList';
import { Suspense } from 'react';

export default function ExchangesPage() {
  return <><Header /><Container maxWidth="lg" sx={{ py: 6 }}><Suspense><ExchangeRequestsList /></Suspense></Container></>;
}
