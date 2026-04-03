import { useCallback, useEffect, useRef, useState } from 'react';

export type BurnPhase = 'idle' | 'igniting' | 'burning' | 'fading' | 'done';

export interface BurnState {
  phase: BurnPhase;
  progress: number;
  packetsSent: number;
  totalPackets: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = import.meta.env.VITE_SERVER_HOST?.trim();
  if (host) {
    return `${protocol}//${host}`;
  }

  const port = import.meta.env.VITE_SERVER_PORT?.trim() || '3000';
  return `${protocol}//${window.location.hostname}:${port}`;
}

function buildApiBase() {
  const protocol = window.location.protocol;
  const host = import.meta.env.VITE_SERVER_HOST?.trim();
  if (host) {
    return `${protocol}//${host}`;
  }

  const port = import.meta.env.VITE_SERVER_PORT?.trim() || '3000';
  return `${protocol}//${window.location.hostname}:${port}`;
}

export function useBurnCeremony() {
  const [state, setState] = useState<BurnState>({ phase: 'idle', progress: 0, packetsSent: 0, totalPackets: 0 });
  const [totalBurns, setTotalBurns] = useState(0);
  const [networkStatus, setNetworkStatus] = useState('香火尚未点燃，虚空彼岸一片寂静。');
  const wsRef = useRef<WebSocket | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${buildApiBase()}/api/stats`);
      if (!response.ok) {
        throw new Error('stats request failed');
      }
      const data = await response.json();
      setTotalBurns(data.totalBurns || 0);
    } catch {
      // ignore stats failures and keep UI available
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const burn = useCallback(async (textInput: string, files: File[], totalMingli: number) => {
    setState({ phase: 'igniting', progress: 0, packetsSent: 0, totalPackets: 0 });
    setNetworkStatus('正在点火，火舌将触及纸面……');
    await sleep(1400);

    const chunks: ArrayBuffer[] = [];
    if (textInput.trim()) {
      for (let index = 0; index < textInput.length; index += 200) {
        chunks.push(new TextEncoder().encode(textInput.slice(index, index + 200)).buffer);
      }
    }

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      for (let index = 0; index < buffer.byteLength; index += 4096) {
        chunks.push(buffer.slice(index, index + 4096));
      }
    }

    const totalPackets = chunks.length || 1;
    setState((current) => ({ ...current, phase: 'burning', totalPackets }));
    setNetworkStatus('正在连接焚化通道，将分片送往赛博虚空。');

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(buildWsUrl());
      wsRef.current = ws;
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          if (!ws) return reject(new Error('missing websocket'));
          ws.onopen = () => resolve();
          ws.onerror = () => reject(new Error('websocket error'));
        }),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
      setNetworkStatus('焚化通道已开启，纸灰正穿过光缆与路由。');
    } catch {
      setNetworkStatus('未能连上后端焚化通道，当前以本地仪式动画完成消散。');
      ws = null;
      wsRef.current = null;
    }

    for (let index = 0; index < chunks.length; index += 1) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(chunks[index]);
      }

      setState((current) => ({
        ...current,
        packetsSent: index + 1,
        progress: (index + 1) / totalPackets,
      }));

      await sleep(Math.max(24, 130 - totalMingli * 1.4));
    }

    setState((current) => ({ ...current, phase: 'fading', progress: 1, packetsSent: totalPackets, totalPackets }));
    setNetworkStatus('火势渐熄，余烬正向上飘散。');
    await sleep(2400);

    setState((current) => ({ ...current, phase: 'done' }));
    setNetworkStatus('焚化完成，思念已遁入数字长河。');
    ws?.close();
    wsRef.current = null;
    await fetchStats();
  }, [fetchStats]);

  const reset = useCallback(() => {
    setState({ phase: 'idle', progress: 0, packetsSent: 0, totalPackets: 0 });
    setNetworkStatus('香火尚未点燃，虚空彼岸一片寂静。');
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  return { state, burn, reset, totalBurns, networkStatus };
}
