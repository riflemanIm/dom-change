import { ExchangeRequestsList } from '@/features/exchanges/ExchangeRequestsList';
import { Suspense } from 'react';

export default function ExchangesPage() {
  return <Suspense><ExchangeRequestsList /></Suspense>;
}
