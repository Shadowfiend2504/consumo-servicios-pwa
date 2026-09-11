function getResetElements() {
  return {
    statusText: document.getElementById('resetStatus'),
    form: document.getElementById('resetPasswordForm'),
    newPassword: document.getElementById('newPassword'),
    confirmPassword: document.getElementById('confirmPassword'),
    submitBtn: document.getElementById('resetSubmitBtn')
  };
}

function showToast(message, options = {}) {
  const { type = 'info', delay = 5000 } = options;
  const container = document.getElementById('toast-container');
  if (!container) {
    alert(message);
    return;
  }
  const toastId = 'toast-' + Date.now();
  const safeType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
  const cls = safeType === 'success'
    ? 'alert-success'
    : safeType === 'error'
      ? 'alert-danger'
      : safeType === 'warning'
        ? 'alert-warning'
        : 'alert-info';

  container.insertAdjacentHTML('beforeend', `
    <div id="${toastId}" class="alert ${cls} alert-dismissible fade show" role="alert" style="min-width:280px">
      <strong>${safeType.charAt(0).toUpperCase() + safeType.slice(1)}:</strong> ${String(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `);

  setTimeout(() => {
    const el = document.getElementById(toastId);
    if (el) el.remove();
  }, delay);
}

function validatePassword(password) {
  if (password.length < 8) return { ok: false, msg: 'La contraseña debe tener mínimo 8 caracteres.' };
  if (!/[A-Z]/.test(password)) return { ok: false, msg: 'Incluye al menos una letra mayúscula.' };
  if (!/[0-9]/.test(password)) return { ok: false, msg: 'Incluye al menos un número.' };
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return { ok: false, msg: 'Incluye al menos un símbolo especial.' };
  return { ok: true };
}

function updateStatus(message, isError = false) {
  const { statusText } = getResetElements();
  if (!statusText) return;
  statusText.textContent = message;
  statusText.classList.toggle('text-danger', isError);
  statusText.classList.toggle('text-muted', !isError);
}

function setLoading(isLoading) {
  const { submitBtn } = getResetElements();
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
  submitBtn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
}

async function initResetPasswordFlow() {
  const { form, newPassword, confirmPassword, submitBtn } = getResetElements();
  if (!form || !newPassword || !confirmPassword || !submitBtn) return;

  const authInstance = window.auth || window.firebaseAuth || null;
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const oobCode = params.get('oobCode');

  if (!window.FIREBASE_CONFIGURED || !authInstance) {
    updateStatus('Firebase no está configurado. No se puede restablecer la contraseña.', true);
    showToast('Configura Firebase para usar restablecimiento de contraseña real.', { type: 'error', delay: 7000 });
    return;
  }

  if (mode !== 'resetPassword' || !oobCode) {
    updateStatus('El enlace no es válido o ya expiró.', true);
    showToast('Enlace inválido. Solicita un nuevo correo de recuperación.', { type: 'error', delay: 7000 });
    return;
  }

  try {
    const email = await authInstance.verifyPasswordResetCode(oobCode);
    updateStatus(`Vas a restablecer la contraseña de ${email}.`);
    submitBtn.disabled = false;
  } catch (error) {
    updateStatus('El enlace no es válido o ya expiró.', true);
    showToast('El enlace de recuperación expiró. Solicita uno nuevo.', { type: 'error', delay: 7000 });
    return;
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const password = newPassword.value;
    const passwordConfirm = confirmPassword.value;

    const validation = validatePassword(password);
    if (!validation.ok) {
      showToast(validation.msg, { type: 'warning' });
      return;
    }

    if (password !== passwordConfirm) {
      showToast('Las contraseñas no coinciden.', { type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await authInstance.confirmPasswordReset(oobCode, password);
      showToast('Contraseña actualizada correctamente. Ya puedes iniciar sesión.', { type: 'success', delay: 4500 });
      updateStatus('Contraseña cambiada. Redirigiendo al inicio de sesión...');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    } catch (error) {
      const code = error && error.code ? error.code : '';
      if (code === 'auth/weak-password') {
        showToast('La contraseña es demasiado débil.', { type: 'warning' });
      } else if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        showToast('El enlace de recuperación expiró. Solicita uno nuevo.', { type: 'error', delay: 7000 });
      } else {
        showToast('No se pudo actualizar la contraseña. Intenta nuevamente.', { type: 'error', delay: 7000 });
      }
    } finally {
      setLoading(false);
    }
  });
}

document.addEventListener('DOMContentLoaded', initResetPasswordFlow);
