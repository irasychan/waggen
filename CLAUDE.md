# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Waggen (Web Application State Graph Generator) is a developer tool that uses Playwright to automatically explore web applications, discover interactive states via BFS traversal, generate a JSON state graph, and create comprehensive Playwright test suites from the discovered states.

## Common Commands

```bash
# Build the project
npm run build

# Run CLI in development mode
npm run dev
npm run start

# Start the sample todo app (for testing exploration)
npm run serve-sample    # Serves on http://localhost:3000

# Explore an application
npx ts-node src/index.ts explore --url http://localhost:3000 --output ./output/graph.json

# Generate tests from state graph
npx ts-node src/index.ts generate-tests --file ./output/graph.json --output ./generated-tests

# View graph summary
npx ts-node src/index.ts summary -f ./output/graph.json

# Generate Mermaid diagram
npx ts-node src/index.ts mermaid -f ./output/graph.json

# Run generated Playwright tests
npx playwright test --config=generated-tests/playwright.config.ts
```

## Architecture

### Core Flow
```
URL → Explorer (BFS) → ActionDiscovery → StateManager → StateGraph → Serializer → TestGenerator
```

### Key Modules

**`src/explorer/`** - State exploration engine
- `Explorer.ts` - BFS orchestrator managing Playwright browser, exploration queue, depth/state limits
- `StateManager.ts` - State deduplication via DOM hashing (MD5 of interactive elements, first 12 chars)
- `ActionDiscovery.ts` - Finds interactive elements (buttons, links, inputs, checkboxes, selects) using visibility filtering

**`src/graph/`** - Graph data structures
- `StateGraph.ts` - State/transition storage, shortest path computation via BFS
- `Serializer.ts` - JSON and Mermaid diagram export

**`src/generator/`** - Test generation
- `TestGenerator.ts` - Generates three test files: states, transitions, and journey tests

**`src/types/index.ts`** - Core TypeScript interfaces: `InteractiveElement`, `Action`, `AppState`, `StateTransition`, `StateGraphData`, `ExplorerConfig`

### State Identification Algorithm

States are identified by: URL path + DOM hash (MD5 of visible interactive elements including their attributes, checkbox states, and list item counts). This enables deduplication while distinguishing meaningfully different UI states.

### State Restoration

Currently uses page reload to restore states before executing actions. This is a POC limitation - action replay would preserve context better.

## Development Workflow

1. Make changes to TypeScript files in `src/`
2. Test using the sample app: `npm run serve-sample` in one terminal
3. Run exploration: `npm run dev explore --url http://localhost:3000 --headed`
4. Verify generated graph in `output/`
5. Generate and run tests to validate

## Extending the Tool

**Adding new element types**: Modify `ActionDiscovery.ts` - add to `findInteractiveElements()` and create corresponding action handlers in `Explorer.ts`

**Modifying state detection**: Adjust `StateManager.ts` - the `computeDOMSignature()` method determines what makes states unique

**Customizing test output**: Modify `TestGenerator.ts` - template strings for each test type (states, transitions, journeys)

## Current Limitations

- Single-page apps only (no multi-page navigation)
- No authentication support (workaround: manual login first)
- No iframe or shadow DOM support
- No modal/dialog state detection
- State restoration via page reload loses application context
