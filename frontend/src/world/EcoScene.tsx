/* ─── EcoScene — React Three Fiber immersive 3D ecosystem ──────────────── */
/* worldState = f(userMetrics) drives the entire visual experience.        */
/* Optimised to avoid WebGL context-loss on constrained GPUs.             */

import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, Float } from '@react-three/drei';
import * as THREE from 'three';
import type { WorldState } from '../api/types';

interface EcoSceneProps {
  worldState: WorldState;
  scrollProgress: number;
}

/* ─── WebGL context-loss recovery wrapper ──────────────────────────────── */
function ContextRecovery({ children }: { children: React.ReactNode }) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    const handleLost = (e: Event) => {
      e.preventDefault();
      console.warn('[EcoScene] WebGL context lost — will restore on recovery.');
    };

    const handleRestored = () => {
      console.info('[EcoScene] WebGL context restored.');
    };

    canvas.addEventListener('webglcontextlost', handleLost);
    canvas.addEventListener('webglcontextrestored', handleRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost);
      canvas.removeEventListener('webglcontextrestored', handleRestored);
    };
  }, [gl]);

  return <>{children}</>;
}

export default function EcoScene({ worldState, scrollProgress }: EcoSceneProps) {
  const [contextLost, setContextLost] = useState(false);

  return (
    <Canvas
      dpr={Math.min(window.devicePixelRatio, 1.5)}
      camera={{ position: [0, 5, 15], fov: 60 }}
      style={{ background: 'transparent' }}
      gl={{
        antialias: false,
        alpha: true,
        powerPreference: 'low-power',
        failIfMajorPerformanceCaveat: false,
      }}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          setContextLost(true);
        });
        canvas.addEventListener('webglcontextrestored', () => {
          setContextLost(false);
        });
      }}
    >
      <ContextRecovery>
        {!contextLost && (
          <SceneContent worldState={worldState} scrollProgress={scrollProgress} />
        )}
      </ContextRecovery>
    </Canvas>
  );
}

function SceneContent({ worldState, scrollProgress }: EcoSceneProps) {
  return (
    <>
      {/* Lighting — simplified, no castShadow to save GPU */}
      <ambientLight intensity={0.4 + worldState.light_warmth * 0.4} />
      <directionalLight
        position={[10, 15, 5]}
        intensity={0.6 + worldState.light_warmth * 0.4}
        color={new THREE.Color().setHSL(0.12, 0.7, 0.55 + worldState.light_warmth * 0.25)}
      />
      <hemisphereLight
        color={new THREE.Color().setHSL(0.35, 0.5, 0.6)}
        groundColor={new THREE.Color().setHSL(0.28, 0.4, 0.15)}
        intensity={0.4}
      />

      {/* Sky — core background with lighter turbidity */}
      <Sky
        distance={450000}
        sunPosition={[100, 25 + worldState.light_warmth * 25, -50]}
        inclination={0.5 + worldState.overall_score * 0.1}
        azimuth={0.25}
        turbidity={1.5 + worldState.haze_density * 4}
        rayleigh={0.8 + worldState.overall_score * 1.5}
      />

      {/* Stars — reduced count */}
      <Stars radius={80} depth={40} count={200} factor={3} saturation={0.4} fade speed={0.3} />

      {/* Fog — lighter, more visible scene */}
      <fog attach="fog"
        color={new THREE.Color().setHSL(0.32, 0.25, 0.12 + worldState.overall_score * 0.08)}
        near={15}
        far={50 + worldState.overall_score * 15}
      />

      {/* Ground */}
      <Ground worldState={worldState} />

      {/* Trees */}
      <Trees worldState={worldState} />

      {/* River */}
      <River worldState={worldState} />

      {/* Grove (streak trees) */}
      <Grove groveSize={worldState.grove_size} />

      {/* Fireflies — sprite-based, no point lights */}
      <Fireflies count={worldState.wildlife_count} />

      {/* Camera animation driven by scroll */}
      <CameraController scrollProgress={scrollProgress} />
    </>
  );
}

/* ─── Ground plane ─────────────────────────────────────────────────── */
function Ground({ worldState }: { worldState: WorldState }) {
  const groundColor = useMemo(() => {
    const hue = 0.28 + worldState.foliage_density * 0.07;
    const sat = 0.3 + worldState.foliage_density * 0.4;
    const light = 0.08 + worldState.foliage_density * 0.12;
    return new THREE.Color().setHSL(hue, sat, light);
  }, [worldState.foliage_density]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[100, 100, 16, 16]} />
      <meshStandardMaterial
        color={groundColor}
        roughness={0.85}
        metalness={0.0}
      />
    </mesh>
  );
}

/* ─── Tree instances — capped to 25 max ───────────────────────────── */
function Trees({ worldState }: { worldState: WorldState }) {
  const treeCount = Math.floor(8 + worldState.foliage_density * 17);
  const positions = useMemo(() => {
    const pos: [number, number, number][] = [];
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 8 + Math.random() * 18;
      pos.push([
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius - 5,
      ]);
    }
    return pos;
  }, [treeCount]);

  // Pre-compute canopy colors to avoid creating colors in render
  const canopyColors = useMemo(() =>
    positions.map((_, i) =>
      new THREE.Color().setHSL(
        0.28 + (i * 0.013) % 0.08,
        0.5 + worldState.foliage_density * 0.3,
        0.18 + worldState.foliage_density * 0.2
      )
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positions.length, worldState.foliage_density]
  );

  return (
    <>
      {positions.map((pos, i) => (
        <Float key={i} speed={0.4} rotationIntensity={0.05} floatIntensity={0.15}>
          <group position={pos}>
            {/* Trunk */}
            <mesh position={[0, 1.5, 0]}>
              <cylinderGeometry args={[0.1, 0.2, 3, 5]} />
              <meshStandardMaterial color="#5c3d2e" roughness={0.8} />
            </mesh>
            {/* Canopy */}
            <mesh position={[0, 3.5, 0]}>
              <coneGeometry args={[1.2 + worldState.foliage_density * 0.5, 2.5, 5]} />
              <meshStandardMaterial
                color={canopyColors[i]}
                roughness={0.7}
              />
            </mesh>
          </group>
        </Float>
      ))}
    </>
  );
}

/* ─── River ────────────────────────────────────────────────────────── */
function River({ worldState }: { worldState: WorldState }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const riverColor = useMemo(() => {
    const clarity = worldState.river_clarity;
    return new THREE.Color().setHSL(
      0.55 + clarity * 0.05,
      0.4 + clarity * 0.4,
      0.18 + clarity * 0.22
    );
  }, [worldState.river_clarity]);

  useFrame((state) => {
    if (meshRef.current) {
      const geo = meshRef.current.geometry;
      const posAttr = geo.getAttribute('position');
      const time = state.clock.elapsedTime;

      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const z = posAttr.getZ(i);
        posAttr.setY(i, Math.sin(x * 0.5 + time) * 0.1 + Math.cos(z * 0.3 + time * 0.7) * 0.05);
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 15]}>
      <planeGeometry args={[6, 40, 12, 12]} />
      <meshStandardMaterial
        color={riverColor}
        transparent
        opacity={0.6 + worldState.river_clarity * 0.3}
        roughness={0.2}
        metalness={0.3}
      />
    </mesh>
  );
}

/* ─── Streak Grove ─────────────────────────────────────────────────── */
function Grove({ groveSize }: { groveSize: number }) {
  const positions = useMemo(() => {
    const pos: [number, number, number][] = [];
    const capped = Math.min(groveSize, 20);
    for (let i = 0; i < capped; i++) {
      pos.push([
        -3 + (i % 5) * 1.2,
        0,
        20 + Math.floor(i / 5) * 1.5,
      ]);
    }
    return pos;
  }, [groveSize]);

  const groveColors = useMemo(() =>
    positions.map((_, i) =>
      new THREE.Color().setHSL(0.3, 0.7, 0.25 + i * 0.012)
    ),
    [positions.length] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <>
      {positions.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh position={[0, 0.75, 0]}>
            <cylinderGeometry args={[0.06, 0.1, 1.5, 4]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 1.8, 0]}>
            <sphereGeometry args={[0.5, 5, 5]} />
            <meshStandardMaterial color={groveColors[i]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ─── Fireflies — lightweight emissive spheres, no point lights ──── */
function Fireflies({ count }: { count: number }) {
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const capped = Math.min(count, 12);

  const positions = useMemo(() =>
    Array.from({ length: capped }, () => [
      (Math.random() - 0.5) * 25,
      1.5 + Math.random() * 4,
      (Math.random() - 0.5) * 25,
    ] as [number, number, number]),
    [capped]
  );

  useFrame((state) => {
    meshRefs.current.forEach((mesh, i) => {
      if (mesh) {
        const t = state.clock.elapsedTime + i * 1.5;
        mesh.position.y = positions[i][1] + Math.sin(t * 0.5) * 0.5;
        // Pulse the scale for a glow effect
        const pulse = 0.7 + Math.sin(t * 2) * 0.3;
        mesh.scale.setScalar(pulse);
      }
    });
  });

  return (
    <>
      {positions.map((pos, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshRefs.current[i] = el; }}
          position={pos}
        >
          <sphereGeometry args={[0.08, 4, 4]} />
          <meshBasicMaterial
            color="#fbbf24"
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </>
  );
}

/* ─── Camera controller ────────────────────────────────────────────── */
function CameraController({ scrollProgress }: { scrollProgress: number }) {
  useFrame((state) => {
    const p = Math.min(Math.max(scrollProgress, 0), 1);

    // Camera moves along a path as user scrolls
    const x = Math.sin(p * Math.PI * 0.3) * 3;
    const y = 8 - p * 4;
    const z = 20 - p * 25;

    state.camera.position.lerp(new THREE.Vector3(x, y, z), 0.05);
    state.camera.lookAt(0, 2 - p * 2, p * 10);
  });

  return null;
}
