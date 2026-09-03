import { Link } from '@mui/material';
import type { Metadata } from 'next';
import NextLink from 'next/link';
import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { ForgotPasswordForm } from '@/features/auth/PasswordRecoveryForms';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthPageLayout
      title="Восстановление пароля"
      description="Укажите email — отправим одноразовую ссылку для установки нового пароля."
      footer={<Link component={NextLink} href="/login">Вернуться ко входу</Link>}
    >
      <ForgotPasswordForm />
    </AuthPageLayout>
  );
}
