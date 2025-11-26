/**
 * Script para reemplazar renderGanttView() con renderCriticalPathView()
 */

const fs = require('fs');
const path = require('path');

const engineeringDashboardPath = path.join(__dirname, '../public/js/modules/engineering-dashboard.js');
const criticalPathUIPath = path.join(__dirname, '../public/js/modules/critical-path-ui.js');

console.log('🔧 Reemplazando Gantt con Camino Crítico...\n');

// Leer archivos
const dashboardContent = fs.readFileSync(engineeringDashboardPath, 'utf8');
const criticalPathContent = fs.readFileSync(criticalPathUIPath, 'utf8');

// Extraer la función renderCriticalPathView del archivo critical-path-ui.js
const functionMatch = criticalPathContent.match(/async function renderCriticalPathView\(\) \{[\s\S]*?\n\}/);

if (!functionMatch) {
  console.error('❌ No se pudo extraer la función renderCriticalPathView');
  process.exit(1);
}

let newFunction = functionMatch[0];

// Convertir a método de clase
newFunction = newFunction.replace('async function renderCriticalPathView()', 'async renderCriticalPathView()');

// Buscar y reemplazar la función completa (desde línea 1449 hasta 1820)
const ganttRegex = /\/\*\*\s*\n\s*\* VISTA: Gantt Chart.*?\n\s*\*\/\s*\n\s*renderGanttView\(\) \{[\s\S]*?\n  \},\s*\n/;

if (!ganttRegex.test(dashboardContent)) {
  console.error('❌ No se encontró la función renderGanttView completa');
  process.exit(1);
}

// Reemplazar
const newContent = dashboardContent.replace(ganttRegex, `/**
   * VISTA: Camino Crítico - CPM/PERT Analysis
   */
  ${newFunction},

`);

// Verificar que se hizo el cambio
if (newContent === dashboardContent) {
  console.error('❌ No se realizó ningún cambio');
  process.exit(1);
}

// Guardar
fs.writeFileSync(engineeringDashboardPath, newContent, 'utf8');

console.log('✅ Función renderGanttView() eliminada');
console.log('✅ Función renderCriticalPathView() agregada');
console.log('✅ Archivo actualizado: engineering-dashboard.js\n');

// Estadísticas
const oldLines = dashboardContent.split('\n').length;
const newLines = newContent.split('\n').length;
const linesRemoved = oldLines - newLines;

console.log(`📊 Estadísticas:`);
console.log(`   - Líneas antes: ${oldLines}`);
console.log(`   - Líneas después: ${newLines}`);
console.log(`   - Líneas eliminadas: ${linesRemoved > 0 ? linesRemoved : 0}`);
console.log(`   - Líneas agregadas: ${linesRemoved < 0 ? Math.abs(linesRemoved) : 0}\n`);

console.log('🎉 ¡Reemplazo completado exitosamente!');
