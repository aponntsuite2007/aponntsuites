# 🔄 ANÁLISIS COMPLETO - SISTEMA DE TURNOS ROTATIVOS

## ❌ ESTADO ACTUAL: INCOMPLETO

### Lo que SÍ tenemos:

✅ **Tabla `shifts`** con campos para turnos rotativos:
- `shiftType`: ENUM('standard', 'rotative', 'permanent', 'flash')
- `rotationPattern`: String (ej: "12x4" = 12 días trabajo, 4 descanso)
- `cycleStartDate`: Fecha inicio del ciclo (GLOBAL para el turno)
- `workDays`: Días trabajados en ciclo
- `restDays`: Días de descanso
- `startTime`, `endTime`: Horarios
- `toleranceConfig`: JSONB con tolerancias

✅ **Tabla `attendances`** con:
- `shift_id`: Referencia al turno
- `user_id`: Referencia al usuario

### ❌ Lo que NO tenemos (CRÍTICO):

1. **Tabla de asignación `user_shift_assignments`**
   - NO existe forma de asignar un turno rotativo a un usuario CON su fecha de inicio personalizada
   - Cada usuario debería tener:
     - `shift_id`: ¿Qué turno rotativo tiene?
     - `cycle_start_date`: ¿Cuándo arranca SU ciclo? (no el ciclo global)
     - `initial_phase`: ¿En qué fase arranca? (Mañana=0, Tarde=1, Noche=2)
     - `is_active`: ¿Está actualmente asignado?

2. **Función de cálculo de turno actual**
   - Dado: (user_id, date) → Calcular: ¿En qué turno DEBERÍA estar ese día?
   - Algoritmo complejo basado en:
     - Fecha inicio del ciclo del usuario
     - Patrón rotativo del turno
     - Días transcurridos desde el inicio

3. **Modelo `User` sin campo `shift_id`**
   - Los usuarios NO tienen relación directa con shifts
   - Necesitamos tabla intermedia para asignaciones múltiples/históricas

---

## ✅ SOLUCIÓN PROPUESTA

### 1. CREAR TABLA `user_shift_assignments`

```sql
CREATE TABLE user_shift_assignments (
  id BIGSERIAL PRIMARY KEY,

  -- Relaciones
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(company_id),

  -- Configuración del ciclo para este usuario
  cycle_start_date DATE NOT NULL,
    COMMENT 'Fecha en que este usuario EMPIEZA su ciclo rotativo',

  initial_phase INTEGER DEFAULT 0,
    COMMENT 'Fase inicial del ciclo (0=primera rotación, 1=segunda, etc.)',

  -- Metadata
  assigned_by UUID REFERENCES users(user_id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Índices para performance
  INDEX idx_user_shift_active (user_id, is_active, cycle_start_date),
  INDEX idx_company_shift (company_id, shift_id),

  -- Solo una asignación activa por usuario
  UNIQUE (user_id, is_active) WHERE is_active = TRUE
);
```

### 2. MODELO SEQUELIZE `UserShiftAssignment.js`

```javascript
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserShiftAssignment = sequelize.define('UserShiftAssignment', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    shift_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'shifts',
        key: 'id'
      }
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      }
    },
    cycle_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Fecha en que este usuario empieza su ciclo rotativo'
    },
    initial_phase: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Fase inicial del ciclo (0=Mañana, 1=Tarde, 2=Noche, etc.)'
    },
    assigned_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    assigned_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'user_shift_assignments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_user_shift_active',
        fields: ['user_id', 'is_active', 'cycle_start_date']
      },
      {
        name: 'idx_company_shift',
        fields: ['company_id', 'shift_id']
      },
      {
        name: 'unique_active_assignment',
        unique: true,
        fields: ['user_id'],
        where: {
          is_active: true
        }
      }
    ]
  });

  return UserShiftAssignment;
};
```

### 3. FUNCIÓN DE CÁLCULO DE TURNO ACTUAL

```javascript
/**
 * Calcula en qué turno debería estar un usuario en una fecha dada
 *
 * @param {UUID} userId - ID del usuario
 * @param {Date|String} date - Fecha a consultar (YYYY-MM-DD)
 * @returns {Object} { shift, currentPhase, shouldWork, dayInCycle }
 */
async function calculateUserShiftForDate(userId, date) {
  // 1. Obtener asignación activa del usuario
  const assignment = await UserShiftAssignment.findOne({
    where: {
      user_id: userId,
      is_active: true,
      cycle_start_date: {
        [Op.lte]: date // Ya debe haber empezado
      }
    },
    include: [{
      model: Shift,
      as: 'shift'
    }],
    order: [['cycle_start_date', 'DESC']] // La más reciente
  });

  if (!assignment) {
    return {
      hasAssignment: false,
      shouldWork: false,
      reason: 'No tiene turno asignado'
    };
  }

  const shift = assignment.shift;

  // 2. Para turnos NO rotativos
  if (shift.shiftType !== 'rotative') {
    return {
      hasAssignment: true,
      shift: shift,
      shouldWork: true,
      isRotative: false
    };
  }

  // 3. CÁLCULO PARA TURNOS ROTATIVOS
  const cycleStartDate = new Date(assignment.cycle_start_date);
  const queryDate = new Date(date);

  // Días transcurridos desde el inicio del ciclo
  const daysSinceStart = Math.floor(
    (queryDate - cycleStartDate) / (1000 * 60 * 60 * 24)
  );

  // Parse del patrón rotativo (ej: "5x2x5x2x5x2")
  // Significa: 5 días mañana, 2 descanso, 5 tarde, 2 descanso, 5 noche, 2 descanso
  const pattern = parseRotationPattern(shift.rotationPattern);

  // Ej: pattern = [
  //   { type: 'work', days: 5, shiftTime: 'morning' },
  //   { type: 'rest', days: 2 },
  //   { type: 'work', days: 5, shiftTime: 'afternoon' },
  //   { type: 'rest', days: 2 },
  //   { type: 'work', days: 5, shiftTime: 'night' },
  //   { type: 'rest', days: 2 }
  // ]

  const totalCycleDays = pattern.reduce((sum, p) => sum + p.days, 0); // 24 días
  const dayInCycle = daysSinceStart % totalCycleDays;

  // Encontrar en qué fase del ciclo está
  let accumulatedDays = 0;
  let currentPhase = null;

  for (const phase of pattern) {
    if (dayInCycle < accumulatedDays + phase.days) {
      currentPhase = phase;
      break;
    }
    accumulatedDays += phase.days;
  }

  return {
    hasAssignment: true,
    shift: shift,
    shouldWork: currentPhase.type === 'work',
    currentPhase: currentPhase,
    dayInCycle: dayInCycle,
    totalCycleDays: totalCycleDays,
    daysSinceStart: daysSinceStart,
    isRotative: true
  };
}

/**
 * Parse del patrón rotativo
 * Formato: "5x2x5x2x5x2" o "12x4"
 *
 * Para simplificar, asumimos patrón alternado trabajo-descanso
 * En el futuro se puede extender para patrones más complejos
 */
function parseRotationPattern(pattern) {
  const parts = pattern.split('x').map(Number);

  // Patrón simple: trabajo-descanso alternado
  if (parts.length === 2) {
    const [workDays, restDays] = parts;
    return [
      { type: 'work', days: workDays, shiftTime: 'current' },
      { type: 'rest', days: restDays }
    ];
  }

  // Patrón complejo: múltiples rotaciones
  // Asumimos: trabajo1-descanso-trabajo2-descanso-trabajo3-descanso
  const phases = [];
  const shiftTimes = ['morning', 'afternoon', 'night'];
  let shiftIndex = 0;

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Días de trabajo
      phases.push({
        type: 'work',
        days: parts[i],
        shiftTime: shiftTimes[shiftIndex % shiftTimes.length]
      });
      shiftIndex++;
    } else {
      // Días de descanso
      phases.push({
        type: 'rest',
        days: parts[i]
      });
    }
  }

  return phases;
}
```

### 4. ACTUALIZAR `attendance_stats_advanced.js`

```javascript
// En vez de contar TODOS los usuarios con shift_id
// Usar la función de cálculo para saber quién DEBÍA trabajar ese día

const [expectedResult] = await sequelize.query(`
  SELECT COUNT(DISTINCT usa.user_id) as expected_count
  FROM user_shift_assignments usa
  INNER JOIN users u ON usa.user_id = u.user_id
  WHERE usa.company_id = :company_id
    AND usa.is_active = true
    AND usa.cycle_start_date <= :endDate
    ${userWhere}
`, { replacements, type: QueryTypes.SELECT });

// Luego, para cada usuario, llamar a calculateUserShiftForDate()
// para saber si DEBÍA trabajar en el rango de fechas
```

---

## 📊 EJEMPLO COMPLETO

### Escenario:

**Turno Rotativo "Guardias Hospitalarias":**
- Patrón: `12x2x12x2x12x2` (12h mañana, 2 descanso, 12h tarde, 2 descanso, 12h noche, 2 descanso)
- Total ciclo: 42 días
- Empresa: Hospital Central

**Usuarios:**
1. **Dr. Juan Pérez** - Asignado 2025-01-01, empieza en Mañana (phase=0)
2. **Dra. María López** - Asignada 2025-01-15, empieza en Tarde (phase=2)

### Consulta: ¿Quién debía trabajar el 2025-02-10?

**Dr. Juan:**
- Inicio: 2025-01-01
- Días transcurridos: 40 días
- Día en ciclo: 40 % 42 = 40
- Fase: Noche (días 28-39 son noche, día 40-41 descanso)
- **Resultado: NO debía trabajar** (está en descanso)

**Dra. María:**
- Inicio: 2025-01-15
- Días transcurridos: 26 días
- Día en ciclo: 26
- Fase: Tarde (días 14-25 son tarde, día 26-27 descanso)
- **Resultado: NO debía trabajar** (está en descanso)

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Base de datos (30 min)
1. Crear migración para tabla `user_shift_assignments`
2. Ejecutar migración
3. Crear modelo Sequelize
4. Registrar en database.js con relaciones

### Fase 2: Función de cálculo (1 hora)
1. Crear servicio `ShiftCalculatorService.js`
2. Implementar `calculateUserShiftForDate()`
3. Implementar `parseRotationPattern()`
4. Tests unitarios

### Fase 3: API (30 min)
1. POST `/api/v1/users/:id/assign-shift` - Asignar turno a usuario
2. GET `/api/v1/users/:id/current-shift?date=YYYY-MM-DD` - Ver turno actual
3. GET `/api/v1/users/:id/shift-calendar?month=YYYY-MM` - Calendario del mes

### Fase 4: Actualizar stats (30 min)
1. Modificar `/stats/advanced` para usar cálculo real
2. Agregar campo `expected_by_shift_calculation` vs `expected_total`

### Fase 5: Frontend (2 horas)
1. Modal para asignar turno a usuario
2. Calendario visual del turno rotativo
3. Indicadores de quién debe trabajar HOY

---

## ⚠️ DECISIÓN REQUERIDA

**¿Implementamos esto ahora o seguimos con las stats básicas?**

**Opción A:** Implementar sistema completo de turnos rotativos (3-4 horas)
- PRO: Sistema profesional y completo
- CON: Toma tiempo, requiere testing extensivo

**Opción B:** Continuar con stats básicas SIN turnos rotativos (30 min)
- PRO: Rápido, funcional para turnos fijos
- CON: No funciona correctamente para turnos rotativos

**Mi recomendación:** Opción A, porque es un sistema multi-tenant profesional y los turnos rotativos son CRÍTICOS para empresas 24/7 (hospitales, fábricas, seguridad, etc.).
