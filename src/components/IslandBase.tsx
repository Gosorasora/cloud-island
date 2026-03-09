"use client";

import { useMemo, memo } from "react";
import * as THREE from "three";

interface IslandBaseProps {
  radius: number;
}

export default memo(function IslandBase({ radius }: IslandBaseProps) {
  const topR = radius * 1.15;
  const depth = radius * 0.8;

  // Seeded random for hanging rocks
  const hangingRocks = useMemo(() => {
    const rocks: { pos: [number, number, number]; rot: [number, number, number]; scale: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + 0.3;
      const r = radius * (0.4 + (i % 3) * 0.15);
      const yOff = -(1.5 + depth * 0.2 + i * depth * 0.12);
      rocks.push({
        pos: [Math.cos(angle) * r, yOff, Math.sin(angle) * r],
        rot: [0.2 + i * 0.15, i * 0.7, 0.1 + i * 0.2],
        scale: 0.3 + (i % 3) * 0.2,
      });
    }
    return rocks;
  }, [radius, depth]);

  // Y positions (top surface at y≈0)
  const topY = -0.75;
  const cliff1H = depth * 0.3;
  const cliff2H = depth * 0.3;
  const cliff3H = depth * 0.25;
  const coneH = depth * 0.15;

  const cliff1Y = topY - 1.5 / 2 - cliff1H / 2;
  const cliff2Y = cliff1Y - cliff1H / 2 - cliff2H / 2;
  const cliff3Y = cliff2Y - cliff2H / 2 - cliff3H / 2;
  const coneY = cliff3Y - cliff3H / 2 - coneH / 2;

  // Geometries
  const topGeo = useMemo(
    () => new THREE.CylinderGeometry(topR, topR, 1.5, 48),
    [topR]
  );
  const ringGeo = useMemo(
    () => new THREE.TorusGeometry(topR, 0.3, 12, 64),
    [topR]
  );
  const cliff1Geo = useMemo(
    () => new THREE.CylinderGeometry(radius * 0.95, radius * 0.7, cliff1H, 32),
    [radius, cliff1H]
  );
  const cliff2Geo = useMemo(
    () => new THREE.CylinderGeometry(radius * 0.7, radius * 0.45, cliff2H, 24),
    [radius, cliff2H]
  );
  const cliff3Geo = useMemo(
    () => new THREE.CylinderGeometry(radius * 0.45, radius * 0.15, cliff3H, 16),
    [radius, cliff3H]
  );
  const coneGeo = useMemo(
    () => new THREE.ConeGeometry(radius * 0.15, coneH, 12),
    [radius, coneH]
  );

  return (
    <group>
      {/* Top plateau — flat earth surface */}
      <mesh geometry={topGeo} position={[0, topY, 0]}>
        <meshStandardMaterial color="#4a7c59" roughness={0.9} metalness={0.0} />
      </mesh>

      {/* Mossy rim ring */}
      <mesh geometry={ringGeo} position={[0, topY + 0.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#5a8a5a" roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Cliff layer 1 — dark brown */}
      <mesh geometry={cliff1Geo} position={[0, cliff1Y, 0]}>
        <meshStandardMaterial color="#6b5b4a" roughness={0.95} metalness={0.0} />
      </mesh>

      {/* Cliff layer 2 — grey-brown */}
      <mesh geometry={cliff2Geo} position={[0, cliff2Y, 0]}>
        <meshStandardMaterial color="#7a6b5a" roughness={0.95} metalness={0.0} />
      </mesh>

      {/* Cliff layer 3 — light grey */}
      <mesh geometry={cliff3Geo} position={[0, cliff3Y, 0]}>
        <meshStandardMaterial color="#8a7d6e" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Bottom spike — inverted cone */}
      <mesh geometry={coneGeo} position={[0, coneY, 0]} rotation={[Math.PI, 0, 0]}>
        <meshStandardMaterial color="#5a5048" roughness={0.95} metalness={0.0} />
      </mesh>

      {/* Hanging rock fragments */}
      {hangingRocks.map((rock, i) => (
        <mesh
          key={i}
          position={rock.pos}
          rotation={rock.rot}
          scale={rock.scale}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#6b5b4a" : "#7a6b5a"}
            roughness={0.95}
            metalness={0.0}
          />
        </mesh>
      ))}
    </group>
  );
});
