# 🧪 LAS 3 NUEVAS OPCIONES DE TESTING

## 📋 RESUMEN

Se han implementado 3 nuevas opciones de testing según lo solicitado:

1. **🌍 TEST GLOBAL** - Auditoría completa de todos los módulos con simulación avanzada
2. **📱 TEST APK KIOSK** - Testing específico de la aplicación Android Kiosk
3. **🎯 TEST MÓDULO ESPECÍFICO** - Con selector de módulo y submódulos incluidos

## 🔗 ENDPOINTS DISPONIBLES

### 1️⃣ TEST GLOBAL - Todos los módulos

```bash
POST /api/audit/test/global
```

**Body:**
```json
{
  "parallel": true,
  "autoHeal": true
}
```

**Características:**
- ✅ Simulación completa de todos los 44 módulos del sistema
- ✅ Datos random realistas con Faker.js
- ✅ CRUD completo (Create → Read → Update → Delete)
- ✅ Workflows de negocio específicos
- ✅ Incluye todos los submódulos
- ✅ Velocidad humana realista

**Respuesta:**
```json
{
  "success": true,
  "test_type": "global",
  "message": "TEST GLOBAL iniciado - Simulación completa de todos los módulos y submódulos",
  "execution_id": "uuid-here",
  "status": "running",
  "features": [
    "Datos random con Faker.js",
    "CRUD completo (Create → Read → Update → Delete)",
    "Workflows de negocio específicos",
    "Tests de submódulos incluidos",
    "Simulación de velocidad humana"
  ]
}
```

### 2️⃣ TEST APK KIOSK - Aplicación Android

```bash
POST /api/audit/test/apk-kiosk
```

**Body:**
```json
{
  "autoHeal": true
}
```

**Características:**
- ✅ Testing específico de la aplicación Android Kiosk
- ✅ Verificación de existencia del APK
- ✅ Tests de endpoints móviles
- ✅ Validación de compatibilidad de versiones
- ✅ Tests de estructura Flutter
- ✅ Verificación de conectividad backend/APK

**Respuesta:**
```json
{
  "success": true,
  "test_type": "apk-kiosk",
  "message": "TEST APK KIOSK iniciado - Testing específico de aplicación Android",
  "execution_id": "uuid-here",
  "status": "running",
  "features": [
    "Verificación de existencia del APK",
    "Tests de endpoints móviles",
    "Validación de compatibilidad de versiones",
    "Tests de estructura Flutter",
    "Verificación de conectividad backend/APK"
  ]
}
```

### 3️⃣ TEST MÓDULO ESPECÍFICO - Con selector

#### Listar módulos disponibles:
```bash
GET /api/audit/test/modules
```

**Query params opcionales:**
- `category` - Filtrar por categoría (ej: `?category=core`)

**Respuesta:**
```json
{
  "success": true,
  "total_modules": 44,
  "categories": ["core", "attendance", "biometric", "hr", "enterprise"],
  "modules_by_category": {
    "core": [
      {
        "key": "users",
        "name": "Gestión de Usuarios",
        "category": "core",
        "description": "Sistema completo de gestión de usuarios",
        "version": "2.1.0",
        "has_submodules": true,
        "submodules": ["user-profiles", "user-permissions", "user-auth"]
      }
    ]
  }
}
```

#### Testear módulo específico:
```bash
POST /api/audit/test/module
```

**Body:**
```json
{
  "moduleKey": "users",
  "autoHeal": true
}
```

**Características:**
- ✅ Testing específico del módulo seleccionado
- ✅ Incluye todos los submódulos del módulo
- ✅ Datos random específicos del dominio
- ✅ CRUD completo del módulo
- ✅ Workflows específicos del módulo

**Respuesta:**
```json
{
  "success": true,
  "test_type": "module-specific",
  "module": {
    "key": "users",
    "name": "Gestión de Usuarios",
    "category": "core",
    "description": "Sistema completo de gestión de usuarios"
  },
  "message": "TEST MÓDULO iniciado - Testing completo de \"Gestión de Usuarios\" y sus submódulos",
  "execution_id": "uuid-here",
  "status": "running",
  "features": [
    "Testing específico del módulo seleccionado",
    "Incluye todos los submódulos",
    "Datos random específicos del dominio",
    "CRUD completo del módulo",
    "Workflows específicos del módulo"
  ]
}
```

## 🚀 CÓMO USAR

### Opción 1: Script de Demo Interactivo

```bash
cd C:/Bio/sistema_asistencia_biometrico/backend
node demo-3-opciones-testing.js
```

El script ofrece un menú interactivo para probar las 3 opciones.

### Opción 2: cURL Commands

#### Test Global:
```bash
curl -X POST http://localhost:9998/api/audit/test/global \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parallel": true, "autoHeal": true}'
```

#### Test APK Kiosk:
```bash
curl -X POST http://localhost:9998/api/audit/test/apk-kiosk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"autoHeal": true}'
```

#### Listar módulos:
```bash
curl http://localhost:9998/api/audit/test/modules \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Test módulo específico:
```bash
curl -X POST http://localhost:9998/api/audit/test/module \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"moduleKey": "users", "autoHeal": true}'
```

### Opción 3: Desde JavaScript

```javascript
const BASE_URL = 'http://localhost:9998';
const TOKEN = 'your-jwt-token';

// Test Global
const response = await fetch(`${BASE_URL}/api/audit/test/global`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    parallel: true,
    autoHeal: true
  })
});

const result = await response.json();
console.log('Test Global iniciado:', result.execution_id);
```

## 📊 MONITOREO EN TIEMPO REAL

Todos los tests se ejecutan en background y envían updates en tiempo real vía WebSocket:

```javascript
// Conectar al WebSocket para recibir updates
const socket = io('http://localhost:9998');

// Subscirse a updates del auditor
socket.emit('join', 'auditor-updates');

// Escuchar progreso
socket.on('test-progress', (data) => {
  console.log(`${data.phase}: ${data.message}`);
});

// Escuchar errores
socket.on('error-detected', (error) => {
  console.log(`Error detectado: ${error.error}`);
});

// Escuchar resumen final
socket.on('audit-summary', (summary) => {
  console.log(`Completado: ${summary.passed}/${summary.total} tests passed`);
});
```

## 🔍 VERIFICAR ESTADO Y RESULTADOS

### Estado actual:
```bash
GET /api/audit/status
```

### Historial de ejecuciones:
```bash
GET /api/audit/executions
```

### Detalle de ejecución específica:
```bash
GET /api/audit/executions/{execution_id}
```

## 📋 MÓDULOS DISPONIBLES

El sistema incluye **44 módulos** en **5 categorías**:

### 🔹 CORE (Base del sistema)
- `users` - Gestión de Usuarios
- `attendance` - Control de Asistencia
- `dashboard` - Dashboard Principal
- `settings` - Configuración del Sistema
- `departments` - Departamentos
- `shifts` - Gestión de Turnos

### 🔹 BIOMETRIC (Tecnologías biométricas)
- `biometric` - Biometría Facial Básica
- `biometric-simple` - Biometría Simple
- `real-biometric-enterprise` - Biometría Enterprise
- `professional-biometric-registration` - Registro Profesional
- `biometric-consent` - Consentimientos
- `evaluacion-biometrica` - Evaluación
- `emotional-analysis` - Análisis Emocional

### 🔹 HR (Recursos Humanos)
- `medical` - Gestión Médica
- `vacation` - Gestión de Vacaciones
- `legal` - Gestión Legal
- `sanctions-management` - Gestión de Sanciones
- `training-management` - Capacitaciones
- `psychological-assessment` - Evaluación Psicológica
- `payroll-liquidation` - Liquidación de Sueldos

### 🔹 ENTERPRISE (Funciones empresariales)
- `notifications` - Notificaciones Básicas
- `notifications-complete` - Notificaciones V2.0
- `notifications-enterprise` - Notificaciones V3.0
- `compliance-dashboard` - Dashboard de Cumplimiento
- `sla-tracking` - Seguimiento SLA
- `resource-center` - Centro de Recursos
- `audit-reports` - Reportes de Auditoría
- `proactive-notifications` - Notificaciones Proactivas
- `visitors` - Gestión de Visitantes
- `access-control` - Control de Acceso
- `document-management` - Gestión Documental

### 🔹 SPECIALIZED (Funciones especializadas)
- `kiosks-professional` - Kioscos Profesionales
- `art-management` - Gestión ART
- `job-postings` - Bolsa de Trabajo
- `licensing-management` - Gestión de Licencias
- `facturacion` - Facturación
- `clientes` - Gestión de Clientes
- `plantillas-fiscales` - Plantillas Fiscales
- `terms-conditions` - Términos y Condiciones
- `auditor-dashboard` - Dashboard del Auditor

## 🎯 CARACTERÍSTICAS ÚNICAS

### ✅ Simulación Humana Realista
- Velocidad de tipeo: 50-150ms por carácter
- Pausas entre acciones: 0.5-3 segundos
- Comportamiento de navegación natural

### ✅ Datos Random Inteligentes
- Nombres y apellidos españoles realistas
- Emails corporativos coherentes
- Teléfonos con formato local
- Fechas de nacimiento lógicas
- Horarios de trabajo realistas

### ✅ CRUD Completo Verificado
- **Create**: Llenar formulario → Guardar → Verificar en lista
- **Read**: Confirmar datos mostrados correctamente
- **Update**: Editar → Modificar → Guardar → Reabrir → Verificar cambios
- **Delete**: Eliminar → Confirmar → Verificar desaparición
- **Persistence**: F5 + reabrir modales para verificar persistencia

### ✅ Workflows de Negocio Específicos
- **Employee Onboarding**: Usuario → Departamento → Horarios → Alta
- **Notification Workflows**: Crear → Asignar → Publicar → Verificar
- **Training Workflows**: Crear → Inscribir → Simular → Certificar

### ✅ Submódulos Incluidos
Cuando testes un módulo principal, automáticamente incluye:
- Todos sus submódulos
- Dependencias relacionadas
- Workflows inter-módulos
- Validaciones cruzadas

## 🚨 IMPORTANTE

- **Autenticación requerida**: Solo usuarios admin pueden ejecutar tests
- **Ejecución en background**: Los tests se ejecutan de forma asíncrona
- **WebSocket updates**: Progreso en tiempo real vía Socket.IO
- **Auto-healing**: Corrección automática de errores detectados
- **Respeta multi-tenant**: Tests limitados a la empresa del usuario

## 🔧 TROUBLESHOOTING

### Error: "Solo administradores pueden acceder"
- Verificar que el usuario tenga `role: "admin"`
- Comprobar token JWT válido

### Error: "Módulo no encontrado"
- Usar `GET /api/audit/test/modules` para ver opciones válidas
- Verificar que el `moduleKey` sea exacto

### Error: "Auditor ya ejecutándose"
- Usar `GET /api/audit/status` para verificar estado
- Esperar a que termine la ejecución actual

### Script demo no funciona
- Verificar que el servidor esté corriendo en puerto 9998
- Instalar dependencias: `npm install node-fetch`
- Verificar token JWT válido en el script