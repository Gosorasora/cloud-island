"use client";

import { useState, useCallback, useEffect } from "react";
import { AWS_CATEGORIES } from "@/lib/aws-categories";
import type { IslandData } from "@/lib/cloud-island";

interface SimulatorPanelProps {
  onDataChange: (data: IslandData) => void;
}

interface SliderState {
  [categoryId: string]: number;
}

const MAX_CALLS = 20000;
const MAX_ERROR_RATE = 20;

function buildIslandData(sliders: SliderState, errorRate: number): IslandData {
  const categories = AWS_CATEGORIES.map((cat) => {
    const apiCallCount = sliders[cat.id] ?? 0;
    const errorCount = Math.round(apiCallCount * (errorRate / 100));
    return {
      categoryId: cat.id,
      apiCallCount,
      errorCount,
      resourceCount: Math.round(apiCallCount / 200) + 1,
      topServices: cat.services.slice(0, 3).map((svc, i) => ({
        service: svc,
        count: Math.round(apiCallCount * (i === 0 ? 0.5 : i === 1 ? 0.3 : 0.2)),
      })),
      principals: [
        { principal: "simulator-user", count: Math.round(apiCallCount * 0.7) },
        { principal: "simulator-role", count: Math.round(apiCallCount * 0.3) },
      ],
    };
  });

  const totalApiCalls = categories.reduce((s, c) => s + c.apiCallCount, 0);
  const totalErrors = categories.reduce((s, c) => s + c.errorCount, 0);

  return {
    accountId: "simulator",
    dateRange: { start: "2026-01-01", end: "2026-03-01" },
    totalApiCalls,
    totalErrors,
    categories,
  };
}

export default function SimulatorPanel({ onDataChange }: SimulatorPanelProps) {
  const [sliders, setSliders] = useState<SliderState>(() => {
    const init: SliderState = {};
    for (const cat of AWS_CATEGORIES) {
      init[cat.id] = 3000;
    }
    return init;
  });
  const [errorRate, setErrorRate] = useState(2);

  const handleSliderChange = useCallback((categoryId: string, value: number) => {
    setSliders((prev) => ({ ...prev, [categoryId]: value }));
  }, []);

  // Emit data on every change
  useEffect(() => {
    onDataChange(buildIslandData(sliders, errorRate));
  }, [sliders, errorRate, onDataChange]);

  return (
    <div className="flex w-80 flex-col gap-3 rounded-xl border border-white/10 bg-[#12121a]/90 p-4 backdrop-blur-md">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-white/50">
        Simulator
      </h3>

      {AWS_CATEGORIES.map((cat) => (
        <div key={cat.id} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            <span className="text-xs text-white/60">{cat.label}</span>
            <span className="ml-auto font-mono text-[10px] text-white/30">
              {(sliders[cat.id] ?? 0).toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={MAX_CALLS}
            step={100}
            value={sliders[cat.id] ?? 0}
            onChange={(e) => handleSliderChange(cat.id, Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-indigo-500"
          />
        </div>
      ))}

      <div className="mt-2 border-t border-white/5 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-400/60">Error Rate</span>
          <span className="ml-auto font-mono text-[10px] text-white/30">
            {errorRate}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={MAX_ERROR_RATE}
          step={0.5}
          value={errorRate}
          onChange={(e) => setErrorRate(Number(e.target.value))}
          className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-red-500"
        />
      </div>
    </div>
  );
}
