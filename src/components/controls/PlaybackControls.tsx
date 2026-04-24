"use client";

import {
  SkipBack,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import { useVisualizerStore } from "@/store/visualizer-store";
import { SPEED_OPTIONS } from "@/lib/constants";

export function PlaybackControls() {
  const {
    steps,
    currentStepIndex,
    playbackState,
    speed,
    nextStep,
    prevStep,
    play,
    pause,
    reset,
    goToStep,
    setSpeed,
  } = useVisualizerStore();

  const currentStep = steps[currentStepIndex];
  const canPrev = currentStepIndex > 0;
  const canNext = currentStepIndex < steps.length - 1;
  const hasSteps = steps.length > 0;
  const progress = hasSteps
    ? ((currentStepIndex + 1) / steps.length) * 100
    : 0;

  if (!hasSteps) return null;

  return (
    <div className="border-t border-[#2A2A3C] bg-[#12121A]">
      {/* Progress bar */}
      <div
        className="h-1.5 bg-[#1A1A26] cursor-pointer group relative"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const pct = x / rect.width;
          goToStep(Math.round(pct * (steps.length - 1)));
        }}
      >
        <div
          className="h-full bg-gradient-to-r from-[#6C5CE7] to-[#00CEC9] transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
        <div className="absolute inset-0 h-3 -top-1 group-hover:bg-white/5" />
      </div>

      <div className="flex items-center gap-2 px-5 py-3">
        {/* Transport controls */}
        <div className="flex items-center gap-1">
          <ControlButton
            onClick={() => goToStep(0)}
            disabled={!canPrev}
            title="First step"
          >
            <SkipBack className="w-4 h-4" />
          </ControlButton>

          <ControlButton
            onClick={prevStep}
            disabled={!canPrev}
            title="Previous step (←)"
          >
            <ChevronLeft className="w-5 h-5" />
          </ControlButton>

          <button
            onClick={() =>
              playbackState === "playing" ? pause() : play()
            }
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#6C5CE7] text-white hover:bg-[#5A4BD1] transition-colors mx-1"
            title={
              playbackState === "playing"
                ? "Pause (Space)"
                : "Play (Space)"
            }
          >
            {playbackState === "playing" ? (
              <Pause className="w-4.5 h-4.5 fill-current" />
            ) : (
              <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
            )}
          </button>

          <ControlButton
            onClick={nextStep}
            disabled={!canNext}
            title="Next step (→)"
          >
            <ChevronRight className="w-5 h-5" />
          </ControlButton>

          <ControlButton
            onClick={() => goToStep(steps.length - 1)}
            disabled={!canNext}
            title="Last step"
          >
            <SkipForward className="w-4 h-4" />
          </ControlButton>

          <ControlButton onClick={reset} title="Reset (R)">
            <RotateCcw className="w-4 h-4" />
          </ControlButton>
        </div>

        {/* Step counter */}
        <div className="flex items-center gap-2 ml-4 text-sm text-[#8888A0]">
          <span className="font-mono">
            Step{" "}
            <span className="text-[#E8E8ED] font-semibold">
              {currentStepIndex + 1}
            </span>{" "}
            / {steps.length}
          </span>
        </div>

        {/* Description */}
        <div className="flex-1 mx-4 text-md text-[#8888A0] truncate text-center">
          {currentStep?.description}
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#555566] uppercase tracking-wider">
            Speed
          </span>
          <div className="flex items-center gap-0.5 bg-[#1A1A26] rounded-lg p-1">
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  speed === s
                    ? "bg-[#6C5CE7] text-white"
                    : "text-[#8888A0] hover:text-[#E8E8ED]"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex items-center justify-center w-9 h-9 rounded-lg text-[#8888A0] hover:text-[#E8E8ED] hover:bg-[#1A1A26] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
