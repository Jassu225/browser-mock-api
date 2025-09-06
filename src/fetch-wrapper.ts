/**
 * Fetch Wrapper for intercepting and handling HTTP requests
 */

import { RouteMatcher } from './route-matcher';
import { RequestParser } from './request-parser';
import { MiddlewarePipeline } from './middleware-pipeline';
import { EventEmitter } from './event-emitter';
import { MockRequest } from './types';

export class FetchWrapper {
  private originalFetch: typeof fetch;
  private routeMatcher: RouteMatcher;
  private middlewarePipeline: MiddlewarePipeline;
  private eventEmitter: EventEmitter;
  private isSetup: boolean = false;

  constructor(
    routeMatcher: RouteMatcher,
    middlewarePipeline: MiddlewarePipeline,
    eventEmitter: EventEmitter
  ) {
    this.originalFetch = globalThis.fetch;
    this.routeMatcher = routeMatcher;
    this.middlewarePipeline = middlewarePipeline;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Set up global fetch wrapper
   */
  setup(): void {
    if (this.isSetup) {
      return;
    }

    globalThis.fetch = this.wrappedFetch.bind(this);
    this.isSetup = true;
  }

  /**
   * Restore original fetch function
   */
  teardown(): void {
    if (!this.isSetup) {
      return;
    }

    globalThis.fetch = this.originalFetch;
    this.isSetup = false;
  }

  /**
   * Check if wrapper is currently active
   */
  isActive(): boolean {
    return this.isSetup;
  }

  /**
   * Wrapped fetch function that intercepts requests
   */
  private async wrappedFetch(
    input: RequestInfo | URL, 
    init?: RequestInit
  ): Promise<Response> {
    let mockRequest: MockRequest;

    try {
      // Parse the request
      mockRequest = await RequestParser.parse(input, init);
      
      // Emit ON_REQUEST event
      this.eventEmitter.emit('ON_REQUEST', mockRequest);

      // Try to match against registered routes
      const matchResult = this.routeMatcher.match(mockRequest.method, mockRequest.path);

      if (matchResult) {
        // Update request with extracted parameters
        const requestWithParams = RequestParser.createWithParams(mockRequest, matchResult.params);
        
        // Emit ON_MOCK event
        this.eventEmitter.emit('ON_MOCK', requestWithParams);

        // Execute middleware pipeline and handler
        const response = await this.middlewarePipeline.execute(
          requestWithParams,
          async () => {
            try {
              // Apply delay if specified
              if (matchResult.options.delay && matchResult.options.delay > 0) {
                await this.delay(matchResult.options.delay);
              }

              // Execute the mock handler
              return await matchResult.handler(requestWithParams);
            } catch (handlerError) {
              // Return error response instead of throwing
              return new Response(
                JSON.stringify({ 
                  error: 'Handler error', 
                  message: handlerError instanceof Error ? handlerError.message : 'Unknown error' 
                }),
                { 
                  status: 500, 
                  headers: { 'Content-Type': 'application/json' } 
                }
              );
            }
          }
        );

        // Emit ON_RESPONSE event
        this.eventEmitter.emit('ON_RESPONSE', requestWithParams, response);

        return response;
      } else {
        // No match found, forward to original fetch
        return this.forwardToOriginalFetch(mockRequest, input, init);
      }
    } catch (error) {
      // If parsing fails or any other error, forward to original fetch
      console.warn('Error in fetch wrapper, forwarding to original fetch:', error);
      return this.forwardToOriginalFetch(mockRequest!, input, init);
    }
  }

  /**
   * Forward request to original fetch function
   */
  private async forwardToOriginalFetch(
    mockRequest: MockRequest,
    originalInput: RequestInfo | URL,
    originalInit?: RequestInit
  ): Promise<Response> {
    try {
      // Emit ON_NETWORK event
      this.eventEmitter.emit('ON_NETWORK', mockRequest);

      // Call original fetch with preserved arguments
      const response = await this.originalFetch(originalInput, originalInit);

      // Emit ON_RESPONSE event
      this.eventEmitter.emit('ON_RESPONSE', mockRequest, response);

      return response;
    } catch (error) {
      // Propagate original fetch errors unchanged
      throw error;
    }
  }

  /**
   * Simulate network delay
   */
  private delay(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  /**
   * Get reference to original fetch (for testing)
   */
  getOriginalFetch(): typeof fetch {
    return this.originalFetch;
  }
}