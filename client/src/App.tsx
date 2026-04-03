import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FlameCanvas from './components/FlameCanvas';
import AshParticles from './components/AshParticles';
import BurnProgress from './components/BurnProgress';
import CompletionScreen from './components/CompletionScreen';
import { useBurnCeremony } from './hooks/useBurnCeremony';
import { useMingli } from './hooks/useMingli';
import { useSound, FireStage } from './hooks/useSound';
import { mingliToFlameIntensity } from './lib/mingliCalculator';

/**
 * A solemn Chinese paper-burning ritual scene.
 *
 * The main interface is a persistent bonfire — always burning.
 * Users drag files anywhere onto the page (no visible drop zone).
 * Files are consumed seamlessly: a brief flare, then ash settles.
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
    textInput,
    setTextInput,
    files,
    setFiles,
    mingli,
    details,
    level,
    isCalculating,
  } = useMingli();

  const { state, burn, reset, totalBurns, networkStatus } = useBurnCeremony();

  const [dragOver, setDragOver] = useState(false);
  const [showText, setShowText] = useState(false);
  const [burnChars, setBurnChars] = useState<string[]>([]);
  const [recentDrop, setRecentDrop] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const isIdle = state.phase === 'idle';
  const isBurning = ['igniting', 'burning', 'fading'].includes(state.phase);
  const isDone = state.phase === 'done';

  const baseIntensity = useMemo(() => mingliToFlameIntensity(mingli), [mingli]);

  // Fire intensity: always has a base glow; rises with content and burning
  const flameIntensity = isDone
    ? 0.15
    : isBurning
      ? Math.min(baseIntensity * 1.5 + 0.15, 1)
      : Math.max(0.18, baseIntensity * 0.85 + (files.length > 0 || textInput.trim() ? 0.12 : 0));

  const fireStage = getFireStage(mingli, isBurning);

  const { enabled: soundEnabled, label: soundLabel, toggle: toggleSound, playPaperIgnite } = useSound({
    phase: state.phase,
    burningIntensity: flameIntensity,
    fireStage,
  });

  // ─── Seamless drag-drop on the ENTIRE page ───
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isIdle) return;
    setDragOver(true);
  }, [isIdle]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only count as leave if actually leaving the window
    if (e.relatedTarget === null || !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (!isIdle) return;

    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) {
      setFiles((current) => [...current, ...dropped]);
      playPaperIgnite();

      // Visual feedback: brief "absorbed" flash
      setRecentDrop(true);
      clearTimeout(dropTimerRef.current);
      dropTimerRef.current = setTimeout(() => setRecentDrop(false), 1200);
    }
  }, [isIdle, setFiles, playPaperIgnite]);

  // Auto-burn: when files are dropped, automatically start burning after a short delay
  const autoBurnTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (files.length > 0 && isIdle && !isCalculating) {
      clearTimeout(autoBurnTimerRef.current);
      autoBurnTimerRef.current = setTimeout(() => {
        const chars = textInput.split('').filter((c) => c.trim());
        setBurnChars(chars);
        void burn(textInput, files, mingli);
      }, 1800); // Give a moment for the fire to react before auto-burning
    }
    return () => clearTimeout(autoBurnTimerRef.current);
  }, [files, isIdle, isCalculating, textInput, burn, mingli]);

  const handleReset = useCallback(() => {
    reset();
    setTextInput('');
    setFiles([]);
    setBurnChars([]);
    setShowText(false);
  }, [reset, setFiles, setTextInput]);

  const handleManualBurn = useCallback(() => {
    if (!textInput.trim() || !isIdle) return;
    clearTimeout(autoBurnTimerRef.current);
    const chars = textInput.split('').filter((c) => c.trim());
    setBurnChars(chars);
    void burn(textInput, files, mingli);
  }, [burn, files, isIdle, mingli, textInput]);

  // Click to add files (hidden input)
  const handleClickAdd = useCallback(() => {
    if (!isIdle) return;
    inputRef.current?.click();
  }, [isIdle]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      setFiles((current) => [...current, ...selected]);
      playPaperIgnite();
      setRecentDrop(true);
      clearTimeout(dropTimerRef.current);
      dropTimerRef.current = setTimeout(() => setRecentDrop(false), 1200);
    }
    e.target.value = '';
  }, [setFiles, playPaperIgnite]);

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
        accept=".doc,.docx,.pdf,.md,.txt,.jpg,.jpeg,.png,.gif,.webp"
        onChange={handleFileInput}
      />

      {/* ─── Atmospheric Background Layers ─── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_85%,rgba(120,50,10,0.12),transparent),radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(180,60,0,0.10),transparent),linear-gradient(180deg,#080504_0%,#0a0706_40%,#0e0908_100%)]" />

      {/* Subtle vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)]" />

      {/* Ground glow under fire */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55vh] bg-[radial-gradient(ellipse_50%_60%_at_50%_100%,rgba(180,80,10,0.18),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[35vh] bg-[linear-gradient(180deg,transparent_0%,rgba(30,18,12,0.5)_40%,rgba(8,5,4,0.95)_100%)]" />

      {/* Coal bed glow */}
      <div className="pointer-events-none absolute bottom-[6%] left-1/2 h-[90px] w-[40%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,rgba(200,80,20,0.15)_0%,rgba(120,40,10,0.08)_40%,transparent_72%)] blur-sm" />

      {/* Drag-over atmospheric change */}
      <div
        className="pointer-events-none absolute inset-0 z-30 transition-all duration-700"
        style={{
          background: dragOver
            ? 'radial-gradient(ellipse 60% 50% at 50% 70%, rgba(255, 140, 40, 0.12), transparent 60%)'
            : 'transparent',
          opacity: dragOver ? 1 : 0,
        }}
      />

      {/* Recent-drop flash */}
      <div
        className="pointer-events-none absolute inset-0 z-30 transition-all duration-500"
        style={{
          background: 'radial-gradient(ellipse 40% 35% at 50% 75%, rgba(255, 180, 60, 0.2), transparent 55%)',
          opacity: recentDrop ? 1 : 0,
        }}
      />

      {/* ─── Fire Scene ─── */}
      <FlameCanvas intensity={flameIntensity} burning={state.phase === 'burning'} />
      <AshParticles intensity={flameIntensity} ashBurst={isDone} />

      {/* ─── UI Overlay ─── */}
      <div className="relative z-10 flex min-h-screen flex-col">

        {/* Header */}
        <header className="flex items-start justify-between px-4 pb-2 pt-4 md:px-8 md:pt-6">
          <div className="rounded-full border border-white/8 bg-black/30 px-4 py-2 text-[11px] tracking-[0.35em] text-stone-400/70 backdrop-blur-sm">
            赛博烧纸 · 灰烬祭场
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSound}
              className="rounded-full border border-white/8 bg-black/30 px-3 py-2 text-[11px] tracking-[0.22em] text-stone-400/70 transition hover:border-orange-500/25 hover:text-stone-300"
            >
              {soundLabel}
            </button>
          </div>
        </header>

        {/* Main content area */}
        <main className="relative flex flex-1 flex-col items-center justify-between px-4 pb-6 pt-2 md:px-8 md:pb-8">

          {/* Title & Subtitle — solemn, high up */}
          <div className="pointer-events-none mt-6 w-full max-w-3xl text-center md:mt-10">
            <h1
              className="text-3xl font-semibold tracking-[0.5em] text-transparent md:text-5xl lg:text-6xl"
              style={{
                backgroundImage: 'linear-gradient(180deg, #f0e0c8 0%, #c49a60 42%, #6a3a1e 100%)',
                WebkitBackgroundClip: 'text',
              }}
            >
              灰烬之上
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-xs leading-7 tracking-[0.22em] text-stone-500 md:text-sm">
              {isBurning
                ? '纸品正在化入火焰……'
                : isDone
                  ? '余烬归于沉静。'
                  : '火堆长燃不灭。将文件拖入，它便化为灰烬。'}
            </p>
          </div>

          {/* ─── Completion Screen ─── */}
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

          {/* ─── Burning Progress ─── */}
          {(state.phase === 'igniting' || state.phase === 'burning' || state.phase === 'fading') && (
            <div className="absolute left-1/2 top-[28%] z-20 w-full max-w-lg -translate-x-1/2 px-4 md:top-[22%]">
              <BurnProgress state={state} mingli={mingli} />
            </div>
          )}

          {/* ─── Burning text characters dissolving ─── */}
          {!isIdle && !isDone && burnChars.length > 0 && (
            <div className="absolute left-1/2 top-[38%] z-10 flex w-full max-w-3xl -translate-x-1/2 flex-wrap justify-center gap-x-2 gap-y-3 px-6 md:top-[35%]">
              {burnChars.map((char, index) => {
                const totalChars = Math.max(burnChars.length, 1);
                const threshold = index / totalChars;
                const revealWindowStart = Math.max(0, threshold - 0.18);
                const revealWindowEnd = Math.min(1, threshold + 0.05);
                const consumeStart = Math.min(1, threshold + 0.12);
                const revealProgress = Math.min(1, Math.max(0, (state.progress - revealWindowStart) / Math.max(0.001, revealWindowEnd - revealWindowStart)));
                const consumeProgress = Math.min(1, Math.max(0, (state.progress - consumeStart) / 0.16));
                const visible = state.progress >= revealWindowStart;
                const lift = (1 - revealProgress) * 34 - consumeProgress * 50;
                const scale = 0.78 + revealProgress * 0.26 - consumeProgress * 0.24;
                const opacity = visible ? Math.max(0, 0.06 + revealProgress * 0.95 - consumeProgress * 0.96) : 0;
                const glow = revealProgress * (1 - consumeProgress);
                const color = consumeProgress > 0.5 ? '#fb923c' : glow > 0.55 ? '#fff1d6' : '#efe3ce';

                return (
                  <span
                    key={`${char}-${index}`}
                    className="relative inline-flex min-w-[1.2rem] justify-center text-lg transition-all duration-150 md:text-3xl"
                    style={{
                      opacity,
                      transform: `translateY(${lift}px) scale(${scale}) rotate(${consumeProgress * -10}deg)`,
                      color,
                      filter: consumeProgress > 0.52 ? `blur(${consumeProgress * 2.2}px)` : 'none',
                      textShadow: glow > 0
                        ? `0 0 ${10 + glow * 20}px rgba(251,146,60,${0.35 + glow * 0.35}), 0 0 ${18 + glow * 28}px rgba(220,38,38,${0.18 + glow * 0.22})`
                        : '0 0 6px rgba(255,255,255,0.04)',
                    }}
                  >
                    <span
                      className="pointer-events-none absolute inset-x-0 bottom-[-14px] h-7 rounded-full"
                      style={{
                        opacity: Math.max(0, glow - consumeProgress * 0.35),
                        background: 'radial-gradient(circle, rgba(251,146,60,0.38) 0%, rgba(220,38,38,0.15) 50%, rgba(0,0,0,0) 82%)',
                        transform: `scale(${0.65 + glow * 0.75})`,
                      }}
                    />
                    {char}
                  </span>
                );
              })}
            </div>
          )}

          {/* ─── Bottom Control Strip (only when idle) ─── */}
          {isIdle && (
            <div className="mt-auto w-full max-w-4xl">
              {/* Queued files indicator (subtle) */}
              {files.length > 0 && (
                <div className="mx-auto mb-4 flex flex-wrap items-center justify-center gap-2">
                  {files.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="animate-pulse rounded-full border border-orange-500/20 bg-orange-900/15 px-3 py-1 text-[11px] text-orange-200/60"
                    >
                      {file.name.length > 20 ? file.name.slice(0, 18) + '…' : file.name}
                    </div>
                  ))}
                  <span className="text-[11px] text-stone-500 tracking-[0.2em]">即将化入火中…</span>
                </div>
              )}

              {/* Action row */}
              <div className="flex items-center justify-center gap-3">
                {/* Write memorial text */}
                <button
                  type="button"
                  onClick={() => setShowText(!showText)}
                  className="rounded-full border border-white/8 bg-black/25 px-4 py-2.5 text-xs tracking-[0.25em] text-stone-400 transition hover:border-orange-500/20 hover:text-stone-300 backdrop-blur-sm"
                >
                  {showText ? '收起' : '写祭文'}
                </button>

                {/* Invisible-ish "add files" */}
                <button
                  type="button"
                  onClick={handleClickAdd}
                  className="rounded-full border border-white/8 bg-black/25 px-4 py-2.5 text-xs tracking-[0.25em] text-stone-400 transition hover:border-orange-500/20 hover:text-stone-300 backdrop-blur-sm"
                >
                  投纸
                </button>

                {/* Manual burn for text-only */}
                {textInput.trim() && (
                  <button
                    type="button"
                    onClick={handleManualBurn}
                    disabled={isCalculating}
                    className="rounded-full border border-orange-600/30 bg-orange-950/30 px-5 py-2.5 text-xs tracking-[0.3em] text-orange-100/80 transition hover:border-orange-400/50 hover:bg-orange-900/30 disabled:opacity-40 backdrop-blur-sm"
                  >
                    焚化
                  </button>
                )}

                {/* Clear */}
                {(textInput.trim() || files.length > 0) && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-full border border-white/6 bg-black/20 px-3 py-2.5 text-[11px] text-stone-500 transition hover:text-stone-400 backdrop-blur-sm"
                  >
                    清空
                  </button>
                )}
              </div>

              {/* Text input panel (slides open) */}
              {showText && (
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

              {/* Status bar */}
              <div className="mx-auto mt-4 flex items-center justify-center gap-4 text-[10px] tracking-[0.2em] text-stone-600">
                <span>{level.name} · 火势 {mingli}</span>
                <span className="h-3 w-px bg-stone-800" />
                <span>{networkStatus}</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Drag hint overlay — very subtle text */}
      {dragOver && isIdle && (
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
