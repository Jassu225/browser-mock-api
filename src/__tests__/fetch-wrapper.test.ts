/**
 * Tests for FetchWrapper
 */

import { FetchWrapper } from '../fetch-wrapper';
import { RouteMatcher } from '../route-matcher';
import { MiddlewarePipeline } from '../middleware-pipeline';
import { EventEmitter } from '../event-emitter';
import { ResponseBuilder } from '../response-builder';
import { MockRequest } from '../types';

describe('FetchWrapper', () => {
  let wrapper: FetchWrapper;
  let routeMatcher: RouteMatcher;
  let middlewarePipeline: MiddlewarePipeline;
  let eventEmitter: EventEmitter;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    routeMatcher = new RouteMatcher();
    middlewarePipeline = new MiddlewarePipeline();
    eventEmitter = new EventEmitter();
    wrapper = new FetchWrapper(routeMatcher, middlewarePipeline, eventEmitter);
    originalFetch = global.fetch;
  });

  afterEach(() => {
    wrapper.teardown();
    global.fetch = originalFetch;
  });

  describe('setup() and teardown()', () => {
    it('should replace global fetch on setup', () => {
      const originalGlobalFetch = globalThis.fetch;
      
      wrapper.setup();
      
      expect(globalThis.fetch).not.toBe(originalGlobalFetch);
      expect(wrapper.isActive()).toBe(true);
    });

    it('should restore original fetch on teardown', () => {
      const originalGlobalFetch = globalThis.fetch;
      
      wrapper.setup();
      wrapper.teardown();
      
      expect(globalThis.fetch).toBe(originalGlobalFetch);
      expect(wrapper.isActive()).toBe(false);
    });

    it('should handle multiple setup calls gracefully', () => {
      wrapper.setup();
      const fetchAfterFirstSetup = globalThis.fetch;
      
      wrapper.setup(); // Second call
      
      expect(globalThis.fetch).toBe(fetchAfterFirstSetup);
      expect(wrapper.isActive()).toBe(true);
    });

    it('should handle teardown without setup', () => {
      expect(() => wrapper.teardown()).not.toThrow();
      expect(wrapper.isActive()).toBe(false);
    });
  });

  describe('request interception', () => {
    beforeEach(() => {
      wrapper.setup();
    });

    it('should intercept and handle matched requests', async () => {
      const mockHandler = jest.fn().mockReturnValue(
        ResponseBuilder.json({ mocked: true })
      );
      
      routeMatcher.register('GET', '/api/test', mockHandler);

      const response = await fetch('/api/test');
      const data = await response.json();

      expect(mockHandler).toHaveBeenCalled();
      expect(data).toEqual({ mocked: true });
    });

    it('should forward unmatched requests to original fetch', async () => {
      const mockResponse = ResponseBuilder.json({ original: true });
      const originalFetchMock = jest.fn().mockResolvedValue(mockResponse);
      
      // Teardown current wrapper
      wrapper.teardown();
      
      // Mock fetch before creating new wrapper
      global.fetch = originalFetchMock;
      
      // Create new wrapper with mocked fetch
      wrapper = new FetchWrapper(routeMatcher, middlewarePipeline, eventEmitter);
      wrapper.setup();

      const response = await fetch('/unmatched/route');

      expect(originalFetchMock).toHaveBeenCalledWith('/unmatched/route', undefined);
      expect(response).toBe(mockResponse);
    });

    it('should emit events in correct order for matched requests', async () => {
      const events: string[] = [];
      
      eventEmitter.on('ON_REQUEST', () => events.push('ON_REQUEST'));
      eventEmitter.on('ON_MOCK', () => events.push('ON_MOCK'));
      eventEmitter.on('ON_RESPONSE', () => events.push('ON_RESPONSE'));
      
      routeMatcher.register('GET', '/api/test', () => 
        ResponseBuilder.json({ test: true })
      );

      await fetch('/api/test');

      expect(events).toEqual(['ON_REQUEST', 'ON_MOCK', 'ON_RESPONSE']);
    });

    it('should emit events in correct order for forwarded requests', async () => {
      const events: string[] = [];
      const mockFetch = jest.fn().mockResolvedValue(ResponseBuilder.json({}));
      
      wrapper.teardown();
      global.fetch = mockFetch;
      wrapper = new FetchWrapper(routeMatcher, middlewarePipeline, eventEmitter);
      wrapper.setup();
      
      eventEmitter.on('ON_REQUEST', () => events.push('ON_REQUEST'));
      eventEmitter.on('ON_NETWORK', () => events.push('ON_NETWORK'));
      eventEmitter.on('ON_RESPONSE', () => events.push('ON_RESPONSE'));

      await fetch('/unmatched');

      expect(events).toEqual(['ON_REQUEST', 'ON_NETWORK', 'ON_RESPONSE']);
    });

    it('should apply delay for matched requests', async () => {
      const startTime = Date.now();
      const delay = 100;
      
      routeMatcher.register('GET', '/api/delayed', 
        () => ResponseBuilder.json({ delayed: true }),
        { delay }
      );

      await fetch('/api/delayed');
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(delay - 10); // Allow small margin
    });

    it('should handle request parsing errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockFetch = jest.fn().mockResolvedValue(ResponseBuilder.json({}));
      
      wrapper.teardown();
      global.fetch = mockFetch;
      wrapper = new FetchWrapper(routeMatcher, middlewarePipeline, eventEmitter);
      wrapper.setup();

      // This should trigger error handling and forward to original fetch
      await fetch('invalid-url');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in fetch wrapper, forwarding to original fetch:',
        expect.objectContaining({
          name: 'TypeError',
          message: expect.stringContaining('Invalid URL')
        })
      );
      expect(mockFetch).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should preserve request parameters in mock handlers', async () => {
      let capturedRequest: MockRequest | undefined;
      
      const mockHandler = jest.fn().mockImplementation((req: MockRequest) => {
        capturedRequest = req;
        return ResponseBuilder.json({ id: req.params.id });
      });
      
      routeMatcher.register('GET', '/api/users/:id', mockHandler);

      await fetch('/api/users/123?page=1');

      expect(capturedRequest).toBeDefined();
      expect(capturedRequest!.params).toEqual({ id: '123' });
      expect(capturedRequest!.query).toEqual({ page: '1' });
    });

    it('should execute middleware pipeline for matched requests', async () => {
      let middlewareExecuted = false;
      
      middlewarePipeline.use(async (_req, next) => {
        middlewareExecuted = true;
        return next();
      });
      
      routeMatcher.register('GET', '/api/test', () => 
        ResponseBuilder.json({ test: true })
      );

      await fetch('/api/test');

      expect(middlewareExecuted).toBe(true);
    });
  });

  describe('event emission', () => {
    beforeEach(() => {
      wrapper.setup();
    });

    it('should emit ON_REQUEST event with request object for all requests', async () => {
      let capturedRequest: MockRequest | undefined;
      
      eventEmitter.on('ON_REQUEST', (request: MockRequest) => {
        capturedRequest = request;
      });

      routeMatcher.register('GET', '/api/test', () => 
        ResponseBuilder.json({ test: true })
      );

      await fetch('/api/test?param=value');

      expect(capturedRequest).toBeDefined();
      expect(capturedRequest!.method).toBe('GET');
      expect(capturedRequest!.path).toBe('/api/test');
      expect(capturedRequest!.query).toEqual({ param: 'value' });
    });

    it('should emit ON_MOCK event with request object for matched requests', async () => {
      let capturedRequest: MockRequest | undefined;
      
      eventEmitter.on('ON_MOCK', (request: MockRequest) => {
        capturedRequest = request;
      });

      routeMatcher.register('GET', '/api/users/:id', () => 
        ResponseBuilder.json({ id: 123 })
      );

      await fetch('/api/users/123');

      expect(capturedRequest).toBeDefined();
      expect(capturedRequest!.method).toBe('GET');
      expect(capturedRequest!.path).toBe('/api/users/123');
      expect(capturedRequest!.params).toEqual({ id: '123' });
    });

    it('should emit ON_NETWORK event with request object for forwarded requests', async () => {
      let capturedRequest: MockRequest | undefined;
      const mockFetch = jest.fn().mockResolvedValue(ResponseBuilder.json({}));
      
      wrapper.teardown();
      global.fetch = mockFetch;
      wrapper = new FetchWrapper(routeMatcher, middlewarePipeline, eventEmitter);
      wrapper.setup();
      
      eventEmitter.on('ON_NETWORK', (request: MockRequest) => {
        capturedRequest = request;
      });

      await fetch('/unmatched/route');

      expect(capturedRequest).toBeDefined();
      expect(capturedRequest!.method).toBe('GET');
      expect(capturedRequest!.path).toBe('/unmatched/route');
    });

    it('should emit ON_RESPONSE event with request and response objects for mock responses', async () => {
      let capturedRequest: MockRequest | undefined;
      let capturedResponse: Response | undefined;
      
      eventEmitter.on('ON_RESPONSE', (request: MockRequest, response: Response) => {
        capturedRequest = request;
        capturedResponse = response;
      });

      routeMatcher.register('GET', '/api/test', () => 
        ResponseBuilder.json({ mocked: true })
      );

      await fetch('/api/test');

      expect(capturedRequest).toBeDefined();
      expect(capturedResponse).toBeDefined();
      expect(capturedRequest!.path).toBe('/api/test');
      expect(capturedResponse!.status).toBe(200);
    });

    it('should emit ON_RESPONSE event with request and response objects for network responses', async () => {
      let capturedRequest: MockRequest | undefined;
      let capturedResponse: Response | undefined;
      const mockResponse = ResponseBuilder.json({ network: true });
      const mockFetch = jest.fn().mockResolvedValue(mockResponse);
      
      wrapper.teardown();
      global.fetch = mockFetch;
      wrapper = new FetchWrapper(routeMatcher, middlewarePipeline, eventEmitter);
      wrapper.setup();
      
      eventEmitter.on('ON_RESPONSE', (request: MockRequest, response: Response) => {
        capturedRequest = request;
        capturedResponse = response;
      });

      await fetch('/network/request');

      expect(capturedRequest).toBeDefined();
      expect(capturedResponse).toBeDefined();
      expect(capturedRequest!.path).toBe('/network/request');
      expect(capturedResponse).toBe(mockResponse);
    });

    it('should call multiple event handlers in registration order', async () => {
      const callOrder: string[] = [];
      
      eventEmitter.on('ON_REQUEST', () => callOrder.push('handler1'));
      eventEmitter.on('ON_REQUEST', () => callOrder.push('handler2'));
      eventEmitter.on('ON_REQUEST', () => callOrder.push('handler3'));

      routeMatcher.register('GET', '/api/test', () => 
        ResponseBuilder.json({ test: true })
      );

      await fetch('/api/test');

      expect(callOrder).toEqual(['handler1', 'handler2', 'handler3']);
    });

    it('should stop calling handlers after unsubscribing', async () => {
      let handler1Called = false;
      let handler2Called = false;
      
      const handler1 = () => { handler1Called = true; };
      const handler2 = () => { handler2Called = true; };
      
      eventEmitter.on('ON_REQUEST', handler1);
      eventEmitter.on('ON_REQUEST', handler2);
      
      // Unsubscribe handler1
      const removed = eventEmitter.off('ON_REQUEST', handler1);
      expect(removed).toBe(true);

      routeMatcher.register('GET', '/api/test', () => 
        ResponseBuilder.json({ test: true })
      );

      await fetch('/api/test');

      expect(handler1Called).toBe(false);
      expect(handler2Called).toBe(true);
    });

    it('should return false when trying to unsubscribe non-existent handler', () => {
      const handler = () => {};
      const removed = eventEmitter.off('ON_REQUEST', handler);
      expect(removed).toBe(false);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      wrapper.setup();
    });

    it('should propagate original fetch errors unchanged', async () => {
      const fetchError = new Error('Network error');
      const mockFetch = jest.fn().mockRejectedValue(fetchError);
      
      wrapper.teardown();
      global.fetch = mockFetch;
      wrapper = new FetchWrapper(routeMatcher, middlewarePipeline, eventEmitter);
      wrapper.setup();

      await expect(fetch('/unmatched')).rejects.toThrow(/Network/);
    });
  });

  describe('getOriginalFetch()', () => {
    it('should return reference to original fetch', () => {
      const original = wrapper.getOriginalFetch();
      
      expect(typeof original).toBe('function');
      expect(original).toBe(originalFetch);
    });
  });
});