/**
 * ============================================================================
 * SEED HOUR BANK DATA - Datos de prueba para Banco de Horas
 * ============================================================================
 * Genera datos realistas de:
 * - Plantillas por sucursal (templates)
 * - Saldos de empleados (balances)
 * - Transacciones (acreditaciones, usos)
 * - Solicitudes pendientes (requests)
 * - Decisiones pendientes (decisions)
 *
 * Usa empleados REALES de la BD para garantizar integridad referencial.
 *
 * @date 2026-02-02
 * ============================================================================
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

async function seed() {
    const client = await pool.connect();

    try {
        console.log('🚀 Iniciando seeding de datos de Banco de Horas...\n');

        // 1. Obtener company_id de ISI
        const companyResult = await client.query(`
            SELECT company_id, slug, name FROM companies WHERE slug = 'isi' LIMIT 1
        `);

        if (companyResult.rows.length === 0) {
            throw new Error('Empresa ISI no encontrada');
        }

        const company = companyResult.rows[0];
        const companyId = company.company_id;
        console.log(`✅ Empresa: ${company.name} (ID: ${companyId})`);

        // 2. Obtener empleados activos
        const employeesResult = await client.query(`
            SELECT
                u.user_id,
                u."firstName",
                u."lastName",
                u.legajo,
                u.role,
                u.department_id,
                u.branch_id
            FROM users u
            WHERE u.company_id = $1
            AND u.is_active = true
            AND u.role IN ('employee', 'supervisor', 'admin')
            ORDER BY u."lastName"
            LIMIT 30
        `, [companyId]);

        const employees = employeesResult.rows;
        console.log(`✅ Empleados encontrados: ${employees.length}\n`);

        if (employees.length === 0) {
            throw new Error('No hay empleados activos en ISI');
        }

        // 3. Verificar tablas existen
        const tablesCheck = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name LIKE 'hour_bank%'
        `);
        console.log('📊 Tablas hour_bank existentes:', tablesCheck.rows.map(r => r.table_name).join(', '));

        // 4. Limpiar datos previos de prueba (opcional)
        console.log('\n🧹 Limpiando datos previos de hour_bank...');
        await client.query(`DELETE FROM hour_bank_transactions WHERE company_id = $1`, [companyId]);
        await client.query(`DELETE FROM hour_bank_requests WHERE company_id = $1`, [companyId]);
        await client.query(`DELETE FROM hour_bank_pending_decisions WHERE company_id = $1`, [companyId]);
        await client.query(`DELETE FROM hour_bank_balances WHERE company_id = $1`, [companyId]);
        console.log('✅ Datos previos eliminados');

        // 5. Verificar si existe plantilla, sino crear una
        const templateCheck = await client.query(`
            SELECT id FROM hour_bank_templates
            WHERE company_id = $1 AND is_current_version = true
            LIMIT 1
        `, [companyId]);

        let templateId;
        if (templateCheck.rows.length === 0) {
            console.log('\n📋 Creando plantilla de Banco de Horas...');
            const templateResult = await client.query(`
                INSERT INTO hour_bank_templates (
                    company_id, branch_id, country_code, template_code, template_name,
                    description, is_enabled,
                    conversion_rate_normal, conversion_rate_weekend, conversion_rate_holiday, conversion_rate_night,
                    max_accumulation_hours, max_monthly_accrual, min_balance_for_use,
                    expiration_enabled, expiration_months, expiration_warning_days, expired_hours_action,
                    employee_choice_enabled, choice_timeout_hours, default_action, choice_reminder_hours,
                    min_usage_hours, max_usage_hours_per_day, allow_partial_day_usage, allow_full_day_usage,
                    allow_early_departure, allow_late_arrival_compensation,
                    requires_supervisor_approval, requires_hr_approval, usage_requires_approval,
                    auto_approve_under_hours, advance_notice_days,
                    legal_reference, version, is_current_version
                ) VALUES (
                    $1, NULL, 'ARG', 'ARG-ISI-2026', 'Banco de Horas ISI Argentina',
                    'Plantilla de banco de horas para ISI Argentina según LCT', true,
                    1.5, 2.0, 2.0, 1.2,
                    120.00, 30.00, 0.50,
                    true, 12, 30, 'payout',
                    true, 24, 'bank', 8,
                    0.50, 8.00, true, true,
                    true, true,
                    false, false, true,
                    2.00, 2,
                    'LCT Art. 201', 1, true
                ) RETURNING id
            `, [companyId]);
            templateId = templateResult.rows[0].id;
            console.log(`✅ Plantilla creada: ID ${templateId}`);
        } else {
            templateId = templateCheck.rows[0].id;
            console.log(`✅ Plantilla existente: ID ${templateId}`);
        }

        // 6. Crear saldos y transacciones para cada empleado
        console.log('\n💰 Creando saldos y transacciones...');

        const transactionTypes = ['accrual', 'usage', 'accrual', 'accrual', 'usage'];
        const sourceTypes = ['overtime_weekday', 'overtime_weekend', 'overtime_holiday', 'early_departure', 'overtime_weekday'];

        let totalBalances = 0;
        let totalTransactions = 0;
        let totalRequests = 0;
        let totalDecisions = 0;

        for (const emp of employees) {
            // Saldo inicial aleatorio (0-50 horas)
            const initialBalance = Math.round(Math.random() * 5000) / 100; // 0.00 - 50.00
            const totalAccrued = initialBalance + Math.round(Math.random() * 2000) / 100;
            const totalUsed = totalAccrued - initialBalance;

            // Insertar balance
            await client.query(`
                INSERT INTO hour_bank_balances (
                    user_id, company_id, branch_id, template_id,
                    current_balance, total_accrued, total_used, total_expired, total_paid_out,
                    next_expiry_date, next_expiry_hours, last_transaction_at
                ) VALUES (
                    $1, $2, NULL, $3,
                    $4, $5, $6, 0, 0,
                    CURRENT_DATE + INTERVAL '180 days', $7, NOW()
                )
            `, [
                emp.user_id, companyId, templateId,
                initialBalance, totalAccrued, totalUsed,
                Math.round(initialBalance * 0.3 * 100) / 100
            ]);
            totalBalances++;

            // Crear 3-7 transacciones por empleado
            const numTransactions = 3 + Math.floor(Math.random() * 5);
            let runningBalance = 0;

            for (let t = 0; t < numTransactions; t++) {
                const txType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
                const sourceType = sourceTypes[Math.floor(Math.random() * sourceTypes.length)];

                let hoursRaw, conversionRate, hoursFinal;

                if (txType === 'accrual') {
                    hoursRaw = Math.round((1 + Math.random() * 3) * 100) / 100; // 1-4 horas
                    conversionRate = sourceType.includes('weekend') ? 2.0 :
                                    sourceType.includes('holiday') ? 2.0 : 1.5;
                    hoursFinal = Math.round(hoursRaw * conversionRate * 100) / 100;
                } else {
                    hoursRaw = Math.round((0.5 + Math.random() * 2) * 100) / 100; // 0.5-2.5 horas
                    conversionRate = 1.0;
                    hoursFinal = -hoursRaw; // Negativo para uso
                }

                const balanceBefore = runningBalance;
                runningBalance += hoursFinal;
                const balanceAfter = runningBalance;

                // Fecha aleatoria en los últimos 90 días
                const daysAgo = Math.floor(Math.random() * 90);

                await client.query(`
                    INSERT INTO hour_bank_transactions (
                        user_id, company_id, branch_id, template_id,
                        transaction_type, hours_raw, conversion_rate, hours_final,
                        balance_before, balance_after, source_type,
                        expires_at, is_expired, description, status, created_at
                    ) VALUES (
                        $1, $2, NULL, $3,
                        $4, $5, $6, $7,
                        $8, $9, $10,
                        CURRENT_DATE + INTERVAL '365 days', false,
                        $11, 'completed',
                        NOW() - INTERVAL '${daysAgo} days'
                    )
                `, [
                    emp.user_id, companyId, templateId,
                    txType, Math.abs(hoursRaw), conversionRate, hoursFinal,
                    balanceBefore, balanceAfter, sourceType,
                    txType === 'accrual' ?
                        `Acreditación de ${hoursRaw}h extras (${sourceType.replace('overtime_', '').replace('_', ' ')})` :
                        `Uso de ${Math.abs(hoursFinal)}h - ${sourceType.replace('overtime_', '').replace('_', ' ')}`
                ]);
                totalTransactions++;
            }

            // Crear solicitudes pendientes para algunos empleados (30%)
            if (Math.random() < 0.3 && initialBalance > 2) {
                const requestedHours = Math.min(initialBalance, Math.round((1 + Math.random() * 4) * 100) / 100);
                const requestTypes = ['early_departure', 'full_day', 'partial_day'];
                const requestType = requestTypes[Math.floor(Math.random() * requestTypes.length)];

                await client.query(`
                    INSERT INTO hour_bank_requests (
                        user_id, company_id, branch_id, template_id,
                        request_type, requested_date, hours_requested,
                        reason, status, created_at
                    ) VALUES (
                        $1, $2, NULL, $3,
                        $4, CURRENT_DATE + INTERVAL '${1 + Math.floor(Math.random() * 7)} days', $5,
                        $6, 'pending', NOW()
                    )
                `, [
                    emp.user_id, companyId, templateId,
                    requestType, requestedHours,
                    `Solicitud de ${requestType === 'early_departure' ? 'salida anticipada' : requestType === 'full_day' ? 'día completo' : 'uso parcial'}`
                ]);
                totalRequests++;
            }

            // Crear decisiones pendientes para algunos empleados (20%)
            if (Math.random() < 0.2) {
                const overtimeHours = Math.round((1 + Math.random() * 3) * 100) / 100;
                const conversionRate = 1.5;
                const bankedHours = Math.round(overtimeHours * conversionRate * 100) / 100;
                const paidAmount = Math.round(overtimeHours * 250 * 100) / 100; // $250/hora aprox

                await client.query(`
                    INSERT INTO hour_bank_pending_decisions (
                        user_id, company_id, overtime_date, overtime_hours, overtime_type,
                        if_paid_amount, if_banked_hours, conversion_rate,
                        status, expires_at, created_at
                    ) VALUES (
                        $1, $2, CURRENT_DATE - INTERVAL '1 day', $3, 'weekday',
                        $4, $5, $6,
                        'pending', NOW() + INTERVAL '24 hours', NOW()
                    )
                `, [
                    emp.user_id, companyId, overtimeHours,
                    paidAmount, bankedHours, conversionRate
                ]);
                totalDecisions++;
            }
        }

        console.log(`\n📊 RESUMEN DE DATOS GENERADOS:`);
        console.log(`   ✅ Saldos creados: ${totalBalances}`);
        console.log(`   ✅ Transacciones: ${totalTransactions}`);
        console.log(`   ✅ Solicitudes pendientes: ${totalRequests}`);
        console.log(`   ✅ Decisiones pendientes: ${totalDecisions}`);

        // 7. Mostrar algunos datos de verificación
        console.log('\n📋 VERIFICACIÓN - Top 5 saldos:');
        const verifyBalances = await client.query(`
            SELECT
                b.current_balance,
                b.total_accrued,
                b.total_used,
                u."firstName" || ' ' || u."lastName" as nombre
            FROM hour_bank_balances b
            JOIN users u ON b.user_id = u.user_id
            WHERE b.company_id = $1
            ORDER BY b.current_balance DESC
            LIMIT 5
        `, [companyId]);

        verifyBalances.rows.forEach((r, i) => {
            console.log(`   ${i+1}. ${r.nombre}: ${r.current_balance}h (Acred: ${r.total_accrued}h, Usado: ${r.total_used}h)`);
        });

        console.log('\n✅ ¡Seeding completado exitosamente!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

seed().catch(console.error);
