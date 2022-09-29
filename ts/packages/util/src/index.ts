export { staticImplements } from "./static.js";

export function assertUnreachable(x: never): never {
  throw new Error("Didn't expect to get here");
}

export function invariant(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const hexReg = /^[0-9A-Fa-f]+$/;
export function isHex(h: string) {
  return hexReg.exec(h) != null;
}

export function noop() {}

export function assert(condition: boolean) {
  if (!condition) {
    throw new Error("Assertion failed");
  }
}

export function upcaseAt(str: string, i: number) {
  return str.substr(0, i) + str.substr(i, 1).toUpperCase() + str.substr(i + 1);
}

export function lowercaseAt(str: string, i: number) {
  return (
    str.substring(0, i) +
    str.substring(i, 1).toLowerCase() +
    str.substring(i + 1)
  );
}

export type Concat<T, S, V> = string;

export function falsish(x: any): boolean {
  return !!x === false;
}

export function isValidPropertyAccessor(a: string): boolean {
  return (a.match(/[A-z_$]+[A-z0-9_$]*/) || [])[0] === a;
}

export function not(x: any) {
  return !x;
}

export function asPropertyAccessor(a: string): string {
  return isValidPropertyAccessor(a) ? a : `'${a}'`;
}
