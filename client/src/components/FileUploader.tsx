import { memo, useRef, useState } from 'react';

interface FileUploaderProps {
  files: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  disabled?: boolean;
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

function FileUploader({ files, onAddFiles, onRemoveFile, disabled }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) {
      onAddFiles(dropped);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      onAddFiles(selected);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative overflow-hidden rounded-[24px] border border-dashed p-6 text-center transition-all duration-300 ${dragOver ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_35px_rgba(251,191,36,0.08)]' : 'border-[#6d3417]/70 bg-[#130d0b]/70'} ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:border-amber-500/50 hover:bg-[#1a120e]'}`}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
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
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-lg text-amber-200">
          奠
        </div>
        <p className="text-sm text-stone-200">拖拽或点击上传纸品</p>
        <p className="mt-2 text-xs tracking-[0.2em] text-stone-500">DOCX · PDF · MD · TXT · JPG · PNG</p>
      </div>

      {files.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-2xl border border-[#6d3417]/60 bg-black/25 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-700/30 bg-amber-950/30 text-sm text-amber-100">
                {getFileIcon(file.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-stone-100">{file.name}</div>
                <div className="text-xs text-stone-500">{formatSize(file.size)}</div>
              </div>
              {!disabled && (
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-2 py-1 text-xs text-stone-400 transition hover:border-red-400/50 hover:text-red-300"
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
