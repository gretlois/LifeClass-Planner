/* UI for Progress page: shows Weekly and Monthly task lists and updates overall progress.
 * Listens for taskAdded, taskUpdated, taskDeleted events.
 */

document.addEventListener('DOMContentLoaded', function () {
  // Mobile sidebar toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function() {
      sidebar.classList.toggle('active');
    });

    // Close sidebar when a link is clicked
    const sidebarLinks = sidebar.querySelectorAll('a');
    sidebarLinks.forEach(link => {
      link.addEventListener('click', function() {
        sidebar.classList.remove('active');
      });
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', function(event) {
      if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
        sidebar.classList.remove('active');
      }
    });
  }
  // Extract stable user id from currentUser object; fall back to email or raw string
  let currentUser = 'default_user';
  if (typeof getCurrentUser === 'function') {
    currentUser = getCurrentUser();
  } else {
    const raw = localStorage.getItem('currentUser') || 'default_user';
    try {
      const obj = JSON.parse(raw);
      if (obj && (obj.id || obj.uid)) currentUser = obj.id || obj.uid;
      else if (obj && obj.email) currentUser = obj.email;
      else currentUser = raw;
    } catch (e) {
      currentUser = raw;
    }
  }

  function ensureProgressText() {
    let text = document.querySelector('.progress-text');
    if (!text) {
      const bar = document.querySelector('.progress-bar');
      if (bar) {
        text = document.createElement('div');
        text.className = 'progress-text';
        text.style.marginTop = '8px';
        bar.parentNode.insertBefore(text, bar.nextSibling);
      }
    }
    return text;
  }

  function renderOverall() {
    if (typeof calculateOverallProgress !== 'function') return;
    const p = calculateOverallProgress(currentUser);
    updateProgressBarWith(p);
  }

  function updateProgressBarWith(p, periodName = '') {
    const fill = document.querySelector('.progress-fill');
    if (fill) {
      fill.style.width = p.percentage + '%';
      fill.textContent = p.percentage + '%';
    }
    const text = ensureProgressText();
    if (text) {
      const label = periodName ? `${periodName}: ` : '';
      text.textContent = `${label}${p.completed}/${p.total} completed (${p.percentage}%)`;
    }
  }

  function getWeekRange(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMon = (day + 6) % 7; // days since Monday
    const start = new Date(d); start.setDate(d.getDate() - diffToMon); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
    return [start.toISOString().slice(0,10), end.toISOString().slice(0,10)];
  }

  function createTaskRow(container, task) {
    const row = document.createElement('div');
    row.className = 'progress-task';
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = '8px 0';
    row.style.borderBottom = '1px solid #f0f0f0';

    const left = document.createElement('div');
    const title = document.createElement('div'); title.textContent = task.title; title.style.fontWeight = '600';
    const meta = document.createElement('div'); meta.style.fontSize = '12px'; meta.style.color = '#666';
    meta.textContent = `Due: ${task.dueDate} • ${task.status}`;
    left.appendChild(title); left.appendChild(meta);

    const right = document.createElement('div');
    const toggle = document.createElement('button'); toggle.textContent = task.status === 'completed' ? 'Undo' : 'Done';
    toggle.style.marginRight = '8px';
    toggle.onclick = () => updateTaskStatus(task.id);
    const del = document.createElement('button'); del.textContent = 'Delete'; del.style.background = '#FF6B6B';
    del.onclick = () => { if (confirm('Delete this task?')) deleteTask(task.id); };
    right.appendChild(toggle); right.appendChild(del);

    row.appendChild(left); row.appendChild(right);
    container.appendChild(row);
  }

  function renderWeekly() {
    const container = document.getElementById('weeklyTasks');
    if (!container) return;
    const range = getWeekRange(new Date());
    const allTasks = _getAllTasksSafe();
    const tasksInWeek = allTasks.filter(t => t.userId === currentUser && t.dueDate >= range[0] && t.dueDate <= range[1]);
    const completedThisWeek = tasksInWeek.filter(t => t.status === 'completed');
    const previousCompleted = allTasks.filter(t => t.userId === currentUser && t.status === 'completed' && t.dueDate < range[0]);

    container.innerHTML = '';
    // Completed this week
    const h1 = document.createElement('h3'); h1.textContent = 'Completed This Week'; container.appendChild(h1);
    if (completedThisWeek.length === 0) {
      const p = document.createElement('div'); p.textContent = 'No completed tasks this week.'; container.appendChild(p);
    } else {
      completedThisWeek.forEach(t => createTaskRow(container, t));
    }

    // Previously completed
    const h2 = document.createElement('h3'); h2.style.marginTop = '12px'; h2.textContent = 'Previously Completed'; container.appendChild(h2);
    if (previousCompleted.length === 0) {
      const p = document.createElement('div'); p.textContent = 'No previous completed tasks.'; container.appendChild(p);
    } else {
      previousCompleted.slice(-20).reverse().forEach(t => createTaskRow(container, t));
    }

    // Update overall progress for weekly scope (based on tasks due this week)
    const total = tasksInWeek.length;
    const completed = completedThisWeek.length;
    updateProgressBarWith({ total, completed, pending: total - completed, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) }, 'Weekly');
  }

  function renderMonthly() {
    const container = document.getElementById('monthlyTasks');
    if (!container) return;
    const today = new Date();
    const ym = today.toISOString().slice(0,7);
    const monthStart = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`;
    const allTasks = _getAllTasksSafe();
    const tasksInMonth = allTasks.filter(t => t.userId === currentUser && t.dueDate && t.dueDate.startsWith(ym));
    const completedThisMonth = tasksInMonth.filter(t => t.status === 'completed');
    const previousCompleted = allTasks.filter(t => t.userId === currentUser && t.status === 'completed' && t.dueDate < monthStart);

    container.innerHTML = '';
    const h1 = document.createElement('h3'); h1.textContent = 'Completed This Month'; container.appendChild(h1);
    if (completedThisMonth.length === 0) {
      const p = document.createElement('div'); p.textContent = 'No completed tasks this month.'; container.appendChild(p);
    } else {
      completedThisMonth.forEach(t => createTaskRow(container, t));
    }

    const h2 = document.createElement('h3'); h2.style.marginTop = '12px'; h2.textContent = 'Previously Completed'; container.appendChild(h2);
    if (previousCompleted.length === 0) {
      const p = document.createElement('div'); p.textContent = 'No previous completed tasks.'; container.appendChild(p);
    } else {
      previousCompleted.slice(-50).reverse().forEach(t => createTaskRow(container, t));
    }

    // Update overall progress for monthly scope (based on tasks due this month)
    const total = tasksInMonth.length;
    const completed = completedThisMonth.length;
    updateProgressBarWith({ total, completed, pending: total - completed, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) }, 'Monthly');
  }

  function renderAll() { renderOverall(); renderWeekly(); renderMonthly(); }

  // Wire Weekly/Monthly buttons
  const btnWeekly = document.getElementById('btnWeekly');
  const btnMonthly = document.getElementById('btnMonthly');

  function setActive(btnA, btnB) {
    if (btnA) btnA.classList.add('active');
    if (btnB) btnB.classList.remove('active');
  }

  function showWeeklyView() { renderWeekly(); setActive(btnWeekly, btnMonthly); }
  function showMonthlyView() { renderMonthly(); setActive(btnMonthly, btnWeekly); }

  // Default to Weekly view and hide the other container
  function showWeeklyViewUI() { 
    const weeklyContainer = document.getElementById('weeklyTasks');
    const monthlyContainer = document.getElementById('monthlyTasks');
    if (weeklyContainer) weeklyContainer.style.display = 'block';
    if (monthlyContainer) monthlyContainer.style.display = 'none';
    showWeeklyView();
  }

  function showMonthlyViewUI() {
    const weeklyContainer = document.getElementById('weeklyTasks');
    const monthlyContainer = document.getElementById('monthlyTasks');
    if (weeklyContainer) weeklyContainer.style.display = 'none';
    if (monthlyContainer) monthlyContainer.style.display = 'block';
    showMonthlyView();
  }

  showWeeklyViewUI();

  if (btnWeekly) btnWeekly.addEventListener('click', showWeeklyViewUI);
  if (btnMonthly) btnMonthly.addEventListener('click', showMonthlyViewUI);

  window.addEventListener('taskAdded', () => { if (btnWeekly && btnWeekly.classList.contains('active')) showWeeklyViewUI(); else if (btnMonthly && btnMonthly.classList.contains('active')) showMonthlyViewUI(); else renderOverall(); });
  window.addEventListener('taskUpdated', () => { if (btnWeekly && btnWeekly.classList.contains('active')) showWeeklyViewUI(); else if (btnMonthly && btnMonthly.classList.contains('active')) showMonthlyViewUI(); else renderOverall(); });
  window.addEventListener('taskDeleted', () => { if (btnWeekly && btnWeekly.classList.contains('active')) showWeeklyViewUI(); else if (btnMonthly && btnMonthly.classList.contains('active')) showMonthlyViewUI(); else renderOverall(); });

  // ---------- Mini calendar for Progress page (date click shows completed tasks) ----------
  const miniMonthLabel = document.getElementById('miniMonthLabel');
  const miniPrev = document.getElementById('miniPrev');
  const miniNext = document.getElementById('miniNext');
  const miniGrid = document.getElementById('miniCalendarGrid');
  const dateTasks = document.getElementById('dateTasks');

  let miniCurrent = new Date(); // current visible month

  function renderMiniCalendar(date) {
    if (!miniGrid || !miniMonthLabel) return;
    const year = date.getFullYear();
    const month = date.getMonth();
    miniMonthLabel.textContent = `${date.toLocaleString(undefined, {month: 'long'})} ${year}`;
    miniGrid.innerHTML = '';

    // day names
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    dayNames.forEach(dn => {
      const el = document.createElement('div'); el.textContent = dn; el.style.fontWeight = '600'; el.style.textAlign = 'center'; miniGrid.appendChild(el);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div'); empty.className = 'date-box empty'; miniGrid.appendChild(empty);
    }

    // day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const cell = document.createElement('div');
      cell.className = 'date-box';
      cell.style.padding = '8px';
      cell.style.border = '1px solid #eee';
      cell.style.textAlign = 'center';
      cell.style.cursor = 'pointer';
      cell.dataset.date = dateStr;
      cell.textContent = day;

      // mark if there are tasks on this date (pending or completed)
      const tasksOnDate = _getAllTasksSafe().filter(t => t.userId === currentUser && t.dueDate === dateStr);
      if (tasksOnDate.length > 0) {
        const badge = document.createElement('div'); badge.textContent = tasksOnDate.length; badge.style.fontSize = '11px'; badge.style.background = '#4ECDC4'; badge.style.color = '#fff'; badge.style.borderRadius = '10px'; badge.style.padding = '2px 6px'; badge.style.display = 'inline-block'; badge.style.marginTop = '6px';
        cell.appendChild(document.createElement('br'));
        cell.appendChild(badge);
      }

      cell.addEventListener('click', () => showCompletedForDate(dateStr));
      miniGrid.appendChild(cell);
    }
  }

  function showCompletedForDate(dateStr) {
    if (!dateTasks) return;
    dateTasks.innerHTML = '';
    const allTasks = _getAllTasksSafe().filter(t => t.userId === currentUser && t.dueDate === dateStr);
    const title = document.createElement('h3'); title.textContent = `Tasks on ${dateStr}`; dateTasks.appendChild(title);
    if (allTasks.length === 0) {
      const p = document.createElement('div'); p.textContent = 'No tasks on this date.'; dateTasks.appendChild(p); return;
    }
    allTasks.forEach(t => {
      const row = document.createElement('div'); row.style.display = 'flex'; row.style.justifyContent = 'space-between'; row.style.padding = '6px 0';
      const left = document.createElement('div'); left.innerHTML = `<strong>${t.title}</strong><div style="font-size: 12px; color: #666;">${t.status}</div>`;
      row.appendChild(left); dateTasks.appendChild(row);
    });
  }

  if (miniPrev) miniPrev.addEventListener('click', () => { miniCurrent.setMonth(miniCurrent.getMonth() - 1); renderMiniCalendar(miniCurrent); });
  if (miniNext) miniNext.addEventListener('click', () => { miniCurrent.setMonth(miniCurrent.getMonth() + 1); renderMiniCalendar(miniCurrent); });

  // init
  renderMiniCalendar(miniCurrent);
});
