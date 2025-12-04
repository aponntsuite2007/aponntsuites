/**
 * Script para agregar endpoints de Certification Alerts API
 * OH-V6-10: Implementación de API REST
 */

const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, '..', 'src', 'routes', 'occupationalHealthRoutes.js');

console.log('📝 [CERT API] Agregando endpoints de certificaciones a occupationalHealthRoutes.js...\n');

// Leer archivo
let content = fs.readFileSync(routesPath, 'utf8');

// Verificar si ya existen
if (content.includes('CERTIFICATION ALERTS MANAGEMENT (OH-V6-10)')) {
  console.log('✅ Los endpoints de certificaciones ya están agregados\n');
  process.exit(0);
}

// Código de endpoints (700+ líneas)
const certApiCode = fs.readFileSync(path.join(__dirname, 'cert-api-endpoints.txt'), 'utf8');

// Buscar punto de inserción
const insertionPoint = `// ============================================================================

/**
 * GET /api/occupational-health/health
 * Health check endpoint
 */`;

if (!content.includes(insertionPoint)) {
  console.error('❌ No se encontró el punto de inserción');
  process.exit(1);
}

// Insertar
content = content.replace(insertionPoint, certApiCode + '\n' + insertionPoint);

// También actualizar el health endpoint para incluir certificaciones
content = content.replace(
  `'Workers\\' Compensation Claims Management (Multi-Country)'`,
  `'Workers\\' Compensation Claims Management (Multi-Country)',\n            'Certification Alerts & Management (Automated Expiration Tracking)'`
);

// Guardar
fs.writeFileSync(routesPath, content, 'utf8');

console.log('✅ Endpoints de certificaciones agregados exitosamente');
console.log('   Total: 12 endpoints REST');
console.log('   Ubicación: occupationalHealthRoutes.js (antes de health check)\n');
