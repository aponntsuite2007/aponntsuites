/**
 * Script para crear sistema de plantillas fiscales
 * Matriz impositiva configurable por país
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

async function createTaxTemplatesSystem() {
    try {
        console.log('🔄 Conectando a PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ Conexión establecida');

        // Leer archivo SQL de plantillas fiscales
        const sqlFile = path.join(__dirname, '../sql/003_create_tax_templates.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        console.log('🔄 Ejecutando script de plantillas fiscales...');

        // Ejecutar SQL completo
        await sequelize.query(sqlContent);

        console.log('✅ Sistema de plantillas fiscales creado exitosamente');

        // Verificar tablas creadas
        const [tables] = await sequelize.query(`
            SELECT table_name,
                   (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public'
            AND (table_name LIKE 'tax_%' OR table_name LIKE 'company_tax_%')
            ORDER BY table_name;
        `);

        console.log('📋 Tablas de Sistema Fiscal:');
        tables.forEach(table => {
            console.log(`   ✓ ${table.table_name} (${table.column_count} columnas)`);
        });

        // Verificar datos iniciales
        const [templates] = await sequelize.query(`
            SELECT tt.country, tt.country_code, tt.template_name,
                   COUNT(tc.id) as conditions_count
            FROM tax_templates tt
            LEFT JOIN tax_conditions tc ON tc.tax_template_id = tt.id
            GROUP BY tt.id, tt.country, tt.country_code, tt.template_name
            ORDER BY tt.country;
        `);

        console.log('🏛️ Plantillas Fiscales Iniciales:');
        templates.forEach(template => {
            console.log(`   🇦🇷 ${template.country} (${template.country_code}): ${template.conditions_count} condiciones`);
        });

        // Test de función de configuración
        console.log('🧪 Testeando función de configuración...');

        // Primero, crear una configuración de prueba para empresa 21
        await sequelize.query(`
            INSERT INTO company_tax_config (company_id, tax_template_id, custom_tax_id, custom_condition_code)
            SELECT 21, tt.id, '20-12345678-9', 'RI'
            FROM tax_templates tt
            WHERE tt.country_code = 'ARG'
            ON CONFLICT (company_id) DO NOTHING;
        `);

        try {
            const [configTest] = await sequelize.query(`
                SELECT * FROM get_company_tax_configuration(21);
            `);

            if (configTest.length > 0) {
                console.log('✅ Test de función exitoso:', {
                    país: configTest[0].template_country,
                    plantilla: configTest[0].template_name,
                    campo_tributario: configTest[0].tax_id_field_name,
                    formato: configTest[0].tax_id_format
                });
            } else {
                console.log('⚠️ No se encontró configuración para empresa 21');
            }
        } catch (testError) {
            console.log('⚠️ Test de función falló:', testError.message);
        }

        console.log('🎉 ¡Sistema de Plantillas Fiscales implementado exitosamente!');

        // Estadísticas finales
        const [stats] = await sequelize.query(`
            SELECT
                (SELECT count(*) FROM tax_templates WHERE is_active = true) as plantillas_activas,
                (SELECT count(*) FROM tax_conditions WHERE is_active = true) as condiciones_totales,
                (SELECT count(*) FROM tax_concepts WHERE is_active = true) as conceptos_totales,
                (SELECT count(*) FROM company_tax_config WHERE is_active = true) as empresas_configuradas;
        `);

        console.log('📊 Estadísticas del Sistema Fiscal:');
        console.log(`   🏛️ Plantillas activas: ${stats[0].plantillas_activas}`);
        console.log(`   📋 Condiciones totales: ${stats[0].condiciones_totales}`);
        console.log(`   💰 Conceptos fiscales: ${stats[0].conceptos_totales}`);
        console.log(`   🏢 Empresas configuradas: ${stats[0].empresas_configuradas}`);

    } catch (error) {
        console.error('❌ Error creando sistema de plantillas fiscales:', error.message);

        // Diagnóstico adicional
        if (error.message.includes('syntax error')) {
            console.error('💡 Probable error de sintaxis SQL. Revisar archivo 003_create_tax_templates.sql');
        }

        if (error.message.includes('does not exist')) {
            console.error('💡 Probable tabla faltante. Verificar estructura de base de datos');
        }
    } finally {
        await sequelize.close();
        console.log('🔒 Conexión cerrada');
    }
}

// Ejecutar script
createTaxTemplatesSystem();