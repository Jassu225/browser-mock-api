/**
 * Tests for MiddlewarePipeline
 */

import { MiddlewarePipeline } from "../middleware-pipeline";
import { MockRequest, Middleware } from "../types";
import { ResponseBuilder } from "../response-builder";

describe("MiddlewarePipeline", () => {
  let pipeline: MiddlewarePipeline;
  let mockRequest: MockRequest;
  let finalHandler: jest.Mock;

  beforeEach(() => {
    pipeline = new MiddlewarePipeline();
    mockRequest = {
      body: undefined,
      baseUrl: "https://api.example.com",
      method: "GET",
      params: {},
      query: {},
      path: "/test",
      host: "api.example.com",
      hostname: "api.example.com",
      headers: {},
    };
    finalHandler = jest
      .fn()
      .mockResolvedValue(ResponseBuilder.json({ final: true }));
  });

  describe("use() and execute()", () => {
    it("should execute middleware in registration order", async () => {
      const callOrder: number[] = [];

      const middleware1: Middleware = async (_req, next) => {
        callOrder.push(1);
        return next();
      };

      const middleware2: Middleware = async (_req, next) => {
        callOrder.push(2);
        return next();
      };

      pipeline.use(middleware1);
      pipeline.use(middleware2);

      await pipeline.execute(mockRequest, finalHandler);

      expect(callOrder).toEqual([1, 2]);
      expect(finalHandler).toHaveBeenCalled();
    });

    it("should call final handler when no middleware is registered", async () => {
      const response = await pipeline.execute(mockRequest, finalHandler);

      expect(finalHandler).toHaveBeenCalledWith();
      expect(await response.json()).toEqual({ final: true });
    });

    it("should allow middleware to modify request", async () => {
      const middleware: Middleware = async (req, next) => {
        req.headers["x-middleware"] = "processed";
        return next();
      };

      pipeline.use(middleware);

      await pipeline.execute(mockRequest, finalHandler);

      expect(mockRequest.headers["x-middleware"]).toBe("processed");
      expect(finalHandler).toHaveBeenCalled();
    });

    it("should allow middleware to return early response", async () => {
      const earlyResponse = ResponseBuilder.json({ early: true });

      const middleware: Middleware = async () => {
        return earlyResponse;
      };

      pipeline.use(middleware);

      const response = await pipeline.execute(mockRequest, finalHandler);

      expect(response).toBe(earlyResponse);
      expect(finalHandler).not.toHaveBeenCalled();
    });
  });
  it("should handle middleware that throws errors", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const errorMiddleware: Middleware = async () => {
      throw new Error("Middleware error");
    };

    const normalMiddleware: Middleware = async (_req, next) => {
      return next();
    };

    pipeline.use(errorMiddleware);
    pipeline.use(normalMiddleware);

    const response = await pipeline.execute(mockRequest, finalHandler);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Middleware error:",
      expect.any(Error)
    );
    expect(finalHandler).toHaveBeenCalled();
    expect(await response.json()).toEqual({ final: true });

    consoleSpy.mockRestore();
  });

  it("should support async middleware", async () => {
    const middleware: Middleware = async (req, next) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      req.headers["async-processed"] = "true";
      return next();
    };

    pipeline.use(middleware);

    await pipeline.execute(mockRequest, finalHandler);

    expect(mockRequest.headers["async-processed"]).toBe("true");
    expect(finalHandler).toHaveBeenCalled();
  });

  it("should handle middleware that calls next multiple times", async () => {
    let nextCallCount = 0;

    const middleware: Middleware = async (_req, next) => {
      const response1 = await next();
      nextCallCount++;

      // Second call to next() - should not cause issues
      try {
        await next();
        nextCallCount++;
      } catch (error) {
        // This is expected behavior - next() should only be called once
      }

      return response1;
    };

    pipeline.use(middleware);

    await pipeline.execute(mockRequest, finalHandler);

    expect(nextCallCount).toBe(1);
    expect(finalHandler).toHaveBeenCalledTimes(1);
  });
});

describe("getMiddlewareCount()", () => {
  let pipeline: MiddlewarePipeline;

  beforeEach(() => {
    pipeline = new MiddlewarePipeline();
  });
  it("should return correct middleware count", () => {
    expect(pipeline.getMiddlewareCount()).toBe(0);

    pipeline.use(async (_req, next) => next());
    expect(pipeline.getMiddlewareCount()).toBe(1);

    pipeline.use(async (_req, next) => next());
    expect(pipeline.getMiddlewareCount()).toBe(2);
  });
});

describe("clear()", () => {
  let pipeline: MiddlewarePipeline;
  let mockRequest: MockRequest;
  let finalHandler: jest.Mock;

  beforeEach(() => {
    pipeline = new MiddlewarePipeline();
    mockRequest = {
      body: undefined,
      baseUrl: "https://api.example.com",
      method: "GET",
      params: {},
      query: {},
      path: "/test",
      host: "api.example.com",
      hostname: "api.example.com",
      headers: {},
    };
    finalHandler = jest
      .fn()
      .mockResolvedValue(ResponseBuilder.json({ final: true }));
  });
  it("should remove all middleware", async () => {
    pipeline.use(async (_req, next) => next());
    pipeline.use(async (_req, next) => next());

    pipeline.clear();

    expect(pipeline.getMiddlewareCount()).toBe(0);

    await pipeline.execute(mockRequest, finalHandler);
    expect(finalHandler).toHaveBeenCalledTimes(1);
  });
});

describe("remove()", () => {
  let pipeline: MiddlewarePipeline;

  beforeEach(() => {
    pipeline = new MiddlewarePipeline();
  });
  it("should remove specific middleware and return true", async () => {
    const middleware1: Middleware = async (_req, next) => next();
    const middleware2: Middleware = async (_req, next) => next();

    pipeline.use(middleware1);
    pipeline.use(middleware2);

    const result = pipeline.remove(middleware1);

    expect(result).toBe(true);
    expect(pipeline.getMiddlewareCount()).toBe(1);
  });

  it("should return false for non-existent middleware", () => {
    const middleware: Middleware = async (_req, next) => next();

    const result = pipeline.remove(middleware);

    expect(result).toBe(false);
  });
});
