// ============================================================
//  Firebase Configuration
//  Reemplaza los valores con los de tu proyecto Firebase
//  https://console.firebase.google.com
// ============================================================

const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
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
