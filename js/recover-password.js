function openRecoverPasswordModal() {
  const modalEl = document.getElementById('recoverPasswordModal');
  if (!modalEl) return;

  const emailInput = document.getElementById('recoverEmail');
  if (emailInput) {
    emailInput.value = document.getElementById('email')?.value.trim() || '';
    setTimeout(() => emailInput.focus(), 50);
  }

  if (window.bootstrap && typeof window.bootstrap.Modal === 'function') {
    const modal = new window.bootstrap.Modal(modalEl);
    modal.show();
  }
}

function closeRecoverPasswordModal() {
  const modalEl = document.getElementById('recoverPasswordModal');
  if (!modalEl) return;

  if (window.bootstrap && typeof window.bootstrap.Modal === 'function') {
    const instance = window.bootstrap.Modal.getInstance(modalEl);
    if (instance) {
      instance.hide();
      return;
    }
  }

  modalEl.classList.remove('show');
  modalEl.setAttribute('aria-hidden', 'true');
}

function getResetActionCodeSettings() {
  const currentUrl = new URL(window.location.href);
  const path = currentUrl.pathname.replace(/\/[^/]*$/, '/reset-password.html');
  const resetTargetUrl = `${currentUrl.origin}${path}`;
  return {
    url: resetTargetUrl,
    handleCodeInApp: true
  };
}

function getRecoverSubmitButton() {
  return document.getElementById('recoverPasswordSubmit');
}

function setRecoverSubmitLoading(isLoading) {
  const submitBtn = getRecoverSubmitButton();
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
  submitBtn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
}

async function recoverPassword(event) {
  if (event) event.preventDefault();

  const emailInput = document.getElementById('recoverEmail');
  const email = (emailInput?.value || '').trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    showToast('Ingresa un correo válido para recuperar la contraseña', { type: 'warning' });
    return;
  }

  const fbAuthInstance = typeof fbAuth === 'function' ? fbAuth() : null;
  const canSendRealResetEmail = Boolean(
    window.FIREBASE_CONFIGURED &&
    fbAuthInstance &&
    typeof fbAuthInstance.sendPasswordResetEmail === 'function'
  );

  if (!canSendRealResetEmail) {
    showToast('No se puede enviar un correo real de recuperación. Configura Firebase Auth para habilitar esta función.', { type: 'error', delay: 5000 });
    return;
  }

  setRecoverSubmitLoading(true);
  try {
    const actionCodeSettings = getResetActionCodeSettings();
    await fbAuthInstance.sendPasswordResetEmail(email, actionCodeSettings);

    // Mensaje genérico para no exponer si el correo existe o no.
    showToast('Si el correo está registrado, recibirás un enlace de recuperación en unos minutos.', {
      type: 'success',
      delay: 5000
    });
    closeRecoverPasswordModal();
  } catch (err) {
    const code = err && err.code ? err.code : '';
    if (code === 'auth/invalid-email') {
      showToast('El formato del correo no es válido.', { type: 'warning' });
      return;
    }
    if (code === 'auth/too-many-requests') {
      showToast('Demasiadas solicitudes. Intenta de nuevo en unos minutos.', { type: 'warning', delay: 5000 });
      return;
    }
    if (code === 'auth/missing-continue-uri' || code === 'auth/invalid-continue-uri' || code === 'auth/unauthorized-continue-uri') {
      showToast('No se pudo enviar el correo por configuración de dominio en Firebase.', { type: 'error', delay: 6000 });
      return;
    }

    showToast('No se pudo enviar el correo de recuperación. Verifica la configuración de Firebase Auth.', {
      type: 'error',
      delay: 6000
    });
  } finally {
    setRecoverSubmitLoading(false);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', openRecoverPasswordModal);
  }

  const recoverPasswordSubmit = document.getElementById('recoverPasswordSubmit');
  if (recoverPasswordSubmit) {
    recoverPasswordSubmit.addEventListener('click', recoverPassword);
  }

  const recoverEmailInput = document.getElementById('recoverEmail');
  if (recoverEmailInput) {
    recoverEmailInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        recoverPassword(event);
      }
    });
  }
});
