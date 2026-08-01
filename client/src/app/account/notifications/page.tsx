import { Container } from '@mui/material';
import { Header } from '@/components/layout/Header';
import { NotificationsList } from '@/features/notifications/NotificationsList';

export default function NotificationsPage() { return <><Header /><Container maxWidth="lg" sx={{ py: 6 }}><NotificationsList /></Container></>; }
