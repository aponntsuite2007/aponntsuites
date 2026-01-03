# INTEGRACIÓN SSOT - PROCEDIMIENTOS MÉDICOS + NOTIFICACIONES
## Single Source of Truth para Workflows Médicos

**Versión:** 1.0.0
**Fecha:** 1 de Enero de 2026
**Principio fundamental:** Manual de Procedimientos y Notification Center son SSOT (Single Source of Truth)

---

## 🎯 ARQUITECTURA SSOT

```
MANUAL DE PROCEDIMIENTOS (SSOT - Workflows)
    ↓
MEDICAL MODULES (Ejecutan según procedimientos)
    ↓
NOTIFICATION CENTER (SSOT - Notificaciones + Autorizaciones)
    ↓
USERS (Notificados + Aprueban/Rechazan)
```

### Principios SSOT

1. **Procedures Manual** define QUÉ debe hacerse y en QUÉ orden
2. **Notification Center** maneja TODAS las notificaciones y autorizaciones
3. **Medical Modules** ejecutan workflows según procedimientos definidos
4. **NO duplicar lógica** - Si existe en SSOT, usarlo
5. **EventBus** conecta módulos con SSOT

---

## 📋 TABLA: procedures (SSOT de Procedimientos Médicos)

### Schema Existente (SSOT)
```sql
CREATE TABLE procedures (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),

    -- Categoría del procedimiento
    category VARCHAR(50), -- 'medical', 'hse', 'legal', 'general'

    -- Identificación
    code VARCHAR(50) UNIQUE,
    title VARCHAR(255),
    description TEXT,

    -- Workflow
    steps JSONB, -- Array de pasos con orden
    requires_authorization BOOLEAN DEFAULT FALSE,
    authorization_roles VARCHAR(50)[], -- Roles que pueden aprobar

    -- Metadata
    version VARCHAR(20),
    status VARCHAR(20), -- 'draft', 'active', 'archived'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Ejemplo: Procedimiento de Examen Ocupacional

```json
{
  "code": "MED-EXAM-OCCUPATIONAL-001",
  "title": "Examen Médico Ocupacional Periódico",
  "category": "medical",
  "requires_authorization": true,
  "authorization_roles": ["medical_director", "hse_manager"],

  "steps": [
    {
      "step": 1,
      "name": "Generación automática de examen",
      "trigger": "SCHEDULED",
      "action": "CREATE_MEDICAL_CASE",
      "responsible": "SYSTEM",
      "notification_type": "proactive_medical_exam_due",
      "notification_priority": "high",
      "notification_recipients": ["employee", "medical_staff"]
    },
    {
      "step": 2,
      "name": "Agendamiento de cita",
      "action": "SCHEDULE_APPOINTMENT",
      "responsible": "medical_staff",
      "notification_type": "medical_appointment_scheduled",
      "notification_priority": "medium",
      "notification_recipients": ["employee", "hr"],
      "deadline_hours": 72
    },
    {
      "step": 3,
      "name": "Realización de examen",
      "action": "PERFORM_EXAM",
      "responsible": "doctor",
      "required_fields": [
        "anthropometric_data",
        "vital_signs",
        "medical_history"
      ],
      "notification_type": "medical_exam_completed",
      "notification_priority": "medium"
    },
    {
      "step": 4,
      "name": "Emisión de diagnóstico",
      "action": "CREATE_DIAGNOSIS",
      "responsible": "doctor",
      "requires_authorization": true,
      "authorization_roles": ["medical_director"],
      "notification_type": "medical_diagnosis_pending_approval",
      "notification_priority": "high",
      "notification_recipients": ["medical_director"],
      "deadline_hours": 24
    },
    {
      "step": 5,
      "name": "Aprobación de diagnóstico",
      "action": "APPROVE_DIAGNOSIS",
      "responsible": "medical_director",
      "notification_type": "medical_diagnosis_approved",
      "notification_priority": "medium",
      "notification_recipients": ["employee", "hr", "doctor"]
    },
    {
      "step": 6,
      "name": "Actualización de estado laboral",
      "action": "UPDATE_WORK_STATUS",
      "responsible": "SYSTEM",
      "integrations": ["hse_management"],
      "notification_type": "employee_status_updated",
      "notification_priority": "high",
      "notification_recipients": ["hr", "hse_manager", "employee"]
    }
  ]
}
```

---

## 🔔 TABLA: notifications (SSOT de Notificaciones)

### Schema Existente (SSOT)
```sql
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),

    -- Multi-tenant
    company_id INTEGER REFERENCES companies(id),
    user_id INTEGER REFERENCES users(id),

    -- Tipo de notificación (definido en Notification Center)
    notification_type VARCHAR(100),

    -- Contenido
    title VARCHAR(255),
    message TEXT,

    -- Prioridad (SSOT)
    priority VARCHAR(20), -- 'critical', 'urgent', 'high', 'medium', 'normal', 'low'

    -- Estado
    status VARCHAR(20), -- 'pending', 'approved', 'rejected', 'read', 'archived'

    -- Workflow de autorización
    requires_action BOOLEAN DEFAULT FALSE,
    action_type VARCHAR(50), -- 'approve_reject', 'acknowledge', 'complete'
    action_deadline TIMESTAMP,

    -- Respuesta del usuario
    action_taken VARCHAR(20), -- 'approved', 'rejected', 'acknowledged'
    action_taken_at TIMESTAMP,
    action_taken_by INTEGER REFERENCES users(id),
    action_notes TEXT,

    -- Metadata
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔄 INTEGRACIÓN: MEDICAL MODULES → SSOT

### Patrón de Integración (NUNCA duplicar lógica)

```javascript
// ❌ MAL - Crear notificación directamente (duplica lógica)
await database.query(`
    INSERT INTO notifications (user_id, title, message)
    VALUES ($1, $2, $3)
`, [userId, 'Examen pendiente', 'Mensaje...']);

// ✅ BIEN - Usar NotificationService (SSOT)
const NotificationService = require('./NotificationService');

await NotificationService.create({
    companyId: employee.company_id,
    userId: employee.id,
    notificationType: 'proactive_medical_exam_due',
    title: 'Examen Médico Ocupacional Pendiente',
    message: `Tu examen médico ocupacional vence en 30 días`,
    priority: 'high',
    requiresAction: false,
    metadata: {
        employeeId: employee.id,
        examType: 'occupational_periodic',
        dueDate: '2026-02-01'
    }
});

// EventBus notificará automáticamente a otros módulos
```

---

## 🔄 WORKFLOW COMPLETO: EJEMPLO RECETA ELECTRÓNICA

### 1. Definición en Procedures Manual

```json
{
  "code": "MED-PRESCRIPTION-ELECTRONIC-001",
  "title": "Emisión de Receta Electrónica",
  "category": "medical",
  "requires_authorization": true,

  "steps": [
    {
      "step": 1,
      "name": "Médico prescribe medicamento",
      "action": "CREATE_PRESCRIPTION",
      "responsible": "doctor",
      "notification_type": "medical_prescription_created",
      "notification_priority": "medium",
      "notification_recipients": ["employee"]
    },
    {
      "step": 2,
      "name": "Firma digital (si medicamento controlado)",
      "condition": "is_controlled_substance",
      "action": "SIGN_PRESCRIPTION",
      "responsible": "doctor",
      "requires_authorization": true,
      "authorization_roles": ["medical_director"],
      "notification_type": "prescription_pending_signature",
      "notification_priority": "urgent",
      "deadline_hours": 2
    },
    {
      "step": 3,
      "name": "Envío a farmacia",
      "action": "SEND_TO_PHARMACY",
      "responsible": "SYSTEM",
      "notification_type": "prescription_sent_pharmacy",
      "notification_recipients": ["employee", "pharmacy"]
    }
  ]
}
```

### 2. Implementación en ElectronicPrescriptionService

```javascript
/**
 * ElectronicPrescriptionService - Usa SSOT
 */

const NotificationService = require('./NotificationService');
const ProceduresService = require('./ProceduresService');
const EventBus = require('../modules/EventBus');

class ElectronicPrescriptionService {

  /**
   * Crear receta electrónica (SIGUE PROCEDIMIENTO)
   */
  async create(data) {
    // 1. Obtener procedimiento desde SSOT
    const procedure = await ProceduresService.getByCode('MED-PRESCRIPTION-ELECTRONIC-001');

    if (!procedure) {
      throw new Error('Procedimiento no encontrado en Manual de Procedimientos');
    }

    // 2. Validar que el procedimiento esté activo
    if (procedure.status !== 'active') {
      throw new Error('Procedimiento inactivo');
    }

    // 3. Crear receta en BD
    const prescription = await ElectronicPrescription.create({
      employee_id: data.employeeId,
      doctor_id: data.doctorId,
      company_id: data.companyId,
      medication_name: data.medication,
      dosage: data.dosage,
      quantity: data.quantity,
      duration_days: data.durationDays,
      is_controlled: data.isControlled,
      country: data.country,
      prescription_number: await this.generatePrescriptionNumber(data.country, data.companyId),
      status: 'pending'
    });

    // 4. Ejecutar STEP 1 del procedimiento
    const step1 = procedure.steps.find(s => s.step === 1);

    // 4.1 Notificación según SSOT (Notification Center)
    await NotificationService.create({
      companyId: data.companyId,
      userId: data.employeeId,
      notificationType: step1.notification_type, // 'medical_prescription_created'
      title: 'Nueva Receta Médica',
      message: `El Dr. ${data.doctorName} te prescribió: ${data.medication}`,
      priority: step1.notification_priority, // 'medium'
      requiresAction: false,
      metadata: {
        prescriptionId: prescription.id,
        medication: data.medication,
        doctorId: data.doctorId
      }
    });

    // 4.2 Emitir evento (otros módulos pueden escuchar)
    EventBus.emitWithMetadata('medical:prescription:created', {
      prescriptionId: prescription.id,
      employeeId: data.employeeId,
      isControlled: data.isControlled
    });

    // 5. Si es medicamento controlado → STEP 2 (requiere firma)
    if (data.isControlled) {
      const step2 = procedure.steps.find(s => s.step === 2);

      // 5.1 Notificación de aprobación pendiente
      await NotificationService.createAuthorizationRequest({
        companyId: data.companyId,
        requesterUserId: data.doctorId,
        authorizationRoles: step2.authorization_roles, // ['medical_director']
        notificationType: step2.notification_type, // 'prescription_pending_signature'
        title: 'Firma de Receta Controlada Pendiente',
        message: `Medicamento controlado: ${data.medication}. Requiere tu firma digital.`,
        priority: step2.notification_priority, // 'urgent'
        actionDeadline: new Date(Date.now() + step2.deadline_hours * 60 * 60 * 1000),
        metadata: {
          prescriptionId: prescription.id,
          medication: data.medication,
          controlLevel: data.controlLevel
        }
      });
    } else {
      // No controlado → Ir directo a STEP 3 (envío a farmacia)
      await this.sendToPharmacy(prescription.id);
    }

    return prescription;
  }

  /**
   * Firmar receta (STEP 2 del procedimiento)
   */
  async signPrescription(prescriptionId, doctorId) {
    const prescription = await ElectronicPrescription.findByPk(prescriptionId);

    // Obtener procedimiento
    const procedure = await ProceduresService.getByCode('MED-PRESCRIPTION-ELECTRONIC-001');
    const step2 = procedure.steps.find(s => s.step === 2);

    // Generar firma digital según país
    const digitalSignature = await this.generateDigitalSignature(prescription, doctorId);

    // Actualizar receta
    await prescription.update({
      digital_signature: digitalSignature,
      signature_type: this.getSignatureType(prescription.country),
      signature_timestamp: new Date(),
      status: 'signed'
    });

    // Notificar que fue firmada
    await NotificationService.create({
      companyId: prescription.company_id,
      userId: prescription.employee_id,
      notificationType: 'prescription_signed',
      title: 'Receta Firmada Digitalmente',
      message: `Tu receta fue firmada y está lista para la farmacia`,
      priority: 'medium',
      metadata: {
        prescriptionId: prescription.id,
        signedBy: doctorId
      }
    });

    // Emitir evento
    EventBus.emitWithMetadata('medical:prescription:signed', {
      prescriptionId: prescription.id,
      doctorId
    });

    // Ir a STEP 3
    await this.sendToPharmacy(prescriptionId);

    return prescription;
  }

  /**
   * Enviar a farmacia (STEP 3)
   */
  async sendToPharmacy(prescriptionId) {
    const prescription = await ElectronicPrescription.findByPk(prescriptionId);
    const procedure = await ProceduresService.getByCode('MED-PRESCRIPTION-ELECTRONIC-001');
    const step3 = procedure.steps.find(s => s.step === 3);

    // Marcar como enviada
    await prescription.update({
      status: 'sent_to_pharmacy',
      sent_to_pharmacy_at: new Date()
    });

    // Notificar a empleado y farmacia
    const recipients = step3.notification_recipients; // ['employee', 'pharmacy']

    for (const recipientType of recipients) {
      if (recipientType === 'employee') {
        await NotificationService.create({
          companyId: prescription.company_id,
          userId: prescription.employee_id,
          notificationType: step3.notification_type,
          title: 'Receta Enviada a Farmacia',
          message: `Tu receta está lista. Código QR: ...`,
          priority: step3.notification_priority
        });
      } else if (recipientType === 'pharmacy') {
        // Notificar a farmacia (si está en sistema)
        await this.notifyPharmacy(prescription);
      }
    }

    return prescription;
  }
}
```

---

## 🔄 LISTENER: AUTORIZACIÓN VIA NOTIFICATION CENTER

```javascript
/**
 * Listener de autorizaciones
 *
 * Notification Center emite evento cuando usuario aprueba/rechaza
 */

const EventBus = require('../modules/EventBus');
const ElectronicPrescriptionService = require('./ElectronicPrescriptionService');

// Registrar listener
EventBus.registerListener('notification:action:taken', 'electronic-prescriptions', async (data) => {
  const { notificationId, actionTaken, actionTakenBy, metadata } = data;

  // Si es notificación de firma de receta
  if (metadata.notificationType === 'prescription_pending_signature') {
    if (actionTaken === 'approved') {
      // Firmar receta
      await ElectronicPrescriptionService.signPrescription(
        metadata.prescriptionId,
        actionTakenBy
      );
    } else if (actionTaken === 'rejected') {
      // Cancelar receta
      await ElectronicPrescriptionService.cancel(
        metadata.prescriptionId,
        { reason: 'Rechazada por director médico', rejectedBy: actionTakenBy }
      );
    }
  }
});
```

---

## 📋 TIPOS DE NOTIFICACIONES MÉDICAS (SSOT)

### Proactivas (Sistema genera automáticamente)
```javascript
GROUP_TYPE_CONFIG = {
  // Exámenes médicos
  proactive_medical_exam_due: {
    icon: '🏥',
    label: 'Examen Médico por Vencer',
    priority: 'high',
    category: 'medical_proactive',
    deadline_days: 30
  },
  proactive_medical_exam_overdue: {
    icon: '⚠️',
    label: 'Examen Médico Vencido',
    priority: 'urgent',
    category: 'medical_proactive'
  },

  // Vacunación
  proactive_vaccine_due: {
    icon: '💉',
    label: 'Vacuna por Aplicar',
    priority: 'high',
    category: 'medical_proactive',
    deadline_days: 15
  },

  // Recetas
  proactive_prescription_expiring: {
    icon: '💊',
    label: 'Receta por Vencer',
    priority: 'medium',
    category: 'medical_proactive',
    deadline_days: 7
  },

  // Seguimiento médico
  proactive_medical_followup: {
    icon: '🩺',
    label: 'Control Médico Pendiente',
    priority: 'medium',
    category: 'medical_proactive'
  }
};
```

### Solicitudes (Requieren aprobación)
```javascript
GROUP_TYPE_CONFIG = {
  medical_appointment_request: {
    icon: '📅',
    label: 'Solicitud de Cita Médica',
    priority: 'medium',
    category: 'medical_request',
    requires_authorization: true,
    authorization_roles: ['medical_staff', 'hr']
  },

  prescription_approval_request: {
    icon: '💊',
    label: 'Aprobación de Receta',
    priority: 'urgent',
    category: 'medical_request',
    requires_authorization: true,
    authorization_roles: ['medical_director']
  },

  medical_leave_request: {
    icon: '🏥',
    label: 'Solicitud Licencia Médica',
    priority: 'high',
    category: 'medical_request',
    requires_authorization: true,
    authorization_roles: ['hr', 'medical_director']
  },

  return_to_work_clearance: {
    icon: '✅',
    label: 'Clearance de Regreso al Trabajo',
    priority: 'high',
    category: 'medical_request',
    requires_authorization: true,
    authorization_roles: ['occupational_doctor']
  }
};
```

### Informativas (Solo notificación)
```javascript
GROUP_TYPE_CONFIG = {
  medical_exam_completed: {
    icon: '✅',
    label: 'Examen Médico Completado',
    priority: 'medium',
    category: 'medical_info'
  },

  medical_diagnosis_available: {
    icon: '📄',
    label: 'Diagnóstico Disponible',
    priority: 'medium',
    category: 'medical_info'
  },

  prescription_sent_pharmacy: {
    icon: '🏪',
    label: 'Receta Enviada a Farmacia',
    priority: 'normal',
    category: 'medical_info'
  },

  vaccination_completed: {
    icon: '💉',
    label: 'Vacunación Completada',
    priority: 'normal',
    category: 'medical_info'
  }
};
```

---

## 🔄 SERVICIO: NotificationService (SSOT)

```javascript
/**
 * NotificationService - SSOT para todas las notificaciones
 *
 * NO crear notificaciones directamente en BD.
 * SIEMPRE usar este servicio.
 */

class NotificationService {

  /**
   * Crear notificación
   */
  static async create(data) {
    const {
      companyId,
      userId,
      notificationType,
      title,
      message,
      priority = 'medium',
      requiresAction = false,
      actionType = null,
      actionDeadline = null,
      metadata = {}
    } = data;

    // Validar tipo de notificación existe en SSOT
    const typeConfig = this.getTypeConfig(notificationType);
    if (!typeConfig) {
      throw new Error(`Tipo de notificación inválido: ${notificationType}`);
    }

    // Crear en BD
    const notification = await Notification.create({
      company_id: companyId,
      user_id: userId,
      notification_type: notificationType,
      title,
      message,
      priority,
      requires_action: requiresAction,
      action_type: actionType,
      action_deadline: actionDeadline,
      status: 'pending',
      metadata
    });

    // Emitir evento
    EventBus.emitWithMetadata('notification:created', {
      notificationId: notification.id,
      userId,
      notificationType,
      priority
    });

    // Si requiere acción, emitir evento específico
    if (requiresAction) {
      EventBus.emitWithMetadata('notification:action:required', {
        notificationId: notification.id,
        userId,
        deadline: actionDeadline
      });
    }

    return notification;
  }

  /**
   * Crear notificación de autorización
   */
  static async createAuthorizationRequest(data) {
    const {
      companyId,
      requesterUserId,
      authorizationRoles,
      notificationType,
      title,
      message,
      priority = 'urgent',
      actionDeadline,
      metadata = {}
    } = data;

    // Obtener usuarios con roles de autorización
    const authorizers = await this.getUsersByRoles(companyId, authorizationRoles);

    // Crear notificación para cada autorizador
    const notifications = [];

    for (const authorizer of authorizers) {
      const notification = await this.create({
        companyId,
        userId: authorizer.id,
        notificationType,
        title,
        message,
        priority,
        requiresAction: true,
        actionType: 'approve_reject',
        actionDeadline,
        metadata: {
          ...metadata,
          requesterUserId,
          authorizationRoles
        }
      });

      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Aprobar/Rechazar notificación
   */
  static async takeAction(notificationId, userId, actionTaken, notes = null) {
    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      throw new Error('Notificación no encontrada');
    }

    if (!notification.requires_action) {
      throw new Error('Esta notificación no requiere acción');
    }

    if (notification.user_id !== userId) {
      throw new Error('No autorizado para tomar acción en esta notificación');
    }

    // Actualizar notificación
    await notification.update({
      action_taken: actionTaken, // 'approved' | 'rejected' | 'acknowledged'
      action_taken_at: new Date(),
      action_taken_by: userId,
      action_notes: notes,
      status: actionTaken === 'approved' ? 'approved' : 'rejected'
    });

    // Emitir evento (otros módulos pueden escuchar y reaccionar)
    EventBus.emitWithMetadata('notification:action:taken', {
      notificationId: notification.id,
      actionTaken,
      actionTakenBy: userId,
      metadata: notification.metadata
    });

    return notification;
  }

  /**
   * Obtener configuración de tipo de notificación
   */
  static getTypeConfig(notificationType) {
    // Importar desde Notification Center (SSOT)
    const NotificationCenter = require('../public/js/modules/notification-center.js');
    return NotificationCenter.GROUP_TYPE_CONFIG[notificationType] || null;
  }

  /**
   * Obtener usuarios por roles
   */
  static async getUsersByRoles(companyId, roles) {
    return await User.findAll({
      where: {
        company_id: companyId,
        role: {
          [Op.in]: roles
        },
        is_active: true
      }
    });
  }
}

module.exports = NotificationService;
```

---

## ✅ CHECKLIST DE INTEGRACIÓN SSOT

### Para CADA nuevo módulo médico:

- [ ] **Definir procedimiento en Manual de Procedimientos**
  - Código único
  - Steps con orden
  - Responsables
  - Autorizaciones requeridas
  - Tipos de notificación

- [ ] **NO duplicar lógica de notificaciones**
  - Usar NotificationService.create()
  - Usar tipos definidos en Notification Center
  - No crear tablas propias de notificaciones

- [ ] **Escuchar eventos de Notification Center**
  - notification:action:taken
  - notification:created
  - notification:action:required

- [ ] **Emitir eventos cuando corresponda**
  - module:entity:created
  - module:entity:updated
  - module:entity:completed

- [ ] **Seguir workflow del procedimiento**
  - Ejecutar steps en orden
  - Validar autorizaciones
  - Respetar deadlines

---

## 📚 REFERENCIAS SSOT

### Manual de Procedimientos
- **Ubicación**: `public/js/modules/procedures-manual.js`
- **Tabla BD**: `procedures`
- **Uso**: `ProceduresService.getByCode(code)`

### Notification Center
- **Ubicación**: `public/js/modules/notification-center.js`
- **Tabla BD**: `notifications`
- **Uso**: `NotificationService.create(data)`
- **Tipos**: Ver `GROUP_TYPE_CONFIG`

### EventBus
- **Ubicación**: `src/modules/EventBus.js`
- **Uso**: `EventBus.emitWithMetadata(event, data)`
- **Listeners**: `EventBus.registerListener(event, module, handler)`

---

**FIN DEL DOCUMENTO DE INTEGRACIÓN SSOT**

*Respetar siempre los SSOT - NO duplicar lógica*
*Manual de Procedimientos + Notification Center son la única fuente de verdad*
