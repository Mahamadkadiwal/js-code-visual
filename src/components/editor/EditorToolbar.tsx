"use client";

import { useCallback } from "react";
import { Play, Loader2 } from "lucide-react";
import { useVisualizerStore } from "@/store/visualizer-store";
import { generateTrace } from "@/engine";
import { CODE_EXAMPLES } from "@/lib/constants";

export function EditorToolbar() {
  const {
    sourceCode,
    setSourceCode,
    setSteps,
    setError,
    isGenerating,
    setIsGenerating,
    playbackState,
    reset,
  } = useVisualizerStore();

  const handleRun = useCallback(() => {
    if (!sourceCode.trim()) return;

    setIsGenerating(true);
    setError(null);

    setTimeout(() => {
      try {
        const steps = generateTrace(sourceCode);
        setSteps(steps);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to parse code"
        );
        setSteps([]);
      } finally {
        setIsGenerating(false);
      }
    }, 50);
  }, [sourceCode, setSteps, setError, setIsGenerating]);

  const handleReset = useCallback(() => {
    reset();
    setSteps([]);
    setError(null);
  }, [reset, setSteps, setError]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2A2A3C] bg-[#12121A]">
      <select
        className="bg-[#1A1A26] border border-[#2A2A3C] rounded-lg px-3 py-2 text-sm text-[#E8E8ED] outline-none focus:border-[#6C5CE7] transition-colors cursor-pointer"
        onChange={(e) => {
          const example = CODE_EXAMPLES[parseInt(e.target.value)];
          if (example) {
            setSourceCode(example.code);
            handleReset();
          }
        }}
        defaultValue=""
      >
        <option value="" disabled>
          Examples...
        </option>
        {CODE_EXAMPLES.map((ex, i) => (
          <option key={i} value={i}>
            {ex.name}
          </option>
        ))}
      </select>

      <div className="flex-1" />

      {playbackState !== "idle" && (
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm rounded-lg bg-[#1A1A26] border border-[#2A2A3C] text-[#8888A0] hover:text-[#E8E8ED] hover:border-[#555566] transition-colors"
        >
          Edit Code
        </button>
      )}

      <button
        onClick={handleRun}
        disabled={isGenerating || !sourceCode.trim()}
        className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-[#6C5CE7] text-white hover:bg-[#5A4BD1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4 fill-current" />
        )}
        {isGenerating ? "Analyzing..." : "Run"}
      </button>
    </div>
  );
}
