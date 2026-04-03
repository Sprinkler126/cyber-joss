import { memo } from 'react';

interface BurnButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

function BurnButton({ onClick, disabled }: BurnButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative w-full overflow-hidden rounded-[22px] px-6 py-5 text-lg tracking-[0.35em] transition-all duration-300 ${disabled ? 'cursor-not-allowed border border-stone-800 bg-stone-900/70 text-stone-600' : 'border border-orange-500/35 bg-[linear-gradient(180deg,_rgba(153,27,27,0.95)_0%,_rgba(69,10,10,0.96)_100%)] text-amber-50 shadow-[0_0_35px_rgba(234,88,12,0.18)] hover:-translate-y-0.5 hover:shadow-[0_0_50px_rgba(249,115,22,0.28)] active:translate-y-0'}`}
      style={{ fontFamily: "'Noto Serif SC', serif" }}
    >
      {!disabled && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,220,170,0.26),_transparent_40%),linear-gradient(90deg,_transparent,_rgba(255,255,255,0.06),_transparent)] opacity-80 transition group-hover:opacity-100" />}
      <div className="absolute inset-[1px] rounded-[20px] border border-white/8" />
      <span className="relative z-10">{disabled ? '暂不可焚' : '化 为 灰 烬'}</span>
    </button>
  );
}

export default memo(BurnButton);
