# Types Module

Core TypeScript interfaces and type definitions for Waggen.

## Overview

This module defines all the shared types used across Waggen's components, ensuring type safety and consistent data structures throughout the application.

## Type Definitions

### Element Types

```typescript
// Supported interactive element types
export type ElementType = 'button' | 'link' | 'input' | 'checkbox' | 'select';

// Supported user action types
export type ActionType = 'click' | 'input' | 'submit' | 'select' | 'check';
```

### InteractiveElement

Represents a discovered interactive element on a page.

```typescript
export interface InteractiveElement {
  selector: string;              // CSS selector to locate element
  type: ElementType;             // Type of element
  label: string;                 // Human-readable label
  tagName: string;               // HTML tag name (lowercase)
  attributes: Record<string, string>;  // Relevant attributes
}
```

**Example:**
```json
{
  "selector": "[data-testid=\"add-btn\"]",
  "type": "button",
  "label": "Add",
  "tagName": "button",
  "attributes": {
    "id": "add-btn",
    "type": "submit",
    "data-testid": "add-btn"
  }
}
```

### Action

Represents a user action that can trigger a state transition.

```typescript
export interface Action {
  type: ActionType;              // Type of action
  elementSelector: string;       // Target element selector
  elementLabel: string;          // Human-readable element label
  value?: string;                // Input value (for input/select)
}
```

**Examples:**
```json
// Click action
{
  "type": "click",
  "elementSelector": "[data-testid=\"submit-btn\"]",
  "elementLabel": "Submit"
}

// Input action
{
  "type": "input",
  "elementSelector": "[data-testid=\"email-input\"]",
  "elementLabel": "Email",
  "value": "test@example.com"
}
```

### AppState

Represents a snapshot of the application at a specific point.

```typescript
export interface AppState {
  id: string;                    // Unique identifier (e.g., "state_001")
  url: string;                   // Page URL
  domHash: string;               // Hash of DOM structure
  description: string;           // Human-readable description
  elements: InteractiveElement[]; // Discovered interactive elements
  timestamp: number;             // Unix timestamp when captured
}
```

**Example:**
```json
{
  "id": "state_001",
  "url": "http://localhost:3000/",
  "domHash": "a6a6077e8bb9",
  "description": "Todo App - empty list",
  "elements": [...],
  "timestamp": 1705052400000
}
```

### StateTransition

Represents an edge in the state graph (a transition between states).

```typescript
export interface StateTransition {
  id: string;                    // Unique identifier
  fromStateId: string;           // Source state ID
  toStateId: string;             // Destination state ID
  action: Action;                // Action that triggers transition
}
```

**Example:**
```json
{
  "id": "trans_1",
  "fromStateId": "state_001",
  "toStateId": "state_002",
  "action": {
    "type": "click",
    "elementSelector": "[data-testid=\"filter-active\"]",
    "elementLabel": "Active"
  }
}
```

### ExplorationQueueItem

Internal type for BFS exploration queue.

```typescript
export interface ExplorationQueueItem {
  stateId: string;               // State to explore from
  action: Action;                // Action to execute
  pathFromRoot: string[];        // Path of state IDs from entry
}
```

### StateGraphData

Complete serialized state graph structure.

```typescript
export interface StateGraphData {
  metadata: {
    appUrl: string;              // Application entry URL
    generatedAt: string;         // ISO timestamp
    totalStates: number;         // Number of states discovered
    totalTransitions: number;    // Number of transitions recorded
    explorationDurationMs: number; // Exploration duration in ms
  };
  states: Record<string, AppState>;  // Map of state ID to state
  transitions: StateTransition[];    // All transitions
  paths: Record<string, string[][]>; // Paths from entry to each state
  entryStateId: string;              // Initial state ID
}
```

### ExplorerConfig

Configuration options for the explorer.

```typescript
export interface ExplorerConfig {
  url: string;                   // Entry URL to explore
  maxStates: number;             // Maximum states to discover
  maxDepth: number;              // Maximum exploration depth
  headless: boolean;             // Run browser in headless mode
  timeout: number;               // Action timeout in milliseconds
  inputValues: Record<string, string>; // Values for form inputs
  outputPath: string;            // Output file path
}
```

### DEFAULT_CONFIG

Default configuration values.

```typescript
export const DEFAULT_CONFIG: ExplorerConfig = {
  url: 'http://localhost:3000',
  maxStates: 100,
  maxDepth: 10,
  headless: true,
  timeout: 30000,
  inputValues: {
    text: 'Test item',
    email: 'test@example.com',
    password: 'password123',
    number: '42',
  },
  outputPath: './output/graph.json',
};
```

## Usage

Import types in other modules:

```typescript
import {
  AppState,
  Action,
  StateTransition,
  InteractiveElement,
  ExplorerConfig,
  StateGraphData,
  DEFAULT_CONFIG
} from '../types';

// Use in function signatures
function processState(state: AppState): void {
  console.log(`Processing: ${state.description}`);
}

// Use with generics
const stateMap: Map<string, AppState> = new Map();

// Extend config
const config: ExplorerConfig = {
  ...DEFAULT_CONFIG,
  url: 'http://myapp.com',
  maxStates: 50
};
```

## Type Guards

Helper functions for runtime type checking:

```typescript
function isClickAction(action: Action): boolean {
  return action.type === 'click';
}

function isInputAction(action: Action): boolean {
  return action.type === 'input' && action.value !== undefined;
}

function isInteractiveElement(obj: unknown): obj is InteractiveElement {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'selector' in obj &&
    'type' in obj &&
    'label' in obj
  );
}
```

## Extending Types

### Adding New Element Types

```typescript
// In types/index.ts
export type ElementType =
  | 'button'
  | 'link'
  | 'input'
  | 'checkbox'
  | 'select'
  | 'slider'      // New type
  | 'datepicker'; // New type
```

### Adding New Action Types

```typescript
// In types/index.ts
export type ActionType =
  | 'click'
  | 'input'
  | 'submit'
  | 'select'
  | 'check'
  | 'hover'       // New action
  | 'drag';       // New action
```

### Adding State Metadata

```typescript
// Extended AppState
export interface AppState {
  // ... existing fields
  screenshot?: string;     // Base64 screenshot
  cookies?: Cookie[];      // Page cookies
  localStorage?: Record<string, string>; // Local storage state
}
```
