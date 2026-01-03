/**
 * Script para crear usuario de prueba del portal de proveedores
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Aedr15150302',
    database: 'attendance_system'
});

async function createTestUser() {
    try {
        // Obtener una empresa existente
        const company = await pool.query('SELECT company_id FROM companies LIMIT 1');
        const companyId = company.rows[0]?.company_id || 1;
        console.log('Company ID:', companyId);

        // Verificar si ya existe el proveedor
        let supplierResult = await pool.query(
            "SELECT id, name FROM wms_suppliers WHERE code = 'PROV001'"
        );

        let supplierId;

        if (supplierResult.rows.length === 0) {
            // Crear proveedor de prueba
            const newSupplier = await pool.query(`
                INSERT INTO wms_suppliers
                (company_id, code, name, legal_name, tax_id, email, phone, address, is_active, portal_enabled)
                VALUES ($1, 'PROV001', 'Proveedor Demo S.A.', 'Proveedor Demo S.A.',
                        '30-12345678-9', 'contacto@proveedordemo.com', '11-4444-5555',
                        'Av. Corrientes 1234, CABA', true, true)
                RETURNING id, name
            `, [companyId]);

            supplierId = newSupplier.rows[0].id;
            console.log('✅ Proveedor creado:', newSupplier.rows[0].name);
        } else {
            supplierId = supplierResult.rows[0].id;
            console.log('✅ Usando proveedor existente:', supplierResult.rows[0].name);
        }

        // Crear/actualizar usuario de portal
        const passwordHash = await bcrypt.hash('proveedor123', 10);

        // Verificar si ya existe el usuario
        const existingUser = await pool.query(
            "SELECT id FROM supplier_portal_users WHERE email = 'proveedor@demo.com'"
        );

        if (existingUser.rows.length > 0) {
            await pool.query(
                "UPDATE supplier_portal_users SET password_hash = $1, is_active = true WHERE email = 'proveedor@demo.com'",
                [passwordHash]
            );
            console.log('✅ Usuario actualizado');
        } else {
            await pool.query(`
                INSERT INTO supplier_portal_users
                (supplier_id, email, password_hash, role, first_name, last_name, is_active, email_verified)
                VALUES ($1, 'proveedor@demo.com', $2, 'admin', 'Juan', 'Pérez', true, true)
            `, [supplierId, passwordHash]);
            console.log('✅ Usuario de portal creado');
        }

        console.log('');
        console.log('════════════════════════════════════════════════════════');
        console.log('     CREDENCIALES DE ACCESO AL PORTAL DE PROVEEDORES');
        console.log('════════════════════════════════════════════════════════');
        console.log('   Email:    proveedor@demo.com');
        console.log('   Password: proveedor123');
        console.log('   URL:      http://localhost:9998/panel-proveedores.html');
        console.log('════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

createTestUser();
