# ANÁLISIS DE BASE DE DATOS - TABs 2-9
## COMPARATIVA: CAMPOS EXISTENTES VS CAMPOS FALTANTES

**Fecha**: 2025-01-17
**Migración base**: `20250128_complete_user_profile_system.sql`
**Estado**: 70% implementado - Falta TAB 2 completo y TAB 8 completo

---

## ✅ TAB 1 - ADMINISTRACIÓN

**Estado**: 100% COMPLETO (Blindado en `BLINDAJE-TAB1.md`)

**Tabla**: `users`
- `role` ✅
- `is_active` ✅
- `default_branch_id` ✅
- `authorized_branches` ✅
- `department_id` ✅
- `can_authorize_late_arrivals` ✅
- `authorized_departments` ✅
- `shift_id` ⚠️ Campo existe pero no implementado en UI
- `gps_enabled` ✅
- `has_flexible_schedule` ✅

---

## ⚠️ TAB 2 - DATOS PERSONALES

**Estado**: 40% COMPLETO - Faltan campos específicos de documentación

### SECCIÓN 1: Información Personal Básica

**Tabla**: `users`
| Campo | Estado | Comentario |
|-------|--------|------------|
| `firstName` | ✅ | Ya existe |
| `lastName` | ✅ | Ya existe |
| `dni` | ✅ | Ya existe |
| `cuil` | ✅ | Ya existe |
| `birthDate` | ✅ | Ya existe |
| `address` | ✅ | Ya existe |
| `phone` | ✅ | Ya existe |
| `email` | ✅ | Ya existe |
| `whatsapp_number` | ✅ | Ya existe |

### SECCIÓN 2: Datos de Contacto Ampliado

**Tabla**: `users` - **FALTAN CAMPOS**
| Campo Faltante | Tipo | Necesario |
|----------------|------|-----------|
| `secondary_phone` | VARCHAR(20) | ❌ AGREGAR |
| `home_phone` | VARCHAR(20) | ❌ AGREGAR |
| `city` | VARCHAR(100) | ⚠️ Existe en companies pero NO en users |
| `province` | VARCHAR(100) | ⚠️ Existe en companies pero NO en users |
| `postal_code` | VARCHAR(10) | ❌ AGREGAR |
| `neighborhood` | VARCHAR(100) | ❌ AGREGAR |
| `street` | VARCHAR(255) | ❌ AGREGAR (address es TEXT sin estructura) |
| `street_number` | VARCHAR(20) | ❌ AGREGAR |
| `floor_apt` | VARCHAR(20) | ❌ AGREGAR |

### SECCIÓN 3: Obra Social / Prepaga

**Tabla**: `users` - **FALTAN CAMPOS**
| Campo Faltante | Tipo | Necesario |
|----------------|------|-----------|
| `health_insurance_provider` | VARCHAR(255) | ❌ AGREGAR |
| `health_insurance_plan` | VARCHAR(255) | ❌ AGREGAR |
| `health_insurance_number` | VARCHAR(100) | ❌ AGREGAR |
| `health_insurance_expiry` | DATE | ❌ AGREGAR (con vencimiento) |

### SECCIÓN 4: Educación

**Tabla**: `user_education` ✅ **YA EXISTE COMPLETA**
- education_level, institution_name, degree_title, field_of_study
- start_date, end_date, graduated, certificate_file_url

### SECCIÓN 5: Documentos Personales

#### DNI/Documento
**Tabla**: `user_documents` ✅ **EXISTE PARCIALMENTE**
- Campos existentes: document_type, document_number, issue_date, expiration_date, file_url
- **FALTAN CAMPOS ESPECÍFICOS PARA TAB 2**:

| Campo Faltante | Tipo | Necesario |
|----------------|------|-----------|
| `dni_front_photo_url` | TEXT | ❌ AGREGAR (foto frente DNI) |
| `dni_back_photo_url` | TEXT | ❌ AGREGAR (foto dorso DNI) |
| `dni_expiry_date` | DATE | ⚠️ Usar expiration_date en user_documents |

#### Pasaporte
**Tabla**: `user_documents` ✅ **EXISTE PARCIALMENTE**
| Campo Específico | Tipo | Necesario |
|------------------|------|-----------|
| `passport_number` | VARCHAR(50) | ⚠️ Usar document_number |
| `passport_country` | VARCHAR(100) | ❌ AGREGAR |
| `passport_issue_date` | DATE | ⚠️ Usar issue_date |
| `passport_expiry_date` | DATE | ⚠️ Usar expiration_date |
| `passport_page1_url` | TEXT | ❌ AGREGAR |
| `passport_page2_url` | TEXT | ❌ AGREGAR |

#### Visa de Trabajo
| Campo Específico | Tipo | Necesario |
|------------------|------|-----------|
| `visa_type` | VARCHAR(100) | ❌ AGREGAR |
| `visa_country` | VARCHAR(100) | ❌ AGREGAR |
| `visa_number` | VARCHAR(100) | ❌ AGREGAR |
| `visa_expiry_date` | DATE | ⚠️ Usar expiration_date |
| `visa_document_url` | TEXT | ❌ AGREGAR |

#### Licencias de Conducir

**Tabla NUEVA**: `user_driver_licenses` ❌ **NO EXISTE - CREAR**

```sql
CREATE TABLE user_driver_licenses (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    license_type VARCHAR(50) NOT NULL CHECK (license_type IN ('nacional', 'internacional', 'pasajeros')),
    license_number VARCHAR(100),
    license_class VARCHAR(20), -- A, B, C, D, etc.
    issue_date DATE,
    expiry_date DATE, -- 🔔 VENCIMIENTO - Sistema de alertas
    photo_url TEXT,
    issuing_authority VARCHAR(255),
    restrictions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Licencias Profesionales

**Tabla NUEVA**: `user_professional_licenses` ❌ **NO EXISTE - CREAR**

```sql
CREATE TABLE user_professional_licenses (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    license_name VARCHAR(255) NOT NULL,
    issuing_body VARCHAR(255),
    license_number VARCHAR(100),
    issue_date DATE,
    expiry_date DATE, -- 🔔 VENCIMIENTO - Sistema de alertas
    certificate_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    renewal_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ⚠️ TAB 3 - ANTECEDENTES LABORALES

**Estado**: 60% COMPLETO - Falta afiliación sindical y antecedentes legales

### SECCIÓN 1: Historial Laboral

**Tabla**: `user_work_history` ✅ **EXISTE COMPLETA**
- company_name, position, start_date, end_date, currently_working
- reason_for_leaving, responsibilities, supervisor_name, supervisor_contact

**NOTA**: La tabla tiene campos comentados (líneas 62-279) para:
- Detalles de desvinculación (termination_type, notice_period, etc.)
- Indemnización/liquidación
- Acuerdos extrajudiciales
- Información de litigios

**DECISIÓN**: ⚠️ Descomentar estos campos en una migración aparte si el TAB 3 los necesita

### SECCIÓN 2: Antecedentes Legales/Judiciales

**Tabla NUEVA**: `user_legal_issues` ❌ **NO EXISTE - CREAR**

```sql
CREATE TABLE user_legal_issues (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    issue_type VARCHAR(100) NOT NULL CHECK (issue_type IN ('penal', 'civil', 'laboral', 'comercial', 'otro')),
    case_number VARCHAR(100),
    court VARCHAR(255),
    filing_date DATE,
    resolution_date DATE,
    status VARCHAR(50) CHECK (status IN ('en_tramite', 'resuelto', 'archivado', 'desestimado')),
    description TEXT,
    outcome TEXT,
    affects_employment BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### SECCIÓN 3: Afiliación Sindical

**Tabla NUEVA**: `user_union_affiliation` ❌ **NO EXISTE - CREAR**

```sql
CREATE TABLE user_union_affiliation (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    union_name VARCHAR(255) NOT NULL,
    membership_number VARCHAR(100),
    affiliation_date DATE NOT NULL,
    resignation_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    delegate_role VARCHAR(100), -- 'delegado', 'subdelegado', 'miembro', etc.
    monthly_dues DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ✅ TAB 4 - GRUPO FAMILIAR

**Estado**: 100% COMPLETO

### SECCIÓN 1: Estado Civil y Cónyuge
**Tabla**: `user_marital_status` ✅ **EXISTE COMPLETA**

### SECCIÓN 2: Hijos
**Tabla**: `user_children` ✅ **EXISTE COMPLETA**

### SECCIÓN 3: Otros Familiares
**Tabla**: `user_family_members` ✅ **EXISTE COMPLETA**

---

## ✅ TAB 5 - ANTECEDENTES MÉDICOS

**Estado**: 95% COMPLETO - Solo falta contacto de emergencia médico

### TABLAS EXISTENTES ✅

1. `user_primary_physician` - Médico de cabecera
2. `user_chronic_conditions` - Enfermedades crónicas
3. `user_medications` - Medicamentos actuales
4. `user_allergies` - Alergias
5. `user_activity_restrictions` - Restricciones de actividad
6. `user_work_restrictions` - Restricciones laborales
7. `user_vaccinations` - Vacunas
8. `user_medical_exams` - Exámenes médicos
9. `user_medical_documents` - Documentos médicos

### CAMPO FALTANTE: Contacto de Emergencia Médico

**Tabla**: `users` - Campo `emergency_contact` existe como JSONB ✅

**Estructura sugerida del JSON**:
```json
{
  "name": "Juan Pérez",
  "relationship": "Hermano",
  "phone": "+54 9 11 1234-5678",
  "phone_secondary": "+54 11 4567-8901",
  "address": "Calle Falsa 123",
  "is_medical_emergency": true
}
```

### SECCIÓN ADICIONAL: Salud Mental

**Tabla**: `employee_medical_records` ✅ **YA EXISTE PARCIALMENTE**

Campos existentes:
- `smokingStatus`
- `alcoholConsumption`
- `exerciseFrequency`
- `usesGlasses` (importante para biometría)

**FALTAN CAMPOS**:
| Campo Faltante | Tipo | Necesario |
|----------------|------|-----------|
| `mental_health_status` | VARCHAR(50) | ❌ AGREGAR |
| `requires_mental_health_followup` | BOOLEAN | ❌ AGREGAR |
| `mental_health_notes` | TEXT | ❌ AGREGAR |
| `stress_level` | VARCHAR(50) | ❌ AGREGAR |

---

## ✅ TAB 6 - ASISTENCIAS/PERMISOS

**Estado**: 100% COMPLETO

### SECCIÓN 1: Historial de Asistencias
**Tabla**: `attendance` ✅ **YA EXISTE** (sistema principal)

### SECCIÓN 2: Solicitudes de Permisos
**Tabla**: `user_permission_requests` ✅ **EXISTE COMPLETA**

---

## ✅ TAB 7 - DISCIPLINARIOS

**Estado**: 100% COMPLETO

**Tabla**: `user_disciplinary_actions` ✅ **EXISTE COMPLETA**

---

## ❌ TAB 8 - CONFIG. TAREAS

**Estado**: 0% COMPLETO - NO IMPLEMENTADO

**Tabla NUEVA**: `company_tasks` ❌ **NO EXISTE - CREAR**

```sql
CREATE TABLE company_tasks (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    task_name VARCHAR(255) NOT NULL,
    task_description TEXT,
    task_category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Tabla NUEVA**: `user_assigned_tasks` ❌ **NO EXISTE - CREAR**

```sql
CREATE TABLE user_assigned_tasks (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    task_id INTEGER NOT NULL REFERENCES company_tasks(id),
    assigned_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_progreso', 'completada', 'cancelada')),
    priority VARCHAR(50) CHECK (priority IN ('baja', 'media', 'alta', 'urgente')),
    completion_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Tabla NUEVA**: `user_salary_config` ❌ **NO EXISTE - CREAR**

```sql
CREATE TABLE user_salary_config (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    base_salary DECIMAL(12,2),
    salary_currency VARCHAR(10) DEFAULT 'ARS',
    payment_frequency VARCHAR(50) CHECK (payment_frequency IN ('mensual', 'quincenal', 'semanal')),
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    cbu VARCHAR(22),
    alias_cbu VARCHAR(100),
    payment_method VARCHAR(50) CHECK (payment_method IN ('transferencia', 'cheque', 'efectivo')),
    bonuses JSONB, -- Array de bonos
    deductions JSONB, -- Array de descuentos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ✅ TAB 9 - REGISTRO BIOMÉTRICO

**Estado**: 100% COMPLETO

**Tabla**: `users`
- `hasFingerprint` ✅
- `hasFacialData` ✅
- `biometricLastUpdated` ✅
- `biometricPhotoUrl` ✅
- `biometricPhotoDate` ✅
- `biometricPhotoExpiration` ✅

**Tabla**: `facial_biometric_data` ✅ **YA EXISTE**
- Azure Face API integrado
- faceId, persistedFaceId, enrollmentStatus

---

## 📊 RESUMEN GENERAL

### TABLAS EXISTENTES (13)
1. ✅ `users` - Datos principales
2. ✅ `user_work_history` - Historial laboral
3. ✅ `user_marital_status` - Estado civil
4. ✅ `user_children` - Hijos
5. ✅ `user_family_members` - Familiares
6. ✅ `user_education` - Educación
7. ✅ `user_primary_physician` - Médico de cabecera
8. ✅ `user_chronic_conditions` - Enfermedades crónicas
9. ✅ `user_medications` - Medicamentos
10. ✅ `user_allergies` - Alergias
11. ✅ `user_activity_restrictions` - Restricciones de actividad
12. ✅ `user_work_restrictions` - Restricciones laborales
13. ✅ `user_vaccinations` - Vacunas
14. ✅ `user_medical_exams` - Exámenes médicos
15. ✅ `user_medical_documents` - Documentos médicos
16. ✅ `user_permission_requests` - Solicitudes de permisos
17. ✅ `user_disciplinary_actions` - Acciones disciplinarias
18. ✅ `facial_biometric_data` - Datos biométricos
19. ✅ `employee_medical_records` - Ficha médica completa

### TABLAS FALTANTES (6)

1. ❌ `user_driver_licenses` - Licencias de conducir (nacional, internacional, pasajeros)
2. ❌ `user_professional_licenses` - Licencias profesionales
3. ❌ `user_legal_issues` - Antecedentes legales/judiciales
4. ❌ `user_union_affiliation` - Afiliación sindical
5. ❌ `company_tasks` - Tareas de la empresa
6. ❌ `user_assigned_tasks` - Tareas asignadas
7. ❌ `user_salary_config` - Configuración salarial

### CAMPOS FALTANTES EN TABLAS EXISTENTES

**Tabla `users`** (TAB 2 - Datos Personales):
- `secondary_phone`
- `home_phone`
- `city`
- `province`
- `postal_code`
- `neighborhood`
- `street`
- `street_number`
- `floor_apt`
- `health_insurance_provider`
- `health_insurance_plan`
- `health_insurance_number`
- `health_insurance_expiry`

**Tabla `user_documents`** (TAB 2 - Documentos):
- Necesita campos específicos para DNI frente/dorso
- Necesita campos específicos para pasaporte (páginas 1 y 2)
- Necesita campos específicos para visa

**Tabla `employee_medical_records`** (TAB 5 - Salud Mental):
- `mental_health_status`
- `requires_mental_health_followup`
- `mental_health_notes`
- `stress_level`

---

## 🔔 CAMPOS CON VENCIMIENTO (Sistema de Alertas)

**Campos que requieren tracking de expiración**:

### TAB 2 - Datos Personales
1. `dni_expiry_date` (user_documents.expiration_date)
2. `passport_expiry_date` (user_documents.expiration_date)
3. `visa_expiry_date` (user_documents.expiration_date)
4. `national_license_expiry` (user_driver_licenses.expiry_date) ❌ Tabla NO existe
5. `intl_license_expiry` (user_driver_licenses.expiry_date) ❌ Tabla NO existe
6. `passenger_license_expiry` (user_driver_licenses.expiry_date) ❌ Tabla NO existe
7. `professional_license_expiry` (user_professional_licenses.expiry_date) ❌ Tabla NO existe
8. `health_insurance_expiry` (users.health_insurance_expiry) ❌ Campo NO existe

### TAB 5 - Antecedentes Médicos
1. `next_exam_date` (user_medical_exams.next_exam_date) ✅ Existe
2. `next_dose_date` (user_vaccinations.next_dose_date) ✅ Existe
3. `restriction_end_date` (user_activity_restrictions.end_date) ✅ Existe
4. `work_restriction_end_date` (user_work_restrictions.end_date) ✅ Existe

### TAB 9 - Biométrico
1. `biometric_photo_expiration` (users.biometric_photo_expiration) ✅ Existe

**TOTAL CAMPOS CON VENCIMIENTO**: 13
**EXISTENTES**: 5
**FALTANTES**: 8

---

## 📁 CAMPOS DE UPLOAD DE ARCHIVOS

### TAB 2 - Datos Personales
| Campo | Formato | Tabla/Campo DB |
|-------|---------|----------------|
| DNI Frente | image/*, pdf | `user_documents.dni_front_photo_url` ❌ |
| DNI Dorso | image/*, pdf | `user_documents.dni_back_photo_url` ❌ |
| Pasaporte Pág. 1 | image/*, pdf | `user_documents.passport_page1_url` ❌ |
| Pasaporte Pág. 2 | image/*, pdf | `user_documents.passport_page2_url` ❌ |
| Visa Documento | image/*, pdf | `user_documents.visa_document_url` ❌ |
| Licencia Nacional | image/*, pdf | `user_driver_licenses.photo_url` ❌ |
| Licencia Internacional | image/*, pdf | `user_driver_licenses.photo_url` ❌ |
| Licencia Pasajeros | image/*, pdf | `user_driver_licenses.photo_url` ❌ |
| Licencia Profesional | image/*, pdf | `user_professional_licenses.certificate_url` ❌ |

### TAB 3 - Antecedentes Laborales
| Campo | Formato | Tabla/Campo DB |
|-------|---------|----------------|
| Carta de Terminación | image/*, pdf | `user_work_history.termination_letter_url` (comentado) |
| Certificado Laboral | image/*, pdf | `user_work_history.work_certificate_url` (comentado) |

### TAB 4 - Grupo Familiar
**NO HAY UPLOADS** - Solo datos textuales

### TAB 5 - Antecedentes Médicos
| Campo | Formato | Tabla/Campo DB |
|-------|---------|----------------|
| Certificados Médicos | image/*, pdf | `user_medical_documents.file_url` ✅ |
| Certificados Vacunas | image/*, pdf | `user_vaccinations.certificate_url` ✅ |
| Certificados Exámenes | image/*, pdf | `user_medical_exams.certificate_url` ✅ |
| Restricciones Médicas | image/*, pdf | `user_activity_restrictions.medical_certificate_url` ✅ |

### TAB 9 - Biométrico
| Campo | Formato | Tabla/Campo DB |
|-------|---------|----------------|
| Captura Facial | base64 image | `users.biometric_photo_url` ✅ |
| Face ID Azure | JSON | `facial_biometric_data.faceId` ✅ |

**TOTAL CAMPOS DE UPLOAD**: 18
**EXISTENTES**: 6
**FALTANTES**: 12

---

## 🎯 PLAN DE ACCIÓN

### FASE 1: Migraciones de Base de Datos (Prioridad ALTA)
1. ❌ Crear `user_driver_licenses`
2. ❌ Crear `user_professional_licenses`
3. ❌ Crear `user_legal_issues`
4. ❌ Crear `user_union_affiliation`
5. ❌ Crear `company_tasks`
6. ❌ Crear `user_assigned_tasks`
7. ❌ Crear `user_salary_config`
8. ❌ Agregar campos faltantes a `users` (contacto, obra social)
9. ❌ Agregar campos faltantes a `user_documents` (DNI, pasaporte, visa)
10. ❌ Agregar campos faltantes a `employee_medical_records` (salud mental)

### FASE 2: API Endpoints (Prioridad ALTA)
1. ❌ POST/GET/PUT/DELETE `/api/v1/user-documents/:userId/driver-licenses`
2. ❌ POST/GET/PUT/DELETE `/api/v1/user-documents/:userId/professional-licenses`
3. ❌ POST/GET/PUT/DELETE `/api/v1/user-legal/:userId/legal-issues`
4. ❌ POST/GET/PUT/DELETE `/api/v1/user-legal/:userId/union-affiliation`
5. ❌ POST/GET/PUT/DELETE `/api/v1/tasks/company/:companyId`
6. ❌ POST/GET/PUT/DELETE `/api/v1/tasks/user/:userId`
7. ❌ POST/GET/PUT `/api/v1/user-salary/:userId`
8. ❌ PUT `/api/v1/users/:userId/contact-info` (datos de contacto ampliado)
9. ❌ PUT `/api/v1/users/:userId/health-insurance` (obra social)

### FASE 3: Sistema de Upload de Archivos (Prioridad MEDIA)
1. ❌ Implementar Multer para manejo de archivos
2. ❌ Crear carpeta `/uploads/documents/`
3. ❌ Crear carpeta `/uploads/photos/`
4. ❌ Crear carpeta `/uploads/medical/`
5. ❌ Implementar validación de formatos (JPG, PNG, PDF)
6. ❌ Implementar límite de tamaño (5MB por archivo)

### FASE 4: Imágenes de Ejemplo (Prioridad BAJA)
1. ❌ Crear DNI ejemplo (frente/dorso) - JPG
2. ❌ Crear Pasaporte ejemplo - JPG
3. ❌ Crear Visa ejemplo - PDF
4. ❌ Crear Licencias ejemplo - JPG
5. ❌ Crear Certificados médicos ejemplo - PDF

### FASE 5: Sistema de Vencimientos (Prioridad MEDIA)
1. ❌ Tabla `document_expiration_alerts`
2. ❌ Scheduler para revisar vencimientos diarios
3. ❌ Envío de notificaciones 30/15/7 días antes
4. ❌ Dashboard de documentos vencidos

### FASE 6: Frontend - Implementación TABs 2-9 (Prioridad ALTA)
1. ❌ TAB 2: Implementar todas las secciones
2. ✅ TAB 3: Ya existe (solo agregar legales/sindical)
3. ✅ TAB 4: Ya existe (completo)
4. ✅ TAB 5: Ya existe (agregar salud mental)
5. ✅ TAB 6: Ya existe (completo)
6. ✅ TAB 7: Ya existe (completo)
7. ❌ TAB 8: Implementar desde cero
8. ✅ TAB 9: Ya existe (completo)

---

## ⏱️ ESTIMACIÓN DE TIEMPO

| Fase | Tareas | Tiempo Estimado |
|------|--------|-----------------|
| Fase 1 - Migraciones | 10 migraciones | 2-3 horas |
| Fase 2 - API Endpoints | 9 grupos de endpoints | 4-5 horas |
| Fase 3 - Sistema Upload | 6 tareas | 2-3 horas |
| Fase 4 - Imágenes Ejemplo | 5 archivos | 1 hora |
| Fase 5 - Vencimientos | 4 tareas | 2-3 horas |
| Fase 6 - Frontend | 8 TABs | 6-8 horas |
| **TOTAL** | | **17-23 horas** |

---

## 📝 NOTAS IMPORTANTES

1. **TAB 1 está BLINDADO** - NO tocar bajo ninguna circunstancia
2. **TAB 4** está 100% completo - NO requiere cambios
3. **TAB 6** está 100% completo - NO requiere cambios
4. **TAB 7** está 100% completo - NO requiere cambios
5. **TAB 9** está 100% completo - NO requiere cambios
6. **TAB 2** es el más crítico - Tiene la mayoría de campos faltantes
7. **TAB 8** está 0% implementado - Requiere creación completa
8. **Sistema de vencimientos** es transversal a TAB 2 y TAB 5

---

**FIN DEL ANÁLISIS**
