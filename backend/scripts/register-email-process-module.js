/**
 * Script para registrar el módulo de Asignación Email-Proceso
 * en system_modules y activarlo para todas las empresas
 */

require('dotenv').config();
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');

// Conectar a PostgreSQL
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

async function registerModule() {
    try {
        console.log('🔌 Conectando a PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL\n');

        // 1. Verificar si el módulo ya existe
        console.log('🔍 Verificando si el módulo ya existe...');
        const existing = await sequelize.query(`
            SELECT module_key, name FROM system_modules
            WHERE module_key = 'company-email-process'
        `, { type: QueryTypes.SELECT });

        if (existing.length > 0) {
            console.log('⚠️  Módulo ya existe en system_modules:');
            console.log('   Module Key:', existing[0].module_key);
            console.log('   Name:', existing[0].name);
            console.log('\n🔄 Actualizando módulo...');

            await sequelize.query(`
                UPDATE system_modules
                SET
                    name = 'Asignación de Emails a Procesos',
                    description = 'Configure qué email de la empresa se usa para cada proceso de notificación',
                    icon = '📧',
                    color = '#3b82f6',
                    category = 'admin',
                    is_core = TRUE,
                    is_active = TRUE,
                    base_price = 0,
                    display_order = 100,
                    rubro = 'Configuración',
                    available_in = 'company',
                    updated_at = NOW()
                WHERE module_key = 'company-email-process'
            `);

            console.log('✅ Módulo actualizado exitosamente\n');
        } else {
            console.log('➕ Módulo no existe, creando...');

            await sequelize.query(`
                INSERT INTO system_modules (
                    id,
                    module_key,
                    name,
                    description,
                    icon,
                    color,
                    category,
                    is_core,
                    is_active,
                    base_price,
                    display_order,
                    rubro,
                    available_in,
                    created_at,
                    updated_at
                ) VALUES (
                    gen_random_uuid(),
                    'company-email-process',
                    'Asignación de Emails a Procesos',
                    'Configure qué email de la empresa se usa para cada proceso de notificación',
                    '📧',
                    '#3b82f6',
                    'admin',
                    TRUE,
                    TRUE,
                    0,
                    100,
                    'Configuración',
                    'company',
                    NOW(),
                    NOW()
                )
            `);

            console.log('✅ Módulo creado exitosamente\n');
        }

        // 2. Activar para todas las empresas
        console.log('🔍 Verificando empresas...');
        const companies = await sequelize.query(`
            SELECT id, name FROM companies WHERE is_active = TRUE
        `, { type: QueryTypes.SELECT });

        console.log(`📊 Empresas activas: ${companies.length}\n`);

        for (const company of companies) {
            console.log(`🏢 Procesando empresa: ${company.name} (ID: ${company.id})`);

            // Verificar si ya está activado
            const companyModule = await sequelize.query(`
                SELECT id, is_active FROM company_modules
                WHERE company_id = :companyId
                AND module_key = 'company-email-process'
            `, {
                replacements: { companyId: company.id },
                type: QueryTypes.SELECT
            });

            if (companyModule.length > 0) {
                if (companyModule[0].is_active) {
                    console.log(`   ✅ Ya está activado (ID: ${companyModule[0].id})`);
                } else {
                    await sequelize.query(`
                        UPDATE company_modules
                        SET is_active = TRUE, updated_at = NOW()
                        WHERE id = :id
                    `, {
                        replacements: { id: companyModule[0].id }
                    });
                    console.log(`   🔄 Activado (estaba inactivo)`);
                }
            } else {
                await sequelize.query(`
                    INSERT INTO company_modules (
                        company_id,
                        module_key,
                        is_active,
                        activated_at,
                        created_at,
                        updated_at
                    ) VALUES (
                        :companyId,
                        'company-email-process',
                        TRUE,
                        NOW(),
                        NOW(),
                        NOW()
                    )
                `, {
                    replacements: { companyId: company.id }
                });
                console.log(`   ➕ Activado (nuevo)`);
            }
        }

        console.log('\n' + '═'.repeat(60));
        console.log('✅ REGISTRO COMPLETADO EXITOSAMENTE');
        console.log('═'.repeat(60));
        console.log('\n📊 Resumen:');
        console.log(`   • Módulo: company-email-process`);
        console.log(`   • Empresas activadas: ${companies.length}`);
        console.log(`   • Frontend: /company-email-process`);
        console.log(`   • Backend: /api/company-email-process`);
        console.log(`   • Pricing: GRATIS (módulo core)`);
        console.log('\n🎯 Próximo paso: Agregar al menú de panel-empresa.html');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

registerModule();
