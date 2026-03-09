"use client";

import { useMemo, memo } from "react";
import FallingParticles, { type ParticleSource } from "./FallingParticles";
import type { SectorInfo } from "@/lib/cloud-island";

const PARTICLES_PER_SECTOR = 20;
const ERROR_THRESHOLD = 0.02; // show particles if error rate > 2%

interface ErrorParticlesProps {
  sectors: SectorInfo[];
}

export default memo(function ErrorParticles({ sectors }: ErrorParticlesProps) {
  const sources: ParticleSource[] = useMemo(
    () =>
      sectors
        .filter(
          (s) =>
            s.apiCallCount > 0 &&
            s.errorCount / s.apiCallCount > ERROR_THRESHOLD
        )
        .map((sector) => {
          const errorIntensity = Math.min(
            1,
            sector.errorCount / sector.apiCallCount / 0.15
          );
          return {
            center: sector.labelPosition,
            color: [
              0.9 + 0.1 * errorIntensity,
              0.1 * (1 - errorIntensity),
              0.05,
            ] as [number, number, number],
            spread: 8,
            travelDistance: 6,
          };
        }),
    [sectors]
  );

  if (sources.length === 0) return null;

  return (
    <FallingParticles
      sources={sources}
      particlesPerSource={PARTICLES_PER_SECTOR}
      direction={1}
      speed={0.01}
      speedVariation={0.03}
      drift={0.02}
      size={0.4}
      opacity={0.7}
    />
  );
});
