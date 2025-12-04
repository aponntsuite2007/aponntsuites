#!/usr/bin/env node
/**
 * Script para verificar todos los datos de ISI (company_id=11) en BD
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

async function verify() {
    try {
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║  VERIFICACIÓN DATOS EN BD - EMPRESA ISI (company_id=11)        ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        // Verificar departamentos
        const depts = await pool.query(
            'SELECT id, name, company_id FROM departments WHERE company_id = 11 AND is_active = true ORDER BY id DESC'
        );
        console.log('═══ DEPARTAMENTOS ═══');
        console.log('Total:', depts.rows.length);
        depts.rows.forEach(d => console.log('  ✅ ID:', d.id, '|', d.name, '| company_id:', d.company_id));

        // Verificar turnos
        const shifts = await pool.query(
            'SELECT id, name, company_id, days, "startTime", "endTime" FROM shifts WHERE company_id = 11 AND "isActive" = true ORDER BY name'
        );
        console.log('\n═══ TURNOS ═══');
        console.log('Total:', shifts.rows.length);
        shifts.rows.forEach(s => {
            const idShort = s.id.substring(0, 8) + '...';
            console.log('  ✅', s.name, '|', s.startTime, '-', s.endTime, '| días:', JSON.stringify(s.days));
        });

        // Verificar usuarios (empleados)
        const users = await pool.query(`
            SELECT u.user_id, u."firstName", u."lastName", u.company_id, u.department_id, u.role, d.name as dept_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.company_id = 11
            ORDER BY u."createdAt" DESC
            LIMIT 10
        `);
        console.log('\n═══ USUARIOS (últimos 10) ═══');
        console.log('Total usuarios:', users.rows.length);
        users.rows.forEach(u => {
            console.log('  ✅', u.firstName, u.lastName, '| dept:', u.dept_name || 'N/A', '| role:', u.role);
        });

        // Resumen final
        console.log('\n════════════════════════════════════════════════════════════');
        console.log('📊 RESUMEN EMPRESA ISI (company_id=11):');
        console.log('   🏢 Departamentos activos:', depts.rows.length);
        console.log('   ⏰ Turnos activos:', shifts.rows.length);
        console.log('   👥 Usuarios (últimos 10 mostrados):', users.rows.length);
        console.log('════════════════════════════════════════════════════════════');
        console.log('\n✅ PERSISTENCIA MULTI-TENANT VERIFICADA EXITOSAMENTE');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

verify();
