import { Container } from '@mui/material';
import { Header } from '@/components/layout/Header';
import { AccountOverview } from '@/features/auth/AccountOverview';

export default function AccountPage() {
  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <AccountOverview />
      </Container>
    </>
  );
}
