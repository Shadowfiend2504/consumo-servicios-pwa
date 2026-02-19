/**
 * Gestión de autenticación del sistema
 */

// Verificar si el usuario está autenticado al cargar la página
document.addEventListener('DOMContentLoaded', function() {
  checkAuthStatus();
});

/**
 * Verificar estado de autenticación
 */
function checkAuthStatus() {
  const userEmail = localStorage.getItem('userEmail');
  const loginScreen = document.getElementById('loginScreen');
  const dashboard = document.getElementById('dashboard');

  if (userEmail && loginScreen && dashboard) {
    // Usuario autenticado - mostrar dashboard
    loginScreen.style.display = 'none';
    dashboard.style.display = 'flex';
    initDashboard();
  } else if (loginScreen && dashboard) {
    // Usuario no autenticado - mostrar login
    loginScreen.style.display = 'flex';
    dashboard.style.display = 'none';
  }
}

/**
 * Toggle visibilidad de contraseña en login
 */
function togglePasswordVisibilityLogin() {
  const field = document.getElementById('password');
  const icon = document.getElementById('eye-icon-login');
  
  if (field.type === 'password') {
    field.type = 'text';
    icon.classList.remove('bi-eye');
    icon.classList.add('bi-eye-slash');
  } else {
    field.type = 'password';
    icon.classList.remove('bi-eye-slash');
    icon.classList.add('bi-eye');
  }
}

/**
 * Función de login mejorada
 */
function login(event) {
  if (event) {
    event.preventDefault();
  }

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const recordar = document.getElementById('recordar')?.checked;

  // Validación
  if (!email) {
    showToast('Por favor ingresa un correo válido', { type: 'warning' });
    return;
  }

  if (!password) {
    showToast('Por favor ingresa una contraseña', { type: 'warning' });
    return;
  }

  // Validación de email
  if (!isValidEmail(email)) {
    showToast('El correo ingresado no es válido', { type: 'warning' });
    return;
  }

  try {
    // Obtener usuarios registrados
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    
    // Buscar usuario
    const usuarioEncontrado = usuarios.find(u => u.email === email);
    
    if (!usuarioEncontrado) {
      showToast('Correo o contraseña incorrectos', { type: 'warning' });
      return;
    }

    // Verificar contraseña (decodificar)
    const passwordDecodificada = atob(usuarioEncontrado.password);
    if (passwordDecodificada !== password) {
      showToast('Correo o contraseña incorrectos', { type: 'warning' });
      return;
    }

    // Verificar si la cuenta está activa
    if (!usuarioEncontrado.activo) {
      showToast('Tu cuenta ha sido desactivada. Contacta con soporte.', { type: 'error' });
      return;
    }

    // Login exitoso
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', usuarioEncontrado.nombre);
    localStorage.setItem('userId', usuarioEncontrado.id);
    
    if (recordar) {
      localStorage.setItem('recordar', 'true');
    }

    // Guardar información de último acceso
    localStorage.setItem('ultimoAcceso', new Date().toISOString());

    // Mostrar mensaje de éxito
    showToast('¡Bienvenido! Accediendo al sistema...', { type: 'success', delay: 1000 });

    // Esperar un poco y mostrar el dashboard
    setTimeout(() => {
      checkAuthStatus();
    }, 500);

  } catch (error) {
    showToast('Error al iniciar sesión', { type: 'error' });
    console.error('Error en login:', error);
  }
}

/**
 * Función de logout mejorada
 */
function logout() {
  if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
    try {
      // Limpiar localStorage
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      localStorage.removeItem('userId');
      localStorage.removeItem('ultimoAcceso');

      // Limpiar campos
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      
      if (emailInput) emailInput.value = '';
      if (passwordInput) passwordInput.value = '';

      // Volver a la pantalla de login
      checkAuthStatus();

      showToast('Sesión cerrada correctamente', { type: 'info' });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
}

/**
 * Validar correo electrónico
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Mostrar toast/notificación
 */
function showToast(message, options = {}) {
  const { type = 'info', delay = 0 } = options;
  const container = document.getElementById('toast-container');

  if (!container) {
    console.warn('Toast container no encontrado');
    alert(message);
    return;
  }

  const toastId = 'toast-' + Date.now();
  const alertClass = `alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'info'}`;

  const toastHTML = `
    <div id="${toastId}" class="alert ${alertClass} alert-dismissible fade show" role="alert">
      <strong>${capitalize(type)}:</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', toastHTML);

  // Auto-dismiss después de 5 segundos (o delay especificado)
  const timeoutDelay = delay || 5000;
  setTimeout(() => {
    const toastElement = document.getElementById(toastId);
    if (toastElement) {
      toastElement.remove();
    }
  }, timeoutDelay);
}

/**
 * Capitalizar una cadena
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Permitir login con Enter
 */
document.addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen && loginScreen.style.display !== 'none') {
      const password = document.getElementById('password');
      if (password === document.activeElement || event.target === password) {
        const form = document.getElementById('formularioLogin');
        if (form) {
          form.dispatchEvent(new Event('submit'));
        }
      }
    }
  }
});

/**
 * Precargar datos de demostración si no hay usuarios registrados
 */
document.addEventListener('DOMContentLoaded', function() {
  const usuariosExistentes = JSON.parse(localStorage.getItem('usuarios'));
  
  // Si no hay usuarios, crear uno de demostración
  if (!usuariosExistentes || usuariosExistentes.length === 0) {
    const usuarioDemostracion = {
      id: '1',
      nombre: 'Usuario Demostración',
      email: 'demo@ejemplo.com',
      telefono: '+57 300 123 4567',
      documento: '1234567890',
      password: btoa('Demo@12345'), // demo@12345 (para no olvidar)
      fecha_registro: new Date().toISOString(),
      activo: true
    };
    
    localStorage.setItem('usuarios', JSON.stringify([usuarioDemostracion]));
  }
});