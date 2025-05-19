import { DatastarBunSDK } from '../src/index';

// This is an example of using the DatastarBunSDK
async function main() {
  // Initialize the SDK
  const sdk = new DatastarBunSDK({
    apiBaseUrl: 'https://api.datastar.example.com/v1',
    sseUrl: 'https://sse.datastar.example.com/v1',
    authToken: 'your-auth-token', // Or use a token provider function
    requestTimeout: 10000, // 10 seconds
    retryOptions: {
      maxRetries: 3,
      initialDelay: 1000, // 1 second
      backoffFactor: 2,
      maxRetryDelay: 10000 // 10 seconds
    }
  });

  try {
    // Create a record
    const newRecord = await sdk.createRecord('items', {
      name: 'Example Item',
      description: 'This is an example item',
      attributes: {
        color: 'blue',
        size: 'medium'
      }
    });
    console.log('Created record:', newRecord);

    // Get a record by ID
    const record = await sdk.getRecord('items', newRecord.id);
    console.log('Retrieved record:', record);

    // Update a record
    const updatedRecord = await sdk.updateRecord('items', newRecord.id, {
      ...record,
      name: 'Updated Example Item',
      attributes: {
        ...record.attributes,
        color: 'red'
      }
    });
    console.log('Updated record:', updatedRecord);

    // List records with query parameters
    const records = await sdk.listRecords('items', {
      filter: 'attributes.color:red',
      sort: 'createdAt:desc',
      limit: 10
    });
    console.log(`Found ${records.length} records`);

    // Connect to SSE to receive real-time updates
    // Listen for SSE events
    sdk.on('sse_open', () => {
      console.log('SSE connection opened');
    });

    sdk.on('sse_error', (error) => {
      console.error('SSE error:', error);
    });

    sdk.on('sse_close', (data) => {
      console.log('SSE connection closed:', data);
    });

    // Listen for a specific event type
    sdk.on('sse_data_update', (data) => {
      console.log('Received data update:', data);
    });

    // Connect to SSE
    await sdk.connectSSE();
    console.log('Connected to SSE');

    // Wait a bit to receive some events
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Delete a record
    await sdk.deleteRecord('items', newRecord.id);
    console.log('Deleted record:', newRecord.id);

    // Disconnect from SSE
    await sdk.disconnectSSE();
    console.log('Disconnected from SSE');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);