#!/usr/bin/env node
/**
 * Script para limpiar todas las tablas de ISI - Fuerza bruta
 * Desactiva FKs temporalmente
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
    console.log('🧹 LIMPIEZA FORZADA - EMPRESA ISI (company_id=11)');
    console.log('═'.repeat(60));

    const client = await pool.connect();

    try {
        // Obtener admin ID
        const adminResult = await client.query(`
            SELECT user_id, "firstName", "lastName", email, role
            FROM users
            WHERE company_id = 11 AND role = 'admin'
            ORDER BY "createdAt" ASC
            LIMIT 1
        `);

        if (adminResult.rows.length === 0) {
            console.log('❌ No se encontró admin de ISI');
            return;
        }

        const admin = adminResult.rows[0];
        const adminId = admin.user_id;
        console.log('✅ Admin a preservar:', admin.firstName, admin.lastName);
        console.log('   ID:', adminId);
        console.log('');

        // DESACTIVAR FKs TEMPORALMENTE
        console.log('🔓 Desactivando FKs temporalmente...');
        await client.query("SET session_replication_role = 'replica'");
        console.log('✅ FKs desactivadas');
        console.log('');

        // Todas las tablas que necesitamos limpiar
        const tablesToClean = [
            // Payroll
            'payroll_run_details',
            'payroll_entity_settlement_details',
            'payroll_entity_settlements',
            'payroll_runs',
            'payroll_templates',
            'payroll_payslip_templates',
            'user_payroll_assignment',
            'user_payroll_bonuses',
            'user_payroll_concept_overrides',
            'user_payroll_records',
            // User related
            'user_work_history',
            'user_family_members',
            'user_salary_config_v2',
            'user_salary_config',
            'user_medications',
            'user_medical_exams',
            'user_shift_assignments',
            'user_shifts',
            'user_children',
            'user_permission_requests',
            'user_permissions',
            'user_disciplinary_actions',
            'vacation_requests',
            'medical_certificates',
            'sanctions',
            // Attendance
            'attendances',
            'attendance_patterns',
            'attendance_profiles',
            // Biometric
            'biometric_data',
            'biometric_events',
            'biometric_ai_analysis',
            'biometric_consents',
            'biometric_detections',
            'biometric_emotional_analysis',
            'facial_biometric_data',
            'fingerprint_biometric_data',
            // Messages
            'messages',
            // Training
            'training_assignments',
            // Other
            'scoring_history',
            'user_activity_restrictions',
            'user_assigned_tasks'
        ];

        console.log('📋 Limpiando tablas relacionadas a usuarios...');
        for (const table of tablesToClean) {
            try {
                // Primero intentar con user_id
                let result = await client.query(`DELETE FROM ${table} WHERE user_id != $1`, [adminId]);
                console.log('🗑️ ' + table + ': ' + result.rowCount + ' eliminados');
            } catch (e) {
                // Si no tiene user_id, intentar con company_id
                try {
                    let result = await client.query(`DELETE FROM ${table} WHERE company_id = 11`);
                    console.log('🗑️ ' + table + ' (by company): ' + result.rowCount + ' eliminados');
                } catch (e2) {
                    if (e2.message.includes('no existe')) {
                        console.log('⏭️ ' + table + ': no existe');
                    } else {
                        console.log('⚠️ ' + table + ': ' + e2.message.substring(0, 50));
                    }
                }
            }
        }

        console.log('');
        console.log('👥 Eliminando usuarios (excepto admin)...');
        const usersResult = await client.query(
            `DELETE FROM users WHERE company_id = 11 AND user_id != $1`,
            [adminId]
        );
        console.log('🗑️ users: ' + usersResult.rowCount + ' eliminados');

        // Eliminar departamentos
        console.log('');
        console.log('🏢 Eliminando departamentos...');
        const deptResult = await client.query(`DELETE FROM departments WHERE company_id = 11`);
        console.log('🗑️ departments: ' + deptResult.rowCount + ' eliminados');

        // Eliminar turnos
        console.log('⏰ Eliminando turnos...');
        const shiftResult = await client.query(`DELETE FROM shifts WHERE company_id = 11`);
        console.log('🗑️ shifts: ' + shiftResult.rowCount + ' eliminados');

        // REACTIVAR FKs
        console.log('');
        console.log('🔒 Reactivando FKs...');
        await client.query("SET session_replication_role = 'origin'");
        console.log('✅ FKs reactivadas');

        console.log('');
        console.log('═'.repeat(60));
        console.log('📊 ESTADO FINAL ISI (company_id=11):');

        const usersCount = await client.query(`SELECT COUNT(*) as count FROM users WHERE company_id = 11`);
        console.log('   users: ' + usersCount.rows[0].count);

        const deptsCount = await client.query(`SELECT COUNT(*) as count FROM departments WHERE company_id = 11`);
        console.log('   departments: ' + deptsCount.rows[0].count);

        const shiftsCount = await client.query(`SELECT COUNT(*) as count FROM shifts WHERE company_id = 11`);
        console.log('   shifts: ' + shiftsCount.rows[0].count);

        console.log('');
        console.log('✅ LIMPIEZA COMPLETADA - Solo admin preservado');

    } catch (error) {
        console.error('❌ Error:', error.message);
        // Asegurar reactivar FKs incluso si hay error
        await client.query("SET session_replication_role = 'origin'").catch(() => {});
    } finally {
        client.release();
        await pool.end();
    }
}

cleanTables();
