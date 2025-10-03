/**
 * Script corregido para crear las tablas del módulo de clientes
 * Ejecuta comandos SQL individuales para evitar problemas de parsing
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
    // 1. Tabla de módulos por empresa
    `CREATE TABLE IF NOT EXISTS siac_modulos_empresa (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        modulo_codigo VARCHAR(50) NOT NULL,
        modulo_nombre VARCHAR(100) NOT NULL,
        modulo_descripcion TEXT,
        activo BOOLEAN DEFAULT true,
        fecha_contratacion DATE DEFAULT CURRENT_DATE,
        fecha_vencimiento DATE,
        configuracion JSONB DEFAULT '{}',
        precio_mensual DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT siac_modulos_empresa_uk UNIQUE (company_id, modulo_codigo)
    )`,

    // 2. Tabla principal de clientes
    `CREATE TABLE IF NOT EXISTS siac_clientes (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        codigo_cliente VARCHAR(20) NOT NULL,
        razon_social VARCHAR(255) NOT NULL,
        nombre_fantasia VARCHAR(255),
        tipo_cliente VARCHAR(20) DEFAULT 'PERSONA_FISICA',
        documento_tipo VARCHAR(20) DEFAULT 'CUIT',
        documento_numero VARCHAR(20) NOT NULL,
        documento_formateado VARCHAR(30),
        email VARCHAR(255),
        telefono VARCHAR(50),
        celular VARCHAR(50),
        whatsapp VARCHAR(50),
        website VARCHAR(255),
        domicilio_calle VARCHAR(255),
        domicilio_numero VARCHAR(20),
        domicilio_piso VARCHAR(10),
        domicilio_depto VARCHAR(10),
        domicilio_completo TEXT,
        ciudad VARCHAR(100),
        provincia_estado VARCHAR(100),
        codigo_postal VARCHAR(20),
        pais VARCHAR(100) DEFAULT 'Argentina',
        latitud DECIMAL(10, 8),
        longitud DECIMAL(11, 8),
        categoria_cliente VARCHAR(50) DEFAULT 'GENERAL',
        lista_precio VARCHAR(50) DEFAULT 'GENERAL',
        descuento_maximo DECIMAL(5,2) DEFAULT 0.00,
        limite_credito DECIMAL(15,4) DEFAULT 0,
        credito_disponible DECIMAL(15,4) DEFAULT 0,
        dias_vencimiento INTEGER DEFAULT 30,
        vendedor_asignado_id INTEGER,
        canal_venta VARCHAR(50) DEFAULT 'DIRECTO',
        origen_cliente VARCHAR(50) DEFAULT 'MANUAL',
        requiere_orden_compra BOOLEAN DEFAULT false,
        formato_facturacion VARCHAR(20) DEFAULT 'A',
        email_facturacion VARCHAR(255),
        fecha_alta DATE DEFAULT CURRENT_DATE,
        fecha_primera_compra DATE,
        fecha_ultima_compra DATE,
        total_compras DECIMAL(15,4) DEFAULT 0,
        cantidad_facturas INTEGER DEFAULT 0,
        promedio_compra DECIMAL(15,4) DEFAULT 0,
        observaciones TEXT,
        notas_internas TEXT,
        configuracion_adicional JSONB DEFAULT '{}',
        datos_extra JSONB DEFAULT '{}',
        estado VARCHAR(20) DEFAULT 'ACTIVO',
        motivo_inactivacion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT siac_clientes_codigo_company_uk UNIQUE (company_id, codigo_cliente)
    )`,

    // 3. Tabla de contactos
    `CREATE TABLE IF NOT EXISTS siac_clientes_contactos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100),
        cargo VARCHAR(100),
        departamento VARCHAR(100),
        telefono VARCHAR(50),
        celular VARCHAR(50),
        email VARCHAR(255),
        es_contacto_principal BOOLEAN DEFAULT false,
        recibe_facturas BOOLEAN DEFAULT false,
        recibe_cobranzas BOOLEAN DEFAULT false,
        recibe_marketing BOOLEAN DEFAULT true,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 4. Tabla de direcciones
    `CREATE TABLE IF NOT EXISTS siac_clientes_direcciones (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL,
        tipo_direccion VARCHAR(30) NOT NULL DEFAULT 'ADICIONAL',
        nombre_direccion VARCHAR(100),
        calle VARCHAR(255) NOT NULL,
        numero VARCHAR(20),
        piso VARCHAR(10),
        departamento VARCHAR(10),
        entre_calles VARCHAR(255),
        referencias TEXT,
        ciudad VARCHAR(100),
        provincia_estado VARCHAR(100),
        codigo_postal VARCHAR(20),
        pais VARCHAR(100) DEFAULT 'Argentina',
        latitud DECIMAL(10, 8),
        longitud DECIMAL(11, 8),
        es_direccion_principal BOOLEAN DEFAULT false,
        activa_para_facturacion BOOLEAN DEFAULT true,
        activa_para_entrega BOOLEAN DEFAULT true,
        horarios_entrega JSONB DEFAULT '{}',
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 5. Tabla de precios especiales
    `CREATE TABLE IF NOT EXISTS siac_clientes_precios_especiales (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL,
        producto_id INTEGER,
        producto_codigo VARCHAR(50),
        producto_descripcion VARCHAR(255),
        precio_especial DECIMAL(15,4) NOT NULL,
        moneda VARCHAR(3) DEFAULT 'ARS',
        tipo_precio VARCHAR(20) DEFAULT 'FIJO',
        valor_descuento DECIMAL(15,4),
        fecha_desde DATE DEFAULT CURRENT_DATE,
        fecha_hasta DATE,
        cantidad_minima INTEGER DEFAULT 1,
        solo_contado BOOLEAN DEFAULT false,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Índices principales
    `CREATE INDEX IF NOT EXISTS idx_siac_clientes_company_id ON siac_clientes(company_id)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_clientes_codigo ON siac_clientes(codigo_cliente)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_clientes_documento ON siac_clientes(documento_numero)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_clientes_razon_social ON siac_clientes(razon_social)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_contactos_cliente ON siac_clientes_contactos(cliente_id)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_direcciones_cliente ON siac_clientes_direcciones(cliente_id)`,
    `CREATE INDEX IF NOT EXISTS idx_siac_precios_cliente ON siac_clientes_precios_especiales(cliente_id)`,

    // Función para detectar módulo contratado
    `CREATE OR REPLACE FUNCTION siac_modulo_contratado(p_company_id INTEGER, p_modulo_codigo VARCHAR)
    RETURNS BOOLEAN AS $$
    BEGIN
        RETURN EXISTS (
            SELECT 1 FROM siac_modulos_empresa
            WHERE company_id = p_company_id
            AND modulo_codigo = p_modulo_codigo
            AND activo = true
            AND (fecha_vencimiento IS NULL OR fecha_vencimiento > CURRENT_DATE)
        );
    END;
    $$ LANGUAGE plpgsql`,

    // Función para formatear documentos
    `CREATE OR REPLACE FUNCTION siac_formatear_documento(p_numero VARCHAR, p_tipo VARCHAR)
    RETURNS VARCHAR AS $$
    BEGIN
        CASE p_tipo
            WHEN 'CUIT' THEN
                IF LENGTH(p_numero) = 11 THEN
                    RETURN SUBSTR(p_numero, 1, 2) || '-' || SUBSTR(p_numero, 3, 8) || '-' || SUBSTR(p_numero, 11, 1);
                END IF;
            WHEN 'RUT' THEN
                RETURN p_numero;
            WHEN 'CNPJ' THEN
                IF LENGTH(p_numero) = 14 THEN
                    RETURN SUBSTR(p_numero, 1, 2) || '.' || SUBSTR(p_numero, 3, 3) || '.' ||
                           SUBSTR(p_numero, 6, 3) || '/' || SUBSTR(p_numero, 9, 4) || '-' || SUBSTR(p_numero, 13, 2);
                END IF;
        END CASE;
        RETURN p_numero;
    END;
    $$ LANGUAGE plpgsql`,

    // Trigger para formatear documentos automáticamente
    `CREATE OR REPLACE FUNCTION siac_clientes_before_insert()
    RETURNS TRIGGER AS $$
    BEGIN
        IF NEW.documento_numero IS NOT NULL THEN
            NEW.documento_formateado := siac_formatear_documento(NEW.documento_numero, NEW.documento_tipo);
        END IF;

        NEW.domicilio_completo := TRIM(
            COALESCE(NEW.domicilio_calle, '') || ' ' ||
            COALESCE(NEW.domicilio_numero, '') ||
            CASE WHEN NEW.domicilio_piso IS NOT NULL THEN ' Piso ' || NEW.domicilio_piso ELSE '' END ||
            CASE WHEN NEW.domicilio_depto IS NOT NULL THEN ' Depto ' || NEW.domicilio_depto ELSE '' END
        );

        IF NEW.credito_disponible IS NULL THEN
            NEW.credito_disponible := NEW.limite_credito;
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql`,

    `DROP TRIGGER IF EXISTS siac_clientes_before_insert_trigger ON siac_clientes`,

    `CREATE TRIGGER siac_clientes_before_insert_trigger
        BEFORE INSERT ON siac_clientes
        FOR EACH ROW EXECUTE FUNCTION siac_clientes_before_insert()`
];

async function createClientTables() {
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
                    // Continuar con el siguiente comando
                }
            }
        }

        console.log('✅ Script SQL ejecutado completamente');
        console.log('📊 Verificando tablas creadas...');

        // Verificar tablas creadas
        const tables = [
            'siac_modulos_empresa',
            'siac_clientes',
            'siac_clientes_direcciones',
            'siac_clientes_contactos',
            'siac_clientes_precios_especiales'
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

        // Insertar módulo de clientes para empresa existente
        try {
            await sequelize.query(`
                INSERT INTO siac_modulos_empresa (company_id, modulo_codigo, modulo_nombre, modulo_descripcion, activo)
                SELECT 1, 'clientes', 'Módulo Clientes', 'Gestión completa de clientes y prospectos', true
                WHERE NOT EXISTS (
                    SELECT 1 FROM siac_modulos_empresa
                    WHERE company_id = 1 AND modulo_codigo = 'clientes'
                )
            `);
            console.log('✅ Módulo de clientes activado para company_id = 1');
        } catch (error) {
            console.log('⚠️ Error activando módulo de clientes:', error.message);
        }

        console.log('🎉 ¡Módulo de clientes creado exitosamente!');

    } catch (error) {
        console.error('❌ Error creando tablas de clientes:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

// Ejecutar el script
createClientTables();