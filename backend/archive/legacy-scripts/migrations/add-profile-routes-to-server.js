/**
 * SCRIPT: Agregar rutas de perfil de empleado al server.js
 */

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');

console.log('📝 Leyendo server.js...\n');
let serverContent = fs.readFileSync(serverPath, 'utf-8');

// Buscar donde agregar las importaciones
const importMarker = "const adminMigrationsRoutes = require('./src/routes/admin-migrations');";
const importInsert = `const adminMigrationsRoutes = require('./src/routes/admin-migrations');

// 👤 IMPORTAR RUTAS DE PERFIL DE EMPLEADO COMPLETO (Enero 2025)
const userProfileRoutes = require('./src/routes/userProfileRoutes');
const userMedicalRoutes = require('./src/routes/userMedicalRoutes');
const userAdminRoutes = require('./src/routes/userAdminRoutes');`;

// Buscar donde agregar los app.use
const routesMarker = "app.use('/api/v1/admin/migrations', adminMigrationsRoutes); // Endpoints administrativos de migraciones";
const routesInsert = `app.use('/api/v1/admin/migrations', adminMigrationsRoutes); // Endpoints administrativos de migraciones

// 👤 Configurar rutas de perfil de empleado (Enero 2025)
app.use('/api/v1/user-profile', userProfileRoutes); // Historial laboral, educación, familia
app.use('/api/v1/user-medical', userMedicalRoutes); // Antecedentes médicos completos
app.use('/api/v1/user-admin', userAdminRoutes); // Documentos, permisos, disciplinarios`;

// Verificar si ya existen las rutas
if (serverContent.includes('userProfileRoutes')) {
    console.log('⚠️  Las rutas ya están agregadas en server.js');
    process.exit(0);
}

console.log('✏️  Agregando importaciones de rutas...');
serverContent = serverContent.replace(importMarker, importInsert);

console.log('✏️  Agregando app.use() para las rutas...');
serverContent = serverContent.replace(routesMarker, routesInsert);

console.log('💾 Guardando server.js actualizado...\n');
fs.writeFileSync(serverPath, serverContent, 'utf-8');

console.log('✅ Rutas agregadas exitosamente!\n');
console.log('📍 Endpoints disponibles:');
console.log('   - /api/v1/user-profile/:userId/work-history');
console.log('   - /api/v1/user-profile/:userId/marital-status');
console.log('   - /api/v1/user-profile/:userId/children');
console.log('   - /api/v1/user-profile/:userId/family-members');
console.log('   - /api/v1/user-profile/:userId/education');
console.log('');
console.log('   - /api/v1/user-medical/:userId/primary-physician');
console.log('   - /api/v1/user-medical/:userId/chronic-conditions');
console.log('   - /api/v1/user-medical/:userId/medications');
console.log('   - /api/v1/user-medical/:userId/allergies');
console.log('   - /api/v1/user-medical/:userId/activity-restrictions');
console.log('   - /api/v1/user-medical/:userId/work-restrictions');
console.log('   - /api/v1/user-medical/:userId/vaccinations');
console.log('   - /api/v1/user-medical/:userId/medical-exams');
console.log('   - /api/v1/user-medical/:userId/medical-documents');
console.log('');
console.log('   - /api/v1/user-admin/:userId/documents');
console.log('   - /api/v1/user-admin/:userId/permissions');
console.log('   - /api/v1/user-admin/:userId/disciplinary');
console.log('');
console.log('🔄 Recuerda reiniciar el servidor para que los cambios tomen efecto');
console.log('');
