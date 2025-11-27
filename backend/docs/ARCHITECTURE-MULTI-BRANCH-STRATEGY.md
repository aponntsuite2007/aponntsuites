# Arquitectura Multi-Sucursal: Estrategia No-Invasiva

## Estado Actual del Sistema (Análisis Completo)

### Hallazgos Críticos

| Tabla | branch_id | Estado Actual | Registros sin branch |
|-------|-----------|---------------|---------------------|
| users | ✅ Existe (nullable) | 0% asignado | 125/125 |
| departments | ✅ Existe (nullable) | 0% asignado | 6/6 |
| shifts | ✅ Existe (nullable) | 0% asignado | 7/7 |
| kiosks | ❌ No existe | N/A | N/A |
| attendances | ❌ Solo kiosk_id | N/A | N/A |

### Relaciones Críticas (NO TOCAR)

```
┌──────────────┐      authorized_departments (JSON)      ┌──────────────┐
│    KIOSK     │ ──────────────────────────────────────> │  DEPARTMENTS │
│              │         [1, 3, 5] (array IDs)           │              │
└──────────────┘                                         └──────────────┘
       │                                                        │
       │ kiosk_id                                      department_id
       ▼                                                        ▼
┌──────────────┐                                         ┌──────────────┐
│  ATTENDANCE  │ <────────────────────────────────────── │    USERS     │
│              │              UserId                     │              │
└──────────────┘                                         └──────────────┘
```

**Esta arquitectura NO se modifica.** El kiosko autoriza departamentos específicos,
independientemente de si están en una sucursal o no.

---

## Principio Fundamental: NULL = GLOBAL

```sql
-- REGLA DE ORO (ya implementada en las columnas existentes)
branch_id = NULL  →  "Aplica a TODA la empresa"
branch_id = 123   →  "Aplica SOLO a sucursal 123"
```

### Por qué esto es perfecto:

1. **Retrocompatibilidad 100%**: Todo funciona igual que ahora
2. **Opt-in gradual**: Solo las empresas que quieran usan sucursales
3. **Migración cero**: No hay que migrar datos existentes
4. **Queries sin cambios**: NULL matchea con cualquier filtro OR

---

## Los 3 Tipos de Empresa

### Tipo A: Multi-sucursal Homogénea (misma ciudad/rubro)
```
ISI Argentina
├── Casa Central (Buenos Aires)
│   ├── Depto: Administración ─────┐
│   ├── Depto: Ventas              │ Comparten turnos
│   └── Depto: IT ─────────────────┘
├── Sucursal Córdoba
│   └── Depto: Ventas Córdoba (clone)
└── Sucursal Mendoza
    └── Depto: Ventas Mendoza (clone)
```
**Característica**: Mismos departamentos base, clonados por sucursal.
**Estrategia**: Wizard de clonación al crear sucursal.

### Tipo B: Multi-país/Multi-rubro (heterogénea)
```
Holding Internacional
├── ISI Argentina (rubro: tech)
│   ├── Depto: Desarrollo
│   └── Depto: QA
├── ISI Chile (rubro: tech)
│   ├── Depto: Desarrollo
│   └── Depto: Soporte
└── ACME México (rubro: retail)
    ├── Depto: Ventas
    └── Depto: Bodega
```
**Característica**: Departamentos totalmente independientes.
**Estrategia**: Crear desde cero, sin clonación.

### Tipo C: Híbrida (mixta)
```
Corporación Mixta
├── Casa Central (global - branch_id = NULL)
│   ├── Depto: RRHH Corporativo ──────────── Aplica a TODAS las sucursales
│   ├── Depto: Legal ────────────────────── Aplica a TODAS
│   └── Turno: Administrativo ───────────── Aplica a TODAS
├── Planta Norte (branch_id = 1)
│   ├── Depto: Producción Norte
│   └── Turno: Turno Planta
└── Planta Sur (branch_id = 2)
    ├── Depto: Producción Sur
    └── Turno: Turno Planta (clone)
```
**Característica**: Departamentos globales + específicos por sucursal.
**Estrategia**: NULL = global, específico = branch_id asignado.

---

## Arquitectura Propuesta (No-Invasiva)

### Fase 1: Feature Flag (inmediato, sin riesgo)

```javascript
// En companies, agregar campo
companies.multi_branch_enabled = false; // Default

// En queries actuales, NO CAMBIAR NADA
// Las queries siguen funcionando exactamente igual
```

**Impacto**: CERO. Solo un campo nuevo en companies.

### Fase 2: UI Condicional (solo frontend)

```javascript
// En panel-empresa.html
if (company.multi_branch_enabled) {
    showBranchSelector();    // Muestra dropdown de sucursales
    showBranchColumn();      // Muestra columna en tablas
} else {
    // Todo exactamente como ahora
    // Usuario nunca ve opciones de sucursal
}
```

**Impacto**: CERO en backend. Solo cambios de UI.

### Fase 3: Filtros Opcionales (queries inteligentes)

```sql
-- ANTES (actual, sigue funcionando)
SELECT * FROM departments WHERE company_id = 11;

-- DESPUÉS (con branch opcional)
SELECT * FROM departments
WHERE company_id = 11
  AND (branch_id IS NULL OR branch_id = :currentBranch);

-- Si :currentBranch es NULL, devuelve TODO (comportamiento actual)
-- Si :currentBranch es 123, devuelve globales + específicos de 123
```

**Impacto**: Queries extendidas, comportamiento idéntico si branch = NULL.

### Fase 4: Kioscos Multi-Sucursal (la parte delicada)

```
OPCIÓN A: No tocar authorized_departments
───────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│ Kiosko YA tiene la relación correcta:                          │
│                                                                 │
│ authorized_departments: [1, 3, 5]                               │
│                                                                 │
│ Esto significa: "Este kiosko acepta fichaje de los             │
│ departamentos 1, 3 y 5, sin importar de qué sucursal sean"     │
│                                                                 │
│ ✅ NO necesita branch_id                                        │
│ ✅ Es más flexible que filtrar por sucursal                     │
│ ✅ Permite kioscos multi-sucursal (ej: recepción compartida)   │
└─────────────────────────────────────────────────────────────────┘
```

**Decisión**: NO agregar branch_id a kiosks. La relación actual es SUPERIOR.

### Fase 5: Wizard de Clonación (UI + Backend)

```javascript
// Al crear nueva sucursal, ofrecer:
const cloneOptions = {
    departments: {
        enabled: true,
        source: 'Casa Central',
        items: ['Ventas', 'Soporte', 'RRHH']
    },
    shifts: {
        enabled: true,
        source: 'Casa Central',
        items: ['Turno Mañana', 'Turno Tarde']
    },
    templates: {
        enabled: false, // Opcional
        items: []
    }
};

// Backend crea copias con nuevo branch_id
async function cloneForBranch(sourceId, newBranchId, options) {
    // Clone departments
    if (options.departments.enabled) {
        const depts = await Department.findAll({
            where: { branch_id: sourceId }
        });
        for (const dept of depts) {
            await Department.create({
                ...dept.toJSON(),
                id: undefined,
                branch_id: newBranchId,
                name: `${dept.name} (${newBranchName})`
            });
        }
    }
    // Similar para shifts, templates, etc.
}
```

---

## Dashboard Consolidado para Gerentes

### Vista por Defecto (sin filtro)
```
┌────────────────────────────────────────────────────────────────┐
│  📊 Dashboard General - Todas las Sucursales                   │
├────────────────────────────────────────────────────────────────┤
│  Total Empleados: 125    │  Presente hoy: 98  │  Ausentes: 27  │
├────────────────────────────────────────────────────────────────┤
│  Por Sucursal:                                                 │
│  ├── Casa Central:     45 empleados  │  38 presentes          │
│  ├── Sucursal Norte:   42 empleados  │  35 presentes          │
│  └── Sucursal Sur:     38 empleados  │  25 presentes          │
└────────────────────────────────────────────────────────────────┘
```

### Vista Filtrada (sucursal específica)
```
┌────────────────────────────────────────────────────────────────┐
│  📊 Dashboard - Sucursal Norte                    [▼ Cambiar]  │
├────────────────────────────────────────────────────────────────┤
│  Empleados: 42          │  Presente hoy: 35  │  Ausentes: 7    │
├────────────────────────────────────────────────────────────────┤
│  Por Departamento:                                             │
│  ├── Ventas Norte:      18 empleados  │  15 presentes          │
│  └── Soporte Norte:     24 empleados  │  20 presentes          │
└────────────────────────────────────────────────────────────────┘
```

---

## Roles y Permisos

### Opción 1: Roles existentes + scope de sucursal
```javascript
// Ejemplo de estructura
user.role = 'manager';
user.branch_scope = [1, 2]; // Ve sucursales 1 y 2
user.branch_scope = null;   // Ve TODAS (gerente general)
```

### Opción 2: Roles nuevos específicos
```javascript
roles = {
    'super_admin': { branches: '*', modules: '*' },
    'branch_manager': { branches: 'assigned', modules: '*' },
    'branch_hr': { branches: 'assigned', modules: ['users', 'attendance'] }
};
```

**Recomendación**: Opción 1, es extensión no reemplazo.

---

## Plan de Implementación por Fases

### Fase 1: Fundamentos (0 riesgo)
- [ ] Agregar `multi_branch_enabled` a companies
- [ ] Agregar `branch_scope` a users (JSON array, nullable)
- [ ] Crear migración reversible
- [ ] Actualizar engineering-metadata.js

### Fase 2: UI Condicional (bajo riesgo)
- [ ] Modificar panel-empresa.html para mostrar/ocultar opciones
- [ ] Crear componente BranchSelector reutilizable
- [ ] Agregar columna "Sucursal" en tablas (oculta si disabled)

### Fase 3: Queries Inteligentes (medio riesgo)
- [ ] Modificar servicios para aceptar parámetro branch opcional
- [ ] Tests exhaustivos con branch=null vs branch=X
- [ ] Documentar comportamiento esperado

### Fase 4: Wizard de Clonación (bajo riesgo)
- [ ] UI para crear sucursal con opciones de clonado
- [ ] Backend para clonar departamentos/turnos
- [ ] Validaciones de nombres únicos por sucursal

### Fase 5: Dashboard Consolidado (bajo riesgo)
- [ ] Vistas agregadas por sucursal
- [ ] Filtros en reportes
- [ ] Export por sucursal

---

## Lo que NUNCA cambiamos

1. **authorized_departments en kiosks**: Es más flexible que branch_id
2. **Relación usuario → departamento**: Solo agregamos branch como contexto
3. **Queries de marcado de asistencia**: El flujo actual es correcto
4. **Triggers de multi-tenant**: Ya protegen la integridad

---

## Resumen Ejecutivo

| Aspecto | Decisión | Razón |
|---------|----------|-------|
| Kiosks | NO agregar branch_id | authorized_departments es superior |
| NULL = Global | SÍ, es la regla | Retrocompatibilidad total |
| Feature flag | SÍ, por empresa | Opt-in, no forzado |
| Clonación | SÍ, wizard | Facilita creación |
| UI condicional | SÍ | No confunde a empresas simples |
| Queries | Extender, no reemplazar | Comportamiento idéntico si branch=null |

**Filosofía**: Evolución, no revolución. El sistema actual funciona.
Solo AGREGAMOS capacidades sin ROMPER nada.
