document.addEventListener('DOMContentLoaded',()=>{
function login() {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;

  if (email && pass) {
    localStorage.setItem("usuario", email);
    window.location.href = "dashboard.html";
  } else {
    alert("Complete los campos");
  }
}