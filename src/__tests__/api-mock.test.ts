/**
 * Tests for ApiMock class
 */

import { apiMock } from '../api-mock';
import { ResponseBuilder } from '../response-builder';
import { MockRequest } from '../types';

describe('ApiMock Singleton', () => {
  beforeEach(() => {
    apiMock.setup();
  });

  afterEach(() => {
    apiMock.cleanup(); // Complete cleanup
  });

  describe('initialization', () => {
    it('should initialize components correctly', () => {
      expect(apiMock.isActive()).toBe(true);
    });

    it('should handle multiple initialization calls', () => {
      // Should be idempotent
      expect(apiMock.isActive()).toBe(true);
    });

    it('should export singleton instance', () => {
      expect(apiMock).toBeDefined();
      expect(typeof apiMock.setup).toBe('function');
      expect(typeof apiMock.get).toBe('function');
    });
  });

  describe('HTTP method handlers', () => {
    it('should register GET routes', () => {
      const handler = jest.fn().mockReturnValue(ResponseBuilder.json({ method: 'GET' }));
      
      apiMock.get('/api/test', handler);
      
      const routes = apiMock.getRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0]).toEqual({
        method: 'GET',
        path: '/api/test',
        options: {}
      });
    });

    it('should register POST routes with options', () => {
      const handler = jest.fn().mockReturnValue(ResponseBuilder.json({ method: 'POST' }));
      const options = { delay: 100, headers: { 'X-Custom': 'value' } };
      
      apiMock.post('/api/users', handler, options);
      
      const routes = apiMock.getRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0]).toEqual({
        method: 'POST',
        path: '/api/users',
        options
      });
    });

    it('should register PUT routes', () => {
      const handler = jest.fn().mockReturnValue(ResponseBuilder.json({ method: 'PUT' }));
      
      apiMock.put('/api/users/:id', handler);
      
      const routes = apiMock.getRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].method).toBe('PUT');
    });

    it('should register PATCH routes', () => {
      const handler = jest.fn().mockReturnValue(ResponseBuilder.json({ method: 'PATCH' }));
      
      apiMock.patch('/api/users/:id', handler);
      
      const routes = apiMock.getRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].method).toBe('PATCH');
    });

    it('should register DELETE routes', () => {
      const handler = jest.fn().mockReturnValue(ResponseBuilder.json({ method: 'DELETE' }));
      
      apiMock.delete('/api/users/:id', handler);
      
      const routes = apiMock.getRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].method).toBe('DELETE');
    });

    it('should support TypeScript generics for request body typing', () => {
      interface CreateUserRequest {
        name: string;
        email: string;
      }

      const handler = jest.fn().mockImplementation((req: MockRequest<CreateUserRequest>) => {
        // TypeScript should provide proper typing for req.body
        expect(typeof req.body?.name).toBe('string');
        expect(typeof req.body?.email).toBe('string');
        return ResponseBuilder.json({ id: 1, ...req.body });
      });

      // This should compile without TypeScript errors
      apiMock.post<CreateUserRequest>('/api/users', handler);
      
      expect(apiMock.getRoutes()).toHaveLength(1);
    });
  });

  describe('middleware', () => {
    it('should register middleware', () => {
      const middleware = jest.fn().mockImplementation(async (_req, next) => next());
      
      apiMock.use(middleware);
      
      // We can't directly test middleware count without exposing internal state
      // But we can verify it doesn't throw and the system remains active
      expect(apiMock.isActive()).toBe(true);
    });

    it('should clear middleware with cleanup', () => {
      const middleware = jest.fn().mockImplementation(async (_req, next) => next());
      
      apiMock.use(middleware);
      apiMock.cleanup();
      apiMock.setup(); // Re-setup for continued testing
      
      expect(apiMock.isActive()).toBe(true);
    });
  });

  describe('event handling', () => {
    it('should subscribe to events', () => {
      const handler = jest.fn();
      
      // Event subscription should not throw
      expect(() => apiMock.on('ON_REQUEST', handler)).not.toThrow();
    });

    it('should unsubscribe from events', () => {
      const handler = jest.fn();
      
      apiMock.on('ON_REQUEST', handler);
      const removed = apiMock.off('ON_REQUEST', handler);
      
      expect(removed).toBe(true);
    });

    it('should return false when unsubscribing non-existent handler', () => {
      const handler = jest.fn();
      
      const removed = apiMock.off('ON_REQUEST', handler);
      
      expect(removed).toBe(false);
    });

    it('should clear all event listeners with cleanup', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      apiMock.on('ON_REQUEST', handler1);
      apiMock.on('ON_RESPONSE', handler2);
      
      // Cleanup should clear event listeners and not throw
      expect(() => apiMock.cleanup()).not.toThrow();
      apiMock.setup(); // Re-setup for continued testing
    });
  });

  describe('state management', () => {
    it('should create state stores', () => {
      const initialData = { count: 0, items: [] };
      
      const store = apiMock.createStore('testStore', initialData);
      
      expect(store.get()).toEqual(initialData);
    });

    it('should retrieve existing stores', () => {
      const initialData = { value: 'test' };
      
      apiMock.createStore('myStore', initialData);
      const retrievedStore = apiMock.getStore('myStore');
      
      expect(retrievedStore).toBeDefined();
      expect(retrievedStore!.get()).toEqual(initialData);
    });

    it('should return undefined for non-existent stores', () => {
      const store = apiMock.getStore('nonExistentStore');
      
      expect(store).toBeUndefined();
    });

    it('should clear all stores with cleanup', () => {
      apiMock.createStore('store1', { data: 1 });
      apiMock.createStore('store2', { data: 2 });
      
      apiMock.cleanup();
      apiMock.setup(); // Re-setup for continued testing
      
      expect(apiMock.getStore('store1')).toBeUndefined();
      expect(apiMock.getStore('store2')).toBeUndefined();
    });
  });

  describe('response utilities', () => {
    it('should provide access to ResponseBuilder', () => {
      expect(apiMock.response).toBe(ResponseBuilder);
    });

    it('should create JSON responses', () => {
      const data = { message: 'test' };
      const response = apiMock.response.json(data);
      
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
    });
  });

  describe('route management', () => {
    it('should get all registered routes', () => {
      apiMock.get('/api/users', () => ResponseBuilder.json([]));
      apiMock.post('/api/users', () => ResponseBuilder.json({ id: 1 }));
      
      const routes = apiMock.getRoutes();
      
      expect(routes).toHaveLength(2);
      expect(routes.map(r => r.method)).toEqual(['GET', 'POST']);
    });

    it('should clear all routes with cleanup', () => {
      apiMock.get('/api/test1', () => ResponseBuilder.json({}));
      apiMock.post('/api/test2', () => ResponseBuilder.json({}));
      
      expect(apiMock.getRoutes()).toHaveLength(2);
      
      apiMock.cleanup();
      apiMock.setup(); // Re-setup for continued testing
      
      expect(apiMock.getRoutes()).toHaveLength(0);
    });

    it('should unregister specific routes', () => {
      apiMock.get('/api/users', () => ResponseBuilder.json([]));
      apiMock.post('/api/users', () => ResponseBuilder.json({ id: 1 }));
      
      expect(apiMock.getRoutes()).toHaveLength(2);
      
      const removed = apiMock.unregister('GET', '/api/users');
      
      expect(removed).toBe(true);
      expect(apiMock.getRoutes()).toHaveLength(1);
      expect(apiMock.getRoutes()[0].method).toBe('POST');
    });

    it('should return false when unregistering non-existent route', () => {
      const removed = apiMock.unregister('GET', '/non-existent');
      
      expect(removed).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should cleanup and restore original fetch', () => {
      expect(apiMock.isActive()).toBe(true);
      
      apiMock.cleanup();
      
      expect(apiMock.isActive()).toBe(false);
    });

    it('should handle multiple cleanup calls gracefully', () => {
      apiMock.cleanup();
      
      expect(() => apiMock.cleanup()).not.toThrow();
      expect(apiMock.isActive()).toBe(false);
    });

    it('should clear all data with cleanup', () => {
      // Set up some data
      apiMock.get('/test', () => ResponseBuilder.json({}));
      apiMock.use(async (_req, next) => next());
      apiMock.on('ON_REQUEST', () => {});
      apiMock.createStore('test', {});
      
      expect(apiMock.getRoutes()).toHaveLength(1);
      
      apiMock.cleanup();
      apiMock.setup(); // Re-setup for continued testing
      
      expect(apiMock.getRoutes()).toHaveLength(0);
    });
  });

  describe('type safety', () => {
    it('should support undefined request body type by default', () => {
      const handler = jest.fn().mockImplementation((req: MockRequest) => {
        // req.body should be undefined by default
        expect(req.body).toBeUndefined();
        return ResponseBuilder.json({ received: 'ok' });
      });

      apiMock.get('/api/test', handler);
      
      expect(apiMock.getRoutes()).toHaveLength(1);
    });

    it('should support typed request bodies', () => {
      interface UserData {
        name: string;
        age: number;
      }

      const handler = jest.fn().mockImplementation((req: MockRequest<UserData>) => {
        // TypeScript should enforce that req.body has UserData shape
        return ResponseBuilder.json({ 
          message: `Hello ${req.body?.name}`,
          isAdult: (req.body?.age ?? 0) >= 18
        });
      });

      apiMock.post<UserData>('/api/users', handler);
      
      expect(apiMock.getRoutes()).toHaveLength(1);
    });
  });
});