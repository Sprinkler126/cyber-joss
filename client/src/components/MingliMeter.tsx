import { memo } from 'react';

interface MingliMeterProps {
  mingli: number;
  levelName: string;
  details: { source: string; type: string; value: number; mingli: number }[];
}

function MingliMeter({ mingli, levelName, details }: MingliMeterProps) {
  const maxDisplay = 150;
  const pct = Math.min(mingli / maxDisplay, 1) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">冥力值</span>
        <span className="text-orange-500 font-medium">{levelName} · {mingli}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #1a0000 0%, #cc2200 30%, #ff5500 60%, #ffaa00 85%, #fff5e0 100%)',
            boxShadow: mingli > 0 ? '0 0 10px rgba(255,85,0,0.4)' : 'none',
          }}
        />
      </div>
      {details.length > 0 && (
        <div className="space-y-1 mt-2">
          {details.map((d, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-600">
              <span className="truncate max-w-[160px]">
                {d.type === 'image' ? '🖼️' : '📝'} {d.source}
              </span>
              <span className="text-gray-500">+{d.mingli}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(MingliMeter);
