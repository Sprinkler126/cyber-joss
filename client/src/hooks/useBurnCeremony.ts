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
  if (host) return `${protocol}//${host}`;
  const port = import.meta.env.VITE_SERVER_PORT?.trim() || '3000';
  return `${protocol}//${window.location.hostname}:${port}`;
}

function buildApiBase() {
  const protocol = window.location.protocol;
  const host = import.meta.env.VITE_SERVER_HOST?.trim();
  if (host) return `${protocol}//${host}`;
  const port = import.meta.env.VITE_SERVER_PORT?.trim() || '3000';
  return `${protocol}//${window.location.hostname}:${port}`;
}

/**
 * Continuous burn ceremony.
 *
 * Key change: `feedFiles` can be called at ANY time — even while burning.
 * New files are appended to a live queue and consumed on the fly.
 * The ceremony never rejects input; fire only grows.
 */
export function useBurnCeremony() {
  const [state, setState] = useState<BurnState>({ phase: 'idle', progress: 0, packetsSent: 0, totalPackets: 0 });
  const [totalBurns, setTotalBurns] = useState(0);
  const [networkStatus, setNetworkStatus] = useState('香火尚未点燃，虚空彼岸一片寂静。');

  // Live queue: chunks can be appended mid-burn
  const queueRef = useRef<ArrayBuffer[]>([]);
  const burningRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${buildApiBase()}/api/stats`);
      if (!r.ok) throw new Error('fail');
      const d = await r.json();
      setTotalBurns(d.totalBurns || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void fetchStats(); }, [fetchStats]);

  /**
   * Append files/text to the burn queue.
   * If not currently burning, starts the ceremony.
   * If already burning, seamlessly extends the queue (fire keeps going).
   */
  const feedFiles = useCallback(async (textInput: string, files: File[], totalMingli: number) => {
    // Chunk the input
    const newChunks: ArrayBuffer[] = [];
    if (textInput.trim()) {
      for (let i = 0; i < textInput.length; i += 200) {
        newChunks.push(new TextEncoder().encode(textInput.slice(i, i + 200)).buffer);
      }
    }
    for (const file of files) {
      const buf = await file.arrayBuffer();
      for (let i = 0; i < buf.byteLength; i += 4096) {
        newChunks.push(buf.slice(i, i + 4096));
      }
    }
    if (newChunks.length === 0) {
      // Still acknowledge the drop with at least 1 virtual packet
      newChunks.push(new ArrayBuffer(0));
    }

    // Push into queue
    queueRef.current.push(...newChunks);

    // Update totalPackets to reflect new queue length
    setState((s) => ({
      ...s,
      totalPackets: s.totalPackets + newChunks.length,
    }));

    // If already burning, the loop will pick up the new chunks automatically
    if (burningRef.current) return;

    // Otherwise, start the ceremony
    burningRef.current = true;

    setState({ phase: 'igniting', progress: 0, packetsSent: 0, totalPackets: queueRef.current.length });
    setNetworkStatus('正在点火，火舌将触及纸面……');
    await sleep(1200);

    setState((s) => ({ ...s, phase: 'burning' }));
    setNetworkStatus('纸灰正穿过光缆与路由。');

    // Try websocket
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(buildWsUrl());
      wsRef.current = ws;
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          if (!ws) return reject(new Error('no ws'));
          ws.onopen = () => resolve();
          ws.onerror = () => reject(new Error('ws error'));
        }),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
    } catch {
      ws = null;
      wsRef.current = null;
    }

    // Drain loop — keeps running as long as queue has items
    let sent = 0;
    while (queueRef.current.length > 0) {
      const chunk = queueRef.current.shift()!;

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(chunk);
      }

      sent++;
      const total = sent + queueRef.current.length;
      setState((s) => ({
        ...s,
        phase: 'burning',
        packetsSent: sent,
        totalPackets: total,
        progress: total > 0 ? sent / total : 1,
      }));

      await sleep(Math.max(20, 110 - totalMingli * 1.2));
    }

    // Fading
    setState((s) => ({ ...s, phase: 'fading', progress: 1, packetsSent: sent, totalPackets: sent }));
    setNetworkStatus('火势渐熄，余烬正向上飘散。');
    await sleep(2200);

    setState((s) => ({ ...s, phase: 'done' }));
    setNetworkStatus('焚化完成，思念已遁入数字长河。');
    ws?.close();
    wsRef.current = null;
    burningRef.current = false;
    await fetchStats();
  }, [fetchStats]);

  const reset = useCallback(() => {
    queueRef.current = [];
    burningRef.current = false;
    setState({ phase: 'idle', progress: 0, packetsSent: 0, totalPackets: 0 });
    setNetworkStatus('香火尚未点燃，虚空彼岸一片寂静。');
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  return { state, feedFiles, reset, totalBurns, networkStatus, isBurning: burningRef };
}
