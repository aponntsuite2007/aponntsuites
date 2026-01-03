/**
 * Activar rutas de finanzas en server.js
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server.js');

console.log('💰 Activando rutas de Finanzas en server.js...');

let content = fs.readFileSync(filePath, 'utf8');

// 1. Agregar require de financeRoutes después de procurementRoutes
const requireSection = `// 🛒 IMPORTAR RUTAS DE PROCUREMENT P2P (Compras y Proveedores)
const procurementRoutes = require('./src/routes/procurementRoutes');`;

const requireSectionNew = `// 🛒 IMPORTAR RUTAS DE PROCUREMENT P2P (Compras y Proveedores)
const procurementRoutes = require('./src/routes/procurementRoutes');

// 💰 IMPORTAR RUTAS DE FINANZAS (Finance Enterprise)
const financeRoutes = require('./src/routes/financeRoutes');`;

if (content.includes('const financeRoutes = require')) {
    console.log('⚠️ financeRoutes ya está importado');
} else if (content.includes(requireSection)) {
    content = content.replace(requireSection, requireSectionNew);
    console.log('✅ require() de financeRoutes agregado');
} else {
    console.log('❌ No se encontró la sección de requires');
}

// 2. Agregar app.use de financeRoutes después de procurement
const appUseSection = `// 🛒 PROCUREMENT P2P (Compras y Proveedores) - Enero 2026
app.use('/api/procurement', procurementRoutes);`;

const appUseSectionNew = `// 🛒 PROCUREMENT P2P (Compras y Proveedores) - Enero 2026
app.use('/api/procurement', procurementRoutes);

// 💰 FINANCE ENTERPRISE (Finanzas Empresariales) - Enero 2026
app.use('/api/finance', financeRoutes);
console.log('💰 [FINANCE] Rutas de finanzas configuradas: /api/finance/*');`;

if (content.includes("app.use('/api/finance'")) {
    console.log('⚠️ app.use de financeRoutes ya está registrado');
} else if (content.includes(appUseSection)) {
    content = content.replace(appUseSection, appUseSectionNew);
    console.log('✅ app.use() de financeRoutes agregado');
} else {
    console.log('❌ No se encontró la sección de app.use');
}

// 3. Guardar cambios
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n🎉 Rutas de Finanzas activadas correctamente');
console.log('   📍 Rutas disponibles:');
console.log('      - /api/finance/dashboard');
console.log('      - /api/finance/accounts');
console.log('      - /api/finance/budget');
console.log('      - /api/finance/treasury');
console.log('      - /api/finance/reports');
console.log('      - /api/finance/status');
console.log('      - /api/finance/integrations');
console.log('\n   🔄 Reiniciar servidor para aplicar cambios');
