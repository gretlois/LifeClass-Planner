/* Global Logout Handler */
document.addEventListener("DOMContentLoaded", function () {
  // Find all logout links (redirecting to Login Page)
  const logoutLinks = document.querySelectorAll('a[href*="Login.html"]');
  
  logoutLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      // Check if this is actually a logout link (contains "Logout" text or is in sidebar)
      if (link.textContent.includes("Logout") || link.getAttribute("href") === "Login Page/Login.html") {
        e.preventDefault();
        // Remove currentUser from localStorage
        localStorage.removeItem("currentUser");
        // Redirect to login page
        window.location.href = link.getAttribute("href");
      }
    });
  });
});
