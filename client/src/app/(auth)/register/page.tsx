import { Link } from '@mui/material';
import NextLink from 'next/link';
import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { AuthForm } from '@/features/auth/AuthForm';

export default function RegisterPage() {
  return (
    <AuthPageLayout
      title="Присоединяйтесь"
      description="Откройте свой дом для гостей и путешествуйте по-домашнему."
      footer={<>Уже зарегистрированы? <Link component={NextLink} href="/login">Войти</Link></>}
    >
      <AuthForm mode="register" />
    </AuthPageLayout>
  );
}
