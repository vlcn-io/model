import { MemoryVersion } from "./memory.js";
import { inflight, Transaction } from "./transaction.js";

type Node<T> = {
  memVers: MemoryVersion;
  data: T;
};

export class History<T> {
  // most recent things are at the end
  private nodes: Node<T>[] = [];

  at(memVers: MemoryVersion): T {
    for (let i = this.nodes.length - 1; i > -1; --i) {
      const node = this.nodes[i];
      if (node.memVers < memVers) {
        return node.data;
      }
    }

    throw new Error("Could not find any data for version " + memVers);
  }

  maybeAdd(data: T, memoryVersion: MemoryVersion): void {
    if (inflight.length === 0) {
      if (this.nodes.length > 0) {
        this.nodes = [];
      }

      return;
    }

    this.nodes.push({
      memVers: memoryVersion,
      data,
    });

    if (this.nodes.length > 3) {
      this.prune();
    }
  }

  private prune() {
    const oldestInflightVers = inflight[0].memoryVersion;

    let i = this.nodes.length - 1;
    for (; i > -1; --i) {
      const node = this.nodes[i];
      if (node.memVers < oldestInflightVers) {
        break;
      }
    }

    if (i !== -1) {
      this.nodes = this.nodes.slice(i);
    }
  }
}
