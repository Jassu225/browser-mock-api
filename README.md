# Browser Mock API

A comprehensive TypeScript library for intercepting and mocking fetch requests in browser environments. Perfect for frontend development, testing, and prototyping without backend dependencies.

## Features

- 🎛️ **Manual Control** - Enable/disable mocking programmatically with full control
- 🎯 **Full HTTP Support** - GET, POST, PUT, PATCH, DELETE with TypeScript generics
- 🛣️ **Flexible Routing** - Path-to-regexp patterns with parameter extraction
- 🔧 **Response Builders** - JSON, text, HTML, empty, redirect, and error responses
- ⚡ **Middleware Pipeline** - Apply common logic across endpoints
- ⏱️ **Network Simulation** - Configurable delays to test loading states
- 📊 **Stateful Mocking** - Persistent data stores across requests
- 🔍 **Event System** - Monitor request lifecycle for debugging
- 🎯 **TypeScript First** - Full type safety and IntelliSense support
- 🧪 **Test Friendly** - Easy setup/teardown for testing environments
- 🔄 **Backward Compatible** - `setup()` method still available as alias

## Dependencies

This package uses [path-to-regexp](https://github.com/pillarjs/path-to-regexp/tree/f1253b47b347dcb909e3e80b0eb2649109e59894) version 6.x for flexible URL pattern matching and parameter extraction. This version provides excellent performance and supports all the routing patterns shown in the examples above.

## Installation

```bash
npm install browser-mock-api
```

## Quick Start

```typescript
import apiMock from "browser-mock-api";

// 1. Enable the mock system
apiMock.enable();

// 2. Register a simple GET endpoint
apiMock.get("/api/users/:id", (req) => {
  return apiMock.response.json({
    id: req.params.id,
    name: "John Doe",
    email: "john@example.com",
  });
});

// 3. Register a POST endpoint with typed body
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

// 4. Now all fetch requests are intercepted
const user = await fetch("/api/users/123").then((res) => res.json());
console.log(user); // { id: '123', name: 'John Doe', email: 'john@example.com' }

// 5. Temporarily disable when done (preserves all data)
apiMock.disable();

// Or completely reset (removes all routes/data - rarely needed)
// apiMock.cleanup();
```

## Setup & Activation

The mock system requires **manual activation** for full control over when fetch interception begins:

```typescript
import apiMock from "browser-mock-api";

// Call enable() to activate fetch interception
apiMock.enable(); // 🔧 Required to activate mocking

// Register routes (can be done before or after enable())
apiMock.get("/api/users", handler);
apiMock.post("/api/users", handler);
apiMock.use(middleware);
apiMock.on("ON_REQUEST", handler);
```

**Manual activation gives you:**

- **Full control** over when fetch interception starts and stops
- **Predictable behavior** in testing environments
- **No surprises** - mocking only happens when you explicitly enable it
- **Easy debugging** - clear activation/deactivation points

**Control methods:**

```typescript
// Enable mocking (start intercepting fetch requests)
apiMock.enable();

// Disable mocking (stop intercepting, keep all data, routes and listeners intact)
apiMock.disable();

// ⚠️ Complete reset - removes ALL data and restores original fetch
apiMock.cleanup(); // Unregisters routes, clears stores, removes listeners
```

**Important:** Use `disable()` if you want to temporarily pause mocking and re-enable later. Only use `cleanup()` when you need to completely reset the mock system - it will **permanently remove all your registered routes, stored data, and event listeners**.

**Backward Compatibility:** `apiMock.setup()` is still available as an alias for `apiMock.enable()`.

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
apiMock.get("/api/(.*)", (req) => {
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
// Enable mocking
apiMock.enable();

// Check if mocking is active
console.log(apiMock.isActive()); // true/false

// Get all registered routes
console.log(apiMock.getRoutes());

// Unregister specific routes
apiMock.unregister("GET", "/api/users/:id");

// Temporarily disable mocking (preserves all data, routes and listeners)
apiMock.disable();

// Later, re-enable with all data intact
apiMock.enable(); // All routes, middleware, stores still available

// ⚠️ DESTRUCTIVE: Complete reset (rarely needed)
apiMock.cleanup(); // Permanently removes ALL routes, middleware, events, stores
```

**Control Methods:**

- `enable()` - Start intercepting fetch requests
- `disable()` - **Temporarily** stop intercepting (keeps all data, routes and listeners intact for later re-enabling)
- `cleanup()` - **Permanently** remove all data and restore original fetch

**When to use each:**

- **Most common:** `enable()` → register routes → `disable()` → `enable()` (cycle as needed)
- **Rarely needed:** `cleanup()` - only for complete system reset or dynamic reconfiguration
- **Testing:** Use `cleanup()` in `afterEach()` to ensure clean test isolation

**⚠️ Important about `cleanup()`:**
`cleanup()` will **permanently delete** all your registered routes, middleware, event listeners, and stored data. If you just want to temporarily pause mocking and re-enable it later with the same configuration, use `disable()` instead. You generally don't need `cleanup()` unless you're dynamically reconfiguring the entire mock system.

## Advanced Examples

### REST API with CRUD Operations

```typescript
import apiMock from "browser-mock-api";

// Enable mocking
apiMock.enable();

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
import apiMock from "browser-mock-api";

// Enable mocking
apiMock.enable();

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
import apiMock from "browser-mock-api";

// Enable mocking
apiMock.enable();

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
