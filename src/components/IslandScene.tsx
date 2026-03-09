"use client";

import { memo } from "react";
import InstancedVoxels from "./InstancedVoxels";
// import CategoryLabels from "./CategoryLabels";
import IslandBase from "./IslandBase";
import ErrorParticles from "./ErrorParticles";
import type { IslandLayout } from "@/lib/cloud-island";

interface IslandSceneProps {
  layout: IslandLayout;
  onCategoryClick?: (categoryId: string) => void;
}

export default memo(function IslandScene({
  layout,
  onCategoryClick,
}: IslandSceneProps) {
  return (
    <group>
      {/* Base platform */}
      <IslandBase radius={layout.radius} />

      {/* Voxel cloud mass */}
      <InstancedVoxels voxels={layout.voxels} onVoxelClick={onCategoryClick} />

      {/* Category labels disabled */}

      {/* Error particles on sectors with errors */}
      <ErrorParticles sectors={layout.sectors} />

      {/* Lighting */}
      <ambientLight intensity={0.4} color="#b8c0ff" />
      <directionalLight
        position={[15, 25, 10]}
        intensity={1.2}
        color="#fff5e6"
        castShadow={false}
      />
      <directionalLight
        position={[-10, 15, -8]}
        intensity={0.3}
        color="#a0b4ff"
      />
      <hemisphereLight
        args={["#6366f1", "#1a1a2e", 0.4]}
      />
    </group>
  );
});
