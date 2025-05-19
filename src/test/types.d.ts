// Type declarations for Bun test mocks

// Add these declarations to make the TypeScript compiler happy
// These are just for the test environment and don't affect the runtime
declare global {
  interface Headers {
    get(name: string): string | null;
  }

  // Mock interfaces for Bun tests
  // These are intentionally simplified to make the tests work
  type RequestInfo = any;
  type HeadersInit = any;
  
  namespace Bun {
    namespace Test {
      function mock<T extends (...args: any[]) => any>(implementation?: T): T;
    }
  }
}