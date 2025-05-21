import { EventEmitter } from 'events';
import type { 
  DatastarSDKOptions, 
  DatastarQueryParams, 
  RequestOptions
} from './types';
import {
  DatastarAPIError,
  DatastarRecordNotFoundError,
  DatastarAuthenticationError,
  DatastarConnectionError
} from './types';
import { SSEClient } from './sse-client';

// Default values
const DEFAULT_API_BASE_URL = 'https://api.datastar.io/v1';
const DEFAULT_SSE_URL = 'https://sse.datastar.io/v1';
const DEFAULT_REQUEST_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  backoffFactor: 2,
  maxRetryDelay: 10000 // 10 seconds
};
const DEFAULT_COMPRESSION_OPTIONS = {
  enabled: true,
  preferredEncodings: ['br', 'gzip', 'deflate'] as Array<'br' | 'gzip' | 'deflate'>
};

export class DatastarBunSDK {
  private options: DatastarSDKOptions;
  private emitter: EventEmitter;
  public sse: SSEClient;

  constructor(options: DatastarSDKOptions) {
    // Set defaults for options
    this.options = {
      apiBaseUrl: options.apiBaseUrl || DEFAULT_API_BASE_URL,
      sseUrl: options.sseUrl || DEFAULT_SSE_URL,
      authToken: options.authToken,
      requestTimeout: options.requestTimeout || DEFAULT_REQUEST_TIMEOUT,
      retryOptions: {
        ...DEFAULT_RETRY_OPTIONS,
        ...options.retryOptions
      }
    };

    // Initialize EventEmitter for SDK events
    this.emitter = new EventEmitter();
    
    // Initialize SSE client
    this.sse = new SSEClient({
      url: this.options.sseUrl || DEFAULT_SSE_URL,
      headers: {}, // Will be set during connectSSE
      heartbeatInterval: 30000,
      retryOptions: this.options.retryOptions,
      compression: DEFAULT_COMPRESSION_OPTIONS
    });

    // Setup event forwarding from SSE client
    this._setupSSEEventForwarding();
  }

  /**
   * Set up event forwarding from SSE client to SDK
   * @private
   */
  private _setupSSEEventForwarding(): void {
    const forwardEvents = [
      'open', 'close', 'error', 'reconnecting', 'warning', 'message'
    ];
    
    for (const eventName of forwardEvents) {
      this.sse.on(eventName, (data: any) => {
        // Forward the event with 'sse_' prefix
        this.emitter.emit(`sse_${eventName}`, data);
      });
    }
  }

  /**
   * Register an event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
   * @returns {DatastarBunSDK} - Returns this for chaining
   */
  on(event: string, listener: (...args: any[]) => void): this {
    this.emitter.on(event, listener);
    return this;
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
   * @returns {DatastarBunSDK} - Returns this for chaining
   */
  off(event: string, listener: (...args: any[]) => void): this {
    this.emitter.off(event, listener);
    return this;
  }

  /**
   * Connect to the SSE endpoint
   * @returns {Promise<void>}
   */
  async connectSSE(): Promise<void> {
    // Set the auth header with current token
    const authHeaders = await this._getAuthHeaders();
    
    // Update the SSE client headers
    this.sse.configure({
      headers: authHeaders
    });
    
    // Connect to the SSE endpoint
    await this.sse.connect();
  }

  /**
   * Disconnect from the SSE endpoint
   * @returns {Promise<void>}
   */
  async disconnectSSE(): Promise<void> {
    await this.sse.close();
  }

  // Private method to get auth headers
  private async _getAuthHeaders(): Promise<Record<string, string>> {
    let token: string;
    
    if (typeof this.options.authToken === 'function') {
      token = await Promise.resolve(this.options.authToken());
    } else {
      token = this.options.authToken;
    }
    
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  // Generic request method with error handling and retries
  private async _makeRequest<T>(
    url: string, 
    method: string = 'GET', 
    body?: any, 
    options?: RequestOptions
  ): Promise<T> {
    const timeout = options?.timeout || this.options.requestTimeout;
    const maxRetries = this.options.retryOptions?.maxRetries || DEFAULT_RETRY_OPTIONS.maxRetries;
    let retryCount = 0;
    let delay = this.options.retryOptions?.initialDelay || DEFAULT_RETRY_OPTIONS.initialDelay;
    
    while (true) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(await this._getAuthHeaders()),
          ...options?.headers
        };
        
        const requestOptions: RequestInit = {
          method,
          headers,
          signal: controller.signal,
          ...(body ? { body: JSON.stringify(body) } : {})
        };
        
        let response: Response;
        try {
          response = await fetch(url, requestOptions);
          clearTimeout(timeoutId);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          if (fetchError.name === 'AbortError') {
            throw new DatastarConnectionError(`Request timed out after ${timeout}ms`);
          }
          
          throw new DatastarConnectionError(`Network error: ${fetchError.message}`, fetchError);
        }
        
        // Handle response based on status
        if (!response.ok) {
          let errorBody;
          try {
            errorBody = await response.json();
          } catch (e) {
            errorBody = { message: 'Failed to parse error response' };
          }
          
          if (response.status === 404) {
            throw new DatastarRecordNotFoundError(`Record not found: ${url}`, errorBody);
          } else if (response.status === 401 || response.status === 403) {
            throw new DatastarAuthenticationError(`Authentication error: ${response.status}`, response.status, errorBody);
          } else {
            throw new DatastarAPIError(`API error: ${response.status}`, response.status, errorBody);
          }
        }
        
        // Parse and return successful response
        try {
          // Handle 204 No Content responses
          if (response.status === 204) {
            return {} as T;
          }
          
          const data = await response.json();
          return data as T;
        } catch (parseError: any) {
          throw new DatastarAPIError(`Failed to parse response: ${parseError.message}`, 200, { message: parseError.message });
        }
      } catch (error: any) {
        // If we've reached max retries, or it's not a retry-able error, rethrow
        if (
          retryCount >= maxRetries || 
          error instanceof DatastarRecordNotFoundError ||
          error instanceof DatastarAuthenticationError
        ) {
          throw error;
        }
        
        // Otherwise, retry with exponential backoff
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Calculate next delay with exponential backoff
        const backoffFactor = this.options.retryOptions?.backoffFactor || DEFAULT_RETRY_OPTIONS.backoffFactor;
        const maxRetryDelay = this.options.retryOptions?.maxRetryDelay || DEFAULT_RETRY_OPTIONS.maxRetryDelay;
        delay = Math.min(delay * backoffFactor, maxRetryDelay);
      }
    }
  }

  // Encodes query parameters into a URL query string
  private _encodeQueryParams(params: DatastarQueryParams): string {
    if (!params || Object.keys(params).length === 0) {
      return '';
    }
    
    const queryParts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
    
    return queryParts.length ? `?${queryParts.join('&')}` : '';
  }

  // Create a new record
  async createRecord<T = any>(collection: string, data: any, options?: RequestOptions): Promise<T> {
    const url = `${this.options.apiBaseUrl}/records/${collection}`;
    return this._makeRequest<T>(url, 'POST', data, options);
  }

  // Get a record by ID
  async getRecord<T = any>(collection: string, recordId: string, options?: RequestOptions): Promise<T> {
    const url = `${this.options.apiBaseUrl}/records/${collection}/${recordId}`;
    return this._makeRequest<T>(url, 'GET', undefined, options);
  }

  // Update a record
  async updateRecord<T = any>(collection: string, recordId: string, data: any, options?: RequestOptions): Promise<T> {
    const url = `${this.options.apiBaseUrl}/records/${collection}/${recordId}`;
    return this._makeRequest<T>(url, 'PUT', data, options);
  }

  // Delete a record
  async deleteRecord(collection: string, recordId: string, options?: RequestOptions): Promise<void> {
    const url = `${this.options.apiBaseUrl}/records/${collection}/${recordId}`;
    await this._makeRequest<void>(url, 'DELETE', undefined, options);
  }

  // List/query records
  async listRecords<T = any>(collection: string, queryParams?: DatastarQueryParams, options?: RequestOptions): Promise<T[]> {
    const queryString = this._encodeQueryParams(queryParams || {});
    const url = `${this.options.apiBaseUrl}/records/${collection}${queryString}`;
    return this._makeRequest<T[]>(url, 'GET', undefined, options);
  }
}

// Re-export types
export * from './types';