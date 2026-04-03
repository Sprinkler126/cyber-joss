import { useState, useEffect, memo } from 'react';

interface CompletionScreenProps {
  totalBurns: number;
  onRestart: () => void;
}

function CompletionScreen({ totalBurns, onRestart }: CompletionScreenProps) {
  const [visible, setVisible] = useState(false);
  const [showRestart, setShowRestart] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 500);
    const t2 = setTimeout(() => setShowRestart(true), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Falling ash */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-gray-500/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-5%',
              animation: `ashFall ${3 + Math.random() * 4}s linear ${Math.random() * 3}s forwards`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      <div className={`text-center transition-all duration-[2000ms] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="space-y-4 mb-12">
          <p className="text-gray-300 text-xl" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            你的思念已化为数据之灰
          </p>
          <p className="text-gray-500 text-sm">消散于赛博空间的光缆之中</p>
          {totalBurns > 0 && (
            <p className="text-gray-600 text-xs mt-6">
              全球已有 <span className="text-orange-500">{totalBurns.toLocaleString()}</span> 份思念融入数字长河
            </p>
          )}
        </div>
        {showRestart && (
          <button
            onClick={onRestart}
            className="px-8 py-3 border border-gray-700 rounded-lg text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-all duration-300 text-sm"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            再 寄 一 份
          </button>
        )}
      </div>

      <style>{`
        @keyframes ashFall {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.2; }
          100% { transform: translateY(110vh) translateX(40px) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default memo(CompletionScreen);
