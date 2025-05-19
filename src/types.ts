// Types for DatastarBunSDK

// SDK Options
export interface DatastarSDKOptions {
  apiBaseUrl?: string;
  sseUrl?: string;
  authToken: string | (() => string | Promise<string>);
  requestTimeout?: number;
  retryOptions?: {
    maxRetries?: number;
    initialDelay?: number;
    backoffFactor?: number;
    maxRetryDelay?: number;
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

// SSE Client Options
export interface SSEClientOptions {
  url: string;
  headers?: Record<string, string>;
  heartbeatInterval?: number;
  retryOptions?: {
    maxRetries?: number;
    initialDelay?: number;
    backoffFactor?: number;
    maxRetryDelay?: number;
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