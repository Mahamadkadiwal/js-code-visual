"use client";

import { Code2 } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center gap-3 px-5 py-3 border-b border-[#2A2A3C] bg-[#0A0A0F]">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6C5CE7] to-[#00CEC9] flex items-center justify-center">
          <Code2 className="w-4.5 h-4.5 text-white" />
        </div>
        <h1 className="text-base font-bold text-[#E8E8ED] tracking-tight">
          JS Code Visualizer
        </h1>
      </div>
      <span className="text-xs text-[#555566] border border-[#2A2A3C] rounded px-2 py-0.5">
        v1.0
      </span>
      <div className="flex-1" />
      <span className="text-xs text-[#555566] hidden sm:block">
        Arrow keys to step &middot; Space to play/pause
      </span>
    </header>
  );
}
