import { memo, useEffect, useState } from 'react';

interface Particle {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  drift: number;
}

interface AshParticlesProps {
  active: boolean;
  count?: number;
}

function AshParticles({ active, count = 28 }: AshParticlesProps) {
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
        size: 2 + Math.random() * 4,
        delay: Math.random() * 2,
        duration: 5 + Math.random() * 5,
        opacity: 0.12 + Math.random() * 0.3,
        drift: -40 + Math.random() * 80,
      })),
    );
  }, [active, count]);

  if (!active) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
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
            background: 'radial-gradient(circle, rgba(255,190,120,0.9) 0%, rgba(161,98,7,0.4) 45%, rgba(120,53,15,0) 80%)',
            boxShadow: '0 0 12px rgba(255,150,80,0.18)',
            animation: `ashFloat ${particle.duration}s ease-out ${particle.delay}s infinite`,
            transform: `translateX(${particle.drift}px)`,
          }}
        />
      ))}
      <style>{`
        @keyframes ashFloat {
          0% { transform: translate3d(0, 0, 0) scale(0.8); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translate3d(36px, -110vh, 0) scale(0.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default memo(AshParticles);
