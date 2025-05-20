import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Bun Routes Example', () => {
  let serverProcess: ChildProcess;
  let serverPort: number | null = null;
  
  // Start the server before tests
  beforeAll(() => {
    return new Promise<void>((resolve) => {
      // Path to the Bun example file
      const examplePath = path.resolve(__dirname, 'routes_examples_bun.ts');
      
      // Check file exists
      if (!fs.existsSync(examplePath)) {
        throw new Error(`Example file not found at ${examplePath}`);
      }
      
      console.log('Starting server process...');
      
      // Spawn the Bun process to run the example
      serverProcess = spawn('bun', [examplePath], {
        env: { ...process.env }
      });
      
      // Buffer to collect output
      let output = '';
      
      // Collect server output
      serverProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        console.log(chunk);
        
        // Extract the port from server output
        const portMatch = chunk.match(/Server running at http:\/\/localhost:(\d+)/);
        if (portMatch && portMatch[1]) {
          serverPort = parseInt(portMatch[1], 10);
          console.log(`Detected server running on port ${serverPort}`);
          
          // Allow a moment for the server to fully initialize
          setTimeout(() => resolve(), 500);
        }
      });
      
      // Handle server errors
      serverProcess.stderr?.on('data', (data) => {
        console.error(`Server error: ${data.toString()}`);
      });
      
      // Set a timeout in case the server doesn't start properly
      setTimeout(() => {
        if (!serverPort) {
          console.error('Server failed to start within timeout period');
          throw new Error('Server startup timeout');
        }
      }, 5000);
    });
  });
  
  // Stop the server after tests
  afterAll(() => {
    if (serverProcess && !serverProcess.killed) {
      console.log('Stopping server process...');
      serverProcess.kill();
    }
  });
  
  it('should serve the HTML page', async () => {
    if (!serverPort) throw new Error('Server port not detected');
    
    const response = await fetch(`http://localhost:${serverPort}/`);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/html');
    
    const html = await response.text();
    expect(html).toContain('<div id="toMerge"');
    expect(html).toContain('data-signals-foo="\'World\'"');
    expect(html).toContain('data-on-load="@get(\'/merge\')"');
  });
  
  it('should handle SSE requests to merge endpoint', async () => {
    if (!serverPort) throw new Error('Server port not detected');
    
    // Create a request with signals
    const signalData = 'data-signals-foo="\'Test\'"';
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
  });
  
  it('should return 404 for unknown paths', async () => {
    if (!serverPort) throw new Error('Server port not detected');
    
    const response = await fetch(`http://localhost:${serverPort}/unknown-path`);
    expect(response.status).toBe(404);
    
    const text = await response.text();
    expect(text).toContain('Path not found');
  });
});