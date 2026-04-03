import { memo } from 'react';

interface MingliMeterProps {
  mingli: number;
  levelName: string;
  details: { source: string; type: string; value: number; mingli: number }[];
  isCalculating?: boolean;
}

function MingliMeter({ mingli, levelName, details, isCalculating }: MingliMeterProps) {
  const percentage = Math.min((mingli / 120) * 100, 100);

  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] tracking-[0.28em] text-stone-500">火势</div>
          <div className="mt-1 text-3xl text-stone-100 tabular-nums">{mingli}</div>
        </div>
        <div className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs text-orange-100/85">
          {isCalculating ? '灰烬翻动中…' : levelName}
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #2a130d 0%, #7c2d12 25%, #ea580c 60%, #fbbf24 100%)',
            boxShadow: mingli > 0 ? '0 0 22px rgba(249,115,22,0.35)' : 'none',
          }}
        />
      </div>

      {details.length > 0 && (
        <div className="mt-3 space-y-2 text-xs text-stone-400">
          {details.slice(0, 4).map((item, index) => (
            <div key={`${item.source}-${index}`} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">{item.type === 'image' ? '画影' : '文字'} · {item.source}</span>
              <span className="shrink-0 text-orange-200">+{item.mingli}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(MingliMeter);
