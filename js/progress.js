/* Progress calculation utilities
 * Provides:
 * - calculateOverallProgress(userId)
 * - calculateMonthlyProgress(userId, month) // month: "YYYY-MM" or number 1-12 (current year)
 * - calculateDailyProgress(userId, date) // date: "YYYY-MM-DD"
 */

function _getAllTasksSafe() {
  try {
    if (typeof getAllTasks === 'function') return getAllTasks();
  } catch (e) {}
  // Fallback to per-user storage if calendar.js functions are not available
  try {
    const raw = localStorage.getItem('currentUser') || 'default_user';
    let userId = raw;
    try {
      const obj = JSON.parse(raw);
      if (obj && (obj.id || obj.uid)) userId = obj.id || obj.uid;
      else if (obj && obj.email) userId = obj.email;
    } catch (e) {}
    const key = `calendarTasks_${userId}`;
    return JSON.parse(localStorage.getItem(key)) || JSON.parse(localStorage.getItem("calendarTasks")) || [];
  } catch (e) {
    return JSON.parse(localStorage.getItem("calendarTasks")) || [];
  }
}

function calculateOverallProgress(userId) {
  const tasks = _getAllTasksSafe();
  const filtered = userId ? tasks.filter(t => !t.userId || t.userId === userId) : tasks;
  const total = filtered.length;
  const completed = filtered.filter(t => t.status === "completed" || t.status === "Completed").length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total,
    completed,
    pending: total - completed,
    percentage
  };
}

function calculateMonthlyProgress(userId, month) {
  // month can be "YYYY-MM", a Date object, or a number 1-12 (uses current year)
  let ym;
  if (month instanceof Date) ym = month.toISOString().slice(0, 7);
  else if (typeof month === "number") {
    const y = new Date().getFullYear();
    ym = `${y}-${String(month).padStart(2, "0")}`;
  } else ym = String(month);

  const allTasks = _getAllTasksSafe();
  const tasks = allTasks.filter(t => 
    (!userId || !t.userId || t.userId === userId) && 
    t.dueDate && 
    t.dueDate.startsWith(ym)
  );
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "completed" || t.status === "Completed").length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total,
    completed,
    pending: total - completed,
    percentage
  };
}

function calculateWeeklyProgress(userId, date) {
  // Calculate progress for the current week (Sunday to Saturday)
  let d = date instanceof Date ? new Date(date) : new Date(date);
  const dayOfWeek = d.getDay();
  const startDate = new Date(d);
  startDate.setDate(d.getDate() - dayOfWeek);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  const allTasks = _getAllTasksSafe();
  const tasks = allTasks.filter(t => 
    (!userId || !t.userId || t.userId === userId) && 
    t.dueDate && 
    t.dueDate >= startStr && 
    t.dueDate <= endStr
  );
  
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "completed" || t.status === "Completed").length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total,
    completed,
    pending: total - completed,
    percentage
  };
}

function calculateDailyProgress(userId, date) {
  // date: "YYYY-MM-DD" or Date
  let d;
  if (date instanceof Date) d = date.toISOString().slice(0, 10);
  else d = String(date);

  const allTasks = _getAllTasksSafe();
  const tasks = allTasks.filter(t => 
    (!userId || !t.userId || t.userId === userId) && 
    t.dueDate === d
  );
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "completed" || t.status === "Completed").length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total,
    completed,
    pending: total - completed,
    percentage
  };
}

// Expose helpers to window for quick console access
window.calculateOverallProgress = calculateOverallProgress;
window.calculateMonthlyProgress = calculateMonthlyProgress;
window.calculateDailyProgress = calculateDailyProgress;
window.calculateWeeklyProgress = calculateWeeklyProgress;

// UI Handler for Weekly/Monthly buttons
document.addEventListener("DOMContentLoaded", () => {
  const btnWeekly = document.getElementById("btnWeekly");
  const btnMonthly = document.getElementById("btnMonthly");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");

  function getCurrentUser() {
    // Extract stable user id from currentUser object; fall back to email or raw string
    const raw = localStorage.getItem("currentUser") || "default_user";
    try {
      const obj = JSON.parse(raw);
      if (obj && (obj.id || obj.uid)) return obj.id || obj.uid;
      if (obj && obj.email) return obj.email;
    } catch (e) {}
    return raw;
  }

  const userId = getCurrentUser();

  function updateProgressDisplay(progress, periodName) {
    progressFill.style.width = progress.percentage + "%";
    progressFill.textContent = progress.percentage + "%";
    progressText.textContent = `${periodName}: ${progress.completed}/${progress.total} tasks completed`;
  }

  if (btnWeekly) {
    btnWeekly.addEventListener("click", () => {
      const progress = calculateWeeklyProgress(userId, new Date());
      updateProgressDisplay(progress, "Weekly");
      btnWeekly.classList.add('active');
      btnMonthly.classList.remove('active');
      btnWeekly.style.backgroundColor = "#3b82f6";
      btnWeekly.style.color = "white";
      btnMonthly.style.backgroundColor = "";
      btnMonthly.style.color = "";
    });
  }

  if (btnMonthly) {
    btnMonthly.addEventListener("click", () => {
      const progress = calculateMonthlyProgress(userId, new Date());
      updateProgressDisplay(progress, "Monthly");
      btnMonthly.classList.add('active');
      btnWeekly.classList.remove('active');
      btnMonthly.style.backgroundColor = "#3b82f6";
      btnMonthly.style.color = "white";
      btnWeekly.style.backgroundColor = "";
      btnWeekly.style.color = "";
    });
  }

  // Initialize with Weekly view on page load
  if (btnWeekly) {
    btnWeekly.click();
  }

  // Default: show weekly progress on load
  if (btnWeekly) {
    btnWeekly.click();
  }
});
