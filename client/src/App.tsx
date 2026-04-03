// App.tsx
// 赛博烧纸 · CyberJoss — 主应用

import { useState, useEffect, useCallback } from 'react';
import FlameCanvas from './components/FlameCanvas';
import TextInput from './components/TextInput';
import FileUploader from './components/FileUploader';
import MingliMeter from './components/MingliMeter';
import BurnButton from './components/BurnButton';
import CompletionScreen from './components/CompletionScreen';
import { useBurnCeremony } from './hooks/useBurnCeremony';
import { useMingli } from './hooks/useMingli';
import { mingliToFlameIntensity } from './lib/mingliCalculator';

function App() {
  const {
    textInput, setTextInput,
    files, setFiles,
    mingli,
  } = useMingli();

  const { state, burn, reset } = useBurnCeremony();
  const [burnChars, setBurnChars] = useState<string[]>([]);

  const isIdle = state.phase === 'idle';
  const isBurning = state.phase === 'igniting' || state.phase === 'burning' || state.phase === 'fading';
  const isDone = state.phase === 'done';

  const handleBurn = useCallback(() => {
    const chars = textInput.split('').filter(c => c.trim());
    setBurnChars(chars);
    burn(textInput, files, mingli);
  }, [textInput, files, mingli, burn]);

  const handleReset = useCallback(() => {
    reset();
    setTextInput('');
    setFiles([]);
    setBurnChars([]);
  }, [reset, setTextInput, setFiles]);

  const intensity = mingliToFlameIntensity(mingli);
  const flameIntensity = isBurning
    ? Math.min(intensity * 1.3, 1.0)
    : isIdle ? intensity : 0;

  return (
    <div
      className="relative min-h-screen bg-black text-gray-200 overflow-hidden"
      style={{ fontFamily: "'Noto Serif SC', serif" }}
    >
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 100%, rgba(80,10,0,0.15) 0%, rgba(0,0,0,0) 70%)',
        zIndex: 0,
      }} />

      {/* Ambient ash particles */}
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              background: `rgba(${100 + Math.random() * 80}, ${40 + Math.random() * 30}, ${10 + Math.random() * 20}, ${0.1 + Math.random() * 0.2})`,
              left: `${Math.random() * 100}%`,
              bottom: '-5%',
              animation: `ambientAsh ${8 + Math.random() * 12}s linear ${Math.random() * 8}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Flame Canvas */}
      <FlameCanvas intensity={flameIntensity} burning={state.phase === 'burning'} />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="pt-10 md:pt-16 pb-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-[0.2em] text-transparent bg-clip-text"
            style={{
              backgroundImage: 'linear-gradient(180deg, #ffcc44 0%, #ff6600 50%, #cc2200 100%)',
            }}
          >
            赛博烧纸
          </h1>
          <p className="text-gray-600 text-xs md:text-sm mt-2 tracking-[0.15em]">
            CyberJoss · 让思念化为数字之灰
          </p>
        </header>

        {/* Content Area */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 pb-6 max-w-lg mx-auto w-full">
          {isIdle && (
            <div className="w-full space-y-5 animate-fadeIn">
              {/* Text Input */}
              <div>
                <label className="text-gray-500 text-xs mb-2 block tracking-wider">📝 祭文</label>
                <TextInput value={textInput} onChange={setTextInput} />
              </div>

              {/* File Uploader */}
              <FileUploader
                files={files}
                onFilesChange={setFiles}
                disabled={false}
              />

              {/* Mingli Meter */}
              <MingliMeter mingli={mingli} phase={state.phase} />

              {/* Burn Button */}
              <BurnButton
                onClick={handleBurn}
                disabled={mingli <= 0}
                mingli={mingli}
              />

              {/* Footer note */}
              <p className="text-center text-gray-800 text-[10px] leading-relaxed mt-4">
                数据经 WebSocket 传输后通过 UDP 消散于 RFC 5737 虚空地址<br />
                服务端不记录任何内容，无日志，无数据库
              </p>
            </div>
          )}

          {/* Igniting / Burning Phase */}
          {(state.phase === 'igniting' || state.phase === 'burning') && (
            <div className="w-full max-w-md">
              {/* Progress */}
              <div className="text-center mb-6">
                <div className="text-orange-500 text-sm tracking-[0.2em] animate-pulse font-serif">
                  {state.phase === 'igniting'
                    ? '点 火 中 ···'
                    : `焚 烧 中 ··· ${state.packetsSent}/${state.totalPackets}`
                  }
                </div>
                {state.phase === 'burning' && (
                  <div className="mt-3 h-1 bg-gray-900 rounded-full overflow-hidden max-w-xs mx-auto border border-gray-800">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${state.progress * 100}%`,
                        background: 'linear-gradient(90deg, #cc2200, #ff5500, #ffaa00)',
                        boxShadow: '0 0 10px rgba(255,85,0,0.4)',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Text being consumed by fire */}
              {burnChars.length > 0 && (
                <div className="relative min-h-[120px] overflow-hidden flex flex-wrap justify-center items-center gap-[2px] px-2">
                  {burnChars.map((char, i) => {
                    const progress = state.phase === 'burning'
                      ? (i / burnChars.length) * state.progress + state.progress * 0.3
                      : 0;
                    const consumed = progress > (i / burnChars.length);

                    return (
                      <span
                        key={i}
                        className="inline-block text-base md:text-lg transition-all duration-700 ease-out"
                        style={{
                          opacity: consumed ? 0 : 0.9,
                          color: consumed ? '#ff2200' : '#d4d4d4',
                          textShadow: consumed
                            ? '0 0 8px #ff4400, 0 0 16px #ff2200, 0 0 24px #ff0000'
                            : 'none',
                          transform: consumed ? 'translateY(-40px) scale(0.3)' : 'translateY(0)',
                          filter: consumed ? 'blur(3px)' : 'none',
                        }}
                      >
                        {char}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Fading Phase */}
          {state.phase === 'fading' && (
            <div className="text-center space-y-4">
              <p className="text-gray-600 text-sm tracking-[0.3em] animate-pulse font-serif">
                余 烬 消 散 中 ···
              </p>
              {/* Fading ash */}
              <div className="relative h-20 overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-gray-600/50"
                    style={{
                      left: `${20 + Math.random() * 60}%`,
                      bottom: '0',
                      animation: `fadeAsh ${1.5 + Math.random() * 2}s ease-out ${Math.random() * 1}s forwards`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        {isIdle && (
          <footer className="py-4 text-center">
            <p className="text-gray-800 text-[10px] tracking-wider font-serif">
              「死亡不是终点，遗忘才是。」
            </p>
          </footer>
        )}
      </div>

      {/* Completion Screen */}
      {isDone && (
        <CompletionScreen
          mingli={mingli}
          packetsSent={state.packetsSent}
          onReset={handleReset}
        />
      )}

      <style>{`
        @keyframes ambientAsh {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          5% { opacity: 0.8; }
          95% { opacity: 0.3; }
          100% { transform: translateY(-110vh) translateX(30px) rotate(360deg); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeAsh {
          0% { transform: translateY(0) translateX(0); opacity: 0.6; }
          100% { transform: translateY(-80px) translateX(${Math.random() > 0.5 ? '' : '-'}20px); opacity: 0; }
        }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out; }
      `}</style>
    </div>
  );
}

export default App;
