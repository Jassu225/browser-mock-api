/**
 * Test setup file for mocking browser APIs
 */

import "whatwg-fetch";

// Mock Response constructor if not available
if (typeof global.Response === "undefined") {
  global.Response = class MockResponse {
    private _body: any;
    private _status: number;
    private _headers: Headers;

    constructor(body?: any, init?: ResponseInit) {
      this._body = body;
      this._status = init?.status || 200;
      this._headers = new Headers(init?.headers);
    }

    get status() {
      return this._status;
    }

    get headers() {
      return this._headers;
    }

    async json() {
      return typeof this._body === "string"
        ? JSON.parse(this._body)
        : this._body;
    }

    async text() {
      return typeof this._body === "string"
        ? this._body
        : JSON.stringify(this._body);
    }
  } as any;
}

// Mock Request constructor if not available
if (typeof global.Request === "undefined") {
  global.Request = class MockRequest {
    public url: string;
    public method: string;
    public headers: Headers;
    public body: any;
    public bodyUsed: boolean = false;
    private _body: any;

    constructor(input: RequestInfo | URL, init?: RequestInit) {
      this.url = typeof input === "string" ? input : input.toString();
      this.method = init?.method || "GET";
      this.headers = new Headers(init?.headers);
      this._body = init?.body;
      this.body = init?.body || null; // Set body to the actual body content
    }

    clone() {
      const cloned = new (this.constructor as any)(this.url, {
        method: this.method,
        headers: this.headers,
        body: this._body
      });
      return cloned;
    }

    async json() {
      this.bodyUsed = true;
      return typeof this._body === "string"
        ? JSON.parse(this._body)
        : this._body;
    }

    async text() {
      this.bodyUsed = true;
      return typeof this._body === "string"
        ? this._body
        : JSON.stringify(this._body);
    }
  } as any;
}

// Mock Headers if not available
if (typeof global.Headers === "undefined") {
  global.Headers = class MockHeaders {
    private _headers: Map<string, string> = new Map();

    constructor(init?: HeadersInit) {
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) =>
            this._headers.set(key.toLowerCase(), value)
          );
        } else if (init instanceof Headers) {
          // Handle Headers instance
        } else {
          Object.entries(init).forEach(([key, value]) =>
            this._headers.set(key.toLowerCase(), value)
          );
        }
      }
    }

    set(name: string, value: string) {
      this._headers.set(name.toLowerCase(), value);
    }

    get(name: string) {
      return this._headers.get(name.toLowerCase()) || null;
    }

    has(name: string) {
      return this._headers.has(name.toLowerCase());
    }

    delete(name: string) {
      this._headers.delete(name.toLowerCase());
    }

    *[Symbol.iterator]() {
      for (const [key, value] of this._headers) {
        yield [key, value];
      }
    }

    entries() {
      return this._headers.entries();
    }
  } as any;
}

// Mock fetch if not available
if (typeof global.fetch === "undefined") {
  global.fetch = jest
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
}
