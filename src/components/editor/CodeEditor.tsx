"use client";

import { useRef, useEffect, useCallback } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type * as monacoEditor from "monaco-editor";
import { useVisualizerStore } from "@/store/visualizer-store";
import { MONACO_DARK_THEME, MONACO_OPTIONS } from "@/lib/monaco-config";

export function CodeEditor() {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(
    null
  );
  const decorationsRef = useRef<monacoEditor.editor.IEditorDecorationsCollection | null>(null);
  const { sourceCode, setSourceCode, steps, currentStepIndex, playbackState } =
    useVisualizerStore();

  const currentStep = steps[currentStepIndex];
  const isRunning = playbackState !== "idle";

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    monaco.editor.defineTheme("visualizer-dark", MONACO_DARK_THEME);
    monaco.editor.setTheme("visualizer-dark");

    decorationsRef.current = editor.createDecorationsCollection([]);
  }, []);

  // Update line highlighting
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !decorationsRef.current) return;

    if (currentStep?.currentLine && currentStep.currentLine > 0) {
      decorationsRef.current.set([
        {
          range: {
            startLineNumber: currentStep.currentLine,
            startColumn: 1,
            endLineNumber: currentStep.currentLine,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            className: "line-highlight",
            glyphMarginClassName: "line-highlight-glyph",
          },
        },
      ]);

      editor.revealLineInCenterIfOutsideViewport(currentStep.currentLine);
    } else {
      decorationsRef.current.set([]);
    }
  }, [currentStep?.currentLine, currentStep]);

  // Toggle readonly based on running state
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly: isRunning });
    }
  }, [isRunning]);

  return (
    <div className="h-full w-full overflow-hidden rounded-lg">
      <Editor
        height="100%"
        defaultLanguage="javascript"
        value={sourceCode}
        onChange={(val) => setSourceCode(val ?? "")}
        onMount={handleMount}
        options={MONACO_OPTIONS}
        theme="vs-dark"
        loading={
          <div className="flex items-center justify-center h-full bg-[#0F0F17] text-[#555566]">
            Loading editor...
          </div>
        }
      />
    </div>
  );
}
