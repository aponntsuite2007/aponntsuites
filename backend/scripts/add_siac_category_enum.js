/**
 * Script para agregar la categoría 'siac' al ENUM de system_modules
 * Este script actualiza el ENUM existente en PostgreSQL
 */

const { Sequelize } = require('sequelize');

// Configurar conexión a PostgreSQL
const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        dialect: 'postgres',
        logging: console.log
    }
);

async function addSiacCategoryEnum() {
    try {
        console.log('🔧 Agregando categoría SIAC al ENUM de system_modules...\n');

        // Verificar conexión
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL establecida');

        // Agregar 'siac' al ENUM existente
        console.log('📝 Ejecutando ALTER TYPE para agregar categoría "siac"...');

        await sequelize.query(`
            ALTER TYPE "enum_system_modules_category"
            ADD VALUE 'siac';
        `);

        console.log('✅ Categoría "siac" agregada exitosamente al ENUM');

        // Verificar que se agregó correctamente
        const enumValues = await sequelize.query(`
            SELECT enumlabel
            FROM pg_enum
            WHERE enumtypid = (
                SELECT oid
                FROM pg_type
                WHERE typname = 'enum_system_modules_category'
            )
            ORDER BY enumlabel;
        `, { type: Sequelize.QueryTypes.SELECT });

        console.log('\n📋 Valores actuales del ENUM:');
        enumValues.forEach(value => {
            console.log(`   • ${value.enumlabel}`);
        });

        console.log('\n🎉 ¡ENUM actualizado exitosamente!');
        return true;

    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('⚠️ La categoría "siac" ya existe en el ENUM');
            return true;
        } else {
            console.error('❌ Error actualizando ENUM:', error);
            throw error;
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    addSiacCategoryEnum()
        .then(() => {
            console.log('\n✅ Script completado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Error:', error.message);
            process.exit(1);
        });
}

module.exports = addSiacCategoryEnum;