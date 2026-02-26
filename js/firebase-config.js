// ============================================================
//  Firebase Configuration
//  Reemplaza los valores con los de tu proyecto Firebase
//  https://console.firebase.google.com
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyAhqqPY_gM3MCIQ4NMxvvP6GvdCbpHcyIE",
  authDomain: "sistemapwa.firebaseapp.com",
  projectId: "sistemapwa",
  storageBucket: "sistemapwa.firebasestorage.app",
  messagingSenderId: "763042636645",
  appId: "1:763042636645:web:7d44b4bcf08afa76ed778c",
  measurementId: "G-YYXXH3RM49"
};

// Detectar si Firebase está configurado
const FIREBASE_CONFIGURED = firebaseConfig.apiKey !== "TU_API_KEY_AQUI";

let firebaseApp = null;
let auth = null;
let db = null;

if (FIREBASE_CONFIGURED) {
    try {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        console.log('✅ Firebase inicializado correctamente');
    } catch (e) {
        console.warn('⚠️ Error al inicializar Firebase:', e);
    }
} else {
    console.log('ℹ️ Firebase no configurado — usando localStorage como fallback');
}
