// Asignar todos los módulos a la empresa 4
const { Sequelize } = require('sequelize');

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

async function assignAllModulesCompany4() {
    try {
        console.log('🔄 Conectando a PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ Conectado exitosamente');

        const companyId = 4;

        // Obtener todos los módulos del sistema
        const allModules = await sequelize.query(`
            SELECT id, module_key, name
            FROM system_modules
            ORDER BY module_key
        `, { type: sequelize.QueryTypes.SELECT });

        console.log(`📦 Módulos disponibles: ${allModules.length}`);
        allModules.forEach(module => {
            console.log(`   ${module.module_key} - ${module.name}`);
        });

        // Verificar módulos ya asignados
        const existingAssignments = await sequelize.query(`
            SELECT system_module_id
            FROM company_modules
            WHERE company_id = ?
        `, {
            replacements: [companyId],
            type: sequelize.QueryTypes.SELECT
        });

        const existingIds = new Set(existingAssignments.map(a => a.system_module_id));
        console.log(`🔍 Módulos ya asignados: ${existingIds.size}`);

        // Asignar módulos faltantes
        let newAssignments = 0;
        for (const module of allModules) {
            if (!existingIds.has(module.id)) {
                try {
                    await sequelize.query(`
                        INSERT INTO company_modules (
                            company_id,
                            system_module_id,
                            precio_mensual,
                            activo,
                            fecha_asignacion
                        ) VALUES (?, ?, ?, ?, NOW())
                    `, {
                        replacements: [companyId, module.id, 100.00, true]
                    });
                    console.log(`✅ ${module.module_key} asignado`);
                    newAssignments++;
                } catch (error) {
                    console.warn(`❌ Error asignando ${module.module_key}:`, error.message);
                }
            } else {
                console.log(`⚠️ ${module.module_key} ya asignado`);
            }
        }

        // Verificar resultado
        const finalCount = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM company_modules
            WHERE company_id = ?
        `, {
            replacements: [companyId],
            type: sequelize.QueryTypes.SELECT
        });

        console.log(`\n✅ Proceso completado`);
        console.log(`   📦 Nuevas asignaciones: ${newAssignments}`);
        console.log(`   🏢 Total módulos asignados a empresa ${companyId}: ${finalCount[0].count}`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await sequelize.close();
        console.log('🔐 Conexión cerrada');
    }
}

// Ejecutar
if (require.main === module) {
    assignAllModulesCompany4()
        .then(() => {
            console.log('\n🎉 ASIGNACIÓN COMPLETADA');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 FALLO:', error.message);
            process.exit(1);
        });
}

module.exports = { assignAllModulesCompany4 };