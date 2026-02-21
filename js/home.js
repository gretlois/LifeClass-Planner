/* Menu Hamburger */
/* const navBtn = document.querySelector(".menu-btn");
const navList = document.querySelector(".nav-list");

navBtn.addEventListener("click", function () {
  navList.classList.toggle("active");
}); */

const menuBtn = document.querySelector(".menu-btn");
const navList = document.querySelector(".nav-list");


menuBtn.addEventListener("click", () => {
  navList.classList.toggle("active");
});


document.querySelectorAll(".nav-list a").forEach((link) => {
  link.addEventListener("click", () => {
    navList.classList.remove("active");
  });
});