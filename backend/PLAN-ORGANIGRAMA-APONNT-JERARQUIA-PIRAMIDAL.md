# 📊 PLAN COMPLETO - ORGANIGRAMA APONNT + SISTEMA PIRAMIDAL DE COMISIONES

**Fecha**: 2025-01-19
**Objetivo**: Implementar jerarquía completa con sistema de comisiones piramidales para staff de Aponnt

---

## 🔍 RELEVAMIENTO ACTUAL

### **1. TABLAS EXISTENTES**

#### ✅ **Tabla `aponnt_staff`** (PostgreSQL - PRINCIPAL)
- **Ubicación**: `src/models/AponntStaff.js`
- **Tipo**: Base de datos PostgreSQL
- **ID**: UUID
- **Campos actuales**:
  ```javascript
  {
    id: UUID,
    first_name: STRING,
    last_name: STRING,
    dni: STRING (unique),
    email: STRING (unique),
    phone: STRING,
    username: STRING (unique),
    password: STRING (hasheado),
    role: ENUM['admin', 'supervisor', 'leader', 'vendor', 'soporte', 'administrativo', 'marketing'],
    leader_id: UUID (FK → aponnt_staff.id),
    supervisor_id: UUID (FK → aponnt_staff.id),
    is_active: BOOLEAN,
    first_login: BOOLEAN,
    last_login_at: DATE,
    created_by: UUID (FK → aponnt_staff.id),
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP
  }
  ```

**✅ USADO PARA LOGIN ACTUAL** (según `aponnt-login.js`)

---

#### ⚠️ **Archivo `vendors.json`** (VendorMemory - EN MEMORIA)
- **Ubicación**: `src/models/VendorMemory.js`
- **Tipo**: Archivo JSON en memoria
- **ID**: Numérico autoincremental
- **Problema**: Sistema DUPLICADO

**🚨 DECISIÓN**: MIGRAR TODO A `aponnt_staff` y ELIMINAR `vendors.json`

---

### **2. SISTEMA DE LOGIN ACTUAL**

**Archivo**: `public/js/modules/aponnt-login.js`

**Endpoint**: `POST /api/v1/auth/aponnt/staff/login`

**Guarda en localStorage**:
```javascript
aponnt_user_staff = {
  id: UUID,
  first_name: "Juan",
  last_name: "Pérez",
  email: "juan@aponnt.com",
  role: "vendor",
  username: "jperez",
  dni: "12345678"
}
```

**✅ YA FUNCIONA CON `aponnt_staff`**

---

### **3. FORMULARIO DE ALTA DE VENDEDORES**

**Ubicación**: `panel-administrativo.html:4549-4628`

**Campos actuales**:
- Nombre, email, teléfono, CBU
- % Comisión Ventas
- % Comisión Soporte
- Acepta paquetes de soporte (sí/no)
- Participa en subastas (sí/no)
- Estado (activo/inactivo)
- Notas

**❌ FALTA**: Campo de ROL/JERARQUÍA

---

## 🏗️ ORGANIGRAMA PROPUESTO

### **RAMA DE VENTAS**

```
┌─────────────────────────────────┐
│   GERENTE GENERAL               │
│   (CEO / Director General)      │
└────────────┬────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼──────────────┐  │
│ GERENTE REGIONAL │  │
│ DE VENTAS        │  │
│ (Región 1)       │  │
└────────┬─────────┘  │
         │            │
    ┌────▼─────┐      │
    │          │      │
┌───▼──────┐ ┌─▼──────▼───┐
│SUPERVISOR│ │ SUPERVISOR  │
│ VENTAS   │ │ VENTAS      │
│ (Zona A) │ │ (Zona B)    │
└────┬─────┘ └─────┬───────┘
     │             │
  ┌──▼──┐       ┌──▼──┐
  │LÍDER│       │LÍDER│
  │     │       │     │
  └──┬──┘       └──┬──┘
     │             │
  ┌──▼──────┐  ┌──▼──────┐
  │VENDEDOR │  │VENDEDOR │
  └─────────┘  └─────────┘
```

### **RAMA DE SOPORTE**

```
┌─────────────────────────────────┐
│   GERENTE GENERAL               │
└────────────┬────────────────────┘
             │
    ┌────────▼────────┐
    │                 │
┌───▼──────────────┐  │
│ GERENTE REGIONAL │  │
│ DE SOPORTE       │  │
│ (Región 1)       │  │
└────────┬─────────┘  │
         │            │
    ┌────▼─────┐      │
    │          │      │
┌───▼──────┐ ┌─▼──────▼───┐
│SUPERVISOR│ │ SUPERVISOR  │
│ SOPORTE  │ │ SOPORTE     │
│ (Zona A) │ │ (Zona B)    │
└────┬─────┘ └─────┬───────┘
     │             │
  ┌──▼──────┐  ┌──▼──────┐
  │SOPORTE  │  │SOPORTE  │
  │(Técnico)│  │(Técnico)│
  └─────────┘  └─────────┘
```

---

## 🎯 ROLES UNIFICADOS (NUEVA ESTRUCTURA)

### **Enum de Roles** (para `aponnt_staff.role`)

```sql
CREATE TYPE staff_role AS ENUM (
  'ceo',                      -- Gerente General (ve TODO)
  'regional_sales_manager',   -- Gerente Regional de Ventas
  'regional_support_manager', -- Gerente Regional de Soporte
  'sales_supervisor',         -- Supervisor de Ventas
  'support_supervisor',       -- Supervisor de Soporte
  'sales_leader',             -- Líder de Ventas
  'sales_rep',                -- Vendedor (Representante de Ventas)
  'support_agent',            -- Agente de Soporte
  'admin',                    -- Administrador del Sistema
  'marketing',                -- Marketing
  'accounting'                -- Contabilidad/Administrativo
);
```

### **Títulos Amigables** (para mostrar en UI)

```javascript
const roleTitles = {
  'ceo': 'Gerente General',
  'regional_sales_manager': 'Gerente Regional de Ventas',
  'regional_support_manager': 'Gerente Regional de Soporte',
  'sales_supervisor': 'Supervisor de Ventas',
  'support_supervisor': 'Supervisor de Soporte',
  'sales_leader': 'Líder de Ventas',
  'sales_rep': 'Representante de Ventas',
  'support_agent': 'Agente de Soporte',
  'admin': 'Administrador del Sistema',
  'marketing': 'Marketing',
  'accounting': 'Contabilidad'
};
```

---

## 🔗 JERARQUÍA Y RELACIONES

### **Modificaciones en Tabla `aponnt_staff`**

```sql
ALTER TABLE aponnt_staff
  -- Actualizar enum de roles
  DROP CONSTRAINT IF EXISTS aponnt_staff_role_check,
  ADD CONSTRAINT aponnt_staff_role_check CHECK (
    role IN (
      'ceo',
      'regional_sales_manager',
      'regional_support_manager',
      'sales_supervisor',
      'support_supervisor',
      'sales_leader',
      'sales_rep',
      'support_agent',
      'admin',
      'marketing',
      'accounting'
    )
  ),

  -- Agregar jerárquicos
  ADD COLUMN IF NOT EXISTS regional_manager_id UUID REFERENCES aponnt_staff(id),
  ADD COLUMN IF NOT EXISTS ceo_id UUID REFERENCES aponnt_staff(id),

  -- Comisiones (mover desde vendors.json)
  ADD COLUMN IF NOT EXISTS sales_commission_percentage DECIMAL(5,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS support_commission_percentage DECIMAL(5,2) DEFAULT 0.00,

  -- Comisiones piramidales
  ADD COLUMN IF NOT EXISTS pyramid_commission_percentage DECIMAL(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS accepts_support_packages BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS participates_in_auctions BOOLEAN DEFAULT false,

  -- CBU (mover desde vendors.json)
  ADD COLUMN IF NOT EXISTS cbu VARCHAR(22),

  -- Rating (mover desde vendors.json)
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,1) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0,

  -- Notas
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Índices
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_regional_manager ON aponnt_staff(regional_manager_id);
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_ceo ON aponnt_staff(ceo_id);
```

### **Relaciones Jerárquicas**

| Rol                          | Reporta a                      | Campo FK                  |
|------------------------------|--------------------------------|---------------------------|
| `sales_rep` (Vendedor)       | `sales_leader`                 | `leader_id`               |
| `sales_leader` (Líder)       | `sales_supervisor`             | `supervisor_id`           |
| `sales_supervisor`           | `regional_sales_manager`       | `regional_manager_id`     |
| `regional_sales_manager`     | `ceo`                          | `ceo_id`                  |
| `support_agent`              | `support_supervisor`           | `supervisor_id`           |
| `support_supervisor`         | `regional_support_manager`     | `regional_manager_id`     |
| `regional_support_manager`   | `ceo`                          | `ceo_id`                  |

---

## 💰 SISTEMA DE COMISIONES PIRAMIDALES

### **REGLAS IMPORTANTES**

1. ✅ **Comisión de VENTA**: Permanente, no transferible
2. ✅ **Comisión de SOPORTE**: Temporal, transferible
3. 🔺 **Comisión PIRAMIDAL**: SOLO por ventas, NO por soporte
4. 🔺 **Comisión PIRAMIDAL**: Se aplica a TODOS los niveles superiores

---

### **EJEMPLO PRÁCTICO**

#### Jerarquía:
```
CEO
 └── Gerente Regional Ventas (Juan)
      └── Supervisor Ventas (María)
           └── Líder Ventas (Pedro)
                └── Vendedor (Carlos)
```

#### Carlos vende empresa por $1,000 USD/mes:

**Comisión Directa** (Carlos):
- Venta: 10% → $100 USD

**Comisiones Piramidales**:
- **Pedro** (Líder): 2% del total → $20 USD
- **María** (Supervisor): 1.5% del total → $15 USD
- **Juan** (Gerente Regional): 1% del total → $10 USD
- **CEO**: 0.5% del total → $5 USD

**Total comisionado**: $150 USD (15% del total)
**Margen Aponnt**: $850 USD (85%)

---

### **TABLA DE PORCENTAJES PIRAMIDALES**

| Rol                          | % Comisión Piramidal | Sobre quién aplica                |
|------------------------------|----------------------|-----------------------------------|
| `sales_rep` (Vendedor)       | 0%                   | N/A (comisiona solo por su venta) |
| `sales_leader` (Líder)       | 2%                   | Ventas de sus vendedores          |
| `sales_supervisor`           | 1.5%                 | Ventas de todos los líderes       |
| `regional_sales_manager`     | 1%                   | Ventas de todos los supervisores  |
| `ceo`                        | 0.5%                 | Ventas de toda la empresa         |

**Guardado en**: `aponnt_staff.pyramid_commission_percentage`

---

## 📊 CÁLCULO DE COMISIONES (Funciones PostgreSQL)

### **1. Función: Calcular comisión de un vendedor**

```sql
CREATE OR REPLACE FUNCTION calculate_sales_rep_commission(p_sales_rep_id UUID, p_month INTEGER DEFAULT NULL, p_year INTEGER DEFAULT NULL)
RETURNS TABLE(
  direct_commission_usd DECIMAL(12,2),
  companies_count INTEGER
) AS $$
BEGIN
  -- Si no se especifica mes/año, usar mes actual
  p_month := COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);
  p_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

  RETURN QUERY
  SELECT
    COALESCE(SUM(c.sales_commission_usd), 0) as direct_commission_usd,
    COUNT(*)::INTEGER as companies_count
  FROM companies c
  WHERE c.assigned_vendor_id = p_sales_rep_id
    AND c.is_active = true
    AND EXTRACT(MONTH FROM c.created_at) = p_month
    AND EXTRACT(YEAR FROM c.created_at) = p_year;
END;
$$ LANGUAGE plpgsql;
```

---

### **2. Función: Calcular comisión piramidal de un líder**

```sql
CREATE OR REPLACE FUNCTION calculate_pyramid_commission(p_staff_id UUID, p_month INTEGER DEFAULT NULL, p_year INTEGER DEFAULT NULL)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  v_role staff_role;
  v_pyramid_percentage DECIMAL(5,2);
  v_subordinates UUID[];
  v_total_sales DECIMAL(12,2);
  v_pyramid_commission DECIMAL(12,2);
BEGIN
  -- Obtener rol y % piramidal
  SELECT role, pyramid_commission_percentage INTO v_role, v_pyramid_percentage
  FROM aponnt_staff
  WHERE id = p_staff_id;

  -- Si no tiene % piramidal, retornar 0
  IF v_pyramid_percentage IS NULL OR v_pyramid_percentage = 0 THEN
    RETURN 0;
  END IF;

  -- Obtener todos los subordinados según el rol
  IF v_role = 'sales_leader' THEN
    -- Líder: solo sus vendedores directos
    SELECT ARRAY_AGG(id) INTO v_subordinates
    FROM aponnt_staff
    WHERE leader_id = p_staff_id AND role = 'sales_rep';

  ELSIF v_role = 'sales_supervisor' THEN
    -- Supervisor: todos los vendedores de sus líderes
    SELECT ARRAY_AGG(s.id) INTO v_subordinates
    FROM aponnt_staff s
    WHERE s.leader_id IN (
      SELECT id FROM aponnt_staff WHERE supervisor_id = p_staff_id AND role = 'sales_leader'
    ) AND s.role = 'sales_rep';

  ELSIF v_role = 'regional_sales_manager' THEN
    -- Gerente Regional: todos los vendedores de sus supervisores
    SELECT ARRAY_AGG(s.id) INTO v_subordinates
    FROM aponnt_staff s
    WHERE s.leader_id IN (
      SELECT l.id FROM aponnt_staff l
      WHERE l.supervisor_id IN (
        SELECT sup.id FROM aponnt_staff sup
        WHERE sup.regional_manager_id = p_staff_id AND sup.role = 'sales_supervisor'
      ) AND l.role = 'sales_leader'
    ) AND s.role = 'sales_rep';

  ELSIF v_role = 'ceo' THEN
    -- CEO: TODOS los vendedores
    SELECT ARRAY_AGG(id) INTO v_subordinates
    FROM aponnt_staff
    WHERE role = 'sales_rep';

  ELSE
    RETURN 0;
  END IF;

  -- Calcular total de ventas de subordinados
  SELECT COALESCE(SUM(monthly_total), 0) INTO v_total_sales
  FROM companies
  WHERE assigned_vendor_id = ANY(v_subordinates)
    AND is_active = true
    AND (p_month IS NULL OR EXTRACT(MONTH FROM created_at) = p_month)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM created_at) = p_year);

  -- Calcular comisión piramidal
  v_pyramid_commission := (v_total_sales * v_pyramid_percentage) / 100;

  RETURN v_pyramid_commission;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔒 MULTI-TENANT POR NIVEL JERÁRQUICO

### **Filtros de Acceso a Empresas**

#### **1. Vendedor (sales_rep)**
```sql
SELECT * FROM companies
WHERE (assigned_vendor_id = :user_id OR support_vendor_id = :user_id)
  AND is_active = true;
```

#### **2. Líder (sales_leader)**
```sql
-- Sus empresas + empresas de sus vendedores
SELECT * FROM companies
WHERE (
  assigned_vendor_id = :user_id
  OR assigned_vendor_id IN (
    SELECT id FROM aponnt_staff WHERE leader_id = :user_id
  )
  OR support_vendor_id = :user_id
) AND is_active = true;
```

#### **3. Supervisor (sales_supervisor)**
```sql
-- Sus empresas + empresas de líderes + empresas de vendedores de esos líderes
SELECT * FROM companies
WHERE assigned_vendor_id IN (
  SELECT id FROM aponnt_staff
  WHERE leader_id IN (
    SELECT id FROM aponnt_staff WHERE supervisor_id = :user_id
  )
  UNION
  SELECT id FROM aponnt_staff WHERE supervisor_id = :user_id
  UNION
  SELECT :user_id
) AND is_active = true;
```

#### **4. Gerente Regional**
```sql
-- Todas las empresas de sus supervisores y hacia abajo
SELECT * FROM companies
WHERE assigned_vendor_id IN (
  SELECT id FROM aponnt_staff
  WHERE leader_id IN (
    SELECT l.id FROM aponnt_staff l
    WHERE l.supervisor_id IN (
      SELECT id FROM aponnt_staff WHERE regional_manager_id = :user_id
    )
  )
  UNION
  -- Incluir supervisores directos
  SELECT id FROM aponnt_staff
  WHERE supervisor_id IN (
    SELECT id FROM aponnt_staff WHERE regional_manager_id = :user_id
  )
  UNION
  -- Incluir gerente
  SELECT :user_id
) AND is_active = true;
```

#### **5. CEO / Admin**
```sql
-- TODO (sin filtro)
SELECT * FROM companies WHERE is_active = true;
```

---

## 🎨 MODIFICACIONES EN FORMULARIO DE ALTA (FRONTEND)

### **Archivo**: `panel-administrativo.html:4549+`

**Agregar campo de ROL**:

```html
<div class="form-group">
  <label for="vendorRole" class="form-label">Rol / Jerarquía *</label>
  <select id="vendorRole" class="form-input" required>
    <option value="">Seleccionar rol...</option>
    <optgroup label="🏢 Dirección">
      <option value="ceo">Gerente General (CEO)</option>
    </optgroup>
    <optgroup label="💼 Ventas">
      <option value="regional_sales_manager">Gerente Regional de Ventas</option>
      <option value="sales_supervisor">Supervisor de Ventas</option>
      <option value="sales_leader">Líder de Ventas</option>
      <option value="sales_rep">Representante de Ventas</option>
    </optgroup>
    <optgroup label="🛠️ Soporte">
      <option value="regional_support_manager">Gerente Regional de Soporte</option>
      <option value="support_supervisor">Supervisor de Soporte</option>
      <option value="support_agent">Agente de Soporte</option>
    </optgroup>
    <optgroup label="⚙️ Administración">
      <option value="admin">Administrador del Sistema</option>
      <option value="marketing">Marketing</option>
      <option value="accounting">Contabilidad</option>
    </optgroup>
  </select>
</div>
```

**Agregar campos jerárquicos (condicionales según rol)**:

```html
<!-- Mostrar SOLO si rol requiere líder -->
<div class="form-group" id="leaderField" style="display: none;">
  <label for="vendorLeader" class="form-label">Líder Asignado</label>
  <select id="vendorLeader" class="form-input">
    <option value="">Sin líder asignado</option>
    <!-- Cargar líderes desde API -->
  </select>
</div>

<!-- Mostrar SOLO si rol requiere supervisor -->
<div class="form-group" id="supervisorField" style="display: none;">
  <label for="vendorSupervisor" class="form-label">Supervisor Asignado</label>
  <select id="vendorSupervisor" class="form-input">
    <option value="">Sin supervisor asignado</option>
    <!-- Cargar supervisores desde API -->
  </select>
</div>

<!-- Y así sucesivamente... -->
```

**JavaScript para mostrar/ocultar campos**:

```javascript
document.getElementById('vendorRole').addEventListener('change', function() {
  const role = this.value;

  // Ocultar todos
  document.getElementById('leaderField').style.display = 'none';
  document.getElementById('supervisorField').style.display = 'none';
  document.getElementById('regionalManagerField').style.display = 'none';

  // Mostrar según rol
  if (role === 'sales_rep') {
    document.getElementById('leaderField').style.display = 'block';
  } else if (role === 'sales_leader') {
    document.getElementById('supervisorField').style.display = 'block';
  } else if (role === 'sales_supervisor') {
    document.getElementById('regionalManagerField').style.display = 'block';
  }
  // ... etc
});
```

---

## 📋 DASHBOARD POR ROL

### **Vendedor (sales_rep)** - Ve:
- ✅ Sus empresas (venta + soporte)
- ✅ Sus comisiones directas (venta + soporte)
- ✅ Total de usuarios de sus empresas
- ✅ Rating promedio

### **Líder (sales_leader)** - Ve:
- ✅ Sus empresas + empresas de sus vendedores
- ✅ Sus comisiones directas + comisión piramidal
- ✅ Lista de vendedores a cargo
- ✅ Performance de su equipo

### **Supervisor (sales_supervisor)** - Ve:
- ✅ Empresas de todos sus líderes y vendedores
- ✅ Comisión piramidal por todas las ventas
- ✅ Lista de líderes a cargo
- ✅ Performance de todos los líderes

### **Gerente Regional** - Ve:
- ✅ Todas las empresas de su región
- ✅ Comisión piramidal de toda la región
- ✅ Supervisores, líderes y vendedores
- ✅ Métricas regionales

### **CEO** - Ve:
- ✅ TODO
- ✅ Comisión piramidal de toda la empresa
- ✅ Dashboard ejecutivo completo

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### **FASE 1: Backend - Migración y Estructura** ⚠️ CRÍTICO

1. ✅ Migrar datos de `vendors.json` a `aponnt_staff`
2. ✅ Agregar campos a `aponnt_staff` (SQL arriba)
3. ✅ Crear funciones de cálculo de comisiones
4. ✅ Crear endpoints API:
   - `GET /api/staff/:id/subordinates` - Obtener subordinados
   - `GET /api/staff/:id/commission` - Calcular comisión (directa + piramidal)
   - `GET /api/staff/:id/companies` - Empresas según rol
5. ✅ Modificar endpoint `GET /api/companies` para filtrar por jerarquía
6. ✅ Eliminar `VendorMemory.js` y `vendors.json`

---

### **FASE 2: Frontend - Formularios y UI** (YO LO HAGO)

1. ✅ Agregar campo ROL en formulario de alta de vendedores
2. ✅ Agregar campos jerárquicos (líder, supervisor, gerente, ceo)
3. ✅ JavaScript para mostrar/ocultar campos según rol
4. ✅ Actualizar listado de vendedores con nueva info
5. ✅ Crear dashboard personalizado por rol
6. ✅ Implementar filtros visuales según jerarquía

---

### **FASE 3: Testing y Validación**

1. ✅ Testear cálculo de comisiones piramidales
2. ✅ Verificar filtros multi-tenant por rol
3. ✅ Testear login con diferentes roles
4. ✅ Validar jerarquías complejas

---

## 📄 ARCHIVOS A MODIFICAR

### **Backend** (Otra sesión de Claude):
- `src/models/AponntStaff.js` - Actualizar modelo
- `migrations/YYYY-MM-DD_update_aponnt_staff_hierarchy.sql` - Nueva migración
- `migrations/YYYY-MM-DD_migrate_vendors_to_aponnt_staff.sql` - Script de migración
- `src/routes/aponntDashboard.js` - Actualizar endpoint companies
- Crear: `src/routes/staffRoutes.js` - Nuevos endpoints
- Eliminar: `src/models/VendorMemory.js`
- Eliminar: `data/vendors.json`

### **Frontend** (Esta sesión de Claude):
- `panel-administrativo.html` - Formulario de vendedores
- `panel-administrativo.html` - Dashboard por rol
- `panel-administrativo.html` - Listado de vendedores
- Crear: `public/js/modules/staff-hierarchy.js` - Lógica de jerarquía

---

## 🎯 RESUMEN EJECUTIVO

### **PROBLEMA ACTUAL**:
- ❌ Dos sistemas de vendedores (aponnt_staff + vendors.json)
- ❌ No hay jerarquía completa (falta gerente regional, CEO)
- ❌ No hay comisiones piramidales
- ❌ No hay filtros multi-tenant por nivel

### **SOLUCIÓN**:
- ✅ Unificar en `aponnt_staff` (PostgreSQL)
- ✅ Implementar jerarquía completa (7 niveles)
- ✅ Sistema piramidal de comisiones (SOLO ventas)
- ✅ Multi-tenant por rol con funciones SQL
- ✅ Dashboard personalizado por nivel

### **BENEFICIOS**:
- 🚀 Escalabilidad (puede crecer la estructura)
- 💰 Incentivo claro (piramidal motiva a crecer equipos)
- 🔒 Seguridad (cada uno ve solo lo suyo)
- 📊 Métricas precisas (comisiones calculadas automáticamente)
- 🎯 Claridad (cada rol sabe qué ve y qué comisiona)

---

**FIN DEL PLAN** 🎉

**Listo para pasarle al backend + implementar frontend** 🚀
