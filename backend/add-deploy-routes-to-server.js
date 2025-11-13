/**
 * Script para agregar rutas de Deploy Manager a server.js
 */

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');

console.log('\n' + '='.repeat(80));
console.log('📝 AGREGANDO RUTAS DE DEPLOY MANAGER A SERVER.JS');
console.log('='.repeat(80) + '\n');

// Leer server.js
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Verificar si ya están agregadas
if (serverContent.includes('/api/deploy')) {
  console.log('⚠️  Las rutas de Deploy Manager ya están en server.js');
  console.log('✅ No se requieren cambios\n');
  process.exit(0);
}

// Buscar donde agregar las rutas (después de auditorPhase4Routes)
const insertMarker = "app.use('/api/audit/phase4', auditorPhase4Routes);";
const insertIndex = serverContent.indexOf(insertMarker);

if (insertIndex === -1) {
  console.error('❌ No se encontró el marcador de inserción en server.js');
  console.error('   Buscando: app.use(\'/api/audit/phase4\', ...)');
  process.exit(1);
}

// Código a insertar
const deployRoutesCode = `
// ============================================================================
// DEPLOY MANAGER - Sistema de Migración Segura a Render
// ============================================================================
const deployRoutes = require('./src/routes/deployRoutes');
app.use('/api/deploy', deployRoutes);

console.log('🚀 [DEPLOY-MANAGER] Sistema de Deploy Seguro ACTIVO:');
console.log('   📊 GET  /api/deploy/pre-deploy-check - Verificar pre-requisitos');
console.log('   📋 GET  /api/deploy/pending-migrations - Listar migraciones pendientes');
console.log('   🚀 POST /api/deploy/migrate-to-render - Ejecutar deploy (requiere auth)');
console.log('   📈 GET  /api/deploy/test-stats - Estadísticas de tests');
console.log('');
`;

// Insertar después de auditorPhase4Routes
const endOfLineIndex = serverContent.indexOf('\n', insertIndex);
const newContent =
  serverContent.slice(0, endOfLineIndex + 1) +
  deployRoutesCode +
  serverContent.slice(endOfLineIndex + 1);

// Escribir archivo actualizado
fs.writeFileSync(serverPath, newContent, 'utf8');

console.log('✅ Rutas de Deploy Manager agregadas a server.js');
console.log('');
console.log('📍 Ubicación: Después de auditorPhase4Routes');
console.log('');
console.log('🔧 Próximos pasos:');
console.log('   1. Reiniciar servidor: node restart-server-node.js');
console.log('   2. Verificar en logs: "🚀 [DEPLOY-MANAGER] Sistema de Deploy Seguro ACTIVO"');
console.log('   3. Acceder a panel-administrativo.html → Tab Herramientas → Deploy Manager');
console.log('');
console.log('='.repeat(80) + '\n');
