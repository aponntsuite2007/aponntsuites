/**
 * Test rápido para verificar si database.AuditLog es accesible
 */

const database = require('./src/config/database');

console.log('\n=== TEST DE IMPORT DATABASE ===\n');

console.log('1. database object:', typeof database);
console.log('2. database keys:', Object.keys(database).slice(0, 10).join(', '), '...');
console.log('3. database.AuditLog:', typeof database.AuditLog);
console.log('4. database.AuditLog es undefined?', database.AuditLog === undefined);

if (database.AuditLog) {
    console.log('✅ AuditLog está disponible');
    console.log('5. AuditLog.name:', database.AuditLog.name);
} else {
    console.log('❌ AuditLog NO está disponible');
}

// Listar todos los modelos disponibles
const models = Object.keys(database).filter(key => {
    const value = database[key];
    return value && value.name && value.name !== 'Sequelize';
});

console.log(`\n6. Total modelos disponibles: ${models.length}`);
console.log('7. Primeros 10 modelos:', models.slice(0, 10).join(', '));

// Buscar específicamente AuditLog en la lista
const hasAuditLog = models.includes('AuditLog');
console.log('8. AuditLog está en la lista de modelos?', hasAuditLog);

process.exit(0);
