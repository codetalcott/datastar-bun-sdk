import { DatastarBunSDK } from '../src/index';

// This example demonstrates advanced usage of the SSE client
async function main() {
  // Initialize the SDK with a token provider function
  const getAuthToken = async () => {
    // In a real app, this might fetch a token from your auth service
    console.log('Fetching fresh auth token...');
    return 'dynamic-auth-token-' + Date.now();
  };

  const sdk = new DatastarBunSDK({
    apiBaseUrl: 'https://api.datastar.example.com/v1',
    sseUrl: 'https://sse.datastar.example.com/v1',
    authToken: getAuthToken,
    retryOptions: {
      maxRetries: 5,
      initialDelay: 1000,
      backoffFactor: 1.5,
      maxRetryDelay: 30000
    }
  });

  // Set up event handlers for all SSE events
  
  // Connection lifecycle events
  sdk.on('sse_open', () => {
    console.log('SSE connection opened');
  });

  sdk.on('sse_close', (data) => {
    const { intentional, reason } = data;
    if (intentional) {
      console.log('SSE connection closed intentionally');
    } else {
      console.log(`SSE connection closed unexpectedly: ${reason}`);
    }
  });

  sdk.on('sse_reconnecting', (data) => {
    const { attempt, delay } = data;
    console.log(`SSE reconnection attempt ${attempt} in ${delay}ms`);
  });

  sdk.on('sse_error', (error) => {
    console.error('SSE error:', error.message);
  });

  sdk.on('sse_warning', (warning) => {
    console.warn('SSE warning:', warning.message);
  });

  // Business events
  sdk.on('sse_record_created', (event) => {
    console.log(`New record created (ID: ${event.data.id}):`, event.data);
  });

  sdk.on('sse_record_updated', (event) => {
    console.log(`Record updated (ID: ${event.data.id}):`, event.data);
  });

  sdk.on('sse_record_deleted', (event) => {
    console.log(`Record deleted (ID: ${event.data.id})`);
  });

  // Catch-all for other events
  sdk.on('sse_message', (message) => {
    console.log(`Received ${message.type} event:`, message.data);
  });

  // Connect to SSE endpoint
  try {
    console.log('Connecting to SSE...');
    await sdk.connectSSE();
    
    // Simulate some activity
    console.log('\nCreating records...');
    const promises = [];
    for (let i = 1; i <= 3; i++) {
      promises.push(
        sdk.createRecord('items', {
          name: `Test Item ${i}`,
          value: i * 100
        })
      );
    }
    const records = await Promise.all(promises);
    
    console.log(`\nCreated ${records.length} records`);
    
    // Update one of the records
    if (records.length > 0) {
      const recordToUpdate = records[0];
      console.log(`\nUpdating record ${recordToUpdate.id}...`);
      await sdk.updateRecord('items', recordToUpdate.id, {
        ...recordToUpdate,
        name: `${recordToUpdate.name} (Updated)`,
        updateTime: new Date().toISOString()
      });
    }
    
    // Delete one of the records
    if (records.length > 1) {
      const recordToDelete = records[1];
      console.log(`\nDeleting record ${recordToDelete.id}...`);
      await sdk.deleteRecord('items', recordToDelete.id);
    }
    
    // Keep connection open to receive events
    console.log('\nWaiting for events for 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Gracefully disconnect
    console.log('\nDisconnecting from SSE...');
    await sdk.disconnectSSE();
    
    console.log('Done');
  } catch (error) {
    console.error('Error:', error);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}