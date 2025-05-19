import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { SSEClient } from '../sse-client';
import { DatastarSSEError, DatastarAuthenticationError } from '../types';

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

describe('SSEClient', () => {
  const SSE_URL = 'https://sse.datastar.test/v1';
  const AUTH_TOKEN = 'test-sse-token';
  
  let sseClient: SSEClient;
  
  beforeEach(() => {
    // Reset mock implementation
    mockFetchImpl = undefined;
    
    // Create a fresh SSE client for each test
    sseClient = new SSEClient({
      url: SSE_URL,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      heartbeatInterval: 200, // Short for tests
      retryOptions: {
        maxRetries: 2,
        initialDelay: 50,
        backoffFactor: 1.5,
        maxRetryDelay: 200
      }
    });
  });
  
  afterEach(async () => {
    await sseClient.close();
  });
  
  it('should emit open event on successful connection', (done) => {
    // Setup mock connection
    mockFetchImpl = async () => {
      return new Response(createMockSSEStream([]/* empty stream */), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' }
      });
    };
    
    // Listen for open event
    sseClient.on('open', () => {
      done();
    });
    
    // Connect to SSE
    sseClient.connect();
  });
  
  it('should parse and emit SSE events', (done) => {
    const testData = { message: 'test message' };
    const events = [
      `id: event1\nevent: custom_event\ndata: ${JSON.stringify(testData)}`
    ];
    
    mockFetchImpl = async () => {
      return new Response(createMockSSEStream(events), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' }
      });
    };
    
    sseClient.on('custom_event', (event) => {
      expect(event.id).toBe('event1');
      expect(event.data).toEqual(testData);
      done();
    });
    
    sseClient.connect();
  });
  
  it('should handle multiline data', (done) => {
    const events = [
      'id: multi1\nevent: multiline\ndata: line1\ndata: line2\ndata: line3'
    ];
    
    mockFetchImpl = async () => {
      return new Response(createMockSSEStream(events), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' }
      });
    };
    
    sseClient.on('multiline', (event) => {
      expect(event.id).toBe('multi1');
      expect(event.data).toBe('line1\nline2\nline3');
      done();
    });
    
    sseClient.connect();
  });
  
  it('should use Last-Event-ID for reconnection', (done) => {
    let connectCount = 0;
    let lastEventIdHeader: string | null = null;
    
    mockFetchImpl = async (input, init) => {
      connectCount++;
      
      // Check for Last-Event-ID header on reconnection
      if (connectCount > 1 && init?.headers) {
        const headers = new Headers(init.headers);
        lastEventIdHeader = headers.get('Last-Event-ID');
      }
      
      // First connection: return a stream with an event, then close it
      if (connectCount === 1) {
        const stream = createMockSSEStream(['id: last-event-123\ndata: test data']);
        
        // Close the stream after a short delay to trigger reconnection
        setTimeout(() => {
          (stream as any).controller?.close();
        }, 50);
        
        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' }
        });
      }
      
      // Second connection: check if Last-Event-ID was included
      if (connectCount === 2) {
        expect(lastEventIdHeader).toBe('last-event-123');
        done();
        return new Response(createMockSSEStream([]), {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' }
        });
      }
      
      return new Response(createMockSSEStream([]), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' }
      });
    };
    
    // Listen for reconnect attempts
    sseClient.on('reconnecting', (data) => {
      expect(data.attempt).toBe(1); // First attempt
    });
    
    sseClient.connect();
  });
  
  it('should handle retry field from server', (done) => {
    let connectCount = 0;
    let reconnectTime = 0;
    
    mockFetchImpl = async () => {
      connectCount++;
      
      // First connection: return a stream with retry directive, then close
      if (connectCount === 1) {
        const customRetry = 100; // Very short for test
        const stream = createMockSSEStream([`retry: ${customRetry}\ndata: test`]);
        
        // Close the stream after sending the event
        setTimeout(() => {
          (stream as any).controller?.close();
        }, 50);
        
        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' }
        });
      }
      
      return new Response(createMockSSEStream([]), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' }
      });
    };
    
    // Capture reconnect timing
    sseClient.on('reconnecting', (data) => {
      reconnectTime = data.delay;
      
      // Should be using server-provided retry value
      expect(reconnectTime).toBe(100);
      done();
    });
    
    sseClient.connect();
  });
  
  it('should handle disconnection with exponential backoff', (done) => {
    let connectCount = 0;
    const delays: number[] = [];
    
    mockFetchImpl = async () => {
      connectCount++;
      
      // Create a stream that immediately closes
      const stream = createMockSSEStream([]);
      setTimeout(() => {
        (stream as any).controller?.close();
      }, 10);
      
      return new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' }
      });
    };
    
    sseClient.on('reconnecting', (data) => {
      delays.push(data.delay);
      
      // After capturing two delays, check backoff factor
      if (delays.length === 2) {
        // Allow some range due to jitter
        const backoffRatio = delays[1] / delays[0];
        expect(backoffRatio).toBeGreaterThan(1.2); // Should be near 1.5 (our factor)
        expect(backoffRatio).toBeLessThan(1.8);
        done();
      }
    });
    
    sseClient.connect();
  });
  
  it('should emit error events for connection failures', (done) => {
    mockFetchImpl = async () => {
      return new Response(null, {
        status: 500,
        statusText: 'Server Error'
      });
    };
    
    sseClient.on('error', (error) => {
      expect(error).toBeInstanceOf(DatastarSSEError);
      expect(error.message).toContain('500');
      done();
    });
    
    sseClient.connect();
  });
  
  it('should emit authentication error for 401/403 responses', (done) => {
    mockFetchImpl = async () => {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        statusText: 'Unauthorized'
      });
    };
    
    sseClient.on('error', (error) => {
      expect(error).toBeInstanceOf(DatastarAuthenticationError);
      expect(error.statusCode).toBe(401);
      done();
    });
    
    sseClient.connect();
  });
  
  it('should properly close the connection', async () => {
    let cancelled = false;
    
    mockFetchImpl = async () => {
      return new Response(createMockSSEStream([], () => {
        cancelled = true;
      }), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' }
      });
    };
    
    const closePromise = new Promise<void>((resolve) => {
      sseClient.on('close', (data) => {
        expect(data.intentional).toBe(true);
        resolve();
      });
    });
    
    await sseClient.connect();
    await sseClient.close();
    
    expect(cancelled).toBe(true);
    await closePromise;
  });
});