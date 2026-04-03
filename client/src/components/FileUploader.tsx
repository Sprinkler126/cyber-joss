import { memo, useRef, useState } from 'react';

interface FileUploaderProps {
  files: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  disabled?: boolean;
  compact?: boolean;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '画';
  if (ext === 'pdf') return '册';
  if (['doc', 'docx'].includes(ext)) return '文';
  if (ext === 'md') return '札';
  return '笺';
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileUploader({ files, onAddFiles, onRemoveFile, disabled, compact = false }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) onAddFiles(dropped);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) onAddFiles(selected);
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div
        className={`group relative overflow-hidden rounded-[26px] border border-dashed transition-all duration-300 ${dragOver ? 'border-orange-300/80 bg-orange-500/12 shadow-[0_0_60px_rgba(251,146,60,0.16)]' : 'border-white/10 bg-black/15'} ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:border-orange-400/40 hover:bg-orange-500/5'} ${compact ? 'p-4' : 'p-6 md:p-8'}`}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".doc,.docx,.pdf,.md,.txt,.jpg,.jpeg,.png,.gif,.webp"
          onChange={handleChange}
          disabled={disabled}
        />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(249,115,22,0.16),transparent_45%)] opacity-80" />
        <div className="relative text-center">
          <div className={`mx-auto mb-3 flex items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-100 ${compact ? 'h-12 w-12 text-base' : 'h-16 w-16 text-xl'}`}>
            灰
          </div>
          <p className={`text-stone-100 ${compact ? 'text-sm' : 'text-base'}`}>把纸品拖进灰堆里</p>
          <p className="mt-2 text-xs tracking-[0.22em] text-stone-500">DOCX · PDF · MD · TXT · JPG · PNG</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-full border border-white/10 bg-black/25 px-3 py-2 text-sm text-stone-200">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10 text-xs text-orange-100">{getFileIcon(file.name)}</span>
              <span className="max-w-[140px] truncate">{file.name}</span>
              <span className="text-xs text-stone-500">{formatSize(file.size)}</span>
              {!disabled && (
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-stone-400 transition hover:border-red-400/50 hover:text-red-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(index);
                  }}
                >
                  移除
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(FileUploader);
