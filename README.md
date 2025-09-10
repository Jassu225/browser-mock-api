# Browser Mock API

A comprehensive TypeScript library for intercepting and mocking fetch requests in browser environments. Perfect for frontend development, testing, and prototyping without backend dependencies.

## Features

- 🚀 **Automatic Setup** - Activates automatically when registering routes or middleware
- 🎯 **Full HTTP Support** - GET, POST, PUT, PATCH, DELETE with TypeScript generics
- 🛣️ **Flexible Routing** - Path-to-regexp patterns with parameter extraction
- 🔧 **Response Builders** - JSON, text, HTML, empty, redirect, and error responses
- ⚡ **Middleware Pipeline** - Apply common logic across endpoints
- ⏱️ **Network Simulation** - Configurable delays to test loading states
- 📊 **Stateful Mocking** - Persistent data stores across requests
- 🔍 **Event System** - Monitor request lifecycle for debugging
- 🎯 **TypeScript First** - Full type safety and IntelliSense support
- 🧪 **Test Friendly** - Easy setup/teardown for testing environments

## Installation

```bash
npm install browser-mock-api
```

## Quick Start

```typescript
import apiMock from "browser-mock-api";

// Register a simple GET endpoint
apiMock.get("/api/users/:id", (req) => {
  return apiMock.response.json({
    id: req.params.id,
    name: "John Doe",
    email: "john@example.com",
  });
});

// Register a POST endpoint with typed body
interface CreateUser {
  name: string;
  email: string;
}

apiMock.post<CreateUser>("/api/users", (req) => {
  return apiMock.response.json(
    {
      id: Date.now().toString(),
      ...req.body,
    },
    { status: 201 }
  );
});

// Now all fetch requests are automatically intercepted
const user = await fetch("/api/users/123").then((res) => res.json());
console.log(user); // { id: '123', name: 'John Doe', email: 'john@example.com' }
```

## Setup & Activation

The mock system **activates automatically** when you register your first route or middleware:

```typescript
// These methods automatically call setup() internally:
apiMock.get("/api/users", handler); // ✅ Auto-setup
apiMock.post("/api/users", handler); // ✅ Auto-setup
apiMock.use(middleware); // ✅ Auto-setup

// For event listeners only, you may need manual setup:
apiMock.setup(); // 🔧 Manual setup if needed
apiMock.on("ON_REQUEST", handler); // Event listener (no auto-setup)
```

**Manual setup is only needed when:**

- You want to set up event listeners before registering any routes
- You need to ensure mocking is active in testing environments before assertions
- You want explicit control over when fetch interception begins

**Important cleanup methods:**

```typescript
// Clear all registered data but keep mocking active
apiMock.clearAll(); // Removes routes, middleware, events, stores

// Complete shutdown - restores original fetch
apiMock.cleanup(); // Disables mocking and clears all data
```

## API Reference

### HTTP Methods

Register mock endpoints for different HTTP methods:

```typescript
// GET endpoint
apiMock.get("/api/users", (req) => {
  return apiMock.response.json([
    { id: "1", name: "John" },
    { id: "2", name: "Jane" },
  ]);
});

// POST with typed request body
interface User {
  name: string;
  email: string;
}

apiMock.post<User>("/api/users", (req) => {
  // req.body is typed as User
  return apiMock.response.json(
    {
      id: "123",
      ...req.body,
    },
    { status: 201 }
  );
});

// PUT, PATCH, DELETE work similarly
apiMock.put<User>("/api/users/:id", (req) => {
  /* ... */
});
apiMock.patch<Partial<User>>("/api/users/:id", (req) => {
  /* ... */
});
apiMock.delete("/api/users/:id", (req) => {
  /* ... */
});
```

### Route Patterns

Use path-to-regexp patterns for flexible routing:

```typescript
// Path parameters
apiMock.get("/api/users/:id", (req) => {
  console.log(req.params.id); // Extracted from URL
});

// Multiple parameters
apiMock.get("/api/users/:userId/posts/:postId", (req) => {
  console.log(req.params.userId, req.params.postId);
});

// Optional parameters
apiMock.get("/api/posts/:id?", (req) => {
  // Matches both /api/posts and /api/posts/123
});

// Wildcards
apiMock.get("/api/*", (req) => {
  // Matches any path starting with /api/
});
```

### Request Object

The request object passed to handlers contains comprehensive request information:

```typescript
apiMock.post<{ name: string }>("/api/users", (req) => {
  console.log({
    body: req.body, // Parsed JSON body (typed)
    method: req.method, // HTTP method (POST)
    path: req.path, // URL pathname (/api/users)
    params: req.params, // Path parameters {}
    query: req.query, // Query parameters { page: '1' }
    headers: req.headers, // Request headers { 'content-type': 'application/json' }
    baseUrl: req.baseUrl, // Base URL (http://localhost)
    host: req.host, // Host with port (localhost:3000)
    hostname: req.hostname, // Hostname only (localhost)
  });
});
```

### Response Builders

Create different types of responses easily:

```typescript
// JSON response
apiMock.response.json({ message: "Success" });
apiMock.response.json(data, { status: 201, headers: { "X-Custom": "value" } });

// Text response
apiMock.response.text("Plain text content");

// HTML response
apiMock.response.html("<h1>Hello World</h1>");

// Empty response (204 No Content)
apiMock.response.empty();
apiMock.response.empty({ status: 404 });

// Redirect response
apiMock.response.redirect("/new-location");
apiMock.response.redirect("/login", { status: 301 });

// Error response
apiMock.response.error("Something went wrong");
apiMock.response.error("Not found", { status: 404, code: "NOT_FOUND" });
```

### Middleware

Apply common logic across multiple endpoints:

```typescript
// Authentication middleware
apiMock.use(async (req, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return apiMock.response.error("Unauthorized", { status: 401 });
  }

  // Continue to the next middleware or handler
  return next();
});

// Logging middleware
apiMock.use(async (req, next) => {
  console.log(`${req.method} ${req.path}`);
  const response = await next();
  console.log(`Response: ${response.status}`);
  return response;
});

// CORS middleware
apiMock.use(async (req, next) => {
  const response = await next();
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
});
```

### Network Delay Simulation

Simulate network latency for realistic testing:

```typescript
// Add delay to specific endpoints
apiMock.get(
  "/api/slow-endpoint",
  (req) => {
    return apiMock.response.json({ data: "loaded" });
  },
  { delay: 2000 }
); // 2 second delay

// Test loading states
apiMock.get(
  "/api/users",
  (req) => {
    return apiMock.response.json(users);
  },
  { delay: 500 }
);
```

### Stateful Mocking

Create persistent data stores for realistic CRUD operations:

```typescript
// Create a store
const userStore = apiMock.createStore("users", {
  users: [
    { id: "1", name: "John", email: "john@example.com" },
    { id: "2", name: "Jane", email: "jane@example.com" },
  ],
  nextId: 3,
});

// GET all users
apiMock.get("/api/users", (req) => {
  const state = userStore.get();
  return apiMock.response.json(state.users);
});

// POST new user
apiMock.post<{ name: string; email: string }>("/api/users", (req) => {
  userStore.set((state) => ({
    ...state,
    users: [
      ...state.users,
      {
        id: state.nextId.toString(),
        ...req.body,
      },
    ],
    nextId: state.nextId + 1,
  }));

  return apiMock.response.json({ message: "User created" }, { status: 201 });
});

// DELETE user
apiMock.delete("/api/users/:id", (req) => {
  userStore.set((state) => ({
    ...state,
    users: state.users.filter((u) => u.id !== req.params.id),
  }));

  return apiMock.response.empty({ status: 204 });
});
```

### Event System

Monitor request lifecycle for debugging and analytics:

```typescript
// Listen to all requests
apiMock.on("ON_REQUEST", (req) => {
  console.log("Request received:", req.method, req.path);
  // Note: req.params will be empty {} since path parsing hasn't occurred yet
});

// Listen to mocked responses
apiMock.on("ON_MOCK", (req) => {
  console.log("Request mocked:", req.path);
  // req.params is available here after route matching
});

// Listen to network requests (forwarded to real API)
apiMock.on("ON_NETWORK", (req) => {
  console.log("Request forwarded to network:", req.path);
});

// Listen to all responses
apiMock.on("ON_RESPONSE", (req, response) => {
  console.log("Response sent:", response.status, "for", req.path);
  // req.params is available here
});

// Unsubscribe from events
const handler = (req) => console.log(req.path);
apiMock.on("ON_REQUEST", handler);
apiMock.off("ON_REQUEST", handler);
```

**Important:** The `ON_REQUEST` event fires before route matching, so `req.params` will always be an empty object `{}`. Path parameters are only available in `ON_MOCK`, `ON_RESPONSE` events and route handlers after the URL has been matched against registered routes.

### Management & Debugging

Control and inspect the mock system:

```typescript
// Check if mocking is active
console.log(apiMock.isActive()); // true/false

// Get all registered routes
console.log(apiMock.getRoutes());

// Clear specific parts (keeps mocking active)
apiMock.clearRoutes(); // Remove all route handlers
apiMock.clearMiddleware(); // Remove all middleware
apiMock.clearEventListeners(); // Remove all event listeners
apiMock.clearStores(); // Clear all data stores

// Clear everything but keep mocking active
apiMock.clearAll(); // Equivalent to calling all clear methods above

// Unregister specific routes
apiMock.unregister("GET", "/api/users/:id");

// Complete shutdown - disables mocking entirely
apiMock.cleanup(); // Restores original fetch + calls clearAll()
```

**Key differences:**

- `clearAll()` - Removes all registered data but **keeps mocking active**
- `cleanup()` - **Disables mocking entirely** and restores original fetch function

## Testing Integration

Perfect for testing environments:

```typescript
// Jest/Vitest setup
beforeEach(() => {
  apiMock.setup(); // Ensure mocking is active

  // Register test-specific mocks
  apiMock.get("/api/test-data", (req) => {
    return apiMock.response.json({ test: true });
  });
});

afterEach(() => {
  apiMock.clearAll(); // Clean up between tests
});

afterAll(() => {
  apiMock.cleanup(); // Restore original fetch
});
```

## Advanced Examples

### REST API with CRUD Operations

```typescript
interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

// Create store
const todoStore = apiMock.createStore("todos", {
  todos: [] as Todo[],
  nextId: 1,
});

// GET /api/todos
apiMock.get("/api/todos", (req) => {
  const { todos } = todoStore.get();
  return apiMock.response.json(todos);
});

// POST /api/todos
apiMock.post<Omit<Todo, "id">>("/api/todos", (req) => {
  const newTodo: Todo = {
    id: todoStore.get().nextId.toString(),
    ...req.body,
  };

  todoStore.set((state) => ({
    todos: [...state.todos, newTodo],
    nextId: state.nextId + 1,
  }));

  return apiMock.response.json(newTodo, { status: 201 });
});

// PUT /api/todos/:id
apiMock.put<Todo>("/api/todos/:id", (req) => {
  todoStore.set((state) => ({
    ...state,
    todos: state.todos.map((todo) =>
      todo.id === req.params.id ? { ...req.body, id: req.params.id } : todo
    ),
  }));

  return apiMock.response.json({ message: "Updated" });
});

// DELETE /api/todos/:id
apiMock.delete("/api/todos/:id", (req) => {
  todoStore.set((state) => ({
    ...state,
    todos: state.todos.filter((todo) => todo.id !== req.params.id),
  }));

  return apiMock.response.empty({ status: 204 });
});
```

### Authentication Flow

```typescript
const authStore = apiMock.createStore("auth", {
  users: [{ id: "1", email: "user@example.com", password: "password123" }],
  sessions: new Map<string, string>(), // token -> userId
});

// Login endpoint
apiMock.post<{ email: string; password: string }>("/api/auth/login", (req) => {
  const { email, password } = req.body;
  const state = authStore.get();

  const user = state.users.find(
    (u) => u.email === email && u.password === password
  );
  if (!user) {
    return apiMock.response.error("Invalid credentials", { status: 401 });
  }

  const token = `token_${Date.now()}`;
  authStore.set((state) => ({
    ...state,
    sessions: new Map(state.sessions).set(token, user.id),
  }));

  return apiMock.response.json({
    token,
    user: { id: user.id, email: user.email },
  });
});

// Protected route middleware
apiMock.use(async (req, next) => {
  // Skip auth for login endpoint
  if (req.path === "/api/auth/login") {
    return next();
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !authStore.get().sessions.has(token)) {
    return apiMock.response.error("Unauthorized", { status: 401 });
  }

  return next();
});
```

## TypeScript Support

Full TypeScript support with generics for request bodies:

```typescript
interface CreateUserRequest {
  name: string;
  email: string;
  age?: number;
}

interface User extends CreateUserRequest {
  id: string;
  createdAt: string;
}

// Type-safe request body
apiMock.post<CreateUserRequest>("/api/users", (req) => {
  // req.body is typed as CreateUserRequest
  const user: User = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...req.body, // TypeScript ensures this matches CreateUserRequest
  };

  return apiMock.response.json(user);
});
```

## Browser Compatibility

- Modern browsers with fetch API support
- Node.js environments with fetch polyfill
- Works with bundlers like Webpack, Vite, Rollup
- Compatible with React, Vue, Angular, and vanilla JavaScript

## License

MIT
