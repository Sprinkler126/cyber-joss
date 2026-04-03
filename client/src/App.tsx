import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FlameCanvas from './components/FlameCanvas';
import PaperCard from './components/PaperCard';
import type { PaperPhase } from './components/PaperCard';
import BurnProgress from './components/BurnProgress';
import CompletionScreen from './components/CompletionScreen';
import { useBurnCeremony, calculateBurnParams } from './hooks/useBurnCeremony';
import { useMingli } from './hooks/useMingli';
import { useSound, FireStage } from './hooks/useSound';
import { mingliToFlameIntensity } from './lib/mingliCalculator';

/**
 * Immersive Chinese paper-burning ritual.
 *
 * The entire page is a persistent bonfire. No visible drop zone — the scene
 * itself gives all feedback. Dragging a file over shows a floating paper card
 * that follows the mouse, warps near the fire, falls on drop, burns visually,
 * then shatters into ash. Multiple consecutive burns make the fire grow.
 */

// ─── Paper queue item — one card per FILE ───
interface PaperItem {
  id: number;
  file: File;            // single file per card
  fileName: string;
  phase: PaperPhase;
  // stagger offset so cards fan out when dropped together
  dropOffsetX: number;  // px offset from drop centre
  dropOffsetY: number;
}

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

// Calculate how close a Y position is to the fire basin (bottom 35% of screen)
function getDragSense(mouseY: number, viewH: number): number {
  if (viewH <= 0) return 0;
  const ratio = mouseY / viewH;
  return Math.max(0, Math.min(1, (ratio - 0.45) / 0.40));
}

let paperIdCounter = 0;

function App() {
  const {
    textInput, setTextInput,
    files, setFiles,
    mingli, details, level, isCalculating,
  } = useMingli();

  const { state, feedFiles, reset, totalBurns, networkStatus } = useBurnCeremony();

  // Paper card state
  const [papers, setPapers] = useState<PaperItem[]>([]);
  const [activePaper, setActivePaper] = useState<PaperItem | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [viewSize, setViewSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [dragFileName, setDragFileName] = useState('纸品');
  const [dragFileCount, setDragFileCount] = useState(1);

  const [showText, setShowText] = useState(false);
  const [burnChars, setBurnChars] = useState<string[]>([]);
  const [dropPulse, setDropPulse] = useState(0);
  const [ashAmount, setAshAmount] = useState(0);
  const [cumulativeBurns, setCumulativeBurns] = useState(0);
  const [dragSense, setDragSense] = useState(0);
  
  // 飘浮文本状态 - 随包发送的字符
  const [floatingTexts, setFloatingTexts] = useState<Array<{id: number; char: string; x: number; y: number; opacity: number; scale: number}>>([]);
  const floatingIdRef = useRef(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const autoBurnRef = useRef<ReturnType<typeof setTimeout>>();
  const dragCounterRef = useRef(0); // track nested drag events

  const isIdle = state.phase === 'idle';
  const isBurning = ['igniting', 'burning', 'fading'].includes(state.phase);
  const isDone = state.phase === 'done';

  const baseIntensity = useMemo(() => mingliToFlameIntensity(mingli), [mingli]);

  const flameIntensity = isDone
    ? 0.35
    : isBurning
      ? Math.min(baseIntensity * 1.5 + 0.25, 1)
      : Math.max(0.55, baseIntensity * 0.9 + (files.length > 0 || textInput.trim() ? 0.15 : 0.25));

  const fireStage = getFireStage(mingli, isBurning);

  const { label: soundLabel, toggle: toggleSound, playPaperIgnite, playContactBurst } = useSound({
    phase: state.phase,
    burningIntensity: flameIntensity,
    fireStage,
    dragSense,
  });

  // ─── Window resize ───
  useEffect(() => {
    const onResize = () => setViewSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ─── Drop pulse decay ───
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

  // ─── Floating text effect: firefly-like glowing text rising slowly ───
  useEffect(() => {
    if (state.currentText && isBurning) {
      // 根据总包数动态调整动画参数
      const params = calculateBurnParams(state.totalPackets);
      
      // Split the text into individual chars and create floating text for each
      const chars = state.currentText.split('');
      chars.forEach((char, idx) => {
        setTimeout(() => {
          const id = ++floatingIdRef.current;
          const x = 45 + (Math.random() - 0.5) * 30;
          const y = 75 + Math.random() * 10;
          
          setFloatingTexts(prev => {
            // 限制同时显示的飘浮字数，避免卡顿
            const filtered = prev.length >= params.maxConcurrentFloats 
              ? prev.slice(prev.length - params.maxConcurrentFloats + 1) 
              : prev;
            return [...filtered, { 
              id, 
              char, 
              x, 
              y, 
              opacity: 0.8 + Math.random() * 0.2, 
              scale: 0.8 + Math.random() * 0.4 
            }];
          });
          
          // Firefly-like animation with dynamic duration
          const duration = params.animationDuration;
          const startTime = Date.now();
          const twinkleSpeed = 2 + Math.random() * 3;
          
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
              setFloatingTexts(prev => prev.filter(t => t.id !== id));
              return;
            }
            
            // Firefly twinkling effect
            const twinkle = Math.sin(elapsed * 0.008 * twinkleSpeed) * 0.25 + 0.75;
            const fadeOut = Math.max(0, 1 - Math.pow(progress, 1.5) * 0.7);
            
            setFloatingTexts(prev => prev.map(t => {
              if (t.id !== id) return t;
              return {
                ...t,
                y: y - progress * 45,
                opacity: fadeOut * twinkle,
                scale: (0.8 + progress * 0.25) * (0.92 + twinkle * 0.15),
              };
            }));
            
            requestAnimationFrame(animate);
          };
          
          requestAnimationFrame(animate);
        }, idx * 120); // 动态间隔
      });
    }
  }, [state.currentText, isBurning, state.totalPackets]);

  // Reset
  const handleReset = useCallback(() => {
    reset();
    setTextInput('');
    setFiles([]);
    setBurnChars([]);
    setShowText(false);
    setAshAmount(0);
    setCumulativeBurns(0);
    setPapers([]);
    setActivePaper(null);
  }, [reset, setFiles, setTextInput]);

  // ─── Start the actual burn ceremony ───
  const startBurn = useCallback((newFiles: File[]) => {
    if (newFiles.length === 0 && !textInput.trim()) return;

    // Merge with any existing queued files
    const allFiles = [...files, ...newFiles];
    setFiles(allFiles);

    const chars = textInput.split('').filter((c) => c.trim());
    setBurnChars(chars);

    void feedFiles(textInput, allFiles, mingli);
  }, [feedFiles, files, mingli, textInput, setFiles]);

  // ─── Paper card state machine ───
  // When a paper finishes burning, increment cumulative and start actual ceremony
  const handlePaperBurnComplete = useCallback((paper: PaperItem) => {
    setCumulativeBurns((c) => c + 1);
    setAshAmount((v) => Math.min(1, v + 0.08));

    // Remove from active
    setPapers((prev) => prev.filter((p) => p.id !== paper.id));
    if (activePaper?.id === paper.id) {
      setActivePaper(null);
    }

    // Start the actual data burn ceremony (single file)
    startBurn([paper.file]);
  }, [activePaper, startBurn]);

  const handlePaperContact = useCallback(() => {
    // Fire spike: flash + sound
    setDropPulse(1);
    playContactBurst();
  }, [playContactBurst]);

  // ─── Drag events — NO visible drop zone, scene gives feedback ───
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
      // Try to get file name from drag event
      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        const count = items.length;
        setDragFileCount(count);
        setDragFileName(count > 1 ? `${count}份纸品` : '纸品');
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMousePos({ x: e.clientX, y: e.clientY });
    setDragSense(getDragSense(e.clientY, viewSize.h));
  }, [viewSize.h]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
      setDragSense(0);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    setDragSense(0);

    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length === 0) return;

    // Play ignite sound
    playPaperIgnite();

    // Create ONE card per file, fanned out so they scatter visually
    const newPapers: PaperItem[] = dropped.map((file, idx) => {
      const total = dropped.length;
      // Fan cards: spread ±80px horizontally, slight vertical stagger
      const spreadX = total > 1 ? ((idx / (total - 1)) - 0.5) * 160 : 0;
      const spreadY = total > 1 ? (idx % 2) * 18 - 9 : 0;
      return {
        id: ++paperIdCounter,
        file,
        fileName: file.name,
        phase: 'falling' as PaperPhase,
        dropOffsetX: spreadX,
        dropOffsetY: spreadY,
      };
    });

    setPapers((prev) => [...prev, ...newPapers]);
    setActivePaper(newPapers[0]);

    // Also add files to mingli calculation immediately
    setFiles((cur) => [...cur, ...dropped]);

    // After falling (~650ms + stagger), transition each card to burning
    newPapers.forEach((paper, idx) => {
      setTimeout(() => {
        setPapers((prev) =>
          prev.map((p) => (p.id === paper.id ? { ...p, phase: 'burning' } : p))
        );
      }, 700 + idx * 120); // slight stagger so they don't all ignite simultaneously
    });
  }, [playPaperIgnite, setFiles]);

  // ─── File input (button) — same animation ───
  const handleClickAdd = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    e.target.value = '';

    playPaperIgnite();
    setMousePos({ x: viewSize.w / 2, y: viewSize.h * 0.3 });

    // One card per file
    const newPapers: PaperItem[] = selected.map((file, idx) => {
      const total = selected.length;
      const spreadX = total > 1 ? ((idx / (total - 1)) - 0.5) * 160 : 0;
      const spreadY = total > 1 ? (idx % 2) * 18 - 9 : 0;
      return {
        id: ++paperIdCounter,
        file,
        fileName: file.name,
        phase: 'falling' as PaperPhase,
        dropOffsetX: spreadX,
        dropOffsetY: spreadY,
      };
    });

    setPapers((prev) => [...prev, ...newPapers]);
    setActivePaper(newPapers[0]);
    setFiles((cur) => [...cur, ...selected]);

    newPapers.forEach((paper, idx) => {
      setTimeout(() => {
        setPapers((prev) =>
          prev.map((p) => (p.id === paper.id ? { ...p, phase: 'burning' } : p))
        );
      }, 700 + idx * 120);
    });
  }, [playPaperIgnite, setFiles, viewSize]);

  // ─── Auto-burn: if only text (no files dropped as paper), allow manual burn ───
  const handleManualBurn = useCallback(() => {
    if (!textInput.trim() && files.length === 0) return;
    clearTimeout(autoBurnRef.current);
    const chars = textInput.split('').filter((c) => c.trim());
    setBurnChars(chars);
    void feedFiles(textInput, files, mingli);
  }, [feedFiles, files, mingli, textInput]);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#0a0705] text-stone-100 select-none"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ cursor: isDragging ? 'none' : 'default' }}
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

      {/* ─── FIRE — full‑screen shader renders both background AND flame ─── */}
      <FlameCanvas
        intensity={flameIntensity}
        burning={state.phase === 'burning'}
        dropPulse={dropPulse}
        ashAmount={ashAmount}
        dragSense={dragSense}
        cumulativeBurns={cumulativeBurns}
      />

      {/* ─── Floating paper cards during drag (one ghost per file, fanned out) ─── */}
      {isDragging && Array.from({ length: Math.min(dragFileCount, 5) }, (_, idx) => {
        const total = Math.min(dragFileCount, 5);
        const spreadX = total > 1 ? ((idx / (total - 1)) - 0.5) * 100 : 0;
        const spreadY = total > 1 ? (idx % 2) * 12 - 6 : 0;
        return (
          <PaperCard
            key={`drag-preview-${idx}`}
            mouseX={mousePos.x + spreadX}
            mouseY={mousePos.y + spreadY}
            viewW={viewSize.w}
            viewH={viewSize.h}
            fileName={dragFileCount === 1 ? dragFileName : `纸品 ${idx + 1}`}
            phase="following"
            onBurnComplete={() => {}}
            onContact={() => {}}
          />
        );
      })}

      {/* ─── Dropped paper cards (one per file, scattered) ─── */}
      {papers.map((paper) => (
        <PaperCard
          key={paper.id}
          mouseX={mousePos.x + paper.dropOffsetX}
          mouseY={mousePos.y + paper.dropOffsetY}
          viewW={viewSize.w}
          viewH={viewSize.h}
          fileName={paper.fileName}
          phase={paper.phase}
          onBurnComplete={() => handlePaperBurnComplete(paper)}
          onContact={handlePaperContact}
        />
      ))}

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
              {isDragging
                ? '将纸品移向火堆……靠近时火焰会感应。'
                : isBurning
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

          {/* ─── Floating text from file content — firefly style ─── */}
          {floatingTexts.length > 0 && (
            <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
              {floatingTexts.map((t) => (
                <span
                  key={t.id}
                  className="absolute text-xl font-light md:text-3xl"
                  style={{
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    opacity: t.opacity,
                    transform: `translate(-50%, -50%) scale(${t.scale})`,
                    color: `rgba(255, ${180 + t.opacity * 40}, ${80 + t.opacity * 60}, ${t.opacity})`,
                    textShadow: `
                      0 0 ${8 + t.opacity * 12}px rgba(255,200,100,${0.6 + t.opacity * 0.4}), 
                      0 0 ${20 + t.opacity * 20}px rgba(255,140,50,${0.4 + t.opacity * 0.3}),
                      0 0 ${40 + t.opacity * 30}px rgba(255,100,30,${0.2 + t.opacity * 0.2})
                    `,
                    fontFamily: "'Noto Serif SC', 'STSong', serif",
                    filter: `blur(${0.5 - t.opacity * 0.3}px)`,
                    transition: 'none',
                  }}
                >
                  {t.char}
                </span>
              ))}
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
          {!isDone && (
            <div className="mt-auto w-full max-w-4xl">
              {/* Cumulative burn indicator */}
              {cumulativeBurns > 0 && !isBurning && (
                <div className="mx-auto mb-3 text-center text-[10px] tracking-[0.25em] text-orange-400/40">
                  已焚 {cumulativeBurns} 件 · 余烬堆积
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

                {(textInput.trim() || files.length > 0 || cumulativeBurns > 0) && isIdle && (
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
    </div>
  );
}

export default App;
