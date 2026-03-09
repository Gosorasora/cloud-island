"use client";

import { PRESET_DATA, type PresetInfo } from "@/lib/mock-data";
import type { IslandData } from "@/lib/cloud-island";

interface PresetSelectorProps {
  onSelect: (data: IslandData, presetLabel: string) => void;
  activePresetId?: string | null;
}

export default function PresetSelector({ onSelect, activePresetId }: PresetSelectorProps) {
  return (
    <div className="flex w-80 flex-col gap-3 rounded-xl border border-white/10 bg-[#12121a]/90 p-4 backdrop-blur-md">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-white/50">
        Presets
      </h3>
      <div className="flex flex-col gap-2">
        {PRESET_DATA.map((preset: PresetInfo) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.data, preset.label)}
            className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-all ${
              activePresetId === preset.id
                ? "border-indigo-500/50 bg-indigo-500/10"
                : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]"
            }`}
          >
            <span className="text-sm font-medium text-white/80">{preset.label}</span>
            <span className="mt-0.5 text-[11px] text-white/30">{preset.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
