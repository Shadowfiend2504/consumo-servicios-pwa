// ============================================================
//  App.js — Control de Consumo del Hogar
// ============================================================

const SERVICE_META = {
  agua:     { label:'Agua',     icon:'bi-droplet-fill',   unit:'m³',   emoji:'💧', cls:'agua' },
  energia:  { label:'Energía',  icon:'bi-lightning-fill',  unit:'kWh',  emoji:'⚡', cls:'energia' },
  gas:      { label:'Gas',      icon:'bi-fire',           unit:'m³',   emoji:'🔥', cls:'gas' },
  internet: { label:'Internet', icon:'bi-wifi',           unit:'Mbps', emoji:'📶', cls:'internet' }
};

// data access now goes through DataService which handles Firestore/localStorage logic
async function getFacturas(){
  return await DataService.getFacturas();
}
async function getPerfil(){
  return await DataService.getPerfil();
}
async function savePerfil(p){
  return await DataService.savePerfil(p);
}

// ============ NAVIGATION ============
async function showSection(name, ev){
  if(ev) ev.preventDefault();
  document.querySelectorAll('.content-section').forEach(s=>s.classList.remove('active'));
  const t=document.getElementById(name+'-section');
  if(t) t.classList.add('active');
  document.querySelectorAll('.sidebar .nav-link').forEach(l=>l.classList.remove('active'));
  const a=document.querySelector(`[data-section="${name}"]`);
  if(a) a.classList.add('active');
  await loadSectionContent(name);
  if(window.innerWidth<=768) closeMenu();
}

async function loadSectionContent(name){
  const c=document.getElementById(name+'-content');
  if(!c) return;
  const map={inicio:loadInicio,perfil:loadPerfil,facturas:loadFacturas,analisis:loadAnalisis,alertas:loadAlertasSection,reportes:loadReportes};
  if(map[name]) await map[name](c);
}

function toggleMenu(){
  const s=document.getElementById('sidebar'), d=document.querySelector('.dashboard-container');
  if(s){ s.classList.toggle('open'); d.classList.toggle('sidebar-open'); }
}
function closeMenu(){
  const s=document.getElementById('sidebar'), d=document.querySelector('.dashboard-container');
  if(s){ s.classList.remove('open'); d.classList.remove('sidebar-open'); }
}
document.addEventListener('click',e=>{
  const s=document.getElementById('sidebar'),b=document.querySelector('.btn-menu-toggle');
  if(window.innerWidth<=768&&s&&b&&!s.contains(e.target)&&!b.contains(e.target)) closeMenu();
});

// ============ DASHBOARD / INICIO ============
async function loadInicio(c){
  const facturas = await getFacturas();
  const perfil = await getPerfil();
  const activos = Object.keys(perfil.servicios).filter(k=>perfil.servicios[k]);

  // Summary cards
  let cardsHtml='<div class="gap-grid gap-grid-4 mb-4">';
  activos.forEach(svc=>{
    const m=SERVICE_META[svc]||SERVICE_META.agua;
    const fs=facturas.filter(f=>f.servicio===svc).sort((a,b)=>(b.periodo||'').localeCompare(a.periodo||''));
    const last=fs[0];
    const consumo=last?last.consumo:0, valor=last?last.valor:0;
    let trendHtml='';
    if(fs.length>=2){
      const prev=fs[1].consumo||0;
      if(prev>0){
        const pct=((consumo-prev)/prev*100).toFixed(1);
        const cls=pct>0?'up':pct<0?'down':'stable';
        const arrow=pct>0?'↑':pct<0?'↓':'→';
        trendHtml=`<span class="trend-badge ${cls}">${arrow} ${Math.abs(pct)}%</span>`;
      }
    }
    cardsHtml+=`
      <div class="card-stat ${m.cls}">
        <div class="stat-icon ${m.cls}"><i class="bi ${m.icon}"></i></div>
        <div class="stat-content">
          <div class="stat-number">${consumo} ${m.unit}</div>
          <div class="stat-label">${m.label} — $${Number(valor).toLocaleString('es-CO')} ${trendHtml}</div>
        </div>
      </div>`;
  });
  cardsHtml+='</div>';

  // Alerts count
  const alertas=await DataService.getAlertas();
  const nuevas=alertas.filter(a=>a.estado==='nueva').length;

  // Chart
  let chartHtml=`
    <div class="gap-grid gap-grid-2 mb-4">
      <div class="data-card">
        <div class="data-card-header"><h5><i class="bi bi-bar-chart-line me-2"></i>Consumo por Servicio</h5></div>
        <div class="data-card-body"><div class="chart-container"><canvas id="dashChart"></canvas></div></div>
      </div>
      <div class="data-card">
        <div class="data-card-header"><h5><i class="bi bi-cash-stack me-2"></i>Costo por Servicio</h5></div>
        <div class="data-card-body"><div class="chart-container"><canvas id="dashCostChart"></canvas></div></div>
      </div>
    </div>`;

  // Alerts banner
  let alertBanner='';
  if(nuevas>0){
    alertBanner=`<div class="alert-card warning mb-4" style="cursor:pointer" onclick="showSection('alertas')">
      <div class="alert-icon warning"><i class="bi bi-bell-fill"></i></div>
      <div><strong>${nuevas} alerta${nuevas>1?'s':''} sin revisar</strong><br><small class="text-muted">Haz clic para ver las alertas</small></div>
    </div>`;
  }

  c.innerHTML=alertBanner+cardsHtml+chartHtml;
  await updateAlertBadges();
  renderDashCharts(facturas, activos);
}

function renderDashCharts(facturas, activos){
  if(typeof Chart==='undefined') return;
  const periodos=[...new Set(facturas.map(f=>f.periodo))].sort();
  const last6=periodos.slice(-6);
  // Consumption chart
  const canvas1=document.getElementById('dashChart');
  if(canvas1){
    const datasets=activos.map(svc=>{
      const m=SERVICE_META[svc];
      const colors={agua:'#0ea5e9',energia:'#f59e0b',gas:'#ef4444',internet:'#10b981'};
      return {
        label:m.label,
        data:last6.map(p=>{ const f=facturas.find(x=>x.servicio===svc&&x.periodo===p); return f?f.consumo:0; }),
        borderColor:colors[svc], backgroundColor:colors[svc]+'20', tension:0.4, borderWidth:2, fill:true
      };
    });
    new Chart(canvas1,{type:'line',data:{labels:last6,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}}},scales:{y:{beginAtZero:true}}}});
  }
  // Cost chart
  const canvas2=document.getElementById('dashCostChart');
  if(canvas2){
    const datasets=activos.map(svc=>{
      const colors={agua:'#0ea5e9',energia:'#f59e0b',gas:'#ef4444',internet:'#10b981'};
      return {
        label:SERVICE_META[svc].label,
        data:last6.map(p=>{ const f=facturas.find(x=>x.servicio===svc&&x.periodo===p); return f?f.valor:0; }),
        backgroundColor:colors[svc]+'80', borderColor:colors[svc], borderWidth:1
      };
    });
    new Chart(canvas2,{type:'bar',data:{labels:last6,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}}},scales:{y:{beginAtZero:true}}}});
  }
}

async function updateAlertBadges(){
  const alertas = await DataService.getAlertas();
  const n = alertas.filter(a=>a.estado==='nueva').length;
  const hb=document.getElementById('headerAlertsBadge'),hc=document.getElementById('alertsBadgeCount');
  const sb=document.getElementById('sidebarAlertsBadge');
  if(hb){ hb.style.display=n>0?'block':'none'; if(hc) hc.textContent=n; }
  if(sb){ sb.style.display=n>0?'flex':'none'; sb.textContent=n; }
}

// ============ PERFIL ============
async function loadPerfil(c){
  const p=await getPerfil();
  p.correo=p.correo||localStorage.getItem('userEmail')||'';
  let svcToggles='';
  Object.keys(SERVICE_META).forEach(svc=>{
    const m=SERVICE_META[svc]; const checked=p.servicios[svc]!==false?'checked':'';
    const umb=p.umbrales[svc]||{consumo:0,valor:0};
    svcToggles+=`
    <div class="service-toggle">
      <div class="service-icon ${m.cls}" style="background:var(--color-${m.cls}-bg);color:var(--color-${m.cls})"><i class="bi ${m.icon}"></i></div>
      <div class="flex-grow-1"><strong>${m.label}</strong></div>
      <div class="form-check form-switch"><input class="form-check-input svc-check" type="checkbox" id="svc-${svc}" ${checked}></div>
    </div>
    <div class="row g-2 mb-3 ms-4" id="umbral-${svc}" style="${checked?'':'opacity:0.4'}">
      <div class="col-6"><label class="form-label small">Umbral consumo (${m.unit})</label><input type="number" class="form-control form-control-sm umbral-consumo" data-svc="${svc}" value="${umb.consumo||''}" placeholder="0 = sin límite"></div>
      <div class="col-6"><label class="form-label small">Umbral valor ($)</label><input type="number" class="form-control form-control-sm umbral-valor" data-svc="${svc}" value="${umb.valor||''}" placeholder="0 = sin límite"></div>
    </div>`;
  });

  c.innerHTML=`
  <div class="row g-4">
    <div class="col-lg-6">
      <div class="profile-card">
        <h5 class="mb-3"><i class="bi bi-person me-2"></i>Datos del Hogar</h5>
        <div class="mb-3"><label class="form-label">Nombre del hogar</label><input type="text" class="form-control" id="pNombre" value="${p.nombre||''}"></div>
        <div class="mb-3"><label class="form-label">Correo</label><input type="email" class="form-control" id="pCorreo" value="${p.correo}" readonly style="background:#f8fafc"></div>
        <div class="row g-3">
          <div class="col-6"><label class="form-label">Zona / Barrio</label><input type="text" class="form-control" id="pZona" value="${p.zona||''}"></div>
          <div class="col-6"><label class="form-label">Tipo de vivienda</label><select class="form-select" id="pTipo">
            <option value="">— Opcional —</option>
            <option value="casa" ${p.tipo==='casa'?'selected':''}>Casa</option>
            <option value="apartamento" ${p.tipo==='apartamento'?'selected':''}>Apartamento</option>
            <option value="finca" ${p.tipo==='finca'?'selected':''}>Finca</option>
          </select></div>
        </div>
        <button class="btn btn-primary mt-4" onclick="guardarPerfil()"><i class="bi bi-check-circle me-1"></i>Guardar Perfil</button>
      </div>
    </div>
    <div class="col-lg-6">
      <div class="profile-card">
        <h5 class="mb-3"><i class="bi bi-sliders me-2"></i>Servicios y Umbrales</h5>
        <p class="text-muted small mb-3">Activa los servicios y define umbrales de alerta</p>
        ${svcToggles}
        <button class="btn btn-primary mt-3" onclick="guardarPerfil()"><i class="bi bi-check-circle me-1"></i>Guardar Umbrales</button>
      </div>
    </div>
  </div>`;

  // Toggle opacity on service disable
  document.querySelectorAll('.svc-check').forEach(ch=>{
    ch.addEventListener('change',()=>{
      const svc=ch.id.replace('svc-','');
      document.getElementById('umbral-'+svc).style.opacity=ch.checked?'1':'0.4';
    });
  });
}

window.guardarPerfil=async function(){
  const p=await getPerfil();
  p.nombre=document.getElementById('pNombre').value;
  p.correo=document.getElementById('pCorreo').value;
  p.zona=document.getElementById('pZona').value;
  p.tipo=document.getElementById('pTipo').value;
  Object.keys(SERVICE_META).forEach(svc=>{
    const ch=document.getElementById('svc-'+svc);
    if(ch) p.servicios[svc]=ch.checked;
    const uc=document.querySelector(`.umbral-consumo[data-svc="${svc}"]`);
    const uv=document.querySelector(`.umbral-valor[data-svc="${svc}"]`);
    if(!p.umbrales[svc]) p.umbrales[svc]={};
    if(uc) p.umbrales[svc].consumo=Number(uc.value)||0;
    if(uv) p.umbrales[svc].valor=Number(uv.value)||0;
  });
  await savePerfil(p);
  if(typeof showToast==='function') showToast('Perfil guardado correctamente',{type:'success'});
};

// ============ FACTURAS ============
async function loadFacturas(c){
  const facturas=await getFacturas();
  let filterHtml=`
    <div class="d-flex flex-wrap gap-2 align-items-end mb-3">
      <div><label class="form-label small mb-1">Servicio</label><select class="form-select form-select-sm" id="filtroSvcFact" style="width:150px">
        <option value="">Todos</option>${Object.keys(SERVICE_META).map(s=>`<option value="${s}">${SERVICE_META[s].label}</option>`).join('')}
      </select></div>
      <a href="registrar.html" class="btn btn-primary btn-sm ms-auto"><i class="bi bi-plus-circle me-1"></i>Registrar Factura</a>
    </div>`;

  if((facturas||[]).length===0){
    c.innerHTML=filterHtml+`<div class="empty-state"><i class="bi bi-receipt d-block"></i><h5>Sin facturas</h5><p>Registra tu primera factura para comenzar</p><a href="registrar.html" class="btn btn-primary mt-2"><i class="bi bi-plus-circle me-1"></i>Registrar Factura</a></div>`;
    return;
  }

  c.innerHTML=filterHtml+'<div id="facturasTable"></div>';
  renderFacturasTable(facturas,'');
  document.getElementById('filtroSvcFact').addEventListener('change',async e=>{
    const filtro = e.target.value;
    const all = await getFacturas();
    const filtered = filtro? all.filter(f=>f.servicio===filtro): all;
    renderFacturasTable(filtered,filtro);
  });
}

function renderFacturasTable(facturas){
  const el=document.getElementById('facturasTable'); if(!el) return;
  let rows='';
  facturas.sort((a,b)=>(b.periodo||'').localeCompare(a.periodo||'')).forEach(f=>{
    const m=SERVICE_META[f.servicio]||SERVICE_META.agua;
    const estado=f.fecha_pago?'pagada':'pendiente';
    rows+=`<tr>
      <td><span class="badge-service badge-${m.cls}"><i class="bi ${m.icon}"></i> ${m.label}</span></td>
      <td>${f.periodo||'—'}</td>
      <td><strong>${f.consumo} ${m.unit}</strong></td>
      <td>$${Number(f.valor).toLocaleString('es-CO')}</td>
      <td>${f.fecha_corte||'—'}</td>
      <td><span class="badge-status badge-${estado}">${estado==='pagada'?'Pagada':'Pendiente'}</span></td>
      <td>
        ${estado==='pendiente'?`<button class="btn btn-sm btn-outline-primary" onclick="marcarPagada('${f.id}')">Pagar</button>`:''}
        <button class="btn btn-sm btn-outline-secondary" onclick="eliminarFactura('${f.id}')"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`;
  });
  el.innerHTML=`<div class="data-card"><div class="data-card-body" style="padding:0;overflow-x:auto">
    <table class="table-modern"><thead><tr><th>Servicio</th><th>Período</th><th>Consumo</th><th>Valor</th><th>Corte</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table>
  </div></div>`;
}

window.marcarPagada=async function(id){
  const f = await getFacturas();
  const i=f.findIndex(x=>x.id===id);
  if(i===-1) return;
  const fecha = new Date().toISOString();
  await DataService.updateFactura(id,{fecha_pago:fecha});
  showToast('Factura marcada como pagada',{type:'success'});
  await loadFacturas(document.getElementById('facturas-content'));
};

window.eliminarFactura=async function(id){
  if(!confirm('¿Eliminar esta factura?')) return;
  await DataService.deleteFactura(id);
  showToast('Factura eliminada',{type:'warning'});
  await loadFacturas(document.getElementById('facturas-content'));
};

// ============ ANÁLISIS ============
async function loadAnalisis(c){
  const facturas=await getFacturas();
  if(facturas.length<1){
    c.innerHTML=`<div class="empty-state"><i class="bi bi-graph-up-arrow d-block"></i><h5>Sin datos</h5><p>Registra facturas para ver el análisis</p></div>`;
    return;
  }

  // Group by service
  const porSvc={};
  facturas.forEach(f=>{ if(!porSvc[f.servicio]) porSvc[f.servicio]=[]; porSvc[f.servicio].push(f); });
  Object.values(porSvc).forEach(arr=>arr.sort((a,b)=>(a.periodo||'').localeCompare(b.periodo||'')));

  let statsHtml='<div class="gap-grid gap-grid-2 mb-4">';
  Object.keys(porSvc).forEach(svc=>{
    const m=SERVICE_META[svc]||SERVICE_META.agua;
    const arr=porSvc[svc];
    const consumos=arr.map(f=>f.consumo);
    const avg=(consumos.reduce((s,x)=>s+x,0)/consumos.length).toFixed(1);
    const min=Math.min(...consumos), max=Math.max(...consumos);
    const totalCost=arr.reduce((s,f)=>s+f.valor,0);
    let trend='stable',trendLabel='Estable',trendCls='stable';
    if(consumos.length>=2){
      const last=consumos[consumos.length-1], prevAvg=consumos.slice(0,-1).reduce((s,x)=>s+x,0)/(consumos.length-1);
      const pct=prevAvg>0?((last-prevAvg)/prevAvg*100):0;
      if(pct>5){ trend='up'; trendLabel='Creciente'; trendCls='up'; }
      else if(pct<-5){ trend='down'; trendLabel='Decreciente'; trendCls='down'; }
    }
    // Variation table
    let varRows='';
    for(let i=1;i<arr.length;i++){
      const prev=arr[i-1], cur=arr[i];
      const abs=(cur.consumo-prev.consumo).toFixed(1);
      const pct=prev.consumo>0?((cur.consumo-prev.consumo)/prev.consumo*100).toFixed(1):'—';
      const cls=pct>0?'trend-up':pct<0?'trend-down':'trend-stable';
      varRows+=`<tr><td>${cur.periodo}</td><td>${cur.consumo}</td><td class="${cls}">${abs>0?'+':''}${abs}</td><td class="${cls}">${pct}%</td></tr>`;
    }

    statsHtml+=`<div class="data-card">
      <div class="data-card-header"><h5><i class="bi ${m.icon} me-2" style="color:var(--color-${m.cls})"></i>${m.label}</h5><span class="trend-badge ${trendCls}">${trendLabel}</span></div>
      <div class="data-card-body">
        <div class="d-flex gap-3 mb-3 flex-wrap">
          <div><small class="text-muted d-block">Promedio</small><strong>${avg} ${m.unit}</strong></div>
          <div><small class="text-muted d-block">Mín / Máx</small><strong>${min} / ${max}</strong></div>
          <div><small class="text-muted d-block">Gasto total</small><strong>$${totalCost.toLocaleString('es-CO')}</strong></div>
        </div>
        ${varRows?`<table class="table-modern"><thead><tr><th>Período</th><th>Consumo</th><th>Var. Abs.</th><th>Var. %</th></tr></thead><tbody>${varRows}</tbody></table>`:'<p class="text-muted small">Solo un período registrado</p>'}
      </div>
    </div>`;
  });
  statsHtml+='</div>';

  // Chart
  let chartHtml=`<div class="data-card mb-4"><div class="data-card-header"><h5><i class="bi bi-graph-up me-2"></i>Comparativo Histórico</h5></div>
    <div class="data-card-body"><div class="chart-container"><canvas id="analisisChart"></canvas></div></div></div>`;

  c.innerHTML=chartHtml+statsHtml;

  // Render chart
  if(typeof Chart!=='undefined'){
    const periodos=[...new Set(facturas.map(f=>f.periodo))].sort();
    const colors={agua:'#0ea5e9',energia:'#f59e0b',gas:'#ef4444',internet:'#10b981'};
    const datasets=Object.keys(porSvc).map(svc=>({
      label:SERVICE_META[svc].label,
      data:periodos.map(p=>{const f=porSvc[svc].find(x=>x.periodo===p);return f?f.consumo:null;}),
      borderColor:colors[svc],backgroundColor:colors[svc]+'15',tension:0.4,borderWidth:2,fill:true,spanGaps:true
    }));
    new Chart(document.getElementById('analisisChart'),{type:'line',data:{labels:periodos,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,title:{display:true,text:'Consumo'}}}}});
  }
}

// ============ ALERTAS ============
async function loadAlertasSection(c){
  const facturas=await getFacturas();
  const perfil=await getPerfil();
  await generateAlerts(facturas,perfil);
  const alertas=await DataService.getAlertas();

  let filterHtml=`<div class="d-flex flex-wrap gap-2 mb-3">
    <select class="form-select form-select-sm" id="filtroSvcAlert" style="width:150px"><option value="">Todos</option>
    ${Object.keys(SERVICE_META).map(s=>`<option value="${s}">${SERVICE_META[s].label}</option>`).join('')}</select>
    <select class="form-select form-select-sm" id="filtroEstadoAlert" style="width:140px"><option value="">Todos estados</option>
    <option value="nueva">Nueva</option><option value="revisada">Revisada</option><option value="atendida">Atendida</option></select>
    <button class="btn btn-sm btn-outline-secondary ms-auto" onclick="limpiarTodasAlertas()"><i class="bi bi-trash me-1"></i>Limpiar</button>
  </div>`;

  if(alertas.length===0){
    c.innerHTML=filterHtml+`<div class="empty-state"><i class="bi bi-check-circle d-block" style="color:#22c55e"></i><h5>Sin alertas</h5><p>Tu consumo está bajo control</p></div>`;
    return;
  }

  c.innerHTML=filterHtml+`<div id="alertasList"></div><div class="mt-4" id="sugerenciasContainer"></div>`;
  renderAlertsList(alertas);
  document.getElementById('filtroSvcAlert').addEventListener('change',()=>filterAlerts());
  document.getElementById('filtroEstadoAlert').addEventListener('change',()=>filterAlerts());
  renderSugerencias();
}

async function filterAlerts(){
  const svc=document.getElementById('filtroSvcAlert').value;
  const est=document.getElementById('filtroEstadoAlert').value;
  let alertas=await DataService.getAlertas();
  if(svc) alertas=alertas.filter(a=>a.servicio===svc);
  if(est) alertas=alertas.filter(a=>a.estado===est);
  renderAlertsList(alertas);
}

function renderAlertsList(alertas){
  const el=document.getElementById('alertasList'); if(!el) return;
  let html='';
  alertas.slice().reverse().forEach((a,idx)=>{
    const realIdx=alertas.length-1-idx;
    const tipo=a.tipo==='variación'||a.tipo==='exceso'?'warning':'info';
    const m=SERVICE_META[a.servicio]||{label:a.servicio,icon:'bi-circle',cls:'agua'};
    html+=`<div class="alert-card ${tipo}">
      <div class="alert-icon ${tipo}"><i class="bi ${m.icon}"></i></div>
      <div class="flex-grow-1">
        <div class="d-flex align-items-center gap-2 mb-1">
          <strong>${m.label}</strong>
          <span class="badge-status badge-${a.estado}">${a.estado}</span>
        </div>
        <p class="mb-1 small">${a.mensaje}</p>
        <small class="text-muted">${a.fecha?a.fecha.split('T')[0]:''}</small>
      </div>
      <div class="d-flex flex-column gap-1">
        ${a.estado==='nueva'?`<button class="btn btn-sm btn-outline-primary" onclick="cambiarEstadoAlerta(${realIdx},'revisada')">Revisar</button>`:''}
        ${a.estado!=='atendida'?`<button class="btn btn-sm btn-outline-success" onclick="cambiarEstadoAlerta(${realIdx},'atendida')">Atender</button>`:''}
      </div>
    </div>`;
  });
  el.innerHTML=html||'<p class="text-muted">No hay alertas con estos filtros</p>';
}

function renderSugerencias(){
  const el=document.getElementById('sugerenciasContainer'); if(!el) return;
  const tips=[
    {icon:'bi-droplet',text:'<strong>Agua:</strong> Revisa posibles fugas en grifos y sanitarios. Un goteo puede desperdiciar hasta 30 litros diarios.'},
    {icon:'bi-lightning',text:'<strong>Energía:</strong> Desconecta equipos en standby y usa bombillas LED. El aire acondicionado a 24°C es óptimo.'},
    {icon:'bi-fire',text:'<strong>Gas:</strong> Revisa conexiones periódicamente. Cocinar con tapa reduce el consumo de gas un 25%.'},
    {icon:'bi-wifi',text:'<strong>Internet:</strong> Verifica velocidad contratada vs real. Reinicia el router mensualmente para mejor rendimiento.'}
  ];
  el.innerHTML='<h6 class="mb-3"><i class="bi bi-lightbulb me-2"></i>Sugerencias de ahorro</h6>'+tips.map(t=>`<div class="suggestion-card mb-2"><i class="bi ${t.icon}"></i><div class="text">${t.text}</div></div>`).join('');
}

window.cambiarEstadoAlerta=async function(idx,estado){
  await DataService.updateAlerta(idx,{estado});
  showToast(`Alerta marcada como ${estado}`,{type:'success'});
  await loadAlertasSection(document.getElementById('alertas-content'));
  await updateAlertBadges();
};

window.limpiarTodasAlertas=async function(){
  if(!confirm('¿Limpiar todas las alertas?')) return;
  await DataService.clearAlertas();
  showToast('Alertas limpiadas',{type:'info'});
  await loadAlertasSection(document.getElementById('alertas-content'));
  await updateAlertBadges();
};

async function generateAlerts(facturas,perfil){
  // Only generate if new invoices detected (simple check)
  const porSvc={};
  facturas.forEach(f=>{ if(!porSvc[f.servicio]) porSvc[f.servicio]=[]; porSvc[f.servicio].push(f); });
  Object.values(porSvc).forEach(arr=>arr.sort((a,b)=>(a.periodo||'').localeCompare(b.periodo||'')));

  const existing=await DataService.getAlertas();
  const existingKeys=new Set(existing.map(a=>a._key||''));

  Object.keys(porSvc).forEach(svc=>{
    const arr=porSvc[svc];
    const umb=perfil.umbrales[svc]||{consumo:0,valor:0};
    for(let i=0;i<arr.length;i++){
      const cur=arr[i];
      // Threshold check
      if(umb.consumo>0 && cur.consumo>umb.consumo){
        const key=`umbral_${svc}_${cur.periodo}`;
        if(!existingKeys.has(key)){
          const a={servicio:svc,tipo:'exceso',mensaje:`Consumo de ${cur.consumo} supera umbral de ${umb.consumo}`,fecha:new Date().toISOString(),estado:'nueva',_key:key};
          existing.push(a); existingKeys.add(key);
          await DataService.saveAlerta(a);
        }
      }
      // Variation check (>20% vs previous)
      if(i>0){
        const prev=arr[i-1];
        if(prev.consumo>0){
          const pct=((cur.consumo-prev.consumo)/prev.consumo*100);
          if(pct>20){
            const key=`var_${svc}_${cur.periodo}`;
            if(!existingKeys.has(key)){
              const a={servicio:svc,tipo:'variación',mensaje:`Aumento de ${pct.toFixed(1)}% vs período anterior (${prev.periodo})`,fecha:new Date().toISOString(),estado:'nueva',_key:key};
              existing.push(a); existingKeys.add(key);
              await DataService.saveAlerta(a);
            }
          }
        }
      }
    }
  });
  localStorage.setItem('alertas',JSON.stringify(existing));
}

// ============ REPORTES ============
async function loadReportes(c){
  const facturas=await getFacturas();
  c.innerHTML=`
    <div class="gap-grid gap-grid-2">
      <div class="data-card">
        <div class="data-card-header"><h5><i class="bi bi-file-earmark-spreadsheet me-2"></i>Reporte de Consumo</h5></div>
        <div class="data-card-body">
          <p class="text-muted small">Exporta el historial completo de consumo en formato CSV</p>
          <div class="mb-3"><label class="form-label small">Servicio</label><select class="form-select form-select-sm" id="repSvc">
            <option value="">Todos</option>${Object.keys(SERVICE_META).map(s=>`<option value="${s}">${SERVICE_META[s].label}</option>`).join('')}
          </select></div>
          <button class="btn btn-primary btn-sm" onclick="exportarCSV()"><i class="bi bi-download me-1"></i>Descargar CSV</button>
        </div>
      </div>
      <div class="data-card">
        <div class="data-card-header"><h5><i class="bi bi-file-earmark-text me-2"></i>Resumen de Alertas</h5></div>
        <div class="data-card-body">
          <p class="text-muted small">Descarga el registro de alertas generadas</p>
          <button class="btn btn-primary btn-sm" onclick="exportarAlertas()"><i class="bi bi-download me-1"></i>Descargar Alertas</button>
        </div>
      </div>
    </div>
    <div class="data-card mt-4">
      <div class="data-card-header"><h5><i class="bi bi-table me-2"></i>Vista previa</h5></div>
      <div class="data-card-body" id="reportePreview">
        <p class="text-muted small">Selecciona un reporte para ver la vista previa</p>
      </div>
    </div>`;
}

window.exportarCSV=async function(){
  let data=await getFacturas();
  const svc=document.getElementById('repSvc').value;
  if(svc) data=data.filter(f=>f.servicio===svc);
  if(data.length===0){ showToast('No hay datos para exportar',{type:'warning'}); return; }
  let csv='Servicio,Período,Consumo,Unidad,Valor,Fecha Corte,Fecha Pago\n';
  data.forEach(f=>{
    const m=SERVICE_META[f.servicio]||{unit:''};
    csv+=`${f.servicio},${f.periodo},${f.consumo},${m.unit},${f.valor},${f.fecha_corte||''},${f.fecha_pago||''}\n`;
  });
  downloadFile('reporte_consumo.csv',csv,'text/csv');
  showToast('Reporte descargado',{type:'success'});
};

window.exportarAlertas=async function(){
  const alertas=await DataService.getAlertas();
  if(alertas.length===0){ showToast('No hay alertas para exportar',{type:'warning'}); return; }
  let csv='Servicio,Tipo,Mensaje,Fecha,Estado\n';
  alertas.forEach(a=>{ csv+=`${a.servicio},${a.tipo},"${a.mensaje}",${a.fecha||''},${a.estado}\n`; });
  downloadFile('reporte_alertas.csv',csv,'text/csv');
  showToast('Reporte descargado',{type:'success'});
};

function downloadFile(name,content,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=name; a.click();
  URL.revokeObjectURL(url);
}

// ============ USER INFO & INIT ============
function updateUserInfo(){
  const email=localStorage.getItem('userEmail')||'Usuario';
  const name=localStorage.getItem('userName')||email.split('@')[0];
  const el=document.getElementById('userName');
  if(el) el.textContent=name.charAt(0).toUpperCase()+name.slice(1);
  const av=document.getElementById('userAvatarCircle');
  if(av) av.textContent=name.charAt(0).toUpperCase();
}

async function initDashboard(){ updateUserInfo(); await showSection('inicio'); }

document.addEventListener('DOMContentLoaded',()=>{
  const d=document.getElementById('dashboard');
  if(d && d.style.display!=='none') initDashboard();
});
