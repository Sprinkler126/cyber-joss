import { memo, useEffect, useRef, useState, useCallback } from 'react';

/**
 * PaperCard — A floating paper card that:
 * 1. Follows the mouse during drag (cursor becomes paper)
 * 2. Warps/yellows edges when near the fire basin (bottom of screen)
 * 3. Falls in a physics arc on drop into the fire
 * 4. Burns from a corner — fire spreads, ink text fades, paper curls and fragments
 * 5. Shatters into black ash pieces that join the ember pile
 */

export type PaperPhase = 'hidden' | 'following' | 'falling' | 'burning' | 'ash';

interface PaperCardProps {
  /** Current mouse position, updated on dragOver */
  mouseX: number;
  mouseY: number;
  /** Viewport dimensions */
  viewW: number;
  viewH: number;
  /** File name to display as "ink" */
  fileName: string;
  /** Phase of the paper */
  phase: PaperPhase;
  /** Called when burning animation completes */
  onBurnComplete: () => void;
  /** Called when paper hits the fire */
  onContact: () => void;
}

// Fire basin is roughly in the bottom 35% of the screen, centered
function getHeatFactor(y: number, h: number): number {
  const ratio = y / h;
  // Starts warming at 55% down, fully hot at 85%
  return Math.max(0, Math.min(1, (ratio - 0.50) / 0.35));
}

function PaperCard({
  mouseX, mouseY, viewW, viewH,
  fileName, phase, onBurnComplete, onContact,
}: PaperCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [fallPos, setFallPos] = useState({ x: 0, y: 0, rot: 0 });
  const [burnProgress, setBurnProgress] = useState(0);
  const [ashPieces, setAshPieces] = useState<Array<{ id: number; x: number; y: number; rot: number; dx: number; dy: number; size: number; opacity: number }>>([]);
  const animRef = useRef<number>(0);
  const fallStartRef = useRef({ x: 0, y: 0, time: 0 });
  const contactFiredRef = useRef(false);

  const displayName = fileName.length > 16 ? fileName.slice(0, 14) + '…' : fileName;

  // --- FALLING animation ---
  useEffect(() => {
    if (phase !== 'falling') return;
    contactFiredRef.current = false;

    const startX = mouseX;
    const startY = mouseY;
    // Target: center-bottom of screen (fire basin center)
    const targetX = viewW / 2;
    const targetY = viewH * 0.78;
    const startTime = performance.now();
    const duration = 650; // ms for the arc

    fallStartRef.current = { x: startX, y: startY, time: startTime };

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Ease-in for gravity feel
      const ease = t * t * (3 - 2 * t); // smoothstep
      const gravityEase = t * t; // parabolic

      const x = startX + (targetX - startX) * ease;
      const y = startY + (targetY - startY) * gravityEase + Math.sin(t * Math.PI) * -60; // arc upward then down
      const rot = (1 - t) * 0 + t * (12 + Math.sin(t * Math.PI * 2) * 8);

      setFallPos({ x, y, rot });

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
      // Fire contact at ~70% of the fall
      if (t > 0.7 && !contactFiredRef.current) {
        contactFiredRef.current = true;
        onContact();
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- BURNING animation ---
  useEffect(() => {
    if (phase !== 'burning') {
      setBurnProgress(0);
      return;
    }

    const duration = 3800; // 3.8s burn
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      setBurnProgress(t);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        // Generate ash pieces
        const pieces = Array.from({ length: 8 }, (_, i) => ({
          id: i,
          x: fallPos.x + (Math.random() - 0.5) * 80,
          y: fallPos.y + (Math.random() - 0.5) * 30,
          rot: Math.random() * 360,
          dx: (Math.random() - 0.5) * 40,
          dy: Math.random() * 30 + 10,
          size: 4 + Math.random() * 8,
          opacity: 0.6 + Math.random() * 0.4,
        }));
        setAshPieces(pieces);
        // Delay then complete
        setTimeout(() => {
          onBurnComplete();
          setAshPieces([]);
        }, 1200);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'hidden') return null;

  const heat = phase === 'following' ? getHeatFactor(mouseY, viewH) : 0;
  const isFollowing = phase === 'following';
  const isFalling = phase === 'falling';
  const isBurning = phase === 'burning';
  const isAsh = phase === 'ash';

  // Position
  let posX = mouseX;
  let posY = mouseY;
  let rotation = 0;
  let scale = 1;
  let opacity = 1;

  if (isFalling || isBurning || isAsh) {
    posX = fallPos.x;
    posY = fallPos.y;
    rotation = fallPos.rot;
  }

  if (isFollowing) {
    rotation = Math.sin(Date.now() * 0.002) * 3 + heat * 5;
    scale = 1 - heat * 0.05;
  }

  if (isBurning) {
    scale = 1 - burnProgress * 0.3;
    opacity = Math.max(0, 1 - burnProgress * 1.2);
    rotation = fallPos.rot + burnProgress * 15;
  }

  // Paper dimensions
  const paperW = 140;
  const paperH = 90;

  // Burn mask: fire spreads from bottom-right corner
  const burnRadius = burnProgress * 220; // px radius of the burn circle

  return (
    <>
      <div
        ref={cardRef}
        className="pointer-events-none fixed z-50"
        style={{
          left: posX - paperW / 2,
          top: posY - paperH / 2,
          width: paperW,
          height: paperH,
          transform: `rotate(${rotation}deg) scale(${scale})`,
          opacity,
          transition: isFollowing ? 'transform 0.08s ease-out' : 'none',
          willChange: 'transform, opacity, left, top',
        }}
      >
        {/* Paper body */}
        <div
          className="relative h-full w-full overflow-hidden rounded-sm"
          style={{
            background: isBurning
              ? `radial-gradient(circle ${burnRadius}px at 100% 100%, #1a0e08 0%, #2a1a10 ${burnRadius * 0.4}px, #3d2a1a ${burnRadius * 0.6}px, rgba(60,40,20,0.9) ${burnRadius * 0.8}px, #f5e6d0 ${burnRadius}px)`
              : `linear-gradient(135deg, ${heat > 0.3 ? '#f0d8a8' : '#f5e6d0'} 0%, ${heat > 0.6 ? '#e8c888' : '#ebe0d0'} 100%)`,
            boxShadow: isBurning
              ? `0 0 ${20 + burnProgress * 40}px rgba(255,120,20,${0.3 + burnProgress * 0.4}), inset 0 0 ${burnRadius * 0.5}px rgba(255,80,0,${burnProgress * 0.6})`
              : heat > 0.2
                ? `0 4px 20px rgba(0,0,0,0.3), 0 0 ${heat * 30}px rgba(255,140,40,${heat * 0.2})`
                : '0 4px 20px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)',
            filter: heat > 0.4 && isFollowing
              ? `brightness(${1 + heat * 0.15}) contrast(${1 + heat * 0.1})`
              : 'none',
          }}
        >
          {/* Heat edge curl effect */}
          {isFollowing && heat > 0.3 && (
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                height: `${heat * 35}%`,
                background: `linear-gradient(to top, rgba(180,120,40,${heat * 0.4}), transparent)`,
                borderTop: `1px solid rgba(200,140,50,${heat * 0.3})`,
              }}
            />
          )}

          {/* Edge curl corners (heat warp) */}
          {isFollowing && heat > 0.5 && (
            <>
              <div
                className="absolute bottom-0 right-0 rounded-tl-full"
                style={{
                  width: heat * 20,
                  height: heat * 20,
                  background: `linear-gradient(135deg, transparent 40%, rgba(160,100,30,${heat * 0.5}))`,
                  transform: `rotate(${heat * 15}deg)`,
                }}
              />
              <div
                className="absolute bottom-0 left-0 rounded-tr-full"
                style={{
                  width: heat * 14,
                  height: heat * 14,
                  background: `linear-gradient(225deg, transparent 40%, rgba(160,100,30,${heat * 0.4}))`,
                  transform: `rotate(${-heat * 10}deg)`,
                }}
              />
            </>
          )}

          {/* Burn edge glow line */}
          {isBurning && burnProgress > 0.05 && burnProgress < 0.9 && (
            <div
              className="absolute"
              style={{
                right: 0,
                bottom: 0,
                width: burnRadius * 2,
                height: burnRadius * 2,
                borderRadius: '50%',
                transform: 'translate(50%, 50%)',
                boxShadow: `0 0 8px 3px rgba(255,140,20,0.8), 0 0 20px 6px rgba(255,80,0,0.4)`,
                opacity: 1 - burnProgress * 0.5,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Filename as "ink" text */}
          <div
            className="absolute inset-0 flex items-center justify-center px-3"
            style={{
              opacity: isBurning ? Math.max(0, 1 - burnProgress * 2.5) : 1,
              filter: isBurning ? `blur(${burnProgress * 2}px)` : 'none',
            }}
          >
            <span
              className="text-center text-[11px] leading-tight"
              style={{
                color: heat > 0.5 ? '#4a3520' : '#5a4a3a',
                fontFamily: "'STKaiti', 'KaiTi', 'Noto Serif SC', serif",
                letterSpacing: '0.08em',
                textShadow: isBurning && burnProgress > 0.3
                  ? `0 0 ${burnProgress * 10}px rgba(255,100,0,${burnProgress * 0.8})`
                  : 'none',
              }}
            >
              {displayName}
            </span>
          </div>

          {/* Burning sparks on the paper */}
          {isBurning && burnProgress > 0.1 && burnProgress < 0.85 && (
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 5 }, (_, i) => {
                const angle = (i / 5) * Math.PI * 2 + burnProgress * 3;
                const dist = burnRadius * (0.8 + Math.sin(i * 2.1 + burnProgress * 5) * 0.2);
                const sx = paperW - dist * Math.cos(angle);
                const sy = paperH - dist * Math.sin(angle);
                return (
                  <span
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      left: sx,
                      top: sy,
                      width: 2 + Math.random() * 2,
                      height: 2 + Math.random() * 2,
                      background: '#ffcc44',
                      boxShadow: '0 0 4px 1px rgba(255,180,40,0.8)',
                      opacity: 0.6 + Math.sin(burnProgress * 10 + i) * 0.4,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ash pieces that scatter after burn */}
      {ashPieces.map((piece) => (
        <div
          key={piece.id}
          className="pointer-events-none fixed z-50"
          style={{
            left: piece.x,
            top: piece.y,
            width: piece.size,
            height: piece.size * 0.7,
            background: '#1a1210',
            borderRadius: '30% 70% 60% 40%',
            opacity: piece.opacity,
            transform: `rotate(${piece.rot}deg) translate(${piece.dx}px, ${piece.dy}px)`,
            transition: 'all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            boxShadow: `0 0 3px rgba(180,80,20,${piece.opacity * 0.3})`,
          }}
        />
      ))}
    </>
  );
}

export default memo(PaperCard);
