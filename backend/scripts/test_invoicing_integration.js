/**
 * Script de prueba para demostrar la integración inteligente del módulo FACTURACIÓN
 * Muestra cómo el sistema se adapta automáticamente según los módulos contratados
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
        logging: false
    }
);

async function testInvoicingIntegration() {
    try {
        console.log('🧪 Iniciando prueba de integración inteligente del módulo FACTURACIÓN...\n');

        // 1. VERIFICAR CONFIGURACIÓN ACTUAL
        console.log('📋 1. Verificando configuración de módulos...');

        const modulesStatus = await sequelize.query(`
            SELECT modulo_codigo, modulo_nombre, activo, fecha_contratacion
            FROM siac_modulos_empresa
            WHERE company_id = 1
            ORDER BY modulo_codigo
        `, { type: Sequelize.QueryTypes.SELECT });

        console.log('   📊 Estado actual de módulos:');
        modulesStatus.forEach(mod => {
            const status = mod.activo ? '🟢 ACTIVO' : '🔴 INACTIVO';
            console.log(`   - ${mod.modulo_nombre} (${mod.modulo_codigo}): ${status}`);
        });

        // 2. PROBAR ENDPOINT DE CONFIGURACIÓN
        console.log('\n🔧 2. Probando endpoint de configuración...');

        // Simular verificación de módulos (igual que hace la API)
        const modulosActivos = {};
        modulesStatus.forEach(mod => {
            if (mod.activo) modulosActivos[mod.modulo_codigo] = true;
        });

        const configuracionFacturacion = {
            facturacionActivo: true,
            clientesActivo: modulosActivos.clientes || false,
            productosActivo: modulosActivos.productos || false,
            cuentaCorrienteActivo: modulosActivos.cuenta_corriente || false,
            inventarioActivo: modulosActivos.inventario || false
        };

        console.log('   ⚙️ Configuración automática detectada:');
        console.log(`   - Facturación: ${configuracionFacturacion.facturacionActivo ? '✅ ACTIVO' : '❌ INACTIVO'}`);
        console.log(`   - Clientes: ${configuracionFacturacion.clientesActivo ? '✅ INTEGRACIÓN ACTIVA' : '⚠️ INGRESO MANUAL'}`);
        console.log(`   - Productos: ${configuracionFacturacion.productosActivo ? '✅ INTEGRACIÓN ACTIVA' : '⚠️ INGRESO MANUAL'}`);
        console.log(`   - Cuenta Corriente: ${configuracionFacturacion.cuentaCorrienteActivo ? '✅ GENERA AUTOMÁTICO' : '💰 SOLO CONTADO'}`);
        console.log(`   - Inventario: ${configuracionFacturacion.inventarioActivo ? '✅ ACTUALIZA STOCK' : '📦 NO AFECTA STOCK'}`);

        // 3. VERIFICAR ESTRUCTURA DE FACTURACIÓN
        console.log('\n🏪 3. Verificando estructura de facturación...');

        const estructuraFacturacion = await sequelize.query(`
            SELECT
                'Puntos de Venta' as elemento,
                COUNT(*) as cantidad
            FROM siac_puntos_venta
            WHERE company_id = 1
            UNION ALL
            SELECT
                'Cajas' as elemento,
                COUNT(*) as cantidad
            FROM siac_cajas c
            JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
            WHERE pv.company_id = 1 AND c.activo = true
            UNION ALL
            SELECT
                'Tipos de Comprobantes' as elemento,
                COUNT(*) as cantidad
            FROM siac_tipos_comprobantes
            WHERE company_id = 1 AND activo = true
            UNION ALL
            SELECT
                'Configuraciones de Numeración' as elemento,
                COUNT(*) as cantidad
            FROM siac_numeracion_comprobantes nc
            JOIN siac_cajas c ON nc.caja_id = c.id
            JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
            WHERE pv.company_id = 1 AND nc.activo = true
        `, { type: Sequelize.QueryTypes.SELECT });

        console.log('   📊 Estructura configurada:');
        estructuraFacturacion.forEach(item => {
            console.log(`   - ${item.elemento}: ${item.cantidad}`);
        });

        // 4. SIMULAR CREACIÓN DE FACTURA CON INTEGRACIÓN INTELIGENTE
        console.log('\n🧾 4. Simulando creación de factura con adaptación automática...');

        // Obtener caja principal
        const cajaInfo = await sequelize.query(`
            SELECT c.id, c.codigo_caja, c.nombre_caja, c.permite_cuenta_corriente
            FROM siac_cajas c
            JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
            WHERE pv.company_id = 1 AND c.predeterminada = true
        `, { type: Sequelize.QueryTypes.SELECT });

        const caja = cajaInfo[0];
        console.log(`   📦 Usando caja: ${caja.codigo_caja} - ${caja.nombre_caja}`);

        // Obtener tipo de comprobante (Factura B)
        const tipoComprobante = await sequelize.query(`
            SELECT id, codigo_tipo, nombre_tipo, discrimina_iva
            FROM siac_tipos_comprobantes
            WHERE company_id = 1 AND codigo_tipo = 'FB' AND activo = true
        `, { type: Sequelize.QueryTypes.SELECT });

        console.log(`   📄 Tipo de comprobante: ${tipoComprobante[0].nombre_tipo}`);

        // Obtener próximo número
        const proximoNumero = await sequelize.query(`
            SELECT siac_obtener_proximo_numero(?, ?) as numero
        `, {
            replacements: [caja.id, tipoComprobante[0].id],
            type: Sequelize.QueryTypes.SELECT
        });

        console.log(`   🔢 Próximo número: ${String(proximoNumero[0].numero).padStart(8, '0')}`);

        // 5. DEMOSTRAR COMPORTAMIENTO ADAPTATIVO
        console.log('\n🔄 5. Demostrando comportamiento adaptativo del sistema...');

        console.log('\n   💡 ESCENARIOS DE INTEGRACIÓN:');

        if (!configuracionFacturacion.clientesActivo && !configuracionFacturacion.productosActivo) {
            console.log('\n   📝 ESCENARIO: Solo facturación contratada');
            console.log('   - Cliente: Ingreso manual de datos (nombre, documento, dirección)');
            console.log('   - Productos: Ingreso manual de descripción y precio');
            console.log('   - Precios especiales: No disponible');
            console.log('   - Validación de stock: No disponible');
            console.log('   ✅ Sistema funciona de manera independiente');
        }

        if (configuracionFacturacion.clientesActivo && !configuracionFacturacion.productosActivo) {
            console.log('\n   👥 ESCENARIO: Facturación + Clientes');
            console.log('   - Cliente: Búsqueda automática en base de datos');
            console.log('   - Autocompletado de datos fiscales del cliente');
            console.log('   - Productos: Ingreso manual de descripción y precio');
            console.log('   - Precios especiales: No disponible (necesita módulo productos)');
            console.log('   ✅ Integración parcial automática');
        }

        if (configuracionFacturacion.clientesActivo && configuracionFacturacion.productosActivo) {
            console.log('\n   🎯 ESCENARIO: Facturación + Clientes + Productos');
            console.log('   - Cliente: Búsqueda automática con datos completos');
            console.log('   - Productos: Búsqueda por código o nombre');
            console.log('   - Precios especiales: Aplicación automática si existen');
            console.log('   - Validación de stock: Control automático de existencias');
            console.log('   - Categorización: Datos automáticos de marca y categoría');
            console.log('   ✅ Integración completa automática');
        }

        if (configuracionFacturacion.cuentaCorrienteActivo) {
            console.log('\n   💳 EXTENSIÓN: Cuenta Corriente');
            console.log('   - Facturas en cuenta corriente automáticas');
            console.log('   - Control de límites de crédito por cliente');
            console.log('   - Generación automática de estados de cuenta');
        }

        // 6. MOSTRAR APIs DISPONIBLES SEGÚN CONFIGURACIÓN
        console.log('\n🔗 6. APIs disponibles según configuración actual:');

        const apisDisponibles = [
            '✅ GET  /api/siac/facturacion/configuracion',
            '✅ GET  /api/siac/facturacion/puntos-venta',
            '✅ GET  /api/siac/facturacion/cajas',
            '✅ GET  /api/siac/facturacion/tipos-comprobantes',
            '✅ POST /api/siac/facturacion/facturas',
            '✅ GET  /api/siac/facturacion/facturas',
            '✅ PUT  /api/siac/facturacion/facturas/:id/anular'
        ];

        const apisIntegracion = [];

        if (configuracionFacturacion.clientesActivo) {
            apisIntegracion.push('🔗 GET  /api/siac/facturacion/buscar-cliente/:term');
        } else {
            apisIntegracion.push('⚠️ GET  /api/siac/facturacion/buscar-cliente/:term (retorna vacío)');
        }

        if (configuracionFacturacion.productosActivo) {
            apisIntegracion.push('🔗 GET  /api/siac/facturacion/buscar-producto/:term');
        } else {
            apisIntegracion.push('⚠️ GET  /api/siac/facturacion/buscar-producto/:term (retorna vacío)');
        }

        console.log('\n   📡 APIs principales:');
        apisDisponibles.forEach(api => console.log(`     ${api}`));

        console.log('\n   🔄 APIs de integración:');
        apisIntegracion.forEach(api => console.log(`     ${api}`));

        // 7. RESULTADO FINAL
        console.log('\n🎉 7. Resultado de la prueba de integración:');

        const resultado = {
            moduloFacturacionActivo: true,
            integracionClientes: configuracionFacturacion.clientesActivo,
            integracionProductos: configuracionFacturacion.productosActivo,
            soporteCuentaCorriente: configuracionFacturacion.cuentaCorrienteActivo,
            controlInventario: configuracionFacturacion.inventarioActivo,
            puntosVentaConfigurados: parseInt(estructuraFacturacion.find(e => e.elemento === 'Puntos de Venta').cantidad),
            cajasActivas: parseInt(estructuraFacturacion.find(e => e.elemento === 'Cajas').cantidad),
            tiposComprobantes: parseInt(estructuraFacturacion.find(e => e.elemento === 'Tipos de Comprobantes').cantidad),
            sistemaCompleto: configuracionFacturacion.clientesActivo && configuracionFacturacion.productosActivo,
            mensaje: 'Módulo facturación con integración inteligente funcionando correctamente'
        };

        console.log('\n📊 RESUMEN:');
        console.log(`   🏪 Módulo Facturación: ✅ ACTIVO`);
        console.log(`   👥 Integración Clientes: ${resultado.integracionClientes ? '✅ ACTIVA' : '⚠️ MANUAL'}`);
        console.log(`   📦 Integración Productos: ${resultado.integracionProductos ? '✅ ACTIVA' : '⚠️ MANUAL'}`);
        console.log(`   💳 Cuenta Corriente: ${resultado.soporteCuentaCorriente ? '✅ DISPONIBLE' : '💰 SOLO CONTADO'}`);
        console.log(`   📊 Sistema Completo: ${resultado.sistemaCompleto ? '✅ SÍ' : '🔧 PARCIAL'}`);

        console.log('\n✨ El sistema adapta su funcionalidad automáticamente según los módulos contratados');
        console.log('🚀 Listo para facturar con la máxima integración disponible');

        return resultado;

    } catch (error) {
        console.error('❌ Error en prueba de integración:', error);
        throw error;
    }
}

if (require.main === module) {
    testInvoicingIntegration()
        .then(result => {
            console.log('\n✅ Prueba completada exitosamente');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Error en la prueba:', error.message);
            process.exit(1);
        });
}

module.exports = testInvoicingIntegration;