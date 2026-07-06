import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { buildRoutes } from './routes';
import { verifyToken } from './auth';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', buildRoutes(io));

// Socket auth + room membership. Each user joins a personal room `user:<id>`;
// clients also join per-ride rooms `<rideId>` to receive live tracking.
io.on('connection', (socket) => {
  const token = socket.handshake.auth?.token as string | undefined;
  const payload = token ? verifyToken(token) : null;
  if (payload) {
    socket.join(`user:${payload.id}`);
  }
  socket.on('ride:join', (rideId: string) => socket.join(rideId));
  socket.on('ride:leave', (rideId: string) => socket.leave(rideId));
});

const PORT = Number(process.env.PORT) || 4000;
httpServer.listen(PORT, () => {
  console.log(`API + Socket.IO listening on http://localhost:${PORT}`);
});
