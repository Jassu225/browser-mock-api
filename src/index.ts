/**
 * Browser Mock API - A TypeScript package for intercepting and mocking fetch requests
 * 
 * This package provides comprehensive API mocking capabilities for browser environments
 * by wrapping the global fetch function and allowing developers to register mock endpoints
 * with full TypeScript support.
 */

export * from './types';
export { apiMock } from './api-mock';
export { ResponseBuilder } from './response-builder';

// Re-export the main instance as default for convenience
import { apiMock } from './api-mock';

/**
 * Default instance of ApiMock for immediate use
 * Usage: import apiMock from 'browser-mock-api'
 */
export default apiMock;