export interface SerializedValue {
  type:
    | "number"
    | "string"
    | "boolean"
    | "null"
    | "undefined"
    | "object"
    | "array"
    | "function";
  display: string;
}

export interface CallFrame {
  id: string;
  functionName: string;
  variables: Record<string, SerializedValue>;
  line: number;
}

export interface ExecutionContext {
  id: string;
  type: "global" | "function";
  functionName: string;
  phase: "creation" | "execution";
  variableEnvironment: Record<string, SerializedValue>;
  thisBinding: SerializedValue;
}

export interface WebAPIEntry {
  id: string;
  type: "setTimeout" | "setInterval" | "fetch" | "promise";
  label: string;
  delay?: number;
  status: "running" | "completed";
}

export interface QueueEntry {
  id: string;
  label: string;
  callbackName: string;
  sourceType: string;
}

export type EventLoopPhase =
  | "idle"
  | "executingCallStack"
  | "checkingMicrotasks"
  | "processingMicrotask"
  | "checkingTaskQueue"
  | "processingTask"
  | "rendering";

export interface ConsoleEntry {
  type: "log" | "warn" | "error";
  args: string[];
  stepId: number;
}

export interface HighlightTarget {
  area:
    | "callStack"
    | "webAPIs"
    | "taskQueue"
    | "microtaskQueue"
    | "eventLoop";
  entityId: string;
  action: "push" | "pop" | "enqueue" | "dequeue" | "move";
}

export interface ExecutionStep {
  id: number;
  description: string;
  currentLine: number | null;
  callStack: CallFrame[];
  executionContexts: ExecutionContext[];
  webAPIs: WebAPIEntry[];
  taskQueue: QueueEntry[];
  microtaskQueue: QueueEntry[];
  eventLoopPhase: EventLoopPhase;
  consoleOutput: ConsoleEntry[];
  highlightedEntity: HighlightTarget | null;
}
