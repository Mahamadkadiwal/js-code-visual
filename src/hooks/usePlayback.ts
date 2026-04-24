"use client";

import { useEffect, useRef } from "react";
import { useVisualizerStore } from "@/store/visualizer-store";
import { BASE_STEP_DELAY } from "@/lib/constants";

export function usePlayback() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { playbackState, speed, nextStep, steps, currentStepIndex, pause } =
    useVisualizerStore();

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (playbackState === "playing") {
      const delay = BASE_STEP_DELAY / speed;
      intervalRef.current = setInterval(() => {
        const state = useVisualizerStore.getState();
        if (state.currentStepIndex >= state.steps.length - 1) {
          state.pause();
          return;
        }
        state.nextStep();
      }, delay);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [playbackState, speed, nextStep, steps.length, currentStepIndex, pause]);
}
