// Todo App State
let todos = [];
let currentFilter = 'all';
let nextId = 1;

// DOM Elements
const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const footer = document.getElementById('footer');
const itemsLeft = document.getElementById('items-left');
const clearCompletedBtn = document.getElementById('clear-completed');

// Initialize
function init() {
  form.addEventListener('submit', handleAddTodo);
  input.addEventListener('input', handleInputChange);
  clearCompletedBtn.addEventListener('click', handleClearCompleted);

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => handleFilterChange(btn.dataset.filter));
  });

  render();
}

// Event Handlers
function handleAddTodo(e) {
  e.preventDefault();
  const text = input.value.trim();

  if (text) {
    todos.push({
      id: nextId++,
      text,
      completed: false
    });
    input.value = '';
    addBtn.disabled = true;
    render();
  }
}

function handleInputChange() {
  addBtn.disabled = input.value.trim() === '';
}

function handleToggle(id) {
  todos = todos.map(todo =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
  render();
}

function handleDelete(id) {
  todos = todos.filter(todo => todo.id !== id);
  render();
}

function handleFilterChange(filter) {
  currentFilter = filter;
  filterBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  render();
}

function handleClearCompleted() {
  todos = todos.filter(todo => !todo.completed);
  render();
}

// Render
function render() {
  const filteredTodos = getFilteredTodos();
  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  // Render todo list
  if (filteredTodos.length === 0) {
    todoList.innerHTML = '<li class="empty-state">No todos to show</li>';
  } else {
    todoList.innerHTML = filteredTodos.map(todo => `
      <li class="todo-item ${todo.completed ? 'completed' : ''}" data-testid="todo-item-${todo.id}">
        <input
          type="checkbox"
          class="todo-checkbox"
          data-testid="todo-checkbox-${todo.id}"
          ${todo.completed ? 'checked' : ''}
          onchange="handleToggle(${todo.id})"
        >
        <span class="todo-text" data-testid="todo-text-${todo.id}">${escapeHtml(todo.text)}</span>
        <button
          class="delete-btn"
          data-testid="delete-btn-${todo.id}"
          onclick="handleDelete(${todo.id})"
        >Delete</button>
      </li>
    `).join('');
  }

  // Update footer
  footer.style.display = todos.length > 0 ? 'flex' : 'none';
  itemsLeft.textContent = `${activeTodos.length} item${activeTodos.length !== 1 ? 's' : ''} left`;
  clearCompletedBtn.style.display = completedTodos.length > 0 ? 'block' : 'none';
}

function getFilteredTodos() {
  switch (currentFilter) {
    case 'active':
      return todos.filter(t => !t.completed);
    case 'completed':
      return todos.filter(t => t.completed);
    default:
      return todos;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start the app
init();
