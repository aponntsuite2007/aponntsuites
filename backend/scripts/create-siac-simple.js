/**
 * Script simplificado para crear tablas SIAC
 */

require('dotenv').config();
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

async function createTables() {
    try {
        console.log('🔄 Creando tabla principal de configuración SIAC...');

        // Crear tabla principal siac_configuracion_empresa
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS siac_configuracion_empresa (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                razon_social VARCHAR(255),
                domicilio VARCHAR(255),
                cuit VARCHAR(15),
                ingresos_brutos VARCHAR(20),
                condicion_iva VARCHAR(50) DEFAULT 'RESPONSABLE_INSCRIPTO',
                punto_venta INTEGER DEFAULT 1,
                agente_retencion_iva BOOLEAN DEFAULT false,
                agente_percepcion_iva BOOLEAN DEFAULT false,
                agente_retencion_ib BOOLEAN DEFAULT false,
                agente_percepcion_ib BOOLEAN DEFAULT false,
                porc_retencion_iva DECIMAL(5,2) DEFAULT 10.50,
                porc_percepcion_iva DECIMAL(5,2) DEFAULT 21.00,
                porc_retencion_ib DECIMAL(5,2) DEFAULT 3.00,
                porc_percepcion_ib DECIMAL(5,2) DEFAULT 3.50,
                habilita_facturacion BOOLEAN DEFAULT true,
                factura_a_numero INTEGER DEFAULT 1,
                factura_b_numero INTEGER DEFAULT 1,
                factura_c_numero INTEGER DEFAULT 1,
                pais VARCHAR(3) DEFAULT 'ARG',
                moneda VARCHAR(3) DEFAULT 'ARS',
                configuracion_adicional JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER REFERENCES users(id),
                updated_by INTEGER REFERENCES users(id),
                UNIQUE(company_id)
            );
        `);

        console.log('✅ Tabla siac_configuracion_empresa creada');

        // Crear tabla de medios de pago
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS siac_medios_pago (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                nombre VARCHAR(100) NOT NULL,
                conversion DECIMAL(10,4) DEFAULT 1.0000,
                interes DECIMAL(5,2) DEFAULT 0.00,
                activo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Tabla siac_medios_pago creada');

        // Crear tabla de países
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS siac_paises (
                id SERIAL PRIMARY KEY,
                codigo VARCHAR(3) UNIQUE NOT NULL,
                nombre VARCHAR(100) NOT NULL,
                moneda VARCHAR(3) NOT NULL,
                sistema_impositivo JSONB DEFAULT '{}',
                configuracion_fiscal JSONB DEFAULT '{}',
                activo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Tabla siac_paises creada');

        // Insertar países base
        await sequelize.query(`
            INSERT INTO siac_paises (codigo, nombre, moneda, sistema_impositivo, configuracion_fiscal) VALUES
            ('ARG', 'Argentina', 'ARS', '{"iva": {"rates": [10.5, 21, 27]}}', '{"afip": true}'),
            ('URU', 'Uruguay', 'UYU', '{"iva": {"rates": [10, 22]}}', '{"dgi": true}'),
            ('BRA', 'Brasil', 'BRL', '{"icms": {"enabled": true}}', '{"sefaz": true}')
            ON CONFLICT (codigo) DO NOTHING;
        `);

        console.log('✅ Países base insertados');

        // Verificar tablas creadas
        const [results] = await sequelize.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name LIKE 'siac_%'
            ORDER BY table_name;
        `);

        console.log('📋 Tablas SIAC en la base de datos:');
        results.forEach(table => {
            console.log(`   ✓ ${table.table_name}`);
        });

        console.log('🎉 ¡Tablas SIAC creadas exitosamente!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

createTables();