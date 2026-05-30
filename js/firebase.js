/**
 * Configuración compartida de Firebase para autenticación y Firestore.
 */
(function () {
  const firebaseConfig = window.__FIREBASE_CONFIG__ || window.firebaseConfig || null;

  if (!firebaseConfig) {
    console.warn('Configuración de Firebase no disponible. Define window.__FIREBASE_CONFIG__ antes de cargar js/firebase.js.');
    return;
  }

  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK no disponible.');
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  try {
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  } catch (error) {
    console.warn('No se pudo configurar la persistencia de Firebase Auth.', error);
  }

  window.firebaseApp = firebase.app();
  window.firebaseAuth = auth;
  window.firebaseDb = db;

  window.getCurrentUserId = function () {
    return auth.currentUser?.uid || localStorage.getItem('userId') || '';
  };

  window.getCurrentUserEmail = function () {
    return auth.currentUser?.email || localStorage.getItem('userEmail') || '';
  };

  window.syncLocalSessionFromUser = async function (user, profile = {}) {
    if (!user) {
      return;
    }

    const normalizedProfile = profile && typeof profile === 'object' ? profile : {};
    const displayName = user.displayName || normalizedProfile.nombre || normalizedProfile.name || (user.email ? user.email.split('@')[0] : 'Usuario');

    localStorage.setItem('userEmail', user.email || normalizedProfile.email || '');
    localStorage.setItem('userName', displayName);
    localStorage.setItem('userId', user.uid || normalizedProfile.id || '');
    localStorage.setItem('ultimoAcceso', new Date().toISOString());

    if (normalizedProfile.telefono) {
      localStorage.setItem('userPhone', normalizedProfile.telefono);
    }

    if (normalizedProfile.documento) {
      localStorage.setItem('userDocument', normalizedProfile.documento);
    }

    return {
      id: user.uid,
      email: user.email || normalizedProfile.email || '',
      nombre: displayName,
      telefono: normalizedProfile.telefono || '',
      documento: normalizedProfile.documento || '',
      activo: normalizedProfile.activo !== false
    };
  };

  window.clearLocalSession = function () {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('ultimoAcceso');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userDocument');
  };

  window.getCurrentUserProfile = async function () {
    const user = auth.currentUser;

    if (!user) {
      return null;
    }

    try {
      const snapshot = await db.collection('usuarios').doc(user.uid).get();
      return snapshot.exists ? snapshot.data() : null;
    } catch (error) {
      console.error('Error al leer el perfil de usuario desde Firestore:', error);
      return null;
    }
  };

  window.saveUserProfile = async function (user, profile) {
    if (!user) {
      throw new Error('No hay usuario autenticado.');
    }

    const payload = {
      id: user.uid,
      uid: user.uid,
      nombre: profile.nombre || user.displayName || '',
      email: profile.email || user.email || '',
      telefono: profile.telefono || '',
      documento: profile.documento || '',
      activo: profile.activo !== false,
      fecha_registro: profile.fecha_registro || new Date().toISOString()
    };

    await db.collection('usuarios').doc(user.uid).set(payload, { merge: true });
    return payload;
  };

  window.obtenerFacturasActuales = async function () {
    const userId = window.getCurrentUserId();

    if (!userId) {
      return [];
    }

    try {
      const snapshot = await db.collection('facturas').where('userId', '==', userId).get();
      const facturas = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      return facturas.sort((a, b) => new Date(b.fecha_registro || 0) - new Date(a.fecha_registro || 0));
    } catch (error) {
      console.error('Error al obtener facturas desde Firestore:', error);
      return [];
    }
  };

  window.guardarFacturaActual = async function (factura) {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('Debes iniciar sesión para registrar una factura.');
    }

    const payload = {
      ...factura,
      userId: user.uid,
      userEmail: user.email || '',
      fecha_registro: factura.fecha_registro || new Date().toISOString()
    };

    await db.collection('facturas').doc(payload.id).set(payload);
    return payload;
  };

  window.actualizarFacturaActual = async function (facturaId, updates) {
    await db.collection('facturas').doc(facturaId).update(updates);
  };

  window.eliminarFacturaActual = async function (facturaId) {
    await db.collection('facturas').doc(facturaId).delete();
  };
})();