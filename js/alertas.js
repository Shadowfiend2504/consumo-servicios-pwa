// alertas.js - sistema de notificaciones simples (placeholder)
export function mostrarAlerta(msg){
  // En navegadores sin bundler esto fallará; placeholder para futuro
  alert(msg);
}

// Si no hay soporte de módulos, exponer globalmente
window.mostrarAlerta = window.mostrarAlerta || function(m){ alert(m); };