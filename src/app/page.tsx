"use client";

import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { VisualizerLayout } from "@/components/layout/VisualizerLayout";
import { PlaybackControls } from "@/components/controls/PlaybackControls";
import { usePlayback } from "@/hooks/usePlayback";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useVisualizerStore } from "@/store/visualizer-store";
import { DEFAULT_CODE } from "@/lib/constants";

function VisualizerApp() {
  const { setSourceCode } = useVisualizerStore();

  // Initialize with default code
  useEffect(() => {
    setSourceCode(DEFAULT_CODE);
  }, [setSourceCode]);

  // Set up playback timer and keyboard shortcuts
  usePlayback();
  useKeyboardShortcuts();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0A0A0F]">
      <Header />
      <VisualizerLayout />
      <PlaybackControls />
    </div>
  );
}

export default function Page() {
  return <VisualizerApp />;
}
