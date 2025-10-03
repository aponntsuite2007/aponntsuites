/**
 * Script para crear todas las tablas del módulo FACTURACIÓN con triple aislación
 * Arquitectura: EMPRESA → PUNTO DE VENTA → CAJA
 * Integración inteligente con módulos Clientes y Productos
 *
 * TABLAS A CREAR:
 * 1. siac_puntos_venta - Puntos de venta por empresa
 * 2. siac_cajas - Cajas por punto de venta
 * 3. siac_tipos_comprobantes - Tipos de comprobantes fiscales
 * 4. siac_numeracion_comprobantes - Control de numeración por caja
 * 5. siac_facturas - Facturas principales
 * 6. siac_facturas_items - Items de factura
 * 7. siac_facturas_impuestos - Impuestos aplicados
 * 8. siac_facturas_pagos - Formas de pago
 * 9. siac_sesiones_caja - Control de sesiones de caja
 */

const { Sequelize, DataTypes } = require('sequelize');

// Configuración de base de datos
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

async function createInvoicingTables() {
    try {
        console.log('🏪 Iniciando creación de tablas del módulo FACTURACIÓN...\n');

        // 1. TABLA: siac_puntos_venta
        console.log('📍 1. Creando tabla siac_puntos_venta...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS siac_puntos_venta (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                codigo_punto_venta VARCHAR(10) NOT NULL,
                nombre_punto_venta VARCHAR(100) NOT NULL,
                direccion TEXT,
                telefono VARCHAR(50),
                email VARCHAR(100),
                responsable_nombre VARCHAR(100),
                responsable_documento VARCHAR(20),

                -- Configuración fiscal
                cuit_empresa VARCHAR(13) NOT NULL,
                razon_social_empresa VARCHAR(200) NOT NULL,
                condicion_iva VARCHAR(50) NOT NULL DEFAULT 'RESPONSABLE_INSCRIPTO',

                -- Configuración AFIP (Argentina)
                punto_venta_afip INTEGER,
                certificado_afip TEXT,
                clave_fiscal TEXT,

                -- Configuración de facturación
                permite_factura_a BOOLEAN DEFAULT true,
                permite_factura_b BOOLEAN DEFAULT true,
                permite_factura_c BOOLEAN DEFAULT true,
                permite_nota_credito BOOLEAN DEFAULT true,
                permite_nota_debito BOOLEAN DEFAULT true,
                permite_presupuestos BOOLEAN DEFAULT true,

                -- Estado y configuración
                activo BOOLEAN DEFAULT true,
                predeterminado BOOLEAN DEFAULT false,
                configuracion_adicional JSONB DEFAULT '{}',

                -- Auditoría
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                updated_by INTEGER,

                UNIQUE(company_id, codigo_punto_venta)
            );

            CREATE INDEX IF NOT EXISTS idx_puntos_venta_company ON siac_puntos_venta(company_id);
            CREATE INDEX IF NOT EXISTS idx_puntos_venta_activo ON siac_puntos_venta(activo);
        `);
        console.log('   ✅ Tabla siac_puntos_venta creada exitosamente');

        // 2. TABLA: siac_cajas
        console.log('🏪 2. Creando tabla siac_cajas...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS siac_cajas (
                id SERIAL PRIMARY KEY,
                punto_venta_id INTEGER NOT NULL REFERENCES siac_puntos_venta(id) ON DELETE CASCADE,
                codigo_caja VARCHAR(10) NOT NULL,
                nombre_caja VARCHAR(100) NOT NULL,
                descripcion TEXT,

                -- Configuración de la caja
                tipo_caja VARCHAR(20) DEFAULT 'GENERAL', -- GENERAL, EXPRESS, AUTOSERVICIO, etc.
                permite_efectivo BOOLEAN DEFAULT true,
                permite_tarjetas BOOLEAN DEFAULT true,
                permite_cheques BOOLEAN DEFAULT false,
                permite_transferencias BOOLEAN DEFAULT false,
                permite_cuenta_corriente BOOLEAN DEFAULT false,

                -- Límites y configuraciones
                limite_efectivo DECIMAL(12,2) DEFAULT 0,
                limite_descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
                requiere_autorizacion_descuento BOOLEAN DEFAULT false,
                requiere_supervisor_anulacion BOOLEAN DEFAULT true,

                -- Estado y configuración
                activo BOOLEAN DEFAULT true,
                predeterminada BOOLEAN DEFAULT false,
                configuracion_adicional JSONB DEFAULT '{}',

                -- Auditoría
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                updated_by INTEGER,

                UNIQUE(punto_venta_id, codigo_caja)
            );

            CREATE INDEX IF NOT EXISTS idx_cajas_punto_venta ON siac_cajas(punto_venta_id);
            CREATE INDEX IF NOT EXISTS idx_cajas_activo ON siac_cajas(activo);
        `);
        console.log('   ✅ Tabla siac_cajas creada exitosamente');

        // 3. TABLA: siac_tipos_comprobantes
        console.log('📋 3. Creando tabla siac_tipos_comprobantes...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS siac_tipos_comprobantes (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                codigo_tipo VARCHAR(10) NOT NULL,
                nombre_tipo VARCHAR(100) NOT NULL,
                descripcion TEXT,

                -- Clasificación fiscal
                codigo_afip INTEGER, -- Código AFIP para Argentina
                letra_comprobante CHAR(1), -- A, B, C, etc.
                discrimina_iva BOOLEAN DEFAULT false,
                es_factura BOOLEAN DEFAULT true,
                es_nota_credito BOOLEAN DEFAULT false,
                es_nota_debito BOOLEAN DEFAULT false,
                es_presupuesto BOOLEAN DEFAULT false,

                -- Comportamiento del comprobante
                afecta_stock BOOLEAN DEFAULT true,
                afecta_cuenta_corriente BOOLEAN DEFAULT true,
                requiere_autorizacion BOOLEAN DEFAULT false,
                permite_descuento BOOLEAN DEFAULT true,

                -- Numeración
                usa_numeracion_automatica BOOLEAN DEFAULT true,
                formato_numero VARCHAR(50) DEFAULT '00000-00000000',

                -- Estado
                activo BOOLEAN DEFAULT true,
                predeterminado BOOLEAN DEFAULT false,
                configuracion_adicional JSONB DEFAULT '{}',

                -- Auditoría
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                UNIQUE(company_id, codigo_tipo)
            );

            CREATE INDEX IF NOT EXISTS idx_tipos_comprobantes_company ON siac_tipos_comprobantes(company_id);
            CREATE INDEX IF NOT EXISTS idx_tipos_comprobantes_letra ON siac_tipos_comprobantes(letra_comprobante);
        `);
        console.log('   ✅ Tabla siac_tipos_comprobantes creada exitosamente');

        // 4. TABLA: siac_numeracion_comprobantes
        console.log('🔢 4. Creando tabla siac_numeracion_comprobantes...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS siac_numeracion_comprobantes (
                id SERIAL PRIMARY KEY,
                caja_id INTEGER NOT NULL REFERENCES siac_cajas(id) ON DELETE CASCADE,
                tipo_comprobante_id INTEGER NOT NULL REFERENCES siac_tipos_comprobantes(id) ON DELETE CASCADE,

                -- Numeración actual
                numero_actual INTEGER DEFAULT 0,
                prefijo VARCHAR(10) DEFAULT '',
                sufijo VARCHAR(10) DEFAULT '',

                -- Rangos autorizados (para algunos países)
                numero_desde INTEGER DEFAULT 1,
                numero_hasta INTEGER DEFAULT 999999999,
                fecha_autorizacion DATE,
                fecha_vencimiento_autorizacion DATE,

                -- Control y configuración
                activo BOOLEAN DEFAULT true,
                requiere_cae BOOLEAN DEFAULT false, -- Para Argentina
                configuracion_adicional JSONB DEFAULT '{}',

                -- Auditoría
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                UNIQUE(caja_id, tipo_comprobante_id)
            );

            CREATE INDEX IF NOT EXISTS idx_numeracion_caja ON siac_numeracion_comprobantes(caja_id);
            CREATE INDEX IF NOT EXISTS idx_numeracion_tipo ON siac_numeracion_comprobantes(tipo_comprobante_id);
        `);
        console.log('   ✅ Tabla siac_numeracion_comprobantes creada exitosamente');

        // 5. TABLA: siac_facturas (Principal)
        console.log('🧾 5. Creando tabla siac_facturas (Principal)...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS siac_facturas (
                id SERIAL PRIMARY KEY,
                caja_id INTEGER NOT NULL REFERENCES siac_cajas(id) ON DELETE RESTRICT,
                tipo_comprobante_id INTEGER NOT NULL REFERENCES siac_tipos_comprobantes(id) ON DELETE RESTRICT,

                -- Numeración del comprobante
                numero_completo VARCHAR(50) NOT NULL,
                prefijo VARCHAR(10),
                numero INTEGER NOT NULL,

                -- Fechas
                fecha_factura DATE NOT NULL DEFAULT CURRENT_DATE,
                fecha_vencimiento DATE,
                fecha_entrega DATE,

                -- Cliente (integración inteligente)
                cliente_id INTEGER, -- Solo si módulo clientes está activo
                cliente_codigo VARCHAR(50),
                cliente_razon_social VARCHAR(200) NOT NULL,
                cliente_documento_tipo VARCHAR(10),
                cliente_documento_numero VARCHAR(20),
                cliente_direccion TEXT,
                cliente_telefono VARCHAR(50),
                cliente_email VARCHAR(100),
                cliente_condicion_iva VARCHAR(50) DEFAULT 'CONSUMIDOR_FINAL',

                -- Totales
                subtotal DECIMAL(12,2) DEFAULT 0,
                descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
                descuento_importe DECIMAL(12,2) DEFAULT 0,
                total_impuestos DECIMAL(12,2) DEFAULT 0,
                total_neto DECIMAL(12,2) DEFAULT 0,
                total_factura DECIMAL(12,2) NOT NULL DEFAULT 0,

                -- Estado y control
                estado VARCHAR(20) DEFAULT 'PENDIENTE', -- PENDIENTE, PAGADA, ANULADA, VENCIDA
                factura_original_id INTEGER, -- Para notas de crédito/débito
                motivo_anulacion TEXT,
                autorizada_por INTEGER,

                -- Datos fiscales
                cae VARCHAR(50), -- CAE de AFIP para Argentina
                fecha_vencimiento_cae DATE,
                codigo_barras TEXT,

                -- Observaciones y configuración
                observaciones TEXT,
                notas_internas TEXT,
                configuracion_adicional JSONB DEFAULT '{}',

                -- Auditoría completa
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER NOT NULL,
                updated_by INTEGER,

                -- Índices únicos
                UNIQUE(caja_id, tipo_comprobante_id, prefijo, numero)
            );

            CREATE INDEX IF NOT EXISTS idx_facturas_caja ON siac_facturas(caja_id);
            CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON siac_facturas(fecha_factura);
            CREATE INDEX IF NOT EXISTS idx_facturas_cliente_id ON siac_facturas(cliente_id);
            CREATE INDEX IF NOT EXISTS idx_facturas_estado ON siac_facturas(estado);
            CREATE INDEX IF NOT EXISTS idx_facturas_numero_completo ON siac_facturas(numero_completo);
        `);
        console.log('   ✅ Tabla siac_facturas creada exitosamente');

        // 6. TABLA: siac_facturas_items
        console.log('📦 6. Creando tabla siac_facturas_items...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS siac_facturas_items (
                id SERIAL PRIMARY KEY,
                factura_id INTEGER NOT NULL REFERENCES siac_facturas(id) ON DELETE CASCADE,

                -- Orden en la factura
                numero_item INTEGER NOT NULL,

                -- Producto (integración inteligente)
                producto_id INTEGER, -- Solo si módulo productos está activo
                producto_codigo VARCHAR(50) NOT NULL,
                producto_descripcion TEXT NOT NULL,
                producto_unidad_medida VARCHAR(20) DEFAULT 'UNI',

                -- Cantidades y precios
                cantidad DECIMAL(10,3) NOT NULL DEFAULT 1,
                precio_unitario DECIMAL(12,2) NOT NULL DEFAULT 0,
                descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
                descuento_importe DECIMAL(12,2) DEFAULT 0,

                -- Subtotales
                subtotal DECIMAL(12,2) NOT NULL DEFAULT 0, -- cantidad * precio_unitario
                subtotal_con_descuento DECIMAL(12,2) NOT NULL DEFAULT 0,

                -- Impuestos por item
                alicuota_iva DECIMAL(5,2) DEFAULT 21.00,
                importe_iva DECIMAL(12,2) DEFAULT 0,
                otros_impuestos DECIMAL(12,2) DEFAULT 0,

                -- Total del item
                total_item DECIMAL(12,2) NOT NULL DEFAULT 0,

                -- Información adicional del producto
                categoria_producto VARCHAR(100),
                marca_producto VARCHAR(100),
                codigo_barras VARCHAR(50),

                -- Configuración y notas
                notas TEXT,
                configuracion_adicional JSONB DEFAULT '{}',

                -- Auditoría
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_facturas_items_factura ON siac_facturas_items(factura_id);
            CREATE INDEX IF NOT EXISTS idx_facturas_items_producto_id ON siac_facturas_items(producto_id);
            CREATE INDEX IF NOT EXISTS idx_facturas_items_codigo ON siac_facturas_items(producto_codigo);
        `);
        console.log('   ✅ Tabla siac_facturas_items creada exitosamente');

        // 7. TABLA: siac_facturas_impuestos
        console.log('💰 7. Creando tabla siac_facturas_impuestos...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS siac_facturas_impuestos (
                id SERIAL PRIMARY KEY,
                factura_id INTEGER NOT NULL REFERENCES siac_facturas(id) ON DELETE CASCADE,

                -- Tipo de impuesto
                codigo_impuesto VARCHAR(20) NOT NULL,
                nombre_impuesto VARCHAR(100) NOT NULL,
                tipo_impuesto VARCHAR(50) DEFAULT 'IVA', -- IVA, IIBB, MUNICIPAL, etc.

                -- Base imponible y alícuota
                base_imponible DECIMAL(12,2) NOT NULL DEFAULT 0,
                alicuota_porcentaje DECIMAL(8,2) NOT NULL DEFAULT 0,
                importe_impuesto DECIMAL(12,2) NOT NULL DEFAULT 0,

                -- Información adicional
                condicion_impuesto VARCHAR(50), -- EXENTO, GRAVADO, NO_GRAVADO
                codigo_afip INTEGER, -- Para Argentina

                -- Auditoría
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_facturas_impuestos_factura ON siac_facturas_impuestos(factura_id);
            CREATE INDEX IF NOT EXISTS idx_facturas_impuestos_tipo ON siac_facturas_impuestos(tipo_impuesto);
        `);
        console.log('   ✅ Tabla siac_facturas_impuestos creada exitosamente');

        // 8. TABLA: siac_facturas_pagos
        console.log('💳 8. Creando tabla siac_facturas_pagos...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS siac_facturas_pagos (
                id SERIAL PRIMARY KEY,
                factura_id INTEGER NOT NULL REFERENCES siac_facturas(id) ON DELETE CASCADE,

                -- Forma de pago
                forma_pago VARCHAR(50) NOT NULL, -- EFECTIVO, TARJETA_CREDITO, TARJETA_DEBITO, CHEQUE, TRANSFERENCIA, CUENTA_CORRIENTE
                descripcion_pago VARCHAR(200),

                -- Importe del pago
                importe_pago DECIMAL(12,2) NOT NULL DEFAULT 0,

                -- Detalles específicos por forma de pago
                -- Para tarjetas
                numero_tarjeta VARCHAR(20), -- Solo últimos 4 dígitos
                tipo_tarjeta VARCHAR(50), -- VISA, MASTERCARD, etc.
                numero_cupon VARCHAR(50),
                numero_lote VARCHAR(20),
                codigo_autorizacion VARCHAR(50),

                -- Para cheques
                numero_cheque VARCHAR(50),
                banco_cheque VARCHAR(100),
                fecha_cheque DATE,
                fecha_vencimiento_cheque DATE,

                -- Para transferencias
                numero_operacion VARCHAR(50),
                banco_origen VARCHAR(100),

                -- Para cuenta corriente (si módulo activo)
                genera_cuenta_corriente BOOLEAN DEFAULT false,

                -- Estado del pago
                estado_pago VARCHAR(20) DEFAULT 'CONFIRMADO', -- CONFIRMADO, PENDIENTE, RECHAZADO, ANULADO
                fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Configuración adicional
                configuracion_adicional JSONB DEFAULT '{}',

                -- Auditoría
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_facturas_pagos_factura ON siac_facturas_pagos(factura_id);
            CREATE INDEX IF NOT EXISTS idx_facturas_pagos_forma ON siac_facturas_pagos(forma_pago);
            CREATE INDEX IF NOT EXISTS idx_facturas_pagos_estado ON siac_facturas_pagos(estado_pago);
        `);
        console.log('   ✅ Tabla siac_facturas_pagos creada exitosamente');

        // 9. TABLA: siac_sesiones_caja
        console.log('🏪 9. Creando tabla siac_sesiones_caja...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS siac_sesiones_caja (
                id SERIAL PRIMARY KEY,
                caja_id INTEGER NOT NULL REFERENCES siac_cajas(id) ON DELETE RESTRICT,

                -- Control de sesión
                fecha_apertura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fecha_cierre TIMESTAMP,
                usuario_apertura INTEGER NOT NULL,
                usuario_cierre INTEGER,

                -- Montos de control
                monto_inicial_efectivo DECIMAL(12,2) DEFAULT 0,
                monto_final_efectivo DECIMAL(12,2) DEFAULT 0,
                diferencia_efectivo DECIMAL(12,2) DEFAULT 0,

                -- Totales de la sesión
                total_ventas_efectivo DECIMAL(12,2) DEFAULT 0,
                total_ventas_tarjetas DECIMAL(12,2) DEFAULT 0,
                total_ventas_otros DECIMAL(12,2) DEFAULT 0,
                total_ventas_sesion DECIMAL(12,2) DEFAULT 0,

                -- Cantidad de operaciones
                cantidad_facturas INTEGER DEFAULT 0,
                cantidad_notas_credito INTEGER DEFAULT 0,
                cantidad_anulaciones INTEGER DEFAULT 0,

                -- Estado de la sesión
                estado VARCHAR(20) DEFAULT 'ABIERTA', -- ABIERTA, CERRADA, CANCELADA

                -- Observaciones y notas
                observaciones_apertura TEXT,
                observaciones_cierre TEXT,
                motivo_diferencia TEXT,

                -- Configuración adicional
                configuracion_adicional JSONB DEFAULT '{}',

                -- Auditoría
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_sesiones_caja_caja ON siac_sesiones_caja(caja_id);
            CREATE INDEX IF NOT EXISTS idx_sesiones_caja_fecha ON siac_sesiones_caja(fecha_apertura);
            CREATE INDEX IF NOT EXISTS idx_sesiones_caja_estado ON siac_sesiones_caja(estado);
        `);
        console.log('   ✅ Tabla siac_sesiones_caja creada exitosamente');

        console.log('\n🔧 Creando funciones auxiliares...');

        // FUNCIÓN: Obtener próximo número de comprobante
        await sequelize.query(`
            CREATE OR REPLACE FUNCTION siac_obtener_proximo_numero(
                p_caja_id INTEGER,
                p_tipo_comprobante_id INTEGER
            ) RETURNS INTEGER AS $$
            DECLARE
                v_numero_actual INTEGER;
            BEGIN
                -- Obtener y actualizar número actual
                UPDATE siac_numeracion_comprobantes
                SET numero_actual = numero_actual + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE caja_id = p_caja_id
                  AND tipo_comprobante_id = p_tipo_comprobante_id
                  AND activo = true
                RETURNING numero_actual INTO v_numero_actual;

                -- Si no existe numeración, crearla
                IF v_numero_actual IS NULL THEN
                    INSERT INTO siac_numeracion_comprobantes (caja_id, tipo_comprobante_id, numero_actual)
                    VALUES (p_caja_id, p_tipo_comprobante_id, 1)
                    RETURNING numero_actual INTO v_numero_actual;
                END IF;

                RETURN v_numero_actual;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // FUNCIÓN: Calcular totales de factura
        await sequelize.query(`
            CREATE OR REPLACE FUNCTION siac_calcular_totales_factura(p_factura_id INTEGER)
            RETURNS VOID AS $$
            DECLARE
                v_subtotal DECIMAL(12,2) := 0;
                v_total_impuestos DECIMAL(12,2) := 0;
                v_total_factura DECIMAL(12,2) := 0;
                v_descuento_factura DECIMAL(12,2) := 0;
            BEGIN
                -- Calcular subtotal de items
                SELECT COALESCE(SUM(subtotal_con_descuento), 0)
                INTO v_subtotal
                FROM siac_facturas_items
                WHERE factura_id = p_factura_id;

                -- Calcular total de impuestos
                SELECT COALESCE(SUM(importe_impuesto), 0)
                INTO v_total_impuestos
                FROM siac_facturas_impuestos
                WHERE factura_id = p_factura_id;

                -- Obtener descuento general de factura
                SELECT COALESCE(descuento_importe, 0)
                INTO v_descuento_factura
                FROM siac_facturas
                WHERE id = p_factura_id;

                -- Calcular total final
                v_total_factura := (v_subtotal - v_descuento_factura) + v_total_impuestos;

                -- Actualizar factura
                UPDATE siac_facturas
                SET subtotal = v_subtotal,
                    total_impuestos = v_total_impuestos,
                    total_neto = v_subtotal - v_descuento_factura,
                    total_factura = v_total_factura,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = p_factura_id;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // FUNCIÓN: Verificar módulos contratados (reutilizar existente)
        console.log('\n✅ Funciones auxiliares creadas exitosamente');

        console.log('\n🔧 Creando triggers automáticos...');

        // TRIGGER: Actualizar totales cuando se modifiquen items
        await sequelize.query(`
            CREATE OR REPLACE FUNCTION trigger_actualizar_totales_factura()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Actualizar totales de la factura
                PERFORM siac_calcular_totales_factura(COALESCE(NEW.factura_id, OLD.factura_id));
                RETURN COALESCE(NEW, OLD);
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS tr_actualizar_totales_items ON siac_facturas_items;
            CREATE TRIGGER tr_actualizar_totales_items
                AFTER INSERT OR UPDATE OR DELETE ON siac_facturas_items
                FOR EACH ROW
                EXECUTE FUNCTION trigger_actualizar_totales_factura();

            DROP TRIGGER IF EXISTS tr_actualizar_totales_impuestos ON siac_facturas_impuestos;
            CREATE TRIGGER tr_actualizar_totales_impuestos
                AFTER INSERT OR UPDATE OR DELETE ON siac_facturas_impuestos
                FOR EACH ROW
                EXECUTE FUNCTION trigger_actualizar_totales_factura();
        `);

        // TRIGGER: Formatear número completo de factura
        await sequelize.query(`
            CREATE OR REPLACE FUNCTION trigger_formatear_numero_factura()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Formatear número completo según configuración
                NEW.numero_completo := COALESCE(NEW.prefijo, '') ||
                                      LPAD(NEW.numero::TEXT, 8, '0');
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS tr_formatear_numero_factura ON siac_facturas;
            CREATE TRIGGER tr_formatear_numero_factura
                BEFORE INSERT OR UPDATE ON siac_facturas
                FOR EACH ROW
                EXECUTE FUNCTION trigger_formatear_numero_factura();
        `);

        console.log('   ✅ Triggers automáticos creados exitosamente');

        console.log('\n📊 Insertando datos maestros iniciales...');

        // Insertar tipos de comprobantes estándar
        await sequelize.query(`
            INSERT INTO siac_tipos_comprobantes (company_id, codigo_tipo, nombre_tipo, descripcion, codigo_afip, letra_comprobante, discrimina_iva) VALUES
            (1, 'FA', 'Factura A', 'Factura A - Discrimina IVA', 1, 'A', true),
            (1, 'FB', 'Factura B', 'Factura B - IVA incluido', 6, 'B', false),
            (1, 'FC', 'Factura C', 'Factura C - Consumidor Final', 11, 'C', false),
            (1, 'NCA', 'Nota Crédito A', 'Nota de Crédito A', 3, 'A', true),
            (1, 'NCB', 'Nota Crédito B', 'Nota de Crédito B', 8, 'B', false),
            (1, 'NDA', 'Nota Débito A', 'Nota de Débito A', 2, 'A', true),
            (1, 'NDB', 'Nota Débito B', 'Nota de Débito B', 7, 'B', false),
            (1, 'PRES', 'Presupuesto', 'Presupuesto sin valor fiscal', 0, 'X', false)
            ON CONFLICT (company_id, codigo_tipo) DO NOTHING;
        `);

        // Registrar módulo de facturación
        await sequelize.query(`
            INSERT INTO siac_modulos_empresa (company_id, modulo_codigo, modulo_nombre, modulo_descripcion, activo, configuracion)
            VALUES (
                1,
                'facturacion',
                'Módulo Facturación',
                'Gestión completa de facturación con triple aislación empresa/punto_venta/caja',
                true,
                '{"version": "2.0", "caracteristicas": ["triple_aislacion", "integracion_automatica", "afip_ready", "multi_caja"]}'
            )
            ON CONFLICT (company_id, modulo_codigo)
            DO UPDATE SET
                activo = true,
                configuracion = '{"version": "2.0", "caracteristicas": ["triple_aislacion", "integracion_automatica", "afip_ready", "multi_caja"]}',
                updated_at = CURRENT_TIMESTAMP;
        `);

        console.log('   ✅ Datos maestros insertados exitosamente');

        console.log('\n🎉 ¡MÓDULO FACTURACIÓN CREADO EXITOSAMENTE!');
        console.log('\n📋 RESUMEN DE CREACIÓN:');
        console.log('   ✅ 9 tablas principales creadas');
        console.log('   ✅ Triple aislación: EMPRESA → PUNTO_VENTA → CAJA');
        console.log('   ✅ Integración inteligente con módulos Clientes y Productos');
        console.log('   ✅ Funciones auxiliares para numeración y cálculos');
        console.log('   ✅ Triggers automáticos para formateo y totales');
        console.log('   ✅ Tipos de comprobantes estándar Argentina');
        console.log('   ✅ Módulo registrado como ACTIVO');

        return {
            success: true,
            tablas_creadas: 9,
            funciones_creadas: 3,
            triggers_creados: 2,
            tipos_comprobantes: 8,
            mensaje: 'Módulo Facturación con triple aislación creado exitosamente'
        };

    } catch (error) {
        console.error('❌ Error creando tablas de facturación:', error);
        throw error;
    }
}

// Ejecutar creación
if (require.main === module) {
    createInvoicingTables()
        .then(result => {
            console.log('\n✅ Creación completada:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Error en creación:', error.message);
            process.exit(1);
        });
}

module.exports = createInvoicingTables;