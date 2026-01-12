# Generator Module

Generates Playwright test suites from state graph data.

## Overview

This module transforms a state graph JSON file into executable Playwright tests. It creates comprehensive test coverage including state verification, transition testing, and end-to-end user journey tests.

## Components

### TestGenerator.ts

The main test generator that produces Playwright test files.

```typescript
import { TestGenerator } from './TestGenerator';
import { Serializer } from '../graph/Serializer';

const data = Serializer.loadFromFile('./output/graph.json');

const generator = new TestGenerator(data, {
  outputDir: './generated-tests',
  baseUrl: 'http://localhost:3000',
  testPrefix: 'waggen',
  generateStateTests: true,
  generateTransitionTests: true,
  generatePathTests: true
});

const files = generator.generate();
console.log('Generated:', files);
```

## Configuration

```typescript
interface TestGeneratorConfig {
  outputDir: string;           // Output directory for test files
  baseUrl: string;             // Base URL for tests
  testPrefix: string;          // Prefix for test file names
  generateStateTests: boolean; // Generate state verification tests
  generateTransitionTests: boolean; // Generate transition tests
  generatePathTests: boolean;  // Generate user journey tests
}
```

## Generated Files

### 1. State Tests (`waggen-states.spec.ts`)

Verifies that each discovered state has the expected elements visible.

```typescript
test.describe('State Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('state_001: Todo App - empty list', async ({ page }) => {
    // Verify state elements
    await expect(page.locator('[data-testid="add-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="todo-input"]')).toBeVisible();
  });

  test('state_002: Todo App - filter: active', async ({ page }) => {
    // Navigate to state
    await navigateToState(page, 'state_002');

    // Verify state elements
    await expect(page.locator('[data-testid="add-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-active"]')).toBeVisible();
  });
});
```

### 2. Transition Tests (`waggen-transitions.spec.ts`)

Tests that each action leads to the expected state transition.

```typescript
test.describe('State Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('state_001 -> state_002: click Active', async ({ page }) => {
    // Perform action: click "Active"
    await page.locator('[data-testid="filter-active"]').click();

    // Verify transition to: Todo App - filter: active
    await expect(page.locator('[data-testid="filter-active"]')).toBeVisible();
  });

  test('state_002 -> state_001: click All', async ({ page }) => {
    // Navigate to source state
    await navigateToState(page, 'state_002');

    // Perform action: click "All"
    await page.locator('[data-testid="filter-all"]').click();

    // Verify transition to: Todo App - empty list
    await expect(page.locator('[data-testid="add-btn"]')).toBeVisible();
  });
});
```

### 3. Journey Tests (`waggen-journeys.spec.ts`)

End-to-end tests that follow complete paths through the application.

```typescript
test.describe('User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('Journey to: Todo App - 1 items', async ({ page }) => {
    // Path: state_001 -> state_004

    // Step 1: Empty list -> 1 item
    await page.locator('[data-testid="todo-input"]').fill('Test item');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Verify final state
    await expect(page.locator('[data-testid="add-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="todo-checkbox-1"]')).toBeVisible();
  });
});
```

### 4. Test Utilities (`test-utils.ts`)

Helper functions for navigation and action execution.

```typescript
// State navigation map - computed shortest paths
export const STATE_PATHS: Record<string, Array<{ action: string; selector: string; value?: string }>> = {
  'state_001': [],
  'state_002': [{ action: 'click', selector: '[data-testid="filter-active"]' }],
  'state_004': [{ action: 'input', selector: '[data-testid="todo-input"]', value: 'Test item' }]
};

// Navigate to any state from entry
export async function navigateToState(page: Page, stateId: string): Promise<void> {
  const steps = STATE_PATHS[stateId];
  for (const step of steps) {
    await performAction(page, step.action, step.selector, step.value);
    await page.waitForTimeout(300);
  }
}

// Execute an action
export async function performAction(
  page: Page,
  action: string,
  selector: string,
  value?: string
): Promise<void> {
  const element = page.locator(selector).first();
  switch (action) {
    case 'click':
      await element.click();
      break;
    case 'input':
      await element.fill(value || '');
      await page.keyboard.press('Enter');
      break;
    case 'check':
      await element.click();
      break;
    case 'select':
      await element.selectOption(value || '');
      break;
  }
}
```

### 5. Playwright Config (`playwright.config.ts`)

Pre-configured Playwright setup.

```typescript
export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'npx serve ../sample-app -p 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Usage

### Via CLI

```bash
# Generate all test types
npx ts-node src/index.ts generate-tests -f ./output/graph.json

# Customize output
npx ts-node src/index.ts generate-tests \
  -f ./output/graph.json \
  -o ./my-tests \
  --base-url http://localhost:8080 \
  --prefix myapp

# Skip specific test types
npx ts-node src/index.ts generate-tests \
  -f ./output/graph.json \
  --no-transitions \
  --no-journeys
```

### Programmatically

```typescript
import { TestGenerator } from './generator/TestGenerator';
import { Serializer } from './graph/Serializer';

const data = Serializer.loadFromFile('./output/graph.json');

const generator = new TestGenerator(data, {
  outputDir: './tests',
  baseUrl: 'http://localhost:3000',
  testPrefix: 'app',
  generateStateTests: true,
  generateTransitionTests: true,
  generatePathTests: true
});

const generatedFiles = generator.generate();
```

## Running Generated Tests

```bash
# Navigate to test directory
cd generated-tests

# Install dependencies (first time only)
npm init -y
npm install @playwright/test

# Run all tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test file
npx playwright test waggen-journeys.spec.ts

# Generate HTML report
npx playwright test --reporter=html
npx playwright show-report
```

## Test Coverage

The generator creates tests covering:

| Test Type | Coverage |
|-----------|----------|
| **State Tests** | Each state has all expected elements |
| **Transition Tests** | Each action leads to correct state |
| **Journey Tests** | Complete paths work end-to-end |

### Example Test Count

For a state graph with:
- 4 states
- 20 transitions
- 3 unique paths

Generated tests:
- State tests: 4
- Transition tests: ~20 (deduplicated)
- Journey tests: 3

## Customization

### Custom Test Assertions

Extend the generator to add custom assertions:

```typescript
// In generateStateTests(), add custom verification
lines.push(`    // Custom assertion`);
lines.push(`    await expect(page).toHaveTitle(/Todo/);`);
```

### Custom Action Types

Add support for new action types in `generateActionCode()`:

```typescript
private generateActionCode(action: Action): string {
  switch (action.type) {
    case 'hover':
      return `await page.locator('${selector}').hover();`;
    case 'double-click':
      return `await page.locator('${selector}').dblclick();`;
    // ... existing cases
  }
}
```

### Test Data Customization

Override input values in the config:

```typescript
const generator = new TestGenerator(data, {
  // ... other options
  inputValues: {
    text: 'Custom test value',
    email: 'test@custom.com'
  }
});
```

## Best Practices

1. **Use data-testid attributes**: Most stable selectors for generated tests
2. **Keep states small**: Smaller state graphs produce more focused tests
3. **Run regularly**: Re-generate tests when UI changes significantly
4. **Combine with manual tests**: Generated tests cover happy paths; add edge cases manually
5. **Review generated code**: Adjust selectors or assertions as needed
