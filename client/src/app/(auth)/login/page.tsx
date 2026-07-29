import { Link } from '@mui/material';
import NextLink from 'next/link';
import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { AuthForm } from '@/features/auth/AuthForm';

export default function LoginPage() {
  return (
    <AuthPageLayout
      title="С возвращением"
      description="Войдите, чтобы управлять поездками, гостями и ДомБаллами."
      footer={<>Нет аккаунта? <Link component={NextLink} href="/register">Зарегистрироваться</Link></>}
    >
      <AuthForm mode="login" />
    </AuthPageLayout>
  );
}
