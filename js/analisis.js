document.addEventListener('DOMContentLoaded',()=>{
// analisis.js - cálculo de variaciones y manejo de navegación

function getFacturas() {
  return JSON.parse(localStorage.getItem('facturas')) || [];
}

function irRegistro() {
  window.location.href = 'registrar.html';
}

function logout() {
  localStorage.removeItem('usuario');
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded',()=>{
  const user = localStorage.getItem('usuario');
  if(!user){
    window.location.href = 'index.html';
    return;
  }
  const userEl = document.getElementById('usuario');
  if(userEl) userEl.textContent = 'Usuario: ' + user;

  const facturas = getFacturas();
  const resumenEl = document.getElementById('resumen');
  if(!resumenEl) return;

  if(facturas.length === 0){
    resumenEl.innerHTML = '<p>No hay facturas registradas.</p>';
    return;
  }

  let html = '<ul>';
  for(let i=0;i<facturas.length;i++){
    const f = facturas[i];
    html += `<li>${f.fecha.split('T')[0]} — ${f.servicio}: consumo ${f.consumo}, valor ${f.valor}</li>`;
    if(i>0){
      const prev = facturas[i-1];
      let variacion = null;
      if(prev.consumo === 0){
        variacion = null;
      } else {
        variacion = ((f.consumo - prev.consumo)/prev.consumo)*100;
      }
      if(variacion !== null){
        html += `<p>Variación vs previa: ${variacion.toFixed(2)}%</p>`;
        if(Math.abs(variacion) > 20){
          alert(`⚠️ Aumento inusual de consumo en ${f.servicio}: ${variacion.toFixed(2)}%`);
        }
      } else {
        html += `<p>Variación vs previa: N/A</p>`;
      }
    }
  }
  html += '</ul>';
  resumenEl.innerHTML = html;
});