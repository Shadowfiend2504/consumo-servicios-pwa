# Consumo de Servicios PWA

Una **Progressive Web App (PWA)** moderna para la gestión de autenticación y consumo de servicios, construida con HTML5, CSS3, JavaScript vanilla y Firebase.

## 🚀 Características

- ✅ **Autenticación con Firebase** - Login y registro seguro de usuarios
- ✅ **Progressive Web App** - Funciona offline y se instala como app nativa
- ✅ **Base de datos Firestore** - Almacenamiento en tiempo real
- ✅ **Diseño Responsivo** - Optimizado para mobile, tablet y desktop
- ✅ **Dashboard Interactivo** - Panel de control para usuarios registrados
- ✅ **Gestión de datos JSON** - Soporte para importar/exportar datos

## 📁 Estructura del Proyecto

```
consumo-servicios-pwa/
├── index.html              # Página de inicio
├── registrar.html          # Página de registro de usuarios
├── registro.html           # Página alternativa de registro
├── dashboard.html          # Panel de control (protegido)
├── css/
│   └── estilos.css        # Estilos principales
├── js/
│   ├── app.js             # Lógica principal de la aplicación
│   ├── auth.js            # Funciones de autenticación
│   ├── firebase-config.js # Configuración de Firebase
│   └── firebase-data.js   # Operaciones de base de datos
├── data/
│   └── datos.json         # Datos de ejemplo
└── README.md              # Este archivo
```

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication + Firestore)
- **PWA**: Service Workers, Web App Manifest
- **Hosting**: GitHub Pages

## 📋 Requisitos

- Navegador moderno con soporte para ES6+
- Conexión a Internet (primer acceso)
- Proyecto Firebase activo

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/consumo-servicios-pwa.git
cd consumo-servicios-pwa
```

### 2. Configurar Firebase

1. Copia `js/firebase-config.example.js` a `js/firebase-config.js`
2. Reemplaza los valores con los de tu proyecto Firebase:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
   - `measurementId`

Obtén estas credenciales desde [Firebase Console](https://console.firebase.google.com)

### 3. Servir Localmente

Usa un servidor local (recomendado para PWA):

```bash
# Con Python 3
python -m http.server 8000

# Con Node.js + http-server
npx http-server

# Con VS Code Live Server
# Haz clic derecho en index.html → "Open with Live Server"
```

Accede a `http://localhost:8000`

## 🔐 Credenciales y Seguridad

⚠️ **IMPORTANTE**: Las credenciales de Firebase están protegidas mediante:

- `.gitignore` - `firebase-config.js` no se sube a GitHub
- **GitHub Secrets** - Las credenciales se inyectan en el CI/CD
- **GitHub Actions** - El archivo se genera automáticamente en cada deploy

**Nunca** commits credenciales reales. Usa `firebase-config.example.js` como template.

## 📚 Flujo de Usuarios

```
┌─────────────┐
│   index.html │ ← Página de inicio
└──────┬──────┘
       │
       ├─→ [Registrar] → registrar.html
       │                 ↓
       │            Firebase Auth
       │                 ↓
       └─→ [Login] ─────────────→ dashboard.html
                                  (Protegido)
```

## 🔧 Scripts Principales

### `app.js`
Lógica principal y coordinación de la aplicación.

### `auth.js`
- `registerUser()` - Registro de nuevos usuarios
- `loginUser()` - Autenticación
- `logoutUser()` - Cerrar sesión
- `checkAuth()` - Verificar estado de autenticación

### `firebase-data.js`
- `saveUserData()` - Guardar datos del usuario
- `getUserData()` - Recuperar datos del usuario
- `updateUserData()` - Actualizar información

## 🌐 Despliegue en GitHub Pages

El proyecto se despliega automáticamente con cada push a `main`:

```bash
git add .
git commit -m "Actualizar aplicación"
git push origin main
```

El workflow de GitHub Actions:
1. Genera `firebase-config.js` desde GitHub Secrets
2. Despliega a GitHub Pages
3. Tu PWA estará en `https://tu-usuario.github.io/consumo-servicios-pwa`

## 📱 Instalar como PWA

Desde tu navegador:

1. **Chrome/Edge**: Busca el ícono de instalación en la barra de direcciones
2. **Safari iOS**: Toca Compartir → Agregar a Pantalla de Inicio
3. **Firefox Android**: Presiona el ícono de menú → Instalar

## 🐛 Solución de Problemas

### Firebase no inicializa
- Verifica que `firebase-config.js` existe y tiene valores válidos
- Abre la consola del navegador (F12) para ver errores

### PWA offline no funciona
- Asegúrate que el navegador soporta Service Workers
- Abre en localhost (no en file://)

### GitHub Pages no carga
- Ve a Settings → Pages → Verifica que esté habilitado
- Espera 1-2 minutos después del push

## 📝 Cambios Recomendados

Antes de usar en producción:

- [ ] Reemplaza los datos de ejemplo en `datos.json`
- [ ] Personaliza `estilos.css` con tu branding
- [ ] Agrega reglas de seguridad en Firestore
- [ ] Habilita HTTPS (GitHub Pages lo hace automáticamente)
- [ ] Añade Privacy Policy y Terms of Service

## 📄 Licencia

Este proyecto está bajo licencia MIT. Consulta el archivo LICENSE para más detalles.

## 👤 Autor

Desarrollado como una Progressive Web App moderna.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

¿Preguntas o problemas? Abre un issue en GitHub.

---

**Última actualización**: 3 de abril de 2026
