# Design Document

## Overview

The browser mock API package is a TypeScript library that provides comprehensive API mocking capabilities for browser environments. The package intercepts fetch requests through a global wrapper, matches them against registered mock patterns using path-to-regexp, and either serves mock responses or forwards requests to the original fetch function. The design emphasizes type safety, developer experience, and observability while maintaining full compatibility with the standard fetch API.

## Architecture

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Environment   │    │  Fetch Wrapper  │    │ Route Matcher   │
│   Controller    │────│                 │────│                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                │                        │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Event Emitter   │    │ Request Parser  │    │ Mock Registry   │
│                 │────│                 │────│                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                │                        │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│Response Builder │    │   Middleware    │    │  State Store    │
│                 │    │   Pipeline      │    │   Manager       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Request Interception**: Global fetch wrapper captures all HTTP requests
2. **Environment Check**: Verify mocking is enabled via environment variable
3. **Event Emission**: Emit ON_REQUEST event with request details
4. **Middleware Processing**: Execute registered middleware in order
5. **Route Matching**: Match request against registered mock patterns
6. **Handler Execution**: Execute mock handler or forward to original fetch
7. **Response Processing**: Apply delays, build responses, emit events
8. **Response Return**: Return standard Response object to caller

## Components and Interfaces

### Core Types

```typescript
// Request object passed to handlers
interface MockRequest<T = undefined> {
  body: T;
  baseUrl: string;
  method: string;
  params: Record<string, string>;
  query: Record<string, string>;
  path: string;
  host: string;
  hostname: string;
  headers: Record<string, string>;
}

// Handler function signature
type MockHandler<T = undefined> = (request: MockRequest<T>) => Response | Promise<Response>;

// Middleware function signature
type Middleware = (request: MockRequest, next: () => Promise<Response>) => Response | Promise<Response>;

// Event types
type EventType = 'ON_REQUEST' | 'ON_MOCK' | 'ON_NETWORK' | 'ON_RESPONSE';

// Event handler signatures
type RequestEventHandler = (request: MockRequest) => void;
type ResponseEventHandler = (request: MockRequest, response: Response) => void;
```

### Environment Controller

```typescript
class EnvironmentController {
  private static readonly ENV_VAR = 'ENABLE_API_MOCK';
  
  static isEnabled(): boolean {
    return process.env[this.ENV_VAR] === 'true' || 
           (typeof window !== 'undefined' && window.localStorage?.getItem(this.ENV_VAR) === 'true');
  }
}
```

**Design Rationale**: Supports both Node.js environment variables and browser localStorage for flexibility across different environments.

### Fetch Wrapper

```typescript
class FetchWrapper {
  private originalFetch: typeof fetch;
  private mockRegistry: MockRegistry;
  private eventEmitter: EventEmitter;
  
  constructor() {
    this.originalFetch = globalThis.fetch;
    this.setupGlobalWrapper();
  }
  
  private setupGlobalWrapper(): void {
    globalThis.fetch = this.wrappedFetch.bind(this);
  }
  
  private async wrappedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Implementation handles request parsing, matching, and response generation
  }
}
```

**Design Rationale**: Preserves original fetch reference for forwarding unmatched requests and maintains compatibility.

### Route Matcher

```typescript
class RouteMatcher {
  private routes: Map<string, { pattern: RegExp; keys: Key[]; handler: MockHandler; options: MockOptions }>;
  
  constructor() {
    this.routes = new Map();
  }
  
  register<T extends object = undefined>(
    method: string, 
    path: string, 
    handler: MockHandler<T>, 
    options: MockOptions = {}
  ): void {
    const { regexp, keys } = pathToRegexp(path);
    this.routes.set(`${method}:${path}`, { pattern: regexp, keys, handler, options });
  }
  
  match(method: string, path: string): MatchResult | null {
    // Implementation uses path-to-regexp for pattern matching and parameter extraction
  }
}
```

**Design Rationale**: Uses path-to-regexp library for robust pattern matching and parameter extraction. Stores routes with method prefix to handle same paths with different HTTP methods.

### Request Parser

```typescript
class RequestParser {
  static async parse(input: RequestInfo | URL, init?: RequestInit): Promise<MockRequest> {
    const request = new Request(input, init);
    const url = new URL(request.url);
    
    return {
      body: await this.parseBody(request),
      baseUrl: `${url.protocol}//${url.host}`,
      method: request.method,
      params: {}, // Populated by route matcher
      query: Object.fromEntries(url.searchParams),
      path: url.pathname,
      host: url.host,
      hostname: url.hostname,
      headers: Object.fromEntries(request.headers)
    };
  }
  
  private static async parseBody(request: Request): Promise<any> {
    // Implementation handles JSON parsing with error handling
  }
}
```

**Design Rationale**: Centralizes request parsing logic and provides comprehensive request information as specified in requirements.

### Event Emitter

```typescript
class EventEmitter {
  private listeners: Map<EventType, Set<Function>>;
  
  on(event: EventType, handler: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }
  
  off(event: EventType, handler: Function): boolean {
    return this.listeners.get(event)?.delete(handler) ?? false;
  }
  
  emit(event: EventType, ...args: any[]): void {
    this.listeners.get(event)?.forEach(handler => handler(...args));
  }
}
```

**Design Rationale**: Simple event emitter implementation that supports multiple handlers per event and proper cleanup.

### Response Builder

```typescript
class ResponseBuilder {
  static json(data: any, options: { status?: number; headers?: Record<string, string> } = {}): Response {
    const { status = 200, headers = {} } = options;
    
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }
  
  static text(data: string, options: { status?: number; headers?: Record<string, string> } = {}): Response {
    const { status = 200, headers = {} } = options;
    
    return new Response(data, {
      status,
      headers: {
        'Content-Type': 'text/plain',
        ...headers
      }
    });
  }
}
```

**Design Rationale**: Provides convenient response creation utilities while maintaining compatibility with standard Response objects.

### State Store Manager

```typescript
class StateStore<T = any> {
  private data: T;
  
  constructor(initialData: T) {
    this.data = initialData;
  }
  
  get(): T {
    return this.data;
  }
  
  set(data: T): void {
    this.data = data;
  }
  
  update(updater: (current: T) => T): void {
    this.data = updater(this.data);
  }
}

class StateStoreManager {
  private stores: Map<string, StateStore>;
  
  createStore<T>(key: string, initialData: T): StateStore<T> {
    const store = new StateStore(initialData);
    this.stores.set(key, store);
    return store;
  }
}
```

**Design Rationale**: Provides simple state management for stateful mocks with type safety and update utilities.

### Main API Interface

```typescript
class ApiMock {
  private fetchWrapper: FetchWrapper;
  private routeMatcher: RouteMatcher;
  private middlewarePipeline: MiddlewarePipeline;
  private eventEmitter: EventEmitter;
  private stateManager: StateStoreManager;
  
  // HTTP method handlers
  get<T extends object = undefined>(path: string, handler: MockHandler<T>, options?: MockOptions): void;
  post<T extends object = undefined>(path: string, handler: MockHandler<T>, options?: MockOptions): void;
  put<T extends object = undefined>(path: string, handler: MockHandler<T>, options?: MockOptions): void;
  patch<T extends object = undefined>(path: string, handler: MockHandler<T>, options?: MockOptions): void;
  delete<T extends object = undefined>(path: string, handler: MockHandler<T>, options?: MockOptions): void;
  
  // Middleware
  use(middleware: Middleware): void;
  
  // Events
  on(event: EventType, handler: Function): void;
  off(event: EventType, handler: Function): boolean;
  
  // State management
  createStore<T>(key: string, initialData: T): StateStore<T>;
  
  // Response utilities
  response: typeof ResponseBuilder;
}
```

## Data Models

### MockOptions

```typescript
interface MockOptions {
  delay?: number; // Milliseconds to delay response
  headers?: Record<string, string>; // Additional response headers
}
```

### MatchResult

```typescript
interface MatchResult {
  handler: MockHandler;
  params: Record<string, string>;
  options: MockOptions;
}
```

## Error Handling

### Request Parsing Errors

- **JSON Parse Errors**: When request body is not valid JSON, set body to undefined and continue processing
- **URL Parse Errors**: Log error and forward request to original fetch
- **Header Parse Errors**: Use empty headers object and continue processing

### Handler Execution Errors

- **Synchronous Errors**: Catch and return 500 Internal Server Error response
- **Asynchronous Errors**: Catch promise rejections and return 500 response
- **Middleware Errors**: Skip failed middleware and continue to next in pipeline

### Network Forwarding Errors

- **Original Fetch Errors**: Propagate errors unchanged to maintain compatibility
- **Network Timeout**: Let original fetch handle timeout behavior

### Event Emission Errors

- **Handler Errors**: Catch and log event handler errors without affecting request processing
- **Multiple Handler Errors**: Continue executing remaining handlers even if some fail

## Testing Strategy

### Unit Testing

- **Route Matching**: Test path-to-regexp integration with various patterns
- **Request Parsing**: Test parsing of different request types and edge cases
- **Response Building**: Test response helper utilities and custom responses
- **Event Emission**: Test event lifecycle and handler management
- **State Management**: Test store creation, updates, and isolation

### Integration Testing

- **Fetch Wrapper**: Test complete request/response cycle with real fetch calls
- **Middleware Pipeline**: Test middleware execution order and error handling
- **Environment Control**: Test enabling/disabling functionality
- **Delay Simulation**: Test network delay implementation

### Browser Testing

- **Cross-browser Compatibility**: Test in Chrome, Firefox, Safari, Edge
- **Environment Variable Support**: Test localStorage fallback in browsers
- **Global Fetch Wrapping**: Test fetch interception doesn't break existing code
- **Memory Leaks**: Test event listener cleanup and store management

### Performance Testing

- **Route Matching Performance**: Test with large numbers of registered routes
- **Memory Usage**: Test long-running applications with many requests
- **Event Handler Performance**: Test with multiple event listeners

### Type Safety Testing

- **Generic Type Parameters**: Test TypeScript compilation with various type parameters
- **Request Body Typing**: Test type safety for request body access
- **Response Type Compatibility**: Test Response object compatibility with fetch API