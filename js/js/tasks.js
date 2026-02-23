(function () {
  const STORAGE_KEY = "lc_tasks";

  function getTasks() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function addTask(title, dueDate) {
    const tasks = getTasks();
    tasks.push({ id: Date.now(), title, dueDate, done: false });
    saveTasks(tasks);
    renderAll();
  }

  function deleteTask(id) {
    const tasks = getTasks().filter((t) => t.id !== id);
    saveTasks(tasks);
    renderAll();
  }

  function toggleDone(id) {
    const tasks = getTasks();
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    saveTasks(tasks);
    renderAll();
  }

  function formatDateReadable(ymd) {
    if (!ymd) return "";
    const d = new Date(ymd);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  /* --- RENDERERS --- */
  function renderTasksPage() {
    const container = document.getElementById("tasksContainer");
    if (!container) return;

    const tasks = getTasks();
    container.innerHTML = "";

    if (tasks.length === 0) {
      container.innerHTML = '<div class="card"><p>No tasks yet — add one above.</p></div>';
      return;
    }

    tasks.forEach((task) => {
      const row = document.createElement("div");
      row.className = "task";

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.alignItems = "center";
      left.style.gap = "12px";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!task.done;
      cb.addEventListener("change", () => toggleDone(task.id));

      const title = document.createElement("span");
      title.textContent = task.title + " — " + formatDateReadable(task.dueDate);
      if (task.done) title.style.textDecoration = "line-through";

      left.appendChild(cb);
      left.appendChild(title);

      const right = document.createElement("div");
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.addEventListener("click", () => deleteTask(task.id));

      right.appendChild(del);

      row.appendChild(left);
      row.appendChild(right);
      container.appendChild(row);
    });
  }

  function renderDashboard() {
    const tasks = getTasks();
    const today = new Date().toISOString().slice(0, 10);

    // Today's tasks
    const todayList = document.getElementById("todayTasksList") || document.querySelector(".task-list");
    if (todayList) {
      const todays = tasks.filter((t) => t.dueDate === today);
      todayList.innerHTML = "";
      if (todays.length === 0) {
        todayList.innerHTML = "<li>No tasks for today</li>";
      } else {
        todays.forEach((t) => {
          const li = document.createElement("li");
          li.textContent = `${t.title} ${t.done ? '— Done' : '— Pending'}`;
          todayList.appendChild(li);
        });
      }
    }

    // Upcoming deadlines (next 5)
    const deadlineList = document.getElementById("deadlineList") || document.querySelector(".deadline-list");
    if (deadlineList) {
      const upcoming = tasks.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      deadlineList.innerHTML = "";
      if (upcoming.length === 0) {
        deadlineList.innerHTML = "<li>No upcoming deadlines</li>";
      } else {
        upcoming.slice(0, 5).forEach((t) => {
          const li = document.createElement("li");
          li.textContent = `${t.title} – ${formatDateReadable(t.dueDate)}`;
          deadlineList.appendChild(li);
        });
      }
    }

    // Progress summary
    const total = tasks.length;
    const completed = tasks.filter((t) => t.done).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    const progressBar = document.querySelector(".progress-card .progress-bar");
    if (progressBar) progressBar.style.width = percent + "%";

    const progressText = document.querySelector(".progress-text");
    if (progressText) progressText.textContent = percent + "% Completed";

    const totalText = document.getElementById("totalTasksText");
    if (totalText) totalText.textContent = `Total tasks: ${total} • Completed: ${completed}`;
  }

  function renderCalendar() {
    const grid = document.querySelector(".calendar-grid");
    if (!grid) return;

    // clear previous markers
    const dateEls = Array.from(grid.querySelectorAll('.date'));
    dateEls.forEach((el) => {
      el.classList.remove('event');
      const prev = el.querySelector('.date-task');
      if (prev) prev.remove();
    });

    const select = document.querySelector('.calendar-header select');
    const monthLabel = select ? select.value : null; // e.g. "February 2026"
    let monthIndex = null;
    let year = null;
    if (monthLabel) {
      const [mName, y] = monthLabel.split(' ');
      monthIndex = new Date(`${mName} 1, ${y}`).getMonth();
      year = Number(y);
    }

    const tasks = getTasks();
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const [y, m, d] = t.dueDate.split('-').map(Number);
      if (monthIndex !== null && y === year && m - 1 === monthIndex) {
        const el = dateEls.find((x) => Number(x.textContent.trim()) === d);
        if (el) {
          el.classList.add('event');
          const tag = document.createElement('div');
          tag.className = 'date-task';
          tag.style.fontSize = '12px';
          tag.style.marginTop = '6px';
          tag.textContent = t.title;
          el.appendChild(tag);
        }
      }
    });
  }

  function renderProgressPage() {
    const progressFill = document.querySelector('.progress-fill');
    if (!progressFill) return;
    const tasks = getTasks();
    const total = tasks.length;
    const completed = tasks.filter((t) => t.done).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressFill.style.width = percent + '%';
    progressFill.textContent = percent + '%';
  }

  function renderAll() {
    renderTasksPage();
    renderDashboard();
    renderCalendar();
    renderProgressPage();
  }

  /* --- INIT / EVENT BINDING --- */
  document.addEventListener('DOMContentLoaded', () => {
    // basic auth-guard for pages that include this script
    const protectedPages = ['dashboard.html', 'tasks.html', 'calendar.html', 'progress.html', 'profile.html'];
    const current = location.pathname.split('/').pop();
    if (protectedPages.includes(current) && !localStorage.getItem('lc_loggedIn')) {
      // redirect to login page (relative to project root)
      location.href = 'Login Page/Login.html';
      return;
    }

    // task form (tasks.html)
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('taskTitle').value.trim();
        const due = document.getElementById('taskDue').value;
        if (!title || !due) return alert('Please enter title and due date');
        addTask(title, due);
        taskForm.reset();
      });
    }

    // calendar controls
    const prev = document.querySelectorAll('.nav-btn')[0];
    const next = document.querySelectorAll('.nav-btn')[1];
    const select = document.querySelector('.calendar-header select');
    if (select) {
      select.addEventListener('change', renderCalendar);
      if (prev && next) {
        prev.addEventListener('click', () => { if (select.selectedIndex > 0) select.selectedIndex--; renderCalendar(); });
        next.addEventListener('click', () => { if (select.selectedIndex < select.options.length - 1) select.selectedIndex++; renderCalendar(); });
      }
    }

    renderAll();
  });

  // expose a tiny API for debugging/tests
  window.lcTasks = { getTasks, addTask, deleteTask, toggleDone };
})();