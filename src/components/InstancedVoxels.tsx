"use client";

import { useRef, useMemo, useEffect, useCallback, memo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { CloudVoxel } from "@/lib/cloud-island";

// ─── Shader Code ───────────────────────────────────────────────

const vertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aGlow;
  attribute float aRise;

  varying vec3 vColor;
  varying float vGlow;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vFogDepth;

  void main() {
    vColor = aColor;
    vGlow = aGlow;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;
    float rise = clamp(aRise, 0.0, 1.0);
    float easedRise = 1.0 - pow(1.0 - rise, 3.0);
    pos.y *= easedRise;

    vec4 instancePos = instanceMatrix * vec4(pos, 1.0);
    instancePos.y += (easedRise - 1.0) * 1.5;

    vec4 mvPos = modelViewMatrix * instancePos;
    vWorldPos = instancePos.xyz;
    vFogDepth = -mvPos.z;

    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  varying vec3 vColor;
  varying float vGlow;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vFogDepth;

  void main() {
    float diffuse = max(dot(vNormal, uSunDir), 0.0);
    float ambient = 0.35;
    float light = ambient + diffuse * 0.65;

    vec3 color = vColor * light;

    float emissive = vGlow * 0.3;
    color += vColor * emissive;

    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
    color = mix(color, uFogColor, fogFactor);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─── Pre-allocated temps (module-level) ────────────────────────

const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _tmpColor = new THREE.Color();

let hasPlayedRiseGlobal = false;

// ─── Component ─────────────────────────────────────────────────

interface InstancedVoxelsProps {
  voxels: CloudVoxel[];
  onVoxelClick?: (categoryId: string) => void;
}

export default memo(function InstancedVoxels({
  voxels,
  onVoxelClick,
}: InstancedVoxelsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const { camera, gl, scene } = useThree();
  const count = voxels.length;

  const riseStartTime = useRef(-1);
  const riseComplete = useRef(hasPlayedRiseGlobal);

  const geo = useMemo(() => new THREE.BoxGeometry(1.0, 1.0, 1.0), []);

  // Create material once, but re-apply whenever mesh is recreated (count change)
  useEffect(() => {
    if (!materialRef.current) {
      materialRef.current = new THREE.ShaderMaterial({
        uniforms: {
          uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
          uFogColor: { value: new THREE.Color("#1a1a2e") },
          uFogNear: { value: 40 },
          uFogFar: { value: 120 },
        },
        vertexShader,
        fragmentShader,
        side: THREE.FrontSide,
      });
    }
    const mesh = meshRef.current;
    if (mesh) mesh.material = materialRef.current;
  }, [count]);

  // Compute per-instance data
  const { colorData, glowData, riseData } = useMemo(() => {
    const colors = new Float32Array(count * 3);
    const glows = new Float32Array(count);
    const rises = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const v = voxels[i];
      _tmpColor.set(v.color);
      colors[i * 3] = _tmpColor.r;
      colors[i * 3 + 1] = _tmpColor.g;
      colors[i * 3 + 2] = _tmpColor.b;
      glows[i] = v.healthyRatio;
      rises[i] = hasPlayedRiseGlobal ? 1 : 0;
    }

    return { colorData: colors, glowData: glows, riseData: rises };
  }, [voxels, count]);

  // Set up instance matrices and attributes
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < count; i++) {
      const v = voxels[i];
      _pos.set(v.position[0], v.position[1], v.position[2]);
      _mat4.compose(_pos, _quat, _scale);
      mesh.setMatrixAt(i, _mat4);
    }
    mesh.instanceMatrix.needsUpdate = true;

    const colorAttr = new THREE.InstancedBufferAttribute(colorData, 3);
    const glowAttr = new THREE.InstancedBufferAttribute(glowData, 1);
    const riseAttr = new THREE.InstancedBufferAttribute(riseData, 1);
    riseAttr.setUsage(THREE.DynamicDrawUsage);

    mesh.geometry.setAttribute("aColor", colorAttr);
    mesh.geometry.setAttribute("aGlow", glowAttr);
    mesh.geometry.setAttribute("aRise", riseAttr);

    mesh.count = count;

    if (!hasPlayedRiseGlobal) {
      riseStartTime.current = -1;
      riseComplete.current = false;
    }
  }, [voxels, count, colorData, glowData, riseData]);

  // Rise animation
  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh || riseComplete.current) return;

    const riseAttr = mesh.geometry.getAttribute("aRise") as THREE.InstancedBufferAttribute;
    if (!riseAttr) return;

    const now = clock.elapsedTime;
    if (riseStartTime.current < 0) riseStartTime.current = now;

    const elapsed = now - riseStartTime.current;
    const arr = riseAttr.array as Float32Array;
    const DURATION = 0.85;
    const MAX_STAGGER = 3.0;
    const staggerStep = count > 1 ? Math.min(MAX_STAGGER / count, 0.01) : 0;

    let allDone = true;
    for (let i = 0; i < count; i++) {
      const delay = i * staggerStep;
      const t = Math.min(1, Math.max(0, (elapsed - delay) / DURATION));
      arr[i] = t;
      if (t < 1) allDone = false;
    }

    riseAttr.needsUpdate = true;

    if (allDone) {
      riseComplete.current = true;
      hasPlayedRiseGlobal = true;
    }
  });

  // Sync fog uniforms
  useFrame(() => {
    const mat = materialRef.current;
    if (!mat) return;
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      (mat.uniforms.uFogColor.value as THREE.Color).copy(fog.color);
      mat.uniforms.uFogNear.value = fog.near;
      mat.uniforms.uFogFar.value = fog.far;
    }
  });

  // ─── Raycasting ──────────────────────────────────────────────

  const pointerDown = useRef<{ x: number; y: number; time: number } | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());

  const handlePointerDown = useCallback((e: PointerEvent) => {
    pointerDown.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  }, []);

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      const down = pointerDown.current;
      if (!down) return;
      pointerDown.current = null;

      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      const dt = Date.now() - down.time;
      if (dt > 400 || dx * dx + dy * dy > 625) return;

      const mesh = meshRef.current;
      if (!mesh || !onVoxelClick) return;

      const rect = gl.domElement.getBoundingClientRect();
      pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(pointer.current, camera);
      const hits = raycaster.current.intersectObject(mesh, false);
      if (hits.length > 0 && hits[0].instanceId !== undefined) {
        const voxel = voxels[hits[0].instanceId];
        if (voxel) onVoxelClick(voxel.categoryId);
      }
    },
    [camera, gl, onVoxelClick, voxels]
  );

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl, handlePointerDown, handlePointerUp]);

  // Cleanup
  useEffect(() => {
    return () => {
      geo.dispose();
      materialRef.current?.dispose();
    };
  }, [geo]);

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, undefined, count]}
      frustumCulled={false}
    />
  );
});
