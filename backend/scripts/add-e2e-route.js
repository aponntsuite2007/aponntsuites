/**
 * Script para agregar ruta E2E Testing a server.js
 * Agrega DESPUÉS de la línea 2927 (console.log "Solo módulos")
 */

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '../server.js');

console.log('📝 Agregando ruta E2E Testing a server.js...\n');

// Leer archivo
let content = fs.readFileSync(serverPath, 'utf8');

// Buscar la línea "Solo módulos"
const searchLine = "console.log('   📋 GET  /api/engineering/modules - Solo módulos');";

if (!content.includes(searchLine)) {
  console.error('❌ No se encontró la línea de referencia');
  process.exit(1);
}

// Verificar si ya está agregado
if (content.includes('e2eTestingRoutes')) {
  console.log('✅ La ruta E2E Testing ya está agregada');
  process.exit(0);
}

// Código a insertar
const codeToInsert = `
// ✅ CONFIGURAR E2E TESTING API - Tests en tiempo real
const e2eTestingRoutes = require('./src/routes/e2eTestingRoutes');
app.use('/api/e2e-testing', e2eTestingRoutes);

console.log('🧪 [E2E-TESTING] E2E Testing API ACTIVO:');
console.log('   📊 GET  /api/e2e-testing/live-stats - Estadísticas en tiempo real');
console.log('   📋 GET  /api/e2e-testing/modules-status - Estado de módulos');
`;

// Reemplazar
content = content.replace(
  searchLine,
  searchLine + codeToInsert
);

// Escribir
fs.writeFileSync(serverPath, content, 'utf8');

console.log('✅ Ruta E2E Testing agregada a server.js');
console.log('   📍 Ubicación: Después de línea 2927');
console.log('   🔌 Endpoint: /api/e2e-testing/*');
console.log('\n⚠️  IMPORTANTE: Reiniciar el servidor para activar cambios');
console.log('   cd backend && PORT=9998 npm start\n');
