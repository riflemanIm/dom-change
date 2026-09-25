import { Container } from '@mui/material';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { AdminAccess } from '@/features/admin/AdminAccess';
import { AdminUsers } from '@/features/admin/AdminUsers';

export const metadata: Metadata = { title: 'Пользователи · Администрирование' };
export default function AdminUsersPage() { return <><Header /><Container maxWidth="lg" sx={{ py: 6 }}><AdminAccess><AdminUsers /></AdminAccess></Container></>; }
