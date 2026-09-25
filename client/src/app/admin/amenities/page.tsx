import { Container } from '@mui/material';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { AdminAccess } from '@/features/admin/AdminAccess';
import { AdminAmenities } from '@/features/admin/AdminAmenities';

export const metadata: Metadata = { title: 'Удобства · Администрирование' };
export default function AdminAmenitiesPage() { return <><Header /><Container maxWidth="lg" sx={{ py: 6 }}><AdminAccess><AdminAmenities /></AdminAccess></Container></>; }
