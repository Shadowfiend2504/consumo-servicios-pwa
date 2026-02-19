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

function obtenerUmbrales(){
  // umbrales por servicio en porcentaje (por ejemplo 20 -> 20%)
  return JSON.parse(localStorage.getItem('umbrales')) || {"Agua":20,"Energía":20,"Gas":20,"Internet":20};
}

function guardarUmbral(servicio, porcentaje){
  const u = obtenerUmbrales();
  u[servicio] = Number(porcentaje);
  localStorage.setItem('umbrales', JSON.stringify(u));
}

function promedioHistoricoPorServicio(facturas, servicio){
  const fs = facturas.filter(f=>f.servicio===servicio).map(f=>Number(f.consumo));
  if(fs.length===0) return null;
  const suma = fs.reduce((s,x)=>s+x,0);
  return suma/fs.length;
}

function compararYGenerarAlertas(){
  const facturas = getFacturas();
  const umbrales = obtenerUmbrales();
  // agrupar por servicio y ordenar por periodo (si existe) o fecha
  const porServicio = {};
  facturas.forEach(f=>{
    if(!porServicio[f.servicio]) porServicio[f.servicio]=[];
    porServicio[f.servicio].push(f);
  });

  Object.keys(porServicio).forEach(serv => {
    const arr = porServicio[serv];
    // ordenar por periodo si existe, sino por fecha_creacion
    arr.sort((a,b)=>{
      if(a.periodo && b.periodo) return a.periodo.localeCompare(b.periodo);
      return (a.fecha_creacion||'').localeCompare(b.fecha_creacion||'');
    });

    for(let i=1;i<arr.length;i++){
      const prev = arr[i-1];
      const cur = arr[i];
      const prevCons = Number(prev.consumo)||0;
      const curCons = Number(cur.consumo)||0;
      let variacionPct = null;
      if(prevCons>0) variacionPct = ((curCons - prevCons)/prevCons)*100;

      // variación vs promedio historico
      const promedio = promedioHistoricoPorServicio(arr.slice(0,i), serv);

      const umbral = umbrales[serv] !== undefined ? Number(umbrales[serv]) : 20;

      if(variacionPct!==null && Math.abs(variacionPct) > umbral){
        // registrar alerta
        const mensaje = `Variación ${variacionPct.toFixed(2)}% respecto al periodo anterior`;
        window.registrarAlerta({servicio: serv, tipo: 'variación', mensaje});
      }

      if(promedio !== null && promedio>0){
        const excesoPct = ((curCons - promedio)/promedio)*100;
        if(excesoPct > umbral){
          const mensaje = `Consumo ${excesoPct.toFixed(2)}% superior al promedio histórico`;
          window.registrarAlerta({servicio: serv, tipo: 'exceso_vs_promedio', mensaje});
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  const user = localStorage.getItem('usuario');
  if(!user){
    window.location.href = 'index.html';
    return;
  }
  const userEl = document.getElementById('usuario');
  if(userEl) userEl.textContent = 'Usuario: ' + user;

  // mostrar umbrales y permitir modificarlos
  const umbrales = obtenerUmbrales();
  const resumenEl = document.getElementById('resumen');
  const alertasEl = document.getElementById('alertas');

  if(!resumenEl) return;

  const facturas = getFacturas();

  // sincronizar con perfil (si existe)
  const perfilObj = (window.perfil && window.perfil.obtenerPerfil) ? window.perfil.obtenerPerfil() : null;
  if(perfilObj && perfilObj.umbrales){
    localStorage.setItem('umbrales', JSON.stringify(perfilObj.umbrales));
  }

  // generar alertas antes de renderizar
  compararYGenerarAlertas();
  if(window.mostrarAlertasEn && alertasEl) window.mostrarAlertasEn('alertas');

  if(facturas.length === 0){
    resumenEl.innerHTML = '<p>No hay facturas registradas.</p>';
    return;
  }

  let html = '<h3>Historial de facturas</h3><ul>';
  facturas.slice().reverse().forEach(f=>{
    html += `<li>${(f.periodo||f.fecha_creacion||f.fecha||'') .toString().split('T')[0]} — ${f.servicio}: consumo ${f.consumo}, valor ${f.valor}</li>`;
  });
  html += '</ul>';

  // mostrar controles de umbral
  html += '<h3>Umbrales por servicio (%)</h3><div id="umbrales-controls">';
  Object.keys(umbrales).forEach(s=>{
    html += `<label class="me-2">${s}: <input data-servicio="${s}" class="umbral-input form-control d-inline-block" style="width:80px" type="number" value="${umbrales[s]}"></label>`;
  });
  html += '<div class="mt-2"><button id="guardar-umbrales" class="btn btn-sm btn-primary">Guardar umbrales</button></div></div>';

  resumenEl.innerHTML = html;

  const btnGuardar = document.getElementById('guardar-umbrales');
  if(btnGuardar){
    btnGuardar.addEventListener('click',()=>{
      document.querySelectorAll('.umbral-input').forEach(inp=>{
        const serv = inp.dataset.servicio;
        guardarUmbral(serv, inp.value);
      });
      if(window.showToast) window.showToast('Umbrales guardados', {type:'success'});
    });
  }

  // inicializar gráfico y filtros
  const canvas = document.getElementById('chart-consumo');
  let chart = null;

  function renderChart(servicio, desde, hasta){
    const all = getFacturas().filter(f=>f.servicio===servicio);
    const byPeriodo = all.slice().sort((a,b)=> (a.periodo||a.fecha_creacion||'').localeCompare(b.periodo||b.fecha_creacion||''));
    const labels = [];
    const data = [];
    byPeriodo.forEach(f=>{
      if(desde && f.periodo && f.periodo < desde) return;
      if(hasta && f.periodo && f.periodo > hasta) return;
      labels.push(f.periodo || (f.fecha_creacion||'').split('T')[0]);
      data.push(Number(f.consumo)||0);
    });
    if(chart) chart.destroy();
    chart = new Chart(canvas, {
      type: 'line',
      data: {labels, datasets:[{label: servicio, data, borderColor: '#0b5fff', backgroundColor: 'rgba(11,95,255,0.08)'}]},
      options: {responsive:true, maintainAspectRatio:false}
    });
  }

  const btnFiltrar = document.getElementById('btn-filtrar');
  if(btnFiltrar){
    btnFiltrar.addEventListener('click', ()=>{
      const svc = document.getElementById('filtro-servicio').value;
      const desde = document.getElementById('filtro-desde').value;
      const hasta = document.getElementById('filtro-hasta').value;
      renderChart(svc, desde || null, hasta || null);
    });
  }

  // render inicial
  const svcInit = document.getElementById('filtro-servicio') ? document.getElementById('filtro-servicio').value : 'Agua';
  renderChart(svcInit, null, null);

  // detectar tendencia simple por servicio (pendiente contra promedio previo)
  window.detectarTendencias = function(){
    const servicios = ['Agua','Energía','Gas','Internet'];
    const tendencias = {};
    servicios.forEach(serv=>{
      const vals = getFacturas().filter(f=>f.servicio===serv).map(f=>Number(f.consumo)||0);
      if(vals.length<2){ tendencias[serv]='sin datos'; return; }
      const n = vals.length;
      const ultimo = vals[n-1];
      const prevAvg = vals.slice(0,n-1).reduce((s,x)=>s+x,0)/(n-1);
      const cambioPct = prevAvg>0 ? ((ultimo - prevAvg)/prevAvg)*100 : 0;
      if(cambioPct > 5) tendencias[serv]='creciente';
      else if(cambioPct < -5) tendencias[serv]='decreciente';
      else tendencias[serv]='estable';
    });
    return tendencias;
  };
});