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
      console.log("Handler called with:", {
        method: req.method,
        path: req.path,
        params: req.params,
        query: req.query,
      });
      return ResponseBuilder.json({
        id: req.params.id,
        name: "John Doe",
      });
    });

    // Make request
    const response = await fetch("/api/users/123?page=1");
    const data = await response.json();

    console.log("Response data:", data);
    console.log("Captured request:", capturedRequest);

    expect(capturedRequest).toBeDefined();
    expect(capturedRequest.params).toEqual({ id: "123" });
  });

  it("should debug POST request body parsing", async () => {
    let capturedRequest: any;

    // Register POST route
    apiMock.post("/api/users", (req) => {
      console.log("------ captured request -------- ", req);
      capturedRequest = req;
      console.log("POST Handler called with:", {
        method: req.method,
        path: req.path,
        body: req.body,
      });
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
    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    console.log("POST Response data:", data);
    console.log("POST Captured request:", capturedRequest);

    expect(capturedRequest).toBeDefined();
    expect(capturedRequest.body).toEqual(userData);
  });
});
