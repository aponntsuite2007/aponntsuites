# Guía de Implementación: Sistema Multi-Sucursal

## CONTEXTO PARA CLAUDE (LEER PRIMERO)

### Estado Actual del Sistema (2025-11-26)

El sistema de asistencia biométrico es **multi-tenant** (múltiples empresas) pero **NO es multi-branch** (múltiples sucursales por empresa). Sin embargo, la infraestructura YA EXISTE parcialmente:

| Tabla | branch_id | Estado | Datos |
|-------|-----------|--------|-------|
| `users` | ✅ Existe (nullable) | Sin usar | 0/125 usuarios con branch |
| `departments` | ✅ Existe (nullable) | Sin usar | 0/6 departamentos con branch |
| `shifts` | ✅ Existe (nullable) | Sin usar | 0/7 turnos con branch |
| `company_branches` | ✅ Existe | Tabla completa | 21 columnas definidas |
| `kiosks` | ❌ NO tiene | Usa `authorized_departments` | MÁS FLEXIBLE |
| `attendances` | ❌ NO tiene | Solo `kiosk_id` | No necesita |

### REGLA DE ORO: `NULL = GLOBAL`

```sql
-- ESTO ES CRÍTICO - NUNCA ROMPER ESTE PRINCIPIO
branch_id = NULL  →  "Aplica a TODA la empresa" (comportamiento actual)
branch_id = 123   →  "Aplica SOLO a sucursal 123"
```

### RELACIONES CRÍTICAS - NO TOCAR

```
┌──────────────┐      authorized_departments (JSON)      ┌──────────────┐
│    KIOSK     │ ──────────────────────────────────────> │  DEPARTMENTS │
│              │         [1, 3, 5] (array IDs)           │              │
└──────────────┘                                         └──────────────┘

Esta relación es MÁS FLEXIBLE que branch_id porque:
- Un kiosko puede autorizar departamentos de DIFERENTES sucursales
- Permite kioscos compartidos (ej: recepción central)
- NO agregar branch_id a kiosks
```

### Triggers Multi-Tenant Activos

```sql
-- Ya existen y protegen la integridad:
validate_user_department_company     -- en users
validate_attendance_company          -- en attendances
validate_shift_assignment_company    -- en user_shift_assignments
```

---

## FASES DE IMPLEMENTACIÓN

### Fase MB-1: Feature Flag `multi_branch_enabled` (RIESGO: CERO)

**Objetivo**: Agregar campo booleano a companies para activar/desactivar funcionalidad multi-sucursal.

**Archivo de migración a crear**: `migrations/20251126_add_multi_branch_enabled.sql`

```sql
-- Migración: Agregar multi_branch_enabled a companies
-- Fecha: 2025-11-26
-- Riesgo: CERO - Solo agrega campo, no modifica comportamiento

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS multi_branch_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN companies.multi_branch_enabled IS
'Feature flag para habilitar funcionalidad multi-sucursal. FALSE = comportamiento actual (sin sucursales visibles en UI)';

-- Verificación
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'companies' AND column_name = 'multi_branch_enabled';
```

**Modelo a actualizar**: `src/models/Company.js`

```javascript
// Agregar al modelo:
multi_branch_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Feature flag para funcionalidad multi-sucursal'
}
```

**Verificación post-implementación**:
```bash
# Ejecutar en psql o script
SELECT company_id, name, multi_branch_enabled FROM companies LIMIT 5;
# Todas deben mostrar multi_branch_enabled = false
```

---

### Fase MB-2: Campo `branch_scope` en Users (RIESGO: BAJO)

**Objetivo**: Permitir que usuarios (especialmente managers) tengan acceso a múltiples sucursales.

**Archivo de migración a crear**: `migrations/20251126_add_branch_scope_to_users.sql`

```sql
-- Migración: Agregar branch_scope a users
-- Fecha: 2025-11-26
-- Riesgo: BAJO - Solo agrega campo opcional

ALTER TABLE users
ADD COLUMN IF NOT EXISTS branch_scope JSONB DEFAULT NULL;

COMMENT ON COLUMN users.branch_scope IS
'Array de branch_ids a los que el usuario tiene acceso. NULL = acceso a todas las sucursales (gerente general). Ejemplo: [1, 2, 5]';

-- Crear índice GIN para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_users_branch_scope ON users USING GIN (branch_scope);

-- Verificación
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'branch_scope';
```

**Modelo a actualizar**: `src/models/User-postgresql.js`

```javascript
// Agregar al modelo:
branch_scope: {
    type: DataTypes.JSONB,
    defaultValue: null,
    allowNull: true,
    comment: 'Array de branch_ids accesibles. NULL = todas las sucursales'
}
```

**Lógica de acceso**:
```javascript
// En servicios/controladores:
function getUserAccessibleBranches(user) {
    // Si branch_scope es null, tiene acceso a TODO
    if (user.branch_scope === null) {
        return 'ALL'; // Gerente general
    }
    // Si tiene array, solo esas sucursales
    return user.branch_scope; // [1, 2, 5]
}
```

---

### Fase MB-3: UI Condicional (RIESGO: BAJO)

**Objetivo**: Mostrar/ocultar selector de sucursales según `multi_branch_enabled`.

**Archivo a modificar**: `public/panel-empresa.html`

**Lógica**:
```javascript
// En la carga inicial del panel
async function initializeBranchSelector() {
    const company = await getCurrentCompany();

    if (!company.multi_branch_enabled) {
        // Ocultar todo lo relacionado con sucursales
        document.querySelectorAll('.branch-selector').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.branch-column').forEach(el => el.style.display = 'none');
        return;
    }

    // Mostrar selector y cargar sucursales
    const branches = await loadCompanyBranches();
    populateBranchSelector(branches);
}
```

**Componente a crear**: `public/js/components/branch-selector.js`

```javascript
// Selector reutilizable de sucursales
class BranchSelector {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.includeGlobal = options.includeGlobal ?? true; // "Todas" como opción
        this.onSelect = options.onSelect || (() => {});
    }

    async render() {
        const branches = await this.loadBranches();
        let html = '<select class="branch-selector-dropdown">';

        if (this.includeGlobal) {
            html += '<option value="">Todas las sucursales</option>';
        }

        branches.forEach(b => {
            html += `<option value="${b.id}">${b.name}</option>`;
        });

        html += '</select>';
        this.container.innerHTML = html;

        // Event listener
        this.container.querySelector('select').addEventListener('change', (e) => {
            this.onSelect(e.target.value || null); // null = todas
        });
    }
}
```

---

### Fase MB-4: Queries Inteligentes (RIESGO: MEDIO)

**Objetivo**: Modificar queries para filtrar por branch cuando corresponda.

**PRINCIPIO CRÍTICO**:
```sql
-- ANTES (actual, sigue funcionando igual)
SELECT * FROM departments WHERE company_id = 11;

-- DESPUÉS (con branch opcional)
SELECT * FROM departments
WHERE company_id = 11
  AND (branch_id IS NULL OR branch_id = :currentBranch OR :currentBranch IS NULL);

-- Si :currentBranch es NULL → devuelve TODO (comportamiento actual)
-- Si :currentBranch es 5 → devuelve globales (NULL) + específicos de 5
```

**Helper function a crear**: `src/utils/branchFilter.js`

```javascript
/**
 * Genera condición SQL para filtrar por branch
 * @param {number|null} branchId - ID de sucursal o null para todas
 * @param {string} columnName - Nombre de columna (default: 'branch_id')
 * @returns {object} { where: string, replacements: object }
 */
function getBranchFilter(branchId, columnName = 'branch_id') {
    if (branchId === null || branchId === undefined) {
        // Sin filtro - devuelve todo
        return { where: '', replacements: {} };
    }

    // Devuelve globales (NULL) + específicos de la sucursal
    return {
        where: `AND (${columnName} IS NULL OR ${columnName} = :branchId)`,
        replacements: { branchId }
    };
}

module.exports = { getBranchFilter };
```

**Ejemplo de uso en rutas**:
```javascript
// En departmentRoutes.js
const { getBranchFilter } = require('../utils/branchFilter');

router.get('/', async (req, res) => {
    const { branchId } = req.query; // Puede ser null
    const companyId = req.user.companyId;

    const branchFilter = getBranchFilter(branchId);

    const departments = await sequelize.query(`
        SELECT * FROM departments
        WHERE company_id = :companyId
        ${branchFilter.where}
        ORDER BY name
    `, {
        replacements: { companyId, ...branchFilter.replacements },
        type: QueryTypes.SELECT
    });

    res.json(departments);
});
```

---

### Fase MB-5: Wizard de Clonación (RIESGO: BAJO)

**Objetivo**: Al crear sucursal, ofrecer clonar departamentos/turnos existentes.

**Endpoint a crear**: `POST /api/v1/branches/:id/clone`

```javascript
// En branchRoutes.js
router.post('/:branchId/clone', async (req, res) => {
    const { branchId } = req.params;
    const { cloneDepartments, cloneShifts, sourcebranchId } = req.body;
    const companyId = req.user.companyId;

    const transaction = await sequelize.transaction();

    try {
        const results = { departments: [], shifts: [] };

        if (cloneDepartments) {
            // Obtener departamentos de la sucursal origen (o globales si sourcebranchId es null)
            const sourceDepts = await Department.findAll({
                where: {
                    company_id: companyId,
                    branch_id: sourcebranchId || null
                },
                transaction
            });

            for (const dept of sourceDepts) {
                const newDept = await Department.create({
                    name: `${dept.name} (${await getBranchName(branchId)})`,
                    description: dept.description,
                    company_id: companyId,
                    branch_id: branchId, // Nueva sucursal
                    // ... otros campos
                }, { transaction });
                results.departments.push(newDept);
            }
        }

        if (cloneShifts) {
            // Similar para turnos
        }

        await transaction.commit();
        res.json({ success: true, cloned: results });

    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ error: error.message });
    }
});
```

---

### Fase MB-6: Dashboard Consolidado (RIESGO: BAJO)

**Objetivo**: Vista agregada para gerentes que ven todas las sucursales.

**Endpoint a crear**: `GET /api/v1/dashboard/consolidated`

```javascript
// En dashboardRoutes.js
router.get('/consolidated', async (req, res) => {
    const companyId = req.user.companyId;
    const branchScope = req.user.branch_scope; // null = todas

    let branchFilter = '';
    if (branchScope && branchScope.length > 0) {
        branchFilter = `AND cb.id IN (${branchScope.join(',')})`;
    }

    const stats = await sequelize.query(`
        SELECT
            cb.id as branch_id,
            cb.name as branch_name,
            COUNT(DISTINCT u.user_id) as total_employees,
            COUNT(DISTINCT CASE WHEN a.check_in_time::date = CURRENT_DATE THEN a."UserId" END) as present_today,
            COUNT(DISTINCT CASE WHEN a.check_in_time::date = CURRENT_DATE AND a.check_in_time > s.start_time + s.late_tolerance THEN a."UserId" END) as late_today
        FROM company_branches cb
        LEFT JOIN users u ON u.branch_id = cb.id OR (u.branch_id IS NULL AND u.company_id = cb.company_id)
        LEFT JOIN attendances a ON a."UserId" = u.user_id AND a.check_in_time::date = CURRENT_DATE
        LEFT JOIN user_shift_assignments usa ON usa.user_id = u.user_id
        LEFT JOIN shifts s ON s.id = usa.shift_id
        WHERE cb.company_id = :companyId
        ${branchFilter}
        GROUP BY cb.id, cb.name
        ORDER BY cb.name
    `, {
        replacements: { companyId },
        type: QueryTypes.SELECT
    });

    res.json({
        company_total: stats.reduce((sum, s) => sum + s.total_employees, 0),
        by_branch: stats
    });
});
```

---

## CHECKLIST DE VERIFICACIÓN POST-IMPLEMENTACIÓN

### Después de cada fase, verificar:

```bash
# 1. El servidor inicia sin errores
cd backend && PORT=9998 npm start

# 2. Las APIs responden correctamente
curl http://localhost:9998/api/v1/health

# 3. Los tests pasan (si existen)
npm test

# 4. La UI funciona sin errores en consola
# Abrir F12 en navegador y verificar
```

### Verificación específica Multi-Branch:

```sql
-- 1. Verificar que companies tiene el campo
SELECT column_name FROM information_schema.columns
WHERE table_name = 'companies' AND column_name = 'multi_branch_enabled';

-- 2. Verificar que users tiene branch_scope
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'branch_scope';

-- 3. Verificar que NULL sigue funcionando como GLOBAL
SELECT COUNT(*) FROM departments WHERE branch_id IS NULL AND company_id = 11;
-- Debe devolver 6 (todos los departamentos actuales)
```

---

## ARCHIVOS RELACIONADOS

| Archivo | Propósito |
|---------|-----------|
| `docs/ARCHITECTURE-MULTI-BRANCH-STRATEGY.md` | Arquitectura y decisiones |
| `scripts/analyze-branch-system.js` | Analizar estado actual |
| `scripts/analyze-impact-branches.js` | Analizar impacto antes de cambios |
| `engineering-metadata.js` | Tracking de progreso (actualizar siempre!) |

---

## PARA LA PRÓXIMA SESIÓN DE CLAUDE

Si estás leyendo esto y necesitas continuar la implementación:

1. **Lee** `engineering-metadata.js` → busca `multiBranch` para ver qué fases están completadas
2. **Verifica** el estado actual ejecutando `scripts/analyze-branch-system.js`
3. **Continúa** con la siguiente fase marcada como `done: false`
4. **Actualiza** `engineering-metadata.js` al completar cada fase
5. **Nunca** modifiques `authorized_departments` en kiosks
6. **Recuerda**: `NULL = GLOBAL` es la regla de oro

---

## HISTORIAL DE CAMBIOS

| Fecha | Sesión | Cambios |
|-------|--------|---------|
| 2025-11-26 | Claude | Análisis inicial, documentación completa, fases definidas |

