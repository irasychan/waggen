# Explorer Module

The exploration engine that crawls web applications and discovers all possible states and transitions.

## Overview

This module uses Playwright to automate browser interactions, systematically exploring a web application through BFS (Breadth-First Search) traversal. It discovers interactive elements, executes actions, and builds a comprehensive state graph.

## Components

### Explorer.ts

The main orchestrator that coordinates the exploration process.

```typescript
import { Explorer } from './Explorer';

const explorer = new Explorer({
  url: 'http://localhost:3000',
  maxStates: 50,
  maxDepth: 5,
  headless: true,
  timeout: 30000,
  inputValues: { text: 'Test input' },
  outputPath: './output/graph.json'
});

const graph = await explorer.explore();
```

**Key Methods:**

| Method | Description |
|--------|-------------|
| `explore()` | Main entry point - runs full exploration |
| `captureCurrentState()` | Captures current page state |
| `exploreAction()` | Executes a single action and records transition |
| `executeAction()` | Performs click/input/check actions |
| `restoreToState()` | Returns to a previous state for further exploration |

**Exploration Algorithm:**

```
1. Navigate to entry URL
2. Capture initial state
3. Queue all possible actions for initial state
4. While queue not empty AND states < maxStates:
   a. Pop action from queue
   b. Restore to source state
   c. Execute action
   d. Capture resulting state
   e. Record transition
   f. Queue new actions if state is new
5. Return completed state graph
```

### StateManager.ts

Manages state tracking, deduplication, and explored action history.

```typescript
import { StateManager } from './StateManager';

const stateManager = new StateManager();

// Capture and deduplicate states
const state = await stateManager.captureState(page, elements);

// Track explored actions
stateManager.markActionExplored(stateId, action);
const unexplored = stateManager.getUnexploredActions(stateId, allActions);
```

**Key Features:**

- **DOM Hashing**: Creates unique state signatures based on interactive elements
- **Deduplication**: Prevents re-exploration of identical states
- **Action Tracking**: Remembers which actions have been tried from each state

**State Identification:**

States are identified by hashing:
- Interactive element structure (buttons, inputs, checkboxes)
- Element attributes (id, class, data-testid)
- List item counts
- Active filter state
- Checkbox states

### ActionDiscovery.ts

Discovers all interactive elements on a page and generates possible actions.

```typescript
import { ActionDiscovery } from './ActionDiscovery';

const discovery = new ActionDiscovery(config);

// Find all interactive elements
const elements = await discovery.discoverElements(page);

// Generate actions for an element
const actions = discovery.generateActionsForElement(element);
```

**Supported Elements:**

| Element Type | Selector | Action Generated |
|--------------|----------|------------------|
| Button | `button, [role="button"], input[type="submit"]` | `click` |
| Link | `a[href]` | `click` |
| Text Input | `input[type="text"], textarea` | `input` + Enter |
| Checkbox | `input[type="checkbox"]` | `check` (toggle) |
| Select | `select` | `select` (first option) |

**Visibility Filtering:**

Elements are only discovered if:
- `display` is not `none`
- `visibility` is not `hidden`
- `opacity` > 0
- Has non-zero dimensions

**Selector Priority:**

1. `data-testid` attribute (most stable)
2. `id` attribute
3. `name` attribute
4. nth-of-type fallback

## Configuration

```typescript
interface ExplorerConfig {
  url: string;           // Entry URL
  maxStates: number;     // Maximum states to discover (default: 100)
  maxDepth: number;      // Maximum exploration depth (default: 10)
  headless: boolean;     // Run browser headlessly (default: true)
  timeout: number;       // Action timeout in ms (default: 30000)
  inputValues: {         // Values to use for form inputs
    text: string;
    email: string;
    password: string;
    number: string;
  };
  outputPath: string;    // Where to save the graph
}
```

## Exploration Flow

```
┌─────────────┐
│  Start URL  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│  Discover   │────▶│  Capture     │
│  Elements   │     │  State       │
└──────┬──────┘     └──────┬───────┘
       │                   │
       ▼                   ▼
┌─────────────┐     ┌──────────────┐
│  Generate   │────▶│  Queue       │
│  Actions    │     │  Actions     │
└─────────────┘     └──────┬───────┘
                           │
       ┌───────────────────┘
       ▼
┌─────────────┐
│  Execute    │◀────────────────┐
│  Action     │                 │
└──────┬──────┘                 │
       │                        │
       ▼                        │
┌─────────────┐     ┌───────────┴──┐
│  Capture    │────▶│  More        │
│  New State  │     │  Actions?    │
└──────┬──────┘     └──────────────┘
       │
       ▼
┌─────────────┐
│  Record     │
│  Transition │
└─────────────┘
```

## Error Handling

The explorer handles common issues:

- **Element not visible**: Skips action, logs warning
- **Action timeout**: Marks action as failed, continues
- **Navigation errors**: Attempts to restore and retry
- **State capture failures**: Uses fallback state identification

## Extending

To add support for new element types:

1. Add detection method in `ActionDiscovery.ts`:
```typescript
private async findCustomElements(page: Page): Promise<InteractiveElement[]> {
  return page.evaluate(() => {
    // Custom element detection logic
  });
}
```

2. Add to `discoverElements()`:
```typescript
const customElements = await this.findCustomElements(page);
elements.push(...customElements);
```

3. Add action generation in `generateActionsForElement()`:
```typescript
case 'custom':
  actions.push({
    type: 'custom-action',
    elementSelector: element.selector,
    elementLabel: element.label,
  });
  break;
```

4. Add execution in `Explorer.executeAction()`:
```typescript
case 'custom-action':
  await element.customMethod();
  break;
```
