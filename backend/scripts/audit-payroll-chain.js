/**
 * ============================================================================
 * AUDITORÍA COMPLETA DE CADENA DE LIQUIDACIÓN
 * ============================================================================
 *
 * Verifica TODOS los eslabones de la cadena necesarios para liquidar sueldos:
 *
 * CADENA COMPLETA:
 * 1. País → 2. Empresa/Sucursal → 3. Turnos → 4. Calendarios/Feriados →
 * 5. Departamentos → 6. Kioscos → 7. Usuarios con datos completos →
 * 8. Fichajes (entradas/salidas/horas extras) → 9. Ausencias (justificadas/no) →
 * 10. Categorías salariales → 11. Plantillas de conceptos → 12. Liquidación
 *
 * Ejecutar: node scripts/audit-payroll-chain.js
 */

require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

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

// Conexión a BD LOCAL
const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
});

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

// ============================================================================
// AUDITORÍAS
// ============================================================================

async function auditTableExists(tableName) {
    try {
        const result = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = :tableName
            )
        `, {
            replacements: { tableName },
            type: QueryTypes.SELECT
        });
        return result[0].exists;
    } catch (e) {
        return false;
    }
}

async function auditTableCount(tableName, where = '') {
    try {
        const whereClause = where ? `WHERE ${where}` : '';
        const result = await sequelize.query(
            `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`,
            { type: QueryTypes.SELECT }
        );
        return parseInt(result[0].count);
    } catch (e) {
        return -1;
    }
}

async function auditColumnExists(tableName, columnName) {
    try {
        const result = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = :tableName AND column_name = :columnName
            )
        `, {
            replacements: { tableName, columnName },
            type: QueryTypes.SELECT
        });
        return result[0].exists;
    } catch (e) {
        return false;
    }
}

// ============================================================================
// ESLABÓN 1: PAÍSES
// ============================================================================
async function audit1_Countries() {
    subsection('1', 'PAÍSES (payroll_countries)');

    const exists = await auditTableExists('payroll_countries');
    if (!exists) {
        log(FAIL, 'Tabla payroll_countries NO existe');
        auditResults.failed.push('Tabla payroll_countries');
        return;
    }
    log(PASS, 'Tabla payroll_countries existe');

    const count = await auditTableCount('payroll_countries');
    if (count === 0) {
        log(EMPTY, 'No hay países configurados');
        auditResults.warnings.push('Sin países en payroll_countries');
    } else {
        log(PASS, `${count} país(es) configurados`);

        // Verificar Argentina específicamente
        const argentina = await sequelize.query(`
            SELECT * FROM payroll_countries WHERE code = 'AR' OR name ILIKE '%argentin%'
        `, { type: QueryTypes.SELECT });

        if (argentina.length > 0) {
            log(PASS, `Argentina configurada: ${argentina[0].name}`);
            auditResults.details.argentina = argentina[0];
        } else {
            log(WARN, 'Argentina NO está configurada (requerida para el test)');
            auditResults.warnings.push('Argentina no configurada en payroll_countries');
        }
    }

    auditResults.passed.push('Tabla payroll_countries');
}

// ============================================================================
// ESLABÓN 2: EMPRESAS Y SUCURSALES
// ============================================================================
async function audit2_Companies() {
    subsection('2', 'EMPRESAS Y SUCURSALES');

    // Companies
    const companiesCount = await auditTableCount('companies', 'is_active = true');
    if (companiesCount > 0) {
        log(PASS, `${companiesCount} empresa(s) activa(s)`);

        // Verificar ISI (company_id=11)
        const isi = await sequelize.query(`
            SELECT id, name, slug, country FROM companies WHERE id = 11 OR slug = 'isi'
        `, { type: QueryTypes.SELECT });

        if (isi.length > 0) {
            log(PASS, `ISI encontrada: ${isi[0].name} (id=${isi[0].id})`);
            auditResults.details.isi = isi[0];

            // Verificar si tiene país asignado
            if (isi[0].country) {
                log(PASS, `ISI tiene país: ${isi[0].country}`);
            } else {
                log(WARN, 'ISI NO tiene país asignado (necesario para feriados)');
                auditResults.warnings.push('ISI sin país asignado');
            }
        }
    } else {
        log(FAIL, 'No hay empresas activas');
        auditResults.failed.push('Sin empresas activas');
    }

    // Sucursales (company_branches)
    const branchesExists = await auditTableExists('company_branches');
    if (branchesExists) {
        const branchesCount = await auditTableCount('company_branches');
        if (branchesCount > 0) {
            log(PASS, `${branchesCount} sucursal(es) configurada(s)`);
        } else {
            log(EMPTY, 'Tabla company_branches vacía');
            auditResults.warnings.push('Sin sucursales');
        }
    } else {
        log(WARN, 'Tabla company_branches NO existe');
    }
}

// ============================================================================
// ESLABÓN 3: TURNOS
// ============================================================================
async function audit3_Shifts() {
    subsection('3', 'TURNOS (shifts)');

    const exists = await auditTableExists('shifts');
    if (!exists) {
        log(FAIL, 'Tabla shifts NO existe');
        auditResults.failed.push('Tabla shifts');
        return;
    }

    const count = await auditTableCount('shifts');
    if (count === 0) {
        log(EMPTY, 'No hay turnos creados');
        auditResults.warnings.push('Sin turnos');
        return;
    }

    log(PASS, `${count} turno(s) creado(s)`);

    // Verificar turnos de ISI
    const isiShifts = await sequelize.query(`
        SELECT id, name, start_time, end_time, company_id
        FROM shifts
        WHERE company_id = 11
        LIMIT 5
    `, { type: QueryTypes.SELECT });

    if (isiShifts.length > 0) {
        log(PASS, `${isiShifts.length} turno(s) para ISI:`);
        isiShifts.forEach(s => {
            console.log(`    - ${s.name}: ${s.start_time} - ${s.end_time}`);
        });
        auditResults.details.isiShifts = isiShifts;
    } else {
        log(WARN, 'ISI no tiene turnos asignados');
        auditResults.warnings.push('ISI sin turnos');
    }

    // Verificar campos de calendario en turnos
    const hasCalendarFields = await auditColumnExists('shifts', 'work_days');
    if (hasCalendarFields) {
        log(PASS, 'Turnos tienen campo work_days para calendario');
    } else {
        log(WARN, 'Turnos NO tienen campo work_days');
    }
}

// ============================================================================
// ESLABÓN 4: CALENDARIOS Y FERIADOS
// ============================================================================
async function audit4_Calendars() {
    subsection('4', 'CALENDARIOS Y FERIADOS');

    // Tabla holidays
    const holidaysExists = await auditTableExists('holidays');
    if (holidaysExists) {
        const count = await auditTableCount('holidays');
        if (count > 0) {
            log(PASS, `${count} feriado(s) configurado(s)`);

            // Feriados de Argentina
            const argHolidays = await sequelize.query(`
                SELECT * FROM holidays
                WHERE country_code = 'AR' OR country ILIKE '%argentin%'
                ORDER BY date
                LIMIT 10
            `, { type: QueryTypes.SELECT });

            if (argHolidays.length > 0) {
                log(PASS, `${argHolidays.length} feriado(s) de Argentina:`);
                argHolidays.slice(0, 5).forEach(h => {
                    console.log(`    - ${h.date}: ${h.name}`);
                });
            } else {
                log(WARN, 'No hay feriados de Argentina');
                auditResults.warnings.push('Sin feriados de Argentina');
            }
        } else {
            log(EMPTY, 'Tabla holidays vacía');
            auditResults.warnings.push('Sin feriados');
        }
    } else {
        log(FAIL, 'Tabla holidays NO existe');
        auditResults.failed.push('Tabla holidays');
    }

    // Tabla shift_calendars (asignación turno-calendario)
    const calendarExists = await auditTableExists('shift_calendars');
    if (calendarExists) {
        const count = await auditTableCount('shift_calendars');
        log(count > 0 ? PASS : EMPTY, `${count} calendario(s) de turno`);
    } else {
        log(WARN, 'Tabla shift_calendars NO existe');
    }
}

// ============================================================================
// ESLABÓN 5: DEPARTAMENTOS
// ============================================================================
async function audit5_Departments() {
    subsection('5', 'DEPARTAMENTOS');

    const exists = await auditTableExists('departments');
    if (!exists) {
        log(FAIL, 'Tabla departments NO existe');
        auditResults.failed.push('Tabla departments');
        return;
    }

    const count = await auditTableCount('departments');
    if (count === 0) {
        log(EMPTY, 'No hay departamentos');
        auditResults.warnings.push('Sin departamentos');
        return;
    }

    log(PASS, `${count} departamento(s)`);

    // Departamentos de ISI
    const isiDepts = await sequelize.query(`
        SELECT id, name, company_id FROM departments WHERE company_id = 11 LIMIT 5
    `, { type: QueryTypes.SELECT });

    if (isiDepts.length > 0) {
        log(PASS, `${isiDepts.length} departamento(s) para ISI`);
        auditResults.details.isiDepartments = isiDepts;
    } else {
        log(WARN, 'ISI no tiene departamentos');
    }
}

// ============================================================================
// ESLABÓN 6: KIOSCOS
// ============================================================================
async function audit6_Kiosks() {
    subsection('6', 'KIOSCOS DE FICHAJE');

    const exists = await auditTableExists('kiosks');
    if (!exists) {
        log(FAIL, 'Tabla kiosks NO existe');
        auditResults.failed.push('Tabla kiosks');
        return;
    }

    const count = await auditTableCount('kiosks');
    if (count === 0) {
        log(EMPTY, 'No hay kioscos');
        auditResults.warnings.push('Sin kioscos');
        return;
    }

    log(PASS, `${count} kiosco(s)`);

    // Verificar si kioscos tienen departamento asignado
    const hasDeptColumn = await auditColumnExists('kiosks', 'department_id');
    if (hasDeptColumn) {
        const withDept = await auditTableCount('kiosks', 'department_id IS NOT NULL');
        log(withDept > 0 ? PASS : WARN, `${withDept} kiosco(s) con departamento asignado`);
    }
}

// ============================================================================
// ESLABÓN 7: USUARIOS CON DATOS COMPLETOS
// ============================================================================
async function audit7_Users() {
    subsection('7', 'USUARIOS (empleados)');

    const exists = await auditTableExists('users');
    if (!exists) {
        log(FAIL, 'Tabla users NO existe');
        auditResults.failed.push('Tabla users');
        return;
    }

    const count = await auditTableCount('users');
    log(PASS, `${count} usuario(s) total`);

    // Usuarios de ISI
    const isiUsers = await sequelize.query(`
        SELECT id, "firstName", "lastName", email, department_id, shift_id,
               salary_category_id, role, company_id
        FROM users WHERE company_id = 11 LIMIT 10
    `, { type: QueryTypes.SELECT });

    if (isiUsers.length === 0) {
        log(WARN, 'ISI no tiene usuarios');
        auditResults.warnings.push('ISI sin usuarios');
        return;
    }

    log(PASS, `${isiUsers.length} usuario(s) en ISI`);

    // Verificar campos críticos para liquidación
    let withDept = 0, withShift = 0, withCategory = 0;

    for (const u of isiUsers) {
        if (u.department_id) withDept++;
        if (u.shift_id) withShift++;
        if (u.salary_category_id) withCategory++;
    }

    // Departamento
    if (withDept === isiUsers.length) {
        log(PASS, `${withDept}/${isiUsers.length} usuarios con departamento`);
    } else if (withDept > 0) {
        log(WARN, `${withDept}/${isiUsers.length} usuarios con departamento`);
    } else {
        log(FAIL, 'NINGÚN usuario tiene departamento asignado');
        auditResults.failed.push('Usuarios sin departamento');
    }

    // Turno
    if (withShift === isiUsers.length) {
        log(PASS, `${withShift}/${isiUsers.length} usuarios con turno`);
    } else if (withShift > 0) {
        log(WARN, `${withShift}/${isiUsers.length} usuarios con turno`);
    } else {
        log(FAIL, 'NINGÚN usuario tiene turno asignado');
        auditResults.failed.push('Usuarios sin turno');
    }

    // CRÍTICO: Categoría salarial
    const hasCategoryColumn = await auditColumnExists('users', 'salary_category_id');
    if (!hasCategoryColumn) {
        log(FAIL, 'Columna salary_category_id NO existe en users');
        auditResults.failed.push('Columna salary_category_id no existe');
    } else if (withCategory === 0) {
        log(FAIL, 'NINGÚN usuario tiene categoría salarial - NO SE PUEDE LIQUIDAR');
        auditResults.failed.push('Usuarios sin categoría salarial');
    } else {
        log(withCategory === isiUsers.length ? PASS : WARN,
            `${withCategory}/${isiUsers.length} usuarios con categoría salarial`);
    }

    auditResults.details.isiUsers = isiUsers;
}

// ============================================================================
// ESLABÓN 8: ASISTENCIAS Y FICHAJES
// ============================================================================
async function audit8_Attendance() {
    subsection('8', 'ASISTENCIAS Y FICHAJES');

    const exists = await auditTableExists('attendance');
    if (!exists) {
        log(FAIL, 'Tabla attendance NO existe');
        auditResults.failed.push('Tabla attendance');
        return;
    }

    const count = await auditTableCount('attendance');
    if (count === 0) {
        log(EMPTY, 'No hay registros de asistencia');
        auditResults.warnings.push('Sin fichajes');
    } else {
        log(PASS, `${count} registro(s) de asistencia`);
    }

    // Verificar campos críticos
    const criticalColumns = [
        { name: 'check_in', desc: 'Hora de entrada' },
        { name: 'check_out', desc: 'Hora de salida' },
        { name: 'worked_hours', desc: 'Horas trabajadas' },
        { name: 'overtime_hours', desc: 'Horas extras' },
        { name: 'late_minutes', desc: 'Minutos tarde' },
        { name: 'is_justified', desc: 'Justificación ausencia' },
        { name: 'justification_type', desc: 'Tipo justificación' }
    ];

    for (const col of criticalColumns) {
        const exists = await auditColumnExists('attendance', col.name);
        log(exists ? PASS : FAIL, `Campo ${col.name} (${col.desc}): ${exists ? 'existe' : 'FALTA'}`);
        if (!exists) {
            auditResults.failed.push(`Campo attendance.${col.name}`);
        }
    }

    // Verificar si hay datos con horas calculadas
    if (count > 0) {
        const withHours = await sequelize.query(`
            SELECT COUNT(*) as count FROM attendance
            WHERE worked_hours IS NOT NULL AND worked_hours > 0
        `, { type: QueryTypes.SELECT });

        const hoursCount = parseInt(withHours[0].count);
        if (hoursCount === 0) {
            log(FAIL, 'NINGÚN registro tiene horas trabajadas calculadas');
            auditResults.failed.push('Asistencias sin horas calculadas');
        } else {
            log(PASS, `${hoursCount}/${count} registros con horas calculadas`);
        }

        // Horas extras
        const withOvertime = await sequelize.query(`
            SELECT COUNT(*) as count FROM attendance
            WHERE overtime_hours IS NOT NULL AND overtime_hours > 0
        `, { type: QueryTypes.SELECT });
        log(PASS, `${withOvertime[0].count} registros con horas extras`);
    }
}

// ============================================================================
// ESLABÓN 9: AUSENCIAS Y JUSTIFICACIONES
// ============================================================================
async function audit9_Absences() {
    subsection('9', 'AUSENCIAS Y JUSTIFICACIONES');

    // Verificar tabla absences si existe
    const absencesExists = await auditTableExists('absences');
    if (absencesExists) {
        const count = await auditTableCount('absences');
        log(count > 0 ? PASS : EMPTY, `${count} registro(s) en tabla absences`);
    } else {
        log(WARN, 'Tabla absences NO existe (usando attendance.is_justified)');
    }

    // Verificar campos de justificación en attendance
    const isJustified = await auditColumnExists('attendance', 'is_justified');
    const justType = await auditColumnExists('attendance', 'justification_type');
    const justReason = await auditColumnExists('attendance', 'justification_reason');

    if (isJustified && justType) {
        log(PASS, 'Campos de justificación en attendance existen');

        // Contar ausencias justificadas/no justificadas
        const justified = await sequelize.query(`
            SELECT COUNT(*) as count FROM attendance
            WHERE is_justified = true
        `, { type: QueryTypes.SELECT });

        const unjustified = await sequelize.query(`
            SELECT COUNT(*) as count FROM attendance
            WHERE is_justified = false AND check_in IS NULL
        `, { type: QueryTypes.SELECT });

        log(PASS, `${justified[0].count} ausencias justificadas`);
        log(PASS, `${unjustified[0].count} ausencias sin justificar`);
    } else {
        log(FAIL, 'Campos de justificación NO existen en attendance');
        auditResults.failed.push('Campos de justificación en attendance');
    }
}

// ============================================================================
// ESLABÓN 10: CATEGORÍAS SALARIALES
// ============================================================================
async function audit10_SalaryCategories() {
    subsection('10', 'CATEGORÍAS SALARIALES');

    const exists = await auditTableExists('salary_categories');
    if (!exists) {
        log(FAIL, 'Tabla salary_categories NO existe - CRÍTICO PARA LIQUIDACIÓN');
        auditResults.failed.push('Tabla salary_categories');
        return;
    }

    const count = await auditTableCount('salary_categories');
    if (count === 0) {
        log(FAIL, 'No hay categorías salariales - NO SE PUEDE LIQUIDAR');
        auditResults.failed.push('Sin categorías salariales');
        return;
    }

    log(PASS, `${count} categoría(s) salarial(es)`);

    // Mostrar categorías
    const categories = await sequelize.query(`
        SELECT * FROM salary_categories LIMIT 10
    `, { type: QueryTypes.SELECT });

    categories.forEach(cat => {
        console.log(`    - ${cat.name}: ${cat.hourly_rate || cat.monthly_rate || 'sin valor'}`);
    });

    // Verificar campos necesarios
    const requiredFields = ['hourly_rate', 'monthly_rate', 'overtime_multiplier'];
    for (const field of requiredFields) {
        const exists = await auditColumnExists('salary_categories', field);
        log(exists ? PASS : WARN, `Campo ${field}: ${exists ? 'existe' : 'falta'}`);
    }
}

// ============================================================================
// ESLABÓN 11: PLANTILLAS DE CONCEPTOS
// ============================================================================
async function audit11_PayrollTemplates() {
    subsection('11', 'PLANTILLAS DE CONCEPTOS (RRHH)');

    // payroll_templates
    const templatesExists = await auditTableExists('payroll_templates');
    if (!templatesExists) {
        log(FAIL, 'Tabla payroll_templates NO existe');
        auditResults.failed.push('Tabla payroll_templates');
    } else {
        const count = await auditTableCount('payroll_templates');
        if (count === 0) {
            log(FAIL, 'No hay plantillas de liquidación - NO SE PUEDE LIQUIDAR');
            auditResults.failed.push('Sin plantillas de liquidación');
        } else {
            log(PASS, `${count} plantilla(s) de liquidación`);

            // Mostrar plantillas
            const templates = await sequelize.query(`
                SELECT * FROM payroll_templates LIMIT 5
            `, { type: QueryTypes.SELECT });
            templates.forEach(t => {
                console.log(`    - ${t.name}: ${t.period_type || 'sin tipo'}`);
            });
        }
    }

    // payroll_concept_types (tipos de conceptos)
    const conceptsExists = await auditTableExists('payroll_concept_types');
    if (!conceptsExists) {
        log(FAIL, 'Tabla payroll_concept_types NO existe');
        auditResults.failed.push('Tabla payroll_concept_types');
    } else {
        const count = await auditTableCount('payroll_concept_types');
        if (count === 0) {
            log(FAIL, 'No hay tipos de conceptos - NO SE PUEDE LIQUIDAR');
            auditResults.failed.push('Sin tipos de conceptos');
        } else {
            log(PASS, `${count} tipo(s) de concepto`);

            // Verificar conceptos por tipo
            const byType = await sequelize.query(`
                SELECT type, COUNT(*) as count FROM payroll_concept_types
                GROUP BY type
            `, { type: QueryTypes.SELECT });

            byType.forEach(t => {
                console.log(`    - ${t.type || 'sin tipo'}: ${t.count} conceptos`);
            });
        }
    }

    // Verificar conceptos de Argentina
    const argConcepts = await sequelize.query(`
        SELECT COUNT(*) as count FROM payroll_concept_types
        WHERE country_code = 'AR' OR country ILIKE '%argentin%'
    `, { type: QueryTypes.SELECT });

    if (parseInt(argConcepts[0].count) > 0) {
        log(PASS, `${argConcepts[0].count} concepto(s) de Argentina`);
    } else {
        log(WARN, 'No hay conceptos específicos de Argentina');
        auditResults.warnings.push('Sin conceptos de Argentina');
    }
}

// ============================================================================
// ESLABÓN 12: LIQUIDACIONES
// ============================================================================
async function audit12_PayrollRuns() {
    subsection('12', 'LIQUIDACIONES (payroll_runs)');

    const exists = await auditTableExists('payroll_runs');
    if (!exists) {
        log(FAIL, 'Tabla payroll_runs NO existe');
        auditResults.failed.push('Tabla payroll_runs');
        return;
    }

    const count = await auditTableCount('payroll_runs');
    if (count === 0) {
        log(EMPTY, 'No hay liquidaciones ejecutadas');
        auditResults.warnings.push('Sin liquidaciones ejecutadas');
    } else {
        log(PASS, `${count} liquidación(es) ejecutada(s)`);

        // Mostrar últimas
        const runs = await sequelize.query(`
            SELECT * FROM payroll_runs ORDER BY created_at DESC LIMIT 5
        `, { type: QueryTypes.SELECT });

        runs.forEach(r => {
            console.log(`    - ${r.period_start} a ${r.period_end}: ${r.status}`);
        });
    }

    // payroll_run_details
    const detailsExists = await auditTableExists('payroll_run_details');
    if (detailsExists) {
        const detailsCount = await auditTableCount('payroll_run_details');
        log(detailsCount > 0 ? PASS : EMPTY, `${detailsCount} detalle(s) de liquidación`);
    } else {
        log(WARN, 'Tabla payroll_run_details NO existe');
    }
}

// ============================================================================
// RESUMEN FINAL
// ============================================================================
function printSummary() {
    section('RESUMEN DE AUDITORÍA');

    const total = auditResults.passed.length + auditResults.failed.length + auditResults.warnings.length;
    const passRate = ((auditResults.passed.length / total) * 100).toFixed(1);

    console.log(`${c.bold}ESTADÍSTICAS:${c.reset}`);
    console.log(`  ${c.green}✅ Pasados:${c.reset}    ${auditResults.passed.length}`);
    console.log(`  ${c.red}❌ Fallidos:${c.reset}   ${auditResults.failed.length}`);
    console.log(`  ${c.yellow}⚠️ Warnings:${c.reset}   ${auditResults.warnings.length}`);
    console.log(`  ${c.cyan}📊 Total:${c.reset}      ${total}`);
    console.log(`  ${c.magenta}📈 Completitud:${c.reset} ${passRate}%`);

    if (auditResults.failed.length > 0) {
        console.log(`\n${c.red}${c.bold}ESLABONES ROTOS (CRÍTICOS):${c.reset}`);
        auditResults.failed.forEach(f => {
            console.log(`  ${c.red}❌${c.reset} ${f}`);
        });
    }

    if (auditResults.warnings.length > 0) {
        console.log(`\n${c.yellow}${c.bold}ESLABONES INCOMPLETOS (WARNINGS):${c.reset}`);
        auditResults.warnings.forEach(w => {
            console.log(`  ${c.yellow}⚠️${c.reset} ${w}`);
        });
    }

    // Diagnóstico de liquidación
    console.log(`\n${c.bold}${c.cyan}═══ DIAGNÓSTICO PARA LIQUIDACIÓN ═══${c.reset}\n`);

    const canLiquidate =
        !auditResults.failed.includes('Tabla salary_categories') &&
        !auditResults.failed.includes('Sin categorías salariales') &&
        !auditResults.failed.includes('Usuarios sin categoría salarial') &&
        !auditResults.failed.includes('Tabla payroll_templates') &&
        !auditResults.failed.includes('Sin plantillas de liquidación') &&
        !auditResults.failed.includes('Tabla payroll_concept_types') &&
        !auditResults.failed.includes('Sin tipos de conceptos') &&
        !auditResults.failed.includes('Usuarios sin turno');

    if (canLiquidate) {
        console.log(`${c.green}${c.bold}✅ SISTEMA PUEDE LIQUIDAR${c.reset}`);
        console.log('   Los eslabones críticos están presentes.');
    } else {
        console.log(`${c.red}${c.bold}❌ SISTEMA NO PUEDE LIQUIDAR${c.reset}`);
        console.log('   Faltan eslabones críticos de la cadena.');
        console.log('\n   Para poder liquidar se necesita:');
        console.log('   1. Categorías salariales con valores');
        console.log('   2. Usuarios con categoría asignada');
        console.log('   3. Plantillas de liquidación');
        console.log('   4. Tipos de conceptos (haberes/deducciones)');
        console.log('   5. Usuarios con turno asignado');
    }
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
    console.log(`
${c.bold}${c.cyan}
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   AUDITORÍA COMPLETA - CADENA DE LIQUIDACIÓN                             ║
║                                                                           ║
║   Verificando 12 eslabones de dependencias                               ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
${c.reset}
    `);

    try {
        await sequelize.authenticate();
        log(PASS, 'Conexión a base de datos establecida\n');

        // Ejecutar todas las auditorías
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
    } finally {
        await sequelize.close();
    }
}

main();
