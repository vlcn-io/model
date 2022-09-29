// https://github.com/Microsoft/TypeScript/issues/13462#issuecomment-295685298

interface Type<T> {
  new (...args: any[]): T;
}

/* class decorator */
export function staticImplements<T>() {
  return (constructor: T) => {};
}
