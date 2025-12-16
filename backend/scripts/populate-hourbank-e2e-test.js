#!/usr/bin/env node
/**
 * ============================================================================
 * SCRIPT: POBLACIÓN E2E COMPLETA - BANCO DE HORAS
 * ============================================================================
 *
 * Este script genera datos de prueba COMPLETOS para validar todo el circuito:
 *
 * 1. Fichajes con horas extras (basados en turnos reales)
 * 2. Decisiones de empleados (algunos al banco, algunos a pago)
 * 3. Canjes de horas con doble aprobación (Supervisor + RRHH)
 * 4. Actualización de attendances con overtime_destination y referencias
 * 5. Dashboard de uso diario
 *
 * Uso:
 *   node scripts/populate-hourbank-e2e-test.js --company=11
 *   node scripts/populate-hourbank-e2e-test.js --company=11 --days=30
 *   node scripts/populate-hourbank-e2e-test.js --company=11 --employees=10 --days=30
 *
 * @date 2025-12-15
 * ============================================================================
 */

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const args = process.argv.slice(2).reduce((acc, arg) => {
    const [k, v] = arg.replace('--', '').split('=');
    acc[k] = v || true;
    return acc;
}, {});

async function populateE2E() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║   🏭 POBLACIÓN E2E - BANCO DE HORAS                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    const results = {
        timestamp: new Date().toISOString(),
        attendancesCreated: 0,
        overtimeGenerated: 0,
        decisionsBanked: 0,
        decisionsPaid: 0,
        redemptionsCreated: 0,
        redemptionsApproved: 0,
        errors: []
    };

    try {
        require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
        const { sequelize } = require('../src/config/database');
        const { QueryTypes } = require('sequelize');
        await sequelize.authenticate();
        console.log('✅ Base de datos conectada\n');

        const HourBankService = require('../src/services/HourBankService');

        // Configuración
        const companyId = args.company ? parseInt(args.company) : 11;
        const daysToGenerate = args.days ? parseInt(args.days) : 30;
        const maxEmployees = args.employees ? parseInt(args.employees) : 10;

        console.log(`📋 Configuración:`);
        console.log(`   • Empresa ID: ${companyId}`);
        console.log(`   • Días a generar: ${daysToGenerate}`);
        console.log(`   • Máx empleados: ${maxEmployees}`);
        console.log('');

        // ═══════════════════════════════════════════════════════════════
        // PASO 1: Obtener empleados con turnos asignados
        // ═══════════════════════════════════════════════════════════════
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📍 PASO 1: Obtener empleados con turnos');
        console.log('═══════════════════════════════════════════════════════════════');

        const employees = await sequelize.query(`
            SELECT
                u.user_id,
                u."firstName",
                u."lastName",
                u.company_id,
                u.branch_id,
                u.department_id,
                usa.shift_id,
                s.name as shift_name,
                s."startTime" as shift_start,
                s."endTime" as shift_end,
                s."breakStartTime" as break_start,
                s."breakEndTime" as break_end
            FROM users u
            INNER JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = true
            INNER JOIN shifts s ON usa.shift_id = s.id
            WHERE u.company_id = :companyId
              AND u.is_active = true
              AND u.role = 'employee'
            LIMIT :maxEmployees
        `, {
            replacements: { companyId, maxEmployees },
            type: QueryTypes.SELECT
        });

        if (employees.length === 0) {
            throw new Error('No se encontraron empleados con turnos asignados');
        }

        console.log(`   ✅ Encontrados ${employees.length} empleados con turnos`);
        employees.forEach(e => {
            console.log(`      • ${e.firstName} ${e.lastName} - ${e.shift_name} (${e.shift_start}-${e.shift_end})`);
        });

        // Obtener supervisor y RRHH para aprobaciones
        // Roles válidos: manager, admin, supervisor, employee, medical, super_admin, vendor
        const [supervisor] = await sequelize.query(`
            SELECT user_id, "firstName", "lastName", role FROM users
            WHERE company_id = :companyId AND role IN ('supervisor', 'manager', 'admin') AND is_active = true
            ORDER BY CASE role WHEN 'supervisor' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END
            LIMIT 1
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        // Para RRHH usamos admin o manager (no existe rol 'hr' en el sistema)
        const [rrhhUser] = await sequelize.query(`
            SELECT user_id, "firstName", "lastName", role FROM users
            WHERE company_id = :companyId AND role IN ('admin', 'manager') AND is_active = true
            ORDER BY CASE role WHEN 'admin' THEN 1 ELSE 2 END
            LIMIT 1
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        console.log(`   ✅ Supervisor: ${supervisor?.firstName || 'N/A'} ${supervisor?.lastName || ''}`);
        console.log(`   ✅ RRHH: ${rrhhUser?.firstName || 'N/A'} ${rrhhUser?.lastName || ''}`);

        // ═══════════════════════════════════════════════════════════════
        // PASO 2: Generar fichajes con horas extras
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📍 PASO 2: Generar fichajes con horas extras');
        console.log('═══════════════════════════════════════════════════════════════');

        const today = new Date();

        for (const employee of employees) {
            console.log(`\n   👤 ${employee.firstName} ${employee.lastName}:`);

            // Generar fichajes de los últimos N días
            for (let dayOffset = daysToGenerate; dayOffset >= 1; dayOffset--) {
                const workDate = new Date(today);
                workDate.setDate(workDate.getDate() - dayOffset);

                // Saltar fines de semana (opcional, algunos días con HE de fin de semana)
                const dayOfWeek = workDate.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                // 70% de días trabaja, 30% descansa o falta
                if (Math.random() > 0.7 && !isWeekend) continue;

                // Calcular horarios basados en turno
                const [startHour, startMin] = (employee.shift_start || '08:00:00').split(':').map(Number);
                const [endHour, endMin] = (employee.shift_end || '17:00:00').split(':').map(Number);

                // Calcular duración normal del turno
                let normalHours = endHour - startHour;
                if (endHour < startHour) normalHours = (24 - startHour) + endHour; // Turno nocturno

                // Simular entrada (a veces tarde, a veces a tiempo)
                const checkInDate = new Date(workDate);
                checkInDate.setHours(startHour, startMin + Math.floor(Math.random() * 15) - 5, 0, 0);

                // Simular salida con probabilidad de horas extras
                const checkOutDate = new Date(workDate);
                let overtimeHours = 0;
                let overtimeType = 'weekday';

                // 40% de días con horas extras
                if (Math.random() < 0.4) {
                    overtimeHours = Math.floor(Math.random() * 4) + 1; // 1-4 horas extras
                    if (isWeekend) overtimeType = 'weekend';
                }

                checkOutDate.setHours(endHour + overtimeHours, endMin + Math.floor(Math.random() * 30), 0, 0);
                if (checkOutDate.getHours() < checkInDate.getHours()) {
                    checkOutDate.setDate(checkOutDate.getDate() + 1);
                }

                // Calcular horas trabajadas
                const workingHoursRaw = (checkOutDate - checkInDate) / (1000 * 60 * 60);
                const breakHours = 1; // 1 hora de almuerzo
                const workingHours = Math.max(0, workingHoursRaw - breakHours);

                // Determinar destino de horas extras (50% banco, 50% pago)
                let overtimeDestination = null;
                if (overtimeHours > 0) {
                    overtimeDestination = Math.random() < 0.5 ? 'bank' : 'paid';
                }

                // Verificar si ya existe el fichaje
                const [existing] = await sequelize.query(`
                    SELECT id FROM attendances
                    WHERE "UserId" = :userId AND date = :workDate
                `, {
                    replacements: { userId: employee.user_id, workDate: workDate.toISOString().split('T')[0] },
                    type: QueryTypes.SELECT
                });

                if (existing) continue; // Ya existe, saltar

                // Crear el fichaje
                // NOTA: shift_id en attendances es bigint pero shifts.id es uuid
                // Por ahora dejamos shift_id como NULL y guardamos shift_name en notes
                const attendanceId = uuidv4();
                await sequelize.query(`
                    INSERT INTO attendances (
                        id, "UserId", "BranchId", company_id, department_id,
                        date, work_date, "checkInTime", "checkOutTime",
                        "workingHours", overtime_hours, overtime_destination,
                        status, "checkInMethod", "checkOutMethod",
                        is_late, minutes_late, is_processed, notes,
                        "createdAt", "updatedAt"
                    ) VALUES (
                        :id, :userId, :branchId, :companyId, :departmentId,
                        :date, :workDate, :checkIn, :checkOut,
                        :workingHours, :overtimeHours, :overtimeDestination,
                        :status, 'fingerprint', 'fingerprint',
                        :isLate, :minutesLate, false, :notes,
                        NOW(), NOW()
                    )
                `, {
                    replacements: {
                        id: attendanceId,
                        userId: employee.user_id,
                        branchId: employee.branch_id,
                        companyId: companyId,
                        departmentId: employee.department_id,
                        date: workDate.toISOString().split('T')[0],
                        workDate: workDate.toISOString().split('T')[0],
                        checkIn: checkInDate.toISOString(),
                        checkOut: checkOutDate.toISOString(),
                        workingHours: workingHours.toFixed(2),
                        overtimeHours: overtimeHours,
                        overtimeDestination: overtimeDestination,
                        status: checkInDate.getMinutes() > startMin + 5 ? 'late' : 'present',
                        isLate: checkInDate.getMinutes() > startMin + 5,
                        minutesLate: Math.max(0, checkInDate.getMinutes() - startMin),
                        notes: `Turno: ${employee.shift_name} (${employee.shift_start}-${employee.shift_end})`
                    },
                    type: QueryTypes.INSERT
                });

                results.attendancesCreated++;

                // Si hay horas extras, procesarlas
                if (overtimeHours > 0) {
                    results.overtimeGenerated++;

                    // Procesar según destino
                    if (overtimeDestination === 'bank') {
                        try {
                            const depositResult = await HourBankService.processOvertimeHour({
                                userId: employee.user_id,
                                companyId: companyId,
                                branchId: employee.branch_id,
                                attendanceId: attendanceId,
                                overtimeDate: workDate.toISOString().split('T')[0],
                                overtimeHours: overtimeHours,
                                overtimeType: overtimeType
                            });

                            if (depositResult.success) {
                                // Si requiere decisión, procesarla automáticamente como "bank"
                                if (depositResult.action === 'pending_decision') {
                                    const [pending] = await sequelize.query(`
                                        SELECT id FROM hour_bank_pending_decisions
                                        WHERE user_id = :userId AND company_id = :companyId AND status = 'pending'
                                        ORDER BY created_at DESC LIMIT 1
                                    `, { replacements: { userId: employee.user_id, companyId }, type: QueryTypes.SELECT });

                                    if (pending?.id) {
                                        const decisionResult = await HourBankService.processEmployeeDecision(
                                            pending.id, 'bank', employee.user_id
                                        );
                                        if (decisionResult.success) {
                                            results.decisionsBanked++;

                                            // Actualizar attendance con referencia a transacción
                                            if (decisionResult.transactionId) {
                                                await sequelize.query(`
                                                    UPDATE attendances
                                                    SET hour_bank_transaction_id = :txId, is_processed = true
                                                    WHERE id = :attId
                                                `, {
                                                    replacements: { txId: decisionResult.transactionId, attId: attendanceId },
                                                    type: QueryTypes.UPDATE
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            results.errors.push(`Deposit error: ${e.message}`);
                        }
                    } else {
                        // Marcar como pagadas
                        results.decisionsPaid++;
                        await sequelize.query(`
                            UPDATE attendances SET is_processed = true WHERE id = :id
                        `, { replacements: { id: attendanceId }, type: QueryTypes.UPDATE });
                    }
                }
            }

            console.log(`      ✅ Fichajes generados`);
        }

        console.log(`\n   📊 Resumen fichajes:`);
        console.log(`      • Fichajes creados: ${results.attendancesCreated}`);
        console.log(`      • Con horas extras: ${results.overtimeGenerated}`);
        console.log(`      • Enviadas al banco: ${results.decisionsBanked}`);
        console.log(`      • Marcadas para pago: ${results.decisionsPaid}`);

        // ═══════════════════════════════════════════════════════════════
        // PASO 3: Simular canjes con doble aprobación
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📍 PASO 3: Simular canjes con doble aprobación');
        console.log('═══════════════════════════════════════════════════════════════');

        // Obtener empleados con saldo positivo
        const employeesWithBalance = await sequelize.query(`
            SELECT
                hbb.user_id,
                hbb.current_balance,
                u."firstName",
                u."lastName"
            FROM hour_bank_balances hbb
            INNER JOIN users u ON hbb.user_id = u.user_id
            WHERE hbb.company_id = :companyId AND hbb.current_balance > 1
            LIMIT 5
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        console.log(`   Empleados con saldo para canje: ${employeesWithBalance.length}`);

        for (const emp of employeesWithBalance) {
            // Crear solicitud de canje (1-2 horas)
            const hoursToRedeem = Math.min(emp.current_balance, Math.floor(Math.random() * 2) + 1);
            const scheduledDate = new Date();
            scheduledDate.setDate(scheduledDate.getDate() + Math.floor(Math.random() * 7) + 1);

            try {
                const redemptionResult = await HourBankService.createRedemptionRequest({
                    userId: emp.user_id,
                    companyId: companyId,
                    hoursRequested: hoursToRedeem,
                    scheduledDate: scheduledDate.toISOString().split('T')[0],
                    redemptionType: Math.random() < 0.5 ? 'early_departure' : 'late_arrival',
                    reason: 'Solicitud de prueba E2E'
                });

                if (redemptionResult.success) {
                    results.redemptionsCreated++;
                    console.log(`   ✅ ${emp.firstName}: Solicitud de ${hoursToRedeem}h creada`);

                    // Simular aprobaciones si hay supervisor y RRHH
                    if (supervisor && redemptionResult.requestId) {
                        // Aprobar por supervisor
                        await HourBankService.approveRedemption(
                            redemptionResult.requestId,
                            supervisor.user_id,
                            'supervisor',
                            'Aprobado por supervisor (test)'
                        );

                        // Aprobar por RRHH
                        if (rrhhUser) {
                            const finalApproval = await HourBankService.approveRedemption(
                                redemptionResult.requestId,
                                rrhhUser.user_id,
                                'hr',
                                'Aprobado por RRHH (test)'
                            );

                            if (finalApproval?.success) {
                                results.redemptionsApproved++;
                                console.log(`      ✅ Aprobación completa (Sup + RRHH)`);
                            }
                        }
                    }
                } else {
                    console.log(`   ⚠️  ${emp.firstName}: ${redemptionResult.message || redemptionResult.error}`);
                }
            } catch (e) {
                results.errors.push(`Redemption error: ${e.message}`);
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // PASO 4: Generar reporte de uso diario
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📍 PASO 4: Reporte de uso diario');
        console.log('═══════════════════════════════════════════════════════════════');

        const dailyUsage = await sequelize.query(`
            SELECT
                DATE(created_at) as fecha,
                COUNT(*) as transacciones,
                SUM(CASE WHEN transaction_type = 'accrual' THEN hours_final ELSE 0 END) as horas_acumuladas,
                SUM(CASE WHEN transaction_type = 'usage' THEN ABS(hours_final) ELSE 0 END) as horas_usadas,
                SUM(CASE WHEN transaction_type = 'expiry' THEN ABS(hours_final) ELSE 0 END) as horas_expiradas
            FROM hour_bank_transactions
            WHERE company_id = :companyId
              AND created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY fecha DESC
            LIMIT 10
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        console.log('\n   📊 USO DIARIO (últimos 10 días con actividad):');
        console.log('   ─────────────────────────────────────────────────────────');
        console.log('   Fecha       | Txs | Acumuladas | Usadas | Expiradas');
        console.log('   ─────────────────────────────────────────────────────────');

        dailyUsage.forEach(day => {
            const fecha = new Date(day.fecha).toISOString().split('T')[0];
            console.log(`   ${fecha} |  ${String(day.transacciones).padStart(2)} |    ${String(parseFloat(day.horas_acumuladas || 0).toFixed(1)).padStart(5)}h |  ${String(parseFloat(day.horas_usadas || 0).toFixed(1)).padStart(5)}h |    ${String(parseFloat(day.horas_expiradas || 0).toFixed(1)).padStart(5)}h`);
        });

        // Resumen de balances
        const balanceSummary = await sequelize.query(`
            SELECT
                COUNT(*) as total_empleados,
                SUM(current_balance) as total_horas_banco,
                AVG(current_balance) as promedio_por_empleado,
                MAX(current_balance) as max_balance,
                MIN(current_balance) as min_balance
            FROM hour_bank_balances
            WHERE company_id = :companyId
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        const summary = balanceSummary[0];
        console.log('\n   📊 RESUMEN DE BALANCES:');
        console.log(`   • Total empleados con banco: ${summary.total_empleados}`);
        console.log(`   • Total horas en banco: ${parseFloat(summary.total_horas_banco || 0).toFixed(2)}h`);
        console.log(`   • Promedio por empleado: ${parseFloat(summary.promedio_por_empleado || 0).toFixed(2)}h`);
        console.log(`   • Balance máximo: ${parseFloat(summary.max_balance || 0).toFixed(2)}h`);
        console.log(`   • Balance mínimo: ${parseFloat(summary.min_balance || 0).toFixed(2)}h`);

        // ═══════════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ═══════════════════════════════════════════════════════════════
        console.log('\n');
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║                 RESUMEN POBLACIÓN E2E                        ║');
        console.log('╠══════════════════════════════════════════════════════════════╣');
        console.log(`║  Fichajes creados:        ${String(results.attendancesCreated).padStart(5)}                          ║`);
        console.log(`║  Con horas extras:        ${String(results.overtimeGenerated).padStart(5)}                          ║`);
        console.log(`║  Enviadas al banco:       ${String(results.decisionsBanked).padStart(5)}                          ║`);
        console.log(`║  Marcadas para pago:      ${String(results.decisionsPaid).padStart(5)}                          ║`);
        console.log(`║  Canjes solicitados:      ${String(results.redemptionsCreated).padStart(5)}                          ║`);
        console.log(`║  Canjes aprobados:        ${String(results.redemptionsApproved).padStart(5)}                          ║`);
        console.log('╠══════════════════════════════════════════════════════════════╣');
        if (results.errors.length === 0) {
            console.log('║  ✅ POBLACIÓN COMPLETADA SIN ERRORES                         ║');
        } else {
            console.log(`║  ⚠️  Errores encontrados: ${results.errors.length}                                ║`);
        }
        console.log('╚══════════════════════════════════════════════════════════════╝');

        // Guardar resultados
        const resultsPath = path.join(__dirname, '..', 'logs', `hourbank-e2e-populate-${Date.now()}.json`);
        fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        console.log(`\n📁 Resultados: ${resultsPath}`);

        await sequelize.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

populateE2E();
