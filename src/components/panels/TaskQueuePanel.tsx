"use client";

import { AnimatePresence } from "framer-motion";
import { PanelCard } from "@/components/shared/PanelCard";
import { AnimatedListItem } from "@/components/shared/AnimatedListItem";
import { queueItemVariants } from "@/styles/animations";
import { useVisualizerStore } from "@/store/visualizer-store";

export function TaskQueuePanel() {
  const { steps, currentStepIndex } = useVisualizerStore();
  const currentStep = steps[currentStepIndex];
  const taskQueue = currentStep?.taskQueue ?? [];
  const highlight = currentStep?.highlightedEntity;
  const isActive = highlight?.area === "taskQueue";

  return (
    <PanelCard
      title="Task Queue"
      accentColor="#FDCB6E"
      glowColor="rgba(253, 203, 110, 0.12)"
      isActive={isActive}
      isEmpty={taskQueue.length === 0}
      emptyMessage="Queue is empty"
    >
      <div className="flex flex-col gap-1.5">
        <AnimatePresence mode="popLayout">
          {taskQueue.map((entry) => (
            <AnimatedListItem
              key={entry.id}
              variants={queueItemVariants}
              layoutId={`task-${entry.id}`}
              className="flex items-center gap-2.5 rounded-lg border border-[#FDCB6E]/20 bg-[#FDCB6E]/5 px-4 py-2.5"
            >
              <div className="w-2 h-2 rounded-full bg-[#FDCB6E] flex-shrink-0" />
              <span className="text-sm font-mono text-[#FDCB6E]">
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
