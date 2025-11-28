/**
 * ============================================================================
 * AUDITORÍA COMPLETA DE CADENA DE LIQUIDACIÓN - VIA API
 * ============================================================================
 *
 * Usa el servidor local (que ya tiene conexión a Render PostgreSQL)
 *
 * Ejecutar: node scripts/audit-payroll-chain-api.js
 * Requiere: Servidor corriendo en localhost:9998
 */

const http = require('http');

// Colores
const c = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    dim: '\x1b[2m'
};

const PASS = `${c.green}✅ EXISTE${c.reset}`;
const FAIL = `${c.red}❌ FALTA${c.reset}`;
const WARN = `${c.yellow}⚠️ INCOMPLETO${c.reset}`;
const EMPTY = `${c.yellow}⚠️ VACÍO${c.reset}`;

const BASE_URL = 'http://localhost:9998';

// Resultados de auditoría
const auditResults = {
    passed: [],
    failed: [],
    warnings: [],
    details: {}
};

function log(icon, msg) {
    console.log(`${icon} ${msg}`);
}

function section(title) {
    console.log(`\n${c.bold}${c.cyan}${'═'.repeat(70)}${c.reset}`);
    console.log(`${c.bold}${c.cyan}  ${title}${c.reset}`);
    console.log(`${c.bold}${c.cyan}${'═'.repeat(70)}${c.reset}\n`);
}

function subsection(num, title) {
    console.log(`\n${c.magenta}[${num}]${c.reset} ${c.bold}${title}${c.reset}`);
    console.log(`${c.dim}${'─'.repeat(60)}${c.reset}`);
}

// Helper para requests
function apiRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const reqOptions = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

// Query directo via API de schema (si existe) o raw
async function queryDB(sql) {
    try {
        // Usar el endpoint de schema si existe
        const res = await apiRequest('/api/v1/admin/db/query', {
            method: 'POST',
            headers: { 'x-migration-token': 'rnd_xJHFJ9muRsenVO6Y1z19rvi1fcWq' },
            body: { query: sql }
        });
        if (res.status === 200 && res.data.rows) {
            return res.data.rows;
        }
        return null;
    } catch (e) {
        return null;
    }
}

// ============================================================================
// AUDITORÍAS
// ============================================================================

async function audit1_Countries() {
    subsection('1', 'PAÍSES (payroll_countries)');

    try {
        const res = await apiRequest('/api/v1/payroll/countries');
        if (res.status === 200) {
            const countries = res.data.countries || res.data || [];
            if (countries.length > 0) {
                log(PASS, `${countries.length} país(es) configurados`);
                auditResults.passed.push('Países configurados');

                // Buscar Argentina
                const argentina = countries.find(c =>
                    c.code === 'AR' || (c.name && c.name.toLowerCase().includes('argentin'))
                );
                if (argentina) {
                    log(PASS, `Argentina configurada: ${argentina.name}`);
                    auditResults.details.argentina = argentina;
                } else {
                    log(WARN, 'Argentina NO encontrada');
                    auditResults.warnings.push('Argentina no configurada');
                }
            } else {
                log(EMPTY, 'Sin países configurados');
                auditResults.warnings.push('Sin países');
            }
        } else {
            log(FAIL, `Endpoint /api/v1/payroll/countries: ${res.status}`);
            auditResults.failed.push('Endpoint países');
        }
    } catch (e) {
        log(FAIL, `Error: ${e.message}`);
        auditResults.failed.push('Países');
    }
}

async function audit2_Companies() {
    subsection('2', 'EMPRESAS Y SUCURSALES');

    try {
        const res = await apiRequest('/api/aponnt/dashboard/companies');
        if (res.status === 200) {
            const companies = res.data.companies || res.data || [];
            if (companies.length > 0) {
                log(PASS, `${companies.length} empresa(s)`);
                auditResults.passed.push('Empresas');

                // ISI
                const isi = companies.find(c => c.id === 11 || c.slug === 'isi');
                if (isi) {
                    log(PASS, `ISI encontrada: ${isi.name} (id=${isi.id})`);
                    auditResults.details.isi = isi;
                    if (isi.country) {
                        log(PASS, `ISI tiene país: ${isi.country}`);
                    } else {
                        log(WARN, 'ISI sin país asignado');
                        auditResults.warnings.push('ISI sin país');
                    }
                }
            }
        }
    } catch (e) {
        log(FAIL, `Error: ${e.message}`);
    }

    // Sucursales
    try {
        const res = await apiRequest('/api/v1/payroll/branches?company_id=11');
        if (res.status === 200) {
            const branches = res.data.branches || res.data || [];
            log(branches.length > 0 ? PASS : EMPTY, `${branches.length} sucursal(es)`);
        }
    } catch (e) {
        log(WARN, 'Endpoint sucursales no disponible');
    }
}

async function audit3_Shifts() {
    subsection('3', 'TURNOS (shifts)');

    try {
        const res = await apiRequest('/api/shifts?company_id=11');
        if (res.status === 200) {
            const shifts = res.data.shifts || res.data || [];
            if (shifts.length > 0) {
                log(PASS, `${shifts.length} turno(s) para ISI:`);
                shifts.slice(0, 5).forEach(s => {
                    console.log(`    - ${s.name}: ${s.start_time || s.startTime} - ${s.end_time || s.endTime}`);
                });
                auditResults.passed.push('Turnos ISI');
                auditResults.details.isiShifts = shifts;

                // Verificar campos
                const hasWorkDays = shifts[0].work_days || shifts[0].workDays;
                log(hasWorkDays ? PASS : WARN, `Campo work_days: ${hasWorkDays ? 'existe' : 'falta'}`);
            } else {
                log(EMPTY, 'ISI sin turnos');
                auditResults.warnings.push('ISI sin turnos');
            }
        }
    } catch (e) {
        log(FAIL, `Error: ${e.message}`);
        auditResults.failed.push('Turnos');
    }
}

async function audit4_Calendars() {
    subsection('4', 'CALENDARIOS Y FERIADOS');

    try {
        const res = await apiRequest('/api/v1/holidays?country_code=AR');
        if (res.status === 200) {
            const holidays = res.data.holidays || res.data || [];
            if (holidays.length > 0) {
                log(PASS, `${holidays.length} feriado(s) de Argentina:`);
                holidays.slice(0, 5).forEach(h => {
                    console.log(`    - ${h.date}: ${h.name}`);
                });
                auditResults.passed.push('Feriados Argentina');
            } else {
                log(EMPTY, 'Sin feriados de Argentina');
                auditResults.warnings.push('Sin feriados AR');
            }
        } else {
            // Intentar sin filtro
            const res2 = await apiRequest('/api/v1/holidays');
            if (res2.status === 200) {
                const all = res2.data.holidays || res2.data || [];
                log(all.length > 0 ? PASS : EMPTY, `${all.length} feriado(s) total`);
            } else {
                log(WARN, 'Endpoint holidays no disponible');
            }
        }
    } catch (e) {
        log(WARN, `Feriados: ${e.message}`);
    }
}

async function audit5_Departments() {
    subsection('5', 'DEPARTAMENTOS');

    try {
        const res = await apiRequest('/api/departments?company_id=11');
        if (res.status === 200) {
            const depts = res.data.departments || res.data || [];
            if (depts.length > 0) {
                log(PASS, `${depts.length} departamento(s) para ISI`);
                auditResults.passed.push('Departamentos ISI');
                auditResults.details.isiDepartments = depts;
            } else {
                log(EMPTY, 'ISI sin departamentos');
                auditResults.warnings.push('ISI sin departamentos');
            }
        }
    } catch (e) {
        log(FAIL, `Error: ${e.message}`);
        auditResults.failed.push('Departamentos');
    }
}

async function audit6_Kiosks() {
    subsection('6', 'KIOSCOS DE FICHAJE');

    try {
        const res = await apiRequest('/api/kiosks?company_id=11');
        if (res.status === 200) {
            const kiosks = res.data.kiosks || res.data || [];
            if (kiosks.length > 0) {
                log(PASS, `${kiosks.length} kiosco(s) para ISI`);
                auditResults.passed.push('Kioscos ISI');

                // Verificar si tienen departamento
                const withDept = kiosks.filter(k => k.department_id || k.departmentId).length;
                log(withDept > 0 ? PASS : WARN, `${withDept}/${kiosks.length} con departamento`);
            } else {
                log(EMPTY, 'ISI sin kioscos');
                auditResults.warnings.push('ISI sin kioscos');
            }
        }
    } catch (e) {
        log(WARN, `Kioscos: ${e.message}`);
    }
}

async function audit7_Users() {
    subsection('7', 'USUARIOS (empleados)');

    try {
        const res = await apiRequest('/api/users?company_id=11');
        if (res.status === 200) {
            const users = res.data.users || res.data || [];
            if (users.length > 0) {
                log(PASS, `${users.length} usuario(s) en ISI`);
                auditResults.passed.push('Usuarios ISI');
                auditResults.details.isiUsers = users;

                // Verificar campos críticos
                let withDept = 0, withShift = 0, withCategory = 0, withRole = 0;

                for (const u of users) {
                    if (u.department_id || u.departmentId) withDept++;
                    if (u.shift_id || u.shiftId) withShift++;
                    if (u.salary_category_id || u.salaryCategoryId) withCategory++;
                    if (u.role) withRole++;
                }

                // Departamento
                const deptStatus = withDept === users.length ? PASS :
                                   withDept > 0 ? WARN : FAIL;
                log(deptStatus, `${withDept}/${users.length} con departamento`);
                if (withDept === 0) auditResults.failed.push('Usuarios sin departamento');

                // Turno
                const shiftStatus = withShift === users.length ? PASS :
                                    withShift > 0 ? WARN : FAIL;
                log(shiftStatus, `${withShift}/${users.length} con turno`);
                if (withShift === 0) auditResults.failed.push('Usuarios sin turno');

                // CRÍTICO: Categoría salarial
                const catStatus = withCategory === users.length ? PASS :
                                  withCategory > 0 ? WARN : FAIL;
                log(catStatus, `${withCategory}/${users.length} con categoría salarial`);
                if (withCategory === 0) {
                    log(FAIL, '⚠️  NINGÚN usuario tiene categoría salarial - NO SE PUEDE LIQUIDAR');
                    auditResults.failed.push('CRÍTICO: Usuarios sin categoría salarial');
                }

                // Rol
                log(withRole > 0 ? PASS : WARN, `${withRole}/${users.length} con rol`);

            } else {
                log(EMPTY, 'ISI sin usuarios');
                auditResults.warnings.push('ISI sin usuarios');
            }
        }
    } catch (e) {
        log(FAIL, `Error: ${e.message}`);
        auditResults.failed.push('Usuarios');
    }
}

async function audit8_Attendance() {
    subsection('8', 'ASISTENCIAS Y FICHAJES');

    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    try {
        const res = await apiRequest(`/api/attendance?company_id=11&start_date=${monthStart}&end_date=${today}`);
        if (res.status === 200) {
            const records = res.data.attendances || res.data || [];
            log(records.length > 0 ? PASS : EMPTY, `${records.length} registro(s) de asistencia este mes`);

            if (records.length > 0) {
                auditResults.passed.push('Asistencias');

                // Verificar campos críticos
                const sample = records[0];
                const fields = {
                    check_in: sample.check_in || sample.checkIn,
                    check_out: sample.check_out || sample.checkOut,
                    worked_hours: sample.worked_hours || sample.workedHours,
                    overtime_hours: sample.overtime_hours || sample.overtimeHours,
                    late_minutes: sample.late_minutes || sample.lateMinutes,
                    is_justified: sample.is_justified !== undefined || sample.isJustified !== undefined
                };

                for (const [name, exists] of Object.entries(fields)) {
                    log(exists ? PASS : WARN, `Campo ${name}: ${exists ? 'presente' : 'ausente'}`);
                    if (!exists && ['worked_hours', 'overtime_hours'].includes(name)) {
                        auditResults.warnings.push(`Campo ${name} no presente`);
                    }
                }

                // Contar con horas
                const withHours = records.filter(r =>
                    (r.worked_hours || r.workedHours) > 0
                ).length;
                log(withHours > 0 ? PASS : FAIL,
                    `${withHours}/${records.length} con horas calculadas`);

                // Horas extras
                const withOvertime = records.filter(r =>
                    (r.overtime_hours || r.overtimeHours) > 0
                ).length;
                log(PASS, `${withOvertime} con horas extras`);

            } else {
                auditResults.warnings.push('Sin asistencias este mes');
            }
        }
    } catch (e) {
        log(WARN, `Asistencias: ${e.message}`);
    }
}

async function audit9_Absences() {
    subsection('9', 'AUSENCIAS Y JUSTIFICACIONES');

    try {
        const res = await apiRequest('/api/v1/attendance/unjustified?company_id=11');
        if (res.status === 200) {
            const count = res.data.count || (res.data.absences || []).length || 0;
            log(PASS, `Endpoint de ausencias sin justificar: ${count}`);
            auditResults.passed.push('Endpoint justificación');
        } else if (res.status === 401) {
            log(PASS, 'Endpoint justificación existe (requiere auth)');
        } else {
            log(WARN, `Status: ${res.status}`);
        }
    } catch (e) {
        log(WARN, `Justificaciones: ${e.message}`);
    }
}

async function audit10_SalaryCategories() {
    subsection('10', 'CATEGORÍAS SALARIALES');

    try {
        const res = await apiRequest('/api/v1/payroll/salary-categories?company_id=11');
        if (res.status === 200) {
            const categories = res.data.categories || res.data || [];
            if (categories.length > 0) {
                log(PASS, `${categories.length} categoría(s) salarial(es):`);
                categories.slice(0, 5).forEach(cat => {
                    const rate = cat.hourly_rate || cat.hourlyRate ||
                                 cat.monthly_rate || cat.monthlyRate || 'sin valor';
                    console.log(`    - ${cat.name}: ${rate}`);
                });
                auditResults.passed.push('Categorías salariales');
                auditResults.details.salaryCategories = categories;
            } else {
                log(FAIL, 'Sin categorías salariales - NO SE PUEDE LIQUIDAR');
                auditResults.failed.push('CRÍTICO: Sin categorías salariales');
            }
        } else {
            log(WARN, `Status: ${res.status} - Probando endpoint alternativo...`);

            // Intentar otro endpoint
            const res2 = await apiRequest('/api/salary-categories?company_id=11');
            if (res2.status === 200) {
                const cats = res2.data || [];
                log(cats.length > 0 ? PASS : FAIL, `${cats.length} categorías (alt)`);
            } else {
                log(FAIL, 'Endpoint categorías no disponible');
                auditResults.failed.push('Endpoint categorías salariales');
            }
        }
    } catch (e) {
        log(FAIL, `Categorías: ${e.message}`);
        auditResults.failed.push('Categorías salariales');
    }
}

async function audit11_PayrollTemplates() {
    subsection('11', 'PLANTILLAS DE CONCEPTOS (RRHH)');

    try {
        const res = await apiRequest('/api/v1/payroll/templates?company_id=11');
        if (res.status === 200) {
            const templates = res.data.templates || res.data || [];
            if (templates.length > 0) {
                log(PASS, `${templates.length} plantilla(s) de liquidación:`);
                templates.slice(0, 5).forEach(t => {
                    console.log(`    - ${t.name}: ${t.period_type || t.periodType || 'sin tipo'}`);
                });
                auditResults.passed.push('Plantillas liquidación');
            } else {
                log(FAIL, 'Sin plantillas de liquidación - NO SE PUEDE LIQUIDAR');
                auditResults.failed.push('CRÍTICO: Sin plantillas');
            }
        } else {
            log(WARN, `Plantillas status: ${res.status}`);
        }
    } catch (e) {
        log(WARN, `Plantillas: ${e.message}`);
    }

    // Tipos de conceptos
    try {
        const res = await apiRequest('/api/v1/payroll/concept-types');
        if (res.status === 200) {
            const types = res.data.conceptTypes || res.data || [];
            if (types.length > 0) {
                log(PASS, `${types.length} tipo(s) de concepto:`);

                // Agrupar por tipo
                const byType = {};
                types.forEach(t => {
                    const type = t.type || 'sin tipo';
                    byType[type] = (byType[type] || 0) + 1;
                });
                for (const [type, count] of Object.entries(byType)) {
                    console.log(`    - ${type}: ${count} conceptos`);
                }

                auditResults.passed.push('Tipos de concepto');

                // Buscar Argentina
                const argTypes = types.filter(t =>
                    t.country_code === 'AR' || (t.country && t.country.toLowerCase().includes('argentin'))
                );
                log(argTypes.length > 0 ? PASS : WARN,
                    `${argTypes.length} concepto(s) de Argentina`);

            } else {
                log(FAIL, 'Sin tipos de concepto - NO SE PUEDE LIQUIDAR');
                auditResults.failed.push('CRÍTICO: Sin tipos de concepto');
            }
        }
    } catch (e) {
        log(WARN, `Tipos de concepto: ${e.message}`);
    }
}

async function audit12_PayrollRuns() {
    subsection('12', 'LIQUIDACIONES EJECUTADAS');

    try {
        const res = await apiRequest('/api/v1/payroll/runs?company_id=11');
        if (res.status === 200) {
            const runs = res.data.runs || res.data || [];
            if (runs.length > 0) {
                log(PASS, `${runs.length} liquidación(es) ejecutada(s):`);
                runs.slice(0, 5).forEach(r => {
                    console.log(`    - ${r.period_start || r.periodStart} a ${r.period_end || r.periodEnd}: ${r.status}`);
                });
                auditResults.passed.push('Liquidaciones');
            } else {
                log(EMPTY, 'Sin liquidaciones ejecutadas');
                auditResults.warnings.push('Sin liquidaciones ejecutadas');
            }
        } else {
            log(WARN, `Liquidaciones status: ${res.status}`);
        }
    } catch (e) {
        log(WARN, `Liquidaciones: ${e.message}`);
    }
}

// ============================================================================
// RESUMEN
// ============================================================================
function printSummary() {
    section('RESUMEN DE AUDITORÍA');

    const total = auditResults.passed.length + auditResults.failed.length + auditResults.warnings.length;
    const passRate = total > 0 ? ((auditResults.passed.length / total) * 100).toFixed(1) : 0;

    console.log(`${c.bold}ESTADÍSTICAS:${c.reset}`);
    console.log(`  ${c.green}✅ Pasados:${c.reset}    ${auditResults.passed.length}`);
    console.log(`  ${c.red}❌ Fallidos:${c.reset}   ${auditResults.failed.length}`);
    console.log(`  ${c.yellow}⚠️ Warnings:${c.reset}   ${auditResults.warnings.length}`);
    console.log(`  ${c.cyan}📊 Total:${c.reset}      ${total}`);
    console.log(`  ${c.magenta}📈 Completitud:${c.reset} ${passRate}%`);

    if (auditResults.failed.length > 0) {
        console.log(`\n${c.red}${c.bold}❌ ESLABONES ROTOS (CRÍTICOS):${c.reset}`);
        auditResults.failed.forEach(f => {
            console.log(`  ${c.red}•${c.reset} ${f}`);
        });
    }

    if (auditResults.warnings.length > 0) {
        console.log(`\n${c.yellow}${c.bold}⚠️ ESLABONES INCOMPLETOS:${c.reset}`);
        auditResults.warnings.forEach(w => {
            console.log(`  ${c.yellow}•${c.reset} ${w}`);
        });
    }

    // Diagnóstico
    console.log(`\n${c.bold}${c.cyan}═══ DIAGNÓSTICO PARA LIQUIDACIÓN ═══${c.reset}\n`);

    const criticalFails = auditResults.failed.filter(f =>
        f.includes('CRÍTICO') || f.includes('categoría') || f.includes('plantilla') || f.includes('turno')
    );

    if (criticalFails.length === 0) {
        console.log(`${c.green}${c.bold}✅ SISTEMA PUEDE LIQUIDAR${c.reset}`);
        console.log('   Los eslabones críticos están presentes.\n');
    } else {
        console.log(`${c.red}${c.bold}❌ SISTEMA NO PUEDE LIQUIDAR${c.reset}`);
        console.log('   Faltan eslabones críticos:\n');
        criticalFails.forEach(f => console.log(`   • ${f}`));
        console.log('\n   PARA PODER LIQUIDAR SE NECESITA:');
        console.log('   1. Usuarios con categoría salarial asignada');
        console.log('   2. Categorías con valores (hourly_rate/monthly_rate)');
        console.log('   3. Usuarios con turno asignado');
        console.log('   4. Plantillas de liquidación');
        console.log('   5. Tipos de conceptos (haberes/deducciones)');
    }

    // Cadena visual
    console.log(`\n${c.bold}${c.cyan}═══ CADENA DE LIQUIDACIÓN ═══${c.reset}\n`);

    const chain = [
        { name: 'País', status: auditResults.details.argentina ? 'ok' : 'warn' },
        { name: 'Empresa (ISI)', status: auditResults.details.isi ? 'ok' : 'fail' },
        { name: 'Turnos', status: auditResults.details.isiShifts?.length > 0 ? 'ok' : 'warn' },
        { name: 'Feriados', status: auditResults.passed.includes('Feriados Argentina') ? 'ok' : 'warn' },
        { name: 'Departamentos', status: auditResults.details.isiDepartments?.length > 0 ? 'ok' : 'warn' },
        { name: 'Kioscos', status: auditResults.passed.includes('Kioscos ISI') ? 'ok' : 'warn' },
        { name: 'Usuarios', status: auditResults.details.isiUsers?.length > 0 ? 'ok' : 'fail' },
        { name: 'Usuario → Turno', status: auditResults.failed.includes('Usuarios sin turno') ? 'fail' : 'ok' },
        { name: 'Usuario → Categoría', status: auditResults.failed.some(f => f.includes('categoría')) ? 'fail' : 'ok' },
        { name: 'Asistencias', status: auditResults.passed.includes('Asistencias') ? 'ok' : 'warn' },
        { name: 'Categorías Salariales', status: auditResults.passed.includes('Categorías salariales') ? 'ok' : 'fail' },
        { name: 'Plantillas', status: auditResults.passed.includes('Plantillas liquidación') ? 'ok' : 'fail' },
        { name: 'Tipos Concepto', status: auditResults.passed.includes('Tipos de concepto') ? 'ok' : 'fail' },
        { name: 'Liquidación', status: auditResults.passed.includes('Liquidaciones') ? 'ok' : 'warn' }
    ];

    chain.forEach((item, i) => {
        const icon = item.status === 'ok' ? `${c.green}✅${c.reset}` :
                     item.status === 'warn' ? `${c.yellow}⚠️${c.reset}` :
                     `${c.red}❌${c.reset}`;
        const arrow = i < chain.length - 1 ? ' → ' : '';
        process.stdout.write(`${icon} ${item.name}${arrow}`);
        if ((i + 1) % 4 === 0) console.log();
    });
    console.log('\n');
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
    console.log(`
${c.bold}${c.cyan}
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   AUDITORÍA COMPLETA - CADENA DE LIQUIDACIÓN (VIA API)                   ║
║                                                                           ║
║   Verificando 12 eslabones de dependencias para ISI (company_id=11)      ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
${c.reset}
    `);

    try {
        // Verificar servidor
        const health = await apiRequest('/api/v1/health');
        if (health.status !== 200) {
            console.log(`${c.red}❌ Servidor no disponible en localhost:9998${c.reset}`);
            console.log('   Ejecuta: cd backend && PORT=9998 npm start');
            return;
        }
        log(PASS, 'Servidor respondiendo\n');

        // Ejecutar auditorías
        await audit1_Countries();
        await audit2_Companies();
        await audit3_Shifts();
        await audit4_Calendars();
        await audit5_Departments();
        await audit6_Kiosks();
        await audit7_Users();
        await audit8_Attendance();
        await audit9_Absences();
        await audit10_SalaryCategories();
        await audit11_PayrollTemplates();
        await audit12_PayrollRuns();

        // Resumen
        printSummary();

    } catch (error) {
        console.error(`${c.red}ERROR:${c.reset}`, error.message);
    }
}

main();
