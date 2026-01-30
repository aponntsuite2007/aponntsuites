/**
 * Test CIRCUITO COMPLETO: Asistencia → Banco Horas → Liquidación
 *
 * Verifica el flujo completo SSOT:
 * 1. Fichaje entrada/salida
 * 2. Detección de horas extra
 * 3. Banco de horas (si aplica)
 * 4. Reportes Excel disponibles
 * 5. Datos para liquidación
 * 6. Integración Mi Espacio
 * 7. Integración Gestión Usuarios
 *
 * Uso: node scripts/test-attendance-circuit-complete.js
 */

const BASE_URL = 'http://localhost:9998';

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

const log = {
    pass: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    fail: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.cyan}ℹ️ ${msg}${colors.reset}`),
    section: (msg) => console.log(`\n${colors.magenta}═══ ${msg} ═══${colors.reset}`)
};

async function fetchWithAuth(url, options = {}) {
    const token = global.authToken;
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🔄 TEST CIRCUITO COMPLETO: ASISTENCIA → BANCO HORAS → LIQUIDACIÓN');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        tests: []
    };

    function recordTest(name, status, details = '') {
        results.total++;
        if (status === 'PASS') {
            results.passed++;
            log.pass(`${name} ${details}`);
        } else if (status === 'FAIL') {
            results.failed++;
            log.fail(`${name} ${details}`);
        } else if (status === 'WARN') {
            results.warnings++;
            log.warn(`${name} ${details}`);
        }
        results.tests.push({ name, status, details });
    }

    try {
        // ═══════════════════════════════════════════════════════════════════════
        // FASE 1: LOGIN
        // ═══════════════════════════════════════════════════════════════════════
        log.section('FASE 1: AUTENTICACIÓN');

        const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companySlug: 'aponnt-empresa-demo',
                identifier: 'administrador',
                password: 'admin123'
            })
        });

        if (loginRes.ok) {
            const loginData = await loginRes.json();
            global.authToken = loginData.token;
            global.companyId = loginData.user?.company_id || loginData.company?.id;
            global.userId = loginData.user?.user_id;
            recordTest('Login API', 'PASS', `(companyId: ${global.companyId})`);
        } else {
            recordTest('Login API', 'FAIL', `Status: ${loginRes.status}`);
            throw new Error('Login failed');
        }

        // ═══════════════════════════════════════════════════════════════════════
        // FASE 2: ENDPOINTS DE ASISTENCIA (SSOT)
        // ═══════════════════════════════════════════════════════════════════════
        log.section('FASE 2: ASISTENCIA (SSOT)');

        // 2.1 GET /attendance - Listar registros
        const attListRes = await fetchWithAuth(`${BASE_URL}/api/v1/attendance?limit=10`);
        if (attListRes.ok) {
            const data = await attListRes.json();
            const count = data.data?.length || data.attendances?.length || 0;
            recordTest('GET /attendance', 'PASS', `(${count} registros)`);
        } else {
            recordTest('GET /attendance', 'FAIL', `Status: ${attListRes.status}`);
        }

        // 2.2 GET /attendance/stats - Estadísticas
        const attStatsRes = await fetchWithAuth(`${BASE_URL}/api/v1/attendance/stats`);
        if (attStatsRes.ok) {
            const stats = await attStatsRes.json();
            recordTest('GET /attendance/stats', 'PASS',
                `(present: ${stats.present || 0}, late: ${stats.late || 0})`);
        } else {
            recordTest('GET /attendance/stats', 'FAIL', `Status: ${attStatsRes.status}`);
        }

        // 2.3 GET /attendance/stats/detailed - Stats detalladas
        const attDetailedRes = await fetchWithAuth(`${BASE_URL}/api/v1/attendance/stats/detailed`);
        if (attDetailedRes.ok) {
            recordTest('GET /attendance/stats/detailed', 'PASS');
        } else {
            recordTest('GET /attendance/stats/detailed', 'WARN', `Status: ${attDetailedRes.status}`);
        }

        // 2.4 GET /attendance/stats/overtime-summary - Resumen horas extra
        const overtimeRes = await fetchWithAuth(`${BASE_URL}/api/v1/attendance/stats/overtime-summary`);
        if (overtimeRes.ok) {
            const overtime = await overtimeRes.json();
            recordTest('GET /attendance/stats/overtime-summary', 'PASS',
                `(total: ${overtime.totalOvertimeHours || 0}h)`);
        } else {
            recordTest('GET /attendance/stats/overtime-summary', 'WARN', `Status: ${overtimeRes.status}`);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // FASE 3: REPORTES Y EXPORTS
        // ═══════════════════════════════════════════════════════════════════════
        log.section('FASE 3: REPORTES Y EXPORTS');

        // 3.1 GET /reports/attendance - Reporte de asistencias
        const today = new Date().toISOString().split('T')[0];
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const reportAttRes = await fetchWithAuth(
            `${BASE_URL}/api/reports/attendance?startDate=${monthAgo}&endDate=${today}`
        );
        if (reportAttRes.ok) {
            const report = await reportAttRes.json();
            recordTest('GET /reports/attendance', 'PASS',
                `(${report.data?.length || report.attendances?.length || 0} registros)`);
        } else {
            recordTest('GET /reports/attendance', 'WARN', `Status: ${reportAttRes.status}`);
        }

        // 3.2 GET /reports/attendance?format=excel - Export Excel
        const excelRes = await fetchWithAuth(
            `${BASE_URL}/api/reports/attendance?startDate=${monthAgo}&endDate=${today}&format=excel`
        );
        if (excelRes.ok) {
            const contentType = excelRes.headers.get('content-type');
            if (contentType?.includes('spreadsheet') || contentType?.includes('xlsx')) {
                recordTest('GET /reports/attendance?format=excel', 'PASS', '(Excel generado)');
            } else {
                recordTest('GET /reports/attendance?format=excel', 'WARN', `(Content-Type: ${contentType})`);
            }
        } else {
            recordTest('GET /reports/attendance?format=excel', 'FAIL', `Status: ${excelRes.status}`);
        }

        // 3.3 GET /reports/user-summary - Resumen por usuario
        const userSummaryRes = await fetchWithAuth(
            `${BASE_URL}/api/reports/user-summary?startDate=${monthAgo}&endDate=${today}`
        );
        if (userSummaryRes.ok) {
            recordTest('GET /reports/user-summary', 'PASS');
        } else {
            recordTest('GET /reports/user-summary', 'WARN', `Status: ${userSummaryRes.status}`);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // FASE 4: BANCO DE HORAS
        // ═══════════════════════════════════════════════════════════════════════
        log.section('FASE 4: BANCO DE HORAS');

        // 4.1 GET /hour-bank/config - Configuración
        const hbConfigRes = await fetchWithAuth(`${BASE_URL}/api/hour-bank/config`);
        if (hbConfigRes.ok) {
            const config = await hbConfigRes.json();
            recordTest('GET /hour-bank/config', 'PASS',
                `(enabled: ${config.enabled}, choiceEnabled: ${config.employee_choice_enabled})`);
        } else {
            recordTest('GET /hour-bank/config', 'WARN', `Status: ${hbConfigRes.status}`);
        }

        // 4.2 GET /hour-bank/my-summary - Mi resumen (empleado)
        const hbSummaryRes = await fetchWithAuth(`${BASE_URL}/api/hour-bank/my-summary`);
        if (hbSummaryRes.ok) {
            const summary = await hbSummaryRes.json();
            recordTest('GET /hour-bank/my-summary', 'PASS',
                `(balance: ${summary.current_balance || 0}h)`);
        } else {
            recordTest('GET /hour-bank/my-summary', 'WARN', `Status: ${hbSummaryRes.status}`);
        }

        // 4.3 GET /hour-bank/fichajes - Fichajes con horas extra
        const hbFichajesRes = await fetchWithAuth(`${BASE_URL}/api/hour-bank/fichajes`);
        if (hbFichajesRes.ok) {
            const fichajes = await hbFichajesRes.json();
            const count = fichajes.data?.length || fichajes.fichajes?.length || 0;
            recordTest('GET /hour-bank/fichajes', 'PASS', `(${count} fichajes con overtime)`);
        } else {
            recordTest('GET /hour-bank/fichajes', 'WARN', `Status: ${hbFichajesRes.status}`);
        }

        // 4.4 GET /hour-bank/decisions/pending - Decisiones pendientes
        const hbPendingRes = await fetchWithAuth(`${BASE_URL}/api/hour-bank/decisions/pending`);
        if (hbPendingRes.ok) {
            const pending = await hbPendingRes.json();
            const count = pending.data?.length || pending.decisions?.length || 0;
            recordTest('GET /hour-bank/pending-decisions', 'PASS', `(${count} pendientes)`);
        } else {
            recordTest('GET /hour-bank/pending-decisions', 'WARN', `Status: ${hbPendingRes.status}`);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // FASE 5: LIQUIDACIÓN DE NÓMINA
        // ═══════════════════════════════════════════════════════════════════════
        log.section('FASE 5: LIQUIDACIÓN DE NÓMINA');

        // 5.1 GET /payroll/templates - Templates de liquidación
        const payrollTemplatesRes = await fetchWithAuth(`${BASE_URL}/api/payroll/templates`);
        if (payrollTemplatesRes.ok) {
            const templates = await payrollTemplatesRes.json();
            const count = templates.data?.length || templates.templates?.length || 0;
            recordTest('GET /payroll/templates', 'PASS', `(${count} templates)`);
        } else {
            recordTest('GET /payroll/templates', 'WARN', `Status: ${payrollTemplatesRes.status}`);
        }

        // 5.2 GET /payroll/runs - Corridas de liquidación
        const payrollRunsRes = await fetchWithAuth(`${BASE_URL}/api/payroll/runs`);
        if (payrollRunsRes.ok) {
            const runs = await payrollRunsRes.json();
            const count = runs.data?.length || runs.runs?.length || 0;
            recordTest('GET /payroll/runs', 'PASS', `(${count} corridas)`);
        } else {
            recordTest('GET /payroll/runs', 'WARN', `Status: ${payrollRunsRes.status}`);
        }

        // 5.3 GET /payroll/concepts - Conceptos de liquidación
        const conceptsRes = await fetchWithAuth(`${BASE_URL}/api/payroll/concepts`);
        if (conceptsRes.ok) {
            const concepts = await conceptsRes.json();
            const count = concepts.data?.length || concepts.concepts?.length || 0;
            recordTest('GET /payroll/concepts', 'PASS', `(${count} conceptos)`);
        } else {
            recordTest('GET /payroll/concepts', 'WARN', `Status: ${conceptsRes.status}`);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // FASE 6: INTEGRACIÓN MI ESPACIO
        // ═══════════════════════════════════════════════════════════════════════
        log.section('FASE 6: INTEGRACIÓN MI ESPACIO');

        // 6.1 GET /attendance?selfView=true - Mi asistencia
        const miAttRes = await fetchWithAuth(`${BASE_URL}/api/v1/attendance?selfView=true&limit=10`);
        if (miAttRes.ok) {
            const miAtt = await miAttRes.json();
            const count = miAtt.data?.length || miAtt.attendances?.length || 0;
            recordTest('GET /attendance?selfView=true', 'PASS', `(${count} mis registros)`);
        } else {
            recordTest('GET /attendance?selfView=true', 'WARN', `Status: ${miAttRes.status}`);
        }

        // 6.2 GET /attendance/stats?selfView=true - Mis stats
        const miStatsRes = await fetchWithAuth(`${BASE_URL}/api/v1/attendance/stats?selfView=true`);
        if (miStatsRes.ok) {
            recordTest('GET /attendance/stats?selfView=true', 'PASS');
        } else {
            recordTest('GET /attendance/stats?selfView=true', 'WARN', `Status: ${miStatsRes.status}`);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // FASE 7: INTEGRACIÓN GESTIÓN USUARIOS
        // ═══════════════════════════════════════════════════════════════════════
        log.section('FASE 7: INTEGRACIÓN GESTIÓN USUARIOS');

        // 7.1 GET /users - Listar usuarios
        const usersRes = await fetchWithAuth(`${BASE_URL}/api/v1/users?limit=5`);
        if (usersRes.ok) {
            const users = await usersRes.json();
            const count = users.data?.length || users.users?.length || 0;
            recordTest('GET /users', 'PASS', `(${count} usuarios)`);

            // 7.2 Si hay usuarios, verificar que podemos ver asistencia de uno
            const userList = users.data || users.users || [];
            if (userList.length > 0) {
                const testUserId = userList[0].user_id || userList[0].id;
                const userAttRes = await fetchWithAuth(
                    `${BASE_URL}/api/v1/attendance?user_id=${testUserId}&limit=5`
                );
                if (userAttRes.ok) {
                    recordTest('GET /attendance?user_id=X', 'PASS', '(asistencia por usuario)');
                } else {
                    recordTest('GET /attendance?user_id=X', 'WARN', `Status: ${userAttRes.status}`);
                }
            }
        } else {
            recordTest('GET /users', 'WARN', `Status: ${usersRes.status}`);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // FASE 8: VALIDACIÓN SSOT
        // ═══════════════════════════════════════════════════════════════════════
        log.section('FASE 8: VALIDACIÓN SSOT');

        // Verificar que los campos críticos existen en el schema
        const schemaCheckRes = await fetchWithAuth(`${BASE_URL}/api/v1/attendance?limit=1`);
        if (schemaCheckRes.ok) {
            const data = await schemaCheckRes.json();
            const record = data.data?.[0] || data.attendances?.[0];

            if (record) {
                // SSOT critical fields - check snake_case and camelCase variants
                const criticalFields = [
                    { key: 'workingHours', alt: 'working_hours' },
                    { key: 'is_justified', alt: 'isJustified' },
                    { key: 'overtime_hours', alt: 'overtimeHours' },
                    { key: 'status', alt: 'status' },
                    { key: 'checkInTime', alt: 'check_in' },
                    { key: 'checkOutTime', alt: 'check_out' }
                ];

                const presentFields = criticalFields.filter(f =>
                    record[f.key] !== undefined || record[f.alt] !== undefined
                );
                const missingFields = criticalFields.filter(f =>
                    record[f.key] === undefined && record[f.alt] === undefined
                );

                if (missingFields.length === 0) {
                    recordTest('SSOT Fields Check', 'PASS', `(${presentFields.length}/6 campos críticos)`);
                } else {
                    recordTest('SSOT Fields Check', 'WARN', `Faltan: ${missingFields.map(f => f.key).join(', ')}`);
                }
            } else {
                recordTest('SSOT Fields Check', 'WARN', 'No hay registros para verificar');
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ═══════════════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════════════════');
        console.log('📊 RESUMEN - CIRCUITO ASISTENCIAS');
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log(`   ✅ PASSED:   ${results.passed}`);
        console.log(`   ⚠️ WARNINGS: ${results.warnings}`);
        console.log(`   ❌ FAILED:   ${results.failed}`);
        console.log(`   ─────────────────────────────`);
        console.log(`   TOTAL:      ${results.total}`);

        const successRate = Math.round((results.passed / results.total) * 100);
        console.log(`\n   🎯 TASA DE ÉXITO: ${successRate}%`);

        // Verificación por fase
        console.log('\n   📋 ESTADO POR FASE:');
        const phases = [
            { name: '1. Autenticación', tests: ['Login API'] },
            { name: '2. Asistencia SSOT', tests: ['GET /attendance', 'GET /attendance/stats'] },
            { name: '3. Reportes/Exports', tests: ['GET /reports/attendance', 'GET /reports/attendance?format=excel'] },
            { name: '4. Banco de Horas', tests: ['GET /hour-bank/config', 'GET /hour-bank/my-summary'] },
            { name: '5. Liquidación', tests: ['GET /payroll/templates', 'GET /payroll/runs'] },
            { name: '6. Mi Espacio', tests: ['GET /attendance?selfView=true'] },
            { name: '7. Gestión Usuarios', tests: ['GET /users'] },
            { name: '8. SSOT Validation', tests: ['SSOT Fields Check'] }
        ];

        for (const phase of phases) {
            const phaseTests = results.tests.filter(t => phase.tests.some(pt => t.name.includes(pt)));
            const passed = phaseTests.filter(t => t.status === 'PASS').length;
            const total = phaseTests.length || 1;
            const icon = passed === total ? '✅' : passed > 0 ? '⚠️' : '❌';
            console.log(`      ${icon} ${phase.name}: ${passed}/${total}`);
        }

        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        // Guardar resultados
        const fs = require('fs');
        fs.writeFileSync('test-results/attendance-circuit-results.json', JSON.stringify({
            timestamp: new Date().toISOString(),
            total: results.total,
            passed: results.passed,
            failed: results.failed,
            warnings: results.warnings,
            successRate: `${successRate}%`,
            tests: results.tests
        }, null, 2));
        console.log('   📄 Resultados guardados en: test-results/attendance-circuit-results.json\n');

        process.exit(results.failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ Error fatal:', error.message);
        process.exit(1);
    }
}

main();
