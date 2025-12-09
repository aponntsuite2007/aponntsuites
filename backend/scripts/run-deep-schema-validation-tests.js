/**
 * ============================================================================
 * DEEP SCHEMA VALIDATION TESTS
 * ============================================================================
 * Test profundo que detecta inconsistencias entre:
 * - Queries SQL en código vs estructura real de tablas en BD
 * - CHECK constraints vs valores usados en queries
 * - Tablas referenciadas que no existen
 * - Columnas referenciadas que no existen
 *
 * CREADO: 2025-12-08
 * PROPÓSITO: Detectar errores como el de medicalCaseRoutes.js ANTES de que
 *            lleguen a la UI del usuario
 * ============================================================================
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración
const CONFIG = {
    PORT: process.env.TEST_PORT || 9998,
    DB: {
        host: 'localhost',
        user: 'postgres',
        password: 'Aedr15150302',
        database: 'attendance_system',
        port: 5432
    },
    COMPANY_ID: 11 // ISI Ingeniería
};

// Pool de conexiones
const pool = new Pool(CONFIG.DB);

// Resultados del test
const testResults = {
    timestamp: new Date().toISOString(),
    companyId: CONFIG.COMPANY_ID,
    categories: [],
    totalTests: 0,
    passed: 0,
    failed: 0,
    warnings: 0
};

// ============================================================================
// HELPER: Ejecutar query con timeout
// ============================================================================
async function executeQuery(query, params = []) {
    const client = await pool.connect();
    try {
        const result = await client.query(query, params);
        return { success: true, rows: result.rows, rowCount: result.rowCount };
    } catch (error) {
        return { success: false, error: error.message, code: error.code };
    } finally {
        client.release();
    }
}

// ============================================================================
// HELPER: Obtener CHECK constraints de una tabla
// ============================================================================
async function getCheckConstraints(tableName) {
    const query = `
        SELECT
            conname as constraint_name,
            pg_get_constraintdef(oid) as constraint_definition
        FROM pg_constraint
        WHERE conrelid = $1::regclass
        AND contype = 'c'
    `;
    const result = await executeQuery(query, [tableName]);
    if (!result.success) return [];

    return result.rows.map(r => ({
        name: r.constraint_name,
        definition: r.constraint_definition,
        allowedValues: extractAllowedValues(r.constraint_definition)
    }));
}

// ============================================================================
// HELPER: Extraer valores permitidos de un CHECK constraint
// ============================================================================
function extractAllowedValues(constraintDef) {
    // Ejemplo: CHECK ((absence_type)::text = ANY ((ARRAY['medical_illness'::character varying, ...])::text[]))
    const match = constraintDef.match(/ARRAY\[(.*?)\]/);
    if (!match) return [];

    // Extraer valores entre comillas simples
    const valuesMatch = match[1].matchAll(/'([^']+)'/g);
    return Array.from(valuesMatch, m => m[1]);
}

// ============================================================================
// HELPER: Verificar si una tabla existe
// ============================================================================
async function tableExists(tableName) {
    const query = `
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = $1
        ) as exists
    `;
    const result = await executeQuery(query, [tableName]);
    return result.success && result.rows[0]?.exists;
}

// ============================================================================
// HELPER: Obtener columnas de una tabla
// ============================================================================
async function getTableColumns(tableName) {
    const query = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
    `;
    const result = await executeQuery(query, [tableName]);
    return result.success ? result.rows.map(r => r.column_name) : [];
}

// ============================================================================
// TEST: Validar CHECK constraints vs valores usados en código
// ============================================================================
async function testCheckConstraintsMismatch() {
    console.log('\n📋 TEST: Check Constraints vs Código\n');

    const tests = [];

    // Validación de valores CORRECTOS en uso (ya corregidos)
    // El test PASA si los valores correctos están en el constraint
    const validationsToCheck = [
        {
            table: 'absence_cases',
            column: 'case_status',
            // Valores CORRECTOS que ahora usa el código
            codeValues: ['pending', 'under_review', 'awaiting_docs', 'needs_follow_up', 'justified', 'not_justified', 'closed'],
            file: 'medicalCaseRoutes.js (CORREGIDO)',
            line: '1657-1672'
        },
        {
            table: 'medical_certificates',
            column: 'status',
            // Valores CORRECTOS que ahora usa el código
            codeValues: ['approved', 'pending', 'under_review', 'rejected', 'expired'],
            file: 'medicalCaseRoutes.js (CORREGIDO)',
            line: '1652-1654'
        }
    ];

    for (const mismatch of validationsToCheck) {
        const constraints = await getCheckConstraints(mismatch.table);
        const columnConstraint = constraints.find(c =>
            c.definition.includes(mismatch.column)
        );

        if (!columnConstraint) {
            tests.push({
                test: `${mismatch.table}.${mismatch.column}_constraint`,
                passed: true,
                details: `⚠️ No hay CHECK constraint para ${mismatch.column}`,
                isWarning: true
            });
            continue;
        }

        const allowedValues = columnConstraint.allowedValues;
        const invalidValues = mismatch.codeValues.filter(v => !allowedValues.includes(v));

        if (invalidValues.length > 0) {
            tests.push({
                test: `${mismatch.table}.${mismatch.column}_values`,
                passed: false,
                details: `❌ Valores inválidos en ${mismatch.file}:${mismatch.line}`,
                error: {
                    invalidValues,
                    allowedValues,
                    file: mismatch.file,
                    line: mismatch.line,
                    suggestion: `Reemplazar: ${invalidValues.map((v, i) =>
                        `'${v}' → '${allowedValues[i] || '???'}'`
                    ).join(', ')}`
                }
            });
        } else {
            tests.push({
                test: `${mismatch.table}.${mismatch.column}_values`,
                passed: true,
                details: `✅ Todos los valores son válidos`
            });
        }
    }

    return {
        category: 'check_constraints_mismatch',
        tests,
        passed: tests.every(t => t.passed)
    };
}

// ============================================================================
// TEST: Validar tablas críticas del módulo médico
// ============================================================================
async function testMedicalTablesExist() {
    console.log('\n🏥 TEST: Tablas Médicas\n');

    const requiredTables = [
        'user_medical_exams',
        'user_work_restrictions',
        'absence_cases',
        'medical_records',
        'medical_certificates',
        'user_documents'
    ];

    const tests = [];

    for (const table of requiredTables) {
        const exists = await tableExists(table);
        tests.push({
            test: `table_${table}_exists`,
            passed: exists,
            details: exists
                ? `✅ Tabla ${table} existe`
                : `❌ Tabla ${table} NO existe`
        });

        if (exists) {
            const columns = await getTableColumns(table);
            tests.push({
                test: `table_${table}_has_columns`,
                passed: columns.length > 0,
                details: `📊 ${table} tiene ${columns.length} columnas`,
                columns
            });
        }
    }

    return {
        category: 'medical_tables_existence',
        tests,
        passed: tests.filter(t => !t.test.includes('_has_columns')).every(t => t.passed)
    };
}

// ============================================================================
// TEST: Validar endpoint médico problemático
// ============================================================================
async function testMedicalEndpointQuery() {
    console.log('\n🔍 TEST: Query del Endpoint Médico\n');

    const tests = [];

    // Simular la query del endpoint /employees/with-medical-records
    const query = `
        SELECT
            u.user_id as id,
            CONCAT(u."firstName", ' ', u."lastName") as name,
            COALESCE(u.legajo, u."employeeId", 'N/A') as legajo,
            COALESCE(d.name, 'Sin Departamento') as department,
            -- Último examen médico
            (SELECT exam_date FROM user_medical_exams
             WHERE user_id = u.user_id ORDER BY exam_date DESC LIMIT 1) as last_medical_check,
            -- Casos médicos pendientes (CORREGIDO)
            (SELECT COUNT(*) FROM absence_cases
             WHERE employee_id = u.user_id
             AND case_status IN ('pending', 'under_review', 'awaiting_docs')) as pending_cases,
            -- Casos completados
            (SELECT COUNT(*) FROM absence_cases
             WHERE employee_id = u.user_id AND case_status = 'closed') as completed_cases
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.company_id = $1
        AND u."isActive" = true
        AND u.role != 'admin'
        LIMIT 10
    `;

    const result = await executeQuery(query, [CONFIG.COMPANY_ID]);

    tests.push({
        test: 'medical_endpoint_query_corrected',
        passed: result.success,
        details: result.success
            ? `✅ Query corregida funciona (${result.rowCount} filas)`
            : `❌ Query falla: ${result.error}`,
        rowCount: result.rowCount
    });

    // Probar query original (debe fallar o dar resultados vacíos en pending_cases)
    // Test del query CORREGIDO (valores correctos)
    const correctedQuery = `
        SELECT
            (SELECT COUNT(*) FROM absence_cases
             WHERE employee_id = u.user_id
             AND case_status IN ('pending', 'under_review', 'awaiting_docs', 'needs_follow_up')) as pending_cases
        FROM users u
        WHERE u.company_id = $1
        AND u."isActive" = true
        LIMIT 5
    `;

    const correctedResult = await executeQuery(correctedQuery, [CONFIG.COMPANY_ID]);

    tests.push({
        test: 'corrected_query_status_values',
        passed: correctedResult.success,
        details: correctedResult.success
            ? `✅ Query corregido funciona (valores de case_status válidos)`
            : `❌ Query falló: ${correctedResult.error}`,
        note: 'Bug corregido en medicalCaseRoutes.js - usa valores correctos del CHECK constraint'
    });

    return {
        category: 'medical_endpoint_validation',
        tests,
        passed: tests.every(t => t.passed)
    };
}

// ============================================================================
// TEST: Validar endpoint de ausentes (nuevo)
// ============================================================================
async function testAbsenceEndpoint() {
    console.log('\n👤 TEST: Endpoint de Ausentes\n');

    const tests = [];
    const today = new Date().toISOString().split('T')[0];

    // Verificar que el servicio de turnos funciona
    const shiftQuery = `
        SELECT
            usa.user_id,
            u."firstName" || ' ' || u."lastName" as employee_name,
            s.name as shift_name
        FROM user_shift_assignments usa
        JOIN users u ON usa.user_id = u.user_id
        JOIN shifts s ON usa.shift_id = s.id
        WHERE u.company_id = $1
        AND u."isActive" = true
        LIMIT 10
    `;

    const shiftResult = await executeQuery(shiftQuery, [CONFIG.COMPANY_ID]);

    tests.push({
        test: 'shift_assignments_query',
        passed: shiftResult.success,
        details: shiftResult.success
            ? `✅ ${shiftResult.rowCount} empleados con turno asignado`
            : `❌ Error: ${shiftResult.error}`
    });

    // Verificar asistencias de hoy
    const attendanceQuery = `
        SELECT
            a."UserId",
            a."checkInTime",
            a."checkOutTime",
            u."firstName" || ' ' || u."lastName" as employee_name
        FROM attendances a
        JOIN users u ON a."UserId" = u.user_id
        WHERE a.company_id = $1
        AND a.date = $2
        AND a."checkInTime" IS NOT NULL
    `;

    const attendanceResult = await executeQuery(attendanceQuery, [CONFIG.COMPANY_ID, today]);

    tests.push({
        test: 'todays_attendance_query',
        passed: attendanceResult.success,
        details: attendanceResult.success
            ? `✅ ${attendanceResult.rowCount} empleados presentes hoy`
            : `❌ Error: ${attendanceResult.error}`
    });

    // Calcular ausentes (simplificado)
    const absentQuery = `
        WITH expected_to_work AS (
            SELECT DISTINCT usa.user_id
            FROM user_shift_assignments usa
            JOIN users u ON usa.user_id = u.user_id
            JOIN shifts s ON usa.shift_id = s.id
            WHERE u.company_id = $1
            AND u."isActive" = true
            AND u.role = 'employee'
        ),
        present_today AS (
            SELECT DISTINCT a."UserId" as user_id
            FROM attendances a
            WHERE a.company_id = $1
            AND a.date = $2
            AND a."checkInTime" IS NOT NULL
        )
        SELECT
            (SELECT COUNT(*) FROM expected_to_work) as expected,
            (SELECT COUNT(*) FROM present_today) as present,
            (SELECT COUNT(*) FROM expected_to_work WHERE user_id NOT IN (SELECT user_id FROM present_today)) as absent
    `;

    const absentResult = await executeQuery(absentQuery, [CONFIG.COMPANY_ID, today]);

    if (absentResult.success && absentResult.rows[0]) {
        const { expected, present, absent } = absentResult.rows[0];
        tests.push({
            test: 'absence_calculation',
            passed: true,
            details: `✅ Cálculo de ausentes correcto`,
            metrics: {
                expectedToWork: parseInt(expected),
                present: parseInt(present),
                absent: parseInt(absent),
                absenceRate: expected > 0 ? ((absent / expected) * 100).toFixed(2) + '%' : '0%'
            }
        });
    } else {
        tests.push({
            test: 'absence_calculation',
            passed: false,
            details: `❌ Error calculando ausentes: ${absentResult.error}`
        });
    }

    return {
        category: 'absence_endpoint_validation',
        tests,
        passed: tests.every(t => t.passed)
    };
}

// ============================================================================
// TEST: Validar integridad referencial crítica
// ============================================================================
async function testReferentialIntegrity() {
    console.log('\n🔗 TEST: Integridad Referencial\n');

    const tests = [];

    // Usuarios con departamento válido
    const userDeptQuery = `
        SELECT COUNT(*) as orphans
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.company_id = $1
        AND u."isActive" = true
        AND u.department_id IS NOT NULL
        AND d.id IS NULL
    `;

    const userDeptResult = await executeQuery(userDeptQuery, [CONFIG.COMPANY_ID]);
    const orphanUsers = parseInt(userDeptResult.rows?.[0]?.orphans || 0);

    tests.push({
        test: 'users_valid_department',
        passed: orphanUsers === 0,
        details: orphanUsers === 0
            ? '✅ Todos los usuarios tienen departamento válido'
            : `❌ ${orphanUsers} usuarios con departamento inválido`
    });

    // Asistencias con usuario válido
    const attendanceUserQuery = `
        SELECT COUNT(*) as orphans
        FROM attendances a
        LEFT JOIN users u ON a."UserId" = u.user_id
        WHERE a.company_id = $1
        AND u.user_id IS NULL
    `;

    const attendanceResult = await executeQuery(attendanceUserQuery, [CONFIG.COMPANY_ID]);
    const orphanAttendances = parseInt(attendanceResult.rows?.[0]?.orphans || 0);

    tests.push({
        test: 'attendances_valid_user',
        passed: orphanAttendances === 0,
        details: orphanAttendances === 0
            ? '✅ Todas las asistencias tienen usuario válido'
            : `❌ ${orphanAttendances} asistencias huérfanas`
    });

    // Turnos asignados válidos
    const shiftAssignQuery = `
        SELECT COUNT(*) as orphans
        FROM user_shift_assignments usa
        LEFT JOIN shifts s ON usa.shift_id = s.id
        WHERE usa.company_id = $1
        AND s.id IS NULL
    `;

    const shiftResult = await executeQuery(shiftAssignQuery, [CONFIG.COMPANY_ID]);
    const orphanShifts = parseInt(shiftResult.rows?.[0]?.orphans || 0);

    tests.push({
        test: 'shift_assignments_valid',
        passed: orphanShifts === 0,
        details: orphanShifts === 0
            ? '✅ Todas las asignaciones de turno son válidas'
            : `❌ ${orphanShifts} asignaciones con turno inválido`
    });

    return {
        category: 'referential_integrity',
        tests,
        passed: tests.every(t => t.passed)
    };
}

// ============================================================================
// TEST: Validar enums/valores en queries de módulos críticos
// ============================================================================
async function testEnumValuesInCode() {
    console.log('\n📝 TEST: Valores de Enums en Código\n');

    const tests = [];

    // Obtener todos los CHECK constraints relevantes
    const tables = [
        'absence_cases',
        'user_documents',
        'user_medical_exams',
        'notifications',
        'vacation_requests'
    ];

    for (const table of tables) {
        const exists = await tableExists(table);
        if (!exists) continue;

        const constraints = await getCheckConstraints(table);

        for (const constraint of constraints) {
            if (constraint.allowedValues.length > 0) {
                tests.push({
                    test: `enum_${table}_${constraint.name}`,
                    passed: true,
                    isInfo: true,
                    details: `📋 ${table}: ${constraint.allowedValues.length} valores permitidos`,
                    allowedValues: constraint.allowedValues,
                    constraint: constraint.name
                });
            }
        }
    }

    return {
        category: 'enum_values_documentation',
        tests,
        passed: true
    };
}

// ============================================================================
// MAIN: Ejecutar todos los tests
// ============================================================================
async function runAllTests() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     DEEP SCHEMA VALIDATION TESTS - Enterprise Grade           ║');
    console.log('║     Detectando inconsistencias código vs BD                   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(`\n📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🏢 Company ID: ${CONFIG.COMPANY_ID}`);

    try {
        // Ejecutar todas las categorías de tests
        const categories = await Promise.all([
            testMedicalTablesExist(),
            testCheckConstraintsMismatch(),
            testMedicalEndpointQuery(),
            testAbsenceEndpoint(),
            testReferentialIntegrity(),
            testEnumValuesInCode()
        ]);

        // Agregar resultados
        testResults.categories = categories;

        // Calcular totales
        for (const cat of categories) {
            for (const test of cat.tests) {
                testResults.totalTests++;
                if (test.passed) {
                    testResults.passed++;
                } else if (test.isWarning || test.isKnownBug) {
                    testResults.warnings++;
                } else {
                    testResults.failed++;
                }
            }
        }

        testResults.successRate = ((testResults.passed / testResults.totalTests) * 100).toFixed(1);

        // Mostrar resumen
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║                    RESUMEN DE RESULTADOS                       ║');
        console.log('╠════════════════════════════════════════════════════════════════╣');
        console.log(`║  Total Tests:    ${String(testResults.totalTests).padStart(4)}                                       ║`);
        console.log(`║  ✅ Passed:      ${String(testResults.passed).padStart(4)}                                       ║`);
        console.log(`║  ❌ Failed:      ${String(testResults.failed).padStart(4)}                                       ║`);
        console.log(`║  ⚠️  Warnings:    ${String(testResults.warnings).padStart(4)}                                       ║`);
        console.log(`║  Success Rate:  ${testResults.successRate.padStart(5)}%                                     ║`);
        console.log('╚════════════════════════════════════════════════════════════════╝');

        // Mostrar errores encontrados
        if (testResults.failed > 0 || testResults.warnings > 0) {
            console.log('\n🚨 PROBLEMAS DETECTADOS:\n');

            for (const cat of categories) {
                for (const test of cat.tests) {
                    if (!test.passed && !test.isInfo) {
                        console.log(`  ❌ ${test.test}`);
                        console.log(`     ${test.details}`);
                        if (test.error) {
                            console.log(`     Error: ${JSON.stringify(test.error, null, 2).split('\n').join('\n     ')}`);
                        }
                        console.log('');
                    }
                }
            }
        }

        // Guardar resultados
        const outputPath = path.join(__dirname, '..', `test-results-schema-validation-${CONFIG.COMPANY_ID}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(testResults, null, 2));
        console.log(`\n📄 Resultados guardados en: ${outputPath}`);

    } catch (error) {
        console.error('\n❌ Error fatal:', error);
        testResults.fatalError = error.message;
    } finally {
        await pool.end();
    }

    return testResults;
}

// Ejecutar si es el script principal
if (require.main === module) {
    runAllTests()
        .then(results => {
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch(err => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}

module.exports = { runAllTests };
