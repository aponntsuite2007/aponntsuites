/**
 * Script para convertir panel-administrativo.html a Dark Theme - PARTE 2
 * Ejecutar: node scripts/convert-to-dark-theme-part2.js
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/public/panel-administrativo.html');

console.log('🌙 Aplicando Dark Theme PARTE 2...\n');

let content = fs.readFileSync(filePath, 'utf8');

// ============================================================================
// REEMPLAZOS GLOBALES DE COLORES
// ============================================================================

// Todos los #f8f9fa restantes -> #21262d (fondo gris claro -> gris oscuro)
const countF8F9FA = (content.match(/#f8f9fa/g) || []).length;
content = content.replace(/#f8f9fa/g, '#21262d');
console.log(`✅ Reemplazados ${countF8F9FA} instancias de #f8f9fa -> #21262d`);

// Todos los #e9ecef -> #30363d (borde/fondo claro -> borde oscuro)
const countE9ECEF = (content.match(/#e9ecef/g) || []).length;
content = content.replace(/#e9ecef/g, '#30363d');
console.log(`✅ Reemplazados ${countE9ECEF} instancias de #e9ecef -> #30363d`);

// Todos los white restantes en background
const countWhite = (content.match(/background:\s*white/g) || []).length;
content = content.replace(/background:\s*white/g, 'background: #161b22');
console.log(`✅ Reemplazados ${countWhite} instancias de background: white -> #161b22`);

// Todos los #fff -> #161b22
const countFFF = (content.match(/background:\s*#fff([^f]|$)/g) || []).length;
content = content.replace(/background:\s*#fff([^f]|$)/g, 'background: #161b22$1');
console.log(`✅ Reemplazados ${countFFF} instancias de #fff`);

// Todos los color: #666 -> #8b949e
const count666 = (content.match(/color:\s*#666/g) || []).length;
content = content.replace(/color:\s*#666/g, 'color: #8b949e');
console.log(`✅ Reemplazados ${count666} instancias de color: #666 -> #8b949e`);

// Todos los color: #333 -> #e6edf3
const count333 = (content.match(/color:\s*#333/g) || []).length;
content = content.replace(/color:\s*#333/g, 'color: #e6edf3');
console.log(`✅ Reemplazados ${count333} instancias de color: #333 -> #e6edf3`);

// Todos los color: #555 -> #c9d1d9
const count555 = (content.match(/color:\s*#555/g) || []).length;
content = content.replace(/color:\s*#555/g, 'color: #c9d1d9');
console.log(`✅ Reemplazados ${count555} instancias de color: #555 -> #c9d1d9`);

// Todos los border: 1px solid #ddd -> border: 1px solid #30363d
const countDDD = (content.match(/border:\s*1px\s+solid\s+#ddd/g) || []).length;
content = content.replace(/border:\s*1px\s+solid\s+#ddd/g, 'border: 1px solid #30363d');
console.log(`✅ Reemplazados ${countDDD} instancias de #ddd -> #30363d en borders`);

// Todos los #f0f0f0 -> #30363d
const countF0F0F0 = (content.match(/#f0f0f0/g) || []).length;
content = content.replace(/#f0f0f0/g, '#30363d');
console.log(`✅ Reemplazados ${countF0F0F0} instancias de #f0f0f0 -> #30363d`);

// Todos los #dee2e6 -> #30363d
const countDEE2E6 = (content.match(/#dee2e6/g) || []).length;
content = content.replace(/#dee2e6/g, '#30363d');
console.log(`✅ Reemplazados ${countDEE2E6} instancias de #dee2e6 -> #30363d`);

// Todos los #f5f5f5 -> #21262d
const countF5F5F5 = (content.match(/#f5f5f5/g) || []).length;
content = content.replace(/#f5f5f5/g, '#21262d');
console.log(`✅ Reemplazados ${countF5F5F5} instancias de #f5f5f5 -> #21262d`);

// Todos los #e1e1e1 -> #30363d
const countE1E1E1 = (content.match(/#e1e1e1/g) || []).length;
content = content.replace(/#e1e1e1/g, '#30363d');
console.log(`✅ Reemplazados ${countE1E1E1} instancias de #e1e1e1 -> #30363d`);

// Todos los #ccc -> #30363d
const countCCC = (content.match(/#ccc/g) || []).length;
content = content.replace(/#ccc/g, '#30363d');
console.log(`✅ Reemplazados ${countCCC} instancias de #ccc -> #30363d`);

// Todos los color: #495057 -> #e6edf3
const count495 = (content.match(/color:\s*#495057/g) || []).length;
content = content.replace(/color:\s*#495057/g, 'color: #e6edf3');
console.log(`✅ Reemplazados ${count495} instancias de color: #495057 -> #e6edf3`);

// Todos los color: #343a40 -> #e6edf3
const count343 = (content.match(/color:\s*#343a40/g) || []).length;
content = content.replace(/color:\s*#343a40/g, 'color: #e6edf3');
console.log(`✅ Reemplazados ${count343} instancias de color: #343a40 -> #e6edf3`);

// Todos los #6c757d -> #8b949e (gris medio)
const count6C7 = (content.match(/color:\s*#6c757d/g) || []).length;
content = content.replace(/color:\s*#6c757d/g, 'color: #8b949e');
console.log(`✅ Reemplazados ${count6C7} instancias de color: #6c757d -> #8b949e`);

// Gradientes claros -> oscuros
// #e3f2fd, #bbdefb -> tonos azul oscuro
const countBlueGrad = (content.match(/linear-gradient\(135deg,\s*#e3f2fd,\s*#bbdefb\)/g) || []).length;
content = content.replace(/linear-gradient\(135deg,\s*#e3f2fd,\s*#bbdefb\)/g, 'linear-gradient(135deg, #1a2744, #152033)');
console.log(`✅ Reemplazados ${countBlueGrad} gradientes azul claro`);

// #fff3cd, #ffeaa7 -> tonos amarillo oscuro
const countYellowGrad = (content.match(/linear-gradient\(135deg,\s*#fff3cd,\s*#ffeaa7\)/g) || []).length;
content = content.replace(/linear-gradient\(135deg,\s*#fff3cd,\s*#ffeaa7\)/g, 'linear-gradient(135deg, #3d2e0f, #2d2105)');
console.log(`✅ Reemplazados ${countYellowGrad} gradientes amarillo claro`);

// #e8f5e8, #c8e6c9 -> tonos verde oscuro
const countGreenGrad = (content.match(/linear-gradient\(135deg,\s*#e8f5e8,\s*#c8e6c9\)/g) || []).length;
content = content.replace(/linear-gradient\(135deg,\s*#e8f5e8,\s*#c8e6c9\)/g, 'linear-gradient(135deg, #1a2e1a, #152615)');
console.log(`✅ Reemplazados ${countGreenGrad} gradientes verde claro`);

// #ffebee, #ffcdd2 -> tonos rojo oscuro
const countRedGrad = (content.match(/linear-gradient\(135deg,\s*#ffebee,\s*#ffcdd2\)/g) || []).length;
content = content.replace(/linear-gradient\(135deg,\s*#ffebee,\s*#ffcdd2\)/g, 'linear-gradient(135deg, #3d1f1f, #2d1515)');
console.log(`✅ Reemplazados ${countRedGrad} gradientes rojo claro`);

// Backgrounds con #e8f5e8 -> #1a2e1a (verde)
const countE8F5E8 = (content.match(/#e8f5e8/g) || []).length;
content = content.replace(/#e8f5e8/g, '#1a2e1a');
console.log(`✅ Reemplazados ${countE8F5E8} instancias de #e8f5e8 -> #1a2e1a`);

// Backgrounds con #ffebee -> #3d1f1f (rojo)
const countFFEBEE = (content.match(/#ffebee/g) || []).length;
content = content.replace(/#ffebee/g, '#3d1f1f');
console.log(`✅ Reemplazados ${countFFEBEE} instancias de #ffebee -> #3d1f1f`);

// Backgrounds con #fff5f5 -> #2d1f1f
const countFFF5F5 = (content.match(/#fff5f5/g) || []).length;
content = content.replace(/#fff5f5/g, '#2d1f1f');
console.log(`✅ Reemplazados ${countFFF5F5} instancias de #fff5f5 -> #2d1f1f`);

// Color #2e7d32 (verde éxito light) -> #3fb950
const count2E7 = (content.match(/#2e7d32/g) || []).length;
content = content.replace(/#2e7d32/g, '#3fb950');
console.log(`✅ Reemplazados ${count2E7} instancias de #2e7d32 -> #3fb950`);

// Color #d32f2f (rojo error light) -> #f85149
const countD32 = (content.match(/#d32f2f/g) || []).length;
content = content.replace(/#d32f2f/g, '#f85149');
console.log(`✅ Reemplazados ${countD32} instancias de #d32f2f -> #f85149`);

// Sombras más oscuras
content = content.replace(/rgba\(0,\s*0,\s*0,\s*0\.05\)/g, 'rgba(0,0,0,0.2)');
content = content.replace(/rgba\(0,\s*0,\s*0,\s*0\.08\)/g, 'rgba(0,0,0,0.3)');
content = content.replace(/rgba\(0,\s*0,\s*0,\s*0\.1\)/g, 'rgba(0,0,0,0.3)');
content = content.replace(/rgba\(0,\s*0,\s*0,\s*0\.15\)/g, 'rgba(0,0,0,0.4)');
console.log('✅ Ajustadas sombras para mayor contraste en dark mode');

// ============================================================================
// GUARDAR ARCHIVO
// ============================================================================

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n' + '='.repeat(60));
console.log('🌙 DARK THEME PARTE 2 APLICADO');
console.log('='.repeat(60));
console.log('\n🔄 Recarga la página con CTRL+F5 para ver los cambios');
