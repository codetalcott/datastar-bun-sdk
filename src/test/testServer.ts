import { DatastarBunSDK } from '../index';
import type { Server } from 'bun';

/**
 * Formats a response as a Server-Sent Event (SSE)
 */
function formatSSE(data: any, eventType: string = 'message', id?: string): string {
  let sseOutput = '';
  
  if (id) {
    sseOutput += `id: ${id}\n`;
  }
  
  if (eventType) {
    sseOutput += `event: ${eventType}\n`;
  }
  
  // Handle multiline data
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
  const dataLines = dataStr.split('\n');
  for (const line of dataLines) {
    sseOutput += `data: ${line}\n`;
  }
  
  return sseOutput + '\n';
}

/**
 * Process an execute script event
 */
async function processExecuteScript(sdk: DatastarBunSDK, event: any): Promise<string> {
  console.log('Processing executeScript event:', event);
  
  // In real implementation, this would use the SDK to execute the script
  // For now, we'll just simulate a response
  return formatSSE({
    success: true,
    result: event.script ? 'Script executed successfully' : 'No script provided',
    eventId: event.eventId
  }, 'scriptResult', String(event.eventId || Date.now()));
}

/**
 * Process a merge fragments event
 */
async function processMergeFragments(sdk: DatastarBunSDK, event: any): Promise<string> {
  console.log('Processing mergeFragments event:', event);
  
  // Simulate processing
  return formatSSE({
    success: true,
    fragments: event.fragments || [],
    merged: true,
    eventId: event.eventId
  }, 'fragmentsResult', String(event.eventId || Date.now()));
}

/**
 * Process a merge signals event
 */
async function processMergeSignals(sdk: DatastarBunSDK, event: any): Promise<string> {
  console.log('Processing mergeSignals event:', event);
  
  // Simulate processing
  return formatSSE({
    success: true,
    signals: event.signals || [],
    merged: true,
    eventId: event.eventId
  }, 'signalsResult', String(event.eventId || Date.now()));
}

/**
 * Process a remove fragments event
 */
async function processRemoveFragments(sdk: DatastarBunSDK, event: any): Promise<string> {
  console.log('Processing removeFragments event:', event);
  
  // Simulate processing
  return formatSSE({
    success: true,
    removed: true,
    count: event.fragments ? event.fragments.length : 0,
    eventId: event.eventId
  }, 'fragmentsResult', String(event.eventId || Date.now()));
}

/**
 * Process a remove signals event
 */
async function processRemoveSignals(sdk: DatastarBunSDK, event: any): Promise<string> {
  console.log('Processing removeSignals event:', event);
  
  // Simulate processing
  return formatSSE({
    success: true,
    removed: true,
    count: event.signals ? event.signals.length : 0,
    eventId: event.eventId
  }, 'signalsResult', String(event.eventId || Date.now()));
}

/**
 * Process events based on their type
 */
async function processEvents(sdk: DatastarBunSDK, events: any[]): Promise<string> {
  let response = '';
  
  for (const event of events) {
    switch (event.type) {
      case 'executeScript':
        response += await processExecuteScript(sdk, event);
        break;
      case 'mergeFragments':
        response += await processMergeFragments(sdk, event);
        break;
      case 'mergeSignals':
        response += await processMergeSignals(sdk, event);
        break;
      case 'removeFragments':
        response += await processRemoveFragments(sdk, event);
        break;
      case 'removeSignals':
        response += await processRemoveSignals(sdk, event);
        break;
      default:
        response += formatSSE({
          error: `Unknown event type: ${event.type}`,
          eventId: event.eventId
        }, 'error', String(event.eventId || Date.now()));
    }
  }
  
  return response;
}

// Create SDK instance
const sdk = new DatastarBunSDK({
  apiBaseUrl: 'http://localhost:3000', 
  authToken: 'test-token'
});

// Create a server that implements the test endpoint
const server: Server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Handle the /test endpoint
    if (url.pathname === '/test') {
      try {
        // Set up SSE headers
        const headers = new Headers({
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        
        let responseBody = '';
        
        if (req.method === 'GET') {
          // Process GET request
          // Extract query parameters and process them
          const params = Object.fromEntries(url.searchParams.entries());
          console.log('GET request with params:', params);
          
          // Create a stream for the response
          const stream = new ReadableStream({
            start(controller) {
              // Process any events that might be in query params
              // For simplicity, we're just returning a simple event
              const eventData = formatSSE({
                message: 'GET request processed',
                params
              }, 'info');
              
              controller.enqueue(new TextEncoder().encode(eventData));
              controller.close();
            }
          });
          
          return new Response(stream, {
            headers
          });
        } else if (req.method === 'POST') {
          // Process POST request with JSON body
          try {
            const data = await req.json();
            console.log('POST request with data:', data);
            
            if (data.events && Array.isArray(data.events)) {
              // Process each event in the events array
              responseBody = await processEvents(sdk, data.events as any[]);
            } else {
              responseBody = formatSSE({
                error: 'Invalid request format: missing events array'
              }, 'error');
            }
            
            // Create a stream for the response
            const stream = new ReadableStream({
              start(controller) {
                controller.enqueue(new TextEncoder().encode(responseBody));
                controller.close();
              }
            });
            
            return new Response(stream, {
              headers
            });
          } catch (e) {
            return new Response(
              formatSSE({
                error: 'Invalid JSON payload'
              }, 'error'),
              {
                headers,
                status: 400
              }
            );
          }
        }
        
        // Method not supported
        return new Response(
          formatSSE({
            error: `Method ${req.method} not supported`
          }, 'error'),
          {
            headers,
            status: 405
          }
        );
      } catch (error) {
        console.error('Error handling request:', error);
        return new Response(
          JSON.stringify({ error: 'Internal server error' }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // Handle other endpoints or return 404
    return new Response('Not found', { status: 404 });
  }
});

console.log(`Test server running at http://localhost:${server.port}`);
console.log('To run tests against it:');
console.log('1. Clone the datastar repo: git clone https://github.com/starfederation/datastar.git');
console.log('2. Navigate to the test directory: cd datastar/sdk/test');
console.log('3. Run the tests: ./test-all.sh http://localhost:3000');