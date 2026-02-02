/**
 * Script para agregar módulo Procurement a la base de datos
 */
const { sequelize } = require('../src/config/database');

async function addProcurementModule() {
    try {
        console.log('🔍 Verificando si existe el módulo procurement-management...');

        // Verificar si existe
        const [existing] = await sequelize.query(`
            SELECT id, module_key, name, rubro
            FROM modules
            WHERE module_key = 'procurement-management'
        `);

        if (existing.length > 0) {
            console.log('✅ Módulo ya existe:', existing[0]);
            return;
        }

        console.log('📦 Insertando módulo procurement-management...');

        // Insertar módulo
        await sequelize.query(`
            INSERT INTO modules (
                module_key,
                name,
                description,
                icon,
                rubro,
                category,
                is_active,
                frontend_file,
                init_function,
                created_at,
                updated_at
            ) VALUES (
                'procurement-management',
                'Compras y Proveedores',
                'Sistema P2P: solicitudes de compra, órdenes, recepción, facturación y pagos a proveedores.',
                'shopping-cart',
                'Compras y Proveedores',
                'additional',
                true,
                'js/modules/procurement-management.js',
                'showProcurementManagementContent',
                NOW(),
                NOW()
            )
        `);

        console.log('✅ Módulo insertado correctamente');

        // Verificar
        const [verify] = await sequelize.query(`
            SELECT id, module_key, name, rubro
            FROM modules
            WHERE module_key = 'procurement-management'
        `);
        console.log('🔍 Verificación:', verify[0]);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

addProcurementModule();
