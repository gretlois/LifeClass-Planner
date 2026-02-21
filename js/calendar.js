// ============================================
// CORE TASK MANAGEMENT SYSTEM
// ============================================

// Generate random color for tasks
function generateRandomColor() {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A",
    "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2",
    "#FF8B94", "#A8D8EA", "#FFD3A5", "#FD7272"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Get a stable current user identifier (prefer `id` if stored)
function getCurrentUser() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return "default_user";
  try {
    const obj = JSON.parse(raw);
    if (obj && (obj.id || obj.uid)) return obj.id || obj.uid;
    if (obj && obj.email) return obj.email;
    // fallback to the raw string representation
    return raw;
  } catch (e) {
    // raw string (email or username)
    return raw;
  }
}

// Initialize tasks data structure
function initializeTasks() {
  // Migrate any global `calendarTasks` entries for the current user.
  // Support legacy tasks where userId was an email/username string.
  const globalTasks = JSON.parse(localStorage.getItem("calendarTasks")) || null;
  if (globalTasks && globalTasks.length > 0) {
    const raw = localStorage.getItem("currentUser");
    let possibleIds = [];
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        if (obj) {
          if (obj.id) possibleIds.push(obj.id);
          if (obj.email) possibleIds.push(obj.email);
          if (obj.username) possibleIds.push(obj.username);
        }
      } catch (e) {
        possibleIds.push(raw);
      }
    }

    // Also include the stable id returned by getCurrentUser()
    const stable = getCurrentUser();
    if (!possibleIds.includes(stable)) possibleIds.push(stable);

    // If user-specific key doesn't exist yet, copy tasks that match any known id
    const userKey = storageKeyForUser(stable);
    if (!localStorage.getItem(userKey)) {
      const userTasks = globalTasks.filter(t => possibleIds.includes(t.userId));
      if (userTasks.length > 0) {
        localStorage.setItem(userKey, JSON.stringify(userTasks));
      }
    }
  }
}

// Helper: storage key for a specific user
function storageKeyForUser(userId) {
  return `calendarTasks_${userId}`;
}

// ============================================
// CORE TASK FUNCTIONS
// ============================================

/**
 * CORE: Add a new task
 * @param {string} title - Task title
 * @param {string} description - Task description
 * @param {string} dueDate - Task due date (YYYY-MM-DD)
 * @returns {object} The newly created task
 */
function addTask(title, description, dueDate) {
  const currentUser = getCurrentUser();
  const key = storageKeyForUser(currentUser);
  const tasks = JSON.parse(localStorage.getItem(key)) || [];
  const newTask = {
    id: Math.max(0, ...tasks.map(t => t.id)) + 1,
    title,
    description,
    dueDate,
    status: "pending",
    userId: currentUser,
    color: generateRandomColor(),
    createdDate: new Date().toISOString().split("T")[0]
  };

  tasks.push(newTask);
  localStorage.setItem(key, JSON.stringify(tasks));
  
  // Re-render UI if calendar exists
  const calendarGrid = document.querySelector(".calendar-grid");
  if (calendarGrid) {
    generateCalendar(currentDate);
  }
  
  // Dispatch custom event for listeners
  window.dispatchEvent(new CustomEvent("taskAdded", { detail: newTask }));
  
  return newTask;
}

/**
 * CORE: Update task status (pending ↔ completed)
 * @param {number} taskId - Task ID
 * @returns {object} Updated task
 */
function updateTaskStatus(taskId) {
  const currentUser = getCurrentUser();
  const key = storageKeyForUser(currentUser);
  const tasks = JSON.parse(localStorage.getItem(key)) || [];
  const task = tasks.find(t => t.id === taskId);

  if (task) {
    task.status = task.status === "pending" ? "completed" : "pending";
    localStorage.setItem(key, JSON.stringify(tasks));
    
    // Re-render UI
    const calendarGrid = document.querySelector(".calendar-grid");
    if (calendarGrid) {
      generateCalendar(currentDate);
    }
    
    // Re-render task list only if on tasks page
    const taskListContainer = document.getElementById("taskListContainer");
    if (taskListContainer) {
      renderTaskList();
    }
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent("taskUpdated", { detail: task }));
    
    // Recalculate progress
    updateProgressBar();
  }
  
  return task;
}

/**
 * CORE: Delete a task
 * @param {number} taskId - Task ID
 */
function deleteTask(taskId) {
  const currentUser = getCurrentUser();
  const key = storageKeyForUser(currentUser);
  const tasks = JSON.parse(localStorage.getItem(key)) || [];
  const taskIndex = tasks.findIndex(t => t.id === taskId);

  if (taskIndex > -1) {
    const deletedTask = tasks[taskIndex];
    tasks.splice(taskIndex, 1);
    localStorage.setItem(key, JSON.stringify(tasks));
    
    // Re-render UI
    const calendarGrid = document.querySelector(".calendar-grid");
    if (calendarGrid) {
      generateCalendar(currentDate);
    }
    
    // Re-render task list only if on tasks page
    const taskListContainer = document.getElementById("taskListContainer");
    if (taskListContainer) {
      renderTaskList();
    }
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent("taskDeleted", { detail: deletedTask }));
    
    // Recalculate progress
    updateProgressBar();
  }
}

/**
 * CORE: Get all tasks for a specific user
 * @param {string} userId - User ID
 * @returns {array} Array of tasks for that user
 */
function getTasksByUser(userId) {
  const key = storageKeyForUser(userId);
  return JSON.parse(localStorage.getItem(key)) || [];
}

/**
 * CORE: Get tasks for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {array} Array of tasks due on that date
 */
function getTasksByDate(date) {
  const currentUser = getCurrentUser();
  const key = storageKeyForUser(currentUser);
  const tasks = JSON.parse(localStorage.getItem(key)) || [];
  return tasks.filter(task => task.dueDate === date);
}

/**
 * Get all tasks
 * @returns {array} All tasks
 */
function getAllTasks() {
  const currentUser = getCurrentUser();
  const key = storageKeyForUser(currentUser);
  return JSON.parse(localStorage.getItem(key)) || [];
}

/**
 * Calculate progress statistics
 * @returns {object} Progress data {total, completed, pending, percentage}
 */
function calculateProgress() {
  const currentUser = getCurrentUser();
  const userTasks = getTasksByUser(currentUser);
  const completed = userTasks.filter(t => t.status === "completed").length;
  const total = userTasks.length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  
  return {
    total,
    completed,
    pending: total - completed,
    percentage
  };
}

/**
 * Update progress bar UI
 */
function updateProgressBar() {
  const progress = calculateProgress();
  const progressFill = document.querySelector(".progress-fill");
  const progressText = document.querySelector(".progress-text");
  
  if (progressFill) {
    progressFill.style.width = progress.percentage + "%";
    if (progressText) {
      progressText.textContent = `${progress.completed}/${progress.total} completed (${progress.percentage}%)`;
    }
  }
}

// ============================================
// CALENDAR INTEGRATION
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  // Initialize sample tasks in localStorage
  initializeTasks();

  // Generate calendar
  generateCalendar(new Date(2026, 1)); // February 2026
  
  // Handle month navigation
  const navButtons = document.querySelectorAll(".nav-btn");
  const monthSelect = document.querySelector(".calendar-header select");

  navButtons[0].addEventListener("click", () => previousMonth());
  navButtons[1].addEventListener("click", () => nextMonth());
  monthSelect.addEventListener("change", (e) => selectMonth(e.target.value));
  
  // Initialize task list if on tasks page
  if (document.location.pathname.includes("tasks.html")) {
    renderTaskList();
    updateProgressBar();
  }

  // Re-render calendar when tasks change elsewhere
  window.addEventListener('taskAdded', () => generateCalendar(currentDate));
  window.addEventListener('taskDeleted', () => generateCalendar(currentDate));
  window.addEventListener('taskUpdated', () => generateCalendar(currentDate));
});

/**
 * Get tasks for dates display
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {array} Tasks for that date
 */
function getTasksForDisplay(dateString) {
  const currentUser = getCurrentUser();
  const allTasks = getTasksByDate(dateString);
  // Only show tasks belonging to the current user
  return allTasks.filter(task => task.userId === currentUser);
}

// Generate calendar for given month and year
function generateCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // Clear existing dates
  const calendarGrid = document.querySelector(".calendar-grid");
  const existingDates = calendarGrid.querySelectorAll(".date");
  existingDates.forEach(el => el.remove());
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Create empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "date empty";
    calendarGrid.appendChild(emptyDiv);
  }
  
  // Create date cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateDiv = document.createElement("div");
    dateDiv.className = "date";
    
    // Format date as YYYY-MM-DD
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    dateDiv.dataset.date = dateString;
    
    // Create date number
    const dateNumber = document.createElement("div");
    dateNumber.className = "date-number";
    dateNumber.textContent = day;
    dateDiv.appendChild(dateNumber);
    
    // Get tasks for this date and render small indicators inside the date cell
    const tasks = getTasksForDisplay(dateString);
    if (tasks.length > 0) {
      const tasksContainer = document.createElement("div");
      tasksContainer.className = "date-tasks";

      const tasksToShow = tasks.slice(0, 3);
      tasksToShow.forEach(task => {
        const taskBox = document.createElement("div");
        taskBox.className = "task-box small";
        if (task.status === "completed") taskBox.classList.add("completed");
        taskBox.style.backgroundColor = task.color;
        taskBox.title = `${task.title}\n${task.description}\nStatus: ${task.status}`;
        taskBox.textContent = task.title.substring(0, 12);
        taskBox.style.fontSize = "11px";
        taskBox.style.padding = "2px 4px";
        taskBox.style.marginTop = "6px";
        taskBox.style.borderRadius = "4px";
        taskBox.style.cursor = "pointer";

        // Allow quick status toggle from calendar (keeps task list as primary place)
        taskBox.onclick = (e) => {
          e.stopPropagation();
          updateTaskStatus(task.id);
        };

        tasksContainer.appendChild(taskBox);
      });

      if (tasks.length > 3) {
        const moreBox = document.createElement("div");
        moreBox.className = "task-more";
        moreBox.textContent = `+${tasks.length - 3} more`;
        tasksContainer.appendChild(moreBox);
      }

      dateDiv.appendChild(tasksContainer);
    }
    
    calendarGrid.appendChild(dateDiv);
  }
  
  // Update header
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const monthSelect = document.querySelector(".calendar-header select");
  monthSelect.value = `${monthNames[month]} ${year}`;
}

// Navigation functions
let currentDate = new Date(2026, 1); // February 2026

function previousMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  generateCalendar(currentDate);
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  generateCalendar(currentDate);
}

function selectMonth(monthString) {
  const [monthName, year] = monthString.split(" ");
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const month = monthNames.indexOf(monthName);
  
  currentDate = new Date(parseInt(year), month);
  generateCalendar(currentDate);
}

// ============================================
// TASK LIST UI RENDERING
// ============================================

/**
 * Render task list on tasks.html page
 */
function renderTaskList() {
  const currentUser = getCurrentUser();
  const userTasks = getTasksByUser(currentUser);
  const taskContainer = document.querySelector(".main");
  
  if (!taskContainer) return;
  
  // Find or create task list container
  let taskListDiv = document.getElementById("taskListContainer");
  if (!taskListDiv) {
    taskListDiv = document.createElement("div");
    taskListDiv.id = "taskListContainer";
    taskContainer.appendChild(taskListDiv);
  }
  
  // Clear existing tasks
  const existingTasks = taskListDiv.querySelectorAll(".task");
  existingTasks.forEach(el => el.remove());
  
  // Render each task
  if (userTasks.length === 0) {
    const emptyMsg = document.createElement("p");
    emptyMsg.style.textAlign = "center";
    emptyMsg.style.color = "#999";
    emptyMsg.style.marginTop = "20px";
    emptyMsg.textContent = "No tasks yet. Create your first task!";
    taskListDiv.appendChild(emptyMsg);
  } else {
    userTasks.forEach(task => {
      const taskEl = document.createElement("div");
      taskEl.className = "task";
      if (task.status === "completed") {
        taskEl.classList.add("completed");
      }
      taskEl.dataset.taskId = task.id;
      
      const taskContent = document.createElement("div");
      taskContent.style.flex = "1";
      
      const titleEl = document.createElement("div");
      titleEl.style.fontWeight = "600";
      titleEl.style.marginBottom = "4px";
      titleEl.textContent = task.title;
      
      const descEl = document.createElement("div");
      descEl.style.fontSize = "13px";
      descEl.style.color = "#666";
      descEl.textContent = task.description;
      
      taskContent.appendChild(titleEl);
      taskContent.appendChild(descEl);
      
      const infoEl = document.createElement("div");
      infoEl.style.textAlign = "right";
      infoEl.style.minWidth = "120px";
      
      const dateEl = document.createElement("div");
      dateEl.style.fontSize = "13px";
      dateEl.style.color = "#999";
      dateEl.textContent = `Due: ${task.dueDate}`;
      
      const statusEl = document.createElement("div");
      statusEl.style.fontSize = "12px";
      statusEl.style.marginTop = "4px";
      statusEl.style.padding = "3px 8px";
      statusEl.style.borderRadius = "4px";
      statusEl.style.display = "inline-block";
      statusEl.style.cursor = "pointer";
      
      if (task.status === "completed") {
        statusEl.style.backgroundColor = "#C6EFCE";
        statusEl.style.color = "#006100";
        statusEl.textContent = "Completed";
      } else {
        statusEl.style.backgroundColor = "#FFC7CE";
        statusEl.style.color = "#9C0006";
        statusEl.textContent = "Pending";
      }
      
      statusEl.onclick = () => updateTaskStatus(task.id);
      
      infoEl.appendChild(dateEl);
      infoEl.appendChild(statusEl);
      
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.style.marginLeft = "10px";
      deleteBtn.style.padding = "4px 10px";
      deleteBtn.style.fontSize = "12px";
      deleteBtn.style.backgroundColor = "#FF6B6B";
      deleteBtn.onclick = () => {
        if (confirm("Delete this task?")) {
          deleteTask(task.id);
        }
      };
      
      infoEl.appendChild(deleteBtn);
      
      taskEl.appendChild(taskContent);
      taskEl.appendChild(infoEl);
      taskListDiv.appendChild(taskEl);
    });
  }
}
