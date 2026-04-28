"use client";

import { X } from "lucide-react";
import type { CategoryActivity } from "@/lib/cloud-island";
import { getCategoryById } from "@/lib/aws-categories";

interface CategoryDetailPanelProps {
  activity: CategoryActivity;
  onClose: () => void;
}

export default function CategoryDetailPanel({
  activity,
  onClose,
}: CategoryDetailPanelProps) {
  const category = getCategoryById(activity.categoryId);
  if (!category) return null;

  const errorRate =
    activity.apiCallCount > 0
      ? ((activity.errorCount / activity.apiCallCount) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="absolute right-4 top-[34rem] z-50 w-80 rounded-xl border border-white/10 bg-[#12121a]/95 p-5 text-white shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <h3 className="text-lg font-semibold" style={{ color: category.color }}>
            {category.label}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 transition-colors hover:bg-white/10"
        >
          <X size={18} className="text-white/60" />
        </button>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white/5 p-2 text-center">
          <div className="text-lg font-bold">
            {activity.apiCallCount.toLocaleString()}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-white/50">
            API Calls
          </div>
        </div>
        <div className="rounded-lg bg-white/5 p-2 text-center">
          <div
            className="text-lg font-bold"
            style={{
              color:
                activity.errorCount > 0 ? "#ff4757" : "inherit",
            }}
          >
            {activity.errorCount.toLocaleString()}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-white/50">
            Errors
          </div>
        </div>
        <div className="rounded-lg bg-white/5 p-2 text-center">
          <div
            className="text-lg font-bold"
            style={{
              color:
                parseFloat(errorRate) > 5 ? "#ff4757" : "#4ecdc4",
            }}
          >
            {errorRate}%
          </div>
          <div className="text-[10px] uppercase tracking-wider text-white/50">
            Error Rate
          </div>
        </div>
      </div>

      {/* Top Services */}
      <div className="mb-4">
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">
          Top Services
        </h4>
        <div className="space-y-1.5">
          {activity.topServices.slice(0, 5).map((svc) => {
            const pct =
              activity.apiCallCount > 0
                ? (svc.count / activity.apiCallCount) * 100
                : 0;
            return (
              <div key={svc.service} className="flex items-center gap-2">
                <div className="flex-1 text-xs text-white/70">
                  {svc.service.replace(".amazonaws.com", "")}
                </div>
                <div className="w-20">
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                </div>
                <div className="w-12 text-right text-[10px] text-white/50">
                  {svc.count.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Principals */}
      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">
          IAM Principals
        </h4>
        <div className="space-y-1.5">
          {activity.principals.slice(0, 4).map((p) => {
            const pct =
              activity.apiCallCount > 0
                ? (p.count / activity.apiCallCount) * 100
                : 0;
            return (
              <div key={p.principal} className="flex items-center gap-2">
                <div className="flex-1 truncate text-xs text-white/70">
                  {p.principal}
                </div>
                <div className="text-[10px] text-white/40">
                  {pct.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
