/**
 * Script para crear datos iniciales del módulo FACTURACIÓN
 * Crea estructura completa: Punto de venta → Cajas → Datos de prueba
 */

const { Sequelize, DataTypes } = require('sequelize');

// Configurar conexión
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

async function setupInvoicingInitialData() {
    try {
        console.log('🏪 Iniciando configuración inicial del módulo FACTURACIÓN...\n');

        // 1. CREAR PUNTO DE VENTA PRINCIPAL
        console.log('📍 1. Creando punto de venta principal...');

        const puntoVentaResult = await sequelize.query(`
            INSERT INTO siac_puntos_venta (
                company_id, codigo_punto_venta, nombre_punto_venta, direccion, telefono, email,
                responsable_nombre, responsable_documento,
                cuit_empresa, razon_social_empresa, condicion_iva,
                punto_venta_afip,
                permite_factura_a, permite_factura_b, permite_factura_c,
                permite_nota_credito, permite_nota_debito, permite_presupuestos,
                activo, predeterminado,
                created_by
            ) VALUES (
                1, -- company_id
                'PV001', -- codigo_punto_venta
                'Punto de Venta Principal', -- nombre_punto_venta
                'Av. Corrientes 1234, Ciudad de Buenos Aires, Argentina', -- direccion
                '+54 11 4000-1234', -- telefono
                'ventas@miempresa.com', -- email
                'Juan Carlos Pérez', -- responsable_nombre
                '12345678', -- responsable_documento
                '30-12345678-9', -- cuit_empresa (formateado)
                'Mi Empresa S.A.', -- razon_social_empresa
                'RESPONSABLE_INSCRIPTO', -- condicion_iva
                1, -- punto_venta_afip (para Argentina)
                true, true, true, -- permite facturas A, B, C
                true, true, true, -- permite notas crédito, débito, presupuestos
                true, true, -- activo, predeterminado
                1 -- created_by
            )
            ON CONFLICT (company_id, codigo_punto_venta)
            DO UPDATE SET
                updated_at = CURRENT_TIMESTAMP,
                activo = true
            RETURNING id, codigo_punto_venta, nombre_punto_venta;
        `);

        console.log(`   ✅ Punto de venta: PV001 - Punto de Venta Principal`);

        // 2. CREAR CAJAS
        console.log('\n🏪 2. Creando cajas del punto de venta...');

        const cajas = [
            {
                codigo: 'CAJA01',
                nombre: 'Caja Principal',
                descripcion: 'Caja principal para ventas generales',
                tipo: 'GENERAL',
                permite_cuenta_corriente: true,
                predeterminada: true
            },
            {
                codigo: 'CAJA02',
                nombre: 'Caja Express',
                descripcion: 'Caja rápida para ventas al contado',
                tipo: 'EXPRESS',
                permite_cuenta_corriente: false,
                predeterminada: false
            },
            {
                codigo: 'CAJAWEB',
                nombre: 'Caja Web',
                descripcion: 'Caja virtual para ventas online',
                tipo: 'VIRTUAL',
                permite_cuenta_corriente: true,
                predeterminada: false
            }
        ];

        for (const caja of cajas) {
            const cajaResult = await sequelize.query(`
                INSERT INTO siac_cajas (
                    punto_venta_id, codigo_caja, nombre_caja, descripcion, tipo_caja,
                    permite_efectivo, permite_tarjetas, permite_cheques,
                    permite_transferencias, permite_cuenta_corriente,
                    limite_efectivo, limite_descuento_porcentaje,
                    activo, predeterminada,
                    created_by
                ) VALUES (
                    (SELECT id FROM siac_puntos_venta WHERE company_id = 1 AND codigo_punto_venta = 'PV001'),
                    :codigo, :nombre, :descripcion, :tipo,
                    true, true, false, -- efectivo, tarjetas, cheques
                    true, :permite_cuenta_corriente, -- transferencias, cuenta corriente
                    500000.00, 15.00, -- límites
                    true, :predeterminada, -- activo, predeterminada
                    1 -- created_by
                )
                ON CONFLICT (punto_venta_id, codigo_caja)
                DO UPDATE SET
                    updated_at = CURRENT_TIMESTAMP,
                    activo = true
                RETURNING id, codigo_caja, nombre_caja;
            `, {
                replacements: {
                    codigo: caja.codigo,
                    nombre: caja.nombre,
                    descripcion: caja.descripcion,
                    tipo: caja.tipo,
                    permite_cuenta_corriente: caja.permite_cuenta_corriente,
                    predeterminada: caja.predeterminada
                }
            });

            console.log(`   ✅ Caja: ${caja.codigo} - ${caja.nombre}`);
        }

        // 3. CONFIGURAR NUMERACIÓN AUTOMÁTICA PARA CADA CAJA
        console.log('\n🔢 3. Configurando numeración de comprobantes...');

        // Obtener tipos de comprobantes y cajas
        const tiposComprobantes = await sequelize.query(`
            SELECT id, codigo_tipo, nombre_tipo FROM siac_tipos_comprobantes
            WHERE company_id = 1 AND activo = true
        `, { type: Sequelize.QueryTypes.SELECT });

        const cajasCreadas = await sequelize.query(`
            SELECT c.id, c.codigo_caja, c.nombre_caja
            FROM siac_cajas c
            JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
            WHERE pv.company_id = 1 AND c.activo = true
        `, { type: Sequelize.QueryTypes.SELECT });

        // Crear numeración para cada combinación caja-tipo comprobante
        for (const caja of cajasCreadas) {
            for (const tipo of tiposComprobantes) {
                await sequelize.query(`
                    INSERT INTO siac_numeracion_comprobantes (
                        caja_id, tipo_comprobante_id,
                        numero_actual, prefijo,
                        numero_desde, numero_hasta,
                        activo
                    ) VALUES (
                        :cajaId, :tipoId,
                        0, '', -- número actual, prefijo
                        1, 999999999, -- rango
                        true -- activo
                    )
                    ON CONFLICT (caja_id, tipo_comprobante_id) DO NOTHING;
                `, {
                    replacements: {
                        cajaId: caja.id,
                        tipoId: tipo.id
                    }
                });
            }
            console.log(`   ✅ Numeración configurada para: ${caja.codigo_caja}`);
        }

        // 4. CREAR FACTURA DE PRUEBA (SOLO SI HAY DATOS)
        console.log('\n🧾 4. Creando factura de prueba...');

        // Verificar si hay cliente y productos de prueba
        const clientePruebas = await sequelize.query(`
            SELECT id, codigo_cliente, razon_social, documento_numero, condicion_iva
            FROM siac_clientes
            WHERE company_id = 1
            LIMIT 1
        `, { type: Sequelize.QueryTypes.SELECT });

        const productosPrueba = await sequelize.query(`
            SELECT id, codigo_producto, nombre_producto, precio_venta
            FROM siac_productos
            WHERE company_id = 1 AND activo = true
            LIMIT 3
        `, { type: Sequelize.QueryTypes.SELECT });

        const clientePrueba = clientePruebas[0];

        if (clientePrueba && productosPrueba.length > 0) {
            console.log('   📋 Datos disponibles para factura de prueba:');
            console.log(`   - Cliente: ${clientePrueba.razon_social}`);
            console.log(`   - Productos: ${productosPrueba.length} disponibles`);

            // Obtener próximo número para Factura B en Caja Principal
            const proximoNumero = await sequelize.query(`
                SELECT siac_obtener_proximo_numero(
                    (SELECT id FROM siac_cajas c
                     JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
                     WHERE pv.company_id = 1 AND c.codigo_caja = 'CAJA01'),
                    (SELECT id FROM siac_tipos_comprobantes WHERE company_id = 1 AND codigo_tipo = 'FB')
                ) as numero
            `);

            const numeroFactura = proximoNumero[0][0].numero;

            // Crear factura de prueba
            const facturaResults = await sequelize.query(`
                INSERT INTO siac_facturas (
                    caja_id, tipo_comprobante_id,
                    numero, numero_completo,
                    fecha_factura,
                    cliente_id, cliente_codigo, cliente_razon_social,
                    cliente_documento_numero, cliente_condicion_iva,
                    observaciones,
                    created_by
                ) VALUES (
                    (SELECT c.id FROM siac_cajas c
                     JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
                     WHERE pv.company_id = 1 AND c.codigo_caja = 'CAJA01'),
                    (SELECT id FROM siac_tipos_comprobantes WHERE company_id = 1 AND codigo_tipo = 'FB'),
                    :numero, :numeroCompleto,
                    CURRENT_DATE,
                    :clienteId, :clienteCodigo, :clienteRazonSocial,
                    :clienteDocumento, :clienteCondicionIva,
                    'Factura de prueba generada automáticamente por el sistema',
                    1
                )
                RETURNING id, numero_completo;
            `, {
                replacements: {
                    numero: numeroFactura,
                    numeroCompleto: String(numeroFactura).padStart(8, '0'),
                    clienteId: clientePrueba.id,
                    clienteCodigo: clientePrueba.codigo_cliente,
                    clienteRazonSocial: clientePrueba.razon_social,
                    clienteDocumento: clientePrueba.documento_numero,
                    clienteCondicionIva: clientePrueba.condicion_iva || 'CONSUMIDOR_FINAL'
                }
            });

            const facturaResult = facturaResults[0][0];
            const facturaId = facturaResult.id;
            console.log(`   ✅ Factura creada: Nº ${facturaResult.numero_completo}`);

            // Agregar items a la factura
            let numeroItem = 1;
            for (const producto of productosPrueba.slice(0, 2)) { // Solo 2 productos
                const cantidad = numeroItem; // 1, 2 unidades
                const precioUnitario = parseFloat(producto.precio_venta);
                const subtotal = cantidad * precioUnitario;
                const alicuotaIva = 21.0;
                const importeIva = (subtotal * alicuotaIva) / 100;
                const totalItem = subtotal + importeIva;

                await sequelize.query(`
                    INSERT INTO siac_facturas_items (
                        factura_id, numero_item,
                        producto_id, producto_codigo, producto_descripcion, producto_unidad_medida,
                        cantidad, precio_unitario,
                        subtotal, subtotal_con_descuento,
                        alicuota_iva, importe_iva,
                        total_item
                    ) VALUES (
                        :facturaId, :numeroItem,
                        :productoId, :productoCodigo, :productoDescripcion, 'UNI',
                        :cantidad, :precioUnitario,
                        :subtotal, :subtotal,
                        :alicuotaIva, :importeIva,
                        :totalItem
                    )
                `, {
                    replacements: {
                        facturaId,
                        numeroItem,
                        productoId: producto.id,
                        productoCodigo: producto.codigo_producto,
                        productoDescripcion: producto.nombre_producto,
                        cantidad,
                        precioUnitario,
                        subtotal,
                        alicuotaIva,
                        importeIva,
                        totalItem
                    }
                });

                console.log(`     • ${producto.codigo_producto}: ${cantidad} x $${precioUnitario} = $${totalItem.toFixed(2)}`);
                numeroItem++;
            }

            // Calcular totales automáticamente
            await sequelize.query('SELECT siac_calcular_totales_factura(?)', {
                replacements: [facturaId]
            });

            // Agregar pago en efectivo
            const totalFacturaResults = await sequelize.query(`
                SELECT total_factura FROM siac_facturas WHERE id = ?
            `, {
                replacements: [facturaId],
                type: Sequelize.QueryTypes.SELECT
            });

            const totalFactura = totalFacturaResults[0];

            await sequelize.query(`
                INSERT INTO siac_facturas_pagos (
                    factura_id, forma_pago, descripcion_pago, importe_pago
                ) VALUES (
                    :facturaId, 'EFECTIVO', 'Pago en efectivo', :importe
                )
            `, {
                replacements: {
                    facturaId,
                    importe: totalFactura.total_factura
                }
            });

            // Actualizar estado de la factura
            await sequelize.query(`
                UPDATE siac_facturas
                SET estado = 'PAGADA'
                WHERE id = ?
            `, { replacements: [facturaId] });

            console.log(`   💰 Pago registrado: $${parseFloat(totalFactura.total_factura).toFixed(2)} en efectivo`);
        } else {
            console.log('   ⚠️ No hay clientes o productos de prueba - factura no creada');
            console.log('   💡 Ejecute primero los scripts de clientes y productos');
        }

        // 5. ESTADÍSTICAS FINALES
        console.log('\n📊 5. Estadísticas del módulo facturación:');

        const statsResults = await sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM siac_puntos_venta WHERE company_id = 1) as puntos_venta,
                (SELECT COUNT(*) FROM siac_cajas c
                 JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
                 WHERE pv.company_id = 1) as cajas,
                (SELECT COUNT(*) FROM siac_tipos_comprobantes WHERE company_id = 1) as tipos_comprobantes,
                (SELECT COUNT(*) FROM siac_facturas f
                 JOIN siac_cajas c ON f.caja_id = c.id
                 JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
                 WHERE pv.company_id = 1) as facturas_emitidas,
                (SELECT COALESCE(SUM(total_factura), 0) FROM siac_facturas f
                 JOIN siac_cajas c ON f.caja_id = c.id
                 JOIN siac_puntos_venta pv ON c.punto_venta_id = pv.id
                 WHERE pv.company_id = 1 AND f.estado != 'ANULADA') as total_facturado
        `, { type: Sequelize.QueryTypes.SELECT });

        const stats = statsResults[0];

        console.log(`   📍 Puntos de venta: ${stats.puntos_venta}`);
        console.log(`   🏪 Cajas configuradas: ${stats.cajas}`);
        console.log(`   📋 Tipos de comprobantes: ${stats.tipos_comprobantes}`);
        console.log(`   🧾 Facturas emitidas: ${stats.facturas_emitidas}`);
        console.log(`   💰 Total facturado: $${parseFloat(stats.total_facturado).toFixed(2)}`);

        console.log('\n🎉 ¡CONFIGURACIÓN INICIAL COMPLETADA EXITOSAMENTE!');
        console.log('\n📋 PRÓXIMOS PASOS:');
        console.log('   1. Acceder a /api/siac/facturacion/configuracion para ver estado');
        console.log('   2. Usar /api/siac/facturacion/puntos-venta para gestionar puntos de venta');
        console.log('   3. Usar /api/siac/facturacion/facturas para crear nuevas facturas');
        console.log('   4. El sistema se integra automáticamente con módulos Clientes y Productos');

        return {
            success: true,
            puntos_venta: stats.puntos_venta,
            cajas: stats.cajas,
            tipos_comprobantes: stats.tipos_comprobantes,
            facturas_emitidas: stats.facturas_emitidas,
            total_facturado: parseFloat(stats.total_facturado),
            mensaje: 'Configuración inicial del módulo facturación completada exitosamente'
        };

    } catch (error) {
        console.error('❌ Error configurando datos iniciales:', error);
        throw error;
    }
}

// Ejecutar configuración
if (require.main === module) {
    setupInvoicingInitialData()
        .then(result => {
            console.log('\n✅ Configuración completada:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Error en configuración:', error.message);
            process.exit(1);
        });
}

module.exports = setupInvoicingInitialData;