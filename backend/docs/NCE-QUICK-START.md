# 📞 NCE - Quick Start Guide

**NotificationCentralExchange - Sistema Central de Notificaciones**

---

## ⚡ Inicio en 30 segundos

### 1. Importar

```javascript
const NCE = require('../services/NotificationCentralExchange');
```

### 2. Enviar notificación

```javascript
await NCE.send({
  companyId: 11,
  workflowKey: 'procurement.order_approval',
  recipientType: 'user',
  recipientId: 'uuid-user-123',
  title: 'Nueva orden requiere aprobación',
  message: 'Orden PO-12345 por $15,000 USD',
  priority: 'high'
});
```

### 3. ¡Listo!

NCE automáticamente:
- ✅ Envía por **email + push + inbox**
- ✅ Trackea **SLA** si requiere acción
- ✅ Programa **escalamiento automático**
- ✅ Audita 100% (tabla `notification_log`)

---

## 🎯 Casos de Uso Comunes

### Aprobación con escalamiento

```javascript
await NCE.send({
  companyId: 11,
  workflowKey: 'procurement.order_approval',
  recipientType: 'role',
  recipientId: 'approver_l1',
  title: '🔔 Orden requiere aprobación',
  message: 'PO-12345: $15,000 USD',
  metadata: { order_id: 'PO-12345', amount: 15000 },
  priority: 'high',
  requiresAction: true,
  actionType: 'approval',
  slaHours: 24,
  escalationPolicy: {
    levels: [
      { after: '24h', escalateTo: 'approver_l2' },
      { after: '48h', escalateTo: 'cfo' }
    ]
  }
});
```

### Notificación informativa

```javascript
await NCE.send({
  companyId: 11,
  workflowKey: 'medical.certificate_expiry',
  recipientType: 'user',
  recipientId: 'uuid-employee',
  title: '⚠️ Certificado vence en 7 días',
  message: 'Tu certificado médico vence el 2025-01-20',
  metadata: { expiry_date: '2025-01-20', days: 7 },
  priority: 'normal',
  channels: ['email', 'push']
});
```

### Broadcast a departamento

```javascript
await NCE.send({
  companyId: 11,
  workflowKey: 'hr.policy_update',
  recipientType: 'department',
  recipientId: 'dept-it',
  title: '📢 Nueva política de trabajo remoto',
  message: 'A partir de febrero: 3 días/semana remoto',
  priority: 'normal'
});
```

---

## 🔄 Migración desde servicios legacy

### NotificationOrchestrator (deprecado)

```javascript
// ❌ ANTES
await NotificationOrchestrator.trigger('payroll_receipt', {
  companyId: 11,
  recipientId: 'uuid-123',
  metadata: { period: '2025-12' }
});

// ✅ AHORA
await NCE.send({
  companyId: 11,
  workflowKey: 'payroll_receipt',
  recipientType: 'user',
  recipientId: 'uuid-123',
  title: 'Recibo de nómina disponible',
  message: 'Tu recibo del período 2025-12 está listo',
  metadata: { period: '2025-12' }
});
```

---

## 📚 Documentación Completa

**Ver**: `backend/docs/NOTIFICATION-CENTRAL-EXCHANGE.md`

Incluye:
- API completa con todos los parámetros
- 10+ ejemplos de uso
- Arquitectura detallada
- Modelos de datos
- Performance y troubleshooting

---

## ⚠️ Importante

1. **Todos los workflows** deben estar registrados en `notification_workflows`
2. **Multi-tenant**: NCE respeta aislamiento de company_id
3. **100% auditoría**: Todo queda en `notification_log`
4. **Backward compatible**: Los 3 servicios legacy siguen funcionando (delegan a NCE)

---

**¿Dudas?** Lee la documentación completa o consulta con el equipo de desarrollo.
