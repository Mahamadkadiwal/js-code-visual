"use client";

import { AnimatePresence } from "framer-motion";
import { PanelCard } from "@/components/shared/PanelCard";
import { AnimatedListItem } from "@/components/shared/AnimatedListItem";
import { fadeInVariants } from "@/styles/animations";
import { useVisualizerStore } from "@/store/visualizer-store";

export function ExecutionContextPanel() {
  const { steps, currentStepIndex } = useVisualizerStore();
  const currentStep = steps[currentStepIndex];
  const contexts = currentStep?.executionContexts ?? [];

  return (
    <PanelCard
      title="Execution Context"
      accentColor="#74B9FF"
      isEmpty={contexts.length === 0}
      emptyMessage="No contexts"
    >
      <div className="flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {contexts.map((ctx) => (
            <AnimatedListItem
              key={ctx.id}
              variants={fadeInVariants}
              className="rounded-lg border border-[#2A2A3C] bg-[#1A1A26] px-4 py-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono font-semibold text-[#E8E8ED]">
                  {ctx.functionName}
                </span>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    ctx.phase === "creation"
                      ? "bg-[#74B9FF]/15 text-[#74B9FF]"
                      : "bg-[#55EFC4]/15 text-[#55EFC4]"
                  }`}
                >
                  {ctx.phase}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-[#0A0A0F] border border-[#2A2A3C]">
                  <span className="text-[#E17055]">this</span>
                  <span className="text-[#555566]">=</span>
                  <span className="text-[#FDCB6E]">
                    {ctx.thisBinding.display}
                  </span>
                </span>
                {Object.entries(ctx.variableEnvironment).map(
                  ([name, val]) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-[#0A0A0F] border border-[#2A2A3C]"
                    >
                      <span className="text-[#74B9FF]">{name}</span>
                      <span className="text-[#555566]">=</span>
                      <span className="text-[#FDCB6E]">{val.display}</span>
                    </span>
                  )
                )}
              </div>
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    </PanelCard>
  );
}
