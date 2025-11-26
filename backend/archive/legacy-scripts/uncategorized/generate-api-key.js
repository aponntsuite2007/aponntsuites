/**
 * Script para generar API Key de acceso programático
 * Uso: node generate-api-key.js
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Secret key (debe ser la misma que usa el servidor)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-12345';

// Generar API Key permanente
function generateApiKey() {
  const apiKey = crypto.randomBytes(32).toString('hex');

  console.log('\n🔑 ═══════════════════════════════════════════════════════');
  console.log('   API KEY GENERADA EXITOSAMENTE');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('API Key:', apiKey);
  console.log('\n📝 Guarda esta key de forma segura.');
  console.log('💡 Úsala en el header: X-API-Key: ' + apiKey);
  console.log('\n═══════════════════════════════════════════════════════\n');

  return apiKey;
}

// Generar JWT Token de larga duración (para testing)
function generateTestToken() {
  const payload = {
    user_id: 1,
    email: 'admin@empresa.com',
    company_id: 1,
    role: 'admin',
    isActive: true,
    type: 'api-access'
  };

  // Token válido por 1 año
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '365d' });

  console.log('\n🎫 ═══════════════════════════════════════════════════════');
  console.log('   JWT TOKEN GENERADO EXITOSAMENTE');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Token JWT:', token);
  console.log('\n📝 Este token es válido por 1 año.');
  console.log('💡 Úsalo en el header: Authorization: Bearer ' + token);
  console.log('\n📊 Payload decodificado:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n═══════════════════════════════════════════════════════\n');

  return token;
}

// Ejecutar
console.log('\n🚀 Generador de credenciales de acceso\n');

const mode = process.argv[2] || 'token';

if (mode === 'apikey') {
  generateApiKey();
} else {
  generateTestToken();
}

console.log('✅ Proceso completado\n');
console.log('📌 IMPORTANTE: Estas credenciales tienen acceso COMPLETO al sistema.');
console.log('⚠️  NO las compartas públicamente ni las subas a git.\n');
