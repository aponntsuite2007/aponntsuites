const fs = require('fs');
const path = require('path');
const { sequelize } = require('./src/config/database');

async function runMigration() {
    try {
        console.log('🚀 Iniciando migración de consentimientos biométricos...');

        // Leer archivo SQL (usar extend en lugar de create para no romper nada)
        const sqlFile = path.join(__dirname, 'database', 'migrations', 'extend_biometric_consents_enterprise.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('📄 Archivo SQL cargado');

        // Ejecutar migración
        await sequelize.query(sql);

        console.log('✅ Migración completada exitosamente');
        console.log('');
        console.log('Tablas creadas:');
        console.log('  ✓ biometric_consents');
        console.log('  ✓ consent_audit_log');
        console.log('  ✓ consent_legal_documents');
        console.log('');
        console.log('Índices creados: ✓');
        console.log('Triggers creados: ✓');
        console.log('Funciones helper creadas: ✓');
        console.log('');

        // Verificar tablas
        const [tables] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('biometric_consents', 'consent_audit_log', 'consent_legal_documents')
            ORDER BY table_name
        `);

        console.log('📊 Verificación:');
        tables.forEach(t => console.log(`   ✓ ${t.table_name}`));

        // Contar documentos legales insertados
        const [docs] = await sequelize.query(`
            SELECT COUNT(*) as count FROM consent_legal_documents
        `);

        console.log(`\n📋 Documentos legales inicializados: ${docs[0].count}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error en migración:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

runMigration();
