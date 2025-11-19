# 🎯 IMPLEMENTACIÓN BACKEND - SISTEMA COMPLETO DE ROLES Y COMISIONES

**Fecha**: 2025-01-19
**De**: Sesión Frontend (Claude)
**Para**: Sesión Backend (Claude)
**Prioridad**: 🔴 ALTA - Coordinación crítica

---

## 📚 DOCUMENTOS DE REFERENCIA

Este documento **consolida** los siguientes archivos:

1. **`RESUMEN-CAMBIOS-FRONTEND-ROLES.md`** - Cambios ya realizados en frontend
2. **`PLAN-ORGANIGRAMA-APONNT-JERARQUIA-PIRAMIDAL.md`** - Plan completo de jerarquía
3. **`RECOMENDACION-TABLA-VENDORS-STATS.md`** - Tabla de estadísticas de vendedores

**⚠️ IMPORTANTE**: Lee los 3 documentos completos para entender el contexto total.

---

## 🔄 CONTEXTO DE SESIONES - EVITAR CONFLICTOS

### **📌 DIVISIÓN DE TRABAJO**

**SESIÓN FRONTEND (quien escribe este documento)**:
- ✅ **Trabajó en**: `panel-administrativo.html` (SOLO frontend)
- ✅ **NO tocó**: Backend, panel-empresa.html, ni ningún archivo .js del servidor
- ✅ **Modificó**: HTML, CSS, JavaScript del lado del cliente (panel-administrativo)

**SESIÓN BACKEND (quien recibe este documento)**:
- ⏳ **Está trabajando en**: Backend + panel-empresa.html
- ⏳ **NO debe tocar**: `panel-administrativo.html` (ya modificado por otra sesión)

---

### **⚠️ IMPORTANTE - SCOPE DE MODIFICACIONES**

#### **🟢 FRONTEND - SOLO PANEL-ADMINISTRATIVO**

**Archivos modificados por sesión frontend**:
- ✅ `backend/public/panel-administrativo.html` (líneas específicas ya modificadas)
- ❌ **NO** se tocó `backend/public/panel-empresa.html`
- ❌ **NO** se tocó ningún archivo del servidor

**Cambios realizados**:
1. Header con usuario logueado (líneas 2814-2827)
2. Modal editar empresas - comisiones USD (líneas 4393-4421)
3. Funciones de autenticación (líneas 4833-4940)
4. Label "Tipo de Licencia de soporte..." (línea 4359)

**✅ RESULTADO**: Frontend de panel-administrativo está **LISTO** para recibir datos del backend.

---

#### **🔴 BACKEND - IMPACTO EN AMBOS PANELES**

**Modificaciones propuestas en este documento**:
- Base de datos (migraciones SQL)
- Modelos Sequelize (Company, AponntStaff, VendorStatistics)
- API endpoints (GET /companies, GET /vendors/:id/statistics, etc.)
- Funciones PostgreSQL (comisiones piramidales)
- Middleware (verifyStaffToken)

**⚠️ POSIBLE IMPACTO EN PANEL-EMPRESA**:

| Componente | ¿Afecta panel-empresa? | Acción requerida |
|------------|------------------------|------------------|
| **Migraciones SQL** (agregar campos) | ❌ NO (campos extra no rompen) | Ninguna |
| **Modelo Company** (nuevos campos) | ⚠️ POSIBLE (si panel-empresa lo usa) | Verificar que no haya queries hardcodeados |
| **API GET /companies** (filtros por rol) | ⚠️ POSIBLE (si panel-empresa lo consume) | Verificar que endpoint tenga fallback para users sin rol |
| **Middleware verifyStaffToken** | ❌ NO (solo se aplica a rutas de staff) | Ninguna |
| **vendor_statistics** (nueva tabla) | ❌ NO (tabla nueva) | Ninguna |
| **Frontend panel-empresa.html** | ✅ **NO SE TOCA** | **NO modificar** |

---

### **🛡️ ESTRATEGIA ANTI-CONFLICTOS**

#### **1. HACER COMMIT ANTES DE IMPLEMENTAR**

```bash
# IMPORTANTE: Antes de implementar este documento
git add .
git commit -m "CHECKPOINT: Estado antes de implementar sistema de roles y comisiones"
```

**Razón**: Si algo rompe, podemos revertir fácilmente.

---

#### **2. IMPLEMENTAR EN FASES CON TESTING**

**NO implementar todo de golpe**. Hacerlo así:

```
FASE 1: Migraciones SQL → Testing
FASE 2: Modelos Sequelize → Testing
FASE 3: API Endpoints → Testing panel-administrativo
FASE 4: Testing panel-empresa (verificar que NO rompió nada)
FASE 5: Migración de datos → Testing
FASE 6: Limpieza (eliminar VendorMemory)
```

---

#### **3. TESTING DE COMPATIBILIDAD**

**Después de cada fase, probar**:

✅ **Panel-administrativo**:
- Login staff → ver empresas filtradas por rol
- Crear/editar empresa → verificar comisiones USD
- Listar vendedores → verificar estadísticas

✅ **Panel-empresa** (NO debe romperse):
- Login empresa → verificar que funciona igual
- Ver usuarios → verificar que funciona igual
- Módulos ya implementados → verificar que funcionan igual

---

#### **4. QUERIES SQL DEFENSIVOS**

Al modificar `GET /companies`, **NO romper** para usuarios de empresa:

**MAL** (rompe panel-empresa):
```javascript
router.get('/companies', async (req, res) => {
  const user = req.user; // ❌ Asume que siempre existe
  if (user.role === 'sales_rep') { // ❌ Rompe si user no tiene role
    // filtrar
  }
});
```

**BIEN** (compatible con ambos):
```javascript
router.get('/companies', async (req, res) => {
  const user = req.user;
  let whereClause = {};

  // Solo filtrar si es usuario de staff CON rol
  if (user && user.role && ['sales_rep', 'sales_leader', 'sales_supervisor'].includes(user.role)) {
    // Aplicar filtros por rol
    whereClause = getCompanyFiltersByRole(user);
  } else {
    // Usuario de empresa o admin: sin filtro (backward compatibility)
    whereClause = {}; // Ve todas las empresas activas
  }

  const companies = await Company.findAll({
    where: { ...whereClause, is_active: true }
  });
  res.json(companies);
});
```

---

### **📊 RESUMEN - QUÉ TOCA CADA SESIÓN**

| Componente | Sesión Frontend | Sesión Backend |
|------------|-----------------|----------------|
| **panel-administrativo.html** | ✅ Ya modificado | ❌ **NO tocar** |
| **panel-empresa.html** | ❌ No tocado | ⚠️ Solo si es necesario (con cuidado) |
| **Migraciones SQL** | ❌ | ✅ Implementar según este doc |
| **Modelos Sequelize** | ❌ | ✅ Implementar según este doc |
| **API Endpoints** | ❌ | ✅ Implementar según este doc |
| **Testing panel-admin** | ✅ | ✅ Ambos |
| **Testing panel-empresa** | ❌ | ✅ Verificar compatibilidad |

---

### **🚨 REGLA DE ORO**

**SI ALGO ROMPE PANEL-EMPRESA → REVERTIR INMEDIATAMENTE**

Panel-empresa tiene funcionalidades ya implementadas que **NO deben verse afectadas**.

---

## ✅ LO QUE YA ESTÁ HECHO (FRONTEND)

### 1. **Header con Usuario Logueado** ✅
- Muestra nombre completo, rol con badge de color, ID
- Botón de logout funcional
- Lee de `localStorage.aponnt_user_staff`

### 2. **Modal Editar Empresas** ✅
- Campo "Vendedor" → READONLY (muestra nombre - email - tel)
- Campo "% Comisión permanente por venta" → READONLY
- Campo "% Comisión Temporal por soporte" → READONLY
- Grid 2x2 con comisiones USD auto-calculadas:
  - 💰 Comisión Venta (USD) - verde, readonly
  - 🛠️ Comisión Soporte (USD) - azul, readonly
- CBU eliminado del modal de empresas
- Label actualizado: "Tipo de Licencia de soporte y asistencia al usuario"

### 3. **Sistema de Autenticación** ✅
- Función `checkAuthentication()` lee localStorage
- Función `loadUserInfoToHeader()` actualiza UI
- Función `handleLogout()` limpia todo y redirige

### 4. **Frontend Listo Para**:
- ✅ Recibir `salesCommissionUSD` y `supportCommissionUSD` del backend
- ✅ Enviar ambos campos al crear/editar empresa
- ✅ Mostrar rol jerárquico del usuario logueado
- ✅ Filtrar empresas según rol (cuando backend implemente)

---

## 🔴 LO QUE NECESITA BACKEND (IMPLEMENTAR)

---

## PARTE 1: TABLA `companies` - Agregar Campos

### **Migración SQL**:

```sql
-- Archivo: migrations/20250119_add_commission_fields_to_companies.sql

ALTER TABLE companies
  -- Vendedores asignados
  ADD COLUMN IF NOT EXISTS created_by_staff_id UUID REFERENCES aponnt_staff(id),
  ADD COLUMN IF NOT EXISTS assigned_vendor_id UUID REFERENCES aponnt_staff(id),
  ADD COLUMN IF NOT EXISTS support_vendor_id UUID REFERENCES aponnt_staff(id),

  -- Comisiones USD (calculadas automáticamente)
  ADD COLUMN IF NOT EXISTS sales_commission_usd DECIMAL(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS support_commission_usd DECIMAL(12,2) DEFAULT 0.00;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_companies_assigned_vendor ON companies(assigned_vendor_id);
CREATE INDEX IF NOT EXISTS idx_companies_support_vendor ON companies(support_vendor_id);
CREATE INDEX IF NOT EXISTS idx_companies_created_by_staff ON companies(created_by_staff_id);
```

### **Descripción de Campos**:

| Campo                   | Tipo           | Descripción                                          |
|-------------------------|----------------|------------------------------------------------------|
| `created_by_staff_id`   | UUID           | ID del staff que creó la empresa                     |
| `assigned_vendor_id`    | UUID           | Vendedor asignado a VENTAS (comisión permanente)     |
| `support_vendor_id`     | UUID           | Vendedor asignado a SOPORTE (comisión temporal)      |
| `sales_commission_usd`  | DECIMAL(12,2)  | Comisión en USD para vendedor de venta               |
| `support_commission_usd`| DECIMAL(12,2)  | Comisión en USD para vendedor de soporte             |

---

## PARTE 2: TABLA `vendor_statistics` - Crear Nueva Tabla

### **¿Por qué?**

Actualmente el **listado de vendedores** muestra columnas que NO existen en ninguna tabla:
- Cantidad de empresas (ventas/soporte)
- Cantidad de usuarios
- Comisiones totales
- Rating, referidos, etc.

**Solución**: Tabla con **estadísticas consolidadas** actualizadas por triggers.

### **Migración SQL**:

```sql
-- Archivo: migrations/20250119_create_vendor_statistics.sql

CREATE TABLE vendor_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relación con vendedor
    vendor_id UUID NOT NULL REFERENCES aponnt_staff(id) ON DELETE CASCADE,

    -- Empresas asignadas
    total_companies INTEGER DEFAULT 0,
    sales_companies INTEGER DEFAULT 0,         -- Empresas donde es vendedor de venta
    support_companies INTEGER DEFAULT 0,       -- Empresas donde es vendedor de soporte

    -- Usuarios gestionados
    total_users INTEGER DEFAULT 0,
    sales_users INTEGER DEFAULT 0,             -- Usuarios de empresas de venta
    support_users INTEGER DEFAULT 0,           -- Usuarios de empresas de soporte

    -- Comisiones de Venta
    sales_commission_percentage DECIMAL(5,2) DEFAULT 10.00,  -- % comisión permanente
    total_sales_commission_usd DECIMAL(12,2) DEFAULT 0.00,  -- Total acumulado en USD
    monthly_sales_commission_usd DECIMAL(12,2) DEFAULT 0.00, -- Comisión del mes actual

    -- Comisiones de Soporte
    support_commission_percentage DECIMAL(5,2) DEFAULT 0.00,  -- % comisión temporal
    total_support_commission_usd DECIMAL(12,2) DEFAULT 0.00,  -- Total acumulado en USD
    monthly_support_commission_usd DECIMAL(12,2) DEFAULT 0.00, -- Comisión del mes actual

    -- Referidos (vendedores que trajo)
    total_referrals INTEGER DEFAULT 0,
    referral_commission_usd DECIMAL(12,2) DEFAULT 0.00,  -- Comisión por referidos

    -- Totales generales
    grand_total_commission_usd DECIMAL(12,2) DEFAULT 0.00,  -- Suma de todas las comisiones
    total_modules_value_usd DECIMAL(12,2) DEFAULT 0.00,     -- Valor total de módulos vendidos

    -- Calificación y desempeño
    rating DECIMAL(3,1) DEFAULT 0.0,           -- Rating promedio (0-5)
    total_ratings INTEGER DEFAULT 0,            -- Cantidad de calificaciones recibidas

    -- Datos bancarios (movido aquí desde companies)
    cbu VARCHAR(22),                            -- CBU del vendedor

    -- Timestamps
    last_updated_at TIMESTAMP DEFAULT NOW(),    -- Última actualización de estadísticas
    created_at TIMESTAMP DEFAULT NOW(),

    -- Constraint único
    CONSTRAINT vendor_statistics_vendor_id_unique UNIQUE(vendor_id)
);

-- Índices
CREATE INDEX idx_vendor_statistics_vendor_id ON vendor_statistics(vendor_id);
CREATE INDEX idx_vendor_statistics_grand_total ON vendor_statistics(grand_total_commission_usd DESC);
CREATE INDEX idx_vendor_statistics_rating ON vendor_statistics(rating DESC);
```

### **Función para Recalcular Estadísticas**:

```sql
-- Archivo: migrations/20250119_create_vendor_statistics.sql (continuación)

CREATE OR REPLACE FUNCTION refresh_vendor_statistics(p_vendor_id UUID)
RETURNS VOID AS $$
DECLARE
    v_sales_companies INTEGER;
    v_support_companies INTEGER;
    v_sales_users INTEGER;
    v_support_users INTEGER;
    v_total_sales_usd DECIMAL(12,2);
    v_total_support_usd DECIMAL(12,2);
    v_total_modules_value DECIMAL(12,2);
BEGIN
    -- Contar empresas de venta
    SELECT COUNT(*) INTO v_sales_companies
    FROM companies
    WHERE assigned_vendor_id = p_vendor_id AND is_active = true;

    -- Contar empresas de soporte
    SELECT COUNT(*) INTO v_support_companies
    FROM companies
    WHERE support_vendor_id = p_vendor_id AND is_active = true;

    -- Contar usuarios de ventas
    SELECT COALESCE(SUM(u.total_users), 0) INTO v_sales_users
    FROM companies c
    LEFT JOIN (
        SELECT company_id, COUNT(*) as total_users
        FROM users
        GROUP BY company_id
    ) u ON c.id = u.company_id
    WHERE c.assigned_vendor_id = p_vendor_id AND c.is_active = true;

    -- Contar usuarios de soporte
    SELECT COALESCE(SUM(u.total_users), 0) INTO v_support_users
    FROM companies c
    LEFT JOIN (
        SELECT company_id, COUNT(*) as total_users
        FROM users
        GROUP BY company_id
    ) u ON c.id = u.company_id
    WHERE c.support_vendor_id = p_vendor_id AND c.is_active = true;

    -- Calcular comisiones de venta (suma de sales_commission_usd de todas las empresas)
    SELECT COALESCE(SUM(sales_commission_usd), 0) INTO v_total_sales_usd
    FROM companies
    WHERE assigned_vendor_id = p_vendor_id AND is_active = true;

    -- Calcular comisiones de soporte
    SELECT COALESCE(SUM(support_commission_usd), 0) INTO v_total_support_usd
    FROM companies
    WHERE support_vendor_id = p_vendor_id AND is_active = true;

    -- Calcular valor total de módulos (suma de monthly_total)
    SELECT COALESCE(SUM(monthly_total), 0) INTO v_total_modules_value
    FROM companies
    WHERE (assigned_vendor_id = p_vendor_id OR support_vendor_id = p_vendor_id)
    AND is_active = true;

    -- Actualizar o insertar en vendor_statistics
    INSERT INTO vendor_statistics (
        vendor_id,
        sales_companies,
        support_companies,
        total_companies,
        sales_users,
        support_users,
        total_users,
        total_sales_commission_usd,
        monthly_sales_commission_usd,
        total_support_commission_usd,
        monthly_support_commission_usd,
        grand_total_commission_usd,
        total_modules_value_usd,
        last_updated_at
    ) VALUES (
        p_vendor_id,
        v_sales_companies,
        v_support_companies,
        v_sales_companies + v_support_companies,
        v_sales_users,
        v_support_users,
        v_sales_users + v_support_users,
        v_total_sales_usd,
        v_total_sales_usd,  -- Por ahora igual, después se puede filtrar por mes
        v_total_support_usd,
        v_total_support_usd,
        v_total_sales_usd + v_total_support_usd,
        v_total_modules_value,
        NOW()
    )
    ON CONFLICT (vendor_id) DO UPDATE SET
        sales_companies = EXCLUDED.sales_companies,
        support_companies = EXCLUDED.support_companies,
        total_companies = EXCLUDED.total_companies,
        sales_users = EXCLUDED.sales_users,
        support_users = EXCLUDED.support_users,
        total_users = EXCLUDED.total_users,
        total_sales_commission_usd = EXCLUDED.total_sales_commission_usd,
        monthly_sales_commission_usd = EXCLUDED.monthly_sales_commission_usd,
        total_support_commission_usd = EXCLUDED.total_support_commission_usd,
        monthly_support_commission_usd = EXCLUDED.monthly_support_commission_usd,
        grand_total_commission_usd = EXCLUDED.grand_total_commission_usd,
        total_modules_value_usd = EXCLUDED.total_modules_value_usd,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

### **Trigger para Auto-Actualizar**:

```sql
-- Archivo: migrations/20250119_create_vendor_statistics.sql (continuación)

CREATE OR REPLACE FUNCTION update_vendor_statistics_on_company_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalcular estadísticas del vendedor de venta
    IF NEW.assigned_vendor_id IS NOT NULL THEN
        PERFORM refresh_vendor_statistics(NEW.assigned_vendor_id);
    END IF;

    -- Recalcular estadísticas del vendedor de soporte
    IF NEW.support_vendor_id IS NOT NULL THEN
        PERFORM refresh_vendor_statistics(NEW.support_vendor_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vendor_stats_on_company
    AFTER INSERT OR UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_statistics_on_company_change();
```

---

## PARTE 3: TABLA `aponnt_staff` - Jerarquía Completa

### **Contexto**:

Actualmente existe **DUPLICACIÓN**:
- ✅ `aponnt_staff` (PostgreSQL) - Usado para login
- ❌ `vendors.json` (VendorMemory) - Usado para listar vendedores

**DECISIÓN**: Migrar TODO a `aponnt_staff` y eliminar `vendors.json`.

### **Nuevos Roles** (Jerarquía Completa):

```sql
-- Archivo: migrations/20250119_update_aponnt_staff_hierarchy.sql

-- 1. Actualizar ENUM de roles
ALTER TABLE aponnt_staff DROP CONSTRAINT IF EXISTS aponnt_staff_role_check;

ALTER TABLE aponnt_staff ADD CONSTRAINT aponnt_staff_role_check CHECK (
  role IN (
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
  )
);
```

### **Nuevos Campos**:

```sql
-- Archivo: migrations/20250119_update_aponnt_staff_hierarchy.sql (continuación)

ALTER TABLE aponnt_staff
  -- Jerárquicos (ya existen: leader_id, supervisor_id)
  ADD COLUMN IF NOT EXISTS regional_manager_id UUID REFERENCES aponnt_staff(id),
  ADD COLUMN IF NOT EXISTS ceo_id UUID REFERENCES aponnt_staff(id),

  -- Comisiones (mover desde vendors.json)
  ADD COLUMN IF NOT EXISTS sales_commission_percentage DECIMAL(5,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS support_commission_percentage DECIMAL(5,2) DEFAULT 0.00,

  -- Comisiones piramidales (SOLO para ventas)
  ADD COLUMN IF NOT EXISTS pyramid_commission_percentage DECIMAL(5,2) DEFAULT 0.00,

  -- Configuración (mover desde vendors.json)
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

### **Relaciones Jerárquicas**:

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

## PARTE 4: SISTEMA PIRAMIDAL DE COMISIONES

### **Reglas**:

1. ✅ **Comisión de VENTA**: Permanente, no transferible
2. ✅ **Comisión de SOPORTE**: Temporal, transferible
3. 🔺 **Comisión PIRAMIDAL**: **SOLO por ventas**, NO por soporte
4. 🔺 **Comisión PIRAMIDAL**: Se aplica a TODOS los niveles superiores

### **Ejemplo**:

**Jerarquía**:
```
CEO
 └── Gerente Regional Ventas (Juan)
      └── Supervisor Ventas (María)
           └── Líder Ventas (Pedro)
                └── Vendedor (Carlos)
```

**Carlos vende empresa por $1,000 USD/mes**:

| Persona          | Rol                   | Tipo Comisión | %     | Monto USD |
|------------------|-----------------------|---------------|-------|-----------|
| Carlos           | Vendedor              | Directa       | 10%   | $100      |
| Pedro            | Líder                 | Piramidal     | 2%    | $20       |
| María            | Supervisor            | Piramidal     | 1.5%  | $15       |
| Juan             | Gerente Regional      | Piramidal     | 1%    | $10       |
| CEO              | CEO                   | Piramidal     | 0.5%  | $5        |
| **TOTAL**        |                       |               | **15%**| **$150** |
| **Margen Aponnt**|                       |               | **85%**| **$850** |

### **Porcentajes Piramidales**:

| Rol                          | % Comisión Piramidal | Sobre quién aplica                |
|------------------------------|----------------------|-----------------------------------|
| `sales_rep` (Vendedor)       | 0%                   | N/A (comisiona solo por su venta) |
| `sales_leader` (Líder)       | 2%                   | Ventas de sus vendedores          |
| `sales_supervisor`           | 1.5%                 | Ventas de todos los líderes       |
| `regional_sales_manager`     | 1%                   | Ventas de todos los supervisores  |
| `ceo`                        | 0.5%                 | Ventas de toda la empresa         |

**Campo**: `aponnt_staff.pyramid_commission_percentage`

### **Función de Cálculo Piramidal**:

```sql
-- Archivo: migrations/20250119_create_pyramid_commission_functions.sql

CREATE OR REPLACE FUNCTION calculate_pyramid_commission(
  p_staff_id UUID,
  p_month INTEGER DEFAULT NULL,
  p_year INTEGER DEFAULT NULL
)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  v_role VARCHAR(50);
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

## PARTE 5: MULTI-TENANT POR ROL (FILTROS)

### **Objetivo**:

Cada usuario **solo ve las empresas que le corresponden** según su rol.

### **Filtros SQL**:

#### **1. Vendedor (sales_rep)**:
```sql
SELECT * FROM companies
WHERE (assigned_vendor_id = :user_id OR support_vendor_id = :user_id)
  AND is_active = true;
```

#### **2. Líder (sales_leader)**:
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

#### **3. Supervisor (sales_supervisor)**:
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

#### **4. Gerente Regional**:
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

#### **5. CEO / Admin**:
```sql
-- TODO (sin filtro)
SELECT * FROM companies WHERE is_active = true;
```

### **Implementación en Backend**:

**Archivo**: `src/routes/aponntDashboard.js`

```javascript
router.get('/companies', verifyStaffToken, async (req, res) => {
  try {
    const { user } = req; // Usuario autenticado desde middleware

    let whereClause = {};

    // Filtrar según rol
    if (user.role === 'sales_rep') {
      // Vendedor: Solo sus empresas (ventas o soporte)
      whereClause = {
        [Op.or]: [
          { assigned_vendor_id: user.id },
          { support_vendor_id: user.id }
        ]
      };
    } else if (user.role === 'sales_leader') {
      // Líder: Sus empresas + empresas de sus vendedores
      const vendorIds = await getVendorsUnderLeader(user.id);
      whereClause = {
        [Op.or]: [
          { assigned_vendor_id: { [Op.in]: [user.id, ...vendorIds] } },
          { support_vendor_id: { [Op.in]: [user.id, ...vendorIds] } }
        ]
      };
    } else if (user.role === 'sales_supervisor') {
      // Supervisor: Empresas de líderes bajo su supervisión
      const leaderIds = await getLeadersUnderSupervisor(user.id);
      const vendorIds = await getVendorsUnderLeaders(leaderIds);
      whereClause = {
        [Op.or]: [
          { assigned_vendor_id: { [Op.in]: [user.id, ...leaderIds, ...vendorIds] } },
          { support_vendor_id: { [Op.in]: [user.id, ...leaderIds, ...vendorIds] } }
        ]
      };
    }
    // Si es admin o ceo: sin filtro (ve todo)

    const companies = await Company.findAll({
      where: { ...whereClause, is_active: true },
      order: [['created_at', 'DESC']]
    });

    res.json(companies);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Funciones helper
async function getVendorsUnderLeader(leaderId) {
  const staff = await AponntStaff.findAll({
    where: { leader_id: leaderId, role: 'sales_rep' },
    attributes: ['id']
  });
  return staff.map(s => s.id);
}

async function getLeadersUnderSupervisor(supervisorId) {
  const staff = await AponntStaff.findAll({
    where: { supervisor_id: supervisorId, role: 'sales_leader' },
    attributes: ['id']
  });
  return staff.map(s => s.id);
}

async function getVendorsUnderLeaders(leaderIds) {
  if (leaderIds.length === 0) return [];
  const staff = await AponntStaff.findAll({
    where: { leader_id: { [Op.in]: leaderIds }, role: 'sales_rep' },
    attributes: ['id']
  });
  return staff.map(s => s.id);
}
```

---

## PARTE 6: API ENDPOINTS NUEVOS

### **1. GET `/api/vendors/:id/statistics`**

**Propósito**: Obtener estadísticas consolidadas de un vendedor

**Response**:
```json
{
  "vendor_id": "uuid-here",
  "total_companies": 15,
  "sales_companies": 10,
  "support_companies": 5,
  "total_users": 150,
  "sales_users": 100,
  "support_users": 50,
  "sales_commission_percentage": 10.0,
  "total_sales_commission_usd": 15000.00,
  "monthly_sales_commission_usd": 1200.00,
  "support_commission_percentage": 5.0,
  "total_support_commission_usd": 3000.00,
  "monthly_support_commission_usd": 250.00,
  "grand_total_commission_usd": 18000.00,
  "total_modules_value_usd": 180000.00,
  "rating": 4.5,
  "cbu": "1234567890123456789012"
}
```

**Implementación**:
```javascript
router.get('/vendors/:id/statistics', async (req, res) => {
  try {
    const stats = await VendorStatistics.findOne({
      where: { vendor_id: req.params.id }
    });

    if (!stats) {
      return res.json({
        vendor_id: req.params.id,
        total_companies: 0,
        sales_companies: 0,
        support_companies: 0,
        total_users: 0,
        sales_users: 0,
        support_users: 0,
        sales_commission_percentage: 10.0,
        total_sales_commission_usd: 0,
        monthly_sales_commission_usd: 0,
        support_commission_percentage: 0,
        total_support_commission_usd: 0,
        monthly_support_commission_usd: 0,
        grand_total_commission_usd: 0,
        total_modules_value_usd: 0,
        rating: 0,
        cbu: null
      });
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### **2. GET `/api/staff/:id/subordinates`**

**Propósito**: Obtener todos los subordinados de un staff según su rol

**Response**:
```json
{
  "staff_id": "uuid-here",
  "role": "sales_supervisor",
  "direct_subordinates": [
    { "id": "uuid1", "name": "Juan Pérez", "role": "sales_leader" },
    { "id": "uuid2", "name": "María García", "role": "sales_leader" }
  ],
  "all_subordinates": [
    { "id": "uuid1", "name": "Juan Pérez", "role": "sales_leader" },
    { "id": "uuid2", "name": "María García", "role": "sales_leader" },
    { "id": "uuid3", "name": "Carlos López", "role": "sales_rep" },
    { "id": "uuid4", "name": "Ana Martínez", "role": "sales_rep" }
  ]
}
```

### **3. GET `/api/staff/:id/commission`**

**Propósito**: Calcular comisión total (directa + piramidal) de un staff

**Response**:
```json
{
  "staff_id": "uuid-here",
  "month": 1,
  "year": 2025,
  "direct_commission_usd": 1500.00,
  "pyramid_commission_usd": 350.00,
  "total_commission_usd": 1850.00,
  "companies_count": 12,
  "subordinates_count": 8
}
```

---

## PARTE 7: MIGRACIÓN DE DATOS

### **Script de Migración** (vendors.json → aponnt_staff):

**Archivo**: `scripts/migrate-vendors-to-aponnt-staff.js`

```javascript
const { AponntStaff } = require('../src/models');
const VendorMemory = require('../src/models/VendorMemory');

async function migrateVendorsToAponntStaff() {
  console.log('🔄 Iniciando migración de vendors.json a aponnt_staff...');

  const vendors = await VendorMemory.findAll();
  console.log(`📋 ${vendors.length} vendedores encontrados en vendors.json`);

  for (const vendor of vendors) {
    try {
      // Buscar si ya existe en aponnt_staff por email
      const existingStaff = await AponntStaff.findOne({
        where: { email: vendor.email }
      });

      if (existingStaff) {
        // Actualizar campos faltantes
        await existingStaff.update({
          sales_commission_percentage: vendor.commissionPercentage || 10,
          support_commission_percentage: vendor.supportCommissionPercentage || 0,
          accepts_support_packages: vendor.acceptsSupportPackages || false,
          participates_in_auctions: vendor.participatesInAuctions || false,
          cbu: vendor.cbu || null,
          rating: vendor.rating || 0,
          notes: vendor.notes || null
        });
        console.log(`✅ Actualizado: ${vendor.name} (${vendor.email})`);
      } else {
        console.warn(`⚠️ Vendedor no encontrado en aponnt_staff: ${vendor.name} (${vendor.email})`);
        console.warn(`   Debe ser creado manualmente con las credenciales correctas.`);
      }
    } catch (error) {
      console.error(`❌ Error migrando ${vendor.name}:`, error.message);
    }
  }

  console.log('✅ Migración completada');
}

migrateVendorsToAponntStaff();
```

**⚠️ IMPORTANTE**: Este script **NO crea** nuevos usuarios en `aponnt_staff`, solo **actualiza** los existentes con datos de `vendors.json`. Los usuarios deben ser creados previamente con credenciales.

---

## PARTE 8: ELIMINAR CÓDIGO OBSOLETO

### **Archivos a ELIMINAR**:

1. ❌ `src/models/VendorMemory.js`
2. ❌ `data/vendors.json`

### **Código a MODIFICAR**:

**En todos los archivos que usen `VendorMemory`**, reemplazar por queries a `aponnt_staff`:

**Antes**:
```javascript
const VendorMemory = require('./models/VendorMemory');
const vendors = await VendorMemory.findAll();
```

**Después**:
```javascript
const { AponntStaff } = require('./models');
const vendors = await AponntStaff.findAll({
  where: {
    role: { [Op.in]: ['sales_rep', 'sales_leader', 'sales_supervisor'] }
  }
});
```

---

## PARTE 9: MIDDLEWARE DE AUTENTICACIÓN

### **Archivo**: `src/middleware/auth.js`

```javascript
const jwt = require('jsonwebtoken');
const { AponntStaff } = require('../models');

async function verifyStaffToken(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await AponntStaff.findByPk(decoded.id);

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Usuario inactivo o no encontrado' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      leader_id: user.leader_id,
      supervisor_id: user.supervisor_id,
      regional_manager_id: user.regional_manager_id,
      ceo_id: user.ceo_id
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = { verifyStaffToken };
```

### **Aplicar en Rutas**:

```javascript
const { verifyStaffToken } = require('../middleware/auth');

router.get('/companies', verifyStaffToken, async (req, res) => {
  // req.user está disponible aquí
});
```

---

## PARTE 10: MODELO SEQUELIZE - VendorStatistics

### **Archivo**: `src/models/VendorStatistics.js`

```javascript
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VendorStatistics = sequelize.define('VendorStatistics', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    vendor_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'aponnt_staff',
        key: 'id'
      }
    },
    total_companies: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    sales_companies: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    support_companies: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_users: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    sales_users: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    support_users: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    sales_commission_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 10.00
    },
    total_sales_commission_usd: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    monthly_sales_commission_usd: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    support_commission_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    total_support_commission_usd: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    monthly_support_commission_usd: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    total_referrals: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    referral_commission_usd: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    grand_total_commission_usd: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    total_modules_value_usd: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    rating: {
      type: DataTypes.DECIMAL(3, 1),
      defaultValue: 0.0
    },
    total_ratings: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    cbu: {
      type: DataTypes.STRING(22),
      allowNull: true
    },
    last_updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'vendor_statistics',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  VendorStatistics.associate = function(models) {
    VendorStatistics.belongsTo(models.AponntStaff, {
      foreignKey: 'vendor_id',
      as: 'vendor'
    });
  };

  return VendorStatistics;
};
```

### **Registrar en `src/config/database.js`**:

```javascript
const VendorStatistics = require('./models/VendorStatistics')(sequelize);

// Asociaciones
VendorStatistics.associate({
  AponntStaff: AponntStaff
});

module.exports = {
  // ...
  VendorStatistics
};
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **FASE 1: Estructura de Base de Datos** (2-3 horas)

- [ ] 1.1. Ejecutar migración `20250119_add_commission_fields_to_companies.sql`
- [ ] 1.2. Ejecutar migración `20250119_create_vendor_statistics.sql`
- [ ] 1.3. Ejecutar migración `20250119_update_aponnt_staff_hierarchy.sql`
- [ ] 1.4. Ejecutar migración `20250119_create_pyramid_commission_functions.sql`
- [ ] 1.5. Verificar que todos los triggers funcionan

### **FASE 2: Modelos Sequelize** (1 hora)

- [ ] 2.1. Actualizar modelo `AponntStaff.js` con nuevos campos
- [ ] 2.2. Crear modelo `VendorStatistics.js`
- [ ] 2.3. Registrar asociaciones en `database.js`
- [ ] 2.4. Probar con `.sync()` en desarrollo

### **FASE 3: API Endpoints** (2-3 horas)

- [ ] 3.1. Modificar `GET /api/aponnt/dashboard/companies` con filtros por rol
- [ ] 3.2. Crear funciones helper (getVendorsUnderLeader, etc.)
- [ ] 3.3. Crear `GET /api/vendors/:id/statistics`
- [ ] 3.4. Crear `GET /api/staff/:id/subordinates`
- [ ] 3.5. Crear `GET /api/staff/:id/commission`
- [ ] 3.6. Aplicar middleware `verifyStaffToken` en todas las rutas

### **FASE 4: Migración de Datos** (1 hora)

- [ ] 4.1. Ejecutar script `migrate-vendors-to-aponnt-staff.js`
- [ ] 4.2. Verificar que todos los vendedores tienen datos completos
- [ ] 4.3. Ejecutar `refresh_vendor_statistics()` para cada vendedor

### **FASE 5: Limpieza** (30 min)

- [ ] 5.1. Eliminar `src/models/VendorMemory.js`
- [ ] 5.2. Eliminar `data/vendors.json`
- [ ] 5.3. Buscar y reemplazar todos los usos de `VendorMemory`
- [ ] 5.4. Commit de cleanup

### **FASE 6: Testing** (1-2 horas)

- [ ] 6.1. Login con vendedor → verificar que ve solo sus empresas
- [ ] 6.2. Login con líder → verificar que ve empresas de sus vendedores
- [ ] 6.3. Login con supervisor → verificar jerarquía completa
- [ ] 6.4. Probar cálculo de comisiones piramidales
- [ ] 6.5. Crear empresa nueva → verificar que comisiones USD se calculan
- [ ] 6.6. Verificar que estadísticas se actualizan automáticamente

---

## 📊 RESUMEN EJECUTIVO

### **LO QUE HAY QUE HACER**:

1. ✅ Agregar campos a tabla `companies` (assigned_vendor_id, sales_commission_usd, etc.)
2. ✅ Crear tabla `vendor_statistics` con triggers automáticos
3. ✅ Actualizar tabla `aponnt_staff` (jerarquía completa, comisiones, CBU, rating)
4. ✅ Crear funciones PostgreSQL para comisiones piramidales
5. ✅ Modificar GET /companies con filtros multi-tenant por rol
6. ✅ Crear endpoints nuevos (statistics, subordinates, commission)
7. ✅ Migrar datos de vendors.json a aponnt_staff
8. ✅ Eliminar VendorMemory.js y vendors.json
9. ✅ Testing completo

### **TIEMPO ESTIMADO**: 8-12 horas de trabajo

### **PRIORIDAD**:
1. 🔴 **CRÍTICO**: FASE 1 (base de datos) + FASE 2 (modelos)
2. 🟠 **ALTA**: FASE 3 (API endpoints) + FASE 6 (testing)
3. 🟡 **MEDIA**: FASE 4 (migración) + FASE 5 (limpieza)

---

## 🤝 COORDINACIÓN CON FRONTEND

**Frontend está listo para**:
- ✅ Enviar `salesCommissionUSD` y `supportCommissionUSD`
- ✅ Mostrar empresas filtradas por rol
- ✅ Mostrar info del usuario logueado
- ✅ Consumir API `/api/vendors/:id/statistics`

**Frontend necesita** (para siguiente fase):
- Campo ROL en formulario de alta de vendedores
- Campos jerárquicos (líder, supervisor, etc.)
- Dashboard personalizado por rol

**Pero primero el backend debe estar listo.**

---

## 📞 CONTACTO

Si hay dudas sobre alguna parte, revisar los **3 documentos de referencia**:
1. `RESUMEN-CAMBIOS-FRONTEND-ROLES.md`
2. `PLAN-ORGANIGRAMA-APONNT-JERARQUIA-PIRAMIDAL.md`
3. `RECOMENDACION-TABLA-VENDORS-STATS.md`

---

**FIN DEL DOCUMENTO** 🚀

**Listo para implementación backend completa** ✅
