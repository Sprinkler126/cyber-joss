// server/src/server.ts
// 赛博烧纸后端 —— 接收数据，转发至虚空，不存任何内容

import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { WebSocketServer, WebSocket } from 'ws';
import dgram from 'dgram';
import http from 'http';

const PORT = Number(process.env.PORT) || 3000;

// RFC 5737 文档专用地址 —— 数据包的归宿
const VOID_TARGETS = [
  { host: '192.0.2.1', port: 9999 },
  { host: '198.51.100.1', port: 9999 },
  { host: '203.0.113.1', port: 9999 },
];

// 全局计数器（仅计数，不存内容）
let totalBurnCount = 0;

// Fastify 实例 —— 不记录日志
const app = Fastify({ logger: false });

// CORS
app.register(fastifyCors, { origin: '*' });

// 唯一接口：查询总焚烧次数
app.get('/api/stats', async () => {
  return { totalBurns: totalBurnCount };
});

// 健康检查
app.get('/health', async () => {
  return { status: 'ok' };
});

// 启动 HTTP 服务器
const server = http.createServer(app);

// WebSocket 服务
const wss = new WebSocketServer({ server, path: '/' });

// UDP socket
const udpSocket = dgram.createSocket('udp4');
udpSocket.bind(() => {
  try {
    udpSocket.setTTL(8);
  } catch {
    // 某些系统不支持设置 TTL
  }
});

wss.on('connection', (ws: WebSocket) => {
  let packetCount = 0;

  ws.on('message', (data: Buffer) => {
    packetCount++;

    // 随机选择虚空地址
    const target = VOID_TARGETS[Math.floor(Math.random() * VOID_TARGETS.length)];

    // UDP 发送，不等待回复
    udpSocket.send(data, target.port, target.host, () => {
      // 无论成功失败，数据已消散
    });
  });

  ws.on('close', () => {
    if (packetCount > 0) {
      totalBurnCount++;
    }
  });

  ws.on('error', () => {
    if (packetCount > 0) {
      totalBurnCount++;
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🕯️ 赛博烧纸服务已启动 - 端口 ${PORT}`);
});
