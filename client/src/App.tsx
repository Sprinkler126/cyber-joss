import { useCallback, useEffect, useMemo, useState } from 'react';
import FlameCanvas from './components/FlameCanvas';
import TextInput from './components/TextInput';
import FileUploader from './components/FileUploader';
import MingliMeter from './components/MingliMeter';
import BurnButton from './components/BurnButton';
import CompletionScreen from './components/CompletionScreen';
import BurnProgress from './components/BurnProgress';
import AshParticles from './components/AshParticles';
import { useBurnCeremony } from './hooks/useBurnCeremony';
import { useMingli } from './hooks/useMingli';
import { useSound } from './hooks/useSound';
import { mingliToFlameIntensity } from './lib/mingliCalculator';

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
  const [burnChars, setBurnChars] = useState<string[]>([]);
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    if (totalBurns > 0) {
      setStatsLoaded(true);
    }
  }, [totalBurns]);

  const isIdle = state.phase === 'idle';
  const isBurning = ['igniting', 'burning', 'fading'].includes(state.phase);
  const isDone = state.phase === 'done';

  const intensity = useMemo(() => mingliToFlameIntensity(mingli), [mingli]);
  const flameIntensity = isDone ? 0.08 : isBurning ? Math.min(intensity * 1.35 + 0.08, 1) : Math.max(intensity, 0.05);
  const { enabled: soundEnabled, label: soundLabel, toggle: toggleSound } = useSound({
    phase: state.phase,
    burningIntensity: flameIntensity,
  });

  const handleAddFiles = useCallback((newFiles: File[]) => {
    setFiles((current) => [...current, ...newFiles]);
  }, [setFiles]);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((current) => current.filter((_, idx) => idx !== index));
  }, [setFiles]);

  const handleBurn = useCallback(() => {
    const chars = textInput.split('').filter((char) => char.trim());
    setBurnChars(chars);
    void burn(textInput, files, mingli);
  }, [burn, files, mingli, textInput]);

  const handleReset = useCallback(() => {
    reset();
    setTextInput('');
    setFiles([]);
    setBurnChars([]);
  }, [reset, setFiles, setTextInput]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#120c0a] text-stone-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,69,19,0.16),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(255,94,0,0.2),_transparent_40%),linear-gradient(180deg,_#1b1410_0%,_#0e0907_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '100% 32px' }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle,_rgba(255,214,170,0.08),_transparent_70%)]" />

      <FlameCanvas intensity={flameIntensity} burning={state.phase === 'burning'} />
      <AshParticles active={isBurning || isDone} count={isDone ? 44 : 24} />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 md:px-8 md:py-10">
        <header className="mb-6 text-center md:mb-10">
          <div className="mx-auto mb-4 inline-flex items-center gap-3 rounded-full border border-[#6a2f16]/60 bg-black/25 px-4 py-2 text-xs tracking-[0.35em] text-amber-200/80 shadow-[0_0_40px_rgba(255,120,0,0.08)] backdrop-blur-sm">
            <span>赛博烧纸</span>
            <span className="text-stone-500">·</span>
            <span>CyberJoss Ritual</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-[0.35em] text-transparent md:text-6xl" style={{ backgroundImage: 'linear-gradient(180deg, #fff2d6 0%, #f9b15d 32%, #d36622 68%, #7f2e11 100%)', WebkitBackgroundClip: 'text' }}>
            灼纸寄思
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-stone-300/78 md:text-base">
            以中国风祭台承载思念，以火焰吞没文字与影像。你写下的祭文、上传的纸品，将在一场安静而庄重的数字焚化中消散于赛博空间。
          </p>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={toggleSound}
              className="rounded-full border border-[#6a2f16]/60 bg-black/30 px-4 py-2 text-xs tracking-[0.25em] text-amber-100/80 transition hover:border-amber-500/40 hover:text-amber-50"
            >
              {soundLabel} · {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </header>

        <main className="grid flex-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="relative overflow-hidden rounded-[28px] border border-[#6d3417]/60 bg-black/30 p-5 shadow-[0_0_80px_rgba(0,0,0,0.28)] backdrop-blur-md md:p-7">
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
            <div className="absolute inset-y-10 left-0 w-px bg-gradient-to-b from-transparent via-red-800/30 to-transparent" />
            <div className="absolute inset-y-10 right-0 w-px bg-gradient-to-b from-transparent via-red-800/30 to-transparent" />

            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs tracking-[0.25em] text-stone-500">祭文台</p>
                <h2 className="mt-2 text-xl text-amber-50">写下想说的话</h2>
              </div>
              <div className="rounded-full border border-amber-700/30 bg-amber-950/20 px-3 py-1 text-xs text-amber-200/80">
                {level.name}
              </div>
            </div>

            {isIdle && (
              <div className="space-y-5">
                <TextInput value={textInput} onChange={setTextInput} disabled={!isIdle} />
                <FileUploader files={files} onAddFiles={handleAddFiles} onRemoveFile={handleRemoveFile} disabled={!isIdle} />
                <MingliMeter mingli={mingli} levelName={level.name} details={details} isCalculating={isCalculating} />
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  <BurnButton onClick={handleBurn} disabled={mingli <= 0 || isCalculating} />
                  <div className="rounded-2xl border border-[#6d3417]/50 bg-[#1c120f]/80 px-4 py-3 text-xs leading-6 text-stone-400">
                    <p>· 文字每 100 字约为 1 冥力</p>
                    <p>· 图片每张 5 冥力</p>
                    <p>· 本地音效：点火 / 燃烧 / 余烬 / 钟声</p>
                    <p>· PDF worker 已改为本地资源</p>
                  </div>
                </div>
              </div>
            )}

            {!isIdle && !isDone && (
              <div className="flex min-h-[480px] flex-col justify-between">
                <div className="space-y-6">
                  <BurnProgress state={state} mingli={mingli} />
                  <div className="rounded-[24px] border border-[#6d3417]/40 bg-[#1a110e]/60 p-5">
                    <p className="mb-4 text-center text-xs tracking-[0.28em] text-stone-500">火中书影</p>
                    <div className="min-h-[260px] overflow-hidden rounded-2xl border border-white/5 bg-black/20 p-4">
                      <div className="flex flex-wrap justify-center gap-x-2 gap-y-3">
                        {burnChars.length > 0 ? burnChars.map((char, index) => {
                          const totalChars = Math.max(burnChars.length, 1);
                          const threshold = index / totalChars;
                          const revealWindowStart = Math.max(0, threshold - 0.16);
                          const revealWindowEnd = Math.min(1, threshold + 0.06);
                          const consumeStart = Math.min(1, threshold + 0.12);
                          const revealProgress = Math.min(1, Math.max(0, (state.progress - revealWindowStart) / Math.max(0.001, revealWindowEnd - revealWindowStart)));
                          const consumeProgress = Math.min(1, Math.max(0, (state.progress - consumeStart) / 0.18));
                          const visible = state.progress >= revealWindowStart;
                          const lift = (1 - revealProgress) * 28 - consumeProgress * 36;
                          const scale = 0.84 + revealProgress * 0.22 - consumeProgress * 0.18;
                          const opacity = visible ? Math.max(0, 0.12 + revealProgress * 0.95 - consumeProgress * 0.92) : 0;
                          const glow = revealProgress * (1 - consumeProgress);
                          const color = consumeProgress > 0.45 ? '#fb923c' : glow > 0.6 ? '#fff1d6' : '#f5e7cf';

                          return (
                            <span
                              key={`${char}-${index}`}
                              className="relative inline-flex min-w-[1.2rem] justify-center text-lg transition-all duration-200 md:text-2xl"
                              style={{
                                opacity,
                                transform: `translateY(${lift}px) scale(${scale}) rotate(${consumeProgress * -8}deg)`,
                                color,
                                filter: consumeProgress > 0.55 ? `blur(${consumeProgress * 1.8}px)` : 'none',
                                textShadow: glow > 0
                                  ? `0 0 ${10 + glow * 18}px rgba(251,146,60,${0.35 + glow * 0.3}), 0 0 ${18 + glow * 24}px rgba(220,38,38,${0.18 + glow * 0.2})`
                                  : '0 0 8px rgba(255,255,255,0.05)',
                              }}
                            >
                              <span
                                className="pointer-events-none absolute inset-x-0 bottom-[-10px] h-6 rounded-full"
                                style={{
                                  opacity: Math.max(0, glow - consumeProgress * 0.4),
                                  background: 'radial-gradient(circle, rgba(251,146,60,0.35) 0%, rgba(220,38,38,0.12) 50%, rgba(0,0,0,0) 80%)',
                                  transform: `scale(${0.7 + glow * 0.6})`,
                                }}
                              />
                              {char}
                            </span>
                          );
                        }) : (
                          <div className="py-16 text-center text-sm text-stone-500">纸灰无字，火焰正吞没你上传的纸品与记忆。</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#6d3417]/40 bg-black/25 p-4 text-center text-sm text-stone-400">
                  <p>{networkStatus}</p>
                </div>
              </div>
            )}

            {isDone && (
              <div className="flex min-h-[520px] items-center justify-center">
                <CompletionScreen
                  totalBurns={totalBurns}
                  onRestart={handleReset}
                  packetsSent={state.packetsSent}
                  mingli={mingli}
                />
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-[28px] border border-[#6d3417]/60 bg-black/25 p-5 backdrop-blur-md md:p-6">
              <p className="text-xs tracking-[0.25em] text-stone-500">焚化注解</p>
              <h3 className="mt-2 text-xl text-amber-50">中国风仪式界面</h3>
              <div className="mt-4 space-y-4 text-sm leading-7 text-stone-300/80">
                <p>界面以深木色、烬红、琥珀金为主色，营造供桌、灯火、纸灰交织的氛围。火焰采用 WebGL shader 叠加云烟和火星，让视觉层次更接近真实燃纸。</p>
                <p>冥力越高，火势越大，燃烧速度越快；高强度时会出现飞火、热浪和更亮的焰芯，保留你方案里的“烈焰”反馈。</p>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#6d3417]/60 bg-black/25 p-5 backdrop-blur-md md:p-6">
              <p className="text-xs tracking-[0.25em] text-stone-500">焚后归处</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-stone-300/75">
                <p>· 数据通过 WebSocket 分片传输</p>
                <p>· 服务端只做转发，不留正文</p>
                <p>· 通过 UDP 投向 RFC 5737 虚空地址</p>
                <p>· 仅保留焚烧总次数，作为众生思念的数字计数</p>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#6d3417]/60 bg-black/25 p-5 backdrop-blur-md md:p-6">
              <p className="text-xs tracking-[0.25em] text-stone-500">当前香火</p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <div className="text-4xl text-amber-100 tabular-nums">{statsLoaded ? totalBurns.toLocaleString() : '—'}</div>
                  <div className="mt-2 text-sm text-stone-400">已消散思念总数</div>
                </div>
                <div className="rounded-2xl border border-amber-700/30 bg-amber-950/20 px-4 py-3 text-right text-xs leading-6 text-amber-100/75">
                  <div>火焰等级</div>
                  <div className="text-base text-amber-200">{level.name}</div>
                </div>
              </div>
            </section>
          </aside>
        </main>

        <footer className="mt-8 text-center text-xs leading-6 text-stone-500">
          <p>「火光向上，思念无形。」</p>
          <p>本应用默认不记录焚烧正文、文件内容与传输明细，仅展示仪式状态与焚烧总次数。</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
