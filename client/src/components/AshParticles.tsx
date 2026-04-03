import { memo, useEffect, useRef } from 'react';

interface AshParticlesProps {
  /** Always active - persistent bonfire */
  intensity: number; // 0..1
  /** Burst mode after burning completes */
  ashBurst: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
  type: 'ember' | 'ash' | 'spark';
  hue: number;
}

function createEmber(w: number, h: number, intensity: number): Particle {
  const centerX = w * 0.5;
  const spread = w * (0.12 + intensity * 0.18);
  return {
    x: centerX + (Math.random() - 0.5) * spread * 2,
    y: h * (0.55 + Math.random() * 0.35),
    vx: (Math.random() - 0.5) * 0.6,
    vy: -(0.3 + Math.random() * (0.8 + intensity * 1.2)),
    size: 1.5 + Math.random() * (2.5 + intensity * 3),
    opacity: 0.4 + Math.random() * 0.5,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.04,
    life: 0,
    maxLife: 120 + Math.random() * 180,
    type: 'ember',
    hue: 15 + Math.random() * 30,
  };
}

function createSpark(w: number, h: number, intensity: number): Particle {
  const centerX = w * 0.5;
  const spread = w * (0.06 + intensity * 0.12);
  return {
    x: centerX + (Math.random() - 0.5) * spread * 2,
    y: h * (0.5 + Math.random() * 0.25),
    vx: (Math.random() - 0.5) * 1.8,
    vy: -(1.5 + Math.random() * (2.5 + intensity * 2)),
    size: 0.8 + Math.random() * 1.5,
    opacity: 0.7 + Math.random() * 0.3,
    rotation: 0,
    rotSpeed: 0,
    life: 0,
    maxLife: 40 + Math.random() * 60,
    type: 'spark',
    hue: 30 + Math.random() * 20,
  };
}

function createAshFlake(w: number, h: number): Particle {
  const centerX = w * 0.5;
  const spread = w * 0.35;
  return {
    x: centerX + (Math.random() - 0.5) * spread * 2,
    y: h * (0.3 + Math.random() * 0.3),
    vx: (Math.random() - 0.5) * 0.8,
    vy: 0.15 + Math.random() * 0.4, // falling DOWN
    size: 3 + Math.random() * 8,
    opacity: 0.15 + Math.random() * 0.3,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.03,
    life: 0,
    maxLife: 200 + Math.random() * 300,
    type: 'ash',
    hue: 0,
  };
}

function AshParticles({ intensity, ashBurst }: AshParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const intensityRef = useRef(intensity);
  const ashBurstRef = useRef(ashBurst);
  const burstTriggeredRef = useRef(false);

  useEffect(() => { intensityRef.current = intensity; }, [intensity]);
  useEffect(() => {
    ashBurstRef.current = ashBurst;
    if (ashBurst && !burstTriggeredRef.current) {
      burstTriggeredRef.current = true;
    }
    if (!ashBurst) {
      burstTriggeredRef.current = false;
    }
  }, [ashBurst]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame: number;
    let spawnTimer = 0;
    let ashBurstDone = false;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      const w = canvas.width;
      const h = canvas.height;
      const int = intensityRef.current;
      ctx.clearRect(0, 0, w, h);

      spawnTimer++;

      // Continuous ember / spark spawning based on intensity
      const emitRate = Math.max(1, Math.floor(3 + int * 8));
      if (spawnTimer % Math.max(1, Math.floor(8 - int * 5)) === 0) {
        for (let i = 0; i < emitRate; i++) {
          particlesRef.current.push(createEmber(w, h, int));
        }
        if (int > 0.35 && Math.random() < int * 0.6) {
          particlesRef.current.push(createSpark(w, h, int));
        }
      }

      // Ash burst: spawn many falling ash flakes
      if (ashBurstRef.current && !ashBurstDone) {
        for (let i = 0; i < 40; i++) {
          particlesRef.current.push(createAshFlake(w, h));
        }
        ashBurstDone = true;
      }
      if (!ashBurstRef.current) {
        ashBurstDone = false;
      }

      // Update & draw
      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        p.life++;
        if (p.life > p.maxLife) continue;

        const progress = p.life / p.maxLife;

        p.x += p.vx + Math.sin(p.life * 0.02 + p.rotation) * 0.2;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        // Wind drift
        p.vx += (Math.random() - 0.5) * 0.05;

        const fadeIn = Math.min(1, p.life / 15);
        const fadeOut = 1 - Math.pow(Math.max(0, (progress - 0.6) / 0.4), 2);
        const alpha = p.opacity * fadeIn * fadeOut;

        if (alpha < 0.005) { alive.push(p); continue; }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha;

        if (p.type === 'ember') {
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
          gradient.addColorStop(0, `hsla(${p.hue}, 100%, 72%, 0.95)`);
          gradient.addColorStop(0.4, `hsla(${p.hue}, 90%, 50%, 0.5)`);
          gradient.addColorStop(1, `hsla(${p.hue}, 80%, 20%, 0)`);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();

          // Glow
          ctx.globalAlpha = alpha * 0.3;
          const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 3);
          glow.addColorStop(0, `hsla(${p.hue}, 100%, 60%, 0.4)`);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'spark') {
          ctx.fillStyle = `hsla(${p.hue}, 100%, 85%, ${alpha})`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          // Spark trail
          ctx.strokeStyle = `hsla(${p.hue}, 100%, 75%, ${alpha * 0.4})`;
          ctx.lineWidth = p.size * 0.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-p.vx * 3, -p.vy * 3);
          ctx.stroke();
        } else if (p.type === 'ash') {
          // Irregular ash flake
          ctx.fillStyle = `rgba(80, 72, 68, ${alpha})`;
          ctx.beginPath();
          const sides = 5 + Math.floor(p.hue); // reuse hue as seed
          for (let s = 0; s < sides; s++) {
            const angle = (s / sides) * Math.PI * 2;
            const r = p.size * (0.5 + Math.sin(angle * 3 + p.rotation) * 0.3);
            if (s === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          ctx.closePath();
          ctx.fill();

          // Faint ember edge on ash
          ctx.globalAlpha = alpha * 0.25 * (1 - progress);
          ctx.strokeStyle = 'rgba(200, 80, 20, 0.5)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        ctx.restore();
        alive.push(p);
      }

      // Cap particle count
      particlesRef.current = alive.length > 500 ? alive.slice(-500) : alive;

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-20"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

export default memo(AshParticles);
