#!/usr/bin/env node
/**
 * Script para limpiar todas las tablas de ISI excepto el admin
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    user: 'postgres',
    password: 'Aedr15150302',
    database: 'attendance_system',
    port: 5432
});

async function cleanTables() {
    console.log('🧹 LIMPIEZA COMPLETA - EMPRESA ISI (company_id=11)');
    console.log('═'.repeat(60));

    try {
        // Obtener admin ID
        const adminResult = await pool.query(`
            SELECT user_id, "firstName", "lastName", email, role
            FROM users
            WHERE company_id = 11 AND role = 'admin'
            ORDER BY "createdAt" ASC
            LIMIT 1
        `);

        if (adminResult.rows.length === 0) {
            console.log('❌ No se encontró admin de ISI');
            await pool.end();
            return;
        }

        const admin = adminResult.rows[0];
        const adminId = admin.user_id;
        console.log('✅ Admin a preservar:', admin.firstName, admin.lastName);
        console.log('   ID:', adminId);
        console.log('   Role:', admin.role);
        console.log('');

        // PASO 1: Limpiar tablas por company_id (incluyendo payroll)
        console.log('📋 Limpiando tablas por company_id=11...');
        const companyTables = [
            'payroll_run_details',
            'payroll_runs',
            'payroll_cycles',
            'payroll_templates',
            'payroll_template_items'
        ];

        for (const table of companyTables) {
            try {
                const result = await pool.query(`DELETE FROM ${table} WHERE company_id = 11`);
                console.log('🗑️ ' + table + ': ' + result.rowCount + ' eliminados');
            } catch (e) {
                if (e.message.includes('does not exist') || e.message.includes('no existe')) {
                    console.log('⏭️ ' + table + ': no existe');
                } else {
                    console.log('⚠️ ' + table + ': ' + e.message.substring(0, 60));
                }
            }
        }

        console.log('');

        // PASO 2: Tablas con user_id
        console.log('📋 Limpiando tablas por user_id...');
        const userTables = [
            'user_work_history',
            'user_family_members',
            'user_salary_config_v2',
            'user_medications',
            'user_medical_exams',
            'attendance_records',
            'biometric_data'
        ];

        for (const table of userTables) {
            try {
                const result = await pool.query(
                    `DELETE FROM ${table} WHERE user_id != $1`,
                    [adminId]
                );
                console.log('🗑️ ' + table + ': ' + result.rowCount + ' eliminados');
            } catch (e) {
                if (e.message.includes('does not exist') || e.message.includes('no existe')) {
                    console.log('⏭️ ' + table + ': no existe');
                } else {
                    console.log('⚠️ ' + table + ': ' + e.message.substring(0, 60));
                }
            }
        }

        console.log('');

        // Eliminar usuarios (excepto admin)
        console.log('👥 Eliminando usuarios (excepto admin)...');
        const usersResult = await pool.query(
            `DELETE FROM users WHERE company_id = 11 AND user_id != $1`,
            [adminId]
        );
        console.log('🗑️ users: ' + usersResult.rowCount + ' eliminados');

        // Eliminar departamentos
        console.log('');
        console.log('🏢 Eliminando departamentos...');
        const deptResult = await pool.query(`DELETE FROM departments WHERE company_id = 11`);
        console.log('🗑️ departments: ' + deptResult.rowCount + ' eliminados');

        // Eliminar turnos
        console.log('');
        console.log('⏰ Eliminando turnos...');
        const shiftResult = await pool.query(`DELETE FROM shifts WHERE company_id = 11`);
        console.log('🗑️ shifts: ' + shiftResult.rowCount + ' eliminados');

        console.log('');
        console.log('═'.repeat(60));
        console.log('📊 ESTADO FINAL ISI (company_id=11):');

        const usersCount = await pool.query(`SELECT COUNT(*) as count FROM users WHERE company_id = 11`);
        console.log('   users: ' + usersCount.rows[0].count);

        const deptsCount = await pool.query(`SELECT COUNT(*) as count FROM departments WHERE company_id = 11`);
        console.log('   departments: ' + deptsCount.rows[0].count);

        const shiftsCount = await pool.query(`SELECT COUNT(*) as count FROM shifts WHERE company_id = 11`);
        console.log('   shifts: ' + shiftsCount.rows[0].count);

        console.log('');
        console.log('✅ LIMPIEZA COMPLETADA - TABLAS VACÍAS (solo admin preservado)');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

cleanTables();
