import { create } from "zustand";
import type { ExecutionStep } from "@/engine";

interface VisualizerState {
  sourceCode: string;
  steps: ExecutionStep[];
  currentStepIndex: number;
  playbackState: "idle" | "playing" | "paused" | "finished";
  speed: number;
  error: string | null;
  isGenerating: boolean;

  setSourceCode: (code: string) => void;
  setSteps: (steps: ExecutionStep[]) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  setError: (error: string | null) => void;
  setIsGenerating: (generating: boolean) => void;
}

export const useVisualizerStore = create<VisualizerState>((set, get) => ({
  sourceCode: "",
  steps: [],
  currentStepIndex: 0,
  playbackState: "idle",
  speed: 1,
  error: null,
  isGenerating: false,

  setSourceCode: (code) => set({ sourceCode: code }),

  setSteps: (steps) =>
    set({
      steps,
      currentStepIndex: 0,
      playbackState: steps.length > 0 ? "paused" : "idle",
      error: null,
    }),

  nextStep: () => {
    const { currentStepIndex, steps } = get();
    if (currentStepIndex < steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    } else {
      set({ playbackState: "finished" });
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  goToStep: (index) => {
    const { steps } = get();
    const clamped = Math.max(0, Math.min(index, steps.length - 1));
    set({ currentStepIndex: clamped });
  },

  play: () => set({ playbackState: "playing" }),
  pause: () => set({ playbackState: "paused" }),

  reset: () =>
    set({
      currentStepIndex: 0,
      playbackState: "paused",
    }),

  setSpeed: (speed) => set({ speed }),
  setError: (error) => set({ error }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
}));
