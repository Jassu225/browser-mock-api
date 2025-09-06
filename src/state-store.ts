/**
 * State Store for stateful mocking
 */

export class StateStore<T extends object> {
  private data: T;

  constructor(initialData: T) {
    this.data = initialData;
  }

  /**
   * Get the current state as a readonly proxy
   */
  get(): Readonly<T> {
    return this.createReadonlyProxy(this.data);
  }

  /**
   * Create a readonly proxy that prevents mutations
   */
  private createReadonlyProxy<U>(obj: U): Readonly<U> {
    if (obj === null || typeof obj !== "object") {
      return obj as Readonly<U>;
    }

    const createProxy = (target: any): any => {
      return new Proxy(target, {
        set() {
          throw new Error(
            "Cannot modify readonly state. Use set() method to update state."
          );
        },
        deleteProperty() {
          throw new Error(
            "Cannot modify readonly state. Use set() method to update state."
          );
        },
        get: (proxyTarget, prop) => {
          const value = proxyTarget[prop];
          if (typeof value === "object" && value !== null) {
            return createProxy(value);
          }
          return value;
        },
      });
    };

    return createProxy(obj) as Readonly<U>;
  }

  /**
   * Set the entire state or update using an updater function
   */
  set(dataOrUpdater: T | ((current: T) => T)): void {
    if (typeof dataOrUpdater === "function") {
      this.data = dataOrUpdater(this.data);
    } else {
      this.data = dataOrUpdater;
    }
  }
}

export class StateStoreManager {
  private stores: Map<string, StateStore<any>>;

  constructor() {
    this.stores = new Map();
  }

  /**
   * Create a new state store with the given key and initial data
   */
  createStore<T extends object>(key: string, initialData: T): StateStore<T> {
    if (this.hasStore(key)) {
      console.warn(
        `Store with the key ${key} already exists. Ignoring initialData.`
      );
      return this.stores.get(key) as StateStore<T>;
    }
    const store = new StateStore(initialData);
    this.stores.set(key, store);
    return store;
  }

  /**
   * Get an existing store by key
   */
  getStore<T extends object>(key: string): StateStore<T> | undefined {
    return this.stores.get(key) as StateStore<T> | undefined;
  }

  /**
   * Check if a store exists
   */
  hasStore(key: string): boolean {
    return this.stores.has(key);
  }

  /**
   * Delete a store
   */
  deleteStore(key: string): boolean {
    return this.stores.delete(key);
  }

  /**
   * Clear all stores
   */
  clearAll(): void {
    this.stores.clear();
  }

  /**
   * Get all store keys
   */
  getStoreKeys(): string[] {
    return Array.from(this.stores.keys());
  }
}
