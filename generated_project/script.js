// Global constant for localStorage key
const STORAGE_KEY = 'todo-tasks';

// Task model
class Task {
  /**
   * @param {string|number} id - Unique identifier for the task
   * @param {string} text - Task description
   * @param {boolean} [completed=false] - Completion status
   */
  constructor(id, text, completed = false) {
    this.id = id;
    this.text = text;
    this.completed = completed;
  }
}

// In‑memory task list
let tasks = [];

// Track the current filter (all, active, completed)
let currentFilter = 'all';

/**
 * Load tasks from localStorage. If the stored value is missing or malformed,
 * the function falls back to an empty array.
 */
function loadTasksFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      tasks = [];
      return;
    }
    const parsed = JSON.parse(raw);
    // Ensure we have an array of plain objects; convert them to Task instances
    if (Array.isArray(parsed)) {
      tasks = parsed.map(item => new Task(item.id, item.text, item.completed));
    } else {
      tasks = [];
    }
  } catch (e) {
    console.error('Failed to load tasks from storage:', e);
    tasks = [];
  }
}

/**
 * Persist the current task list to localStorage.
 */
function saveTasksToStorage() {
  try {
    const serialized = JSON.stringify(tasks);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.error('Failed to save tasks to storage:', e);
  }
}

/**
 * Render the task list to the DOM.
 * @param {string} [filter='all'] - One of 'all', 'active', or 'completed'.
 */
function renderTasks(filter = 'all') {
  const listEl = document.getElementById('task-list');
  if (!listEl) return; // safety guard
  // Clear existing content
  listEl.innerHTML = '';

  tasks.forEach(task => {
    // Apply filter
    if (filter === 'active' && task.completed) return;
    if (filter === 'completed' && !task.completed) return;

    // Create list item
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.id = task.id;
    if (task.completed) {
      li.classList.add('completed');
    }

    // Checkbox for completion toggle
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'toggle-complete';
    checkbox.checked = task.completed;

    // Task text
    const span = document.createElement('span');
    span.className = 'task-text';
    span.textContent = task.text;

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-task';
    editBtn.textContent = '✎';

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-task';
    deleteBtn.textContent = '✖';

    // Assemble the list item
    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);

    // Append to the list
    listEl.appendChild(li);
  });
}

/**
 * Add a new task based on the input field value.
 */
function handleAddTask() {
  const inputEl = document.getElementById('new-task-input');
  if (!inputEl) return;
  const text = inputEl.value.trim();
  if (!text) return; // ignore empty input

  const id = Date.now(); // simple unique id
  const newTask = new Task(id, text);
  tasks.push(newTask);
  saveTasksToStorage();
  renderTasks(currentFilter);
  inputEl.value = '';
}

// Set up event listeners for adding tasks
function initialiseAddTaskListeners() {
  const addBtn = document.getElementById('add-task-btn');
  const inputEl = document.getElementById('new-task-input');

  if (addBtn) {
    addBtn.addEventListener('click', handleAddTask);
  }

  if (inputEl) {
    inputEl.addEventListener('keyup', e => {
      if (e.key === 'Enter') {
        handleAddTask();
      }
    });
  }
}

/**
 * Initialise the event delegation for toggling task completion, editing, and deleting.
 * A single click listener is attached to the #task-list element.
 */
function initialiseToggleCompletionListener() {
  const listEl = document.getElementById('task-list');
  if (!listEl) return;

  listEl.addEventListener('click', e => {
    const target = e.target;
    if (!target) return;

    // ----- Completion toggle -----
    if (target.classList.contains('toggle-complete')) {
      const li = target.closest('li.task-item');
      if (!li) return;
      const id = li.dataset.id;
      const task = tasks.find(t => String(t.id) === id);
      if (!task) return;
      task.completed = !task.completed;
      saveTasksToStorage();
      renderTasks(currentFilter);
      return; // early exit after handling toggle
    }

    // ----- Edit task -----
    if (target.classList.contains('edit-task')) {
      const li = target.closest('li.task-item');
      if (!li) return;
      const id = li.dataset.id;
      const task = tasks.find(t => String(t.id) === id);
      if (!task) return;

      const span = li.querySelector('span.task-text');
      if (!span) return;

      // Create input element pre‑filled with current text
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-input';
      input.value = task.text;

      // Replace span with input
      span.replaceWith(input);
      input.focus();

      const commitEdit = () => {
        const newText = input.value.trim();
        if (newText && newText !== task.text) {
          task.text = newText;
          saveTasksToStorage();
        }
        // Re‑render to reflect changes (and to restore original markup)
        renderTasks(currentFilter);
      };

      // Commit on Enter key
      input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') {
          commitEdit();
        }
      });

      // Commit on blur (when focus leaves the input)
      input.addEventListener('blur', commitEdit);
      return; // early exit after handling edit
    }

    // ----- Delete task -----
    if (target.classList.contains('delete-task')) {
      const li = target.closest('li.task-item');
      if (!li) return;
      const id = li.dataset.id;
      // Filter out the task with the matching id
      tasks = tasks.filter(t => String(t.id) !== id);
      // Keep window.tasks in sync for any external references
      window.tasks = tasks;
      saveTasksToStorage();
      renderTasks(currentFilter);
      return; // early exit after handling delete
    }
  });
}

/**
 * Initialise filter button controls.
 * Buttons should have the class `.filter-btn` and a `data-filter` attribute
 * containing one of "all", "active", or "completed".
 * The active button receives the `.active` class.
 */
function initialiseFilterButtons() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  if (!filterBtns.length) return;

  // Set initial active state based on currentFilter
  filterBtns.forEach(btn => {
    const btnFilter = btn.dataset.filter;
    btn.classList.toggle('active', btnFilter === currentFilter);
    btn.addEventListener('click', () => {
      const newFilter = btn.dataset.filter;
      if (!newFilter) return;
      // Update global filter state
      currentFilter = newFilter;
      window.currentFilter = currentFilter;
      // Update active classes
      filterBtns.forEach(b => b.classList.toggle('active', b === btn));
      // Re‑render tasks with the new filter
      renderTasks(currentFilter);
    });
  });
}

// Export functions via the global `window` object for later modules
window.loadTasksFromStorage = loadTasksFromStorage;
window.saveTasksToStorage = saveTasksToStorage;
window.Task = Task; // expose class for potential external use
window.tasks = tasks; // expose the array for debugging / later use
window.renderTasks = renderTasks;
window.currentFilter = currentFilter;

// Initialise the application state immediately
loadTasksFromStorage();
renderTasks(currentFilter);
initialiseAddTaskListeners();
initialiseToggleCompletionListener();
initialiseFilterButtons();
