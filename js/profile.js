/* Edit profile */
document.addEventListener("DOMContentLoaded", function () {
  const editBtn = document.getElementById("editBtn");
  const logoutBtn = document.querySelector("a[href*='Login.html']");
  const nameSpan = document.getElementById('nameField');
  const emailSpan = document.getElementById('emailField');
  const yearSpan = document.getElementById('yearField');
  const displayName = document.getElementById('displayName');

  let editing = false;
  let currentUser = null;
  let originalEmail = null;
  let originalIdentifier = null; // raw value from localStorage before parsing

  // Load current user data from localStorage (support JSON object or string identifier)
  function loadUserData() {
    const currentUserStr = localStorage.getItem("currentUser");
    if (!currentUserStr) {
      alert("No user logged in. Redirecting to login page.");
      window.location.href = "Login Page/Login.html";
      return false;
    }

    // remember raw identifier so we can locate the original user record later
    originalIdentifier = currentUserStr;

    try {
      currentUser = JSON.parse(currentUserStr);
      // parsed object expected to contain email
      originalEmail = currentUser.email || null;
    } catch (e) {
      // currentUser stored as a simple identifier (email or username)
      const users = JSON.parse(localStorage.getItem('users')) || [];
      const found = users.find(u => u.email === currentUserStr || u.username === currentUserStr);
      if (found) {
        currentUser = found;
        originalEmail = found.email || null;
      } else {
        // no user record found; create a minimal object but keep originalIdentifier for matching
        currentUser = { fullName: currentUserStr, email: '', yearCourse: '' };
        originalEmail = null;
      }
    }

    // Ensure properties exist
    currentUser.fullName = currentUser.fullName || 'Student Name';
    currentUser.email = currentUser.email || '';
    currentUser.yearCourse = currentUser.yearCourse || '';

    // Populate UI
    displayName.textContent = currentUser.fullName;
    nameSpan.textContent = currentUser.fullName;
    emailSpan.textContent = currentUser.email || 'Enter Your Email';
    yearSpan.textContent = currentUser.yearCourse || 'Enter Your Year & Course';

    return true;
  }

  if (!loadUserData()) return;

  editBtn.addEventListener('click', function () {
    if (!editing) {
      // Replace spans with inputs
      nameSpan.innerHTML = `<input type="text" id="newName" value="${currentUser.fullName}">`;
      yearSpan.innerHTML = `<input type="text" id="newYear" value="${currentUser.yearCourse || ''}">`;
      emailSpan.innerHTML = `<input type="email" id="newEmail" value="${currentUser.email}">`;
      editBtn.textContent = 'Save';
      editing = true;
    } else {
      const newName = document.getElementById('newName').value.trim();
      const newYear = document.getElementById('newYear').value.trim();
      const newEmail = document.getElementById('newEmail').value.trim();

      if (!newName || !newEmail) {
        alert('Please fill in required fields');
        return;
      }

      // Update object
      currentUser.fullName = newName;
      currentUser.yearCourse = newYear;
      currentUser.email = newEmail;

      // Persist currentUser (overwrite local currentUser storage)
      // Ensure stable id exists for user
      if (!currentUser.id) {
        currentUser.id = 'u_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      }

      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      // Update users array
      const users = JSON.parse(localStorage.getItem('users')) || [];
      const idx = users.findIndex(u => 
        (originalEmail && u.email === originalEmail) || 
        u.email === originalIdentifier || 
        u.username === originalIdentifier
      );
      if (idx !== -1) {
        users[idx] = currentUser;
      } else {
        users.push(currentUser);
      }
      localStorage.setItem('users', JSON.stringify(users));

      // If the user's email changed, migrate per-user storage keys (tasks)
      try {
        // Migrate from any known old identifier (email or raw identifier) to stable id key
        const toId = currentUser.id || currentUser.email || originalIdentifier;
        const fromCandidates = [];
        if (originalEmail) fromCandidates.push(originalEmail);
        if (originalIdentifier) fromCandidates.push(originalIdentifier);
        // also consider previous email if different
        if (currentUser.email && originalEmail && currentUser.email !== originalEmail) fromCandidates.push(originalEmail);

        const newKey = `calendarTasks_${toId}`;
        // If the new key doesn't exist yet, try to find and move tasks from any old key
        if (!localStorage.getItem(newKey)) {
          for (const fromId of fromCandidates) {
            if (!fromId) continue;
            const oldKey = `calendarTasks_${fromId}`;
            const oldVal = localStorage.getItem(oldKey);
            if (oldVal) {
              try {
                const tasks = JSON.parse(oldVal);
                // update each task.userId to the new stable id
                const updated = tasks.map(t => ({ ...t, userId: toId }));
                localStorage.setItem(newKey, JSON.stringify(updated));
                localStorage.removeItem(oldKey);
                break;
              } catch (e) {
                // if parsing fails, just move raw value
                localStorage.setItem(newKey, oldVal);
                localStorage.removeItem(oldKey);
                break;
              }
            }
          }
        }

        // update original identifiers for future edits
        originalEmail = currentUser.email || null;
        originalIdentifier = currentUser.id || originalIdentifier;
      } catch (e) {
        console.warn('Failed migrating per-user data after email change', e);
      }

      // Restore spans
      displayName.textContent = currentUser.fullName;
      nameSpan.textContent = currentUser.fullName;
      yearSpan.textContent = currentUser.yearCourse || 'Enter Your Year & Course';
      emailSpan.textContent = currentUser.email;

      editBtn.textContent = 'Edit Profile';
      editing = false;
      alert('Profile updated successfully!');
    }
  });

  // LOGOUT
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      localStorage.removeItem("currentUser");
      window.location.href = "Login Page/Login.html";
    });
  }
});
