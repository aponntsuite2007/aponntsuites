/**
 * Verificar qué exporta database.js
 */
require('dotenv').config();

const database = require('./src/config/database');

console.log('\n📦 Verificando exports de database.js:\n');
console.log('✅ sequelize:', typeof database.sequelize);
console.log('✅ SystemModule:', typeof database.SystemModule);
console.log('✅ AssistantKnowledgeBase:', typeof database.AssistantKnowledgeBase);
console.log('✅ AuditLog:', typeof database.AuditLog);
console.log('✅ User:', typeof database.User);

console.log('\n📋 Todas las keys exportadas:');
console.log(Object.keys(database).sort());

process.exit(0);
