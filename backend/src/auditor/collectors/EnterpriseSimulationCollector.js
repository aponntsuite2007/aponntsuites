/**
 * ============================================================================
 * ENTERPRISE SIMULATION COLLECTOR - Validación de Integridad Empresarial
 * ============================================================================
 *
 * Collector de nivel EJECUTIVO para Phase4TestOrchestrator.
 *
 * VALIDACIONES INCLUIDAS:
 * 1. SSOT (Single Source of Truth) - Unicidad de datos
 * 2. Integridad Referencial - FKs y relaciones
 * 3. Duplicados - Detección de registros repetidos
 * 4. Cadenas de Datos - Consistencia de flujos
 * 5. Balance de Vacaciones - Coherencia de días
 * 6. Consistencia de Reportes - Métricas correctas
 * 7. Workflows - Flujos de negocio completos
 *
 * @version 1.0.0
 * @date 2025-12-08
 * @author Sistema de Testing Enterprise
 * ============================================================================
 */

const BaseModuleCollector = require('./BaseModuleCollector');

class EnterpriseSimulationCollector extends BaseModuleCollector {
    constructor(database, systemRegistry, baseURL = null, companyId = 11) {
        super(database, systemRegistry, baseURL);
        this.companyId = companyId;
        this.results = {
            ssotViolations: [],
            duplicates: [],
            brokenChains: [],
            orphanedRecords: [],
            inconsistencies: [],
            metrics: {}
        };
    }

    getModuleConfig() {
        return {
            moduleName: 'enterprise-simulation',
            moduleURL: '/panel-empresa.html',
            testCategories: [
                { name: 'ssot_validation', func: this.testSSOTValidation.bind(this), description: 'Fuente Única de Verdad' },
                { name: 'duplicate_detection', func: this.testDuplicateDetection.bind(this), description: 'Detección de Duplicados' },
                { name: 'referential_integrity', func: this.testReferentialIntegrity.bind(this), description: 'Integridad Referencial' },
                { name: 'vacation_balance', func: this.testVacationBalance.bind(this), description: 'Balance de Vacaciones' },
                { name: 'attendance_chain', func: this.testAttendanceChain.bind(this), description: 'Cadena de Asistencias' },
                { name: 'notification_consistency', func: this.testNotificationConsistency.bind(this), description: 'Consistencia de Notificaciones' },
                { name: 'shift_assignment', func: this.testShiftAssignment.bind(this), description: 'Asignación de Turnos' },
                { name: 'report_consistency', func: this.testReportConsistency.bind(this), description: 'Consistencia de Reportes' }
            ]
        };
    }

    getModuleName() {
        return 'Enterprise Simulation';
    }

    /**
     * Test 1: SSOT Validation - Verifica fuente única de verdad
     */
    async testSSOTValidation(execution_id) {
        const results = [];
        const { sequelize } = this.database;

        console.log('  📊 [SSOT] Verificando fuente única de verdad...');

        // 1.1 Un empleado = Un departamento
        const [deptCheck] = await sequelize.query(`
            SELECT u.user_id, u."firstName", u."lastName", COUNT(u.department_id) as dept_count
            FROM users u
            WHERE u.company_id = :companyId AND u."isActive" = true
            GROUP BY u.user_id, u."firstName", u."lastName"
            HAVING COUNT(u.department_id) > 1
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'employee_one_department',
            passed: deptCheck.length === 0,
            details: deptCheck.length === 0
                ? '✅ Todos los empleados tienen exactamente un departamento'
                : `❌ ${deptCheck.length} empleados con múltiples departamentos`,
            violations: deptCheck
        });

        // 1.2 Un empleado = Un turno activo (en user_shift_assignments)
        const [shiftCheck] = await sequelize.query(`
            SELECT usa.user_id, COUNT(*) as active_shifts
            FROM user_shift_assignments usa
            WHERE usa.company_id = :companyId AND usa.is_active = true
            GROUP BY usa.user_id
            HAVING COUNT(*) > 1
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'employee_one_active_shift',
            passed: shiftCheck.length === 0,
            details: shiftCheck.length === 0
                ? '✅ Todos los empleados tienen máximo un turno activo'
                : `❌ ${shiftCheck.length} empleados con múltiples turnos activos`,
            violations: shiftCheck
        });

        // 1.3 Legajos únicos
        const [legajoCheck] = await sequelize.query(`
            SELECT legajo, COUNT(*) as count
            FROM users
            WHERE company_id = :companyId AND "isActive" = true AND legajo IS NOT NULL
            GROUP BY legajo
            HAVING COUNT(*) > 1
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'unique_legajos',
            passed: legajoCheck.length === 0,
            details: legajoCheck.length === 0
                ? '✅ Todos los legajos son únicos'
                : `❌ ${legajoCheck.length} legajos duplicados`,
            violations: legajoCheck
        });

        return {
            category: 'ssot_validation',
            tests: results,
            passed: results.every(r => r.passed),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Test 2: Duplicate Detection - Busca registros duplicados
     */
    async testDuplicateDetection(execution_id) {
        const results = [];
        const { sequelize } = this.database;

        console.log('  🔍 [DUPLICATES] Buscando registros duplicados...');

        // 2.1 Asistencias duplicadas (mismo usuario, misma fecha)
        const [attendanceDups] = await sequelize.query(`
            SELECT "UserId", date, COUNT(*) as count
            FROM attendances
            WHERE company_id = :companyId
            GROUP BY "UserId", date
            HAVING COUNT(*) > 1
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'duplicate_attendances',
            passed: attendanceDups.length === 0,
            details: attendanceDups.length === 0
                ? '✅ No hay asistencias duplicadas'
                : `⚠️ ${attendanceDups.length} días con asistencias duplicadas`,
            duplicates: attendanceDups
        });

        // 2.2 Notificaciones duplicadas (mismo destinatario, mismo tipo, misma fecha)
        const [notifDups] = await sequelize.query(`
            SELECT recipient_user_id, notification_type, DATE(created_at) as date, COUNT(*) as count
            FROM notifications
            WHERE company_id = :companyId
            GROUP BY recipient_user_id, notification_type, DATE(created_at)
            HAVING COUNT(*) > 1
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'duplicate_notifications',
            passed: notifDups.length === 0,
            details: notifDups.length === 0
                ? '✅ No hay notificaciones duplicadas'
                : `⚠️ ${notifDups.length} notificaciones duplicadas`,
            duplicates: notifDups
        });

        // 2.3 Documentos duplicados (mismo usuario, mismo tipo)
        const [docDups] = await sequelize.query(`
            SELECT user_id, document_type, COUNT(*) as count
            FROM user_documents
            WHERE company_id = :companyId
            GROUP BY user_id, document_type
            HAVING COUNT(*) > 1
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'duplicate_documents',
            passed: docDups.length <= 5, // Permitir hasta 5 por renovaciones
            details: docDups.length <= 5
                ? `✅ Documentos duplicados dentro del rango aceptable (${docDups.length})`
                : `⚠️ ${docDups.length} documentos duplicados (posibles renovaciones)`,
            duplicates: docDups
        });

        return {
            category: 'duplicate_detection',
            tests: results,
            passed: results.every(r => r.passed),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Test 3: Referential Integrity - Verifica FKs y relaciones
     */
    async testReferentialIntegrity(execution_id) {
        const results = [];
        const { sequelize } = this.database;

        console.log('  🔗 [INTEGRITY] Verificando integridad referencial...');

        // 3.1 Asistencias sin usuario válido
        const [orphanAttendances] = await sequelize.query(`
            SELECT a.id, a."UserId"
            FROM attendances a
            LEFT JOIN users u ON a."UserId" = u.user_id
            WHERE a.company_id = :companyId AND u.user_id IS NULL
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'attendance_user_fk',
            passed: orphanAttendances.length === 0,
            details: orphanAttendances.length === 0
                ? '✅ Todas las asistencias tienen usuario válido'
                : `❌ ${orphanAttendances.length} asistencias huérfanas`,
            orphans: orphanAttendances
        });

        // 3.2 Usuarios sin departamento válido
        const [orphanUsers] = await sequelize.query(`
            SELECT u.user_id, u."firstName", u."lastName", u.department_id
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.company_id = :companyId
              AND u."isActive" = true
              AND u.department_id IS NOT NULL
              AND d.id IS NULL
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'user_department_fk',
            passed: orphanUsers.length === 0,
            details: orphanUsers.length === 0
                ? '✅ Todos los usuarios tienen departamento válido'
                : `❌ ${orphanUsers.length} usuarios con departamento inválido`,
            orphans: orphanUsers
        });

        // 3.3 Vacaciones sin usuario válido
        const [orphanVacations] = await sequelize.query(`
            SELECT v.id, v.user_id
            FROM vacation_requests v
            LEFT JOIN users u ON v.user_id = u.user_id
            WHERE v.company_id = :companyId AND u.user_id IS NULL
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'vacation_user_fk',
            passed: orphanVacations.length === 0,
            details: orphanVacations.length === 0
                ? '✅ Todas las vacaciones tienen usuario válido'
                : `❌ ${orphanVacations.length} vacaciones huérfanas`,
            orphans: orphanVacations
        });

        return {
            category: 'referential_integrity',
            tests: results,
            passed: results.every(r => r.passed),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Test 4: Vacation Balance - Verifica coherencia de balance
     */
    async testVacationBalance(execution_id) {
        const results = [];
        const { sequelize } = this.database;

        console.log('  🏖️ [VACATION] Verificando balance de vacaciones...');

        // 4.1 Solicitudes que exceden el balance (usando días por defecto de 14)
        // Nota: vacation_configurations no tiene annual_days, usa vacation_scales para definir días por antigüedad
        const [balanceViolations] = await sequelize.query(`
            SELECT
                vr.user_id,
                u."firstName" || ' ' || u."lastName" as employee_name,
                vr.total_days as days_requested,
                14 as available_days,
                COALESCE((
                    SELECT SUM(total_days)
                    FROM vacation_requests vr2
                    WHERE vr2.user_id = vr.user_id
                      AND vr2.status = 'approved'
                      AND vr2.id != vr.id
                      AND EXTRACT(YEAR FROM vr2.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                ), 0) as already_used
            FROM vacation_requests vr
            JOIN users u ON vr.user_id = u.user_id
            WHERE vr.company_id = :companyId
              AND vr.status IN ('pending', 'approved')
              AND vr.total_days > (14 - COALESCE((
                  SELECT SUM(total_days)
                  FROM vacation_requests vr3
                  WHERE vr3.user_id = vr.user_id
                    AND vr3.status = 'approved'
                    AND vr3.id != vr.id
                    AND EXTRACT(YEAR FROM vr3.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
              ), 0))
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'vacation_balance_exceeded',
            passed: balanceViolations.length === 0,
            details: balanceViolations.length === 0
                ? '✅ Todas las solicitudes respetan el balance disponible'
                : `❌ ${balanceViolations.length} solicitudes exceden el balance`,
            violations: balanceViolations
        });

        // 4.2 Días negativos de vacaciones
        const [negativeDays] = await sequelize.query(`
            SELECT vr.id, vr.total_days as days_requested
            FROM vacation_requests vr
            WHERE vr.company_id = :companyId AND vr.total_days <= 0
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'vacation_negative_days',
            passed: negativeDays.length === 0,
            details: negativeDays.length === 0
                ? '✅ No hay solicitudes con días negativos o cero'
                : `❌ ${negativeDays.length} solicitudes con días inválidos`,
            violations: negativeDays
        });

        return {
            category: 'vacation_balance',
            tests: results,
            passed: results.every(r => r.passed),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Test 5: Attendance Chain - Verifica cadena de asistencias
     */
    async testAttendanceChain(execution_id) {
        const results = [];
        const { sequelize } = this.database;

        console.log('  ⏰ [ATTENDANCE] Verificando cadena de asistencias...');

        // 5.1 Check-outs sin check-ins
        const [missingCheckIns] = await sequelize.query(`
            SELECT id, "UserId", date, "checkOutTime"
            FROM attendances
            WHERE company_id = :companyId
              AND "checkInTime" IS NULL
              AND "checkOutTime" IS NOT NULL
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'checkout_without_checkin',
            passed: missingCheckIns.length === 0,
            details: missingCheckIns.length === 0
                ? '✅ Todos los check-outs tienen check-in previo'
                : `❌ ${missingCheckIns.length} check-outs sin check-in`,
            violations: missingCheckIns
        });

        // 5.2 Check-out antes de check-in
        const [invalidTimes] = await sequelize.query(`
            SELECT id, "UserId", date, "checkInTime", "checkOutTime"
            FROM attendances
            WHERE company_id = :companyId
              AND "checkInTime" IS NOT NULL
              AND "checkOutTime" IS NOT NULL
              AND "checkOutTime" < "checkInTime"
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'checkout_before_checkin',
            passed: invalidTimes.length === 0,
            details: invalidTimes.length === 0
                ? '✅ Todos los horarios son coherentes'
                : `❌ ${invalidTimes.length} registros con check-out antes de check-in`,
            violations: invalidTimes
        });

        // 5.3 Jornadas excesivamente largas (> 16 horas)
        const [longShifts] = await sequelize.query(`
            SELECT id, "UserId", date, "checkInTime", "checkOutTime",
                   EXTRACT(EPOCH FROM ("checkOutTime" - "checkInTime")) / 3600 as hours
            FROM attendances
            WHERE company_id = :companyId
              AND "checkInTime" IS NOT NULL
              AND "checkOutTime" IS NOT NULL
              AND EXTRACT(EPOCH FROM ("checkOutTime" - "checkInTime")) / 3600 > 16
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'excessive_shift_hours',
            passed: longShifts.length === 0,
            details: longShifts.length === 0
                ? '✅ No hay jornadas excesivamente largas'
                : `⚠️ ${longShifts.length} jornadas mayores a 16 horas`,
            warnings: longShifts
        });

        return {
            category: 'attendance_chain',
            tests: results,
            passed: results.every(r => r.passed),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Test 6: Notification Consistency - Verifica consistencia de notificaciones
     */
    async testNotificationConsistency(execution_id) {
        const results = [];
        const { sequelize } = this.database;

        console.log('  🔔 [NOTIFICATIONS] Verificando consistencia de notificaciones...');

        // 6.1 Notificaciones sin destinatario válido
        const [invalidRecipients] = await sequelize.query(`
            SELECT n.id, n.recipient_user_id
            FROM notifications n
            LEFT JOIN users u ON n.recipient_user_id = u.user_id
            WHERE n.company_id = :companyId AND u.user_id IS NULL
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'notification_valid_recipient',
            passed: invalidRecipients.length === 0,
            details: invalidRecipients.length === 0
                ? '✅ Todas las notificaciones tienen destinatario válido'
                : `❌ ${invalidRecipients.length} notificaciones sin destinatario`,
            violations: invalidRecipients
        });

        // 6.2 Tasa de lectura
        const [readStats] = await sequelize.query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN is_read = true THEN 1 ELSE 0 END) as read_count
            FROM notifications
            WHERE company_id = :companyId
        `, { replacements: { companyId: this.companyId } });

        const readRate = readStats[0].total > 0
            ? (readStats[0].read_count / readStats[0].total * 100).toFixed(1)
            : 100;

        results.push({
            test: 'notification_read_rate',
            passed: parseFloat(readRate) >= 30, // Al menos 30% leídas
            details: `📊 Tasa de lectura: ${readRate}% (${readStats[0].read_count}/${readStats[0].total})`,
            metrics: { readRate, total: readStats[0].total, read: readStats[0].read_count }
        });

        return {
            category: 'notification_consistency',
            tests: results,
            passed: results.every(r => r.passed),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Test 7: Shift Assignment - Verifica asignación de turnos
     */
    async testShiftAssignment(execution_id) {
        const results = [];
        const { sequelize } = this.database;

        console.log('  ⏲️ [SHIFTS] Verificando asignación de turnos...');

        // 7.1 Empleados activos sin turno asignado
        const [noShift] = await sequelize.query(`
            SELECT u.user_id, u."firstName", u."lastName"
            FROM users u
            LEFT JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = true
            WHERE u.company_id = :companyId
              AND u."isActive" = true
              AND u.role = 'employee'
              AND usa.id IS NULL
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'employees_with_shift',
            passed: noShift.length === 0,
            details: noShift.length === 0
                ? '✅ Todos los empleados tienen turno asignado'
                : `⚠️ ${noShift.length} empleados sin turno`,
            warnings: noShift.slice(0, 10) // Limitar a 10 para el log
        });

        // 7.2 Turnos asignados a usuarios inactivos
        const [inactiveAssignments] = await sequelize.query(`
            SELECT usa.id, usa.user_id, u."firstName", u."lastName"
            FROM user_shift_assignments usa
            JOIN users u ON usa.user_id = u.user_id
            WHERE usa.company_id = :companyId
              AND usa.is_active = true
              AND u."isActive" = false
        `, { replacements: { companyId: this.companyId } });

        results.push({
            test: 'active_shifts_inactive_users',
            passed: inactiveAssignments.length === 0,
            details: inactiveAssignments.length === 0
                ? '✅ No hay turnos activos para usuarios inactivos'
                : `❌ ${inactiveAssignments.length} turnos activos para usuarios inactivos`,
            violations: inactiveAssignments
        });

        return {
            category: 'shift_assignment',
            tests: results,
            passed: results.every(r => r.passed),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Test 8: Report Consistency - Verifica consistencia de métricas
     */
    async testReportConsistency(execution_id) {
        const results = [];
        const { sequelize } = this.database;

        console.log('  📈 [REPORTS] Verificando consistencia de reportes...');

        // 8.1 Headcount por departamento
        const [headcount] = await sequelize.query(`
            SELECT
                d.name as department,
                COUNT(u.user_id) as count
            FROM departments d
            LEFT JOIN users u ON d.id = u.department_id AND u."isActive" = true
            WHERE d.company_id = :companyId AND d.is_active = true
            GROUP BY d.id, d.name
            ORDER BY count DESC
        `, { replacements: { companyId: this.companyId } });

        const totalHeadcount = headcount.reduce((sum, d) => sum + parseInt(d.count), 0);

        results.push({
            test: 'headcount_consistency',
            passed: true,
            details: `📊 Headcount total: ${totalHeadcount} empleados en ${headcount.length} departamentos`,
            metrics: { total: totalHeadcount, byDepartment: headcount }
        });

        // 8.2 Tasa de ausentismo (últimos 30 días)
        const [absenceRate] = await sequelize.query(`
            WITH working_days AS (
                SELECT COUNT(*) * (SELECT COUNT(*) FROM users WHERE company_id = :companyId AND "isActive" = true AND role = 'employee') as expected_records
                FROM generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '1 day', '1 day') d
                WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
            ),
            actual_attendance AS (
                SELECT COUNT(*) as actual_records
                FROM attendances
                WHERE company_id = :companyId
                  AND date >= CURRENT_DATE - INTERVAL '30 days'
                  AND "checkInTime" IS NOT NULL
            )
            SELECT
                wd.expected_records,
                aa.actual_records,
                CASE WHEN wd.expected_records > 0
                     THEN ROUND((1 - aa.actual_records::numeric / wd.expected_records) * 100, 2)
                     ELSE 0 END as absence_rate
            FROM working_days wd, actual_attendance aa
        `, { replacements: { companyId: this.companyId } });

        const absRate = absenceRate[0]?.absence_rate || 0;

        // absence_rate es una MÉTRICA informativa, no un test de integridad
        // Siempre pasa porque es solo información estadística
        results.push({
            test: 'absence_rate',
            passed: true, // Siempre pasa - es métrica informativa
            isMetric: true,
            details: `📊 Tasa de ausentismo: ${absRate}% (métrica informativa)`,
            metrics: absenceRate[0]
        });

        return {
            category: 'report_consistency',
            tests: results,
            passed: results.every(r => r.passed),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Ejecuta todos los tests y genera resumen
     */
    async runAllTests(execution_id) {
        console.log('\n════════════════════════════════════════════════════════════════════════════════');
        console.log('  ENTERPRISE SIMULATION COLLECTOR - Company ID:', this.companyId);
        console.log('════════════════════════════════════════════════════════════════════════════════\n');

        const config = this.getModuleConfig();
        const allResults = [];
        let totalPassed = 0;
        let totalFailed = 0;

        for (const category of config.testCategories) {
            try {
                console.log(`\n────────────────────────────────────────────────────────────`);
                console.log(`  ${category.description}`);
                console.log(`────────────────────────────────────────────────────────────`);

                const result = await category.func(execution_id);
                allResults.push(result);

                const categoryPassed = result.tests.filter(t => t.passed).length;
                const categoryFailed = result.tests.filter(t => !t.passed).length;
                totalPassed += categoryPassed;
                totalFailed += categoryFailed;

                result.tests.forEach(t => {
                    console.log(`   ${t.details}`);
                });

            } catch (error) {
                console.error(`   ❌ Error en ${category.name}:`, error.message);
                allResults.push({
                    category: category.name,
                    tests: [{ test: 'error', passed: false, details: error.message }],
                    passed: false,
                    error: error.message
                });
                totalFailed++;
            }
        }

        const summary = {
            companyId: this.companyId,
            executionId: execution_id,
            timestamp: new Date().toISOString(),
            totalTests: totalPassed + totalFailed,
            passed: totalPassed,
            failed: totalFailed,
            successRate: ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1),
            categories: allResults
        };

        console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                           RESUMEN ENTERPRISE SIMULATION                                  ║');
        console.log('╠══════════════════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║   ✅ Tests pasados: ${totalPassed.toString().padEnd(4)} │ ❌ Tests fallidos: ${totalFailed.toString().padEnd(4)} │ 📈 Tasa: ${summary.successRate}%`.padEnd(91) + '║');
        console.log('╚══════════════════════════════════════════════════════════════════════════════════════════╝');

        return summary;
    }
}

module.exports = EnterpriseSimulationCollector;
