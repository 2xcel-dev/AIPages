"use client";

import {
  GlassTiles,
  type GlassTilesPalette,
} from "@/components/ui/glass-tiles";

const P: Record<string, GlassTilesPalette> = {
  // AIPages Official Cyber Yellow / Obsidian Brand Palette
  cyberYellow: { glow: "#FFD000", deep: "#F59E0B", ground: "#040507" },
  // Electric Cyan Agent Gateway Palette
  electricCyan: { glow: "#00F0FF", deep: "#0284C7", ground: "#040507" },
  // Verified Node Green Palette
  verifiedGreen: { glow: "#10B981", deep: "#047857", ground: "#040507" },
  // Default presets
  violet: { glow: "#c25cff", deep: "#3a1a8a", ground: "#07040e" },
  ice: { glow: "#7fd8ff", deep: "#12406b", ground: "#03070d" },
  ember: { glow: "#ff8a3d", deep: "#6b2410", ground: "#0c0503" },
};

export default function Demo({ variant = "cyberYellow" }: { variant?: string }) {
  return (
    <div className="h-screen w-full">
      <GlassTiles
        palette={P[variant] ?? P.cyberYellow}
        className="h-full min-h-full w-full"
      >
        <div className="pointer-events-none flex h-full flex-col items-start justify-end bg-[linear-gradient(to_top,rgb(0_0_0/0.7),transparent_50%)] p-6 sm:p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">
            AIPages · Autonomous Infrastructure
          </p>
          <h2 className="mt-2 max-w-[16ch] text-[clamp(2rem,5vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-white">
            The API Marketplace Built for AI Agents.
          </h2>
        </div>
      </GlassTiles>
    </div>
  );
}
