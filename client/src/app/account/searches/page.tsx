import { Container } from '@mui/material';
import { Header } from '@/components/layout/Header';
import { SavedSearchesList } from '@/features/saved-searches/SavedSearchesList';

export default function SavedSearchesPage() {
  return <><Header /><Container maxWidth="lg" sx={{ py: 6 }}><SavedSearchesList /></Container></>;
}
