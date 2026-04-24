"use client";

import { cn } from "@/lib/utils";

interface PanelCardProps {
  title: string;
  accentColor: string;
  glowColor?: string;
  isActive?: boolean;
  children: React.ReactNode;
  className?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function PanelCard({
  title,
  accentColor,
  glowColor,
  isActive,
  children,
  className,
  emptyMessage = "Empty",
  isEmpty,
}: PanelCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-xl border border-[#2A2A3C] bg-[#12121A] overflow-hidden transition-shadow duration-300",
        isActive && glowColor && `shadow-[0_0_20px_${glowColor}]`,
        className
      )}
      style={
        isActive && glowColor
          ? { boxShadow: `0 0 20px ${glowColor}` }
          : undefined
      }
    >
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-b border-[#2A2A3C]"
        style={{ borderTopColor: accentColor, borderTopWidth: 2 }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8888A0]">
          {title}
        </h3>
      </div>
      <div className="flex-1 overflow-auto p-3 min-h-0">
        {isEmpty ? (
          <div className="flex items-center justify-center h-full text-[#555566] text-sm italic">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
