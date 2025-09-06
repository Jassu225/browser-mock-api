/**
 * Tests for ResponseBuilder
 */

import { ResponseBuilder } from '../response-builder';

describe('ResponseBuilder', () => {
  describe('json()', () => {
    it('should create JSON response with default status 200', async () => {
      const data = { name: 'John', age: 30 };
      
      const response = ResponseBuilder.json(data);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      
      const responseData = await response.json();
      expect(responseData).toEqual(data);
    });

    it('should create JSON response with custom status', async () => {
      const data = { id: 123 };
      
      const response = ResponseBuilder.json(data, { status: 201 });
      
      expect(response.status).toBe(201);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should create JSON response with custom headers', async () => {
      const data = { message: 'success' };
      const customHeaders = { 'X-Custom': 'value', 'Cache-Control': 'no-cache' };
      
      const response = ResponseBuilder.json(data, { headers: customHeaders });
      
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Custom')).toBe('value');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
    });

    it('should handle null and undefined data', async () => {
      const nullResponse = ResponseBuilder.json(null);
      const undefinedResponse = ResponseBuilder.json(undefined);
      
      expect(await nullResponse.text()).toBe('null');
      expect(await undefinedResponse.text()).toBe('undefined');
    });
  });

  describe('text()', () => {
    it('should create text response with default status 200', async () => {
      const text = 'Hello, World!';
      
      const response = ResponseBuilder.text(text);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');
      expect(await response.text()).toBe(text);
    });

    it('should create text response with custom status and headers', async () => {
      const text = 'Error message';
      
      const response = ResponseBuilder.text(text, { 
        status: 400, 
        headers: { 'X-Error': 'true' } 
      });
      
      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('text/plain');
      expect(response.headers.get('X-Error')).toBe('true');
    });
  });  
describe('html()', () => {
    it('should create HTML response', async () => {
      const html = '<h1>Hello World</h1>';
      
      const response = ResponseBuilder.html(html);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      expect(await response.text()).toBe(html);
    });
  });

  describe('empty()', () => {
    it('should create empty response with default status 204', async () => {
      const response = ResponseBuilder.empty();
      
      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
    });

    it('should create empty response with custom status', async () => {
      const response = ResponseBuilder.empty({ status: 200 });
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('');
    });
  });

  describe('redirect()', () => {
    it('should create redirect response with default status 302', () => {
      const url = 'https://example.com/new-location';
      
      const response = ResponseBuilder.redirect(url);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe(url);
    });

    it('should create redirect response with custom status', () => {
      const url = 'https://example.com/permanent';
      
      const response = ResponseBuilder.redirect(url, { status: 301 });
      
      expect(response.status).toBe(301);
      expect(response.headers.get('Location')).toBe(url);
    });
  });

  describe('error()', () => {
    it('should create error response with default status 500', async () => {
      const message = 'Internal server error';
      
      const response = ResponseBuilder.error(message);
      
      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      
      const errorData = await response.json();
      expect(errorData).toEqual({ error: message });
    });

    it('should create error response with custom status and code', async () => {
      const message = 'Not found';
      const code = 'RESOURCE_NOT_FOUND';
      
      const response = ResponseBuilder.error(message, { status: 404, code });
      
      expect(response.status).toBe(404);
      
      const errorData = await response.json();
      expect(errorData).toEqual({ error: message, code });
    });
  });

  describe('header override behavior', () => {
    it('should allow overriding content-type header', async () => {
      const data = { test: true };
      
      const response = ResponseBuilder.json(data, {
        headers: { 'Content-Type': 'application/vnd.api+json' }
      });
      
      expect(response.headers.get('Content-Type')).toBe('application/vnd.api+json');
    });
  });
});