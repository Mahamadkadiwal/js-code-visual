"use client";

import { AnimatePresence } from "framer-motion";
import { PanelCard } from "@/components/shared/PanelCard";
import { AnimatedListItem } from "@/components/shared/AnimatedListItem";
import { webApiItemVariants } from "@/styles/animations";
import { useVisualizerStore } from "@/store/visualizer-store";
import { Timer, Globe, Zap } from "lucide-react";

const typeIcons: Record<string, typeof Timer> = {
  setTimeout: Timer,
  setInterval: Timer,
  fetch: Globe,
  promise: Zap,
};

const typeColors: Record<string, string> = {
  setTimeout: "#00B894",
  setInterval: "#00B894",
  fetch: "#74B9FF",
  promise: "#E17055",
};

export function WebAPIsPanel() {
  const { steps, currentStepIndex } = useVisualizerStore();
  const currentStep = steps[currentStepIndex];
  const webAPIs = currentStep?.webAPIs ?? [];
  const highlight = currentStep?.highlightedEntity;
  const isActive = highlight?.area === "webAPIs";

  return (
    <PanelCard
      title="Web APIs"
      accentColor="#00B894"
      glowColor="rgba(0, 184, 148, 0.15)"
      isActive={isActive}
      isEmpty={webAPIs.length === 0}
      emptyMessage="No active Web APIs"
    >
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {webAPIs.map((api) => {
            const Icon = typeIcons[api.type] || Timer;
            const color = typeColors[api.type] || "#00B894";

            return (
              <AnimatedListItem
                key={api.id}
                variants={webApiItemVariants}
                layoutId={`webapi-${api.id}`}
                className="flex-1 min-w-[160px] rounded-lg border border-[#2A2A3C] bg-[#1A1A26] p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono text-[#E8E8ED] truncate">
                      {api.label}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          api.status === "running" ? "animate-pulse" : ""
                        }`}
                        style={{
                          backgroundColor:
                            api.status === "running" ? color : "#555566",
                        }}
                      />
                      <span className="text-xs text-[#555566]">
                        {api.status}
                      </span>
                      {api.delay !== undefined && (
                        <span className="text-xs text-[#555566]">
                          {api.delay}ms
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </AnimatedListItem>
            );
          })}
        </AnimatePresence>
      </div>
    </PanelCard>
  );
}
