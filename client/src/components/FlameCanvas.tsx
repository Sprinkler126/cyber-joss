import { memo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import flameVert from '../shaders/flame.vert?raw';
import flameFrag from '../shaders/flame.frag?raw';

interface FlameCanvasProps {
  intensity: number;      // 0..1 fire size
  burning: boolean;       // active burn phase
  dropPulse: number;      // 0..1 flashes on file drop, decays externally
  ashAmount: number;       // 0..1 accumulated ash on ground
  dragSense: number;      // 0..1 how close the dragged file is to the fire
  cumulativeBurns: number; // 0..N total items burned (grows ember pile, smoke, light)
}

function FlameCanvas({ intensity, burning, dropPulse, ashAmount, dragSense, cumulativeBurns }: FlameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(intensity);
  const burningRef = useRef(burning);
  const dropPulseRef = useRef(dropPulse);
  const ashRef = useRef(ashAmount);
  const dragSenseRef = useRef(dragSense);
  const cumulativeRef = useRef(cumulativeBurns);

  const uniformsRef = useRef({
    uTime: { value: 0 },
    uIntensity: { value: 0.18 },    // start with idle flame visible immediately
    uResolution: { value: new THREE.Vector2(1, 1) },
    uBurning: { value: 0 },
    uDropPulse: { value: 0 },
    uAshAmount: { value: 0 },
    uDragSense: { value: 0 },
    uCumulative: { value: 0 },
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use NON-transparent renderer with black clear color.
    // The fire shader writes its own background (mostly transparent black)
    // and we use NormalBlending so alpha composites correctly.
    const renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: false,          // performance: fullscreen shader doesn't need AA
      premultipliedAlpha: false,
    });
    renderer.setClearColor(0x000000, 1);
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
      transparent: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      uniformsRef.current.uResolution.value.set(w, h);
    };
    resize();
    window.addEventListener('resize', resize);

    const clock = new THREE.Clock();
    let frame = 0;

    const render = () => {
      const u = uniformsRef.current;
      u.uTime.value = clock.getElapsedTime();
      // Smooth interpolation for all uniforms
      u.uIntensity.value += (targetRef.current - u.uIntensity.value) * 0.06;
      u.uBurning.value += ((burningRef.current ? 1 : 0) - u.uBurning.value) * 0.08;
      u.uDropPulse.value += (dropPulseRef.current - u.uDropPulse.value) * 0.14;
      u.uAshAmount.value += (ashRef.current - u.uAshAmount.value) * 0.04;
      u.uDragSense.value += (dragSenseRef.current - u.uDragSense.value) * 0.10;
      u.uCumulative.value += (cumulativeRef.current - u.uCumulative.value) * 0.03;
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

  useEffect(() => { targetRef.current = intensity; }, [intensity]);
  useEffect(() => { burningRef.current = burning; }, [burning]);
  useEffect(() => { dropPulseRef.current = dropPulse; }, [dropPulse]);
  useEffect(() => { ashRef.current = ashAmount; }, [ashAmount]);
  useEffect(() => { dragSenseRef.current = dragSense; }, [dragSense]);
  useEffect(() => { cumulativeRef.current = cumulativeBurns; }, [cumulativeBurns]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 z-[1]" />;
}

export default memo(FlameCanvas);
