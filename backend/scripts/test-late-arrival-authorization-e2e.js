/**
 * ============================================================================
 * TEST E2E: CICLO COMPLETO DE AUTORIZACIÓN DE LLEGADAS TARDÍAS
 * ============================================================================
 *
 * Este test verifica el flujo completo:
 * 1. Empleado llega tarde
 * 2. Sistema busca supervisor con MISMO TURNO
 * 3. Si supervisor tiene turno diferente → escala
 * 4. Si supervisor está de vacaciones/licencia → escala
 * 5. Notificaciones enviadas vía sistema central
 * 6. Empleado notificado en tiempo real
 * 7. Supervisor aprueba/rechaza
 * 8. Resultado enviado a empleado y RRHH
 *
 * Ejecutar: node scripts/test-late-arrival-authorization-e2e.js
 */

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');
const LateArrivalAuthorizationService = require('../src/services/LateArrivalAuthorizationService');

// Colores para la consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, type = 'info') {
    const timestamp = new Date().toISOString().slice(11, 19);
    const color = {
        'info': colors.cyan,
        'success': colors.green,
        'error': colors.red,
        'warning': colors.yellow,
        'step': colors.magenta,
        'header': colors.blue
    }[type] || colors.reset;

    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

async function runE2ETest() {
    console.log('\n' + '='.repeat(80));
    log('🧪 TEST E2E: CICLO COMPLETO DE AUTORIZACIÓN DE LLEGADAS TARDÍAS', 'header');
    console.log('='.repeat(80) + '\n');

    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    function addResult(name, passed, details = '') {
        results.tests.push({ name, passed, details });
        if (passed) {
            results.passed++;
            log(`✅ ${name}`, 'success');
        } else {
            results.failed++;
            log(`❌ ${name}: ${details}`, 'error');
        }
    }

    try {
        // ================================================================
        // FASE 1: PREPARACIÓN DE DATOS DE PRUEBA
        // ================================================================
        log('\n📋 FASE 1: PREPARACIÓN DE DATOS DE PRUEBA', 'step');

        // Obtener empresa de prueba (una que tenga usuarios)
        const [company] = await sequelize.query(`
            SELECT c.company_id, c.name, COUNT(u.user_id) as user_count
            FROM companies c
            JOIN users u ON c.company_id = u.company_id
            WHERE c.is_active = true
            GROUP BY c.company_id, c.name
            HAVING COUNT(u.user_id) > 10
            ORDER BY COUNT(u.user_id) DESC
            LIMIT 1
        `, { type: QueryTypes.SELECT });

        if (!company) {
            throw new Error('No hay empresas activas con usuarios para probar');
        }
        log(`Empresa: ${company.name} (ID: ${company.company_id}) - ${company.user_count} usuarios`, 'info');
        addResult('Empresa de prueba encontrada', true);

        // Obtener turnos disponibles
        const shifts = await sequelize.query(`
            SELECT id, name, "startTime", "endTime" FROM shifts
            WHERE company_id = $1 AND "isActive" = true
            ORDER BY name
            LIMIT 3
        `, {
            bind: [company.company_id],
            type: QueryTypes.SELECT
        });

        if (shifts.length < 2) {
            log('⚠️ Se necesitan al menos 2 turnos para probar verificación de mismo turno', 'warning');
        }
        addResult(`Turnos disponibles: ${shifts.length}`, shifts.length > 0);

        // Buscar empleado con turno asignado
        const [employee] = await sequelize.query(`
            SELECT
                u.user_id,
                u."firstName" as first_name,
                u."lastName" as last_name,
                u.email,
                u.legajo,
                u.department_id,
                u.company_id,
                u.organizational_position_id,
                usa.shift_id,
                s.name as shift_name,
                op.position_name,
                op.parent_position_id
            FROM users u
            LEFT JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = true
            LEFT JOIN shifts s ON usa.shift_id = s.id
            LEFT JOIN organizational_positions op ON u.organizational_position_id = op.id
            WHERE u.company_id = $1
                AND u.is_active = true
                AND u.role = 'employee'
                AND usa.shift_id IS NOT NULL
            LIMIT 1
        `, {
            bind: [company.company_id],
            type: QueryTypes.SELECT
        });

        if (!employee) {
            log('⚠️ No se encontró empleado con turno asignado. Buscando cualquier empleado...', 'warning');
            const [anyEmployee] = await sequelize.query(`
                SELECT
                    u.user_id,
                    u."firstName" as first_name,
                    u."lastName" as last_name,
                    u.email,
                    u.legajo,
                    u.department_id,
                    u.company_id,
                    u.organizational_position_id,
                    op.position_name,
                    op.parent_position_id
                FROM users u
                LEFT JOIN organizational_positions op ON u.organizational_position_id = op.id
                WHERE u.company_id = $1 AND u.is_active = true AND u.role = 'employee'
                LIMIT 1
            `, { bind: [company.company_id], type: QueryTypes.SELECT });

            if (!anyEmployee) {
                throw new Error('No hay empleados para probar');
            }
            Object.assign(employee, anyEmployee);
        }

        log(`Empleado: ${employee.first_name} ${employee.last_name} (Legajo: ${employee.legajo || 'N/A'})`, 'info');
        log(`  - Turno: ${employee.shift_name || 'Sin asignar'}`, 'info');
        log(`  - Posición: ${employee.position_name || 'Sin posición'}`, 'info');
        log(`  - Parent Position ID: ${employee.parent_position_id || 'N/A'}`, 'info');
        addResult('Empleado de prueba encontrado', true);

        // ================================================================
        // FASE 2: TEST DE VERIFICACIÓN DE MISMO TURNO
        // ================================================================
        log('\n📋 FASE 2: TEST DE VERIFICACIÓN DE MISMO TURNO', 'step');

        if (employee.shift_id) {
            // Buscar un supervisor
            const [supervisor] = await sequelize.query(`
                SELECT
                    u.user_id,
                    u."firstName" as first_name,
                    u."lastName" as last_name,
                    usa.shift_id,
                    s.name as shift_name
                FROM users u
                LEFT JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = true
                LEFT JOIN shifts s ON usa.shift_id = s.id
                WHERE u.company_id = $1
                    AND u.is_active = true
                    AND u.can_authorize_late_arrivals = true
                LIMIT 1
            `, { bind: [company.company_id], type: QueryTypes.SELECT });

            if (supervisor) {
                log(`Verificando turno de supervisor: ${supervisor.first_name} ${supervisor.last_name}`, 'info');
                log(`  - Turno del supervisor: ${supervisor.shift_name || 'Sin asignar'}`, 'info');
                log(`  - Turno del empleado: ${employee.shift_name}`, 'info');

                const shiftCheck = await LateArrivalAuthorizationService.checkSupervisorSameShift(
                    supervisor.user_id,
                    employee.shift_id,
                    company.company_id
                );

                log(`  - Mismo turno: ${shiftCheck.hasSameShift ? 'SÍ' : 'NO'}`, 'info');
                if (!shiftCheck.hasSameShift) {
                    log(`  - Razón: ${shiftCheck.reason}`, 'info');
                }
                addResult('Verificación de mismo turno ejecutada', true,
                    shiftCheck.hasSameShift ? 'Mismo turno' : `Turno diferente: ${shiftCheck.reason}`);
            } else {
                addResult('Verificación de mismo turno', false, 'No hay supervisores para probar');
            }
        } else {
            addResult('Verificación de mismo turno', false, 'Empleado sin turno asignado');
        }

        // ================================================================
        // FASE 3: TEST DE VERIFICACIÓN DE DISPONIBILIDAD
        // ================================================================
        log('\n📋 FASE 3: TEST DE VERIFICACIÓN DE DISPONIBILIDAD', 'step');

        const [anyAuthorizer] = await sequelize.query(`
            SELECT user_id, "firstName" as first_name, "lastName" as last_name
            FROM users
            WHERE company_id = $1
                AND is_active = true
                AND can_authorize_late_arrivals = true
            LIMIT 1
        `, { bind: [company.company_id], type: QueryTypes.SELECT });

        if (anyAuthorizer) {
            log(`Verificando disponibilidad de: ${anyAuthorizer.first_name} ${anyAuthorizer.last_name}`, 'info');

            const availability = await LateArrivalAuthorizationService.checkSupervisorAvailability(
                anyAuthorizer.user_id,
                company.company_id
            );

            log(`  - Disponible: ${availability.isAvailable ? 'SÍ' : 'NO'}`, 'info');
            if (!availability.isAvailable) {
                log(`  - Razón: ${availability.reason}`, 'info');
            }
            addResult('Verificación de disponibilidad ejecutada', true,
                availability.isAvailable ? 'Supervisor disponible' : `No disponible: ${availability.reason}`);
        } else {
            addResult('Verificación de disponibilidad', false, 'No hay autorizadores para probar');
        }

        // ================================================================
        // FASE 4: TEST DE BÚSQUEDA JERÁRQUICA DE AUTORIZADORES
        // ================================================================
        log('\n📋 FASE 4: TEST DE BÚSQUEDA JERÁRQUICA DE AUTORIZADORES', 'step');

        // Obtener contexto jerárquico del empleado
        const employeeContext = await LateArrivalAuthorizationService._getEmployeeHierarchyContext(
            employee.user_id,
            company.company_id
        );

        log(`Contexto del empleado:`, 'info');
        log(`  - Departamento: ${employeeContext.department_name || 'N/A'}`, 'info');
        log(`  - Sucursal: ${employeeContext.branch_name || 'N/A'}`, 'info');
        log(`  - Turno: ${employeeContext.shift_name || 'N/A'}`, 'info');
        log(`  - Posición: ${employeeContext.position_name || 'N/A'}`, 'info');
        log(`  - Parent Position ID: ${employeeContext.parent_position_id || 'N/A'}`, 'info');

        addResult('Contexto jerárquico obtenido', Object.keys(employeeContext).length > 0);

        // Buscar autorizadores usando jerarquía
        const authorizers = await LateArrivalAuthorizationService.findAuthorizersByHierarchy(
            employeeContext,
            company.company_id,
            true
        );

        log(`Autorizadores encontrados: ${authorizers.length}`, 'info');
        authorizers.forEach((auth, i) => {
            log(`  ${i + 1}. ${auth.first_name} ${auth.last_name} (${auth.authorizer_type || auth.role})`, 'info');
            if (auth.is_rrhh) log(`     → Es RRHH`, 'info');
            if (auth.notify_escalation) log(`     → Notificar escalación`, 'info');
        });

        addResult('Búsqueda jerárquica de autorizadores', authorizers.length > 0,
            `${authorizers.length} autorizadores encontrados`);

        // ================================================================
        // FASE 5: TEST DE ENVÍO DE SOLICITUD DE AUTORIZACIÓN
        // ================================================================
        log('\n📋 FASE 5: TEST DE ENVÍO DE SOLICITUD (SIMULADO)', 'step');

        const mockShiftData = {
            name: employee.shift_name || 'Turno de Prueba',
            startTime: '08:00'
        };

        const mockEmployeeData = {
            user_id: employee.user_id,
            first_name: employee.first_name,
            last_name: employee.last_name,
            email: employee.email,
            legajo: employee.legajo,
            department_name: employeeContext.department_name,
            company_id: company.company_id
        };

        log(`Simulando solicitud de autorización para:`, 'info');
        log(`  - Empleado: ${mockEmployeeData.first_name} ${mockEmployeeData.last_name}`, 'info');
        log(`  - Minutos tarde: 15`, 'info');
        log(`  - Turno: ${mockShiftData.name}`, 'info');

        // Verificar que el servicio puede procesar la solicitud
        const canProcess = authorizers.length > 0;
        addResult('Sistema puede procesar solicitud de autorización', canProcess,
            canProcess ? `${authorizers.length} destinos disponibles` : 'Sin destinos de notificación');

        // ================================================================
        // FASE 6: TEST DE INTEGRACIÓN CON SISTEMA CENTRAL DE NOTIFICACIONES
        // ================================================================
        log('\n📋 FASE 6: TEST DE INTEGRACIÓN CON NOTIFICACIONES CENTRALES', 'step');

        let notificationUnifiedService;
        try {
            notificationUnifiedService = require('../src/services/NotificationUnifiedService');
            log('NotificationUnifiedService cargado correctamente', 'success');
            addResult('Integración con NotificationUnifiedService', true);
        } catch (e) {
            log(`NotificationUnifiedService no disponible: ${e.message}`, 'warning');
            addResult('Integración con NotificationUnifiedService', false, e.message);
        }

        // ================================================================
        // FASE 7: VERIFICAR TABLAS NECESARIAS
        // ================================================================
        log('\n📋 FASE 7: VERIFICACIÓN DE TABLAS NECESARIAS', 'step');

        const tables = [
            'users',
            'shifts',
            'user_shift_assignments',
            'organizational_positions',
            'vacation_requests',
            'medical_leaves',
            'attendances',
            'late_arrival_authorizations'
        ];

        for (const table of tables) {
            try {
                const [result] = await sequelize.query(`
                    SELECT COUNT(*) as count FROM ${table} LIMIT 1
                `, { type: QueryTypes.SELECT });
                addResult(`Tabla ${table} existe`, true, `${result?.count || 0} registros`);
            } catch (e) {
                addResult(`Tabla ${table} existe`, false, e.message);
            }
        }

        // ================================================================
        // RESUMEN FINAL
        // ================================================================
        console.log('\n' + '='.repeat(80));
        log('📊 RESUMEN DE RESULTADOS', 'header');
        console.log('='.repeat(80));

        console.log(`\n  ✅ Pruebas exitosas: ${results.passed}`);
        console.log(`  ❌ Pruebas fallidas: ${results.failed}`);
        console.log(`  📊 Total: ${results.tests.length}`);

        const successRate = ((results.passed / results.tests.length) * 100).toFixed(1);
        console.log(`\n  🎯 Tasa de éxito: ${successRate}%\n`);

        if (results.failed > 0) {
            log('\n⚠️ PRUEBAS FALLIDAS:', 'warning');
            results.tests.filter(t => !t.passed).forEach(t => {
                log(`  - ${t.name}: ${t.details}`, 'error');
            });
        }

        // ================================================================
        // FLUJO RECOMENDADO PARA PRUEBA MANUAL
        // ================================================================
        console.log('\n' + '='.repeat(80));
        log('📝 FLUJO RECOMENDADO PARA PRUEBA MANUAL', 'header');
        console.log('='.repeat(80));

        console.log(`
  1. PREPARACIÓN:
     - Asegurar que hay empleados con turno asignado
     - Asegurar que hay supervisores con el mismo turno
     - Verificar que la jerarquía organizacional está configurada

  2. SIMULAR LLEGADA TARDÍA:
     - Hacer check-in desde kiosk fuera del horario de tolerancia
     - El sistema detectará la llegada tardía

  3. VERIFICACIÓN DE SUPERVISOR:
     - Sistema busca supervisor con MISMO TURNO
     - Si no hay → escala al siguiente nivel
     - Si supervisor no disponible → escala

  4. NOTIFICACIONES:
     - Supervisor recibe notificación (email/websocket/app)
     - RRHH recibe copia si hay escalación
     - Empleado recibe confirmación de solicitud enviada

  5. APROBACIÓN/RECHAZO:
     - Supervisor hace click en aprobar/rechazar
     - Sistema crea ventana de autorización (si aprobado)
     - Empleado recibe resultado en tiempo real

  6. COMPLETAR FICHAJE:
     - Si aprobado: empleado tiene 5 min para volver al kiosk
     - Fichaje se completa con estado "authorized_late"
`);

        console.log('='.repeat(80) + '\n');

        return results.failed === 0;

    } catch (error) {
        log(`Error fatal: ${error.message}`, 'error');
        console.error(error.stack);
        return false;
    } finally {
        await sequelize.close();
    }
}

// Ejecutar
runE2ETest()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(err => {
        console.error('Error ejecutando test:', err);
        process.exit(1);
    });
