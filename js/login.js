/* Login in */
/* const showPopupBtn = document.querySelector(".log-in-btn");

showPopupBtn.addEventListener("click", () => {
  document.body.classList.toggle("show-popup");
}); */

/* Exit */
/*  const hidePopupBtn = document.querySelector(".wrapper .exit");

hidePopupBtn.addEventListener("click", () => showPopupBtn.click()); */

/* Sign up */
/* const loginSignupLink = document.querySelectorAll(".box .bottom-link a");
const formPopup = document.querySelector(".wrapper");

loginSignupLink.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    console.log(link.id);
    formPopup.classList[link.id == "sign-up-link" ? "add" : "remove"](
      "show-signup",
    );
  });
}); */

/* Hamburger */
/* const menuBtn = document.querySelector(".menu");
const navBarMenu = document.querySelector(".navbar .nav-links");
const hideMenuBtn = navBarMenu.querySelector(".close");

menuBtn.addEventListener("click", () => {
  navBarMenu.classList.toggle("show-menu");
});

hideMenuBtn.addEventListener("click" , () => menuBtn.click()); */

const wrapper = document.querySelector(".wrapper");
const signUpLink = document.getElementById("sign-up-link");
const loginLink = document.getElementById("login-link");

/* To connect */
signUpLink.addEventListener("click", (e) => {
  e.preventDefault();
  wrapper.classList.add("show-signup");
});

loginLink.addEventListener("click", (e) => {
  e.preventDefault();
  wrapper.classList.remove("show-signup");
});

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode");

if (mode === "signup") {
  wrapper.classList.add("show-signup");
} else {
  wrapper.classList.remove("show-signup");
}

/* show password */
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("toggle-password")) {
    const inputField = e.target.closest(".input-field");
    const input = inputField.querySelector("input");

    if (input.type === "password") {
      input.type = "text";
      e.target.classList.remove("fa-eye");
      e.target.classList.add("fa-eye-slash");
    } else {
      input.type = "password";
      e.target.classList.remove("fa-eye-slash");
      e.target.classList.add("fa-eye");
    }
  }
});

/* Sign Up Form Submission */
const signUpForm = document.querySelector(".sign-in form");
const signUpBtn = signUpForm.querySelector('button[type="submit"]');

signUpForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const fullName = document.getElementById("text-sign").value.trim();
  const email = document.getElementById("email-sign").value.trim();
  const password = document.getElementById("password-sign").value;
  const policyCheckbox = document.getElementById("policy").checked;

  // Validation
  if (!fullName) {
    alert("Please enter your full name");
    return;
  }
  if (!email) {
    alert("Please enter your email address");
    return;
  }
  if (!password) {
    alert("Please enter a password");
    return;
  }
  if (password.length < 6) {
    alert("Password must be at least 6 characters long");
    return;
  }
  if (!policyCheckbox) {
    alert("Please agree to the Terms & Conditions");
    return;
  }

  // Check if email already exists
  const users = JSON.parse(localStorage.getItem("users")) || [];
  if (users.some((user) => user.email === email)) {
    alert("This email is already registered. Please use a different email or login.");
    return;
  }

  // Store user data
  const newUser = {
    fullName: fullName,
    email: email,
    password: password,
  };

  // Ensure a stable id for the new user
  newUser.id = 'u_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));

  // Create an empty per-user tasks key so future edits/migrations are consistent
  try {
    const key = `calendarTasks_${newUser.id}`;
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify([]));
  } catch (e) {}

  alert("Account created successfully! Please log in.");
  signUpForm.reset();
  wrapper.classList.remove("show-signup");
  document.querySelector(".box form").reset();
});

/* Login Form Submission */
const loginForm = document.querySelector(".box form");

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Please enter both email and password");
    return;
  }

  // Retrieve users from localStorage
  const users = JSON.parse(localStorage.getItem("users")) || [];

  // Find user with matching email and password
  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (user) {
    // Store logged-in user info
    localStorage.setItem("currentUser", JSON.stringify(user));
    alert("Login successful!");
    window.location.href = "dashboard.html";
  } else {
    alert("Invalid email or password. Please try again.");
  }
});

