/**
 * Migración completa para producción - Agregar columnas y tablas faltantes
 */

const { Pool } = require('pg');

const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

async function migrate() {
    const pool = new Pool({
        connectionString: RENDER_URL,
        ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();

    try {
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('  MIGRACIÓN COMPLETA DE PRODUCCIÓN');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        await client.query('BEGIN');

        // 1. Agregar unit_cost a wms_products
        console.log('1️⃣ Agregando unit_cost a wms_products...');
        try {
            await client.query(`
                ALTER TABLE wms_products
                ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,2) DEFAULT 0
            `);
            console.log('   ✅ Columna unit_cost agregada\n');
        } catch (e) {
            console.log(`   ⚠️ ${e.message}\n`);
        }

        // 2. Agregar company_id a wms_warehouses
        console.log('2️⃣ Agregando company_id a wms_warehouses...');
        try {
            await client.query(`
                ALTER TABLE wms_warehouses
                ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)
            `);
            console.log('   ✅ Columna company_id agregada\n');
        } catch (e) {
            console.log(`   ⚠️ ${e.message}\n`);
        }

        // 3. Crear tabla wms_movements
        console.log('3️⃣ Creando tabla wms_movements...');
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS wms_movements (
                    id SERIAL PRIMARY KEY,
                    company_id INTEGER REFERENCES companies(id),
                    warehouse_id INTEGER REFERENCES wms_warehouses(id),
                    product_id INTEGER REFERENCES wms_products(id),
                    movement_type VARCHAR(50) NOT NULL,
                    quantity NUMERIC(12,4) NOT NULL,
                    unit_cost NUMERIC(12,2),
                    total_cost NUMERIC(14,2),
                    reference_type VARCHAR(50),
                    reference_id INTEGER,
                    reference_number VARCHAR(100),
                    from_location_id INTEGER,
                    to_location_id INTEGER,
                    batch_number VARCHAR(100),
                    expiry_date DATE,
                    serial_numbers JSONB,
                    notes TEXT,
                    status VARCHAR(50) DEFAULT 'completed',
                    created_by INTEGER,
                    approved_by INTEGER,
                    approved_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            `);
            console.log('   ✅ Tabla wms_movements creada\n');
        } catch (e) {
            console.log(`   ⚠️ ${e.message}\n`);
        }

        // 4. Crear tabla wms_inventory
        console.log('4️⃣ Creando tabla wms_inventory...');
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS wms_inventory (
                    id SERIAL PRIMARY KEY,
                    company_id INTEGER REFERENCES companies(id),
                    warehouse_id INTEGER REFERENCES wms_warehouses(id),
                    location_id INTEGER REFERENCES wms_locations(id),
                    product_id INTEGER REFERENCES wms_products(id),
                    quantity_available NUMERIC(12,4) DEFAULT 0,
                    quantity_reserved NUMERIC(12,4) DEFAULT 0,
                    quantity_in_transit NUMERIC(12,4) DEFAULT 0,
                    quantity_damaged NUMERIC(12,4) DEFAULT 0,
                    batch_number VARCHAR(100),
                    expiry_date DATE,
                    serial_number VARCHAR(100),
                    unit_cost NUMERIC(12,2),
                    last_count_date DATE,
                    last_count_quantity NUMERIC(12,4),
                    abc_class CHAR(1),
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    UNIQUE(warehouse_id, location_id, product_id, batch_number, serial_number)
                )
            `);
            console.log('   ✅ Tabla wms_inventory creada\n');
        } catch (e) {
            console.log(`   ⚠️ ${e.message}\n`);
        }

        // 5. Crear tabla financial_transactions
        console.log('5️⃣ Creando tabla financial_transactions...');
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS financial_transactions (
                    id SERIAL PRIMARY KEY,
                    company_id INTEGER REFERENCES companies(id),
                    transaction_type VARCHAR(50) NOT NULL,
                    transaction_date DATE NOT NULL,
                    amount NUMERIC(14,2) NOT NULL,
                    currency VARCHAR(3) DEFAULT 'ARS',
                    description TEXT,
                    reference_type VARCHAR(50),
                    reference_id INTEGER,
                    reference_number VARCHAR(100),
                    category VARCHAR(100),
                    subcategory VARCHAR(100),
                    cost_center VARCHAR(100),
                    department_id INTEGER,
                    employee_id INTEGER,
                    bank_account_id INTEGER,
                    payment_method VARCHAR(50),
                    tax_type VARCHAR(50),
                    tax_amount NUMERIC(14,2),
                    status VARCHAR(50) DEFAULT 'completed',
                    approved_by INTEGER,
                    approved_at TIMESTAMP WITH TIME ZONE,
                    reconciled BOOLEAN DEFAULT false,
                    reconciled_at TIMESTAMP WITH TIME ZONE,
                    reconciled_by INTEGER,
                    notes TEXT,
                    attachments JSONB,
                    metadata JSONB,
                    created_by INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            `);
            console.log('   ✅ Tabla financial_transactions creada\n');
        } catch (e) {
            console.log(`   ⚠️ ${e.message}\n`);
        }

        // 6. Crear índices para las nuevas tablas
        console.log('6️⃣ Creando índices...');
        try {
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_wms_movements_company ON wms_movements(company_id);
                CREATE INDEX IF NOT EXISTS idx_wms_movements_warehouse ON wms_movements(warehouse_id);
                CREATE INDEX IF NOT EXISTS idx_wms_movements_product ON wms_movements(product_id);
                CREATE INDEX IF NOT EXISTS idx_wms_movements_type ON wms_movements(movement_type);
                CREATE INDEX IF NOT EXISTS idx_wms_movements_created ON wms_movements(created_at);

                CREATE INDEX IF NOT EXISTS idx_wms_inventory_company ON wms_inventory(company_id);
                CREATE INDEX IF NOT EXISTS idx_wms_inventory_warehouse ON wms_inventory(warehouse_id);
                CREATE INDEX IF NOT EXISTS idx_wms_inventory_product ON wms_inventory(product_id);

                CREATE INDEX IF NOT EXISTS idx_financial_transactions_company ON financial_transactions(company_id);
                CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(transaction_type);
                CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date);
            `);
            console.log('   ✅ Índices creados\n');
        } catch (e) {
            console.log(`   ⚠️ ${e.message}\n`);
        }

        // 7. Arreglar marketplace para que tenga available_in correcto
        console.log('7️⃣ Arreglando marketplace (target_panel=unknown → panel-empresa)...');
        try {
            await client.query(`
                UPDATE system_modules
                SET available_in = 'company'
                WHERE module_key = 'marketplace'
            `);
            console.log('   ✅ marketplace actualizado a available_in=company\n');
        } catch (e) {
            console.log(`   ⚠️ ${e.message}\n`);
        }

        await client.query('COMMIT');

        // Verificación final
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('  VERIFICACIÓN FINAL');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        // Verificar wms_products tiene unit_cost
        const unitCost = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'wms_products' AND column_name = 'unit_cost'
        `);
        console.log(`wms_products.unit_cost: ${unitCost.rows.length > 0 ? '✅' : '❌'}`);

        // Verificar wms_warehouses tiene company_id
        const whCompanyId = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'wms_warehouses' AND column_name = 'company_id'
        `);
        console.log(`wms_warehouses.company_id: ${whCompanyId.rows.length > 0 ? '✅' : '❌'}`);

        // Verificar tablas nuevas
        const tables = ['wms_movements', 'wms_inventory', 'financial_transactions'];
        for (const t of tables) {
            const exists = await client.query(`
                SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)
            `, [t]);
            console.log(`Tabla ${t}: ${exists.rows[0].exists ? '✅' : '❌'}`);
        }

        // Verificar marketplace
        const marketplace = await client.query(`
            SELECT target_panel FROM v_modules_by_panel WHERE module_key = 'marketplace'
        `);
        console.log(`marketplace target_panel: ${marketplace.rows[0]?.target_panel || '❌'}`);

        console.log('\n✅ MIGRACIÓN COMPLETADA');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en migración:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
