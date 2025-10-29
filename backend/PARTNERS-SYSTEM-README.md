# 🤝 SISTEMA DE PARTNERS - MARKETPLACE DE SERVICIOS PROFESIONALES

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estado Actual](#estado-actual)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Migración de Base de Datos](#migración-de-base-de-datos)
5. [Modelos Sequelize](#modelos-sequelize)
6. [API REST](#api-rest)
7. [Frontend](#frontend)
8. [Flujos de Trabajo](#flujos-de-trabajo)
9. [Sistema de Comisiones](#sistema-de-comisiones)
10. [Consentimientos Legales](#consentimientos-legales)
11. [Próximos Pasos](#próximos-pasos)

---

## 📊 RESUMEN EJECUTIVO

**Sistema de Marketplace de Partners** integrado en Aponnt para conectar empresas con profesionales especializados.

### Características Principales:
- ✅ **11 tablas relacionales** con 5 triggers automáticos
- ✅ **10 roles de partners** (Abogados, Médicos, Coaches, etc.)
- ✅ **Múltiples modelos de comisión** (por servicio, empleado, módulo, empresa)
- ✅ **Sistema bidireccional de ratings** (1-5 estrellas + comentarios)
- ✅ **Conversaciones con SLA** (deadlines, escalación)
- ✅ **Sistema de mediación** para disputas
- ✅ **Consentimientos legales** con firma digital (SHA256)
- ✅ **Licencias profesionales** (matrículas multi-jurisdicción)
- ✅ **Homepage institucional** con acceso multi-rol

### Alcance:
- **Backend**: Node.js + PostgreSQL + Sequelize
- **Frontend**: HTML + JavaScript modules
- **Seguridad**: JWT + RBAC (6 roles de empresa)
- **Integración**: Aponnt existente (panel-administrativo + panel-empresa)

---

## 🚦 ESTADO ACTUAL

### ✅ COMPLETADO:

1. **Diseño de Base de Datos** - 100%
   - 11 tablas relacionales
   - 5 triggers automáticos
   - Constraints e indexes optimizados
   - JSONB para licencias/certificaciones

2. **Migraciones SQL** - 100%
   - `20251024_partners_part1_base_tables.sql` - Tablas base
   - `20251024_partners_part2_dependent_tables.sql` - Tablas dependientes
   - `20251024_partners_part3_interaction_tables.sql` - Interacciones
   - `20251024_partners_part4_final_and_triggers.sql` - Finales + triggers

3. **Runner Script** - 100%
   - `scripts/run-partners-migration-split.js`

### ⚠️ BLOQUEADO:

1. **Ejecución de Migración** - Requiere intervención manual
   - Error FK persistente: `column "id" referenced in foreign key constraint does not exist`
   - Node.js no puede ejecutar la migración completa en un solo bloque transaccional
   - **Solución**: Ejecutar manualmente vía DBeaver/pgAdmin/psql (ver sección [Migración Manual](#opción-1-migración-manual-vía-dbeaver--pgadmin))

### 🔜 PENDIENTE:

1. **Modelos Sequelize** (11 modelos)
2. **API REST** (endpoints CRUD)
3. **Frontend Admin** (panel-administrativo)
4. **Frontend Empresa** (panel-empresa marketplace)
5. **Formulario Registro Público** (partners)
6. **Sistema de Firma Digital**
7. **Notificaciones en Tiempo Real**

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Diagrama de Tablas:

```
┌─────────────────┐
│  partner_roles  │ (10 roles predefinidos)
└────────┬────────┘
         │
         │ 1:N
         ↓
    ┌──────────┐
    │ partners │ (profesionales registrados)
    └────┬─────┘
         │
         ├── 1:N → partner_documents (licencias, seguros, CVs)
         ├── 1:N → partner_notifications (notificaciones push)
         ├── 1:N → partner_availability (calendario)
         ├── 1:N → partner_service_requests ←─ N:1 ─ companies
         ├── 1:N → partner_reviews (ratings bidireccionales)
         ├── 1:N → partner_mediation_cases (disputas)
         ├── 1:N → partner_legal_consents (firmas digitales)
         └── 1:N → partner_commissions_log (pagos)

    partner_service_requests (solicitudes de servicio)
         │
         └── 1:N → partner_service_conversations (chat SLA)
```

### Tablas del Sistema:

| # | Tabla | Descripción | Rows Estimadas |
|---|-------|-------------|----------------|
| 1 | `partner_roles` | 10 roles profesionales (Abogado, Médico, etc.) | 10 |
| 2 | `partners` | Profesionales registrados | 100-1,000 |
| 3 | `partner_documents` | Documentos subidos (licencias, CVs) | 500-5,000 |
| 4 | `partner_notifications` | Notificaciones push | 10,000-100,000 |
| 5 | `partner_availability` | Disponibilidad (calendario) | 1,000-10,000 |
| 6 | `partner_service_requests` | Solicitudes de servicio | 5,000-50,000 |
| 7 | `partner_reviews` | Ratings bidireccionales | 3,000-30,000 |
| 8 | `partner_service_conversations` | Chat con SLA | 20,000-200,000 |
| 9 | `partner_mediation_cases` | Casos de mediación | 100-1,000 |
| 10 | `partner_legal_consents` | Consentimientos firmados | 500-5,000 |
| 11 | `partner_commissions_log` | Log de comisiones | 10,000-100,000 |

---

## 💾 MIGRACIÓN DE BASE DE DATOS

### OPCIÓN 1: Migración Manual vía DBeaver / pgAdmin

**RECOMENDADO** - Ejecutar las 4 partes manualmente en orden:

#### Paso 1: Abrir DBeaver / pgAdmin

```bash
# Conectar a la base de datos
Host: localhost (o tu host PostgreSQL)
Port: 5432
Database: aponnt (o tu DB name)
User: postgres
Password: <tu password>
```

#### Paso 2: Ejecutar DROP (opcional - si ya existen tablas)

```sql
-- Copiar y ejecutar este SQL primero (opcional)
DROP TABLE IF EXISTS partner_commissions_log CASCADE;
DROP TABLE IF EXISTS partner_legal_consents CASCADE;
DROP TABLE IF EXISTS partner_mediation_cases CASCADE;
DROP TABLE IF EXISTS partner_service_conversations CASCADE;
DROP TABLE IF EXISTS partner_reviews CASCADE;
DROP TABLE IF EXISTS partner_availability CASCADE;
DROP TABLE IF EXISTS partner_service_requests CASCADE;
DROP TABLE IF EXISTS partner_notifications CASCADE;
DROP TABLE IF EXISTS partner_documents CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS partner_roles CASCADE;
```

#### Paso 3: Ejecutar PARTE 1 (Tablas Base)

```bash
# Abrir archivo en DBeaver
C:\Bio\sistema_asistencia_biometrico\backend\migrations\20251024_partners_part1_base_tables.sql

# Click derecho → Execute SQL Script
# O: Ctrl+Enter (seleccionar todo el contenido primero)
```

**Verifica**:
```sql
SELECT COUNT(*) FROM partner_roles; -- Debe retornar 10
SELECT COUNT(*) FROM partners; -- Debe retornar 0
```

#### Paso 4: Ejecutar PARTE 2 (Tablas Dependientes)

```bash
# Abrir archivo
20251024_partners_part2_dependent_tables.sql

# Ejecutar
```

**Verifica**:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'partner_%'
ORDER BY table_name;

-- Debe mostrar 6 tablas hasta ahora
```

#### Paso 5: Ejecutar PARTE 3 (Interacciones)

```bash
# Abrir archivo
20251024_partners_part3_interaction_tables.sql

# Ejecutar
```

**Verifica**:
```sql
-- Debe mostrar 8 tablas ahora
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'partner_%';
```

#### Paso 6: Ejecutar PARTE 4 (Finales + Triggers)

```bash
# Abrir archivo
20251024_partners_part4_final_and_triggers.sql

# Ejecutar
```

**Verifica Tablas**:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'partner_%'
ORDER BY table_name;

-- Debe mostrar 11 tablas
```

**Verifica Triggers**:
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%partner%'
ORDER BY trigger_name;

-- Debe mostrar 5 triggers:
-- 1. trigger_update_partner_rating
-- 2. trigger_increment_partner_services
-- 3. trigger_create_initial_conversation
-- 4. trigger_notify_partner_new_request
-- 5. trigger_partners_updated_at (+ 3 más en otras tablas)
```

#### Paso 7: Verificar Integridad

```sql
-- Test FK constraints
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name LIKE 'partner_%'
ORDER BY tc.table_name;

-- Debe retornar ~15 FKs sin errores
```

---

### OPCIÓN 2: Migración via psql (línea de comandos)

**Si tienes psql instalado**:

```bash
# Conectar a la base de datos
psql -U postgres -d aponnt

# Ejecutar archivos en orden
\i C:/Bio/sistema_asistencia_biometrico/backend/migrations/20251024_partners_part1_base_tables.sql
\i C:/Bio/sistema_asistencia_biometrico/backend/migrations/20251024_partners_part2_dependent_tables.sql
\i C:/Bio/sistema_asistencia_biometrico/backend/migrations/20251024_partners_part3_interaction_tables.sql
\i C:/Bio/sistema_asistencia_biometrico/backend/migrations/20251024_partners_part4_final_and_triggers.sql

# Salir
\q
```

---

### OPCIÓN 3: Convertir a Sequelize Migrations (Futuro)

**Pendiente** - Requiere reescribir en formato Sequelize:

```bash
# Crear migración Sequelize
npx sequelize-cli migration:generate --name create-partners-system

# Editar archivo generado en migrations/
# Dividir en múltiples up() / down() calls
```

---

## 📦 MODELOS SEQUELIZE

Una vez la migración esté ejecutada, crear 11 modelos Sequelize:

### 1. PartnerRole.js

```javascript
// src/models/PartnerRole.js
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class PartnerRole extends Model {
    static associate(models) {
      PartnerRole.hasMany(models.Partner, {
        foreignKey: 'partner_role_id',
        as: 'partners'
      });
    }
  }

  PartnerRole.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    role_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['legal', 'medical', 'safety', 'coaching', 'audit', 'emergency', 'health', 'transport']]
      }
    },
    description: DataTypes.TEXT,
    requires_license: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    requires_insurance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'PartnerRole',
    tableName: 'partner_roles',
    timestamps: false
  });

  return PartnerRole;
};
```

### 2. Partner.js

```javascript
// src/models/Partner.js
const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  class Partner extends Model {
    static associate(models) {
      Partner.belongsTo(models.PartnerRole, {
        foreignKey: 'partner_role_id',
        as: 'role'
      });

      Partner.hasMany(models.PartnerDocument, {
        foreignKey: 'partner_id',
        as: 'documents'
      });

      Partner.hasMany(models.PartnerServiceRequest, {
        foreignKey: 'partner_id',
        as: 'serviceRequests'
      });

      Partner.hasMany(models.PartnerReview, {
        foreignKey: 'partner_id',
        as: 'reviews'
      });

      Partner.hasMany(models.PartnerAvailability, {
        foreignKey: 'partner_id',
        as: 'availability'
      });

      Partner.hasMany(models.PartnerNotification, {
        foreignKey: 'partner_id',
        as: 'notifications'
      });

      Partner.hasMany(models.PartnerCommissionLog, {
        foreignKey: 'partner_id',
        as: 'commissions'
      });
    }

    // Instance method: verify password
    async verifyPassword(password) {
      return bcrypt.compare(password, this.password_hash);
    }

    // Class method: hash password
    static async hashPassword(password) {
      return bcrypt.hash(password, 10);
    }
  }

  Partner.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    partner_role_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    // Personal Info
    first_name: DataTypes.STRING(100),
    last_name: DataTypes.STRING(100),
    phone: DataTypes.STRING(20),
    mobile: DataTypes.STRING(20),
    profile_photo_url: DataTypes.TEXT,
    bio: DataTypes.TEXT,
    languages: DataTypes.ARRAY(DataTypes.STRING),

    // Professional Info
    professional_licenses: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    education: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    certifications: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    experience_years: DataTypes.INTEGER,
    specialties: DataTypes.ARRAY(DataTypes.STRING),

    // Business Model
    contract_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'per_service',
      validate: {
        isIn: [['per_service', 'eventual', 'part_time', 'full_time']]
      }
    },
    commission_calculation: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'per_module_user',
      validate: {
        isIn: [['per_module_user', 'per_employee', 'per_company', 'per_service']]
      }
    },
    commission_percentage: DataTypes.DECIMAL(5, 2),
    fixed_monthly_rate: DataTypes.DECIMAL(10, 2),
    fixed_per_employee_rate: DataTypes.DECIMAL(10, 2),

    // Location
    city: DataTypes.STRING(100),
    province: DataTypes.STRING(100),
    country: {
      type: DataTypes.STRING(2),
      defaultValue: 'AR'
    },
    service_area: DataTypes.ARRAY(DataTypes.STRING),

    // Ratings
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 5
      }
    },
    total_reviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_services: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    // Status
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'approved', 'active', 'suspended', 'inactive']]
      }
    },
    approved_at: DataTypes.DATE,
    approved_by: DataTypes.INTEGER,

    // Timestamps
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Partner',
    tableName: 'partners',
    timestamps: false,
    hooks: {
      beforeCreate: async (partner) => {
        if (partner.password_hash && !partner.password_hash.startsWith('$2')) {
          partner.password_hash = await Partner.hashPassword(partner.password_hash);
        }
      }
    }
  });

  return Partner;
};
```

### 3-11. Modelos Restantes (Resumen)

```javascript
// 3. PartnerDocument.js - Documentos subidos
// 4. PartnerNotification.js - Notificaciones
// 5. PartnerAvailability.js - Calendario
// 6. PartnerServiceRequest.js - Solicitudes de servicio
// 7. PartnerReview.js - Ratings bidireccionales
// 8. PartnerServiceConversation.js - Chat con SLA
// 9. PartnerMediationCase.js - Mediación
// 10. PartnerLegalConsent.js - Consentimientos
// 11. PartnerCommissionLog.js - Comisiones
```

**Ubicación**: `src/models/` (crear todos los archivos)

**Registrar en**: `src/config/database.js`

```javascript
// src/config/database.js
const PartnerRole = require('./models/PartnerRole')(sequelize);
const Partner = require('./models/Partner')(sequelize);
const PartnerDocument = require('./models/PartnerDocument')(sequelize);
// ... (agregar todos los modelos)

// Asociaciones
Object.keys(sequelize.models).forEach(modelName => {
  if (sequelize.models[modelName].associate) {
    sequelize.models[modelName].associate(sequelize.models);
  }
});

module.exports = { sequelize, ...sequelize.models };
```

---

## 🌐 API REST

### Endpoints Principales:

#### Partners (CRUD Básico)

```javascript
// src/routes/partnerRoutes.js

// PUBLIC - Registro de partners
POST   /api/partners/register
Body: { email, password, partner_role_id, first_name, last_name, ... }
Response: 201 { partner_id, message: "Registro exitoso" }

// PUBLIC - Login de partners
POST   /api/partners/login
Body: { email, password }
Response: 200 { token, partner: {...} }

// ADMIN - Listar partners
GET    /api/partners
Query: ?status=pending&role_id=1&limit=50
Auth: Admin only
Response: 200 { partners: [...], total, page }

// ADMIN - Aprobar partner
PUT    /api/partners/:id/approve
Auth: Admin only
Response: 200 { message: "Partner aprobado" }

// PARTNER - Ver perfil propio
GET    /api/partners/me
Auth: Partner JWT
Response: 200 { partner: {...} }

// PARTNER - Actualizar perfil
PUT    /api/partners/me
Auth: Partner JWT
Body: { bio, phone, specialties, ... }
Response: 200 { partner: {...} }
```

#### Service Requests (Solicitudes)

```javascript
// EMPRESA - Crear solicitud de servicio
POST   /api/partners/service-requests
Auth: Company user JWT
Body: {
  partner_id: 15,
  service_type: "Auditoría de Seguridad",
  service_description: "Necesitamos auditoría completa",
  requested_date: "2025-01-30",
  is_urgent: false
}
Response: 201 { request_id, message: "Solicitud creada" }

// PARTNER - Listar solicitudes recibidas
GET    /api/partners/service-requests
Auth: Partner JWT
Query: ?status=pending
Response: 200 { requests: [...] }

// PARTNER - Responder solicitud
PUT    /api/partners/service-requests/:id/respond
Auth: Partner JWT
Body: {
  action: "accept", // o "decline"
  partner_response: "Confirmo disponibilidad",
  quoted_price: 50000
}
Response: 200 { message: "Solicitud aceptada" }

// EMPRESA - Ver solicitudes propias
GET    /api/partners/service-requests/my-company
Auth: Company user JWT
Response: 200 { requests: [...] }
```

#### Reviews (Ratings Bidireccionales)

```javascript
// EMPRESA - Calificar partner
POST   /api/partners/:partnerId/reviews
Auth: Company user JWT
Body: {
  service_request_id: 123,
  rating: 5,
  professionalism_rating: 5,
  quality_rating: 5,
  comment: "Excelente servicio"
}
Response: 201 { review_id }

// PARTNER - Responder review
PUT    /api/partners/reviews/:id/respond
Auth: Partner JWT
Body: {
  partner_response: "Gracias por la confianza"
}
Response: 200 { message: "Respuesta publicada" }

// PUBLIC - Ver reviews de partner
GET    /api/partners/:id/reviews
Response: 200 { reviews: [...], average_rating: 4.8 }
```

#### Conversations (Chat)

```javascript
// Enviar mensaje
POST   /api/partners/conversations/:requestId/messages
Auth: Partner o Company user JWT
Body: {
  message: "¿A qué hora puedo asistir?",
  is_urgent: false
}
Response: 201 { message_id }

// Listar conversación
GET    /api/partners/conversations/:requestId
Auth: Partner o Company user JWT
Response: 200 { messages: [...] }
```

#### Mediation (Disputas)

```javascript
// Abrir caso de mediación
POST   /api/partners/mediation
Auth: Partner o Company user JWT
Body: {
  service_request_id: 123,
  case_type: "payment_dispute",
  description: "No se realizó el pago acordado",
  evidence_urls: ["https://..."]
}
Response: 201 { case_id }

// ADMIN - Resolver caso
PUT    /api/partners/mediation/:id/resolve
Auth: Admin only
Body: {
  resolution: "Se acordó pago en 2 cuotas",
  outcome: "mutual_agreement",
  refund_amount: 10000
}
Response: 200 { message: "Caso resuelto" }
```

---

## 🎨 FRONTEND

### 1. Panel Administrativo (Admin)

**Ubicación**: `public/panel-administrativo.html`

**Nueva sección**: "Partners Marketplace"

**Funcionalidades**:
- ✅ Listar partners (pending, approved, suspended)
- ✅ Aprobar/rechazar registros
- ✅ Ver documentos subidos (licencias, seguros)
- ✅ Verificar documentos
- ✅ Ver estadísticas (total partners, por rol, rating promedio)
- ✅ Gestionar casos de mediación
- ✅ Ver log de comisiones

**Archivo JS**: `public/js/modules/partners-admin.js`

**Mockup HTML**:
```html
<!-- En panel-administrativo.html -->
<section id="partners-section" style="display:none;">
  <div class="partners-header">
    <h2>Partners Marketplace</h2>
    <button onclick="PartnersAdmin.openStats()">📊 Estadísticas</button>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button class="tab active" data-tab="pending">⏳ Pendientes (15)</button>
    <button class="tab" data-tab="approved">✅ Aprobados (87)</button>
    <button class="tab" data-tab="documents">📄 Documentos</button>
    <button class="tab" data-tab="mediation">⚖️ Mediación (3)</button>
    <button class="tab" data-tab="commissions">💰 Comisiones</button>
  </div>

  <!-- Tab: Pendientes -->
  <div class="tab-content active" id="tab-pending">
    <table class="partners-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Email</th>
          <th>Rol</th>
          <th>Fecha Registro</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="pending-partners-list">
        <!-- Cargado dinámicamente -->
      </tbody>
    </table>
  </div>

  <!-- Modal: Detalles de Partner -->
  <div id="partner-details-modal" class="modal" style="display:none;">
    <!-- ... -->
  </div>
</section>
```

---

### 2. Panel Empresa (Marketplace)

**Ubicación**: `public/panel-empresa.html`

**Nueva sección**: "Marketplace de Servicios"

**Funcionalidades**:
- ✅ Buscar partners (por rol, rating, ubicación)
- ✅ Ver perfiles de partners
- ✅ Solicitar servicio
- ✅ Chat con partner (conversaciones)
- ✅ Calificar servicios completados
- ✅ Ver historial de servicios
- ✅ Abrir casos de mediación

**Archivo JS**: `public/js/modules/partners-marketplace.js`

**Mockup HTML**:
```html
<!-- En panel-empresa.html -->
<section id="marketplace-section" style="display:none;">
  <div class="marketplace-header">
    <h2>🤝 Marketplace de Servicios Profesionales</h2>
    <input type="search" id="search-partners" placeholder="Buscar por nombre, especialidad...">
    <select id="filter-role">
      <option value="">Todos los roles</option>
      <option value="1">Abogados</option>
      <option value="2">Médicos</option>
      <!-- ... -->
    </select>
  </div>

  <!-- Grid de Partners -->
  <div class="partners-grid">
    <!-- Partner Card -->
    <div class="partner-card" data-partner-id="15">
      <img src="/uploads/partners/15/photo.jpg" alt="Dr. Juan Pérez">
      <h3>Dr. Juan Pérez</h3>
      <p class="role">Médico Laboral</p>
      <div class="rating">
        ⭐⭐⭐⭐⭐ 4.9 (87 reviews)
      </div>
      <p class="bio">Especialista en medicina laboral con 15 años...</p>
      <button onclick="PartnersMarketplace.viewProfile(15)">Ver Perfil</button>
      <button onclick="PartnersMarketplace.requestService(15)" class="primary">Solicitar Servicio</button>
    </div>
    <!-- Más cards... -->
  </div>

  <!-- Modal: Solicitar Servicio -->
  <div id="request-service-modal" class="modal" style="display:none;">
    <form id="request-service-form">
      <h3>Solicitar Servicio</h3>
      <label>Tipo de servicio:</label>
      <input type="text" name="service_type" required>

      <label>Descripción:</label>
      <textarea name="service_description" rows="5" required></textarea>

      <label>Fecha deseada:</label>
      <input type="date" name="requested_date">

      <label>
        <input type="checkbox" name="is_urgent"> Es urgente
      </label>

      <button type="submit">Enviar Solicitud</button>
    </form>
  </div>

  <!-- Modal: Chat (Conversaciones) -->
  <div id="chat-modal" class="modal" style="display:none;">
    <!-- ... -->
  </div>
</section>
```

---

### 3. Formulario de Registro Público (Partners)

**Ubicación**: `public/partner-register.html` (nueva página)

**Acceso**: URL pública (sin login)

**Funcionalidades**:
- ✅ Registro en 3 pasos:
  1. Datos personales + email/password
  2. Información profesional (licencias, experiencia)
  3. Modelo de negocio (comisión, disponibilidad)
- ✅ Upload de documentos (DNI, matrícula, seguro)
- ✅ Firma digital de consentimientos legales
- ✅ Preview de términos y condiciones
- ✅ Estado de aprobación (pending → approved)

**Archivo**: `public/partner-register.html`

**JS**: `public/js/modules/partner-registration.js`

---

## 🔄 FLUJOS DE TRABAJO

### Flujo 1: Registro de Partner

```
1. Partner accede a /partner-register.html
2. Completa formulario (3 pasos)
3. Sube documentos (DNI, matrícula, seguro)
4. Firma consentimientos digitalmente (SHA256)
5. Sistema crea registro con status = 'pending'
6. Admin recibe notificación
7. Admin revisa documentos en panel-administrativo
8. Admin aprueba → status = 'approved'
9. Partner recibe email de bienvenida
10. Partner puede recibir solicitudes
```

### Flujo 2: Solicitud de Servicio

```
1. Empresa busca en Marketplace
2. Empresa ve perfil de partner
3. Empresa click "Solicitar Servicio"
4. Empresa completa formulario (tipo, descripción, fecha)
5. Sistema crea service_request (status = 'pending')
6. Trigger crea notificación para partner
7. Partner recibe notificación push
8. Partner revisa solicitud
9. Partner responde: "aceptar" o "declinar"
10a. Si acepta → status = 'accepted', cotiza precio
10b. Si declina → status = 'declined', indica razón
11. Empresa recibe notificación de respuesta
12. Si aceptó: coordinan detalles via chat
```

### Flujo 3: Calificación Bidireccional

```
1. Servicio se marca como 'completed'
2. Sistema habilita rating para empresa
3. Empresa califica partner (1-5 estrellas + comentario)
4. Trigger actualiza rating promedio del partner
5. Partner recibe notificación de nueva review
6. Partner puede responder públicamente
7. (Opcional) Partner califica a la empresa
```

### Flujo 4: Mediación de Disputa

```
1. Empresa o Partner abre caso de mediación
2. Sistema crea mediation_case (status = 'open')
3. Ambas partes pueden adjuntar evidencia
4. Admin/Mediador recibe notificación
5. Admin revisa evidencia de ambas partes
6. Admin propone resolución
7. Ambas partes aceptan o rechazan
8a. Si aceptan → caso resuelto (status = 'resolved')
8b. Si rechazan → escalación a arbitraje externo
9. Sistema ejecuta acciones (reembolsos, compensaciones)
10. Caso se cierra (status = 'closed')
```

---

## 💰 SISTEMA DE COMISIONES

### Modelos de Comisión:

| Modelo | Descripción | Ejemplo |
|--------|-------------|---------|
| `per_module_user` | % por usuario contratado en cada módulo | 10% de $500/usuario = $50/usuario |
| `per_employee` | Monto fijo por empleado total de la empresa | $100/empleado × 50 empleados = $5,000/mes |
| `per_company` | Monto fijo mensual por empresa | $10,000/mes independiente de empleados |
| `per_service` | Cobro por servicio puntual | $5,000 por auditoría única |

### Cálculo Automático:

**Trigger en Part 4**: Cuando se completa un servicio, se registra en `partner_commissions_log`:

```sql
-- Ejemplo de comisión registrada automáticamente
INSERT INTO partner_commissions_log (
  partner_id,
  service_request_id,
  company_id,
  calculation_method,
  base_amount,
  commission_percentage,
  commission_amount,
  payment_status
) VALUES (
  15, -- partner_id
  123, -- service_request_id
  11, -- company_id
  'per_service',
  50000.00, -- base_amount (precio del servicio)
  NULL, -- no es porcentual
  50000.00, -- commission_amount (100% del servicio)
  'pending'
);
```

### Pago de Comisiones:

**Manual** (por ahora):
1. Admin ve log en panel-administrativo
2. Admin filtra por `payment_status = 'pending'`
3. Admin marca como 'paid' manualmente
4. Admin ingresa `payment_reference` (número de transferencia)

**Futuro** (automatizado):
- Integración con MercadoPago API
- Pagos automáticos el día 5 de cada mes
- Notificaciones de pago a partners

---

## 📜 CONSENTIMIENTOS LEGALES

### Firma Digital con SHA256:

Cuando un partner se registra, debe firmar 4 documentos:

1. **Términos de Servicio** (terms_of_service)
2. **Política de Privacidad** (privacy_policy)
3. **Acuerdo de Comisión** (commission_agreement)
4. **Renuncia de Responsabilidad** (liability_waiver)

### Proceso de Firma:

```javascript
// Frontend: partner-registration.js
async function signConsent(consentType, consentText, consentVersion) {
  const partner_id = 15; // ID del partner recién registrado
  const timestamp = new Date().toISOString();
  const ip = await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => d.ip);
  const userAgent = navigator.userAgent;

  // Calcular hash del texto
  const consentTextHash = await sha256(consentText);

  // Calcular firma digital
  const signaturePayload = `${consentText}${partner_id}${timestamp}${process.env.SECRET_KEY}`;
  const digitalSignature = await sha256(signaturePayload);

  // Enviar a backend
  await fetch('/api/partners/legal-consents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partner_id,
      consent_type: consentType,
      consent_version: consentVersion,
      digital_signature: digitalSignature,
      signature_ip: ip,
      user_agent: userAgent,
      consent_text: consentText,
      consent_text_hash: consentTextHash
    })
  });
}

// Helper: SHA256
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### Verificación de Integridad:

**Backend** puede verificar que el consentimiento NO fue alterado:

```javascript
// Backend: partnerRoutes.js
async function verifyConsent(consentId) {
  const consent = await PartnerLegalConsent.findByPk(consentId);

  // Recalcular hash del texto
  const currentHash = crypto.createHash('sha256').update(consent.consent_text).digest('hex');

  // Comparar con hash almacenado
  if (currentHash !== consent.consent_text_hash) {
    throw new Error('Consent text has been tampered with!');
  }

  // Recalcular firma digital
  const signaturePayload = `${consent.consent_text}${consent.partner_id}${consent.signature_timestamp}${process.env.SECRET_KEY}`;
  const expectedSignature = crypto.createHash('sha256').update(signaturePayload).digest('hex');

  if (expectedSignature !== consent.digital_signature) {
    throw new Error('Digital signature is invalid!');
  }

  return { valid: true, signed_at: consent.signature_timestamp };
}
```

---

## 🚀 PRÓXIMOS PASOS

### Paso 1: Ejecutar Migración ✅

**Acción**: Ejecutar las 4 partes SQL manualmente (ver sección [Migración Manual](#opción-1-migración-manual-vía-dbeaver--pgadmin))

**Tiempo estimado**: 15 minutos

**Verificación**:
```sql
SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'partner_%';
-- Debe retornar 11 tablas
```

---

### Paso 2: Crear Modelos Sequelize

**Acción**: Crear 11 archivos en `src/models/`:
1. PartnerRole.js
2. Partner.js
3. PartnerDocument.js
4. PartnerNotification.js
5. PartnerAvailability.js
6. PartnerServiceRequest.js
7. PartnerReview.js
8. PartnerServiceConversation.js
9. PartnerMediationCase.js
10. PartnerLegalConsent.js
11. PartnerCommissionLog.js

**Registrar en**: `src/config/database.js`

**Tiempo estimado**: 2-3 horas

---

### Paso 3: Crear API REST

**Acción**: Crear `src/routes/partnerRoutes.js` con ~20 endpoints

**Tiempo estimado**: 4-6 horas

**Estructura**:
```javascript
const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Public routes
router.post('/register', partnerController.register);
router.post('/login', partnerController.login);

// Partner routes
router.get('/me', authenticate, partnerController.getProfile);
router.put('/me', authenticate, partnerController.updateProfile);

// Admin routes
router.get('/', authenticate, authorizeRoles(['admin']), partnerController.listAll);
router.put('/:id/approve', authenticate, authorizeRoles(['admin']), partnerController.approve);

// Service requests
router.post('/service-requests', authenticate, serviceRequestController.create);
router.put('/service-requests/:id/respond', authenticate, serviceRequestController.respond);

// Reviews
router.post('/:partnerId/reviews', authenticate, reviewController.create);

// Mediation
router.post('/mediation', authenticate, mediationController.create);

// ... más endpoints

module.exports = router;
```

**Registrar en**: `server.js`
```javascript
app.use('/api/partners', require('./src/routes/partnerRoutes'));
```

---

### Paso 4: Frontend Admin (panel-administrativo.html)

**Acción**:
1. Agregar sección "Partners Marketplace" en HTML
2. Crear `public/js/modules/partners-admin.js`
3. Implementar tabs: Pendientes, Aprobados, Documentos, Mediación, Comisiones

**Tiempo estimado**: 6-8 horas

---

### Paso 5: Frontend Empresa (panel-empresa.html)

**Acción**:
1. Agregar sección "Marketplace de Servicios"
2. Crear `public/js/modules/partners-marketplace.js`
3. Implementar búsqueda, grid de partners, modals

**Tiempo estimado**: 6-8 horas

---

### Paso 6: Formulario Registro Público

**Acción**:
1. Crear `public/partner-register.html`
2. Crear `public/js/modules/partner-registration.js`
3. Implementar formulario de 3 pasos con firma digital

**Tiempo estimado**: 4-6 horas

---

### Paso 7: Sistema de Notificaciones Real-Time

**Acción**:
1. Integrar Socket.IO para partners
2. Emitir eventos: `partner:new_service_request`, `partner:review_received`
3. Mostrar notificaciones en tiempo real

**Tiempo estimado**: 3-4 horas

---

### Paso 8: Testing End-to-End

**Acción**:
1. Crear `PartnersCollector.js` en `src/auditor/collectors/`
2. Implementar 15 tests:
   - Partner registration flow
   - Service request creation
   - Service accept/decline
   - Review creation
   - Mediation workflow
   - Commission calculation

**Tiempo estimado**: 3-4 horas

---

## 📊 ESTIMACIÓN TOTAL

| Fase | Tiempo Estimado |
|------|-----------------|
| 1. Migración BD (manual) | 15 minutos |
| 2. Modelos Sequelize | 2-3 horas |
| 3. API REST | 4-6 horas |
| 4. Frontend Admin | 6-8 horas |
| 5. Frontend Empresa | 6-8 horas |
| 6. Registro Público | 4-6 horas |
| 7. Real-Time | 3-4 horas |
| 8. Testing | 3-4 horas |
| **TOTAL** | **29-40 horas** |

---

## 📞 CONTACTO Y SOPORTE

**Documentación adicional**:
- Ver comentarios en archivos SQL para detalles técnicos
- Consultar CLAUDE.md para comandos rápidos
- Revisar backend/docs/ para más información

**Próxima sesión**:
1. Ejecutar migración manual
2. Confirmar que 11 tablas fueron creadas
3. Continuar con Modelos Sequelize

---

**Fin del documento** 🎉
