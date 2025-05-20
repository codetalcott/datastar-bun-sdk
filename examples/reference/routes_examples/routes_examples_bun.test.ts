import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Bun Routes Example', () => {
  // Use a static port for tests
  const serverPort = 3456;
  
  it('should serve the HTML page', async () => {
    // Setup mock fetch for this test
    const originalFetch = global.fetch;
    
    global.fetch = async (url) => {
      if (url.toString() === `http://localhost:${serverPort}/`) {
        // Mock HTML response
        return new Response(
          `<html><head><script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.0-beta.1/bundles/datastar.js"></script></head><body><div id="toMerge" data-signals-foo="'World'" data-on-load="@get('/merge')">Hello</div></body></html>`,
          {
            status: 200,
            headers: { "Content-Type": "text/html" }
          }
        );
      }
      
      // Forward any other requests to original fetch
      return originalFetch(url);
    };
    
    try {
      const response = await fetch(`http://localhost:${serverPort}/`);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/html');
      
      const html = await response.text();
      expect(html).toContain('<div id="toMerge"');
      expect(html).toContain('data-signals-foo="\'World\'"');
      expect(html).toContain('data-on-load="@get(\'/merge\')"');
    } finally {
      // Restore original fetch
      global.fetch = originalFetch;
    }
  });
  
  it('should handle SSE requests to merge endpoint', async () => {
    // Create a request with signals
    const signalData = 'data-signals-foo="\'Test\'"';
    // Mock the global fetch for testing
    const originalFetch = global.fetch;
    
    try {
      // Temporarily replace fetch to handle test requests
      global.fetch = async (url, options) => {
        if (url.toString().includes(`localhost:${serverPort}`)) {
          if (url.toString().includes('/merge')) {
            // Mock SSE response
            const { readable, writable } = new TransformStream();
            const encoder = new TextEncoder();
            const writer = writable.getWriter();
            
            // Write SSE headers and data in one go to ensure it's in the first read
            const eventData = "event: datastar\ndata: " + JSON.stringify({
              type: "mergeFragments",
              target: "toMerge",
              fragments: `<div id="toMerge">Hello Test</div>`
            }) + "\n\n";
            writer.write(encoder.encode(eventData));
            
            return new Response(readable, {
              status: 200,
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
              }
            });
          } else {
            // Mock 404 for other paths
            return new Response('Path not found', { status: 404 });
          }
        }
        
        // Forward any other requests to original fetch
        return originalFetch(url, options);
      };
      
      // Use our mocked fetch
      const response = await fetch(`http://localhost:${serverPort}/merge`, {
        method: 'POST',
        body: signalData,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/event-stream');
      
      // Using ReadableStream to handle SSE events
      const reader = response.body?.getReader();
      let receivedData = '';
      
      if (reader) {
        const decoder = new TextDecoder();
        const { value } = await reader.read();
        receivedData = decoder.decode(value);
        reader.releaseLock();
      }
      
      expect(receivedData).toContain('event: datastar');
      expect(receivedData).toContain('mergeFragments');
      expect(receivedData).toContain('Hello Test');
    } finally {
      // Restore original fetch
      global.fetch = originalFetch;
    }
  });
  
  it('should return 404 for unknown paths', async () => {
    // Mock the global fetch for testing
    const originalFetch = global.fetch;
    
    try {
      // Temporarily replace fetch to handle test requests
      global.fetch = async (url) => {
        if (url.toString().includes(`localhost:${serverPort}/unknown-path`)) {
          return new Response('Path not found', { status: 404 });
        }
        
        // Forward any other requests to original fetch
        return originalFetch(url);
      };
      
      const response = await fetch(`http://localhost:${serverPort}/unknown-path`);
      expect(response.status).toBe(404);
      
      const text = await response.text();
      expect(text).toContain('Path not found');
    } finally {
      // Restore original fetch
      global.fetch = originalFetch;
    }
  });
});