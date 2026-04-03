import { memo } from 'react';
import { BurnState } from '../hooks/useBurnCeremony';

interface BurnProgressProps {
  state: BurnState;
  mingli: number;
}

const phaseMessage: Record<string, string> = {
  igniting: '暗火被拨亮，灰堆开始发红。',
  burning: '纸品正在塌陷、卷曲、化作发光碎灰。',
  fading: '火势回落，只剩热灰和细碎火星。',
};

function BurnProgress({ state, mingli }: BurnProgressProps) {
  if (state.phase === 'idle' || state.phase === 'done') return null;

  const percent = Math.round(state.progress * 100);

  return (
    <div className="mx-auto w-full max-w-xl rounded-[24px] border border-white/10 bg-black/28 p-4 text-center shadow-[0_0_50px_rgba(0,0,0,0.28)] backdrop-blur-sm">
      <div className="text-[11px] tracking-[0.32em] text-stone-500">焚化进程</div>
      <div className="mt-2 text-lg text-amber-100">{phaseMessage[state.phase]}</div>

      {state.phase === 'burning' && (
        <div className="mt-4 space-y-3">
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${percent}%`,
                background: 'linear-gradient(90deg, #431407 0%, #9a3412 25%, #f97316 65%, #fbbf24 100%)',
                boxShadow: '0 0 18px rgba(249,115,22,0.38)',
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>已消散 {state.packetsSent}/{state.totalPackets} 个数据包</span>
            <span>{percent}%</span>
          </div>
          <div className="text-xs text-stone-500">
            当前火势：{mingli > 100 ? '烈焰翻涌' : mingli > 50 ? '火堆正旺' : mingli > 5 ? '火苗抬升' : '暗火轻闪'}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(BurnProgress);
