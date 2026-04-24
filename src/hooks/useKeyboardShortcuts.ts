"use client";

import { useEffect } from "react";
import { useVisualizerStore } from "@/store/visualizer-store";

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.getAttribute("role") === "textbox" ||
        target.closest(".monaco-editor")
      ) {
        return;
      }

      const state = useVisualizerStore.getState();

      switch (e.key) {
        case "ArrowRight":
        case "n":
          e.preventDefault();
          state.nextStep();
          break;
        case "ArrowLeft":
        case "p":
          e.preventDefault();
          state.prevStep();
          break;
        case " ":
          e.preventDefault();
          if (state.playbackState === "playing") {
            state.pause();
          } else if (state.steps.length > 0) {
            state.play();
          }
          break;
        case "r":
          e.preventDefault();
          state.reset();
          break;
        case "Escape":
          e.preventDefault();
          state.pause();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
