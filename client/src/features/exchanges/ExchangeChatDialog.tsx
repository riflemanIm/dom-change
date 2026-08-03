'use client';

import SendRounded from '@mui/icons-material/SendRounded';
import { Alert, Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { ExchangeMessage, exchangesApi } from './exchanges-api';
import { connectRealtime, emitWithAck } from '@/features/realtime/realtime-client';
import type { Socket } from 'socket.io-client';

export function ExchangeChatDialog({ requestId, ownUserId, open, onClose }: { requestId: string; ownUserId: string; open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ExchangeMessage[] | null>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    let rejoin: (() => void) | null = null;
    const receive = (message: ExchangeMessage) => {
      if (!active || message.exchangeRequestId !== requestId) return;
      setMessages((current) => mergeMessages(current, [message]));
    };
    exchangesApi.messages(requestId).then((items) => { if (active) setMessages((current) => mergeMessages(current, items)); }).catch((reason: Error) => { if (active) setError(reason.message); });
    connectRealtime().then(async (socket) => {
      if (!active) return;
      socketRef.current = socket;
      socket.on('exchange:message', receive);
      const join = async () => {
        const result = await emitWithAck<{ ok: true; messages: ExchangeMessage[] }>(socket, 'exchange:join', { exchangeRequestId: requestId });
        if (active) setMessages((current) => mergeMessages(current, result.messages));
      };
      rejoin = () => { void join().catch((reason: Error) => { if (active) setError(reason.message); }); };
      socket.on('connect', rejoin);
      await join();
    }).catch((reason: Error) => { if (active) setError(reason.message); });
    return () => {
      active = false;
      const socket = socketRef.current;
      socket?.off('exchange:message', receive);
      if (rejoin) socket?.off('connect', rejoin);
      if (socket?.connected) socket.emit('exchange:leave', { exchangeRequestId: requestId });
      socketRef.current = null;
    };
  }, [open, requestId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setPending(true);
    setError('');
    try {
      const socket = socketRef.current;
      const message = socket?.connected
        ? await emitWithAck<ExchangeMessage>(socket, 'exchange:send', { exchangeRequestId: requestId, body: text })
        : await exchangesApi.sendMessage(requestId, text);
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

function mergeMessages(current: ExchangeMessage[] | null, incoming: ExchangeMessage[]) {
  const messages = new Map((current ?? []).map((message) => [message.id, message]));
  incoming.forEach((message) => messages.set(message.id, message));
  return [...messages.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}
