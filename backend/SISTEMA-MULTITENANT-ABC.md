# 🏢 SISTEMA BIOMÉTRICO MULTI-TENANT - DOCUMENTACIÓN ABC

## 📋 ARQUITECTURA GENERAL

### 🎯 CONCEPTO MULTI-TENANT
```
EMPRESA 1 (company_id=1)
├── Usuarios Empresa 1 (users.company_id=1)
├── Sucursales Empresa 1 (branches.company_id=1)
├── Módulos Empresa 1 (company_modules.company_id=1)
└── Asistencias Empresa 1 (attendance.company_id=1)

EMPRESA 2 (company_id=2)
├── Usuarios Empresa 2 (users.company_id=2)
├── Sucursales Empresa 2 (branches.company_id=2)
├── Módulos Empresa 2 (company_modules.company_id=2)
└── Asistencias Empresa 2 (attendance.company_id=2)
```

### 🔒 AISLACIÓN DE DATOS
- **CRÍTICO**: Cada query DEBE incluir `company_id` para aislación
- **users**: WHERE company_id = X
- **branches**: WHERE company_id = X
- **company_modules**: WHERE company_id = X
- **attendance**: WHERE company_id = X

## 🖥️ PÁGINAS DEL SISTEMA

### 1️⃣ **panel-administrativo.html**
- **Propósito**: Vista ADMIN GLOBAL (super admin)
- **Acceso**: Ve TODAS las empresas
- **Funciones**:
  - Gestionar empresas
  - Asignar módulos a empresas
  - Ver usuarios de todas las empresas
  - Configurar precios globales

### 2️⃣ **panel-empresa.html**
- **Propósito**: Vista EMPRESA ESPECÍFICA
- **Acceso**: Ve SOLO su empresa (filtrado por company_id)
- **Funciones**:
  - Gestionar usuarios de SU empresa
  - Ver módulos asignados a SU empresa
  - Gestionar sucursales de SU empresa

## ⚠️ PROBLEMA CRÍTICO IDENTIFICADO

### 🔥 INCONSISTENCIA DE NOMENCLATURA
**Las DOS páginas acceden a las MISMAS tablas pero usan nombres de campos DIFERENTES:**

**Tabla: `users`**
- `panel-administrativo.html` → usa `firstName`, `lastName`
- `panel-empresa.html` → usa `first_name`, `last_name`

**Tabla: `modules`**
- Mismos módulos, diferentes referencias de campos

**Tabla: `pricing`**
- Mismos precios, diferentes nombres de campos

### 💥 RESULTADO DEL PROBLEMA:
```
Al corregir panel-administrativo → se rompe panel-empresa
Al corregir panel-empresa → se rompe panel-administrativo
```

## 🛠️ PLAN DE CORRECCIÓN

### FASE 1: AUDITORÍA
1. ✅ Listar archivos críticos
2. ✅ Auditar nomenclatura en `panel-administrativo.html`
3. ✅ Auditar nomenclatura en `panel-empresa.html`
4. ✅ Identificar TODAS las inconsistencias

### FASE 2: UNIFICACIÓN
1. ✅ Decidir nomenclatura estándar (camelCase vs snake_case)
2. ✅ Modificar modelos Sequelize con field mapping correcto
3. ✅ Unificar ambas páginas para usar MISMA nomenclatura
4. ✅ Verificar APIs backend

### FASE 3: VALIDACIÓN
1. ✅ Probar panel-administrativo funcional
2. ✅ Probar panel-empresa funcional
3. ✅ Verificar aislación multi-tenant
4. ✅ Testing completo CRUD en ambas páginas

## 📊 TABLAS PRINCIPALES

### `companies`
- Empresas del sistema
- **NO necesita company_id** (es la tabla padre)

### `users`
- **company_id** → Aislación por empresa
- firstName/lastName → **DEBE SER CONSISTENTE**

### `branches` (Sucursales)
- **company_id** → Aislación por empresa
- **CADA empresa ve SOLO sus sucursales**

### `company_modules`
- **company_id** → Aislación por empresa
- Módulos contratados por cada empresa

### `system_modules`
- Catálogo global de módulos disponibles
- **Compartido** entre todas las empresas

## 🚨 REGLAS CRÍTICAS

### ✅ CONSISTENCIA
- **MISMA nomenclatura** en ambas páginas
- **MISMOS endpoints** API
- **MISMA estructura** de respuesta JSON

### ✅ SEGURIDAD MULTI-TENANT
- **NUNCA** query sin `company_id` en tablas tenant
- **VALIDAR** company_id en cada request
- **AISLACIÓN TOTAL** entre empresas

### ✅ SINCRONIZACIÓN
- Módulos admin ↔ empresa **SINCRONIZADOS**
- Precios admin ↔ empresa **SINCRONIZADOS**
- Usuarios admin ↔ empresa **SINCRONIZADOS**

## 🔧 ARCHIVOS CRÍTICOS

### Backend Models
- `src/models/User-postgresql.js`
- `src/models/Company-postgresql.js`
- `src/models/Branch-postgresql.js`

### APIs Backend
- `src/routes/aponntDashboard.js` (admin APIs)
- `src/routes/companies.js` (empresa APIs)

### Frontend
- `public/panel-administrativo.html`
- `public/panel-empresa.html`

---
**OBJETIVO**: Sistema 100% funcional con AMBAS páginas operativas simultáneamente