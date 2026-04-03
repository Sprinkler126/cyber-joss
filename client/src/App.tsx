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
  const [inputOpen, setInputOpen] = useState(false);

  useEffect(() => {
    if (totalBurns > 0) setStatsLoaded(true);
  }, [totalBurns]);

  const isIdle = state.phase === 'idle';
  const isBurning = ['igniting', 'burning', 'fading'].includes(state.phase);
  const isDone = state.phase === 'done';

  const baseIntensity = useMemo(() => mingliToFlameIntensity(mingli), [mingli]);
  const flameIntensity = isDone
    ? 0.1
    : isBurning
      ? Math.min(baseIntensity * 1.4 + 0.1, 1)
      : Math.max(0.08, baseIntensity * 0.9 + (files.length > 0 || textInput.trim() ? 0.1 : 0));

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
    setInputOpen(false);
    void burn(textInput, files, mingli);
  }, [burn, files, mingli, textInput]);

  const handleReset = useCallback(() => {
    reset();
    setTextInput('');
    setFiles([]);
    setBurnChars([]);
    setInputOpen(false);
  }, [reset, setFiles, setTextInput]);

  const hasFuel = mingli > 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0e0908] text-stone-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_78%,rgba(255,110,30,0.16),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(255,70,0,0.14),transparent_40%),linear-gradient(180deg,#120d0b_0%,#090605_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '100% 38px' }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] bg-[radial-gradient(circle_at_50%_100%,rgba(255,120,0,0.28),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[28vh] bg-[linear-gradient(180deg,transparent_0%,rgba(34,20,16,0.35)_25%,rgba(11,8,7,0.92)_100%)]" />

      <FlameCanvas intensity={flameIntensity} burning={state.phase === 'burning'} />
      <AshParticles active={!isDone} count={60} intensity={Math.max(0.25, flameIntensity)} />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-start justify-between px-4 pb-2 pt-4 md:px-8 md:pt-6">
          <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[11px] tracking-[0.35em] text-stone-300/75 backdrop-blur-sm">
            赛博烧纸 · 灰烬祭场
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSound}
              className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] tracking-[0.22em] text-stone-300/75 transition hover:border-orange-400/30 hover:text-orange-100"
            >
              {soundLabel}
            </button>
            {(hasFuel && isIdle) && (
              <button
                type="button"
                onClick={() => setInputOpen((current) => !current)}
                className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-[11px] tracking-[0.22em] text-orange-100/85 transition hover:border-orange-400/40"
              >
                {inputOpen ? '收起祭文' : '写祭文'}
              </button>
            )}
          </div>
        </header>

        <main className="relative flex flex-1 flex-col justify-between px-4 pb-6 pt-2 md:px-8 md:pb-8">
          <div className="pointer-events-none mx-auto mt-4 w-full max-w-5xl text-center">
            <h1 className="text-3xl font-semibold tracking-[0.4em] text-transparent md:text-5xl" style={{ backgroundImage: 'linear-gradient(180deg, #f8ebd5 0%, #d6ae76 42%, #7f4c2a 100%)', WebkitBackgroundClip: 'text' }}>
              灰 烬 之 上
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-xs leading-7 tracking-[0.18em] text-stone-400 md:text-sm">
              默认只有灰烬、暗火和零星火星。把文件拖进来，它会烧得更旺。
            </p>
          </div>

          {isDone ? (
            <div className="flex flex-1 items-center justify-center">
              <CompletionScreen
                totalBurns={totalBurns}
                onRestart={handleReset}
                packetsSent={state.packetsSent}
                mingli={mingli}
              />
            </div>
          ) : (
            <>
              <div className="mx-auto flex w-full max-w-6xl flex-1 items-end justify-center">
                <div className="relative w-full max-w-5xl">
                  <div className="absolute inset-x-[12%] bottom-8 h-16 rounded-[100%] bg-[radial-gradient(circle,rgba(255,120,40,0.18)_0%,rgba(255,90,0,0.08)_30%,rgba(0,0,0,0)_72%)] blur-xl" />
                  <div className="absolute inset-x-0 bottom-0 h-[210px] rounded-[50%] bg-[radial-gradient(circle_at_50%_55%,rgba(61,43,36,0.92)_0%,rgba(31,22,18,0.96)_40%,rgba(10,8,7,1)_75%)] shadow-[0_-20px_80px_rgba(0,0,0,0.55)]" />
                  <div className="absolute inset-x-[7%] bottom-[64px] h-[110px] rounded-[50%] bg-[radial-gradient(circle_at_50%_50%,rgba(96,78,69,0.85)_0%,rgba(46,34,29,0.92)_35%,rgba(22,16,13,0.96)_72%)] opacity-95 blur-[1px]" />
                  <div className="absolute inset-x-[15%] bottom-[86px] h-[70px] rounded-[50%] bg-[radial-gradient(circle_at_50%_50%,rgba(190,180,170,0.22)_0%,rgba(110,98,90,0.18)_28%,rgba(36,27,23,0)_75%)]" />

                  <div className="relative min-h-[58vh] rounded-[40px]">
                    <div className="absolute left-1/2 top-[8%] w-full max-w-2xl -translate-x-1/2 px-4">
                      {(state.phase === 'igniting' || state.phase === 'burning' || state.phase === 'fading') && (
                        <BurnProgress state={state} mingli={mingli} />
                      )}
                    </div>

                    {(inputOpen && isIdle) && (
                      <div className="absolute left-1/2 top-[18%] z-20 w-full max-w-2xl -translate-x-1/2 px-4">
                        <div className="rounded-[28px] border border-white/10 bg-black/35 p-4 shadow-[0_0_60px_rgba(0,0,0,0.3)] backdrop-blur-md md:p-5">
                          <TextInput value={textInput} onChange={setTextInput} disabled={!isIdle} />
                        </div>
                      </div>
                    )}

                    {!isIdle && !isDone && burnChars.length > 0 && (
                      <div className="absolute left-1/2 top-[22%] z-10 flex w-full max-w-3xl -translate-x-1/2 flex-wrap justify-center gap-x-2 gap-y-3 px-6">
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

                    {isIdle && (
                      <div className="absolute inset-x-0 bottom-[122px] z-20 mx-auto w-full max-w-3xl px-4">
                        <FileUploader
                          files={files}
                          onAddFiles={handleAddFiles}
                          onRemoveFile={handleRemoveFile}
                          disabled={!isIdle}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mx-auto mt-2 grid w-full max-w-6xl gap-3 lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                  <div className="text-[11px] tracking-[0.28em] text-stone-500">祭场状态</div>
                  <div className="mt-3 text-sm leading-7 text-stone-300/80">
                    {hasFuel
                      ? '纸品已经落进灰堆，暗火开始抬头。继续添加内容，火会更旺。'
                      : '现在这里只有灰烬、暗火和零星火星。把文件或祭文投进去，火才会真正起来。'}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-400">
                    <span className="rounded-full border border-white/10 px-3 py-1">总焚烧 {statsLoaded ? totalBurns.toLocaleString() : '—'}</span>
                    <span className="rounded-full border border-white/10 px-3 py-1">当前 {level.name}</span>
                  </div>
                </div>

                <MingliMeter mingli={mingli} levelName={level.name} details={details} isCalculating={isCalculating} />

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                  <div className="text-[11px] tracking-[0.28em] text-stone-500">焚化动作</div>
                  <div className="mt-3 text-sm leading-7 text-stone-300/80">{networkStatus}</div>
                  <div className="mt-4 grid gap-3">
                    <BurnButton onClick={handleBurn} disabled={!hasFuel || isCalculating || !isIdle} />
                    {(textInput.trim() || files.length > 0) && isIdle && (
                      <button
                        type="button"
                        onClick={handleReset}
                        className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm tracking-[0.2em] text-stone-300 transition hover:border-white/20 hover:bg-white/10"
                      >
                        清空灰堆
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
