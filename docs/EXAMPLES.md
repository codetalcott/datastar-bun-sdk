# DataStar Bun SDK Examples Guide

This document serves as the master reference for implementing and using the DataStar examples with the Bun SDK. It provides links to all relevant documentation and outlines the test-driven approach for creating examples.

## Overview Documents

| Document | Description |
|----------|-------------|
| [Test-Driven Development Plan](./routes-examples-tdd-plan.md) | Comprehensive plan for using TDD to implement examples |
| [Examples Structure](./routes-examples-structure.md) | Directory structure and organization for examples |
| [Implementation Roadmap](./routes-examples-roadmap.md) | Phased approach to implementing examples by complexity |

## Example Categories

The examples are organized into the following categories:

### 1. UI Interaction Examples

Examples demonstrating user interface interactivity using DataStar:

- **Toggle Visibility**: Simple state toggling with SSE updates
- **Click to Edit**: Inline content editing with real-time updates
- **Click to Load**: Loading content on demand
- **Infinite Scroll**: Continuous content loading as the user scrolls
- **Lazy Tabs**: Load tab content only when a tab is activated
- **Active Search**: Real-time filtering as the user types
- **Lazy Load**: Deferred content loading strategies

### 2. Form Handling Examples

Examples focusing on form submission, validation, and processing:

- **Simple Form**: Basic form submission and response
- **Form Data**: Form data extraction and handling
- **Custom Validity**: Form validation with custom rules
- **Inline Validation**: Real-time form field validation
- **File Upload**: Client-to-server file transfer with progress tracking
- **Value Select**: Enhanced selection inputs with dynamic options

### 3. Data Management Examples

Examples showcasing data operations and state management:

- **Todos**: Complete task management application
- **Model Bindings**: Two-way data binding between UI and state
- **Signals Changed**: React to signal changes
- **Signals IfMissing**: Default signal values
- **Bulk Update**: Multiple item updates in a single operation
- **Merge Options**: Combining data from different sources

### 4. Visual Effects and Animation Examples

Examples demonstrating visual enhancements:

- **Animations**: UI motion and transitions
- **Progress Bar**: Operation progress visualization
- **View Transition API**: Page transition effects

### 5. Advanced Examples

Examples featuring advanced patterns and techniques:

- **Offline Sync**: Working without connectivity and synchronizing later
- **CSRF Protection**: Security implementation for forms
- **Execute Script**: Client-side script execution
- **Dispatch Custom Event**: Custom event triggering and handling
- **Polling**: Periodic data refresh strategies
- **Replace URL**: URL manipulation without full page reload
- **Redirects**: Page redirection techniques

## Getting Started with Examples

### Prerequisites

- Bun 1.0.0 or later
- DataStar Bun SDK
- Node.js 16+ (for some tooling)

### Setting Up

1. Clone the repository:
   ```bash
   git clone https://github.com/codetalcott/datastar-bun-sdk.git
   cd datastar-bun-sdk
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Run a specific example:
   ```bash
   # Start the example server
   bun run examples/data-management/todos/server.ts
   
   # In another terminal, run the example
   bun run examples/data-management/todos/index.ts
   ```

### Running Tests

The examples include comprehensive tests:

```bash
# Run all example tests
bun test examples/*/*/test.ts

# Run tests for a specific category
bun test examples/ui-interaction/*/test.ts

# Run tests for a specific example
bun test examples/data-management/todos/test.ts
```

## Implementation Status

| Category | Example | Status | Complexity |
|----------|---------|--------|------------|
| **UI Interaction** | Toggle Visibility | 🔄 Planned | Simple |
| **UI Interaction** | Click to Edit | 🔄 Planned | Moderate |
| **UI Interaction** | Click to Load | 🔄 Planned | Simple |
| **UI Interaction** | Infinite Scroll | 🔄 Planned | Complex |
| **UI Interaction** | Lazy Tabs | 🔄 Planned | Moderate |
| **UI Interaction** | Active Search | 🔄 Planned | Moderate |
| **UI Interaction** | Lazy Load | 🔄 Planned | Moderate |
| **Form Handling** | Simple Form | 🔄 Planned | Simple |
| **Form Handling** | Form Data | 🔄 Planned | Simple |
| **Form Handling** | Custom Validity | 🔄 Planned | Moderate |
| **Form Handling** | Inline Validation | 🔄 Planned | Moderate |
| **Form Handling** | File Upload | 🔄 Planned | Complex |
| **Form Handling** | Value Select | 🔄 Planned | Moderate |
| **Data Management** | Todos | 🔄 Planned | Complex |
| **Data Management** | Model Bindings | 🔄 Planned | Moderate |
| **Data Management** | Signals Changed | 🔄 Planned | Simple |
| **Data Management** | Signals IfMissing | 🔄 Planned | Simple |
| **Data Management** | Bulk Update | 🔄 Planned | Moderate |
| **Data Management** | Merge Options | 🔄 Planned | Simple |
| **Visual Effects** | Animations | 🔄 Planned | Complex |
| **Visual Effects** | Progress Bar | 🔄 Planned | Moderate |
| **Visual Effects** | View Transition API | 🔄 Planned | Complex |
| **Advanced** | Offline Sync | 🔄 Planned | Advanced |
| **Advanced** | CSRF Protection | 🔄 Planned | Advanced |
| **Advanced** | Execute Script | 🔄 Planned | Advanced |
| **Advanced** | Dispatch Custom Event | 🔄 Planned | Advanced |
| **Advanced** | Polling | 🔄 Planned | Simple |
| **Advanced** | Replace URL | 🔄 Planned | Simple |
| **Advanced** | Redirects | 🔄 Planned | Simple |

**Status Legend:**
- 🔄 Planned: Implementation scheduled
- 🟡 In Progress: Currently being implemented
- ✅ Completed: Implementation finished and tested
- 📝 Documented: Implementation and documentation complete

## Contributing Examples

### Guidelines for Contributing

1. Follow the directory structure outlined in [Examples Structure](./routes-examples-structure.md)
2. Use the test-driven development approach from [TDD Plan](./routes-examples-tdd-plan.md)
3. Implement examples in order of priority as shown in the [Roadmap](./routes-examples-roadmap.md)

### Pull Request Process

1. Fork the repository
2. Create a new branch for your example
3. Implement the example following the TDD approach
4. Ensure all tests pass
5. Update documentation
6. Submit a pull request

## Additional Resources

- [DataStar Documentation](https://docs.datastar.org)
- [Bun Documentation](https://bun.sh/docs)
- [Example Server API Reference](./server-api-reference.md)

---

For questions or support, please open an issue in the [GitHub repository](https://github.com/codetalcott/datastar-bun-sdk/issues).

This examples guide will be updated as implementations progress.