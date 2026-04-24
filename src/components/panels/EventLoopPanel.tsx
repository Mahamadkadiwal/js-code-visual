"use client";

import { motion } from "framer-motion";
import { PanelCard } from "@/components/shared/PanelCard";
import { useVisualizerStore } from "@/store/visualizer-store";
import type { EventLoopPhase } from "@/engine";

const PHASES: { key: EventLoopPhase[]; label: string; angle: number }[] = [
  { key: ["executingCallStack"], label: "Call Stack", angle: -90 },
  {
    key: ["checkingMicrotasks", "processingMicrotask"],
    label: "Microtasks",
    angle: 0,
  },
  { key: ["rendering"], label: "Render", angle: 90 },
  {
    key: ["checkingTaskQueue", "processingTask"],
    label: "Task Queue",
    angle: 180,
  },
];

function getPhaseAngle(phase: EventLoopPhase): number {
  for (const p of PHASES) {
    if (p.key.includes(phase)) return p.angle;
  }
  return -90;
}

function getPhaseLabel(phase: EventLoopPhase): string {
  switch (phase) {
    case "executingCallStack":
      return "Executing call stack";
    case "checkingMicrotasks":
      return "Checking microtasks";
    case "processingMicrotask":
      return "Processing microtask";
    case "checkingTaskQueue":
      return "Checking task queue";
    case "processingTask":
      return "Processing task";
    case "rendering":
      return "Render opportunity";
    case "idle":
    default:
      return "Idle";
  }
}

export function EventLoopPanel() {
  const { steps, currentStepIndex } = useVisualizerStore();
  const currentStep = steps[currentStepIndex];
  const phase = currentStep?.eventLoopPhase ?? "idle";
  const highlight = currentStep?.highlightedEntity;
  const isActive = highlight?.area === "eventLoop" || phase !== "idle";

  const cx = 70;
  const cy = 70;
  const r = 50;
  const dotAngle = getPhaseAngle(phase);
  const dotRad = (dotAngle * Math.PI) / 180;
  const dotX = cx + r * Math.cos(dotRad);
  const dotY = cy + r * Math.sin(dotRad);

  return (
    <PanelCard
      title="Event Loop"
      accentColor="#00CEC9"
      glowColor="rgba(0, 206, 201, 0.12)"
      isActive={isActive}
    >
      <div className="flex flex-col items-center gap-2 py-1">
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          className="flex-shrink-0"
        >
          {/* Background ring */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#2A2A3C"
            strokeWidth="3"
          />

          {/* Active ring glow */}
          {phase !== "idle" && (
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#00CEC9"
              strokeWidth="2"
              opacity="0.3"
            />
          )}

          {/* Phase labels around the ring */}
          {PHASES.map((p) => {
            const labelRad = (p.angle * Math.PI) / 180;
            const labelR = r + 18;
            const lx = cx + labelR * Math.cos(labelRad);
            const ly = cy + labelR * Math.sin(labelRad);
            const isPhaseActive = p.key.includes(phase);

            return (
              <text
                key={p.label}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`text-[8px] font-medium transition-colors ${
                  isPhaseActive ? "fill-[#00CEC9]" : "fill-[#555566]"
                }`}
              >
                {p.label}
              </text>
            );
          })}

          {/* Phase station dots */}
          {PHASES.map((p) => {
            const stationRad = (p.angle * Math.PI) / 180;
            const sx = cx + r * Math.cos(stationRad);
            const sy = cy + r * Math.sin(stationRad);
            const isPhaseActive = p.key.includes(phase);

            return (
              <circle
                key={p.label + "-dot"}
                cx={sx}
                cy={sy}
                r={isPhaseActive ? 4 : 3}
                fill={isPhaseActive ? "#00CEC9" : "#2A2A3C"}
                className="transition-all duration-300"
              />
            );
          })}

          {/* Orbiting indicator dot */}
          {phase !== "idle" && (
            <motion.circle
              cx={dotX}
              cy={dotY}
              r={6}
              fill="#00CEC9"
              animate={{
                cx: dotX,
                cy: dotY,
                filter: [
                  "drop-shadow(0 0 4px #00CEC9)",
                  "drop-shadow(0 0 10px #00CEC9)",
                  "drop-shadow(0 0 4px #00CEC9)",
                ],
              }}
              transition={{
                cx: { type: "spring", stiffness: 200, damping: 20 },
                cy: { type: "spring", stiffness: 200, damping: 20 },
                filter: { duration: 1.5, repeat: Infinity },
              }}
            />
          )}

          {/* Center label */}
          <text
            x={cx}
            y={cx}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[#555566] text-[7px]"
          >
            Event Loop
          </text>
        </svg>

        {/* Phase description */}
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] text-center px-2"
          style={{ color: phase !== "idle" ? "#00CEC9" : "#555566" }}
        >
          {getPhaseLabel(phase)}
        </motion.div>
      </div>
    </PanelCard>
  );
}
