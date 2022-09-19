// Pulled from OpenTelemetry -- https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-context-zone
// -- https://github.com/open-telemetry/opentelemetry-js-api/tree/main/src/context

/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

interface Context {
  /**
   * Get a value from the context.
   *
   * @param key key which identifies a context value
   */
  getValue(key: symbol): unknown;

  /**
   * Create a new context which inherits from this context and has
   * the given key set to the given value.
   *
   * @param key context key for which to set the value
   * @param value value to set for the given key
   */
  setValue(key: symbol, value: unknown): Context;

  /**
   * Return a new context which inherits from this context but does
   * not contain a value for the given key.
   *
   * @param key context key for which to clear a value
   */
  deleteValue(key: symbol): Context;
}

export class BaseContext implements Context {
  private _currentContext!: Map<symbol, unknown>;

  /**
   * Construct a new context which inherits values from an optional parent context.
   *
   * @param parentContext a context from which to inherit values
   */
  constructor(parentContext?: Map<symbol, unknown>) {
    // for minification
    const self = this;

    self._currentContext = parentContext ? new Map(parentContext) : new Map();

    self.getValue = (key: symbol) => self._currentContext.get(key);

    self.setValue = (key: symbol, value: unknown): Context => {
      const context = new BaseContext(self._currentContext);
      context._currentContext.set(key, value);
      return context;
    };

    self.deleteValue = (key: symbol): Context => {
      const context = new BaseContext(self._currentContext);
      context._currentContext.delete(key);
      return context;
    };
  }

  /**
   * Get a value from the context.
   *
   * @param key key which identifies a context value
   */
  public getValue!: (key: symbol) => unknown;

  /**
   * Create a new context which inherits from this context and has
   * the given key set to the given value.
   *
   * @param key context key for which to set the value
   * @param value value to set for the given key
   */
  public setValue!: (key: symbol, value: unknown) => Context;

  /**
   * Return a new context which inherits from this context but does
   * not contain a value for the given key.
   *
   * @param key context key for which to clear a value
   */
  public deleteValue!: (key: symbol) => Context;
}

/* Key name to be used to save a context reference in Zone */
const ZONE_CONTEXT_KEY = "ACID_MEM_ZONE_CONTEXT";
const ROOT_CONTEXT: Context = new BaseContext();

/**
 * ZoneContextManager
 * This module provides an easy functionality for tracing action between asynchronous operations in web.
 * It was not possible with standard [StackContextManager]{@link https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-web/src/StackContextManager.ts}.
 * It heavily depends on [zone.js]{@link https://www.npmjs.com/package/zone.js}.
 * It stores the information about context in zone. Each Context will have always new Zone;
 * It also supports binding a certain Span to a target that has "addEventListener" and "removeEventListener".
 * When this happens a new zone is being created and the provided Span is being assigned to this zone.
 */
export class ZoneContextManager {
  /**
   * whether the context manager is enabled or not
   */
  private _enabled = false;

  /**
   * Helps to create a unique name for the zones - part of zone name
   */
  private _zoneCounter = 0;

  /**
   * Returns the active context from certain zone name
   * @param activeZone
   */
  private _activeContextFromZone(activeZone: Zone | undefined): Context {
    return (activeZone && activeZone.get(ZONE_CONTEXT_KEY)) || ROOT_CONTEXT;
  }

  /**
   * @param context A context (span) to be executed within target function
   * @param target Function to be executed within the context
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  private _bindFunction<T extends Function>(context: Context, target: T): T {
    const manager = this;
    const contextWrapper = function (this: unknown, ...args: unknown[]) {
      return manager.with(context, () => target.apply(this, args));
    };
    Object.defineProperty(contextWrapper, "length", {
      enumerable: false,
      configurable: true,
      writable: false,
      value: target.length,
    });
    return contextWrapper as unknown as T;
  }

  /**
   * Creates a new unique zone name
   */
  private _createZoneName() {
    this._zoneCounter++;
    const random = Math.random();
    return `${this._zoneCounter}-${random}`;
  }

  /**
   * Creates a new zone
   * @param zoneName zone name
   * @param context A context (span) to be bind with Zone
   */
  private _createZone(zoneName: string, context: unknown): Zone {
    return Zone.current.fork({
      name: zoneName,
      properties: {
        [ZONE_CONTEXT_KEY]: context,
      },
    });
  }

  /**
   * Returns the active zone
   */
  private _getActiveZone(): Zone | undefined {
    return Zone.current;
  }

  /**
   * Returns the active context
   */
  active(): Context {
    if (!this._enabled) {
      return ROOT_CONTEXT;
    }
    const activeZone = this._getActiveZone();

    const active = this._activeContextFromZone(activeZone);
    if (active) {
      return active;
    }

    return ROOT_CONTEXT;
  }

  /**
   * Disable the context manager (clears all the contexts)
   */
  disable(): this {
    this._enabled = false;
    return this;
  }

  /**
   * Enables the context manager and creates a default(root) context
   */
  enable(): this {
    this._enabled = true;
    return this;
  }

  /**
   * Calls the callback function [fn] with the provided [context].
   *     If [context] is undefined then it will use the active context.
   *     The context will be set as active
   * @param context A context (span) to be called with provided callback
   * @param fn Callback function
   * @param thisArg optional receiver to be used for calling fn
   * @param args optional arguments forwarded to fn
   */
  with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
    context: Context | null,
    fn: F,
    thisArg?: ThisParameterType<F>,
    ...args: A
  ): ReturnType<F> {
    const zoneName = this._createZoneName();

    const newZone = this._createZone(zoneName, context);

    return newZone.run(fn, thisArg, args);
  }
}
