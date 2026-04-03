// components/BurnProgress.tsx
import { memo } from 'react';
import { BurnState } from '../hooks/useBurnCeremony';

interface BurnProgressProps {
  state: BurnState;
  mingli: number;
}

const PHASE_MESSAGES: Record<string, string> = {
  igniting: '点燃思念...',
  burning: '数据在火焰中消散...',
  fading: '余烬缓缓飘散...',
};

function BurnProgress({ state, mingli }: BurnProgressProps) {
  if (state.phase === 'idle' || state.phase === 'done') return null;

  const message = PHASE_MESSAGES[state.phase] || '';
  const percent = Math.round(state.progress * 100);

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      {/* 仪式感文字 */}
      <p className="text-orange-300/80 font-serif text-sm mb-3 animate-pulse tracking-wider">
        {message}
      </p>

      {/* 进度条 */}
      {state.phase === 'burning' && (
        <div className="space-y-2">
          <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-800 via-orange-600 to-yellow-500 rounded-full transition-all duration-100"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-600 tabular-nums">
            已消散 {state.packetsSent}/{state.totalPackets} 个数据包
          </p>
        </div>
      )}

      {/* 冥力值燃烧提示 */}
      {state.phase === 'burning' && mingli > 50 && (
        <p className="text-red-500/60 text-[10px] mt-2 flame-glow">
          烈焰焚天，数据化为虚无
        </p>
      )}
    </div>
  );
}

export default memo(BurnProgress);
