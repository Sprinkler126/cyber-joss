import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Howl } from 'howler';
import type { BurnPhase } from './useBurnCeremony';

interface UseSoundOptions {
  phase: BurnPhase;
  burningIntensity: number;
}

export function useSound({ phase, burningIntensity }: UseSoundOptions) {
  const [enabled, setEnabled] = useState(true);
  const soundsRef = useRef<{ ignite: Howl; burning: Howl; ember: Howl; bell: Howl } | null>(null);
  const prevPhaseRef = useRef<BurnPhase>('idle');

  useEffect(() => {
    soundsRef.current = {
      ignite: new Howl({ src: ['/sounds/ignite.wav'], volume: 0.55 }),
      burning: new Howl({ src: ['/sounds/burning-loop.wav'], volume: 0.22, loop: true }),
      ember: new Howl({ src: ['/sounds/ember.wav'], volume: 0.32 }),
      bell: new Howl({ src: ['/sounds/bell.wav'], volume: 0.4 }),
    };

    return () => {
      Object.values(soundsRef.current || {}).forEach((sound) => sound.unload());
      soundsRef.current = null;
    };
  }, []);

  useEffect(() => {
    const sounds = soundsRef.current;
    if (!sounds || !enabled) {
      return;
    }

    const previous = prevPhaseRef.current;

    if (phase === 'igniting' && previous !== 'igniting') {
      sounds.ignite.stop();
      sounds.ignite.play();
    }

    if (phase === 'burning') {
      if (!sounds.burning.playing()) {
        sounds.burning.play();
      }
      sounds.burning.volume(0.18 + Math.min(0.22, burningIntensity * 0.24));
      sounds.burning.rate(0.92 + Math.min(0.16, burningIntensity * 0.12));
    } else if (sounds.burning.playing()) {
      sounds.burning.fade(sounds.burning.volume(), 0, 500);
      window.setTimeout(() => {
        sounds.burning?.stop();
        sounds.burning?.volume(0.22);
      }, 540);
    }

    if (phase === 'fading' && previous !== 'fading') {
      sounds.ember.stop();
      sounds.ember.play();
    }

    if (phase === 'done' && previous !== 'done') {
      sounds.bell.stop();
      sounds.bell.play();
    }

    prevPhaseRef.current = phase;
  }, [burningIntensity, enabled, phase]);

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      if (!next) {
        Object.values(soundsRef.current || {}).forEach((sound) => sound.stop());
      }
      return next;
    });
  }, []);

  const label = useMemo(() => (enabled ? '音效开启' : '音效关闭'), [enabled]);

  return {
    enabled,
    label,
    toggle,
  };
}
