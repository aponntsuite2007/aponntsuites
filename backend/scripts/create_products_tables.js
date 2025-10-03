/**
 * Script para crear las tablas del módulo de productos
 * Módulo escalable con integración automática
 */

const { Sequelize } = require('sequelize');

// Configuración de la base de datos
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

const sqlCommands = [
    // 1. Tabla de categorías de productos
    `CREATE TABLE IF NOT EXISTS siac_productos_categorias (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        codigo_categoria VARCHAR(20) NOT NULL,
        nombre_categoria VARCHAR(100) NOT NULL,
        descripcion TEXT,
        categoria_padre_id INTEGER REFERENCES siac_productos_categorias(id),
        nivel_jerarquia INTEGER DEFAULT 1,
        orden_visualizacion INTEGER DEFAULT 1,
        imagen_url VARCHAR(500),
        configuracion_especial JSONB DEFAULT '{}',
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT siac_categorias_codigo_company_uk UNIQUE (company_id, codigo_categoria)
    )`,

    // 2. Tabla de marcas
    `CREATE TABLE IF NOT EXISTS siac_productos_marcas (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        codigo_marca VARCHAR(20) NOT NULL,
        nombre_marca VARCHAR(100) NOT NULL,
        descripcion TEXT,
        logo_url VARCHAR(500),
        sitio_web VARCHAR(255),
        contacto_proveedor VARCHAR(255),
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT siac_marcas_codigo_company_uk UNIQUE (company_id, codigo_marca)
    )`,

    // 3. Tabla principal de productos
    `CREATE TABLE IF NOT EXISTS siac_productos (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,

        -- Identificación del producto
        codigo_producto VARCHAR(50) NOT NULL,
        codigo_barras VARCHAR(50),
        codigo_fabricante VARCHAR(50),
        codigo_proveedor VARCHAR(50),

        -- Información básica
        nombre_producto VARCHAR(255) NOT NULL,
        descripcion_corta VARCHAR(500),
        descripcion_larga TEXT,

        -- Clasificación
        categoria_id INTEGER REFERENCES siac_productos_categorias(id),
        marca_id INTEGER REFERENCES siac_productos_marcas(id),
        proveedor_principal_id INTEGER, -- Referencia flexible a clientes

        -- Unidades de medida
        unidad_medida VARCHAR(20) DEFAULT 'UNIDAD',
        unidad_compra VARCHAR(20) DEFAULT 'UNIDAD',
        factor_conversion DECIMAL(10,4) DEFAULT 1,

        -- Precios base
        precio_compra DECIMAL(15,4) DEFAULT 0,
        precio_venta DECIMAL(15,4) NOT NULL DEFAULT 0,
        precio_lista DECIMAL(15,4) DEFAULT 0,
        moneda VARCHAR(3) DEFAULT 'ARS',

        -- Márgenes y rentabilidad
        margen_porcentaje DECIMAL(5,2) DEFAULT 0,
        margen_absoluto DECIMAL(15,4) DEFAULT 0,
        precio_minimo DECIMAL(15,4) DEFAULT 0,
        precio_sugerido DECIMAL(15,4) DEFAULT 0,

        -- Control de inventario
        controla_stock BOOLEAN DEFAULT true,
        stock_actual DECIMAL(15,4) DEFAULT 0,
        stock_minimo DECIMAL(15,4) DEFAULT 0,
        stock_maximo DECIMAL(15,4) DEFAULT 1000,
        punto_reposicion DECIMAL(15,4) DEFAULT 10,

        -- Información física
        peso DECIMAL(10,4) DEFAULT 0,
        volumen DECIMAL(10,4) DEFAULT 0,
        dimensiones JSONB DEFAULT '{}',

        -- Configuración fiscal
        aplica_iva BOOLEAN DEFAULT true,
        alicuota_iva DECIMAL(5,2) DEFAULT 21.00,
        aplica_impuesto_interno BOOLEAN DEFAULT false,
        alicuota_impuesto_interno DECIMAL(5,2) DEFAULT 0,

        -- Configuración comercial
        permite_fraccionamiento BOOLEAN DEFAULT false,
        requiere_lote BOOLEAN DEFAULT false,
        requiere_vencimiento BOOLEAN DEFAULT false,
        dias_vida_util INTEGER,
        es_servicio BOOLEAN DEFAULT false,
        es_combo BOOLEAN DEFAULT false,

        -- URLs e imágenes
        imagen_principal VARCHAR(500),
        imagenes_adicionales JSONB DEFAULT '[]',
        ficha_tecnica_url VARCHAR(500),

        -- SEO y e-commerce
        slug VARCHAR(255),
        keywords TEXT,
        meta_description VARCHAR(500),
        visible_web BOOLEAN DEFAULT false,
        destacado BOOLEAN DEFAULT false,

        -- Campos personalizables
        atributos_especiales JSONB DEFAULT '{}',
        configuracion_adicional JSONB DEFAULT '{}',

        -- Auditoría y control
        estado VARCHAR(20) DEFAULT 'ACTIVO', -- ACTIVO, INACTIVO, DISCONTINUADO
        motivo_inactivacion TEXT,
        fecha_alta DATE DEFAULT CURRENT_DATE,
        fecha_baja DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT siac_productos_codigo_company_uk UNIQUE (company_id, codigo_producto)
    )`,

    // 4. Tabla de listas de precios
    `CREATE TABLE IF NOT EXISTS siac_listas_precios (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        codigo_lista VARCHAR(20) NOT NULL,
        nombre_lista VARCHAR(100) NOT NULL,
        descripcion TEXT,
        tipo_lista VARCHAR(20) DEFAULT 'GENERAL', -- GENERAL, MAYORISTA, MINORISTA, ESPECIAL
        factor_multiplicador DECIMAL(8,4) DEFAULT 1.0000,
        redondeo VARCHAR(20) DEFAULT 'CENTAVO', -- CENTAVO, PESO, CINCO_PESOS
        fecha_vigencia_desde DATE DEFAULT CURRENT_DATE,
        fecha_vigencia_hasta DATE,
        aplica_automaticamente BOOLEAN DEFAULT false,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT siac_listas_codigo_company_uk UNIQUE (company_id, codigo_lista)
    )`,

    // 5. Tabla de precios por lista
    `CREATE TABLE IF NOT EXISTS siac_productos_precios (
        id SERIAL PRIMARY KEY,
        producto_id INTEGER NOT NULL REFERENCES siac_productos(id) ON DELETE CASCADE,
        lista_precios_id INTEGER NOT NULL REFERENCES siac_listas_precios(id) ON DELETE CASCADE,
        precio_especial DECIMAL(15,4) NOT NULL,
        precio_con_descuento DECIMAL(15,4),
        descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
        fecha_vigencia_desde DATE DEFAULT CURRENT_DATE,
        fecha_vigencia_hasta DATE,
        cantidad_minima DECIMAL(10,4) DEFAULT 1,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT siac_productos_precios_uk UNIQUE (producto_id, lista_precios_id, fecha_vigencia_desde)
    )`,

    // 6. Tabla de componentes para productos combo
    `CREATE TABLE IF NOT EXISTS siac_productos_componentes (
        id SERIAL PRIMARY KEY,
        producto_padre_id INTEGER NOT NULL REFERENCES siac_productos(id) ON DELETE CASCADE,
        producto_componente_id INTEGER NOT NULL REFERENCES siac_productos(id) ON DELETE CASCADE,
        cantidad_componente DECIMAL(10,4) NOT NULL DEFAULT 1,
        precio_componente DECIMAL(15,4),
        es_opcional BOOLEAN DEFAULT false,
        orden_visualizacion INTEGER DEFAULT 1,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT siac_productos_componentes_uk UNIQUE (producto_padre_id, producto_componente_id)
    )`,

    // 7. Tabla de movimientos de stock
    `CREATE TABLE IF NOT EXISTS siac_stock_movimientos (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL REFERENCES siac_productos(id),
        tipo_movimiento VARCHAR(20) NOT NULL, -- INGRESO, EGRESO, AJUSTE, TRANSFERENCIA
        cantidad DECIMAL(15,4) NOT NULL,
        precio_unitario DECIMAL(15,4) DEFAULT 0,
        stock_anterior DECIMAL(15,4) NOT NULL,
        stock_resultante DECIMAL(15,4) NOT NULL,

        -- Referencias opcionales
        factura_id INTEGER, -- Si viene de una venta
        compra_id INTEGER,  -- Si viene de una compra
        ajuste_id INTEGER,  -- Si es un ajuste de inventario

        -- Información adicional
        motivo VARCHAR(100),
        observaciones TEXT,
        lote VARCHAR(50),
        fecha_vencimiento DATE,

        -- Ubicación física
        deposito VARCHAR(50) DEFAULT 'PRINCIPAL',
        ubicacion VARCHAR(100),

        -- Auditoría
        usuario_id INTEGER,
        fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Índices para optimización
    `CREATE INDEX IF NOT EXISTS idx_siac_productos_company ON siac_productos(company_id)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_productos_codigo ON siac_productos(codigo_producto)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_productos_categoria ON siac_productos(categoria_id)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_productos_marca ON siac_productos(marca_id)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_productos_estado ON siac_productos(estado)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_productos_barras ON siac_productos(codigo_barras)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_categorias_company ON siac_productos_categorias(company_id)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_marcas_company ON siac_productos_marcas(company_id)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_precios_producto ON siac_productos_precios(producto_id)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_precios_lista ON siac_productos_precios(lista_precios_id)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_stock_producto ON siac_stock_movimientos(producto_id)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_stock_fecha ON siac_stock_movimientos(fecha_movimiento)`,

    // Función para calcular precio con margen
    `CREATE OR REPLACE FUNCTION siac_calcular_precio_venta(p_precio_compra DECIMAL, p_margen_porcentaje DECIMAL)
    RETURNS DECIMAL AS $$
    BEGIN
        IF p_precio_compra IS NULL OR p_precio_compra = 0 THEN
            RETURN 0;
        END IF;

        RETURN ROUND(p_precio_compra * (1 + (p_margen_porcentaje / 100)), 2);
    END;
    $$ LANGUAGE plpgsql`,

    // Función para actualizar stock
    `CREATE OR REPLACE FUNCTION siac_actualizar_stock(
        p_producto_id INTEGER,
        p_cantidad DECIMAL,
        p_tipo_movimiento VARCHAR,
        p_precio_unitario DECIMAL DEFAULT 0,
        p_motivo VARCHAR DEFAULT NULL,
        p_usuario_id INTEGER DEFAULT NULL
    ) RETURNS BOOLEAN AS $$
    DECLARE
        v_stock_actual DECIMAL;
        v_company_id INTEGER;
        v_nuevo_stock DECIMAL;
    BEGIN
        -- Obtener stock actual y company_id
        SELECT stock_actual, company_id
        INTO v_stock_actual, v_company_id
        FROM siac_productos
        WHERE id = p_producto_id;

        -- Calcular nuevo stock según tipo de movimiento
        CASE p_tipo_movimiento
            WHEN 'INGRESO' THEN
                v_nuevo_stock := v_stock_actual + p_cantidad;
            WHEN 'EGRESO' THEN
                v_nuevo_stock := v_stock_actual - p_cantidad;
            WHEN 'AJUSTE' THEN
                v_nuevo_stock := p_cantidad; -- p_cantidad es el stock final
            ELSE
                RAISE EXCEPTION 'Tipo de movimiento no válido: %', p_tipo_movimiento;
        END CASE;

        -- Validar que el stock no sea negativo (excepto en ajustes)
        IF v_nuevo_stock < 0 AND p_tipo_movimiento != 'AJUSTE' THEN
            RAISE EXCEPTION 'Stock insuficiente. Stock actual: %, Cantidad solicitada: %', v_stock_actual, p_cantidad;
        END IF;

        -- Actualizar stock en producto
        UPDATE siac_productos
        SET stock_actual = v_nuevo_stock,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_producto_id;

        -- Registrar movimiento
        INSERT INTO siac_stock_movimientos (
            company_id,
            producto_id,
            tipo_movimiento,
            cantidad,
            precio_unitario,
            stock_anterior,
            stock_resultante,
            motivo,
            usuario_id
        ) VALUES (
            v_company_id,
            p_producto_id,
            p_tipo_movimiento,
            CASE WHEN p_tipo_movimiento = 'AJUSTE' THEN p_cantidad - v_stock_actual ELSE p_cantidad END,
            p_precio_unitario,
            v_stock_actual,
            v_nuevo_stock,
            p_motivo,
            p_usuario_id
        );

        RETURN TRUE;
    END;
    $$ LANGUAGE plpgsql`,

    // Trigger para calcular precios automáticamente
    `CREATE OR REPLACE FUNCTION siac_productos_calcular_precios()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Calcular precio de venta si hay precio de compra y margen
        IF NEW.precio_compra > 0 AND NEW.margen_porcentaje > 0 THEN
            NEW.precio_venta := siac_calcular_precio_venta(NEW.precio_compra, NEW.margen_porcentaje);
            NEW.margen_absoluto := NEW.precio_venta - NEW.precio_compra;
        END IF;

        -- Generar slug si no existe
        IF NEW.slug IS NULL OR NEW.slug = '' THEN
            NEW.slug := LOWER(REGEXP_REPLACE(NEW.nombre_producto, '[^a-zA-Z0-9]+', '-', 'g'));
        END IF;

        -- Timestamp de actualización
        NEW.updated_at := CURRENT_TIMESTAMP;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql`,

    `DROP TRIGGER IF EXISTS siac_productos_calcular_precios_trigger ON siac_productos`,

    `CREATE TRIGGER siac_productos_calcular_precios_trigger
        BEFORE INSERT OR UPDATE ON siac_productos
        FOR EACH ROW EXECUTE FUNCTION siac_productos_calcular_precios()`
];

async function createProductsTables() {
    try {
        console.log('🔌 Conectando a PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ Conexión exitosa a PostgreSQL');

        console.log(`🗃️ Ejecutando ${sqlCommands.length} comandos SQL...`);

        for (let i = 0; i < sqlCommands.length; i++) {
            const command = sqlCommands[i];
            console.log(`🔄 Ejecutando comando ${i + 1}/${sqlCommands.length}...`);
            try {
                await sequelize.query(command);
                console.log(`✅ Comando ${i + 1} ejecutado exitosamente`);
            } catch (error) {
                if (error.message.includes('already exists') || error.message.includes('ya existe')) {
                    console.log(`⚠️ Comando ${i + 1}: Objeto ya existe, continuando...`);
                } else {
                    console.error(`❌ Error en comando ${i + 1}:`, error.message);
                    console.log('Comando que falló:', command.substring(0, 200) + '...');
                }
            }
        }

        console.log('✅ Script SQL ejecutado completamente');
        console.log('📊 Verificando tablas creadas...');

        const tables = [
            'siac_productos_categorias',
            'siac_productos_marcas',
            'siac_productos',
            'siac_listas_precios',
            'siac_productos_precios',
            'siac_productos_componentes',
            'siac_stock_movimientos'
        ];

        for (const table of tables) {
            try {
                const result = await sequelize.query(`SELECT COUNT(*) FROM ${table}`,
                    { type: Sequelize.QueryTypes.SELECT });
                console.log(`✅ Tabla ${table}: ${result[0].count} registros`);
            } catch (error) {
                console.log(`❌ Tabla ${table}: No existe - ${error.message}`);
            }
        }

        // Insertar datos iniciales
        try {
            // Activar módulo de productos
            await sequelize.query(`
                INSERT INTO siac_modulos_empresa (company_id, modulo_codigo, modulo_nombre, modulo_descripcion, activo)
                SELECT 1, 'productos', 'Módulo Productos', 'Gestión completa de productos e inventario', true
                WHERE NOT EXISTS (
                    SELECT 1 FROM siac_modulos_empresa
                    WHERE company_id = 1 AND modulo_codigo = 'productos'
                )
            `);
            console.log('✅ Módulo de productos activado para company_id = 1');

            // Crear categoría por defecto
            await sequelize.query(`
                INSERT INTO siac_productos_categorias (company_id, codigo_categoria, nombre_categoria, descripcion)
                SELECT 1, 'GENERAL', 'Productos Generales', 'Categoría general para productos sin clasificar'
                WHERE NOT EXISTS (
                    SELECT 1 FROM siac_productos_categorias
                    WHERE company_id = 1 AND codigo_categoria = 'GENERAL'
                )
            `);
            console.log('✅ Categoría general creada');

            // Crear marca por defecto
            await sequelize.query(`
                INSERT INTO siac_productos_marcas (company_id, codigo_marca, nombre_marca, descripcion)
                SELECT 1, 'GENERICA', 'Marca Genérica', 'Marca genérica para productos sin marca específica'
                WHERE NOT EXISTS (
                    SELECT 1 FROM siac_productos_marcas
                    WHERE company_id = 1 AND codigo_marca = 'GENERICA'
                )
            `);
            console.log('✅ Marca genérica creada');

            // Crear lista de precios por defecto
            await sequelize.query(`
                INSERT INTO siac_listas_precios (company_id, codigo_lista, nombre_lista, descripcion, tipo_lista)
                SELECT 1, 'GENERAL', 'Lista General', 'Lista de precios general para todos los productos', 'GENERAL'
                WHERE NOT EXISTS (
                    SELECT 1 FROM siac_listas_precios
                    WHERE company_id = 1 AND codigo_lista = 'GENERAL'
                )
            `);
            console.log('✅ Lista de precios general creada');

        } catch (error) {
            console.log('⚠️ Error insertando datos iniciales:', error.message);
        }

        console.log('🎉 ¡Módulo de productos creado exitosamente!');

    } catch (error) {
        console.error('❌ Error creando tablas de productos:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

// Ejecutar el script
createProductsTables();