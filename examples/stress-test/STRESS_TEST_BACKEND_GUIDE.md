# Backend Guide for Datastar Bun SDK Stress Test

This document outlines the backend API endpoints that need to be implemented using Bun and the `datastar-bun-sdk`. The `stress-test-datastar-sdk.html` page will interact with these endpoints to stress-test the SDK.

**Base URL:** Assume all endpoints are prefixed, e.g., `/api/stress`.

## General Considerations

* **Authentication:** The SDK's authentication (static token or provider function) should be active. The stress test page might send an `Authorization: Bearer <token>` header, which your backend should pass to the SDK.
* **Error Handling:** Your backend should catch errors from the SDK and return appropriate HTTP status codes and JSON error messages to the client (the stress test page). For example, if the SDK throws `DatastarRecordNotFoundError`, return a 404.
* **Logging:** Implement comprehensive logging on your backend to monitor SDK behavior, request processing times, and any errors encountered.
* **Datastar Collections:** For CRUD operations, assume a default collection name (e.g., `stress_test_items`) or allow the client to specify one.

## Required Endpoints

### 1. CRUD Operations

These endpoints will be used to test `createRecord`, `getRecord`, `updateRecord`, and `deleteRecord`.

* **`POST /api/stress/records/:collection`**
  * Action: Uses `sdk.createRecord(collection, requestBody)`
  * Request Body: JSON object for the new record.
  * Response: 201 Created with the created record, or error.
* **`GET /api/stress/records/:collection/:id`**
  * Action: Uses `sdk.getRecord(collection, id)`
  * Response: 200 OK with the record, 404 Not Found, or other error.
* **`PUT /api/stress/records/:collection/:id`**
  * Action: Uses `sdk.updateRecord(collection, id, requestBody)`
  * Request Body: JSON object with updates.
  * Response: 200 OK with the updated record, or error.
* **`DELETE /api/stress/records/:collection/:id`**
  * Action: Uses `sdk.deleteRecord(collection, id)`
  * Response: 204 No Content, 404 Not Found, or other error.

### 2. List Records

* **`GET /api/stress/records/:collection`**
  * Action: Uses `sdk.listRecords(collection, queryParams)`
  * Query Parameters: Support `limit`, `offset`, `sortBy`, `filter_field`, etc., passed through to the SDK.
  * Response: 200 OK with an array of records, or error.

### 3. Large Payload Test

* **`POST /api/stress/large-payload/:collection`**
  * Similar to `POST /api/stress/records/:collection`, but designed to accept and process significantly larger request bodies.
  * Action: `sdk.createRecord(collection, largeRequestBody)`
* **`GET /api/stress/large-payload/:collection/:id`**
  * Similar to `GET /api/stress/records/:collection/:id`, but for records known to have large payloads.
  * Action: `sdk.getRecord(collection, id)`

### 4. SSE (Server-Sent Events) Stream

* **`GET /api/stress/sse-stream`**
  * Action:
    * Initiates an SSE connection using the SDK's SSE capabilities (`sdk.sse` or related methods if you wrap it).
    * Your backend should call `sdk.connectSSE()`.
    * Continuously send SSE messages to the client at a configurable rate (e.g., multiple messages per second).
    * Messages should have `event` and `data` fields. Consider varying event names and data structures.
    * Handle client disconnections gracefully.
  * Headers: Must return `Content-Type: text/event-stream`.

### 5. Error Simulation Endpoints

These endpoints help test the SDK's error handling and retry mechanisms.

* **`GET /api/stress/error/404/:collection/:id`**
  * Action: Intentionally tries to fetch a non-existent record using `sdk.getRecord(collection, id_known_to_not_exist)`. The SDK should throw `DatastarRecordNotFoundError`. Your backend returns 404.
* **`GET /api/stress/error/auth`**
  * Action:
    * Option 1: Simulate an invalid token being used with an SDK call.
    * Option 2: If your SDK's `authToken` is a function, make it return an invalid token temporarily for this request.
    * The SDK should throw `DatastarAuthenticationError`. Your backend returns 401 or 403.
* **`GET /api/stress/error/500`**
  * Action: Make an SDK call that you know (or can mock) will result in a 5xx error from the Datastar API. The SDK should throw `DatastarAPIError`. Your backend returns 500.
* **`GET /api/stress/error/timeout`**
  * Action: This endpoint should introduce a significant delay *before* making an SDK call, or configure the SDK call with a very short timeout that is guaranteed to be exceeded by the actual Datastar API response for a specific (potentially slow) query.
  * The SDK should throw a timeout-related error (e.g., `DatastarConnectionError` if `AbortController` is used, or a custom timeout error). Your backend returns an appropriate status (e.g., 504 Gateway Timeout or 408 Request Timeout).

### 6. Configuration (Optional but Recommended)

* **`GET /api/stress/config`**
  * Response: Returns current backend/SDK configuration relevant to stress testing (e.g., default collection, SSE message frequency).
* **`POST /api/stress/config`**
  * Request Body: JSON to update configuration (e.g., SSE message frequency).

By implementing these backend endpoints, you'll have a solid foundation for thoroughly stress-testing the `datastar-bun-sdk` using the provided HTML demonstration page. Remember to monitor your Bun server's performance (CPU, memory, network) and the Datastar service itself during these tests.
