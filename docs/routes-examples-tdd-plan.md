# Test-Driven Development Plan for DataStar Examples with Bun SDK

This document outlines a comprehensive test-driven approach to implementing DataStar example functionality using the Bun SDK. Each example will be developed following a TDD methodology, ensuring functionality is properly tested before implementation.

## Test Framework and Approach

All examples will use Bun's built-in test runner, which provides Jest-compatible syntax and performance optimizations. Our approach includes:

1. **Unit tests**: Testing SDK components in isolation
2. **Integration tests**: Testing interactions between SDK and mock server
3. **End-to-end tests**: Testing complete functionality with a real server instance

The testing patterns established in `datastar-sdk.test.ts`, `datastar-sdk-sse.test.ts`, and `sse-client.test.ts` will be extended for the examples.

## TDD Template Structure

Each example will follow this test-driven development template:

```typescript
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { DatastarBunSDK } from '../src/index';
import { ServerComponent } from './server-component';

describe('[Example Name]', () => {
  // Standard setup with common configurations
  const SERVER_URL = 'http://localhost:[PORT]';
  let sdk: DatastarBunSDK;
  let server: ServerComponent;
  
  beforeEach(async () => {
    // Setup ServerComponent for this test set
    server = new ServerComponent();
    await server.start();
    
    // Configure SDK instance
    sdk = new DatastarBunSDK({
      apiBaseUrl: `${SERVER_URL}/api`,
      sseUrl: `${SERVER_URL}/sse`,
      authToken: 'test-token'
    });
  });
  
  afterEach(async () => {
    // Clean up resources
    await sdk.disconnectSSE();
    await server.stop();
  });
  
  // Requirement-based test cases
  
  it('should [specific requirement 1]', async () => {
    // Arrange
    // Configure server to respond appropriately
    server.configureForTestCase({
      // Test-specific configuration
    });
    
    // Act
    // Perform the operation being tested
    const result = await sdk.someOperation();
    
    // Assert
    // Verify expected outcomes
    expect(result).toBeDefined();
    // Add more specific assertions
  });
  
  it('should [specific requirement 2]', async () => {
    // More test cases...
  });
  
  // Error cases
  
  it('should handle errors when [specific scenario]', async () => {
    // Configure error case
    server.configureForErrorCase({
      // Error configuration
    });
    
    // Act and Assert for error handling
    try {
      await sdk.someOperation();
      expect.unreachable("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(ExpectedErrorType);
      // More assertions about error details
    }
  });
});
```

## Example Implementation Structure

For each example, we will implement:

1. **Server Component**: A minimal Bun server that handles the necessary endpoints
2. **Client Component**: SDK code that interacts with the server
3. **Test Suite**: Tests that verify both components work together correctly

## Example-Specific Test Plans

Below are detailed test plans for each category of examples, based on their complexity and functionality:

### 1. UI Interaction Examples

#### 1.1 Simple Examples (Toggle Visibility, Click to Load)

**Test Cases:**
- Verify toggle state changes after SDK operation
- Test state persistence across connections
- Validate content loading behavior

**Server Requirements:**
- Endpoint to toggle state
- SSE connection for updates

**Example Implementation:**
```typescript
// Toggle visibility example
it('should toggle element visibility via SSE', async () => {
  const visibilityState = { isVisible: false };
  
  // Configure server response
  server.configureHandler('/api/toggle', async (req) => {
    visibilityState.isVisible = !visibilityState.isVisible;
    return { status: 200, body: JSON.stringify({ success: true }) };
  });
  
  server.configureSseEvent('/sse', {
    type: 'visibility_change',
    data: { isVisible: visibilityState.isVisible }
  });
  
  // Connect to SSE
  await sdk.connectSSE();
  
  // Listen for events
  let receivedEvent = false;
  sdk.on('visibility_change', (data) => {
    receivedEvent = true;
    expect(data.isVisible).toBe(true); // Should now be visible
  });
  
  // Trigger the toggle
  await sdk.post('/toggle');
  
  // Wait for event processing
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Verify event was received
  expect(receivedEvent).toBe(true);
});
```

#### 1.2 Moderate Examples (Click to Edit, Active Search)

**Test Cases:**
- Test edit mode activation
- Verify search filtering behavior
- Validate response formatting for UI updates

**Example for Click to Edit:**
```typescript
it('should activate edit mode and save changes', async () => {
  const initialText = "Initial text";
  const editedText = "Edited text";
  
  // Setup test state
  const contentState = { text: initialText, editing: false };
  
  // Configure server handler for edit mode
  server.configureHandler('/api/content/edit', async (req) => {
    contentState.editing = true;
    return { 
      status: 200, 
      body: JSON.stringify({ 
        success: true, 
        editing: true,
        content: contentState.text 
      }) 
    };
  });
  
  // Configure handler for saving
  server.configureHandler('/api/content/save', async (req) => {
    const body = await req.json();
    contentState.text = body.text;
    contentState.editing = false;
    return { 
      status: 200, 
      body: JSON.stringify({ 
        success: true, 
        content: contentState.text 
      }) 
    };
  });
  
  // 1. Enter edit mode
  const editResponse = await sdk.get('/content/edit');
  expect(editResponse.editing).toBe(true);
  expect(editResponse.content).toBe(initialText);
  
  // 2. Save edited content
  const saveResponse = await sdk.post('/content/save', { text: editedText });
  expect(saveResponse.success).toBe(true);
  expect(saveResponse.content).toBe(editedText);
  
  // 3. Verify server state updated
  expect(contentState.text).toBe(editedText);
  expect(contentState.editing).toBe(false);
});
```

#### 1.3 Complex Examples (Infinite Scroll, Lazy Tabs)

**Test Cases:**
- Test pagination behavior
- Verify content loading on demand
- Test scroll position handling

**Example for Infinite Scroll:**
```typescript
it('should load more content when scrolling', async () => {
  // Setup test data for pagination
  const items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Item ${i}` }));
  const PAGE_SIZE = 10;
  
  // Configure server handler
  server.configureHandler('/api/items', async (req) => {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const offset = page * PAGE_SIZE;
    
    const pageItems = items.slice(offset, offset + PAGE_SIZE);
    const hasMore = offset + PAGE_SIZE < items.length;
    
    return { 
      status: 200, 
      body: JSON.stringify({ 
        items: pageItems,
        hasMore,
        page
      }) 
    };
  });
  
  // Initial load (page 0)
  const initialPage = await sdk.get('/items?page=0');
  expect(initialPage.items.length).toBe(PAGE_SIZE);
  expect(initialPage.hasMore).toBe(true);
  expect(initialPage.page).toBe(0);
  
  // Simulate scrolling and loading next page
  const nextPage = await sdk.get('/items?page=1');
  expect(nextPage.items.length).toBe(PAGE_SIZE);
  expect(nextPage.items[0].id).toBe(PAGE_SIZE); // Should start after first page
  
  // Test loading last page
  const lastPageIndex = Math.floor(items.length / PAGE_SIZE) - 1;
  const lastPage = await sdk.get(`/items?page=${lastPageIndex}`);
  expect(lastPage.hasMore).toBe(true); // Should have one more page
  
  // Test going beyond available data
  const beyondLastPage = await sdk.get(`/items?page=${lastPageIndex + 1}`);
  expect(beyondLastPage.items.length).toBeLessThan(PAGE_SIZE);
  expect(beyondLastPage.hasMore).toBe(false);
});
```

### 2. Form Handling Examples

#### 2.1 Simple Forms

**Test Cases:**
- Validate form submission
- Test form data extraction
- Verify response handling

**Example:**
```typescript
it('should process form submission correctly', async () => {
  // Configure server handler
  server.configureHandler('/api/submit-form', async (req) => {
    const formData = await req.formData();
    const name = formData.get('name');
    const email = formData.get('email');
    
    // Validate form data
    if (!name || !email) {
      return { status: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }
    
    return { 
      status: 200, 
      body: JSON.stringify({ 
        success: true, 
        user: { name, email } 
      }) 
    };
  });
  
  // Create form data
  const formData = new FormData();
  formData.append('name', 'Test User');
  formData.append('email', 'test@example.com');
  
  // Submit form
  const response = await sdk.submitForm('/submit-form', formData);
  
  // Verify response
  expect(response.success).toBe(true);
  expect(response.user.name).toBe('Test User');
  expect(response.user.email).toBe('test@example.com');
});
```

#### 2.2 Form Validation

**Test Cases:**
- Test client-side validation
- Verify server-side validation responses
- Test field-specific error messages

**Example:**
```typescript
it('should validate form fields and return specific errors', async () => {
  // Configure server validation handler
  server.configureHandler('/api/validate', async (req) => {
    const formData = await req.formData();
    const email = formData.get('email') as string;
    
    const errors: Record<string, string> = {};
    
    if (!email) {
      errors.email = 'Email is required';
    } else if (!email.includes('@')) {
      errors.email = 'Invalid email format';
    }
    
    if (Object.keys(errors).length > 0) {
      return { 
        status: 400, 
        body: JSON.stringify({ 
          valid: false, 
          errors 
        }) 
      };
    }
    
    return { 
      status: 200, 
      body: JSON.stringify({ valid: true }) 
    };
  });
  
  // Test with invalid email
  const invalidFormData = new FormData();
  invalidFormData.append('email', 'invalid-email');
  
  const invalidResponse = await sdk.validateForm('/validate', invalidFormData);
  expect(invalidResponse.valid).toBe(false);
  expect(invalidResponse.errors.email).toBe('Invalid email format');
  
  // Test with valid email
  const validFormData = new FormData();
  validFormData.append('email', 'valid@example.com');
  
  const validResponse = await sdk.validateForm('/validate', validFormData);
  expect(validResponse.valid).toBe(true);
});
```

#### 2.3 Complex Forms (File Upload)

**Test Cases:**
- Test file upload progress
- Verify multipart form data handling
- Test validation of file types and sizes

**Example:**
```typescript
it('should upload files with progress tracking', async () => {
  // Configure server handler for file upload
  server.configureHandler('/api/upload', async (req) => {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return { status: 400, body: JSON.stringify({ error: 'No file uploaded' }) };
    }
    
    // Process file (in a real implementation, would save to disk/storage)
    const fileContent = await file.text();
    
    return { 
      status: 200, 
      body: JSON.stringify({ 
        success: true, 
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }) 
    };
  });
  
  // Create test file
  const fileContent = 'Test file content';
  const file = new File([fileContent], 'test.txt', { type: 'text/plain' });
  
  // Track progress
  const progressEvents: number[] = [];
  
  // Upload file
  const response = await sdk.uploadFile('/upload', file, {
    onProgress: (progress) => {
      progressEvents.push(progress);
    }
  });
  
  // Verify response
  expect(response.success).toBe(true);
  expect(response.fileName).toBe('test.txt');
  expect(response.fileSize).toBe(fileContent.length);
  
  // Verify progress was tracked
  expect(progressEvents.length).toBeGreaterThan(0);
  expect(progressEvents[progressEvents.length - 1]).toBe(100); // Should end at 100%
});
```

### 3. Data Management Examples

#### 3.1 Todos Example (Complex)

**Test Cases:**
- Test CRUD operations for todos
- Verify filtering (All, Active, Completed)
- Test editing functionality
- Verify bulk operations

**Example:**
```typescript
describe('Todos Example', () => {
  // Setup test state
  let todos: Array<{ id: string; text: string; completed: boolean }> = [];
  
  // Reset todos before each test
  beforeEach(() => {
    todos = [
      { id: '1', text: 'Learn Datastar', completed: false },
      { id: '2', text: 'Build an app', completed: false },
      { id: '3', text: 'Setup testing', completed: true }
    ];
    
    // Configure API endpoints for todos
    server.configureHandler('/api/todos', async (req) => {
      if (req.method === 'GET') {
        return { status: 200, body: JSON.stringify({ todos }) };
      }
      
      if (req.method === 'POST') {
        const body = await req.json();
        const newTodo = { 
          id: String(Date.now()), 
          text: body.text,
          completed: false
        };
        todos.push(newTodo);
        return { status: 201, body: JSON.stringify(newTodo) };
      }
      
      return { status: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    });
    
    // Configure dynamic routes for specific todos
    server.configureRegexHandler(/\/api\/todos\/([^\/]+)/, async (req, matches) => {
      const todoId = matches[1];
      const todoIndex = todos.findIndex(t => t.id === todoId);
      
      if (todoIndex === -1) {
        return { status: 404, body: JSON.stringify({ error: 'Todo not found' }) };
      }
      
      if (req.method === 'GET') {
        return { status: 200, body: JSON.stringify(todos[todoIndex]) };
      }
      
      if (req.method === 'PUT') {
        const body = await req.json();
        todos[todoIndex] = { ...todos[todoIndex], ...body };
        return { status: 200, body: JSON.stringify(todos[todoIndex]) };
      }
      
      if (req.method === 'DELETE') {
        const removed = todos.splice(todoIndex, 1)[0];
        return { status: 200, body: JSON.stringify(removed) };
      }
      
      return { status: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    });
    
    // Configure additional routes for specific actions
    server.configureHandler('/api/todos/toggle-all', async (req) => {
      const allCompleted = todos.every(t => t.completed);
      todos = todos.map(t => ({ ...t, completed: !allCompleted }));
      return { status: 200, body: JSON.stringify({ todos }) };
    });
  });
  
  it('should get all todos', async () => {
    const response = await sdk.get('/todos');
    expect(response.todos.length).toBe(3);
  });
  
  it('should add a new todo', async () => {
    const newTodo = { text: 'Test the todos app' };
    const response = await sdk.post('/todos', newTodo);
    
    expect(response.text).toBe(newTodo.text);
    expect(response.completed).toBe(false);
    expect(response.id).toBeDefined();
    
    // Verify it was added to the list
    const allTodos = await sdk.get('/todos');
    expect(allTodos.todos.length).toBe(4);
  });
  
  it('should toggle a todo completion status', async () => {
    const todoId = '1';
    const initialState = todos.find(t => t.id === todoId)!.completed;
    
    const response = await sdk.put(`/todos/${todoId}`, { 
      completed: !initialState 
    });
    
    expect(response.completed).toBe(!initialState);
    
    // Verify it was updated in the list
    const updatedTodos = await sdk.get('/todos');
    const updatedTodo = updatedTodos.todos.find(t => t.id === todoId);
    expect(updatedTodo.completed).toBe(!initialState);
  });
  
  it('should delete a todo', async () => {
    const todoId = '2';
    const initialCount = todos.length;
    
    await sdk.delete(`/todos/${todoId}`);
    
    // Verify it was deleted
    const remainingTodos = await sdk.get('/todos');
    expect(remainingTodos.todos.length).toBe(initialCount - 1);
    expect(remainingTodos.todos.find(t => t.id === todoId)).toBeUndefined();
  });
  
  it('should toggle all todos at once', async () => {
    const initialState = todos.every(t => t.completed);
    
    const response = await sdk.post('/todos/toggle-all');
    
    // All todos should have the opposite completion status
    response.todos.forEach(todo => {
      expect(todo.completed).toBe(!initialState);
    });
  });
});
```

### 4. Visual Effects and Animation Examples

**Test Cases:**
- Verify animation trigger events
- Test view transition parameters
- Validate progress indicators

For these examples, we focus on testing the server-side events that would trigger client-side animations, rather than the visual effects themselves.

**Example for Progress Bar:**
```typescript
it('should emit progress events for long-running operations', async () => {
  // Configure a long-running operation with progress updates
  server.configureSseEndpoint('/sse', async (req, sseStream) => {
    // Send initial progress
    sseStream.sendEvent('progress', { percent: 0 });
    
    // Simulate progress updates
    for (let i = 10; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 50));
      sseStream.sendEvent('progress', { percent: i });
    }
    
    // Send completion event
    sseStream.sendEvent('operation_complete', { success: true });
  });
  
  // Connect to SSE
  await sdk.connectSSE();
  
  // Track progress updates
  const progressUpdates: number[] = [];
  
  sdk.on('progress', (data) => {
    progressUpdates.push(data.percent);
  });
  
  // Wait for completion
  const operationComplete = new Promise<boolean>(resolve => {
    sdk.on('operation_complete', (data) => {
      resolve(data.success);
    });
  });
  
  // Start the operation
  await sdk.post('/start-operation');
  
  // Wait for completion
  const success = await operationComplete;
  
  // Verify all progress events were received
  expect(progressUpdates).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  expect(success).toBe(true);
});
```

### 5. Implementation Roadmap

The implementation roadmap will be organized by complexity, addressing simpler examples first to establish patterns, then progressing to more complex ones:

#### Phase 1: Basic SDK and Server Components (1-2 weeks)
- Setup basic server component that handles API calls and SSE
- Create simple examples (Toggle Visibility, Click to Load)
- Establish test patterns and utilities for TDD

#### Phase 2: Form Handling Examples (1-2 weeks)
- Implement form submission and validation
- Create more complex form examples
- Add file upload and processing

#### Phase 3: Data Management Examples (2-3 weeks)
- Implement Todos example with CRUD operations
- Add filtering and bulk operations
- Create signal management examples

#### Phase 4: UI Interaction Examples (1-2 weeks)
- Implement more complex UI examples (Click to Edit, Active Search)
- Add infinite scroll and lazy loading patterns

#### Phase 5: Animation and Advanced Examples (1-2 weeks)
- Implement animation and transition examples
- Add progress tracking
- Create advanced patterns (Offline Sync, Polling)

#### Phase 6: Documentation and Refinement (1 week)
- Document all examples with usage guides
- Refine API based on implementation experience
- Create performance benchmarks

## Conclusion

This test-driven development plan provides a structured approach to implementing the DataStar examples using the Bun SDK. By following TDD principles and leveraging Bun's testing capabilities, we can create reliable, well-tested examples that demonstrate the full range of DataStar functionality.

Each example will be accompanied by comprehensive tests that not only verify its functionality but also serve as documentation for how to use the SDK correctly in various scenarios.