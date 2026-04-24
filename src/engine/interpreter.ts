import type * as t from "@babel/types";
import { parseCode } from "./parser";
import { Environment, serializeValue } from "./environment";
import { TaskQueue } from "./task-queue";
import { MicrotaskQueue } from "./microtask-queue";
import type {
  ExecutionStep,
  CallFrame,
  ExecutionContext,
  WebAPIEntry,
  QueueEntry,
  ConsoleEntry,
  EventLoopPhase,
  HighlightTarget,
} from "./types";

const MAX_STEPS = 500;
const MAX_LOOP_ITERATIONS = 1000;
const MAX_CALL_DEPTH = 128;
const MAX_EVENT_LOOP_CYCLES = 50;

interface FunctionValue {
  __isFunction: true;
  __name: string;
  params: t.Identifier[];
  body: t.BlockStatement;
  closure: Environment;
  isArrow?: boolean;
}

interface PendingTimer {
  id: string;
  label: string;
  delay: number;
  callback: FunctionValue;
  type: "setTimeout" | "setInterval";
}

interface PendingMicrotask {
  id: string;
  label: string;
  callback: FunctionValue;
  arg?: unknown;
  sourceType: string;
}

export function generateTrace(sourceCode: string): ExecutionStep[] {
  const interpreter = new Interpreter(sourceCode);
  return interpreter.run();
}

class Interpreter {
  private source: string;
  private ast: t.File;
  private steps: ExecutionStep[] = [];
  private stepId = 0;

  // Runtime state
  private callStackFrames: CallFrame[] = [];
  private executionContexts: ExecutionContext[] = [];
  private webAPIs: WebAPIEntry[] = [];
  private taskQueue = new TaskQueue();
  private microtaskQueue = new MicrotaskQueue();
  private consoleOutput: ConsoleEntry[] = [];
  private eventLoopPhase: EventLoopPhase = "idle";

  // Internal tracking
  private globalEnv: Environment;
  private currentEnv: Environment;
  private frameIdCounter = 0;
  private ctxIdCounter = 0;
  private webApiIdCounter = 0;
  private queueIdCounter = 0;

  // Pending async operations
  private pendingTimers: PendingTimer[] = [];
  private pendingMicrotasks: PendingMicrotask[] = [];

  // Return value tracking
  private returnValue: unknown = undefined;
  private hasReturned = false;

  constructor(source: string) {
    this.source = source;
    this.ast = parseCode(source);
    this.globalEnv = new Environment();
    this.currentEnv = this.globalEnv;
  }

  run(): ExecutionStep[] {
    // 1. Create Global Execution Context - Creation Phase
    const globalCtx: ExecutionContext = {
      id: `ctx_${++this.ctxIdCounter}`,
      type: "global",
      functionName: "Global",
      phase: "creation",
      variableEnvironment: {},
      thisBinding: { type: "object", display: "window" },
    };
    this.executionContexts.push(globalCtx);

    // Hoist var declarations and function declarations
    this.hoistDeclarations(this.ast.program.body, this.globalEnv);
    globalCtx.variableEnvironment = this.globalEnv.getVariables();

    // Push global frame
    const globalFrame: CallFrame = {
      id: `frame_${++this.frameIdCounter}`,
      functionName: "<script>",
      variables: this.globalEnv.getVariables(),
      line: 1,
    };
    this.callStackFrames.push(globalFrame);

    this.eventLoopPhase = "executingCallStack";
    this.captureSnapshot("Start executing script", 1, {
      area: "callStack",
      entityId: globalFrame.id,
      action: "push",
    });

    // 2. Execution phase
    globalCtx.phase = "execution";

    // 3. Walk AST statements
    for (const stmt of this.ast.program.body) {
      if (this.steps.length >= MAX_STEPS) break;
      this.executeStatement(stmt);
      if (this.hasReturned) {
        this.hasReturned = false;
        break;
      }
    }

    // Update global frame variables
    this.updateTopFrame();

    // Pop global frame
    this.callStackFrames.pop();
    this.captureSnapshot("Script execution complete", null, {
      area: "callStack",
      entityId: globalFrame.id,
      action: "pop",
    });

    // 4. Run Event Loop
    this.runEventLoop();

    // Final idle state
    this.eventLoopPhase = "idle";
    if (this.steps.length > 0) {
      const lastStep = this.steps[this.steps.length - 1];
      if (lastStep.eventLoopPhase !== "idle") {
        this.captureSnapshot("All tasks complete", null, null);
      }
    }

    return this.steps;
  }

  // ─── Hoisting ─────────────────────────────────────────────

  private hoistDeclarations(body: t.Statement[], env: Environment) {
    for (const stmt of body) {
      if (stmt.type === "VariableDeclaration" && stmt.kind === "var") {
        for (const decl of stmt.declarations) {
          if (decl.id.type === "Identifier") {
            env.define(decl.id.name, undefined, "var");
          }
        }
      } else if (stmt.type === "FunctionDeclaration" && stmt.id) {
        const fn: FunctionValue = {
          __isFunction: true,
          __name: stmt.id.name,
          params: stmt.params.filter(
            (p): p is t.Identifier => p.type === "Identifier"
          ),
          body: stmt.body,
          closure: env,
        };
        env.define(stmt.id.name, fn, "var");
      }
    }
  }

  // ─── Statement Execution ──────────────────────────────────

  private executeStatement(node: t.Statement) {
    if (this.steps.length >= MAX_STEPS) return;

    switch (node.type) {
      case "VariableDeclaration":
        this.execVariableDeclaration(node);
        break;
      case "ExpressionStatement":
        this.evaluateExpression(node.expression);
        if (node.expression.type === "CallExpression" || 
            node.expression.type === "AssignmentExpression") {
          this.updateTopFrame();
        }
        break;
      case "FunctionDeclaration":
        // Already hoisted, capture snapshot for visibility
        if (node.id) {
          this.captureSnapshot(
            `Function '${node.id.name}' declared (hoisted)`,
            this.getLine(node),
            null
          );
        }
        break;
      case "ReturnStatement":
        this.returnValue = node.argument
          ? this.evaluateExpression(node.argument)
          : undefined;
        this.hasReturned = true;
        break;
      case "IfStatement":
        this.execIfStatement(node);
        break;
      case "ForStatement":
        this.execForStatement(node);
        break;
      case "WhileStatement":
        this.execWhileStatement(node);
        break;
      case "BlockStatement":
        this.execBlockStatement(node);
        break;
      default:
        break;
    }
  }

  private execVariableDeclaration(node: t.VariableDeclaration) {
    for (const decl of node.declarations) {
      if (decl.id.type !== "Identifier") continue;
      const name = decl.id.name;
      const value = decl.init ? this.evaluateExpression(decl.init) : undefined;

      if (node.kind === "var") {
        try {
          this.currentEnv.set(name, value);
        } catch {
          this.currentEnv.define(name, value, "var");
        }
      } else {
        this.currentEnv.define(
          name,
          value,
          node.kind as "let" | "const"
        );
      }

      this.updateTopFrame();
      this.updateExecutionContextVariables();
      this.captureSnapshot(
        `${node.kind} ${name} = ${serializeValue(value).display}`,
        this.getLine(node),
        null
      );
    }
  }

  private execIfStatement(node: t.IfStatement) {
    const test = this.evaluateExpression(node.test);
    this.captureSnapshot(
      `if condition: ${serializeValue(test).display} → ${test ? "true" : "false"}`,
      this.getLine(node),
      null
    );
    if (test) {
      this.executeStatement(node.consequent);
    } else if (node.alternate) {
      this.executeStatement(node.alternate);
    }
  }

  private execForStatement(node: t.ForStatement) {
    const loopEnv = new Environment(this.currentEnv);
    const prevEnv = this.currentEnv;
    this.currentEnv = loopEnv;

    if (node.init) {
      if (node.init.type === "VariableDeclaration") {
        this.execVariableDeclaration(node.init);
      } else {
        this.evaluateExpression(node.init);
      }
    }

    let iterations = 0;
    while (iterations < MAX_LOOP_ITERATIONS) {
      if (this.steps.length >= MAX_STEPS) break;
      if (node.test) {
        const test = this.evaluateExpression(node.test);
        if (!test) break;
      }
      if (node.body.type === "BlockStatement") {
        for (const stmt of node.body.body) {
          this.executeStatement(stmt);
          if (this.hasReturned) break;
        }
      } else {
        this.executeStatement(node.body);
      }
      if (this.hasReturned) break;
      if (node.update) {
        this.evaluateExpression(node.update);
        this.updateTopFrame();
      }
      iterations++;
    }

    this.currentEnv = prevEnv;
  }

  private execWhileStatement(node: t.WhileStatement) {
    let iterations = 0;
    while (iterations < MAX_LOOP_ITERATIONS) {
      if (this.steps.length >= MAX_STEPS) break;
      const test = this.evaluateExpression(node.test);
      if (!test) break;
      if (node.body.type === "BlockStatement") {
        for (const stmt of node.body.body) {
          this.executeStatement(stmt);
          if (this.hasReturned) break;
        }
      } else {
        this.executeStatement(node.body);
      }
      if (this.hasReturned) break;
      iterations++;
    }
  }

  private execBlockStatement(node: t.BlockStatement) {
    const blockEnv = new Environment(this.currentEnv);
    const prevEnv = this.currentEnv;
    this.currentEnv = blockEnv;

    for (const stmt of node.body) {
      if (this.steps.length >= MAX_STEPS) break;
      this.executeStatement(stmt);
      if (this.hasReturned) break;
    }

    this.currentEnv = prevEnv;
  }

  // ─── Expression Evaluation ────────────────────────────────

  private evaluateExpression(node: t.Expression | t.SpreadElement): unknown {
    switch (node.type) {
      case "NumericLiteral":
        return node.value;
      case "StringLiteral":
        return node.value;
      case "BooleanLiteral":
        return node.value;
      case "NullLiteral":
        return null;
      case "TemplateLiteral":
        return this.evalTemplateLiteral(node);
      case "Identifier":
        return this.evalIdentifier(node);
      case "BinaryExpression":
        return this.evalBinaryExpression(node);
      case "LogicalExpression":
        return this.evalLogicalExpression(node);
      case "UnaryExpression":
        return this.evalUnaryExpression(node);
      case "UpdateExpression":
        return this.evalUpdateExpression(node);
      case "AssignmentExpression":
        return this.evalAssignmentExpression(node);
      case "CallExpression":
        return this.evalCallExpression(node);
      case "MemberExpression":
        return this.evalMemberExpression(node);
      case "ArrowFunctionExpression":
        return this.evalArrowFunction(node);
      case "FunctionExpression":
        return this.evalFunctionExpression(node);
      case "ArrayExpression":
        return this.evalArrayExpression(node);
      case "ObjectExpression":
        return this.evalObjectExpression(node);
      case "ConditionalExpression":
        return this.evaluateExpression(
          this.evaluateExpression(node.test) ? node.consequent : node.alternate
        );
      case "NewExpression":
        return this.evalNewExpression(node);
      default:
        return undefined;
    }
  }

  private evalTemplateLiteral(node: t.TemplateLiteral): string {
    let result = "";
    for (let i = 0; i < node.quasis.length; i++) {
      result += node.quasis[i].value.cooked ?? "";
      if (i < node.expressions.length) {
        const val = this.evaluateExpression(
          node.expressions[i] as t.Expression
        );
        result += String(val);
      }
    }
    return result;
  }

  private evalIdentifier(node: t.Identifier): unknown {
    if (node.name === "undefined") return undefined;
    if (node.name === "NaN") return NaN;
    if (node.name === "Infinity") return Infinity;
    if (node.name === "console") return { __isConsole: true };
    if (node.name === "Math") return Math;
    if (node.name === "JSON") return JSON;
    if (node.name === "parseInt") return parseInt;
    if (node.name === "parseFloat") return parseFloat;
    if (node.name === "isNaN") return isNaN;
    if (node.name === "isFinite") return isFinite;
    if (node.name === "String") return String;
    if (node.name === "Number") return Number;
    if (node.name === "Boolean") return Boolean;
    if (node.name === "Array") return Array;
    if (node.name === "Object") return Object;
    if (node.name === "setTimeout") return { __isSetTimeout: true };
    if (node.name === "setInterval") return { __isSetInterval: true };
    if (node.name === "Promise") return { __isPromise: true };
    if (node.name === "queueMicrotask") return { __isQueueMicrotask: true };
    return this.currentEnv.get(node.name);
  }

  private evalBinaryExpression(node: t.BinaryExpression): unknown {
    const left = this.evaluateExpression(node.left as t.Expression);
    const right = this.evaluateExpression(node.right);
    switch (node.operator) {
      case "+": return (left as number) + (right as number);
      case "-": return (left as number) - (right as number);
      case "*": return (left as number) * (right as number);
      case "/": return (left as number) / (right as number);
      case "%": return (left as number) % (right as number);
      case "**": return (left as number) ** (right as number);
      case "===": return left === right;
      case "!==": return left !== right;
      case "==": return left == right;
      case "!=": return left != right;
      case "<": return (left as number) < (right as number);
      case ">": return (left as number) > (right as number);
      case "<=": return (left as number) <= (right as number);
      case ">=": return (left as number) >= (right as number);
      case "&": return (left as number) & (right as number);
      case "|": return (left as number) | (right as number);
      case "^": return (left as number) ^ (right as number);
      case "<<": return (left as number) << (right as number);
      case ">>": return (left as number) >> (right as number);
      case ">>>": return (left as number) >>> (right as number);
      case "instanceof": return false;
      case "in": return false;
      default: return undefined;
    }
  }

  private evalLogicalExpression(node: t.LogicalExpression): unknown {
    const left = this.evaluateExpression(node.left);
    switch (node.operator) {
      case "&&": return left ? this.evaluateExpression(node.right) : left;
      case "||": return left ? left : this.evaluateExpression(node.right);
      case "??": return left != null ? left : this.evaluateExpression(node.right);
      default: return undefined;
    }
  }

  private evalUnaryExpression(node: t.UnaryExpression): unknown {
    const arg = this.evaluateExpression(node.argument as t.Expression);
    switch (node.operator) {
      case "-": return -(arg as number);
      case "+": return +(arg as number);
      case "!": return !arg;
      case "typeof": return typeof arg;
      case "void": return undefined;
      default: return undefined;
    }
  }

  private evalUpdateExpression(node: t.UpdateExpression): unknown {
    if (node.argument.type !== "Identifier") return undefined;
    const name = node.argument.name;
    const oldVal = this.currentEnv.get(name) as number;
    const newVal = node.operator === "++" ? oldVal + 1 : oldVal - 1;
    this.currentEnv.set(name, newVal);
    return node.prefix ? newVal : oldVal;
  }

  private evalAssignmentExpression(node: t.AssignmentExpression): unknown {
    const value = this.evaluateExpression(node.right);

    if (node.left.type === "Identifier") {
      const name = node.left.name;
      let finalValue = value;

      if (node.operator !== "=") {
        const current = this.currentEnv.get(name) as number;
        switch (node.operator) {
          case "+=": finalValue = (current as number) + (value as number); break;
          case "-=": finalValue = (current as number) - (value as number); break;
          case "*=": finalValue = (current as number) * (value as number); break;
          case "/=": finalValue = (current as number) / (value as number); break;
          default: break;
        }
      }

      this.currentEnv.set(name, finalValue);
      this.updateTopFrame();
      this.updateExecutionContextVariables();
      this.captureSnapshot(
        `${name} = ${serializeValue(finalValue).display}`,
        this.getLine(node),
        null
      );
      return finalValue;
    }

    if (node.left.type === "MemberExpression") {
      const obj = this.evaluateExpression(node.left.object as t.Expression) as Record<string, unknown>;
      const prop = node.left.computed
        ? this.evaluateExpression(node.left.property as t.Expression)
        : (node.left.property as t.Identifier).name;
      if (obj && typeof obj === "object") {
        (obj as Record<string, unknown>)[prop as string] = value;
      }
      return value;
    }

    return value;
  }

  private evalCallExpression(node: t.CallExpression): unknown {
    // Handle console.log, console.warn, console.error
    if (
      node.callee.type === "MemberExpression" &&
      node.callee.object.type === "Identifier" &&
      node.callee.object.name === "console"
    ) {
      return this.handleConsoleCall(node);
    }

    // Handle setTimeout
    if (
      node.callee.type === "Identifier" &&
      node.callee.name === "setTimeout"
    ) {
      return this.handleSetTimeout(node);
    }

    // Handle setInterval
    if (
      node.callee.type === "Identifier" &&
      node.callee.name === "setInterval"
    ) {
      return this.handleSetInterval(node);
    }

    // Handle Promise.resolve().then() etc.
    if (this.isPromiseCall(node)) {
      return this.handlePromiseCall(node);
    }

    // Handle queueMicrotask
    if (
      node.callee.type === "Identifier" &&
      node.callee.name === "queueMicrotask"
    ) {
      return this.handleQueueMicrotask(node);
    }

    // Handle method calls on arrays/objects
    if (node.callee.type === "MemberExpression") {
      return this.handleMethodCall(node);
    }

    // Handle regular function calls
    const callee = this.evaluateExpression(node.callee as t.Expression);
    if (callee && (callee as FunctionValue).__isFunction) {
      const fn = callee as FunctionValue;
      const args = node.arguments.map((a) =>
        this.evaluateExpression(a as t.Expression)
      );
      return this.callFunction(fn, args, this.getLine(node));
    }

    // Handle native functions (parseInt, etc.)
    if (typeof callee === "function") {
      const args = node.arguments.map((a) =>
        this.evaluateExpression(a as t.Expression)
      );
      return callee(...args);
    }

    return undefined;
  }

  private handleConsoleCall(node: t.CallExpression): void {
    const prop = (node.callee as t.MemberExpression).property;
    const method = prop.type === "Identifier" ? prop.name : "log";

    const args = node.arguments.map((a) =>
      this.evaluateExpression(a as t.Expression)
    );

    const entry: ConsoleEntry = {
      type: method as "log" | "warn" | "error",
      args: args.map((a) => {
        if (typeof a === "string") return a;
        if (typeof a === "object" && a !== null) {
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        }
        return String(a);
      }),
      stepId: this.stepId,
    };
    this.consoleOutput.push(entry);

    this.captureSnapshot(
      `console.${method}(${entry.args.join(", ")})`,
      this.getLine(node),
      null
    );
  }

  private handleSetTimeout(node: t.CallExpression): number {
    const callbackExpr = node.arguments[0];
    const delayExpr = node.arguments[1];
    const delay = delayExpr
      ? (this.evaluateExpression(delayExpr as t.Expression) as number)
      : 0;

    let callback: FunctionValue;
    const callbackVal = this.evaluateExpression(callbackExpr as t.Expression);

    if (callbackVal && (callbackVal as FunctionValue).__isFunction) {
      callback = callbackVal as FunctionValue;
    } else {
      return 0;
    }

    const timerId = `webapi_${++this.webApiIdCounter}`;
    const callbackName = callback.__name || "anonymous";

    // Add to Web APIs
    const webApiEntry: WebAPIEntry = {
      id: timerId,
      type: "setTimeout",
      label: `setTimeout(${callbackName}, ${delay})`,
      delay,
      status: "running",
    };
    this.webAPIs.push(webApiEntry);

    // Track for event loop
    this.pendingTimers.push({
      id: timerId,
      label: `setTimeout callback: ${callbackName}`,
      delay,
      callback,
      type: "setTimeout",
    });

    this.captureSnapshot(
      `setTimeout(${callbackName}, ${delay}ms) → Web API`,
      this.getLine(node),
      { area: "webAPIs", entityId: timerId, action: "push" }
    );

    return 1;
  }

  private handleSetInterval(node: t.CallExpression): number {
    const callbackExpr = node.arguments[0];
    const delayExpr = node.arguments[1];
    const delay = delayExpr
      ? (this.evaluateExpression(delayExpr as t.Expression) as number)
      : 0;

    let callback: FunctionValue;
    const callbackVal = this.evaluateExpression(callbackExpr as t.Expression);

    if (callbackVal && (callbackVal as FunctionValue).__isFunction) {
      callback = callbackVal as FunctionValue;
    } else {
      return 0;
    }

    const timerId = `webapi_${++this.webApiIdCounter}`;
    const callbackName = callback.__name || "anonymous";

    const webApiEntry: WebAPIEntry = {
      id: timerId,
      type: "setInterval",
      label: `setInterval(${callbackName}, ${delay})`,
      delay,
      status: "running",
    };
    this.webAPIs.push(webApiEntry);

    this.pendingTimers.push({
      id: timerId,
      label: `setInterval callback: ${callbackName}`,
      delay,
      callback,
      type: "setInterval",
    });

    this.captureSnapshot(
      `setInterval(${callbackName}, ${delay}ms) → Web API`,
      this.getLine(node),
      { area: "webAPIs", entityId: timerId, action: "push" }
    );

    return 1;
  }

  private isPromiseCall(node: t.CallExpression): boolean {
    if (node.callee.type === "MemberExpression") {
      // Promise.resolve(), Promise.reject()
      if (
        node.callee.object.type === "Identifier" &&
        node.callee.object.name === "Promise"
      ) {
        return true;
      }
      // .then(), .catch() on a call expression result
      if (
        node.callee.property.type === "Identifier" &&
        ((node.callee.property as t.Identifier).name === "then" ||
          (node.callee.property as t.Identifier).name === "catch")
      ) {
        return true;
      }
    }
    // new Promise(...)
    if (node.callee.type === "Identifier" && node.callee.name === "Promise") {
      return false; // handled by NewExpression
    }
    return false;
  }

  private handlePromiseCall(node: t.CallExpression): unknown {
    const callee = node.callee as t.MemberExpression;
    const method =
      callee.property.type === "Identifier" ? (callee.property as t.Identifier).name : "";

    if (
      callee.object.type === "Identifier" &&
      callee.object.name === "Promise"
    ) {
      // Promise.resolve(value)
      if (method === "resolve") {
        const val = node.arguments.length
          ? this.evaluateExpression(node.arguments[0] as t.Expression)
          : undefined;
        return { __isResolvedPromise: true, value: val, __promiseId: `promise_${++this.webApiIdCounter}` };
      }
      // Promise.reject(reason)
      if (method === "reject") {
        const val = node.arguments.length
          ? this.evaluateExpression(node.arguments[0] as t.Expression)
          : undefined;
        return { __isRejectedPromise: true, value: val, __promiseId: `promise_${++this.webApiIdCounter}` };
      }
    }

    // .then(callback) or .catch(callback)
    if (method === "then" || method === "catch") {
      // Evaluate the object we're calling .then() on
      const promiseObj = this.evaluateExpression(callee.object as t.Expression);
      const callbackExpr = node.arguments[0];
      if (!callbackExpr) return promiseObj;

      const callbackVal = this.evaluateExpression(callbackExpr as t.Expression);
      if (!callbackVal || !(callbackVal as FunctionValue).__isFunction) return promiseObj;

      const callback = callbackVal as FunctionValue;
      const callbackName = callback.__name || "anonymous";
      const queueId = `mq_${++this.queueIdCounter}`;

      const promiseId = (promiseObj as Record<string, unknown>)?.__promiseId as string || `promise_${++this.webApiIdCounter}`;

      // Add to Web APIs briefly to show promise processing
      const webApiEntry: WebAPIEntry = {
        id: promiseId,
        type: "promise",
        label: `Promise.${method}(${callbackName})`,
        status: "completed",
      };
      this.webAPIs.push(webApiEntry);

      this.captureSnapshot(
        `Promise.${method}(${callbackName}) → Web API`,
        this.getLine(node),
        { area: "webAPIs", entityId: promiseId, action: "push" }
      );

      // Immediately move to microtask queue (resolved promise)
      this.pendingMicrotasks.push({
        id: queueId,
        label: `Promise.${method}: ${callbackName}`,
        callback,
        arg: (promiseObj as Record<string, unknown>)?.value,
        sourceType: `Promise.${method}`,
      });

      // Remove from web APIs
      this.webAPIs = this.webAPIs.filter((w) => w.id !== promiseId);

      // Add to microtask queue
      const mqEntry: QueueEntry = {
        id: queueId,
        label: `Promise.${method}: ${callbackName}`,
        callbackName,
        sourceType: `Promise.${method}`,
      };
      this.microtaskQueue.enqueue(mqEntry);

      this.captureSnapshot(
        `${callbackName} → Microtask Queue`,
        this.getLine(node),
        { area: "microtaskQueue", entityId: queueId, action: "enqueue" }
      );

      return { __isResolvedPromise: true, value: undefined, __promiseId: promiseId };
    }

    return undefined;
  }

  private handleQueueMicrotask(node: t.CallExpression): void {
    const callbackExpr = node.arguments[0];
    if (!callbackExpr) return;

    const callbackVal = this.evaluateExpression(callbackExpr as t.Expression);
    if (!callbackVal || !(callbackVal as FunctionValue).__isFunction) return;

    const callback = callbackVal as FunctionValue;
    const callbackName = callback.__name || "anonymous";
    const queueId = `mq_${++this.queueIdCounter}`;

    this.pendingMicrotasks.push({
      id: queueId,
      label: `queueMicrotask: ${callbackName}`,
      callback,
      sourceType: "queueMicrotask",
    });

    const mqEntry: QueueEntry = {
      id: queueId,
      label: `queueMicrotask: ${callbackName}`,
      callbackName,
      sourceType: "queueMicrotask",
    };
    this.microtaskQueue.enqueue(mqEntry);

    this.captureSnapshot(
      `queueMicrotask(${callbackName}) → Microtask Queue`,
      this.getLine(node),
      { area: "microtaskQueue", entityId: queueId, action: "enqueue" }
    );
  }

  private handleMethodCall(node: t.CallExpression): unknown {
    const callee = node.callee as t.MemberExpression;
    const obj = this.evaluateExpression(callee.object as t.Expression);
    const method =
      callee.property.type === "Identifier" ? (callee.property as t.Identifier).name : "";
    const args = node.arguments.map((a) =>
      this.evaluateExpression(a as t.Expression)
    );

    // Handle array methods
    if (Array.isArray(obj) && typeof (obj as unknown as Record<string, unknown>)[method] === "function") {
      return (obj as unknown as Record<string, (...args: unknown[]) => unknown>)[method](...args);
    }

    // Handle object method calls (user-defined methods)
    if (
      obj &&
      typeof obj === "object" &&
      (obj as Record<string, unknown>)[method] &&
      ((obj as Record<string, unknown>)[method] as FunctionValue).__isFunction
    ) {
      const fn = (obj as Record<string, unknown>)[method] as FunctionValue;
      return this.callFunction(fn, args, this.getLine(node));
    }

    // Handle string methods
    if (typeof obj === "string" && typeof (obj as unknown as Record<string, unknown>)[method] === "function") {
      return (obj as unknown as Record<string, (...args: unknown[]) => unknown>)[method](...args);
    }

    // Handle native methods
    if (obj && typeof obj === "object" && typeof (obj as Record<string, unknown>)[method] === "function") {
      return ((obj as Record<string, unknown>)[method] as (...args: unknown[]) => unknown).call(obj, ...args);
    }

    return undefined;
  }

  private evalNewExpression(node: t.NewExpression): unknown {
    // Handle new Promise(executor)
    if (
      node.callee.type === "Identifier" &&
      node.callee.name === "Promise"
    ) {
      return this.handleNewPromise(node);
    }

    const callee = this.evaluateExpression(node.callee as t.Expression);
    if (callee && (callee as FunctionValue).__isFunction) {
      const fn = callee as FunctionValue;
      const args = node.arguments.map((a) =>
        this.evaluateExpression(a as t.Expression)
      );
      const obj = {};
      this.callFunction(fn, args, this.getLine(node), obj);
      return obj;
    }
    return {};
  }

  private handleNewPromise(node: t.NewExpression): unknown {
    const executorExpr = node.arguments[0];
    if (!executorExpr) return { __isResolvedPromise: true, value: undefined };

    const executorVal = this.evaluateExpression(executorExpr as t.Expression);
    if (!executorVal || !(executorVal as FunctionValue).__isFunction) {
      return { __isResolvedPromise: true, value: undefined };
    }

    const executor = executorVal as FunctionValue;
    const promiseId = `promise_${++this.webApiIdCounter}`;
    let resolvedValue: unknown = undefined;
    let thenCallback: FunctionValue | null = null;

    // Create resolve and reject functions
    const resolveId = `resolve_${this.webApiIdCounter}`;
    const rejectId = `reject_${this.webApiIdCounter}`;

    // We need to capture what resolve/reject do
    // For simplicity, we'll track the resolution
    const promiseState = {
      resolved: false,
      rejected: false,
      value: undefined as unknown,
    };

    // Create resolve/reject as trackable values
    const resolveFn: FunctionValue = {
      __isFunction: true,
      __name: "resolve",
      params: [{ type: "Identifier", name: "value" } as t.Identifier],
      body: { type: "BlockStatement", body: [] } as unknown as t.BlockStatement,
      closure: this.currentEnv,
    };
    const rejectFn: FunctionValue = {
      __isFunction: true,
      __name: "reject",
      params: [{ type: "Identifier", name: "reason" } as t.Identifier],
      body: { type: "BlockStatement", body: [] } as unknown as t.BlockStatement,
      closure: this.currentEnv,
    };

    // Execute the executor synchronously with custom resolve/reject handling
    const execEnv = new Environment(executor.closure);
    if (executor.params[0]) execEnv.define(executor.params[0].name, resolveFn, "let");
    if (executor.params[1]) execEnv.define(executor.params[1].name, rejectFn, "let");

    const prevEnv = this.currentEnv;
    this.currentEnv = execEnv;

    const promiseWebApi: WebAPIEntry = {
      id: promiseId,
      type: "promise",
      label: "new Promise(executor)",
      status: "running",
    };
    this.webAPIs.push(promiseWebApi);

    this.captureSnapshot(
      "new Promise(executor) → executing executor",
      this.getLine(node),
      { area: "webAPIs", entityId: promiseId, action: "push" }
    );

    // Execute executor body
    const fnName = "Promise executor";
    const frameId = `frame_${++this.frameIdCounter}`;
    this.callStackFrames.push({
      id: frameId,
      functionName: fnName,
      variables: execEnv.getVariables(),
      line: this.getLine(node),
    });

    this.captureSnapshot(
      `Executing ${fnName}`,
      this.getLine(node),
      { area: "callStack", entityId: frameId, action: "push" }
    );

    for (const stmt of executor.body.body) {
      if (this.steps.length >= MAX_STEPS) break;

      // Check if this is a call to resolve/reject
      if (
        stmt.type === "ExpressionStatement" &&
        stmt.expression.type === "CallExpression" &&
        stmt.expression.callee.type === "Identifier"
      ) {
        const calleeName = stmt.expression.callee.name;
        if (
          calleeName === (executor.params[0] as t.Identifier)?.name
        ) {
          // This is resolve(value)
          resolvedValue = stmt.expression.arguments.length
            ? this.evaluateExpression(stmt.expression.arguments[0] as t.Expression)
            : undefined;
          promiseState.resolved = true;
          promiseState.value = resolvedValue;

          this.captureSnapshot(
            `resolve(${serializeValue(resolvedValue).display})`,
            this.getLine(stmt),
            null
          );
          continue;
        }
        if (
          calleeName === (executor.params[1] as t.Identifier)?.name
        ) {
          // This is reject(reason)
          resolvedValue = stmt.expression.arguments.length
            ? this.evaluateExpression(stmt.expression.arguments[0] as t.Expression)
            : undefined;
          promiseState.rejected = true;
          promiseState.value = resolvedValue;

          this.captureSnapshot(
            `reject(${serializeValue(resolvedValue).display})`,
            this.getLine(stmt),
            null
          );
          continue;
        }
      }

      this.executeStatement(stmt);
    }

    // Pop executor frame
    this.callStackFrames.pop();
    this.captureSnapshot(
      `${fnName} completed`,
      this.getLine(node),
      { area: "callStack", entityId: frameId, action: "pop" }
    );

    this.currentEnv = prevEnv;

    // Update web API status
    const apiEntry = this.webAPIs.find((w) => w.id === promiseId);
    if (apiEntry) {
      apiEntry.status = "completed";
    }

    return {
      __isResolvedPromise: promiseState.resolved,
      __isRejectedPromise: promiseState.rejected,
      value: promiseState.value,
      __promiseId: promiseId,
    };
  }

  private evalMemberExpression(node: t.MemberExpression): unknown {
    const obj = this.evaluateExpression(node.object as t.Expression);
    if (obj === null || obj === undefined) return undefined;

    let prop: string | number;
    if (node.computed) {
      prop = this.evaluateExpression(node.property as t.Expression) as
        | string
        | number;
    } else {
      prop = (node.property as t.Identifier).name;
    }

    if (typeof obj === "object" && obj !== null) {
      return (obj as Record<string, unknown>)[prop as string];
    }
    if (typeof obj === "string" && prop === "length") return obj.length;
    if (Array.isArray(obj) && prop === "length") return obj.length;

    return undefined;
  }

  private evalArrowFunction(node: t.ArrowFunctionExpression): FunctionValue {
    return {
      __isFunction: true,
      __name: "anonymous",
      params: node.params.filter(
        (p): p is t.Identifier => p.type === "Identifier"
      ),
      body:
        node.body.type === "BlockStatement"
          ? node.body
          : ({
              type: "BlockStatement",
              body: [
                {
                  type: "ReturnStatement",
                  argument: node.body,
                } as t.ReturnStatement,
              ],
            } as unknown as t.BlockStatement),
      closure: this.currentEnv,
      isArrow: true,
    };
  }

  private evalFunctionExpression(node: t.FunctionExpression): FunctionValue {
    return {
      __isFunction: true,
      __name: node.id?.name || "anonymous",
      params: node.params.filter(
        (p): p is t.Identifier => p.type === "Identifier"
      ),
      body: node.body,
      closure: this.currentEnv,
    };
  }

  private evalArrayExpression(node: t.ArrayExpression): unknown[] {
    return node.elements.map((el) =>
      el ? this.evaluateExpression(el as t.Expression) : undefined
    );
  }

  private evalObjectExpression(
    node: t.ObjectExpression
  ): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const prop of node.properties) {
      if (prop.type === "ObjectProperty") {
        const key =
          prop.key.type === "Identifier"
            ? prop.key.name
            : String(this.evaluateExpression(prop.key as t.Expression));
        obj[key] = this.evaluateExpression(prop.value as t.Expression);
      }
    }
    return obj;
  }

  // ─── Function Calling ─────────────────────────────────────

  private callFunction(
    fn: FunctionValue,
    args: unknown[],
    line: number,
    thisVal?: unknown
  ): unknown {
    if (this.callStackFrames.length >= MAX_CALL_DEPTH) {
      this.captureSnapshot(
        `Maximum call stack size exceeded`,
        line,
        null
      );
      return undefined;
    }

    const fnEnv = new Environment(fn.closure);

    // Bind parameters
    for (let i = 0; i < fn.params.length; i++) {
      fnEnv.define(fn.params[i].name, args[i], "let");
    }

    // Create execution context
    const ctxId = `ctx_${++this.ctxIdCounter}`;
    const ctx: ExecutionContext = {
      id: ctxId,
      type: "function",
      functionName: fn.__name,
      phase: "creation",
      variableEnvironment: fnEnv.getVariables(),
      thisBinding: serializeValue(thisVal ?? null),
    };
    this.executionContexts.push(ctx);

    // Hoist declarations inside function body
    this.hoistDeclarations(fn.body.body, fnEnv);
    ctx.variableEnvironment = fnEnv.getVariables();

    // Push call frame
    const frameId = `frame_${++this.frameIdCounter}`;
    const frame: CallFrame = {
      id: frameId,
      functionName: fn.__name,
      variables: fnEnv.getVariables(),
      line,
    };
    this.callStackFrames.push(frame);

    this.captureSnapshot(
      `Call ${fn.__name}(${args.map((a) => serializeValue(a).display).join(", ")})`,
      line,
      { area: "callStack", entityId: frameId, action: "push" }
    );

    // Switch to execution phase
    ctx.phase = "execution";

    // Execute function body
    const prevEnv = this.currentEnv;
    this.currentEnv = fnEnv;

    for (const stmt of fn.body.body) {
      if (this.steps.length >= MAX_STEPS) break;
      this.executeStatement(stmt);
      // Update frame variables after each statement
      if (this.callStackFrames.length > 0) {
        const topFrame = this.callStackFrames[this.callStackFrames.length - 1];
        if (topFrame.id === frameId) {
          topFrame.variables = fnEnv.getVariables();
        }
      }
      if (this.hasReturned) break;
    }

    this.currentEnv = prevEnv;

    // Pop call frame
    this.callStackFrames.pop();

    // Remove execution context
    this.executionContexts = this.executionContexts.filter(
      (c) => c.id !== ctxId
    );

    const retVal = this.hasReturned ? this.returnValue : undefined;
    this.hasReturned = false;
    this.returnValue = undefined;

    this.captureSnapshot(
      `Return from ${fn.__name} → ${serializeValue(retVal).display}`,
      line,
      { area: "callStack", entityId: frameId, action: "pop" }
    );

    return retVal;
  }

  // ─── Event Loop ───────────────────────────────────────────

  private runEventLoop() {
    let cycles = 0;

    while (cycles < MAX_EVENT_LOOP_CYCLES && this.steps.length < MAX_STEPS) {
      const hasMicrotasks = !this.microtaskQueue.isEmpty() || this.pendingMicrotasks.length > 0;
      const hasTimers = this.pendingTimers.length > 0;
      const hasTaskQueueItems = !this.taskQueue.isEmpty();

      if (!hasMicrotasks && !hasTimers && !hasTaskQueueItems) break;

      // Step A: Check and drain microtask queue
      this.eventLoopPhase = "checkingMicrotasks";
      this.captureSnapshot("Event Loop: checking microtask queue", null, {
        area: "eventLoop",
        entityId: "microtasks",
        action: "move",
      });

      while (!this.microtaskQueue.isEmpty() && this.steps.length < MAX_STEPS) {
        const entry = this.microtaskQueue.dequeue()!;
        const pending = this.pendingMicrotasks.find((m) => m.id === entry.id);
        if (!pending) continue;

        this.pendingMicrotasks = this.pendingMicrotasks.filter(
          (m) => m.id !== entry.id
        );

        this.eventLoopPhase = "processingMicrotask";
        this.captureSnapshot(
          `Dequeue microtask: ${entry.label}`,
          null,
          {
            area: "microtaskQueue",
            entityId: entry.id,
            action: "dequeue",
          }
        );

        // Execute the microtask callback
        this.callFunction(
          pending.callback,
          pending.arg !== undefined ? [pending.arg] : [],
          0
        );
      }

      // Step B: Render opportunity
      this.eventLoopPhase = "rendering";
      this.captureSnapshot("Event Loop: render opportunity", null, {
        area: "eventLoop",
        entityId: "render",
        action: "move",
      });

      // Step C: Tick Web APIs → move completed timers to task queue
      if (this.pendingTimers.length > 0) {
        // Sort by delay
        this.pendingTimers.sort((a, b) => a.delay - b.delay);

        const timer = this.pendingTimers.shift()!;

        // Mark web API as completed
        const webApi = this.webAPIs.find((w) => w.id === timer.id);
        if (webApi) {
          webApi.status = "completed";
        }

        this.captureSnapshot(
          `Timer complete: ${timer.label}`,
          null,
          { area: "webAPIs", entityId: timer.id, action: "move" }
        );

        // Remove from web APIs
        this.webAPIs = this.webAPIs.filter((w) => w.id !== timer.id);

        // Add callback to task queue
        const taskId = `tq_${++this.queueIdCounter}`;
        const taskEntry: QueueEntry = {
          id: taskId,
          label: timer.label,
          callbackName: timer.callback.__name || "anonymous",
          sourceType: timer.type,
        };
        this.taskQueue.enqueue(taskEntry);

        // Track callback for execution
        this.pendingTimers.push({
          ...timer,
          id: taskId,
        } as unknown as PendingTimer);

        this.captureSnapshot(
          `${timer.label} → Task Queue`,
          null,
          { area: "taskQueue", entityId: taskId, action: "enqueue" }
        );
      }

      // Step D: Process one task from task queue
      if (!this.taskQueue.isEmpty()) {
        this.eventLoopPhase = "checkingTaskQueue";
        this.captureSnapshot("Event Loop: checking task queue", null, {
          area: "eventLoop",
          entityId: "taskQueue",
          action: "move",
        });

        const task = this.taskQueue.dequeue()!;

        // Find the callback
        let taskCallback: FunctionValue | null = null;

        // Check if this task ID maps to a pending timer callback
        const timerIdx = this.pendingTimers.findIndex((t) => t.id === task.id);
        if (timerIdx !== -1) {
          taskCallback = this.pendingTimers[timerIdx].callback;
          this.pendingTimers.splice(timerIdx, 1);
        }

        this.eventLoopPhase = "processingTask";
        this.captureSnapshot(`Dequeue task: ${task.label}`, null, {
          area: "taskQueue",
          entityId: task.id,
          action: "dequeue",
        });

        if (taskCallback) {
          this.callFunction(taskCallback, [], 0);
        }
      }

      cycles++;
    }
  }

  // ─── Snapshot ─────────────────────────────────────────────

  private captureSnapshot(
    description: string,
    line: number | null,
    highlight: HighlightTarget | null
  ) {
    if (this.steps.length >= MAX_STEPS) return;

    const step: ExecutionStep = {
      id: this.stepId++,
      description,
      currentLine: line,
      callStack: JSON.parse(JSON.stringify(this.callStackFrames)),
      executionContexts: JSON.parse(JSON.stringify(this.executionContexts)),
      webAPIs: JSON.parse(JSON.stringify(this.webAPIs)),
      taskQueue: JSON.parse(JSON.stringify(this.taskQueue.toArray())),
      microtaskQueue: JSON.parse(
        JSON.stringify(this.microtaskQueue.toArray())
      ),
      eventLoopPhase: this.eventLoopPhase,
      consoleOutput: JSON.parse(JSON.stringify(this.consoleOutput)),
      highlightedEntity: highlight,
    };

    this.steps.push(step);
  }

  // ─── Helpers ──────────────────────────────────────────────

  private getLine(node: { loc?: t.SourceLocation | null }): number {
    return node.loc?.start.line ?? 0;
  }

  private updateTopFrame() {
    if (this.callStackFrames.length > 0) {
      const top = this.callStackFrames[this.callStackFrames.length - 1];
      top.variables = this.currentEnv.getVariables();
    }
  }

  private updateExecutionContextVariables() {
    if (this.executionContexts.length > 0) {
      const top =
        this.executionContexts[this.executionContexts.length - 1];
      top.variableEnvironment = this.currentEnv.getVariables();
    }
  }
}
