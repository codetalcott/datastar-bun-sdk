import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { DatastarBunSDK } from '../index';

// Helper function to create a mock SSE stream
function createMockSSEStream(events: string[], onCancel?: () => void): ReadableStream<Uint8Array> {
  let controller: ReadableStreamDefaultController<Uint8Array>;
  return new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      for (const event of events) {
        if (controller) controller.enqueue(new TextEncoder().encode(event + "\n\n"));
      }
    },
    cancel() {
      console.log("[Mock SSE Stream] Cancelled by client.");
      onCancel?.();
    },
  });
}

// Mock fetch for SSE tests
const originalFetch = global.fetch;
let mockFetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

global.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (mockFetchImpl) {
    return mockFetchImpl(input, init);
  }
  return new Response(null, { status: 404 });
});

describe('DatastarBunSDK SSE Integration', () => {
  const BASE_API_URL = 'https://api.datastar.test/v1';
  const BASE_SSE_URL = 'https://sse.datastar.test/v1';
  const DEFAULT_TOKEN = 'test-sdk-token';
  
  let sdk: DatastarBunSDK;
  
  beforeEach(() => {
    // Reset mock implementation
    mockFetchImpl = undefined;
    
    // Create a new SDK instance
    sdk = new DatastarBunSDK({
      apiBaseUrl: BASE_API_URL,
      sseUrl: BASE_SSE_URL,
      authToken: DEFAULT_TOKEN,
      // Set short intervals for tests
      retryOptions: {
        maxRetries: 2,
        initialDelay: 50,
        backoffFactor: 1.5,
        maxRetryDelay: 200
      }
    });
  });
  
  afterEach(async () => {
    await sdk.disconnectSSE();
  });
  
  it('should connect to SSE endpoint with auth token', async () => {
    let capturedHeaders: Record<string, string> = {};
    
    mockFetchImpl = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      if (url === BASE_SSE_URL) {
        const headers = new Headers(init?.headers as HeadersInit);
        capturedHeaders['Authorization'] = headers.get('Authorization') || '';
        
        return new Response(createMockSSEStream([]), {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' }
        });
      }
      
      return new Response(null, { status: 404 });
    };
    
    // Connect to SSE
    await sdk.connectSSE();
    
    expect(capturedHeaders['Authorization']).toBe(`Bearer ${DEFAULT_TOKEN}`);
  });
  
  it('should forward SSE events to SDK events', (done) => {
    const testData = { value: 'test data' };
    
    mockFetchImpl = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      if (url === BASE_SSE_URL) {
        const events = [
          `event: data_update\ndata: ${JSON.stringify(testData)}`
        ];
        
        return new Response(createMockSSEStream(events), {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' }
        });
      }
      
      return new Response(null, { status: 404 });
    };
    
    // Listen for the forwarded event
    sdk.on('sse_data_update', (data) => {
      expect(data.data).toEqual(testData);
      done();
    });
    
    sdk.connectSSE();
  });
  
  it('should forward connection events', async () => {
    mockFetchImpl = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      if (url === BASE_SSE_URL) {
        return new Response(createMockSSEStream([]), {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' }
        });
      }
      
      return new Response(null, { status: 404 });
    };
    
    // Create a promise for the open event
    const openPromise = new Promise<void>((resolve) => {
      sdk.on('sse_open', () => {
        resolve();
      });
    });
    
    await sdk.connectSSE();
    await openPromise;
    
    // Test passes if we get here
    expect(true).toBe(true);
  });
  
  it('should gracefully disconnect', async () => {
    let wasCancelled = false;
    
    mockFetchImpl = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      if (url === BASE_SSE_URL) {
        return new Response(createMockSSEStream([], () => {
          wasCancelled = true;
        }), {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' }
        });
      }
      
      return new Response(null, { status: 404 });
    };
    
    // Create a promise for the close event
    const closePromise = new Promise<boolean>((resolve) => {
      sdk.on('sse_close', (data) => {
        resolve(data.intentional);
      });
    });
    
    await sdk.connectSSE();
    await sdk.disconnectSSE();
    
    const wasIntentional = await closePromise;
    
    expect(wasCancelled).toBe(true);
    expect(wasIntentional).toBe(true);
  });
  
  it('should use token provider function for SSE auth', async () => {
    const dynamicToken = 'dynamic-sse-token-123';
    let capturedToken = '';
    
    const tokenProvider = mock(async () => dynamicToken);
    
    mockFetchImpl = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      if (url === BASE_SSE_URL) {
        const headers = new Headers(init?.headers as HeadersInit);
        const authHeader = headers.get('Authorization') || '';
        capturedToken = authHeader.replace('Bearer ', '');
        
        return new Response(createMockSSEStream([]), {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' }
        });
      }
      
      return new Response(null, { status: 404 });
    };
    
    // Create SDK with token provider
    const dynamicSdk = new DatastarBunSDK({
      apiBaseUrl: BASE_API_URL,
      sseUrl: BASE_SSE_URL,
      authToken: tokenProvider
    });
    
    await dynamicSdk.connectSSE();
    
    expect(tokenProvider).toHaveBeenCalled();
    expect(capturedToken).toBe(dynamicToken);
    
    // Clean up
    await dynamicSdk.disconnectSSE();
  });
});