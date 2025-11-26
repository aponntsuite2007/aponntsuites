/**
 * 🚀 INTEGRACIÓN: ANÁLISIS EMOCIONAL PROFESIONAL AL SERVER
 * =======================================================
 * Agrega las nuevas rutas al servidor existente
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 ========================================');
console.log('🚀 INTEGRANDO ANÁLISIS EMOCIONAL AL SERVIDOR');
console.log('🚀 ========================================');
console.log('');

// Leer server.js
const serverPath = path.join(__dirname, 'server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Buscar donde están las rutas
const routesPattern = /app\.use\('\/api\/v1\/mobile'/;
const match = serverContent.match(routesPattern);

if (!match) {
  console.error('❌ No se encontró el patrón de rutas en server.js');
  process.exit(1);
}

// Código a agregar
const newRoutesCode = `
// 🧠 ANÁLISIS EMOCIONAL PROFESIONAL (Azure Face API)
const emotionalAnalysisRoutes = require('./src/routes/emotionalAnalysisRoutes');
app.use('/api/v1/emotional-analysis', emotionalAnalysisRoutes);
console.log('🧠 [EMOTIONAL-ANALYSIS] Rutas profesionales configuradas');

// ⚖️ GESTIÓN DE CONSENTIMIENTOS (Ley 25.326)
const consentRoutes = require('./src/routes/consentRoutes');
app.use('/api/v1/consent', consentRoutes);
console.log('⚖️ [CONSENT] Sistema legal configurado');
`;

// Insertar después de la línea de mobile
const insertPosition = serverContent.indexOf("app.use('/api/v1/mobile'");
const lineEnd = serverContent.indexOf('\n', insertPosition);

// Verificar si ya está agregado
if (serverContent.includes('emotional-analysis')) {
  console.log('⚠️ Las rutas ya están integradas en server.js');
  console.log('✅ No se requieren cambios');
  process.exit(0);
}

// Insertar el nuevo código
const newServerContent =
  serverContent.slice(0, lineEnd + 1) +
  newRoutesCode +
  serverContent.slice(lineEnd + 1);

// Guardar
fs.writeFileSync(serverPath, newServerContent, 'utf8');

console.log('✅ Rutas integradas exitosamente en server.js');
console.log('');
console.log('📋 Rutas agregadas:');
console.log('   • /api/v1/emotional-analysis/*');
console.log('   • /api/v1/consent/*');
console.log('');
console.log('🎯 PRÓXIMO PASO:');
console.log('   Reiniciar servidor: cd backend && PORT=9998 npm start');
console.log('');

process.exit(0);
