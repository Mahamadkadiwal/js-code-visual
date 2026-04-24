"use client";

import { AnimatePresence } from "framer-motion";
import { PanelCard } from "@/components/shared/PanelCard";
import { AnimatedListItem } from "@/components/shared/AnimatedListItem";
import { queueItemVariants } from "@/styles/animations";
import { useVisualizerStore } from "@/store/visualizer-store";

export function MicrotaskQueuePanel() {
  const { steps, currentStepIndex } = useVisualizerStore();
  const currentStep = steps[currentStepIndex];
  const microtaskQueue = currentStep?.microtaskQueue ?? [];
  const highlight = currentStep?.highlightedEntity;
  const isActive = highlight?.area === "microtaskQueue";

  return (
    <PanelCard
      title="Microtask Queue"
      accentColor="#E17055"
      glowColor="rgba(225, 112, 85, 0.12)"
      isActive={isActive}
      isEmpty={microtaskQueue.length === 0}
      emptyMessage="Queue is empty"
    >
      <div className="flex flex-col gap-1.5">
        <AnimatePresence mode="popLayout">
          {microtaskQueue.map((entry) => (
            <AnimatedListItem
              key={entry.id}
              variants={queueItemVariants}
              layoutId={`microtask-${entry.id}`}
              className="flex items-center gap-2.5 rounded-lg border border-[#E17055]/20 bg-[#E17055]/5 px-4 py-2.5"
            >
              <div className="w-2 h-2 rounded-full bg-[#E17055] flex-shrink-0" />
              <span className="text-sm font-mono text-[#E17055]">
                {entry.callbackName}
              </span>
              <span className="text-xs text-[#555566] ml-auto">
                {entry.sourceType}
              </span>
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    </PanelCard>
  );
}
