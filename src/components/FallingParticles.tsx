"use client";

import { useRef, useMemo, useEffect, memo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Simple seeded PRNG (deterministic) */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface ParticleSource {
  /** Center position [x, y, z] */
  center: [number, number, number];
  /** Particle color [r, g, b] in 0–1 range */
  color: [number, number, number];
  /** Spread radius around center */
  spread: number;
  /** How far particles travel before respawning */
  travelDistance: number;
}

export interface FallingParticlesProps {
  sources: ParticleSource[];
  /** Particles per source (default: 20) */
  particlesPerSource?: number;
  /** Particle size (default: 0.4) */
  size?: number;
  /** Opacity (default: 0.7) */
  opacity?: number;
  /** Direction: 1 = rising, -1 = falling (default: 1) */
  direction?: 1 | -1;
  /** Base speed (default: 0.01) */
  speed?: number;
  /** Speed variation (default: 0.03) */
  speedVariation?: number;
  /** Lateral drift speed (default: 0.02) */
  drift?: number;
  /** Blending mode (default: AdditiveBlending) */
  blending?: THREE.Blending;
  /** Random seed (default: 42) */
  seed?: number;
}

export default memo(function FallingParticles({
  sources,
  particlesPerSource = 20,
  size = 0.4,
  opacity = 0.7,
  direction = 1,
  speed = 0.01,
  speedVariation = 0.03,
  drift = 0.02,
  blending = THREE.AdditiveBlending,
  seed = 42,
}: FallingParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);
  const centersRef = useRef<[number, number, number][]>([]);

  const totalParticles = sources.length * particlesPerSource;

  const { positions, velocities, colors } = useMemo(() => {
    const pos = new Float32Array(totalParticles * 3);
    const vel = new Float32Array(totalParticles * 3);
    const col = new Float32Array(totalParticles * 3);
    const rand = seededRandom(seed);

    let idx = 0;
    for (const source of sources) {
      const [cx, cy, cz] = source.center;

      for (let p = 0; p < particlesPerSource; p++) {
        const i = idx * 3;
        pos[i] = cx + (rand() - 0.5) * source.spread;
        pos[i + 1] = cy - 2 + rand() * 4;
        pos[i + 2] = cz + (rand() - 0.5) * source.spread;

        vel[i] = (rand() - 0.5) * drift;
        vel[i + 1] = (speed + rand() * speedVariation) * direction;
        vel[i + 2] = (rand() - 0.5) * drift;

        col[i] = source.color[0];
        col[i + 1] = source.color[1];
        col[i + 2] = source.color[2];

        idx++;
      }
    }

    return { positions: pos, velocities: vel, colors: col };
  }, [sources, totalParticles, particlesPerSource, speed, speedVariation, drift, direction, seed]);

  useEffect(() => {
    velocitiesRef.current = velocities;
    centersRef.current = sources.map((s) => s.center);
  }, [velocities, sources]);

  useFrame(() => {
    const points = pointsRef.current;
    const vel = velocitiesRef.current;
    const centers = centersRef.current;
    if (!points || !vel || centers.length === 0) return;

    const posAttr = points.geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < totalParticles; i++) {
      const idx = i * 3;
      arr[idx] += vel[idx];
      arr[idx + 1] += vel[idx + 1];
      arr[idx + 2] += vel[idx + 2];

      const sourceIdx = Math.floor(i / particlesPerSource);
      const center = centers[sourceIdx];
      const src = sources[sourceIdx];
      const dist = Math.abs(arr[idx + 1] - center[1]);

      if (dist > (src?.travelDistance ?? 6)) {
        const h = ((i * 374761393) >>> 0) / 4294967296;
        const spread = src?.spread ?? 8;
        arr[idx] = center[0] + (h - 0.5) * spread;
        arr[idx + 1] = center[1] - 2 * direction;
        arr[idx + 2] =
          center[2] +
          (((i * 668265263) >>> 0) / 4294967296 - 0.5) * spread;
      }
    }

    posAttr.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  if (totalParticles === 0) return null;

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={size}
        vertexColors
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={blending}
        sizeAttenuation
      />
    </points>
  );
});
