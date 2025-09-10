/**
 * Debug integration test
 */

import { apiMock } from "../api-mock";
import { ResponseBuilder } from "../response-builder";

describe("Debug Integration", () => {
  beforeEach(() => {
    apiMock.setup();
  });

  afterEach(() => {
    apiMock.cleanup();
  });

  it("should debug route matching", async () => {
    let capturedRequest: any;

    // Register route
    apiMock.get("/api/users/:id", (req) => {
      capturedRequest = req;
      return ResponseBuilder.json({
        id: req.params.id,
        name: "John Doe",
      });
    });

    // Make request
    await fetch("/api/users/123?page=1");

    expect(capturedRequest).toBeDefined();
    expect(capturedRequest.params).toEqual({ id: "123" });
  });

  it("should debug POST request body parsing", async () => {
    let capturedRequest: any;

    // Register POST route
    apiMock.post("/api/users", (req) => {
      capturedRequest = req;
      return ResponseBuilder.json(
        {
          id: 1,
          ...(req.body || {}),
        },
        { status: 201 }
      );
    });

    const userData = {
      name: "Jane Doe",
      email: "jane@example.com",
      age: 25,
    };

    // Make POST request
    await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    expect(capturedRequest).toBeDefined();
    expect(capturedRequest.body).toEqual(userData);
  });
});
