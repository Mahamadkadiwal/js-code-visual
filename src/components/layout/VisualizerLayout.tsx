"use client";

import { CodeEditor } from "@/components/editor/CodeEditor";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { CallStackPanel } from "@/components/panels/CallStackPanel";
import { ExecutionContextPanel } from "@/components/panels/ExecutionContextPanel";
import { WebAPIsPanel } from "@/components/panels/WebAPIsPanel";
import { TaskQueuePanel } from "@/components/panels/TaskQueuePanel";
import { MicrotaskQueuePanel } from "@/components/panels/MicrotaskQueuePanel";
import { EventLoopPanel } from "@/components/panels/EventLoopPanel";
import { ConsolePanel } from "@/components/panels/ConsolePanel";
import { useVisualizerStore } from "@/store/visualizer-store";
import { Code2 } from "lucide-react";

export function VisualizerLayout() {
  const { steps, error } = useVisualizerStore();
  const hasSteps = steps.length > 0;

  return (
    <div className="flex-1 min-h-0 flex">
      {/* Left column: Code Editor + Console */}
      <div className="flex flex-col w-[35%] min-w-[300px] border-r border-[#2A2A3C]">
        <EditorToolbar />
        <div className="flex-1 min-h-0 relative">
          <CodeEditor />
          {error && (
            <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-[#E17055]/10 border-t border-[#E17055]/30 text-[#E17055] text-sm font-mono">
              {error}
            </div>
          )}
        </div>
        {hasSteps && (
          <div className="h-[25%] min-h-[120px] border-t border-[#2A2A3C]">
            <ConsolePanel />
          </div>
        )}
      </div>

      {/* Right area: Visualization panels */}
      {hasSteps ? (
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex flex-1 min-h-0">
            {/* Call Stack + Execution Context */}
            <div className="w-[40%] flex flex-col border-r border-[#2A2A3C]">
              <div className="flex-1 min-h-0 p-3">
                <CallStackPanel />
              </div>
              <div className="h-[40%] min-h-[100px] p-3 pt-0">
                <ExecutionContextPanel />
              </div>
            </div>

            {/* Web APIs + Queues + Event Loop */}
            <div className="flex-1 flex flex-col">
              <div className="h-[35%] min-h-[100px] p-3">
                <WebAPIsPanel />
              </div>
              <div className="flex-1 min-h-0 flex">
                <div className="w-[45%] p-3 pt-0">
                  <EventLoopPanel />
                </div>
                <div className="flex-1 flex flex-col p-3 pt-0 gap-3">
                  <div className="flex-1 min-h-0">
                    <MicrotaskQueuePanel />
                  </div>
                  <div className="flex-1 min-h-0">
                    <TaskQueuePanel />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6C5CE7]/20 to-[#00CEC9]/20 border border-[#2A2A3C] flex items-center justify-center mx-auto mb-5">
              <Code2 className="w-8 h-8 text-[#6C5CE7]" />
            </div>
            <h2 className="text-xl font-semibold text-[#E8E8ED] mb-3">
              Visualize JavaScript Execution
            </h2>
            <p className="text-sm text-[#8888A0] mb-5 leading-relaxed">
              Write or paste JavaScript code in the editor, then click{" "}
              <span className="text-[#6C5CE7] font-medium">Run</span> to see
              how the call stack, event loop, and task queues work step by step.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              {[
                "Call Stack",
                "Execution Context",
                "Web APIs",
                "Microtask Queue",
                "Task Queue",
                "Event Loop",
              ].map((label) => (
                <span
                  key={label}
                  className="px-3 py-1.5 rounded-full border border-[#2A2A3C] text-[#555566]"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
