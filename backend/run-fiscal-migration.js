/**
 * Script: Crear tablas P2P + ejecutar migración fiscal
 * Crea procurement_orders, procurement_invoices, procurement_accounting_config,
 * finance_payment_orders si no existen, luego ejecuta el seed fiscal.
 */
const { Sequelize } = require('sequelize');
const fs = require('fs');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost', port: 5432, dialect: 'postgres', logging: false
});

async function run() {
    await sequelize.authenticate();
    console.log('DB conectada OK\n');

    // 1. Crear tabla procurement_orders si no existe
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS procurement_orders (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            order_number VARCHAR(50),
            supplier_id INTEGER,
            status VARCHAR(30) DEFAULT 'draft',
            order_type VARCHAR(30) DEFAULT 'standard',
            currency VARCHAR(5) DEFAULT 'ARS',
            subtotal DECIMAL(15,2) DEFAULT 0,
            tax_amount DECIMAL(15,2) DEFAULT 0,
            total_amount DECIMAL(15,2) DEFAULT 0,
            notes TEXT,
            requested_by INTEGER,
            approved_by INTEGER,
            approved_at TIMESTAMP,
            expected_delivery DATE,
            branch_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
    console.log('+ procurement_orders: OK');

    // 2. Crear tabla procurement_invoices si no existe
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS procurement_invoices (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            order_id INTEGER REFERENCES procurement_orders(id),
            supplier_id INTEGER,
            invoice_number VARCHAR(50),
            invoice_type VARCHAR(10),
            invoice_date DATE,
            due_date DATE,
            subtotal DECIMAL(15,2) DEFAULT 0,
            tax_amount DECIMAL(15,2) DEFAULT 0,
            other_taxes DECIMAL(15,2) DEFAULT 0,
            total_amount DECIMAL(15,2) DEFAULT 0,
            currency VARCHAR(5) DEFAULT 'ARS',
            cae VARCHAR(20),
            cae_expiry DATE,
            status VARCHAR(30) DEFAULT 'pending',
            branch_id INTEGER,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
    console.log('+ procurement_invoices: OK');

    // 3. Crear tabla procurement_accounting_config si no existe
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS procurement_accounting_config (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            config_name VARCHAR(100),
            account_code VARCHAR(20),
            account_name VARCHAR(200),
            account_type VARCHAR(50),
            purchase_type VARCHAR(50),
            is_active BOOLEAN DEFAULT true,
            country_code VARCHAR(3) DEFAULT 'AR',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
    console.log('+ procurement_accounting_config: OK');

    // 4. Crear tabla finance_payment_orders si no existe
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS finance_payment_orders (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            order_number VARCHAR(50),
            supplier_id INTEGER,
            invoice_ids JSONB DEFAULT '[]',
            status VARCHAR(30) DEFAULT 'draft',
            payment_method VARCHAR(50),
            currency VARCHAR(5) DEFAULT 'ARS',
            subtotal DECIMAL(15,2) DEFAULT 0,
            tax_amount DECIMAL(15,2) DEFAULT 0,
            retentions_total DECIMAL(15,2) DEFAULT 0,
            retentions_detail JSONB DEFAULT '[]',
            net_amount DECIMAL(15,2) DEFAULT 0,
            total_amount DECIMAL(15,2) DEFAULT 0,
            fiscal_country_code VARCHAR(3) DEFAULT 'AR',
            authorized_by INTEGER,
            authorized_at TIMESTAMP,
            paid_at TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
    console.log('+ finance_payment_orders: OK');

    // 5. Agregar branch_id FK y indices si no existen
    const addColumnIfNotExists = async (table, column, definition) => {
        const [cols] = await sequelize.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = '${column}'
        `);
        if (cols.length === 0) {
            await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
            console.log(`  + ${table}.${column} added`);
        } else {
            console.log(`  = ${table}.${column} already exists`);
        }
    };

    await addColumnIfNotExists('procurement_orders', 'branch_id', 'INTEGER REFERENCES branches(id) ON DELETE SET NULL');
    await addColumnIfNotExists('procurement_invoices', 'branch_id', 'INTEGER REFERENCES branches(id) ON DELETE SET NULL');
    await addColumnIfNotExists('procurement_accounting_config', 'country_code', "VARCHAR(3) DEFAULT 'AR'");
    await addColumnIfNotExists('finance_payment_orders', 'fiscal_country_code', "VARCHAR(3) DEFAULT 'AR'");

    // 6. Crear indices si no existen
    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_procurement_orders_branch_id
            ON procurement_orders(branch_id) WHERE branch_id IS NOT NULL
    `).catch(() => {});
    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_procurement_invoices_branch_id
            ON procurement_invoices(branch_id) WHERE branch_id IS NOT NULL
    `).catch(() => {});
    console.log('  + Indices created');

    // 7. Seed TaxTemplate AR
    console.log('\n--- Seeding TaxTemplate AR ---');

    await sequelize.query(`
        INSERT INTO tax_templates (country, country_code, template_name, tax_id_format, tax_id_field_name,
                                   tax_id_validation_regex, currencies, default_currency, is_active, created_at, updated_at)
        SELECT 'Argentina', 'AR', 'Argentina - Régimen General', 'XX-XXXXXXXX-X', 'CUIT',
               '^\\d{2}-?\\d{8}-?\\d{1}$', '["ARS","USD"]'::jsonb, 'ARS', true, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM tax_templates WHERE country_code = 'AR')
    `);

    const [templates] = await sequelize.query(`SELECT id FROM tax_templates WHERE country_code = 'AR' LIMIT 1`);
    if (templates.length === 0) {
        console.log('ERROR: TaxTemplate AR not found!');
        process.exit(1);
    }
    const arId = templates[0].id;
    console.log('  TaxTemplate AR id:', arId);

    // Conditions
    const conditions = [
        ['RI', 'Responsable Inscripto', 'Inscripto en IVA', 1],
        ['MONO', 'Monotributista', 'Régimen Simplificado', 2],
        ['EX', 'Exento', 'Exento de IVA', 3],
        ['CF', 'Consumidor Final', 'Consumidor Final', 4]
    ];
    for (const [code, name, desc, ord] of conditions) {
        await sequelize.query(`
            INSERT INTO tax_conditions (tax_template_id, condition_code, condition_name, description, display_order, is_active, created_at)
            SELECT ${arId}, '${code}', '${name}', '${desc}', ${ord}, true, NOW()
            WHERE NOT EXISTS (SELECT 1 FROM tax_conditions WHERE tax_template_id = ${arId} AND condition_code = '${code}')
        `);
    }
    const [conds] = await sequelize.query(`SELECT condition_code FROM tax_conditions WHERE tax_template_id = ${arId}`);
    console.log('  Conditions:', conds.map(c => c.condition_code).join(', '));

    // Concepts and Rates
    const concepts = [
        { code: 'IVA', name: 'Impuesto al Valor Agregado', order: 1, base: 'neto_final', type: 'tax', mandatory: true,
          rates: [
            ['IVA_21', 'IVA 21%', 21.00, true, '["RI"]', null],
            ['IVA_10_5', 'IVA 10.5%', 10.50, false, '["RI"]', null],
            ['IVA_27', 'IVA 27%', 27.00, false, '["RI"]', null],
            ['IVA_0', 'IVA 0%', 0.00, false, '["EX","MONO","CF"]', null]
          ]},
        { code: 'RET_GANANCIAS', name: 'Retención Ganancias', order: 2, base: 'neto_final', type: 'retention', mandatory: false,
          rates: [
            ['RET_GAN_BIENES', 'Ret Ganancias Bienes', 2.00, true, '["goods","consumables","raw_materials"]', null],
            ['RET_GAN_SERVICIOS', 'Ret Ganancias Servicios', 6.00, false, '["services","utilities"]', null]
          ]},
        { code: 'RET_IVA', name: 'Retención IVA', order: 3, base: 'tax_amount', type: 'retention', mandatory: false,
          rates: [
            ['RET_IVA_50', 'Retención 50% IVA', 50.00, true, null, 18000]
          ]},
        { code: 'RET_IIBB', name: 'Retención Ingresos Brutos', order: 4, base: 'neto_final', type: 'retention', mandatory: false,
          rates: [
            ['IIBB_BSAS', 'IIBB Buenos Aires', 3.50, false, '["Buenos Aires"]', null],
            ['IIBB_CABA', 'IIBB CABA', 3.00, true, '["CABA"]', null],
            ['IIBB_CORDOBA', 'IIBB Córdoba', 3.00, false, '["Córdoba"]', null],
            ['IIBB_SANTA_FE', 'IIBB Santa Fe', 3.60, false, '["Santa Fe"]', null],
            ['IIBB_MENDOZA', 'IIBB Mendoza', 2.50, false, '["Mendoza"]', null],
            ['IIBB_GENERAL', 'IIBB General', 3.00, false, '["general"]', null]
          ]},
        { code: 'RET_SUSS', name: 'Retención SUSS', order: 5, base: 'neto_final', type: 'retention', mandatory: false,
          rates: [
            ['RET_SUSS_2', 'Retención SUSS 2%', 2.00, true, '["services"]', 50000]
          ]}
    ];

    for (const concept of concepts) {
        await sequelize.query(`
            INSERT INTO tax_concepts (tax_template_id, concept_code, concept_name, calculation_order, base_amount, concept_type, is_percentage, is_mandatory, is_active, created_at, updated_at)
            SELECT ${arId}, '${concept.code}', '${concept.name}', ${concept.order}, '${concept.base}', '${concept.type}', true, ${concept.mandatory}, true, NOW(), NOW()
            WHERE NOT EXISTS (SELECT 1 FROM tax_concepts WHERE tax_template_id = ${arId} AND concept_code = '${concept.code}')
        `);

        const [conceptRows] = await sequelize.query(`SELECT id FROM tax_concepts WHERE tax_template_id = ${arId} AND concept_code = '${concept.code}'`);
        if (conceptRows.length > 0) {
            const conceptId = conceptRows[0].id;
            for (const [rateCode, rateName, pct, isDef, conds, minAmount] of concept.rates) {
                const condsVal = conds ? `'${conds}'::jsonb` : 'NULL';
                const minVal = minAmount || 'NULL';
                await sequelize.query(`
                    INSERT INTO tax_rates (tax_concept_id, rate_code, rate_name, rate_percentage, is_default, applicable_conditions, minimum_amount, is_active, created_at)
                    SELECT ${conceptId}, '${rateCode}', '${rateName}', ${pct}, ${isDef}, ${condsVal}, ${minVal}, true, NOW()
                    WHERE NOT EXISTS (SELECT 1 FROM tax_rates WHERE tax_concept_id = ${conceptId} AND rate_code = '${rateCode}')
                `);
            }
        }
    }

    const [conceptsFinal] = await sequelize.query(`SELECT concept_code FROM tax_concepts WHERE tax_template_id = ${arId}`);
    console.log('  Concepts:', conceptsFinal.map(c => c.concept_code).join(', '));

    const [ratesFinal] = await sequelize.query(`
        SELECT r.rate_code, r.rate_percentage FROM tax_rates r
        JOIN tax_concepts c ON c.id = r.tax_concept_id
        WHERE c.tax_template_id = ${arId}
    `);
    console.log('  Rates (' + ratesFinal.length + '):', ratesFinal.map(r => r.rate_code + '=' + r.rate_percentage + '%').join(', '));

    console.log('\n=== MIGRACIÓN FISCAL COMPLETA ===');
    await sequelize.close();
}

run().catch(err => {
    console.error('FATAL:', err.message);
    if (err.parent) console.error('SQL:', err.parent.message);
    process.exit(1);
});
