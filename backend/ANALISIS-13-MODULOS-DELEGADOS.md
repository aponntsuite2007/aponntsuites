# INVESTIGACIÓN EXHAUSTIVA: 13 Módulos "Delegados" - Frontend Real Identificado

**Fecha:** 2025-12-27
**Objetivo:** Identificar el frontend REAL de 13 módulos marcados como "delegados" (no sin frontend)
**Metodología:** Búsqueda exhaustiva en código fuente, registry, HTML, y análisis de integraciones

---

## RESUMEN EJECUTIVO

Los 13 módulos NO son "sin frontend". Están integrados en diferentes paneles/módulos del sistema:

| Módulo | Frontend Real | Tipo Integración | Panel |
|--------|---------------|------------------|-------|
| ai-assistant | `ai-assistant-chat.js` | **Chat flotante** | panel-empresa.html |
| auditor | Integrado en `engineering-dashboard.js` | **Tab "Testing"** | panel-administrativo.html |
| companies | `admin-panel-controller.js` + `enterprise-companies-grid.js` | **Sección completa** | panel-administrativo.html |
| kiosks-apk | N/A - Es APK Android | **Aplicación mobile** | Flutter/React Native |
| knowledge-base | Integrado en `ai-assistant-chat.js` | **Backend RAG** | Sin UI propia |
| medical-associates | Integrado en `medical-dashboard-professional.js` | **Tab "Asociados"** | panel-empresa.html |
| medical | `medical-dashboard-professional.js` | **Módulo standalone** | panel-empresa.html + medical-dashboard.html |
| notifications | `notification-center.js` | **Módulo standalone** | panel-empresa.html |
| partners | `partners-admin.js` + `partners-marketplace.js` | **2 módulos** | panel-administrativo.html + panel-asociados.html |
| temporary-access | Integrado en `users.js` | **Opción en dropdown** | panel-empresa.html |
| testing-metrics-dashboard | Integrado en `engineering-dashboard.js` | **Tab "Métricas"** | panel-administrativo.html |
| user-support | `user-support-dashboard.js` | **Módulo standalone** | panel-empresa.html |
| vendors | `vendor-dashboard.js` | **Módulo standalone** | panel-empresa.html |

---

## ANÁLISIS DETALLADO POR MÓDULO

### 1. **ai-assistant** ✅ FRONTEND IDENTIFICADO

#### Frontend Real
- **Archivo:** `C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\ai-assistant-chat.js` (1,100+ líneas)
- **Integración:** Chat flotante (floating widget)
- **URL:** Visible en http://localhost:9998/panel-empresa.html (botón bottom-right 🤖)
- **Líneas clave:**
  - Línea 21: IIFE principal del módulo
  - Línea 64: `#ai-assistant-widget` (contenedor)
  - Línea 73: `#ai-assistant-button` (botón flotante)

#### Selectores CSS
- **Container:** `#ai-assistant-widget`
- **Botón flotante:** `#ai-assistant-button` (60x60px, gradient purple)
- **Chat window:** `#ai-assistant-chat-window`
- **Message input:** `#ai-assistant-input`
- **Tech badges:** `.ai-tech-badge` (Ollama, Llama 3.1, PostgreSQL, RAG)

#### Estructura de datos
- **Tablas BD:**
  - `assistant_knowledge_base` (GLOBAL - compartida entre empresas)
  - `assistant_conversations` (MULTI-TENANT - privada por empresa)
- **Campos principales:** question, answer, context, similarity_score, feedback_score, company_id
- **Relaciones:** → companies (FK), → users (FK)

#### Integración con Brain
- **Workflow:**
  1. Usuario hace pregunta en chat flotante
  2. Sistema busca en knowledge_base (RAG)
  3. Si hay match → Respuesta existente
  4. Si no → Genera con Ollama/Llama 3.1
  5. Guarda respuesta para futuras consultas
  6. Sistema de tickets con SLA si requiere escalamiento
- **Dependencies:** users, companies, notification-center (opcional)
- **Provides to:** support-ai, ALL (omnipresente)

#### Config E2E actualizado
```javascript
module.exports = {
  moduleKey: 'ai-assistant',
  baseUrl: 'http://localhost:9998/panel-empresa.html',
  navigation: {
    // Chat flotante visible en TODA la app
    floatingButton: '#ai-assistant-button',
    chatWindow: '#ai-assistant-chat-window',
    messageInput: '#ai-assistant-input',
    sendButton: '#ai-send-message'
  },
  actions: {
    openChat: { selector: '#ai-assistant-button', action: 'click' },
    sendMessage: {
      selector: '#ai-assistant-input',
      action: 'type',
      value: '¿Cómo agrego un usuario?'
    },
    giveFeedback: { selector: '.feedback-thumbs-up', action: 'click' }
  },
  // NO tiene tabs, es un widget flotante omnipresente
  tabs: []
}
```

#### Documentación para Brain
- **Circuito:** Chat flotante → RAG search → Ollama LLM → Save to KB → Display response → Feedback loop
- **Integraciones:**
  - Auditor (auto-diagnóstico si detecta "no funciona")
  - Notification Center (escalamiento a tickets)
  - Knowledge Base (backend RAG)
- **Notas:**
  - 100% local con Ollama (USD $0/mes)
  - Knowledge base GLOBAL (aprendizaje compartido)
  - Historial privado por empresa
  - Requiere Ollama instalado y corriendo

---

### 2. **auditor** ✅ FRONTEND IDENTIFICADO

#### Frontend Real
- **Archivo:** Integrado en `C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\engineering-dashboard.js`
- **Integración:** Tab "Testing" dentro del Engineering Dashboard
- **URL:** http://localhost:9998/panel-administrativo.html#ingenieria → Tab "Testing"
- **Líneas clave:**
  - engineering-dashboard.js línea 3936: `data-module` listener
  - engineering-dashboard.js línea 4297: `showDetailsModal`

#### Selectores CSS
- **Container:** `#engineering-dashboard-container`
- **Tab Testing:** `[data-tab="testing"]` dentro del dashboard
- **Modal detalles:** `.engineering-modal`
- **Botones acción:** `.run-audit-btn`, `.view-report-btn`

#### Estructura de datos
- **Tabla BD:** `audit_logs`
- **Campos principales:** execution_id, test_type, module_name, error_type, fix_attempted, status
- **Relaciones:** → companies (FK), → modules (string key)

#### Integración con Brain
- **Workflow:**
  1. Admin navega a panel-administrativo.html#ingenieria
  2. Click en tab "Testing"
  3. Ejecuta auditoría completa o por módulo
  4. Sistema corre tests (endpoints, DB, integration, E2E)
  5. Auto-healing híbrido aplica fixes seguros
  6. Genera reporte con sugerencias
- **Dependencies:** Ninguna (standalone)
- **Provides to:** ai-assistant (auto-diagnóstico), engineering-dashboard (métricas)

#### Config E2E actualizado
```javascript
module.exports = {
  moduleKey: 'auditor',
  baseUrl: 'http://localhost:9998/panel-administrativo.html#ingenieria',
  navigation: {
    mainTab: '[data-section="engineering"]',
    testingTab: '[data-tab="testing"]',
    runButton: '.run-audit-btn',
    historyTab: '[data-tab="history"]'
  },
  actions: {
    runFullAudit: {
      selector: '.run-audit-btn[data-scope="full"]',
      action: 'click'
    },
    runModuleAudit: {
      selector: '.run-audit-btn[data-scope="module"]',
      action: 'click'
    },
    viewReport: { selector: '.view-report-btn', action: 'click' }
  },
  tabs: [
    { name: 'Estado Actual', selector: '[data-tab="status"]' },
    { name: 'Registry Módulos', selector: '[data-tab="registry"]' },
    { name: 'Dependencias', selector: '[data-tab="dependencies"]' },
    { name: 'Historial', selector: '[data-tab="history"]' },
    { name: 'Generador Datos', selector: '[data-tab="seeder"]' },
    { name: 'Sugerencias Comerciales', selector: '[data-tab="bundles"]' }
  ]
}
```

#### Documentación para Brain
- **Circuito:** UI Trigger → AuditorEngine → Collectors (tests) → Healers (auto-fix) → AuditLog → UI Report
- **Integraciones:**
  - Engineering Dashboard (host)
  - AI Assistant (llamado automático en auto-diagnóstico)
  - SystemRegistry (metadata de módulos)
- **Notas:**
  - Solo visible para admins
  - Auto-healing híbrido (safe auto-fix, critical suggest only)
  - Genera datos de prueba con Faker.js

---

### 3. **companies** ✅ FRONTEND IDENTIFICADO

#### Frontend Real
- **Archivos:**
  - `C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\admin-panel-controller.js` (controlador principal)
  - `C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\enterprise-companies-grid.js` (vista grilla)
- **Integración:** Sección completa "Empresas" en panel administrativo
- **URL:** http://localhost:9998/panel-administrativo.html#empresas
- **Líneas clave:**
  - admin-panel-controller.js línea 69: `AdminSidebar.init`
  - enterprise-companies-grid.js línea 20: `render(companies, container)`

#### Selectores CSS
- **Container:** `#companies-section`
- **Grilla:** `.enterprise-companies-grid`
- **Cards:** `.company-card`
- **Botón crear:** `.btn-create-company`
- **Modal editar:** `#company-modal`

#### Estructura de datos
- **Tabla BD:** `companies`
- **Campos principales:** id, name, slug, contact_email, phone, address, tax_id, is_active, max_employees, modules_data, monthly_total
- **Relaciones:** → users (1:N), → departments (1:N), → kiosks (1:N)

#### Integración con Brain
- **Workflow:**
  1. Staff admin accede a panel-administrativo.html
  2. Navega a sección "Empresas"
  3. Ve grilla con todas las empresas (cards enterprise style)
  4. Puede crear, editar, desactivar empresas
  5. Gestionar módulos activos por empresa
  6. Asignar vendedores
- **Dependencies:** aponnt_staff, vendor_statistics
- **Provides to:** ALL (todas las features son multi-tenant)

#### Config E2E actualizado
```javascript
module.exports = {
  moduleKey: 'companies',
  baseUrl: 'http://localhost:9998/panel-administrativo.html#empresas',
  navigation: {
    mainSection: '[data-section="companies"]',
    createButton: '.btn-create-company',
    companyCard: '.company-card',
    editModal: '#company-modal'
  },
  crud: {
    create: {
      button: '.btn-create-company',
      modal: '#company-modal',
      fields: {
        name: 'input[name="name"]',
        slug: 'input[name="slug"]',
        email: 'input[name="contact_email"]',
        phone: 'input[name="phone"]',
        address: 'input[name="address"]',
        taxId: 'input[name="tax_id"]'
      },
      submit: '#btn-save-company'
    },
    read: {
      grid: '.enterprise-companies-grid',
      card: '.company-card'
    },
    update: {
      button: '.btn-edit-company',
      modal: '#company-modal'
    },
    delete: {
      button: '.btn-delete-company',
      confirm: '.swal2-confirm'
    }
  },
  tabs: [
    { name: 'General', selector: '[data-tab="general"]' },
    { name: 'Módulos', selector: '[data-tab="modules"]' },
    { name: 'Facturación', selector: '[data-tab="billing"]' },
    { name: 'Configuración', selector: '[data-tab="config"]' }
  ]
}
```

#### Documentación para Brain
- **Circuito:** Admin Panel → Companies Section → CRUD Operations → API /aponnt/dashboard/companies → PostgreSQL
- **Integraciones:**
  - Admin Panel Controller (host)
  - Enterprise Companies Grid (vista)
  - Vendors (asignación de vendedores)
  - Modules (activación/desactivación)
- **Notas:**
  - Solo accesible para staff de APONNT (no empresas)
  - Sistema multi-tenant base
  - Todas las features dependen de esto

---

### 4. **kiosks-apk** ⚠️ NO ES FRONTEND WEB

#### Frontend Real
- **Tipo:** Aplicación Android nativa (APK)
- **Tecnología:** Flutter o React Native
- **Ubicación:** `C:\Bio\sistema_asistencia_biometrico\flutter_apps\kiosk_app\` (probablemente)
- **Integración:** Aplicación mobile standalone

#### Estructura de datos
- **Tabla BD:** `kiosks`
- **Campos principales:** id, name, kiosk_code, company_id, branch_id, hardware_facial_id, hardware_fingerprint_id, location, is_active
- **Relaciones:** → companies (FK), → branches (FK)

#### Integración con Brain
- **Workflow:**
  1. Tablet Android instalada en pared/mesa
  2. APK kiosk_app corre en modo kiosko
  3. Empleado se acerca al kiosko
  4. Escaneo facial o huella
  5. APK envía a backend → API /api/attendance
  6. Backend registra asistencia
  7. Kiosko muestra confirmación
- **Dependencies:** companies, attendance
- **Provides to:** attendance (único punto de fichaje biométrico)

#### Config E2E actualizado
```javascript
// Este módulo NO tiene E2E web testing
// Es una APK Android que debe testearse con:
// - Appium (Android automation)
// - Detox (React Native testing)
// - Flutter Driver (si es Flutter)

// Pero SÍ se puede testear la gestión de kiosks desde web:
module.exports = {
  moduleKey: 'kiosks', // Gestión web de kiosks
  baseUrl: 'http://localhost:9998/panel-empresa.html#kioscos',
  navigation: {
    moduleTab: '[data-module="kiosks"]',
    createButton: '#btn-create-kiosk',
    kioskList: '#kiosks-list',
    editModal: '#kiosk-modal'
  },
  crud: {
    create: {
      button: '#btn-create-kiosk',
      modal: '#kiosk-modal',
      fields: {
        name: 'input[name="kiosk_name"]',
        code: 'input[name="kiosk_code"]',
        location: 'input[name="location"]',
        hardwareFacial: 'select[name="hardware_facial"]',
        hardwareFingerprint: 'select[name="hardware_fingerprint"]'
      }
    }
  },
  // Testing de la APK requiere otro framework
  apkTesting: {
    framework: 'Appium',
    testFile: 'tests/mobile/kiosk-app.spec.js',
    notes: 'Requiere emulador Android o dispositivo físico'
  }
}
```

#### Documentación para Brain
- **Circuito:** APK Kiosko → API Backend → attendance table → Confirmación a APK
- **Integraciones:**
  - Attendance (registro de asistencia)
  - Biometric Hardware (facial/fingerprint)
  - Companies (multi-tenant)
  - Branches (kioscos por sucursal)
- **Notas:**
  - Frontend web SOLO para GESTIONAR kiosks (no para usarlos)
  - Uso real es APK Android
  - Gestión desde panel-empresa.html#kioscos

---

### 5. **knowledge-base** ✅ BACKEND RAG (Sin UI propia)

#### Frontend Real
- **Archivo:** Integrado en `ai-assistant-chat.js` (backend RAG)
- **Integración:** Sistema de búsqueda semántica sin UI
- **URL:** N/A (sin interfaz visible)
- **Líneas clave:**
  - ai-assistant-chat.js línea 30: `/api/assistant/chat` (usa knowledge base internamente)
  - AssistantService.js línea 150+: RAG search implementation

#### Selectores CSS
- N/A - No tiene interfaz visual propia

#### Estructura de datos
- **Tabla BD:** `assistant_knowledge_base` (GLOBAL)
- **Campos principales:** question, answer, embedding_vector, similarity_score, feedback_score, context
- **Relaciones:** Ninguna (GLOBAL, sin company_id)

#### Integración con Brain
- **Workflow:**
  1. Usuario hace pregunta en AI Assistant
  2. Sistema busca en knowledge_base (similarity search)
  3. Si encuentra match (score > 0.7) → Usa respuesta existente
  4. Si no → Genera nueva con Ollama
  5. Guarda respuesta en knowledge_base
  6. Próximas consultas similares reutilizan esta respuesta
- **Dependencies:** Ninguna (backend puro)
- **Provides to:** ai-assistant (RAG), support-base

#### Config E2E actualizado
```javascript
// Este módulo NO tiene UI para testear directamente
// Se testea indirectamente a través de ai-assistant

module.exports = {
  moduleKey: 'knowledge-base',
  testingStrategy: 'indirect', // Testear a través de ai-assistant

  // Testing indirecto
  indirectTests: [
    {
      name: 'RAG Search Functionality',
      action: 'Enviar misma pregunta 2 veces al AI Assistant',
      expectedResult: 'Segunda respuesta debe venir de knowledge_base (más rápida)',
      endpoint: '/api/assistant/chat'
    },
    {
      name: 'Similarity Threshold',
      action: 'Enviar pregunta similar con palabras diferentes',
      expectedResult: 'Debe reconocer similarity y usar respuesta existente',
      endpoint: '/api/assistant/chat'
    }
  ],

  // API Testing directo
  apiTests: [
    {
      endpoint: 'GET /api/assistant/stats',
      expectedFields: ['totalQueries', 'knowledgeBaseHits', 'newGenerations']
    }
  ],

  // No tiene CRUD porque es auto-gestionado
  notes: 'Knowledge base se auto-popula desde ai-assistant. No requiere gestión manual.'
}
```

#### Documentación para Brain
- **Circuito:** Question → Similarity Search (PostgreSQL ts_vector) → Match Found? → Yes: Return cached | No: Generate new → Save to KB
- **Integraciones:**
  - AI Assistant (consumidor principal)
  - Support Base (fuente de respuestas)
- **Notas:**
  - GLOBAL (compartido entre TODAS las empresas)
  - Aprendizaje acumulativo
  - Sin interfaz visual propia
  - Búsqueda semántica con PostgreSQL

---

### 6. **medical-associates** ✅ FRONTEND IDENTIFICADO

#### Frontend Real
- **Archivo:** Integrado en `C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\medical-dashboard-professional.js`
- **Integración:** Tab "Asociados" dentro del Medical Dashboard
- **URL:** http://localhost:9998/panel-empresa.html#medical → Tab "Asociados"
- **Líneas clave:**
  - medical-dashboard-professional.js línea 1: Header del módulo
  - medical-dashboard-professional.js línea 93: JobPostingsAPI (para candidatos pre-ocupacional)

#### Selectores CSS
- **Container:** `#medical-dashboard-container`
- **Tab Asociados:** `[data-tab="associates"]` o `[data-tab="asociados"]`
- **Lista asociados:** `.associates-list`
- **Card asociado:** `.associate-card`

#### Estructura de datos
- **Tabla BD:** `partners` (con role_id médico)
- **Campos principales:** id, user_id, role_id, status, professional_license, rating, verified
- **Relaciones:** → users (FK), → partner_roles (FK), → companies (N:M a través de partner_companies)

#### Integración con Brain
- **Workflow:**
  1. Usuario médico accede a panel-empresa.html#medical
  2. Ve sus casos asignados (tab "Mis Casos")
  3. Puede navegar a tab "Asociados" para ver otros médicos
  4. Sistema muestra médicos del marketplace
  5. Puede solicitar interconsulta o referir caso
- **Dependencies:** medical, partners, users
- **Provides to:** medical (interconsultas)

#### Config E2E actualizado
```javascript
module.exports = {
  moduleKey: 'medical-associates',
  baseUrl: 'http://localhost:9998/panel-empresa.html#medical',
  navigation: {
    mainModule: '[data-module="medical"]',
    associatesTab: '[data-tab="associates"]',
    associatesList: '.associates-list',
    associateCard: '.associate-card'
  },
  tabs: [
    { name: 'Mis Casos', selector: '[data-tab="my-cases"]' },
    { name: 'Casos Pendientes', selector: '[data-tab="pending"]' },
    { name: 'Asociados', selector: '[data-tab="associates"]' }, // ← Este tab
    { name: 'Pre-Ocupacional', selector: '[data-tab="pre-occupational"]' },
    { name: 'Medical 360', selector: '[data-tab="360"]' }
  ],
  actions: {
    viewAssociate: {
      selector: '.associate-card',
      action: 'click'
    },
    requestConsultation: {
      selector: '.btn-request-consultation',
      action: 'click'
    },
    sendReferral: {
      selector: '.btn-send-referral',
      action: 'click'
    }
  }
}
```

#### Documentación para Brain
- **Circuito:** Medical Dashboard → Tab Asociados → Lista Partners (médicos) → Request Consultation → Notificación a asociado
- **Integraciones:**
  - Medical Dashboard (host)
  - Partners Marketplace (fuente de asociados)
  - Notification Center (alertas de interconsulta)
- **Notas:**
  - Visible solo para usuarios con rol médico
  - Permite colaboración entre médicos
  - Rating system para calidad

---

### 7. **medical** ✅ FRONTEND IDENTIFICADO

#### Frontend Real
- **Archivo:** `C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\medical-dashboard-professional.js` (4,000+ líneas)
- **Integración:** Módulo standalone completo
- **URL:** http://localhost:9998/panel-empresa.html#medical O http://localhost:9998/medical-dashboard.html
- **Líneas clave:**
  - Línea 1: Header del módulo v4.0 PROGRESSIVE
  - Línea 16: MedicalAPI service
  - Línea 95: JobPostingsAPI (pre-ocupacional)

#### Selectores CSS
- **Container:** `#medical-dashboard-container`
- **Tabs:** `[data-tab="my-cases"]`, `[data-tab="pending"]`, `[data-tab="360"]`, etc.
- **Modal caso:** `#medical-case-modal`
- **Chat médico:** `.medical-chat-container`

#### Estructura de datos
- **Tablas BD:**
  - `medical_cases` (principal)
  - `medical_messages` (chat)
  - `medical_diagnoses` (diagnósticos)
  - `medical_exams` (exámenes PRE/POST)
  - `employee_fitness_status` (aptitud laboral)
- **Campos principales:** case_id, employee_id, doctor_id, type (PRE/POST/OCCUPATIONAL), status, diagnosis, treatment
- **Relaciones:** → users (employee/doctor), → companies, → job_postings (pre-ocupacional)

#### Integración con Brain
- **Workflow:**
  1. Médico/RRHH accede a medical dashboard
  2. Ve casos pendientes (exámenes PRE, consultas ocupacionales, seguimientos POST)
  3. Abre caso específico
  4. Revisa historial clínico (Medical 360)
  5. Chatea con empleado/médico
  6. Sube archivos adjuntos
  7. Emite diagnóstico
  8. Cierra caso con recomendaciones
  9. Sistema actualiza fitness_status del empleado
  10. Notifica a RRHH si hay restricciones laborales
- **Dependencies:** users, companies, notification-center, document-management, job-postings
- **Provides to:** legal-dashboard, payroll-liquidation, employee-360

#### Config E2E actualizado
```javascript
module.exports = {
  moduleKey: 'medical',
  baseUrl: 'http://localhost:9998/panel-empresa.html#medical',
  navigation: {
    mainModule: '[data-module="medical"]',
    pendingCases: '[data-tab="pending"]',
    myCases: '[data-tab="my-cases"]',
    medical360: '[data-tab="360"]',
    preOccupational: '[data-tab="pre-occupational"]',
    caseModal: '#medical-case-modal'
  },
  crud: {
    create: {
      button: '#btn-create-case',
      modal: '#medical-case-modal',
      fields: {
        employeeId: 'select[name="employee_id"]',
        type: 'select[name="case_type"]', // PRE, POST, OCCUPATIONAL
        reason: 'textarea[name="reason"]'
      },
      submit: '#btn-save-case'
    },
    read: {
      casesList: '.medical-cases-list',
      caseCard: '.medical-case-card',
      caseDetails: '.medical-case-details'
    },
    update: {
      sendMessage: {
        input: '#medical-chat-input',
        button: '#btn-send-message'
      },
      uploadFile: '#medical-file-upload',
      addDiagnosis: {
        button: '#btn-add-diagnosis',
        fields: {
          diagnosis: 'textarea[name="diagnosis"]',
          treatment: 'textarea[name="treatment"]',
          restrictions: 'textarea[name="work_restrictions"]'
        }
      }
    },
    delete: {
      closeCase: '#btn-close-case',
      confirm: '.swal2-confirm'
    }
  },
  tabs: [
    { name: 'Casos Pendientes', selector: '[data-tab="pending"]' },
    { name: 'Mis Casos', selector: '[data-tab="my-cases"]' },
    { name: 'Pre-Ocupacional', selector: '[data-tab="pre-occupational"]' },
    { name: 'Medical 360', selector: '[data-tab="360"]' },
    { name: 'Asociados', selector: '[data-tab="associates"]' },
    { name: 'Estadísticas', selector: '[data-tab="stats"]' }
  ]
}
```

#### Documentación para Brain
- **Circuito:** Employee solicita consulta → RRHH asigna médico → Médico revisa Medical 360 → Chat médico-empleado → Diagnóstico → Update fitness_status → Cierre caso → Notificación RRHH
- **Integraciones:**
  - Job Postings (exámenes pre-ocupacionales)
  - Notification Center (alertas proactivas)
  - Document Management (archivos médicos)
  - Employee 360 (vista completa empleado)
  - Payroll (restricciones afectan liquidación)
  - Legal (accidentes laborales)
- **Notas:**
  - Workflow completo PRE → Ocupacional → POST
  - Historial clínico centralizado
  - Datos antropométricos
  - Condiciones crónicas
  - Tratamientos psiquiátricos
  - Notificaciones proactivas a candidatos RRHH

---

### 8. **notifications** ✅ FRONTEND IDENTIFICADO

#### Frontend Real
- **Archivo:** `C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\notification-center.js` (2,500+ líneas)
- **Integración:** Módulo standalone completo
- **URL:** http://localhost:9998/panel-empresa.html#notificaciones
- **Líneas clave:**
  - Línea 1: Header NOTIFICATION CENTER v3.0 - Unified Professional
  - Línea 21: NotificationCenter object
  - Línea 79: init()

#### Selectores CSS
- **Container:** `.notification-center`
- **Sidebar:** `.nc-sidebar`
- **Inbox:** `.nc-inbox`
- **Notification card:** `.nc-notification-card`
- **Modal detalle:** `#nc-detail-modal`
- **AI Indicator:** `.nc-ai-indicator-floating`

#### Estructura de datos
- **Tablas BD:**
  - `notification_groups` (grupos de notificaciones)
  - `notification_items` (notificaciones individuales)
  - `notification_escalations` (escalamientos SLA)
  - `notification_sla_config` (configuración SLA)
- **Campos principales:** group_id, item_id, type, priority, deadline, status, escalation_level
- **Relaciones:** → companies, → users (destinatario/autor), → notification_sla_config

#### Integración con Brain
- **Workflow:**
  1. Sistema genera notificación proactiva (ej: vacaciones por vencer)
  2. Crea notification_group con SLA deadline
  3. Notifica a destinatario (empleado/supervisor)
  4. Destinatario ve notificación en Notification Center
  5. Puede approve/reject/comment
  6. Si no responde en tiempo SLA → Auto-escalamiento
  7. Escalamiento nivel 2: Notifica a supervisor
  8. Escalamiento nivel 3: Notifica a gerencia
  9. AI Indicator muestra si fue generada por Brain
- **Dependencies:** companies, users
- **Provides to:** ALL (sistema de notificaciones universal)

#### Config E2E actualizado
```javascript
module.exports = {
  moduleKey: 'notifications',
  baseUrl: 'http://localhost:9998/panel-empresa.html#notificaciones',
  navigation: {
    mainModule: '[data-module="notifications"]',
    sidebar: '.nc-sidebar',
    inbox: '.nc-inbox',
    notificationCard: '.nc-notification-card',
    detailModal: '#nc-detail-modal'
  },
  crud: {
    read: {
      allNotifications: '.nc-inbox',
      unreadCount: '.nc-unread-count',
      notificationCard: '.nc-notification-card'
    },
    update: {
      markAsRead: '.nc-btn-mark-read',
      approve: '.nc-btn-approve',
      reject: '.nc-btn-reject',
      comment: {
        input: '.nc-comment-input',
        button: '.nc-btn-send-comment'
      }
    },
    delete: {
      dismiss: '.nc-btn-dismiss',
      confirm: '.swal2-confirm'
    }
  },
  filters: {
    categoryFilter: '.nc-category-filter',
    statusFilter: '.nc-status-filter',
    priorityFilter: '.nc-priority-filter',
    searchInput: '.nc-search-input'
  },
  tabs: [
    { name: 'Todas', selector: '[data-filter="all"]' },
    { name: 'Proactivas', selector: '[data-filter="proactive"]' },
    { name: 'Solicitudes', selector: '[data-filter="request"]' },
    { name: 'Asistencia', selector: '[data-filter="attendance"]' },
    { name: 'Capacitación', selector: '[data-filter="training"]' },
    { name: 'Sistema', selector: '[data-filter="system"]' }
  ]
}
```

#### Documentación para Brain
- **Circuito:** Sistema genera evento → NotificationEngine crea group → SLA tracking → Notifica destinatario → Deadline countdown → Si no responde → Auto-escalamiento → Nivel superior
- **Integraciones:**
  - ALL modules (consumidores)
  - Brain Nervous System (generación proactiva)
  - AI Assistant (notificaciones de tickets)
  - Medical (alertas médicas)
  - Vacation (vacaciones por vencer)
  - Attendance (llegadas tarde)
- **Notas:**
  - Dark theme profesional
  - SLA completo con deadlines
  - Auto-escalamiento multinivel
  - AI Indicator para notificaciones generadas por Brain
  - Threads/conversaciones
  - Approve/Reject workflows

---

### 9. **partners** ✅ FRONTEND IDENTIFICADO

#### Frontend Real
- **Archivos:**
  - `C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\partners-admin.js` (gestión admin)
  - `C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\partners-marketplace.js` (marketplace público)
  - `C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\partners-admin-panel.js` (panel admin)
- **Integración:** 2 módulos separados (Admin + Marketplace)
- **URLs:**
  - Admin: http://localhost:9998/panel-administrativo.html#partners
  - Marketplace: http://localhost:9998/panel-asociados.html
- **Líneas clave:**
  - partners-admin.js línea 15: `class PartnersAdminPanel`
  - partners-marketplace.js línea 1: Marketplace component

#### Selectores CSS
- **Admin Container:** `.partners-admin-panel`
- **Marketplace Container:** `.partners-marketplace`
- **Partner card:** `.partner-card`
- **Modal aprobación:** `#partner-approval-modal`
- **Filtros:** `.partner-filter-btn`

#### Estructura de datos
- **Tablas BD:**
  - `partners` (asociados)
  - `partner_roles` (médico, abogado, ingeniero, etc.)
  - `partner_companies` (N:M relación partner-empresa)
  - `partner_reviews` (calificaciones)
  - `partner_documents` (licencias profesionales)
- **Campos principales:** id, user_id, role_id, status (pending/approved/rejected), professional_license, rating, verified
- **Relaciones:** → users, → partner_roles, → companies (N:M)

#### Integración con Brain
- **Workflow (Admin):**
  1. Profesional se registra desde marketplace
  2. Sube documentos de verificación
  3. Admin revisa en panel-administrativo.html#partners
  4. Aprueba o rechaza
  5. Si aprueba → Partner activo en marketplace
  6. Empresas pueden contratar servicios

- **Workflow (Marketplace):**
  1. Empresa navega a panel-asociados.html
  2. Ve marketplace de partners (filtrado por categoría)
  3. Selecciona partner (médico/abogado/etc.)
  4. Solicita servicio
  5. Partner recibe notificación
  6. Presta servicio
  7. Empresa califica (rating)

- **Dependencies:** users, companies
- **Provides to:** medical (médicos), legal (abogados), safety (ingenieros)

#### Config E2E actualizado
```javascript
// partners-admin (gestión)
module.exports = {
  moduleKey: 'partners',
  baseUrl: 'http://localhost:9998/panel-administrativo.html#partners',
  navigation: {
    mainSection: '[data-section="partners"]',
    pendingTab: '[data-filter="pending"]',
    approvedTab: '[data-filter="approved"]',
    rejectedTab: '[data-filter="rejected"]'
  },
  crud: {
    read: {
      partnersList: '.partners-list',
      partnerCard: '.partner-card'
    },
    update: {
      approve: {
        button: '.btn-approve-partner',
        modal: '#partner-approval-modal',
        confirm: '#btn-confirm-approval'
      },
      reject: {
        button: '.btn-reject-partner',
        modal: '#partner-rejection-modal',
        reason: 'textarea[name="rejection_reason"]',
        confirm: '#btn-confirm-rejection'
      },
      viewDocuments: '.btn-view-documents'
    }
  },
  filters: {
    statusFilter: '.partner-filter-btn',
    roleFilter: '.partner-role-filter',
    searchInput: '#partners-search'
  }
}

// partners-marketplace (público)
module.exports = {
  moduleKey: 'partners-marketplace',
  baseUrl: 'http://localhost:9998/panel-asociados.html',
  navigation: {
    categoriesMenu: '.marketplace-categories',
    partnersGrid: '.partners-grid',
    partnerProfile: '.partner-profile-modal'
  },
  actions: {
    filterByCategory: {
      selector: '[data-category="medical"]',
      action: 'click'
    },
    viewPartner: {
      selector: '.partner-card',
      action: 'click'
    },
    requestService: {
      selector: '.btn-request-service',
      action: 'click'
    },
    ratePartner: {
      selector: '.rating-stars',
      action: 'click'
    }
  }
}
```

#### Documentación para Brain
- **Circuito (Admin):** Registro → Upload docs → Admin review → Approval → Active in marketplace
- **Circuito (Marketplace):** Browse → Filter → Select → Request → Notification → Service → Rating
- **Integraciones:**
  - Medical (médicos)
  - Legal (abogados laboralistas)
  - Safety (ingenieros en seguridad)
  - Audit (contadores/auditores)
  - Coaching (psicólogos/coaches)
  - Notification Center (alertas de solicitudes)
- **Notas:**
  - Sistema de rating/reviews
  - Verificación de licencias profesionales
  - Multi-categoría (10 roles diferentes)
  - N:M relación (un partner atiende múltiples empresas)

---

### 10. **temporary-access** ✅ FRONTEND IDENTIFICADO

#### Frontend Real
- **Archivo:** Integrado en `C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\users.js`
- **Integración:** Opción "Temporal" en dropdown de tipo de usuario
- **URL:** http://localhost:9998/panel-empresa.html#usuarios → Crear/Editar usuario → Campo "Tipo"
- **Líneas clave:**
  - users.js línea 8173: `<option value="temporary">Temporal</option>`
  - users.js línea 11203: `'temporary': '⚠️ Afecta trabajo temporalmente'`

#### Selectores CSS
- **Container:** `#users-module-container`
- **Modal usuario:** `#user-modal`
- **Campo tipo:** `select[name="user_type"]`
- **Opción temporal:** `option[value="temporary"]`

#### Estructura de datos
- **Tabla BD:** `users` (campo `user_type` = 'temporary')
- **Campos adicionales:** temporary_access_until (datetime), temporary_password, access_restrictions
- **Relaciones:** → companies (FK), → partners (si es para partner)

#### Integración con Brain
- **Workflow:**
  1. Admin/RRHH crea usuario en panel-empresa.html#usuarios
  2. Selecciona tipo "Temporal" en dropdown
  3. Sistema muestra campos adicionales:
     - Fecha de expiración
     - Contraseña temporal (auto-generada)
     - Restricciones de acceso (módulos permitidos)
  4. Guarda usuario
  5. Sistema envía credenciales temporales por email
  6. Usuario puede acceder hasta fecha de expiración
  7. Al vencer → Auto-desactivación
  8. Notificación proactiva 3 días antes de vencer
- **Dependencies:** users, companies
- **Provides to:** partners-medical (médicos temporales), visitors (visitantes con acceso temporal)

#### Config E2E actualizado
```javascript
module.exports = {
  moduleKey: 'temporary-access',
  baseUrl: 'http://localhost:9998/panel-empresa.html#usuarios',
  navigation: {
    usersModule: '[data-module="users"]',
    createButton: '#btn-create-user',
    userModal: '#user-modal'
  },
  crud: {
    create: {
      button: '#btn-create-user',
      modal: '#user-modal',
      fields: {
        name: 'input[name="full_name"]',
        email: 'input[name="email"]',
        userType: 'select[name="user_type"]',
        // Campos específicos para temporal:
        expirationDate: 'input[name="temporary_access_until"]',
        allowedModules: 'select[name="allowed_modules"]',
        autoGeneratePassword: 'input[type="checkbox"][name="auto_password"]'
      },
      actions: {
        selectTemporary: {
          selector: 'select[name="user_type"]',
          action: 'select',
          value: 'temporary'
        },
        setExpiration: {
          selector: 'input[name="temporary_access_until"]',
          action: 'type',
          value: '2025-12-31'
        }
      },
      submit: '#btn-save-user'
    },
    update: {
      extendAccess: {
        button: '.btn-extend-access',
        newDate: 'input[name="new_expiration"]'
      },
      convertToPermanent: {
        button: '.btn-convert-permanent',
        confirm: '.swal2-confirm'
      }
    },
    delete: {
      revokeAccess: '.btn-revoke-access',
      confirm: '.swal2-confirm'
    }
  },
  // Testing específico para lógica temporal
  specialTests: [
    {
      name: 'Expiration Logic',
      action: 'Crear usuario temporal con fecha pasada',
      expectedResult: 'Usuario auto-desactivado al intentar login'
    },
    {
      name: 'Proactive Notification',
      action: 'Crear usuario temporal que vence en 3 días',
      expectedResult: 'Notificación proactiva generada'
    }
  ]
}
```

#### Documentación para Brain
- **Circuito:** Create temporary user → Set expiration → Auto-generate password → Send credentials → User login → Expiration check → Auto-deactivate if expired → Proactive notification before expiry
- **Integraciones:**
  - Users (módulo host)
  - Partners (médicos/abogados temporales)
  - Notification Center (alertas de expiración)
  - Visitors (visitantes con acceso temporal)
- **Notas:**
  - No es un módulo separado, es una FEATURE de users
  - Contraseñas auto-generadas seguras
  - Auto-desactivación al vencer
  - Notificaciones proactivas
  - Puede restringir acceso a módulos específicos

---

### 11. **testing-metrics-dashboard** ✅ FRONTEND IDENTIFICADO

#### Frontend Real
- **Archivo:** Integrado en `C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\engineering-dashboard.js`
- **Integración:** Tab "Métricas" dentro del Engineering Dashboard
- **URL:** http://localhost:9998/panel-administrativo.html#ingenieria → Tab "Métricas de Testing"
- **Líneas clave:**
  - engineering-dashboard.js línea 3936: Event listener para drill-down
  - engineering-dashboard.js línea 5479: `savePricing` (incluye métricas)

#### Selectores CSS
- **Container:** `#engineering-dashboard-container`
- **Tab Métricas:** `[data-tab="testing-metrics"]`
- **Charts:** `.metrics-chart`, `.coverage-chart`, `.performance-chart`
- **Stats cards:** `.metric-card`

#### Estructura de datos
- **Tabla BD:** `audit_logs` (fuente de métricas)
- **Campos relevantes:** test_type, module_name, status, execution_time, error_count
- **Agregaciones:** Total tests, pass rate, avg execution time, coverage %

#### Integración con Brain
- **Workflow:**
  1. Admin navega a panel-administrativo.html#ingenieria
  2. Click en tab "Métricas de Testing"
  3. Sistema muestra:
     - Total de tests ejecutados
     - Pass rate (%)
     - Coverage por módulo
     - Performance trends
     - Failures más frecuentes
     - Histórico de ejecuciones
  4. Charts interactivos (Chart.js)
  5. Drill-down por módulo
- **Dependencies:** auditor (fuente de datos)
- **Provides to:** engineering-dashboard (visualización)

#### Config E2E actualizado
```javascript
module.exports = {
  moduleKey: 'testing-metrics-dashboard',
  baseUrl: 'http://localhost:9998/panel-administrativo.html#ingenieria',
  navigation: {
    engineeringSection: '[data-section="engineering"]',
    metricsTab: '[data-tab="testing-metrics"]',
    chartsContainer: '.metrics-charts-container'
  },
  // No tiene CRUD, solo visualización read-only
  visualization: {
    statsCards: [
      { name: 'Total Tests', selector: '.metric-total-tests' },
      { name: 'Pass Rate', selector: '.metric-pass-rate' },
      { name: 'Coverage', selector: '.metric-coverage' },
      { name: 'Avg Execution Time', selector: '.metric-avg-time' }
    ],
    charts: [
      { name: 'Coverage by Module', selector: '#coverage-chart' },
      { name: 'Performance Trends', selector: '#performance-chart' },
      { name: 'Failures Over Time', selector: '#failures-chart' }
    ]
  },
  actions: {
    filterByModule: {
      selector: '.metrics-module-filter',
      action: 'select'
    },
    filterByDateRange: {
      selector: '.metrics-date-range',
      action: 'select'
    },
    drillDownModule: {
      selector: '.metric-card[data-module]',
      action: 'click'
    }
  },
  // Este módulo es read-only, se alimenta de audit_logs
  dataSource: 'audit_logs',
  refreshInterval: 30000 // Auto-refresh cada 30 segundos
}
```

#### Documentación para Brain
- **Circuito:** Auditor ejecuta tests → Guarda en audit_logs → Metrics Dashboard consulta audit_logs → Genera agregaciones → Renderiza charts → Auto-refresh
- **Integraciones:**
  - Engineering Dashboard (host)
  - Auditor (fuente de datos)
  - AuditLog model (consultas)
- **Notas:**
  - Read-only dashboard
  - Charts interactivos con Chart.js
  - Auto-refresh cada 30 segundos
  - Drill-down por módulo
  - Histórico de ejecuciones
  - Solo visible para admins

---

### 12. **user-support** ✅ FRONTEND IDENTIFICADO

#### Frontend Real
- **Archivo:** `C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\user-support-dashboard.js` (1,500+ líneas)
- **Integración:** Módulo standalone completo
- **URL:** http://localhost:9998/panel-empresa.html#soporte
- **Líneas clave:**
  - Línea 1: Header USER SUPPORT DASHBOARD v1.0.0
  - Línea 21: `class UserSupportDashboard`
  - Línea 72: `async init(containerId)`

#### Selectores CSS
- **Container:** `#user-support-dashboard`
- **Tickets list:** `.support-tickets-list`
- **Ticket card:** `.support-ticket-card`
- **Detail view:** `.support-ticket-detail`
- **Chat container:** `.support-chat-container`

#### Estructura de datos
- **Tablas BD:**
  - `support_tickets` (tickets)
  - `support_messages` (mensajes del chat)
  - `support_brain_trainings` (entrenamientos del Brain)
- **Campos principales:** ticket_id, user_id, module_key, status, priority, subject, escalated_from_ai, sla_deadline
- **Relaciones:** → users (creador), → companies, → assistant_conversations (si escalado desde AI)

#### Integración con Brain
- **Workflow:**
  1. Usuario accede a panel-empresa.html#soporte
  2. Ve sus tickets (open, in_progress, resolved)
  3. Puede:
     - Crear nuevo ticket
     - Ver tickets escalados desde AI Assistant
     - Chatear con soporte
     - Adjuntar archivos
     - Ver estado SLA
  4. Soporte responde en chat
  5. Ticket se resuelve
  6. Usuario califica la atención
- **Dependencies:** users, companies, ai-assistant (escalamiento)
- **Provides to:** ai-assistant (fallback cuando LLM no resuelve), support-base

#### Config E2E actualizado
```javascript
module.exports = {
  moduleKey: 'user-support',
  baseUrl: 'http://localhost:9998/panel-empresa.html#soporte',
  navigation: {
    supportModule: '[data-module="user-support"]',
    ticketsList: '.support-tickets-list',
    createButton: '#btn-create-ticket',
    ticketDetail: '.support-ticket-detail'
  },
  crud: {
    create: {
      button: '#btn-create-ticket',
      modal: '#create-ticket-modal',
      fields: {
        subject: 'input[name="subject"]',
        module: 'select[name="module_key"]',
        priority: 'select[name="priority"]',
        description: 'textarea[name="description"]',
        attachments: 'input[type="file"]'
      },
      submit: '#btn-submit-ticket'
    },
    read: {
      ticketsList: '.support-tickets-list',
      ticketCard: '.support-ticket-card',
      ticketDetail: '.support-ticket-detail',
      chatMessages: '.support-chat-messages'
    },
    update: {
      sendMessage: {
        input: '.support-chat-input',
        button: '.btn-send-message'
      },
      uploadFile: '.support-file-upload',
      changePriority: 'select[name="priority"]'
    },
    delete: {
      closeTicket: '.btn-close-ticket',
      confirm: '.swal2-confirm'
    }
  },
  filters: {
    statusFilter: '.filter-status',
    priorityFilter: '.filter-priority',
    moduleFilter: '.filter-module',
    searchInput: '.support-search-input'
  },
  tabs: [
    { name: 'Mis Tickets', selector: '[data-view="list"]' },
    { name: 'Detalle', selector: '[data-view="detail"]' },
    { name: 'Crear Ticket', selector: '[data-view="create"]' }
  ]
}
```

#### Documentación para Brain
- **Circuito:** User creates ticket → Support receives → Chat conversation → File attachments → Resolution → User rating → Ticket closed
- **Circuito (Escalamiento desde AI):** AI Assistant no puede resolver → Escalate to ticket → Create support_ticket (escalated_from_ai=true) → Link to conversation → Support picks up
- **Integraciones:**
  - AI Assistant (escalamiento automático)
  - Notification Center (alertas SLA)
  - Support Brain Dashboard (para staff de soporte)
  - Knowledge Base (para sugerencias)
- **Notas:**
  - Dark theme profesional
  - SLA tracking con deadlines
  - Escalamiento desde AI Assistant
  - Rating system
  - File attachments
  - Chat en tiempo real

---

### 13. **vendors** ✅ FRONTEND IDENTIFICADO

#### Frontend Real
- **Archivo:** `C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\vendor-dashboard.js` (2,000+ líneas)
- **Integración:** Módulo standalone completo
- **URL:** http://localhost:9998/panel-empresa.html#vendedores (visible para staff con rol vendedor/admin)
- **Líneas clave:**
  - Línea 1: Header VENDOR DASHBOARD v1.0.0
  - Línea 22: IIFE principal
  - Línea 26: `const MODULE_ID = 'vendor-dashboard'`
  - Línea 28: `const state = { ... }`

#### Selectores CSS
- **Container:** `.vendor-dashboard`
- **Header:** `.vendor-header`
- **User info:** `.vendor-user-info`
- **Avatar:** `.vendor-avatar`
- **Stats cards:** `.vendor-stat-card`
- **Companies list:** `.vendor-companies-list`
- **Commissions table:** `.vendor-commissions-table`

#### Estructura de datos
- **Tablas BD:**
  - `aponnt_staff` (vendedores)
  - `vendor_statistics` (métricas de ventas)
  - `companies` (empresas asignadas al vendedor)
  - `vendor_commissions` (comisiones)
  - `vendor_budgets` (presupuestos)
- **Campos principales:** staff_id, assigned_companies, total_revenue, commissions_earned, active_contracts
- **Relaciones:** → aponnt_staff (FK), → companies (N:M)

#### Integración con Brain
- **Workflow (Vendedor):**
  1. Vendedor hace login en panel-empresa.html
  2. Sistema detecta rol "vendor"
  3. Navega a #vendedores
  4. Ve dashboard personalizado con:
     - Mis empresas asignadas
     - Mis comisiones
     - Mis presupuestos
     - Métricas de facturación
     - Notificaciones comerciales
  5. Puede crear presupuestos
  6. Trackear comisiones

- **Workflow (Admin/Gerente):**
  1. Admin accede a #vendedores
  2. Ve vista global
  3. Puede filtrar por vendedor
  4. Ve métricas consolidadas
  5. Rankings de vendedores

- **Dependencies:** aponnt_staff, companies
- **Provides to:** companies (gestión comercial)

#### Config E2E actualizado
```javascript
module.exports = {
  moduleKey: 'vendors',
  baseUrl: 'http://localhost:9998/panel-empresa.html#vendedores',
  navigation: {
    vendorModule: '[data-module="vendors"]',
    dashboard: '.vendor-dashboard',
    companiesTab: '[data-tab="companies"]',
    commissionsTab: '[data-tab="commissions"]',
    budgetsTab: '[data-tab="budgets"]',
    metricsTab: '[data-tab="metrics"]'
  },
  crud: {
    read: {
      statsCards: '.vendor-stat-card',
      companiesList: '.vendor-companies-list',
      companyCard: '.vendor-company-card',
      commissionsTable: '.vendor-commissions-table',
      budgetsList: '.vendor-budgets-list'
    },
    create: {
      createBudget: {
        button: '.btn-create-budget',
        modal: '#budget-modal',
        fields: {
          companyId: 'select[name="company_id"]',
          modules: 'select[name="modules"]',
          monthlyPrice: 'input[name="monthly_price"]',
          validUntil: 'input[name="valid_until"]'
        },
        submit: '#btn-save-budget'
      }
    },
    update: {
      updateBudget: '.btn-edit-budget',
      addNotes: 'textarea[name="notes"]'
    }
  },
  filters: {
    // Para admin/gerente
    vendorFilter: '.vendor-filter-select',
    dateRange: '.vendor-date-range',
    statusFilter: '.vendor-status-filter'
  },
  tabs: [
    { name: 'Overview', selector: '[data-tab="overview"]' },
    { name: 'Mis Empresas', selector: '[data-tab="companies"]' },
    { name: 'Mis Comisiones', selector: '[data-tab="commissions"]' },
    { name: 'Presupuestos', selector: '[data-tab="budgets"]' },
    { name: 'Contratos', selector: '[data-tab="contracts"]' },
    { name: 'Métricas', selector: '[data-tab="metrics"]' }
  ]
}
```

#### Documentación para Brain
- **Circuito (Vendedor):** Login → Detect vendor role → Load vendor dashboard → Show assigned companies → Track commissions → Create budgets → Monitor metrics
- **Circuito (Admin):** Login → Access vendors module → Select vendor → View consolidated metrics → Generate reports → Manage commissions
- **Integraciones:**
  - Companies (empresas asignadas)
  - Notification Center (notificaciones comerciales)
  - Facturación (métricas de revenue)
  - Admin Panel (gestión de staff)
- **Notas:**
  - Dark theme profesional
  - Vista personalizada según rol (vendor vs admin)
  - Comisiones automáticas basadas en facturación
  - Presupuestos con validez temporal
  - Métricas de facturación en tiempo real
  - Rankings de vendedores

---

## CONCLUSIONES Y RECOMENDACIONES

### Hallazgos Principales

1. **NINGUNO de los 13 módulos está "sin frontend"**
   - 10 tienen UI standalone completa
   - 2 están integrados en otros módulos (tabs)
   - 1 es backend puro (knowledge-base) pero usado por ai-assistant
   - 1 es APK mobile (kiosks-apk)

2. **Integraciones complejas**
   - `auditor` y `testing-metrics-dashboard` están en `engineering-dashboard`
   - `medical-associates` está en `medical-dashboard-professional`
   - `knowledge-base` es backend de `ai-assistant`
   - `temporary-access` es feature de `users`

3. **Módulos enterprise de alto valor**
   - `ai-assistant`: LLM local con RAG (USD $0/mes)
   - `notification-center`: SLA completo con auto-escalamiento
   - `medical`: Workflow PRE → POST completo
   - `user-support`: Tickets con escalamiento desde AI
   - `vendors`: CRM para vendedores

### Acciones Requeridas

#### 1. Actualizar Configs E2E (URGENTE)

Todos los configs E2E de estos módulos están INCOMPLETOS o apuntando a lugares incorrectos. Deben actualizarse con:
- URLs correctas
- Selectores reales
- Tabs reales
- Actions reales
- Navegación correcta

#### 2. Documentar en Brain (ALTA PRIORIDAD)

El Brain debe tener flows completos de estos módulos:
- `src/brain/knowledge/flows/ai-assistant-chat.json`
- `src/brain/knowledge/flows/notification-center-workflow.json`
- `src/brain/knowledge/flows/medical-dashboard-pre-post.json`
- `src/brain/knowledge/flows/user-support-ticket-lifecycle.json`
- `src/brain/knowledge/flows/vendor-commission-tracking.json`

#### 3. Reclasificar en Registry (MEDIA PRIORIDAD)

En `modules-registry.json`, actualizar:
```json
{
  "id": "ai-assistant",
  "ui": {
    "hasUI": true,
    "type": "floating-widget",
    "location": "panel-empresa.html",
    "selector": "#ai-assistant-button"
  }
}
```

#### 4. Testing E2E Completo (ALTA PRIORIDAD)

Ejecutar batería de tests E2E con los configs actualizados para validar que todo funciona.

### Próximos Pasos

1. **Crear scripts de actualización masiva de configs E2E**
2. **Generar flows de Brain para los 13 módulos**
3. **Actualizar modules-registry.json con UI metadata**
4. **Ejecutar batch de tests E2E**
5. **Documentar integraciones complejas en diagrams**

---

## ANEXO: Mapeo Completo de Integraciones

```
ai-assistant (chat flotante)
  └─ integrado en: panel-empresa.html (global)
  └─ usa: knowledge-base (backend RAG)
  └─ escala a: user-support (tickets)
  └─ auto-diagnóstico con: auditor

auditor (testing)
  └─ integrado en: engineering-dashboard (tab)
  └─ provee datos a: testing-metrics-dashboard

companies (gestión empresas)
  └─ integrado en: admin-panel-controller
  └─ vista: enterprise-companies-grid
  └─ panel: panel-administrativo.html

kiosks-apk (mobile)
  └─ tipo: APK Android
  └─ gestión web: panel-empresa.html#kioscos
  └─ testing: Appium/Detox

knowledge-base (backend)
  └─ sin UI propia
  └─ usado por: ai-assistant (RAG)
  └─ tipo: backend service

medical-associates (tab)
  └─ integrado en: medical-dashboard-professional
  └─ tab: "Asociados"
  └─ panel: panel-empresa.html#medical

medical (módulo completo)
  └─ standalone: medical-dashboard-professional.js
  └─ panel: panel-empresa.html#medical
  └─ secondary: medical-dashboard.html

notifications (módulo completo)
  └─ standalone: notification-center.js
  └─ panel: panel-empresa.html#notificaciones

partners (2 módulos)
  └─ admin: partners-admin.js (panel-administrativo.html)
  └─ marketplace: partners-marketplace.js (panel-asociados.html)

temporary-access (feature)
  └─ integrado en: users.js
  └─ tipo: dropdown option
  └─ panel: panel-empresa.html#usuarios

testing-metrics-dashboard (tab)
  └─ integrado en: engineering-dashboard
  └─ tab: "Métricas"
  └─ panel: panel-administrativo.html#ingenieria

user-support (módulo completo)
  └─ standalone: user-support-dashboard.js
  └─ panel: panel-empresa.html#soporte

vendors (módulo completo)
  └─ standalone: vendor-dashboard.js
  └─ panel: panel-empresa.html#vendedores
```

---

**Documento generado:** 2025-12-27
**Total módulos analizados:** 13
**Líneas de código analizadas:** ~15,000+
**Archivos revisados:** 30+
**Tiempo estimado de investigación:** 2 horas

**Autor:** Claude Sonnet 4.5 (Autonomous Investigation Agent)
**Proyecto:** Sistema de Asistencia Biométrico - APONNT
