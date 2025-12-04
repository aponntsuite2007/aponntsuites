// Script para verificar estado del módulo legal
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.POSTGRES_DB,
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASSWORD,
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

async function checkLegalModule() {
    try {
        console.log('=== VERIFICACIÓN MÓDULO LEGAL ===\n');

        // 1. Verificar tablas legal
        const [tables] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE '%legal%'
            ORDER BY table_name
        `);
        console.log('1. TABLAS LEGAL:');
        if (tables.length > 0) {
            tables.forEach(t => console.log('   ✅', t.table_name));
        } else {
            console.log('   ❌ NO EXISTEN TABLAS LEGAL');
        }

        // 2. Verificar módulo en system_modules
        const [legalModule] = await sequelize.query(`
            SELECT module_key, name, is_active, category
            FROM system_modules
            WHERE module_key LIKE '%legal%'
        `);
        console.log('\n2. MÓDULOS LEGAL EN system_modules:');
        if (legalModule.length > 0) {
            legalModule.forEach(m => console.log('   ✅', m.module_key, '-', m.name, '- Activo:', m.is_active));
        } else {
            console.log('   ❌ NO HAY MÓDULOS LEGAL EN system_modules');
        }

        // 3. Verificar si alguna empresa tiene legal-dashboard contratado
        const [contracted] = await sequelize.query(`
            SELECT c.name as company_name, sm.module_key, cm.activo
            FROM company_modules cm
            JOIN companies c ON cm.company_id = c.company_id
            JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE sm.module_key LIKE '%legal%'
        `);
        console.log('\n3. EMPRESAS CON MÓDULOS LEGAL:');
        if (contracted.length > 0) {
            contracted.forEach(c => console.log('   ✅', c.company_name, '-', c.module_key, '- Activo:', c.activo));
        } else {
            console.log('   ❌ NINGUNA EMPRESA TIENE LEGAL CONTRATADO');
        }

        // 4. Verificar si existe en modules-registry.json
        console.log('\n4. ESTADO EN modules-registry.json:');
        try {
            const registry = require('../src/config/modules-registry.json');
            const legalInRegistry = registry.modules?.find(m => m.key === 'legal-dashboard');
            if (legalInRegistry) {
                console.log('   ✅ legal-dashboard encontrado en registry');
                console.log('      - is_core:', legalInRegistry.is_core);
                console.log('      - base_price:', legalInRegistry.base_price);
                console.log('      - category:', legalInRegistry.category);
            } else {
                console.log('   ⚠️ legal-dashboard NO está en modules array');
            }
        } catch (e) {
            console.log('   ❌ Error leyendo registry:', e.message);
        }

        console.log('\n=== FIN VERIFICACIÓN ===');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

checkLegalModule();
