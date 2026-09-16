'use client';

import { Alert, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { getPointsHistory, PointsHistory } from './points-api';
import { formatRuDateTime } from '@/utils/date-format';

const typeLabels: Record<string, string> = {
  BONUS: 'Бонус', RESERVE: 'Резервирование', RELEASE: 'Возврат резерва', DEBIT: 'Оплата обмена',
  HOST_CREDIT: 'Начисление хозяину', HOST_PENDING: 'Ожидает начисления', REFUND: 'Возврат',
};

export function PointsHistoryView() {
  const [data, setData] = useState<PointsHistory | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getPointsHistory().then(setData).catch((reason: Error) => setError(reason.message)); }, []);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Stack alignItems="center" py={10}><CircularProgress /></Stack>;
  return (
    <Stack spacing={3}>
      <div><Typography variant="h3" fontWeight={750}>ДомБаллы</Typography><Typography color="text.secondary" mt={1}>Баланс и история операций обмена.</Typography></div>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Paper sx={{ p: 3, flex: 1 }}><Typography color="text.secondary">Доступно</Typography><Typography variant="h4" fontWeight={800}>{data.available}</Typography></Paper>
        <Paper sx={{ p: 3, flex: 1 }}><Typography color="text.secondary">Зарезервировано</Typography><Typography variant="h4" fontWeight={800}>{data.reserved}</Typography></Paper>
        <Paper sx={{ p: 3, flex: 1 }}><Typography color="text.secondary">Бонусных начислений</Typography><Typography variant="h4" fontWeight={800}>{data.bonus}</Typography></Paper>
      </Stack>
      <Typography variant="h5" fontWeight={750}>Последние операции</Typography>
      {!data.transactions.length && <Paper sx={{ p: 4 }}><Typography color="text.secondary">Операций пока нет.</Typography></Paper>}
      {data.transactions.map((transaction) => {
        const positive = BigInt(transaction.amount) >= BigInt(0);
        return <Paper key={transaction.id} variant="outlined" sx={{ p: 2 }}><Stack direction="row" justifyContent="space-between" spacing={2}><div><Typography fontWeight={700}>{typeLabels[transaction.type] ?? transaction.type}</Typography><Typography color="text.secondary" variant="body2">{transaction.description} · {formatRuDateTime(transaction.createdAt)}</Typography></div><Typography fontWeight={800} color={positive ? 'success.main' : 'text.primary'}>{positive ? '+' : ''}{transaction.amount}</Typography></Stack></Paper>;
      })}
    </Stack>
  );
}
