import { Container } from '@mui/material';
import { Header } from '@/components/layout/Header';
import { ModerationQueue } from '@/features/moderation/ModerationQueue';

export default function ModerationPage() {
  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <ModerationQueue />
      </Container>
    </>
  );
}
