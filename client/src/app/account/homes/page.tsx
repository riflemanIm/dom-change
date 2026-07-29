import { Container } from '@mui/material';
import { Header } from '@/components/layout/Header';
import { MyProperties } from '@/features/properties/MyProperties';

export default function MyPropertiesPage() {
  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <MyProperties />
      </Container>
    </>
  );
}
