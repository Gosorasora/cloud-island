/**
 * Island layout algorithm — generates 3D voxel positions for the cloud island.
 *
 * The island is a circular shape divided into 7 wedge-shaped sectors (one per
 * AWS category). Each sector's radius and thickness scales with activity volume.
 * Perlin-like noise softens the edges for an organic cloud boundary.
 */

import type { IslandData, IslandLayout, CloudVoxel, SectorInfo } from "./cloud-island";
import { AWS_CATEGORIES } from "./aws-categories";

// ─── Constants ─────────────────────────────────────────────────

const BASE_RADIUS = 5;
const MAX_EXTENSION = 10;
const MIN_LAYERS = 2;
const MAX_EXTRA_LAYERS = 6;
const VOXEL_SIZE = 1.1; // world units per voxel
const SECTOR_COUNT = 7;
const SECTOR_ANGLE = (2 * Math.PI) / SECTOR_COUNT;
const NOISE_SCALE = 0.3; // amplitude of edge noise

// ─── Simple hash-based noise (no dependency needed) ────────────

function hash2d(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

function smoothNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  // Smoothstep
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);

  const n00 = hash2d(ix, iz);
  const n10 = hash2d(ix + 1, iz);
  const n01 = hash2d(ix, iz + 1);
  const n11 = hash2d(ix + 1, iz + 1);

  const nx0 = n00 + sx * (n10 - n00);
  const nx1 = n01 + sx * (n11 - n01);
  return nx0 + sz * (nx1 - nx0);
}

// ─── Layout Generator ──────────────────────────────────────────

export function generateIslandLayout(data: IslandData): IslandLayout {
  const voxels: CloudVoxel[] = [];
  const sectors: SectorInfo[] = [];

  // Compute max activity for normalization
  const maxCalls = Math.max(1, ...data.categories.map((c) => c.apiCallCount));

  // Build category map for quick lookup
  const activityMap = new Map(data.categories.map((c) => [c.categoryId, c]));

  // Generate voxels for each sector
  for (let sIdx = 0; sIdx < SECTOR_COUNT; sIdx++) {
    const cat = AWS_CATEGORIES[sIdx];
    const activity = activityMap.get(cat.id);
    const apiCalls = activity?.apiCallCount ?? 0;
    const errors = activity?.errorCount ?? 0;
    const normalizedActivity = apiCalls / maxCalls;

    const sectorRadius = BASE_RADIUS + normalizedActivity * MAX_EXTENSION;
    const layerCount =
      MIN_LAYERS + Math.floor(normalizedActivity * MAX_EXTRA_LAYERS);
    const healthyRatio = apiCalls > 0 ? 1 - errors / apiCalls : 1;

    const angleStart = sIdx * SECTOR_ANGLE;
    const angleEnd = (sIdx + 1) * SECTOR_ANGLE;
    const angleMid = (angleStart + angleEnd) / 2;

    // Label position: center of sector at mid-radius, above top layer
    const labelR = sectorRadius * 0.6;
    const labelX = Math.cos(angleMid) * labelR;
    const labelZ = Math.sin(angleMid) * labelR;
    const labelY = (layerCount + 1) * VOXEL_SIZE;

    sectors.push({
      categoryId: cat.id,
      label: cat.label,
      color: cat.color,
      labelPosition: [labelX, labelY, labelZ],
      normalizedActivity,
      apiCallCount: apiCalls,
      errorCount: errors,
    });

    // Fill sector with voxels using polar scanning
    const gridExtent = Math.ceil(sectorRadius / VOXEL_SIZE) + 1;

    for (let gx = -gridExtent; gx <= gridExtent; gx++) {
      for (let gz = -gridExtent; gz <= gridExtent; gz++) {
        const wx = gx * VOXEL_SIZE;
        const wz = gz * VOXEL_SIZE;
        const dist = Math.sqrt(wx * wx + wz * wz);

        if (dist < 1) continue; // skip center hole

        // Check if this point is within the sector angle
        let angle = Math.atan2(wz, wx);
        if (angle < 0) angle += 2 * Math.PI;

        // Normalize angles for comparison (handle wraparound)
        const aStart = ((angleStart % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const aEnd = ((angleEnd % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

        let inSector: boolean;
        if (aStart < aEnd) {
          inSector = angle >= aStart && angle < aEnd;
        } else {
          inSector = angle >= aStart || angle < aEnd;
        }

        if (!inSector) continue;

        // Apply noise to edge
        const noise = smoothNoise(gx * 0.4, gz * 0.4) * NOISE_SCALE;
        const effectiveRadius = sectorRadius * (1 + noise);

        if (dist > effectiveRadius) continue;

        // Taper layers toward edge
        const edgeFactor = 1 - dist / effectiveRadius;
        const localLayers = Math.max(
          1,
          Math.round(layerCount * edgeFactor)
        );

        for (let ly = 0; ly < localLayers; ly++) {
          const wy = ly * VOXEL_SIZE;

          voxels.push({
            position: [wx, wy, wz],
            categoryId: cat.id,
            color: cat.color,
            healthyRatio,
          });
        }
      }
    }
  }

  // Compute overall radius
  const maxR = sectors.reduce(
    (r, s) => Math.max(r, BASE_RADIUS + s.normalizedActivity * MAX_EXTENSION),
    0
  );

  return { voxels, sectors, radius: maxR };
}
