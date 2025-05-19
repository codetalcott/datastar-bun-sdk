import { EventEmitter } from 'events';
import { 
  SSEClientOptions, 
  SSEEvent, 
  DatastarSSEError, 
  DatastarAuthenticationError,
  DatastarConnectionError
} from './types';

export class SSEClient extends EventEmitter {
  private url: string;
  private headers: Record<string, string>;
  private heartbeatInterval: number;
  private retryOptions: {
    maxRetries: number;
    initialDelay: number;
    backoffFactor: number;
    maxRetryDelay: number;
  };

  private isExplicitlyClosed: boolean = false;
  private controller?: AbortController;
  private lastEventId: string | null = null;
  private currentServerRetry: number | null = null;
  private retryAttempts: number = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(options: SSEClientOptions) {
    super();
    this.url = options.url;
    this.headers = options.headers || {};
    this.heartbeatInterval = options.heartbeatInterval || 30000; // Default 30s
    this.retryOptions = {
      maxRetries: options.retryOptions?.maxRetries || 3,
      initialDelay: options.retryOptions?.initialDelay || 1000,
      backoffFactor: options.retryOptions?.backoffFactor || 2,
      maxRetryDelay: options.retryOptions?.maxRetryDelay || 10000
    };
  }

  /**
   * Connect to the SSE endpoint
   * @param {Object} options - Connect options
   * @param {boolean} options.isReconnect - Whether this is a reconnection attempt
   * @returns {Promise<void>}
   */
  async connect(options: { isReconnect?: boolean } = {}): Promise<void> {
    // Reset retry count if not a reconnection
    if (!options.isReconnect) {
      this.retryAttempts = 0;
    }

    // If explicitly closed, don't try to connect
    if (this.isExplicitlyClosed) {
      return;
    }

    // Create a new controller for this connection
    this.controller = new AbortController();

    try {
      // Set up request headers
      const headers: HeadersInit = {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...this.headers
      };

      // Add Last-Event-ID header if we have one
      if (this.lastEventId) {
        headers['Last-Event-ID'] = this.lastEventId;
      }

      // Fetch from the SSE endpoint
      const response = await fetch(this.url, {
        method: 'GET',
        headers,
        signal: this.controller.signal,
        // Important for SSE - we need to keep the connection open
        cache: 'no-store',
      });

      // Handle HTTP errors
      if (!response.ok) {
        let errorMessage = `SSE connection failed with status: ${response.status}`;
        
        try {
          const errorBody = await response.json();
          errorMessage += ` - ${JSON.stringify(errorBody)}`;
          
          if (response.status === 401 || response.status === 403) {
            throw new DatastarAuthenticationError(
              `Authentication error connecting to SSE: ${response.status}`,
              response.status,
              errorBody
            );
          }
          
          throw new DatastarSSEError(errorMessage);
        } catch (e) {
          // If the error is already one of our custom errors, rethrow it
          if (e instanceof DatastarAuthenticationError || e instanceof DatastarSSEError) {
            throw e;
          }
          
          // Otherwise wrap in a generic SSE error
          throw new DatastarSSEError(errorMessage);
        }
      }

      // Check content type
      const contentType = response.headers.get('Content-Type');
      if (!contentType || !contentType.includes('text/event-stream')) {
        throw new DatastarSSEError(
          `Expected text/event-stream content type, got: ${contentType}`
        );
      }

      // Successfully connected - reset retry counter
      this.retryAttempts = 0;
      
      // Emit open event
      this.emit('open');
      
      // Start heartbeat timer
      this._startHeartbeatTimer();
      
      // Process the event stream
      if (response.body) {
        await this._processEventStream(response.body);
      } else {
        throw new DatastarSSEError('No response body received from SSE endpoint');
      }
    } catch (error: any) {
      // Don't try to reconnect if connection was explicitly closed
      if (this.isExplicitlyClosed || 
         (this.controller && this.controller.signal.aborted && error.name === 'AbortError')) {
        return; 
      }
      
      // Handle different types of errors
      let errorMessage = `SSE connection error: ${error.message}`;
      
      if (error.name === 'AbortError') {
        // This could be due to heartbeat timeout
        errorMessage = 'SSE connection aborted due to timeout';
      }
      
      // Emit the error event
      this.emit('error', new DatastarSSEError(errorMessage));
      
      // Attempt to reconnect
      this._handleDisconnect(true);
    }
  }

  /**
   * Explicitly close the SSE connection
   * @returns {Promise<void>}
   */
  async close(): Promise<void> {
    this.isExplicitlyClosed = true;
    
    // Abort any ongoing connection
    if (this.controller) {
      this.controller.abort();
      this.controller = undefined;
    }
    
    // Clear timers
    this._stopHeartbeatTimer();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    // Emit close event
    this.emit('close', { intentional: true });
  }
  
  /**
   * Configure the SSE client
   * @param {Partial<SSEClientOptions>} options - Configuration options
   */
  configure(options: Partial<SSEClientOptions>): void {
    if (options.url) {
      this.url = options.url;
    }
    
    if (options.headers) {
      this.headers = { ...this.headers, ...options.headers };
    }
    
    if (options.heartbeatInterval !== undefined) {
      this.heartbeatInterval = options.heartbeatInterval;
    }
    
    if (options.retryOptions) {
      this.retryOptions = {
        ...this.retryOptions,
        ...options.retryOptions
      };
    }
  }
  
  /**
   * Start the heartbeat timer
   * @private
   */
  private _startHeartbeatTimer(): void {
    this._stopHeartbeatTimer();
    
    if (this.heartbeatInterval > 0) {
      this.heartbeatTimer = setTimeout(() => {
        this._handleHeartbeatTimeout();
      }, this.heartbeatInterval);
    }
  }
  
  /**
   * Stop the heartbeat timer
   * @private
   */
  private _stopHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }
  
  /**
   * Handle heartbeat timeout
   * @private
   */
  private _handleHeartbeatTimeout(): void {
    this.emit('warning', new DatastarSSEError('SSE Heartbeat Timeout'));
    
    // Abort the current connection which will trigger reconnect
    if (this.controller) {
      this.controller.abort('heartbeat_timeout');
    }
  }
  
  /**
   * Handle disconnection
   * @param {boolean} isError - Whether the disconnection was due to an error
   * @private
   */
  private _handleDisconnect(isError: boolean): void {
    // Don't reconnect if explicitly closed
    if (this.isExplicitlyClosed) {
      return;
    }
    
    // Schedule a reconnection
    this._scheduleReconnect();
  }
  
  /**
   * Schedule a reconnection attempt
   * @private
   */
  private _scheduleReconnect(): void {
    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    // Check if we've reached max retries
    if (this.retryAttempts >= this.retryOptions.maxRetries) {
      this.emit('close', { 
        intentional: false, 
        reason: 'max_retries_reached' 
      });
      return;
    }
    
    // Calculate delay - use server-sent retry if available, otherwise use exponential backoff
    let delay: number;
    
    if (this.currentServerRetry !== null) {
      delay = this.currentServerRetry;
      // Clear server retry so we use backoff for subsequent attempts
      this.currentServerRetry = null;
    } else {
      // Calculate exponential backoff with jitter
      const baseDelay = this.retryOptions.initialDelay * 
        Math.pow(this.retryOptions.backoffFactor, this.retryAttempts);
      const maxDelay = Math.min(this.retryOptions.maxRetryDelay, baseDelay);
      // Add some jitter (±10%)
      delay = maxDelay * (0.9 + Math.random() * 0.2);
    }
    
    // Increment retry counter
    this.retryAttempts++;
    
    // Emit reconnecting event
    this.emit('reconnecting', { 
      attempt: this.retryAttempts, 
      delay 
    });
    
    // Schedule reconnect
    this.reconnectTimer = setTimeout(() => {
      this.connect({ isReconnect: true });
    }, delay);
  }
  
  /**
   * Process SSE event stream
   * @param {ReadableStream} stream - The SSE stream to process
   * @private
   */
  private async _processEventStream(stream: ReadableStream): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Stream has ended
          this._handleDisconnect(false);
          break;
        }
        
        // Decode the chunk and append to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process events in the buffer
        buffer = this._extractAndProcessEventsFromBuffer(buffer);
      }
    } catch (error) {
      reader.releaseLock();
      throw error;
    }
  }
  
  /**
   * Extract and process events from the buffer
   * @param {string} buffer - The current buffer
   * @returns {string} - The remaining buffer after processing
   * @private
   */
  private _extractAndProcessEventsFromBuffer(buffer: string): string {
    let position = 0;
    
    // Find complete events (terminated by double newline)
    while (true) {
      const eventEnd = buffer.indexOf('\n\n', position);
      if (eventEnd === -1) break;
      
      const eventBlock = buffer.substring(position, eventEnd);
      position = eventEnd + 2;
      
      const parsedEvent = this._parseEvent(eventBlock);
      if (parsedEvent) {
        this._dispatchEvent(parsedEvent);
      }
    }
    
    // Return the unprocessed part of the buffer
    return buffer.substring(position);
  }
  
  /**
   * Parse an SSE event
   * @param {string} eventBlock - The event block to parse
   * @returns {SSEEvent | null} - The parsed event, or null if invalid
   * @private
   */
  private _parseEvent(eventBlock: string): SSEEvent | null {
    // Initialize empty event
    const event: SSEEvent = {
      eventName: 'message',
      data: ''
    };
    
    // Split the event block into lines
    const lines = eventBlock.split('\n');
    
    for (const line of lines) {
      // Skip empty lines
      if (!line) continue;
      
      // Handle comments
      if (line.startsWith(':')) {
        // Reset heartbeat timer on comments too (server keepalives)
        this._resetHeartbeatTimer();
        continue;
      }
      
      // Split field from value
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const field = line.substring(0, colonIndex);
      // The space after the colon is optional and should be ignored
      const valueOffset = colonIndex + 1 + (line[colonIndex + 1] === ' ' ? 1 : 0);
      const value = line.substring(valueOffset);
      
      switch (field) {
        case 'id':
          event.id = value;
          this.lastEventId = value;
          break;
        case 'event':
          event.eventName = value;
          break;
        case 'data':
          // For multiline data, append with newlines
          event.data = event.data 
            ? event.data + '\n' + value 
            : value;
          break;
        case 'retry':
          const retryValue = parseInt(value, 10);
          if (!isNaN(retryValue)) {
            event.retry = retryValue;
            this.currentServerRetry = retryValue;
          }
          break;
      }
    }
    
    // If we have data, try to parse it as JSON
    if (event.data) {
      try {
        event.data = JSON.parse(event.data);
      } catch (e) {
        // Keep as string if not valid JSON
      }
      
      return event;
    }
    
    // Return null for events without data (except keep-alive comments)
    return null;
  }
  
  /**
   * Dispatch an SSE event
   * @param {SSEEvent} event - The event to dispatch
   * @private
   */
  private _dispatchEvent(event: SSEEvent): void {
    // Reset heartbeat timer
    this._resetHeartbeatTimer();
    
    // Use microtask to ensure events are dispatched in order
    queueMicrotask(() => {
      // Emit the event
      this.emit(event.eventName, {
        id: event.id,
        data: event.data
      });
      
      // Also emit a generic 'message' event if this is a specific event type
      if (event.eventName !== 'message') {
        this.emit('message', {
          type: event.eventName,
          id: event.id,
          data: event.data
        });
      }
    });
  }
  
  /**
   * Reset the heartbeat timer
   * @private
   */
  private _resetHeartbeatTimer(): void {
    if (this.heartbeatInterval > 0) {
      this._startHeartbeatTimer();
    }
  }
}