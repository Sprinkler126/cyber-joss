import { useCallback, useEffect, useRef, useState } from 'react';

export type BurnPhase = 'idle' | 'igniting' | 'burning' | 'fading' | 'done';

export interface BurnState {
  phase: BurnPhase;
  progress: number;
  packetsSent: number;
  totalPackets: number;
  currentText?: string; // 当前正在发送的包对应的文本
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 动态调节参数，避免大文件时卡顿
 * 根据总包数调整：抽取字数、动画时长、发送间隔
 */
export function calculateBurnParams(totalPackets: number) {
  // 小文件：仪式感优先；大文件：性能优先
  if (totalPackets <= 15) {
    // 小文件：丰富的视觉效果
    return {
      charsPerPacket: 3 + Math.floor(Math.random() * 2), // 3-4 字
      packetDelay: 400, // 较慢，有仪式感
      animationDuration: 4000 + Math.random() * 2000, // 4-6秒
      maxConcurrentFloats: 20, // 同时显示的字数上限
    };
  } else if (totalPackets <= 50) {
    // 中等文件：平衡
    return {
      charsPerPacket: 2,
      packetDelay: 180,
      animationDuration: 3000 + Math.random() * 1000, // 3-4秒
      maxConcurrentFloats: 15,
    };
  } else if (totalPackets <= 150) {
    // 大文件：减少效果
    return {
      charsPerPacket: 1,
      packetDelay: 80,
      animationDuration: 2000 + Math.random() * 500, // 2-2.5秒
      maxConcurrentFloats: 10,
    };
  } else {
    // 超大文件：最小效果，保证流畅
    return {
      charsPerPacket: 1,
      packetDelay: 40,
      animationDuration: 1500, // 1.5秒
      maxConcurrentFloats: 5,
    };
  }
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
  const textQueueRef = useRef<string[]>([]); // 对应的文本片段
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
    // 先估算总包数，用于动态调节
    let estimatedChunks = 0;
    if (textInput.trim()) {
      estimatedChunks += Math.ceil(textInput.length / 120);
    }
    for (const file of files) {
      estimatedChunks += Math.ceil(file.size / 2048);
    }
    
    // 获取动态参数
    const params = calculateBurnParams(estimatedChunks);
    
    // Chunk the input
    const newChunks: ArrayBuffer[] = [];
    const newTextChunks: string[] = []; // 对应的文本片段
    
    if (textInput.trim()) {
      for (let i = 0; i < textInput.length; i += 120) {
        newChunks.push(new TextEncoder().encode(textInput.slice(i, i + 120)).buffer);
        // 根据包数动态调整抽取字数
        const chunkText = textInput.slice(i, i + 120);
        const chars = chunkText.split('').filter(c => c.trim());
        if (chars.length > 0) {
          const numChars = Math.min(params.charsPerPacket, chars.length);
          let selectedChars = '';
          for (let j = 0; j < numChars; j++) {
            const randomIdx = Math.floor(Math.random() * chars.length);
            selectedChars += chars[randomIdx];
          }
          newTextChunks.push(selectedChars);
        } else {
          newTextChunks.push('思念');
        }
      }
    }
    
    for (const file of files) {
      const buf = await file.arrayBuffer();
      const text = new TextDecoder().decode(buf);
      for (let i = 0; i < buf.byteLength; i += 2048) {
        newChunks.push(buf.slice(i, i + 2048));
        // 根据包数动态调整抽取字数
        const chunkText = text.slice(i, i + 2048);
        const chars = chunkText.split('').filter(c => c.trim() && c.charCodeAt(0) > 127);
        let selectedChars = '';
        const numChars = params.charsPerPacket;
        
        if (chars.length > 0) {
          for (let j = 0; j < numChars && j < chars.length; j++) {
            const randomIdx = Math.floor(Math.random() * chars.length);
            selectedChars += chars[randomIdx];
          }
        } else {
          const anyChars = chunkText.split('').filter(c => c.trim());
          if (anyChars.length > 0) {
            for (let j = 0; j < numChars && j < anyChars.length; j++) {
              const randomIdx = Math.floor(Math.random() * anyChars.length);
              selectedChars += anyChars[randomIdx];
            }
          } else {
            selectedChars = '思念';
          }
        }
        newTextChunks.push(selectedChars);
      }
    }
    
    if (newChunks.length === 0) {
      newChunks.push(new ArrayBuffer(0));
      newTextChunks.push('·');
    }

    // Push into queue
    queueRef.current.push(...newChunks);
    textQueueRef.current.push(...newTextChunks);

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
      const textChunk = textQueueRef.current.shift() || '·';

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
        currentText: textChunk,
      }));

      // 使用动态调节的参数
      const remainingPackets = queueRef.current.length;
      const totalPackets = sent + remainingPackets;
      const params = calculateBurnParams(totalPackets);
      await sleep(params.packetDelay);
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
    textQueueRef.current = [];
    burningRef.current = false;
    setState({ phase: 'idle', progress: 0, packetsSent: 0, totalPackets: 0, currentText: undefined });
    setNetworkStatus('香火尚未点燃，虚空彼岸一片寂静。');
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  return { state, feedFiles, reset, totalBurns, networkStatus, isBurning: burningRef };
}
