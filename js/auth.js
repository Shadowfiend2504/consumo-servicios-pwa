/**
 * Gestión de autenticación — Firebase Auth + fallback localStorage
 */

document.addEventListener('DOMContentLoaded', function () {
  if (FIREBASE_CONFIGURED && auth) {
    // Firebase: escuchar cambios de estado de autenticación
    auth.onAuthStateChanged(function (user) {
      if (user) {
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userName', user.displayName || user.email.split('@')[0]);
        localStorage.setItem('userId', user.uid);
        showDashboard();
        DataService.syncFromFirestore();
      } else {
        showLogin();
      }
    });
  } else {
    // Fallback: comprobar localStorage
    checkAuthStatusLocal();
  }
});

function showDashboard() {
  const ls = document.getElementById('loginScreen');
  const db = document.getElementById('dashboard');
  if (ls) ls.style.display = 'none';
  if (db) { db.style.display = 'flex'; initDashboard(); }
}

function showLogin() {
  const ls = document.getElementById('loginScreen');
  const db = document.getElementById('dashboard');
  if (ls) ls.style.display = 'flex';
  if (db) db.style.display = 'none';
}

function checkAuthStatusLocal() {
  const userEmail = localStorage.getItem('userEmail');
  if (userEmail) { showDashboard(); } else { showLogin(); }
}

// Toggle password visibility
function togglePasswordVisibilityLogin() {
  const field = document.getElementById('password');
  const icon = document.getElementById('eye-icon-login');
  if (field.type === 'password') {
    field.type = 'text';
    icon.classList.replace('bi-eye', 'bi-eye-slash');
  } else {
    field.type = 'password';
    icon.classList.replace('bi-eye-slash', 'bi-eye');
  }
}

/**
 * Login
 */
async function login(event) {
  if (event) event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !isValidEmail(email)) {
    showToast('Ingresa un correo válido', { type: 'warning' }); return;
  }
  if (!password) {
    showToast('Ingresa la contraseña', { type: 'warning' }); return;
  }

  // Firebase Auth
  if (FIREBASE_CONFIGURED && auth) {
    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      showToast('¡Bienvenido! Accediendo...', { type: 'success', delay: 1500 });
      // onAuthStateChanged manejará el resto
    } catch (err) {
      console.error('Firebase login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        showToast('Correo o contraseña incorrectos', { type: 'warning' });
      } else if (err.code === 'auth/too-many-requests') {
        showToast('Demasiados intentos. Espera un momento.', { type: 'error' });
      } else {
        showToast('Error al iniciar sesión: ' + err.message, { type: 'error' });
      }
    }
    return;
  }

  // Fallback: localStorage
  try {
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const user = usuarios.find(u => u.email === email);
    if (!user) { showToast('Correo o contraseña incorrectos', { type: 'warning' }); return; }
    if (atob(user.password) !== password) { showToast('Correo o contraseña incorrectos', { type: 'warning' }); return; }
    if (!user.activo) { showToast('Cuenta desactivada', { type: 'error' }); return; }

    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', user.nombre);
    localStorage.setItem('userId', user.id);
    showToast('¡Bienvenido!', { type: 'success', delay: 1000 });
    setTimeout(() => showDashboard(), 500);
  } catch (e) {
    showToast('Error al iniciar sesión', { type: 'error' });
    console.error(e);
  }
}

/**
 * Logout
 */
async function logout() {
  if (!confirm('¿Cerrar sesión?')) return;
  try {
    if (FIREBASE_CONFIGURED && auth) {
      await auth.signOut();
    }
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('ultimoAcceso');
    const e = document.getElementById('email');
    const p = document.getElementById('password');
    if (e) e.value = '';
    if (p) p.value = '';
    showLogin();
    showToast('Sesión cerrada', { type: 'info' });
  } catch (e) {
    console.error('Logout error:', e);
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Toast
 */
function showToast(message, options = {}) {
  const { type = 'info', delay = 0 } = options;
  const container = document.getElementById('toast-container');
  if (!container) { alert(message); return; }
  const toastId = 'toast-' + Date.now();
  const cls = type === 'success' ? 'alert-success' : type === 'error' ? 'alert-danger' : type === 'warning' ? 'alert-warning' : 'alert-info';
  container.insertAdjacentHTML('beforeend', `
    <div id="${toastId}" class="alert ${cls} alert-dismissible fade show" role="alert" style="min-width:280px">
      <strong>${type.charAt(0).toUpperCase() + type.slice(1)}:</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`);
  setTimeout(() => { const el = document.getElementById(toastId); if (el) el.remove(); }, delay || 5000);
}

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

// Enter key login
document.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    const ls = document.getElementById('loginScreen');
    if (ls && ls.style.display !== 'none') {
      login(e);
    }
  }
});

// Demo user seed (only for localStorage fallback)
document.addEventListener('DOMContentLoaded', function () {
  if (!FIREBASE_CONFIGURED) {
    const existing = JSON.parse(localStorage.getItem('usuarios'));
    if (!existing || existing.length === 0) {
      localStorage.setItem('usuarios', JSON.stringify([{
        id: '1', nombre: 'Usuario Demostración', email: 'demo@ejemplo.com',
        telefono: '+57 300 123 4567', documento: '1234567890',
        password: btoa('Demo@12345'), fecha_registro: new Date().toISOString(), activo: true
      }]));
    }
  }
});