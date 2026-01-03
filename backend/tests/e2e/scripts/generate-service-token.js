/**
 * Script para generar token de servicio para tests E2E
 * Token de larga duración (365 días) para autenticación automática
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

console.log('🔐 Generando token de servicio para tests E2E...\n');

// Payload del token de servicio
const serviceTokenPayload = {
  id: 11, // Company ID ISI (usada en tests)
  userId: 1, // Usuario admin
  role: 'admin',
  companyId: 11,
  companySlug: 'isi',
  email: 'e2e-service@aponnt.com',
  serviceAccount: true, // Marca que es cuenta de servicio
  purpose: 'e2e-testing',
  createdAt: new Date().toISOString()
};

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_super_segura_cambiar_en_produccion_2025';

// Generar token con expiración de 365 días
const serviceToken = jwt.sign(
  serviceTokenPayload,
  JWT_SECRET,
  {
    expiresIn: '365d', // 1 año
    issuer: 'aponnt-e2e-testing',
    audience: 'aponnt-backend-api'
  }
);

console.log('✅ Token generado exitosamente\n');
console.log('📋 Información del token:');
console.log(`   - Usuario: ${serviceTokenPayload.email}`);
console.log(`   - Company ID: ${serviceTokenPayload.companyId}`);
console.log(`   - Role: ${serviceTokenPayload.role}`);
console.log(`   - Expiración: 365 días`);
console.log(`   - Propósito: ${serviceTokenPayload.purpose}\n`);

// Guardar token en archivo .env.e2e
const envE2EPath = path.join(__dirname, '../.env.e2e');
const envContent = `# Configuración para Tests E2E
# Generado automáticamente: ${new Date().toISOString()}

# Token de servicio (válido por 365 días)
E2E_SERVICE_TOKEN=${serviceToken}

# Información del token
E2E_COMPANY_ID=11
E2E_COMPANY_SLUG=isi
E2E_USER_ID=1
E2E_USER_EMAIL=e2e-service@aponnt.com
E2E_USER_ROLE=admin

# Base URL del backend
E2E_BACKEND_URL=http://localhost:9998

# Base de datos (usar mismas credenciales que .env principal)
E2E_DB_HOST=localhost
E2E_DB_PORT=5432
E2E_DB_NAME=attendance_system
E2E_DB_USER=postgres
E2E_DB_PASSWORD=Aedr15150302
`;

fs.writeFileSync(envE2EPath, envContent, 'utf8');
console.log(`💾 Token guardado en: tests/e2e/.env.e2e`);

// También agregar al .env principal si no existe
const mainEnvPath = path.join(__dirname, '../../../.env');
let mainEnvContent = fs.readFileSync(mainEnvPath, 'utf8');

if (!mainEnvContent.includes('E2E_SERVICE_TOKEN')) {
  mainEnvContent += `\n\n# Token de servicio para tests E2E (auto-generado)\nE2E_SERVICE_TOKEN=${serviceToken}\n`;
  fs.writeFileSync(mainEnvPath, mainEnvContent, 'utf8');
  console.log(`✅ Token agregado a .env principal\n`);
} else {
  console.log(`ℹ️  Token ya existe en .env principal (no se sobrescribe)\n`);
}

// Mostrar primeros caracteres del token (para debugging)
console.log('🔑 Token (primeros 50 caracteres):');
console.log(`   ${serviceToken.substring(0, 50)}...\n`);

console.log('✅ Configuración completa!');
console.log('\n📝 Próximos pasos:');
console.log('   1. El token ya está disponible en .env y .env.e2e');
console.log('   2. Los tests E2E lo cargarán automáticamente');
console.log('   3. El Brain podrá autenticarse sin errores 401\n');

// Verificar que el token es válido
try {
  const decoded = jwt.verify(serviceToken, JWT_SECRET);
  console.log('✅ Token verificado correctamente');
  console.log(`   Expira en: ${new Date(decoded.exp * 1000).toLocaleDateString()}\n`);
} catch (err) {
  console.error('❌ Error verificando token:', err.message);
}
