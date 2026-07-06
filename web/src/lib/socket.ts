import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// The API + Socket.IO server. In dev we hit the server directly on :4000.
const SOCKET_URL = 'http://localhost:4000';

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
