# VISIÓN: Sistema Inteligente Plug & Play

## Fecha: 2025-11-27
## Estado: DOCUMENTO MAESTRO - Guía para cualquier sesión de Claude

---

## 1. FILOSOFÍA FUNDAMENTAL

### 1.1 Principios Inquebrantables

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRINCIPIOS DEL SISTEMA INTELIGENTE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. DATO ÚNICO (Single Source of Truth)                                     │
│     ────────────────────────────────────                                    │
│     → Un dato se define en UN SOLO lugar                                    │
│     → Todos los módulos LEEN de ese lugar                                   │
│     → NUNCA hay dos fuentes para el mismo dato                              │
│     → Ejemplo: "ausencia justificada" se define en UN lugar, no en 2        │
│                                                                             │
│  2. PLUG & PLAY INTELIGENTE                                                 │
│     ───────────────────────────                                             │
│     → Si el módulo EXISTE → los datos fluyen automáticamente                │
│     → Si el módulo NO EXISTE → el flujo NO se rompe                         │
│     → Siempre hay un FALLBACK manual cuando falta un módulo                 │
│     → El sistema DETECTA qué módulos tiene contratados la empresa           │
│                                                                             │
│  3. PARAMETRIZACIÓN INTELIGENTE                                             │
│     ─────────────────────────────                                           │
│     → RRHH parametriza UNA VEZ → se replica automáticamente                 │
│     → Herencia: País → Empresa → Sucursal → Rol → Usuario                   │
│     → Cada nivel puede OVERRIDE el anterior                                 │
│     → Mínimo esfuerzo para el usuario, máxima flexibilidad                  │
│                                                                             │
│  4. OLLAMA COMO POTENCIADOR                                                 │
│     ─────────────────────────                                               │
│     → En cada eslabón de la cadena, IA puede:                               │
│       • Sugerir (basado en patrones detectados)                             │
│       • Validar (alertar inconsistencias)                                   │
│       • Completar (auto-fill inteligente)                                   │
│       • Explicar (ayuda contextual)                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CADENA DE DEPENDENCIAS PARA LIQUIDACIÓN

### 2.1 El Problema Actual

El sistema NO puede liquidar sueldos porque la cadena de dependencias está ROTA.
No es un problema de código, es un problema de DATOS FALTANTES y MÓDULOS DESCONECTADOS.

### 2.2 La Cadena Completa (de A a B)

```
NIVEL 0: INFRAESTRUCTURA EMPRESARIAL
═══════════════════════════════════════════════════════════════════════════════
┌─────────────────┐
│    EMPRESA      │ ← ¿Tiene PAÍS asignado?
│   (companies)   │ ← ¿Tiene SUCURSALES o es única sede?
└────────┬────────┘ ← ¿Tiene MÓDULOS contratados definidos?
         │
         ▼
┌─────────────────┐
│   SUCURSAL      │ ← ¿Hereda país de empresa o tiene propio? (multi-país)
│(company_branches│ ← ¿Tiene CALENDARIO asignado?
└────────┬────────┘ ← ¿Tiene PLANTILLA DEFAULT de liquidación?
         │
═══════════════════════════════════════════════════════════════════════════════

NIVEL 1: CONFIGURACIÓN LABORAL
═══════════════════════════════════════════════════════════════════════════════
         │
         ▼
┌─────────────────┐
│   CALENDARIO    │ ← ¿Existen FERIADOS nacionales cargados?
│   (holidays)    │ ← ¿Existen FERIADOS provinciales?
└────────┬────────┘ ← ¿Se crearon DÍAS NO LABORABLES manuales?
         │
         ▼
┌─────────────────┐
│    TURNOS       │ ← ¿Hay TURNOS definidos con horarios?
│    (shifts)     │ ← ¿Tienen CALENDARIO asociado (días que aplica)?
└────────┬────────┘ ← ¿Calculan HORAS NOCTURNAS automáticamente?
         │
═══════════════════════════════════════════════════════════════════════════════

NIVEL 2: CONFIGURACIÓN DE EMPLEADO
═══════════════════════════════════════════════════════════════════════════════
         │
         ▼
┌─────────────────┐
│   EMPLEADO      │ ← ¿Tiene TURNO asignado?
│    (users)      │ ← ¿Tiene CATEGORÍA SALARIAL?
└────────┬────────┘ ← ¿Tiene CONVENIO asignado (descriptivo)?
         │          ← ¿Tiene PLANTILLA DE LIQUIDACIÓN asignada?
         │
         ▼
┌─────────────────┐
│  PLANTILLA DE   │ ← Asignable por: PAÍS → ROL → USUARIO
│  LIQUIDACIÓN    │ ← Define CONCEPTOS (haberes, deducciones)
│(payroll_template│ ← Define PORCENTAJES base
└────────┬────────┘ ← Override posible por usuario
         │
═══════════════════════════════════════════════════════════════════════════════

NIVEL 3: DATOS OPERATIVOS
═══════════════════════════════════════════════════════════════════════════════
         │
         ▼
┌─────────────────┐
│   ASISTENCIA    │ ← ¿Hay REGISTROS de entrada/salida?
│  (attendances)  │ ← ¿Se calculan HORAS EXTRAS automáticamente?
└────────┬────────┘ ← ¿Se registran HORAS NOCTURNAS?
         │          ← ¿Se detectan LLEGADAS TARDE?
         │
         ▼
┌─────────────────┐
│   NOVEDADES     │ ← Si hay DASHBOARD MÉDICO:
│ (justificación  │     → Certificados definen justificación
│  de ausencias)  │ ← Si NO hay DASHBOARD MÉDICO:
└────────┬────────┘     → Fallback: RRHH justifica manualmente en Asistencia
         │
═══════════════════════════════════════════════════════════════════════════════

NIVEL 4: LIQUIDACIÓN
═══════════════════════════════════════════════════════════════════════════════
         │
         ▼
┌─────────────────┐
│  LIQUIDACIÓN    │ ← SOLO puede ejecutarse si TODA la cadena está completa
│  (payroll_runs) │ ← Sistema ALERTA si falta algún dato crítico
└─────────────────┘ ← NO genera recibo con datos incompletos
```

---

## 3. REGLAS DE ASIGNACIÓN Y HERENCIA

### 3.1 Plantillas de Liquidación

```
PRIORIDAD DE ASIGNACIÓN (de mayor a menor):
═══════════════════════════════════════════

1. USUARIO tiene plantilla específica asignada
   └── USA ESA (override total)

2. ROL del usuario tiene plantilla asignada
   └── USA ESA (herencia por rol)

3. SUCURSAL tiene plantilla default
   └── USA ESA (herencia por ubicación)

4. EMPRESA tiene plantilla default
   └── USA ESA (herencia por empresa)

5. PAÍS tiene plantilla default
   └── USA ESA (herencia por legislación)

6. NINGUNA PLANTILLA
   └── ERROR: No se puede liquidar
   └── Sistema ALERTA: "Empleado sin plantilla asignada"
```

### 3.2 Convenios Colectivos (DESCRIPTIVOS)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONVENIOS = SOLO DESCRIPTIVOS                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  NO SE BUSCAN LEGISLACIONES AUTOMÁTICAMENTE                                 │
│  El convenio es solo un TAG/ETIQUETA que se asocia a:                       │
│                                                                             │
│  • ROL → "Todos los Vendedores tienen Convenio Comercio 130/75"             │
│  • USUARIO → Override individual si es distinto al rol                      │
│                                                                             │
│  El convenio SE MUESTRA en:                                                 │
│  • Recibo de sueldo                                                         │
│  • Ficha del empleado                                                       │
│  • Reportes de RRHH                                                         │
│                                                                             │
│  Los CÁLCULOS REALES vienen de la PLANTILLA DE LIQUIDACIÓN                  │
│  (que RRHH parametriza según el convenio aplicable)                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. PLUG & PLAY: ESCENARIOS DE MÓDULOS

### 4.1 Dashboard Médico

```
ESCENARIO A: Empresa TIENE Dashboard Médico contratado
══════════════════════════════════════════════════════════════════
Empleado falta → Presenta certificado médico → Dashboard Médico
                                                      │
                                                      ▼
                                    Médico/RRHH aprueba = APROBADO
                                                      │
                                                      ▼
                    ┌─────────────────────────────────┴─────────────────┐
                    │                                                   │
                    ▼                                                   ▼
            Asistencia LEE                                      Liquidación LEE
            estado = "JUSTIFICADA"                              estado = "JUSTIFICADA"
            (NO tiene campo propio,                             (descuenta de ausencias
             LEE del dashboard médico)                           injustificadas)


ESCENARIO B: Empresa NO TIENE Dashboard Médico
══════════════════════════════════════════════════════════════════
Empleado falta → Sistema detecta: "Módulo médico no contratado"
                        │
                        ▼
        FALLBACK AUTOMÁTICO:
        En módulo Asistencia aparece:
        ┌────────────────────────────────────────────┐
        │ Ausencia del día: 2025-11-27               │
        │ Justificada: [Sí ▼]                        │
        │ Motivo: [Enfermedad ▼]                     │
        │ Observaciones: _______________             │
        └────────────────────────────────────────────┘
                        │
                        ▼
        Dato guardado en: attendance.is_justified = true
                          attendance.absence_reason = "medical"
                        │
                        ▼
        Liquidación LEE de attendance (MISMA FUENTE ÚNICA)
```

### 4.2 Módulo de Turnos

```
ESCENARIO A: Empresa TIENE módulo Turnos configurado
═══════════════════════════════════════════════════════════════════
Turno definido: "Mañana" (08:00 - 16:00)
                        │
                        ▼
        Empleado asignado a turno "Mañana"
                        │
                        ▼
        Asistencia SABE:
        • Hora esperada de entrada: 08:00
        • Hora esperada de salida: 16:00
        • Jornada esperada: 8 horas
        • Si entrada > 08:15 → LLEGADA TARDE
        • Si salida > 16:00 → HORA EXTRA potencial


ESCENARIO B: Empresa NO TIENE turnos definidos
═══════════════════════════════════════════════════════════════════
FALLBACK:
        Sistema usa defaults configurables:
        • Jornada default: 8 horas
        • No hay control de llegada tarde
        • Horas extras = manual por RRHH
```

---

## 5. AUDITORÍA DE CADENA DE DEPENDENCIAS

### 5.1 Checklist de Validación Pre-Liquidación

```
ANTES DE LIQUIDAR, el sistema debe verificar:

□ EMPRESA
  ├── □ ¿Tiene país asignado?
  ├── □ ¿Tiene configuración multi-sucursal definida?
  └── □ ¿Tiene módulos contratados definidos?

□ SUCURSAL (si aplica)
  ├── □ ¿Tiene país asignado (si es distinto)?
  ├── □ ¿Tiene calendario asignado?
  └── □ ¿Tiene plantilla default?

□ EMPLEADOS A LIQUIDAR
  ├── □ ¿Todos tienen turno asignado?
  ├── □ ¿Todos tienen categoría salarial?
  ├── □ ¿Todos tienen plantilla de liquidación (directa o heredada)?
  └── □ ¿Todos tienen registros de asistencia en el período?

□ CALENDARIO DEL PERÍODO
  ├── □ ¿Existen feriados cargados?
  └── □ ¿Se marcaron días no laborables especiales?

□ ASISTENCIA
  ├── □ ¿Se calcularon horas trabajadas?
  ├── □ ¿Se detectaron horas extras?
  ├── □ ¿Se detectaron horas nocturnas?
  └── □ ¿Se justificaron ausencias (o hay fallback activo)?

□ PLANTILLA DE LIQUIDACIÓN
  ├── □ ¿Tiene conceptos definidos?
  └── □ ¿Están activos los conceptos necesarios?
```

### 5.2 Estados de la Auditoría

```
Para cada eslabón de la cadena:

🟢 COMPLETO    = Datos presentes y conectados
🟡 PARCIAL     = Datos incompletos o fallback activo
🔴 FALTANTE    = Sin datos, sin fallback, BLOQUEA liquidación
⚪ NO APLICA   = Módulo no contratado, usando fallback
```

---

## 6. INTEGRACIÓN CON OLLAMA

### 6.1 Puntos de Integración IA

```
CREACIÓN DE EMPRESA
└── Ollama sugiere: "Basado en el país ARG, te recomiendo activar
    calendario de feriados argentinos. ¿Querés que lo haga?"

ASIGNACIÓN DE TURNO
└── Ollama sugiere: "Este empleado tiene historial de entrada
    promedio a las 09:15. El turno 'Mañana Flex' (09:00-17:00)
    podría ajustarse mejor."

JUSTIFICACIÓN DE AUSENCIA
└── Ollama sugiere: "Detecté 3 ausencias de este empleado en
    viernes. ¿Querés que genere un reporte de patrón?"

PRE-LIQUIDACIÓN
└── Ollama alerta: "5 empleados no tienen categoría salarial
    asignada. No puedo calcular su básico. ¿Querés verlos?"

POST-LIQUIDACIÓN
└── Ollama reporta: "Detecté que Juan Pérez tiene 40% más de
    horas extras que el promedio. ¿Revisar?"
```

---

## 7. PRÓXIMOS PASOS (Para Claude)

### 7.1 Auditoría Completa de Módulos

```
ORDEN DE AUDITORÍA (siguiendo la cadena):

1. PANEL-ADMINISTRATIVO (creación de empresa)
   └── ¿Se puede asignar país?
   └── ¿Se puede definir si tiene sucursales?
   └── ¿Se pueden seleccionar módulos contratados?

2. SUCURSALES
   └── ¿Heredan o definen país propio?
   └── ¿Tienen calendario asignable?

3. TURNOS
   └── ¿Se pueden definir con calendario de días?
   └── ¿Calculan horas nocturnas?
   └── ¿Se asignan a empleados correctamente?

4. USUARIOS (ficha de empleado)
   └── ¿Tienen campo de categoría salarial?
   └── ¿Tienen campo de convenio?
   └── ¿Tienen campo de plantilla de liquidación?

5. ASISTENCIA
   └── ¿Calcula horas extras?
   └── ¿Detecta llegadas tarde?
   └── ¿Tiene fallback para justificar ausencias (si no hay médico)?

6. DASHBOARD MÉDICO
   └── ¿Está implementado?
   └── ¿Tiene flujo de aprobación de certificados?

7. RRHH / LIQUIDACIÓN
   └── ¿Existen plantillas de conceptos?
   └── ¿Se pueden asignar por rol/usuario?
   └── ¿La liquidación valida la cadena antes de ejecutar?
```

### 7.2 Entregable Esperado

Por cada módulo auditado:
- Estado actual (implementado/parcial/faltante)
- Datos que genera
- Datos que consume
- Conexiones con otros módulos
- Fallbacks existentes o faltantes
- Tareas específicas para completar

---

## 8. REFERENCIAS

- `engineering-metadata.js` - Metadata general del proyecto
- `docs/ARCHITECTURE-MULTI-BRANCH-STRATEGY.md` - Estrategia multi-sucursal
- `docs/MULTI-BRANCH-IMPLEMENTATION-GUIDE.md` - Guía de implementación
- `src/services/PayrollCalculatorService.js` - Motor de cálculo de liquidación

---

**ESTE DOCUMENTO ES LA GUÍA MAESTRA PARA CUALQUIER SESIÓN DE CLAUDE**
**SI ALGO NO ESTÁ AQUÍ, AGREGAR ANTES DE CERRAR LA SESIÓN**
