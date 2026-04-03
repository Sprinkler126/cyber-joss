import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FlameCanvas from './components/FlameCanvas';
import BurnProgress from './components/BurnProgress';
import CompletionScreen from './components/CompletionScreen';
import { useBurnCeremony } from './hooks/useBurnCeremony';
import { useMingli } from './hooks/useMingli';
import { useSound, FireStage } from './hooks/useSound';
import { mingliToFlameIntensity } from './lib/mingliCalculator';

/**
 * Solemn Chinese paper-burning ritual.
 *
 * The entire page is a persistent bonfire. Drag files anywhere — even
 * while burning — and they are absorbed seamlessly. No visible drop zone.
 * All visual effects are shader-based fire/flame, not particles.
 */

function getFireStage(mingli: number, isBurning: boolean): FireStage {
  if (isBurning) {
    if (mingli > 60) return 'large';
    if (mingli > 15) return 'medium';
    return 'small';
  }
  if (mingli > 60) return 'medium';
  if (mingli > 5) return 'small';
  return 'idle';
}

function App() {
  const {
    textInput, setTextInput,
    files, setFiles,
    mingli, details, level, isCalculating,
  } = useMingli();

  const { state, feedFiles, reset, totalBurns, networkStatus } = useBurnCeremony();

  const [dragOver, setDragOver] = useState(false);
  const [showText, setShowText] = useState(false);
  const [burnChars, setBurnChars] = useState<string[]>([]);
  const [dropPulse, setDropPulse] = useState(0);
  const [ashAmount, setAshAmount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropDecayRef = useRef<ReturnType<typeof setTimeout>>();
  const autoBurnRef = useRef<ReturnType<typeof setTimeout>>();

  const isIdle = state.phase === 'idle';
  const isBurning = ['igniting', 'burning', 'fading'].includes(state.phase);
  const isDone = state.phase === 'done';

  const baseIntensity = useMemo(() => mingliToFlameIntensity(mingli), [mingli]);

  const flameIntensity = isDone
    ? 0.15
    : isBurning
      ? Math.min(baseIntensity * 1.5 + 0.15, 1)
      : Math.max(0.18, baseIntensity * 0.85 + (files.length > 0 || textInput.trim() ? 0.12 : 0));

  const fireStage = getFireStage(mingli, isBurning);

  const { label: soundLabel, toggle: toggleSound, playPaperIgnite } = useSound({
    phase: state.phase,
    burningIntensity: flameIntensity,
    fireStage,
  });

  // ─── Drop pulse decay ───
  // When a file is dropped, pulse goes to 1 then decays smoothly
  useEffect(() => {
    if (dropPulse <= 0) return;
    const iv = setInterval(() => {
      setDropPulse((v) => {
        const next = v * 0.92 - 0.01;
        if (next <= 0.01) { clearInterval(iv); return 0; }
        return next;
      });
    }, 30);
    return () => clearInterval(iv);
  }, [dropPulse > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Ash accumulation: grows during burn, stays after done ───
  useEffect(() => {
    if (isBurning) {
      setAshAmount((v) => Math.min(1, v + 0.004));
    }
  }, [state.progress, isBurning]);

  // Reset ash when user restarts
  const handleReset = useCallback(() => {
    reset();
    setTextInput('');
    setFiles([]);
    setBurnChars([]);
    setShowText(false);
    setAshAmount(0);
  }, [reset, setFiles, setTextInput]);

  // ─── File acceptance — ALWAYS works, even during burning ───
  const acceptFiles = useCallback((newFiles: File[]) => {
    if (newFiles.length === 0) return;

    setFiles((cur) => [...cur, ...newFiles]);
    playPaperIgnite();

    // Flash the fire
    setDropPulse(1);

    // If already burning, feed directly into the live queue
    if (isBurning) {
      void feedFiles('', newFiles, mingli);
    }
  }, [setFiles, playPaperIgnite, isBurning, feedFiles, mingli]);

  // ─── Seamless drag-drop on ENTIRE page — never blocked ───
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget === null || !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    acceptFiles(dropped);
  }, [acceptFiles]);

  // ─── Auto-burn: start ceremony 1.5s after files arrive (if idle) ───
  useEffect(() => {
    if (files.length > 0 && isIdle && !isCalculating && !isDone) {
      clearTimeout(autoBurnRef.current);
      autoBurnRef.current = setTimeout(() => {
        const chars = textInput.split('').filter((c) => c.trim());
        setBurnChars(chars);
        void feedFiles(textInput, files, mingli);
      }, 1500);
    }
    return () => clearTimeout(autoBurnRef.current);
  }, [files.length, isIdle, isCalculating, isDone]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualBurn = useCallback(() => {
    if (!textInput.trim() && files.length === 0) return;
    clearTimeout(autoBurnRef.current);
    const chars = textInput.split('').filter((c) => c.trim());
    setBurnChars(chars);
    void feedFiles(textInput, files, mingli);
  }, [feedFiles, files, mingli, textInput]);

  const handleClickAdd = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    acceptFiles(selected);
    e.target.value = '';
  }, [acceptFiles]);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#0a0705] text-stone-100 select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept=".doc,.docx,.pdf,.md,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar,.7z,.mp3,.mp4,.mov"
        onChange={handleFileInput}
      />

      {/* ─── Atmospheric Background ─── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_85%,rgba(120,50,10,0.12),transparent),radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(180,60,0,0.10),transparent),linear-gradient(180deg,#080504_0%,#0a0706_40%,#0e0908_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55vh] bg-[radial-gradient(ellipse_50%_60%_at_50%_100%,rgba(180,80,10,0.18),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[35vh] bg-[linear-gradient(180deg,transparent_0%,rgba(30,18,12,0.5)_40%,rgba(8,5,4,0.95)_100%)]" />
      <div className="pointer-events-none absolute bottom-[6%] left-1/2 h-[90px] w-[40%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,rgba(200,80,20,0.15)_0%,rgba(120,40,10,0.08)_40%,transparent_72%)] blur-sm" />

      {/* Drag-over atmospheric glow */}
      <div
        className="pointer-events-none absolute inset-0 z-30 transition-all duration-700"
        style={{
          background: dragOver
            ? 'radial-gradient(ellipse 60% 50% at 50% 70%, rgba(255,140,40,0.14), transparent 60%)'
            : 'transparent',
          opacity: dragOver ? 1 : 0,
        }}
      />

      {/* ─── FIRE (all shader, no particles) ─── */}
      <FlameCanvas
        intensity={flameIntensity}
        burning={state.phase === 'burning'}
        dropPulse={dropPulse}
        ashAmount={ashAmount}
      />

      {/* ─── UI Overlay ─── */}
      <div className="relative z-10 flex min-h-screen flex-col">

        {/* Header */}
        <header className="flex items-start justify-between px-4 pb-2 pt-4 md:px-8 md:pt-6">
          <div className="rounded-full border border-white/8 bg-black/30 px-4 py-2 text-[11px] tracking-[0.35em] text-stone-400/70 backdrop-blur-sm">
            赛博烧纸 · 灰烬祭场
          </div>
          <button
            type="button"
            onClick={toggleSound}
            className="rounded-full border border-white/8 bg-black/30 px-3 py-2 text-[11px] tracking-[0.22em] text-stone-400/70 transition hover:border-orange-500/25 hover:text-stone-300"
          >
            {soundLabel}
          </button>
        </header>

        <main className="relative flex flex-1 flex-col items-center justify-between px-4 pb-6 pt-2 md:px-8 md:pb-8">

          {/* Title */}
          <div className="pointer-events-none mt-6 w-full max-w-3xl text-center md:mt-10">
            <h1
              className="text-3xl font-semibold tracking-[0.5em] text-transparent md:text-5xl lg:text-6xl"
              style={{
                backgroundImage: 'linear-gradient(180deg,#f0e0c8 0%,#c49a60 42%,#6a3a1e 100%)',
                WebkitBackgroundClip: 'text',
              }}
            >
              灰烬之上
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-xs leading-7 tracking-[0.22em] text-stone-500 md:text-sm">
              {isBurning
                ? '纸品正在化入火焰……继续拖入，火会更旺。'
                : isDone
                  ? '余烬归于沉静。'
                  : '火堆长燃不灭。将文件拖入，它便化为灰烬。'}
            </p>
          </div>

          {/* ─── Completion ─── */}
          {isDone && (
            <div className="flex flex-1 items-center justify-center">
              <CompletionScreen
                totalBurns={totalBurns}
                onRestart={handleReset}
                packetsSent={state.packetsSent}
                mingli={mingli}
              />
            </div>
          )}

          {/* ─── Burn Progress ─── */}
          {(state.phase === 'igniting' || state.phase === 'burning' || state.phase === 'fading') && (
            <div className="absolute left-1/2 top-[28%] z-20 w-full max-w-lg -translate-x-1/2 px-4 md:top-[22%]">
              <BurnProgress state={state} mingli={mingli} />
            </div>
          )}

          {/* ─── Text chars dissolving ─── */}
          {!isIdle && !isDone && burnChars.length > 0 && (
            <div className="absolute left-1/2 top-[38%] z-10 flex w-full max-w-3xl -translate-x-1/2 flex-wrap justify-center gap-x-2 gap-y-3 px-6 md:top-[35%]">
              {burnChars.map((char, i) => {
                const total = Math.max(burnChars.length, 1);
                const th = i / total;
                const rStart = Math.max(0, th - 0.18);
                const rEnd = Math.min(1, th + 0.05);
                const cStart = Math.min(1, th + 0.12);
                const rP = Math.min(1, Math.max(0, (state.progress - rStart) / Math.max(0.001, rEnd - rStart)));
                const cP = Math.min(1, Math.max(0, (state.progress - cStart) / 0.16));
                const vis = state.progress >= rStart;
                const lift = (1 - rP) * 34 - cP * 50;
                const scale = 0.78 + rP * 0.26 - cP * 0.24;
                const op = vis ? Math.max(0, 0.06 + rP * 0.95 - cP * 0.96) : 0;
                const glow = rP * (1 - cP);
                const col = cP > 0.5 ? '#fb923c' : glow > 0.55 ? '#fff1d6' : '#efe3ce';

                return (
                  <span
                    key={`${char}-${i}`}
                    className="relative inline-flex min-w-[1.2rem] justify-center text-lg transition-all duration-150 md:text-3xl"
                    style={{
                      opacity: op,
                      transform: `translateY(${lift}px) scale(${scale}) rotate(${cP * -10}deg)`,
                      color: col,
                      filter: cP > 0.52 ? `blur(${cP * 2.2}px)` : 'none',
                      textShadow: glow > 0
                        ? `0 0 ${10 + glow * 20}px rgba(251,146,60,${0.35 + glow * 0.35}),0 0 ${18 + glow * 28}px rgba(220,38,38,${0.18 + glow * 0.22})`
                        : '0 0 6px rgba(255,255,255,0.04)',
                    }}
                  >
                    <span
                      className="pointer-events-none absolute inset-x-0 bottom-[-14px] h-7 rounded-full"
                      style={{
                        opacity: Math.max(0, glow - cP * 0.35),
                        background: 'radial-gradient(circle,rgba(251,146,60,0.38) 0%,rgba(220,38,38,0.15) 50%,rgba(0,0,0,0) 82%)',
                        transform: `scale(${0.65 + glow * 0.75})`,
                      }}
                    />
                    {char}
                  </span>
                );
              })}
            </div>
          )}

          {/* ─── Bottom controls ─── */}
          {(isIdle || isDone) ? null : null}
          {!isDone && (
            <div className="mt-auto w-full max-w-4xl">
              {/* Queued file pills — subtle, always visible */}
              {files.length > 0 && isIdle && (
                <div className="mx-auto mb-4 flex flex-wrap items-center justify-center gap-2">
                  {files.map((f, i) => (
                    <div
                      key={`${f.name}-${i}`}
                      className="animate-pulse rounded-full border border-orange-500/20 bg-orange-900/15 px-3 py-1 text-[11px] text-orange-200/60"
                    >
                      {f.name.length > 20 ? f.name.slice(0, 18) + '…' : f.name}
                    </div>
                  ))}
                  <span className="text-[11px] tracking-[0.2em] text-stone-500">即将化入火中…</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowText(!showText)}
                  className="rounded-full border border-white/8 bg-black/25 px-4 py-2.5 text-xs tracking-[0.25em] text-stone-400 transition hover:border-orange-500/20 hover:text-stone-300 backdrop-blur-sm"
                >
                  {showText ? '收起' : '写祭文'}
                </button>

                <button
                  type="button"
                  onClick={handleClickAdd}
                  className="rounded-full border border-white/8 bg-black/25 px-4 py-2.5 text-xs tracking-[0.25em] text-stone-400 transition hover:border-orange-500/20 hover:text-stone-300 backdrop-blur-sm"
                >
                  投纸
                </button>

                {textInput.trim() && isIdle && (
                  <button
                    type="button"
                    onClick={handleManualBurn}
                    disabled={isCalculating}
                    className="rounded-full border border-orange-600/30 bg-orange-950/30 px-5 py-2.5 text-xs tracking-[0.3em] text-orange-100/80 transition hover:border-orange-400/50 hover:bg-orange-900/30 disabled:opacity-40 backdrop-blur-sm"
                  >
                    焚化
                  </button>
                )}

                {(textInput.trim() || files.length > 0) && isIdle && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-full border border-white/6 bg-black/20 px-3 py-2.5 text-[11px] text-stone-500 transition hover:text-stone-400 backdrop-blur-sm"
                  >
                    清空
                  </button>
                )}
              </div>

              {/* Text input panel */}
              {showText && isIdle && (
                <div className="mx-auto mt-4 w-full max-w-xl">
                  <div className="rounded-[20px] border border-white/8 bg-black/40 p-4 backdrop-blur-md">
                    <div className="mb-2 flex items-center justify-between text-[11px] tracking-[0.22em] text-stone-500">
                      <span>祭文录入</span>
                      <span>{textInput.trim().length} 字</span>
                    </div>
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="写下思念、叮嘱、问候……"
                      className="min-h-[140px] w-full resize-none bg-transparent px-2 py-1 text-sm leading-7 text-stone-200 outline-none placeholder:text-stone-600"
                      style={{ fontFamily: "'Noto Serif SC', serif" }}
                    />
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="mx-auto mt-4 flex items-center justify-center gap-4 text-[10px] tracking-[0.2em] text-stone-600">
                <span>{level.name} · 火势 {mingli}</span>
                <span className="h-3 w-px bg-stone-800" />
                <span>{networkStatus}</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Drag hint */}
      {dragOver && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
          <div className="animate-pulse text-lg tracking-[0.5em] text-orange-200/40 md:text-2xl">
            松 手 投 入 火 中
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
