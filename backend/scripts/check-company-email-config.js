/**
 * Check company email configuration tables and data
 */
const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

async function check() {
    try {
        // Check if table exists
        const tables = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE '%company_email%'
        `, { type: QueryTypes.SELECT });

        console.log('=== TABLAS DE EMAIL POR EMPRESA ===');
        tables.forEach(t => console.log('  -', t.table_name));

        // Check company_email_config for ISI
        const configs = await sequelize.query(`
            SELECT
                cec.*,
                c.name as company_name
            FROM company_email_config cec
            JOIN companies c ON cec.company_id = c.company_id
            WHERE cec.company_id = 11
        `, { type: QueryTypes.SELECT });

        console.log('\n=== CONFIG EMAIL ISI (company_id=11) ===');
        if (configs.length > 0) {
            configs.forEach(c => {
                console.log('  ID:', c.id);
                console.log('  Company:', c.company_name);
                console.log('  SMTP Host:', c.smtp_host);
                console.log('  SMTP Port:', c.smtp_port);
                console.log('  SMTP User:', c.smtp_user);
                console.log('  From Email:', c.smtp_from_email);
                console.log('  From Name:', c.smtp_from_name);
                console.log('  Is Active:', c.is_active);
                console.log('  Is Validated:', c.is_validated);
                console.log('  ---');
            });
        } else {
            console.log('  (No tiene configuración de email)');
        }

        // Check all companies with email config
        const allConfigs = await sequelize.query(`
            SELECT
                c.company_id,
                c.name,
                cec.smtp_from_email,
                cec.is_active,
                cec.is_validated
            FROM company_email_config cec
            JOIN companies c ON cec.company_id = c.company_id
            ORDER BY c.name
        `, { type: QueryTypes.SELECT });

        console.log('\n=== TODAS LAS EMPRESAS CON EMAIL CONFIG ===');
        if (allConfigs.length > 0) {
            allConfigs.forEach(c => {
                console.log(`  [${c.company_id}] ${c.name}: ${c.smtp_from_email || '(sin email)'} - Active: ${c.is_active}, Validated: ${c.is_validated}`);
            });
        } else {
            console.log('  (Ninguna empresa tiene configuración de email)');
        }

        // Check notification workflows with company scope
        const workflows = await sequelize.query(`
            SELECT process_key, process_name, module, scope
            FROM notification_workflows
            WHERE scope = 'company'
            LIMIT 10
        `, { type: QueryTypes.SELECT });

        console.log('\n=== WORKFLOWS CON SCOPE=COMPANY (primeros 10) ===');
        workflows.forEach(w => {
            console.log(`  - [${w.module}] ${w.process_key}: ${w.process_name}`);
        });

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await sequelize.close();
    }
}

check();
