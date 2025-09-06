/**
 * Tests for StateStore and StateStoreManager
 */

import { StateStore, StateStoreManager } from '../state-store';

describe('StateStore', () => {
  describe('basic operations', () => {
    it('should initialize with initial data', () => {
      const initialData = { count: 0, items: [] };
      const store = new StateStore(initialData);

      expect(store.get()).toEqual(initialData);
    });

    it('should set new data', () => {
      const store = new StateStore({ count: 0 });
      const newData = { count: 5 };

      store.set(newData);

      expect(store.get()).toEqual(newData);
    });

    it('should update data using updater function via set method', () => {
      const store = new StateStore({ count: 0, name: 'test' });

      store.set(current => ({ ...current, count: current.count + 1 }));

      expect(store.get()).toEqual({ count: 1, name: 'test' });
    });

    it('should handle both direct data and updater functions in set method', () => {
      const store = new StateStore({ count: 0, name: 'test' });

      // Test direct data assignment
      store.set({ count: 5, name: 'direct' });
      expect(store.get()).toEqual({ count: 5, name: 'direct' });

      // Test updater function
      store.set(current => ({ ...current, count: current.count * 2 }));
      expect(store.get()).toEqual({ count: 10, name: 'direct' });
    });

    it('should reset to new initial data using set method', () => {
      const store = new StateStore({ count: 0 });
      store.set({ count: 10 });

      store.set({ count: 5 });

      expect(store.get()).toEqual({ count: 5 });
    });
  });

  describe('type safety', () => {
    it('should maintain type safety with generics', () => {
      interface User {
        id: number;
        name: string;
      }

      const store = new StateStore<User>({ id: 1, name: 'John' });
      
      // This should compile without issues
      store.set(user => ({ ...user, name: 'Jane' }));
      
      const user = store.get();
      expect(user.name).toBe('Jane');
      expect(user.id).toBe(1);
    });
  });

  describe('array operations', () => {
    it('should handle array state updates', () => {
      const store = new StateStore<number[]>([1, 2, 3]);

      store.set(items => [...items, 4]);

      expect(store.get()).toEqual([1, 2, 3, 4]);
    });
  });

  describe('readonly protection', () => {
    it('should prevent direct mutation of object state', () => {
      const store = new StateStore({ count: 0, name: 'test' });
      const state = store.get();

      expect(() => {
        (state as any).count = 5;
      }).toThrow('Cannot modify readonly state. Use set() method to update state.');
    });

    it('should prevent direct mutation of array state', () => {
      const store = new StateStore([1, 2, 3]);
      const state = store.get();

      expect(() => {
        (state as any).push(4);
      }).toThrow('Cannot modify readonly state. Use set() method to update state.');
    });

    it('should prevent deletion of properties', () => {
      const store = new StateStore({ count: 0, name: 'test' });
      const state = store.get();

      expect(() => {
        delete (state as any).count;
      }).toThrow('Cannot modify readonly state. Use set() method to update state.');
    });

    it('should prevent mutation of nested objects', () => {
      const store = new StateStore({ 
        user: { id: 1, name: 'John' },
        settings: { theme: 'dark' }
      });
      const state = store.get();

      expect(() => {
        (state.user as any).name = 'Jane';
      }).toThrow('Cannot modify readonly state. Use set() method to update state.');
    });

    it('should prevent mutation of nested arrays', () => {
      const store = new StateStore({ 
        items: [1, 2, 3],
        tags: ['a', 'b']
      });
      const state = store.get();

      expect(() => {
        (state.items as any).push(4);
      }).toThrow('Cannot modify readonly state. Use set() method to update state.');
    });

    it('should allow reading values without issues', () => {
      const store = new StateStore({ 
        count: 5, 
        user: { name: 'John' },
        items: [1, 2, 3]
      });
      const state = store.get();

      expect(state.count).toBe(5);
      expect(state.user.name).toBe('John');
      expect(state.items[0]).toBe(1);
      expect(state.items.length).toBe(3);
    });
  });
});

describe('StateStoreManager', () => {
  let manager: StateStoreManager;

  beforeEach(() => {
    manager = new StateStoreManager();
  });

  describe('createStore()', () => {
    it('should create and return a new store', () => {
      const initialData = { users: [] };
      
      const store = manager.createStore('users', initialData);

      expect(store).toBeInstanceOf(StateStore);
      expect(store.get()).toEqual(initialData);
    });

    it('should store the created store for later retrieval', () => {
      const initialData = { count: 0 };
      
      manager.createStore('counter', initialData);
      const retrievedStore = manager.getStore('counter');

      expect(retrievedStore).toBeDefined();
      expect(retrievedStore!.get()).toEqual(initialData);
    });
  }); 
 describe('getStore()', () => {
    it('should return existing store', () => {
      const initialData = { items: ['a', 'b'] };
      const createdStore = manager.createStore('items', initialData);
      
      const retrievedStore = manager.getStore('items');

      expect(retrievedStore).toBe(createdStore);
    });

    it('should return undefined for non-existent store', () => {
      const store = manager.getStore('nonexistent');

      expect(store).toBeUndefined();
    });
  });

  describe('hasStore()', () => {
    it('should return true for existing store', () => {
      manager.createStore('test', {});

      expect(manager.hasStore('test')).toBe(true);
    });

    it('should return false for non-existent store', () => {
      expect(manager.hasStore('nonexistent')).toBe(false);
    });
  });

  describe('deleteStore()', () => {
    it('should delete existing store and return true', () => {
      manager.createStore('test', {});

      const result = manager.deleteStore('test');

      expect(result).toBe(true);
      expect(manager.hasStore('test')).toBe(false);
    });

    it('should return false for non-existent store', () => {
      const result = manager.deleteStore('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('clearAll()', () => {
    it('should remove all stores', () => {
      manager.createStore('store1', {});
      manager.createStore('store2', {});

      manager.clearAll();

      expect(manager.hasStore('store1')).toBe(false);
      expect(manager.hasStore('store2')).toBe(false);
      expect(manager.getStoreKeys()).toHaveLength(0);
    });
  });

  describe('getStoreKeys()', () => {
    it('should return all store keys', () => {
      manager.createStore('users', []);
      manager.createStore('posts', []);
      manager.createStore('comments', []);

      const keys = manager.getStoreKeys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain('users');
      expect(keys).toContain('posts');
      expect(keys).toContain('comments');
    });

    it('should return empty array when no stores exist', () => {
      const keys = manager.getStoreKeys();

      expect(keys).toEqual([]);
    });
  });

  describe('store independence', () => {
    it('should maintain independent state between stores', () => {
      const store1 = manager.createStore('store1', { value: 1 });
      const store2 = manager.createStore('store2', { value: 2 });

      store1.set(data => ({ value: data.value + 10 }));

      expect(store1.get().value).toBe(11);
      expect(store2.get().value).toBe(2);
    });
  });
});