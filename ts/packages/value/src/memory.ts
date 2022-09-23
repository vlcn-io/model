export type MemoryVersion = number;
let version: MemoryVersion = Number.MIN_SAFE_INTEGER;

export const memory = Object.freeze({
  MIN_VERSION: Number.MAX_SAFE_INTEGER,

  get version() {
    return version;
  },

  nextVersion() {
    return ++version;
  },
});
