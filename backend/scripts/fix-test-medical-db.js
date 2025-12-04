const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'test-medical-simple.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 [FIX] Actualizando configuración de BD...');

// Reemplazar la configuración de BD
content = content.replace(
    /const DATABASE_URL = process\.env\.DATABASE_URL_RENDER \|\|[\s\S]*?;/,
    `// Conexión local PostgreSQL
const sequelizeConfig = {
    database: 'attendance_system',
    username: 'postgres',
    password: 'root',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
};`
);

content = content.replace(
    /sequelize = new Sequelize\(DATABASE_URL, \{[\s\S]*?\}\);/,
    'sequelize = new Sequelize(sequelizeConfig);'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ [FIX] Configuración de BD actualizada');
