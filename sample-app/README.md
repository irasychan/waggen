# Sample Todo App

A simple todo list application used as a test target for Waggen.

## Overview

This is a vanilla JavaScript todo application with multiple interactive states, making it ideal for demonstrating Waggen's state exploration and test generation capabilities.

## Features

- Add todo items
- Toggle todo completion
- Delete todo items
- Filter todos (All / Active / Completed)
- Clear completed items
- Item counter

## Running the App

```bash
# From the project root
npm run serve-sample

# Or directly with npx
npx serve sample-app -p 3000
```

Then open http://localhost:3000 in your browser.

## Application States

The app has several distinct states that Waggen can discover:

| State | Description | Key Elements |
|-------|-------------|--------------|
| Empty List | No todos, all filters | Input, Add button, Filters |
| Empty + Active Filter | No todos, Active selected | Same as above |
| Empty + Completed Filter | No todos, Completed selected | Same as above |
| With Items | One or more todos | + Checkboxes, Delete buttons, Footer |
| With Completed | Has completed items | + Clear completed button |

## User Interactions

| Element | Data-testid | Action |
|---------|-------------|--------|
| Text Input | `todo-input` | Type todo text |
| Add Button | `add-btn` | Submit new todo |
| All Filter | `filter-all` | Show all todos |
| Active Filter | `filter-active` | Show incomplete todos |
| Completed Filter | `filter-completed` | Show completed todos |
| Todo Checkbox | `todo-checkbox-{id}` | Toggle completion |
| Delete Button | `delete-btn-{id}` | Remove todo |
| Clear Completed | `clear-completed` | Remove all completed |

## File Structure

```
sample-app/
├── index.html    # Main HTML structure
├── styles.css    # Application styles
├── app.js        # Application logic
└── README.md     # This file
```

## HTML Structure

```html
<div class="container">
  <h1>Todo List</h1>

  <!-- Add Todo Form -->
  <form id="todo-form" data-testid="todo-form">
    <input type="text" id="todo-input" data-testid="todo-input" />
    <button type="submit" id="add-btn" data-testid="add-btn">Add</button>
  </form>

  <!-- Filters -->
  <div id="filters" data-testid="filters">
    <button data-filter="all" data-testid="filter-all">All</button>
    <button data-filter="active" data-testid="filter-active">Active</button>
    <button data-filter="completed" data-testid="filter-completed">Completed</button>
  </div>

  <!-- Todo List -->
  <ul id="todo-list" data-testid="todo-list"></ul>

  <!-- Footer -->
  <div id="footer" data-testid="footer">
    <span id="items-left" data-testid="items-left">0 items left</span>
    <button id="clear-completed" data-testid="clear-completed">Clear completed</button>
  </div>
</div>
```

## State Management

The app uses a simple state object:

```javascript
let todos = [];           // Array of { id, text, completed }
let currentFilter = 'all'; // 'all' | 'active' | 'completed'
let nextId = 1;           // Auto-incrementing ID
```

## Key Functions

| Function | Description |
|----------|-------------|
| `handleAddTodo(e)` | Add new todo from form |
| `handleToggle(id)` | Toggle todo completion |
| `handleDelete(id)` | Remove a todo |
| `handleFilterChange(filter)` | Change active filter |
| `handleClearCompleted()` | Remove all completed todos |
| `render()` | Re-render the todo list |
| `getFilteredTodos()` | Get todos based on current filter |

## State Transitions

```
                    ┌─────────────────┐
                    │   Empty List    │
                    │   (All Filter)  │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │Empty + Active│  │ Add Todo     │  │Empty+Complete│
    │   Filter     │  │              │  │   Filter     │
    └──────────────┘  └──────┬───────┘  └──────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  List with      │
                    │  Items          │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │Toggle Item   │  │ Delete Item  │  │ Filter View  │
    │(Complete)    │  │              │  │              │
    └──────────────┘  └──────────────┘  └──────────────┘
```

## Testing with Waggen

### Run Exploration

```bash
# Start the app
npm run serve-sample

# In another terminal, run exploration
npx ts-node src/index.ts explore --url http://localhost:3000 --max-states 20
```

### Expected Discovery

Waggen should discover approximately:
- **4-6 states**: Empty list variations, list with items
- **15-25 transitions**: Button clicks, input submissions, filter changes

### Why This App?

This todo app is ideal for testing Waggen because:

1. **Clear States**: Distinct UI states are easily distinguishable
2. **Multiple Interactions**: Buttons, inputs, checkboxes provide variety
3. **Data-testid Attributes**: Stable selectors for reliable testing
4. **State Persistence**: DOM changes reflect state changes clearly
5. **Manageable Complexity**: Small enough to verify manually

## Customization

### Adding More States

To create more discoverable states:

```javascript
// Add priority levels
todos.push({
  id: nextId++,
  text: text,
  completed: false,
  priority: 'normal' // 'high', 'normal', 'low'
});
```

### Adding More Interactions

```html
<!-- Add edit functionality -->
<button class="edit-btn" data-testid="edit-btn-${todo.id}">Edit</button>

<!-- Add drag and drop -->
<div class="todo-item" draggable="true" data-testid="todo-item-${todo.id}">
```

## Accessibility

The app includes basic accessibility features:

- Semantic HTML elements
- Form labels (via placeholder)
- Button types specified
- Keyboard navigation support (Enter to submit)

## Browser Support

Works in all modern browsers:
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
