# Waggen Development Worklog

## Session: 2026-01-14

### Objective
Modernize the UI to a Vite React app with shadcn/ui components and replace Cytoscape.js graph with D3.js hierarchical tree visualization.

---

## What We Built

### Phase 6: React UI with D3 Tree Graph

#### 1. Vite React TypeScript Setup (`src/ui/static/`)

Replaced vanilla JavaScript UI with modern React stack:
- **Vite** - Fast build tool and dev server
- **React 19** - Latest React with TypeScript
- **Tailwind CSS v4** - Utility-first CSS with new v4 architecture
- **shadcn/ui** - Accessible component library built on Radix UI
- **Zustand** - Lightweight state management
- **D3.js** - Tree layout visualization

#### 2. Project Structure

```
src/ui/static/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn components (button, badge, card, tooltip, scroll-area)
│   │   ├── layout/       # Header, ThreeColumnLayout
│   │   ├── tree/         # StateTree, TreeNode (sidebar tree view)
│   │   ├── graph/        # D3TreeGraph, GraphControls, UnexploredPlaceholders
│   │   ├── actions/      # ActionPanel, ActionItem
│   │   └── state/        # CurrentStateBar, StateDetails
│   ├── hooks/
│   │   ├── useWebSocket.ts      # WebSocket connection & message handling
│   │   ├── useD3Tree.ts         # D3 tree layout & rendering
│   │   └── useKeyboardShortcuts.ts
│   ├── store/
│   │   └── index.ts      # Zustand store for app state
│   ├── lib/
│   │   ├── utils.ts      # cn() utility for class merging
│   │   └── graphTransform.ts    # StateGraph to D3 hierarchy transform
│   ├── types/
│   │   └── index.ts      # TypeScript interfaces mirrored from backend
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # React entry point
│   └── index.css         # Tailwind imports + CSS variables
├── vite.config.ts        # Vite config with React, Tailwind, path aliases
├── tsconfig.json         # TypeScript config for React
├── components.json       # shadcn configuration
└── package.json          # Dependencies
```

#### 3. Key Components

| Component | Purpose |
|-----------|---------|
| `D3TreeGraph` | Main graph visualization using d3.tree() hierarchical layout |
| `StateTree` | Left sidebar with collapsible tree view of states |
| `ActionPanel` | Right panel showing available actions with execute/skip controls |
| `CurrentStateBar` | Status bar showing current state info |
| `Header` | Top bar with connection status, controls, and save button |

#### 4. D3 Tree Features

- **Hierarchical Layout** - States shown as tree from entry state
- **Interactive Nodes** - Click to select, double-click to jump to state
- **Visual Indicators** - Entry state (green), current state (yellow), selected (red border)
- **Zoom & Pan** - D3-zoom with fit-to-view capability
- **Directional Edges** - Arrow markers showing transition direction

#### 5. State Management (Zustand)

```typescript
interface Store {
  // Connection
  connectionStatus: 'connecting' | 'connected' | 'disconnected';

  // Data
  session: ExplorationSession | null;
  graphData: StateGraphData | null;
  currentState: AppState | null;
  availableActions: AvailableAction[];

  // UI State
  selectedNodeId: string | null;
  executionStatus: 'idle' | 'executing';
  shouldFitGraph: boolean;
}
```

#### 6. WebSocket Integration

Preserved existing WebSocket protocol with React hooks:
- `connection_init` - Initial session and graph data
- `state_update` - Current state and available actions
- `graph_update` - New states/transitions discovered
- `action_result` - Action execution feedback
- `execute_action`, `skip_action`, `jump_to_state` - Client commands

#### 7. Backend Updates

Updated `InteractiveServer.ts` and `UIServer.ts`:
- Serve React build from `dist/` directory
- SPA fallback routing (serve index.html for client-side routes)
- Updated MIME types for fonts and modern assets

---

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| D3 Tree vs Force-Directed | Tree layout better represents state hierarchy from entry |
| Zustand over Redux | Simpler API, less boilerplate for this scope |
| Tailwind v4 | Latest version with Vite plugin, CSS-first config |
| shadcn/ui | Copy-paste components, full customization control |

---

## Files Modified

```
src/ui/static/           # Complete rewrite (was vanilla JS, now React)
src/ui/InteractiveServer.ts  # Updated to serve React build
src/ui/UIServer.ts           # Updated to serve React build
tsconfig.json                # Exclude React app from root build
```

---

## Commands Reference

```bash
# Build React UI
cd src/ui/static && npm run build

# Build entire project (includes copying UI to dist)
npm run build

# Run interactive mode (opens React UI)
npx ts-node src/index.ts interactive -u http://localhost:3000

# Development (React UI with hot reload)
cd src/ui/static && npm run dev
```

---

*Last updated: 2026-01-14*

---
---

## Session: 2026-01-13

### Objective
Add interactive exploration mode with real-time UI control and static graph visualization.

---

## What We Built

### Phase 5: Interactive Exploration Mode

#### New CLI Commands
- `waggen interactive -u <url>` - Launch interactive exploration with headed browser and real-time UI
- `waggen ui -f <graph.json>` - Serve interactive graph visualization for pre-generated state graphs

#### 1. Interactive Explorer (`src/explorer/InteractiveExplorer.ts`)
Step-by-step exploration mode with manual control:
- No automatic action queue - user controls each step
- Real-time element discovery and highlighting
- Execute, skip, or jump between states
- Headed browser with slowMo for visibility

#### 2. Interactive Server (`src/ui/InteractiveServer.ts`)
HTTP + WebSocket server for real-time communication:
- Serves static UI files
- WebSocket for bidirectional updates
- Handles action execution requests
- Broadcasts state changes to all connected clients

#### 3. Session Management (`src/session/SessionManager.ts`)
Save and resume exploration sessions:
- Persist exploration state to JSON files
- Resume from where you left off
- Stored in `sessions/` directory

#### 4. Graph Renderer (`src/ui/GraphRenderer.ts`)
Transforms StateGraphData to Cytoscape.js format for visualization

#### 5. Static UI Server (`src/ui/UIServer.ts`)
Simple HTTP server for viewing pre-generated state graphs

#### 6. Frontend UI (`src/ui/static/`)
| File | Purpose |
|------|---------|
| `interactive.html` | Interactive exploration interface |
| `interactive.js` | WebSocket client, state management, UI controls |
| `interactive.css` | Styling for interactive mode |
| `index.html` | Static graph viewer |
| `app.js` | Cytoscape.js graph rendering |
| `styles.css` | Graph viewer styling |

#### 7. Type Definitions (`src/types/interactive.ts`)
New interfaces for interactive mode:
- `WSMessage`, `WSMessageType` - WebSocket protocol
- `InteractiveSession` - Session persistence
- `InteractiveServerConfig` - Server configuration
- Various payload types for different message types

### Key Features

**Interactive Mode:**
- Real-time element discovery with clickable action list
- Execute actions one at a time with visual feedback
- Skip unwanted actions
- Jump to previously discovered states
- Save/load sessions for later continuation
- Cytoscape.js graph updates in real-time

**Static Graph Viewer:**
- Load and visualize any generated state graph
- Interactive node/edge exploration
- Pan and zoom controls

---

## Files Created

```
src/
├── explorer/
│   └── InteractiveExplorer.ts    # Step-by-step explorer
├── session/
│   └── SessionManager.ts         # Session persistence
├── ui/
│   ├── InteractiveServer.ts      # HTTP + WebSocket server
│   ├── UIServer.ts               # Static graph viewer server
│   ├── GraphRenderer.ts          # Cytoscape.js data transformer
│   └── static/
│       ├── interactive.html      # Interactive UI
│       ├── interactive.js        # WebSocket client
│       ├── interactive.css       # Interactive styling
│       ├── index.html            # Graph viewer
│       ├── app.js                # Graph rendering
│       └── styles.css            # Viewer styling
└── types/
    └── interactive.ts            # New type definitions

CLAUDE.md                         # AI assistant guidance
```

---

## New Commands Reference

```bash
# Interactive exploration (opens browser + UI)
npx ts-node src/index.ts interactive -u http://localhost:3000

# View pre-generated graph
npx ts-node src/index.ts ui -f ./output/graph.json

# Resume a saved session
npx ts-node src/index.ts interactive -u http://localhost:3000 --session sessions/session-xxx.json
```

---

*Last updated: 2026-01-13*

---
---

## Session: 2026-01-12

### Objective
Create a developer tool to map user journeys in web applications and generate test automation from the discovered state graph.

---

## What We Built

### Phase 1: Planning & Design

**Decisions Made:**
- Browser automation approach using Playwright (vs static analysis)
- TypeScript + Node.js stack
- JSON output format for state graph
- Simple Todo app as test target

**Architecture:**
```
Web App → Explorer (Playwright) → State Graph (JSON) → Test Generator → Playwright Tests
```

### Phase 2: Core Implementation

#### 1. Project Setup
- `package.json` - Dependencies: playwright, commander, crypto
- `tsconfig.json` - TypeScript configuration with DOM types

#### 2. Type Definitions (`src/types/index.ts`)
- `InteractiveElement` - Discovered UI elements
- `Action` - User interactions (click, input, check, select)
- `AppState` - Application state snapshots
- `StateTransition` - Graph edges
- `StateGraphData` - Complete serialized graph
- `ExplorerConfig` - Configuration options

#### 3. Explorer Module (`src/explorer/`)

| File | Purpose |
|------|---------|
| `ActionDiscovery.ts` | Finds buttons, links, inputs, checkboxes, selects |
| `StateManager.ts` | State tracking, DOM hashing, deduplication |
| `Explorer.ts` | BFS exploration engine, action execution |

**Key Features:**
- DOM hashing for state identification
- Visibility filtering for elements
- Stable selector generation (data-testid priority)
- Action queue management

#### 4. Graph Module (`src/graph/`)

| File | Purpose |
|------|---------|
| `StateGraph.ts` | Graph data structure, path computation |
| `Serializer.ts` | JSON export, Mermaid diagram generation |

#### 5. Sample Todo App (`sample-app/`)
- Vanilla JS todo application
- Add/toggle/delete todos
- Filter views (All/Active/Completed)
- Clear completed functionality
- Data-testid attributes for stable selectors

#### 6. CLI (`src/index.ts`)
Commands implemented:
- `explore` - Discover application states
- `summary` - View state graph summary
- `mermaid` - Generate Mermaid diagram
- `generate-tests` - Create Playwright tests

### Phase 3: Test Generation

#### Test Generator (`src/generator/TestGenerator.ts`)

Generates three test files:
1. **State Tests** - Verify each state's elements exist
2. **Transition Tests** - Test all state transitions work
3. **Journey Tests** - End-to-end user flow tests

Plus utilities:
- `test-utils.ts` - Navigation helpers, action execution
- `playwright.config.ts` - Pre-configured Playwright setup

### Phase 4: Documentation

Created README files for:
- Root project (`README.md`)
- Explorer module (`src/explorer/README.md`)
- Graph module (`src/graph/README.md`)
- Generator module (`src/generator/README.md`)
- Types module (`src/types/README.md`)
- Sample app (`sample-app/README.md`)

---

## Test Results

### Exploration Results
```
States discovered: 4
Transitions recorded: 20
Duration: 47.4s
```

**States Found:**
| ID | Description |
|----|-------------|
| state_001 | Empty todo list (All filter) |
| state_002 | Empty list (Active filter) |
| state_003 | Empty list (Completed filter) |
| state_004 | List with 1 item |

### Generated Test Results
```
Total tests: 27
Passed: 26
Failed: 1 (expected - disabled button edge case)
```

The failed test correctly identified that the "Add" button is disabled when input is empty.

---

## Files Created

```
waggen/
├── package.json
├── tsconfig.json
├── README.md
├── WORKLOG.md
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── index.ts
│   │   └── README.md
│   ├── explorer/
│   │   ├── Explorer.ts
│   │   ├── StateManager.ts
│   │   ├── ActionDiscovery.ts
│   │   └── README.md
│   ├── graph/
│   │   ├── StateGraph.ts
│   │   ├── Serializer.ts
│   │   └── README.md
│   └── generator/
│       ├── TestGenerator.ts
│       └── README.md
├── sample-app/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── README.md
├── output/
│   ├── graph.json
│   └── graph.mermaid.md
└── generated-tests/
    ├── package.json
    ├── playwright.config.ts
    ├── test-utils.ts
    ├── waggen-states.spec.ts
    ├── waggen-transitions.spec.ts
    └── waggen-journeys.spec.ts
```

---

## Possible Next Steps

### Short-term Improvements

#### 1. Better State Restoration
**Current:** Page reload between explorations
**Improvement:** Record and replay action sequences to reach states
```typescript
// Store action paths during exploration
interface StatePath {
  stateId: string;
  actions: Action[];
}
```

#### 2. Checkbox/Toggle Handling
**Issue:** Checkbox interactions failing due to selector issues
**Fix:** Improve selector generation for dynamically created elements

#### 3. Smarter Input Values
**Current:** Static test values
**Improvement:** Configurable input strategies per field type
```typescript
inputStrategies: {
  'email': () => faker.internet.email(),
  'password': () => 'SecurePass123!',
  'search': ['', 'test', 'invalid query']
}
```

#### 4. Screenshot Capture
Add visual regression support:
```typescript
interface AppState {
  // ... existing
  screenshot?: string; // Base64 or file path
}
```

### Medium-term Features

#### 5. Multi-page Application Support
- Track URL changes as state transitions
- Handle navigation events
- Support for SPAs with client-side routing

#### 6. Authentication Flows
- Login/logout state handling
- Session management
- Cookie/localStorage tracking

#### 7. Modal & Dialog Detection
- Detect overlay elements
- Track modal open/close states
- Handle confirmation dialogs

#### 8. Form Validation States
- Capture validation error states
- Test invalid input scenarios
- Track form submission failures

#### 9. API Mocking Integration
```typescript
// Integrate with Playwright's route mocking
await page.route('**/api/**', route => {
  route.fulfill({ json: mockData });
});
```

### Long-term Vision

#### 10. Visual State Diff
- Compare screenshots between states
- Highlight UI changes
- Detect visual regressions

#### 11. AI-Powered Test Generation
- Use LLM to generate meaningful test assertions
- Smart test data generation
- Natural language test descriptions

#### 12. CI/CD Integration
```yaml
# Example GitHub Action
- name: Explore and Test
  run: |
    npx waggen explore --url ${{ env.APP_URL }}
    npx waggen generate-tests -f ./output/graph.json
    cd generated-tests && npx playwright test
```

#### 13. Test Coverage Analysis
- Map states to code coverage
- Identify untested application areas
- Suggest additional test scenarios

#### 14. Parallel Exploration
- Multiple browser instances
- Distributed state discovery
- Faster exploration of large apps

#### 15. Plugin Architecture
```typescript
interface WaggenPlugin {
  onStateDiscovered?(state: AppState): void;
  onTransitionRecorded?(transition: StateTransition): void;
  onExplorationComplete?(graph: StateGraph): void;
  customElements?(): ElementDiscoverer[];
}
```

### Alternative Output Formats

#### 16. Cypress Test Generation
```typescript
// Generate Cypress tests instead of Playwright
generator.generate({ framework: 'cypress' });
```

#### 17. Test Framework Agnostic Output
- Generic test specification format
- Adapters for different frameworks
- OpenAPI-style test definitions

#### 18. GraphQL/REST API Discovery
- Detect API calls during exploration
- Generate API contract tests
- Track state changes from API responses

---

## Known Limitations (POC)

| Limitation | Impact | Workaround |
|------------|--------|------------|
| Single-page apps only | No multi-page navigation | Future enhancement |
| No auth support | Can't explore protected areas | Manual login before explore |
| Basic state hashing | May miss subtle differences | Tune hash algorithm |
| Page reload for restore | Slower exploration | Implement action replay |
| No iframe support | Misses embedded content | Future enhancement |
| No shadow DOM | Misses web components | Add shadow DOM traversal |

---

## Commands Reference

```bash
# Explore an application
npx ts-node src/index.ts explore --url http://localhost:3000

# Generate tests from graph
npx ts-node src/index.ts generate-tests -f ./output/graph.json

# View summary
npx ts-node src/index.ts summary -f ./output/graph.json

# Generate Mermaid diagram
npx ts-node src/index.ts mermaid -f ./output/graph.json

# Run generated tests
cd generated-tests && npx playwright test
```

---

## Lessons Learned

1. **Data-testid attributes are essential** - Stable selectors make generated tests reliable
2. **DOM hashing requires tuning** - Too specific = duplicate states, too generic = missed states
3. **BFS works well for exploration** - Finds states level by level, easy to implement depth limits
4. **State restoration is hard** - Simple reload works but loses context; action replay is better
5. **Generated tests need review** - Automated generation gets 90% there, manual polish helps

---

*Last updated: 2026-01-12*
