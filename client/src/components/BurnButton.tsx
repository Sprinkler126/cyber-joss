import { memo } from 'react';

interface BurnButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

function BurnButton({ onClick, disabled }: BurnButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-full py-4 rounded-lg font-bold text-lg tracking-[0.3em] transition-all duration-500 overflow-hidden ${
        disabled
          ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
          : 'bg-gradient-to-b from-red-800 to-red-950 text-orange-200 hover:from-red-700 hover:to-red-900 hover:shadow-[0_0_40px_rgba(255,68,0,0.3)] active:scale-[0.98]'
      }`}
      style={{ fontFamily: "'Noto Serif SC', serif" }}
    >
      {!disabled && <div className="absolute inset-0 rounded-lg border-2 border-orange-500/30 pointer-events-none" />}
      <span className="relative z-10">
        {disabled ? '焚烧中...' : '🔥 化 为 灰 烬 🔥'}
      </span>
    </button>
  );
}

export default memo(BurnButton);
