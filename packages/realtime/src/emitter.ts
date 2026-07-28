// A minimal event emitter with the bind/unbind vocabulary the SDK exposes on
// connections and channels. `bindGlobal` receives every event (name + data),
// which the client uses to fan events out to bindings by name.

export type Handler = (data?: unknown, event?: string) => void;

export class Emitter {
  private handlers = new Map<string, Set<Handler>>();
  private global = new Set<Handler>();

  bind<T = unknown>(
    event: string,
    handler: (data: T, event?: string) => void,
  ): this {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler);
    return this;
  }

  unbind(
    event?: string,
    handler?: (data: never, event?: string) => void,
  ): this {
    if (event === undefined) {
      this.handlers.clear();
      return this;
    }
    const set = this.handlers.get(event);
    if (!set) return this;
    if (handler === undefined) {
      this.handlers.delete(event);
    } else {
      set.delete(handler as Handler);
      if (set.size === 0) this.handlers.delete(event);
    }
    return this;
  }

  bindGlobal(handler: Handler): this {
    this.global.add(handler);
    return this;
  }

  unbindGlobal(handler?: Handler): this {
    if (handler === undefined) this.global.clear();
    else this.global.delete(handler);
    return this;
  }

  emit(event: string, data?: unknown): void {
    const set = this.handlers.get(event);
    if (set) for (const h of [...set]) h(data, event);
    for (const h of [...this.global]) h(data, event);
  }
}
