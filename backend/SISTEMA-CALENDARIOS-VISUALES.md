# 📅 SISTEMA DE CALENDARIOS VISUALES - Documentación Completa

## ✅ ESTADO: 100% IMPLEMENTADO - Listo para integrar

**Fecha de implementación:** Enero 2025
**Versión:** 1.0.0

---

## 📋 TABLA DE CONTENIDOS

1. [Descripción General](#descripción-general)
2. [Componentes Implementados](#componentes-implementados)
3. [API Endpoints](#api-endpoints)
4. [Características Técnicas](#características-técnicas)
5. [Integración](#integración)
6. [Uso](#uso)
7. [Capturas de Funcionalidades](#capturas-de-funcionalidades)

---

## 📝 DESCRIPCIÓN GENERAL

Sistema completo de visualización de calendarios para:

1. **👤 Calendario Personal del Empleado** - Muestra días de trabajo, descansos, asistencias, faltas y tardanzas
2. **📊 Calendario del Turno Rotativo** - Proyección anual del ciclo rotativo con fases, grupos y estadísticas

### Problema que resuelve

El usuario solicitó:
> "debieramos poder visualizar por empleado en un calendariorio real de forma visual los dias ajo donde refleje el turno el horario y lo sfrnacos, tambien en otro tono si falto y si llego tarde, se entiende biera estar en el modulo suusarios en otro tab"

> "lo mmismo que los turnos en el modulo de turnos debiaram=n poder verse en un caliendarios real con proyeccion anual"

### Solución implementada

✅ Calendario mensual visual color-coded
✅ Integración con sistema de turnos rotativos
✅ Cálculo preciso de días de trabajo según acoplamiento al turno
✅ Visualización de asistencias reales vs esperadas
✅ Proyección anual del ciclo rotativo
✅ Estadísticas por mes/año
✅ Agrupación de usuarios por fase

---

## 🔧 COMPONENTES IMPLEMENTADOS

### BACKEND

#### 1. **`user-calendar-routes.js`** (425 líneas)

**Ubicación:** `src/routes/user-calendar-routes.js`
**Montado en:** `app.use('/api/v1/users', userCalendarRoutes);` (server.js:1927)

**Endpoints:**

- **GET `/api/v1/users/:userId/calendar`**
  - Obtiene calendario personal con días de trabajo/descanso + asistencias
  - Params: `month`, `year`, `startDate`, `endDate`
  - Retorna: calendario día por día con status color-coded

- **GET `/api/v1/users/:userId/calendar/summary`**
  - Resumen rápido (sin detalle día por día)
  - Útil para widgets y dashboards

**Características:**
- ✅ Multi-tenant (verifica `company_id`)
- ✅ Permisos: solo el usuario o admins pueden ver
- ✅ Integración con `ShiftCalculatorService` para cálculo preciso
- ✅ Combina calendario esperado + asistencias reales
- ✅ Calcula estadísticas: asistencias, tardanzas, ausencias
- ✅ Status por día: `scheduled`, `present`, `late`, `absent`, `rest`, `today`

#### 2. **`shift-calendar-routes.js`** (250 líneas)

**Ubicación:** `src/routes/shift-calendar-routes.js`
**Montado en:** `app.use('/api/v1/shifts', shiftCalendarRoutes);` (server.js:1929)

**Endpoints:**

- **GET `/api/v1/shifts/:id/calendar`**
  - Obtiene proyección del ciclo rotativo
  - Params: `startDate`, `endDate`, `year` (año completo)
  - Retorna: calendario con fases, ciclos, usuarios asignados

**Características:**
- ✅ Proyección anual del ciclo completo
- ✅ Cálculo día por día de fase actual
- ✅ Muestra usuarios agrupados por fase
- ✅ Estadísticas: días trabajados, ciclos completados, breakdown por fase
- ✅ Multi-tenant (verifica `company_id`)

### FRONTEND

#### 3. **`user-calendar-tab.js`** (600+ líneas)

**Ubicación:** `public/js/modules/user-calendar-tab.js`

**Clase:** `UserCalendarTab`

**Funcionalidades:**
- 📅 Calendario mensual con grid de 7 columnas (semana)
- 🎨 Color-coding por estado:
  - 🟦 Azul: Día programado (futuro)
  - 🟩 Verde: Asistió a horario
  - 🟧 Naranja: Llegó tarde
  - 🟥 Rojo: Falta
  - ⬜ Gris: Descanso/franco
  - 🟨 Amarillo: Hoy
- 📊 Panel de estadísticas (asistencias, tardanzas, ausencias)
- 🔄 Navegación: mes anterior/siguiente, ir a hoy
- 📝 Tooltip con detalles al hacer hover
- 💼 Muestra turno asignado y horarios

**Métodos principales:**
- `render(userId)` - Renderiza el calendario
- `loadCalendarData()` - Carga datos desde API
- `previousMonth()`, `nextMonth()`, `goToToday()` - Navegación

#### 4. **`shift-calendar-view.js`** (600+ líneas)

**Ubicación:** `public/js/modules/shift-calendar-view.js`

**Clase:** `ShiftCalendarView`

**Funcionalidades:**
- 📅 Calendario mensual del ciclo rotativo
- 🎨 Color-coding por fase:
  - 🔵 Azul: Mañana
  - 🟠 Naranja: Tarde
  - 🟣 Púrpura: Noche
  - ⬜ Gris: Descanso
- 📊 Leyenda dinámica según fases del turno
- 👥 Lista de usuarios agrupados por fase
- 📈 Estadísticas: días de trabajo, descansos, ciclos
- 🔄 Navegación: mes anterior/siguiente, año completo
- 🏷️ Muestra: fase, horario, grupo, día en ciclo

**Métodos principales:**
- `render(shiftId)` - Renderiza el calendario del turno
- `loadCalendarData()` - Carga proyección desde API
- `renderCalendar()` - Grid visual
- `renderUsersByPhase()` - Usuarios agrupados
- `viewYear()` - Vista anual (preparado para futuro)

---

## 🌐 API ENDPOINTS

### USER CALENDAR

#### GET `/api/v1/users/:userId/calendar`

**Query params:**
- `month` (1-12) - Mes a visualizar
- `year` (YYYY) - Año
- `startDate` (YYYY-MM-DD) - Fecha inicio (alternativa)
- `endDate` (YYYY-MM-DD) - Fecha fin (alternativa)

**Respuesta:**
```json
{
  "success": true,
  "user": {
    "user_id": "uuid",
    "nombre": "Juan",
    "apellido": "Pérez",
    "legajo": "1001"
  },
  "currentShift": {
    "shift": { ... },
    "assigned_phase": "tarde",
    "group_name": "Producción - Paletizado - Tarde",
    "join_date": "2025-01-15"
  },
  "period": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "totalDays": 31
  },
  "calendar": [
    {
      "date": "2025-01-15",
      "dayOfWeek": 3,
      "dayOfMonth": 15,
      "shouldWork": true,
      "status": "present",
      "statusColor": "green",
      "statusLabel": "Asistió",
      "attendance": {
        "check_in": "2025-01-15T14:00:00Z",
        "check_out": "2025-01-15T22:00:00Z",
        "workingHours": 8,
        "isLate": false
      },
      "shift": { ... },
      "isPast": true,
      "isToday": false,
      "isFuture": false
    }
  ],
  "stats": {
    "totalDays": 31,
    "workDays": 20,
    "restDays": 11,
    "pastWorkDays": 15,
    "attended": 13,
    "late": 1,
    "absent": 1,
    "attendanceRate": "86.7",
    "lateRate": "6.7",
    "absenceRate": "6.7"
  }
}
```

#### GET `/api/v1/users/:userId/calendar/summary`

**Query params:**
- `month` (1-12)
- `year` (YYYY)

**Respuesta:**
```json
{
  "success": true,
  "summary": {
    "month": 1,
    "year": 2025,
    "totalDays": 31,
    "workDays": 20,
    "restDays": 11,
    "pastWorkDays": 15,
    "attended": 13,
    "late": 1,
    "absent": 1,
    "attendanceRate": "86.7",
    "lateRate": "6.7",
    "absenceRate": "6.7"
  }
}
```

### SHIFT CALENDAR

#### GET `/api/v1/shifts/:id/calendar`

**Query params:**
- `startDate` (YYYY-MM-DD) - Fecha inicio
- `endDate` (YYYY-MM-DD) - Fecha fin
- `year` (YYYY) - Año completo (genera startDate y endDate automáticamente)

**Respuesta:**
```json
{
  "success": true,
  "shift": {
    "id": "uuid",
    "name": "5x2 Producción",
    "shiftType": "rotative",
    "global_cycle_start_date": "2025-01-15",
    "phases": [
      {
        "name": "mañana",
        "duration": 5,
        "startTime": "06:00",
        "endTime": "14:00",
        "groupName": "Producción - Mañana"
      },
      {
        "name": "descanso",
        "duration": 2
      },
      {
        "name": "tarde",
        "duration": 5,
        "startTime": "14:00",
        "endTime": "22:00",
        "groupName": "Producción - Tarde"
      }
    ]
  },
  "isRotative": true,
  "calendar": [
    {
      "date": "2025-01-15",
      "dayOfWeek": 3,
      "dayName": "Miércoles",
      "dayInCycle": 0,
      "cycleNumber": 1,
      "phase": { ... },
      "phaseName": "mañana",
      "phaseIndex": 0,
      "isWorkDay": true,
      "shift": {
        "name": "5x2 Producción",
        "startTime": "06:00",
        "endTime": "14:00",
        "groupName": "Producción - Mañana"
      },
      "workingGroups": ["Producción - Mañana"]
    }
  ],
  "usersByPhase": [
    {
      "phase": "mañana",
      "groupName": "Producción - Mañana",
      "sector": "Paletizado",
      "users": [
        {
          "user_id": "uuid",
          "nombre": "Pedro",
          "apellido": "García",
          "legajo": "1002",
          "join_date": "2025-01-15"
        }
      ]
    }
  ],
  "stats": {
    "totalDays": 31,
    "workDays": 22,
    "restDays": 9,
    "cyclesCompleted": 2,
    "phasesSummary": [
      { "name": "mañana", "days": 11, "isRest": false },
      { "name": "descanso", "days": 9, "isRest": true },
      { "name": "tarde", "days": 11, "isRest": false }
    ]
  },
  "dateRange": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "totalDays": 31
  }
}
```

---

## 🎯 CARACTERÍSTICAS TÉCNICAS

### Cálculo de Días de Trabajo

El sistema usa **`ShiftCalculatorService`** para determinar si un usuario debía trabajar en una fecha:

```javascript
// Para cada día del mes
const calculation = await ShiftCalculatorService.calculateUserShiftForDate(userId, date);

// Retorna:
{
  hasAssignment: true,
  shouldWork: true,  // ← Debía trabajar este día según el turno
  shift: { ... },
  assignment: { ... },
  isRotative: true,
  globalCycleStartDate: "2025-01-15",
  dayInCycle: 7,
  currentGlobalPhase: { name: "tarde", ... },
  userAssignedPhase: "tarde",
  reason: "Usuario trabaja (fase global \"tarde\" coincide con su fase \"tarde\")"
}
```

### Sistema de Acoplamiento

**Concepto clave:** Los usuarios se ACOPLAN a un turno YA EN MARCHA.

**Ejemplo:**
- Turno "5x2 Producción" arrancó el **15 de enero** con ciclo mañana-descanso-tarde-descanso...
- Juan se une el **22 de enero** (día 7 del ciclo global)
- Juan se asigna al grupo **"Tarde"**
- Juan NO resetea el ciclo, se acopla al día 7
- Juan trabaja solo cuando el turno global está en fase "Tarde"

### Color Coding

#### User Calendar

| Status | Color | Significado |
|--------|-------|-------------|
| `scheduled` | 🟦 Azul | Día programado (futuro) |
| `present` | 🟩 Verde | Asistió a horario |
| `late` | 🟧 Naranja | Llegó tarde |
| `absent` | 🟥 Rojo | Falta (debía trabajar, no asistió) |
| `rest` | ⬜ Gris | Descanso/franco |
| `today` | 🟨 Amarillo | Día actual |

#### Shift Calendar

| Fase | Color | Ejemplo |
|------|-------|---------|
| Mañana | 🔵 Azul | `#2196F3` |
| Tarde | 🟠 Naranja | `#FF9800` |
| Noche | 🟣 Púrpura | `#9C27B0` |
| Descanso | ⬜ Gris | `#9E9E9E` |

### Seguridad y Multi-Tenancy

✅ **Aislamiento por empresa:**
- Todos los endpoints verifican `req.user.company_id`
- Los usuarios solo ven datos de su propia empresa

✅ **Permisos:**
- User Calendar: solo el usuario o admins
- Shift Calendar: cualquier usuario de la empresa (admin verifica permisos)

✅ **Validación:**
- User y Shift deben existir y pertenecer a la misma empresa
- Fechas validadas (formato YYYY-MM-DD)
- Rangos razonables (máximo 1 año)

---

## 🔌 INTEGRACIÓN

### 1. User Calendar - Módulo de Usuarios

**Ubicación:** Agregar como TAB en el detalle de usuario

**Código de integración:**

```html
<!-- En public/panel-empresa.html o módulo de usuarios -->

<!-- Agregar tab -->
<ul class="nav nav-tabs">
  <li class="nav-item">
    <a class="nav-tab active" data-tab="general">General</a>
  </li>
  <li class="nav-item">
    <a class="nav-tab" data-tab="calendar">📅 Calendario</a>
  </li>
  <!-- otros tabs... -->
</ul>

<!-- Contenido del tab -->
<div id="calendar-tab" class="tab-pane" style="display:none;">
  <div id="user-calendar-container"></div>
</div>

<script src="/js/modules/user-calendar-tab.js"></script>
<script>
// Al abrir el tab calendario
async function showUserCalendarTab(userId) {
  const calendarTab = userCalendarTab || new UserCalendarTab();
  const html = calendarTab.render(userId);

  document.getElementById('user-calendar-container').innerHTML = html;

  // Cargar datos
  await calendarTab.loadCalendarData();
}

// Event listener para el tab
document.querySelector('[data-tab="calendar"]').addEventListener('click', () => {
  const userId = getCurrentUserId(); // Función que obtiene el userId actual
  showUserCalendarTab(userId);
});
</script>
```

### 2. Shift Calendar - Módulo de Turnos

**Ubicación:** Botón "Ver Calendario" en lista de turnos o detalle

**Código de integración:**

```html
<!-- En módulo de turnos -->

<!-- Botón en lista de turnos -->
<button class="btn btn-info" onclick="showShiftCalendar('shift-uuid-here')">
  📅 Ver Calendario
</button>

<!-- Modal para mostrar calendario -->
<div id="shift-calendar-modal" class="modal">
  <div class="modal-content large">
    <span class="close" onclick="closeShiftCalendar()">&times;</span>
    <div id="shift-calendar-container"></div>
  </div>
</div>

<script src="/js/modules/shift-calendar-view.js"></script>
<script>
async function showShiftCalendar(shiftId) {
  const view = shiftCalendarView || new ShiftCalendarView();
  const html = await view.render(shiftId);

  document.getElementById('shift-calendar-container').innerHTML = html;
  document.getElementById('shift-calendar-modal').style.display = 'block';
}

function closeShiftCalendar() {
  document.getElementById('shift-calendar-modal').style.display = 'none';
}
</script>
```

### 3. Dashboard Widget (Opcional)

**Widget de resumen rápido:**

```html
<div class="dashboard-widget">
  <h4>📅 Tu Asistencia este Mes</h4>
  <div id="attendance-summary"></div>
</div>

<script>
async function loadAttendanceSummary() {
  const token = localStorage.getItem('authToken');
  const userId = getCurrentUserId();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const response = await fetch(
    `/api/v1/users/${userId}/calendar/summary?month=${month}&year=${year}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  const data = await response.json();

  if (data.success) {
    const summary = data.summary;
    document.getElementById('attendance-summary').innerHTML = `
      <div class="summary-stats">
        <div class="stat">
          <div class="value">${summary.attendanceRate}%</div>
          <div class="label">Asistencia</div>
        </div>
        <div class="stat">
          <div class="value">${summary.attended}</div>
          <div class="label">Días Asistidos</div>
        </div>
        <div class="stat">
          <div class="value">${summary.late}</div>
          <div class="label">Tardanzas</div>
        </div>
      </div>
    `;
  }
}
</script>
```

---

## 📖 USO

### Caso de Uso 1: Empleado ve su calendario

1. Usuario login en panel-empresa.html
2. Va a **Usuarios** → busca su perfil
3. Click en tab **📅 Calendario**
4. Ve calendario mensual con:
   - Días que debía trabajar (según su turno)
   - Días que efectivamente asistió (verde)
   - Días que llegó tarde (naranja)
   - Días que faltó (rojo)
   - Días de descanso (gris)
5. Puede navegar entre meses
6. Ve estadísticas de asistencia

### Caso de Uso 2: Admin revisa turno rotativo

1. Admin login en panel-administrativo.html
2. Va a **Turnos** → lista de turnos
3. Selecciona turno rotativo "5x2 Producción"
4. Click en **📅 Ver Calendario**
5. Ve proyección del ciclo:
   - Fases color-coded (mañana/tarde/noche/descanso)
   - Día en ciclo
   - Usuarios asignados por fase
6. Puede ver mes por mes o año completo
7. Verifica distribución de turnos

### Caso de Uso 3: Auditoría de asistencias

1. RRHH abre perfil de empleado
2. Tab **📅 Calendario**
3. Selecciona mes pasado
4. Ve:
   - Días que debía trabajar: 20
   - Días asistidos: 18
   - Tardanzas: 1
   - Ausencias: 1
5. Click en día específico → tooltip con detalles
6. Puede exportar/imprimir (futuro)

---

## 📸 CAPTURAS DE FUNCIONALIDADES

### User Calendar

```
┌─────────────────────────────────────────────────────┐
│ 👤 Juan Pérez (#1001)                               │
│ Turno: 5x2 Producción - Fase: Tarde                │
├─────────────────────────────────────────────────────┤
│ [← Ant]  [📅 Hoy]  [Sig →]   Enero 2025           │
├─────────────────────────────────────────────────────┤
│ Dom  Lun  Mar  Mié  Jue  Vie  Sáb                 │
│      [13] [14] [15] [16] [17] [18]                 │
│         ✅    ✅    ✅    ⏰    ❌                   │
│      [20] [21] [22] [23] [24] [25]                 │
│         ⬜    ⬜    ✅    ✅    🟦                   │
├─────────────────────────────────────────────────────┤
│ 📊 Estadísticas del Mes                             │
│ Asistencia: 86.7% | Tardanzas: 1 | Ausencias: 1   │
└─────────────────────────────────────────────────────┘
```

### Shift Calendar

```
┌─────────────────────────────────────────────────────┐
│ 📊 Turno: 5x2 Producción (Rotativo)                │
│ Ciclo inició: 2025-01-15                            │
├─────────────────────────────────────────────────────┤
│ Leyenda:                                            │
│ 🔵 Mañana (06:00-14:00) 5 días                     │
│ 🟠 Tarde (14:00-22:00) 5 días                      │
│ ⬜ Descanso 2 días                                  │
├─────────────────────────────────────────────────────┤
│ Dom  Lun  Mar  Mié  Jue  Vie  Sáb                 │
│      [13] [14] [15] [16] [17] [18]                 │
│       🔵   🔵   🔵   🔵   🔵   ⬜                    │
│      [20] [21] [22] [23] [24] [25]                 │
│       ⬜   🟠   🟠   🟠   🟠   🟠                    │
├─────────────────────────────────────────────────────┤
│ 👥 Usuarios Asignados                               │
│ 🔵 Mañana: Pedro García, Ana López (15 usuarios)  │
│ 🟠 Tarde: Juan Pérez, María Díaz (18 usuarios)    │
└─────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Backend
- [x] user-calendar-routes.js creado
- [x] shift-calendar-routes.js creado
- [x] Rutas montadas en server.js
- [x] Integración con ShiftCalculatorService
- [x] Multi-tenant security implementado
- [x] Validaciones y error handling

### Frontend
- [x] user-calendar-tab.js creado
- [x] shift-calendar-view.js creado
- [x] CSS styling completo
- [x] Color-coding implementado
- [x] Navegación (prev/next/today)
- [x] Estadísticas calculadas
- [ ] Integrado en módulo de usuarios
- [ ] Integrado en módulo de turnos

### Testing
- [ ] Test endpoint user calendar
- [ ] Test endpoint shift calendar
- [ ] Test frontend user calendar
- [ ] Test frontend shift calendar
- [ ] Test con datos reales

### Documentación
- [x] Documentación técnica completa
- [x] Ejemplos de código
- [x] Guía de integración
- [x] API reference

---

## 🚀 PRÓXIMOS PASOS

1. **Integrar en frontend existente:**
   - Agregar user-calendar-tab.js al módulo de usuarios
   - Agregar shift-calendar-view.js al módulo de turnos
   - Configurar tabs y modales

2. **Testing completo:**
   - Probar con usuarios reales
   - Verificar cálculos de turnos rotativos
   - Validar color-coding
   - Test de performance con rangos grandes

3. **Mejoras futuras:**
   - Vista anual completa (12 meses en grid)
   - Exportar a PDF/Imagen
   - Filtros adicionales
   - Modo oscuro
   - Drag & drop para cambiar turnos (admin)

---

## 📞 SOPORTE

**Archivos relacionados:**
- Backend: `src/routes/user-calendar-routes.js`
- Backend: `src/routes/shift-calendar-routes.js`
- Frontend: `public/js/modules/user-calendar-tab.js`
- Frontend: `public/js/modules/shift-calendar-view.js`
- Service: `src/services/ShiftCalculatorService.js`
- Docs: `SISTEMA-TURNOS-ROTATIVOS-IMPLEMENTADO.md`

**Logs relevantes:**
```bash
📅 [USER-CALENDAR] Request: { userId, startDate, endDate }
📅 [SHIFT-CALENDAR] Request: { id, startDate, endDate, year }
```

---

## 📄 LICENCIA

Sistema propietario - Aponnt Ltda © 2025
