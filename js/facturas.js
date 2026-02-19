function guardar() {
  const servicio = document.getElementById('servicio');
  const consumo = document.getElementById('consumo');
  const valor = document.getElementById('valor');
  const periodo = document.getElementById('periodo');

  let datos = JSON.parse(localStorage.getItem("facturas")) || [];
  if (!periodo || !periodo.value) {
    if(window.showToast) window.showToast('Seleccione el periodo (mes) de la factura.', {type:'warning'});
    else alert('Seleccione el periodo (mes) de la factura.');
    return;
  }

  // validar campos
  if (!consumo.value || !valor.value) {
    if(window.showToast) window.showToast('Complete consumo y valor.', {type:'warning'});
    else alert('Complete consumo y valor.');
    return;
  }

  // evitar duplicados: mismo servicio y mismo periodo
  const exists = datos.find(d => d.servicio === servicio.value && d.periodo === periodo.value);
  if (exists) {
    if(window.showToast) window.showToast('Ya existe una factura para este servicio en el periodo seleccionado.', {type:'warning'});
    else alert('Ya existe una factura para este servicio en el periodo seleccionado.');
    return;
  }

  datos.push({
    servicio: servicio.value,
    consumo: Number(consumo.value),
    valor: Number(valor.value),
    periodo: periodo.value,
    fecha_creacion: new Date().toISOString(),
    fecha_corte: (document.getElementById('fecha_corte')||{}).value || null,
    fecha_pago: (document.getElementById('fecha_pago')||{}).value || null
  });

  localStorage.setItem("facturas", JSON.stringify(datos));
  if(window.showToast) window.showToast('Factura guardada', {type:'success'});
  else alert('Factura guardada');
  window.location.href = 'dashboard.html';
}

function volver() {
  window.location.href = 'dashboard.html';
}