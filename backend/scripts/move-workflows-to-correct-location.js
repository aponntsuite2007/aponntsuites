const fs = require('fs');
const path = require('path');

console.log('\n🔄 MOVIENDO WORKFLOWS A UBICACIÓN CORRECTA\n');

// Leer workflows completos
const workflowsPath = path.join(__dirname, '../WORKFLOWS-COMPLETOS.json');
const workflows = JSON.parse(fs.readFileSync(workflowsPath, 'utf8'));

// Agregar fechas
workflows.altaEmpresa.createdDate = "2025-11-27";
workflows.modulosPrueba.createdDate = "2025-11-27";

// Leer metadata
const metaPath = path.join(__dirname, '../engineering-metadata.js');
let content = fs.readFileSync(metaPath, 'utf8');

// Buscar el final de la sección workflows (antes de auditExecution que es el último)
// Buscar: "auditExecution": {
const auditExecutionMatch = content.match(/(    "auditExecution": \{[\s\S]*?\n    \})/);

if (!auditExecutionMatch) {
  console.log('❌ No se encontró auditExecution');
  process.exit(1);
}

const auditExecutionSection = auditExecutionMatch[0];
const auditExecutionIndex = content.indexOf(auditExecutionSection);

// Generar el texto de los nuevos workflows
const altaEmpresaText = JSON.stringify(workflows.altaEmpresa, null, 2)
  .split('\n')
  .map((line, index) => index === 0 ? `    "altaEmpresa": ${line}` : `    ${line}`)
  .join('\n');

const modulosPruebaText = JSON.stringify(workflows.modulosPrueba, null, 2)
  .split('\n')
  .map((line, index) => index === 0 ? `    "modulosPrueba": ${line}` : `    ${line}`)
  .join('\n');

// Insertar ANTES de auditExecution
const beforeAudit = content.substring(0, auditExecutionIndex);
const afterAudit = content.substring(auditExecutionIndex);

const newContent = beforeAudit +
  altaEmpresaText + ',\n' +
  modulosPruebaText + ',\n' +
  afterAudit;

// Guardar
fs.writeFileSync(metaPath, newContent, 'utf8');

console.log('✅ altaEmpresa agregado a workflows principales');
console.log('✅ modulosPrueba agregado a workflows principales');
console.log('\n📍 Ubicación: Antes de auditExecution en la sección workflows');
console.log('\n✅ COMPLETADO - Recarga el panel-administrativo para ver los cambios\n');
