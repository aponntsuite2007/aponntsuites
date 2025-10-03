/**
 * Script básico para crear tabla SIAC configuración
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

async function createBasicTable() {
    try {
        console.log('🔄 Creando tabla básica de configuración SIAC...');

        // Crear tabla principal sin foreign keys problemáticas
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS siac_configuracion_empresa (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL,
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
                UNIQUE(company_id)
            );
        `);

        console.log('✅ Tabla siac_configuracion_empresa creada');

        // Verificar que se creó
        const [results] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'siac_configuracion_empresa'
            ORDER BY ordinal_position;
        `);

        console.log('📋 Columnas de la tabla:');
        results.forEach(col => {
            console.log(`   ✓ ${col.column_name} (${col.data_type})`);
        });

        console.log('🎉 ¡Tabla SIAC configuración creada exitosamente!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

createBasicTable();