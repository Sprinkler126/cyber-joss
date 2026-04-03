import { memo } from 'react';

interface TextInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

function TextInput({ value, onChange, disabled }: TextInputProps) {
  return (
    <div className="relative rounded-[24px] border border-[#6d3417]/60 bg-[#130d0b]/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="pointer-events-none absolute inset-3 rounded-[18px] border border-amber-500/10" />
      <div className="mb-3 flex items-center justify-between text-xs tracking-[0.22em] text-stone-500">
        <span>祭文录入</span>
        <span>{value.trim().length} 字符</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="写下思念、叮嘱、问候，或你想寄往彼岸的话……"
        className="min-h-[220px] w-full resize-none bg-transparent px-2 py-1 text-[15px] leading-8 text-stone-100 outline-none placeholder:text-stone-600 disabled:cursor-not-allowed disabled:opacity-40 md:text-base"
        style={{ fontFamily: "'Noto Serif SC', serif" }}
      />
    </div>
  );
}

export default memo(TextInput);
