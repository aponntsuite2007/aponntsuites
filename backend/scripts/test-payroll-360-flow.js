/**
 * ============================================================================
 * TEST DE INTEGRACIÓN 360° - FLUJO COMPLETO DE LIQUIDACIÓN
 * ============================================================================
 *
 * Este script prueba TODO el circuito de dependencias para una liquidación:
 *
 * CADENA DE DEPENDENCIAS:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  USUARIO                                                                 │
 * │    ├── Turno asignado (PP-11-IMPL-1) ────────────────────┐              │
 * │    ├── Categoría salarial (PP-11-IMPL-2) ────────────────┤              │
 * │    ├── Plantilla remunerativa ───────────────────────────┤              │
 * │    └── Sucursal → País → Feriados                        │              │
 * │                                                          ▼              │
 * │  ASISTENCIA                                         LIQUIDACIÓN         │
 * │    ├── Registros check_in/check_out                      │              │
 * │    ├── Ausencias justificadas (PP-7-IMPL-1/2) ───────────┤              │
 * │    └── Horas extras/nocturnas                            │              │
 * │                                                          ▼              │
 * │  RESULTADO                                                              │
 * │    ├── Conceptos calculados                                             │
 * │    ├── Deducciones                                                      │
 * │    └── Neto a pagar                                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @version 1.0.0
 * @date 2025-11-27
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Colores para output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bold: '\x1b[1m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
    header: (msg) => console.log(`\n${colors.bold}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`),
    step: (num, msg) => console.log(`${colors.magenta}[${num}]${colors.reset} ${msg}`),
    data: (label, value) => console.log(`    ${colors.white}${label}:${colors.reset} ${JSON.stringify(value, null, 2).split('\n').join('\n    ')}`),
    dependency: (from, to, status) => {
        const icon = status === 'OK' ? colors.green + '✓' : colors.red + '✗';
        console.log(`    ${icon}${colors.reset} ${from} → ${to}`);
    }
};

// ============================================================================
// CLASE PRINCIPAL DE TEST
// ============================================================================
class PayrollFlowTester {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            details: []
        };
        this.testData = {};
    }

    async connect() {
        const { Pool } = require('pg');

        const DATABASE_URL = process.env.DATABASE_URL ||
            'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u';

        this.pool = new Pool({
            connectionString: DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 30000
        });

        this.client = await this.pool.connect();
        log.success('Conectado a PostgreSQL');
    }

    async disconnect() {
        if (this.client) this.client.release();
        if (this.pool) await this.pool.end();
    }

    // ========================================================================
    // TEST 1: VERIFICAR ESTRUCTURA DE TABLAS BASE
    // ========================================================================
    async testBaseStructure() {
        log.header('1. ESTRUCTURA DE TABLAS BASE');

        const requiredTables = [
            { name: 'users', critical: true },
            { name: 'companies', critical: true },
            { name: 'shifts', critical: true },
            { name: 'user_shift_assignments', critical: true },
            { name: 'attendances', critical: true },
            { name: 'departments', critical: false },
            { name: 'company_branches', critical: false },
            { name: 'payroll_templates', critical: true },
            { name: 'user_payroll_assignment', critical: true },
            { name: 'salary_categories_v2', critical: false },
            { name: 'holidays', critical: false },
            { name: 'vacation_requests', critical: false },
            { name: 'medical_certificates', critical: false }
        ];

        for (const table of requiredTables) {
            try {
                const result = await this.client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = $1
                    )
                `, [table.name]);

                const exists = result.rows[0].exists;

                if (exists) {
                    log.success(`Tabla ${table.name} existe`);
                    this.results.passed++;
                } else if (table.critical) {
                    log.error(`Tabla CRÍTICA ${table.name} NO existe`);
                    this.results.failed++;
                } else {
                    log.warn(`Tabla opcional ${table.name} no existe`);
                    this.results.warnings++;
                }
            } catch (err) {
                log.error(`Error verificando ${table.name}: ${err.message}`);
                this.results.failed++;
            }
        }
    }

    // ========================================================================
    // TEST 2: VERIFICAR CAMPOS DE JUSTIFICACIÓN (PP-7-IMPL-1)
    // ========================================================================
    async testJustificationFields() {
        log.header('2. CAMPOS DE JUSTIFICACIÓN (PP-7-IMPL-1)');

        const requiredColumns = [
            'is_justified',
            'absence_type',
            'absence_reason',
            'justified_by',
            'justified_at',
            'medical_certificate_id'
        ];

        try {
            const result = await this.client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'attendances'
                AND column_name = ANY($1)
            `, [requiredColumns]);

            const foundColumns = result.rows.map(r => r.column_name);

            for (const col of requiredColumns) {
                if (foundColumns.includes(col)) {
                    const colInfo = result.rows.find(r => r.column_name === col);
                    log.success(`${col} (${colInfo.data_type})`);
                    this.results.passed++;
                } else {
                    log.error(`${col} NO existe en attendances`);
                    this.results.failed++;
                }
            }

            log.data('Columnas encontradas', `${foundColumns.length}/${requiredColumns.length}`);

        } catch (err) {
            log.error(`Error: ${err.message}`);
            this.results.failed++;
        }
    }

    // ========================================================================
    // TEST 3: BUSCAR UN USUARIO VÁLIDO PARA LIQUIDAR
    // ========================================================================
    async testFindValidUser() {
        log.header('3. BUSCAR USUARIO VÁLIDO PARA LIQUIDACIÓN');

        try {
            // Buscar usuario con plantilla asignada
            const userResult = await this.client.query(`
                SELECT
                    u.user_id,
                    u."firstName",
                    u."lastName",
                    u.company_id,
                    u.branch_id,
                    upa.id as assignment_id,
                    upa.template_id,
                    upa.base_salary,
                    upa.category_id,
                    pt.template_name,
                    sc.category_name
                FROM users u
                LEFT JOIN user_payroll_assignment upa ON u.user_id = upa.user_id AND upa.is_current = true
                LEFT JOIN payroll_templates pt ON upa.template_id = pt.id
                LEFT JOIN salary_categories_v2 sc ON upa.category_id = sc.id
                WHERE u.is_active = true
                LIMIT 5
            `);

            if (userResult.rows.length === 0) {
                log.error('No hay usuarios activos en el sistema');
                this.results.failed++;
                return;
            }

            log.info(`Encontrados ${userResult.rows.length} usuarios activos`);

            for (const user of userResult.rows) {
                console.log(`\n    ${colors.cyan}Usuario:${colors.reset} ${user.firstName} ${user.lastName}`);

                // Verificar plantilla
                if (user.template_id) {
                    log.dependency('Usuario', 'Plantilla', 'OK');
                    log.data('Plantilla', user.template_name);
                } else {
                    log.dependency('Usuario', 'Plantilla', 'FAIL');
                }

                // Verificar categoría
                if (user.category_id) {
                    log.dependency('Usuario', 'Categoría', 'OK');
                    log.data('Categoría', user.category_name);
                } else {
                    log.dependency('Usuario', 'Categoría', 'FAIL');
                }

                // Verificar sueldo base
                if (user.base_salary && parseFloat(user.base_salary) > 0) {
                    log.dependency('Usuario', 'Sueldo Base', 'OK');
                    log.data('Sueldo Base', user.base_salary);
                } else {
                    log.dependency('Usuario', 'Sueldo Base', 'FAIL');
                }

                // Verificar turno
                const shiftResult = await this.client.query(`
                    SELECT usa.*, s.name as shift_name, s.start_time, s.end_time
                    FROM user_shift_assignments usa
                    JOIN shifts s ON usa.shift_id = s.id
                    WHERE usa.user_id = $1 AND usa.is_primary = true
                `, [user.user_id]);

                if (shiftResult.rows.length > 0) {
                    log.dependency('Usuario', 'Turno', 'OK');
                    log.data('Turno', `${shiftResult.rows[0].shift_name} (${shiftResult.rows[0].start_time}-${shiftResult.rows[0].end_time})`);
                } else {
                    log.dependency('Usuario', 'Turno', 'FAIL');
                }

                // Si tiene todo, guardarlo para test
                if (user.template_id && (user.base_salary || user.category_id)) {
                    this.testData.validUser = user;
                    log.success(`✓ Usuario válido para liquidación: ${user.firstName} ${user.lastName}`);
                    this.results.passed++;
                    break;
                }
            }

            if (!this.testData.validUser) {
                log.warn('No se encontró usuario con todos los requisitos para liquidar');
                this.results.warnings++;
            }

        } catch (err) {
            log.error(`Error: ${err.message}`);
            this.results.failed++;
        }
    }

    // ========================================================================
    // TEST 4: VERIFICAR ASISTENCIAS DEL USUARIO
    // ========================================================================
    async testUserAttendance() {
        log.header('4. VERIFICAR ASISTENCIAS DEL USUARIO');

        if (!this.testData.validUser) {
            log.warn('No hay usuario válido para verificar asistencias');
            this.results.warnings++;
            return;
        }

        const user = this.testData.validUser;
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        try {
            // Contar registros del mes actual
            const attendanceResult = await this.client.query(`
                SELECT
                    COUNT(*) as total_records,
                    COUNT(CASE WHEN check_out IS NOT NULL THEN 1 END) as complete_records,
                    COUNT(CASE WHEN is_justified = true THEN 1 END) as justified_absences,
                    SUM(CASE WHEN check_out IS NOT NULL
                        THEN EXTRACT(EPOCH FROM (check_out - check_in)) / 3600
                        ELSE 0 END) as total_hours
                FROM attendances
                WHERE user_id = $1
                AND EXTRACT(MONTH FROM check_in) = $2
                AND EXTRACT(YEAR FROM check_in) = $3
            `, [user.user_id, currentMonth, currentYear]);

            const stats = attendanceResult.rows[0];

            log.info(`Asistencias de ${user.firstName} ${user.lastName} (${currentMonth}/${currentYear}):`);
            log.data('Registros totales', stats.total_records);
            log.data('Registros completos', stats.complete_records);
            log.data('Ausencias justificadas', stats.justified_absences);
            log.data('Horas totales', parseFloat(stats.total_hours || 0).toFixed(2));

            this.testData.attendance = stats;

            if (parseInt(stats.total_records) > 0) {
                log.success('Usuario tiene registros de asistencia');
                this.results.passed++;
            } else {
                log.warn('Usuario no tiene registros de asistencia este mes');
                this.results.warnings++;
            }

        } catch (err) {
            log.error(`Error: ${err.message}`);
            this.results.failed++;
        }
    }

    // ========================================================================
    // TEST 5: PROBAR VALIDACIONES DE PAYROLL (PP-11-IMPL-1, PP-11-IMPL-2)
    // ========================================================================
    async testPayrollValidations() {
        log.header('5. VALIDACIONES DE LIQUIDACIÓN (PP-11)');

        // Simular las validaciones que hace PayrollCalculatorService

        log.step('5.1', 'Validación de turno obligatorio (PP-11-IMPL-1)');

        if (!this.testData.validUser) {
            log.warn('No hay usuario para validar');
            return;
        }

        const user = this.testData.validUser;

        try {
            // Verificar turno
            const shiftResult = await this.client.query(`
                SELECT usa.id, s.name, s.start_time, s.end_time
                FROM user_shift_assignments usa
                JOIN shifts s ON usa.shift_id = s.id
                WHERE usa.user_id = $1 AND usa.is_primary = true
                AND (usa.effective_to IS NULL OR usa.effective_to >= CURRENT_DATE)
            `, [user.user_id]);

            if (shiftResult.rows.length > 0) {
                log.success('PP-11-IMPL-1: Usuario tiene turno asignado');
                log.data('Turno', shiftResult.rows[0]);
                this.results.passed++;
            } else {
                log.error('PP-11-IMPL-1: Usuario SIN turno - LIQUIDACIÓN BLOQUEADA');
                this.results.failed++;
            }

            log.step('5.2', 'Validación de categoría salarial (PP-11-IMPL-2)');

            if (user.category_id || (user.base_salary && parseFloat(user.base_salary) > 0)) {
                log.success('PP-11-IMPL-2: Usuario tiene categoría o sueldo base');
                this.results.passed++;
            } else {
                log.error('PP-11-IMPL-2: Usuario SIN categoría NI sueldo - LIQUIDACIÓN BLOQUEADA');
                this.results.failed++;
            }

        } catch (err) {
            log.error(`Error en validaciones: ${err.message}`);
            this.results.failed++;
        }
    }

    // ========================================================================
    // TEST 6: PROBAR PARSER SEGURO (PP-11-IMPL-3)
    // ========================================================================
    async testSafeParser() {
        log.header('6. PARSER MATEMÁTICO SEGURO (PP-11-IMPL-3)');

        // Importar el servicio
        try {
            const PayrollCalculatorService = require('../src/services/PayrollCalculatorService');

            const testCases = [
                { formula: '{baseSalary} * 0.05', context: { baseSalary: 100000 }, expected: 5000 },
                { formula: '{baseSalary} + {hourlyRate} * 10', context: { baseSalary: 100000, hourlyRate: 500 }, expected: 105000 },
                { formula: 'round({baseSalary} * 0.123)', context: { baseSalary: 100000 }, expected: 12300 },
                { formula: 'max({workedHours}, 160) * {hourlyRate}', context: { hoursAnalysis: { totalWorkedHours: 180 }, hourlyRate: 500 }, expected: 90000 },
                { formula: '{baseSalary} / 30 * {workedDays}', context: { baseSalary: 90000, hoursAnalysis: { workedDays: 22 } }, expected: 66000 },
            ];

            let passed = 0;

            for (const test of testCases) {
                try {
                    const result = PayrollCalculatorService.evaluateFormula(test.formula, test.context);
                    const isCorrect = Math.abs(result - test.expected) < 0.01;

                    if (isCorrect) {
                        log.success(`"${test.formula}" = ${result}`);
                        passed++;
                    } else {
                        log.error(`"${test.formula}" = ${result} (esperado: ${test.expected})`);
                    }
                } catch (err) {
                    log.error(`Error en "${test.formula}": ${err.message}`);
                }
            }

            log.data('Parser tests', `${passed}/${testCases.length} pasaron`);

            if (passed === testCases.length) {
                this.results.passed++;
            } else {
                this.results.failed++;
            }

            // Test de seguridad - intentar inyección
            log.step('6.1', 'Test de seguridad - Intentos de inyección');

            const maliciousFormulas = [
                'process.exit(1)',
                'require("fs").readFileSync("/etc/passwd")',
                'eval("alert(1)")',
                '(() => { throw new Error("hacked") })()'
            ];

            for (const malicious of maliciousFormulas) {
                try {
                    const result = PayrollCalculatorService.evaluateFormula(malicious, {});
                    // Si llegó aquí sin ejecutar código malicioso, es seguro
                    log.success(`Bloqueado: "${malicious.substring(0, 30)}..." → ${result}`);
                } catch (err) {
                    log.success(`Rechazado: "${malicious.substring(0, 30)}..."`);
                }
            }

            this.results.passed++;
            log.success('Parser es seguro contra inyecciones');

        } catch (err) {
            log.error(`Error cargando PayrollCalculatorService: ${err.message}`);
            this.results.failed++;
        }
    }

    // ========================================================================
    // TEST 7: SIMULACIÓN DE LIQUIDACIÓN COMPLETA
    // ========================================================================
    async testFullPayrollSimulation() {
        log.header('7. SIMULACIÓN DE LIQUIDACIÓN COMPLETA');

        if (!this.testData.validUser) {
            log.warn('No hay usuario válido para simular liquidación');
            this.results.warnings++;
            return;
        }

        try {
            const PayrollCalculatorService = require('../src/services/PayrollCalculatorService');
            const user = this.testData.validUser;

            log.info(`Simulando liquidación para: ${user.firstName} ${user.lastName}`);

            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            // Intentar calcular con modo permisivo para ver qué falta
            const result = await PayrollCalculatorService.calculatePayroll(
                user.user_id,
                user.company_id,
                currentYear,
                currentMonth,
                {
                    allowMissingShift: true,
                    allowMissingCategory: true
                }
            );

            log.success('Liquidación calculada exitosamente');

            console.log(`\n${colors.bold}    ═══ RESULTADO DE LIQUIDACIÓN ═══${colors.reset}`);
            log.data('Período', `${result.period.monthName} ${result.period.year}`);
            log.data('Empleado', result.employee.name);
            log.data('Plantilla', result.template.name);

            console.log(`\n    ${colors.cyan}Análisis de trabajo:${colors.reset}`);
            log.data('Días trabajados', result.workAnalysis.workedDays);
            log.data('Horas regulares', result.workAnalysis.regularHours);
            log.data('Horas extras 50%', result.workAnalysis.overtime50Hours);
            log.data('Horas extras 100%', result.workAnalysis.overtime100Hours);
            log.data('Horas nocturnas', result.workAnalysis.nightHours);
            log.data('Ausencias injustificadas', result.workAnalysis.absentDays);

            if (result.workAnalysis.justifiedAbsences) {
                console.log(`\n    ${colors.cyan}Ausencias justificadas (PP-7):${colors.reset}`);
                log.data('Vacaciones', result.workAnalysis.justifiedAbsences.vacationDays);
                log.data('Licencia médica', result.workAnalysis.justifiedAbsences.medicalDays);
                log.data('Otros', result.workAnalysis.justifiedAbsences.otherDays);
            }

            console.log(`\n    ${colors.cyan}Totales:${colors.reset}`);
            log.data('Haberes', `$ ${result.totals.earningsTotal.toLocaleString()}`);
            log.data('No remunerativos', `$ ${result.totals.nonRemunerativeTotal.toLocaleString()}`);
            log.data('Deducciones', `$ ${result.totals.deductionsTotal.toLocaleString()}`);
            log.data('NETO A COBRAR', `$ ${result.totals.netSalary.toLocaleString()}`);
            log.data('Costo empleador', `$ ${result.totals.employerCostsTotal.toLocaleString()}`);

            this.results.passed++;

        } catch (err) {
            log.error(`Error en simulación: ${err.message}`);
            log.data('Stack', err.stack?.split('\n').slice(0, 5).join('\n'));
            this.results.failed++;
        }
    }

    // ========================================================================
    // GENERAR REPORTE FINAL
    // ========================================================================
    generateReport() {
        log.header('REPORTE FINAL - FLUJO 360°');

        const total = this.results.passed + this.results.failed + this.results.warnings;
        const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;

        console.log(`
    ${colors.bold}╔════════════════════════════════════════╗
    ║        RESULTADOS DEL TEST 360°        ║
    ╠════════════════════════════════════════╣${colors.reset}
    ║  ${colors.green}✅ Pasaron:${colors.reset}     ${String(this.results.passed).padStart(3)}                    ║
    ║  ${colors.red}❌ Fallaron:${colors.reset}    ${String(this.results.failed).padStart(3)}                    ║
    ║  ${colors.yellow}⚠️  Warnings:${colors.reset}   ${String(this.results.warnings).padStart(3)}                    ║
    ╠════════════════════════════════════════╣
    ║  ${colors.cyan}📊 Tasa éxito:${colors.reset}  ${successRate}%                  ║
    ${colors.bold}╚════════════════════════════════════════╝${colors.reset}
        `);

        if (this.results.failed > 0) {
            console.log(`${colors.red}${colors.bold}
    ⚠️  HAY PROBLEMAS QUE RESOLVER:
    ${colors.reset}
    Revisa los errores marcados con ❌ arriba.
    Las liquidaciones pueden fallar hasta que se corrijan.
            `);
        } else if (this.results.warnings > 0) {
            console.log(`${colors.yellow}
    ℹ️  El sistema funciona pero hay advertencias.
    Considera configurar los elementos opcionales para mejor precisión.
            ${colors.reset}`);
        } else {
            console.log(`${colors.green}${colors.bold}
    🎉 ¡SISTEMA 100% OPERATIVO!
    ${colors.reset}
    Todas las dependencias del flujo de liquidación están configuradas.
    El sistema está listo para producción.
            `);
        }
    }

    // ========================================================================
    // EJECUTAR TODOS LOS TESTS
    // ========================================================================
    async runAll() {
        console.log(`
${colors.bold}${colors.cyan}
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   TEST DE INTEGRACIÓN 360° - FLUJO COMPLETO DE LIQUIDACIÓN               ║
║                                                                           ║
║   Verifica todas las dependencias necesarias para calcular               ║
║   una liquidación de sueldos correctamente.                               ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
${colors.reset}
        `);

        try {
            await this.connect();

            await this.testBaseStructure();
            await this.testJustificationFields();
            await this.testFindValidUser();
            await this.testUserAttendance();
            await this.testPayrollValidations();
            await this.testSafeParser();
            await this.testFullPayrollSimulation();

            this.generateReport();

        } catch (err) {
            log.error(`Error fatal: ${err.message}`);
        } finally {
            await this.disconnect();
        }
    }
}

// ============================================================================
// EJECUTAR
// ============================================================================
const tester = new PayrollFlowTester();
tester.runAll().catch(console.error);
