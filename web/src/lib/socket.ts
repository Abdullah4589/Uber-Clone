import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// In dev the Vite proxy doesn't cover Socket.IO, so we hit :4000 directly.
// In production the server serves the frontend, so same origin works.
const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin;

export function getSocket(token: string | null): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { auth: { token } });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
