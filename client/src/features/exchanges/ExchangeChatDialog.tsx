'use client';

import SendRounded from '@mui/icons-material/SendRounded';
import DoneRounded from '@mui/icons-material/DoneRounded';
import DoneAllRounded from '@mui/icons-material/DoneAllRounded';
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
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = useRef(false);
  const peerUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    let rejoin: (() => void) | null = null;
    const receive = (message: ExchangeMessage) => {
      if (!active || message.exchangeRequestId !== requestId) return;
      setMessages((current) => mergeMessages(current, [message]));
      if (message.sender.id !== ownUserId) void markRead().catch(() => undefined);
    };
    const receiveRead = (payload: { exchangeRequestId: string; readerId: string; readAt: string }) => {
      if (!active || payload.exchangeRequestId !== requestId || payload.readerId === ownUserId) return;
      setMessages((current) => current?.map((message) => message.sender.id === ownUserId && !message.readAt ? { ...message, readAt: payload.readAt } : message) ?? null);
    };
    const receiveTyping = (payload: { exchangeRequestId: string; userId: string; typing: boolean }) => {
      if (active && payload.exchangeRequestId === requestId && payload.userId !== ownUserId) setPeerTyping(payload.typing);
    };
    const receivePresence = (payload: { exchangeRequestId: string; userId: string; online: boolean }) => {
      if (active && payload.exchangeRequestId === requestId && payload.userId === peerUserIdRef.current) {
        setPeerOnline(payload.online);
        if (!payload.online) setPeerTyping(false);
      }
    };
    const markRead = async () => {
      const socket = socketRef.current;
      if (socket?.connected) await emitWithAck(socket, 'exchange:read', { exchangeRequestId: requestId });
      else await exchangesApi.markMessagesRead(requestId);
    };
    exchangesApi.messages(requestId).then((items) => { if (active) setMessages((current) => mergeMessages(current, items)); }).catch((reason: Error) => { if (active) setError(reason.message); });
    connectRealtime().then(async (socket) => {
      if (!active) return;
      socketRef.current = socket;
      socket.on('exchange:message', receive);
      socket.on('exchange:read', receiveRead);
      socket.on('exchange:typing', receiveTyping);
      socket.on('exchange:presence', receivePresence);
      const join = async () => {
        const result = await emitWithAck<{ ok: true; messages: ExchangeMessage[]; peerUserId: string; peerOnline: boolean }>(socket, 'exchange:join', { exchangeRequestId: requestId });
        if (active) {
          peerUserIdRef.current = result.peerUserId;
          setPeerOnline(result.peerOnline);
          setMessages((current) => mergeMessages(current, result.messages));
          await markRead();
        }
      };
      rejoin = () => { void join().catch((reason: Error) => { if (active) setError(reason.message); }); };
      socket.on('connect', rejoin);
      await join();
    }).catch((reason: Error) => { if (active) setError(reason.message); });
    return () => {
      active = false;
      const socket = socketRef.current;
      socket?.off('exchange:message', receive);
      socket?.off('exchange:read', receiveRead);
      socket?.off('exchange:typing', receiveTyping);
      socket?.off('exchange:presence', receivePresence);
      if (rejoin) socket?.off('connect', rejoin);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (socket?.connected) {
        socket.emit('exchange:typing', { exchangeRequestId: requestId, typing: false });
        socket.emit('exchange:leave', { exchangeRequestId: requestId });
      }
      socketRef.current = null;
      peerUserIdRef.current = null;
    };
  }, [open, ownUserId, requestId]);

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
      setMessages((current) => mergeMessages(current, [message]));
      setBody('');
      emitTyping(false);
    } catch (reason) { setError((reason as Error).message); }
    finally { setPending(false); }
  };

  const emitTyping = (typing: boolean) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (!typing) {
      if (typingActiveRef.current) socket.emit('exchange:typing', { exchangeRequestId: requestId, typing: false });
      typingActiveRef.current = false;
      return;
    }
    if (!typingActiveRef.current) socket.emit('exchange:typing', { exchangeRequestId: requestId, typing: true });
    typingActiveRef.current = true;
    typingTimerRef.current = setTimeout(() => {
      socket.emit('exchange:typing', { exchangeRequestId: requestId, typing: false });
      typingActiveRef.current = false;
    }, 1800);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Чат по заявке
        <Typography variant="caption" display="block" color={peerOnline ? 'success.main' : 'text.secondary'}>{peerOnline ? 'В сети' : 'Не в сети'}</Typography>
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={1.25} sx={{ minHeight: 260, maxHeight: 430, overflowY: 'auto', py: 1 }}>
          {!messages && <Stack alignItems="center" py={6}><CircularProgress size={28} /></Stack>}
          {messages?.length === 0 && <Typography color="text.secondary" textAlign="center" py={6}>Напишите первое сообщение.</Typography>}
          {messages?.map((message) => {
            const mine = message.sender.id === ownUserId;
            return <Box key={message.id} alignSelf={mine ? 'flex-end' : 'flex-start'} sx={{ maxWidth: '82%', bgcolor: mine ? 'primary.main' : 'grey.100', color: mine ? 'primary.contrastText' : 'text.primary', px: 2, py: 1.25, borderRadius: 2 }}><Typography variant="body2" fontWeight={700}>{message.sender.profile?.displayName ?? 'Участник'}</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>{message.body}</Typography><Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end"><Typography variant="caption" sx={{ opacity: 0.75 }}>{new Date(message.createdAt).toLocaleString('ru')}</Typography>{mine && (message.readAt ? <DoneAllRounded sx={{ fontSize: 16, opacity: 0.85 }} /> : <DoneRounded sx={{ fontSize: 16, opacity: 0.7 }} />)}</Stack></Box>;
          })}
          <div ref={bottomRef} />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ minHeight: 20, display: 'block' }}>{peerTyping ? 'Собеседник печатает…' : ''}</Typography>
        <Stack direction="row" spacing={1} mt={2} alignItems="flex-end">
          <TextField fullWidth multiline maxRows={4} label="Сообщение" value={body} onChange={(event) => { const value = event.target.value.slice(0, 4000); setBody(value); emitTyping(Boolean(value.trim())); }} onBlur={() => emitTyping(false)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} />
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
