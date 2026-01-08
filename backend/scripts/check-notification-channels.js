/**
 * Script de Verificación de Canales de Notificación
 *
 * Verifica el estado de configuración de todos los canales
 * y muestra recomendaciones de acción
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 VERIFICACIÓN DE CANALES DE NOTIFICACIÓN');
console.log('='.repeat(70) + '\n');

const channels = {
  email: {
    name: 'Email (Nodemailer)',
    status: 'unknown',
    required_vars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'],
    optional_vars: ['EMAIL_FROM'],
    priority: 'ALTA',
    cost: '$0/mes'
  },
  sms: {
    name: 'SMS (Twilio)',
    status: 'unknown',
    required_vars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
    priority: 'MEDIA',
    cost: '~$8.50/mes (1000 SMS)'
  },
  whatsapp: {
    name: 'WhatsApp (Twilio)',
    status: 'unknown',
    required_vars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_NUMBER'],
    priority: 'BAJA',
    cost: '~$4.20/mes (1000 msgs)'
  },
  push: {
    name: 'Push Notifications (Firebase FCM)',
    status: 'unknown',
    required_vars: ['FIREBASE_SERVICE_ACCOUNT_PATH', 'FIREBASE_PROJECT_ID'],
    priority: 'MEDIA',
    cost: '$0/mes (gratis)'
  },
  websocket: {
    name: 'WebSocket (Socket.IO)',
    status: 'unknown',
    required_vars: [],
    service_file: 'src/services/NotificationWebSocketService.js',
    priority: 'ALTA',
    cost: '$0/mes'
  },
  inbox: {
    name: 'Inbox Interno',
    status: 'unknown',
    required_vars: [],
    table: 'notifications',
    priority: 'ALTA',
    cost: '$0/mes'
  },
  webhooks: {
    name: 'Webhooks Salientes',
    status: 'unknown',
    required_vars: [],
    table: 'notification_webhook_configs',
    service_file: 'src/services/NotificationWebhookService.js',
    priority: 'BAJA',
    cost: '$0/mes'
  }
};

// Cargar variables de entorno
require('dotenv').config();

function checkEnvVars(vars) {
  const missing = [];
  const present = [];

  for (const varName of vars) {
    if (process.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  }

  return { missing, present };
}

function checkFileExists(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  return fs.existsSync(fullPath);
}

// Email
(() => {
  const check = checkEnvVars(channels.email.required_vars);

  if (check.missing.length === 0) {
    channels.email.status = 'configured';
    channels.email.details = `✅ Todas las variables configuradas (${check.present.length}/${channels.email.required_vars.length})`;
  } else {
    channels.email.status = 'missing_config';
    channels.email.details = `❌ Variables faltantes: ${check.missing.join(', ')}`;
  }
})();

// SMS (Twilio)
(() => {
  const check = checkEnvVars(channels.sms.required_vars);

  if (check.missing.length === 0) {
    channels.sms.status = 'configured';
    channels.sms.details = `✅ Todas las variables configuradas`;
  } else {
    channels.sms.status = 'missing_config';
    channels.sms.details = `⚠️  Variables faltantes: ${check.missing.join(', ')}`;
    channels.sms.action = 'Configurar cuenta Twilio (ver docs/NOTIFICATION-CHANNELS-SETUP.md)';
  }
})();

// WhatsApp (Twilio)
(() => {
  const check = checkEnvVars(channels.whatsapp.required_vars);

  if (check.missing.length === 0) {
    channels.whatsapp.status = 'configured';
    channels.whatsapp.details = `✅ Todas las variables configuradas`;
  } else {
    channels.whatsapp.status = 'missing_config';
    channels.whatsapp.details = `⚠️  Variables faltantes: ${check.missing.join(', ')}`;
    channels.whatsapp.action = 'Solicitar WhatsApp Business API en Twilio';
  }
})();

// Push (Firebase)
(() => {
  const check = checkEnvVars(channels.push.required_vars);

  if (check.missing.length === 0) {
    // Verificar que el archivo JSON existe
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const fullPath = path.join(__dirname, '..', serviceAccountPath);

    if (fs.existsSync(fullPath)) {
      channels.push.status = 'configured';
      channels.push.details = `✅ Variables configuradas + Service Account existe`;
    } else {
      channels.push.status = 'missing_file';
      channels.push.details = `⚠️  Variables OK pero archivo no encontrado: ${serviceAccountPath}`;
      channels.push.action = 'Descargar Service Account JSON desde Firebase Console';
    }
  } else {
    channels.push.status = 'missing_config';
    channels.push.details = `⚠️  Variables faltantes: ${check.missing.join(', ')}`;
    channels.push.action = 'Crear proyecto Firebase y configurar variables';
  }
})();

// WebSocket
(() => {
  if (checkFileExists(channels.websocket.service_file)) {
    channels.websocket.status = 'active';
    channels.websocket.details = `✅ Servicio implementado y activo`;
  } else {
    channels.websocket.status = 'missing_service';
    channels.websocket.details = `❌ Archivo de servicio no encontrado`;
  }
})();

// Inbox
(() => {
  // Verificar que NotificationCentralExchange existe
  if (checkFileExists('src/services/NotificationCentralExchange.js')) {
    channels.inbox.status = 'active';
    channels.inbox.details = `✅ Sistema de inbox activo (tabla: notifications)`;
  } else {
    channels.inbox.status = 'error';
    channels.inbox.details = `❌ NotificationCentralExchange no encontrado`;
  }
})();

// Webhooks
(() => {
  if (checkFileExists(channels.webhooks.service_file)) {
    channels.webhooks.status = 'active';
    channels.webhooks.details = `✅ Servicio implementado (configurar por empresa)`;
  } else {
    channels.webhooks.status = 'missing_service';
    channels.webhooks.details = `❌ Archivo de servicio no encontrado`;
  }
})();

// Mostrar resultados
console.log('📊 ESTADO DE LOS CANALES:\n');

const statusIcons = {
  configured: '✅',
  active: '✅',
  missing_config: '⚠️',
  missing_file: '⚠️',
  missing_service: '❌',
  unknown: '❓',
  error: '❌'
};

const priorityColors = {
  ALTA: '🔴',
  MEDIA: '🟡',
  BAJA: '🟢'
};

for (const [key, channel] of Object.entries(channels)) {
  const icon = statusIcons[channel.status] || '❓';
  const priority = priorityColors[channel.priority] || '';

  console.log(`${icon} ${channel.name.padEnd(40)} ${priority} ${channel.priority}`);
  console.log(`   Status: ${channel.status.toUpperCase()}`);
  console.log(`   ${channel.details}`);
  if (channel.cost) {
    console.log(`   💰 Costo estimado: ${channel.cost}`);
  }
  if (channel.action) {
    console.log(`   📋 Acción: ${channel.action}`);
  }
  console.log();
}

// Resumen
const configured = Object.values(channels).filter(c =>
  c.status === 'configured' || c.status === 'active'
).length;

const total = Object.keys(channels).length;
const percentage = Math.round((configured / total) * 100);

console.log('─'.repeat(70));
console.log(`\n📈 RESUMEN: ${configured}/${total} canales activos (${percentage}%)\n`);

// Recomendaciones
console.log('💡 RECOMENDACIONES:\n');

const recommendations = [];

if (channels.email.status !== 'configured') {
  recommendations.push('🔴 URGENTE: Configurar Email (canal principal de notificaciones)');
}

if (channels.websocket.status !== 'active') {
  recommendations.push('🔴 URGENTE: Verificar servicio WebSocket');
}

if (channels.inbox.status !== 'active') {
  recommendations.push('🔴 URGENTE: Verificar sistema de Inbox');
}

if (channels.sms.status !== 'configured') {
  recommendations.push('🟡 Opcional: Configurar SMS para notificaciones urgentes');
}

if (channels.push.status !== 'configured') {
  recommendations.push('🟡 Opcional: Configurar Push Notifications para apps móviles');
}

if (channels.whatsapp.status !== 'configured') {
  recommendations.push('🟢 Opcional: Configurar WhatsApp para comunicación directa');
}

if (recommendations.length === 0) {
  console.log('   ✅ ¡Todos los canales prioritarios están configurados!\n');
} else {
  recommendations.forEach(rec => console.log(`   ${rec}`));
  console.log();
}

console.log('─'.repeat(70));
console.log('\n📚 Documentación completa: backend/docs/NOTIFICATION-CHANNELS-SETUP.md\n');
console.log('='.repeat(70) + '\n');

// Exit code según estado
process.exit(percentage >= 70 ? 0 : 1);
