import { memo } from 'react';
import { BurnState } from '../hooks/useBurnCeremony';

interface BurnProgressProps {
  state: BurnState;
  mingli: number;
}

const phaseMessage: Record<string, string> = {
  igniting: '纸火已起，火线正触及纸面。',
  burning: '思念正被火焰拆解成一片片数据灰烬。',
  fading: '火势将尽，余烬缓缓升空。',
};

function BurnProgress({ state, mingli }: BurnProgressProps) {
  if (state.phase === 'idle' || state.phase === 'done') {
    return null;
  }

  const percent = Math.round(state.progress * 100);

  return (
    <div className="space-y-4 text-center">
      <div>
        <p className="text-xs tracking-[0.3em] text-stone-500">仪式进程</p>
        <h3 className="mt-2 text-xl text-amber-100">{phaseMessage[state.phase]}</h3>
      </div>

      {state.phase === 'burning' && (
        <div className="mx-auto max-w-md space-y-3 rounded-[22px] border border-[#6d3417]/50 bg-black/25 p-4">
          <div className="h-2 overflow-hidden rounded-full bg-[#2a1711]">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${percent}%`,
                background: 'linear-gradient(90deg, #7c2d12 0%, #dc2626 25%, #f97316 60%, #fbbf24 100%)',
                boxShadow: '0 0 18px rgba(249,115,22,0.35)',
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>已消散 {state.packetsSent}/{state.totalPackets} 个数据包</span>
            <span>{percent}%</span>
          </div>
          <div className="text-xs text-stone-500">
            当前焚势：{mingli > 100 ? '烈焰翻涌' : mingli > 50 ? '火势旺盛' : mingli > 5 ? '火苗已成' : '烛火轻摇'}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(BurnProgress);
