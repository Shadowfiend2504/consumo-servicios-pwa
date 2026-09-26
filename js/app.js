// ============================================================
//  App.js — Control de Consumo del Hogar
// ============================================================

const SERVICE_META = {
  agua:     { label:'Agua',     icon:'bi-droplet-fill',   unit:'m³',   emoji:'💧', cls:'agua' },
  energia:  { label:'Energía',  icon:'bi-lightning-fill',  unit:'kWh',  emoji:'⚡', cls:'energia' },
  gas:      { label:'Gas',      icon:'bi-fire',           unit:'m³',   emoji:'🔥', cls:'gas' },
  internet: { label:'Internet', icon:'bi-wifi',           unit:'Mbps', emoji:'📶', cls:'internet' }
};

let dashChartInstance = null;
let dashCostChartInstance = null;
let dashServiceChartInstance = null;
let dashOutlierChartInstance = null;
let dashScatterChartInstance = null;
let dashMonthsChartInstance = null;
const dashServiceChartInstances = {};
let analisisChartInstance = null;
let analisisGastoChartInstance = null;
const analisisServiceChartInstances = {};

function safeDestroyChart(instance){
  if(instance && typeof instance.destroy === 'function'){
    try { instance.destroy(); } catch(e){}
  }
}

function escapeHtml(value){
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsSingleQuoted(value){
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

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
  const servicios = (perfil && perfil.servicios && typeof perfil.servicios === 'object') ? perfil.servicios : {};
  const activos = Object.keys(servicios).filter(k=>servicios[k]);

  if((facturas||[]).length===0){
    c.innerHTML=`
      <div class="empty-state">
        <i class="bi bi-inbox d-block"></i>
        <h5>Aún no hay facturas registradas</h5>
        <p>Actualmente no se encuentran datos guardados. Registra nuevas facturas para iniciar el análisis de consumo.</p>
        <a href="registrar.html" class="btn btn-primary mt-2"><i class="bi bi-plus-circle me-1"></i>Registrar Factura</a>
      </div>`;
    await updateAlertBadges();
    return;
  }

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
        <div class="data-card-body"><div class="chart-container dashboard-chart"><canvas id="dashChart"></canvas></div></div>
      </div>
      <div class="data-card">
        <div class="data-card-header"><h5><i class="bi bi-cash-stack me-2"></i>Costo por Servicio</h5></div>
        <div class="data-card-body"><div class="chart-container dashboard-chart"><canvas id="dashCostChart"></canvas></div></div>
      </div>
      <div class="data-card">
        <div class="data-card-header"><h5><i class="bi bi-pie-chart me-2"></i>Distribución del Gasto por Servicio</h5></div>
        <div class="data-card-body"><div class="chart-container dashboard-chart"><canvas id="dashServiceChart"></canvas></div></div>
      </div>
      <div class="data-card">
        <div class="data-card-header"><h5><i class="bi bi-exclamation-diamond me-2"></i>Valores Atípicos</h5></div>
        <div class="data-card-body"><div class="chart-container dashboard-chart"><canvas id="dashOutlierChart"></canvas></div></div>
      </div>
      <div class="data-card">
        <div class="data-card-header"><h5><i class="bi bi-scatter-chart me-2"></i>Consumo y Valor por Servicio</h5></div>
        <div class="data-card-body"><div class="chart-container dashboard-chart"><canvas id="dashScatterChart"></canvas></div></div>
      </div>
      <div class="data-card">
        <div class="data-card-header"><h5><i class="bi bi-arrow-down-up me-2"></i>Meses de Mayor y Menor Consumo</h5></div>
        <div class="data-card-body"><div class="chart-container dashboard-chart"><canvas id="dashMonthsChart"></canvas></div></div>
      </div>
      ${Object.keys(SERVICE_META).map(svc=>{
        const m=SERVICE_META[svc];
        return `<div class="data-card service-chart-card">
          <div class="data-card-header"><h5><i class="bi ${m.icon} me-2"></i>Consumo de ${m.label}</h5></div>
          <div class="data-card-body"><div class="chart-container dashboard-chart"><canvas id="dashService-${svc}"></canvas></div></div>
        </div>`;
      }).join('')}
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

// ---------- Helpers de gráficos ----------
const MESES_ABR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

// "2025-03" -> "mar 2025". Si el formato es otro, lo deja tal cual.
function formatPeriodo(p){
  const m = /^(\d{4})-(\d{2})/.exec(String(p ?? ''));
  if(!m) return String(p ?? '');
  const mes = MESES_ABR[Number(m[2]) - 1];
  return mes ? `${mes} ${m[1]}` : String(p);
}

// Eje X reutilizable con título y etiquetas legibles
function xAxisPeriodo(titulo = 'Período (mes)'){
  return {
    title: { display: true, text: titulo, font: { size: 12, weight: '600' } },
    grid: { display: false },
    ticks: {
      maxRotation: 45,
      minRotation: 0,
      autoSkip: true,
      font: { size: 11 },
      callback: function(value){ return formatPeriodo(this.getLabelForValue(value)); }
    }
  };
}

// Título del tooltip con el período formateado
const tooltipTituloPeriodo = {
  callbacks: { title: items => items.length ? formatPeriodo(items[0].label) : '' }
};

// Plugin: dibuja el porcentaje dentro de cada porción de la dona
const porcentajeDonaPlugin = {
  id: 'porcentajeDona',
  afterDatasetsDraw(chart){
    const ds = chart.data.datasets[0];
    const total = ds.data.reduce((a, b) => a + b, 0);
    if(!total) return;
    const { ctx } = chart;
    chart.getDatasetMeta(0).data.forEach((arc, i) => {
      const pct = ds.data[i] / total * 100;
      if(pct < 4 || arc.hidden) return; // evita texto en porciones muy pequeñas
      const pos = arc.tooltipPosition();
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pct.toFixed(1) + '%', pos.x, pos.y);
      ctx.restore();
    });
  }
};

function renderDashCharts(facturas, activos){
  if(typeof Chart==='undefined') return;
  const periodos=[...new Set(facturas.map(f=>f.periodo))].sort();
  const last6=periodos.slice(-6);
  const colors={agua:'#0ea5e9',energia:'#f59e0b',gas:'#ef4444',internet:'#10b981'};
  const records=facturas.map(f=>({
    ...f,
    consumo:Number(f.consumo)||0,
    valor:Number(f.valor)||0
  }));
  const chartOptions={responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}}}};
  // Consumption chart
  const canvas1=document.getElementById('dashChart');
  if(canvas1){
    if(dashChartInstance){
      dashChartInstance.destroy();
      dashChartInstance = null;
    }
    const datasets=activos.map(svc=>{
      const m=SERVICE_META[svc];
      return {
        label:m.label,
        data:last6.map(p=>{ const f=facturas.find(x=>x.servicio===svc&&x.periodo===p); return f?f.consumo:0; }),
        borderColor:colors[svc], backgroundColor:colors[svc]+'20', tension:0.4, borderWidth:2, fill:true
      };
    });
    dashChartInstance = new Chart(canvas1,{
      type:'line',
      data:{labels:last6,datasets},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{
          legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}},
          tooltip:tooltipTituloPeriodo
        },
        scales:{
          x:xAxisPeriodo('Período (mes)'),
          y:{beginAtZero:true,title:{display:true,text:'Consumo'}}
        }
      }
    });
  }
  // Cost chart
  const canvas2=document.getElementById('dashCostChart');
  if(canvas2){
    if(dashCostChartInstance){
      dashCostChartInstance.destroy();
      dashCostChartInstance = null;
    }
    const datasets=activos.map(svc=>{
      return {
        label:SERVICE_META[svc].label,
        data:last6.map(p=>{ const f=facturas.find(x=>x.servicio===svc&&x.periodo===p); return f?f.valor:0; }),
        backgroundColor:colors[svc]+'80', borderColor:colors[svc], borderWidth:1
      };
    });
    dashCostChartInstance = new Chart(canvas2,{
      type:'bar',
      data:{labels:last6,datasets},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{
          legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}},
          tooltip:{callbacks:{
            title:items=>items.length?formatPeriodo(items[0].label):'',
            label:c=>`${c.dataset.label}: $${Number(c.parsed.y).toLocaleString('es-CO')}`
          }}
        },
        scales:{
          x:xAxisPeriodo('Período (mes)'),
          y:{beginAtZero:true,title:{display:true,text:'Valor ($)'}}
        }
      }
    });
  }

  const destroyChart=(instance)=>{ if(instance) instance.destroy(); };

  // Distribución (dona) con porcentajes
  const canvas3=document.getElementById('dashServiceChart');
  if(canvas3){
    destroyChart(dashServiceChartInstance);
    // Se usa el VALOR ($) porque es comparable entre servicios (m³, kWh y Mbps no se pueden sumar)
    const totals=activos.map(svc=>records.filter(f=>f.servicio===svc).reduce((sum,f)=>sum+f.valor,0));
    const totalGeneral=totals.reduce((a,b)=>a+b,0);
    const pct=v=>totalGeneral?(v/totalGeneral*100).toFixed(1):'0.0';

    dashServiceChartInstance=new Chart(canvas3,{
      type:'doughnut',
      data:{
        labels:activos.map(svc=>SERVICE_META[svc].label),
        datasets:[{data:totals,backgroundColor:activos.map(svc=>colors[svc]),borderWidth:2,borderColor:'#fff'}]
      },
      options:{
        responsive:true,maintainAspectRatio:false,cutout:'55%',
        plugins:{
          legend:{
            position:'bottom',
            labels:{
              boxWidth:12,font:{size:11},
              generateLabels:chart=>{
                const ds=chart.data.datasets[0];
                return chart.data.labels.map((label,i)=>({
                  text:`${label}: ${pct(ds.data[i])}%`,
                  fillStyle:ds.backgroundColor[i],
                  strokeStyle:'#fff',
                  lineWidth:1,
                  hidden:!chart.getDataVisibility(i),
                  index:i
                }));
              }
            }
          },
          tooltip:{callbacks:{
            label:c=>`${c.label}: $${Number(c.parsed).toLocaleString('es-CO')} (${pct(c.parsed)}%)`
          }}
        }
      },
      plugins:[porcentajeDonaPlugin]
    });
  }

  const outliers=[];
  activos.forEach(svc=>{
    const values=records.filter(f=>f.servicio===svc).map(f=>f.consumo).sort((a,b)=>a-b);
    if(values.length<4) return;
    const q1=values[Math.floor((values.length-1)*0.25)];
    const q3=values[Math.floor((values.length-1)*0.75)];
    const range=q3-q1;
    records.filter(f=>f.servicio===svc && (f.consumo<q1-1.5*range || f.consumo>q3+1.5*range)).forEach(f=>outliers.push(f));
  });
  const canvas4=document.getElementById('dashOutlierChart');
  if(canvas4){
    destroyChart(dashOutlierChartInstance);
    const outlierLabels=outliers.length?outliers.map(f=>`${SERVICE_META[f.servicio].label} · ${formatPeriodo(f.periodo)}`):['Sin valores atípicos'];
    const serviciosAtipicos=[...new Set(outliers.map(f=>f.servicio))];
    dashOutlierChartInstance=new Chart(canvas4,{
      type:'bar',
      data:{labels:outlierLabels,datasets:[{
        label:'Consumo',
        data:outliers.length?outliers.map(f=>f.consumo):[0],
        backgroundColor:outliers.length?outliers.map(f=>colors[f.servicio]):['#cbd5e1'],
        borderColor:'#dc2626',borderWidth:1
      }]},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{
          legend:{
            position:'bottom',
            onClick:()=>{}, // leyenda informativa: evita ocultar la serie al hacer clic
            labels:{
              boxWidth:12,font:{size:11},
              // Leyenda: color de cada servicio con su unidad + significado del borde rojo
              generateLabels:()=>{
                if(!outliers.length) return [{text:'Sin valores atípicos',fillStyle:'#cbd5e1',strokeStyle:'#cbd5e1'}];
                return [
                  ...serviciosAtipicos.map(svc=>({
                    text:`${SERVICE_META[svc].label} (${SERVICE_META[svc].unit})`,
                    fillStyle:colors[svc],strokeStyle:colors[svc]
                  })),
                  {text:'Borde rojo = valor atípico',fillStyle:'#ffffff',strokeStyle:'#dc2626',lineWidth:2}
                ];
              }
            }
          },
          tooltip:{callbacks:{
            label:c=>{
              if(!outliers.length) return 'Sin valores atípicos';
              const f=outliers[c.dataIndex];
              const meta=SERVICE_META[f.servicio];
              return `${meta.label}: ${f.consumo} ${meta.unit}`;
            }
          }}
        },
        scales:{
          x:{title:{display:true,text:'Servicio · Período',font:{size:12,weight:'600'}},grid:{display:false},ticks:{maxRotation:45,autoSkip:true,font:{size:11}}},
          y:{beginAtZero:true,title:{display:true,text:'Consumo (unidad de cada servicio)'}}
        }
      }
    });
  }

  const canvas5=document.getElementById('dashScatterChart');
  if(canvas5){
    destroyChart(dashScatterChartInstance);
    const datasets=activos.map(svc=>({label:SERVICE_META[svc].label,data:records.filter(f=>f.servicio===svc).map(f=>({x:f.consumo,y:f.valor,periodo:f.periodo})),backgroundColor:colors[svc],pointRadius:5}));
    dashScatterChartInstance=new Chart(canvas5,{type:'scatter',data:{datasets},options:{...chartOptions,scales:{x:{beginAtZero:true,title:{display:true,text:'Consumo'}},y:{beginAtZero:true,title:{display:true,text:'Valor ($)'}}},plugins:{...chartOptions.plugins,tooltip:{callbacks:{label:context=>`${context.dataset.label} · ${context.raw.periodo}: ${context.raw.x} / $${Number(context.raw.y).toLocaleString('es-CO')}`}}}}});
  }

  // Meses de mayor y menor consumo
  const canvas6=document.getElementById('dashMonthsChart');
  if(canvas6){
    destroyChart(dashMonthsChartInstance);
    const monthTotals=periodos.map(periodo=>records.filter(f=>f.periodo===periodo).reduce((sum,f)=>sum+f.consumo,0));
    const max=Math.max(...monthTotals), min=Math.min(...monthTotals);
    dashMonthsChartInstance=new Chart(canvas6,{
      type:'bar',
      data:{labels:periodos,datasets:[{
        label:'Consumo total',
        data:monthTotals,
        backgroundColor:monthTotals.map(value=>value===max?'#16a34a':value===min?'#dc2626':'#94a3b8'),
        borderRadius:4
      }]},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{
          legend:{
            position:'bottom',
            onClick:()=>{}, // leyenda informativa: evita ocultar la serie al hacer clic
            labels:{
              boxWidth:12,font:{size:11},
              // Leyenda que explica los colores
              generateLabels:()=>[
                {text:'Mayor consumo',fillStyle:'#16a34a',strokeStyle:'#16a34a'},
                {text:'Menor consumo',fillStyle:'#dc2626',strokeStyle:'#dc2626'},
                {text:'Otros meses',fillStyle:'#94a3b8',strokeStyle:'#94a3b8'}
              ]
            }
          },
          tooltip:tooltipTituloPeriodo
        },
        scales:{
          x:xAxisPeriodo('Período (mes)'),
          y:{beginAtZero:true,title:{display:true,text:'Consumo total'}}
        }
      }
    });
  }

  Object.keys(SERVICE_META).forEach(svc=>{
    const canvas=document.getElementById(`dashService-${svc}`);
    if(!canvas) return;
    destroyChart(dashServiceChartInstances[svc]);
    const meta=SERVICE_META[svc];
    const data=last6.map(periodo=>{
      const record=records.find(f=>f.servicio===svc&&f.periodo===periodo);
      return record?record.consumo:0;
    });
    dashServiceChartInstances[svc]=new Chart(canvas,{type:'line',data:{labels:last6,datasets:[{label:`Consumo (${meta.unit})`,data,borderColor:colors[svc],backgroundColor:colors[svc]+'25',pointBackgroundColor:colors[svc],pointRadius:4,tension:0.35,fill:true}]},options:{...chartOptions,plugins:{legend:{display:false},tooltip:{callbacks:{label:context=>`${context.parsed.y} ${meta.unit}`}}},scales:{y:{beginAtZero:true,title:{display:true,text:meta.unit}}}}});
  });
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
  if(!p.servicios || typeof p.servicios!=='object') p.servicios={};
  if(!p.umbrales || typeof p.umbrales!=='object') p.umbrales={};
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
        <div class="mb-3"><label class="form-label">Nombre del hogar</label><input type="text" class="form-control" id="pNombre" value="${escapeHtml(p.nombre||'')}"></div>
        <div class="mb-3"><label class="form-label">Correo</label><input type="email" class="form-control" id="pCorreo" value="${escapeHtml(p.correo)}" readonly style="background:#f8fafc"></div>
        <div class="row g-3">
          <div class="col-6"><label class="form-label">Zona / Barrio</label><input type="text" class="form-control" id="pZona" value="${escapeHtml(p.zona||'')}"></div>
          <div class="col-6"><label class="form-label">Tipo de vivienda</label><select class="form-select" id="pTipo">
            <option value="">— Opcional —</option>
            <option value="casa" ${p.tipo==='casa'?'selected':''}>Casa</option>
            <option value="apartamento" ${p.tipo==='apartamento'?'selected':''}>Apartamento</option>
            <option value="finca" ${p.tipo==='finca'?'selected':''}>Finca</option>
          </select></div>
        </div>
        <div class="d-flex flex-wrap gap-2 mt-4">
          <button class="btn btn-primary" onclick="guardarPerfil()"><i class="bi bi-check-circle me-1"></i>Guardar Perfil</button>
          <a href="terminos.html" class="btn btn-outline-secondary"><i class="bi bi-file-earmark-text me-1"></i>Términos y Condiciones</a>
        </div>
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
    const safeId=escapeJsSingleQuoted(f.id);
    rows+=`<tr>
      <td><span class="badge-service badge-${m.cls}"><i class="bi ${m.icon}"></i> ${m.label}</span></td>
      <td>${escapeHtml(f.periodo||'—')}</td>
      <td><strong>${f.consumo} ${m.unit}</strong></td>
      <td>$${Number(f.valor).toLocaleString('es-CO')}</td>
      <td>${escapeHtml(f.fecha_corte||'—')}</td>
      <td><span class="badge-status badge-${estado}">${estado==='pagada'?'Pagada':'Pendiente'}</span></td>
      <td>
        ${estado==='pendiente'?`<button class="btn btn-sm btn-outline-primary" onclick="marcarPagada('${safeId}')">Pagar</button>`:''}
        <button class="btn btn-sm btn-outline-secondary" onclick="eliminarFactura('${safeId}')"><i class="bi bi-trash"></i></button>
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
  const facturas = await getFacturas();
  if(!facturas || facturas.length < 1){
    c.innerHTML = `<div class="empty-state"><i class="bi bi-graph-up-arrow d-block"></i><h5>Sin datos</h5><p>Registra facturas para ver el análisis</p></div>`;
    return;
  }

  // Pre-procesar servicios y períodos
  const porSvc = {};
  facturas.forEach(f => {
    if(!porSvc[f.servicio]) porSvc[f.servicio] = [];
    porSvc[f.servicio].push(f);
  });
  Object.values(porSvc).forEach(arr => arr.sort((a,b) => (a.periodo||'').localeCompare(b.periodo||'')));

  const allPeriodos = [...new Set(facturas.map(f => f.periodo))].sort();
  const colors = { agua: '#0ea5e9', energia: '#f59e0b', gas: '#ef4444', internet: '#10b981' };

  // Helper para filtrar períodos según el rango elegido
  function getPeriodSlice(periodos, rango){
    if(rango === '1m') return periodos.slice(-1);
    if(rango === '3m') return periodos.slice(-3);
    if(rango === '6m') return periodos.slice(-6);
    if(rango === '12m' || rango === '1a') return periodos.slice(-12);
    return periodos; // 'todo'
  }

  // Estados activos de filtrado
  let currentGastoRango = 'todo';
  let currentGastoAgrup = 'mensual';
  let currentHistoricoRango = 'todo';
  const currentSvcRangos = {};
  Object.keys(porSvc).forEach(s => { currentSvcRangos[s] = 'todo'; });

  // 1. Gráfica de Gasto Monetario Consolidado
  const gastoChartHtml = `
    <div class="data-card mb-4" id="cardGastoMonetario">
      <div class="data-card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <h5 class="mb-1"><i class="bi bi-cash-stack me-2" style="color: #10b981;"></i>Consolidado de Gasto Monetario</h5>
          <small class="text-muted">Total acumulado pagado en servicios públicos según el período y vista seleccionada</small>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2">
          <!-- Filtro de Rango -->
          <div class="d-flex align-items-center gap-1">
            <span class="small text-muted fw-500 d-none d-sm-inline">Período:</span>
            <div class="btn-group btn-group-sm" role="group" id="gastoRangoGroup">
              <button type="button" class="btn btn-outline-primary" data-rango="1m">1 Mes</button>
              <button type="button" class="btn btn-outline-primary" data-rango="3m">3 Meses</button>
              <button type="button" class="btn btn-outline-primary" data-rango="6m">6 Meses</button>
              <button type="button" class="btn btn-outline-primary" data-rango="12m">1 Año</button>
              <button type="button" class="btn btn-outline-primary active" data-rango="todo">Todo</button>
            </div>
          </div>
          <!-- Filtro de Agrupación -->
          <div class="d-flex align-items-center gap-1">
            <span class="small text-muted fw-500 d-none d-sm-inline">Vista:</span>
            <div class="btn-group btn-group-sm" role="group" id="gastoAgrupGroup">
              <button type="button" class="btn btn-outline-secondary active" data-agrup="mensual">Mensual</button>
              <button type="button" class="btn btn-outline-secondary" data-agrup="trimestral">Trimestral</button>
              <button type="button" class="btn btn-outline-secondary" data-agrup="semestral">Semestral</button>
              <button type="button" class="btn btn-outline-secondary" data-agrup="anual">Anual</button>
            </div>
          </div>
        </div>
      </div>
      <div class="data-card-body">
        <div id="gastoSummaryContainer" class="mb-3"></div>
        <div class="chart-container" style="height: 310px;">
          <canvas id="analisisGastoChart"></canvas>
        </div>
      </div>
    </div>`;

  // 2. Gráfica de Comparativo Histórico de Consumo Físico
  const historicoChartHtml = `
    <div class="data-card mb-4">
      <div class="data-card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <h5 class="mb-1"><i class="bi bi-graph-up me-2 text-primary"></i>Comparativo Histórico de Consumo</h5>
          <small class="text-muted">Evolución del consumo físico (m³, kWh, Mbps) por servicio</small>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="small text-muted fw-500 d-none d-sm-inline">Período:</span>
          <div class="btn-group btn-group-sm" role="group" id="historicoRangoGroup">
            <button type="button" class="btn btn-outline-primary" data-rango="3m">3 Meses</button>
            <button type="button" class="btn btn-outline-primary" data-rango="6m">6 Meses</button>
            <button type="button" class="btn btn-outline-primary" data-rango="12m">1 Año</button>
            <button type="button" class="btn btn-outline-primary active" data-rango="todo">Todo</button>
          </div>
        </div>
      </div>
      <div class="data-card-body">
        <div class="chart-container" style="height: 290px;">
          <canvas id="analisisChart"></canvas>
        </div>
      </div>
    </div>`;

  // 3. Barra de herramientas para cuadros de servicios
  const serviceCardsToolbar = `
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 mt-4">
      <div>
        <h5 class="mb-0 text-dark fw-bold"><i class="bi bi-grid-fill me-2 text-primary"></i>Consolidado de Consumo por Servicio</h5>
        <small class="text-muted">Estadísticas, gráficas individuales y variación histórica</small>
      </div>
      <div class="d-flex align-items-center gap-2">
        <span class="small text-muted fw-500">Filtrar todos:</span>
        <div class="btn-group btn-group-sm" role="group" id="globalSvcRangoGroup">
          <button type="button" class="btn btn-outline-primary" data-rango="3m">3 Meses</button>
          <button type="button" class="btn btn-outline-primary" data-rango="6m">6 Meses</button>
          <button type="button" class="btn btn-outline-primary" data-rango="12m">1 Año</button>
          <button type="button" class="btn btn-outline-primary active" data-rango="todo">Todo</button>
        </div>
      </div>
    </div>`;

  // Generar HTML de cada tarjeta de servicio
  let serviceCardsHtml = '<div class="gap-grid gap-grid-2 mb-4" id="serviceCardsGrid">';
  Object.keys(porSvc).forEach(svc => {
    const m = SERVICE_META[svc] || SERVICE_META.agua;
    serviceCardsHtml += `
      <div class="data-card" id="cardSvc-${svc}">
        <div class="data-card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div class="d-flex align-items-center gap-2">
            <h5 class="mb-0"><i class="bi ${m.icon} me-2" style="color:var(--color-${m.cls})"></i>${m.label}</h5>
            <span class="trend-badge stable" id="svcTrendBadge-${svc}">Estable</span>
          </div>
          <div class="btn-group btn-group-sm svc-individual-filter-group" role="group" data-svc="${svc}">
            <button type="button" class="btn btn-outline-secondary btn-sm" data-rango="3m">3m</button>
            <button type="button" class="btn btn-outline-secondary btn-sm" data-rango="6m">6m</button>
            <button type="button" class="btn btn-outline-secondary btn-sm" data-rango="12m">1a</button>
            <button type="button" class="btn btn-outline-secondary btn-sm active" data-rango="todo">Todo</button>
          </div>
        </div>
        <div class="data-card-body">
          <div class="chart-container mb-3" style="height: 160px;">
            <canvas id="analisisServiceChart-${svc}"></canvas>
          </div>
          <div class="d-flex gap-3 mb-3 flex-wrap" id="svcStatsContainer-${svc}"></div>
          <div id="svcTableContainer-${svc}"></div>
        </div>
      </div>`;
  });
  serviceCardsHtml += '</div>';

  c.innerHTML = gastoChartHtml + historicoChartHtml + serviceCardsToolbar + serviceCardsHtml;

  // Renderizador: Consolidado de Gasto Monetario
  function updateGastoView(){
    const selectedPeriodos = getPeriodSlice(allPeriodos, currentGastoRango);
    const factsFiltradas = facturas.filter(f => selectedPeriodos.includes(f.periodo));

    // Agrupar según currentGastoAgrup
    const groups = {};
    factsFiltradas.forEach(f => {
      const [y, mStr] = (f.periodo || '').split('-');
      const m = parseInt(mStr, 10) || 1;
      let key = f.periodo;
      let label = f.periodo;

      if (currentGastoAgrup === 'trimestral') {
        const q = Math.ceil(m / 3);
        key = `${y}-T${q}`;
        label = `T${q} ${y}`;
      } else if (currentGastoAgrup === 'semestral') {
        const s = m <= 6 ? 1 : 2;
        key = `${y}-S${s}`;
        label = `S${s} ${y}`;
      } else if (currentGastoAgrup === 'anual') {
        key = `${y}`;
        label = `Año ${y}`;
      }

      if (!groups[key]) groups[key] = { key, label, services: {}, total: 0 };
      if (!groups[key].services[f.servicio]) groups[key].services[f.servicio] = 0;
      const val = Number(f.valor) || 0;
      groups[key].services[f.servicio] += val;
      groups[key].total += val;
    });

    const sortedGroups = Object.keys(groups).sort().map(k => groups[k]);
    const totalGasto = factsFiltradas.reduce((s, f) => s + (Number(f.valor) || 0), 0);
    const activeSvcs = Object.keys(porSvc);

    // Totales por servicio
    const perSvcTotal = {};
    activeSvcs.forEach(s => {
      perSvcTotal[s] = factsFiltradas.filter(f => f.servicio === s).reduce((sum, f) => sum + (Number(f.valor) || 0), 0);
    });

    // Inyectar KPI de resumen
    const avgPerGroup = sortedGroups.length ? Math.round(totalGasto / sortedGroups.length) : 0;
    const summaryEl = document.getElementById('gastoSummaryContainer');
    if (summaryEl) {
      let svcChips = '';
      activeSvcs.forEach(s => {
        const m = SERVICE_META[s] || { label: s };
        const sTot = perSvcTotal[s] || 0;
        const pct = totalGasto > 0 ? ((sTot / totalGasto) * 100).toFixed(1) : 0;
        svcChips += `
          <div class="px-2 py-1 rounded small d-flex align-items-center gap-1 border" style="background:${colors[s]}10; border-color:${colors[s]}30 !important;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${colors[s]};"></span>
            <strong>${m.label}:</strong> $${sTot.toLocaleString('es-CO')} <span class="text-muted">(${pct}%)</span>
          </div>`;
      });

      summaryEl.innerHTML = `
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 rounded" style="background: #f8fafc; border: 1px solid var(--border);">
          <div class="d-flex align-items-center gap-3 flex-wrap">
            <div>
              <span class="text-muted small d-block">Gasto Total en el Período</span>
              <span class="fs-4 fw-bold text-primary">$${Number(totalGasto).toLocaleString('es-CO')}</span>
            </div>
            <div class="border-start ps-3 d-none d-sm-block">
              <span class="text-muted small d-block">Promedio (${currentGastoAgrup})</span>
              <span class="fs-5 fw-600 text-dark">$${Number(avgPerGroup).toLocaleString('es-CO')}</span>
            </div>
          </div>
          <div class="d-flex flex-wrap gap-2">
            ${svcChips}
          </div>
        </div>`;
    }

    // Dibujar gráfica con Chart.js
    if (typeof Chart !== 'undefined') {
      const canvasGasto = document.getElementById('analisisGastoChart');
      if (canvasGasto) {
        safeDestroyChart(analisisGastoChartInstance);
        const groupLabels = sortedGroups.map(g => g.label);
        const datasets = activeSvcs.map(svc => {
          const m = SERVICE_META[svc] || { label: svc };
          return {
            type: 'bar',
            label: m.label,
            data: sortedGroups.map(g => g.services[svc] || 0),
            backgroundColor: colors[svc] || '#3b82f6',
            stack: 'gasto',
            borderRadius: 4
          };
        });

        // Línea de total consolidado
        datasets.push({
          type: 'line',
          label: 'Gasto Total',
          data: sortedGroups.map(g => g.total),
          borderColor: '#0f172a',
          backgroundColor: '#0f172a',
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
          tension: 0.2
        });

        analisisGastoChartInstance = new Chart(canvasGasto, {
          data: { labels: groupLabels, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.dataset.label}: $${Number(ctx.raw || 0).toLocaleString('es-CO')}`,
                  footer: (tooltipItems) => {
                    let sum = 0;
                    tooltipItems.forEach(item => {
                      if (item.dataset.type === 'bar') sum += (item.raw || 0);
                    });
                    return sum > 0 ? `Total: $${Number(sum).toLocaleString('es-CO')}` : '';
                  }
                }
              }
            },
            scales: {
              x: { stacked: true, grid: { display: false } },
              y: {
                stacked: true,
                beginAtZero: true,
                ticks: { callback: v => '$' + Number(v).toLocaleString('es-CO') },
                title: { display: true, text: 'Gasto ($ COP)' }
              }
            }
          }
        });
      }
    }
  }

  // Renderizador: Comparativo Histórico de Consumo
  function updateHistoricoView(){
    const selectedPeriodos = getPeriodSlice(allPeriodos, currentHistoricoRango);
    if (typeof Chart !== 'undefined') {
      const canvasHist = document.getElementById('analisisChart');
      if (canvasHist) {
        safeDestroyChart(analisisChartInstance);
        const datasets = Object.keys(porSvc).map(svc => {
          const m = SERVICE_META[svc] || { label: svc };
          return {
            label: m.label,
            data: selectedPeriodos.map(p => {
              const f = porSvc[svc].find(x => x.periodo === p);
              return f ? f.consumo : null;
            }),
            borderColor: colors[svc],
            backgroundColor: colors[svc] + '15',
            tension: 0.4,
            borderWidth: 2,
            fill: true,
            spanGaps: true
          };
        });

        analisisChartInstance = new Chart(canvasHist, {
          type: 'line',
          data: { labels: selectedPeriodos, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Consumo' } } }
          }
        });
      }
    }
  }

  // Renderizador: Cuadro individual de servicio
  function updateServiceCard(svc){
    const m = SERVICE_META[svc] || SERVICE_META.agua;
    const allFacts = porSvc[svc] || [];
    const rango = currentSvcRangos[svc] || 'todo';
    const selectedPeriodos = getPeriodSlice(allPeriodos, rango);
    const filtered = allFacts.filter(f => selectedPeriodos.includes(f.periodo));

    // Cálculos estadísticos
    const consumos = filtered.map(f => f.consumo);
    const avg = consumos.length ? (consumos.reduce((s, x) => s + x, 0) / consumos.length).toFixed(1) : 0;
    const min = consumos.length ? Math.min(...consumos) : 0;
    const max = consumos.length ? Math.max(...consumos) : 0;
    const totalCost = filtered.reduce((s, f) => s + (Number(f.valor) || 0), 0);

    // Tendencia
    let trend = 'stable', trendLabel = 'Estable', trendCls = 'stable';
    if (consumos.length >= 2) {
      const last = consumos[consumos.length - 1];
      const prevAvg = consumos.slice(0, -1).reduce((s, x) => s + x, 0) / (consumos.length - 1);
      const pct = prevAvg > 0 ? ((last - prevAvg) / prevAvg * 100) : 0;
      if (pct > 5) { trend = 'up'; trendLabel = 'Creciente'; trendCls = 'up'; }
      else if (pct < -5) { trend = 'down'; trendLabel = 'Decreciente'; trendCls = 'down'; }
    }

    // Actualizar badge de tendencia
    const badgeEl = document.getElementById(`svcTrendBadge-${svc}`);
    if (badgeEl) {
      badgeEl.className = `trend-badge ${trendCls}`;
      badgeEl.textContent = trendLabel;
    }

    // Actualizar contenedor de KPIs
    const kpiEl = document.getElementById(`svcStatsContainer-${svc}`);
    if (kpiEl) {
      kpiEl.innerHTML = `
        <div><small class="text-muted d-block">Promedio</small><strong>${avg} ${m.unit}</strong></div>
        <div><small class="text-muted d-block">Mín / Máx</small><strong>${min} / ${max}</strong></div>
        <div><small class="text-muted d-block">Gasto total</small><strong>$${totalCost.toLocaleString('es-CO')}</strong></div>
      `;
    }

    // Construir tabla de variación
    let varRows = '';
    for (let i = 1; i < filtered.length; i++) {
      const prev = filtered[i - 1], cur = filtered[i];
      const abs = (cur.consumo - prev.consumo).toFixed(1);
      const pct = prev.consumo > 0 ? ((cur.consumo - prev.consumo) / prev.consumo * 100).toFixed(1) : '—';
      const cls = pct > 0 ? 'trend-up' : pct < 0 ? 'trend-down' : 'trend-stable';
      varRows += `<tr><td>${escapeHtml(cur.periodo)}</td><td>${cur.consumo} ${m.unit}</td><td class="${cls}">${abs > 0 ? '+' : ''}${abs}</td><td class="${cls}">${pct}%</td></tr>`;
    }
    const tableEl = document.getElementById(`svcTableContainer-${svc}`);
    if (tableEl) {
      tableEl.innerHTML = varRows
        ? `<table class="table-modern"><thead><tr><th>Período</th><th>Consumo</th><th>Var. Abs.</th><th>Var. %</th></tr></thead><tbody>${varRows}</tbody></table>`
        : `<p class="text-muted small mb-0">${filtered.length === 1 ? 'Solo un período registrado en este rango' : 'Sin registros en este rango'}</p>`;
    }

    // Gráfica individual de consumo del servicio
    if (typeof Chart !== 'undefined') {
      const canvasSvc = document.getElementById(`analisisServiceChart-${svc}`);
      if (canvasSvc) {
        safeDestroyChart(analisisServiceChartInstances[svc]);
        const chartLabels = filtered.map(f => f.periodo);
        const chartData = filtered.map(f => f.consumo);
        const chartValores = filtered.map(f => f.valor);

        analisisServiceChartInstances[svc] = new Chart(canvasSvc, {
          type: 'line',
          data: {
            labels: chartLabels,
            datasets: [{
              label: `Consumo (${m.unit})`,
              data: chartData,
              borderColor: colors[svc] || '#3b82f6',
              backgroundColor: (colors[svc] || '#3b82f6') + '20',
              fill: true,
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 3,
              pointHoverRadius: 5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const cVal = ctx.raw;
                    const vVal = chartValores[ctx.dataIndex];
                    return [`Consumo: ${cVal} ${m.unit}`, `Gasto: $${Number(vVal || 0).toLocaleString('es-CO')}`];
                  }
                }
              }
            },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 10 } } },
              y: { beginAtZero: false, ticks: { font: { size: 10 } } }
            }
          }
        });
      }
    }
  }

  // Render inicial de todas las vistas
  updateGastoView();
  updateHistoricoView();
  Object.keys(porSvc).forEach(svc => updateServiceCard(svc));

  // Listeners: Botones de rango de gasto
  const gastoRangoBtns = document.querySelectorAll('#gastoRangoGroup button');
  gastoRangoBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      gastoRangoBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentGastoRango = btn.getAttribute('data-rango');
      updateGastoView();
    });
  });

  // Listeners: Botones de agrupación de gasto
  const gastoAgrupBtns = document.querySelectorAll('#gastoAgrupGroup button');
  gastoAgrupBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      gastoAgrupBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentGastoAgrup = btn.getAttribute('data-agrup');
      updateGastoView();
    });
  });

  // Listeners: Botones de rango histórico de consumo
  const histBtns = document.querySelectorAll('#historicoRangoGroup button');
  histBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      histBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentHistoricoRango = btn.getAttribute('data-rango');
      updateHistoricoView();
    });
  });

  // Listeners: Filtro global de servicios
  const globalSvcBtns = document.querySelectorAll('#globalSvcRangoGroup button');
  globalSvcBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      globalSvcBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const r = btn.getAttribute('data-rango');
      Object.keys(porSvc).forEach(svc => {
        currentSvcRangos[svc] = r;
        const cardBtns = document.querySelectorAll(`.svc-individual-filter-group[data-svc="${svc}"] button`);
        cardBtns.forEach(cb => {
          if (cb.getAttribute('data-rango') === r) cb.classList.add('active');
          else cb.classList.remove('active');
        });
        updateServiceCard(svc);
      });
    });
  });

  // Listeners: Botones individuales de cada tarjeta de servicio
  document.querySelectorAll('.svc-individual-filter-group button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const parentGroup = e.target.closest('.svc-individual-filter-group');
      const svc = parentGroup.getAttribute('data-svc');
      const r = e.target.getAttribute('data-rango');
      parentGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentSvcRangos[svc] = r;
      updateServiceCard(svc);
    });
  });
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
    const estado=['nueva','revisada','atendida'].includes(a.estado)?a.estado:'nueva';
    html+=`<div class="alert-card ${tipo}">
      <div class="alert-icon ${tipo}"><i class="bi ${m.icon}"></i></div>
      <div class="flex-grow-1">
        <div class="d-flex align-items-center gap-2 mb-1">
          <strong>${m.label}</strong>
          <span class="badge-status badge-${estado}">${escapeHtml(estado)}</span>
        </div>
        <p class="mb-1 small">${escapeHtml(a.mensaje)}</p>
        <small class="text-muted">${escapeHtml(a.fecha?a.fecha.split('T')[0]:'')}</small>
      </div>
      <div class="d-flex flex-column gap-1">
        ${estado==='nueva'?`<button class="btn btn-sm btn-outline-primary" onclick="cambiarEstadoAlerta(${realIdx},'revisada')">Revisar</button>`:''}
        ${estado!=='atendida'?`<button class="btn btn-sm btn-outline-success" onclick="cambiarEstadoAlerta(${realIdx},'atendida')">Atender</button>`:''}
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
  if(!perfil || typeof perfil!=='object') perfil={};
  if(!perfil.umbrales || typeof perfil.umbrales!=='object') perfil.umbrales={};
  // Only generate if new invoices detected (simple check)
  const porSvc={};
  facturas.forEach(f=>{ if(!porSvc[f.servicio]) porSvc[f.servicio]=[]; porSvc[f.servicio].push(f); });
  Object.values(porSvc).forEach(arr=>arr.sort((a,b)=>(a.periodo||'').localeCompare(b.periodo||'')));

  const existing=await DataService.getAlertas();
  const existingKeys=new Set(existing.map(a=>a._key||''));

  // iterate services sequentially so we can use await inside
  for (const svc of Object.keys(porSvc)) {
    const arr = porSvc[svc];
    const umb = perfil.umbrales[svc]||{consumo:0,valor:0};
    for (let i = 0; i < arr.length; i++) {
      const cur = arr[i];
      // Threshold check
      if (umb.consumo > 0 && cur.consumo > umb.consumo) {
        const key = `umbral_${svc}_${cur.periodo}`;
        if (!existingKeys.has(key)) {
          const a = {servicio:svc,tipo:'exceso',mensaje:`Consumo de ${cur.consumo} supera umbral de ${umb.consumo}`,fecha:new Date().toISOString(),estado:'nueva',_key:key};
          existing.push(a); existingKeys.add(key);
          await DataService.saveAlerta(a);
        }
      }
      // Variation check (>20% vs previous)
      if (i > 0) {
        const prev = arr[i-1];
        if (prev.consumo > 0) {
          const pct = ((cur.consumo - prev.consumo) / prev.consumo * 100);
          if (pct > 20) {
            const key = `var_${svc}_${cur.periodo}`;
            if (!existingKeys.has(key)) {
              const a = {servicio:svc,tipo:'variación',mensaje:`Aumento de ${pct.toFixed(1)}% vs período anterior (${prev.periodo})`,fecha:new Date().toISOString(),estado:'nueva',_key:key};
              existing.push(a); existingKeys.add(key);
              await DataService.saveAlerta(a);
            }
          }
        }
      }
    }
  }
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
  // --- PWA: register service worker and handle beforeinstallprompt ---
  const installBtn = document.getElementById('installBtn');
  let deferredPrompt = null;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // El registro del service worker no bloquea la carga de la app.
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch (e) {
        // El prompt de instalación es opcional y puede fallar en navegadores restrictivos.
      }
      deferredPrompt = null;
      installBtn.hidden = true;
    });
  }

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installBtn) installBtn.hidden = true;
  });
});

