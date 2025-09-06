/**
 * Middleware Pipeline for processing requests before route handlers
 */

import { Middleware, MockRequest } from './types';

export class MiddlewarePipeline {
  private middlewares: Middleware[];

  constructor() {
    this.middlewares = [];
  }

  /**
   * Add middleware to the pipeline
   */
  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Execute all middleware in registration order
   * Returns the final response or continues to the final handler
   */
  async execute(
    request: MockRequest,
    finalHandler: () => Promise<Response>
  ): Promise<Response> {
    let index = 0;

    const next = async (): Promise<Response> => {
      // If we've processed all middleware, call the final handler
      if (index >= this.middlewares.length) {
        return finalHandler();
      }

      const middleware = this.middlewares[index++];
      let nextCalled = false;

      const safeNext = async (): Promise<Response> => {
        if (nextCalled) {
          throw new Error('next() has already been called');
        }
        nextCalled = true;
        return next();
      };

      try {
        return await middleware(request, safeNext);
      } catch (error) {
        // Log error but continue to next middleware
        console.error('Middleware error:', error);
        return next();
      }
    };

    return next();
  }

  /**
   * Get the number of registered middleware
   */
  getMiddlewareCount(): number {
    return this.middlewares.length;
  }

  /**
   * Clear all middleware
   */
  clear(): void {
    this.middlewares = [];
  }

  /**
   * Remove specific middleware
   */
  remove(middleware: Middleware): boolean {
    const index = this.middlewares.indexOf(middleware);
    if (index !== -1) {
      this.middlewares.splice(index, 1);
      return true;
    }
    return false;
  }
}