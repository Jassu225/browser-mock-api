/**
 * Integration tests for complete request/response flow
 */

import { apiMock } from '../api-mock';
import { ResponseBuilder } from '../response-builder';
import { MockRequest } from '../types';

describe('Integration Tests - Complete Request/Response Flow', () => {
  beforeEach(() => {
    apiMock.setup();
  });

  afterEach(() => {
    apiMock.cleanup(); // Complete cleanup
  });

  describe('End-to-End Mock Request Flow', () => {
    it('should handle complete mock request lifecycle with all components', async () => {
      const events: string[] = [];
      let capturedRequest: MockRequest | undefined;
      let capturedResponse: Response | undefined;

      // Set up event listeners to track lifecycle
      apiMock.on('ON_REQUEST', (_req: MockRequest) => {
        events.push('ON_REQUEST');
      });

      apiMock.on('ON_MOCK', (req: MockRequest) => {
        events.push('ON_MOCK');
        capturedRequest = req; // Capture request with populated params
      });

      apiMock.on('ON_RESPONSE', (_req: MockRequest, res: Response) => {
        events.push('ON_RESPONSE');
        capturedResponse = res;
      });

      // Set up middleware
      let middlewareExecuted = false;
      apiMock.use(async (_req, next) => {
        middlewareExecuted = true;
        // Add custom header via middleware
        const response = await next();
        response.headers.set('X-Middleware', 'executed');
        return response;
      });

      // Set up mock endpoint with delay
      apiMock.get('/api/users/:id', (req) => {
        return ResponseBuilder.json({
          id: req.params.id,
          name: 'John Doe',
          query: req.query
        });
      }, { delay: 50 });

      const startTime = Date.now();

      // Make the request
      const response = await fetch('/api/users/123?page=1&limit=10');
      const data = await response.json();

      const elapsed = Date.now() - startTime;

      // Verify complete flow
      expect(events).toEqual(['ON_REQUEST', 'ON_MOCK', 'ON_RESPONSE']);
      expect(middlewareExecuted).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some margin for delay

      // Verify request parsing
      expect(capturedRequest).toBeDefined();
      expect(capturedRequest!.method).toBe('GET');
      expect(capturedRequest!.path).toBe('/api/users/123');
      expect(capturedRequest!.params).toEqual({ id: '123' });
      expect(capturedRequest!.query).toEqual({ page: '1', limit: '10' });

      // Verify response
      expect(capturedResponse).toBeDefined();
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Middleware')).toBe('executed');
      expect(data).toEqual({
        id: '123',
        name: 'John Doe',
        query: { page: '1', limit: '10' }
      });
    });

    it('should handle POST requests with typed request bodies', async () => {
      interface CreateUserRequest {
        name: string;
        email: string;
        age: number;
      }

      let receivedBody: CreateUserRequest | undefined;

      apiMock.post<CreateUserRequest>('/api/users', (req) => {
        receivedBody = req.body;
        return ResponseBuilder.json({
          id: 1,
          ...req.body,
          createdAt: new Date().toISOString()
        }, { status: 201 });
      });

      const userData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        age: 25
      };

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const result = await response.json();

      expect(response.status).toBe(201);
      expect(receivedBody).toEqual(userData);
      expect(result.name).toBe(userData.name);
      expect(result.email).toBe(userData.email);
      expect(result.age).toBe(userData.age);
      expect(result.id).toBe(1);
      expect(result.createdAt).toBeDefined();
    });

    it('should handle middleware that returns early response', async () => {
      const events: string[] = [];

      apiMock.on('ON_REQUEST', () => events.push('ON_REQUEST'));
      apiMock.on('ON_MOCK', () => events.push('ON_MOCK'));
      apiMock.on('ON_RESPONSE', () => events.push('ON_RESPONSE'));

      // Middleware that returns early for unauthorized requests
      apiMock.use(async (req, next) => {
        if (!req.headers.authorization) {
          return ResponseBuilder.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
        return next();
      });

      // This handler should not be called
      const handler = jest.fn().mockReturnValue(
        ResponseBuilder.json({ success: true })
      );
      apiMock.get('/api/protected', handler);

      // Request without authorization header
      const response = await fetch('/api/protected');
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
      expect(handler).not.toHaveBeenCalled();
      expect(events).toEqual(['ON_REQUEST', 'ON_MOCK', 'ON_RESPONSE']);
    });

    it('should handle multiple middleware in correct order', async () => {
      const executionOrder: string[] = [];

      apiMock.use(async (_req, next) => {
        executionOrder.push('middleware1-start');
        const response = await next();
        executionOrder.push('middleware1-end');
        return response;
      });

      apiMock.use(async (_req, next) => {
        executionOrder.push('middleware2-start');
        const response = await next();
        executionOrder.push('middleware2-end');
        return response;
      });

      apiMock.get('/api/test', (_req) => {
        executionOrder.push('handler');
        return ResponseBuilder.json({ test: true });
      });

      await fetch('/api/test');

      expect(executionOrder).toEqual([
        'middleware1-start',
        'middleware2-start',
        'handler',
        'middleware2-end',
        'middleware1-end'
      ]);
    });

    it('should handle stateful mocking across multiple requests', async () => {
      interface User {
        id: number;
        name: string;
      }

      const userStore = apiMock.createStore<User[]>('users', []);

      // GET /api/users - list users
      apiMock.get('/api/users', (_req) => {
        const users = userStore.get();
        return ResponseBuilder.json(users);
      });

      // POST /api/users - create user
      apiMock.post<{ name: string }>('/api/users', (req) => {
        const users = userStore.get();
        const newUser: User = {
          id: users.length + 1,
          name: req.body?.name || 'Unknown'
        };
        userStore.set(current => [...current, newUser]);
        return ResponseBuilder.json(newUser, { status: 201 });
      });

      // Initially empty
      let response = await fetch('/api/users');
      let users = await response.json();
      expect(users).toEqual([]);

      // Create first user
      response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Alice' })
      });
      const user1 = await response.json();
      expect(user1).toEqual({ id: 1, name: 'Alice' });

      // Create second user
      response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bob' })
      });
      const user2 = await response.json();
      expect(user2).toEqual({ id: 2, name: 'Bob' });

      // List users should now show both
      response = await fetch('/api/users');
      users = await response.json();
      expect(users).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle middleware errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Middleware that throws an error
      apiMock.use(async (_req, _next) => {
        throw new Error('Middleware error');
      });

      // This should still be called despite middleware error
      const handler = jest.fn().mockReturnValue(
        ResponseBuilder.json({ success: true })
      );
      apiMock.get('/api/test', handler);

      const response = await fetch('/api/test');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(handler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Middleware error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle handler errors gracefully', async () => {
      apiMock.get('/api/error', (_req) => {
        throw new Error('Handler error');
      });

      // Should not throw, but may return error response or forward to original fetch
      await expect(fetch('/api/error')).resolves.toBeDefined();
    });

    it('should handle invalid JSON in request body', async () => {
      let receivedBody: any;

      apiMock.post('/api/test', (req) => {
        receivedBody = req.body;
        return ResponseBuilder.json({ received: 'ok' });
      });

      // Send invalid JSON
      const response = await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {'
      });

      expect(response.status).toBe(200);
      expect(receivedBody).toBeUndefined(); // Should handle gracefully
    });

    it('should handle requests with no body', async () => {
      let receivedBody: any;

      apiMock.get('/api/test', (req) => {
        receivedBody = req.body;
        return ResponseBuilder.json({ received: 'ok' });
      });

      const response = await fetch('/api/test');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(receivedBody).toBeUndefined();
      expect(data).toEqual({ received: 'ok' });
    });
  });

  describe('Network Forwarding', () => {
    it('should forward unmatched requests to original fetch', async () => {
      const events: string[] = [];
      const mockResponse = ResponseBuilder.json({ fromNetwork: true });
      const mockFetch = jest.fn().mockResolvedValue(mockResponse);
      
      // Clean first
      apiMock.cleanup();
      
      // Mock original fetch before setup
      global.fetch = mockFetch;
      
      // Setup ApiMock with mocked fetch
      apiMock.setup();

      apiMock.on('ON_REQUEST', () => events.push('ON_REQUEST'));
      apiMock.on('ON_NETWORK', () => events.push('ON_NETWORK'));
      apiMock.on('ON_RESPONSE', () => events.push('ON_RESPONSE'));

      // Register a different route
      apiMock.get('/api/mocked', () => ResponseBuilder.json({ mocked: true }));

      // Request unmatched route
      const response = await fetch('/api/unmocked');

      expect(events).toEqual(['ON_REQUEST', 'ON_NETWORK', 'ON_RESPONSE']);
      expect(mockFetch).toHaveBeenCalledWith('/api/unmocked', undefined);
      expect(response).toBe(mockResponse);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      apiMock.get('/api/users/:id', (req) => {
        return ResponseBuilder.json({ id: req.params.id });
      });

      // Make 10 concurrent requests
      const promises = Array.from({ length: 10 }, (_, i) =>
        fetch(`/api/users/${i + 1}`)
      );

      const responses = await Promise.all(promises);
      const data = await Promise.all(responses.map(r => r.json()));

      expect(responses).toHaveLength(10);
      expect(data).toEqual(
        Array.from({ length: 10 }, (_, i) => ({ id: `${i + 1}` }))
      );
    });

    it('should handle large number of registered routes efficiently', async () => {
      // Register 100 routes
      for (let i = 0; i < 100; i++) {
        apiMock.get(`/api/route${i}`, () => 
          ResponseBuilder.json({ route: i })
        );
      }

      // Test first and last routes
      const response1 = await fetch('/api/route0');
      const data1 = await response1.json();
      expect(data1).toEqual({ route: 0 });

      const response99 = await fetch('/api/route99');
      const data99 = await response99.json();
      expect(data99).toEqual({ route: 99 });
    });
  });
});