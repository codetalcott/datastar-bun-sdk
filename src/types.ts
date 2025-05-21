// Types for DatastarBunSDK

/**
 * SDK Configuration Options
 */
export interface DatastarSDKOptions {
  /** Base URL for API requests */
  apiBaseUrl?: string;
  /** URL for Server-Sent Events endpoint */
  sseUrl?: string;
  /** Authentication token (string or function that returns string or Promise<string>) */
  authToken: string | (() => string | Promise<string>);
  /** Request timeout in milliseconds */
  requestTimeout?: number;
  /** Retry configuration for failed requests */
  retryOptions?: {
    /** Maximum number of retry attempts */
    maxRetries?: number;
    /** Initial delay between retries in milliseconds */
    initialDelay?: number;
    /** Exponential backoff factor */
    backoffFactor?: number;
    /** Maximum retry delay in milliseconds */
    maxRetryDelay?: number;
  };
  /**
   * Compression configuration for SSE connections
   */
  compression?: {
    /** Whether to enable compressed responses (defaults to true) */
    enabled?: boolean;
    /** 
     * Ordered list of preferred compression encodings.
     * Will be sent as Accept-Encoding header.
     * Defaults to ['br', 'gzip', 'deflate']
     */
    preferredEncodings?: Array<'br' | 'gzip' | 'deflate'>;
  };
}

// Query Parameters
export interface DatastarQueryParams {
  filter?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  [key: string]: any;
}

// Request Options
export interface RequestOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * SSE Client Configuration Options
 */
export interface SSEClientOptions {
  /** URL for the SSE endpoint */
  url: string;
  /** Request headers to be sent with the SSE request */
  headers?: Record<string, string>;
  /** Interval in milliseconds to wait before considering connection dead (heartbeat timeout) */
  heartbeatInterval?: number;
  /** Retry configuration for reconnection attempts */
  retryOptions?: {
    /** Maximum number of retry attempts */
    maxRetries?: number;
    /** Initial delay between retries in milliseconds */
    initialDelay?: number;
    /** Exponential backoff factor */
    backoffFactor?: number;
    /** Maximum retry delay in milliseconds */
    maxRetryDelay?: number;
  };
  /**
   * Compression configuration for SSE connections
   */
  compression?: {
    /** Whether to request and handle compressed responses (defaults to true) */
    enabled?: boolean;
    /** 
     * Ordered list of preferred compression encodings.
     * Will be sent as Accept-Encoding header.
     * Defaults to ['br', 'gzip', 'deflate']
     */
    preferredEncodings?: Array<'br' | 'gzip' | 'deflate'>;
  };
}

// Custom Error Classes
export class DatastarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatastarError";
  }
}

export class DatastarAPIError extends DatastarError {
  statusCode: number;
  responseBody: any;

  constructor(message: string, statusCode: number, responseBody: any) {
    super(message);
    this.name = "DatastarAPIError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export class DatastarRecordNotFoundError extends DatastarAPIError {
  constructor(message: string, responseBody: any) {
    super(message, 404, responseBody);
    this.name = "DatastarRecordNotFoundError";
  }
}

export class DatastarAuthenticationError extends DatastarAPIError {
  constructor(message: string, statusCode: number, responseBody: any) {
    super(message, statusCode, responseBody);
    this.name = "DatastarAuthenticationError";
  }
}

export class DatastarConnectionError extends DatastarError {
  originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = "DatastarConnectionError";
    this.originalError = originalError;
  }
}

export class DatastarSSEError extends DatastarError {
  constructor(message: string) {
    super(message);
    this.name = "DatastarSSEError";
  }
}

// SSE Event Types
export interface SSEEvent {
  id?: string;
  eventName: string;
  data: any;
  retry?: number;
}