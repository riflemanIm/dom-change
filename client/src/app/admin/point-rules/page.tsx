import { Container } from '@mui/material';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { AdminAccess } from '@/features/admin/AdminAccess';
import { AdminPointRules } from '@/features/admin/AdminPointRules';

export const metadata: Metadata = { title: 'Правила ДомБаллов · Администрирование' };
export default function AdminPointRulesPage() { return <><Header /><Container maxWidth="lg" sx={{ py: 6 }}><AdminAccess><AdminPointRules /></AdminAccess></Container></>; }
