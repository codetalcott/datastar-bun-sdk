# DataStar Bun SDK Examples

This directory contains reference examples for the DataStar Bun SDK.

## Routes Examples

The `routes_examples` directory contains a Bun implementation of the DataStar routes examples.

### Running the Bun Example

To run the Bun example:

```bash
bun run routes_examples/routes_examples_bun.ts
```

This will start a server on a random available port. Visit the displayed URL in your browser to see the example in action.

### Testing the Bun Example

To test the Bun example:

```bash
bun test routes_examples/routes_examples_bun.test.ts
```

The tests verify that:

1. The server serves the HTML page correctly
2. The server handles SSE requests to merge endpoints
3. The server returns 404 for unknown paths

## Implementation Details

The Bun example demonstrates:

1. Setting up a Bun server that serves HTML with DataStar attributes
2. Processing Server-Sent Events (SSE) using the DataStar Bun SDK
3. Reading signals from requests
4. Merging fragments based on signal values

This implementation leverages Bun's built-in APIs including:

- `Bun.serve()` for the HTTP server
- `TransformStream` for SSE streaming
- Native Response and Request objects
