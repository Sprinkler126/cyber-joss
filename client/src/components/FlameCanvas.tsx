import { memo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import flameVert from '../shaders/flame.vert?raw';
import flameFrag from '../shaders/flame.frag?raw';

interface FlameCanvasProps {
  intensity: number;
  burning: boolean;
}

function FlameCanvas({ intensity, burning }: FlameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(intensity);
  const burningRef = useRef(burning);
  const uniformsRef = useRef({
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uBurning: { value: 0 },
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: flameVert,
      fragmentShader: flameFrag,
      uniforms: uniformsRef.current,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setSize(width, height);
      uniformsRef.current.uResolution.value.set(width, height);
    };

    resize();
    window.addEventListener('resize', resize);

    const clock = new THREE.Clock();
    let frame = 0;

    const render = () => {
      uniformsRef.current.uTime.value = clock.getElapsedTime();
      uniformsRef.current.uIntensity.value += (targetRef.current - uniformsRef.current.uIntensity.value) * 0.05;
      uniformsRef.current.uBurning.value += ((burningRef.current ? 1 : 0) - uniformsRef.current.uBurning.value) * 0.08;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    targetRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    burningRef.current = burning;
  }, [burning]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 z-0" />;
}

export default memo(FlameCanvas);
