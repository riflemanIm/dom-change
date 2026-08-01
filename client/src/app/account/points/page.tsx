import { Container } from '@mui/material';
import { Header } from '@/components/layout/Header';
import { PointsHistoryView } from '@/features/points/PointsHistoryView';

export default function PointsPage() {
  return <><Header /><Container maxWidth="lg" sx={{ py: 6 }}><PointsHistoryView /></Container></>;
}
