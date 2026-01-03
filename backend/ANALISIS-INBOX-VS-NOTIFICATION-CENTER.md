# Análisis: "inbox" vs "notification-center"

## 📊 Comparación de Módulos

### 🔵 **inbox** (Bandeja Notificaciones)
- **Tipo**: Módulo COMPLETO / FRONTEND + BACKEND
- **Version**: 3.0.0
- **Category**: communication
- **Descripción**: "[CORE] Centro de notificaciones y mensajes del sistema"
- **Frontend**: ✅ SÍ - `/js/modules/inbox.js` (1,493 líneas)
- **Backend**: ❌ NO tiene rutas propias (usa rutas unificadas de notificaciones)
- **Propósito**: **Sistema de ENVÍO de notificaciones del empleado (SELF-SERVICE)**

**Funcionalidad real (según código inbox.js)**:
- Sistema para que el **EMPLEADO ENVÍE** notificaciones a RRHH/Médico
- Categorías de notificación del empleado:
  - 🕐 **Llegada Tarde** → Notifica a RRHH
  - 📅 **Inasistencia** → Notifica a RRHH
  - 🏥 **Enfermedad** → Inicia caso médico (Dashboard Médico + RRHH + Médico)
  - ⚡ **Fuerza Mayor** → Notifica a RRHH
  - 🙋 **Solicitud de Permiso** → Notifica a RRHH
- FUENTE ÚNICA DE VERDAD para APK médico
- Dark theme + UI profesional
- Integración con Dashboard Médico

### 🔴 **notification-center** (Centro de Notificaciones)
- **Tipo**: Módulo COMPLETO / FRONTEND + BACKEND
- **Version**: 3.0.0
- **Category**: communication
- **Descripción**: "[CORE] Sistema unificado de notificaciones con workflows y SLA"
- **Frontend**: ✅ SÍ - `/js/modules/notification-center.js` (1,930 líneas)
- **Backend**: ✅ Rutas unificadas (notificationUnifiedRoutes.js, notificationWorkflowRoutes.js)
- **Propósito**: **Sistema de RECEPCIÓN de notificaciones del empleado/empresa (INBOX)**

**Funcionalidad real (según código notification-center.js)**:
- Sistema para que el **EMPLEADO RECIBA** notificaciones del sistema
- Fusión de notifications-complete.js + notifications-enterprise.js
- Features empresariales:
  - 🔮 **Alertas Proactivas**: Vacaciones por vencer, límite horas extra, documentos por vencer
  - 📋 **Solicitudes**: Vacaciones, licencias, cambio turno
  - ⏱️ **Asistencia**: Llegada tarde, inasistencias
  - 📚 **Capacitación**: Cursos obligatorios
  - ⚙️ **Sistema**: Anuncios, alertas
- Workflows con SLA (aprobación/rechazo)
- AI Indicator (indicador de IA)
- Deadline countdown con urgencia
- Dark theme profesional con sidebar
- Modal de detalle con historial

---

## 🔗 Relación entre Módulos

**SON COMPLEMENTARIOS** - Hacen cosas DIFERENTES:

1. **inbox** → El empleado **ENVÍA** notificaciones (self-service)
2. **notification-center** → El empleado **RECIBE** notificaciones (bandeja de entrada)

**Analogía**:
- **inbox** = "Redactar mensaje" / "Enviar correo" / "Crear ticket"
- **notification-center** = "Bandeja de entrada" / "Recibidos" / "Notificaciones recibidas"

---

## 🎯 Flujo de Uso

### Ejemplo: Empleado se enferma

1. **EMPLEADO USA "inbox"**:
   - Abre el módulo "Bandeja Notificaciones" (inbox)
   - Selecciona categoría: 🏥 Enfermedad
   - Llena formulario (fecha, síntomas, adjunta certificado)
   - **ENVÍA notificación** a Dashboard Médico + RRHH

2. **RRHH/MÉDICO RECIBE EN "notification-center"**:
   - En su módulo "Centro de Notificaciones" aparece nueva notificación
   - 🏥 "Juan Pérez reportó enfermedad - 01/01/2025"
   - Puede: Ver detalle, Aprobar/Rechazar, Dejar comentarios
   - Workflow con SLA tracking

---

## 📦 Arquitectura Técnica

### **inbox.js** (Empleado ENVÍA)
```javascript
const InboxModule = {
    EMPLOYEE_NOTIFICATION_CATEGORIES: {
        late_arrival: { target: 'rrhh', requiresReason: true },
        illness: { target: 'medical', initiatesMedicalCase: true },
        // ... más categorías de ENVÍO
    }
}
```

### **notification-center.js** (Empleado RECIBE)
```javascript
const NotificationCenter = {
    GROUP_TYPE_CONFIG: {
        proactive_vacation_expiry: { category: 'proactive' },
        vacation_request: { category: 'request' },
        // ... tipos de notificaciones RECIBIDAS
    },
    // Approve/Reject workflow, SLA tracking
}
```

---

## ✅ Conclusión y Recomendación

### ✅ **Ambos módulos SON NECESARIOS**

**NO eliminar ninguno** porque:
1. **inbox**: El empleado necesita poder ENVIAR notificaciones/solicitudes
2. **notification-center**: El empleado/empresa necesita RECIBIR notificaciones del sistema

### 🔧 **PROBLEMA DETECTADO: Nombres confusos**

Los nombres actuales son **ENGAÑOSOS**:

| Nombre Actual | Función Real | Nombre Sugerido |
|---------------|--------------|-----------------|
| **inbox** | Empleado ENVÍA notificaciones | ❌ Debería llamarse "Enviar Notificación" o "Mis Solicitudes" |
| **notification-center** | Empleado RECIBE notificaciones | ❌ Debería llamarse "Bandeja de Notificaciones" o "Mis Notificaciones" |

**"inbox"** tradicionalmente significa "bandeja de entrada" (recibir), pero aquí hace lo contrario (enviar).

### 🎯 **Acción Recomendada**

**OPCIÓN 1: Renombrar módulos** (recomendado)
```sql
-- Cambiar nombre de "inbox" a algo más claro
UPDATE system_modules
SET name = 'Crear Notificación',
    description = '[CORE] Enviar notificaciones y solicitudes a RRHH/Médico'
WHERE module_key = 'inbox';

-- Cambiar nombre de "notification-center" a algo más claro
UPDATE system_modules
SET name = 'Mis Notificaciones',
    description = '[CORE] Bandeja de notificaciones recibidas con workflows'
WHERE module_key = 'notification-center';
```

**OPCIÓN 2: Dejar como está y documentar bien**
- Agregar tooltips en el frontend explicando la diferencia
- Mejorar las descripciones visibles para el usuario

---

## 📋 Resumen Final

| Aspecto | inbox | notification-center |
|---------|-------|---------------------|
| **Propósito** | Empleado ENVÍA | Empleado RECIBE |
| **Frontend** | ✅ 1,493 líneas | ✅ 1,930 líneas |
| **Backend** | ✅ Rutas compartidas | ✅ Rutas unificadas |
| **Categorías** | Envío (late, illness, etc.) | Recepción (proactive, requests) |
| **Workflows** | ❌ NO | ✅ SÍ (approve/reject, SLA) |
| **Integración Médica** | ✅ SÍ (inicia casos) | ✅ SÍ (recibe casos) |
| **Rol Principal** | Todo empleado | Todo empleado + RRHH/Admin |
| **Mostrar en dashboard** | ✅ SÍ | ✅ SÍ |
| **Eliminar** | ❌ NO - ES NECESARIO | ❌ NO - ES NECESARIO |

---

## 🎯 Decisión:

**AMBOS MÓDULOS SON NECESARIOS** - Son complementarios, no duplicados.

**RECOMENDACIÓN**: Renombrar para evitar confusión:
- "inbox" → "Enviar Notificación" o "Crear Solicitud"
- "notification-center" → "Mis Notificaciones" o "Bandeja de Entrada"
