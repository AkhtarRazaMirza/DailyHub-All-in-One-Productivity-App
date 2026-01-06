// UTILITIES
const Utils = {
  setupFilterButtons(buttons, manager, filterAttr = 'data-filter') {
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filterKey = filterAttr === 'data-filter' ? 'currentFilter' : 'currentStatusFilter';
        manager[filterKey] = btn.getAttribute(filterAttr);
        manager.render();
      });
    });
  },

  formatTime: (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  },

  formatMinutes: (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  saveToStorage: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {}
  },

  loadFromStorage: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  },

  generateId: () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    } else {
      return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
  },

  debounce: (func, delay = 300) => {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  throttle: (func, limit = 300) => {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  escapeHtml: (text) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, char => map[char]);
  },

  showToast: (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white; padding: 12px 20px; border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000;
      animation: slideIn 0.3s ease-out; font-weight: 500;
    `;
    const existingToasts = document.querySelectorAll('.toast');
    let offset = 20;
    existingToasts.forEach(t => {
      offset += t.offsetHeight + 10;
    });
    toast.style.bottom = offset + 'px';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// Simple Event Bus for global events
const EventBus = {
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },
  emit(event, data) {
    (this.listeners[event] || []).forEach(callback => callback(data));
  }
};

// Base Manager Class to reduce repetition
class BaseManager {
  constructor(stateKey, emptyMessage = 'No items yet. Add one to get started!') {
    this.stateKey = stateKey;
    this.emptyMessage = emptyMessage;
    this.currentFilter = 'all';
    this.currentStatusFilter = 'all';
    this.containerId = null;
  }

  get items() { return AppState[this.stateKey]; }
  set items(value) { AppState[this.stateKey] = value; AppState.save(); }

  add(item) {
    item.id = Utils.generateId();
    item.createdAt = new Date().toISOString();
    this.items.push(item);
    AppState.save();
    this.render();
    EventBus.emit('dataChanged');
  }

  delete(id) {
    if (!confirm('Delete this item?')) return;
    this.items = this.items.filter(item => item.id !== id);
    this.render();
    EventBus.emit('dataChanged');
  }

  update(id, updates) {
    const item = this.items.find(item => item.id === id);
    if (item) {
      Object.assign(item, updates);
      AppState.save();
      this.render();
      EventBus.emit('dataChanged');
    }
  }

  render(containerId) {
    if (containerId) this.containerId = containerId;
    const id = this.containerId;
    const container = document.getElementById(id);
    if (!container) return;

    let items = this.items;
    if (this.currentFilter !== 'all') {
      items = this.filterItems(items);
    }

    if (items.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: #999; padding: 20px;">${this.emptyMessage}</div>`;
      return;
    }

    container.innerHTML = '';
    items.forEach(item => this.renderItem(item, container));
  }

  filterItems(items) { return items; }
  renderItem(item, container) {}
}

// TIME DISPLAY
function updateTime() {
  const now = new Date();
  const dateEl = document.getElementById('date');
  const timeEl = document.getElementById('time');
  if (!dateEl || !timeEl) return;

  const dateText = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const timeText = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  if (dateEl.textContent !== dateText) dateEl.textContent = dateText;
  if (timeEl.textContent !== timeText) timeEl.textContent = timeText;
}
setInterval(updateTime, 1000);
updateTime();

// STATE MANAGEMENT
const AppState = {
  habits: Utils.loadFromStorage('habits', []),
  expenses: Utils.loadFromStorage('expenses', []),
  todos: Utils.loadFromStorage('todos', []),
  bookmarks: Utils.loadFromStorage('bookmarks', []),
  projects: Utils.loadFromStorage('projects', []),
  notes: Utils.loadFromStorage('notes', []),
  favoriteQuotes: Utils.loadFromStorage('favoriteQuotes', []),
  focusSessionsCompleted: Utils.loadFromStorage('focusSessionsCompleted', 0),
  goals: Utils.loadFromStorage('goals', []),
  waterIntake: Utils.loadFromStorage('waterIntake', { cups: 0, dailyGoal: 8, lastReset: new Date().toDateString() }),
  timeTracking: Utils.loadFromStorage('timeTracking', []),
  readingList: Utils.loadFromStorage('readingList', []),
  importantDates: Utils.loadFromStorage('importantDates', []),

  save() {
    Object.keys(this).forEach(key => {
      if (key !== 'save') Utils.saveToStorage(key, this[key]);
    });
  }
};

// TO-DO LIST TRACKER
const TodoTracker = new class extends BaseManager {
  constructor() {
    super('todos', 'No tasks yet. Add one to get started!');
  }

  init() {
    const addBtn = document.getElementById('addTodo');
    const input = document.getElementById('todoInput');
    const filterBtns = document.querySelectorAll('.todo-filter-btn');
    const self = this;

    if (addBtn) {
      const throttledAdd = Utils.throttle(() => self.addTodo(), 300);
      addBtn.addEventListener('click', throttledAdd);
      input?.addEventListener('keypress', (e) => e.key === 'Enter' && throttledAdd());
    }

    Utils.setupFilterButtons(filterBtns, this);
    this.render('todoList');
  }

  addTodo() {
    const input = document.getElementById('todoInput');
    const prioritySelect = document.getElementById('todoPriority');
    const value = input?.value.trim();
    const priority = prioritySelect?.value || 'medium';

    if (!value) {
      Utils.showToast('Please enter a task', 'error');
      return;
    }

    this.add({ text: value, completed: false, priority });
    if (input) input.value = '';
    if (prioritySelect) prioritySelect.value = 'medium';
  }

  toggleTodo(id) {
    const todo = this.items.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      AppState.save();
      this.render();
      EventBus.emit('dataChanged');
    }
  }

  filterItems(items) {
    if (this.currentFilter === 'active') return items.filter(t => !t.completed);
    if (this.currentFilter === 'completed') return items.filter(t => t.completed);
    return items;
  }

  renderItem(todo, container) {
    const li = document.createElement('li');
    li.className = todo.completed ? 'completed' : '';
    li.setAttribute('data-todo-id', todo.id);

    li.innerHTML = `
      <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} />
      <span class="todo-text">${Utils.escapeHtml(todo.text)}</span>
      <span class="todo-priority ${todo.priority}">${todo.priority}</span>
      <button class="todo-delete" aria-label="Delete task">×</button>
    `;

    li.querySelector('.todo-checkbox').addEventListener('change', () => this.toggleTodo(todo.id));
    li.querySelector('.todo-delete').addEventListener('click', () => this.delete(todo.id));

    container.appendChild(li);
  }

  render() {
    super.render('todoList');
    this.updateStats();
  }

  updateStats() {
    const completed = this.items.filter(t => t.completed).length;
    const total = this.items.length;
    const countEl = document.getElementById('todoCount');
    if (countEl) countEl.textContent = `${completed} of ${total} completed`;
  }
}();

// BOOKMARK MANAGER
const BookmarkManager = new class extends BaseManager {
  constructor() {
    super('bookmarks', 'No bookmarks yet. Add one to get started!');
  }

  init() {
    const addBtn = document.getElementById('addBookmark');
    const urlInput = document.getElementById('bookmarkUrl');
    const self = this;

    if (addBtn) {
      const throttledAdd = Utils.throttle(() => self.addBookmark(), 300);
      addBtn.addEventListener('click', throttledAdd);
      urlInput?.addEventListener('keypress', (e) => e.key === 'Enter' && throttledAdd());
    }

    this.render('bookmarksList');
  }

  addBookmark() {
    const titleInput = document.getElementById('bookmarkTitle');
    const urlInput = document.getElementById('bookmarkUrl');
    const categorySelect = document.getElementById('bookmarkCategory');

    const title = titleInput?.value.trim();
    const url = urlInput?.value.trim();
    const category = categorySelect?.value;

    if (!title || !url) {
      Utils.showToast('Please enter both title and URL', 'error');
      return;
    }

    try { new URL(url); } catch (e) {
      Utils.showToast('Please enter a valid URL', 'error');
      return;
    }

    this.add({ title, url, category });
    if (titleInput) titleInput.value = '';
    if (urlInput) urlInput.value = '';
  }

  renderItem(bookmark, container) {
    const item = document.createElement('div');
    item.className = 'bookmark-item';
    const domain = new URL(bookmark.url).hostname;

    item.innerHTML = `
      <div class="bookmark-info">
        <div class="bookmark-title">${Utils.escapeHtml(bookmark.title)}</div>
        <a href="${Utils.escapeHtml(bookmark.url)}" target="_blank" class="bookmark-url">${domain}</a>
        <span class="bookmark-category">${bookmark.category}</span>
      </div>
      <div class="bookmark-actions">
        <button class="bookmark-action-btn" title="Open link" aria-label="Open link">🔗</button>
        <button class="bookmark-action-btn delete" title="Delete" aria-label="Delete bookmark">×</button>
      </div>
    `;

    const openBtn = item.querySelector('.bookmark-action-btn:not(.delete)');
    const deleteBtn = item.querySelector('.bookmark-action-btn.delete');
    const bookmarkId = bookmark.id;
    const self = this;

    if (openBtn) openBtn.addEventListener('click', () => window.open(bookmark.url, '_blank'));
    if (deleteBtn) deleteBtn.addEventListener('click', () => self.delete(bookmarkId));

    container.appendChild(item);
  }
}();

// PROJECT MANAGER
const ProjectManager = new class extends BaseManager {
  constructor() {
    super('projects', 'No projects yet. Create one to get started!');
  }

  init() {
    const addBtn = document.getElementById('addProject');
    const filterBtns = document.querySelectorAll('.project-filter-btn');

    if (addBtn) addBtn.addEventListener('click', () => this.addProject());
    Utils.setupFilterButtons(filterBtns, this, 'data-status');
    this.render('projectsList');
  }

  addProject() {
    const nameInput = document.getElementById('projectName');
    const descInput = document.getElementById('projectDesc');
    const statusSelect = document.getElementById('projectStatus');
    const deadlineInput = document.getElementById('projectDeadline');

    const name = nameInput?.value.trim();
    const description = descInput?.value.trim();
    const status = statusSelect?.value;
    const deadline = deadlineInput?.value;

    if (!name) {
      Utils.showToast('Please enter a project name', 'error');
      return;
    }

    this.add({ name, description, status, deadline, tasks: [], progress: 0 });
    nameInput.value = descInput.value = deadlineInput.value = '';
  }

  updateProjectStatus(id, newStatus) {
    this.update(id, { status: newStatus });
  }

  delete(id) {
    super.delete(id);
  }

  getDaysUntilDeadline(deadline) {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    const timeDiff = deadlineDate - today;
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  filterItems(items) {
    if (this.currentStatusFilter !== 'all') {
      return items.filter(p => p.status === this.currentStatusFilter);
    }
    return items.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });
  }

  renderItem(project, container) {
    const item = document.createElement('div');
    item.className = `project-card-item ${project.status.toLowerCase().replace(' ', '-')}`;

    const daysLeft = this.getDaysUntilDeadline(project.deadline);
    const deadlineText = project.deadline
      ? `📅 ${new Date(project.deadline).toLocaleDateString()} (${daysLeft > 0 ? daysLeft + ' days left' : daysLeft === 0 ? 'Due today' : 'Overdue'})`
      : '';

    item.innerHTML = `
      <div class="project-header">
        <div class="project-title">${Utils.escapeHtml(project.name)}</div>
        <span class="project-status-badge ${project.status.toLowerCase().replace(' ', '-')}">${project.status}</span>
      </div>
      ${project.description ? `<div class="project-description">${Utils.escapeHtml(project.description)}</div>` : ''}
      ${project.deadline ? `<div class="project-deadline">${deadlineText}</div>` : ''}
      <div class="project-actions">
        <select class="project-action-btn status-select">
          <option value="Planning" ${project.status === 'Planning' ? 'selected' : ''}>Planning</option>
          <option value="In Progress" ${project.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="On Hold" ${project.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
          <option value="Completed" ${project.status === 'Completed' ? 'selected' : ''}>Completed</option>
        </select>
        <button class="project-action-btn delete" aria-label="Delete project">Delete</button>
      </div>
    `;

    const self = this;
    const projectId = project.id;
    const statusSelect = item.querySelector('.status-select');
    const deleteBtn = item.querySelector('.project-action-btn.delete');

    statusSelect.addEventListener('change', (e) => self.updateProjectStatus(projectId, e.target.value));
    deleteBtn.addEventListener('click', () => self.delete(projectId));

    container.appendChild(item);
  }
}();

// NOTES MANAGER
const NotesManager = new class extends BaseManager {
  constructor() {
    super('notes', 'No notes yet. Create one to get started!');
  }

  init() {
    const addBtn = document.getElementById('addNote');
    const contentInput = document.getElementById('noteContent');

    if (addBtn) {
      addBtn.addEventListener('click', () => this.addNote());
      contentInput?.addEventListener('keypress', (e) => e.key === 'Enter' && e.ctrlKey && this.addNote());
    }

    this.render('notesList');
  }

  addNote() {
    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteContent');

    const title = titleInput?.value.trim();
    const content = contentInput?.value.trim();

    if (!title && !content) {
      Utils.showToast('Please enter a title or content', 'warning');
      return;
    }

    const newNote = {
      id: Utils.generateId(),
      title: title || 'Untitled Note',
      content,
      createdAt: new Date().toISOString()
    };
    this.items = [newNote, ...this.items];
    if (titleInput) titleInput.value = '';
    if (contentInput) contentInput.value = '';
    Utils.showToast('Note saved successfully!', 'success');
    this.render('notesList');
    EventBus.emit('dataChanged');
  }

  delete(id) {
    super.delete(id);
    Utils.showToast('Note deleted', 'info');
  }

  renderItem(note, container) {
    const item = document.createElement('div');
    item.className = 'note-item';
    const noteId = note.id;

    const date = new Date(note.createdAt);
    const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    item.innerHTML = `
      <div class="note-title">${Utils.escapeHtml(note.title)}</div>
      <div class="note-content">${Utils.escapeHtml(note.content)}</div>
      <div class="note-time">${timeStr}</div>
      <div class="note-actions">
        <button class="note-delete">Delete</button>
      </div>
    `;

    const deleteBtn = item.querySelector('.note-delete');
    if (deleteBtn) deleteBtn.addEventListener('click', () => this.delete(noteId));
    container.appendChild(item);
  }
}();

// QUOTES MANAGER
const QuotesManager = {
  quotes: [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Success is not final, failure is not fatal.", author: "Winston Churchill" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
    { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { text: "Your limitation—it's only your imagination.", author: "Unknown" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
    { text: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.", author: "Unknown" },
    { text: "The key to success is to focus on goals, not obstacles.", author: "Unknown" }
  ],

  currentQuote: null,

  init() {
    const newQuoteBtn = document.getElementById('newQuoteBtn');
    const favoriteBtn = document.getElementById('favoriteQuoteBtn');

    if (newQuoteBtn) newQuoteBtn.addEventListener('click', () => this.displayNewQuote());
    if (favoriteBtn) favoriteBtn.addEventListener('click', () => this.addToFavorites());

    this.displayNewQuote();
    this.renderFavorites();
  },

  displayNewQuote() {
    this.currentQuote = this.quotes[Math.floor(Math.random() * this.quotes.length)];

    const textEl = document.getElementById('quoteText');
    const authorEl = document.getElementById('quoteAuthor');

    if (textEl) textEl.textContent = `"${this.currentQuote.text}"`;
    if (authorEl) authorEl.textContent = this.currentQuote.author;
  },

  addToFavorites() {
    if (!this.currentQuote) return;

    const exists = AppState.favoriteQuotes.some(q => q.text === this.currentQuote.text);
    if (exists) {
      Utils.showToast('Already in favorites!', 'warning');
      return;
    }

    AppState.favoriteQuotes.push({
      id: Utils.generateId(),
      ...this.currentQuote
    });
    AppState.save();
    Utils.showToast('Added to favorites!', 'success');
    this.renderFavorites();
  },

  removeFromFavorites(quoteId) {
    AppState.favoriteQuotes = AppState.favoriteQuotes.filter(q => q.id !== quoteId);
    AppState.save();
    this.renderFavorites();
  },

  renderFavorites() {
    const container = document.getElementById('favoriteQuotes');
    if (!container) return;

    container.innerHTML = '';
    if (AppState.favoriteQuotes.length === 0) {
      const empty = document.createElement('p');
      empty.style.cssText = 'text-align: center; color: #999; font-size: 12px; margin: 10px 0;';
      empty.textContent = 'No favorite quotes yet';
      container.appendChild(empty);
      return;
    }

    AppState.favoriteQuotes.forEach(quote => {
      const item = document.createElement('div');
      item.className = 'favorite-quote-item';
      item.innerHTML = `
        <span>${Utils.escapeHtml(quote.text)}</span>
        <button aria-label="Remove from favorites">✕</button>
      `;
      item.querySelector('button').addEventListener('click', () => this.removeFromFavorites(quote.id));
      container.appendChild(item);
    });
  }
};

// QUICK STATS UPDATER
const QuickStats = {
  update() {
    this.updateProductivityScore();
    this.updateFocusTime();
    this.updateStreak();
  },

  updateProductivityScore() {
    const totalTodos = AppState.todos.length;
    const completedTodos = AppState.todos.filter(t => t.completed).length;
    const totalHabits = AppState.habits.length;
    const completedHabits = AppState.habits.filter(h => (h.count || 0) > 0).length;

    const total = (totalTodos > 0 ? completedTodos / totalTodos : 0) +
                  (totalHabits > 0 ? completedHabits / totalHabits : 0);
    const score = Math.round((total / 2) * 100);

    const el = document.getElementById('productivityScore');
    if (el) el.textContent = Math.max(0, Math.min(100, score)) + '%';
  },

  updateFocusTime() {
    const focusSessions = AppState.focusSessionsCompleted;
    const focusMinutes = focusSessions * 25;

    const el = document.getElementById('focusTime');
    if (el) el.textContent = focusMinutes > 60
      ? Math.floor(focusMinutes / 60) + 'h ' + (focusMinutes % 60) + 'm'
      : focusMinutes + 'm';
  },

  updateStreak() {
    const habits = AppState.habits;
    const streak = habits.length > 0
      ? Math.max(...habits.map(h => (h.count || 0)))
      : 0;

    const el = document.getElementById('currentStreak');
    if (el) el.textContent = streak;
  }
};

// EXPENSE TRACKER
const ExpenseTracker = {
  chartInstance: null,

  init() {
    const addBtn = document.getElementById('addExpense');
    const clearBtn = document.getElementById('clearExpenses');
    const amountInput = document.getElementById('expenseAmount');

    if (addBtn) {
      const throttledAddExpense = Utils.throttle(() => this.addExpense(), 300);
      addBtn.addEventListener('click', throttledAddExpense);
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAllExpenses());
    }
    if (amountInput) {
      amountInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.addExpense();
      });
    }
    this.render();
  },

  addExpense() {
    const nameInput = document.getElementById('expenseName');
    const amountInput = document.getElementById('expenseAmount');
    const categorySelect = document.getElementById('expenseCategory');

    const name = nameInput?.value.trim();
    const amountStr = amountInput?.value.trim();
    const amount = amountStr ? parseFloat(amountStr) : NaN;
    const category = categorySelect?.value;

    if (!name || isNaN(amount) || amount <= 0) {
      Utils.showToast('Please enter valid expense details', 'error');
      return;
    }

    const expense = {
      id: Utils.generateId(),
      name,
      amount: Math.round(amount * 100) / 100,
      category,
      date: new Date().toISOString()
    };

    AppState.expenses.push(expense);
    AppState.save();

    if (nameInput) nameInput.value = '';
    if (amountInput) amountInput.value = '';

    this.render();
    EventBus.emit('dataChanged');
  },

  deleteExpense(expenseId) {
    if (!confirm('Delete this expense?')) return;
    AppState.expenses = AppState.expenses.filter(e => e.id !== expenseId);
    AppState.save();
    this.render();
    EventBus.emit('dataChanged');
  },

  clearAllExpenses() {
    if (confirm('Are you sure? This cannot be undone.')) {
      AppState.expenses = [];
      AppState.save();
      this.render();
      EventBus.emit('dataChanged');
    }
  },

  render() {
    this.updateTotal();
    this.renderChart();
  },

  updateTotal() {
    const total = AppState.expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalEl = document.getElementById('totalExpense');
    if (totalEl) {
      totalEl.textContent = `₹${total.toLocaleString('en-IN', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      })}`;
    }
  },

  renderChart() {
    const canvas = document.getElementById('expenseChart');
    if (!canvas) return;
    const categories = {};
    AppState.expenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });

    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(categories).length > 0 ? Object.keys(categories) : ['No expenses'],
        datasets: [{
          data: Object.values(categories).length > 0 ? Object.values(categories) : [1],
          backgroundColor: ['#4f8cff', '#ff7a18', '#34d399', '#f43f5e', '#fbbf24', '#6a5bff'],
          borderColor: 'var(--card)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: 'var(--muted)', font: { size: 12 } }
          }
        }
      }
    });
  }
};

// POMODORO TIMER
const PomodoroTimer = {
  totalSeconds: 0,
  remainingSeconds: 0,
  timerInterval: null,
  isRunning: false,
  isWorkSession: true,

  init() {
    const startBtn = document.getElementById('startPomo');
    const pauseBtn = document.getElementById('pausePomo');
    const resetBtn = document.getElementById('resetPomo');
    const workDurationInput = document.getElementById('workDuration');
    const breakDurationInput = document.getElementById('breakDuration');

    if (startBtn) startBtn.addEventListener('click', () => this.start());
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.pause());
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());

    if (workDurationInput) {
      workDurationInput.addEventListener('change', () => {
        if (!this.isRunning) this.reset();
      });
    }
    if (breakDurationInput) {
      breakDurationInput.addEventListener('change', () => {
        if (!this.isRunning) this.reset();
      });
    }

    this.reset();
  },

  getWorkDuration() {
    const input = document.getElementById('workDuration');
    return (input?.value || 25) * 60;
  },

  getBreakDuration() {
    const input = document.getElementById('breakDuration');
    return (input?.value || 5) * 60;
  },

  start() {
    if (this.isRunning) return;
    if (this.remainingSeconds === 0) {
      this.reset();
    }
    this.isRunning = true;
    this.updateUI();
    this.timerInterval = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.updateDisplay();
        if (this.remainingSeconds === 0) {
          this.switchSession();
        }
      }
    }, 1000);
  },

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.timerInterval);
    this.updateUI();
  },

  reset() {
    clearInterval(this.timerInterval);
    this.isRunning = false;
    this.isWorkSession = true;
    this.totalSeconds = this.getWorkDuration();
    this.remainingSeconds = this.totalSeconds;
    const statusEl = document.getElementById('pomoStatus');
    if (statusEl) statusEl.textContent = 'Ready to focus';
    this.updateDisplay();
    this.updateUI();
  },

  switchSession() {
    this.isWorkSession = !this.isWorkSession;
    this.totalSeconds = this.isWorkSession ? this.getWorkDuration() : this.getBreakDuration();
    this.remainingSeconds = this.totalSeconds;

    const statusEl = document.getElementById('pomoStatus');
    if (statusEl) {
      statusEl.textContent = this.isWorkSession ? '💪 Work Time!' : '☕ Break Time!';
    }

    if (!this.isWorkSession) {
      AppState.focusSessionsCompleted++;
      AppState.save();
      Utils.showToast('Great work! Focus session completed! 🎉', 'success');
      EventBus.emit('dataChanged');
    }

    this.playNotification();
    this.start();
  },

  playNotification() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {}
  },

  updateDisplay() {
    const timeEl = document.getElementById('pomoTime');
    if (timeEl) {
      timeEl.textContent = Utils.formatMinutes(this.remainingSeconds);
    }
  },

  updateUI() {
    const startBtn = document.getElementById('startPomo');
    const pauseBtn = document.getElementById('pausePomo');
    if (startBtn) startBtn.disabled = this.isRunning;
    if (pauseBtn) pauseBtn.disabled = !this.isRunning;
  }
};

// ANALYTICS
const Analytics = {
  init() {
    this.updateAllStats();
  },

  updateAllStats() {
    this.updateTaskStats();
    this.updateExpenseStats();
    this.updateHabitStats();
    this.updateProjectStats();
  },

  updateTaskStats() {
    const totalTasks = AppState.todos.length;
    const completedTasks = AppState.todos.filter(t => t.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    document.getElementById('totalTasksCount').textContent = totalTasks;
    document.getElementById('completedTasksCount').textContent = completedTasks;
    document.getElementById('taskCompletionRate').textContent = completionRate + '%';

    const progressFill = document.getElementById('taskProgressFill');
    if (progressFill) {
      progressFill.style.width = completionRate + '%';
    }
  },

  updateExpenseStats() {
    const total = AppState.expenses.reduce((sum, e) => sum + e.amount, 0);
    const avgPerDay = AppState.expenses.length > 0 ? (total / 30).toFixed(2) : 0;

    const categories = new Set();
    AppState.expenses.forEach(e => categories.add(e.category));

    document.getElementById('totalSpent').textContent = '₹' + total.toLocaleString('en-IN', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
    document.getElementById('avgExpense').textContent = '₹' + parseFloat(avgPerDay).toLocaleString('en-IN', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
    document.getElementById('categoryCount').textContent = categories.size;
  },

  updateHabitStats() {
    const totalHabits = AppState.habits.length;
    const longestStreak = AppState.habits.length > 0
      ? Math.max(...AppState.habits.map(h => (h.count || 0)))
      : 0;
    const totalDays = AppState.habits.reduce((sum, h) => sum + (h.count || 0), 0);

    document.getElementById('totalHabits').textContent = totalHabits;
    document.getElementById('longestStreak').textContent = longestStreak + ' days';
    document.getElementById('totalHabitDays').textContent = totalDays;
  },

  updateProjectStats() {
    const planning = AppState.projects.filter(p => p.status === 'Planning').length;
    const inProgress = AppState.projects.filter(p => p.status === 'In Progress').length;
    const onHold = AppState.projects.filter(p => p.status === 'On Hold').length;
    const completed = AppState.projects.filter(p => p.status === 'Completed').length;

    document.getElementById('planningCount').textContent = planning;
    document.getElementById('inProgressCount').textContent = inProgress;
    document.getElementById('onHoldCount').textContent = onHold;
    document.getElementById('completedCount').textContent = completed;
  }
};

// TAB NAVIGATION
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  const switchTab = (tabName) => {
    tabContents.forEach(content => content.classList.remove('active'));
    tabButtons.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    });

    const tabToShow = document.getElementById(`${tabName}-tab`);
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabToShow) tabToShow.classList.add('active');
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.setAttribute('aria-selected', 'true');
      activeBtn.focus();
    }
  };

  tabButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      switchTab(tabName);
    });

    button.addEventListener('keydown', (e) => {
      let nextIndex;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextIndex = (index + 1) % tabButtons.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = tabButtons.length - 1;
      }

      if (nextIndex !== undefined) {
        const nextTabName = tabButtons[nextIndex].getAttribute('data-tab');
        switchTab(nextTabName);
      }
    });
  });
}

// DAILY GOALS MANAGER
const GoalsTracker = {
  state: { goals: [] },

  init() {
    this.state.goals = Utils.loadFromStorage('goals', []);
    const addGoalBtn = document.getElementById('addGoal');
    const goalInput = document.getElementById('goalInput');

    if (addGoalBtn) addGoalBtn.addEventListener('click', () => this.addGoal());
    if (goalInput) goalInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addGoal();
    });
    this.render();
  },

  addGoal() {
    const input = document.getElementById('goalInput');
    if (!input || !input.value.trim()) {
      Utils.showToast('Please enter a goal', 'error');
      return;
    }
    this.state.goals.push({
      id: Utils.generateId(),
      text: input.value.trim(),
      completed: false,
      date: new Date().toDateString()
    });
    input.value = '';
    this.save();
    this.render();
  },

  toggleGoal(id) {
    const goal = this.state.goals.find(g => g.id === id);
    if (goal) {
      goal.completed = !goal.completed;
      this.save();
      this.render();
    }
  },

  deleteGoal(id) {
    if (!confirm('Delete this goal?')) return;
    this.state.goals = this.state.goals.filter(g => g.id !== id);
    this.save();
    this.render();
  },

  render() {
    const goalsList = document.getElementById('goalsList');
    if (this.state.goals.length === 0) {
      goalsList.innerHTML = '<li style="color: var(--muted); text-align: center; padding: 20px;">No goals yet. Add one to get started! 🎯</li>';
    } else {
      const self = this;
      goalsList.innerHTML = '';
      this.state.goals.forEach(goal => {
        const li = document.createElement('li');
        li.className = `goal-item ${goal.completed ? 'completed' : ''}`;
        li.innerHTML = `
          <input type="checkbox" ${goal.completed ? 'checked' : ''}>
          <span>${Utils.escapeHtml(goal.text)}</span>
          <button class="btn-danger" style="width: auto; padding: 4px 8px; font-size: 11px; margin-left: auto;" aria-label="Delete goal">×</button>
        `;
        const checkbox = li.querySelector('input');
        const deleteBtn = li.querySelector('.btn-danger');
        checkbox.addEventListener('change', () => self.toggleGoal(goal.id));
        deleteBtn.addEventListener('click', () => self.deleteGoal(goal.id));
        goalsList.appendChild(li);
      });
    }
    this.updateProgress();
  },

  updateProgress() {
    const completed = this.state.goals.filter(g => g.completed).length;
    const total = this.state.goals.length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    document.getElementById('goalsProgressBar').style.width = percentage + '%';
    document.getElementById('goalsPercentage').textContent = percentage + '%';
  },

  save() {
    Utils.saveToStorage('goals', this.state.goals);
  }
};

// WATER TRACKER
const WaterTracker = {
  state: { cups: 0, dailyGoal: 8, lastReset: new Date().toDateString() },

  init() {
    this.state = Utils.loadFromStorage('waterIntake', { cups: 0, dailyGoal: 8, lastReset: new Date().toDateString() });
    if (this.state.lastReset !== new Date().toDateString()) {
      this.state.cups = 0;
      this.state.lastReset = new Date().toDateString();
      this.save();
    }

    const addWaterBtn = document.getElementById('addWater');
    const resetWaterBtn = document.getElementById('resetWater');

    if (addWaterBtn) addWaterBtn.addEventListener('click', () => this.addWater());
    if (resetWaterBtn) resetWaterBtn.addEventListener('click', () => this.reset());
    this.render();
  },

  addWater() {
    if (this.state.cups < this.state.dailyGoal) {
      this.state.cups++;
      this.save();
      this.render();
      if (this.state.cups === this.state.dailyGoal) {
        Utils.showToast('Great! You\'ve reached your daily water goal! 💧', 'success');
      }
    }
  },

  reset() {
    this.state.cups = 0;
    this.save();
    this.render();
  },

  render() {
    document.getElementById('waterCups').textContent = this.state.cups;
    const percentage = (this.state.cups / this.state.dailyGoal) * 100;
    document.getElementById('waterProgressBar').style.width = percentage + '%';
  },

  save() {
    Utils.saveToStorage('waterIntake', this.state);
  }
};

// TIME TRACKER
const TimeTracker = {
  state: { currentActivity: null, startTime: null, activities: [], timerInterval: null },

  init() {
    this.state.activities = Utils.loadFromStorage('timeTracking', []);
    const startActivityBtn = document.getElementById('startActivity');
    const stopActivityBtn = document.getElementById('stopActivity');
    const activityInput = document.getElementById('activityInput');

    if (startActivityBtn) startActivityBtn.addEventListener('click', () => this.startActivity());
    if (stopActivityBtn) stopActivityBtn.addEventListener('click', () => this.stopActivity());
    if (activityInput) activityInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.startActivity();
    });
    this.render();
  },

  startActivity() {
    const input = document.getElementById('activityInput');
    if (!input.value.trim()) {
      Utils.showToast('Please enter an activity name', 'error');
      return;
    }
    if (this.state.currentActivity) {
      Utils.showToast('Stop current activity first', 'error');
      return;
    }
    this.state.currentActivity = input.value;
    this.state.startTime = Date.now();
    input.value = '';
    document.getElementById('stopActivity').style.display = 'block';
    this.startTimer();
    this.render();
  },

  stopActivity() {
    if (!this.state.currentActivity) return;
    const duration = Math.floor((Date.now() - this.state.startTime) / 1000);
    this.state.activities.unshift({
      id: Utils.generateId(),
      name: this.state.currentActivity,
      duration: duration,
      time: new Date().toLocaleTimeString()
    });
    this.state.currentActivity = null;
    this.state.startTime = null;
    clearInterval(this.state.timerInterval);
    document.getElementById('stopActivity').style.display = 'none';
    this.save();
    this.render();
  },

  startTimer() {
    clearInterval(this.state.timerInterval);
    this.state.timerInterval = setInterval(() => {
      if (this.state.currentActivity && this.state.startTime) {
        const elapsed = Math.floor((Date.now() - this.state.startTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        document.getElementById('timerTime').textContent =
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
    }, 1000);
  },

  render() {
    document.getElementById('currentActivity').textContent = this.state.currentActivity || 'No activity';
    const list = document.getElementById('activitiesList');
    if (this.state.activities.length === 0) {
      list.innerHTML = '<li style="color: var(--muted); padding: 10px; text-align: center;">No activities tracked yet</li>';
    } else {
      list.innerHTML = this.state.activities.slice(0, 5).map(activity => `
        <li class="activity-item">
          <span>${Utils.escapeHtml(activity.name)}</span>
          <span class="activity-time">${Math.floor(activity.duration / 60)}m ${activity.duration % 60}s</span>
        </li>
      `).join('');
    }
  },

  save() {
    Utils.saveToStorage('timeTracking', this.state.activities);
  }
};

// READING LIST
const ReadingList = {
  state: { books: [] },

  init() {
    this.state.books = Utils.loadFromStorage('books', []);
    const addBookBtn = document.getElementById('addBook');
    if (addBookBtn) addBookBtn.addEventListener('click', () => this.addBook());
    this.render();
  },

  addBook() {
    const titleInput = document.getElementById('bookTitle');
    const authorInput = document.getElementById('bookAuthor');

    if (!titleInput) return;

    const title = titleInput.value.trim();
    const author = authorInput?.value.trim() || '';

    if (!title) {
      Utils.showToast('Please enter book title', 'error');
      return;
    }
    this.state.books.push({
      id: Utils.generateId(),
      title: title,
      author: author,
      progress: 0
    });
    titleInput.value = '';
    if (authorInput) authorInput.value = '';
    this.save();
    this.render();
    Utils.showToast('Book added to reading list! 📚', 'success');
  },

  deleteBook(id) {
    if (!confirm('Remove this book?')) return;
    this.state.books = this.state.books.filter(b => b.id !== id);
    this.save();
    this.render();
  },

  updateProgress(id, progress) {
    const book = this.state.books.find(b => b.id === id);
    if (book) {
      book.progress = Math.min(100, Math.max(0, parseInt(progress)));
      this.save();
      this.render();
    }
  },

  render() {
    const list = document.getElementById('booksList');
    if (this.state.books.length === 0) {
      list.innerHTML = '<li style="color: var(--muted); text-align: center; padding: 20px;">No books yet. Start reading! 📚</li>';
    } else {
      const self = this;
      list.innerHTML = '';
      this.state.books.forEach(book => {
        const li = document.createElement('li');
        li.className = 'book-item';
        li.innerHTML = `
          <div class="book-title">${Utils.escapeHtml(book.title)}</div>
          <div class="book-author">by ${Utils.escapeHtml(book.author || 'Unknown')}</div>
          <div class="book-progress-wrapper">
            <input type="number" min="0" max="100" value="${book.progress}" placeholder="Progress %" aria-label="Book progress">
            <button class="btn-danger" aria-label="Remove book">Remove</button>
          </div>
        `;
        const progressInput = li.querySelector('input[type="number"]');
        const deleteBtn = li.querySelector('.btn-danger');
        progressInput.addEventListener('change', () => self.updateProgress(book.id, progressInput.value));
        deleteBtn.addEventListener('click', () => self.deleteBook(book.id));
        list.appendChild(li);
      });
    }
  },

  save() {
    Utils.saveToStorage('books', this.state.books);
  }
};

// IMPORTANT DATES REMINDER
const DatesReminder = {
  state: { dates: [] },

  init() {
    this.state.dates = Utils.loadFromStorage('importantDates', []);
    const addDateBtn = document.getElementById('addDate');
    if (addDateBtn) addDateBtn.addEventListener('click', () => this.addDate());
    this.render();
  },

  addDate() {
    const nameInput = document.getElementById('dateName');
    const dateInput = document.getElementById('dateInput');

    if (!nameInput || !dateInput) return;

    const name = nameInput.value.trim();
    const date = dateInput.value;

    if (!name || !date) {
      Utils.showToast('Please enter event name and date', 'error');
      return;
    }
    this.state.dates.push({
      id: Utils.generateId(),
      name: name,
      date: date
    });
    nameInput.value = '';
    dateInput.value = '';
    this.save();
    this.render();
    Utils.showToast('Important date added! 📅', 'success');
  },

  deleteDate(id) {
    if (!confirm('Delete this date?')) return;
    this.state.dates = this.state.dates.filter(d => d.id !== id);
    this.save();
    this.render();
  },

  getDaysUntil(dateString) {
    const today = new Date();
    const eventDate = new Date(dateString);
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    const diff = eventDate - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },

  render() {
    const list = document.getElementById('datesList');
    const sorted = [...this.state.dates].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sorted.length === 0) {
      list.innerHTML = '<li style="color: var(--muted); text-align: center; padding: 20px;">No important dates yet</li>';
    } else {
      const self = this;
      list.innerHTML = '';
      sorted.forEach(item => {
        const days = this.getDaysUntil(item.date);
        const countdownText = days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? 'Today!' : `${days} days away`;
        const li = document.createElement('li');
        li.className = 'date-item';
        li.innerHTML = `
          <div class="date-info">
            <div class="date-name">${Utils.escapeHtml(item.name)}</div>
            <div class="date-countdown">${countdownText}</div>
          </div>
          <div class="date-actions">
            <button aria-label="Remove date">Remove</button>
          </div>
        `;
        const deleteBtn = li.querySelector('button');
        deleteBtn.addEventListener('click', () => self.deleteDate(item.id));
        list.appendChild(li);
      });
    }
  },

  save() {
    Utils.saveToStorage('importantDates', this.state.dates);
  }
};

// THEME TOGGLE
function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  const html = document.documentElement;

  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    html.setAttribute('data-theme', 'light');
    themeToggle.textContent = '🌙';
  } else {
    html.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
  }

  themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme') || 'dark';
    if (currentTheme === 'dark') {
      html.setAttribute('data-theme', 'light');
      themeToggle.textContent = '🌙';
      localStorage.setItem('theme', 'light');
    } else {
      html.setAttribute('data-theme', 'dark');
      themeToggle.textContent = '☀️';
      localStorage.setItem('theme', 'dark');
    }
  });
}

// WEATHER MANAGER (unchanged core functionality)
const WeatherManager = {
  baseUrl: 'https://geocoding-api.open-meteo.com/v1/search',
  weatherUrl: 'https://api.open-meteo.com/v1/forecast',

  init() {
    const searchBtn = document.getElementById('searchWeather');
    const cityInput = document.getElementById('weatherCity');

    if (!searchBtn || !cityInput) return;

    searchBtn.addEventListener('click', () => this.searchCity(cityInput.value));
    cityInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.searchCity(cityInput.value);
    });

    this.getWeatherByCoords();
  },

  getWeatherByCoords() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.fetchWeatherByCoords(latitude, longitude);
        },
        () => {
          this.searchCity('New York');
        }
      );
    } else {
      this.searchCity('New York');
    }
  },

  searchCity(city) {
    if (!city.trim()) {
      Utils.showToast('Please enter a city name', 'error');
      return;
    }

    const weatherContent = document.getElementById('weatherContent');
    weatherContent.innerHTML = '<p class="weather-loading">🔄 Searching for city...</p>';

    fetch(`${this.baseUrl}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`)
      .then(response => {
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (!data.results || data.results.length === 0) {
          throw new Error('City not found');
        }
        const result = data.results[0];
        this.fetchWeatherByCoords(result.latitude, result.longitude, result.name, result.country);
      })
      .catch(error => {
        Utils.showToast('City not found', 'error');
        weatherContent.innerHTML = '<p class="weather-error">❌ Unable to find city</p>';
      });
  },

  fetchWeatherByCoords(lat, lon, cityName = null, country = null) {
    fetch(`${this.weatherUrl}?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`)
      .then(response => {
        if (!response.ok) throw new Error(`Weather API Error: ${response.status}`);
        return response.json();
      })
      .then(data => {
        const weatherContent = document.getElementById('weatherContent');
        const locationEl = document.getElementById('weatherLocation');
        
        if (cityName && country) {
          locationEl.textContent = `📍 ${cityName}, ${country}`;
        }
        
        const todayCode = data.daily.weathercode[0];
        const todayDesc = this.getWeatherDescription(todayCode);
        const todayTempMax = data.daily.temperature_2m_max[0];
        const todayTempMin = data.daily.temperature_2m_min[0];
        
        document.getElementById('weatherIcon').textContent = todayDesc.icon;
        document.getElementById('weatherDesc').textContent = todayDesc.text;
        document.getElementById('weatherTemp').textContent = `${todayTempMax.toFixed(1)}° / ${todayTempMin.toFixed(1)}°`;
        
        this.renderForecast(data.daily);
        Utils.showToast('Weather loaded successfully', 'success');
      })
      .catch(error => {
        Utils.showToast('Unable to fetch weather data', 'error');
        document.getElementById('weatherContent').innerHTML = '<p class="weather-error">❌ Failed to load weather</p>';
      });
  },

  renderForecast(daily) {
    const forecastContainer = document.getElementById('forecastContainer');
    if (!forecastContainer) return;
    
    forecastContainer.innerHTML = '';
    const limit = Math.min(5, daily.time.length);
    
    for (let i = 1; i <= limit; i++) {
      const date = new Date(daily.time[i]);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const code = daily.weathercode[i];
      const desc = this.getWeatherDescription(code);
      const maxTemp = daily.temperature_2m_max[i];
      const minTemp = daily.temperature_2m_min[i];
      
      const forecastItem = document.createElement('div');
      forecastItem.className = 'forecast-day';
      forecastItem.innerHTML = `
        <div class="forecast-date">${dayName}</div>
        <span class="forecast-icon">${desc.icon}</span>
        <div class="forecast-temp">${maxTemp.toFixed(0)}°</div>
        <div class="forecast-desc">${desc.text}</div>
      `;
      forecastContainer.appendChild(forecastItem);
    }
  },

  getWeatherDescription(code) {
    const weatherMap = {
      0: { icon: '☀️', text: 'Sunny' },
      1: { icon: '🌤️', text: 'Partly cloudy' },
      2: { icon: '⛅', text: 'Cloudy' },
      3: { icon: '☁️', text: 'Overcast' },
      45: { icon: '🌫️', text: 'Fog' },
      48: { icon: '🌫️', text: 'Fog' },
      51: { icon: '🌦️', text: 'Drizzle' },
      53: { icon: '🌦️', text: 'Drizzle' },
      55: { icon: '🌦️', text: 'Drizzle' },
      61: { icon: '🌧️', text: 'Rain' },
      63: { icon: '🌧️', text: 'Rain' },
      65: { icon: '🌧️', text: 'Rain' },
      71: { icon: '🌨️', text: 'Snow' },
      73: { icon: '🌨️', text: 'Snow' },
      75: { icon: '🌨️', text: 'Snow' },
      80: { icon: '🌦️', text: 'Showers' },
      81: { icon: '🌧️', text: 'Showers' },
      95: { icon: '⛈️', text: 'Storm' },
      99: { icon: '🌩️', text: 'Storm' },
    };
    return weatherMap[code] || { icon: '❓', text: 'Unknown' };
  }
};

document.addEventListener('DOMContentLoaded', () => {
  TodoTracker.init();
  ExpenseTracker.init();
  PomodoroTimer.init();
  BookmarkManager.init();
  ProjectManager.init();
  NotesManager.init();
  QuotesManager.init();
  Analytics.init();
  QuickStats.update();
  WeatherManager.init();
  GoalsTracker.init();
  WaterTracker.init();
  TimeTracker.init();
  ReadingList.init();
  DatesReminder.init();
  setupTabNavigation();
  setupThemeToggle();

  const updateAnalytics = () => {
    Analytics.updateAllStats();
    QuickStats.update();
  };
  EventBus.on('dataChanged', updateAnalytics);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        return;
      }
      if (active) active.blur();
    }
  });
});
