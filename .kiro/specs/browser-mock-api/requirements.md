# Requirements Document

## Introduction

This document outlines the requirements for a TypeScript npm package that provides browser-based API mocking capabilities. The package enables developers to intercept and mock HTTP requests during development and testing by wrapping the global fetch function. It supports dynamic route matching, typed request bodies, response helpers, middleware, delay simulation, and stateful mocking while maintaining full compatibility with the original fetch API for unmatched requests.

## Requirements

### Requirement 1

**User Story:** As a frontend developer, I want to enable API mocking through an environment variable, so that I can easily toggle mocking on/off without code changes.

#### Acceptance Criteria

1. WHEN the environment variable is set to enable mocking THEN the package SHALL wrap the global fetch function
2. WHEN the environment variable is not set or disabled THEN the package SHALL NOT modify the global fetch function
3. WHEN mocking is disabled THEN all fetch requests SHALL behave exactly as the original fetch API

### Requirement 2

**User Story:** As a developer, I want to define mock endpoints using HTTP method-specific functions, so that I can easily set up different responses for different API calls.

#### Acceptance Criteria

1. WHEN I call apiMock.get() with a path pattern and handler THEN the system SHALL register a GET endpoint mock
2. WHEN I call apiMock.post() with a path pattern and handler THEN the system SHALL register a POST endpoint mock
3. WHEN I call apiMock.put() with a path pattern and handler THEN the system SHALL register a PUT endpoint mock
4. WHEN I call apiMock.patch() with a path pattern and handler THEN the system SHALL register a PATCH endpoint mock
5. WHEN I call apiMock.delete() with a path pattern and handler THEN the system SHALL register a DELETE endpoint mock
6. WHEN a fetch request matches a registered mock THEN the system SHALL call the corresponding handler function

### Requirement 3

**User Story:** As a developer, I want to use path-to-regexp patterns for route matching, so that I can create flexible endpoint patterns with parameters.

#### Acceptance Criteria

1. WHEN I define a mock with a path pattern containing parameters THEN the system SHALL extract parameters using path-to-regexp
2. WHEN a request matches a parameterized pattern THEN the system SHALL provide extracted parameters in the request object
3. WHEN multiple patterns could match a request THEN the system SHALL use the first registered matching pattern
4. WHEN no patterns match a request THEN the system SHALL forward the request to the original fetch function

### Requirement 4

**User Story:** As a TypeScript developer, I want to type the request body for mock handlers, so that I get proper type safety and IntelliSense support.

#### Acceptance Criteria

1. WHEN I define a mock handler with a generic type parameter THEN the request body SHALL be typed accordingly
2. WHEN no type parameter is provided THEN the request body type SHALL default to undefined
3. WHEN the type parameter is provided THEN it SHALL extend object type
4. WHEN accessing the request body in the handler THEN TypeScript SHALL provide proper type checking and autocomplete

### Requirement 5

**User Story:** As a developer, I want access to comprehensive request information in mock handlers, so that I can create realistic mock responses based on the incoming request.

#### Acceptance Criteria

1. WHEN a mock handler is called THEN the request object SHALL contain the parsed JSON body
2. WHEN a mock handler is called THEN the request object SHALL contain baseUrl, method, path, host, hostname properties
3. WHEN a mock handler is called THEN the request object SHALL contain extracted path parameters
4. WHEN a mock handler is called THEN the request object SHALL contain parsed query parameters
5. WHEN a mock handler is called THEN the request object SHALL contain request headers
6. WHEN the request body is not valid JSON THEN the system SHALL handle the error gracefully

### Requirement 6

**User Story:** As a developer, I want response helper utilities, so that I can easily create properly formatted HTTP responses.

#### Acceptance Criteria

1. WHEN I use apiMock.response.json() THEN the system SHALL create a Response object with JSON content-type header
2. WHEN I use apiMock.response.json() with status options THEN the system SHALL set the appropriate HTTP status code
3. WHEN I use response helpers THEN the system SHALL return a standard Response object compatible with fetch API
4. WHEN I create responses manually THEN the system SHALL accept any Response object from handlers

### Requirement 7

**User Story:** As a developer, I want middleware support, so that I can apply common logic across multiple mock endpoints.

#### Acceptance Criteria

1. WHEN I register middleware using apiMock.use() THEN the system SHALL execute middleware before matching route handlers
2. WHEN middleware calls next() THEN the system SHALL continue to the next middleware or route handler
3. WHEN middleware returns a response without calling next() THEN the system SHALL use that response and skip further processing
4. WHEN multiple middleware are registered THEN the system SHALL execute them in registration order
5. WHEN middleware throws an error THEN the system SHALL handle it gracefully and continue processing

### Requirement 8

**User Story:** As a developer, I want to simulate network delays in mock responses, so that I can test loading states and timeout scenarios.

#### Acceptance Criteria

1. WHEN I specify a delay option for a mock endpoint THEN the system SHALL wait the specified milliseconds before returning the response
2. WHEN no delay is specified THEN the system SHALL return responses immediately
3. WHEN delay is specified THEN the system SHALL use setTimeout or equivalent to simulate network latency
4. WHEN delay is zero or negative THEN the system SHALL return responses immediately

### Requirement 9

**User Story:** As a developer, I want stateful mock capabilities, so that I can simulate realistic API behavior with data persistence across requests.

#### Acceptance Criteria

1. WHEN I create a mock store using apiMock.createStore() THEN the system SHALL provide a stateful data container
2. WHEN I modify data in a mock store THEN the changes SHALL persist across subsequent requests
3. WHEN I access mock store data in handlers THEN the system SHALL provide the current state
4. WHEN the application reloads THEN mock store data SHALL reset to initial state
5. WHEN multiple stores are created THEN each SHALL maintain independent state

### Requirement 10

**User Story:** As a developer, I want unmatched requests to use the original fetch function, so that real API calls continue to work normally.

#### Acceptance Criteria

1. WHEN a request doesn't match any registered mock patterns THEN the system SHALL forward it to the original fetch function
2. WHEN forwarding requests THEN the system SHALL preserve all original request properties and options
3. WHEN the original fetch returns a response THEN the system SHALL return it unchanged
4. WHEN the original fetch throws an error THEN the system SHALL propagate the error unchanged

### Requirement 11

**User Story:** As a developer, I want event notifications for request lifecycle events, so that I can monitor, debug, and log API interactions during development.

#### Acceptance Criteria

1. WHEN any fetch request is initiated THEN the system SHALL emit an ON_REQUEST event with the request object
2. WHEN a request matches a mock pattern and is handled by a mock handler THEN the system SHALL emit an ON_MOCK event with the request object
3. WHEN a request is forwarded to the original fetch function THEN the system SHALL emit an ON_NETWORK event with the request object
4. WHEN any response is returned (mock or network) THEN the system SHALL emit an ON_RESPONSE event with both request and response objects
5. WHEN I subscribe to events using apiMock.on() THEN the system SHALL call my handler function when the corresponding event occurs
6. WHEN I unsubscribe from events using apiMock.off() THEN the system SHALL stop calling the specified handler function
7. WHEN multiple handlers are registered for the same event THEN the system SHALL call all handlers in registration order