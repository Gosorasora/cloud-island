"use client";

import { AWS_CATEGORIES } from "@/lib/aws-categories";
import type { SectorInfo } from "@/lib/cloud-island";

interface CategoryLegendProps {
  sectors: SectorInfo[];
  onCategoryClick?: (categoryId: string) => void;
  activeCategoryId?: string | null;
}

export default function CategoryLegend({
  sectors,
  onCategoryClick,
  activeCategoryId,
}: CategoryLegendProps) {
  const sectorMap = new Map(sectors.map((s) => [s.categoryId, s]));

  return (
    <div className="absolute bottom-4 left-4 z-40 rounded-xl border border-white/10 bg-[#12121a]/90 p-3 backdrop-blur-md">
      <h4 className="mb-2 text-[10px] font-medium uppercase tracking-widest text-white/40">
        Categories
      </h4>
      <div className="space-y-1">
        {AWS_CATEGORIES.map((cat) => {
          const sector = sectorMap.get(cat.id);
          const calls = sector?.apiCallCount ?? 0;
          const isActive = activeCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onCategoryClick?.(cat.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors ${
                isActive
                  ? "bg-white/10"
                  : "hover:bg-white/5"
              }`}
            >
              <div
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: cat.color }}
              />
              <span className="flex-1 text-xs text-white/70">{cat.label}</span>
              <span className="text-[10px] tabular-nums text-white/30">
                {calls >= 1000
                  ? `${(calls / 1000).toFixed(1)}k`
                  : calls}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
