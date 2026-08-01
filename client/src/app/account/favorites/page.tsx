import { Container } from '@mui/material';
import { Header } from '@/components/layout/Header';
import { FavoritesList } from '@/features/favorites/FavoritesList';

export default function FavoritesPage() {
  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 6 }}><FavoritesList /></Container>
    </>
  );
}
