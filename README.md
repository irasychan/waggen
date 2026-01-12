# Waggen - Web Application State Graph Generator

A developer tool that uses browser automation to explore web applications, map all possible user journeys, and generate Playwright tests automatically.

## Overview

Waggen crawls your web application using Playwright, discovers interactive elements, and builds a state graph representing all possible user flows. This graph can then be exported to JSON and used to generate comprehensive Playwright test suites.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Web App        │────>| Waggen Explorer  |────>│  State Graph    │────>│  Playwright     │
│                 │     │  (Playwright)    │     │  (JSON)         │     │  Tests          │
└─────────────────┘     └──────────────────┘     └─────────────────┘     └─────────────────┘
```

## Features

- **Automatic State Discovery**: BFS exploration finds all reachable application states
- **Element Detection**: Discovers buttons, links, inputs, checkboxes, and select elements
- **State Deduplication**: Smart DOM hashing prevents duplicate state tracking
- **JSON Export**: Machine-readable state graph for further processing
- **Mermaid Diagrams**: Visual state machine diagrams
- **Test Generation**: Automatic Playwright test suite creation

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd waggen

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

## Quick Start

```bash
# 1. Start your web application (or use the sample app)
npm run serve-sample

# 2. Explore the application
npx ts-node src/index.ts explore --url http://localhost:3000

# 3. Generate Playwright tests
npx ts-node src/index.ts generate-tests -f ./output/graph.json

# 4. Run the generated tests
cd generated-tests
npx playwright test
```

## CLI Commands

### `explore` - Discover application states

```bash
npx ts-node src/index.ts explore \
  --url http://localhost:3000 \
  --output ./output/graph.json \
  --max-states 50 \
  --max-depth 5 \
  --headed  # Optional: show browser
```

| Option | Description | Default |
|--------|-------------|---------|
| `-u, --url` | Application URL (required) | - |
| `-o, --output` | Output JSON path | `./output/graph.json` |
| `--max-states` | Maximum states to discover | 50 |
| `--max-depth` | Maximum exploration depth | 5 |
| `--headed` | Show browser window | false |
| `--timeout` | Action timeout (ms) | 30000 |

### `generate-tests` - Create Playwright tests

```bash
npx ts-node src/index.ts generate-tests \
  --file ./output/graph.json \
  --output ./generated-tests \
  --base-url http://localhost:3000
```

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file` | State graph JSON (required) | - |
| `-o, --output` | Output directory | `./generated-tests` |
| `--base-url` | Base URL for tests | `http://localhost:3000` |
| `--prefix` | Test file prefix | `waggen` |
| `--no-states` | Skip state tests | false |
| `--no-transitions` | Skip transition tests | false |
| `--no-journeys` | Skip journey tests | false |

### `summary` - View state graph summary

```bash
npx ts-node src/index.ts summary -f ./output/graph.json
```

### `mermaid` - Generate Mermaid diagram

```bash
npx ts-node src/index.ts mermaid -f ./output/graph.json
```

## Project Structure

```
waggen/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types/                # TypeScript interfaces
│   │   └── index.ts
│   ├── explorer/             # State exploration engine
│   │   ├── Explorer.ts       # Main exploration logic
│   │   ├── StateManager.ts   # State tracking & deduplication
│   │   └── ActionDiscovery.ts # Element detection
│   ├── graph/                # Graph data structures
│   │   ├── StateGraph.ts     # Graph operations
│   │   └── Serializer.ts     # JSON/Mermaid export
│   └── generator/            # Test generation
│       └── TestGenerator.ts  # Playwright test generator
├── sample-app/               # Sample todo application
├── output/                   # Generated state graphs
└── generated-tests/          # Generated Playwright tests
```

## Output Format

### State Graph JSON

```json
{
  "metadata": {
    "appUrl": "http://localhost:3000",
    "generatedAt": "2024-01-12T10:00:00Z",
    "totalStates": 4,
    "totalTransitions": 20,
    "explorationDurationMs": 47000
  },
  "states": {
    "state_001": {
      "id": "state_001",
      "url": "/",
      "description": "Empty todo list",
      "elements": [
        { "selector": "[data-testid='add-btn']", "type": "button", "label": "Add" }
      ]
    }
  },
  "transitions": [
    {
      "fromStateId": "state_001",
      "toStateId": "state_002",
      "action": { "type": "click", "elementSelector": "[data-testid='filter-active']" }
    }
  ],
  "paths": {
    "state_002": [["state_001", "state_002"]]
  },
  "entryStateId": "state_001"
}
```

### Generated Tests

The test generator creates three test files:

1. **State Tests** (`waggen-states.spec.ts`): Verify each state's elements
2. **Transition Tests** (`waggen-transitions.spec.ts`): Test all state transitions
3. **Journey Tests** (`waggen-journeys.spec.ts`): End-to-end user flows

## Core Concepts

### State
A snapshot of the application identified by:
- Current URL
- DOM hash of interactive elements
- Visible UI elements

### Action
A user interaction that transitions between states:
- `click` - Button/link clicks
- `input` - Text input + form submission
- `check` - Checkbox toggling
- `select` - Dropdown selection

### Transition
An edge in the state graph connecting two states via an action.

## Limitations (POC)

- Single-page applications only (no multi-page navigation)
- No authentication flow handling
- Basic state restoration (page reload)
- No modal/popup detection
- No iframe support

## License

MIT
