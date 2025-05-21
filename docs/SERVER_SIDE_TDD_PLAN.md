# Server-Side Datastar Bun SDK - Test-Driven Development Plan

## Overview

This document outlines the comprehensive step-by-step plan to transform the datastar-bun-sdk from a client-side consumer to a server-side generator of Datastar SSE events, following Test-Driven Development principles.

## Current State Analysis

**What we have (Client-Side SDK):**
- SSE client for consuming Datastar events
- HTTP client for CRUD operations
- Authentication and error handling
- TypeScript support and proper build pipeline

**What we need (Server-Side SDK):**
- SSE event generators for Datastar frontend consumption
- Signal reading and processing from HTTP requests
- Event type handlers (mergeSignals, mergeFragments, executeScript, etc.)
- Bun-optimized HTTP server capabilities

## Phase 1: Core Architecture & Foundation (TDD)

### 1.1 Define Core Interfaces (Test First)
**Tests to Write:**
```typescript
// tests/interfaces.test.ts
describe('ServerSentEventGenerator Interface', () => {
  it('should define abstract base class with required methods')
  it('should support all standard Datastar event types')
  it('should handle optional parameters (eventId, retryDuration)')
})

describe('SignalProcessor Interface', () => {
  it('should read signals from request body')
  it('should validate signal structure')
  it('should extract events array from signals')
})
```

**Implementation Tasks:**
- [ ] Create `ServerSentEventGenerator` abstract base class
- [ ] Define `SignalProcessor` interface
- [ ] Create `DatastarEvent` type definitions
- [ ] Implement event type enumeration (mergeSignals, mergeFragments, etc.)

### 1.2 SSE Event Formatting (Test First)
**Tests to Write:**
```typescript
// tests/sse-formatting.test.ts
describe('SSE Event Formatting', () => {
  it('should format mergeSignals events correctly')
  it('should format mergeFragments events correctly')
  it('should format executeScript events correctly')
  it('should format removeSignals events correctly')
  it('should format removeFragments events correctly')
  it('should include optional eventId when provided')
  it('should include optional retryDuration when provided')
  it('should handle multiline data correctly')
})
```

**Implementation Tasks:**
- [ ] Create `SSEFormatter` class
- [ ] Implement event-specific formatters
- [ ] Handle optional parameters (eventId, retry)
- [ ] Ensure proper line breaks and encoding

## Phase 2: Event Generators (TDD)

### 2.1 Signal Events (Test First)
**Tests to Write:**
```typescript
// tests/signal-events.test.ts
describe('Signal Event Generation', () => {
  it('should generate mergeSignals event with defaults')
  it('should generate mergeSignals event with all options')
  it('should generate mergeSignals with onlyIfMissing flag')
  it('should generate removeSignals event with defaults')
  it('should generate removeSignals event with paths array')
  it('should handle complex nested signal objects')
})
```

**Implementation Tasks:**
- [ ] Implement `mergeSignals()` method
- [ ] Implement `removeSignals()` method
- [ ] Handle signal validation
- [ ] Support onlyIfMissing flag for mergeSignals

### 2.2 Fragment Events (Test First)
**Tests to Write:**
```typescript
// tests/fragment-events.test.ts
describe('Fragment Event Generation', () => {
  it('should generate mergeFragments event with defaults')
  it('should generate mergeFragments event with all options')
  it('should generate mergeFragments with merge modes')
  it('should generate removeFragments event with defaults')
  it('should generate removeFragments event with selector')
  it('should handle multiline HTML fragments')
})
```

**Implementation Tasks:**
- [ ] Implement `mergeFragments()` method
- [ ] Implement `removeFragments()` method
- [ ] Handle HTML fragment validation
- [ ] Support merge modes (morph, inner, outer, etc.)

### 2.3 Script Events (Test First)
**Tests to Write:**
```typescript
// tests/script-events.test.ts
describe('Script Event Generation', () => {
  it('should generate executeScript event with defaults')
  it('should generate executeScript event with all options')
  it('should generate executeScript with attributes')
  it('should generate executeScript with autoRemove flag')
  it('should handle multiline JavaScript code')
  it('should escape special characters in scripts')
})
```

**Implementation Tasks:**
- [ ] Implement `executeScript()` method
- [ ] Handle script validation and escaping
- [ ] Support script attributes (type, blocking, etc.)
- [ ] Handle autoRemove functionality

## Phase 3: Signal Processing (TDD)

### 3.1 Request Signal Reading (Test First)
**Tests to Write:**
```typescript
// tests/signal-processor.test.ts
describe('Signal Processing', () => {
  it('should read signals from JSON request body')
  it('should read signals from form-encoded request body')
  it('should extract events array from signals')
  it('should validate signal structure')
  it('should handle malformed signal data gracefully')
  it('should support both GET and POST requests')
})
```

**Implementation Tasks:**
- [ ] Create `SignalProcessor` class
- [ ] Implement `readSignals()` function
- [ ] Handle different content types (JSON, form-encoded)
- [ ] Validate signal structure
- [ ] Extract events array safely

### 3.2 Event Processing Pipeline (Test First)
**Tests to Write:**
```typescript
// tests/event-processor.test.ts
describe('Event Processing Pipeline', () => {
  it('should process single event correctly')
  it('should process multiple events in sequence')
  it('should handle unknown event types gracefully')
  it('should validate event structure before processing')
  it('should generate proper SSE output for each event')
})
```

**Implementation Tasks:**
- [ ] Create `EventProcessor` class
- [ ] Implement event routing by type
- [ ] Handle event validation
- [ ] Generate SSE responses for event arrays

## Phase 4: Bun HTTP Server Integration (TDD)

### 4.1 Bun Server Wrapper (Test First)
**Tests to Write:**
```typescript
// tests/bun-server.test.ts
describe('Bun Server Integration', () => {
  it('should create HTTP server with proper headers')
  it('should handle SSE content-type correctly')
  it('should support CORS headers for development')
  it('should handle request routing')
  it('should integrate with SignalProcessor')
})
```

**Implementation Tasks:**
- [ ] Create `BunDatastarServer` class
- [ ] Implement HTTP server creation with Bun
- [ ] Set proper SSE headers (Content-Type, Cache-Control, etc.)
- [ ] Handle CORS for development
- [ ] Integrate signal processing pipeline

### 4.2 Test Server Implementation (Test First)
**Tests to Write:**
```typescript
// tests/test-server.test.ts
describe('Compliance Test Server', () => {
  it('should expose /test endpoint')
  it('should accept all HTTP methods on /test')
  it('should process compliance test inputs correctly')
  it('should generate expected SSE outputs')
  it('should handle edge cases in test data')
})
```

**Implementation Tasks:**
- [ ] Create compliance test server
- [ ] Implement `/test` endpoint
- [ ] Process compliance test JSON inputs
- [ ] Generate expected SSE outputs
- [ ] Ensure all compliance tests pass

## Phase 5: Advanced Features (TDD)

### 5.1 Streaming and Performance (Test First)
**Tests to Write:**
```typescript
// tests/streaming.test.ts
describe('Streaming Performance', () => {
  it('should handle large signal payloads efficiently')
  it('should support streaming responses')
  it('should handle concurrent requests')
  it('should optimize memory usage for large fragments')
})
```

**Implementation Tasks:**
- [ ] Optimize for large payloads
- [ ] Implement streaming responses
- [ ] Handle concurrent requests efficiently
- [ ] Memory optimization for large HTML fragments

### 5.2 Error Handling and Validation (Test First)
**Tests to Write:**
```typescript
// tests/error-handling.test.ts
describe('Error Handling', () => {
  it('should handle malformed JSON gracefully')
  it('should validate event structure before processing')
  it('should provide meaningful error messages')
  it('should continue processing other events if one fails')
})
```

**Implementation Tasks:**
- [ ] Comprehensive error handling
- [ ] Event structure validation
- [ ] Graceful degradation
- [ ] Error reporting and logging

## Phase 6: Sugar Functions and Convenience API (TDD)

### 6.1 Convenience Methods (Test First)
**Tests to Write:**
```typescript
// tests/sugar-api.test.ts
describe('Sugar API', () => {
  it('should provide shorthand methods for common operations')
  it('should support method chaining')
  it('should provide type-safe builders')
  it('should maintain backward compatibility')
})
```

**Implementation Tasks:**
- [ ] Create convenience methods for common patterns
- [ ] Implement method chaining
- [ ] Type-safe builder patterns
- [ ] Maintain API consistency

## Phase 7: Integration and Compliance (TDD)

### 7.1 Full Compliance Testing (Test First)
**Tests to Write:**
```typescript
// tests/full-compliance.test.ts
describe('Full Datastar Compliance', () => {
  it('should pass all official compliance tests')
  it('should handle all test cases correctly')
  it('should generate byte-perfect SSE output')
  it('should support all Datastar event types')
})
```

**Implementation Tasks:**
- [ ] Run all compliance tests
- [ ] Fix any failing test cases
- [ ] Ensure byte-perfect output matching
- [ ] Validate against official Datastar spec

### 7.2 Documentation and Examples (Test First)
**Tests to Write:**
```typescript
// tests/examples.test.ts
describe('Documentation Examples', () => {
  it('should validate all README examples work')
  it('should ensure example code compiles')
  it('should verify example outputs are correct')
})
```

**Implementation Tasks:**
- [ ] Update documentation
- [ ] Create working examples
- [ ] Validate example code
- [ ] Create migration guide from client-side

## Implementation Order

1. **Week 1**: Phase 1 (Core Architecture)
2. **Week 2**: Phase 2 (Event Generators)
3. **Week 3**: Phase 3 (Signal Processing)
4. **Week 4**: Phase 4 (Bun Server Integration)
5. **Week 5**: Phase 5 (Advanced Features)
6. **Week 6**: Phase 6 (Sugar API)
7. **Week 7**: Phase 7 (Integration & Compliance)

## Success Criteria

- [ ] All compliance tests pass (100%)
- [ ] Full TypeScript support maintained
- [ ] Bun-optimized performance
- [ ] Comprehensive test coverage (>95%)
- [ ] Complete documentation
- [ ] Migration guide for existing users
- [ ] Backward compatibility where possible

## Migration Strategy

### Backward Compatibility
- Keep existing client-side functionality as `@deprecated`
- Provide clear migration path in documentation
- Support both client and server patterns during transition period

### Breaking Changes
- Major version bump (1.0.0 → 2.0.0)
- Clear changelog documenting all changes
- Migration scripts where applicable

This plan ensures a systematic, test-driven transformation while maintaining high code quality and comprehensive testing throughout the process.