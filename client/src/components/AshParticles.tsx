import { memo, useEffect, useState } from 'react';

interface Particle {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  drift: number;
  hue: number;
}

interface AshParticlesProps {
  active: boolean;
  count?: number;
  intensity?: number;
}

function AshParticles({ active, count = 40, intensity = 0.35 }: AshParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    setParticles(
      Array.from({ length: count }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        size: 1 + Math.random() * (2 + intensity * 5),
        delay: Math.random() * 2,
        duration: 4 + Math.random() * (5 - intensity * 1.5),
        opacity: 0.08 + Math.random() * (0.22 + intensity * 0.28),
        drift: -60 + Math.random() * 120,
        hue: 20 + Math.random() * 28,
      })),
    );
  }, [active, count, intensity]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.left}%`,
            bottom: '-5%',
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            background: `radial-gradient(circle, hsla(${particle.hue}, 100%, 75%, 0.95) 0%, hsla(${particle.hue}, 90%, 45%, 0.45) 45%, rgba(120,53,15,0) 80%)`,
            boxShadow: `0 0 ${10 + intensity * 16}px rgba(255,140,60,${0.1 + intensity * 0.22})`,
            animation: `ashFloat ${particle.duration}s ease-out ${particle.delay}s infinite`,
            transform: `translateX(${particle.drift}px)`,
          }}
        />
      ))}
      <style>{`
        @keyframes ashFloat {
          0% { transform: translate3d(0, 0, 0) scale(0.9); opacity: 0; }
          8% { opacity: 1; }
          100% { transform: translate3d(42px, -110vh, 0) scale(0.15); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default memo(AshParticles);
