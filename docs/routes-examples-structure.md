# DataStar Bun SDK Examples Structure

This document outlines the recommended directory structure and organization for implementing DataStar examples using the Bun SDK.

## Directory Structure

```
/examples/
├── README.md                      # Overview of all examples
├── server-component.ts            # Common server component for examples
├── utilities/                     # Common utilities for examples
│   ├── test-utils.ts              # Testing utilities
│   ├── mock-server.ts             # Configurable mock server
│   └── sse-utilities.ts           # SSE handling utilities
├── ui-interaction/                # UI Interaction Examples
│   ├── toggle-visibility/
│   │   ├── index.ts               # Main example implementation
│   │   ├── test.ts                # Tests for the example
│   │   └── README.md              # Documentation
│   ├── click-to-edit/
│   │   ├── index.ts
│   │   ├── test.ts
│   │   └── README.md
│   └── ...
├── form-handling/                 # Form Handling Examples
│   ├── simple-form/
│   │   ├── index.ts
│   │   ├── test.ts
│   │   └── README.md
│   ├── form-validation/
│   │   ├── index.ts
│   │   ├── test.ts
│   │   └── README.md
│   └── ...
├── data-management/               # Data Management Examples
│   ├── todos/
│   │   ├── index.ts
│   │   ├── server.ts
│   │   ├── test.ts
│   │   └── README.md
│   ├── signals/
│   │   ├── index.ts
│   │   ├── test.ts
│   │   └── README.md
│   └── ...
├── visual-effects/                # Visual and Animation Examples
│   ├── progress-bar/
│   │   ├── index.ts
│   │   ├── test.ts
│   │   └── README.md
│   ├── animations/
│   │   ├── index.ts
│   │   ├── test.ts
│   │   └── README.md
│   └── ...
└── advanced/                      # Advanced Examples
    ├── offline-sync/
    │   ├── index.ts
    │   ├── test.ts
    │   └── README.md
    ├── polling/
    │   ├── index.ts
    │   ├── test.ts
    │   └── README.md
    └── ...
```

## Example Template Structure

Each example should follow a consistent structure:

### 1. `index.ts` - Main Implementation

```typescript
/**
 * [Example Name] - DataStar Bun SDK Example
 *
 * This example demonstrates [brief description]
 */

import { DatastarBunSDK } from '../../src/index';

/**
 * Example Configuration
 */
interface ExampleConfig {
  // Configuration options for this example
}

/**
 * Example implementation class
 */
export class ExampleImplementation {
  private sdk: DatastarBunSDK;
  
  constructor(config: ExampleConfig) {
    this.sdk = new DatastarBunSDK({
      apiBaseUrl: config.apiBaseUrl,
      sseUrl: config.sseUrl,
      authToken: config.authToken,
    });
  }
  
  /**
   * Initialize the example
   */
  async initialize() {
    // Setup code
    await this.sdk.connectSSE();
    
    // Register event handlers
    this.sdk.on('event_name', this.handleEvent.bind(this));
  }
  
  /**
   * Clean up resources
   */
  async cleanup() {
    await this.sdk.disconnectSSE();
  }
  
  /**
   * Example-specific methods
   */
  async performAction() {
    // Implementation
    return this.sdk.post('/some-endpoint', { data: 'value' });
  }
  
  private handleEvent(data: any) {
    // Event handling logic
  }
}

/**
 * Optional: Standalone example runner
 */
if (import.meta.main) {
  const example = new ExampleImplementation({
    apiBaseUrl: 'http://localhost:3000/api',
    sseUrl: 'http://localhost:3000/sse',
    authToken: 'example-token',
  });
  
  await example.initialize();
  console.log('Example running, press Ctrl+C to stop');
}
```

### 2. `server.ts` - Server-side Implementation (if needed)

```typescript
/**
 * Server implementation for [Example Name]
 */

import { Bun } from 'bun';
import { ServerComponent } from '../server-component';

/**
 * Example-specific server component
 */
export class ExampleServer extends ServerComponent {
  private data: any[] = [];
  
  constructor(port: number = 3000) {
    super(port);
    
    // Register routes specific to this example
    this.registerRoutes();
  }
  
  private registerRoutes() {
    // GET endpoint
    this.app.get('/api/items', (req, res) => {
      return Response.json(this.data);
    });
    
    // POST endpoint
    this.app.post('/api/items', async (req) => {
      const body = await req.json();
      const newItem = { id: this.data.length + 1, ...body };
      this.data.push(newItem);
      
      // Send SSE update to clients
      this.sseClients.forEach(client => {
        client.emit('item_added', newItem);
      });
      
      return Response.json(newItem, { status: 201 });
    });
    
    // Add more routes as needed...
  }
}

/**
 * Standalone server runner
 */
if (import.meta.main) {
  const server = new ExampleServer();
  await server.start();
  console.log(`Example server running at http://localhost:${server.port}`);
}
```

### 3. `test.ts` - Tests for the Example

```typescript
/**
 * Tests for [Example Name]
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ExampleImplementation } from './index';
import { ExampleServer } from './server';
import { TestUtilities } from '../utilities/test-utils';

describe('[Example Name]', () => {
  let server: ExampleServer;
  let example: ExampleImplementation;
  let utils: TestUtilities;
  
  beforeEach(async () => {
    // Start server on a random available port
    server = new ExampleServer(0);
    await server.start();
    
    // Create example implementation
    example = new ExampleImplementation({
      apiBaseUrl: `http://localhost:${server.port}/api`,
      sseUrl: `http://localhost:${server.port}/sse`,
      authToken: 'test-token',
    });
    
    utils = new TestUtilities(server);
    
    // Initialize the example
    await example.initialize();
  });
  
  afterEach(async () => {
    await example.cleanup();
    await server.stop();
  });
  
  it('should perform the main action correctly', async () => {
    // Arrange: prepare test data
    const testData = { /* ... */ };
    
    // Act: perform the action
    const result = await example.performAction(testData);
    
    // Assert: verify the results
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    
    // Additional assertions as needed
  });
  
  // More test cases...
});
```

### 4. `README.md` - Documentation for the Example

```markdown
# [Example Name]

This example demonstrates how to [brief description].

## Features

- [Feature 1]
- [Feature 2]
- [Feature 3]

## Implementation

This example implements:

- [Technical detail 1]
- [Technical detail 2]
- [Technical detail 3]

## Running the Example

```bash
# Start the example server
bun run examples/[category]/[example-name]/server.ts

# In another terminal, run the example
bun run examples/[category]/[example-name]/index.ts
```

## Testing

```bash
# Run the tests for this example
bun test examples/[category]/[example-name]/test.ts
```

## Usage in Your Application

Here's how to integrate this pattern in your own application:

```typescript
import { DatastarBunSDK } from 'datastar-bun-sdk';

// Initialization code
const sdk = new DatastarBunSDK({
  apiBaseUrl: 'https://your-api.example.com',
  sseUrl: 'https://your-sse.example.com',
  authToken: 'your-auth-token',
});

// Implementation
// ...
```
```

## Common Components

### Server Component

The `server-component.ts` file provides a base class for creating test servers:

```typescript
/**
 * Base server component for DataStar examples
 */

import { Bun, Server } from 'bun';

/**
 * SSE Client for managing client connections
 */
class SSEClient {
  private controller: ReadableStreamDefaultController<any>;
  private id: string;
  
  constructor(id: string, controller: ReadableStreamDefaultController<any>) {
    this.id = id;
    this.controller = controller;
  }
  
  /**
   * Send an SSE event to this client
   */
  emit(eventType: string, data: any) {
    const encoder = new TextEncoder();
    const eventString = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    this.controller.enqueue(encoder.encode(eventString));
  }
}

/**
 * Base server component
 */
export class ServerComponent {
  private server: Server | null = null;
  protected sseClients: SSEClient[] = [];
  protected app: Bun.Serve.Router;
  
  public port: number;
  
  constructor(port: number = 3000) {
    this.port = port;
    this.app = new Bun.Serve.Router();
    
    // Set up basic routes
    this.setupBaseRoutes();
  }
  
  private setupBaseRoutes() {
    // SSE endpoint
    this.app.get('/sse', (req) => {
      const clientId = crypto.randomUUID();
      
      // Create an SSE stream
      const stream = new ReadableStream({
        start: (controller) => {
          const client = new SSEClient(clientId, controller);
          this.sseClients.push(client);
          
          // Send initial connection event
          client.emit('connected', { id: clientId });
        },
        cancel: () => {
          // Remove client when connection closes
          this.sseClients = this.sseClients.filter(c => c.id !== clientId);
        }
      });
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    });
  }
  
  /**
   * Start the server
   */
  async start() {
    this.server = Bun.serve({
      port: this.port,
      fetch: this.app.fetch,
      development: true
    });
    
    // If port was 0, update to the assigned port
    this.port = this.server.port;
    
    return this;
  }
  
  /**
   * Stop the server
   */
  async stop() {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
  }
  
  /**
   * Broadcast an event to all SSE clients
   */
  broadcast(eventType: string, data: any) {
    this.sseClients.forEach(client => {
      client.emit(eventType, data);
    });
  }
}
```

## Testing Utilities

The `test-utils.ts` file provides utilities for testing examples:

```typescript
/**
 * Test utilities for DataStar examples
 */

import { ServerComponent } from '../server-component';

/**
 * Utility class for testing DataStar examples
 */
export class TestUtilities {
  private server: ServerComponent;
  
  constructor(server: ServerComponent) {
    this.server = server;
  }
  
  /**
   * Wait for an event to be received
   */
  async waitForEvent(timeout: number = 1000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event (${timeout}ms)`));
      }, timeout);
      
      // Clear timer and resolve on success
      const cleanup = () => {
        clearTimeout(timer);
        resolve();
      };
      
      // This would be implemented by the specific example
      // to detect when an event has been processed
    });
  }
  
  /**
   * Generate test data for examples
   */
  generateTestData(count: number = 10): any[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `item-${i}`,
      name: `Test Item ${i}`,
      value: Math.floor(Math.random() * 100)
    }));
  }
  
  /**
   * More test utilities as needed...
   */
}
```

## Integration with Main SDK

The examples should be integrated with the main SDK's test suite to ensure they continue to work as the SDK evolves:

```typescript
// In the main test suite
import { describe, it } from 'bun:test';

describe('Examples Integration Tests', () => {
  // Import and run tests from each example
  it('should run UI interaction examples', async () => {
    await import('../examples/ui-interaction/toggle-visibility/test');
    await import('../examples/ui-interaction/click-to-edit/test');
    // Import more example tests...
  });
  
  it('should run form handling examples', async () => {
    await import('../examples/form-handling/simple-form/test');
    await import('../examples/form-handling/form-validation/test');
    // Import more example tests...
  });
  
  // Test more categories...
});
```

## Running Examples

To make examples easy to run, add scripts to `package.json`:

```json
{
  "scripts": {
    "examples:list": "ls -la examples/*/",
    "examples:todos": "bun run examples/data-management/todos/server.ts",
    "examples:form": "bun run examples/form-handling/simple-form/server.ts",
    "test:examples": "bun test examples/*/*/test.ts",
    "test:examples:ui": "bun test examples/ui-interaction/*/test.ts",
    "test:examples:form": "bun test examples/form-handling/*/test.ts",
    "test:examples:data": "bun test examples/data-management/*/test.ts"
  }
}
```

This structure provides a consistent, maintainable organization for examples that demonstrate the capabilities of the DataStar Bun SDK while ensuring they are properly tested and documented.