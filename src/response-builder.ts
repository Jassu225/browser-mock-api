/**
 * Response Builder utilities for creating HTTP responses
 */

export class ResponseBuilder {
  /**
   * Create a JSON response with proper content-type header
   */
  static json(
    data: object | null | undefined, 
    options: ResponseInit = {}
  ): Response {
    const { status = 200, headers = {}, ...rest } = options;
    
    // Handle undefined explicitly since JSON.stringify(undefined) returns undefined
    const body = data === undefined ? 'undefined' : JSON.stringify(data);
    
    return new Response(body, {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      ...rest,
    });
  }

  /**
   * Create a text response with proper content-type header
   */
  static text(
    data: string, 
    options: ResponseInit = {}
  ): Response {
    const { status = 200, headers = {}, ...rest } = options;
    
    return new Response(data, {
      status,
      headers: {
        'Content-Type': 'text/plain',
        ...headers
      },
      ...rest,
    });
  }

  /**
   * Create an HTML response with proper content-type header
   */
  static html(
    data: string, 
    options: ResponseInit = {}
  ): Response {
    const { status = 200, headers = {}, ...rest } = options;
    
    return new Response(data, {
      status,
      headers: {
        'Content-Type': 'text/html',
        ...headers
      },
      ...rest,
    });
  }

  /**
   * Create an empty response with just status code
   */
  static empty(
    options: ResponseInit = {}
  ): Response {
    const { status = 204, headers = {}, ...rest } = options;
    
    return new Response(null, {
      status,
      headers,
      ...rest,
    });
  }

  /**
   * Create a redirect response
   */
  static redirect(
    url: string,
    options: { status?: number; headers?: Record<string, string> } = {}
  ): Response {
    const { status = 302, headers = {} } = options;
    
    return new Response(null, {
      status,
      headers: {
        'Location': url,
        ...headers
      }
    });
  }

  /**
   * Create an error response with JSON error format
   */
  static error(
    message: string,
    options: ResponseInit & { code?: string; } = {}
  ): Response {
    const { status = 500, code, headers = {}, ...rest } = options;
    
    const errorData: any = { error: message };
    if (code) {
      errorData.code = code;
    }
    
    return this.json(errorData, { status, headers, ...rest });
  }
}