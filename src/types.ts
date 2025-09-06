/**
 * Core types and interfaces for the browser mock API package
 */

/**
 * Request object passed to mock handlers containing comprehensive request information
 */
export interface MockRequest<T = undefined> {
  /** Parsed JSON body of the request */
  body: T;
  /** Base URL including protocol and host */
  baseUrl: string;
  /** HTTP method (GET, POST, PUT, etc.) */
  method: string;
  /** Path parameters extracted from the URL pattern */
  params: Record<string, string>;
  /** Query parameters from the URL */
  query: Record<string, string>;
  /** URL pathname */
  path: string;
  /** Host including port if specified */
  host: string;
  /** Hostname without port */
  hostname: string;
  /** Request headers as key-value pairs */
  headers: Record<string, string>;
}

/**
 * Handler function signature for mock endpoints
 */
export type MockHandler<T = undefined> = (
  request: MockRequest<T>
) => Response | Promise<Response>;

/**
 * Middleware function signature with next() callback
 */
export type Middleware = (
  request: MockRequest,
  next: () => Promise<Response>
) => Response | Promise<Response>;

/**
 * Event types emitted during request lifecycle
 */
export type EventType = 'ON_REQUEST' | 'ON_MOCK' | 'ON_NETWORK' | 'ON_RESPONSE';

/**
 * Event handler for request-only events (ON_REQUEST, ON_MOCK, ON_NETWORK)
 */
export type RequestEventHandler = (request: MockRequest) => void;

/**
 * Event handler for response events (ON_RESPONSE)
 */
export type ResponseEventHandler = (request: MockRequest, response: Response) => void;

/**
 * Options for configuring mock endpoints
 */
export interface MockOptions {
  /** Milliseconds to delay response (simulates network latency) */
  delay?: number;
  /** Additional response headers */
  headers?: Record<string, string>;
}

/**
 * Result of route matching operation
 */
export interface MatchResult {
  /** The matched handler function */
  handler: MockHandler;
  /** Extracted path parameters */
  params: Record<string, string>;
  /** Mock options for this route */
  options: MockOptions;
}

/**
 * HTTP methods supported by the mock API
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';