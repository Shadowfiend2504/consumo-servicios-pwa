// alertas.js - registrar y mostrar alertas en localStorage

function registrarAlerta(obj){
  const list = JSON.parse(localStorage.getItem('alertas')) || [];
  list.push(Object.assign({fecha: new Date().toISOString(), estado: 'nueva'}, obj));
  localStorage.setItem('alertas', JSON.stringify(list));
}

function obtenerAlertas(){
  return JSON.parse(localStorage.getItem('alertas')) || [];
}

function limpiarAlertas(){
  localStorage.removeItem('alertas');
}

function mostrarAlertasEn(elementId){
  const el = document.getElementById(elementId);
  if(!el) return;
  const list = obtenerAlertas();
  if(list.length===0){
    el.innerHTML = '<p>No hay alertas.</p>';
    return;
  }
  let html = '<div class="list-group">';
  list.slice().reverse().forEach((a, idx)=>{
    const id = 'alert-'+idx;
    html += `
      <div class="list-group-item d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-bold">${a.servicio} — ${a.tipo}</div>
          <div class="small text-muted">${a.fecha.split('T')[0]}</div>
          <div>${a.mensaje}</div>
        </div>
        <div class="text-end">
          <div class="mb-2">Estado: <span class="badge bg-info text-dark">${a.estado}</span></div>
          <div class="d-flex flex-column gap-2">
            <button class="btn btn-sm btn-outline-primary" data-accion="revisar" data-idx="${idx}">Marcar revisada</button>
            <button class="btn btn-sm btn-outline-success" data-accion="atender" data-idx="${idx}">Marcar atendida</button>
            <button class="btn btn-sm btn-outline-secondary" data-accion="sugerir" data-idx="${idx}">Sugerencia</button>
          </div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  el.innerHTML = html;

  // añadir handlers
  el.querySelectorAll('button[data-accion]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const accion = btn.dataset.accion;
      const idx = Number(btn.dataset.idx);
      const arr = obtenerAlertas();
      const revIdx = arr.length - 1 - idx; // inverso
      if(accion==='revisar'){
        arr[revIdx].estado = 'revisada';
        localStorage.setItem('alertas', JSON.stringify(arr));
        if(window.showToast) window.showToast('Alerta marcada como revisada', {type:'info'});
        mostrarAlertasEn(elementId);
      }
      if(accion==='atender'){
        arr[revIdx].estado = 'atendida';
        localStorage.setItem('alertas', JSON.stringify(arr));
        if(window.showToast) window.showToast('Alerta marcada como atendida', {type:'success'});
        mostrarAlertasEn(elementId);
      }
      if(accion==='sugerir'){
        const a = arr[revIdx];
        const suger = generarSugerencia(a);
        if(window.showToast) window.showToast(suger, {type:'warning', delay:8000});
      }
    });
  });
}

window.registrarAlerta = registrarAlerta;
window.obtenerAlertas = obtenerAlertas;
window.mostrarAlertasEn = mostrarAlertasEn;
window.limpiarAlertas = limpiarAlertas;

// Mostrar notificación tipo toast con Bootstrap
function showToast(message, options = {}){
  const {type = 'info', delay = 5000} = options;
  const container = document.getElementById('toast-container');
  if(!container) return alert(message);

  // crear elemento toast
  const toastEl = document.createElement('div');
  toastEl.className = 'toast align-items-center text-bg-light border-0';
  toastEl.setAttribute('role','alert');
  toastEl.setAttribute('aria-live','assertive');
  toastEl.setAttribute('aria-atomic','true');
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  // adaptar estilos según tipo
  if(type === 'success') toastEl.classList.add('bg-success','text-white');
  if(type === 'warning') toastEl.classList.add('bg-warning','text-dark');
  if(type === 'danger') toastEl.classList.add('bg-danger','text-white');

  container.appendChild(toastEl);
  const bsToast = new bootstrap.Toast(toastEl, {delay});
  bsToast.show();

  // limpiar después de ocultarse
  toastEl.addEventListener('hidden.bs.toast', ()=>{
    toastEl.remove();
  });
}

window.showToast = showToast;

function generarSugerencia(alerta){
  if(!alerta) return 'Revise el historial del servicio y verifique consumos atípicos.';
  if(alerta.tipo === 'variación') return 'Verifique posibles fugas, electrodomésticos y cambios recientes en el hogar.';
  if(alerta.tipo === 'exceso_vs_promedio') return 'Compare con períodos anteriores y consulte tarifas o lecturas; revise medidor.';
  return 'Revise el historial y confirme la factura con el proveedor.';
}

window.generarSugerencia = generarSugerencia;