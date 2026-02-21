document.addEventListener('DOMContentLoaded', () => {
  const taskListEl = document.querySelector('.task-list');
  const deadlineListEl = document.querySelector('.deadline-list');
  const progressBarEl = document.querySelector('.progress-bar');
  const progressTextEl = document.querySelector('.progress-text');

  function getCurrentUserSafe() {
    // Try to extract stable id from currentUser object; fall back to email or raw string
    const raw = localStorage.getItem('currentUser') || 'default_user';
    if (typeof getCurrentUser === 'function') return getCurrentUser();
    try {
      const obj = JSON.parse(raw);
      if (obj && (obj.id || obj.uid)) return obj.id || obj.uid;
      if (obj && obj.email) return obj.email;
    } catch (e) {}
    return raw;
  }

  function getStoredTasks() {
    try {
      if (typeof getTasksByUser === 'function') {
        return getTasksByUser(getCurrentUserSafe()) || [];
      }
      const user = getCurrentUserSafe();
      const key = `calendarTasks_${user}`;
      const raw = localStorage.getItem(key) || localStorage.getItem('calendarTasks');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Failed to parse tasks from storage', e);
      return [];
    }
  }

  function saveTasks(tasks) {
    try {
      if (typeof getCurrentUser === 'function') {
        const user = getCurrentUserSafe();
        const key = `calendarTasks_${user}`;
        localStorage.setItem(key, JSON.stringify(tasks));
        return;
      }
      localStorage.setItem('calendarTasks', JSON.stringify(tasks));
    } catch (e) {
      console.warn('Failed to save tasks', e);
    }
  }

  function ensureSampleTasks() {
    return getStoredTasks() || [];
  }

  function formatDate(dStr) {
    if (!dStr) return '';
    const d = new Date(dStr + 'T00:00:00');
    return d.toLocaleDateString();
  }

  function isCompleted(task) {
    if (!task) return false;
    if (task.completed) return true;
    const s = task.status || task.Status || '';
    return String(s).toLowerCase() === 'completed';
  }

  function render() {
    const tasks = getStoredTasks() || ensureSampleTasks();
    const total = tasks.length;
    const completed = tasks.filter(isCompleted).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    if (progressBarEl) progressBarEl.style.width = percent + '%';
    if (progressTextEl) progressTextEl.textContent = `${percent}% Completed (${completed}/${total})`;

    const todayIso = new Date().toISOString().slice(0, 10);

    // Today's tasks
    if (taskListEl) {
      taskListEl.innerHTML = '';
      const todays = tasks.filter(t => t.dueDate === todayIso);
      if (todays.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No tasks for today';
        taskListEl.appendChild(li);
      } else {
        todays.forEach(t => {
          const li = document.createElement('li');
          const titleSpan = document.createElement('span');
          titleSpan.textContent = t.title;
          li.appendChild(titleSpan);
          const statusText = t.status || t.Status || (isCompleted(t) ? 'Completed' : 'Pending');
          const statusSpan = document.createElement('span');
          statusSpan.className = 'task-status';
          statusSpan.textContent = ' (' + statusText + ')';
          li.appendChild(statusSpan);
          taskListEl.appendChild(li);
        });
      }
    }

    // Upcoming tasks
    if (deadlineListEl) {
      deadlineListEl.innerHTML = '';
      const upcoming = tasks
        .filter(t => t.dueDate > todayIso)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      if (upcoming.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No upcoming tasks';
        deadlineListEl.appendChild(li);
      } else {
        upcoming.forEach(t => {
          const li = document.createElement('li');
          li.textContent = `${t.title} – ${formatDate(t.dueDate)}`;
          deadlineListEl.appendChild(li);
        });
      }
    }
  }

  // Initialize
  render();
});
