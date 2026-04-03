import { useRef, useState, memo } from 'react';

interface FileUploaderProps {
  files: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  disabled?: boolean;
}

function FileUploader({ files, onAddFiles, onRemoveFile, disabled }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) onAddFiles(dropped);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length) onAddFiles(selected);
    e.target.value = '';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return '🖼️';
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    if (ext === 'md') return '📋';
    return '📎';
  };

  return (
    <div className="space-y-3">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 cursor-pointer ${
          dragOver
            ? 'border-orange-500/80 bg-orange-500/10'
            : 'border-gray-700 hover:border-orange-600/40 hover:bg-orange-500/5'
        } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".doc,.docx,.pdf,.md,.jpg,.jpeg,.png,.gif,.webp"
          className="hidden"
          onChange={handleSelect}
          disabled={disabled}
        />
        <div className="text-2xl mb-2">📎</div>
        <p className="text-gray-500 text-sm">拖拽或点击上传文件</p>
        <p className="text-gray-600 text-xs mt-1">支持 .docx · .pdf · .md · 图片</p>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 text-sm">
              <span>{getFileIcon(file.name)}</span>
              <span className="text-gray-300 max-w-[120px] truncate">{file.name}</span>
              <span className="text-gray-600 text-xs">{formatSize(file.size)}</span>
              {!disabled && (
                <button onClick={() => onRemoveFile(idx)} className="text-gray-600 hover:text-red-400 transition-colors ml-1">✕</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(FileUploader);
