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
    <div className="rounded-[24px] border border-[#6d3417]/60 bg-[#130d0b]/70 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.25em] text-stone-500">冥力测算</p>
          <h3 className="mt-2 text-2xl text-amber-50">{mingli}</h3>
        </div>
        <div className="rounded-full border border-amber-700/30 bg-amber-950/20 px-3 py-1 text-xs text-amber-200/85">
          {isCalculating ? '测算中…' : levelName}
        </div>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-[#2a1711]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #431407 0%, #9a3412 25%, #ea580c 55%, #fbbf24 80%, #fff7ed 100%)',
            boxShadow: mingli > 0 ? '0 0 24px rgba(249,115,22,0.45)' : 'none',
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
        <span>当前火势：{levelName}</span>
        <span>{mingli >= 120 ? '烈焰已满' : `距离烈焰还差 ${Math.max(120 - mingli, 0)}`}</span>
      </div>

      {details.length > 0 && (
        <div className="mt-4 space-y-2 rounded-2xl border border-white/5 bg-black/15 p-3">
          {details.map((item, index) => (
            <div key={`${item.source}-${index}`} className="flex items-center justify-between gap-3 text-sm text-stone-300/80">
              <span className="min-w-0 truncate">{item.type === 'image' ? '画影' : '文字'} · {item.source}</span>
              <span className="shrink-0 text-amber-200">+{item.mingli}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(MingliMeter);
