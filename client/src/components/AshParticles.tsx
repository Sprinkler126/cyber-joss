// components/AshParticles.tsx
import { memo, useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

interface AshParticlesProps {
  active: boolean;
  count?: number;
}

function AshParticles({ active, count = 30 }: AshParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      size: 1 + Math.random() * 3,
      delay: Math.random() * 4,
      duration: 3 + Math.random() * 5,
      opacity: 0.2 + Math.random() * 0.5,
    }));
    setParticles(newParticles);
  }, [active, count]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            bottom: '10%',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: `rgba(180, 120, 60, ${p.opacity})`,
            animation: `ash-float ${p.duration}s ease-out ${p.delay}s infinite`,
            boxShadow: `0 0 ${p.size * 2}px rgba(255, 100, 0, 0.2)`,
          }}
        />
      ))}
    </div>
  );
}

export default memo(AshParticles);
