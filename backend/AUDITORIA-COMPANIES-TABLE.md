# AUDITORÍA COMPLETA: Tabla COMPANIES (Cadena de Liquidación)

**Fecha:** 2025-11-27
**Sistema:** Sistema de Asistencia Biométrico
**Base de Datos:** PostgreSQL - `attendance_system`
**Propósito:** Verificar campos críticos para implementar cadena de liquidación de nómina parametrizable

---

## 📊 RESUMEN EJECUTIVO

| Métrica | Valor |
|---------|-------|
| **Total de columnas** | 69 |
| **Campos críticos EXISTENTES** | 4/8 (50%) |
| **Campos críticos FALTANTES** | 4/8 (50%) |
| **Foreign Keys** | 0 |
| **Índices** | 10 |

---

## ✅ CAMPOS CRÍTICOS EXISTENTES (4/8)

### 1. `country` (VARCHAR 255, NOT NULL)
- **Tipo:** `character varying(255)`
- **Default:** `'Argentina'`
- **Status:** ✅ EXISTE
- **Uso:** Nombre del país para determinar legislación laboral
- **Nota:** Es un VARCHAR, no un FK. Sería mejor tener `country_id` FK a `payroll_countries`

### 2. `multi_branch_enabled` (BOOLEAN, NOT NULL)
- **Tipo:** `boolean`
- **Default:** `false`
- **Status:** ✅ EXISTE
- **Uso:** Indica si la empresa tiene múltiples sucursales
- **Nota:** Este campo es equivalente a `has_branches` (que está en la lista de críticos pero con otro nombre)

### 3. `modules_data` (JSONB, NULL)
- **Tipo:** `jsonb`
- **Default:** `NULL`
- **Status:** ✅ EXISTE
- **Uso:** Almacena datos de módulos contratados por la empresa
- **Nota:** Actualmente está vacío en la empresa demo (`[]`)

### 4. `active_modules` (TEXT, NULL)
- **Tipo:** `text`
- **Default:** `NULL`
- **Status:** ✅ EXISTE
- **Uso:** Lista de módulos activos de la empresa
- **Nota:** Actualmente NULL en la empresa demo. Existe también `modules` (JSONB) con `["attendance", "shifts"]`

---

## ❌ CAMPOS CRÍTICOS FALTANTES (4/8)

### 1. `country_id` (INTEGER FK → payroll_countries.id)
**Status:** ❌ FALTA

**Descripción:**
Foreign key a la tabla `payroll_countries` para vincular a la legislación laboral específica del país.

**Por qué es crítico:**
- Determina qué conceptos salariales aplicar (salario mínimo, aportes, deducciones)
- Permite cambiar de país sin modificar hardcodeo
- Multi-país: Argentina, Uruguay, Chile, etc.

**Migración sugerida:**
```sql
-- Agregar columna country_id
ALTER TABLE companies
ADD COLUMN country_id INTEGER;

-- Crear FK constraint
ALTER TABLE companies
ADD CONSTRAINT fk_companies_country
FOREIGN KEY (country_id)
REFERENCES payroll_countries(id)
ON DELETE RESTRICT;

-- Migrar datos existentes (basado en campo 'country' actual)
UPDATE companies c
SET country_id = pc.id
FROM payroll_countries pc
WHERE LOWER(c.country) = LOWER(pc.country_name);

-- Índice para performance
CREATE INDEX idx_companies_country_id
ON companies(country_id);
```

**Impacto:** ALTO - Sin esto, no se puede implementar liquidación multi-país

---

### 2. `has_branches` (BOOLEAN)
**Status:** ⚠️ EXISTE CON OTRO NOMBRE

**Descripción:**
Indica si la empresa tiene sucursales múltiples.

**Por qué es crítico:**
- Determina si se debe consultar `company_branches`
- Afecta cálculo de deducciones provinciales (IIBB puede variar por provincia)
- Calendario de feriados puede variar por sucursal

**Nota:**
Actualmente existe como `multi_branch_enabled` (columna 69). Se puede usar ese campo directamente.

**Acción requerida:**
Crear un alias en el código o renombrar `multi_branch_enabled` → `has_branches`:
```sql
-- OPCIÓN 1: Renombrar (breaking change)
ALTER TABLE companies
RENAME COLUMN multi_branch_enabled TO has_branches;

-- OPCIÓN 2: Crear campo nuevo y deprecar el viejo
ALTER TABLE companies
ADD COLUMN has_branches BOOLEAN NOT NULL DEFAULT false;

UPDATE companies
SET has_branches = multi_branch_enabled;

-- Luego en una release futura eliminar multi_branch_enabled
```

**Impacto:** BAJO - Ya existe, solo necesita estandarización de nombre

---

### 3. `default_calendar_id` (INTEGER FK → calendars.id)
**Status:** ❌ FALTA

**Descripción:**
Foreign key a una tabla de calendarios de feriados. Define qué calendario de feriados usar por defecto para esta empresa.

**Por qué es crítico:**
- Días no trabajados afectan cálculo de días liquidables
- Feriados nacionales vs provinciales
- Permite calendario personalizado por empresa

**Migración sugerida:**
```sql
-- Agregar columna default_calendar_id
ALTER TABLE companies
ADD COLUMN default_calendar_id INTEGER;

-- Crear FK constraint
ALTER TABLE companies
ADD CONSTRAINT fk_companies_default_calendar
FOREIGN KEY (default_calendar_id)
REFERENCES holidays(id)  -- O crear tabla 'calendars'
ON DELETE SET NULL;

-- Índice
CREATE INDEX idx_companies_default_calendar_id
ON companies(default_calendar_id);

-- Asignar calendario default basado en país
-- (Requiere crear registros en 'calendars' primero)
UPDATE companies c
SET default_calendar_id = cal.id
FROM calendars cal
WHERE cal.country_id = c.country_id
  AND cal.is_default = true;
```

**Alternativa:**
Usar la tabla `holidays` existente directamente (filtrando por `company_id`). En ese caso no se necesita este campo.

**Impacto:** MEDIO - Afecta precisión de cálculo de días trabajados

---

### 4. `default_payroll_template_id` (INTEGER FK → payroll_templates.id)
**Status:** ❌ FALTA

**Descripción:**
Foreign key a `payroll_templates`. Define la plantilla de liquidación por defecto que usa esta empresa.

**Por qué es crítico:**
- Evita tener que seleccionar template en cada liquidación
- Permite heredar estructura de conceptos (salario base, antiguedad, aportes, etc.)
- Simplifica onboarding de nuevas empresas

**Migración sugerida:**
```sql
-- Agregar columna default_payroll_template_id
ALTER TABLE companies
ADD COLUMN default_payroll_template_id INTEGER;

-- Crear FK constraint
ALTER TABLE companies
ADD CONSTRAINT fk_companies_default_payroll_template
FOREIGN KEY (default_payroll_template_id)
REFERENCES payroll_templates(id)
ON DELETE SET NULL;

-- Índice
CREATE INDEX idx_companies_default_payroll_template_id
ON companies(default_payroll_template_id);

-- Asignar template default basado en país/convenio
-- (Requiere crear templates en 'payroll_templates' primero)
UPDATE companies c
SET default_payroll_template_id = pt.id
FROM payroll_templates pt
WHERE pt.country_id = c.country_id
  AND pt.is_default_for_country = true;
```

**Impacto:** ALTO - Sin esto, cada liquidación requiere selección manual de template

---

## 🏢 CAMPOS RELACIONADOS A LIQUIDACIÓN (YA EXISTENTES)

Estos campos YA existen y son útiles para la cadena de liquidación:

| Campo | Tipo | Uso en Liquidación |
|-------|------|-------------------|
| `modules_data` | JSONB | Módulos contratados (determina si tiene acceso a payroll) |
| `modules_pricing` | JSONB | Precios de módulos |
| `active_modules` | TEXT | Módulos activos (verificar si 'payroll' está activo) |
| `pricing` | JSONB | Info de pricing |
| `modules` | JSONB | Módulos habilitados |
| `company_id` | INTEGER (PK) | Identificador único de empresa |
| `name` | VARCHAR(255) | Nombre de la empresa (para recibos) |
| `slug` | VARCHAR(255) | Identificador amigable |
| `address` | TEXT | Domicilio fiscal (para AFIP, recibos) |
| `city` | VARCHAR(255) | Ciudad (IIBB puede variar) |
| `province` | VARCHAR(255) | Provincia (IIBB, feriados provinciales) |
| `country` | VARCHAR(255) | País (Argentina, Uruguay, etc.) |

**Nota:**
El campo `country` debería migrar a `country_id` (FK) para evitar inconsistencias ("Argentina" vs "argentina" vs "ARG").

---

## 🔗 FOREIGN KEYS ENCONTRADAS

**Status:** ❌ NO hay Foreign Keys en la tabla `companies`

**Implicaciones:**
- No hay integridad referencial con otras tablas
- Riesgo de orphan records o inconsistencias
- Dificulta queries con JOIN

**Recomendación:**
Agregar FKs para:
1. `country_id` → `payroll_countries.id`
2. `default_calendar_id` → `calendars.id` o `holidays.id`
3. `default_payroll_template_id` → `payroll_templates.id`
4. `created_by_staff_id` → `aponnt_staff.id` (ya existe la columna, falta FK)
5. `assigned_vendor_id` → `aponnt_staff.id` (ya existe la columna, falta FK)
6. `support_vendor_id` → `aponnt_staff.id` (ya existe la columna, falta FK)

---

## 📇 ÍNDICES EXISTENTES (10)

| Índice | Columnas | Tipo |
|--------|----------|------|
| `companies_pkey` | `company_id` | UNIQUE (PK) |
| `idx_companies_assigned_vendor` | `assigned_vendor_id` | INDEX |
| `idx_companies_assigned_vendor_active` | `assigned_vendor_id, is_active` | INDEX (filtered) |
| `idx_companies_contact_email` | `contact_email` | INDEX |
| `idx_companies_created_by_staff` | `created_by_staff_id` | INDEX |
| `idx_companies_license_type` | `license_type` | INDEX |
| `idx_companies_status` | `status` | INDEX |
| `idx_companies_support_vendor` | `support_vendor_id` | INDEX |
| `idx_companies_support_vendor_active` | `support_vendor_id, is_active` | INDEX (filtered) |
| `idx_companies_tax_id` | `tax_id` | INDEX |

**Índices adicionales recomendados:**
```sql
-- Para queries de liquidación
CREATE INDEX idx_companies_country_id
ON companies(country_id);

CREATE INDEX idx_companies_default_payroll_template_id
ON companies(default_payroll_template_id);

CREATE INDEX idx_companies_default_calendar_id
ON companies(default_calendar_id);
```

---

## 📦 MUESTRA DE DATOS (Empresa ID: 1)

**Empresa:** APONNT - Empresa Demo UPDATED
**Ubicación:** N/A, N/A, Argentina
**Multi-sucursal:** NO (Max branches: 5)

### `modules_data`
```json
[]
```

### `active_modules`
```
NULL
```

### `modules_pricing`
```json
{}
```

### `pricing`
```json
{}
```

### `modules`
```json
[
  "attendance",
  "shifts"
]
```

**Observaciones:**
- `modules_data` está vacío (`[]`)
- `active_modules` es NULL
- `modules` tiene solo `["attendance", "shifts"]`
- No hay módulo `payroll` activo

**Acción requerida:**
Activar módulo `payroll` cuando se implemente la cadena de liquidación:
```sql
UPDATE companies
SET modules = modules || '["payroll"]'::jsonb
WHERE company_id = 1;
```

---

## 💡 MIGRACIÓN COMPLETA RECOMENDADA

### Script SQL completo para agregar campos faltantes:

```sql
-- ==================================================================
-- MIGRACIÓN: Agregar campos críticos para Cadena de Liquidación
-- Fecha: 2025-11-27
-- Tabla: companies
-- ==================================================================

BEGIN;

-- 1. Agregar country_id (FK a payroll_countries)
ALTER TABLE companies
ADD COLUMN country_id INTEGER;

CREATE INDEX idx_companies_country_id
ON companies(country_id);

-- 2. Renombrar multi_branch_enabled → has_branches (opcional)
-- O mantener multi_branch_enabled y crear alias en código
-- ALTER TABLE companies RENAME COLUMN multi_branch_enabled TO has_branches;

-- 3. Agregar default_calendar_id (FK a calendars o holidays)
ALTER TABLE companies
ADD COLUMN default_calendar_id INTEGER;

CREATE INDEX idx_companies_default_calendar_id
ON companies(default_calendar_id);

-- 4. Agregar default_payroll_template_id (FK a payroll_templates)
ALTER TABLE companies
ADD COLUMN default_payroll_template_id INTEGER;

CREATE INDEX idx_companies_default_payroll_template_id
ON companies(default_payroll_template_id);

-- 5. Crear Foreign Key Constraints
ALTER TABLE companies
ADD CONSTRAINT fk_companies_country
FOREIGN KEY (country_id)
REFERENCES payroll_countries(id)
ON DELETE RESTRICT;

ALTER TABLE companies
ADD CONSTRAINT fk_companies_default_calendar
FOREIGN KEY (default_calendar_id)
REFERENCES holidays(id)  -- O 'calendars' si se crea tabla separada
ON DELETE SET NULL;

ALTER TABLE companies
ADD CONSTRAINT fk_companies_default_payroll_template
FOREIGN KEY (default_payroll_template_id)
REFERENCES payroll_templates(id)
ON DELETE SET NULL;

-- 6. Migrar datos existentes
-- (Requiere que payroll_countries tenga registros primero)
UPDATE companies c
SET country_id = pc.id
FROM payroll_countries pc
WHERE LOWER(c.country) = LOWER(pc.country_name);

COMMIT;
```

### Orden de ejecución:

1. **Primero:** Crear/poblar tabla `payroll_countries` con países soportados
2. **Segundo:** Ejecutar migración de `companies` (script arriba)
3. **Tercero:** Crear templates default por país en `payroll_templates`
4. **Cuarto:** Asignar `default_payroll_template_id` a empresas existentes

---

## 🚀 IMPACTO EN LA CADENA DE LIQUIDACIÓN

### ¿Qué permite completar estos campos?

1. **country_id** → Determinar automáticamente:
   - Salario mínimo del país
   - Aportes y contribuciones patronales (% varía por país)
   - Deducciones legales obligatorias
   - Formato de recibo (Argentina usa formato AFIP específico)

2. **has_branches** (ya existe como `multi_branch_enabled`) → Permite:
   - Calcular IIBB por provincia (varía según jurisdicción)
   - Aplicar feriados provinciales correctos
   - Generar liquidaciones por sucursal

3. **default_calendar_id** → Permite:
   - Calcular días trabajados correctamente (excluyendo feriados)
   - Aplicar plus por trabajar en feriado
   - Calcular proporcional de vacaciones

4. **default_payroll_template_id** → Permite:
   - Heredar estructura de conceptos (salario base, antigüedad, horas extra, etc.)
   - Simplificar onboarding (nueva empresa copia template del país)
   - Actualizar masivamente (cambio en template afecta todas las empresas)

---

## ✅ PRÓXIMOS PASOS

1. **Crear tabla `payroll_countries`** (si no existe)
   - Campos: `id`, `country_name`, `country_code`, `currency`, `min_salary`, `tax_config` (JSONB)
   - Poblar con Argentina, Uruguay, Chile, etc.

2. **Ejecutar migración de `companies`** (agregar 3 campos faltantes)

3. **Crear templates default** en `payroll_templates`
   - Template "Argentina - Convenio Comercio"
   - Template "Argentina - Convenio Construcción"
   - Template "Uruguay - Default"

4. **Asignar defaults** a empresas existentes
   - Basado en `country` → asignar `country_id`
   - Basado en `country_id` → asignar `default_payroll_template_id`

5. **Migrar `country` (VARCHAR) → `country_id` (FK)** en el código
   - Actualizar modelos Sequelize
   - Actualizar queries para usar JOIN con `payroll_countries`

6. **Testing**
   - Verificar que empresa con `country_id = 1` (Argentina) aplica correctamente aportes
   - Verificar que empresa multi-sucursal calcula IIBB por provincia
   - Verificar que feriados se excluyen del cálculo de días trabajados

---

## 📊 ESTADO FINAL ESPERADO

Una vez completada la migración, la tabla `companies` tendrá:

| Campo | Tipo | FK | Uso |
|-------|------|----|----|
| `company_id` | INTEGER (PK) | - | Identificador único |
| `country_id` | INTEGER | ✅ `payroll_countries.id` | Legislación laboral |
| `has_branches` | BOOLEAN | - | Multi-sucursal |
| `default_calendar_id` | INTEGER | ✅ `calendars.id` | Calendario feriados |
| `default_payroll_template_id` | INTEGER | ✅ `payroll_templates.id` | Template liquidación |
| `modules_data` | JSONB | - | Módulos contratados |
| `active_modules` | TEXT/JSONB | - | Módulos activos |

---

**Generado por:** Sistema de Auditoría - Backend
**Script:** `backend/scripts/audit-companies-structure.js`
**Versión:** 1.0.0
