"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PanelCard } from "@/components/shared/PanelCard";
import { useVisualizerStore } from "@/store/visualizer-store";
import { Terminal } from "lucide-react";

const typeStyles = {
  log: "text-[#55EFC4]",
  warn: "text-[#FDCB6E]",
  error: "text-[#E17055]",
};

export function ConsolePanel() {
  const { steps, currentStepIndex } = useVisualizerStore();
  const currentStep = steps[currentStepIndex];
  const output = currentStep?.consoleOutput ?? [];

  return (
    <PanelCard
      title="Console"
      accentColor="#55EFC4"
      isEmpty={output.length === 0}
      emptyMessage="No output yet"
    >
      <div className="flex flex-col gap-1 font-mono">
        <AnimatePresence mode="popLayout">
          {output.map((entry, i) => (
            <motion.div
              key={`${entry.stepId}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex items-start gap-2.5 px-3 py-1.5 rounded text-sm ${typeStyles[entry.type]} hover:bg-[#1A1A26]`}
            >
              <Terminal className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-40" />
              <span>{entry.args.join(" ")}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </PanelCard>
  );
}
