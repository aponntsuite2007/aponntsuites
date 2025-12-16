# WORKFLOW COMPLETO DE FICHAJE BIOMÉTRICO

## Documento de Referencia para Tutoriales y Sistema Brain

**Versión**: 1.0.0
**Fecha**: 2025-12-14
**Autor**: Sistema de Documentación Automatizada

---

## ÍNDICE

1. [Visión General](#1-visión-general)
2. [Pre-requisitos Estructurales](#2-pre-requisitos-estructurales)
3. [Configuración de Turnos](#3-configuración-de-turnos)
4. [Sistema de Calendario Laboral](#4-sistema-de-calendario-laboral)
5. [Acoplamiento de Turnos Rotativos](#5-acoplamiento-de-turnos-rotativos)
6. [Flujo de Fichaje](#6-flujo-de-fichaje)
7. [Sistema de Autorización](#7-sistema-de-autorización)
8. [Validaciones y Reglas de Negocio](#8-validaciones-y-reglas-de-negocio)
9. [Diagrama de Estados](#9-diagrama-de-estados)
10. [Integración con Brain](#10-integración-con-brain)

---

## 1. VISIÓN GENERAL

### 1.1 ¿Qué es el Fichaje Biométrico?

El fichaje biométrico es el proceso mediante el cual un empleado registra su entrada o salida del trabajo utilizando reconocimiento facial. El sistema valida:

- **Identidad**: ¿Es quien dice ser? (biometría)
- **Autorización**: ¿Puede fichar en este momento? (turno, calendario, estado)
- **Ubicación**: ¿Está en el lugar correcto? (kiosko, GPS)
- **Tiempo**: ¿Es el momento correcto? (horario, tolerancia)

### 1.2 Actores del Sistema

| Actor | Rol | Acciones |
|-------|-----|----------|
| **Empleado** | Sujeto del fichaje | Presenta rostro al kiosko |
| **Supervisor** | Autoriza excepciones | Aprueba llegadas tarde |
| **RRHH** | Gestiona políticas | Configura turnos, calendarios |
| **Kiosko** | Dispositivo de captura | Captura rostro, envía datos |
| **Sistema** | Procesa y valida | Ejecuta todas las reglas |

### 1.3 Tipos de Fichaje

```
┌─────────────────────────────────────────────────────────────┐
│                    TIPOS DE FICHAJE                         │
├─────────────────────────────────────────────────────────────┤
│  CHECK_IN   │ Entrada al trabajo (inicio de jornada)        │
│  CHECK_OUT  │ Salida del trabajo (fin de jornada)           │
│  BREAK_OUT  │ Salida a descanso/almuerzo                    │
│  BREAK_IN   │ Retorno de descanso/almuerzo                  │
│  OVERTIME_IN│ Inicio de horas extra (autorizado)            │
│  OVERTIME_OUT│ Fin de horas extra                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. PRE-REQUISITOS ESTRUCTURALES

### 2.1 Jerarquía de Entidades

Para que un empleado pueda fichar, DEBE existir esta cadena completa:

```
COMPANY (Empresa)
    │
    ├── BRANCH (Sucursal)
    │       │
    │       ├── country: "AR" ─────────────────┐
    │       │                                   │
    │       └── DEPARTMENT (Departamento)       │
    │               │                           │
    │               └── SHIFT (Turno)           │
    │                       │                   │
    │                       └── SCHEDULE ◄──────┤
    │                               │           │
    │                               ▼           │
    │                         WORKING_CALENDAR ◄┘
    │                               │
    │                               ├── Rotation scheme
    │                               ├── National holidays (by country)
    │                               └── Manual non-working days
    │
    └── USER (Empleado)
            │
            ├── department_id ──► DEPARTMENT
            ├── shift_id ──────► SHIFT
            ├── position_id ───► ORGANIZATIONAL_POSITION
            │                         │
            │                         └── parent_position_id ──► SUPERVISOR
            │
            ├── incorporation_date: "2025-01-15"
            ├── initial_phase: 2 (para turnos rotativos)
            │
            └── BIOMETRIC_DATA
                    │
                    └── facial_embedding: Float[128]
```

### 2.2 Validaciones de Pre-requisitos

Antes de procesar un fichaje, el sistema verifica:

```javascript
// Pseudo-código de validaciones
async function validatePrerequisites(userId) {
    const user = await User.findByPk(userId);

    // 1. Usuario existe y está activo
    if (!user || !user.is_active) {
        throw new Error('USER_INACTIVE');
    }

    // 2. Usuario tiene departamento asignado
    if (!user.department_id) {
        throw new Error('NO_DEPARTMENT');
    }

    // 3. Departamento pertenece a una sucursal
    const dept = await Department.findByPk(user.department_id);
    if (!dept.branch_id) {
        throw new Error('DEPARTMENT_NO_BRANCH');
    }

    // 4. Usuario tiene turno asignado
    if (!user.shift_id) {
        throw new Error('NO_SHIFT_ASSIGNED');
    }

    // 5. Turno tiene horarios configurados
    const shift = await Shift.findByPk(user.shift_id);
    if (!shift.schedules || shift.schedules.length === 0) {
        throw new Error('SHIFT_NO_SCHEDULES');
    }

    // 6. Usuario tiene datos biométricos registrados
    const biometric = await BiometricData.findOne({
        where: { user_id: userId }
    });
    if (!biometric || !biometric.facial_embedding) {
        throw new Error('NO_BIOMETRIC_DATA');
    }

    return { user, dept, shift, biometric };
}
```

### 2.3 Estados del Usuario

```
┌─────────────────────────────────────────────────────────────┐
│                 ESTADOS DEL USUARIO                         │
├─────────────────────────────────────────────────────────────┤
│  ACTIVE      │ Puede fichar normalmente                     │
│  SUSPENDED   │ No puede fichar (suspensión disciplinaria)   │
│  ON_VACATION │ No puede fichar (período de vacaciones)      │
│  SICK_LEAVE  │ No puede fichar (licencia médica)            │
│  INACTIVE    │ No puede fichar (baja/desvinculado)          │
│  PENDING     │ No puede fichar (alta pendiente)             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. CONFIGURACIÓN DE TURNOS

### 3.1 Tipos de Turnos

#### 3.1.1 Turno Fijo

El empleado trabaja siempre el mismo horario:

```json
{
    "shift_type": "FIXED",
    "name": "Administrativo Mañana",
    "schedules": [
        {
            "day_of_week": [1, 2, 3, 4, 5],  // Lunes a Viernes
            "start_time": "09:00",
            "end_time": "18:00",
            "break_start": "13:00",
            "break_end": "14:00"
        }
    ],
    "tolerance_minutes": 15,
    "early_entry_minutes": 30
}
```

#### 3.1.2 Turno Rotativo

El empleado rota entre diferentes horarios según un esquema:

```json
{
    "shift_type": "ROTATING",
    "name": "Producción 6x2",
    "rotation_scheme": {
        "type": "6x2",
        "description": "6 días de trabajo, 2 días de descanso",
        "phases": [
            {
                "phase_id": 1,
                "name": "Mañana",
                "start_time": "06:00",
                "end_time": "14:00",
                "days_on": 6,
                "days_off": 2
            },
            {
                "phase_id": 2,
                "name": "Tarde",
                "start_time": "14:00",
                "end_time": "22:00",
                "days_on": 6,
                "days_off": 2
            },
            {
                "phase_id": 3,
                "name": "Noche",
                "start_time": "22:00",
                "end_time": "06:00",
                "days_on": 6,
                "days_off": 2
            }
        ],
        "rotation_direction": "forward",  // mañana → tarde → noche
        "cycle_length_days": 24  // 8 días × 3 fases = 24 días
    },
    "launch_date": "2025-01-01",  // Fecha de inicio del ciclo
    "tolerance_minutes": 10,
    "early_entry_minutes": 20
}
```

### 3.2 Parámetros de Tolerancia

```
┌─────────────────────────────────────────────────────────────┐
│               PARÁMETROS DE TOLERANCIA                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  early_entry_minutes: 30                                    │
│  ──────────────────────────────────────────────────────►    │
│  │                                                          │
│  │  Puede fichar hasta 30 min ANTES del turno               │
│  │                                                          │
│  ▼                                                          │
│  [08:30] ─────────────────[09:00]─────────────[09:15]       │
│     │                        │                    │         │
│     │    ENTRADA PERMITIDA   │  TOLERANCIA       │         │
│     │    (early entry)       │  (llegada tarde   │         │
│     │                        │   sin penalidad)  │         │
│                                                             │
│  tolerance_minutes: 15                                      │
│  ◄────────────────────────────                              │
│                                                             │
│  Después de 09:15 → LLEGADA TARDE (requiere autorización)   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Tabla de Configuración de Turnos

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `shift_type` | ENUM | Tipo de turno | FIXED, ROTATING |
| `name` | STRING | Nombre descriptivo | "Producción 6x2" |
| `start_time` | TIME | Hora de inicio | "09:00" |
| `end_time` | TIME | Hora de fin | "18:00" |
| `tolerance_minutes` | INT | Minutos de tolerancia | 15 |
| `early_entry_minutes` | INT | Entrada anticipada permitida | 30 |
| `break_duration_minutes` | INT | Duración del descanso | 60 |
| `launch_date` | DATE | Fecha inicio ciclo rotativo | "2025-01-01" |
| `rotation_scheme` | JSON | Configuración de rotación | Ver arriba |

---

## 4. SISTEMA DE CALENDARIO LABORAL

### 4.1 Componentes del Calendario

El calendario laboral de un empleado se calcula combinando:

```
┌─────────────────────────────────────────────────────────────┐
│              CÁLCULO DE CALENDARIO LABORAL                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. ESQUEMA DE ROTACIÓN (shift.rotation_scheme)             │
│     ├── Días laborables según fase actual                   │
│     └── Días de descanso según ciclo                        │
│                                                             │
│  2. FERIADOS NACIONALES (branch.country → holidays)         │
│     ├── Feriados fijos (25/12, 01/01, etc.)                 │
│     └── Feriados móviles (Semana Santa, etc.)               │
│                                                             │
│  3. DÍAS NO LABORABLES MANUALES (company_non_working_days)  │
│     ├── Día de la empresa                                   │
│     ├── Cierre por inventario                               │
│     └── Otros configurados por RRHH                         │
│                                                             │
│  ════════════════════════════════════════════════════════   │
│                          │                                  │
│                          ▼                                  │
│              CALENDARIO LABORAL FINAL                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Feriados por País

Los feriados nacionales se obtienen del país de la SUCURSAL (branch.country):

```javascript
// Ejemplo de feriados Argentina 2025
const holidaysAR2025 = [
    { date: "2025-01-01", name: "Año Nuevo", type: "FIXED" },
    { date: "2025-02-24", name: "Carnaval", type: "MOVABLE" },
    { date: "2025-02-25", name: "Carnaval", type: "MOVABLE" },
    { date: "2025-03-24", name: "Día de la Memoria", type: "FIXED" },
    { date: "2025-04-02", name: "Día del Veterano", type: "FIXED" },
    { date: "2025-04-18", name: "Viernes Santo", type: "MOVABLE" },
    { date: "2025-05-01", name: "Día del Trabajador", type: "FIXED" },
    { date: "2025-05-25", name: "Revolución de Mayo", type: "FIXED" },
    { date: "2025-06-17", name: "Paso a la Inmortalidad de Güemes", type: "BRIDGE" },
    { date: "2025-06-20", name: "Día de la Bandera", type: "FIXED" },
    { date: "2025-07-09", name: "Día de la Independencia", type: "FIXED" },
    { date: "2025-08-18", name: "Paso a la Inmortalidad de San Martín", type: "BRIDGE" },
    { date: "2025-10-12", name: "Día del Respeto a la Diversidad Cultural", type: "BRIDGE" },
    { date: "2025-11-24", name: "Día de la Soberanía Nacional", type: "BRIDGE" },
    { date: "2025-12-08", name: "Inmaculada Concepción", type: "FIXED" },
    { date: "2025-12-25", name: "Navidad", type: "FIXED" }
];
```

### 4.3 Días No Laborables Manuales

RRHH puede configurar días no laborables adicionales por empresa:

```json
{
    "company_non_working_days": [
        {
            "date": "2025-03-15",
            "reason": "Día de la Empresa",
            "affects": "ALL",  // ALL, BRANCH, DEPARTMENT
            "branch_id": null,
            "department_id": null
        },
        {
            "date": "2025-06-30",
            "reason": "Cierre por inventario",
            "affects": "BRANCH",
            "branch_id": 5,
            "department_id": null
        }
    ]
}
```

### 4.4 Algoritmo de Cálculo del Calendario

```javascript
/**
 * Calcula si un día es laborable para un empleado específico
 */
async function isWorkingDay(userId, date) {
    const user = await User.findByPk(userId, {
        include: [
            { model: Shift },
            { model: Department, include: [Branch] }
        ]
    });

    const country = user.Department.Branch.country;
    const shift = user.Shift;

    // 1. Verificar si es feriado nacional
    const holidays = await getHolidaysByCountry(country, date.getFullYear());
    const isHoliday = holidays.some(h => h.date === formatDate(date));
    if (isHoliday) {
        return { isWorking: false, reason: 'NATIONAL_HOLIDAY' };
    }

    // 2. Verificar días no laborables de la empresa
    const companyNonWorking = await CompanyNonWorkingDay.findOne({
        where: {
            company_id: user.company_id,
            date: date,
            [Op.or]: [
                { affects: 'ALL' },
                { affects: 'BRANCH', branch_id: user.Department.branch_id },
                { affects: 'DEPARTMENT', department_id: user.department_id }
            ]
        }
    });
    if (companyNonWorking) {
        return { isWorking: false, reason: 'COMPANY_NON_WORKING', detail: companyNonWorking.reason };
    }

    // 3. Calcular según esquema de rotación
    if (shift.shift_type === 'ROTATING') {
        const workingStatus = calculateRotationDay(user, shift, date);
        return workingStatus;
    }

    // 4. Turno fijo: verificar día de la semana
    const dayOfWeek = date.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
    const schedule = shift.schedules.find(s => s.day_of_week.includes(dayOfWeek));

    if (!schedule) {
        return { isWorking: false, reason: 'REST_DAY' };
    }

    return {
        isWorking: true,
        schedule: schedule,
        startTime: schedule.start_time,
        endTime: schedule.end_time
    };
}
```

---

## 5. ACOPLAMIENTO DE TURNOS ROTATIVOS

### 5.1 El Problema del Acoplamiento

Cuando un nuevo empleado se une a un turno rotativo, NO inicia su propio ciclo desde el día 1. Debe ACOPLARSE al ciclo existente del equipo.

**Ejemplo**: Turno 6x2 (6 días trabajo, 2 días descanso)

```
Ciclo del equipo (iniciado el 01/01/2025):

Día:  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 ...
     ─────────────────────────────────────────────────────
     T  T  T  T  T  T  D  D  T  T  T  T  T  T  D  D  ...
     │  │  │  │  │  │  │  │
     │  │  │  │  │  │  │  │
     └──┴──┴──┴──┴──┴──┴──┴── Ciclo 1 del equipo

Pedro se incorpora el día 4 del ciclo:

Día:  1  2  3  4  5  6  7  8  9 10 11 12 13 14 ...
     ─────────────────────────────────────────────
                 │
                 ▼
                Pedro se une aquí

Pedro trabaja: días 4, 5, 6 → luego descansa 7, 8 con el equipo
               NO empieza su propio ciclo de 6 días

T = Trabajo    D = Descanso
```

### 5.2 Algoritmo de Acoplamiento

```javascript
/**
 * Calcula qué día del ciclo rotativo corresponde a una fecha
 * para un empleado que se incorporó en una fecha específica
 */
function calculateRotationDay(user, shift, targetDate) {
    const rotationScheme = shift.rotation_scheme;
    const launchDate = new Date(shift.launch_date);
    const cycleLength = rotationScheme.cycle_length_days; // ej: 8 días para 6x2

    // 1. Calcular días transcurridos desde el lanzamiento del turno
    const daysSinceLaunch = Math.floor(
        (targetDate - launchDate) / (1000 * 60 * 60 * 24)
    );

    // 2. Calcular posición en el ciclo (1 a cycleLength)
    const cyclePosition = (daysSinceLaunch % cycleLength) + 1;

    // 3. Determinar si es día de trabajo o descanso
    const daysOn = rotationScheme.phases[0].days_on;   // 6
    const daysOff = rotationScheme.phases[0].days_off; // 2

    const isWorkingDay = cyclePosition <= daysOn;

    // 4. Calcular fase actual (para turnos con múltiples fases)
    const totalCycles = Math.floor(daysSinceLaunch / cycleLength);
    const currentPhaseIndex = totalCycles % rotationScheme.phases.length;
    const currentPhase = rotationScheme.phases[currentPhaseIndex];

    // 5. Ajustar por fase inicial del empleado (si aplica)
    let adjustedPhase = currentPhase;
    if (user.initial_phase && user.initial_phase !== 1) {
        const phaseOffset = user.initial_phase - 1;
        const adjustedIndex = (currentPhaseIndex + phaseOffset) % rotationScheme.phases.length;
        adjustedPhase = rotationScheme.phases[adjustedIndex];
    }

    return {
        isWorking: isWorkingDay,
        reason: isWorkingDay ? 'WORKING_DAY' : 'REST_DAY',
        cyclePosition: cyclePosition,
        phase: adjustedPhase,
        startTime: isWorkingDay ? adjustedPhase.start_time : null,
        endTime: isWorkingDay ? adjustedPhase.end_time : null
    };
}
```

### 5.3 Incorporación con Fase Inicial

Para turnos rotativos con múltiples fases (mañana/tarde/noche), se debe especificar en qué fase comienza el empleado:

```json
{
    "user_id": 150,
    "name": "Pedro González",
    "shift_id": 5,
    "incorporation_date": "2025-01-04",
    "initial_phase": 2  // Comienza en fase "Tarde"
}
```

### 5.4 Ejemplo Completo de Acoplamiento

```
TURNO: Producción 6x2 con 3 fases
LAUNCH_DATE: 2025-01-01
CICLO: 24 días (8 días × 3 fases)

Fase 1 (Mañana):  Días 1-6 trabajo, 7-8 descanso
Fase 2 (Tarde):   Días 9-14 trabajo, 15-16 descanso
Fase 3 (Noche):   Días 17-22 trabajo, 23-24 descanso

EMPLEADOS EXISTENTES (incorporados el 01/01/2025):
- María: initial_phase = 1 (Mañana)
- Juan:  initial_phase = 2 (Tarde)
- Ana:   initial_phase = 3 (Noche)

NUEVO EMPLEADO:
- Pedro: se incorpora el 15/01/2025, initial_phase = 2 (Tarde)

CÁLCULO PARA PEDRO EL 15/01/2025:
1. Días desde launch_date: 14 días
2. Posición en ciclo: (14 % 24) + 1 = 15
3. Día 15 está en fase "descanso de Tarde" (días 15-16)
4. Pedro NO trabaja el 15/01 aunque es su primer día

CÁLCULO PARA PEDRO EL 17/01/2025:
1. Días desde launch_date: 16 días
2. Posición en ciclo: (16 % 24) + 1 = 17
3. Día 17 inicia fase "Noche" (trabajo)
4. PERO Pedro tiene initial_phase = 2 (Tarde)
5. Ajuste: Pedro trabaja turno de TARDE cuando el ciclo base está en NOCHE
```

---

## 6. FLUJO DE FICHAJE

### 6.1 Diagrama de Flujo Principal

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FLUJO DE FICHAJE BIOMÉTRICO                        │
└─────────────────────────────────────────────────────────────────────────┘

  [EMPLEADO SE PRESENTA EN KIOSKO]
              │
              ▼
  ┌───────────────────────┐
  │ 1. CAPTURA FACIAL     │
  │    - Detección rostro │
  │    - Extracción embed │
  │    - Score calidad    │
  └───────────────────────┘
              │
              ▼
  ┌───────────────────────┐     NO     ┌──────────────────┐
  │ 2. CALIDAD SUFICIENTE?├──────────► │ Solicitar nueva  │
  │    (score >= 0.7)     │            │ captura          │
  └───────────────────────┘            └──────────────────┘
              │ SÍ
              ▼
  ┌───────────────────────┐     NO     ┌──────────────────┐
  │ 3. MATCH BIOMÉTRICO   ├──────────► │ USER_NOT_FOUND   │
  │    (similarity >= 0.6)│            │ Rechazar fichaje │
  └───────────────────────┘            └──────────────────┘
              │ SÍ
              ▼
  ┌───────────────────────┐     NO     ┌──────────────────┐
  │ 4. USUARIO ACTIVO?    ├──────────► │ USER_SUSPENDED   │
  │    (estado válido)    │            │ Rechazar fichaje │
  └───────────────────────┘            └──────────────────┘
              │ SÍ
              ▼
  ┌───────────────────────┐     NO     ┌──────────────────┐
  │ 5. DÍA LABORABLE?     ├──────────► │ NON_WORKING_DAY  │
  │    (calendario)       │            │ Rechazar fichaje │
  └───────────────────────┘            └──────────────────┘
              │ SÍ
              ▼
  ┌───────────────────────┐     NO     ┌──────────────────┐
  │ 6. DENTRO DE TURNO?   ├──────────► │ OUTSIDE_SHIFT    │
  │    (horario válido)   │            │ Rechazar fichaje │
  └───────────────────────┘            └──────────────────┘
              │ SÍ
              ▼
  ┌───────────────────────┐     SÍ     ┌──────────────────┐
  │ 7. ES DUPLICADO?      ├──────────► │ DUPLICATE        │
  │    (< 5 min)          │            │ Rechazar fichaje │
  └───────────────────────┘            └──────────────────┘
              │ NO
              ▼
  ┌───────────────────────┐
  │ 8. CLASIFICAR FICHAJE │
  │    - ON_TIME          │
  │    - EARLY            │
  │    - LATE             │
  └───────────────────────┘
              │
              ├──────────────────────┬──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
        ┌──────────┐          ┌──────────┐          ┌──────────┐
        │ ON_TIME  │          │  EARLY   │          │   LATE   │
        │          │          │          │          │          │
        │ Registrar│          │ Registrar│          │ REQUIERE │
        │ fichaje  │          │ fichaje  │          │ AUTORIZ. │
        └──────────┘          └──────────┘          └─────┬────┘
              │                      │                    │
              │                      │                    ▼
              │                      │           ┌────────────────┐
              │                      │           │ 9. SISTEMA DE  │
              │                      │           │ AUTORIZACIÓN   │
              │                      │           │ (ver sección 7)│
              │                      │           └────────┬───────┘
              │                      │                    │
              ▼                      ▼                    ▼
  ┌───────────────────────────────────────────────────────────────┐
  │                     FICHAJE REGISTRADO                         │
  │                                                                │
  │  - attendance_id: 12345                                        │
  │  - user_id: 150                                                │
  │  - check_in_time: "2025-01-15T09:05:00Z"                       │
  │  - status: "ON_TIME" | "EARLY" | "LATE_AUTHORIZED"             │
  │  - kiosk_id: 5                                                 │
  │  - biometric_score: 0.95                                       │
  │  - authorization_id: null | 789 (si fue autorizado)            │
  └───────────────────────────────────────────────────────────────┘
```

### 6.2 Estados del Fichaje

```javascript
const ATTENDANCE_STATUS = {
    // Estados finales positivos
    ON_TIME: 'Fichaje a tiempo (dentro de tolerancia)',
    EARLY: 'Fichaje anticipado (antes del turno pero permitido)',
    LATE_AUTHORIZED: 'Fichaje tarde con autorización aprobada',

    // Estados finales negativos (rechazos)
    REJECTED_NO_MATCH: 'Rostro no reconocido en el sistema',
    REJECTED_SUSPENDED: 'Usuario suspendido',
    REJECTED_NO_SHIFT: 'Fuera de turno asignado',
    REJECTED_NON_WORKING: 'Día no laborable',
    REJECTED_DUPLICATE: 'Fichaje duplicado',
    REJECTED_LOW_QUALITY: 'Calidad de imagen insuficiente',
    REJECTED_LATE_NO_AUTH: 'Llegada tarde sin autorización',

    // Estados pendientes
    PENDING_AUTHORIZATION: 'Esperando autorización de supervisor',
    AUTHORIZATION_EXPIRED: 'Autorización expirada (5 min)'
};
```

### 6.3 Código del Proceso Principal

```javascript
/**
 * Procesa un intento de fichaje biométrico
 */
async processAttendance(biometricData, kioskId) {
    const startTime = Date.now();

    try {
        // 1. Validar calidad de imagen
        if (biometricData.qualityScore < 0.7) {
            return {
                success: false,
                reason: 'LOW_QUALITY',
                message: 'Por favor, intente de nuevo con mejor iluminación'
            };
        }

        // 2. Buscar match biométrico
        const match = await this.findBiometricMatch(biometricData.embedding);
        if (!match) {
            return {
                success: false,
                reason: 'NO_MATCH',
                message: 'Rostro no reconocido. Contacte a RRHH.'
            };
        }

        const user = await User.findByPk(match.userId);

        // 3. Validar estado del usuario
        const userStatus = await this.validateUserStatus(user);
        if (!userStatus.canClock) {
            return {
                success: false,
                reason: userStatus.reason,
                message: userStatus.message
            };
        }

        // 4. Validar calendario laboral
        const today = new Date();
        const workingDay = await this.isWorkingDay(user.id, today);
        if (!workingDay.isWorking) {
            return {
                success: false,
                reason: workingDay.reason,
                message: `Hoy no es día laborable: ${workingDay.detail || ''}`
            };
        }

        // 5. Validar turno
        const shiftValidation = await this.validateShift(user, today);
        if (!shiftValidation.isValid) {
            return {
                success: false,
                reason: 'OUTSIDE_SHIFT',
                message: shiftValidation.message
            };
        }

        // 6. Verificar duplicados
        const isDuplicate = await this.checkDuplicate(user.id, 5); // 5 minutos
        if (isDuplicate) {
            return {
                success: false,
                reason: 'DUPLICATE',
                message: 'Ya registró un fichaje hace menos de 5 minutos'
            };
        }

        // 7. Clasificar fichaje
        const classification = this.classifyAttendance(today, workingDay.schedule);

        // 8. Si es tarde, iniciar proceso de autorización
        if (classification.status === 'LATE') {
            const authResult = await this.requestLateAuthorization(user, classification);
            return authResult;
        }

        // 9. Registrar fichaje
        const attendance = await this.createAttendance({
            userId: user.id,
            checkInTime: today,
            status: classification.status,
            kioskId: kioskId,
            biometricScore: match.similarity,
            minutesLate: classification.minutesLate || 0
        });

        return {
            success: true,
            attendance: attendance,
            user: {
                name: user.name,
                department: user.Department.name
            },
            processingTime: Date.now() - startTime
        };

    } catch (error) {
        console.error('Error procesando fichaje:', error);
        return {
            success: false,
            reason: 'SYSTEM_ERROR',
            message: 'Error del sistema. Intente de nuevo.'
        };
    }
}
```

---

## 7. SISTEMA DE AUTORIZACIÓN

### 7.1 Cuándo se Requiere Autorización

| Situación | Requiere Autorización | Motivo |
|-----------|----------------------|--------|
| Llegada a tiempo | NO | Dentro de tolerancia |
| Llegada anticipada | NO | Permitido por early_entry_minutes |
| Llegada tarde | SÍ | Fuera de tolerancia |
| Salida anticipada | SÍ | Antes de fin de turno |
| Horas extra | SÍ | Fuera del turno normal |
| Día no laborable | SÍ* | Solo si hay excepción configurada |

### 7.2 Flujo de Autorización

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   FLUJO DE AUTORIZACIÓN DE LLEGADA TARDE                │
└─────────────────────────────────────────────────────────────────────────┘

  [FICHAJE CLASIFICADO COMO "LATE"]
              │
              ▼
  ┌───────────────────────────────────────┐
  │ 1. BUSCAR SUPERVISOR                  │
  │                                       │
  │    SELECT * FROM users u              │
  │    JOIN organizational_positions op   │
  │      ON u.position_id = op.id         │
  │    WHERE op.id = (                    │
  │      SELECT parent_position_id        │
  │      FROM organizational_positions    │
  │      WHERE id = empleado.position_id  │
  │    )                                  │
  └───────────────────────────────────────┘
              │
              ▼
  ┌───────────────────────────────────────┐     NO DISPONIBLE
  │ 2. VERIFICAR DISPONIBILIDAD           │     ┌──────────────────┐
  │    SUPERVISOR                         ├────►│ 3. ESCALAR A     │
  │                                       │     │ GRANDPARENT      │
  │    - ¿Está de vacaciones?             │     │                  │
  │    - ¿Tiene licencia médica?          │     │ parent_position  │
  │    - ¿Ya fichó hoy?                   │     │ del supervisor   │
  │    - ¿Está suspendido?                │     └────────┬─────────┘
  └───────────────────────────────────────┘              │
              │ DISPONIBLE                               │
              ▼                                          │
  ┌───────────────────────────────────────┐◄─────────────┘
  │ 4. CREAR SOLICITUD DE AUTORIZACIÓN    │
  │                                       │
  │    INSERT INTO late_authorizations (  │
  │      employee_id,                     │
  │      authorizer_id,                   │
  │      requested_at,                    │
  │      minutes_late,                    │
  │      status: 'PENDING',               │
  │      expires_at: NOW() + 5 min        │
  │    )                                  │
  └───────────────────────────────────────┘
              │
              ├──────────────────────────────────────────────┐
              ▼                                              ▼
  ┌─────────────────────────┐              ┌─────────────────────────────┐
  │ 5. NOTIFICAR SUPERVISOR │              │ 6. NOTIFICAR RRHH (SIEMPRE) │
  │                         │              │                             │
  │ Canales:                │              │ - Copia de la solicitud     │
  │ - WebSocket (inmediato) │              │ - Info de escalación (si    │
  │ - Email                 │              │   hubo)                     │
  │ - WhatsApp              │              │ - Dashboard de pendientes   │
  │ - Push notification     │              │                             │
  └─────────────────────────┘              └─────────────────────────────┘
              │
              ▼
  ┌───────────────────────────────────────┐
  │ 7. EMPLEADO ESPERA EN KIOSKO          │
  │                                       │
  │    Pantalla muestra:                  │
  │    "Esperando autorización de         │
  │     [Nombre Supervisor]               │
  │     Tiempo restante: 4:32"            │
  │                                       │
  │    Progress bar visual                │
  │    Timeout: 5 minutos                 │
  └───────────────────────────────────────┘
              │
              ├─────────────────┬─────────────────┐
              ▼                 ▼                 ▼
        ┌──────────┐      ┌──────────┐      ┌──────────┐
        │ APROBADO │      │ RECHAZADO│      │ TIMEOUT  │
        │          │      │          │      │          │
        │ Fichaje  │      │ Rechazar │      │ Rechazar │
        │ LATE_    │      │ fichaje  │      │ fichaje  │
        │ AUTHORIZED│      │          │      │          │
        └──────────┘      └──────────┘      └──────────┘
```

### 7.3 Búsqueda de Autorizador por Organigrama

El sistema usa `parent_position_id` para encontrar al supervisor:

```javascript
/**
 * Encuentra autorizadores usando el organigrama
 * @file LateArrivalAuthorizationService.js (líneas 456-580)
 */
async findAuthorizersByHierarchy(employeeContext, companyId, includeRRHH = true) {
    const { userId, positionId, departmentId } = employeeContext;
    const authorizers = [];
    const escalationInfo = [];

    // 1. SUPERVISOR DIRECTO: Buscar por parent_position_id
    const directSupervisor = await this.findDirectSupervisor(positionId);

    if (directSupervisor) {
        // 2. Verificar disponibilidad del supervisor
        const availability = await this.checkSupervisorAvailability(
            directSupervisor.userId,
            companyId
        );

        if (availability.isAvailable) {
            authorizers.push({
                userId: directSupervisor.userId,
                name: directSupervisor.name,
                position: directSupervisor.positionName,
                role: 'DIRECT_SUPERVISOR',
                channels: await this.getNotificationChannels(directSupervisor.userId)
            });
        } else {
            // 3. Si NO disponible → ESCALAR a grandparent_position_id
            escalationInfo.push({
                skippedUser: directSupervisor.name,
                reason: availability.reason, // 'ON_VACATION', 'SICK_LEAVE', etc.
                escalatedTo: 'grandparent'
            });

            const grandparentSupervisor = await this.findGrandparentSupervisor(positionId);

            if (grandparentSupervisor) {
                authorizers.push({
                    userId: grandparentSupervisor.userId,
                    name: grandparentSupervisor.name,
                    position: grandparentSupervisor.positionName,
                    role: 'ESCALATED_SUPERVISOR',
                    channels: await this.getNotificationChannels(grandparentSupervisor.userId)
                });
            }
        }
    }

    // 4. RRHH siempre recibe copia + info de escalación
    if (includeRRHH) {
        const rrhhUsers = await this.findRRHHUsers(companyId);
        authorizers.push(...rrhhUsers.map(u => ({
            userId: u.userId,
            name: u.name,
            role: 'RRHH',
            notificationType: 'COPY', // Solo copia, no autoriza
            escalationInfo: escalationInfo.length > 0 ? escalationInfo : null
        })));
    }

    return { authorizers, escalationInfo };
}

/**
 * Verifica disponibilidad del supervisor
 */
async checkSupervisorAvailability(supervisorId, companyId) {
    const supervisor = await User.findByPk(supervisorId);

    // Verificar vacaciones activas
    const onVacation = await Vacation.findOne({
        where: {
            user_id: supervisorId,
            start_date: { [Op.lte]: new Date() },
            end_date: { [Op.gte]: new Date() },
            status: 'APPROVED'
        }
    });
    if (onVacation) {
        return { isAvailable: false, reason: 'ON_VACATION' };
    }

    // Verificar licencia médica
    const onSickLeave = await MedicalLeave.findOne({
        where: {
            user_id: supervisorId,
            start_date: { [Op.lte]: new Date() },
            end_date: { [Op.gte]: new Date() },
            status: 'ACTIVE'
        }
    });
    if (onSickLeave) {
        return { isAvailable: false, reason: 'SICK_LEAVE' };
    }

    // Verificar suspensión
    if (supervisor.status === 'SUSPENDED') {
        return { isAvailable: false, reason: 'SUSPENDED' };
    }

    // Verificar si ya fichó hoy (está presente)
    const todayAttendance = await Attendance.findOne({
        where: {
            UserId: supervisorId,
            checkInTime: {
                [Op.gte]: startOfDay(new Date()),
                [Op.lte]: endOfDay(new Date())
            }
        }
    });
    if (!todayAttendance) {
        return { isAvailable: false, reason: 'NOT_PRESENT_TODAY' };
    }

    return { isAvailable: true };
}
```

### 7.4 Notificación Multi-Canal

```javascript
/**
 * Envía notificaciones por todos los canales disponibles
 */
async notifyAuthorizers(authorization, authorizers) {
    for (const authorizer of authorizers) {
        const channels = authorizer.channels || [];

        // WebSocket (inmediato - tiempo real)
        if (channels.includes('websocket')) {
            await this.notificationService.sendWebSocket(
                authorizer.userId,
                'LATE_AUTHORIZATION_REQUEST',
                {
                    authorizationId: authorization.id,
                    employee: authorization.employeeName,
                    minutesLate: authorization.minutesLate,
                    expiresAt: authorization.expiresAt
                }
            );
        }

        // Email
        if (channels.includes('email')) {
            await this.emailService.send({
                to: authorizer.email,
                template: 'late-authorization-request',
                data: {
                    supervisorName: authorizer.name,
                    employeeName: authorization.employeeName,
                    minutesLate: authorization.minutesLate,
                    approveUrl: `${BASE_URL}/authorize/${authorization.id}/approve`,
                    rejectUrl: `${BASE_URL}/authorize/${authorization.id}/reject`
                }
            });
        }

        // WhatsApp
        if (channels.includes('whatsapp') && authorizer.whatsappNumber) {
            await this.whatsappService.sendTemplate(
                authorizer.whatsappNumber,
                'late_authorization',
                {
                    employee: authorization.employeeName,
                    minutes: authorization.minutesLate,
                    link: `${BASE_URL}/m/auth/${authorization.id}`
                }
            );
        }

        // Push notification
        if (channels.includes('push') && authorizer.pushToken) {
            await this.pushService.send({
                token: authorizer.pushToken,
                title: 'Solicitud de Autorización',
                body: `${authorization.employeeName} llegó ${authorization.minutesLate} min tarde`,
                data: { authorizationId: authorization.id }
            });
        }
    }
}
```

### 7.5 Ventana de Autorización

```javascript
/**
 * Monitorea la ventana de 5 minutos
 */
async monitorAuthorizationWindow(authorizationId) {
    const WINDOW_MINUTES = 5;
    const CHECK_INTERVAL_MS = 10000; // 10 segundos

    const startTime = Date.now();
    const expiresAt = startTime + (WINDOW_MINUTES * 60 * 1000);

    while (Date.now() < expiresAt) {
        // Verificar si ya fue respondida
        const auth = await LateAuthorization.findByPk(authorizationId);

        if (auth.status !== 'PENDING') {
            return {
                resolved: true,
                status: auth.status,
                respondedBy: auth.respondedBy,
                responseTime: auth.respondedAt - auth.requestedAt
            };
        }

        // Actualizar tiempo restante en kiosko
        const remainingSeconds = Math.floor((expiresAt - Date.now()) / 1000);
        await this.updateKioskDisplay(auth.kioskId, {
            type: 'COUNTDOWN',
            secondsRemaining: remainingSeconds
        });

        await sleep(CHECK_INTERVAL_MS);
    }

    // TIMEOUT: Expiró sin respuesta
    await LateAuthorization.update(
        { status: 'EXPIRED' },
        { where: { id: authorizationId } }
    );

    return {
        resolved: true,
        status: 'EXPIRED',
        responseTime: WINDOW_MINUTES * 60 * 1000
    };
}
```

---

## 8. VALIDACIONES Y REGLAS DE NEGOCIO

### 8.1 Matriz de Validaciones

| # | Validación | Momento | Acción si Falla |
|---|------------|---------|-----------------|
| 1 | Calidad imagen ≥ 0.7 | Pre-match | Solicitar nueva captura |
| 2 | Match biométrico ≥ 0.6 | Identificación | Rechazar con USER_NOT_FOUND |
| 3 | Usuario activo | Post-match | Rechazar con USER_SUSPENDED |
| 4 | Día laborable | Calendario | Rechazar con NON_WORKING_DAY |
| 5 | Dentro de ventana de turno | Horario | Rechazar con OUTSIDE_SHIFT |
| 6 | No duplicado (5 min) | Anti-fraude | Rechazar con DUPLICATE |
| 7 | Dentro de tolerancia | Clasificación | Iniciar autorización |

### 8.2 Umbrales Configurables

```javascript
const CONFIG = {
    biometric: {
        minQualityScore: 0.7,      // Calidad mínima de imagen
        minSimilarityScore: 0.6,   // Match mínimo para identificar
        maxFaceAngle: 15,          // Grados máximos de rotación
        minFaceSize: 100           // Píxeles mínimos de rostro
    },

    attendance: {
        duplicateWindowMinutes: 5,        // Ventana anti-duplicados
        authorizationWindowMinutes: 5,    // Tiempo para autorizar
        maxEarlyEntryMinutes: 60,         // Máximo anticipado
        maxLateMinutesWithoutAuth: 0,     // 0 = siempre pide auth
        autoClockOutAfterHours: 12        // Auto-salida si no fichó
    },

    notifications: {
        reminderBeforeShiftMinutes: 15,   // Recordatorio previo
        escalationAfterMinutes: 3,        // Escalar si no responde
        rrhhAlwaysNotified: true          // RRHH siempre copia
    }
};
```

### 8.3 Reglas de Negocio Críticas

```javascript
/**
 * Regla 1: Acoplamiento de Turnos Rotativos
 *
 * Un empleado nuevo NUNCA inicia su propio ciclo.
 * Siempre se acopla al ciclo existente del turno.
 */
function isValidRotatingShiftAssignment(user, shift) {
    if (shift.shift_type !== 'ROTATING') return true;

    // El turno DEBE tener launch_date
    if (!shift.launch_date) {
        throw new Error('Turno rotativo sin launch_date definido');
    }

    // La fecha de incorporación debe ser >= launch_date
    if (user.incorporation_date < shift.launch_date) {
        throw new Error('Fecha de incorporación anterior al lanzamiento del turno');
    }

    return true;
}

/**
 * Regla 2: Feriados según País de la Sucursal
 *
 * Los feriados se determinan por el país de la SUCURSAL,
 * no del usuario ni de la empresa.
 */
async function getApplicableHolidays(userId, year) {
    const user = await User.findByPk(userId, {
        include: [{
            model: Department,
            include: [Branch]
        }]
    });

    // El país viene de la SUCURSAL
    const country = user.Department.Branch.country;

    return await HolidayService.getByCountryAndYear(country, year);
}

/**
 * Regla 3: Escalación Obligatoria
 *
 * Si el supervisor directo no está disponible,
 * SIEMPRE se debe escalar al grandparent.
 * NUNCA se queda sin autorizador.
 */
async function ensureAuthorizerExists(employeePositionId) {
    let currentPositionId = employeePositionId;
    let attempts = 0;
    const MAX_ESCALATION_LEVELS = 5;

    while (attempts < MAX_ESCALATION_LEVELS) {
        const supervisor = await findSupervisorByPosition(currentPositionId);

        if (supervisor && await isAvailable(supervisor.userId)) {
            return supervisor;
        }

        // Escalar al siguiente nivel
        currentPositionId = supervisor?.positionParentId;
        attempts++;

        if (!currentPositionId) break;
    }

    // Fallback: RRHH siempre puede autorizar
    return await findRRHHManager(companyId);
}

/**
 * Regla 4: RRHH Siempre Informado
 *
 * Toda solicitud de autorización genera una notificación
 * a RRHH, incluyendo información de escalación.
 */
async function notifyRRHHOnAuthorization(authorization, escalationInfo) {
    const rrhhUsers = await findRRHHUsers(authorization.companyId);

    for (const rrhh of rrhhUsers) {
        await NotificationService.send({
            userId: rrhh.userId,
            type: 'LATE_AUTHORIZATION_COPY',
            data: {
                employee: authorization.employeeName,
                minutesLate: authorization.minutesLate,
                authorizer: authorization.authorizerName,
                wasEscalated: escalationInfo.length > 0,
                escalationDetails: escalationInfo
            }
        });
    }
}
```

---

## 9. DIAGRAMA DE ESTADOS

### 9.1 Estados del Fichaje

```
                                    ┌─────────────────────┐
                                    │      INICIADO       │
                                    │  (captura facial)   │
                                    └──────────┬──────────┘
                                               │
                           ┌───────────────────┼───────────────────┐
                           │                   │                   │
                           ▼                   ▼                   ▼
                    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                    │  RECHAZADO   │    │ IDENTIFICADO │    │  RECHAZADO   │
                    │ LOW_QUALITY  │    │              │    │  NO_MATCH    │
                    └──────────────┘    └──────┬───────┘    └──────────────┘
                                               │
                           ┌───────────────────┼───────────────────┐
                           │                   │                   │
                           ▼                   ▼                   ▼
                    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                    │  RECHAZADO   │    │   VALIDADO   │    │  RECHAZADO   │
                    │  SUSPENDED   │    │              │    │  NO_SHIFT    │
                    └──────────────┘    └──────┬───────┘    └──────────────┘
                                               │
                           ┌───────────────────┼───────────────────┐
                           │                   │                   │
                           ▼                   ▼                   ▼
                    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                    │   ON_TIME    │    │    EARLY     │    │ LATE_PENDING │
                    │              │    │              │    │   (auth)     │
                    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
                           │                   │                   │
                           │                   │      ┌────────────┼────────────┐
                           │                   │      │            │            │
                           │                   │      ▼            ▼            ▼
                           │                   │ ┌─────────┐ ┌─────────┐ ┌─────────┐
                           │                   │ │APPROVED │ │REJECTED │ │ EXPIRED │
                           │                   │ └────┬────┘ └────┬────┘ └────┬────┘
                           │                   │      │           │           │
                           ▼                   ▼      ▼           ▼           ▼
                    ┌─────────────────────────────────────────────────────────────┐
                    │                     FICHAJE FINAL                           │
                    │                                                             │
                    │  REGISTRADO        │  REGISTRADO        │  RECHAZADO        │
                    │  status:ON_TIME    │  status:LATE_AUTH  │  status:LATE_     │
                    │                    │                    │  NO_AUTH          │
                    └─────────────────────────────────────────────────────────────┘
```

### 9.2 Estados de Autorización

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ESTADOS DE AUTORIZACIÓN                              │
└─────────────────────────────────────────────────────────────────────────┘

    PENDING ─────────► APPROVED ─────────► (fichaje registrado)
       │                   │
       │                   └──────────────► (notificar a RRHH)
       │
       ├─────────────► REJECTED ─────────► (fichaje rechazado)
       │                   │
       │                   └──────────────► (notificar a empleado)
       │
       └─────────────► EXPIRED ──────────► (fichaje rechazado)
                           │
                           └──────────────► (notificar timeout)

Tiempos:
- PENDING → APPROVED/REJECTED: máx 5 minutos (configurable)
- PENDING → EXPIRED: automático a los 5 minutos
```

---

## 10. INTEGRACIÓN CON BRAIN

### 10.1 Estructura STAGES para Brain

Para que el sistema Brain detecte automáticamente este workflow, se debe crear un servicio con la estructura `static STAGES`:

```javascript
// AttendanceWorkflowService.js

class AttendanceWorkflowService {
    static STAGES = {
        BIOMETRIC_CAPTURE: {
            name: 'Captura Biométrica',
            description: 'Captura de rostro en kiosko',
            sub_statuses: {
                INITIATED: 'Iniciando captura',
                FACE_DETECTED: 'Rostro detectado',
                QUALITY_CHECK: 'Verificando calidad',
                EMBEDDING_EXTRACTED: 'Embedding extraído'
            },
            transitions_to: ['IDENTIFICATION', 'REJECTED_QUALITY'],
            validations: ['quality_score >= 0.7', 'face_angle <= 15'],
            timeout_seconds: 30
        },

        IDENTIFICATION: {
            name: 'Identificación',
            description: 'Match biométrico contra base de datos',
            sub_statuses: {
                SEARCHING: 'Buscando coincidencia',
                MATCH_FOUND: 'Usuario identificado',
                NO_MATCH: 'Sin coincidencia'
            },
            transitions_to: ['USER_VALIDATION', 'REJECTED_NO_MATCH'],
            validations: ['similarity_score >= 0.6'],
            timeout_seconds: 5
        },

        USER_VALIDATION: {
            name: 'Validación de Usuario',
            description: 'Verificar estado y permisos del usuario',
            sub_statuses: {
                CHECKING_STATUS: 'Verificando estado',
                CHECKING_SCHEDULE: 'Verificando turno',
                CHECKING_CALENDAR: 'Verificando calendario'
            },
            transitions_to: ['ATTENDANCE_CLASSIFICATION', 'REJECTED_SUSPENDED', 'REJECTED_NO_SHIFT'],
            validations: ['user.is_active', 'user.has_shift', 'is_working_day'],
            timeout_seconds: 3
        },

        ATTENDANCE_CLASSIFICATION: {
            name: 'Clasificación de Fichaje',
            description: 'Determinar si es a tiempo, temprano o tarde',
            sub_statuses: {
                CALCULATING: 'Calculando diferencia',
                ON_TIME: 'A tiempo',
                EARLY: 'Anticipado',
                LATE: 'Tarde'
            },
            transitions_to: ['REGISTERED', 'AUTHORIZATION_REQUIRED'],
            validations: ['check_tolerance', 'check_early_entry'],
            timeout_seconds: 1
        },

        AUTHORIZATION_REQUIRED: {
            name: 'Autorización Requerida',
            description: 'Solicitud de autorización por llegada tarde',
            sub_statuses: {
                FINDING_AUTHORIZER: 'Buscando autorizador',
                CHECKING_AVAILABILITY: 'Verificando disponibilidad',
                ESCALATING: 'Escalando a supervisor superior',
                REQUEST_SENT: 'Solicitud enviada',
                WAITING_RESPONSE: 'Esperando respuesta'
            },
            transitions_to: ['AUTHORIZED', 'REJECTED_LATE', 'EXPIRED'],
            validations: ['authorizer_found', 'within_window'],
            timeout_seconds: 300,  // 5 minutos
            escalation_rules: {
                escalate_after_seconds: 180,  // 3 minutos
                max_escalation_levels: 3,
                fallback_to_rrhh: true
            }
        },

        AUTHORIZED: {
            name: 'Autorizado',
            description: 'Llegada tarde autorizada por supervisor',
            sub_statuses: {
                APPROVAL_RECEIVED: 'Aprobación recibida',
                REGISTERING: 'Registrando fichaje',
                NOTIFYING: 'Notificando a RRHH'
            },
            transitions_to: ['REGISTERED'],
            validations: ['authorization_valid'],
            timeout_seconds: 5
        },

        REGISTERED: {
            name: 'Registrado',
            description: 'Fichaje completado exitosamente',
            sub_statuses: {
                SAVED: 'Guardado en BD',
                CONFIRMED: 'Confirmado al empleado'
            },
            transitions_to: [],  // Estado final
            validations: [],
            is_final: true
        },

        // Estados de rechazo (finales)
        REJECTED_QUALITY: {
            name: 'Rechazado - Calidad',
            description: 'Imagen de baja calidad',
            is_final: true,
            is_rejection: true,
            retry_allowed: true
        },

        REJECTED_NO_MATCH: {
            name: 'Rechazado - No Identificado',
            description: 'Rostro no reconocido',
            is_final: true,
            is_rejection: true,
            retry_allowed: true,
            requires_rrhh_action: true
        },

        REJECTED_SUSPENDED: {
            name: 'Rechazado - Usuario Suspendido',
            description: 'Usuario con suspensión activa',
            is_final: true,
            is_rejection: true,
            retry_allowed: false
        },

        REJECTED_NO_SHIFT: {
            name: 'Rechazado - Sin Turno',
            description: 'Fuera del turno asignado',
            is_final: true,
            is_rejection: true,
            retry_allowed: false
        },

        REJECTED_LATE: {
            name: 'Rechazado - Tarde Sin Autorización',
            description: 'Llegada tarde no autorizada',
            is_final: true,
            is_rejection: true,
            retry_allowed: false
        },

        EXPIRED: {
            name: 'Expirado',
            description: 'Tiempo de autorización expirado',
            is_final: true,
            is_rejection: true,
            retry_allowed: false
        }
    };

    // Metadata para Brain
    static WORKFLOW_METADATA = {
        name: 'Workflow de Fichaje Biométrico',
        version: '1.0.0',
        module: 'attendance',
        entry_point: 'BIOMETRIC_CAPTURE',
        final_states: ['REGISTERED', 'REJECTED_QUALITY', 'REJECTED_NO_MATCH',
                       'REJECTED_SUSPENDED', 'REJECTED_NO_SHIFT', 'REJECTED_LATE', 'EXPIRED'],
        dependencies: {
            required: ['biometric', 'users', 'shifts', 'calendar'],
            optional: ['notifications', 'whatsapp-integration']
        },
        integrations: {
            kiosk: 'Dispositivo de captura facial',
            organigrama: 'Para encontrar autorizadores',
            holidays: 'Servicio de feriados por país',
            notifications: 'Multi-canal (WebSocket, Email, WhatsApp, Push)'
        }
    };
}

module.exports = AttendanceWorkflowService;
```

### 10.2 Detección por Brain

Brain usa `LIVE_CODE_SCAN` para detectar workflows:

```javascript
// En EcosystemBrainService.js

extractWorkflowStagesFromCode(content, fileName) {
    // Busca: static STAGES = { ... }
    const stagesStartMatch = content.match(/static\s+STAGES\s*=\s*\{/);

    if (stagesStartMatch) {
        // Extraer estructura de STAGES
        // Construir objeto de workflow
        // Agregar a workflows detectados
    }
}
```

### 10.3 Registro en modules-registry.json

El workflow debe estar referenciado en el registry:

```json
{
    "attendance": {
        "name": "Control de Asistencia",
        "category": "core",
        "version": "2.0.0",
        "workflows": {
            "clock_in": {
                "service": "AttendanceWorkflowService",
                "stages_count": 12,
                "has_authorization": true,
                "uses_organigrama": true,
                "multi_channel_notifications": true
            }
        },
        "dependencies": {
            "required": ["biometric", "users", "shifts"],
            "optional": ["notifications", "whatsapp-integration"]
        }
    }
}
```

---

## APÉNDICE A: GLOSARIO

| Término | Definición |
|---------|------------|
| **Fichaje** | Registro de entrada/salida de un empleado |
| **Kiosko** | Dispositivo físico para captura biométrica |
| **Embedding** | Vector numérico de 128 dimensiones que representa un rostro |
| **Match** | Coincidencia entre embedding capturado y almacenado |
| **Turno rotativo** | Esquema donde empleados rotan entre diferentes horarios |
| **Fase** | Período específico dentro de un ciclo rotativo (mañana/tarde/noche) |
| **Launch date** | Fecha de inicio del ciclo de un turno rotativo |
| **Acoplamiento** | Proceso de integrar empleado nuevo a ciclo existente |
| **Escalación** | Subir solicitud al siguiente nivel jerárquico |
| **Organigrama** | Estructura jerárquica de posiciones (parent_position_id) |
| **Tolerancia** | Minutos de margen después del inicio del turno |
| **Early entry** | Minutos permitidos antes del inicio del turno |

---

## APÉNDICE B: TABLAS DE BASE DE DATOS

### B.1 Tablas Principales

```sql
-- Tabla de fichajes
CREATE TABLE attendances (
    id SERIAL PRIMARY KEY,
    "UserId" INTEGER REFERENCES users(id),
    company_id INTEGER REFERENCES companies(id),
    "checkInTime" TIMESTAMP NOT NULL,
    "checkOutTime" TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    kiosk_id INTEGER,
    biometric_score DECIMAL(3,2),
    authorization_id INTEGER,
    minutes_late INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de autorizaciones
CREATE TABLE late_authorizations (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id),
    authorizer_id INTEGER REFERENCES users(id),
    company_id INTEGER REFERENCES companies(id),
    requested_at TIMESTAMP NOT NULL,
    responded_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    minutes_late INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    response_notes TEXT,
    was_escalated BOOLEAN DEFAULT FALSE,
    escalation_info JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de turnos
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    name VARCHAR(100) NOT NULL,
    shift_type VARCHAR(20) NOT NULL, -- FIXED, ROTATING
    rotation_scheme JSONB,
    launch_date DATE,
    tolerance_minutes INTEGER DEFAULT 15,
    early_entry_minutes INTEGER DEFAULT 30,
    schedules JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de feriados
CREATE TABLE holidays (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL,
    date DATE NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(20), -- FIXED, MOVABLE, BRIDGE
    year INTEGER NOT NULL,
    UNIQUE(country_code, date)
);

-- Tabla de días no laborables manuales
CREATE TABLE company_non_working_days (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    date DATE NOT NULL,
    reason VARCHAR(200),
    affects VARCHAR(20) DEFAULT 'ALL', -- ALL, BRANCH, DEPARTMENT
    branch_id INTEGER,
    department_id INTEGER,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## APÉNDICE C: CONFIGURACIÓN RECOMENDADA

### C.1 Variables de Entorno

```bash
# Biométrico
BIOMETRIC_MIN_QUALITY=0.7
BIOMETRIC_MIN_SIMILARITY=0.6
BIOMETRIC_MAX_FACE_ANGLE=15

# Fichaje
ATTENDANCE_DUPLICATE_WINDOW_MINUTES=5
ATTENDANCE_AUTHORIZATION_WINDOW_MINUTES=5
ATTENDANCE_MAX_EARLY_ENTRY_MINUTES=60
ATTENDANCE_AUTO_CLOCK_OUT_HOURS=12

# Notificaciones
NOTIFICATION_ESCALATION_AFTER_MINUTES=3
NOTIFICATION_RRHH_ALWAYS_NOTIFIED=true
NOTIFICATION_CHANNELS=websocket,email,whatsapp,push

# WebSocket
WS_AUTHORIZATION_NAMESPACE=/authorization
WS_KIOSK_NAMESPACE=/kiosk
```

---

**Documento generado para Sistema Brain y Tutoriales**
**Última actualización**: 2025-12-14
