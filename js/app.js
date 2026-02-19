// Manejo del Dashboard y Navegación

/**
 * Mostrar una sección específica del contenido
 */
function showSection(sectionName, event) {
  if (event) {
    event.preventDefault();
  }

  // Ocultar todas las secciones
  const sections = document.querySelectorAll('.content-section');
  sections.forEach(section => {
    section.classList.remove('active');
  });

  // Mostrar la sección seleccionada
  const targetSection = document.getElementById(`${sectionName}-section`);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Actualizar el enlace activo en el menú
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.classList.remove('active');
  });

  const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }

  // Cargar contenido según la sección
  loadSectionContent(sectionName);

  // Cerrar el menú en dispositivos móviles
  if (window.innerWidth <= 768) {
    closeMenu();
  }
}

/**
 * Cargar contenido específico de cada sección
 */
function loadSectionContent(sectionName) {
  const contentDiv = document.getElementById(`${sectionName}-content`);
  if (!contentDiv) return;

  switch (sectionName) {
    case 'consumo':
      loadConsumo(contentDiv);
      break;
    case 'facturas':
      loadFacturas(contentDiv);
      break;
    case 'analisis':
      loadAnalisis(contentDiv);
      break;
    case 'alertas':
      loadAlertas(contentDiv);
      break;
    case 'perfil':
      loadPerfil(contentDiv);
      break;
    case 'historial':
      loadHistorial(contentDiv);
      break;
    case 'tareas':
      loadTareas(contentDiv);
      break;
    case 'solicitudes':
      loadSolicitudes(contentDiv);
      break;
    case 'mis-solicitudes':
      loadMisSolicitudes(contentDiv);
      break;
    case 'descargas':
      loadDescargas(contentDiv);
      break;
  }
}

/**
 * Cargar datos de consumo
 */
function loadConsumo(container) {
  try {
    const html = `
      <div class="row">
        <div class="col-md-6 mb-3">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Agua</h5>
              <p class="card-text">Consumo: <strong>25 m³</strong></p>
              <p class="text-muted">Costo: <strong>$125,00</strong></p>
            </div>
          </div>
        </div>
        <div class="col-md-6 mb-3">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Electricidad</h5>
              <p class="card-text">Consumo: <strong>320 kWh</strong></p>
              <p class="text-muted">Costo: <strong>$256,00</strong></p>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-md-6 mb-3">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Gas Natural</h5>
              <p class="card-text">Consumo: <strong>15 m³</strong></p>
              <p class="text-muted">Costo: <strong>$45,00</strong></p>
            </div>
          </div>
        </div>
        <div class="col-md-6 mb-3">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Internet</h5>
              <p class="card-text">Velocidad: <strong>100 Mbps</strong></p>
              <p class="text-muted">Costo: <strong>$80,00</strong></p>
            </div>
          </div>
        </div>
      </div>
    `;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = '<p class="alert alert-danger">Error al cargar consumo</p>';
    console.error(error);
  }
}

/**
 * Cargar datos de facturas
 */
function loadFacturas(container) {
  try {
    const facturas = JSON.parse(localStorage.getItem('facturas') || '[]');

    // Barra superior con botón para registrar nueva factura
    let html = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Facturas</h5>
        <a href="registrar.html" class="btn btn-primary">Registrar Factura</a>
      </div>
    `;

    if (facturas.length === 0) {
      html += '<p class="alert alert-info">No hay facturas registradas. Usa "Registrar Factura" para añadir una.</p>';
      container.innerHTML = html;
      return;
    }

    let rows = '';
    facturas.forEach(f => {
      const estado = f.fecha_pago && f.fecha_pago !== '' ? 'pagada' : 'pendiente';
      const badgeClass = estado === 'pagada' ? 'bg-success' : 'bg-warning';
      const monto = `$${Number(f.valor).toFixed(2)}`;
      const adjuntoBtn = f.adjunto ? `<a class="btn btn-sm btn-outline-primary" href="${f.adjunto.data}" download="${f.adjunto.name}">Descargar</a>` : '';
      const pagarBtn = estado === 'pagada' ? '' : `<button class="btn btn-sm btn-success ms-1" onclick="marcarFacturaPagada('${f.id}')">Marcar como pagada</button>`;
      rows += `
        <tr>
          <td>${f.servicio}</td>
          <td>${f.periodo}</td>
          <td>${monto}</td>
          <td><span class="badge ${badgeClass}">${estado === 'pagada' ? 'Pagada' : 'Pendiente'}</span></td>
          <td>
            ${adjuntoBtn}
            ${pagarBtn}
            <button class="btn btn-sm btn-danger ms-1" onclick="eliminarFactura('${f.id}')">Eliminar</button>
          </td>
        </tr>
      `;
    });

    html += `
      <div class="table-responsive">
        <table class="table table-striped">
          <thead class="table-light">
            <tr>
              <th>Servicio</th>
              <th>Período</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = '<p class="alert alert-danger">Error al cargar facturas</p>';
    console.error(error);
  }
}

function marcarFacturaPagada(id) {
  const facturas = JSON.parse(localStorage.getItem('facturas') || '[]');
  const idx = facturas.findIndex(f => f.id === id);
  if (idx === -1) return;
  facturas[idx].fecha_pago = new Date().toISOString();
  localStorage.setItem('facturas', JSON.stringify(facturas));
  if (typeof showToast === 'function') showToast('Factura marcada como pagada', { type: 'success' });
  const cont = document.getElementById('facturas-content');
  if (cont) loadFacturas(cont);
}

function eliminarFactura(id) {
  if (!confirm('¿Eliminar esta factura?')) return;
  let facturas = JSON.parse(localStorage.getItem('facturas') || '[]');
  facturas = facturas.filter(f => f.id !== id);
  localStorage.setItem('facturas', JSON.stringify(facturas));
  if (typeof showToast === 'function') showToast('Factura eliminada', { type: 'warning' });
  const cont = document.getElementById('facturas-content');
  if (cont) loadFacturas(cont);
}

/**
 * Cargar análisis de consumo
 */
function loadAnalisis(container) {
  try {
    const facturas = JSON.parse(localStorage.getItem('facturas') || '[]');
    
    if (facturas.length === 0) {
      container.innerHTML = '<p class="alert alert-info">No hay facturas registradas. Registra facturas en "Registrar Factura" para ver el análisis.</p>';
      return;
    }

    // Agrupar facturas por servicio y período
    const porServicio = {};
    facturas.forEach(f => {
      if (!porServicio[f.servicio]) {
        porServicio[f.servicio] = [];
      }
      porServicio[f.servicio].push(f);
    });

    // Ordenar por período dentro de cada servicio
    Object.keys(porServicio).forEach(servicio => {
      porServicio[servicio].sort((a, b) => a.periodo.localeCompare(b.periodo));
    });

    // Preparar datos para Chart.js
    const servicios = Object.keys(porServicio);
    const periodos = [...new Set(facturas.map(f => f.periodo))].sort();
    
    const datasets = [];
    const colors = {
      'agua': '#3498db',
      'energia': '#e74c3c',
      'gas': '#f39c12',
      'internet': '#2ecc71'
    };

    servicios.forEach(servicio => {
      const data = periodos.map(periodo => {
        const factura = porServicio[servicio].find(f => f.periodo === periodo);
        return factura ? factura.consumo : 0;
      });
      
      datasets.push({
        label: servicio.charAt(0).toUpperCase() + servicio.slice(1),
        data: data,
        borderColor: colors[servicio],
        backgroundColor: colors[servicio] + '20',
        tension: 0.4,
        borderWidth: 2,
        fill: true
      });
    });

    // Calcular estadísticas por servicio
    let statsHtml = '<div class="row">';
    servicios.forEach(servicio => {
      const consumos = porServicio[servicio].map(f => f.consumo);
      const valores = porServicio[servicio].map(f => f.valor);
      
      const min = Math.min(...consumos);
      const max = Math.max(...consumos);
      const promedio = (consumos.reduce((a, b) => a + b, 0) / consumos.length).toFixed(2);
      const totalValor = valores.reduce((a, b) => a + b, 0).toFixed(2);
      
      const ultimoIdx = consumos.length - 1;
      const penultimoIdx = ultimoIdx - 1;
      const cambio = penultimoIdx >= 0 ? 
        (((consumos[ultimoIdx] - consumos[penultimoIdx]) / consumos[penultimoIdx] * 100).toFixed(1)) : 
        0;
      
      const cambioClase = cambio < 0 ? 'text-success' : cambio > 0 ? 'text-danger' : 'text-muted';
      const cambioSymbol = cambio < 0 ? '↓' : cambio > 0 ? '↑' : '→';
      
      statsHtml += `
        <div class="col-md-6 mb-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-title">${servicio.charAt(0).toUpperCase() + servicio.slice(1)}</h6>
              <p class="mb-1"><small>Mínimo: <strong>${min}</strong> | Máximo: <strong>${max}</strong></small></p>
              <p class="mb-1"><small>Promedio: <strong>${promedio}</strong></small></p>
              <p class="mb-1"><small>Gasto Total: <strong>$${totalValor}</strong></small></p>
              <p class="mb-0"><small>Cambio último mes: <span class="${cambioClase}"><strong>${cambioSymbol} ${Math.abs(cambio)}%</strong></span></small></p>
            </div>
          </div>
        </div>
      `;
    });
    statsHtml += '</div>';

    const html = `
      <div class="row mb-4">
        <div class="col-md-12">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Gráfico de Consumo</h5>
              <canvas id="graficoConsumo" style="max-height: 300px;"></canvas>
            </div>
          </div>
        </div>
      </div>
      <h5 class="mb-3">Estadísticas por Servicio</h5>
      ${statsHtml}
    `;
    
    container.innerHTML = html;

    // Usar Chart.js si está disponible, sino mostrar tabla alternativa
    if (typeof Chart !== 'undefined') {
      setTimeout(() => {
        const canvas = document.getElementById('graficoConsumo');
        if (canvas) {
          const ctx = canvas.getContext('2d');
          new Chart(ctx, {
            type: 'line',
            data: {
              labels: periodos,
              datasets: datasets
            },
            options: {
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Consumo'
                  }
                }
              }
            }
          });
        }
      }, 0);
    }
  } catch (error) {
    container.innerHTML = '<p class="alert alert-danger">Error al cargar análisis</p>';
    console.error(error);
  }
}

/**
 * Cargar alertas
 */
function loadAlertas(container) {
  try {
    const facturas = JSON.parse(localStorage.getItem('facturas') || '[]');
    const tareas = JSON.parse(localStorage.getItem('tareas') || '[]');
    
    let alertas = [];

    // Generar alertas a partir de facturas
    if (facturas.length > 0) {
      // Agrupar por servicio y fecha
      const porServicio = {};
      facturas.forEach(f => {
        if (!porServicio[f.servicio]) {
          porServicio[f.servicio] = [];
        }
        porServicio[f.servicio].push(f);
      });

      // Analizar cambios de consumo > 10%
      Object.keys(porServicio).forEach(servicio => {
        const facturasSorted = porServicio[servicio].sort((a, b) => a.periodo.localeCompare(b.periodo));
        for (let i = 1; i < facturasSorted.length; i++) {
          const anterior = facturasSorted[i - 1];
          const actual = facturasSorted[i];
          const cambio = ((actual.consumo - anterior.consumo) / anterior.consumo) * 100;
          
          if (cambio > 10) {
            alertas.push({
              tipo: 'warning',
              icon: '⚠️',
              titulo: 'Alerta de consumo',
              mensaje: `El consumo de ${servicio} ha aumentado un ${cambio.toFixed(1)}% en el período ${actual.periodo}`,
              timestamp: actual.fecha_registro
            });
          } else if (cambio < -10) {
            alertas.push({
              tipo: 'info',
              icon: 'ℹ️',
              titulo: 'Reducción de consumo',
              mensaje: `El consumo de ${servicio} ha disminuido un ${Math.abs(cambio).toFixed(1)}% en el período ${actual.periodo}`,
              timestamp: actual.fecha_registro
            });
          }
        }
      });

      // Facturas sin fecha de pago (pendientes)
      facturas.forEach(f => {
        if (!f.fecha_pago || f.fecha_pago === '') {
          alertas.push({
            tipo: 'danger',
            icon: '🔴',
            titulo: 'Factura pendiente',
            mensaje: `Tienes una factura de ${f.servicio} sin pagar del período ${f.periodo} por $${f.valor.toFixed(2)}`,
            timestamp: f.fecha_registro
          });
        }
      });
    }

    // Agregar tareas pendientes como alertas
    tareas.forEach(tarea => {
      if (!tarea.completada) {
        const prioridadColor = tarea.prioridad === 'alta' ? 'danger' : 
                              tarea.prioridad === 'media' ? 'warning' : 'info';
        alertas.push({
          tipo: prioridadColor,
          icon: '📋',
          titulo: 'Tarea pendiente',
          mensaje: `${tarea.titulo}`,
          timestamp: tarea.fecha_creacion,
          prioridad: tarea.prioridad
        });
      }
    });

    // Si no hay alertas
    if (alertas.length === 0) {
      container.innerHTML = '<p class="alert alert-success"><strong>✓ Sin alertas</strong><br>No hay alertas pendientes. Tu consumo está bajo control.</p>';
      return;
    }

    // Ordenar alertas por timestamp descendente
    alertas.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Generar HTML de alertas
    let html = '<div class="row"><div class="col-md-12">';
    alertas.forEach(alerta => {
      const alertClass = alerta.tipo === 'warning' ? 'alert-warning' : 
                        alerta.tipo === 'danger' ? 'alert-danger' : 'alert-info';
      const prioridadBadge = alerta.prioridad ? `<span class="badge bg-${alerta.tipo} ms-2">${alerta.prioridad.toUpperCase()}</span>` : '';
      
      html += `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
          <strong>${alerta.icon} ${alerta.titulo}</strong> ${prioridadBadge}<br>
          ${alerta.mensaje}
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      `;
    });
    html += '</div></div>';

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = '<p class="alert alert-danger">Error al cargar alertas</p>';
    console.error(error);
  }
}

/**
 * Cargar perfil
 */
function loadPerfil(container) {
  try {
    const userEmail = localStorage.getItem('userEmail') || 'usuario@ejemplo.com';
    const html = `
      <div class="row">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Información Personal</h5>
              <p><strong>Email:</strong> ${userEmail}</p>
              <p><strong>Nombre:</strong> Usuario del Sistema</p>
              <p><strong>Documento:</strong> 1234567890</p>
              <p><strong>Teléfono:</strong> +57 300 123 4567</p>
              <button class="btn btn-primary mt-3">Editar Perfil</button>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Preferencias</h5>
              <div class="mb-3">
                <label class="form-check-label">
                  <input class="form-check-input" type="checkbox" checked>
                  Recibir alertas por email
                </label>
              </div>
              <div class="mb-3">
                <label class="form-check-label">
                  <input class="form-check-input" type="checkbox" checked>
                  Notificaciones de facturas
                </label>
              </div>
              <button class="btn btn-primary mt-3">Guardar Cambios</button>
            </div>
          </div>
        </div>
      </div>
    `;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = '<p class="alert alert-danger">Error al cargar perfil</p>';
    console.error(error);
  }
}

/**
 * Cargar historial
 */
function loadHistorial(container) {
  try {
    const html = `
      <div class="table-responsive">
        <table class="table table-striped">
          <thead class="table-light">
            <tr>
              <th>Fecha</th>
              <th>Acción</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>17/02/2025</td>
              <td><span class="badge bg-primary">Consulta</span></td>
              <td>Se consultó el consumo de agua</td>
            </tr>
            <tr>
              <td>15/02/2025</td>
              <td><span class="badge bg-success">Pago</span></td>
              <td>Se realizó pago de factura de gas</td>
            </tr>
            <tr>
              <td>12/02/2025</td>
              <td><span class="badge bg-info">Descarga</span></td>
              <td>Se descargó factura de electricidad</td>
            </tr>
            <tr>
              <td>10/02/2025</td>
              <td><span class="badge bg-warning">Alerta</span></td>
              <td>Se activó alerta de consumo alto</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = '<p class="alert alert-danger">Error al cargar historial</p>';
    console.error(error);
  }
}

/**
 * Cargar tareas
 */
function loadTareas(container) {
  try {
    const tareas = JSON.parse(localStorage.getItem('tareas') || '[]');
    
    let html = `
      <div class="row mb-3">
        <div class="col-md-12">
          <button class="btn btn-primary" onclick="toggleFormTarea()">+ Nueva Tarea</button>
        </div>
      </div>

      <div id="formTareaNueva" class="row mb-4" style="display: none;">
        <div class="col-md-12">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Crear Nueva Tarea</h5>
              <form id="formCrearTarea">
                <div class="mb-3">
                  <label for="titloTarea" class="form-label">Título</label>
                  <input type="text" class="form-control" id="titloTarea" placeholder="Ej: Pagar factura de agua" required>
                </div>
                <div class="mb-3">
                  <label for="descTarea" class="form-label">Descripción</label>
                  <textarea class="form-control" id="descTarea" rows="3" placeholder="Detalles de la tarea..."></textarea>
                </div>
                <div class="mb-3">
                  <label for="priTarea" class="form-label">Prioridad</label>
                  <select class="form-select" id="priTarea" required>
                    <option value="baja">Baja</option>
                    <option value="media" selected>Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <button type="submit" class="btn btn-success">Guardar Tarea</button>
                <button type="button" class="btn btn-secondary" onclick="toggleFormTarea()">Cancelar</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    // Separar tareas completadas y pendientes
    const tareasIncompletas = tareas.filter(t => !t.completada);
    const tareasCompletadas = tareas.filter(t => t.completada);

    // Mostrar tareas pendientes
    if (tareasIncompletas.length > 0) {
      html += '<h5 class="mb-3">Tareas Pendientes</h5><div class="row">';
      tareasIncompletas.forEach((tarea, idx) => {
        const colorPrioridad = tarea.prioridad === 'alta' ? 'danger' : 
                              tarea.prioridad === 'media' ? 'warning' : 'info';
        const indicePrioridad = tareas.findIndex(t => t.id === tarea.id);
        html += `
          <div class="col-md-12 mb-3">
            <div class="card border-${colorPrioridad}">
              <div class="card-body">
                <div class="d-flex align-items-start justify-content-between">
                  <div class="flex-grow-1">
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox" id="check-${tarea.id}" 
                             onchange="completarTarea(${indicePrioridad})">
                      <label class="form-check-label" for="check-${tarea.id}">
                        <h5 class="card-title">${tarea.titulo}</h5>
                      </label>
                    </div>
                    <p class="card-text text-muted">${tarea.descripcion || 'Sin descripción'}</p>
                    <small class="text-muted">Creada: ${new Date(tarea.fecha_creacion).toLocaleDateString()}</small>
                  </div>
                  <div class="text-end">
                    <span class="badge bg-${colorPrioridad}">${tarea.prioridad.toUpperCase()}</span>
                    <br><br>
                    <button class="btn btn-sm btn-danger" onclick="eliminarTarea(${indicePrioridad})">Eliminar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
    } else {
      html += '<p class="alert alert-info">No tienes tareas pendientes. ¡Excelente!</p>';
    }

    // Mostrar tareas completadas
    if (tareasCompletadas.length > 0) {
      html += '<h5 class="mb-3 mt-4">Tareas Completadas</h5><div class="row">';
      tareasCompletadas.forEach((tarea, idx) => {
        const indicePrioridad = tareas.findIndex(t => t.id === tarea.id);
        html += `
          <div class="col-md-12 mb-3">
            <div class="card bg-light">
              <div class="card-body">
                <div class="d-flex align-items-start justify-content-between">
                  <div class="flex-grow-1">
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox" id="check-${tarea.id}" checked
                             onchange="descomplemarTarea(${indicePrioridad})">
                      <label class="form-check-label" for="check-${tarea.id}">
                        <h5 class="card-title"><strike>${tarea.titulo}</strike></h5>
                      </label>
                    </div>
                    <p class="card-text text-muted"><strike>${tarea.descripcion || 'Sin descripción'}</strike></p>
                    <small class="text-muted">Completada: ${new Date(tarea.fecha_completada).toLocaleDateString()}</small>
                  </div>
                  <div class="text-end">
                    <button class="btn btn-sm btn-danger" onclick="eliminarTarea(${indicePrioridad})">Eliminar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    container.innerHTML = html;

    // Agregar listener al formulario
    setTimeout(() => {
      const form = document.getElementById('formCrearTarea');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          agregarTarea();
        });
      }
    }, 100);

  } catch (error) {
    container.innerHTML = '<p class="alert alert-danger">Error al cargar tareas</p>';
    console.error(error);
  }
}

/**
 * Cargar solicitudes
 */
function loadSolicitudes(container) {
  try {
    const tipos = [
      'Cambio de medidor',
      'Reclamo por factura',
      'Corte de servicio',
      'Instalación nueva',
      'Actualización de datos',
      'Consulta técnica',
      'Facturación incorrecta',
      'Otra'
    ];

    const optionsHtml = tipos.map(t => `<option value="${t}">${t}</option>`).join('');

    const html = `
      <p class="mb-3">Crear una nueva solicitud</p>
      <div class="card">
        <div class="card-body">
          <form id="formSolicitud">
            <div class="mb-3">
              <label for="tipo-solicitud" class="form-label">Tipo de Solicitud</label>
              <select class="form-select" id="tipo-solicitud" required>
                <option value="">-- Selecciona un tipo --</option>
                ${optionsHtml}
              </select>
            </div>
            <div class="mb-3" id="contenedor-otra" style="display:none;">
              <label for="otra-tipo" class="form-label">Especificar otro tipo</label>
              <input type="text" id="otra-tipo" class="form-control" placeholder="Describe el tipo de solicitud">
            </div>
            <div class="mb-3">
              <label for="descripcion" class="form-label">Descripción</label>
              <textarea class="form-control" id="descripcion" rows="4" placeholder="Detalles de la solicitud..."></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Enviar Solicitud</button>
          </form>
        </div>
      </div>
    `;
    container.innerHTML = html;

    // Listeners
    setTimeout(() => {
      const selectTipo = document.getElementById('tipo-solicitud');
      const contOtra = document.getElementById('contenedor-otra');
      if (selectTipo && contOtra) {
        selectTipo.addEventListener('change', (e) => {
          contOtra.style.display = e.target.value === 'Otra' ? 'block' : 'none';
        });
      }

      const form = document.getElementById('formSolicitud');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          crearSolicitud();
        });
      }
      // Botón para sembrar datos de prueba (solo en desarrollo)
      const seedBtn = document.createElement('button');
      seedBtn.type = 'button';
      seedBtn.className = 'btn btn-sm btn-secondary ms-2 mt-3';
      seedBtn.textContent = 'Sembrar datos de prueba';
      seedBtn.addEventListener('click', seedSolicitudes);
      const cardBody = document.querySelector('.card .card-body');
      if (cardBody) cardBody.appendChild(seedBtn);
    }, 50);
  } catch (error) {
    container.innerHTML = '<p class="alert alert-danger">Error al cargar solicitudes</p>';
    console.error(error);
  }
}

/**
 * Cargar mis solicitudes
 */
function loadMisSolicitudes(container) {
  try {
    const solicitudes = JSON.parse(localStorage.getItem('solicitudes') || '[]');

    if (solicitudes.length === 0) {
      container.innerHTML = '<p class="alert alert-info">No tienes solicitudes registradas.</p>';
      return;
    }

    let rows = '';
    solicitudes.forEach(s => {
      const fecha = new Date(s.fecha).toLocaleDateString();
      const estado = s.estado || 'pendiente';
      rows += `
        <tr>
          <td>${s.id}</td>
          <td>${s.tipo}</td>
          <td>${fecha}</td>
          <td>
            <select class="form-select form-select-sm" onchange="actualizarEstadoSolicitud('${s.id}', this.value)">
              <option value="pendiente" ${estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
              <option value="en proceso" ${estado === 'en proceso' ? 'selected' : ''}>En proceso</option>
              <option value="completada" ${estado === 'completada' ? 'selected' : ''}>Completada</option>
            </select>
          </td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="eliminarSolicitud('${s.id}')">Eliminar</button>
          </td>
        </tr>
      `;
    });

    const html = `
      <div class="table-responsive">
        <table class="table table-striped">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = '<p class="alert alert-danger">Error al cargar solicitudes</p>';
    console.error(error);
  }
}

/* Helpers para solicitudes */
function crearSolicitud() {
  const tipoSelect = document.getElementById('tipo-solicitud');
  const otra = document.getElementById('otra-tipo');
  const descripcion = document.getElementById('descripcion');

  if (!tipoSelect) return;

  let tipo = tipoSelect.value;
  if (tipo === '') {
    alert('Selecciona un tipo de solicitud');
    return;
  }
  if (tipo === 'Otra') {
    tipo = (otra && otra.value.trim()) ? otra.value.trim() : 'Otra';
  }

  const nueva = {
    id: 'SOL-' + Date.now(),
    tipo: tipo,
    descripcion: descripcion ? descripcion.value.trim() : '',
    estado: 'pendiente',
    fecha: new Date().toISOString()
  };

  const solicitudes = JSON.parse(localStorage.getItem('solicitudes') || '[]');
  solicitudes.unshift(nueva);
  localStorage.setItem('solicitudes', JSON.stringify(solicitudes));

  if (typeof showToast === 'function') showToast('Solicitud enviada', { type: 'success' });

  // Limpiar y recargar "Mis Solicitudes"
  const form = document.getElementById('formSolicitud');
  if (form) form.reset();
  const contOtra = document.getElementById('contenedor-otra');
  if (contOtra) contOtra.style.display = 'none';

  const mis = document.getElementById('mis-solicitudes-content');
  if (mis) loadMisSolicitudes(mis);
}

function actualizarEstadoSolicitud(id, nuevoEstado) {
  const solicitudes = JSON.parse(localStorage.getItem('solicitudes') || '[]');
  const idx = solicitudes.findIndex(s => s.id === id);
  if (idx === -1) return;
  solicitudes[idx].estado = nuevoEstado;
  localStorage.setItem('solicitudes', JSON.stringify(solicitudes));
  if (typeof showToast === 'function') showToast('Estado actualizado', { type: 'info' });
}

function eliminarSolicitud(id) {
  if (!confirm('¿Eliminar esta solicitud?')) return;
  let solicitudes = JSON.parse(localStorage.getItem('solicitudes') || '[]');
  solicitudes = solicitudes.filter(s => s.id !== id);
  localStorage.setItem('solicitudes', JSON.stringify(solicitudes));
  if (typeof showToast === 'function') showToast('Solicitud eliminada', { type: 'warning' });
  const mis = document.getElementById('mis-solicitudes-content');
  if (mis) loadMisSolicitudes(mis);
}

/**
 * Sembrar datos de prueba para solicitudes (helper de testing)
 */
function seedSolicitudes() {
  const muestras = [
    { id: 'SOL-' + (Date.now() - 60000), tipo: 'Cambio de medidor', descripcion: 'Solicito cambio por medidor defectuoso', estado: 'pendiente', fecha: new Date(Date.now() - 86400000).toISOString() },
    { id: 'SOL-' + (Date.now() - 30000), tipo: 'Reclamo por factura', descripcion: 'Cobro excesivo en factura', estado: 'en proceso', fecha: new Date().toISOString() },
  ];
  const existentes = JSON.parse(localStorage.getItem('solicitudes') || '[]');
  const combinadas = muestras.concat(existentes);
  localStorage.setItem('solicitudes', JSON.stringify(combinadas));
  if (typeof showToast === 'function') showToast('Datos de prueba añadidos', { type: 'success' });
  const mis = document.getElementById('mis-solicitudes-content');
  if (mis) loadMisSolicitudes(mis);
}

/**
 * Cargar descargas
 */
function loadDescargas(container) {
  try {
    const html = `
      <div class="row">
        <div class="col-md-6 mb-3">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Reporte de Consumo Mensual</h5>
              <p class="text-muted">Febrero 2025</p>
              <button class="btn btn-primary">
                <i class="bi bi-download"> Descargar</i>
              </button>
            </div>
          </div>
        </div>
        <div class="col-md-6 mb-3">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Reporte de Facturación</h5>
              <p class="text-muted">Últimos 3 meses</p>
              <button class="btn btn-primary">
                <i class="bi bi-download"> Descargar</i>
              </button>
            </div>
          </div>
        </div>
        <div class="col-md-6 mb-3">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Análisis Anual</h5>
              <p class="text-muted">Año 2024</p>
              <button class="btn btn-primary">
                <i class="bi bi-download"> Descargar</i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = '<p class="alert alert-danger">Error al cargar descargas</p>';
    console.error(error);
  }
}

/**
 * Toggle del menú en dispositivos móviles
 */
function toggleMenu() {
  const sidebar = document.getElementById('sidebar');
  const dashboardContainer = document.querySelector('.dashboard-container');
  
  if (sidebar) {
    sidebar.classList.toggle('open');
    dashboardContainer.classList.toggle('sidebar-open');
  }
}

/**
 * Cerrar el menú
 */
function closeMenu() {
  const sidebar = document.getElementById('sidebar');
  const dashboardContainer = document.querySelector('.dashboard-container');
  
  if (sidebar) {
    sidebar.classList.remove('open');
    dashboardContainer.classList.remove('sidebar-open');
  }
}

/**
 * Cerrar el menú al hacer click fuera
 */
document.addEventListener('click', function(event) {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.querySelector('.btn-menu-toggle');
  
  if (window.innerWidth <= 768 && sidebar && toggleBtn) {
    if (!sidebar.contains(event.target) && !toggleBtn.contains(event.target)) {
      closeMenu();
    }
  }
});

// Funciones auxiliares para gestión de tareas
/**
 * Alternar visibilidad del formulario de nueva tarea
 */
function toggleFormTarea() {
  const form = document.getElementById('formTareaNueva');
  if (form) {
    form.style.display = form.style.display === 'none' ? 'flex' : 'none';
  }
}

/**
 * Agregar nueva tarea
 */
function agregarTarea() {
  const titulo = document.getElementById('titloTarea').value;
  const descripcion = document.getElementById('descTarea').value;
  const prioridad = document.getElementById('priTarea').value;

  if (!titulo.trim()) {
    alert('El título de la tarea es obligatorio');
    return;
  }

  const tareas = JSON.parse(localStorage.getItem('tareas') || '[]');
  
  const nuevaTarea = {
    id: Date.now(),
    titulo: titulo,
    descripcion: descripcion,
    prioridad: prioridad,
    completada: false,
    fecha_creacion: new Date().toISOString(),
    fecha_completada: null
  };

  tareas.push(nuevaTarea);
  localStorage.setItem('tareas', JSON.stringify(tareas));

  // Resetear formulario y recargar
  document.getElementById('formCrearTarea').reset();
  loadTareas(document.getElementById('content'));
}

/**
 * Completar tarea
 */
function completarTarea(indice) {
  const tareas = JSON.parse(localStorage.getItem('tareas') || '[]');
  
  if (tareas[indice]) {
    tareas[indice].completada = true;
    tareas[indice].fecha_completada = new Date().toISOString();
    localStorage.setItem('tareas', JSON.stringify(tareas));
    loadTareas(document.getElementById('content'));
  }
}

/**
 * Descompletar tarea
 */
function descomplemarTarea(indice) {
  const tareas = JSON.parse(localStorage.getItem('tareas') || '[]');
  
  if (tareas[indice]) {
    tareas[indice].completada = false;
    tareas[indice].fecha_completada = null;
    localStorage.setItem('tareas', JSON.stringify(tareas));
    loadTareas(document.getElementById('content'));
  }
}

/**
 * Eliminar tarea
 */
function eliminarTarea(indice) {
  if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
    const tareas = JSON.parse(localStorage.getItem('tareas') || '[]');
    
    if (tareas[indice]) {
      tareas.splice(indice, 1);
      localStorage.setItem('tareas', JSON.stringify(tareas));
      loadTareas(document.getElementById('content'));
    }
  }
}

/**
 * Actualizar datos mostrados del usuario
 */
function updateUserInfo() {
  const userEmail = localStorage.getItem('userEmail') || 'Usuario';
  const userName = document.getElementById('userName');
  
  if (userName) {
    userName.textContent = userEmail.split('@')[0].charAt(0).toUpperCase() + 
                          userEmail.split('@')[0].slice(1);
  }
}

/**
 * Inicializar el dashboard
 */
function initDashboard() {
  updateUserInfo();
  showSection('inicio');
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('dashboard').style.display !== 'none') {
    initDashboard();
  }
});
