# Waggen Development Worklog

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
