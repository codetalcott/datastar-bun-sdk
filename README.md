# Datastar Bun SDK

A Bun-optimized server-side SDK for generating Datastar SSE events. This SDK provides a TypeScript interface for creating Datastar-compatible Server-Sent Events that power reactive frontend applications.

## Project Status

> ⚠️ **DEVELOPMENT PREVIEW** ⚠️  
>
> This SDK is currently in early development and **not ready for production use**. It's being shared for evaluation and feedback purposes only. If extensive testing demonstrates that this SDK adds value to Bun-based Datastar stacks, it will be submitted for inclusion in the list of officially validated Datastar SDKs.
>
> Breaking changes may occur between versions without notice during this phase.

## Features

- **Server-Side SSE Generation**: Creates properly formatted Datastar Server-Sent Events
- **Bun-Optimized**: Leverages Bun's native HTTP server and performance features
- **Type-Safe**: Full TypeScript support for better developer experience
- **Event Types**: Support for all standard Datastar events (mergeSignals, mergeFragments, executeScript, removeSignals, removeFragments)
- **Signal Processing**: Read and process signals from HTTP request bodies
- **Streaming Responses**: Efficient streaming of SSE events to frontend clients
- **Error Handling**: Comprehensive error handling with graceful degradation
- **Compliance Testing**: Built-in compliance testing against official Datastar specifications
- **High Performance**: Optimized for high-throughput reactive applications

## Installation

```bash
# Using bun
bun add codetalcott/datastar-bun-sdk

# Using npm
npm install codetalcott/datastar-bun-sdk
```

## Quick Start

```typescript
import { DatastarBunSDK } from 'codetalcott/datastar-bun-sdk';

// Create a Datastar SSE event generator
const generator = new DatastarBunSDK();

// Create an HTTP server that generates Datastar events
const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === '/events') {
      // Read signals from the request
      const signals = await generator.readSignals(req);
      
      // Process events and generate SSE response
      const events = signals.events || [];
      const sseResponse = generator.processEvents(events);
      
      return new Response(sseResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    // Serve your HTML page
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  },
});

// Generate individual events
async function generateEvents() {
  // Merge signals into the frontend state
  const mergeEvent = generator.mergeSignals({
    user: { name: 'John', id: 123 },
    count: 42
  });
  
  // Update DOM fragments
  const fragmentEvent = generator.mergeFragments(
    '<div id="content">Updated content</div>'
  );
  
  // Execute JavaScript on the frontend
  const scriptEvent = generator.executeScript(
    'console.log("Hello from server!");'
  );
  
  console.log('Generated events:', mergeEvent, fragmentEvent, scriptEvent);
}

generateEvents();
```

## Event Generation API

### Signal Events

```typescript
// Merge signals into the frontend state
const event = generator.mergeSignals(
  { user: { name: 'John' }, count: 42 },
  { 
    eventId: 'signal-update-1',
    retryDuration: 1000,
    onlyIfMissing: false 
  }
);

// Remove signals from the frontend state
const removeEvent = generator.removeSignals(
  ['user.oldProperty', 'temporaryData'],
  { eventId: 'cleanup-1' }
);
```

### Fragment Events

```typescript
// Merge HTML fragments into the DOM
const fragmentEvent = generator.mergeFragments(
  '<div id="content">New content</div>',
  {
    selector: '#main-content',
    mergeMode: 'morph', // 'morph', 'inner', 'outer', 'prepend', 'append'
    eventId: 'content-update-1'
  }
);

// Remove DOM elements
const removeFragmentEvent = generator.removeFragments(
  '#obsolete-element',
  { eventId: 'cleanup-dom' }
);
```

### Script Execution

```typescript
// Execute JavaScript on the frontend
const scriptEvent = generator.executeScript(
  'console.log("Hello from server!");',
  {
    eventId: 'script-1',
    retryDuration: 2000,
    attributes: {
      type: 'text/javascript',
      blocking: false
    },
    autoRemove: true
  }
);
```

## Signal Processing

### Reading Signals from Requests

```typescript
// Process signals from HTTP request
const signals = await generator.readSignals(request);

// Extract events array
const events = signals.events || [];

// Process each event by type
for (const event of events) {
  switch (event.type) {
    case 'mergeSignals':
      const sseEvent = generator.mergeSignals(event.signals, {
        eventId: event.eventId,
        retryDuration: event.retryDuration,
        onlyIfMissing: event.onlyIfMissing
      });
      break;
      
    case 'mergeFragments':
      const fragmentEvent = generator.mergeFragments(event.fragments, {
        eventId: event.eventId,
        selector: event.selector,
        mergeMode: event.mergeMode
      });
      break;
      
    case 'executeScript':
      const scriptEvent = generator.executeScript(event.script, {
        eventId: event.eventId,
        retryDuration: event.retryDuration,
        attributes: event.attributes,
        autoRemove: event.autoRemove
      });
      break;
  }
}
```

## Server Integration

### Bun HTTP Server

```typescript
import { DatastarBunSDK } from 'codetalcott/datastar-bun-sdk';

const generator = new DatastarBunSDK();

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Handle Datastar SSE endpoint
    if (url.pathname === '/datastar' && req.method === 'POST') {
      const signals = await generator.readSignals(req);
      const sseResponse = generator.processEvents(signals.events || []);
      
      return new Response(sseResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Datastar server running on http://localhost:3000`);
```

### Express.js Integration

```typescript
import express from 'express';
import { DatastarBunSDK } from 'codetalcott/datastar-bun-sdk';

const app = express();
const generator = new DatastarBunSDK();

app.use(express.json());

app.post('/datastar', async (req, res) => {
  const signals = await generator.readSignals(req);
  const sseResponse = generator.processEvents(signals.events || []);
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.send(sseResponse);
});

app.listen(3000, () => {
  console.log('Datastar server running on http://localhost:3000');
});
```

## Error Handling

The SDK provides several error types for different error conditions:

```typescript
import { 
  DatastarError,
  DatastarAPIError,
  DatastarRecordNotFoundError,
  DatastarAuthenticationError,
  DatastarConnectionError,
  DatastarSSEError
} from 'codetalcott/datastar-bun-sdk';

try {
  const record = await sdk.getRecord('items', 'non-existent-id');
} catch (error) {
  if (error instanceof DatastarRecordNotFoundError) {
    console.error('Record not found');
  } else if (error instanceof DatastarAuthenticationError) {
    console.error('Authentication error:', error.statusCode);
  } else if (error instanceof DatastarAPIError) {
    console.error('API error:', error.statusCode, error.responseBody);
  } else if (error instanceof DatastarConnectionError) {
    console.error('Connection error:', error.message);
  }
}
```

## Examples

Check out the [examples](./examples) directory for more complete usage examples:

- [Simple Usage](./examples/simple-usage.ts): Basic CRUD and SSE usage
- [Advanced SSE Usage](./examples/advanced-sse-usage.ts): Detailed SSE event handling

## Testing

### Unit Tests

Run the unit tests with:

```bash
bun test
```

### Coverage Reports

To generate and view code coverage reports:

1. Run tests with the coverage flag:

   ```bash
   bun test --coverage
   ```

2. This will create a `coverage/` directory in your project root.

3. Open the HTML report in your browser (usually `coverage/lcov-report/index.html` or `coverage/html/index.html` depending on the reporter Bun uses by default or is configured to use):

   ```bash
   open coverage/lcov-report/index.html
   ```

   Or, if the above path doesn't work, try checking the `coverage/` directory for an `html` subfolder:

   ```bash
   open coverage/html/index.html
   ```

   (On Windows, you might use `start` instead of `open`; on Linux, `xdg-open`)

### Compliance Tests

This SDK can be tested against the official Datastar SDK test suite to ensure compatibility:

```bash
# Start the test server only
bun run test:server

# Run the full compliance test suite
bun run test:compliance
```

The compliance tests will:

1. Clone the official Datastar test repository
2. Start the test server
3. Run the official test suite against the server
4. Report the results

## License

MIT
