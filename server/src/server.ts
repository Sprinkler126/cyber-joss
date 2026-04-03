import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import dgram from 'dgram';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT) || 3000;

const VOID_TARGETS = [
  { host: '192.0.2.1', port: 9999 },
  { host: '198.51.100.1', port: 9999 },
  { host: '203.0.113.1', port: 9999 },
];

let totalBurnCount = 0;

const app = Fastify({ logger: false });
await app.register(fastifyCors, { origin: true });

app.get('/api/stats', async () => ({ totalBurns: totalBurnCount }));
app.get('/health', async () => ({ status: 'ok' }));

const udpSocket = dgram.createSocket('udp4');
udpSocket.bind(() => {
  try {
    udpSocket.setTTL(10);
  } catch {
    // ignore unsupported TTL environments
  }
});

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (socket: WebSocket) => {
  let packetCount = 0;

  socket.on('message', (data) => {
    packetCount += 1;
    const target = VOID_TARGETS[Math.floor(Math.random() * VOID_TARGETS.length)];

    udpSocket.send(Buffer.from(data as Buffer), target.port, target.host, () => {
      // intentionally no-op: data is considered dissipated regardless of result
    });
  });

  const finalize = () => {
    if (packetCount > 0) {
      totalBurnCount += 1;
      packetCount = 0;
    }
  };

  socket.on('close', finalize);
  socket.on('error', finalize);
});

app.server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

await app.listen({ host: '0.0.0.0', port: PORT });
