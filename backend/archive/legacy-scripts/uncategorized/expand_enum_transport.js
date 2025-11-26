// ============================================
// PANEL-TRANSPORTE - EXPANDIR ENUM CATEGORY
// ============================================
// 📅 Fecha: 2025-09-23
// 🎯 Objetivo: Expandir ENUM category para incluir 'transport'

const { Sequelize } = require('sequelize');

// Configuración directa de PostgreSQL
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'attendance_system',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    timezone: '+00:00'
  }
);

async function expandEnum() {
    try {
        console.log('🔄 [ENUM] Conectando a PostgreSQL...');

        await sequelize.authenticate();
        console.log('✅ [ENUM] Conectado exitosamente');

        // Verificar los valores actuales del ENUM
        console.log('🔍 [ENUM] Verificando valores actuales del ENUM category...');
        const enumValues = await sequelize.query(
            `SELECT unnest(enum_range(NULL::enum_system_modules_category)) as enum_value`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log('📋 [ENUM] Valores actuales:', enumValues.map(v => v.enum_value));

        // Verificar si 'transport' ya existe
        const hasTransport = enumValues.some(v => v.enum_value === 'transport');

        if (hasTransport) {
            console.log('✅ [ENUM] El valor "transport" ya existe en el ENUM');
        } else {
            console.log('🔄 [ENUM] Agregando "transport" al ENUM category...');

            // Expandir el ENUM para incluir 'transport'
            await sequelize.query(`
                ALTER TYPE enum_system_modules_category ADD VALUE 'transport';
            `);

            console.log('✅ [ENUM] Valor "transport" agregado exitosamente');

            // Verificar que se agregó correctamente
            const newEnumValues = await sequelize.query(
                `SELECT unnest(enum_range(NULL::enum_system_modules_category)) as enum_value`,
                { type: sequelize.QueryTypes.SELECT }
            );

            console.log('📋 [ENUM] Valores actualizados:', newEnumValues.map(v => v.enum_value));
        }

        console.log('🎯 [ENUM] ENUM expandido exitosamente');

    } catch (error) {
        console.error('❌ [ENUM] Error:', error);
        throw error;
    } finally {
        await sequelize.close();
        console.log('🔐 [ENUM] Conexión cerrada');
    }
}

// Ejecutar
if (require.main === module) {
    expandEnum()
        .then(() => {
            console.log('🎉 [ENUM] ENUM CATEGORY EXPANDIDO EXITOSAMENTE');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 [ENUM] FALLO:', error.message);
            process.exit(1);
        });
}

module.exports = { expandEnum };