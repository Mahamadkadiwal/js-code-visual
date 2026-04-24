import type { SerializedValue } from "./types";

export class Environment {
  private variables: Map<
    string,
    { value: unknown; kind: "var" | "let" | "const" }
  > = new Map();
  public parent: Environment | null;

  constructor(parent: Environment | null = null) {
    this.parent = parent;
  }

  define(name: string, value: unknown, kind: "var" | "let" | "const" = "var") {
    this.variables.set(name, { value, kind });
  }

  get(name: string): unknown {
    const entry = this.variables.get(name);
    if (entry !== undefined) return entry.value;
    if (this.parent) return this.parent.get(name);
    throw new ReferenceError(`${name} is not defined`);
  }

  set(name: string, value: unknown): void {
    if (this.variables.has(name)) {
      const entry = this.variables.get(name)!;
      if (entry.kind === "const") {
        throw new TypeError("Assignment to constant variable.");
      }
      entry.value = value;
      return;
    }
    if (this.parent) {
      this.parent.set(name, value);
      return;
    }
    throw new ReferenceError(`${name} is not defined`);
  }

  has(name: string): boolean {
    if (this.variables.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  getVariables(): Record<string, SerializedValue> {
    const result: Record<string, SerializedValue> = {};
    this.variables.forEach((entry, name) => {
      result[name] = serializeValue(entry.value);
    });
    return result;
  }
}

export function serializeValue(value: unknown): SerializedValue {
  if (value === null) return { type: "null", display: "null" };
  if (value === undefined) return { type: "undefined", display: "undefined" };
  if (typeof value === "number")
    return { type: "number", display: String(value) };
  if (typeof value === "string")
    return { type: "string", display: `"${value}"` };
  if (typeof value === "boolean")
    return { type: "boolean", display: String(value) };
  if (typeof value === "function" || (value && (value as Record<string, unknown>).__isFunction))
    return {
      type: "function",
      display: `fn(${(value as Record<string, unknown>).__name || "anonymous"})`,
    };
  if (Array.isArray(value)) {
    const items = value.slice(0, 5).map((v) => serializeValue(v).display);
    const suffix = value.length > 5 ? ", ..." : "";
    return { type: "array", display: `[${items.join(", ")}${suffix}]` };
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as object).slice(0, 4);
    const items = keys.map(
      (k) =>
        `${k}: ${serializeValue((value as Record<string, unknown>)[k]).display}`
    );
    const suffix = Object.keys(value as object).length > 4 ? ", ..." : "";
    return { type: "object", display: `{${items.join(", ")}${suffix}}` };
  }
  return { type: "undefined", display: String(value) };
}
