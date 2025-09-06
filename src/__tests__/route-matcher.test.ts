/**
 * Tests for RouteMatcher
 */

import { RouteMatcher } from "../route-matcher";

describe("RouteMatcher", () => {
  let matcher: RouteMatcher;

  beforeEach(() => {
    matcher = new RouteMatcher();
  });

  describe("register() and match()", () => {
    it("should register and match simple routes", () => {
      const handler = jest.fn();
      matcher.register("GET", "/users", handler);

      const result = matcher.match("GET", "/users");

      expect(result).not.toBeNull();
      expect(result!.handler).toBe(handler);
      expect(result!.params).toEqual({});
    });

    it("should match routes with parameters", () => {
      const handler = jest.fn();
      matcher.register("GET", "/users/:id", handler);

      const result = matcher.match("GET", "/users/123");

      expect(result).not.toBeNull();
      expect(result!.params).toEqual({ id: "123" });
    });

    it("should match routes with multiple parameters", () => {
      const handler = jest.fn();
      matcher.register("GET", "/users/:userId/posts/:postId", handler);

      const result = matcher.match("GET", "/users/123/posts/456");

      expect(result).not.toBeNull();
      expect(result!.params).toEqual({ userId: "123", postId: "456" });
    });

    it("should handle URL decoding in parameters", () => {
      const handler = jest.fn();
      matcher.register("GET", "/search/:query", handler);

      const result = matcher.match("GET", "/search/hello%20world");

      expect(result).not.toBeNull();
      expect(result!.params).toEqual({ query: "hello world" });
    });

    it("should be case insensitive for HTTP methods", () => {
      const handler = jest.fn();
      matcher.register("GET", "/users", handler);

      const result1 = matcher.match("get", "/users");
      const result2 = matcher.match("GET", "/users");
      const result3 = matcher.match("Get", "/users");

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(result3).not.toBeNull();
    });

    it("should distinguish between different HTTP methods", () => {
      const getHandler = jest.fn();
      const postHandler = jest.fn();

      matcher.register("GET", "/users", getHandler);
      matcher.register("POST", "/users", postHandler);

      const getResult = matcher.match("GET", "/users");
      const postResult = matcher.match("POST", "/users");

      expect(getResult!.handler).toBe(getHandler);
      expect(postResult!.handler).toBe(postHandler);
    });

    it("should return null for non-matching routes", () => {
      const handler = jest.fn();
      matcher.register("GET", "/users", handler);

      const result = matcher.match("GET", "/posts");

      expect(result).toBeNull();
    });

    it("should return first matching route (first-match-wins)", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      matcher.register("GET", "/users/:id", handler1);
      matcher.register("GET", "/users/123", handler2);

      const result = matcher.match("GET", "/users/123");

      expect(result!.handler).toBe(handler1);
      expect(result!.params).toEqual({ id: "123" });
    });

    it("should include mock options in match result", () => {
      const handler = jest.fn();
      const options = { delay: 1000, headers: { "X-Test": "value" } };

      matcher.register("GET", "/users", handler, options);

      const result = matcher.match("GET", "/users");

      expect(result!.options).toEqual(options);
    });

    it("should handle wildcard patterns", () => {
      const handler = jest.fn();
      matcher.register("GET", "/files/(.*)", handler);

      const result = matcher.match("GET", "/files/documents/test.pdf");

      expect(result).not.toBeNull();
      expect(result!.params).toEqual({ "0": "documents/test.pdf" });
    });

    it("should handle optional parameters", () => {
      const handler = jest.fn();
      matcher.register("GET", "/users/:id?", handler);

      const result1 = matcher.match("GET", "/users");
      const result2 = matcher.match("GET", "/users/123");

      expect(result1).not.toBeNull();
      expect(result1!.params).toEqual({});

      expect(result2).not.toBeNull();
      expect(result2!.params).toEqual({ id: "123" });
    });
  });

  describe("getRoutes()", () => {
    it("should return all registered routes", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const options = { delay: 500 };

      matcher.register("GET", "/users", handler1);
      matcher.register("POST", "/users/:id", handler2, options);

      const routes = matcher.getRoutes();

      expect(routes).toHaveLength(2);
      expect(routes).toContainEqual({
        method: "GET",
        path: "/users",
        options: {},
      });
      expect(routes).toContainEqual({
        method: "POST",
        path: "/users/:id",
        options,
      });
    });
  });

  describe("clear()", () => {
    it("should remove all registered routes", () => {
      const handler = jest.fn();
      matcher.register("GET", "/users", handler);
      matcher.register("POST", "/posts", handler);

      matcher.clear();

      expect(matcher.getRoutes()).toHaveLength(0);
      expect(matcher.match("GET", "/users")).toBeNull();
    });
  });

  describe("unregister()", () => {
    it("should remove specific route and return true", () => {
      const handler = jest.fn();
      matcher.register("GET", "/users", handler);
      matcher.register("POST", "/users", handler);

      const result = matcher.unregister("GET", "/users");

      expect(result).toBe(true);
      expect(matcher.match("GET", "/users")).toBeNull();
      expect(matcher.match("POST", "/users")).not.toBeNull();
    });

    it("should return false for non-existent route", () => {
      const result = matcher.unregister("GET", "/nonexistent");

      expect(result).toBe(false);
    });
  });
});
