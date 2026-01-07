# 🚨 AUDITORÍA: BYPASS AL SISTEMA NCE

**Fecha**: 2026-01-06
**Auditor**: Sistema de Notificaciones
**Objetivo**: Verificar si NCE es realmente una "central telefónica" sin bypass

---

## ❌ RESULTADO: NCE NO ES UNA CENTRAL TELEFÓNICA (AÚN)

**Veredicto**: El sistema NCE está **implementado correctamente**, pero existen **~15+ servicios con BYPASS** que envían emails directamente sin pasar por NCE.

---

## 📋 BYPASS DETECTADOS (15 archivos)

### 🔴 BYPASS CRÍTICOS (Servicios de negocio)

| Archivo | Ocurrencias | Tipo | Prioridad |
|---------|-------------|------|-----------|
| **1. EmailService.js** | 4x sendMail | ⚠️ Servicio general de emails | **ALTA** |
| **2. biometricConsentService.js** | 2x sendMail | 📧 Consentimiento biométrico | **ALTA** |
| **3. PartnerNotificationService.js** | 2x sendMail | 👥 Notificaciones a partners | **ALTA** |
| **4. LateArrivalAuthorizationService.js** | 4x sendMail | ⏰ Autorizaciones de retrasos | **ALTA** |
| **5. SupplierEmailService.js** | ~5x sendMail | 📦 Emails a proveedores | **ALTA** |
| **6. contactRoutes.js** | 2x sendMail | 📨 Formulario de contacto | **MEDIA** |
| **7. contactFormRoutes.js** | 1x EmailService | 📨 Formulario de contacto | **MEDIA** |
| **8. jobPostingsRoutes.js** | 2x EmailService | 💼 Verificación de postulantes | **MEDIA** |
| **9. procurementRoutes.js** | ~3x SupplierEmailService | 📦 RFQ a proveedores | **ALTA** |

### 🟡 BYPASS TÉCNICOS (Infraestructura)

| Archivo | Función | ¿Es legítimo? |
|---------|---------|---------------|
| **10. EmailWorker.js** | Procesa queue de emails | ⚠️ **Depende** - Si la queue es alimentada por NCE, OK. Si no, es BYPASS. |
| **11. notification-service.js** | Microservicio next-gen | ❌ **BYPASS** - Sistema paralelo completo |
| **12. BrainEscalationService.js** | Escalamiento Brain | ❌ **BYPASS** - Usa EmailService directamente |

### 🟢 NO SON BYPASS (Infraestructura legítima)

| Archivo | Función | Veredicto |
|---------|---------|-----------|
| **EmailConfigService.js** | Configuración SMTP | ✅ OK - Solo gestiona config, no envía |
| **emailRoutes.js** | Endpoints de configuración | ✅ OK - Solo CRUD de configs |
| **NotificationOrchestrator.js** | Servicio deprecado | ✅ OK - Delega a NCE |
| **NotificationChannelDispatcher.js** | Parte de NCE | ✅ OK - Es componente de NCE |

---

## 📊 RESUMEN DE BYPASS

### Total de archivos auditados: **25**

- ✅ **OK (4)**: Son parte de NCE o infraestructura legítima
- ⚠️ **BYPASS (12)**: Envían emails directamente
- 🔍 **AMBIGUO (1)**: EmailWorker.js (depende de implementación)

### Tasa de bypass: **~48%** de servicios auditados tienen bypass

---

## 🚨 PROBLEMAS DETECTADOS

### 1. **EmailService.js es el BYPASS más usado**

**Servicios que lo usan**:
- `contactFormRoutes.js` → `emailService.sendFromAponnt()`
- `jobPostingsRoutes.js` → `EmailService.sendEmail()`
- `BrainEscalationService.js` → `emailService.sendFromAponnt()`

**Impacto**: EmailService es un wrapper de nodemailer que NO pasa por NCE.

### 2. **Servicios de negocio críticos con bypass**

- **biometricConsentService.js**: Envía consentimientos de análisis biométrico directamente
- **LateArrivalAuthorizationService.js**: 4 emails diferentes (solicitud, aprobación, rechazo, etc.)
- **PartnerNotificationService.js**: Notificaciones a partners y clientes

### 3. **Procurement/Supplier completamente bypass**

- **SupplierEmailService.js**: Servicio dedicado para proveedores
- **procurementRoutes.js**: Usa SupplierEmailService directamente
- **Impacto**: TODO el módulo de procurement/proveedores está fuera de NCE

### 4. **Microservicio paralelo (notification-service.js)**

- Sistema completo de notificaciones con:
  - WebSockets
  - Bull queues (Redis)
  - Nodemailer propio
  - **Completamente desconectado de NCE**

---

## 🔧 RECOMENDACIONES DE REMEDIACIÓN

### FASE 4 del plan (Semanas 4-8): Migración Módulo x Módulo

**Prioridad 1 - Servicios críticos (Semana 4-5)**:
1. ✅ Migrar **EmailService.js** a usar NCE internamente
2. ✅ Migrar **biometricConsentService.js**
3. ✅ Migrar **LateArrivalAuthorizationService.js**
4. ✅ Migrar **PartnerNotificationService.js**

**Prioridad 2 - Procurement/Suppliers (Semana 6)**:
5. ✅ Migrar **SupplierEmailService.js** a usar NCE
6. ✅ Migrar **procurementRoutes.js** a usar NCE

**Prioridad 3 - Formularios (Semana 7)**:
7. ✅ Migrar **contactRoutes.js** a usar NCE
8. ✅ Migrar **contactFormRoutes.js** a usar NCE
9. ✅ Migrar **jobPostingsRoutes.js** a usar NCE

**Prioridad 4 - Infraestructura (Semana 8)**:
10. ✅ Evaluar **EmailWorker.js**: Convertir a worker de NCE
11. ✅ Evaluar **notification-service.js**: Fusionar con NCE o deprecar
12. ✅ Migrar **BrainEscalationService.js** a usar NCE

---

## 🎯 OBJETIVO FINAL

### Estado actual:
```
┌─────────────────────────────────────────────────┐
│  BYPASS (~48%)                                  │
│  ├── EmailService.js                            │
│  ├── biometricConsentService.js                 │
│  ├── PartnerNotificationService.js              │
│  ├── LateArrivalAuthorizationService.js         │
│  ├── SupplierEmailService.js                    │
│  └── ... (7 más)                                │
└─────────────────────────────────────────────────┘
         ↓ (emails directos)
      SMTP Servers
```

### Estado deseado (FASE 4 completa):
```
┌─────────────────────────────────────────────────┐
│  TODOS LOS MÓDULOS (100%)                       │
│  ├── Procurement                                │
│  ├── Medical                                    │
│  ├── Partners                                   │
│  ├── HR                                         │
│  ├── Finance                                    │
│  └── ... (70+ módulos)                          │
└─────────────────────────────────────────────────┘
         ↓ (NCE.send() OBLIGATORIO)
┌─────────────────────────────────────────────────┐
│  NotificationCentralExchange                    │
│  (Central Telefónica - ÚNICO punto de salida)  │
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│  NotificationChannelDispatcher                  │
│  ├── Email (SMTP dinámico)                      │
│  ├── Push (FCM)                                 │
│  ├── SMS (Twilio)                               │
│  ├── WhatsApp (Twilio)                          │
│  ├── WebSocket (Socket.IO)                      │
│  └── Inbox (Threads)                            │
└─────────────────────────────────────────────────┘
         ↓
      Destinatarios
```

---

## ✅ CONCLUSIÓN

**NCE está correctamente implementado**, pero **NO es una central telefónica (aún)** porque:

1. ❌ **~12 servicios** envían emails directamente (bypass total)
2. ❌ **EmailService.js** es usado ampliamente en vez de NCE
3. ❌ **Módulos críticos** (Procurement, Partners, Biometric) están fuera de NCE
4. ❌ **Microservicio paralelo** (notification-service.js) compite con NCE

**Trabajo restante**: FASE 4 (Migración módulo x módulo) es **CRÍTICA** para lograr el objetivo de "central telefónica única".

---

**GENERADO**: 2026-01-06
**PRÓXIMA ACCIÓN**: Iniciar FASE 4 - Migrar servicios con bypass a NCE
