'use client';

import SendRounded from '@mui/icons-material/SendRounded';
import { Alert, Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { ExchangeMessage, exchangesApi } from './exchanges-api';

export function ExchangeChatDialog({ requestId, ownUserId, open, onClose }: { requestId: string; ownUserId: string; open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ExchangeMessage[] | null>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const load = () => exchangesApi.messages(requestId).then((items) => { if (active) setMessages(items); }).catch((reason: Error) => { if (active) setError(reason.message); });
    void load();
    const timer = window.setInterval(load, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [open, requestId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setPending(true);
    setError('');
    try {
      const message = await exchangesApi.sendMessage(requestId, text);
      setMessages((current) => [...(current ?? []), message]);
      setBody('');
    } catch (reason) { setError((reason as Error).message); }
    finally { setPending(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Чат по заявке</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={1.25} sx={{ minHeight: 260, maxHeight: 430, overflowY: 'auto', py: 1 }}>
          {!messages && <Stack alignItems="center" py={6}><CircularProgress size={28} /></Stack>}
          {messages?.length === 0 && <Typography color="text.secondary" textAlign="center" py={6}>Напишите первое сообщение.</Typography>}
          {messages?.map((message) => {
            const mine = message.sender.id === ownUserId;
            return <Box key={message.id} alignSelf={mine ? 'flex-end' : 'flex-start'} sx={{ maxWidth: '82%', bgcolor: mine ? 'primary.main' : 'grey.100', color: mine ? 'primary.contrastText' : 'text.primary', px: 2, py: 1.25, borderRadius: 2 }}><Typography variant="body2" fontWeight={700}>{message.sender.profile?.displayName ?? 'Участник'}</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>{message.body}</Typography><Typography variant="caption" sx={{ opacity: 0.75 }}>{new Date(message.createdAt).toLocaleString('ru')}</Typography></Box>;
          })}
          <div ref={bottomRef} />
        </Stack>
        <Stack direction="row" spacing={1} mt={2} alignItems="flex-end">
          <TextField fullWidth multiline maxRows={4} label="Сообщение" value={body} onChange={(event) => setBody(event.target.value.slice(0, 4000))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} />
          <IconButton color="primary" disabled={pending || !body.trim()} onClick={() => void send()} aria-label="Отправить"><SendRounded /></IconButton>
        </Stack>
        <Button onClick={onClose} sx={{ mt: 2 }}>Закрыть</Button>
      </DialogContent>
    </Dialog>
  );
}
