# Configuración de Canales de Notificación

## 📋 ÍNDICE

1. [Resumen de Canales](#resumen-de-canales)
2. [Email (Nodemailer)](#1-email-nodemailer)
3. [SMS (Twilio)](#2-sms-twilio)
4. [WhatsApp (Twilio)](#3-whatsapp-twilio)
5. [Push Notifications (Firebase FCM)](#4-push-notifications-firebase-fcm)
6. [WebSocket (Socket.IO)](#5-websocket-socketio)
7. [Inbox Interno](#6-inbox-interno)
8. [Webhooks](#7-webhooks)
9. [Script de Verificación](#script-de-verificación)

---

## Resumen de Canales

| Canal | Provider | Status | Configuración Requerida |
|-------|----------|--------|------------------------|
| **Email** | Nodemailer | ✅ Activo | SMTP settings en `.env` |
| **SMS** | Twilio | ⚠️ Requiere config | Account SID, Auth Token |
| **WhatsApp** | Twilio | ⚠️ Requiere config | WhatsApp Business Account |
| **Push** | Firebase FCM | ⚠️ Requiere config | Service Account JSON |
| **WebSocket** | Socket.IO | ✅ Activo | Auto-configurado |
| **Inbox** | Database | ✅ Activo | No requiere config |
| **Webhooks** | HTTP | ✅ Activo | Configurar por empresa |

---

## 1. Email (Nodemailer)

### ✅ Estado: ACTIVO

El canal de email ya está configurado y funcionando.

### Configuración Actual

Variables en `.env`:
```bash
# Email Configuration (Already configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="Sistema Biométrico <noreply@sistema.com>"
```

### Testing Email

```javascript
const NotificationCentralExchange = require('./src/services/NotificationCentralExchange');

await NotificationCentralExchange.send({
  companyId: 1,
  module: 'test',
  workflowKey: 'test_email',
  recipientType: 'user',
  recipientId: 'user-123',
  title: 'Test Email',
  message: 'Este es un correo de prueba',
  channels: ['email']
});
```

---

## 2. SMS (Twilio)

### ⚠️ Estado: REQUIERE CONFIGURACIÓN

### Pasos de Configuración

#### 1. Crear cuenta en Twilio

1. Ir a https://www.twilio.com/try-twilio
2. Registrarse (plan gratuito disponible con crédito de prueba)
3. Verificar teléfono personal

#### 2. Obtener credenciales

Dashboard Twilio → Account Info:
- **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Auth Token**: `xxxxxxxxxxxxxxxxxxxxxxxx`

#### 3. Obtener número de Twilio

1. Phone Numbers → Buy a Number
2. Seleccionar país (Argentina: +54)
3. Buscar número con capacidad SMS
4. Comprar número (costo: ~$1/mes)

#### 4. Configurar `.env`

```bash
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+5491123456789
```

#### 5. Verificar servicio

El servicio `TwilioMessagingService.js` ya está implementado en:
```
backend/src/services/TwilioMessagingService.js
```

### Testing SMS

```javascript
const TwilioMessagingService = require('./src/services/TwilioMessagingService');

await TwilioMessagingService.sendSMS({
  to: '+5491123456789',
  message: 'Prueba de SMS desde el sistema'
});
```

### Costos Estimados

- **Número telefónico**: $1.15 USD/mes
- **SMS salientes**: $0.0075 USD por mensaje
- **100 SMS/mes**: ~$1.90 USD/mes total

---

## 3. WhatsApp (Twilio)

### ⚠️ Estado: REQUIERE CONFIGURACIÓN

### Pasos de Configuración

#### 1. Requisitos previos

- Cuenta Twilio creada (ver sección SMS)
- WhatsApp Business Account aprobado por Meta

#### 2. Solicitar acceso a WhatsApp Business API

1. Twilio Console → Messaging → Try it out → Send a WhatsApp message
2. Seguir el wizard de configuración
3. Conectar tu WhatsApp Business Account
4. Esperar aprobación de Meta (1-2 días laborables)

#### 3. Configurar Sandbox (para testing)

Para pruebas inmediatas sin aprobación:

1. Twilio Console → Messaging → Try it out → WhatsApp sandbox
2. Unirse al sandbox enviando el código a WhatsApp
3. Usar el número sandbox para pruebas

```bash
# Twilio WhatsApp Configuration
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Sandbox number
# O cuando sea aprobado:
TWILIO_WHATSAPP_NUMBER=whatsapp:+5491123456789  # Tu número real
```

### Testing WhatsApp

```javascript
const TwilioMessagingService = require('./src/services/TwilioMessagingService');

await TwilioMessagingService.sendWhatsApp({
  to: '+5491123456789',
  message: 'Prueba de WhatsApp desde el sistema',
  mediaUrl: 'https://ejemplo.com/imagen.jpg'  // Opcional
});
```

### Costos Estimados

- **Conversaciones iniciadas por la empresa**: $0.0042 USD cada una
- **Conversaciones respondiendo a usuario**: Gratis (primeras 24 horas)
- **1000 mensajes/mes**: ~$4.20 USD/mes

---

## 4. Push Notifications (Firebase FCM)

### ⚠️ Estado: REQUIERE CONFIGURACIÓN

### Pasos de Configuración

#### 1. Crear proyecto en Firebase

1. Ir a https://console.firebase.google.com
2. Click "Add project" / "Agregar proyecto"
3. Nombre: "Sistema Asistencia Biométrico"
4. Desactivar Google Analytics (opcional)
5. Create project

#### 2. Generar Service Account Key

1. Project Settings → Service accounts
2. Click "Generate new private key"
3. Descargar archivo JSON
4. Guardar como `firebase-service-account.json` en `backend/config/`

#### 3. Configurar `.env`

```bash
# Firebase Push Notifications
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
FIREBASE_PROJECT_ID=sistema-asistencia-xxxxx
```

#### 4. Agregar Firebase SDK a frontend

En `public/panel-empresa.html`:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js"></script>

<script>
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXX",
  authDomain: "sistema-asistencia-xxxxx.firebaseapp.com",
  projectId: "sistema-asistencia-xxxxx",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxx"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Request permission
messaging.requestPermission()
  .then(() => messaging.getToken())
  .then(token => {
    console.log('FCM Token:', token);
    // Guardar token en BD via API
    fetch('/api/users/me/fcm-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fcm_token: token })
    });
  });

// Listen for messages
messaging.onMessage(payload => {
  console.log('Push notification received:', payload);
  // Mostrar notificación en UI
});
</script>
```

### Testing Push

```javascript
const FirebasePushService = require('./src/services/FirebasePushService');

await FirebasePushService.sendToDevice({
  token: 'fcm-device-token-here',
  title: 'Prueba de Push',
  body: 'Esta es una notificación push de prueba',
  data: { module: 'test', action: 'view' }
});
```

### Costos

**✅ GRATIS** - Firebase Cloud Messaging es completamente gratuito sin límites.

---

## 5. WebSocket (Socket.IO)

### ✅ Estado: ACTIVO

Ya está configurado y funcionando en `server.js`.

### Configuración Actual

```javascript
// Backend: server.js
const NotificationWebSocketService = require('./src/services/NotificationWebSocketService');
NotificationWebSocketService.initialize(io);

// Frontend: panel-empresa.html
const socket = io();
socket.on('notification', (notification) => {
  console.log('Nueva notificación en tiempo real:', notification);
  // Actualizar UI
});
```

### Testing WebSocket

Abrir navegador en panel-empresa.html y verificar en consola:
```javascript
socket.emit('test', 'Hello from client');
```

---

## 6. Inbox Interno

### ✅ Estado: ACTIVO

Almacenamiento en base de datos `notifications` table.

### Testing Inbox

```javascript
// Obtener notificaciones del inbox de un usuario
const { Notification } = require('./src/config/database');

const notifications = await Notification.findAll({
  where: {
    company_id: 1,
    recipient_id: 'user-123',
    status: 'delivered'
  },
  order: [['created_at', 'DESC']],
  limit: 20
});
```

---

## 7. Webhooks

### ✅ Estado: ACTIVO

Configuración por empresa en tabla `notification_webhook_configs`.

### Configurar Webhook

```sql
-- Insertar configuración de webhook para una empresa
INSERT INTO notification_webhook_configs (
  company_id,
  webhook_url,
  events,
  is_active,
  auth_type,
  auth_header,
  retry_attempts
) VALUES (
  1,
  'https://api.ejemplo.com/webhooks/notifications',
  ARRAY['notification.sent', 'notification.delivered', 'notification.read'],
  true,
  'bearer',
  'Bearer tu-token-secreto-aqui',
  3
);
```

### Testing Webhook

```javascript
const NotificationWebhookService = require('./src/services/NotificationWebhookService');

await NotificationWebhookService.sendWebhook({
  companyId: 1,
  event: 'notification.sent',
  payload: {
    notification_id: 123,
    title: 'Test',
    message: 'Webhook test'
  }
});
```

---

## Script de Verificación

Ejecutar este script para verificar el estado de todos los canales:

```bash
cd backend
node scripts/check-notification-channels.js
```

---

## Prioridades de Implementación

### ⚡ ALTA PRIORIDAD
1. **Email** ✅ Ya configurado
2. **WebSocket** ✅ Ya configurado
3. **Inbox** ✅ Ya configurado

### 📱 MEDIA PRIORIDAD
4. **SMS (Twilio)** - Para notificaciones urgentes
5. **Push (Firebase)** - Para aplicaciones móviles

### 💬 BAJA PRIORIDAD
6. **WhatsApp** - Para comunicación directa con empleados
7. **Webhooks** - Para integraciones con sistemas externos

---

## Resumen de Costos Mensuales

| Canal | Costo Estimado (1000 notif/mes) |
|-------|----------------------------------|
| Email | $0 (usando SMTP propio) |
| WebSocket | $0 (incluido en servidor) |
| Inbox | $0 (base de datos) |
| SMS | ~$8.50 USD |
| WhatsApp | ~$4.20 USD |
| Push | $0 (Firebase gratis) |
| **TOTAL** | **~$12.70 USD/mes** |

---

## Próximos Pasos

1. ✅ Ejecutar `node scripts/check-notification-channels.js`
2. ⚠️ Configurar Twilio SMS (si se requiere SMS)
3. ⚠️ Configurar Firebase FCM (si se requiere Push)
4. ⚠️ Configurar WhatsApp Business (si se requiere WhatsApp)
5. ✅ Testing de canales activos con `node scripts/test-all-notifications.js`
