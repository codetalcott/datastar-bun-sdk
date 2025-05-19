# DataStar Documentation Index

This directory contains documentation for the DataStar library, organized to help AI agents quickly discover relevant information.

## Content Guide

- **[getting_started.md](./getting_started.md)** - Comprehensive introduction to DataStar with examples of core functionality:
  - Installation options (CDN, self-hosted bundle, npm)
  - Data binding with `data-bind` attributes
  - Frontend reactivity with `data-text`, `data-computed`, `data-show`, `data-class`, `data-attr`
  - Signal management with `data-signals`, `data-on`
  - Server-Sent Events (SSE) integration with backend
  - Loading indicators with `data-indicator`
  - Action helpers (`@setAll()`, `@toggleAll()`)

- **[datastar_expressions.md](./datastar_expressions.md)** - Details on expression syntax and capabilities within DataStar attributes

- **[going_deeper.md](./going_deeper.md)** - Advanced usage patterns and deeper technical details

- **[stop_overcomplicating_it.md](./stop_overcomplicating_it.md)** - Philosophy and guidance on simple, efficient usage patterns

## Key Concepts

### Core Features

1. **Reactivity** - Real-time UI updates based on state changes
2. **Two-way binding** - Automatic synchronization between UI elements and data
3. **Server-Sent Events** - Stream updates from server to client
4. **Declarative syntax** - HTML attributes control behavior

### Main Components

1. **DataStar Data Attributes** - `data-bind`, `data-text`, `data-computed`, etc.
2. **Signals** - Reactive variables that track and propagate changes
3. **Actions** - Helper functions like `@get()`, `@post()`, `@setAll()`
4. **Backend Integration** - SSE stream architecture for server responses

## SDK Information

This documentation supports the DataStar Bun SDK, which implements TypeScript bindings for interacting with DataStar services using Bun's optimized runtime.