export type Context<T> = {} & T;

let _currentContext: Context<any> = {};
export const context = {
  get current(): Context<any> {
    return _currentContext;
  },

  switchTo(context: Context<any>) {
    _currentContext = context;
  },

  createAndSwitchTo<T extends Object>(props: T): Context<T> {
    const newContext = Object.create(context.current);
    context.switchTo(Object.assign(newContext, props));
    return context.current;
  },

  pop() {
    const parent = Object.getPrototypeOf(context.current);
    context.switchTo(parent);
  },
};
