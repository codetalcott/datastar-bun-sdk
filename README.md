# Datastar Bun SDK

A Bun-optimized SDK for interacting with Datastar services. This SDK provides a TypeScript interface for Datastar's realtime (SSE) hypermedia capabilities.

## Features

- **Bun-Optimized**: Leverages Bun's native fetch API and performance features
- **Type-Safe**: Full TypeScript support for better developer experience
- **CRUD Operations**: Create, read, update, delete, and query records
- **SSE Integration**: Real-time updates from Datastar services
- **Error Handling**: Custom error types for different error conditions
- **Authentication**: Support for static tokens and token provider functions
- **Request Retries**: Configurable retry behavior with exponential backoff
- **Request Timeouts**: Configurable timeout handling for all requests

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

// Initialize the SDK
const sdk = new DatastarBunSDK({
  apiBaseUrl: 'https://api.datastar.example.com/v1',
  sseUrl: 'https://sse.datastar.example.com/v1',
  authToken: 'your-auth-token'
});

// CRUD operations
async function main() {
  try {
    // Create a record
    const newRecord = await sdk.createRecord('items', {
      name: 'Example Item',
      description: 'This is an example item'
    });
    
    // Get a record
    const record = await sdk.getRecord('items', newRecord.id);
    
    // Update a record
    const updatedRecord = await sdk.updateRecord('items', newRecord.id, {
      ...record,
      name: 'Updated Example Item'
    });
    
    // List records
    const records = await sdk.listRecords('items', {
      filter: 'name:Updated*',
      limit: 10
    });
    
    // Delete a record
    await sdk.deleteRecord('items', newRecord.id);
    
    // Connect to SSE for real-time updates
    sdk.on('sse_record_updated', (event) => {
      console.log('Record updated:', event.data);
    });
    
    await sdk.connectSSE();
    
    // Later, disconnect from SSE
    await sdk.disconnectSSE();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

## Configuration Options

```typescript
const sdk = new DatastarBunSDK({
  // Required
  authToken: 'your-token', // Or a function: async () => 'your-token'
  
  // Optional with defaults
  apiBaseUrl: 'https://api.datastar.io/v1',
  sseUrl: 'https://sse.datastar.io/v1',
  requestTimeout: 30000, // 30 seconds
  retryOptions: {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    backoffFactor: 2,
    maxRetryDelay: 10000 // 10 seconds
  }
});
```

## CRUD Operations

### Create Record

```typescript
const record = await sdk.createRecord<YourType>('collection', {
  // Record data
  name: 'Example',
  properties: {
    // ...
  }
});
```

### Get Record

```typescript
const record = await sdk.getRecord<YourType>('collection', 'record-id');
```

### Update Record

```typescript
const updatedRecord = await sdk.updateRecord<YourType>('collection', 'record-id', {
  // Updated record data
  name: 'Updated Example',
  properties: {
    // ...
  }
});
```

### Delete Record

```typescript
await sdk.deleteRecord('collection', 'record-id');
```

### List/Query Records

```typescript
const records = await sdk.listRecords<YourType>('collection', {
  filter: 'property:value',
  sort: 'createdAt:desc',
  limit: 100,
  offset: 0
});
```

## SSE Integration

### Connect to SSE

```typescript
// Set up event handlers first
sdk.on('sse_open', () => {
  console.log('Connected to SSE');
});

sdk.on('sse_error', (error) => {
  console.error('SSE error:', error);
});

sdk.on('sse_record_created', (event) => {
  console.log('Record created:', event.data);
});

// Then connect
await sdk.connectSSE();
```

### Disconnect from SSE

```typescript
await sdk.disconnectSSE();
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