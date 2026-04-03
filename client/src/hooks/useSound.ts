import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Howl } from 'howler';
import type { BurnPhase } from './useBurnCeremony';

/**
 * Layered fire audio system:
 *   - fire-small:    always-on ambient loop (embers/smoldering)
 *   - fire-medium:   faded-in when intensity rises above idle
 *   - fire-large:    faded-in for intense burning phases
 *   - paper-crackle: looping crackling, mixed during active burning
 *   - paper-ignite:  one-shot on drop / ignite
 *   - ember-settle:  one-shot when fire is fading
 *   - bell:          completion chime
 */

export type FireStage = 'idle' | 'small' | 'medium' | 'large';

interface UseSoundOptions {
  phase: BurnPhase;
  /** 0-1 overall fire intensity */
  burningIntensity: number;
  /** Explicit fire stage derived from mingli / content */
  fireStage: FireStage;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function useSound({ phase, burningIntensity, fireStage }: UseSoundOptions) {
  const [enabled, setEnabled] = useState(true);
  const prevPhaseRef = useRef<BurnPhase>('idle');
  const stageRef = useRef<FireStage>('idle');
  const intensityRef = useRef(burningIntensity);

  const soundsRef = useRef<{
    fireSmall: Howl;
    fireMedium: Howl;
    fireLarge: Howl;
    paperCrackle: Howl;
    paperIgnite: Howl;
    emberSettle: Howl;
    bell: Howl;
  } | null>(null);

  // Keep refs in sync
  useEffect(() => {
    stageRef.current = fireStage;
  }, [fireStage]);
  useEffect(() => {
    intensityRef.current = burningIntensity;
  }, [burningIntensity]);

  // --- Load sounds once ---
  useEffect(() => {
    soundsRef.current = {
      fireSmall: new Howl({
        src: ['/sounds/fire-small.wav'],
        volume: 0,
        loop: true,
        preload: true,
      }),
      fireMedium: new Howl({
        src: ['/sounds/fire-medium.wav'],
        volume: 0,
        loop: true,
        preload: true,
      }),
      fireLarge: new Howl({
        src: ['/sounds/fire-large.wav'],
        volume: 0,
        loop: true,
        preload: true,
      }),
      paperCrackle: new Howl({
        src: ['/sounds/paper-crackle.wav'],
        volume: 0,
        loop: true,
        preload: true,
      }),
      paperIgnite: new Howl({
        src: ['/sounds/paper-ignite.wav'],
        volume: 0.6,
        preload: true,
      }),
      emberSettle: new Howl({
        src: ['/sounds/ember-settle.wav'],
        volume: 0.45,
        preload: true,
      }),
      bell: new Howl({
        src: ['/sounds/bell.wav'],
        volume: 0.4,
        preload: true,
      }),
    };

    return () => {
      if (soundsRef.current) {
        Object.values(soundsRef.current).forEach((s) => s.unload());
        soundsRef.current = null;
      }
    };
  }, []);

  // --- Continuous volume mix driven by animation frame ---
  useEffect(() => {
    const s = soundsRef.current;
    if (!s || !enabled) return;

    // Start all loops (at volume 0) so we can cross-fade
    s.fireSmall.play();
    s.fireMedium.play();
    s.fireLarge.play();
    s.paperCrackle.play();

    let frame: number;

    const tick = () => {
      const stage = stageRef.current;
      const intensity = intensityRef.current;

      // Target volumes based on fire stage
      let targetSmall = 0;
      let targetMedium = 0;
      let targetLarge = 0;
      let targetCrackle = 0;

      if (stage === 'idle') {
        // Just faint embers
        targetSmall = 0.10;
        targetMedium = 0;
        targetLarge = 0;
        targetCrackle = 0;
      } else if (stage === 'small') {
        targetSmall = lerp(0.18, 0.30, intensity);
        targetMedium = lerp(0, 0.08, intensity);
        targetLarge = 0;
        targetCrackle = lerp(0.05, 0.14, intensity);
      } else if (stage === 'medium') {
        targetSmall = 0.14;
        targetMedium = lerp(0.22, 0.38, intensity);
        targetLarge = lerp(0, 0.12, intensity);
        targetCrackle = lerp(0.12, 0.28, intensity);
      } else if (stage === 'large') {
        targetSmall = 0.08;
        targetMedium = 0.18;
        targetLarge = lerp(0.30, 0.55, intensity);
        targetCrackle = lerp(0.20, 0.42, intensity);
      }

      // Smooth fade towards targets
      const rate = 0.04;
      s.fireSmall.volume(lerp(s.fireSmall.volume(), targetSmall, rate));
      s.fireMedium.volume(lerp(s.fireMedium.volume(), targetMedium, rate));
      s.fireLarge.volume(lerp(s.fireLarge.volume(), targetLarge, rate));
      s.paperCrackle.volume(lerp(s.paperCrackle.volume(), targetCrackle, rate));

      // Adjust playback rates slightly for realism
      s.fireSmall.rate(lerp(0.92, 1.05, intensity));
      s.fireMedium.rate(lerp(0.94, 1.08, intensity));
      s.fireLarge.rate(lerp(0.96, 1.12, intensity));
      s.paperCrackle.rate(lerp(0.90, 1.15, intensity));

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      s.fireSmall.stop();
      s.fireMedium.stop();
      s.fireLarge.stop();
      s.paperCrackle.stop();
    };
  }, [enabled]);

  // --- One-shot triggers based on phase transitions ---
  useEffect(() => {
    const s = soundsRef.current;
    if (!s || !enabled) return;

    const prev = prevPhaseRef.current;

    // Paper ignite whoosh when entering igniting
    if (phase === 'igniting' && prev !== 'igniting') {
      s.paperIgnite.stop();
      s.paperIgnite.play();
    }

    // Ember settling when fading
    if (phase === 'fading' && prev !== 'fading') {
      s.emberSettle.stop();
      s.emberSettle.play();
    }

    // Bell on completion
    if (phase === 'done' && prev !== 'done') {
      s.bell.stop();
      s.bell.play();
    }

    prevPhaseRef.current = phase;
  }, [phase, enabled]);

  // --- Play paper ignite on demand (for file drop) ---
  const playPaperIgnite = useCallback(() => {
    const s = soundsRef.current;
    if (!s || !enabled) return;
    s.paperIgnite.stop();
    s.paperIgnite.play();
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (!next && soundsRef.current) {
        Object.values(soundsRef.current).forEach((s) => s.stop());
      }
      return next;
    });
  }, []);

  const label = useMemo(() => (enabled ? '音效开启' : '音效关闭'), [enabled]);

  return { enabled, label, toggle, playPaperIgnite };
}
