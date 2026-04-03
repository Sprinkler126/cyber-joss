import { memo } from 'react';

interface TextInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

function TextInput({ value, onChange, disabled }: TextInputProps) {
  return (
    <div className="relative">
      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-orange-600/50" />
      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-orange-600/50" />
      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-orange-600/50" />
      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-orange-600/50" />
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder="写下你想说的话..."
        className="w-full h-32 bg-black/40 border border-orange-900/30 rounded-lg p-4 text-gray-200 placeholder-gray-600 resize-none transition-all duration-300 focus:border-orange-600/60 focus:bg-black/50 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ fontFamily: "'Noto Serif SC', serif" }}
      />
    </div>
  );
}

export default memo(TextInput);
