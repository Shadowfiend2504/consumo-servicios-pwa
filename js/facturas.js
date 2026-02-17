function guardar() {
  const servicio = document.getElementById('servicio');
  const consumo = document.getElementById('consumo');
  const valor = document.getElementById('valor');

  let datos = JSON.parse(localStorage.getItem("facturas")) || [];

  datos.push({
    servicio: servicio.value,
    consumo: Number(consumo.value),
    valor: Number(valor.value),
    fecha: new Date().toISOString()
  });

  localStorage.setItem("facturas", JSON.stringify(datos));
  alert("Factura guardada");
  window.location.href = 'dashboard.html';
}

function volver() {
  window.location.href = 'dashboard.html';
}