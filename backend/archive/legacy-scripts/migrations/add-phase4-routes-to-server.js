/**
 * Script para agregar rutas de Phase 4 a server.js
 */

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');

console.log('📝 Leyendo server.js...');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Verificar si ya están agregadas las rutas de Phase 4
if (serverContent.includes('auditorPhase4Routes')) {
  console.log('✅ Las rutas de Phase 4 ya están agregadas en server.js');
  process.exit(0);
}

// Buscar la línea donde se configuran las rutas del auditor
const searchString = `const auditorRoutes = require('./src/routes/auditorRoutes')(database);
app.use('/api/audit', auditorRoutes);`;

if (!serverContent.includes(searchString)) {
  console.error('❌ No se encontró la configuración de auditorRoutes en server.js');
  process.exit(1);
}

// Agregar las rutas de Phase 4 justo después
const phase4Routes = `
// ✅ CONFIGURAR PHASE 4: AUTONOMOUS REPAIR + TECHNICAL REPORTS
const auditorPhase4Routes = require('./src/routes/auditorPhase4Routes')(database);
app.use('/api/audit/phase4', auditorPhase4Routes);`;

serverContent = serverContent.replace(
  searchString,
  searchString + phase4Routes
);

// Agregar los console.log también
const logSearchString = `console.log('🔍 [AUDITOR] Sistema de Auditoría y Auto-Diagnóstico ACTIVO:');
console.log('   🔍 /api/audit/run - Ejecutar auditoría completa');
console.log('   📊 /api/audit/status - Estado actual');
console.log('   📋 /api/audit/registry - Ver módulos del sistema');`;

const phase4Logs = `
console.log('');
console.log('🚀 [PHASE4] Sistema Autónomo de Reparación + Reportes Técnicos ACTIVO:');
console.log('   🔬 POST /api/audit/phase4/test/deep-with-report - Test profundo con auto-repair + reporte');
console.log('   🔧 POST /api/audit/phase4/auto-repair/:execution_id - Trigger manual de auto-reparación');
console.log('   📄 GET  /api/audit/phase4/reports/:execution_id - Descargar reporte técnico');
console.log('   📋 GET  /api/audit/phase4/reports - Listar reportes disponibles');`;

serverContent = serverContent.replace(
  logSearchString,
  logSearchString + phase4Logs
);

// Escribir el archivo actualizado
console.log('📝 Escribiendo cambios en server.js...');
fs.writeFileSync(serverPath, serverContent, 'utf8');

console.log('✅ Rutas de Phase 4 agregadas exitosamente a server.js');
console.log('');
console.log('Nuevos endpoints disponibles:');
console.log('  - POST /api/audit/phase4/test/deep-with-report');
console.log('  - POST /api/audit/phase4/auto-repair/:execution_id');
console.log('  - GET /api/audit/phase4/reports/:execution_id');
console.log('  - GET /api/audit/phase4/reports');
