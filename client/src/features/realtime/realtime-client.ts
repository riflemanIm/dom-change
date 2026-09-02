'use client';

import { io, Socket } from 'socket.io-client';
import { authApi } from '@/features/auth/auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL ?? `${new URL(API_URL).origin}/realtime`;

let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

export async function connectRealtime() {
  if (socket?.connected) return socket;
  if (connecting) return connecting;
  connecting = (async () => {
    let token = sessionStorage.getItem('accessToken');
    if (!token) token = await authApi.refresh();
    if (!socket) {
      socket = io(REALTIME_URL, {
        autoConnect: false,
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000,
      });
    } else {
      socket.auth = { token };
    }
    if (!socket.connected) {
      socket.connect();
      try {
        await waitForConnection(socket);
      } catch (error) {
        if (!(error as Error).message.includes('повторная авторизация')) throw error;
        const refreshedToken = await authApi.refresh();
        socket.auth = { token: refreshedToken };
        socket.connect();
        await waitForConnection(socket);
      }
    }
    return socket;
  })().finally(() => { connecting = null; });
  return connecting;
}

export function disconnectRealtime() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  connecting = null;
}

export function emitWithAck<TResponse>(socket: Socket, event: string, payload: unknown, timeout = 8000) {
  return new Promise<TResponse>((resolve, reject) => {
    socket.timeout(timeout).emit(event, payload, (error: Error | null, response: TResponse & { status?: string; message?: string }) => {
      if (error) reject(new Error('Сервер не ответил. Проверьте соединение'));
      else if (response?.status === 'error') reject(new Error(response.message || 'Не удалось выполнить realtime-запрос'));
      else resolve(response);
    });
  });
}

function waitForConnection(target: Socket) {
  if (target.connected) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const connected = () => { cleanup(); resolve(); };
    const failed = (error: Error) => { cleanup(); reject(error); };
    const timer = window.setTimeout(() => { cleanup(); reject(new Error('Не удалось подключиться к серверу')); }, 8000);
    const cleanup = () => {
      window.clearTimeout(timer);
      target.off('connect', connected);
      target.off('connect_error', failed);
    };
    target.on('connect', connected);
    target.on('connect_error', failed);
  });
}
