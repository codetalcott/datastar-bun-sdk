# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a Bun-optimized TypeScript SDK for the DataStar library. DataStar is a reactive framework that allows for UI management through HTML attributes and server-sent events (SSE). This SDK aims to provide a TypeScript interface for interacting with DataStar services, with a focus on Bun's native features and performance benefits.

## Commands

### Development Setup

```bash
# Install dependencies
bun install

# Run the development server
bun run dev

# Type checking
bun run typecheck
```

### Testing

```bash
# Run all tests
bun test

# Run a specific test file
bun test path/to/test.ts
```

### Building

```bash
# Build the SDK
bun run build
```

## Architecture

The SDK follows a TDD approach as outlined in `sdk-tdd-plan.md`. The core architecture consists of:

1. **Core SDK Class** (`DatastarBunSDK`) - Main entry point that handles initialization, configuration, authentication, and provides methods for CRUD operations.

2. **SSE Client** - Manages Server-Sent Events connections, parses messages, and handles reconnection logic.

3. **Error Handling** - A hierarchy of custom error types for different error conditions.

Key Components:
- `src/index.ts` - Main SDK entry point
- `src/sse-client.ts` - Server-Sent Events handling
- `src/types.ts` - TypeScript interfaces and types

## Development Phases

Development follows the TDD plan with these key phases:
1. Project setup & test infrastructure
2. Core SDK initialization & configuration
3. Authentication & API calls
4. Error handling
5. CRUD operations
6. SSE client setup
7. SSE message parsing & dispatch
8. SSE reconnection logic
9. SSE client-side heartbeat
10. Bun optimizations & finalization
11. Documentation

## Type Definitions

The SDK makes use of several key types:
- `DatastarSDKOptions` - Configuration options for the SDK
- `DatastarQueryParams` - Parameters for querying records
- Custom error types for handling different error conditions