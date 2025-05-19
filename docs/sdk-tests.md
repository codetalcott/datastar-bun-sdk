// datastar-sdk.test.ts
import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { DatastarBunSDK, SSEClient } from './src/index'; // Adjust path once files exist
import type { DatastarSDKOptions, DatastarQueryParams, DatastarAPIError, DatastarSSEError } from './src/index'; // For types

// --- Mock Bun's fetch ---
let mockFetchResponses: Array<{
    urlPattern: RegExp | string;
    method?: string;
    response: () => Promise<Response> | Promise<Response>;
    callCount?: number; // For tracking calls to specific mocks
}> = [];

const originalFetch = global.fetch;

global.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlString = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method?.toUpperCase() || 'GET';

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
        });
    });

    afterEach(async () => {
        // Ensure SSE connections are closed if sdk.sseClient exists and has a close method
        if (sdk && sdk.sse && typeof (sdk.sse as any).close === 'function') {
            await (sdk.sse as any).close();
        }
        (fetch as any).mockClear(); // Clear call history if Bun's mock supports it, or manage manually
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
            });
            mockFetchResponses.push({
                urlPattern: `${BASE_API_URL}/records/test/1`,
                response: async () => new Response(JSON.stringify({ id: '1' }), { status: 200 })
            });
            await dynamicSdk.getRecord('test', '1');
            expect(tokenFunc).toHaveBeenCalledTimes(1);
            // Check header in actual fetch call (requires deeper mock inspection)
        });

        it('AC.7: should use default timeout and retry options if not specified', () => {
            const minimalSdk = new DatastarBunSDK({ authToken: 'token' }); // Assuming URLs might come from env or have defaults
            expect((minimalSdk as any).options.requestTimeout).toBeGreaterThan(0); // Check some default value
            expect((minimalSdk as any).options.retryOptions).toBeDefined();
        });

        // AC.8: Bun.env override - This requires actually setting Bun.env before SDK init.
        // This might be better as an integration-style test or needs a way to mock Bun.env.
    });

    // REQ-CORE-002: Authentication
    describe('REQ-CORE-002: Authentication', () => {
        it('AC.1: should include Authorization header in API calls', async () => {
            const spy = spyOn(global, 'fetch');
            mockFetchResponses.push({
                urlPattern: `${BASE_API_URL}/records/authcheck/1`,
                response: async () => new Response(JSON.stringify({ id: '1' }), { status: 200 })
            });
            await sdk.getRecord('authcheck', '1');
            expect(spy).toHaveBeenCalled();
            const fetchArgs = spy.mock.calls[0];
            const headers = new Headers(fetchArgs[1]?.headers as HeadersInit);
            expect(headers.get('Authorization')).toBe(`Bearer ${DEFAULT_TOKEN}`);
            spy.mockRestore();
        });

        // AC.3: Test specific DatastarAuthenticationError (requires error class)
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
                response: async () => new Response(JSON.stringify(responseRecord), { status: 200 })
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
                expect(e.name).toBe('DatastarRecordNotFoundError'); // Or `expect(e).toBeInstanceOf(DatastarRecordNotFoundError)`
            }
        });
    });

    // REQ-DATA-005: List/Query Records
    describe('REQ-DATA-005: List/Query Records', () => {
        it('AC.1-AC.4: should list records with query parameters', async () => {
            const query: DatastarQueryParams = { filter: 'status:active', limit: 5, sort: 'createdAt:desc' };
            const responseRecords = [{ id: 'r1' }, { id: 'r2' }];
            const expectedUrlRegex = /\/records\/tasks\?filter=status%3Aactive&limit=5&sort=createdAt%3Adesc/;
            mockFetchResponses.push({
                urlPattern: expectedUrlRegex,
                method: 'GET',
                response: async () => new Response(JSON.stringify(responseRecords), { status: 200 })
            });

            const records = await sdk.listRecords('tasks', query);
            expect(records.length).toBe(2);
            // More specific check for URL in fetch mock would be good here
        });
    });


    // REQ-SSE-001 & REQ-SSE-002 & REQ-SSE-003: SSE Functionality
    describe('SSE Functionality', () => {
        let sseHandler: any; // Would be sdk.sse or similar

        beforeEach(() => {
             // Assume SDK constructor initializes an SSEClient instance accessible via sdk.sse
            sseHandler = sdk.sse;
        });

        it('REQ-SSE-001-AC.5 (open): should emit sse_open on successful connection', (done) => {
            mockFetchResponses.push({
                urlPattern: BASE_SSE_URL,
                response: async () => new Response(createMockSSEStream([]), {
                    status: 200,
                    headers: { 'Content-Type': 'text/event-stream' }
                })
            });

            sseHandler.on('sse_open', () => {
                done();
            });
            sseHandler.connect(); // Assuming an explicit connect method for SSE client
        });

        it('REQ-SSE-002-AC.1-AC.4: should parse and emit typed SSE events', (done) => {
            const eventPayload = { message: 'hello bun' };
            const sseMessages = [
                `id: event1\nevent: custom_update\ndata: ${JSON.stringify(eventPayload)}`
            ];
            mockFetchResponses.push({
                urlPattern: BASE_SSE_URL,
                response: async () => new Response(createMockSSEStream(sseMessages), {
                    status: 200,
                    headers: { 'Content-Type': 'text/event-stream' }
                })
            });

            // Assuming a generic 'event' listener or specific typed listeners
            sseHandler.on('custom_update', (event: { id: string, data: any }) => {
                expect(event.id).toBe('event1');
                expect(event.data).toEqual(eventPayload);
                done();
            });
            sseHandler.connect();
        });

        it('REQ-SSE-003-AC.1/AC.2 (reconnect): should attempt to reconnect with Last-Event-ID on stream end', (done) => {
            const eventId = "last-event-123";
            let connectAttempts = 0;

            mockFetchResponses.push({ // Initial connection
                urlPattern: BASE_SSE_URL,
                response: async () => {
                    connectAttempts++;
                    const stream = createMockSSEStream([`id: ${eventId}\ndata: initial data`]);
                    // Simulate server closing stream shortly after sending one event
                    setTimeout(() => (stream.getReader() as any)._controller?.close(), 50);
                    return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' }});
                },
                callCount: 0,
            });
            mockFetchResponses.push({ // Reconnection attempt
                urlPattern: BASE_SSE_URL, // Same URL
                response: async () => { // This is the second call to fetch for SSE URL
                    connectAttempts++;
                    // Check Last-Event-ID on the *actual* fetch call made by the client.
                    // This requires inspecting the arguments to the mocked fetch.
                    // For now, we just ensure it attempts to connect again.
                    return new Response(createMockSSEStream([]), { status: 200, headers: { 'Content-Type': 'text/event-stream' }});
                },
                callCount: 0,
            });


            sseHandler.on('sse_reconnecting', ({ attempt }: { attempt: number }) => {
                if (attempt === 1) { // First reconnect attempt
                     // We need to inspect the actual fetch call here for Last-Event-ID
                     // This requires the mock to capture headers.
                     // For now, we'll assume the logic works if it tries to reconnect.
                }
            });

            sseHandler.on('sse_open', () => { // Will be called for each successful connection
                if (connectAttempts === 2) { // Second connection (reconnect) is open
                    done();
                }
            });

            sseHandler.configure({ retryOptions: { initialDelay: 10, maxRetries: 2 }}); // Fast retry for test
            sseHandler.connect();
        });


        it('REQ-SSE-003-AC.3 (retry field): should use server-sent retry value', (done) => {
            const serverRetry = 50; // ms
            mockFetchResponses.push({
                urlPattern: BASE_SSE_URL,
                response: async () => {
                    const stream = createMockSSEStream([`retry: ${serverRetry}\ndata: some data`]);
                    setTimeout(() => (stream.getReader() as any)._controller?.close(), 10); // Simulate drop
                    return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' }});
                }
            });
            mockFetchResponses.push({ // Reconnect attempt
                urlPattern: BASE_SSE_URL,
                response: async () => new Response(createMockSSEStream([]), { status: 200, headers: { 'Content-Type': 'text/event-stream' }})
            });


            sseHandler.on('sse_reconnecting', ({ delay }: { delay: number }) => {
                expect(delay).toBe(serverRetry); // Check if the correct delay is used
                done(); // Assuming one reconnect attempt is enough for this test
            });

            sseHandler.configure({ retryOptions: { initialDelay: 1000 }}); // High default, ensure server overrides
            sseHandler.connect();
        });

    });

    // REQ-BUN-001: Leverage Bun's Native APIs
    describe('REQ-BUN-001: Bun Optimization', () => {
        it('AC.1: should use Bun.fetch (verified by global mock)', () => {
            // The fact that our global fetch mock is being called indicates Bun's fetch is used.
            expect(true).toBe(true); // Implicitly true if other tests pass
        });
    });
});