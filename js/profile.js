// profile.js - gestión de perfil y configuración del hogar
(function(){
  function obtenerPerfil(){
    return JSON.parse(localStorage.getItem('perfil')) || {
      nombre: '',
      correo: localStorage.getItem('usuario') || '',
      zona: '',
      tipo: '',
      servicios: {Agua:true,'Energía':true,Gas:true,Internet:true},
      umbrales: {Agua:20,'Energía':20,Gas:20,Internet:20}
    };
  }

  function guardarPerfil(p){
    localStorage.setItem('perfil', JSON.stringify(p));
    // sincronizar umbrales globales
    localStorage.setItem('umbrales', JSON.stringify(p.umbrales||{}));
  }

  function openPerfilModal(){
    const perfil = obtenerPerfil();
    // crear modal dinámico
    let html = `
      <div class="modal fade" id="modalPerfil" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Perfil y configuración del hogar</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3"><label class="form-label">Nombre del hogar</label><input id="perfil-nombre" class="form-control" value="${perfil.nombre}"></div>
              <div class="mb-3"><label class="form-label">Correo</label><input id="perfil-correo" class="form-control" value="${perfil.correo}"></div>
              <div class="mb-3"><label class="form-label">Zona</label><input id="perfil-zona" class="form-control" value="${perfil.zona}"></div>
              <div class="mb-3"><label class="form-label">Tipo de vivienda (opcional)</label><input id="perfil-tipo" class="form-control" value="${perfil.tipo}"></div>
              <h6>Servicios a monitorear</h6>
              ${Object.keys(perfil.servicios).map(s=>`<div class="form-check"><input class="form-check-input" type="checkbox" id="svc-${s}" "+(perfil.servicios[s]? 'checked':'')+" ><label class="form-check-label">${s}</label></div>`).join('')}
              <h6 class="mt-3">Umbrales por servicio (%)</h6>
              ${Object.keys(perfil.umbrales).map(s=>`<div class="mb-2"><label class="form-label">${s}</label><input class="form-control umbral-input" data-servicio="${s}" value="${perfil.umbrales[s]}"></div>`).join('')}
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
              <button id="perfil-guardar" class="btn btn-primary">Guardar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // insertar modal en body
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    document.body.appendChild(tmp);
    const modalEl = document.getElementById('modalPerfil');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    modalEl.addEventListener('hidden.bs.modal', ()=>{ modalEl.remove(); });

    document.getElementById('perfil-guardar').addEventListener('click', ()=>{
      const nuevo = obtenerPerfil();
      nuevo.nombre = document.getElementById('perfil-nombre').value;
      nuevo.correo = document.getElementById('perfil-correo').value;
      nuevo.zona = document.getElementById('perfil-zona').value;
      nuevo.tipo = document.getElementById('perfil-tipo').value;
      Object.keys(nuevo.servicios).forEach(s=>{
        const el = document.getElementById('svc-'+s);
        if(el) nuevo.servicios[s] = !!el.checked;
      });
      document.querySelectorAll('.umbral-input').forEach(inp=>{
        const s = inp.dataset.servicio;
        nuevo.umbrales[s] = Number(inp.value)||20;
      });
      guardarPerfil(nuevo);
      if(window.showToast) window.showToast('Perfil guardado', {type:'success'});
      modal.hide();
      // recargar alertas/umbrales
      if(window.mostrarAlertasEn) window.mostrarAlertasEn('alertas');
    });
  }

  window.perfil = {
    obtenerPerfil,
    guardarPerfil,
    openPerfilModal
  };
})();
