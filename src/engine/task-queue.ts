import type { QueueEntry } from "./types";

export class TaskQueue {
  private items: QueueEntry[] = [];

  enqueue(entry: QueueEntry) {
    this.items.push(entry);
  }

  dequeue(): QueueEntry | undefined {
    return this.items.shift();
  }

  peek(): QueueEntry | undefined {
    return this.items[0];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  toArray(): QueueEntry[] {
    return [...this.items];
  }

  clear() {
    this.items = [];
  }
}
