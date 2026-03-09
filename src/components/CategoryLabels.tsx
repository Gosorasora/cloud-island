"use client";

import { useRef, useMemo, useEffect, memo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SectorInfo } from "@/lib/cloud-island";

// ─── Atlas Config ──────────────────────────────────────────────

const ATLAS_SIZE = 1024;
const CELL_W = 256;
const CELL_H = 48;
const ATLAS_COLS = ATLAS_SIZE / CELL_W; // 4
const MAX_LABELS = 7;

// ─── Text Atlas Builder ────────────────────────────────────────

function createLabelAtlas(sectors: SectorInfo[]): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const count = Math.min(sectors.length, MAX_LABELS);

  for (let i = 0; i < count; i++) {
    const s = sectors[i];
    const col = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    const cx = col * CELL_W + CELL_W / 2;
    const cy = row * CELL_H + CELL_H / 2;

    const callsStr =
      s.apiCallCount >= 1000
        ? `${(s.apiCallCount / 1000).toFixed(1)}k`
        : String(s.apiCallCount);
    const text = `${s.label} (${callsStr})`;

    // Background pill
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const padX = 14;
    const padY = 6;
    const bgW = textWidth + padX * 2;
    const bgH = 28 + padY * 2;
    const bgX = cx - bgW / 2;
    const bgY = cy - bgH / 2;
    ctx.fillStyle = "rgba(10, 10, 20, 0.7)";
    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgW, bgH, 6);
    ctx.fill();

    // Border
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgW, bgH, 6);
    ctx.stroke();

    // Text
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 8;
    ctx.fillText(text, cx, cy);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Billboard Shader ──────────────────────────────────────────

const billboardVertex = /* glsl */ `
  attribute vec4 aLabelUv;
  attribute float aAlpha;
  attribute vec3 aLabelPos;

  varying vec2 vUv;
  varying float vAlpha;

  void main() {
    vUv = vec2(
      aLabelUv.x + uv.x * aLabelUv.z,
      aLabelUv.y + (1.0 - uv.y) * aLabelUv.w
    );
    vAlpha = aAlpha;

    vec3 worldPos = aLabelPos;

    // Cylindrical billboard
    vec3 toCamera = cameraPosition - worldPos;
    toCamera.y = 0.0;
    float len = length(toCamera);
    toCamera = len > 0.001 ? toCamera / len : vec3(0.0, 0.0, 1.0);

    vec3 right = vec3(toCamera.z, 0.0, -toCamera.x);
    vec3 up = vec3(0.0, 1.0, 0.0);

    float labelW = 18.0;
    float labelH = 3.5;
    vec3 vertexPos = worldPos
      + right * position.x * labelW
      + up * position.y * labelH;

    vec4 mvPos = viewMatrix * vec4(vertexPos, 1.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const billboardFragment = /* glsl */ `
  uniform sampler2D uAtlas;

  varying vec2 vUv;
  varying float vAlpha;

  void main() {
    vec4 texColor = texture2D(uAtlas, vUv);
    if (texColor.a < 0.01) discard;
    gl_FragColor = vec4(texColor.rgb, texColor.a * vAlpha);
  }
`;

// ─── Component ─────────────────────────────────────────────────

interface CategoryLabelsProps {
  sectors: SectorInfo[];
}

const _labelMatrix = new THREE.Matrix4();
const _labelQuat = new THREE.Quaternion();
const _labelScale = new THREE.Vector3(1, 1, 1);
const _labelPos = new THREE.Vector3();

export default memo(function CategoryLabels({ sectors }: CategoryLabelsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = Math.min(sectors.length, MAX_LABELS);

  const atlas = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createLabelAtlas(sectors);
  }, [sectors]);

  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const material = useMemo(() => {
    if (!atlas) return null;
    return new THREE.ShaderMaterial({
      uniforms: { uAtlas: { value: atlas } },
      vertexShader: billboardVertex,
      fragmentShader: billboardFragment,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [atlas]);

  const { uvData, alphaData, posData } = useMemo(() => {
    const uv = new Float32Array(count * 4);
    const alpha = new Float32Array(count);
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const s = sectors[i];
      const col = i % ATLAS_COLS;
      const row = Math.floor(i / ATLAS_COLS);

      uv[i * 4 + 0] = (col * CELL_W) / ATLAS_SIZE;
      uv[i * 4 + 1] = (row * CELL_H) / ATLAS_SIZE;
      uv[i * 4 + 2] = CELL_W / ATLAS_SIZE;
      uv[i * 4 + 3] = CELL_H / ATLAS_SIZE;

      alpha[i] = 1;

      pos[i * 3 + 0] = s.labelPosition[0];
      pos[i * 3 + 1] = s.labelPosition[1];
      pos[i * 3 + 2] = s.labelPosition[2];
    }

    return { uvData: uv, alphaData: alpha, posData: pos };
  }, [sectors, count]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !material) return;

    for (let i = 0; i < count; i++) {
      _labelPos.set(0, 0, 0);
      _labelMatrix.compose(_labelPos, _labelQuat, _labelScale);
      mesh.setMatrixAt(i, _labelMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    mesh.geometry.setAttribute(
      "aLabelUv",
      new THREE.InstancedBufferAttribute(uvData, 4)
    );
    const alphaAttr = new THREE.InstancedBufferAttribute(alphaData, 1);
    alphaAttr.setUsage(THREE.DynamicDrawUsage);
    mesh.geometry.setAttribute("aAlpha", alphaAttr);
    mesh.geometry.setAttribute(
      "aLabelPos",
      new THREE.InstancedBufferAttribute(posData, 3)
    );

    mesh.count = count;
  }, [sectors, count, material, uvData, alphaData, posData]);

  // Fade in after rise animation
  const fadeStart = useRef(-1);
  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const alphaAttr = mesh.geometry.getAttribute("aAlpha") as THREE.InstancedBufferAttribute;
    if (!alphaAttr) return;

    const now = clock.elapsedTime;
    if (fadeStart.current < 0) fadeStart.current = now + 2; // delay after rise

    const arr = alphaAttr.array as Float32Array;
    const elapsed = now - fadeStart.current;
    if (elapsed < 0) return;

    let changed = false;
    for (let i = 0; i < count; i++) {
      const target = 1;
      const t = Math.min(1, elapsed / 0.8);
      if (arr[i] !== target) {
        arr[i] = t;
        changed = true;
      }
    }
    if (changed) alphaAttr.needsUpdate = true;
  });

  useEffect(() => {
    return () => {
      geo.dispose();
      material?.dispose();
      atlas?.dispose();
    };
  }, [geo, material, atlas]);

  if (!material || count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, material, count]}
      frustumCulled={false}
      renderOrder={10}
    />
  );
});
