# 🏠 Control de Consumo del Hogar — PWA

Una **Progressive Web App (PWA)** para monitorear y gestionar el consumo de servicios públicos del hogar (agua, energía, gas e internet). Construida con HTML5, CSS3, JavaScript vanilla, Chart.js y Firebase.

🔗 **Demo en vivo**: [https://shadowfiend2504.github.io/consumo-servicios-pwa/](https://shadowfiend2504.github.io/consumo-servicios-pwa/)

---

## ✨ Características principales

### 🔐 Autenticación
- Login y registro seguro con **Firebase Authentication**
- Recuperación de contraseña por correo electrónico
- Sesión persistente y protección de rutas

### 📊 Dashboard (Inicio)
- Tarjetas de resumen con el último consumo y valor por servicio, con indicador de tendencia (↑/↓/→)
- **6 gráficas interactivas** con Chart.js:
  - Consumo por servicio (barras)
  - Costo por servicio (barras)
  - Distribución del gasto (pastel)
  - **Valores Atípicos** (detección automática por IQR de Tukey)
  - Consumo vs. Valor por servicio (dispersión)
  - Meses de mayor y menor consumo
  - Gráficas individuales de historial por servicio

### 🧾 Facturas y Lecturas
- Registro, edición y eliminación de facturas por servicio (Agua, Energía, Gas, Internet)
- Campos: período, consumo, valor, fecha de corte y fecha de pago
- Tabla paginada con filtros por servicio
- Botón de acceso rápido para registrar nueva factura

### 📈 Análisis de Consumo
Tres bloques de análisis con **filtros de período independientes** (`1 Mes`, `3 Meses`, `6 Meses`, `1 Año`, `Todo`):

1. **Consolidado de Gasto Monetario**
   - Gráfica de barras apiladas por servicio + línea de total
   - Vista configurable: Mensual / Trimestral / Semestral / Anual
   - Tarjeta KPI con gasto total, promedio del período y desglose porcentual

2. **Comparativo Histórico de Consumo**
   - Curvas de consumo físico (m³, kWh, Mbps) por servicio en el período seleccionado

3. **Consolidado por Servicio** (tarjetas individuales)
   - Mini gráfica de tendencia por servicio
   - KPIs: Promedio, Mín/Máx, Gasto total
   - Insignia de tendencia (Creciente / Decreciente / Estable)
   - Tabla de variación período a período (abs. y %)
   - Filtro individual por tarjeta + filtro global para sincronizar todas

### 🔔 Alertas y Seguimiento
- Detección automática de sobreconsumo y valores atípicos
- Registro de alertas con estado (nueva / revisada)
- Badge de alertas sin revisar visible en el menú

### 📑 Reportes
- **Filtros**: por servicio y rango de fechas (desde/hasta por mes)
- **Vista previa** en tiempo real con tabla formateada y total del período
- **Descargar CSV**: con BOM UTF-8 (tildes y ñ correctas en Excel), campos correctamente entrecomillados
- **Descargar Excel (.xlsx)** con 3 hojas:
  - 📄 *Facturas* — Detalle completo filtrado
  - 📊 *Resumen por Servicio* — Estadísticas: total, promedio, mín, máx
  - ℹ️ *Información del Reporte* — Fecha de generación, filtros aplicados, totales
- Exportación de alertas en CSV y Excel

### 📱 PWA — Progressive Web App
- Instalable en Android, iOS y escritorio (Chrome/Edge/Safari)
- Service Worker con estrategia **network-first para HTML** y **cache-first para assets**
- Navegación in-app en modo standalone (sin pestañas externas)
- Botón "Instalar aplicación" en el header cuando el dispositivo lo soporta

---

## 📁 Estructura del Proyecto

```
consumo-servicios-pwa/
├── index.html              # App principal (SPA: login + dashboard)
├── terminos.html           # Términos y condiciones (in-app navigation)
├── registro.html           # Flujo de registro de usuarios
├── registrar.html          # Página alternativa de registro
├── reset-password.html     # Pantalla de nueva contraseña (Firebase oobCode)
├── manifest.json           # Manifest PWA
├── sw.js                   # Service Worker (cache v13, network-first HTML)
├── css/
│   └── estilos.css         # Estilos globales y componentes UI
├── js/
│   ├── app.js              # Lógica principal: secciones, gráficas, reportes
│   ├── auth.js             # Autenticación Firebase (login, registro, logout)
│   ├── firebase-config.js  # Configuración Firebase (generado por CI/CD)
│   ├── firebase-data.js    # DataService: Firestore + localStorage fallback
│   ├── recover-password.js # Flujo de recuperación de contraseña
│   └── reset-password.js   # Confirmación de nueva contraseña (oobCode)
├── data/
│   └── datos.json          # Datos de ejemplo (fallback offline)
├── icons/                  # Iconos PWA (192, 512, maskable)
└── README.md
```

---

## 🛠️ Tecnologías

| Categoría | Tecnología |
|---|---|
| Frontend | HTML5, CSS3, JavaScript ES6+ |
| Gráficas | [Chart.js 4.4](https://www.chartjs.org/) |
| Excel export | [SheetJS (xlsx 0.18)](https://sheetjs.com/) |
| UI | [Bootstrap 5.3](https://getbootstrap.com/) + Bootstrap Icons |
| Backend | Firebase Authentication + Firestore |
| PWA | Service Workers, Web App Manifest |
| CI/CD | GitHub Actions → GitHub Pages |

---

## 🚀 Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/Shadowfiend2504/consumo-servicios-pwa.git
cd consumo-servicios-pwa
```

### 2. Configurar Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com).
2. Habilita **Authentication → Email/Password**.
3. Crea una base de datos **Firestore** en modo producción.
4. En GitHub → **Settings → Secrets and variables → Actions**, crea el secreto:

```
FIREBASE_CONFIG_JSON = {"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}
```

El workflow CI/CD genera `js/firebase-config.js` automáticamente en cada deploy.

### 3. Servir localmente

```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# VS Code → clic derecho en index.html → "Open with Live Server"
```

Navega a `http://localhost:8000`.

---

## 🔐 Seguridad de credenciales

- `firebase-config.js` está en `.gitignore` y **nunca** se sube al repositorio.
- Las credenciales reales se inyectan en tiempo de deploy desde **GitHub Secrets**.
- Usa `firebase-config.example.js` como plantilla para desarrollo local.

---

## 🌐 Despliegue continuo

Cada push a `main` dispara automáticamente GitHub Actions:

1. Genera `js/firebase-config.js` desde el secreto.
2. Copia los archivos a `dist/`.
3. Despliega en **GitHub Pages** (~60–90 segundos).

```bash
git add .
git commit -m "feat: descripción del cambio"
git push origin main
```

---

## 📱 Instalar como PWA

| Plataforma | Pasos |
|---|---|
| **Chrome / Edge (Desktop)** | Ícono de instalación en la barra de direcciones |
| **Chrome (Android)** | Menú ⋮ → Agregar a pantalla de inicio |
| **Safari (iOS)** | Compartir 〒 → Agregar a pantalla de inicio |
| **Firefox (Android)** | Menú → Instalar |

La app también muestra un botón **⬇ Instalar aplicación** en el header cuando el navegador lo soporta.

---

## 🐛 Solución de problemas

| Problema | Solución |
|---|---|
| Firebase no inicializa | Verifica que `firebase-config.js` exista con valores válidos. Abre la consola (F12). |
| PWA no se instala | Necesita HTTPS o `localhost`. No funciona desde `file://`. |
| GitHub Pages no carga | Settings → Pages → verifica que esté habilitado. Espera 1–2 min. |
| Caché desactualizado | En el navegador: `Ctrl+Shift+R`. En PWA: desinstala y reinstala. |
| CSV con caracteres raros | Abre Excel → Datos → Importar → selecciona UTF-8. O usa el botón **Descargar Excel**. |

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.

---

**Última actualización**: 25 de septiembre de 2026
