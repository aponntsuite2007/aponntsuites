# ARQUITECTURA MODULAR - SISTEMA MÉDICO ENTERPRISE
## Diseño Plug & Play con Event-Driven Architecture

**Fecha:** 1 de Enero de 2026
**Versión:** 2.0
**Autor:** Sistema de Asistencia Biométrico - Medical Evolution

---

## 🎯 PRINCIPIOS DE DISEÑO

### 1. **Modularidad Plug & Play**
Cada módulo es **independiente** y puede funcionar solo o integrado:
```
CORE MODULE (siempre activo):
- Medical Dashboard Professional (existente)
- HSE Management (existente)
- Legal Dashboard (existente)
- Associate Marketplace (existente)

PREMIUM MODULES (opcional - plug & play):
- Telemedicine
- Electronic Prescriptions
- Medical Epidemiology
- Vaccination Management
- Laboratory Integration
- Medical Training/Certifications
- Return to Work Protocol
- ART/Incidents Management

INTEGRATION MODULES (conectores):
- Mobile API Gateway
- Analytics Engine
- Event Bus
- Notification System
```

### 2. **Dependency Injection**
Los módulos **NO importan directamente** otros módulos. Usan **inyección de dependencias**:
```javascript
// ❌ MAL - Acoplamiento fuerte
const TelemedicineService = require('./TelemedicineService');
telemedicineService.createAppointment(...);

// ✅ BIEN - Inyección de dependencias
class MedicalDashboard {
  constructor(dependencies = {}) {
    this.telemedicineService = dependencies.telemedicineService || null;
    this.prescriptionService = dependencies.prescriptionService || null;
  }

  async createAppointment(data) {
    if (this.telemedicineService) {
      // Telemedicina activa → usar videollamada
      return await this.telemedicineService.createVideoAppointment(data);
    } else {
      // Telemedicina inactiva → cita presencial tradicional
      return await this.createInPersonAppointment(data);
    }
  }
}
```

### 3. **Event-Driven Communication**
Módulos se comunican via **eventos**, no llamadas directas:
```javascript
// Módulo Medical crea diagnóstico
EventBus.emit('medical:diagnosis:created', {
  employeeId: 123,
  diagnosis: 'Hipertensión arterial',
  restrictions: ['sin esfuerzo físico']
});

// Módulo HSE escucha y valida EPP
EventBus.on('medical:diagnosis:created', (data) => {
  if (data.restrictions.includes('sin esfuerzo físico')) {
    HSEService.validateEmployeePositionCompatibility(data.employeeId);
  }
});

// Módulo Legal escucha y crea expediente si es grave
EventBus.on('medical:diagnosis:created', (data) => {
  if (data.severity === 'grave') {
    LegalService.createPreventiveCase(data.employeeId);
  }
});
```

### 4. **Graceful Degradation**
Si módulo premium no está, sistema **degrada elegantemente**:
```javascript
// Ejemplo: Recetas electrónicas
async function prescribeMedication(data) {
  if (ModuleRegistry.isActive('electronic-prescriptions')) {
    // Premium activo → Receta electrónica con QR, firma digital, etc.
    return await ElectronicPrescriptionService.create(data);
  } else {
    // Premium inactivo → Receta PDF básica (sin firma digital)
    return await BasicPrescriptionService.createPDF(data);
  }
}
```

### 5. **Feature Flags**
Cada feature puede activarse/desactivarse sin desplegar código:
```javascript
{
  "telemedicine": { "enabled": true, "plan": "premium" },
  "electronic_prescriptions": { "enabled": true, "plan": "premium" },
  "epidemiology": { "enabled": false, "plan": "enterprise" },
  "wearables": { "enabled": false, "plan": "enterprise" }
}
```

---

## 🏗️ ARQUITECTURA DE CAPAS

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│  (Frontend: panel-empresa.html, panel-asociados.html, APK)      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                       API GATEWAY LAYER                          │
│           (REST API + Mobile API + WebSocket)                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    MODULE ORCHESTRATOR                           │
│        (Module Registry + Dependency Manager + Event Bus)        │
└──────┬────────────┬────────────┬────────────┬───────────────────┘
       │            │            │            │
┌──────▼──────┐ ┌──▼──────┐ ┌──▼──────┐ ┌──▼──────┐
│ CORE        │ │ PREMIUM │ │ PREMIUM │ │ PREMIUM │
│ MODULES     │ │ MODULE  │ │ MODULE  │ │ MODULE  │
│             │ │         │ │         │ │         │
│ - Medical   │ │ Tele    │ │ e-Presc │ │ Epidem  │
│ - HSE       │ │ medicine│ │ riptions│ │ iology  │
│ - Legal     │ │         │ │         │ │         │
│ - Mkplace   │ │         │ │         │ │         │
└──────┬──────┘ └──┬──────┘ └──┬──────┘ └──┬──────┘
       │           │           │           │
       └───────────┴───────────┴───────────┘
                      │
┌─────────────────────▼─────────────────────────────────────────┐
│                    INTEGRATION LAYER                           │
│  (Analytics Engine, Notification System, Mobile Sync)          │
└─────────────────────┬─────────────────────────────────────────┘
                      │
┌─────────────────────▼─────────────────────────────────────────┐
│                     DATA LAYER                                 │
│         (PostgreSQL + Redis Cache + DMS Documents)             │
└───────────────────────────────────────────────────────────────┘
```

---

## 📦 MODULE REGISTRY (Auto-Discovery)

### Archivo: `src/modules/ModuleRegistry.js`

```javascript
/**
 * ModuleRegistry - Auto-descubrimiento de módulos
 *
 * Cada módulo se auto-registra al iniciar el servidor.
 * El registry mantiene estado de qué módulos están activos.
 */

class ModuleRegistry {
  constructor() {
    this.modules = new Map();
    this.dependencies = new Map();
    this.eventBus = require('./EventBus');
  }

  /**
   * Registrar módulo
   *
   * @param {string} moduleKey - Identificador único (ej: 'telemedicine')
   * @param {object} config - Configuración del módulo
   */
  register(moduleKey, config) {
    this.modules.set(moduleKey, {
      key: moduleKey,
      name: config.name,
      version: config.version,
      type: config.type, // 'core' | 'premium' | 'enterprise'
      dependencies: config.dependencies || [],
      provides: config.provides || [],
      service: config.service,
      routes: config.routes,
      models: config.models,
      enabled: config.enabled !== false,
      plan: config.plan // 'basic' | 'premium' | 'enterprise'
    });

    // Registrar dependencias
    if (config.dependencies && config.dependencies.length > 0) {
      this.dependencies.set(moduleKey, config.dependencies);
    }

    console.log(`✅ [MODULE REGISTRY] Módulo registrado: ${moduleKey} (${config.type})`);
  }

  /**
   * Verificar si módulo está activo
   */
  isActive(moduleKey) {
    const module = this.modules.get(moduleKey);
    if (!module) return false;

    // Módulos core siempre activos
    if (module.type === 'core') return true;

    // Módulos premium/enterprise verificar si empresa lo contrató
    return module.enabled;
  }

  /**
   * Verificar si empresa tiene acceso al módulo
   */
  async hasAccess(companyId, moduleKey) {
    const module = this.modules.get(moduleKey);
    if (!module) return false;

    // Core siempre disponible
    if (module.type === 'core') return true;

    // Verificar plan de empresa
    const company = await this.getCompanyPlan(companyId);

    if (module.plan === 'premium' && ['premium', 'enterprise'].includes(company.plan)) {
      return true;
    }

    if (module.plan === 'enterprise' && company.plan === 'enterprise') {
      return true;
    }

    return false;
  }

  /**
   * Obtener servicio de módulo (si está activo)
   */
  getService(moduleKey) {
    if (!this.isActive(moduleKey)) return null;

    const module = this.modules.get(moduleKey);
    return module ? module.service : null;
  }

  /**
   * Verificar dependencias de módulo
   *
   * @returns {boolean} true si todas las dependencias están activas
   */
  checkDependencies(moduleKey) {
    const deps = this.dependencies.get(moduleKey);
    if (!deps || deps.length === 0) return true;

    return deps.every(dep => this.isActive(dep));
  }

  /**
   * Listar módulos activos
   */
  getActiveModules() {
    return Array.from(this.modules.values()).filter(m => m.enabled);
  }

  /**
   * Obtener plan de empresa desde BD
   */
  async getCompanyPlan(companyId) {
    const Company = require('../models/Company');
    const company = await Company.findByPk(companyId, {
      attributes: ['id', 'plan', 'active_modules']
    });

    return {
      plan: company.plan || 'basic', // 'basic', 'premium', 'enterprise'
      activeModules: company.active_modules || []
    };
  }
}

module.exports = new ModuleRegistry();
```

---

## 🚀 EVENT BUS (Comunicación Desacoplada)

### Archivo: `src/modules/EventBus.js`

```javascript
/**
 * EventBus - Sistema de eventos para comunicación entre módulos
 *
 * Los módulos NO se llaman directamente.
 * Emiten eventos y escuchan eventos de otros módulos.
 */

const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Permitir muchos listeners
    this.eventLog = []; // Log de eventos (debugging)
  }

  /**
   * Emitir evento con metadata
   */
  emitWithMetadata(eventName, data) {
    const metadata = {
      timestamp: new Date(),
      eventName,
      data,
      source: this.getCurrentModule() // Detectar módulo emisor
    };

    // Log
    this.eventLog.push(metadata);
    if (this.eventLog.length > 1000) {
      this.eventLog.shift(); // Mantener últimos 1000 eventos
    }

    // Emitir
    console.log(`📡 [EVENT BUS] ${eventName}`, data);
    this.emit(eventName, data);
  }

  /**
   * Registrar listener con auto-documentación
   */
  registerListener(eventName, moduleKey, handler) {
    console.log(`👂 [EVENT BUS] ${moduleKey} escuchando: ${eventName}`);
    this.on(eventName, handler);
  }

  /**
   * Obtener módulo actual (desde stack trace)
   */
  getCurrentModule() {
    const stack = new Error().stack;
    const match = stack.match(/at\s+(\w+Module)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Obtener log de eventos (debugging)
   */
  getEventLog(limit = 100) {
    return this.eventLog.slice(-limit);
  }
}

module.exports = new EventBus();
```

---

## 🔌 DEPENDENCY MANAGER (Inyección Inteligente)

### Archivo: `src/modules/DependencyManager.js`

```javascript
/**
 * DependencyManager - Inyecta servicios de módulos activos
 *
 * Resuelve dependencias automáticamente.
 * Si módulo no está activo, inyecta null o servicio fallback.
 */

const ModuleRegistry = require('./ModuleRegistry');

class DependencyManager {
  /**
   * Inyectar dependencias en servicio
   *
   * @param {Array<string>} dependencies - Lista de módulos requeridos
   * @returns {object} Objeto con servicios inyectados
   */
  inject(dependencies = []) {
    const injected = {};

    dependencies.forEach(dep => {
      const service = ModuleRegistry.getService(dep);

      if (service) {
        injected[dep] = service;
        console.log(`✅ [DEPENDENCY] Inyectado: ${dep}`);
      } else {
        injected[dep] = null;
        console.log(`⚠️  [DEPENDENCY] No disponible: ${dep} (módulo inactivo o no instalado)`);
      }
    });

    return injected;
  }

  /**
   * Crear servicio con dependencias opcionales
   *
   * @param {Function} ServiceClass - Clase del servicio
   * @param {Array<string>} dependencies - Dependencias opcionales
   */
  createService(ServiceClass, dependencies = []) {
    const injectedDeps = this.inject(dependencies);
    return new ServiceClass(injectedDeps);
  }

  /**
   * Wrapper para llamadas condicionales
   *
   * Permite llamar servicios que pueden no existir
   */
  async safeCall(moduleKey, methodName, ...args) {
    const service = ModuleRegistry.getService(moduleKey);

    if (service && typeof service[methodName] === 'function') {
      return await service[methodName](...args);
    } else {
      console.log(`⚠️  [SAFE CALL] ${moduleKey}.${methodName}() no disponible`);
      return null;
    }
  }
}

module.exports = new DependencyManager();
```

---

## 📋 ESTRUCTURA DE MÓDULOS

Cada módulo tiene esta estructura estándar:

```
src/modules/telemedicine/
├── index.js                    # Entry point + auto-registro
├── TelemedicineService.js      # Lógica de negocio
├── TelemedicineRoutes.js       # API REST
├── models/
│   ├── VideoAppointment.js     # Modelo Sequelize
│   └── VideoSession.js
├── config/
│   └── module.config.json      # Configuración del módulo
├── events/
│   ├── listeners.js            # Escucha eventos de otros módulos
│   └── emitters.js             # Emite eventos propios
└── README.md                   # Documentación del módulo
```

### Ejemplo: `src/modules/telemedicine/index.js`

```javascript
/**
 * Telemedicine Module - Entry Point
 *
 * Auto-registro en ModuleRegistry
 */

const ModuleRegistry = require('../ModuleRegistry');
const TelemedicineService = require('./TelemedicineService');
const TelemedicineRoutes = require('./TelemedicineRoutes');
const TelemedicineListeners = require('./events/listeners');

// Configuración del módulo
const moduleConfig = {
  name: 'Telemedicine',
  version: '1.0.0',
  type: 'premium',
  plan: 'premium',

  // Dependencias (opcionales)
  dependencies: [
    'medical-dashboard', // Necesita historial clínico
    'associate-marketplace' // Necesita médicos
  ],

  // Qué proporciona a otros módulos
  provides: [
    'video-appointments',
    'remote-consultations',
    'digital-prescriptions'
  ],

  // Servicios
  service: new TelemedicineService(),

  // Rutas API
  routes: TelemedicineRoutes,

  // Modelos
  models: [
    require('./models/VideoAppointment'),
    require('./models/VideoSession')
  ],

  // Habilitado por defecto
  enabled: true
};

// Auto-registro
ModuleRegistry.register('telemedicine', moduleConfig);

// Registrar listeners de eventos
TelemedicineListeners.init();

module.exports = {
  service: moduleConfig.service,
  routes: moduleConfig.routes
};
```

---

## 🎨 EJEMPLO DE INTEGRACIÓN: RECETAS ELECTRÓNICAS

### Escenario: Médico prescribe medicamento

```javascript
// ====================================
// MÓDULO MEDICAL (core)
// ====================================

class MedicalDashboardService {
  constructor(dependencies = {}) {
    // Inyectar dependencias opcionales
    this.ePrescriptionService = dependencies['electronic-prescriptions'] || null;
    this.eventBus = require('./EventBus');
  }

  async prescribeMedication(employeeId, medicationData) {
    // 1. Validar datos
    const employee = await this.getEmployee(employeeId);
    const medicalCase = await this.getMedicalCase(medicationData.caseId);

    // 2. Crear prescripción
    let prescription;

    if (this.ePrescriptionService) {
      // ✅ Módulo premium activo → Receta electrónica
      prescription = await this.ePrescriptionService.create({
        employeeId,
        medication: medicationData.medication,
        dosage: medicationData.dosage,
        duration: medicationData.duration,
        doctorId: medicationData.doctorId,
        companyId: employee.company_id,
        electronicSignature: true,
        qrCode: true
      });

      console.log('✅ Receta electrónica creada con firma digital');
    } else {
      // ⚠️ Módulo premium inactivo → Receta PDF básica
      prescription = await this.createBasicPrescriptionPDF({
        employeeId,
        medication: medicationData.medication,
        dosage: medicationData.dosage,
        duration: medicationData.duration
      });

      console.log('⚠️ Receta PDF básica creada (sin firma digital)');
    }

    // 3. Emitir evento (otros módulos pueden escuchar)
    this.eventBus.emitWithMetadata('medical:prescription:created', {
      prescriptionId: prescription.id,
      employeeId,
      medication: medicationData.medication,
      type: this.ePrescriptionService ? 'electronic' : 'basic'
    });

    return prescription;
  }
}

// ====================================
// MÓDULO ELECTRONIC PRESCRIPTIONS (premium)
// ====================================

class ElectronicPrescriptionService {
  async create(data) {
    const country = await this.getEmployeeCountry(data.employeeId);

    // Normativas por país
    const regulations = {
      'AR': this.createArgentinaPrescription,
      'BR': this.createBrazilPrescription,
      'MX': this.createMexicoPrescription,
      'US': this.createUSAPrescription
    };

    const createFn = regulations[country] || this.createGenericPrescription;

    return await createFn.call(this, data);
  }

  async createArgentinaPrescription(data) {
    // Normativa Argentina: Resolución 1560/2011 (receta electrónica)
    const prescription = await ElectronicPrescription.create({
      employee_id: data.employeeId,
      doctor_id: data.doctorId,
      company_id: data.companyId,
      medication: data.medication,
      dosage: data.dosage,
      duration: data.duration,

      // Específico Argentina
      country: 'AR',
      regulation: 'Resolución 1560/2011',
      prescription_number: await this.generateARPrescriptionNumber(),
      digital_signature: await this.signWithAFIP(data), // Firma AFIP
      qr_code: await this.generateQRCode(data),
      barcode: await this.generateBarcode(data),

      // Validez
      valid_from: new Date(),
      valid_until: this.calculateValidityAR(data.medication),

      status: 'active'
    });

    // Registrar en ANMAT (si es controlado)
    if (this.isControlledMedication(data.medication)) {
      await this.registerInANMAT(prescription);
    }

    return prescription;
  }

  async createBrazilPrescription(data) {
    // Normativa Brasil: Portaria 344/1998 (controle especial)
    const prescription = await ElectronicPrescription.create({
      ...data,
      country: 'BR',
      regulation: 'Portaria 344/1998',
      prescription_number: await this.generateBRPrescriptionNumber(),
      digital_signature: await this.signWithICP(data), // ICP-Brasil
      notification_notificacao: this.isNotificacaoRequired(data.medication),
      anvisa_registration: await this.registerInANVISA(data)
    });

    return prescription;
  }

  async createMexicoPrescription(data) {
    // Normativa México: NOM-072-SSA1-2012
    const prescription = await ElectronicPrescription.create({
      ...data,
      country: 'MX',
      regulation: 'NOM-072-SSA1-2012',
      prescription_number: await this.generateMXPrescriptionNumber(),
      digital_signature: await this.signWithFIEL(data), // FIEL (SAT)
      cofepris_registration: this.requiresCOFEPRIS(data.medication)
    });

    return prescription;
  }

  async generateQRCode(data) {
    const QRCode = require('qrcode');

    const qrData = {
      prescriptionId: data.prescriptionId || 'pending',
      employee: data.employeeId,
      doctor: data.doctorId,
      medication: data.medication,
      timestamp: new Date().toISOString(),
      signature: 'digital-signature-hash'
    };

    const qrImage = await QRCode.toDataURL(JSON.stringify(qrData));
    return qrImage;
  }
}

// ====================================
// LISTENER EN MÓDULO NOTIFICATIONS
// ====================================

EventBus.registerListener('medical:prescription:created', 'notifications', async (data) => {
  // Notificar a empleado que tiene nueva receta
  await NotificationService.create({
    user_id: data.employeeId,
    type: 'prescription',
    title: 'Nueva receta médica',
    message: `Tienes una nueva prescripción de ${data.medication}`,
    action: `/medical/prescriptions/${data.prescriptionId}`
  });

  // Si es receta electrónica, también enviar por email
  if (data.type === 'electronic') {
    await EmailService.sendPrescription(data.employeeId, data.prescriptionId);
  }
});
```

---

## 📱 INTEGRACIÓN CON APK MÓVIL

### API Gateway para Mobile

```javascript
// src/routes/mobile/MobileAPIGateway.js

const express = require('express');
const router = express.Router();
const ModuleRegistry = require('../../modules/ModuleRegistry');

/**
 * GET /api/mobile/v1/modules
 *
 * Lista módulos disponibles para empresa (según plan)
 */
router.get('/modules', async (req, res) => {
  const companyId = req.user.company_id;
  const allModules = ModuleRegistry.getActiveModules();

  // Filtrar módulos según plan de empresa
  const availableModules = [];

  for (const module of allModules) {
    const hasAccess = await ModuleRegistry.hasAccess(companyId, module.key);

    if (hasAccess) {
      availableModules.push({
        key: module.key,
        name: module.name,
        version: module.version,
        type: module.type,
        icon: module.icon || 'default',
        features: module.provides
      });
    }
  }

  res.json({
    success: true,
    modules: availableModules
  });
});

/**
 * GET /api/mobile/v1/medical/prescriptions/:employeeId
 *
 * Obtener recetas de empleado (electrónicas o básicas)
 */
router.get('/medical/prescriptions/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  const ePrescriptionService = ModuleRegistry.getService('electronic-prescriptions');

  let prescriptions;

  if (ePrescriptionService) {
    // Recetas electrónicas con QR
    prescriptions = await ePrescriptionService.getByEmployee(employeeId);
  } else {
    // Recetas básicas (fallback)
    const MedicalPrescription = require('../../models/MedicalPrescription');
    prescriptions = await MedicalPrescription.findAll({
      where: { employee_id: employeeId }
    });
  }

  res.json({
    success: true,
    type: ePrescriptionService ? 'electronic' : 'basic',
    prescriptions
  });
});

/**
 * POST /api/mobile/v1/telemedicine/appointments
 *
 * Agendar cita de telemedicina (si módulo activo)
 */
router.post('/telemedicine/appointments', async (req, res) => {
  const telemedicineService = ModuleRegistry.getService('telemedicine');

  if (!telemedicineService) {
    return res.status(404).json({
      success: false,
      error: 'Telemedicina no disponible',
      message: 'Tu empresa no tiene contratado el módulo de Telemedicina',
      upgrade_url: '/pricing/telemedicine'
    });
  }

  const appointment = await telemedicineService.createAppointment(req.body);

  res.json({
    success: true,
    appointment,
    video_url: appointment.video_url // Jitsi Meet URL
  });
});

module.exports = router;
```

---

## 🎨 DARK THEME IMPLEMENTATION

### CSS Variables System

```css
/* public/css/themes.css */

:root {
  /* Light Theme (default) */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #e9ecef;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --border-color: #dee2e6;
  --accent-primary: #0066cc;
  --accent-secondary: #0052a3;

  /* Cards & Containers */
  --card-bg: #ffffff;
  --card-shadow: 0 2px 8px rgba(0,0,0,0.1);

  /* Tables */
  --table-bg: #ffffff;
  --table-hover: #f8f9fa;
  --table-border: #dee2e6;

  /* Forms */
  --input-bg: #ffffff;
  --input-border: #ced4da;
  --input-focus: #0066cc;

  /* Medical Specific */
  --medical-success: #28a745;
  --medical-warning: #ffc107;
  --medical-danger: #dc3545;
  --medical-info: #17a2b8;
}

[data-theme="dark"] {
  /* Dark Theme */
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --bg-tertiary: #3d3d3d;
  --text-primary: #e9ecef;
  --text-secondary: #adb5bd;
  --border-color: #495057;
  --accent-primary: #4da3ff;
  --accent-secondary: #1a8cff;

  /* Cards & Containers */
  --card-bg: #2d2d2d;
  --card-shadow: 0 2px 8px rgba(0,0,0,0.3);

  /* Tables */
  --table-bg: #2d2d2d;
  --table-hover: #3d3d3d;
  --table-border: #495057;

  /* Forms */
  --input-bg: #3d3d3d;
  --input-border: #495057;
  --input-focus: #4da3ff;

  /* Medical Specific */
  --medical-success: #4ade80;
  --medical-warning: #fbbf24;
  --medical-danger: #f87171;
  --medical-info: #38bdf8;
}

/* Apply variables to all elements */
body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.card, .modal-content, .dropdown-menu {
  background-color: var(--card-bg);
  color: var(--text-primary);
  box-shadow: var(--card-shadow);
}

table {
  background-color: var(--table-bg);
  border-color: var(--table-border);
}

table tr:hover {
  background-color: var(--table-hover);
}

input, select, textarea {
  background-color: var(--input-bg);
  color: var(--text-primary);
  border-color: var(--input-border);
}

input:focus, select:focus, textarea:focus {
  border-color: var(--input-focus);
}

.btn-primary {
  background-color: var(--accent-primary);
}

.btn-primary:hover {
  background-color: var(--accent-secondary);
}

/* Medical status colors */
.status-apto {
  background-color: var(--medical-success);
}

.status-no-apto {
  background-color: var(--medical-danger);
}

.status-pendiente {
  background-color: var(--medical-warning);
}
```

### Theme Toggle Component

```javascript
// public/js/core/ThemeManager.js

class ThemeManager {
  constructor() {
    this.currentTheme = this.getSavedTheme() || 'light';
    this.init();
  }

  init() {
    // Aplicar tema guardado
    this.applyTheme(this.currentTheme);

    // Crear toggle button
    this.createToggleButton();
  }

  getSavedTheme() {
    return localStorage.getItem('theme') ||
           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    localStorage.setItem('theme', theme);

    // Actualizar icono del toggle
    this.updateToggleIcon();
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);

    // Emitir evento para que otros componentes reaccionen
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { theme: newTheme }
    }));
  }

  createToggleButton() {
    const button = document.createElement('button');
    button.id = 'theme-toggle';
    button.className = 'btn btn-sm btn-outline-secondary theme-toggle';
    button.innerHTML = `
      <i class="fas fa-moon" id="theme-icon"></i>
      <span class="ms-2" id="theme-label">Modo Oscuro</span>
    `;
    button.onclick = () => this.toggleTheme();

    // Insertar en navbar
    const navbar = document.querySelector('.navbar-nav');
    if (navbar) {
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.appendChild(button);
      navbar.appendChild(li);
    }
  }

  updateToggleIcon() {
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');

    if (this.currentTheme === 'dark') {
      icon.className = 'fas fa-sun';
      label.textContent = 'Modo Claro';
    } else {
      icon.className = 'fas fa-moon';
      label.textContent = 'Modo Oscuro';
    }
  }
}

// Auto-inicializar
document.addEventListener('DOMContentLoaded', () => {
  window.themeManager = new ThemeManager();
});
```

---

## 📊 ADVANCED ANALYTICS ENGINE

### Archivo: `src/modules/analytics/AnalyticsEngine.js`

```javascript
/**
 * AdvancedAnalyticsEngine - Estadísticas multi-módulo
 *
 * Agrega datos de todos los módulos activos y genera insights.
 */

class AdvancedAnalyticsEngine {
  constructor() {
    this.moduleRegistry = require('../ModuleRegistry');
    this.eventBus = require('../EventBus');
  }

  /**
   * Dashboard médico 360 con estadísticas avanzadas
   */
  async getMedicalDashboard(companyId, filters = {}) {
    const stats = {
      overview: await this.getOverviewStats(companyId),
      examinations: await this.getExaminationStats(companyId, filters),
      incidents: await this.getIncidentStats(companyId, filters),
      telemedicine: await this.getTelemedicineStats(companyId, filters),
      prescriptions: await this.getPrescriptionStats(companyId, filters),
      epidemiology: await this.getEpidemiologyStats(companyId, filters),
      trends: await this.getTrendAnalysis(companyId, filters),
      predictions: await this.getPredictiveAnalytics(companyId)
    };

    return stats;
  }

  async getOverviewStats(companyId) {
    return {
      total_employees: await this.countEmployees(companyId),
      active_medical_cases: await this.countActiveCases(companyId),
      exams_this_month: await this.countExamsThisMonth(companyId),
      exams_expiring_soon: await this.countExamsExpiringSoon(companyId),
      incidents_this_month: await this.countIncidentsThisMonth(companyId),
      telemedicine_sessions: await this.countTelemedicineSessions(companyId),
      average_response_time: await this.calculateAvgResponseTime(companyId)
    };
  }

  async getExaminationStats(companyId, filters) {
    return {
      by_type: await this.groupExamsByType(companyId, filters),
      by_result: await this.groupExamsByResult(companyId, filters),
      by_department: await this.groupExamsByDepartment(companyId, filters),
      expiring_30_days: await this.getExamsExpiring(companyId, 30),
      expiring_7_days: await this.getExamsExpiring(companyId, 7),
      overdue: await this.getOverdueExams(companyId),
      completion_rate: await this.calculateExamCompletionRate(companyId)
    };
  }

  async getIncidentStats(companyId, filters) {
    // Solo si módulo ART está activo
    const artService = this.moduleRegistry.getService('art-incidents');
    if (!artService) return null;

    return {
      total_incidents: await artService.countIncidents(companyId, filters),
      by_severity: await artService.groupBySeverity(companyId, filters),
      by_type: await artService.groupByType(companyId, filters),
      by_department: await artService.groupByDepartment(companyId, filters),
      avg_resolution_time: await artService.calculateAvgResolutionTime(companyId),
      costs: await artService.calculateIncidentCosts(companyId, filters),
      frequency_rate: await artService.calculateFrequencyRate(companyId)
    };
  }

  async getTelemedicineStats(companyId, filters) {
    // Solo si módulo Telemedicina está activo
    const teleService = this.moduleRegistry.getService('telemedicine');
    if (!teleService) return null;

    return {
      total_sessions: await teleService.countSessions(companyId, filters),
      avg_duration: await teleService.calculateAvgDuration(companyId),
      satisfaction_score: await teleService.calculateSatisfaction(companyId),
      top_reasons: await teleService.getTopConsultationReasons(companyId),
      by_specialty: await teleService.groupBySpecialty(companyId, filters)
    };
  }

  async getPrescriptionStats(companyId, filters) {
    const ePrescService = this.moduleRegistry.getService('electronic-prescriptions');

    if (ePrescService) {
      // Recetas electrónicas (más datos)
      return {
        total_prescriptions: await ePrescService.count(companyId, filters),
        by_medication: await ePrescService.groupByMedication(companyId),
        controlled_substances: await ePrescService.countControlled(companyId),
        digital_signatures: await ePrescService.countSigned(companyId),
        pharmacy_dispensed: await ePrescService.countDispensed(companyId)
      };
    } else {
      // Recetas básicas (datos limitados)
      return {
        total_prescriptions: await this.countBasicPrescriptions(companyId),
        by_medication: await this.groupBasicPrescriptionsByMed(companyId)
      };
    }
  }

  async getEpidemiologyStats(companyId, filters) {
    // Solo si módulo Epidemiología está activo
    const epidemService = this.moduleRegistry.getService('epidemiology');
    if (!epidemService) return null;

    return {
      top_diagnoses: await epidemService.getTopDiagnoses(companyId, filters),
      disease_trends: await epidemService.getDiseaseTrends(companyId, filters),
      outbreak_alerts: await epidemService.detectOutbreaks(companyId),
      absenteeism_by_illness: await epidemService.groupAbsenteeismByIllness(companyId),
      seasonal_patterns: await epidemService.detectSeasonalPatterns(companyId)
    };
  }

  async getTrendAnalysis(companyId, filters) {
    // Análisis de tendencias temporales
    const periods = ['daily', 'weekly', 'monthly', 'yearly'];
    const trends = {};

    for (const period of periods) {
      trends[period] = {
        exams: await this.calculateExamTrend(companyId, period),
        incidents: await this.calculateIncidentTrend(companyId, period),
        absenteeism: await this.calculateAbsenteeismTrend(companyId, period)
      };
    }

    return trends;
  }

  async getPredictiveAnalytics(companyId) {
    // Predicciones con IA (Ollama)
    const ollamaService = require('../../services/OllamaService');

    const historicalData = await this.getHistoricalData(companyId);

    const predictions = {
      next_month_absenteeism: await this.predictAbsenteeism(historicalData),
      high_risk_employees: await this.identifyHighRiskEmployees(companyId),
      upcoming_exam_demand: await this.predictExamDemand(companyId),
      potential_outbreaks: await this.predictOutbreaks(companyId)
    };

    return predictions;
  }

  /**
   * Exportar dashboard completo a Excel
   */
  async exportToExcel(companyId, filters) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();

    const stats = await this.getMedicalDashboard(companyId, filters);

    // Sheet 1: Overview
    const overviewSheet = workbook.addWorksheet('Resumen General');
    // ... popular con stats.overview

    // Sheet 2: Exámenes
    const examsSheet = workbook.addWorksheet('Exámenes');
    // ... popular con stats.examinations

    // Sheet 3: Incidentes (si existe)
    if (stats.incidents) {
      const incidentsSheet = workbook.addWorksheet('Incidentes ART');
      // ... popular con stats.incidents
    }

    // Sheet 4: Telemedicina (si existe)
    if (stats.telemedicine) {
      const teleSheet = workbook.addWorksheet('Telemedicina');
      // ... popular con stats.telemedicine
    }

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new AdvancedAnalyticsEngine();
```

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Infraestructura Base (Semanas 1-2)
```
✅ ModuleRegistry (auto-discovery)
✅ EventBus (comunicación desacoplada)
✅ DependencyManager (inyección)
✅ Mobile API Gateway
✅ Dark Theme system
✅ AdvancedAnalyticsEngine (base)
```

### Fase 2: Módulos Core Mejorados (Semanas 3-4)
```
✅ Migrar Medical Dashboard a arquitectura modular
✅ Migrar HSE Management a arquitectura modular
✅ Migrar Legal Dashboard a arquitectura modular
✅ Migrar Associate Marketplace a arquitectura modular
✅ Implementar sub-especialidades médicas
```

### Fase 3: Módulos Premium Nuevos (Semanas 5-8)
```
✅ ART/Incidents Management
✅ Electronic Prescriptions (multi-país)
✅ Telemedicine (Jitsi integration)
✅ Medical Alerts Proactive
✅ Return to Work Protocol
```

### Fase 4: Módulos Enterprise (Semanas 9-12)
```
✅ Medical Epidemiology Dashboard
✅ Vaccination Management
✅ Laboratory Integration (HL7/FHIR)
✅ Medical Training/Certifications
✅ Wearables + IoT (fase posterior)
```

---

## 📐 CONVENCIONES DE CÓDIGO

### Naming Conventions

```javascript
// Módulos: kebab-case
'telemedicine'
'electronic-prescriptions'
'art-incidents'

// Servicios: PascalCase + Service
TelemedicineService
ElectronicPrescriptionService

// Eventos: module:entity:action
'medical:prescription:created'
'telemedicine:appointment:scheduled'
'art:incident:reported'

// Rutas API: /api/module/resource
/api/telemedicine/appointments
/api/prescriptions/electronic
/api/art/incidents
```

### Error Handling

```javascript
// Siempre usar try-catch en servicios
async createAppointment(data) {
  try {
    const appointment = await VideoAppointment.create(data);
    this.eventBus.emit('telemedicine:appointment:created', appointment);
    return appointment;
  } catch (error) {
    console.error('[TELEMEDICINE] Error creating appointment:', error);
    throw new ModuleError('telemedicine', 'CREATE_APPOINTMENT_FAILED', error);
  }
}
```

---

## 🎯 MÉTRICAS DE ÉXITO

### KPIs Técnicos
- ✅ 100% módulos con auto-registro
- ✅ 0 imports directos entre módulos (solo via DependencyManager)
- ✅ < 100ms overhead del EventBus
- ✅ 100% cobertura de tests en módulos críticos

### KPIs de Negocio
- ✅ 20% de clientes migran a plan Premium (telemedicina)
- ✅ 50% de clientes activan Electronic Prescriptions
- ✅ 80% satisfacción con Dark Theme
- ✅ 30% reducción de support tickets (alertas proactivas)

---

**FIN DE ARQUITECTURA MODULAR**

*Sistema Enterprise-Grade con Plug & Play*
*Diseñado para escalar a 10,000+ empresas sin romper lo existente*
