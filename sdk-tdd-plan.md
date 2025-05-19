# Test-Driven Development Plan: Bun-Optimized Datastar SDK

This plan outlines the iterative steps to develop the Datastar Bun-Optimized SDK using the provided test suite. Each phase focuses on a specific set of requirements, starting with the simplest tests and progressively building functionality.

**Legend:**

* 🧪 **Test(s):** Specifies which tests from the suite are the focus.
* 👨‍💻 **Implementation Goal:** Describes the SDK code to be written to make the tests pass.
* 🔄 **Refactor/Review:** Points for code cleanup, improvement, or deeper consideration.

---

## Phase 0: Project Setup & Basic Test Infrastructure

* **🧪 Test(s):**
  * Ability to run `bun test` on an empty test file or a very basic "hello world" test.
* 👨‍💻 **Implementation Goal:**
    1. Initialize a new Bun project: `bun init`.
    2. Configure `tsconfig.json` for Bun and TypeScript strictness (as per requirements).
    3. Set up `datastar-sdk.test.ts` (or similar).
    4. Implement the global `fetch` mock infrastructure (`mockFetchResponses`, `global.fetch = mock(...)`, `createMockSSEStream`) within the test file.
    5. Ensure a placeholder test like `it('should run tests', () => expect(true).toBe(true));` passes.
* 🔄 **Refactor/Review:**
  * Verify the `fetch` mock can be controlled (i.e., different responses can be set for different URLs/methods).

---

## Phase 1: Core SDK Initialization & Configuration (REQ-CORE-001)

* **🧪 Test(s):**
  * `describe('REQ-CORE-001: Initialization & Configuration')`:
    * `AC.1-AC.4: should initialize with provided URLs and token`
    * `AC.7: should use default timeout and retry options if not specified`
* 👨‍💻 **Implementation Goal:**
    1. Create `src/index.ts` (or `src/sdk.ts`).
    2. Define the `DatastarBunSDK` class structure.
    3. Implement the constructor to accept `DatastarSDKOptions`.
    4. Store `apiBaseUrl`, `sseUrl`, and `authToken` (static string initially).
    5. Define and set default values for `requestTimeout` and `retryOptions` in the constructor if not provided.
    6. Define the `DatastarSDKOptions` interface.
* 🔄 **Refactor/Review:**
  * Clarity of option names and default values.
  * Basic type safety for options.

---

## Phase 2: Authentication (REQ-CORE-002) & Basic API Call (REQ-DATA-002 - GetRecord)

* **🧪 Test(s):**
  * `describe('REQ-CORE-001: Initialization & Configuration')`:
    * `AC.4: should use a token provider function`
  * `describe('REQ-CORE-002: Authentication')`:
    * `AC.1: should include Authorization header in API calls`
  * `describe('REQ-DATA-002: Read Record')`:
    * `AC.1-AC.3: should retrieve a record by ID`
* 👨‍💻 **Implementation Goal:**
    1. Modify the SDK constructor and internal logic to handle `authToken` as a function (string or `() => string | Promise<string>`).
    2. Create a private helper method like `_getAuthHeaders()` that resolves the token.
    3. Implement the `getRecord<T>(collection: string, recordId: string, options?: RequestOptions)` method.
        * It should use the (mocked) `fetch`.
        * It should call `_getAuthHeaders()` and include the `Authorization: Bearer <token>` header.
        * It should parse the JSON response.
    4. Define `RequestOptions` interface (initially can be empty or have `timeout`).
* 🔄 **Refactor/Review:**
  * Asynchronous handling of token functions.
  * Correctness of URL construction for `getRecord`.
  * Header merging if other default headers are introduced.

---

## Phase 3: Error Handling (REQ-CORE-003) & Advanced API Call Aspects

* **🧪 Test(s):**
  * `describe('REQ-DATA-002: Read Record')`:
    * `AC.4: should throw DatastarRecordNotFoundError for 404`
  * (Add new tests for `DatastarAPIError` for other status codes, e.g., 500)
  * (Add new tests for `DatastarAuthenticationError` for 401/403)
  * (Add new tests for `DatastarConnectionError` for network failures - may require more advanced fetch mock capabilities to simulate network down)
  * (Add tests for per-request timeout overrides for `getRecord`)
* 👨‍💻 **Implementation Goal:**
    1. Define custom error classes: `DatastarError` (base), `DatastarAPIError`, `DatastarRecordNotFoundError`, `DatastarAuthenticationError`, `DatastarConnectionError`.
        * `DatastarAPIError` should store `statusCode`, `responseBody`.
    2. Modify `getRecord` (and future API methods) to:
        * Check `response.ok`. If not, parse error and throw appropriate custom error (e.g., `DatastarRecordNotFoundError` for 404, `DatastarAuthenticationError` for 401/403, `DatastarAPIError` otherwise).
        * Wrap `fetch` calls in `try...catch` to catch network errors and throw `DatastarConnectionError`.
    3. Implement basic request timeout handling using `AbortController` with `fetch`.
    4. Implement basic retry logic for API calls (start with `maxRetries` and `initialDelay`, no backoff yet).
* 🔄 **Refactor/Review:**
  * Consistency of error objects.
  * Clarity of error messages.
  * Robustness of retry and timeout logic.

---

## Phase 4: Remaining CRUD Operations (REQ-DATA-001, 003, 004, 005)

* **🧪 Test(s):**
  * `describe('REQ-DATA-001: Create Record')`
  * `describe('REQ-DATA-003: Update Record')` (Write these tests)
  * `describe('REQ-DATA-004: Delete Record')` (Write these tests)
  * `describe('REQ-DATA-005: List/Query Records')`
* 👨‍💻 **Implementation Goal:**
  * **Iterate for each operation (Create, Update, Delete, List):**
        1.  Define the SDK method (e.g., `createRecord`, `updateRecord`, `deleteRecord`, `listRecords`).
        2.  Implement the method to make the correct HTTP request (`POST`, `PUT/PATCH`, `DELETE`, `GET` with query params).
        3.  Ensure it uses authentication, error handling, timeout, and retry logic developed in previous phases.
        4.  For `listRecords`, implement query parameter encoding (`DatastarQueryParams`).
        5.  Ensure return types are correct and typed (e.g., using generics `T`).
* 🔄 **Refactor/Review:**
  * Code duplication across CRUD methods (e.g., a common request-making private helper).
  * Completeness of `DatastarQueryParams` and its encoding.
  * Handling of different success statuses (e.g., 201 for create, 200/204 for delete).

---

## Phase 5: Basic SSE Client Setup (Part of REQ-SSE-001)

* **🧪 Test(s):**
  * `describe('SSE Functionality')`:
    * `REQ-SSE-001-AC.5 (open): should emit sse_open on successful connection`
  * (Add tests for SSE client instantiation within the SDK)
  * (Add tests for passing SSE URL and auth token to SSE client)
* 👨‍💻 **Implementation Goal:**
    1. Create `src/sse-client.ts` (or similar).
    2. Define the `SSEClient` class structure.
    3. Implement its constructor to accept URL, headers, and basic options.
    4. Implement a `connect()` method that uses (mocked) `fetch` to connect to the SSE URL.
        * It should set `Accept: text/event-stream` and `Cache-Control: no-cache` headers.
        * It should include the `Authorization` header.
    5. Use Node.js `EventEmitter` (available in Bun) for event handling within `SSEClient`.
    6. On successful connection (response.ok and content-type is correct), emit an `open` event.
    7. In `DatastarBunSDK`, instantiate `SSEClient` (e.g., as `this.sse`).
    8. Expose a way to listen to `sse_open` from the main SDK instance, which internally listens to the `SSEClient`'s `open` event.
* 🔄 **Refactor/Review:**
  * SSEClient options and their defaults.
  * Error handling for initial SSE connection failure (emit `sse_error` from SDK).

---

### Phase 6: SSE Message Parsing & Dispatch (REQ-SSE-002)

* **🧪 Test(s):**
  * `describe(\'SSE Functionality\')`:
    * `REQ-SSE-002-AC.1-AC.4: should parse and emit typed SSE events`
  * Tests for multi-line data handling.
  * Tests for messages with no `event` field (defaulting to `message`).
  * Tests for SSE comments being ignored or optionally emitted.
  * Tests for `id:` field parsing and association with event data.
  * Tests for `retry:` field parsing.
  * Tests for correct dispatch of events using `queueMicrotask`.
  * Tests for `lastEventId` being updated.
  * Tests for server-sent `retry` value being stored.

* 👨‍💻 **Implementation Goal (`DataStarSSEClient` / `SSEClient` internal methods):**
  1. **`_processEventStream(stream: ReadableStream)` Method:**
     * Initialize `const reader = stream.getReader();` and `const decoder = new TextDecoder();`.
     * Maintain a `let buffer = \'\';`.
     * Loop (`while (true)`) to read chunks: `const { done, value } = await reader.read();`.
     * If `done`, handle disconnection (see Phase 7) and break.
     * Append to buffer: `buffer += decoder.decode(value, { stream: true });`.
     * Call a helper `_extractAndProcessEventsFromBuffer()` to handle parsing and dispatch from the current buffer.
  2. **`_extractAndProcessEventsFromBuffer()` Method (Manages `buffer` state):**
     * Loop while the buffer contains complete event messages (delimited by `\\n\\n`).
     * Find `eventEnd = buffer.indexOf(\'\\n\\n\', position);`. If not found, break.
     * Extract `const eventBlock = buffer.substring(position, eventEnd);`.
     * Update `position = eventEnd + 2;`.
     * Call `const parsedEvent = this._parseEvent(eventBlock);`.
     * If `parsedEvent`, call `this._dispatchEvent(parsedEvent);`.
     * After the loop, update the main buffer: `buffer = buffer.substring(position);`.
  3. **`_parseEvent(eventBlock: string)` Method:**
     * Initialize an `event` object (e.g., `{ id: null, eventName: \'message\', data: \'\', retry: null }`).
     * Split `eventBlock` into lines.
     * Iterate through lines:
       * If `line.startsWith(\'id:\')`, set `event.id = line.substring(3).trim();`. Store this as `this.lastEventId = event.id;`.
       * If `line.startsWith(\'event:\')`, set `event.eventName = line.substring(6).trim();`.
       * If `line.startsWith(\'data:\')`, append to `event.data` (handle multi-line: `event.data += (event.data ? \'\\n\' : \'\') + line.substring(5).trim();`).
       * If `line.startsWith(\'retry:\')`, parse `const retryValue = parseInt(line.substring(6).trim(), 10);` and if valid, set `event.retry = retryValue;`. Store this as `this.currentServerRetry = event.retry;` (to be used in reconnection logic).
       * If `line.startsWith(\':\')`, handle as a comment (ignore or emit a specific `comment` event).
     * Attempt `JSON.parse(event.data)`. If it fails, keep data as a string.
     * Return the `event` object.
  4. **`_dispatchEvent(parsedEvent)` Method:**
     * If `parsedEvent.id`, update `this.lastEventId = parsedEvent.id;`. (Redundant if already set in `_parseEvent`, ensure one source of truth).
     * If `parsedEvent.retry` is valid, update `this.currentServerRetry = parsedEvent.retry;`.
     * Use `queueMicrotask(() => { ... });` for dispatching.
     * Inside `queueMicrotask`, emit `parsedEvent.eventName` with `parsedEvent.data` (and potentially `parsedEvent.id`) using the chosen event emission mechanism (e.g., `EventEmitter.emit`).
     * If `parsedEvent.eventName !== \'message\'`, also consider emitting a generic `\'message\'` event with the full `parsedEvent` object.
     * Call `this._resetHeartbeatTimer()` (see Phase 8).

* 🔄 **Refactor/Review:**
  * Robustness of the SSE message parser against malformed messages.
  * Efficiency of stream processing and buffer management.
  * Type safety for emitted event payloads (using generics).
  * Clear separation of concerns between reading, parsing, and dispatching.
  * Ensure `lastEventId` and `currentServerRetry` are consistently updated and accessed.

---

### Phase 7: SSE Reconnection Logic (REQ-SSE-003)

* **🧪 Test(s):**
  * `describe(\'SSE Functionality\')`:
    * `REQ-SSE-003-AC.1/AC.2 (reconnect): should attempt to reconnect with Last-Event-ID on stream end`
    * `REQ-SSE-003-AC.3 (retry field): should use server-sent retry value`
  * Tests for exponential backoff with jitter if no server `retry:` field is available or after the first attempt using server retry.
  * Tests for `maxRetries` limit and `sse_close` event with `intentional: false`.
  * Tests for `sse_reconnecting` event emission.
  * Tests for `currentRetry` counter being reset on successful connection.

* 👨‍💻 **Implementation Goal (`DataStarSSEClient` / `SSEClient` internal methods):**
  1. **`_handleDisconnect(isError: boolean)` Method (Called when stream ends or an error occurs mid-stream):**
     * If `this.isExplicitlyClosed` or (if `this.controller` exists and `this.controller.signal.aborted` was due to explicit close), do nothing further regarding reconnection.
     * Otherwise, call `this._scheduleReconnect();`.
  2. **`_scheduleReconnect()` Method:**
     * If `this.reconnectTimer`, clear it: `clearTimeout(this.reconnectTimer);`.
     * If `this.retryAttempts >= this.config.maxRetries`, emit `close` event (`intentional: false, reason: \'max_retries_reached\'`) and stop.
     * Calculate `delay`:
       * If `this.currentServerRetry` is set (and perhaps a flag indicating it\'s the first attempt after receiving it), use `delay = this.currentServerRetry;`. Clear `this.currentServerRetry` after use so subsequent retries use backoff unless a new `retry:` is received.
       * Else, calculate exponential backoff with jitter: `const baseDelay = this.config.initialRetryDelay * Math.pow(this.config.backoffFactor, this.retryAttempts); delay = Math.min(this.config.maxRetryDelay, baseDelay) * (0.9 + Math.random() * 0.2);` (adjust factors as needed).
     * Increment `this.retryAttempts++`.
     * Emit `reconnecting` event with `{ attempt: this.retryAttempts, delay }`.
     * `this.reconnectTimer = setTimeout(() => { this.connect({ isReconnect: true }); }, delay);`.
  3. **Modify `connect({ isReconnect = false } = {})` Method:**
     * At the start: if `!isReconnect`, reset `this.retryAttempts = 0;`.
     * When establishing the `fetch` call:
       * If `this.lastEventId`, include `headers: { \'Last-Event-ID\': this.lastEventId }`.
     * On successful connection establishment (e.g., after `response.ok` and `_processEventStream` is about to start):
       * Reset `this.retryAttempts = 0;`.
       * Emit `open` event.
       * Call `this._startHeartbeatTimer()` (see Phase 8).

* 🔄 **Refactor/Review:**
  * State management for reconnection (`retryAttempts`, `currentServerRetry`, `isExplicitlyClosed`).
  * Correctness of delay calculation, especially the interplay between server-sent `retry` and exponential backoff.
  * Ensure `AbortController` signal is properly handled to distinguish intentional closure from errors triggering reconnection.
  * Clear definition of "successful connection" for resetting retry attempts.

---

### Phase 8: SSE Client-Side Heartbeat (REQ-SSE-004)

* **🧪 Test(s):**
  * Tests for SSE heartbeat: if no message (data or comment) for `heartbeatInterval`, connection is aborted and reconnection starts.
  * Test that heartbeat timer is reset upon receiving any SSE frame (data or comment).
  * Test that heartbeat is configurable and disabled if interval is 0 or not set.

* 👨‍💻 **Implementation Goal (`DataStarSSEClient` / `SSEClient` internal methods):**
  1. **Configuration:** Add `heartbeatInterval` to client options (default to e.g., 30000ms, 0 to disable).
  2. **`_startHeartbeatTimer()` Method:**
     * Call `this._stopHeartbeatTimer();` first.
     * If `this.config.heartbeatInterval > 0`:
       * `this.heartbeatTimer = setTimeout(() => { this._handleHeartbeatTimeout(); }, this.config.heartbeatInterval);`.
  3. **`_stopHeartbeatTimer()` Method:**
     * If `this.heartbeatTimer`, `clearTimeout(this.heartbeatTimer); this.heartbeatTimer = null;`.
  4. **`_resetHeartbeatTimer()` Method (Helper called by `_dispatchEvent` or when any SSE frame is processed):**
     * If `this.config.heartbeatInterval > 0`, call `this._startHeartbeatTimer();`.
  5. **`_handleHeartbeatTimeout()` Method:**
     * Emit a specific `error` or `warning` event (e.g., "SSE Heartbeat Timeout").
     * If `this.controller` (for the current fetch), call `this.controller.abort(\'heartbeat_timeout\');`. This should trigger the error handling path in `connect()` which then leads to `_handleDisconnect()` and `_scheduleReconnect()`.
     * Ensure that aborting due to heartbeat timeout is not treated as an explicit client close.

* 🔄 **Refactor/Review:**
  * Interaction between heartbeat timer, explicit `close()` calls, and reconnection logic.
  * Ensure heartbeat timer is managed correctly across connection lifecycles.
  * Clarity of events emitted on heartbeat failure.

---

## Phase 9: SSE Graceful Shutdown & SDK Integration (REQ-SSE-001)

* **🧪 Test(s):**
  * (Add tests for an explicit `sdk.sse.disconnect()` or `sdk.closeSSE()` method that cleanly closes the SSE connection and stops reconnection attempts)
  * (Add tests for `sse_close` event with `intentional: true` when explicitly closed)
* 👨‍💻 **Implementation Goal:**
    1. In `SSEClient`, implement a `close()` method:
        * Sets a flag like `isExplicitlyClosed = true`.
        * Aborts any ongoing `fetch` request.
        * Clears any reconnection timers.
        * Clears any heartbeat timers.
        * Emits a `close` event with `{ intentional: true }`.
    2. In `DatastarBunSDK`, provide a method like `disconnectSSE()` that calls `this.sse.close()`.
    3. Ensure the main SDK properly forwards the `sse_close` event from the `SSEClient`.
* 🔄 **Refactor/Review:**
  * Ensure all resources (timers, controllers) are cleaned up on close.

---

## Phase 10: Bun Optimizations & Finalization (REQ-BUN-001)

* **🧪 Test(s):**
  * `describe('REQ-BUN-001: Bun Optimization')`:
    * `AC.1: should use Bun.fetch (verified by global mock)` (already covered)
  * (Add tests for SDK build process if applicable: `bun build ...`)
  * (Add tests for TypeScript declaration file generation and correctness)
* 👨‍💻 **Implementation Goal:**
    1. Review all code, ensuring `fetch` is used as per Bun's environment.
    2. Confirm `bun:test` is used for all tests.
    3. Minimize external dependencies.
    4. Set up `bun build` script in `package.json` to produce distributable files (e.g., `./dist`) and ensure it runs correctly.
    5. Verify that `tsc --emitDeclarationOnly` (or `bun build --declaration`) generates correct and complete `.d.ts` files.
* 🔄 **Refactor/Review:**
  * Any remaining Node.js-specific patterns that could be replaced with Bun equivalents.
  * Final check on type definitions and exports.

---

## Phase 11: Documentation (REQ-DOC-001)

* **🧪 Test(s):**
  * (Manual verification against documentation requirements)
* 👨‍💻 **Implementation Goal:**
    1. Write TSDoc comments for all public classes, methods, interfaces, and types in the SDK.
    2. Create a comprehensive `README.md` with:
        * Overview
        * Installation instructions (`bun add @your-org/datastar-bun-sdk`)
        * Quick start examples for initialization, CRUD, and SSE.
        * Detailed explanation of configuration options.
        * Information on error handling and SSE events.
    3. Generate API documentation from TSDoc if desired (e.g., using TypeDoc).
* 🔄 **Refactor/Review:**
  * Clarity, accuracy, and completeness of documentation.
  * Ease of understanding for new users.

---

This TDD plan should guide you through building the SDK in a structured and test-covered manner. Remember that the "Red-Green-Refactor" cycle is key: write a failing test (Red), write the minimal code to make it pass (Green), and then improve the code (Refactor).
