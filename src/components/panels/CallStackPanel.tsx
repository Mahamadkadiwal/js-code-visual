"use client";

import { AnimatePresence } from "framer-motion";
import { PanelCard } from "@/components/shared/PanelCard";
import { AnimatedListItem } from "@/components/shared/AnimatedListItem";
import { stackItemVariants } from "@/styles/animations";
import { useVisualizerStore } from "@/store/visualizer-store";

export function CallStackPanel() {
  const { steps, currentStepIndex } = useVisualizerStore();
  const currentStep = steps[currentStepIndex];
  const callStack = currentStep?.callStack ?? [];
  const highlight = currentStep?.highlightedEntity;
  const isActive = highlight?.area === "callStack";

  return (
    <PanelCard
      title="Call Stack"
      accentColor="#6C5CE7"
      glowColor="rgba(108, 92, 231, 0.15)"
      isActive={isActive}
      isEmpty={callStack.length === 0}
      emptyMessage="Stack is empty"
    >
      <div className="flex flex-col-reverse gap-2">
        <AnimatePresence mode="popLayout">
          {callStack.map((frame, index) => {
            const isTop = index === callStack.length - 1;
            return (
              <AnimatedListItem
                key={frame.id}
                variants={stackItemVariants}
                layoutId={`stack-${frame.id}`}
                className={`rounded-lg border px-4 py-3 transition-colors ${
                  isTop
                    ? "border-[#6C5CE7]/50 bg-[#6C5CE7]/10"
                    : "border-[#2A2A3C] bg-[#1A1A26]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-mono font-semibold ${
                      isTop ? "text-[#6C5CE7]" : "text-[#8888A0]"
                    }`}
                  >
                    {frame.functionName}
                  </span>
                  {frame.line > 0 && (
                    <span className="text-xs text-[#555566]">
                      line {frame.line}
                    </span>
                  )}
                </div>
                {Object.keys(frame.variables).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(frame.variables).map(([name, val]) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-[#0A0A0F] border border-[#2A2A3C]"
                      >
                        <span className="text-[#74B9FF]">{name}</span>
                        <span className="text-[#555566]">=</span>
                        <span className="text-[#FDCB6E]">{val.display}</span>
                      </span>
                    ))}
                  </div>
                )}
              </AnimatedListItem>
            );
          })}
        </AnimatePresence>
      </div>
    </PanelCard>
  );
}
