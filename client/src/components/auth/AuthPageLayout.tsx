import HomeRounded from '@mui/icons-material/HomeRounded';
import { Box, Container, Paper, Stack, Typography } from '@mui/material';
import Link from 'next/link';

export function AuthPageLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
      <Stack component={Link} href="/" direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ color: 'primary.main', textDecoration: 'none', mb: 4 }}>
        <HomeRounded />
        <Typography variant="h6" fontWeight={800}>DomObmen</Typography>
      </Stack>
      <Paper sx={{ p: { xs: 3, sm: 5 }, borderRadius: 4 }}>
        <Typography variant="h3" fontWeight={750} fontSize={{ xs: 34, sm: 42 }}>{title}</Typography>
        <Typography color="text.secondary" mt={1} mb={4}>{description}</Typography>
        {children}
        <Box mt={4} textAlign="center">{footer}</Box>
      </Paper>
    </Container>
  );
}
