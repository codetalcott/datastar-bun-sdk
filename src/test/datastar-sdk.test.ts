import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { DatastarBunSDK } from '../index';
import { 
  DatastarAPIError, 
  DatastarRecordNotFoundError, 
  DatastarAuthenticationError,
  DatastarConnectionError
} from '../types';

// --- Mock Bun's fetch ---
let mockFetchResponses: Array<{
    urlPattern: RegExp | string;
    method?: string;
    response: () => Promise<Response>;
    callCount?: number; // For tracking calls to specific mocks
}> = [];

const originalFetch = global.fetch;

const mockFetch = mock(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlString = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method?.toUpperCase() || 'GET';

    console.log(`[Mock Fetch] ${method} ${urlString}`);

    const matchedMock = mockFetchResponses.find(m =>
        (typeof m.urlPattern === 'string' ? urlString.includes(m.urlPattern) : m.urlPattern.test(urlString)) &&
        (m.method ? m.method === method : true)
    );

    if (matchedMock) {
        if (typeof matchedMock.callCount === 'number') matchedMock.callCount++;
        console.log(`[Mock Fetch] ${method} ${urlString} - Using matched mock.`);
        return await matchedMock.response();
    }

    console.warn(`[Mock Fetch] ${method} ${urlString} - No specific mock found. Returning 404.`);
    return new Response(JSON.stringify({ error: 'No mock found for this request' }), { status: 404 });
});

// Add preconnect property
mockFetch.preconnect = async () => {};

global.fetch = mockFetch;

// --- Helper to create mock SSE stream ---
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
            // To simulate server truly closing, ensure no more enqueueing.
            // If controller is still defined, it means the stream can still push.
            // For many tests, we might want to `controller.close()` after enqueuing initial events
            // to simulate a stream that ends or is interrupted.
        },
        // pull(controller) { /* Can be used for more complex stream logic */ }
    });
}

describe('DatastarBunSDK', () => {
    const BASE_API_URL = 'https://api.datastar.test/v1';
    const BASE_SSE_URL = 'https://sse.datastar.test/v1';
    const DEFAULT_TOKEN = 'test-sdk-token';

    let sdk: DatastarBunSDK;

    beforeEach(() => {
        mockFetchResponses = []; // Reset mocks for each test
        // Default SDK instance for most tests
        sdk = new DatastarBunSDK({
            apiBaseUrl: BASE_API_URL,
            sseUrl: BASE_SSE_URL,
            authToken: DEFAULT_TOKEN,
            // Set a shorter timeout for tests to avoid long test runs
            requestTimeout: 1000,
            retryOptions: {
                maxRetries: 1,
                initialDelay: 100
            }
        });
    });

    afterEach(async () => {
        // Ensure SSE connections are closed if sdk.sseClient exists and has a close method
        if (sdk && sdk.sse && typeof sdk.sse.close === 'function') {
            await sdk.sse.close();
        }
        mockFetchResponses = []; // Reset mocks
    });

    // Basic test to check if our test setup works
    describe('Basic Test Setup', () => {
        it('should run tests', () => {
            expect(true).toBe(true);
        });
    });

    // REQ-CORE-001: SDK Initialization and Configuration
    describe('REQ-CORE-001: Initialization & Configuration', () => {
        it('AC.1-AC.4: should initialize with provided URLs and token', () => {
            expect((sdk as any).options.apiBaseUrl).toBe(BASE_API_URL);
            expect((sdk as any).options.sseUrl).toBe(BASE_SSE_URL);
            expect((sdk as any).options.authToken).toBe(DEFAULT_TOKEN);
        });

        it('AC.4: should use a token provider function', async () => {
            const tokenFunc = mock(async () => 'dynamic-token-123');
            const dynamicSdk = new DatastarBunSDK({
                apiBaseUrl: BASE_API_URL,
                authToken: tokenFunc,
                requestTimeout: 1000,
                retryOptions: {
                    maxRetries: 0
                }
            });
            mockFetchResponses.push({
                urlPattern: `${BASE_API_URL}/records/test/1`,
                response: async () => new Response(JSON.stringify({ id: '1' }), { status: 200 })
            });
            await dynamicSdk.getRecord('test', '1');
            expect(tokenFunc).toHaveBeenCalledTimes(1);
        });

        it('AC.7: should use default timeout and retry options if not specified', () => {
            const minimalSdk = new DatastarBunSDK({ authToken: 'token' }); // Assuming URLs might come from env or have defaults
            expect((minimalSdk as any).options.requestTimeout).toBeGreaterThan(0); // Check some default value
            expect((minimalSdk as any).options.retryOptions).toBeDefined();
        });
    });

    // REQ-CORE-002: Authentication
    describe('REQ-CORE-002: Authentication', () => {
        it('AC.1: should include Authorization header in API calls', async () => {
            const customSdk = new DatastarBunSDK({
                apiBaseUrl: BASE_API_URL,
                sseUrl: BASE_SSE_URL,
                authToken: DEFAULT_TOKEN,
                requestTimeout: 1000,
                retryOptions: { maxRetries: 0 }
            });

            const originalFetch = global.fetch;
            let capturedHeaders: Headers | null = null;
            
            // Create a spy just for this test with a specific mock implementation
            const fetchSpy = mock(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
                const urlString = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
                capturedHeaders = new Headers(init?.headers as HeadersInit);
                
                // Still use our mockFetchResponses mechanism
                const matchedMock = mockFetchResponses.find(m =>
                    (typeof m.urlPattern === 'string' ? urlString.includes(m.urlPattern) : m.urlPattern.test(urlString))
                );
                
                if (matchedMock) {
                    return await matchedMock.response();
                }
                
                return new Response(JSON.stringify({ id: '1' }), { status: 200 });
            });
            
            // Override global.fetch just for this test
            global.fetch = fetchSpy;
            
            try {
                mockFetchResponses.push({
                    urlPattern: `${BASE_API_URL}/records/authcheck/1`,
                    response: async () => new Response(JSON.stringify({ id: '1' }), { status: 200 })
                });
                
                await customSdk.getRecord('authcheck', '1');
                
                expect(fetchSpy).toHaveBeenCalled();
                expect(capturedHeaders?.get('Authorization')).toBe(`Bearer ${DEFAULT_TOKEN}`);
            } finally {
                // Restore the original mock
                global.fetch = originalFetch;
            }
        });
    });

    // REQ-DATA-002: Read Record
    describe('REQ-DATA-002: Read Record', () => {
        it('AC.1-AC.3: should retrieve a record by ID', async () => {
            const recordId = 'record2';
            const responseRecord = { id: recordId, data: 'some data' };
            mockFetchResponses.push({
                urlPattern: `${BASE_API_URL}/records/items/${recordId}`,
                method: 'GET',
                response: async () => {
                    return new Response(JSON.stringify(responseRecord), { 
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            });
            
            const record = await sdk.getRecord('items', recordId);
            expect(record).toEqual(responseRecord);
        });

        it('AC.4: should throw DatastarRecordNotFoundError for 404', async () => {
            mockFetchResponses.push({
                urlPattern: `${BASE_API_URL}/records/items/nonexistent`,
                method: 'GET',
                response: async () => new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 })
            });
            
            try {
                await sdk.getRecord('items', 'nonexistent');
                expect.unreachable("Should have thrown");
            } catch (e: any) {
                expect(e).toBeInstanceOf(DatastarRecordNotFoundError);
                expect(e.name).toBe('DatastarRecordNotFoundError');
                expect(e.statusCode).toBe(404);
                expect(e.responseBody).toEqual({ error: 'Not Found' });
            }
        });
    });

    // REQ-DATA-001: Create Record
    describe('REQ-DATA-001: Create Record', () => {
        it('AC.1-AC.4: should create a record and return it', async () => {
            const payload = { name: 'Bun Test', value: 123 };
            const responseRecord = { id: 'record1', ...payload };
            mockFetchResponses.push({
                urlPattern: `${BASE_API_URL}/records/items`,
                method: 'POST',
                response: async () => new Response(JSON.stringify(responseRecord), { status: 201 })
            });

            const created = await sdk.createRecord<{ id: string; name: string; value: number }>('items', payload);
            expect(created.id).toBe('record1');
            expect(created.name).toBe('Bun Test');
            expect(created.value).toBe(123);
        });

        it('should send the correct request payload', async () => {
            const payload = { name: 'Test Item', details: { color: 'blue' } };
            const responseRecord = { id: 'new-item', ...payload };
            
            let capturedPayload: any = null;
            
            // Mock fetch to capture the payload
            const originalFetch = global.fetch;
            global.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
                if (init?.body) {
                    capturedPayload = JSON.parse(init.body as string);
                }
                return new Response(JSON.stringify(responseRecord), { status: 201 });
            });
            
            try {
                await sdk.createRecord('items', payload);
                
                expect(capturedPayload).toBeDefined();
                expect(capturedPayload).toEqual(payload);
            } finally {
                // Restore the original fetch
                global.fetch = originalFetch;
            }
        });
    });

    // REQ-DATA-003: Update Record
    describe('REQ-DATA-003: Update Record', () => {
        it('should update a record', async () => {
            const recordId = 'existing-record';
            const updatePayload = { name: 'Updated Name', value: 456 };
            const responseRecord = { id: recordId, ...updatePayload };
            
            mockFetchResponses.push({
                urlPattern: `${BASE_API_URL}/records/items/${recordId}`,
                method: 'PUT',
                response: async () => new Response(JSON.stringify(responseRecord), { status: 200 })
            });
            
            const updated = await sdk.updateRecord<typeof responseRecord>('items', recordId, updatePayload);
            
            expect(updated.id).toBe(recordId);
            expect(updated.name).toBe(updatePayload.name);
            expect(updated.value).toBe(updatePayload.value);
        });
        
        it('should send the correct request payload for update', async () => {
            const recordId = 'record-to-update';
            const updatePayload = { status: 'active', metadata: { updated: true } };
            const responseRecord = { id: recordId, ...updatePayload };
            
            let capturedPayload: any = null;
            let capturedMethod: string | undefined;
            let capturedUrl: string = '';
            
            // Mock fetch to capture the payload and method
            const originalFetch = global.fetch;
            global.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
                capturedUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
                capturedMethod = init?.method;
                
                if (init?.body) {
                    capturedPayload = JSON.parse(init.body as string);
                }
                
                return new Response(JSON.stringify(responseRecord), { status: 200 });
            });
            
            try {
                await sdk.updateRecord('items', recordId, updatePayload);
                
                expect(capturedMethod).toBe('PUT');
                expect(capturedUrl).toContain(`/records/items/${recordId}`);
                expect(capturedPayload).toBeDefined();
                expect(capturedPayload).toEqual(updatePayload);
            } finally {
                // Restore the original fetch
                global.fetch = originalFetch;
            }
        });
    });

    // REQ-DATA-004: Delete Record
    describe('REQ-DATA-004: Delete Record', () => {
        it('should delete a record', async () => {
            const recordId = 'record-to-delete';
            
            mockFetchResponses.push({
                urlPattern: `${BASE_API_URL}/records/items/${recordId}`,
                method: 'DELETE',
                response: async () => new Response(null, { status: 204 })
            });
            
            await sdk.deleteRecord('items', recordId);
            
            // If we reach here, the test passes
            expect(true).toBe(true);
        });
        
        it('should handle 404 when deleting non-existent record', async () => {
            const recordId = 'nonexistent-record';
            
            mockFetchResponses.push({
                urlPattern: `${BASE_API_URL}/records/items/${recordId}`,
                method: 'DELETE',
                response: async () => new Response(JSON.stringify({ error: 'Record not found' }), { status: 404 })
            });
            
            try {
                await sdk.deleteRecord('items', recordId);
                expect.unreachable("Should have thrown");
            } catch (e: any) {
                expect(e).toBeInstanceOf(DatastarRecordNotFoundError);
                expect(e.statusCode).toBe(404);
            }
        });
    });
    
    // REQ-DATA-005: List/Query Records
    describe('REQ-DATA-005: List/Query Records', () => {
        it('should list records with query parameters', async () => {
            const queryParams = { filter: 'status:active', limit: 5, sort: 'createdAt:desc' };
            const responseRecords = [{ id: 'r1' }, { id: 'r2' }];
            
            let capturedUrl: string = '';
            
            // Mock to capture the full URL with query params
            const originalFetch = global.fetch;
            global.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
                capturedUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
                return new Response(JSON.stringify(responseRecords), { status: 200 });
            });
            
            try {
                const records = await sdk.listRecords('tasks', queryParams);
                
                expect(records.length).toBe(2);
                expect(records[0].id).toBe('r1');
                expect(records[1].id).toBe('r2');
                
                // Check query parameters are correctly encoded
                expect(capturedUrl).toContain('filter=status%3Aactive');
                expect(capturedUrl).toContain('limit=5');
                expect(capturedUrl).toContain('sort=createdAt%3Adesc');
            } finally {
                // Restore the original fetch
                global.fetch = originalFetch;
            }
        });
        
        it('should list records without query parameters', async () => {
            const responseRecords = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }];
            
            mockFetchResponses.push({
                urlPattern: `${BASE_API_URL}/records/tasks`,
                method: 'GET',
                response: async () => new Response(JSON.stringify(responseRecords), { status: 200 })
            });
            
            const records = await sdk.listRecords('tasks');
            
            expect(records.length).toBe(3);
            expect(records[0].id).toBe('r1');
        });
    });

    // REQ-CORE-003: Error Handling
    describe('REQ-CORE-003: Error Handling', () => {
        it('should throw DatastarAuthenticationError for 401', async () => {
            mockFetchResponses.push({
                urlPattern: `${BASE_API_URL}/records/auth/test`,
                method: 'GET',
                response: async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
            });
            
            try {
                await sdk.getRecord('auth', 'test');
                expect.unreachable("Should have thrown");
            } catch (e: any) {
                expect(e).toBeInstanceOf(DatastarAuthenticationError);
                expect(e.name).toBe('DatastarAuthenticationError');
                expect(e.statusCode).toBe(401);
                expect(e.responseBody).toEqual({ error: 'Unauthorized' });
            }
        });

        it('should throw DatastarAuthenticationError for 403', async () => {
            mockFetchResponses.push({
                urlPattern: `${BASE_API_URL}/records/auth/test`,
                method: 'GET',
                response: async () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
            });
            
            try {
                await sdk.getRecord('auth', 'test');
                expect.unreachable("Should have thrown");
            } catch (e: any) {
                expect(e).toBeInstanceOf(DatastarAuthenticationError);
                expect(e.name).toBe('DatastarAuthenticationError');
                expect(e.statusCode).toBe(403);
                expect(e.responseBody).toEqual({ error: 'Forbidden' });
            }
        });

        it('should throw DatastarAPIError for other status codes', async () => {
            mockFetchResponses.push({
                urlPattern: `${BASE_API_URL}/records/error/test`,
                method: 'GET',
                response: async () => new Response(JSON.stringify({ error: 'Server Error' }), { status: 500 })
            });
            
            try {
                await sdk.getRecord('error', 'test');
                expect.unreachable("Should have thrown");
            } catch (e: any) {
                expect(e).toBeInstanceOf(DatastarAPIError);
                expect(e.name).toBe('DatastarAPIError');
                expect(e.statusCode).toBe(500);
                expect(e.responseBody).toEqual({ error: 'Server Error' });
            }
        });

        it('should throw DatastarConnectionError for network failures', async () => {
            // Mock a network failure
            const originalFetch = global.fetch;
            global.fetch = mock(async () => {
                throw new Error("Network error");
            });
            
            try {
                await sdk.getRecord('network', 'error');
                expect.unreachable("Should have thrown");
            } catch (e: any) {
                expect(e).toBeInstanceOf(DatastarConnectionError);
                expect(e.name).toBe('DatastarConnectionError');
                expect(e.message).toContain('Network error');
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('should handle timeout exceptions correctly', async () => {
            // Mock implementation that immediately throws an AbortError
            const originalFetch = global.fetch;
            global.fetch = mock(async () => {
                const error = new Error("The operation was aborted");
                error.name = "AbortError";
                throw error;
            });
            
            try {
                await sdk.getRecord('timeout', 'test');
                expect.unreachable("Should have thrown");
            } catch (e: any) {
                expect(e).toBeInstanceOf(DatastarConnectionError);
                expect(e.message).toContain('timed out');
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('should use different timeouts for different requests', async () => {
            // Setup mock that directly returns what we want to test
            const originalFetch = global.fetch;
            
            // Create two test SDKs with different timeouts
            const fastSdk = new DatastarBunSDK({
                apiBaseUrl: BASE_API_URL,
                authToken: DEFAULT_TOKEN,
                requestTimeout: 50 // Very short timeout
            });
            
            const slowSdk = new DatastarBunSDK({
                apiBaseUrl: BASE_API_URL,
                authToken: DEFAULT_TOKEN,
                requestTimeout: 5000 // Long timeout
            });
            
            // First call will succeed
            mockFetchResponses.push({
                urlPattern: `${BASE_API_URL}/records/test/fast`,
                response: async () => new Response(JSON.stringify({ id: 'fast' }), { status: 200 })
            });
            
            // For request with custom timeout, directly check the options passed to the fetch function
            let timeoutOptions: RequestInit | undefined;
            global.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
                const urlString = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
                
                // Store the options we're testing
                if (urlString.includes('timeout/different')) {
                    timeoutOptions = init;
                }
                
                // Use the regular mock system
                const matchedMock = mockFetchResponses.find(m =>
                    (typeof m.urlPattern === 'string' ? urlString.includes(m.urlPattern) : m.urlPattern.test(urlString))
                );
                
                if (matchedMock) {
                    return await matchedMock.response();
                }
                
                return new Response(JSON.stringify({ id: 'default' }), { status: 200 });
            });
            
            try {
                // Make a request to capture timeout options
                await slowSdk.getRecord('timeout', 'different', { timeout: 100 });
                
                // Validate the AbortSignal was present
                expect(timeoutOptions).toBeDefined();
                expect(timeoutOptions?.signal).toBeDefined();
                
                // Call with the fast SDK
                const fastResult = await fastSdk.getRecord('test', 'fast');
                expect(fastResult).toEqual({ id: 'fast' });
            } finally {
                global.fetch = originalFetch;
            }
        });
    });
});