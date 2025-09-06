/**
 * Route Matcher using path-to-regexp for pattern matching and parameter extraction
 */

import { pathToRegexp, Key } from 'path-to-regexp';
import { MockHandler, MockOptions, MatchResult, HttpMethod } from './types';

interface RouteEntry {
  pattern: RegExp;
  keys: Key[];
  handler: MockHandler;
  options: MockOptions;
  originalPath: string;
}

export class RouteMatcher {
  private routes: Map<string, RouteEntry>;

  constructor() {
    this.routes = new Map();
  }

  /**
   * Register a new route with pattern matching
   */
  register<T = undefined>(
    method: HttpMethod,
    path: string,
    handler: MockHandler<T>,
    options: MockOptions = {}
  ): void {
    const keys: Key[] = [];
    const pattern = pathToRegexp(path, keys);
    const routeKey = `${method.toUpperCase()}:${path}`;

    this.routes.set(routeKey, {
      pattern,
      keys,
      handler: handler as unknown as MockHandler,
      options,
      originalPath: path
    });
  }

  /**
   * Match a request against registered routes
   * Returns the first matching route (first-match-wins)
   */
  match(method: string, path: string): MatchResult | null {
    const normalizedMethod = method.toUpperCase();

    // Iterate through routes in registration order
    for (const [routeKey, route] of this.routes) {
      const [routeMethod] = routeKey.split(':');
      
      if (routeMethod === normalizedMethod) {
        const match = route.pattern.exec(path);
        
        if (match) {
          const params = this.extractParams(route.keys, match);
          
          return {
            handler: route.handler,
            params,
            options: route.options
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract parameters from regex match using path-to-regexp keys
   */
  private extractParams(keys: Key[], match: RegExpExecArray): Record<string, string> {
    const params: Record<string, string> = {};

    keys.forEach((key, index) => {
      const value = match[index + 1];
      if (value !== undefined) {
        params[key.name] = decodeURIComponent(value);
      }
    });

    return params;
  }

  /**
   * Get all registered routes (for debugging/testing)
   */
  getRoutes(): Array<{ method: string; path: string; options: MockOptions }> {
    const routes: Array<{ method: string; path: string; options: MockOptions }> = [];

    for (const [routeKey, route] of this.routes) {
      const [method] = routeKey.split(':');
      routes.push({
        method,
        path: route.originalPath,
        options: route.options
      });
    }

    return routes;
  }

  /**
   * Clear all registered routes
   */
  clear(): void {
    this.routes.clear();
  }

  /**
   * Remove a specific route
   */
  unregister(method: HttpMethod, path: string): boolean {
    const routeKey = `${method.toUpperCase()}:${path}`;
    return this.routes.delete(routeKey);
  }
}