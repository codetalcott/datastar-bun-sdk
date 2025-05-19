// Type declarations for Bun test specifics
// These type declarations are specific to the test environment

// Add these declarations to make the TypeScript compiler happy in tests
declare global {
  // Fix for fetch mocking
  type RequestInfo = string | URL | Request;
  type HeadersInit = Record<string, string>;
  
  // Override fetch for test mocks
  interface Window {
    fetch: typeof fetch;
  }
  
  // Fix for Headers
  interface Headers {
    get(name: string): string | null;
  }
  
  // Fix for Bun.mock
  interface Mock<T> {
    (...args: any[]): ReturnType<T>;
    preconnect?: any;
  }
  
  namespace Bun {
    function mock<T extends (...args: any[]) => any>(implementation?: T): T & { preconnect?: any };
  }
}

// This empty export makes TypeScript treat this as a module
export {}