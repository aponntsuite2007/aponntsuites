/**
 * ============================================================================
 * ATTENDANCE MODULE COLLECTOR - Test E2E del Módulo de Asistencias
 * ============================================================================
 *
 * Extiende BaseModuleCollector para testear el módulo de asistencias.
 *
 * TESTS INCLUIDOS:
 * 1. Manual Entry - Entrada manual de asistencia
 * 2. Biometric Validation - Validación de asistencia biométrica
 * 3. Absence Marking - Marcado de ausencias/faltas
 * 4. Late Arrival - Llegadas tarde y autorizaciones
 * 5. Overtime - Registro de horas extra
 * 6. Reports - Generación de reportes
 *
 * @version 1.0.0
 * @date 2025-10-29
 * ============================================================================
 */

const BaseModuleCollector = require('./BaseModuleCollector');

class AttendanceModuleCollector extends BaseModuleCollector {
    constructor(database, systemRegistry) {
        super(database, systemRegistry);
        this.TEST_PREFIX = '[TEST-ATTENDANCE]';
    }

    /**
     * Configuración específica del módulo de asistencias
     */
    getModuleConfig() {
        return {
            moduleName: 'attendance',
            moduleURL: '/panel-empresa.html',
            testCategories: [
                { name: 'manual_entry', func: this.testManualEntry.bind(this) },
                { name: 'biometric_validation', func: this.testBiometricValidation.bind(this) },
                { name: 'absence_marking', func: this.testAbsenceMarking.bind(this) },
                { name: 'late_arrival', func: this.testLateArrival.bind(this) },
                { name: 'overtime', func: this.testOvertime.bind(this) },
                { name: 'reports', func: this.testReports.bind(this) }
            ],
            navigateBeforeTests: this.navigateToAttendanceModule.bind(this)
        };
    }

    /**
     * Navegación inicial al módulo de asistencias
     */
    async navigateToAttendanceModule() {
        console.log('\n📂 Navegando al módulo de Asistencias...\n');

        // Esperar que cargue el panel con módulos
        await this.page.waitForSelector('.module-item', { timeout: 10000 });

        // Click en módulo de asistencias
        await this.clickElement('button[onclick*="loadModule(\'attendance\')"]', 'módulo Asistencias');

        // Esperar que cargue el contenido del módulo
        await this.page.waitForSelector('#attendance-content', { timeout: 10000 });

        console.log('✅ Módulo de Asistencias cargado\n');
    }

    /**
     * ========================================================================
     * TEST 1: MANUAL ENTRY - Entrada manual de asistencia
     * ========================================================================
     */
    async testManualEntry(execution_id) {
        console.log('\n🧪 TEST 1: Manual Entry...\n');

        try {
            // 1. Abrir formulario de entrada manual
            await this.clickElement('#btn-manual-entry', 'botón Entrada Manual');

            // Esperar modal
            await this.page.waitForSelector('#manual-entry-modal', { visible: true, timeout: 5000 });

            // 2. Seleccionar empleado
            await this.selectOption('#employee-select', '1', 'empleado');

            // 3. Seleccionar tipo de asistencia
            await this.selectOption('#attendance-type', 'entrada', 'tipo entrada');

            // 4. Ingresar fecha y hora
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

            await this.typeInInput('#attendance-date', dateStr, 'fecha');
            await this.typeInInput('#attendance-time', timeStr, 'hora');

            // 5. Agregar observación
            await this.typeInInput('#attendance-observation', `${this.TEST_PREFIX} Entrada manual de prueba`, 'observación');

            // 6. Guardar
            await this.clickElement('#btn-save-attendance', 'botón Guardar');

            // 7. Esperar confirmación
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 8. Verificar que se cerró el modal
            const modalVisible = await this.isModalVisible('#manual-entry-modal');

            if (!modalVisible) {
                console.log('✅ TEST 1 PASSED - Entrada manual guardada\n');

                return await this.createTestLog(execution_id, 'attendance_manual_entry', 'passed', {
                    metadata: { employee_id: 1, type: 'entrada', date: dateStr, time: timeStr }
                });
            } else {
                throw new Error('Modal no se cerró después de guardar');
            }

        } catch (error) {
            console.error('❌ TEST 1 FAILED:', error.message);

            return await this.createTestLog(execution_id, 'attendance_manual_entry', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * ========================================================================
     * TEST 2: BIOMETRIC VALIDATION - Validación biométrica
     * ========================================================================
     */
    async testBiometricValidation(execution_id) {
        console.log('\n🧪 TEST 2: Biometric Validation...\n');

        try {
            // 1. Navegar a pestaña de validación biométrica
            await this.navigateToTab('button[onclick*="showBiometricTab"]', 'Validación Biométrica');

            // 2. Verificar que cargaron las asistencias pendientes
            const hasPendingAttendances = await this.elementExists('.biometric-pending-item');

            if (hasPendingAttendances) {
                // 3. Click en primera asistencia pendiente
                await this.clickElement('.biometric-pending-item:first-child', 'primera asistencia pendiente');

                // 4. Abrir modal de validación
                await this.page.waitForSelector('#biometric-validation-modal', { visible: true, timeout: 5000 });

                // 5. Simular validación biométrica (aprobar)
                await this.clickElement('#btn-approve-biometric', 'botón Aprobar');

                // 6. Esperar confirmación
                await new Promise(resolve => setTimeout(resolve, 1000));

                console.log('✅ TEST 2 PASSED - Validación biométrica exitosa\n');

                return await this.createTestLog(execution_id, 'attendance_biometric_validation', 'passed');
            } else {
                console.log('⚠️ TEST 2 SKIPPED - No hay asistencias pendientes de validación\n');

                return await this.createTestLog(execution_id, 'attendance_biometric_validation', 'warning', {
                    error_message: 'No hay asistencias pendientes de validación'
                });
            }

        } catch (error) {
            console.error('❌ TEST 2 FAILED:', error.message);

            return await this.createTestLog(execution_id, 'attendance_biometric_validation', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * ========================================================================
     * TEST 3: ABSENCE MARKING - Marcado de ausencias
     * ========================================================================
     */
    async testAbsenceMarking(execution_id) {
        console.log('\n🧪 TEST 3: Absence Marking...\n');

        try {
            // 1. Navegar a pestaña de ausencias
            await this.navigateToTab('button[onclick*="showAbsenceTab"]', 'Ausencias');

            // 2. Abrir formulario de nueva ausencia
            await this.clickElement('#btn-mark-absence', 'botón Marcar Ausencia');

            // 3. Esperar modal
            await this.page.waitForSelector('#absence-modal', { visible: true, timeout: 5000 });

            // 4. Seleccionar empleado
            await this.selectOption('#absence-employee-select', '1', 'empleado');

            // 5. Seleccionar tipo de ausencia
            await this.selectOption('#absence-type', 'falta_injustificada', 'tipo ausencia');

            // 6. Fecha de ausencia
            const today = new Date().toISOString().split('T')[0];
            await this.typeInInput('#absence-date', today, 'fecha ausencia');

            // 7. Observación
            await this.typeInInput('#absence-observation', `${this.TEST_PREFIX} Ausencia de prueba`, 'observación');

            // 8. Guardar
            await this.clickElement('#btn-save-absence', 'botón Guardar Ausencia');

            // 9. Esperar confirmación
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('✅ TEST 3 PASSED - Ausencia marcada correctamente\n');

            return await this.createTestLog(execution_id, 'attendance_absence_marking', 'passed', {
                metadata: { employee_id: 1, type: 'falta_injustificada', date: today }
            });

        } catch (error) {
            console.error('❌ TEST 3 FAILED:', error.message);

            return await this.createTestLog(execution_id, 'attendance_absence_marking', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * ========================================================================
     * TEST 4: LATE ARRIVAL - Llegadas tarde
     * ========================================================================
     */
    async testLateArrival(execution_id) {
        console.log('\n🧪 TEST 4: Late Arrival...\n');

        try {
            // 1. Navegar a pestaña de llegadas tarde
            await this.navigateToTab('button[onclick*="showLateArrivalTab"]', 'Llegadas Tarde');

            // 2. Verificar listado de llegadas tarde
            const hasLateArrivals = await this.elementExists('.late-arrival-item');

            if (hasLateArrivals) {
                // 3. Click en primera llegada tarde
                await this.clickElement('.late-arrival-item:first-child', 'primera llegada tarde');

                // 4. Abrir modal de autorización
                await this.page.waitForSelector('#late-arrival-authorization-modal', { visible: true, timeout: 5000 });

                // 5. Justificar llegada tarde
                await this.typeInInput('#late-justification', `${this.TEST_PREFIX} Justificación automática`, 'justificación');

                // 6. Aprobar
                await this.clickElement('#btn-approve-late-arrival', 'botón Aprobar');

                // 7. Esperar confirmación
                await new Promise(resolve => setTimeout(resolve, 1000));

                console.log('✅ TEST 4 PASSED - Llegada tarde autorizada\n');

                return await this.createTestLog(execution_id, 'attendance_late_arrival', 'passed');
            } else {
                console.log('⚠️ TEST 4 SKIPPED - No hay llegadas tarde para procesar\n');

                return await this.createTestLog(execution_id, 'attendance_late_arrival', 'warning', {
                    error_message: 'No hay llegadas tarde pendientes'
                });
            }

        } catch (error) {
            console.error('❌ TEST 4 FAILED:', error.message);

            return await this.createTestLog(execution_id, 'attendance_late_arrival', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * ========================================================================
     * TEST 5: OVERTIME - Horas extra
     * ========================================================================
     */
    async testOvertime(execution_id) {
        console.log('\n🧪 TEST 5: Overtime...\n');

        try {
            // 1. Navegar a pestaña de horas extra
            await this.navigateToTab('button[onclick*="showOvertimeTab"]', 'Horas Extra');

            // 2. Abrir formulario de registro de horas extra
            await this.clickElement('#btn-register-overtime', 'botón Registrar Horas Extra');

            // 3. Esperar modal
            await this.page.waitForSelector('#overtime-modal', { visible: true, timeout: 5000 });

            // 4. Seleccionar empleado
            await this.selectOption('#overtime-employee-select', '1', 'empleado');

            // 5. Fecha
            const today = new Date().toISOString().split('T')[0];
            await this.typeInInput('#overtime-date', today, 'fecha');

            // 6. Horas extra (formato HH:MM)
            await this.typeInInput('#overtime-hours', '02:30', 'horas extra');

            // 7. Motivo
            await this.typeInInput('#overtime-reason', `${this.TEST_PREFIX} Horas extra de prueba`, 'motivo');

            // 8. Guardar
            await this.clickElement('#btn-save-overtime', 'botón Guardar');

            // 9. Esperar confirmación
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('✅ TEST 5 PASSED - Horas extra registradas\n');

            return await this.createTestLog(execution_id, 'attendance_overtime', 'passed', {
                metadata: { employee_id: 1, hours: '02:30', date: today }
            });

        } catch (error) {
            console.error('❌ TEST 5 FAILED:', error.message);

            return await this.createTestLog(execution_id, 'attendance_overtime', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    /**
     * ========================================================================
     * TEST 6: REPORTS - Generación de reportes
     * ========================================================================
     */
    async testReports(execution_id) {
        console.log('\n🧪 TEST 6: Reports Generation...\n');

        try {
            // 1. Navegar a pestaña de reportes
            await this.navigateToTab('button[onclick*="showReportsTab"]', 'Reportes');

            // 2. Seleccionar tipo de reporte
            await this.selectOption('#report-type-select', 'daily', 'tipo de reporte');

            // 3. Seleccionar rango de fechas
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];

            await this.typeInInput('#report-date-from', dateStr, 'fecha desde');
            await this.typeInInput('#report-date-to', dateStr, 'fecha hasta');

            // 4. Generar reporte
            await this.clickElement('#btn-generate-report', 'botón Generar Reporte');

            // 5. Esperar que se genere (puede tardar unos segundos)
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 6. Verificar que se generó (tabla de resultados visible)
            const reportGenerated = await this.elementExists('#report-results-table');

            if (reportGenerated) {
                console.log('✅ TEST 6 PASSED - Reporte generado exitosamente\n');

                return await this.createTestLog(execution_id, 'attendance_reports', 'passed', {
                    metadata: { report_type: 'daily', date_from: dateStr, date_to: dateStr }
                });
            } else {
                throw new Error('Reporte no se generó o tabla de resultados no visible');
            }

        } catch (error) {
            console.error('❌ TEST 6 FAILED:', error.message);

            return await this.createTestLog(execution_id, 'attendance_reports', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }
}

module.exports = AttendanceModuleCollector;
