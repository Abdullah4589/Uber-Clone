import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// In dev hit the server directly on :4000. In production use the deployed server URL.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin);

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
