import { Link } from '@mui/material';
import type { Metadata } from 'next';
import NextLink from 'next/link';
import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { ResetPasswordForm } from '@/features/auth/PasswordRecoveryForms';

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  return (
    <AuthPageLayout
      title="Новый пароль"
      description="Придумайте новый пароль для аккаунта DomObmen."
      footer={<Link component={NextLink} href="/forgot-password">Запросить новую ссылку</Link>}
    >
      <ResetPasswordForm token={token} />
    </AuthPageLayout>
  );
}
