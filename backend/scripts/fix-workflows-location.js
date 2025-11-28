const fs = require('fs');
const path = require('path');

console.log('\n🔧 MOVIENDO WORKFLOWS A LA SECCIÓN CORRECTA\n');

// Leer WORKFLOWS-COMPLETOS.json
const workflowsPath = path.join(__dirname, '../WORKFLOWS-COMPLETOS.json');
const newWorkflows = JSON.parse(fs.readFileSync(workflowsPath, 'utf8'));

// Leer metadata actual
const metaPath = path.join(__dirname, '../engineering-metadata.js');
const meta = require(metaPath);

console.log('✅ Workflows encontrados en WORKFLOWS-COMPLETOS.json:');
console.log(`   - altaEmpresa: ${newWorkflows.altaEmpresa ? 'Sí' : 'No'}`);
console.log(`   - modulosPrueba: ${newWorkflows.modulosPrueba ? 'Sí' : 'No'}`);

// Verificar si ya existen
if (meta.workflows.altaEmpresa || meta.workflows.modulosPrueba) {
  console.log('\n⚠️ Los workflows YA están en la sección correcta.');
  process.exit(0);
}

console.log('\n📝 Agregando a meta.workflows...');

// Agregar con fechas
if (newWorkflows.altaEmpresa) {
  meta.workflows.altaEmpresa = newWorkflows.altaEmpresa;
  meta.workflows.altaEmpresa.createdDate = "2025-11-27";
  console.log('   ✓ altaEmpresa agregado');
}

if (newWorkflows.modulosPrueba) {
  meta.workflows.modulosPrueba = newWorkflows.modulosPrueba;
  meta.workflows.modulosPrueba.createdDate = "2025-11-27";
  console.log('   ✓ modulosPrueba agregado');
}

// Convertir a string (con module.exports)
const metaString = `/**
 * ENGINEERING METADATA - AUTO-UPDATED
 * Last update: ${new Date().toISOString()}
 */

module.exports = ${JSON.stringify(meta, null, 2).replace(/"([^"]+)":/g, '$1:')};
`;

// Guardar
fs.writeFileSync(metaPath, metaString, 'utf8');

console.log('\n✅ WORKFLOWS MOVIDOS EXITOSAMENTE');
console.log(`   Total workflows ahora: ${Object.keys(meta.workflows).length}`);
console.log('\n');
