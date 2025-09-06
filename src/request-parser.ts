/**
 * Request Parser utility for converting fetch requests to MockRequest format
 */

import { MockRequest } from "./types";

export class RequestParser {
  /**
   * Parse a fetch request into MockRequest format
   */
  static async parse(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<MockRequest> {
    // Handle relative URLs by providing a base URL
    let requestUrl: string;
    if (typeof input === "string" && input.startsWith("/")) {
      requestUrl = `http://localhost${input}`;
    } else if (input instanceof URL) {
      requestUrl = input.toString();
    } else {
      requestUrl = input.toString();
    }

    // Extract body from init before creating Request to avoid consumption
    const bodyFromInit = init?.body;
    const request = new Request(requestUrl, init);
    const url = new URL(request.url);

    return {
      body: await this.parseBodyFromInit(bodyFromInit, request.headers),
      baseUrl: `${url.protocol}//${url.host}`,
      method: request.method.toUpperCase(),
      params: {}, // Will be populated by route matcher
      query: Object.fromEntries(url.searchParams),
      path: url.pathname,
      host: url.host,
      hostname: url.hostname,
      headers: this.parseHeaders(request.headers),
    };
  }

  /**
   * Parse request body from init parameter to avoid body consumption issues
   */
  private static async parseBodyFromInit(
    body: BodyInit | null | undefined,
    headers: Headers
  ): Promise<any> {
    if (!body) {
      return undefined;
    }

    try {
      const contentType = headers.get("content-type") || "";

      if (typeof body === "string") {
        if (contentType.includes("application/json")) {
          if (!body.trim()) {
            return undefined;
          }
          return JSON.parse(body);
        }
        return body;
      }

      // Handle other body types (FormData, Blob, etc.)
      if (body instanceof FormData) {
        const formObj: Record<string, any> = {};
        body.forEach((value, key) => {
          formObj[key] = value;
        });
        return formObj;
      }

      if (body instanceof Blob) {
        const text = await body.text();
        if (contentType.includes("application/json")) {
          if (!text.trim()) {
            return undefined;
          }
          return JSON.parse(text);
        }
        return text;
      }

      // For other types, try to convert to string
      return body.toString();
    } catch (error) {
      console.warn("Failed to parse request body:", error);
      return undefined;
    }
  }

  /**
   * Parse headers into a plain object
   */
  private static parseHeaders(headers: Headers): Record<string, string> {
    const headerObj: Record<string, string> = {};

    try {
      headers.forEach((value, key) => {
        headerObj[key.toLowerCase()] = value;
      });
    } catch (error) {
      console.warn("Failed to parse headers:", error);
    }

    return headerObj;
  }

  /**
   * Create a MockRequest with populated params (used by route matcher)
   */
  static createWithParams(
    baseRequest: MockRequest,
    params: Record<string, string>
  ): MockRequest {
    return {
      ...baseRequest,
      params,
    };
  }
}
