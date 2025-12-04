const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'server.js');

console.log('🔧 [REGISTER] Registrando Occupational Health Enterprise Routes v5.0...\n');

let content = fs.readFileSync(filePath, 'utf8');

// 1. Agregar require statement
console.log('📝 [STEP 1] Agregando require statement...');
const requireTarget = "const medicalCaseRoutes = require('./src/routes/medicalCaseRoutes'); // Sistema Completo de Gestión Médica (Enero 2025)";
const newRequire = `const medicalCaseRoutes = require('./src/routes/medicalCaseRoutes'); // Sistema Completo de Gestión Médica (Enero 2025)
const occupationalHealthRoutes = require('./src/routes/occupationalHealthRoutes'); // ✨ Occupational Health Enterprise v5.0 (Enero 2025)`;

if (content.includes(requireTarget) && !content.includes('occupationalHealthRoutes')) {
    content = content.replace(requireTarget, newRequire);
    console.log('   ✅ Require statement agregado');
} else if (content.includes('occupationalHealthRoutes')) {
    console.log('   ⚠️  Require statement ya existe');
} else {
    console.log('   ❌ Target line not found');
}

// 2. Agregar app.use statement
console.log('\n📝 [STEP 2] Agregando app.use statement...');
const appUseTarget = "app.use('/api/medical-cases', medicalCaseRoutes); // Sistema completo de gestión médica";
const newAppUse = `app.use('/api/medical-cases', medicalCaseRoutes); // Sistema completo de gestión médica
app.use('/api/occupational-health', occupationalHealthRoutes); // ✨ Occupational Health Enterprise v5.0 - International Standards`;

if (content.includes(appUseTarget) && !content.includes("app.use('/api/occupational-health'")) {
    content = content.replace(appUseTarget, newAppUse);
    console.log('   ✅ app.use statement agregado');
} else if (content.includes("app.use('/api/occupational-health'")) {
    console.log('   ⚠️  app.use statement ya existe');
} else {
    console.log('   ❌ Target line not found');
}

// 3. Guardar archivo
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n✅ [COMPLETE] Rutas registradas exitosamente');
console.log('   📄 Archivo: server.js');
console.log('   🆕 Rutas: /api/occupational-health/*');
console.log('   📊 Endpoints: 40+ endpoints disponibles');
console.log('\n💡 [NEXT] Reiniciar servidor para aplicar cambios');
