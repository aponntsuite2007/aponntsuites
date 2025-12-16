/**
 * ============================================================================
 * BIOMETRIC CONSISTENCY VALIDATOR
 * ============================================================================
 *
 * Valida la consistencia de datos en la BD después de testing masivo:
 * - Detecta fichajes duplicados
 * - Verifica integridad referencial (FK)
 * - Valida coherencia temporal
 * - Detecta anomalías en datos
 *
 * @version 1.0.0
 * @date 2024-12-14
 * ============================================================================
 */

class BiometricConsistencyValidator {
    constructor(config = {}) {
        this.config = config;
        this.validationResults = {
            duplicates: [],
            fkViolations: [],
            integrityErrors: [],
            orphanRecords: [],
            temporalAnomalies: [],
            summary: {}
        };
    }

    /**
     * Ejecutar todas las validaciones
     */
    async validate(context) {
        console.log('🔍 [CONSISTENCY] Iniciando validación de consistencia...');

        const { executionId, companyId, testUsers, results } = context;

        try {
            // 1. Verificar duplicados en attendance
            await this.checkDuplicateAttendance(companyId);

            // 2. Verificar integridad referencial
            await this.checkReferentialIntegrity(companyId);

            // 3. Verificar coherencia temporal
            await this.checkTemporalCoherence(companyId);

            // 4. Verificar registros huérfanos
            await this.checkOrphanRecords(companyId);

            // 5. Verificar anomalías en datos
            await this.checkDataAnomalies(companyId);

            // 6. Validar contra resultados esperados
            await this.validateAgainstExpected(results);

            // Generar resumen
            this.validationResults.summary = this.generateSummary();

            console.log('✅ [CONSISTENCY] Validación completada');

            return this.validationResults;

        } catch (error) {
            console.error(`❌ [CONSISTENCY] Error en validación: ${error.message}`);
            return {
                error: error.message,
                ...this.validationResults
            };
        }
    }

    /**
     * Verificar fichajes duplicados
     */
    async checkDuplicateAttendance(companyId) {
        console.log('🔍 [CONSISTENCY] Verificando fichajes duplicados...');

        try {
            const { sequelize } = require('../../config/database');

            // Buscar fichajes del mismo usuario en un rango de 5 minutos
            const [duplicates] = await sequelize.query(`
                SELECT
                    a1.id as id1,
                    a2.id as id2,
                    a1."UserId" as user_id,
                    a1."checkInTime" as check_in1,
                    a2."checkInTime" as check_in2,
                    EXTRACT(EPOCH FROM (a2."checkInTime" - a1."checkInTime"))/60 as minutes_diff
                FROM attendances a1
                JOIN attendances a2 ON a1."UserId" = a2."UserId"
                    AND a1.id < a2.id
                WHERE a1.company_id = :companyId
                    AND ABS(EXTRACT(EPOCH FROM (a2."checkInTime" - a1."checkInTime"))) < 300 -- 5 minutos
                    AND a1."checkInTime" > NOW() - INTERVAL '24 hours'
                ORDER BY a1."UserId", a1."checkInTime"
                LIMIT 100
            `, {
                replacements: { companyId }
            });

            this.validationResults.duplicates = duplicates.map(d => ({
                userId: d.user_id,
                attendance1: { id: d.id1, time: d.check_in1 },
                attendance2: { id: d.id2, time: d.check_in2 },
                minutesDiff: parseFloat(d.minutes_diff).toFixed(2),
                severity: parseFloat(d.minutes_diff) < 1 ? 'HIGH' : 'MEDIUM'
            }));

            console.log(`   - ${this.validationResults.duplicates.length} duplicados encontrados`);

        } catch (error) {
            console.log(`⚠️ [CONSISTENCY] Error verificando duplicados: ${error.message}`);
        }
    }

    /**
     * Verificar integridad referencial
     */
    async checkReferentialIntegrity(companyId) {
        console.log('🔍 [CONSISTENCY] Verificando integridad referencial...');

        try {
            const { sequelize } = require('../../config/database');

            // Verificar que todos los UserId en attendances existan en users
            const [orphanAttendance] = await sequelize.query(`
                SELECT a.id, a."UserId", a."checkInTime"
                FROM attendances a
                LEFT JOIN users u ON a."UserId" = u.user_id
                WHERE a.company_id = :companyId
                    AND u.user_id IS NULL
                    AND a."checkInTime" > NOW() - INTERVAL '24 hours'
                LIMIT 50
            `, {
                replacements: { companyId }
            });

            if (orphanAttendance.length > 0) {
                this.validationResults.fkViolations.push({
                    type: 'attendance_user_fk',
                    description: 'Fichajes con user_id inexistente',
                    count: orphanAttendance.length,
                    samples: orphanAttendance.slice(0, 5)
                });
            }

            // Verificar que todos los company_id sean válidos
            const [invalidCompany] = await sequelize.query(`
                SELECT a.id, a.company_id
                FROM attendances a
                LEFT JOIN companies c ON a.company_id = c.company_id
                WHERE c.company_id IS NULL
                    AND a."checkInTime" > NOW() - INTERVAL '24 hours'
                LIMIT 50
            `, {
                replacements: {}
            });

            if (invalidCompany.length > 0) {
                this.validationResults.fkViolations.push({
                    type: 'attendance_company_fk',
                    description: 'Fichajes con company_id inexistente',
                    count: invalidCompany.length,
                    samples: invalidCompany.slice(0, 5)
                });
            }

            console.log(`   - ${this.validationResults.fkViolations.length} violaciones FK encontradas`);

        } catch (error) {
            console.log(`⚠️ [CONSISTENCY] Error verificando integridad: ${error.message}`);
        }
    }

    /**
     * Verificar coherencia temporal
     */
    async checkTemporalCoherence(companyId) {
        console.log('🔍 [CONSISTENCY] Verificando coherencia temporal...');

        try {
            const { sequelize } = require('../../config/database');

            // Verificar fichajes con checkOutTime antes de checkInTime
            const [invalidCheckout] = await sequelize.query(`
                SELECT id, "UserId", "checkInTime", "checkOutTime"
                FROM attendances
                WHERE company_id = :companyId
                    AND "checkOutTime" IS NOT NULL
                    AND "checkOutTime" < "checkInTime"
                    AND "checkInTime" > NOW() - INTERVAL '24 hours'
                LIMIT 50
            `, {
                replacements: { companyId }
            });

            if (invalidCheckout.length > 0) {
                this.validationResults.temporalAnomalies.push({
                    type: 'checkout_before_checkin',
                    description: 'Fichajes con salida antes de entrada',
                    count: invalidCheckout.length,
                    samples: invalidCheckout.slice(0, 5)
                });
            }

            // Verificar fichajes en el futuro
            const [futureAttendance] = await sequelize.query(`
                SELECT id, "UserId", "checkInTime"
                FROM attendances
                WHERE company_id = :companyId
                    AND "checkInTime" > NOW() + INTERVAL '1 minute'
                LIMIT 50
            `, {
                replacements: { companyId }
            });

            if (futureAttendance.length > 0) {
                this.validationResults.temporalAnomalies.push({
                    type: 'future_attendance',
                    description: 'Fichajes con fecha futura',
                    count: futureAttendance.length,
                    samples: futureAttendance.slice(0, 5)
                });
            }

            // Verificar jornadas excesivamente largas (>16 horas)
            const [longShifts] = await sequelize.query(`
                SELECT id, "UserId", "checkInTime", "checkOutTime",
                       EXTRACT(EPOCH FROM ("checkOutTime" - "checkInTime"))/3600 as hours
                FROM attendances
                WHERE company_id = :companyId
                    AND "checkOutTime" IS NOT NULL
                    AND EXTRACT(EPOCH FROM ("checkOutTime" - "checkInTime"))/3600 > 16
                    AND "checkInTime" > NOW() - INTERVAL '24 hours'
                LIMIT 50
            `, {
                replacements: { companyId }
            });

            if (longShifts.length > 0) {
                this.validationResults.temporalAnomalies.push({
                    type: 'excessive_shift_duration',
                    description: 'Jornadas de más de 16 horas',
                    count: longShifts.length,
                    samples: longShifts.slice(0, 5).map(s => ({
                        ...s,
                        hours: parseFloat(s.hours).toFixed(2)
                    }))
                });
            }

            console.log(`   - ${this.validationResults.temporalAnomalies.length} anomalías temporales encontradas`);

        } catch (error) {
            console.log(`⚠️ [CONSISTENCY] Error verificando coherencia temporal: ${error.message}`);
        }
    }

    /**
     * Verificar registros huérfanos
     */
    async checkOrphanRecords(companyId) {
        console.log('🔍 [CONSISTENCY] Verificando registros huérfanos...');

        try {
            const { sequelize } = require('../../config/database');

            // Buscar templates biométricos de usuarios inexistentes
            const tablesToCheck = [
                { table: 'biometric_templates', userColumn: 'user_id' },
                { table: 'facial_biometric_data', userColumn: 'user_id' }
            ];

            for (const { table, userColumn } of tablesToCheck) {
                try {
                    const [orphans] = await sequelize.query(`
                        SELECT bt.id, bt.${userColumn}
                        FROM ${table} bt
                        LEFT JOIN users u ON bt.${userColumn} = u.id
                        WHERE u.id IS NULL
                        LIMIT 50
                    `);

                    if (orphans.length > 0) {
                        this.validationResults.orphanRecords.push({
                            table: table,
                            description: `Templates biométricos de usuarios eliminados`,
                            count: orphans.length,
                            samples: orphans.slice(0, 5)
                        });
                    }
                } catch (e) {
                    // Tabla puede no existir
                }
            }

            console.log(`   - ${this.validationResults.orphanRecords.length} tipos de registros huérfanos encontrados`);

        } catch (error) {
            console.log(`⚠️ [CONSISTENCY] Error verificando huérfanos: ${error.message}`);
        }
    }

    /**
     * Verificar anomalías en datos
     */
    async checkDataAnomalies(companyId) {
        console.log('🔍 [CONSISTENCY] Verificando anomalías en datos...');

        try {
            const { sequelize } = require('../../config/database');

            // Verificar campos NULL que no deberían serlo
            const [nullCheckIn] = await sequelize.query(`
                SELECT COUNT(*) as count
                FROM attendances
                WHERE company_id = :companyId
                    AND "checkInTime" IS NULL
            `, {
                replacements: { companyId }
            });

            if (parseInt(nullCheckIn[0].count) > 0) {
                this.validationResults.integrityErrors.push({
                    type: 'null_check_in',
                    description: 'Fichajes sin hora de entrada',
                    count: parseInt(nullCheckIn[0].count)
                });
            }

            // Verificar UserId NULL
            const [nullUserId] = await sequelize.query(`
                SELECT COUNT(*) as count
                FROM attendances
                WHERE company_id = :companyId
                    AND "UserId" IS NULL
            `, {
                replacements: { companyId }
            });

            if (parseInt(nullUserId[0].count) > 0) {
                this.validationResults.integrityErrors.push({
                    type: 'null_user_id',
                    description: 'Fichajes sin usuario asociado',
                    count: parseInt(nullUserId[0].count)
                });
            }

            console.log(`   - ${this.validationResults.integrityErrors.length} errores de integridad encontrados`);

        } catch (error) {
            console.log(`⚠️ [CONSISTENCY] Error verificando anomalías: ${error.message}`);
        }
    }

    /**
     * Validar contra resultados esperados del test
     */
    async validateAgainstExpected(results) {
        console.log('🔍 [CONSISTENCY] Validando contra resultados esperados...');

        if (!results || !Array.isArray(results)) {
            console.log('⚠️ [CONSISTENCY] No hay resultados para validar');
            return;
        }

        const expectedSuccesses = results.filter(r => r.passed && r.scenarioType === 'HAPPY_PATH').length;
        const expectedFailures = results.filter(r => !r.passed).length;

        // Estas métricas se pueden comparar contra los registros reales en BD
        this.validationResults.expectedVsActual = {
            expectedSuccessfulClockIns: expectedSuccesses,
            expectedRejections: expectedFailures,
            totalTestScenarios: results.length
        };
    }

    /**
     * Generar resumen de validación
     */
    generateSummary() {
        const totalIssues =
            this.validationResults.duplicates.length +
            this.validationResults.fkViolations.length +
            this.validationResults.integrityErrors.length +
            this.validationResults.orphanRecords.length +
            this.validationResults.temporalAnomalies.length;

        const severity = totalIssues === 0 ? 'OK' :
                        totalIssues < 5 ? 'LOW' :
                        totalIssues < 20 ? 'MEDIUM' : 'HIGH';

        return {
            totalIssues: totalIssues,
            severity: severity,
            duplicates: this.validationResults.duplicates.length,
            fkViolations: this.validationResults.fkViolations.reduce((sum, v) => sum + v.count, 0),
            integrityErrors: this.validationResults.integrityErrors.reduce((sum, e) => sum + e.count, 0),
            orphanRecords: this.validationResults.orphanRecords.reduce((sum, o) => sum + o.count, 0),
            temporalAnomalies: this.validationResults.temporalAnomalies.reduce((sum, a) => sum + a.count, 0),
            passedValidation: severity === 'OK' || severity === 'LOW'
        };
    }

    /**
     * Obtener recomendaciones basadas en resultados
     */
    getRecommendations() {
        const recommendations = [];

        if (this.validationResults.duplicates.length > 0) {
            recommendations.push({
                issue: 'Fichajes duplicados detectados',
                severity: 'HIGH',
                recommendation: 'Implementar validación de gap mínimo (5 min) entre fichajes del mismo usuario',
                affectedCount: this.validationResults.duplicates.length
            });
        }

        if (this.validationResults.fkViolations.length > 0) {
            recommendations.push({
                issue: 'Violaciones de integridad referencial',
                severity: 'HIGH',
                recommendation: 'Agregar constraints FK en base de datos y validación en capa de aplicación',
                affectedCount: this.validationResults.fkViolations.reduce((sum, v) => sum + v.count, 0)
            });
        }

        if (this.validationResults.temporalAnomalies.length > 0) {
            recommendations.push({
                issue: 'Anomalías temporales en fichajes',
                severity: 'MEDIUM',
                recommendation: 'Validar coherencia de timestamps antes de insertar y agregar checks en BD',
                affectedCount: this.validationResults.temporalAnomalies.reduce((sum, a) => sum + a.count, 0)
            });
        }

        return recommendations;
    }

    /**
     * Exportar resultados a JSON
     */
    exportToJSON() {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            results: this.validationResults,
            recommendations: this.getRecommendations()
        }, null, 2);
    }
}

module.exports = BiometricConsistencyValidator;
