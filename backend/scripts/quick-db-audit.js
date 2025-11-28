/**
 * AUDITORÍA RÁPIDA DE BD LOCAL - CADENA DE LIQUIDACIÓN
 * También verifica datos del ciclo de liquidación creado
 */
const { Sequelize, QueryTypes } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
});

const c = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

async function query(sql, desc) {
    try {
        const result = await sequelize.query(sql, { type: QueryTypes.SELECT });
        return result;
    } catch (e) {
        console.log(`${c.red}ERROR en ${desc}:${c.reset}`, e.message);
        return null;
    }
}

async function countTable(table) {
    try {
        const result = await sequelize.query(`SELECT COUNT(*) as count FROM ${table}`, { type: QueryTypes.SELECT });
        return parseInt(result[0].count);
    } catch (e) {
        return -1; // tabla no existe
    }
}

async function getColumns(table) {
    try {
        const result = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = '${table}' ORDER BY ordinal_position
        `, { type: QueryTypes.SELECT });
        return result.map(r => r.column_name);
    } catch (e) {
        return [];
    }
}

async function main() {
    console.log(`\n${c.bold}${c.cyan}═══ AUDITORÍA BD LOCAL - CADENA DE LIQUIDACIÓN ═══${c.reset}\n`);

    await sequelize.authenticate();
    console.log(`${c.green}✅ Conectado a BD local${c.reset}\n`);

    const results = {
        passed: [],
        failed: [],
        warnings: []
    };

    // ===========================================================================
    // 1. PAÍSES
    // ===========================================================================
    console.log(`${c.bold}[1] PAÍSES${c.reset}`);
    const countriesCount = await countTable('payroll_countries');
    if (countriesCount > 0) {
        console.log(`  ${c.green}✅${c.reset} ${countriesCount} países en payroll_countries`);
        const countries = await query('SELECT * FROM payroll_countries LIMIT 3', 'países');
        if (countries) {
            countries.forEach(p => console.log(`     - ${p.name || p.country_name}`));
        }
        results.passed.push('Países');
    } else if (countriesCount === 0) {
        console.log(`  ${c.yellow}⚠️${c.reset} Tabla payroll_countries vacía`);
        results.warnings.push('Países vacío');
    } else {
        console.log(`  ${c.red}❌${c.reset} Tabla payroll_countries NO existe`);
        results.failed.push('Tabla payroll_countries');
    }

    // ===========================================================================
    // 2. EMPRESAS
    // ===========================================================================
    console.log(`\n${c.bold}[2] EMPRESAS${c.reset}`);
    const companiesCount = await countTable('companies');
    if (companiesCount > 0) {
        console.log(`  ${c.green}✅${c.reset} ${companiesCount} empresas`);
        const isi = await query("SELECT id, name, slug, country FROM companies WHERE id = 11 OR slug = 'isi' LIMIT 1", 'ISI');
        if (isi && isi.length > 0) {
            console.log(`     - ISI: id=${isi[0].id}, país=${isi[0].country || 'NO ASIGNADO'}`);
            if (!isi[0].country) {
                results.warnings.push('ISI sin país');
            }
        }
        results.passed.push('Empresas');
    } else {
        results.failed.push('Sin empresas');
    }

    // ===========================================================================
    // 3. TURNOS
    // ===========================================================================
    console.log(`\n${c.bold}[3] TURNOS${c.reset}`);
    const shiftsCount = await countTable('shifts');
    if (shiftsCount > 0) {
        console.log(`  ${c.green}✅${c.reset} ${shiftsCount} turnos`);
        const isiShifts = await query('SELECT id, name, start_time, end_time FROM shifts WHERE company_id = 11 LIMIT 3', 'turnos ISI');
        if (isiShifts && isiShifts.length > 0) {
            console.log(`     ISI tiene ${isiShifts.length}+ turnos:`);
            isiShifts.forEach(s => console.log(`     - ${s.name}: ${s.start_time}-${s.end_time}`));
        } else {
            console.log(`  ${c.yellow}⚠️${c.reset} ISI sin turnos asignados`);
            results.warnings.push('ISI sin turnos');
        }
        results.passed.push('Turnos');
    } else if (shiftsCount === 0) {
        results.warnings.push('Sin turnos');
    } else {
        results.failed.push('Tabla shifts');
    }

    // ===========================================================================
    // 4. FERIADOS
    // ===========================================================================
    console.log(`\n${c.bold}[4] FERIADOS${c.reset}`);
    const holidaysCount = await countTable('holidays');
    if (holidaysCount > 0) {
        console.log(`  ${c.green}✅${c.reset} ${holidaysCount} feriados`);
        const argHolidays = await query("SELECT date, name FROM holidays WHERE country_code = 'AR' OR country ILIKE '%argentin%' LIMIT 5", 'feriados AR');
        if (argHolidays && argHolidays.length > 0) {
            console.log(`     Argentina: ${argHolidays.length}+ feriados`);
        } else {
            console.log(`  ${c.yellow}⚠️${c.reset} Sin feriados de Argentina`);
            results.warnings.push('Sin feriados AR');
        }
        results.passed.push('Feriados');
    } else if (holidaysCount === 0) {
        console.log(`  ${c.yellow}⚠️${c.reset} Tabla holidays vacía`);
        results.warnings.push('Sin feriados');
    } else {
        console.log(`  ${c.red}❌${c.reset} Tabla holidays NO existe`);
        results.failed.push('Tabla holidays');
    }

    // ===========================================================================
    // 5. DEPARTAMENTOS
    // ===========================================================================
    console.log(`\n${c.bold}[5] DEPARTAMENTOS${c.reset}`);
    const deptsCount = await countTable('departments');
    if (deptsCount > 0) {
        console.log(`  ${c.green}✅${c.reset} ${deptsCount} departamentos`);
        const isiDepts = await query('SELECT id, name FROM departments WHERE company_id = 11 LIMIT 3', 'depts ISI');
        if (isiDepts && isiDepts.length > 0) {
            console.log(`     ISI tiene ${isiDepts.length}+ departamentos`);
        } else {
            results.warnings.push('ISI sin departamentos');
        }
        results.passed.push('Departamentos');
    } else {
        results.warnings.push('Sin departamentos');
    }

    // ===========================================================================
    // 6. KIOSCOS
    // ===========================================================================
    console.log(`\n${c.bold}[6] KIOSCOS${c.reset}`);
    const kiosksCount = await countTable('kiosks');
    if (kiosksCount > 0) {
        console.log(`  ${c.green}✅${c.reset} ${kiosksCount} kioscos`);
        results.passed.push('Kioscos');
    } else if (kiosksCount === 0) {
        results.warnings.push('Sin kioscos');
    } else {
        results.failed.push('Tabla kiosks');
    }

    // ===========================================================================
    // 7. USUARIOS
    // ===========================================================================
    console.log(`\n${c.bold}[7] USUARIOS${c.reset}`);
    const usersCount = await countTable('users');
    if (usersCount > 0) {
        console.log(`  ${c.green}✅${c.reset} ${usersCount} usuarios total`);

        // Verificar columnas críticas
        const userCols = await getColumns('users');
        console.log(`     Columnas disponibles: ${userCols.length}`);

        const hasSalaryCategoryId = userCols.includes('salary_category_id');
        const hasShiftId = userCols.includes('shift_id');
        const hasDepartmentId = userCols.includes('department_id');

        console.log(`     - shift_id: ${hasShiftId ? '✅' : '❌'}`);
        console.log(`     - department_id: ${hasDepartmentId ? '✅' : '❌'}`);
        console.log(`     - salary_category_id: ${hasSalaryCategoryId ? '✅' : '❌ CRÍTICO'}`);

        if (!hasSalaryCategoryId) {
            results.failed.push('CRÍTICO: Columna salary_category_id NO existe en users');
        }

        // Contar usuarios de ISI con datos completos
        const isiUsers = await query(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN department_id IS NOT NULL THEN 1 ELSE 0 END) as with_dept,
                   SUM(CASE WHEN shift_id IS NOT NULL THEN 1 ELSE 0 END) as with_shift
            FROM users WHERE company_id = 11
        `, 'users ISI');

        if (isiUsers && isiUsers[0]) {
            const u = isiUsers[0];
            console.log(`\n     ISI: ${u.total} usuarios`);
            console.log(`       - Con departamento: ${u.with_dept}/${u.total}`);
            console.log(`       - Con turno: ${u.with_shift}/${u.total}`);

            if (parseInt(u.with_shift) === 0) {
                results.failed.push('CRÍTICO: Ningún usuario ISI tiene turno');
            }
        }
        results.passed.push('Usuarios');
    } else {
        results.failed.push('Sin usuarios');
    }

    // ===========================================================================
    // 8. ASISTENCIAS
    // ===========================================================================
    console.log(`\n${c.bold}[8] ASISTENCIAS${c.reset}`);
    const attCount = await countTable('attendance');
    if (attCount > 0) {
        console.log(`  ${c.green}✅${c.reset} ${attCount} registros de asistencia`);

        // Verificar columnas
        const attCols = await getColumns('attendance');
        const hasWorkedHours = attCols.includes('worked_hours');
        const hasOvertimeHours = attCols.includes('overtime_hours');
        const hasIsJustified = attCols.includes('is_justified');

        console.log(`     - worked_hours: ${hasWorkedHours ? '✅' : '❌'}`);
        console.log(`     - overtime_hours: ${hasOvertimeHours ? '✅' : '❌'}`);
        console.log(`     - is_justified: ${hasIsJustified ? '✅' : '❌'}`);

        if (!hasWorkedHours) {
            results.warnings.push('Asistencia sin campo worked_hours');
        }

        // Ver si hay datos con horas
        if (hasWorkedHours) {
            const withHours = await query('SELECT COUNT(*) as count FROM attendance WHERE worked_hours > 0', 'con horas');
            if (withHours && withHours[0]) {
                console.log(`     - Con horas calculadas: ${withHours[0].count}/${attCount}`);
                if (parseInt(withHours[0].count) === 0) {
                    results.warnings.push('Sin horas calculadas en asistencias');
                }
            }
        }

        results.passed.push('Asistencias');
    } else if (attCount === 0) {
        console.log(`  ${c.yellow}⚠️${c.reset} Sin registros de asistencia`);
        results.warnings.push('Sin asistencias');
    } else {
        results.failed.push('Tabla attendance');
    }

    // ===========================================================================
    // 9. CATEGORÍAS SALARIALES
    // ===========================================================================
    console.log(`\n${c.bold}[9] CATEGORÍAS SALARIALES${c.reset}`);
    const catCount = await countTable('salary_categories');
    if (catCount > 0) {
        console.log(`  ${c.green}✅${c.reset} ${catCount} categorías salariales`);
        const cats = await query('SELECT id, name, hourly_rate, monthly_rate FROM salary_categories LIMIT 3', 'categorías');
        if (cats) {
            cats.forEach(cat => console.log(`     - ${cat.name}: hourly=${cat.hourly_rate}, monthly=${cat.monthly_rate}`));
        }
        results.passed.push('Categorías salariales');
    } else if (catCount === 0) {
        console.log(`  ${c.red}❌${c.reset} Sin categorías salariales - NO SE PUEDE LIQUIDAR`);
        results.failed.push('CRÍTICO: Sin categorías salariales');
    } else {
        console.log(`  ${c.red}❌${c.reset} Tabla salary_categories NO existe`);
        results.failed.push('CRÍTICO: Tabla salary_categories no existe');
    }

    // ===========================================================================
    // 10. PLANTILLAS DE LIQUIDACIÓN
    // ===========================================================================
    console.log(`\n${c.bold}[10] PLANTILLAS DE LIQUIDACIÓN${c.reset}`);
    const templatesCount = await countTable('payroll_templates');
    if (templatesCount > 0) {
        console.log(`  ${c.green}✅${c.reset} ${templatesCount} plantillas`);
        results.passed.push('Plantillas');
    } else if (templatesCount === 0) {
        console.log(`  ${c.red}❌${c.reset} Sin plantillas - NO SE PUEDE LIQUIDAR`);
        results.failed.push('CRÍTICO: Sin plantillas');
    } else {
        console.log(`  ${c.red}❌${c.reset} Tabla payroll_templates NO existe`);
        results.failed.push('CRÍTICO: Tabla payroll_templates');
    }

    // ===========================================================================
    // 11. TIPOS DE CONCEPTO
    // ===========================================================================
    console.log(`\n${c.bold}[11] TIPOS DE CONCEPTO${c.reset}`);
    const conceptsCount = await countTable('payroll_concept_types');
    if (conceptsCount > 0) {
        console.log(`  ${c.green}✅${c.reset} ${conceptsCount} tipos de concepto`);
        results.passed.push('Conceptos');
    } else if (conceptsCount === 0) {
        console.log(`  ${c.red}❌${c.reset} Sin tipos de concepto - NO SE PUEDE LIQUIDAR`);
        results.failed.push('CRÍTICO: Sin conceptos');
    } else {
        console.log(`  ${c.red}❌${c.reset} Tabla payroll_concept_types NO existe`);
        results.failed.push('CRÍTICO: Tabla payroll_concept_types');
    }

    // ===========================================================================
    // 12. LIQUIDACIONES
    // ===========================================================================
    console.log(`\n${c.bold}[12] LIQUIDACIONES${c.reset}`);
    const runsCount = await countTable('payroll_runs');
    if (runsCount > 0) {
        console.log(`  ${c.green}✅${c.reset} ${runsCount} liquidaciones ejecutadas`);
        results.passed.push('Liquidaciones');
    } else if (runsCount === 0) {
        console.log(`  ${c.yellow}⚠️${c.reset} Sin liquidaciones ejecutadas`);
        results.warnings.push('Sin liquidaciones');
    } else {
        console.log(`  ${c.red}❌${c.reset} Tabla payroll_runs NO existe`);
        results.failed.push('Tabla payroll_runs');
    }

    // ===========================================================================
    // RESUMEN
    // ===========================================================================
    console.log(`\n${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.bold}                    RESUMEN${c.reset}`);
    console.log(`${c.cyan}═══════════════════════════════════════════════════════${c.reset}\n`);

    console.log(`  ${c.green}✅ Pasados:${c.reset}    ${results.passed.length}`);
    console.log(`  ${c.red}❌ Fallidos:${c.reset}   ${results.failed.length}`);
    console.log(`  ${c.yellow}⚠️ Warnings:${c.reset}   ${results.warnings.length}`);

    if (results.failed.length > 0) {
        console.log(`\n${c.red}${c.bold}ESLABONES ROTOS (CRÍTICOS):${c.reset}`);
        results.failed.forEach(f => console.log(`  ${c.red}•${c.reset} ${f}`));
    }

    if (results.warnings.length > 0) {
        console.log(`\n${c.yellow}${c.bold}ESLABONES INCOMPLETOS:${c.reset}`);
        results.warnings.forEach(w => console.log(`  ${c.yellow}•${c.reset} ${w}`));
    }

    // Diagnóstico final
    const canLiquidate = !results.failed.some(f => f.includes('CRÍTICO'));
    console.log(`\n${c.bold}DIAGNÓSTICO:${c.reset}`);
    if (canLiquidate) {
        console.log(`  ${c.green}✅ El sistema PUEDE liquidar (estructura básica presente)${c.reset}`);
    } else {
        console.log(`  ${c.red}❌ El sistema NO PUEDE liquidar${c.reset}`);
        console.log(`\n  Para liquidar se necesita:`);
        console.log(`  1. Tabla salary_categories con datos`);
        console.log(`  2. Columna salary_category_id en users`);
        console.log(`  3. Usuarios con categoría asignada`);
        console.log(`  4. Tabla payroll_templates con plantillas`);
        console.log(`  5. Tabla payroll_concept_types con conceptos`);
    }

    await sequelize.close();
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
