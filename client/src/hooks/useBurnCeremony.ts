// hooks/useBurnCeremony.ts
import { useState, useCallback, useRef } from 'react';

export type BurnPhase = 'idle' | 'igniting' | 'burning' | 'fading' | 'done';

export interface BurnState {
  phase: BurnPhase;
  progress: number;
  packetsSent: number;
  totalPackets: number;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function useBurnCeremony() {
  const [state, setState] = useState<BurnState>({
    phase: 'idle', progress: 0, packetsSent: 0, totalPackets: 0,
  });
  const wsRef = useRef<WebSocket | null>(null);

  const burn = useCallback(async (textInput: string, files: File[], totalMingli: number) => {
    setState({ phase: 'igniting', progress: 0, packetsSent: 0, totalPackets: 0 });
    await sleep(2000);

    const chunks: ArrayBuffer[] = [];
    if (textInput) {
      for (let i = 0; i < textInput.length; i += 200) {
        chunks.push(new TextEncoder().encode(textInput.slice(i, i + 200)).buffer);
      }
    }
    for (const file of files) {
      try {
        const buf = await file.arrayBuffer();
        for (let i = 0; i < buf.byteLength; i += 4096) chunks.push(buf.slice(i, i + 4096));
      } catch {}
    }

    const total = chunks.length || 1;
    setState(s => ({ ...s, phase: 'burning', totalPackets: total }));

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`ws://${window.location.hostname}:3000`);
      wsRef.current = ws;
      await Promise.race([
        new Promise<void>(r => { ws!.onopen = () => r(); }),
        new Promise<void>((_, rej) => setTimeout(rej, 2000)),
      ]);
    } catch { ws = null; }

    for (let i = 0; i < chunks.length; i++) {
      if (ws?.readyState === WebSocket.OPEN) ws.send(chunks[i]);
      setState(s => ({ ...s, packetsSent: i + 1, progress: (i + 1) / total }));
      await sleep(Math.max(20, 120 - totalMingli * 1.5));
    }

    setState(s => ({ ...s, phase: 'fading' }));
    await sleep(3000);
    setState(s => ({ ...s, phase: 'done' }));
    ws?.close();
    wsRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setState({ phase: 'idle', progress: 0, packetsSent: 0, totalPackets: 0 });
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  return { state, burn, reset };
}
