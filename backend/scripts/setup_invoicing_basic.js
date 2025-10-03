/**
 * Script básico para configurar el módulo FACTURACIÓN
 * Solo crea estructura básica sin depender de clientes/productos
 */

const { Sequelize } = require('sequelize');

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

async function setupBasicInvoicing() {
    try {
        console.log('🏪 Configurando estructura básica del módulo FACTURACIÓN...\n');

        // 1. CREAR PUNTO DE VENTA PRINCIPAL
        console.log('📍 1. Creando punto de venta principal...');

        await sequelize.query(`
            INSERT INTO siac_puntos_venta (
                company_id, codigo_punto_venta, nombre_punto_venta, direccion,
                cuit_empresa, razon_social_empresa, condicion_iva,
                punto_venta_afip, activo, predeterminado, created_by
            ) VALUES (
                1, 'PV001', 'Punto de Venta Principal',
                'Av. Corrientes 1234, CABA, Argentina',
                '30-12345678-9', 'Mi Empresa S.A.', 'RESPONSABLE_INSCRIPTO',
                1, true, true, 1
            )
            ON CONFLICT (company_id, codigo_punto_venta) DO NOTHING;
        `);

        console.log('   ✅ Punto de venta principal creado');

        // 2. CREAR CAJAS
        console.log('\n🏪 2. Creando cajas...');

        const cajas = ['CAJA01', 'CAJA02', 'CAJAWEB'];
        const nombresBoxes = ['Caja Principal', 'Caja Express', 'Caja Web'];

        for (let i = 0; i < cajas.length; i++) {
            await sequelize.query(`
                INSERT INTO siac_cajas (
                    punto_venta_id, codigo_caja, nombre_caja, descripcion,
                    permite_cuenta_corriente, activo, predeterminada, created_by
                ) VALUES (
                    (SELECT id FROM siac_puntos_venta WHERE company_id = 1 AND codigo_punto_venta = 'PV001'),
                    $1, $2, $3,
                    $4, true, $5, 1
                )
                ON CONFLICT (punto_venta_id, codigo_caja) DO NOTHING;
            `, {
                bind: [
                    cajas[i],
                    nombresBoxes[i],
                    `${nombresBoxes[i]} para operaciones`,
                    i === 0, // Solo la primera permite cuenta corriente
                    i === 0  // Solo la primera es predeterminada
                ]
            });

            console.log(`   ✅ Caja: ${cajas[i]} - ${nombresBoxes[i]}`);
        }

        // 3. CONFIGURAR NUMERACIÓN
        console.log('\n🔢 3. Configurando numeración...');

        await sequelize.query(`
            INSERT INTO siac_numeracion_comprobantes (caja_id, tipo_comprobante_id, numero_actual, activo)
            SELECT c.id, t.id, 0, true
            FROM siac_cajas c
            JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
            CROSS JOIN siac_tipos_comprobantes t
            WHERE pv.company_id = 1 AND c.activo = true AND t.activo = true
            ON CONFLICT (caja_id, tipo_comprobante_id) DO NOTHING;
        `);

        console.log('   ✅ Numeración configurada para todas las cajas');

        // 4. VERIFICAR CONFIGURACIÓN
        console.log('\n📊 4. Verificando configuración...');

        const stats = await sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM siac_puntos_venta WHERE company_id = 1) as puntos_venta,
                (SELECT COUNT(*) FROM siac_cajas c
                 JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
                 WHERE pv.company_id = 1) as cajas,
                (SELECT COUNT(*) FROM siac_tipos_comprobantes WHERE company_id = 1) as tipos_comprobantes,
                (SELECT COUNT(*) FROM siac_numeracion_comprobantes nc
                 JOIN siac_cajas c ON nc.caja_id = c.id
                 JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
                 WHERE pv.company_id = 1) as configuraciones_numeracion
        `, { type: Sequelize.QueryTypes.SELECT });

        const result = stats[0];

        console.log(`   📍 Puntos de venta: ${result.puntos_venta}`);
        console.log(`   🏪 Cajas: ${result.cajas}`);
        console.log(`   📋 Tipos de comprobantes: ${result.tipos_comprobantes}`);
        console.log(`   🔢 Configuraciones de numeración: ${result.configuraciones_numeracion}`);

        console.log('\n🎉 ¡CONFIGURACIÓN BÁSICA COMPLETADA!');
        console.log('\n📋 SISTEMA LISTO PARA:');
        console.log('   ✅ Crear facturas con integración automática');
        console.log('   ✅ Detectar módulos clientes y productos automáticamente');
        console.log('   ✅ Gestionar múltiples puntos de venta y cajas');
        console.log('   ✅ Numeración automática de comprobantes');

        console.log('\n🔗 ENDPOINTS DISPONIBLES:');
        console.log('   • GET  /api/siac/facturacion/configuracion');
        console.log('   • GET  /api/siac/facturacion/puntos-venta');
        console.log('   • GET  /api/siac/facturacion/cajas');
        console.log('   • POST /api/siac/facturacion/facturas');
        console.log('   • GET  /api/siac/facturacion/facturas');

        return {
            success: true,
            puntos_venta: parseInt(result.puntos_venta),
            cajas: parseInt(result.cajas),
            tipos_comprobantes: parseInt(result.tipos_comprobantes),
            numeraciones: parseInt(result.configuraciones_numeracion),
            mensaje: 'Módulo facturación configurado exitosamente'
        };

    } catch (error) {
        console.error('❌ Error en configuración:', error);
        throw error;
    }
}

if (require.main === module) {
    setupBasicInvoicing()
        .then(result => {
            console.log('\n✅ Configuración completada:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Error:', error.message);
            process.exit(1);
        });
}

module.exports = setupBasicInvoicing;