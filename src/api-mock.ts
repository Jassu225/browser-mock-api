/**
 * Main ApiMock class - orchestrates all components
 */

import {
  MockHandler,
  MockOptions,
  EventType,
  Middleware,
  HttpMethod,
} from "./types";
import { StateStore, StateStoreManager } from "./state-store";
import { ResponseBuilder } from "./response-builder";
import { RouteMatcher } from "./route-matcher";
import { FetchWrapper } from "./fetch-wrapper";
import { MiddlewarePipeline } from "./middleware-pipeline";
import { EventEmitter } from "./event-emitter";

class ApiMock {
  private routeMatcher: RouteMatcher;
  private fetchWrapper: FetchWrapper;
  private middlewarePipeline: MiddlewarePipeline;
  private eventEmitter: EventEmitter;
  private stateManager: StateStoreManager;
  private isInitialized: boolean = false;

  constructor() {
    this.routeMatcher = new RouteMatcher();
    this.middlewarePipeline = new MiddlewarePipeline();
    this.eventEmitter = new EventEmitter();
    this.stateManager = new StateStoreManager();
    this.fetchWrapper = new FetchWrapper(
      this.routeMatcher,
      this.middlewarePipeline,
      this.eventEmitter
    );
  }

  /**
   * Setup the mock system (initialize fetch wrapper)
   */
  setup(): void {
    if (this.isInitialized) {
      return;
    }

    // Recreate FetchWrapper to capture current global.fetch
    this.fetchWrapper = new FetchWrapper(
      this.routeMatcher,
      this.middlewarePipeline,
      this.eventEmitter
    );

    this.fetchWrapper.setup();
    this.isInitialized = true;
  }

  /**
   * Cleanup the mock system (restore original fetch and clear all data)
   */
  cleanup(): void {
    if (this.isInitialized) {
      this.fetchWrapper.teardown();
      this.isInitialized = false;
    }
    // Clear all data as part of cleanup
    this.routeMatcher.clear();
    this.middlewarePipeline.clear();
    this.eventEmitter.removeAllListeners();
    this.stateManager.clearAll();
  }

  /**
   * Check if the mock system is active
   */
  isActive(): boolean {
    return this.isInitialized && this.fetchWrapper.isActive();
  }

  /**
   * Register a GET endpoint mock
   */
  get<T = undefined>(
    path: string,
    handler: MockHandler<T>,
    options?: MockOptions
  ): void {
    this.routeMatcher.register("GET", path, handler, options);
  }

  /**
   * Register a POST endpoint mock
   */
  post<T = undefined>(
    path: string,
    handler: MockHandler<T>,
    options?: MockOptions
  ): void {
    this.routeMatcher.register("POST", path, handler, options);
  }

  /**
   * Register a PUT endpoint mock
   */
  put<T = undefined>(
    path: string,
    handler: MockHandler<T>,
    options?: MockOptions
  ): void {
    this.routeMatcher.register("PUT", path, handler, options);
  }

  /**
   * Register a PATCH endpoint mock
   */
  patch<T = undefined>(
    path: string,
    handler: MockHandler<T>,
    options?: MockOptions
  ): void {
    this.routeMatcher.register("PATCH", path, handler, options);
  }

  /**
   * Register a DELETE endpoint mock
   */
  delete<T = undefined>(
    path: string,
    handler: MockHandler<T>,
    options?: MockOptions
  ): void {
    this.routeMatcher.register("DELETE", path, handler, options);
  }

  /**
   * Add middleware to the pipeline
   */
  use(middleware: Middleware): void {
    this.middlewarePipeline.use(middleware);
  }

  /**
   * Subscribe to lifecycle events
   */
  on(event: EventType, handler: Function): void {
    this.eventEmitter.on(event, handler);
  }

  /**
   * Unsubscribe from lifecycle events
   */
  off(event: EventType, handler: Function): boolean {
    return this.eventEmitter.off(event, handler);
  }

  /**
   * Create a stateful data store
   */
  createStore<T extends object>(key: string, initialData: T): StateStore<T> {
    return this.stateManager.createStore(key, initialData);
  }

  /**
   * Get an existing store by key
   */
  getStore<T extends object>(key: string): StateStore<T> | undefined {
    return this.stateManager.getStore<T>(key);
  }

  /**
   * Response builder utilities
   */
  get response(): typeof ResponseBuilder {
    return ResponseBuilder;
  }

  /**
   * Get all registered routes (for debugging)
   */
  getRoutes(): Array<{ method: string; path: string; options: MockOptions }> {
    return this.routeMatcher.getRoutes();
  }

  /**
   * Unregister a specific route
   */
  unregister(method: HttpMethod, path: string): boolean {
    return this.routeMatcher.unregister(method, path);
  }
}

// Export singleton instance only to ensure singleton pattern
export const apiMock = new ApiMock();
