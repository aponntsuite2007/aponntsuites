/**
 * ============================================================================
 * ORGANIZATIONAL MODULE COLLECTOR - Testing de Estructura Organizacional
 * ============================================================================
 *
 * Collector especializado para testing completo del modulo de estructura
 * organizacional. Integra:
 *
 * 1. CRUD TESTS: Create, Read, Update, Delete para cada entidad
 *    - departments, sectors, shifts, branches
 *    - labor_agreements_v2, salary_categories_v2
 *    - additional_role_types, holidays
 *
 * 2. SSOT VALIDATION: Single Source of Truth validation
 *    - Integridad referencial
 *    - Deteccion de huerfanos
 *    - Validacion de duplicados
 *    - Consistencia de propagacion
 *
 * @version 1.0.0
 * @date 2025-12-02
 * @author Claude Code + Sistema de Asistencia Biometrico
 * ============================================================================
 */

const BaseModuleCollector = require('./BaseModuleCollector');
const OrganizationalSSOTService = require('../../services/OrganizationalSSOTService');

class OrganizationalModuleCollector extends BaseModuleCollector {
    constructor(database, systemRegistry, baseURL = null) {
        super(database, systemRegistry, baseURL);
        this.ssotService = new OrganizationalSSOTService();
        this.TEST_PREFIX = '[TEST-ORG]';
    }

    /**
     * Configuracion del modulo
     */
    getModuleConfig() {
        return {
            moduleName: 'organizational',
            moduleURL: '/panel-empresa.html',
            testCategories: [
                { name: 'ssot_validation', func: this.testSSOTValidation.bind(this) },
                { name: 'crud_departments', func: this.testCrudDepartments.bind(this) },
                { name: 'crud_sectors', func: this.testCrudSectors.bind(this) },
                { name: 'crud_shifts', func: this.testCrudShifts.bind(this) },
                { name: 'crud_branches', func: this.testCrudBranches.bind(this) },
                { name: 'crud_agreements', func: this.testCrudAgreements.bind(this) },
                { name: 'crud_categories', func: this.testCrudCategories.bind(this) },
                { name: 'crud_roles', func: this.testCrudRoles.bind(this) },
                { name: 'referential_integrity', func: this.testReferentialIntegrity.bind(this) },
                { name: 'orphan_detection', func: this.testOrphanDetection.bind(this) }
            ]
        };
    }

    /**
     * ========================================================================
     * TEST 1: SSOT VALIDATION - Single Source of Truth completo
     * ========================================================================
     */
    async testSSOTValidation(execution_id) {
        console.log('\n  1. SSOT VALIDATION - Ejecutando validacion completa...');

        const startTime = Date.now();
        let testResult = {
            name: 'ssot_validation',
            status: 'pending',
            details: {}
        };

        try {
            // Ejecutar test SSOT completo usando el servicio existente
            const ssotResults = await this.ssotService.runFullCRUDTest(this.company_id);

            testResult.details = {
                totalTests: ssotResults.summary.total,
                passed: ssotResults.summary.passed,
                failed: ssotResults.summary.failed,
                warnings: ssotResults.summary.warnings,
                successRate: ((ssotResults.summary.passed / ssotResults.summary.total) * 100).toFixed(1),
                ssotViolations: ssotResults.ssotViolations.length,
                orphanedReferences: ssotResults.orphanedReferences.length,
                integrityIssues: ssotResults.integrityIssues.length
            };

            // Determinar estado basado en resultados
            if (ssotResults.summary.failed === 0) {
                testResult.status = 'pass';
                console.log(`     SSOT VALIDATION PASSED: ${ssotResults.summary.passed}/${ssotResults.summary.total} tests`);
            } else {
                testResult.status = 'fail';
                console.log(`     SSOT VALIDATION FAILED: ${ssotResults.summary.failed} tests fallidos`);
            }

            testResult.duration = Date.now() - startTime;

        } catch (error) {
            testResult.status = 'fail';
            testResult.error = error.message;
            testResult.duration = Date.now() - startTime;
            console.error(`     SSOT VALIDATION ERROR: ${error.message}`);
        }

        return this.createTestLog(execution_id, testResult);
    }

    /**
     * ========================================================================
     * TEST 2: CRUD DEPARTMENTS
     * ========================================================================
     */
    async testCrudDepartments(execution_id) {
        console.log('\n  2. CRUD DEPARTMENTS - Testing departamentos...');
        return this.runEntityCrudTest(execution_id, 'departments', {
            createData: {
                name: `${this.TEST_PREFIX} Depto Test ${Date.now()}`,
                description: 'Departamento de prueba automatica',
                is_active: true
            },
            updateData: {
                description: 'Descripcion actualizada por test'
            },
            tableName: 'departments',
            primaryKey: 'id'
        });
    }

    /**
     * ========================================================================
     * TEST 3: CRUD SECTORS
     * ========================================================================
     */
    async testCrudSectors(execution_id) {
        console.log('\n  3. CRUD SECTORS - Testing sectores...');

        // Primero obtener un department_id valido
        const deptResult = await this.database.sequelize.query(
            `SELECT id FROM departments WHERE company_id = :companyId AND is_active = true LIMIT 1`,
            { replacements: { companyId: this.company_id }, type: this.database.sequelize.QueryTypes.SELECT }
        );

        const departmentId = deptResult[0]?.id;
        if (!departmentId) {
            return this.createTestLog(execution_id, {
                name: 'crud_sectors',
                status: 'skip',
                details: { reason: 'No hay departamentos activos para asignar sector' },
                duration: 0
            });
        }

        return this.runEntityCrudTest(execution_id, 'sectors', {
            createData: {
                name: `${this.TEST_PREFIX} Sector Test ${Date.now()}`,
                code: `SEC_${Date.now()}`,
                department_id: departmentId,
                is_active: true
            },
            updateData: {
                description: 'Sector actualizado por test'
            },
            tableName: 'sectors',
            primaryKey: 'id'
        });
    }

    /**
     * ========================================================================
     * TEST 4: CRUD SHIFTS
     * ========================================================================
     */
    async testCrudShifts(execution_id) {
        console.log('\n  4. CRUD SHIFTS - Testing turnos...');
        return this.runEntityCrudTest(execution_id, 'shifts', {
            createData: {
                name: `${this.TEST_PREFIX} Turno Test ${Date.now()}`,
                startTime: '08:00',
                endTime: '16:00',
                days: [1, 2, 3, 4, 5],
                isActive: true
            },
            updateData: {
                description: 'Turno actualizado por test'
            },
            tableName: 'shifts',
            primaryKey: 'id'
        });
    }

    /**
     * ========================================================================
     * TEST 5: CRUD BRANCHES
     * ========================================================================
     */
    async testCrudBranches(execution_id) {
        console.log('\n  5. CRUD BRANCHES - Testing sucursales...');
        return this.runEntityCrudTest(execution_id, 'branches', {
            createData: {
                name: `${this.TEST_PREFIX} Branch Test ${Date.now()}`,
                code: `BR_${Date.now()}`,
                country: 'Argentina',
                isActive: true
            },
            updateData: {
                address: 'Direccion actualizada por test'
            },
            tableName: 'branches',
            primaryKey: 'id',
            generateUUID: true
        });
    }

    /**
     * ========================================================================
     * TEST 6: CRUD LABOR AGREEMENTS
     * ========================================================================
     */
    async testCrudAgreements(execution_id) {
        console.log('\n  6. CRUD AGREEMENTS - Testing convenios laborales...');
        return this.runEntityCrudTest(execution_id, 'labor_agreements_v2', {
            createData: {
                name: `${this.TEST_PREFIX} Convenio Test ${Date.now()}`,
                code: `CONV_${Date.now()}`,
                description: 'Convenio de prueba automatica',
                is_active: true
            },
            updateData: {
                description: 'Convenio actualizado por test'
            },
            tableName: 'labor_agreements_v2',
            primaryKey: 'id'
        });
    }

    /**
     * ========================================================================
     * TEST 7: CRUD SALARY CATEGORIES
     * ========================================================================
     */
    async testCrudCategories(execution_id) {
        console.log('\n  7. CRUD CATEGORIES - Testing categorias salariales...');

        // Obtener un labor_agreement_id valido
        const agreementResult = await this.database.sequelize.query(
            `SELECT id FROM labor_agreements_v2 WHERE company_id = :companyId AND is_active = true LIMIT 1`,
            { replacements: { companyId: this.company_id }, type: this.database.sequelize.QueryTypes.SELECT }
        );

        const agreementId = agreementResult[0]?.id;
        if (!agreementId) {
            return this.createTestLog(execution_id, {
                name: 'crud_categories',
                status: 'skip',
                details: { reason: 'No hay convenios activos para asignar categoria' },
                duration: 0
            });
        }

        return this.runEntityCrudTest(execution_id, 'salary_categories_v2', {
            createData: {
                name: `${this.TEST_PREFIX} Categoria Test ${Date.now()}`,
                code: `CAT_${Date.now()}`,
                labor_agreement_id: agreementId,
                base_salary: 50000,
                is_active: true
            },
            updateData: {
                base_salary: 55000
            },
            tableName: 'salary_categories_v2',
            primaryKey: 'id'
        });
    }

    /**
     * ========================================================================
     * TEST 8: CRUD ADDITIONAL ROLES
     * ========================================================================
     */
    async testCrudRoles(execution_id) {
        console.log('\n  8. CRUD ROLES - Testing roles adicionales...');
        return this.runEntityCrudTest(execution_id, 'additional_role_types', {
            createData: {
                key: `test_role_${Date.now()}`,
                name: `${this.TEST_PREFIX} Rol Test`,
                description: 'Rol de prueba automatica',
                scope: 'DEPARTMENT',
                is_active: true
            },
            updateData: {
                description: 'Rol actualizado por test'
            },
            tableName: 'additional_role_types',
            primaryKey: 'id',
            generateUUID: true
        });
    }

    /**
     * ========================================================================
     * TEST 9: REFERENTIAL INTEGRITY
     * ========================================================================
     */
    async testReferentialIntegrity(execution_id) {
        console.log('\n  9. REFERENTIAL INTEGRITY - Validando integridad referencial...');

        const startTime = Date.now();
        let testResult = {
            name: 'referential_integrity',
            status: 'pending',
            details: {}
        };

        try {
            const integrityResults = await this.ssotService.validateReferentialIntegrity(this.company_id);

            const failures = integrityResults.filter(r => !r.passed);

            testResult.details = {
                totalRules: integrityResults.length,
                passed: integrityResults.filter(r => r.passed).length,
                failed: failures.length,
                failures: failures.map(f => ({ name: f.name, error: f.error }))
            };

            testResult.status = failures.length === 0 ? 'pass' : 'fail';
            testResult.duration = Date.now() - startTime;

            console.log(`     Integridad: ${testResult.details.passed}/${testResult.details.totalRules} reglas OK`);

        } catch (error) {
            testResult.status = 'fail';
            testResult.error = error.message;
            testResult.duration = Date.now() - startTime;
        }

        return this.createTestLog(execution_id, testResult);
    }

    /**
     * ========================================================================
     * TEST 10: ORPHAN DETECTION
     * ========================================================================
     */
    async testOrphanDetection(execution_id) {
        console.log('\n  10. ORPHAN DETECTION - Detectando dependencias huerfanas...');

        const startTime = Date.now();
        let testResult = {
            name: 'orphan_detection',
            status: 'pending',
            details: {}
        };

        try {
            const orphanResults = await this.ssotService.detectOrphanedDependencies(this.company_id);

            const totalOrphans = orphanResults.reduce((sum, r) => {
                return sum + (r.details?.orphans?.length || 0);
            }, 0);

            testResult.details = {
                tablesChecked: orphanResults.length,
                totalOrphans,
                orphansByTable: orphanResults.filter(r => r.details?.orphans?.length > 0).map(r => ({
                    table: r.name,
                    count: r.details.orphans.length
                }))
            };

            testResult.status = totalOrphans === 0 ? 'pass' : 'warning';
            testResult.duration = Date.now() - startTime;

            console.log(`     Huerfanos detectados: ${totalOrphans}`);

        } catch (error) {
            testResult.status = 'fail';
            testResult.error = error.message;
            testResult.duration = Date.now() - startTime;
        }

        return this.createTestLog(execution_id, testResult);
    }

    /**
     * ========================================================================
     * HELPER: Ejecutar test CRUD generico para una entidad
     * ========================================================================
     */
    async runEntityCrudTest(execution_id, entityName, config) {
        const startTime = Date.now();
        let testResult = {
            name: `crud_${entityName}`,
            status: 'pending',
            details: {
                create: false,
                read: false,
                update: false,
                delete: false
            }
        };

        let createdId = null;

        try {
            const { createData, updateData, tableName, primaryKey, generateUUID } = config;

            // CREATE
            console.log(`     CREATE: Creando ${entityName}...`);
            const insertId = generateUUID ? 'gen_random_uuid()' : 'DEFAULT';
            const columns = ['company_id', ...Object.keys(createData)];
            const values = [this.company_id, ...Object.values(createData)];

            let insertQuery;
            if (generateUUID) {
                insertQuery = `
                    INSERT INTO ${tableName} (${primaryKey}, company_id, ${Object.keys(createData).map(k => `"${k}"`).join(', ')})
                    VALUES (gen_random_uuid(), $1, ${Object.keys(createData).map((_, i) => `$${i + 2}`).join(', ')})
                    RETURNING ${primaryKey}
                `;
            } else {
                insertQuery = `
                    INSERT INTO ${tableName} (company_id, ${Object.keys(createData).map(k => `"${k}"`).join(', ')})
                    VALUES ($1, ${Object.keys(createData).map((_, i) => `$${i + 2}`).join(', ')})
                    RETURNING ${primaryKey}
                `;
            }

            const createResult = await this.database.sequelize.query(insertQuery, {
                bind: values,
                type: this.database.sequelize.QueryTypes.INSERT
            });

            createdId = createResult[0]?.[0]?.[primaryKey] || createResult[0]?.[primaryKey];
            testResult.details.create = !!createdId;
            console.log(`       CREATE ${createdId ? 'OK' : 'FAIL'} - ID: ${createdId}`);

            if (!createdId) {
                throw new Error('CREATE failed - no ID returned');
            }

            // READ
            console.log(`     READ: Leyendo ${entityName}...`);
            const readResult = await this.database.sequelize.query(
                `SELECT * FROM ${tableName} WHERE ${primaryKey} = $1`,
                { bind: [createdId], type: this.database.sequelize.QueryTypes.SELECT }
            );
            testResult.details.read = readResult.length > 0;
            console.log(`       READ ${readResult.length > 0 ? 'OK' : 'FAIL'}`);

            // UPDATE
            console.log(`     UPDATE: Actualizando ${entityName}...`);
            const updateColumns = Object.keys(updateData).map((k, i) => `"${k}" = $${i + 2}`).join(', ');
            await this.database.sequelize.query(
                `UPDATE ${tableName} SET ${updateColumns}, updated_at = NOW() WHERE ${primaryKey} = $1`,
                { bind: [createdId, ...Object.values(updateData)], type: this.database.sequelize.QueryTypes.UPDATE }
            );
            testResult.details.update = true;
            console.log(`       UPDATE OK`);

            // DELETE
            console.log(`     DELETE: Eliminando ${entityName}...`);
            await this.database.sequelize.query(
                `DELETE FROM ${tableName} WHERE ${primaryKey} = $1`,
                { bind: [createdId], type: this.database.sequelize.QueryTypes.DELETE }
            );

            // Verificar eliminacion
            const verifyDelete = await this.database.sequelize.query(
                `SELECT * FROM ${tableName} WHERE ${primaryKey} = $1`,
                { bind: [createdId], type: this.database.sequelize.QueryTypes.SELECT }
            );
            testResult.details.delete = verifyDelete.length === 0;
            console.log(`       DELETE ${verifyDelete.length === 0 ? 'OK' : 'FAIL'}`);

            // Determinar estado final
            const allPassed = Object.values(testResult.details).every(v => v === true);
            testResult.status = allPassed ? 'pass' : 'fail';
            testResult.duration = Date.now() - startTime;

        } catch (error) {
            testResult.status = 'fail';
            testResult.error = error.message;
            testResult.duration = Date.now() - startTime;
            console.error(`       ERROR: ${error.message}`);

            // Cleanup si fallo
            if (createdId) {
                try {
                    await this.database.sequelize.query(
                        `DELETE FROM ${config.tableName} WHERE ${config.primaryKey} = $1`,
                        { bind: [createdId], type: this.database.sequelize.QueryTypes.DELETE }
                    );
                } catch (cleanupError) {
                    // Ignorar errores de cleanup
                }
            }
        }

        return this.createTestLog(execution_id, testResult);
    }

    /**
     * Helper: Crear log de test
     */
    async createTestLog(execution_id, testResult) {
        if (this.database && this.database.AuditLog) {
            try {
                return await this.database.AuditLog.create({
                    execution_id,
                    company_id: this.company_id,
                    test_type: 'e2e',
                    module_name: 'organizational',
                    test_name: testResult.name,
                    status: testResult.status,
                    error_message: testResult.error || null,
                    metadata: JSON.stringify(testResult.details),
                    duration_ms: testResult.duration,
                    completed_at: new Date()
                });
            } catch (error) {
                console.error(`Error creating AuditLog: ${error.message}`);
            }
        }

        return {
            execution_id,
            test_name: testResult.name,
            status: testResult.status,
            details: testResult.details,
            duration: testResult.duration
        };
    }

    /**
     * Cleanup al finalizar
     */
    async cleanup() {
        if (this.ssotService) {
            await this.ssotService.close();
        }
        await super.cleanup?.();
    }
}

module.exports = OrganizationalModuleCollector;
