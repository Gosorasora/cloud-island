"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { IslandData } from "@/lib/cloud-island";
import { getCategoryById } from "@/lib/aws-categories";

interface IslandDetailPanelProps {
  islandLabel: string;
  islandData: IslandData;
  onClose: () => void;
  actionSlot?: ReactNode;
}

export default function IslandDetailPanel({
  islandLabel,
  islandData,
  onClose,
  actionSlot,
}: IslandDetailPanelProps) {
  const categories = [...islandData.categories]
    .filter((category) => category.apiCallCount > 0)
    .sort((left, right) => right.apiCallCount - left.apiCallCount);

  const errorRate =
    islandData.totalApiCalls > 0
      ? ((islandData.totalErrors / islandData.totalApiCalls) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="absolute right-4 top-20 z-40 max-h-[calc(100vh-6.5rem)] w-[26rem] overflow-hidden rounded-2xl border border-white/10 bg-[#12121a]/95 text-white shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/35">
            Selected Planet
          </div>
          <h2 className="mt-1 text-xl font-semibold text-indigo-300">
            {islandLabel}
          </h2>
          <div className="mt-2 font-mono text-[11px] text-white/40">
            Account {islandData.accountId}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
        >
          <X size={18} className="text-white/55" />
        </button>
      </div>

      <div className="max-h-[calc(100vh-13rem)] overflow-y-auto px-5 pb-5 pt-4">
        {actionSlot && <div className="mb-4">{actionSlot}</div>}

        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-lg font-semibold">
              {islandData.totalApiCalls.toLocaleString()}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/45">
              API Calls
            </div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-lg font-semibold text-rose-300">
              {islandData.totalErrors.toLocaleString()}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/45">
              Errors
            </div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-lg font-semibold text-emerald-300">{errorRate}%</div>
            <div className="text-[10px] uppercase tracking-wider text-white/45">
              Error Rate
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2 text-[11px] text-white/45">
          {new Date(islandData.dateRange.start).toLocaleString()} to{" "}
          {new Date(islandData.dateRange.end).toLocaleString()}
        </div>

        <div className="space-y-2 pr-1">
          {categories.map((category) => {
            const categoryMeta = getCategoryById(category.categoryId);
            if (!categoryMeta) return null;

            const activityRatio =
              islandData.totalApiCalls > 0
                ? (category.apiCallCount / islandData.totalApiCalls) * 100
                : 0;

            return (
              <div
                key={category.categoryId}
                className="rounded-xl border border-white/6 bg-white/[0.03] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: categoryMeta.color }}
                    />
                    <div className="text-sm font-medium">{categoryMeta.label}</div>
                  </div>
                  <div className="text-[11px] text-white/45">
                    {category.apiCallCount.toLocaleString()} calls
                  </div>
                </div>

                <div className="mb-2 h-1.5 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${activityRatio}%`,
                      backgroundColor: categoryMeta.color,
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] text-white/50">
                  <div>Resources {category.resourceCount.toLocaleString()}</div>
                  <div>Errors {category.errorCount.toLocaleString()}</div>
                  <div>
                    Top {category.topServices[0]?.service.replace(".amazonaws.com", "") ?? "-"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
