import { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';
import flameVert from '../shaders/flame.vert?raw';
import flameFrag from '../shaders/flame.frag?raw';

interface FlameCanvasProps {
  intensity: number;
  burning: boolean;
}

function FlameCanvas({ intensity, burning }: FlameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(0);
  const uniformsRef = useRef({
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uResolution: { value: new THREE.Vector2() },
    uBurning: { value: 0 },
  });

  useEffect(() => {
    const container = containerRef.current!;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    });
    scene.add(new THREE.Mesh(geometry, material));
    uniformsRef.current.uResolution.value.set(w, h);

    let animId: number;
    const clock = new THREE.Clock();
    function animate() {
      uniformsRef.current.uTime.value = clock.getElapsedTime();
      const cur = uniformsRef.current.uIntensity.value;
      uniformsRef.current.uIntensity.value += (targetRef.current - cur) * 0.08;
      uniformsRef.current.uBurning.value = burning ? 1.0 : 0.0;
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    }
    animate();

    const onResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      renderer.setSize(nw, nh);
      uniformsRef.current.uResolution.value.set(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => { targetRef.current = intensity; }, [intensity]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-0 left-0 right-0 pointer-events-none"
      style={{ height: '100%', zIndex: 0 }}
    />
  );
}

export default memo(FlameCanvas);
