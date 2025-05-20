import { DatastarBunSDK } from '../../../src/index';

/**
 * This file demonstrates how to create a Bun server that integrates with DataStar
 * for server-sent events and DOM manipulation.
 */

// Create a new Bun server
const server = Bun.serve({
  port: 0, // Let Bun choose an available port
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      // Serve the HTML page with DataStar script
      return new Response(
        `<html>
          <head>
            <script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.0-beta.1/bundles/datastar.js"></script>
          </head>
          <body>
            <div id="toMerge" data-signals-foo="'World'" data-on-load="@get('/merge')">Hello</div>
          </body>
        </html>`,
        {
          headers: { "Content-Type": "text/html" },
        }
      );
    } else if (url.pathname.includes("/merge")) {
      // Initialize the Datastar SDK
      const sdk = new DatastarBunSDK({
        apiBaseUrl: `http://localhost:${server.port}`,
        sseUrl: `http://localhost:${server.port}/sse`,
        authToken: 'demo-token'
      });

      // Read signals from the request
      let signals: Record<string, any> = {};
      
      try {
        // Parse the request body, if any
        let signalValue = 'World'; // Default value
        
        // If this is a POST request, try to read the body
        if (req.method === 'POST') {
          const requestText = await req.text();
          console.log('Received POST body:', requestText);
          
          // Simple regex to extract signals from the request
          const signalMatch = requestText.match(/data-signals-foo="'([^']+)'"/);
          if (signalMatch && signalMatch[1]) {
            signalValue = signalMatch[1];
          }
        }
        
        // Set the signal value
        signals.foo = signalValue;
        console.log('Using signal value:', signals.foo);
      } catch (error) {
        console.error("Error while parsing signals", error);
        return new Response(`Error while parsing signals`, {
          headers: { "Content-Type": "text/plain" },
        });
      }

      if (!("foo" in signals)) {
        console.error("The foo signal is not present");
        return new Response("The foo signal is not present", {
          headers: { "Content-Type": "text/plain" },
        });
      }

      // Create a stream for Server-Sent Events
      const { readable, writable } = new TransformStream();
      const encoder = new TextEncoder();
      const writer = writable.getWriter();

      // Write SSE headers
      writer.write(encoder.encode("event: datastar\n"));
      writer.write(encoder.encode(`data: ${JSON.stringify({
        type: "mergeFragments",
        target: "toMerge",
        fragments: `<div id="toMerge">Hello ${signals.foo}</div>`
      })}\n\n`));
      
      // Return the SSE response
      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
      });
    }

    // Handle 404 for other paths
    return new Response(`Path not found: ${req.url}`, {
      headers: { "Content-Type": "text/plain" },
      status: 404
    });
  }
});

console.log(`Server running at http://localhost:${server.port}/`);