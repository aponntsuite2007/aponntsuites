// Asignar todos los módulos a la empresa ISI
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

async function assignAllModulesISI() {
    try {
        console.log('🔄 Conectando a PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ Conectado exitosamente');

        // Buscar empresa ISI
        const isiCompany = await sequelize.query(`
            SELECT company_id, name FROM companies
            WHERE LOWER(name) LIKE '%isi%'
            ORDER BY id DESC LIMIT 1
        `, { type: sequelize.QueryTypes.SELECT });

        if (!isiCompany.length) {
            console.error('❌ No se encontró empresa ISI');
            return;
        }

        const companyId = isiCompany[0].id;
        console.log(`🏢 Empresa ISI encontrada: ${isiCompany[0].name} (ID: ${companyId})`);

        // Obtener todos los módulos del sistema
        const allModules = await sequelize.query(`
            SELECT id, module_key, name
            FROM system_modules
            ORDER BY module_key
        `, { type: sequelize.QueryTypes.SELECT });

        console.log(`📦 Total módulos disponibles: ${allModules.length}`);

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
        console.log(`🔍 Módulos ya asignados a ISI: ${existingIds.size}`);

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
                        replacements: [companyId, module.id, 120.00, true]
                    });
                    console.log(`✅ ${module.module_key} asignado a ISI`);
                    newAssignments++;
                } catch (error) {
                    console.warn(`❌ Error asignando ${module.module_key}:`, error.message);
                }
            } else {
                console.log(`⚠️ ${module.module_key} ya asignado a ISI`);
            }
        }

        // Verificar resultado final
        const finalCount = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM company_modules
            WHERE company_id = ?
        `, {
            replacements: [companyId],
            type: sequelize.QueryTypes.SELECT
        });

        console.log(`\n✅ Proceso completado para empresa ISI`);
        console.log(`   🆕 Nuevas asignaciones: ${newAssignments}`);
        console.log(`   📦 Total módulos asignados: ${finalCount[0].count}`);
        console.log(`   🏢 Empresa: ${isiCompany[0].name} (ID: ${companyId})`);

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
    assignAllModulesISI()
        .then(() => {
            console.log('\n🎉 TODOS LOS MÓDULOS ASIGNADOS A ISI');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 FALLO:', error.message);
            process.exit(1);
        });
}

module.exports = { assignAllModulesISI };