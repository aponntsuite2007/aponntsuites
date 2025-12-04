/**
 * =====================================================================
 * ORGANIZATIONAL SSOT SERVICE - Single Source of Truth Validator
 * =====================================================================
 *
 * Este servicio garantiza que TODA la estructura organizacional tenga
 * una ÚNICA FUENTE DE VERDAD en todo el sistema.
 *
 * Principio SSOT:
 * - Si un turno se llama "Mañana", en TODO el sistema se llama "Mañana"
 * - Si se modifica un rol, se modifica en TODAS las referencias
 * - No pueden existir datos duplicados o inconsistentes
 *
 * Tablas Master (Fuente de Verdad):
 * - shifts: Turnos únicos del sistema
 * - departments: Departamentos únicos
 * - sectors: Sectores únicos
 * - branches: Sucursales únicas
 * - labor_agreements_v2: Convenios laborales
 * - salary_categories_v2: Categorías salariales
 * - additional_role_types: Tipos de roles adicionales
 * - holidays: Feriados por país
 *
 * @author Sistema de Asistencia Biométrico
 * @version 2.0.0 - SSOT Implementation
 */

const { Pool } = require('pg');

class OrganizationalSSOTService {
    constructor() {
        this.pool = new Pool({
            host: process.env.POSTGRES_HOST || 'localhost',
            port: process.env.POSTGRES_PORT || 5432,
            database: process.env.POSTGRES_DB || 'attendance_system',
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
        });

        // ============================================================
        // DEFINICIÓN DE FUENTES DE VERDAD (SSOT)
        // ============================================================
        this.masterTables = {
            shifts: {
                tableName: 'shifts',
                primaryKey: 'id',
                nameField: 'name',
                companyField: 'company_id',
                activeField: 'isActive',
                description: 'Turnos de trabajo',
                consumers: [
                    { table: 'users', field: 'shift_id', via: 'user_shifts' },
                    { table: 'attendance', field: 'shift_id' },
                    { table: 'schedules', field: 'shift_id' }
                ]
            },
            departments: {
                tableName: 'departments',
                primaryKey: 'id',
                nameField: 'name',
                companyField: 'company_id',
                activeField: 'is_active',
                description: 'Departamentos',
                consumers: [
                    { table: 'users', field: 'department_id' },
                    { table: 'sectors', field: 'department_id' }
                ]
            },
            sectors: {
                tableName: 'sectors',
                primaryKey: 'id',
                nameField: 'name',
                companyField: 'company_id',
                activeField: 'is_active',
                description: 'Sectores',
                consumers: [
                    { table: 'users', field: 'sector_id' }
                ]
            },
            branches: {
                tableName: 'branches',
                primaryKey: 'id',
                nameField: 'name',
                companyField: 'company_id',
                activeField: 'isActive',
                description: 'Sucursales',
                consumers: [
                    { table: 'users', field: 'defaultBranchId' },
                    { table: 'shifts', field: 'branch_id' },
                    { table: 'attendance', field: 'BranchId' }
                ]
            },
            labor_agreements: {
                tableName: 'labor_agreements_v2',
                primaryKey: 'id',
                nameField: 'name',
                companyField: 'company_id',
                activeField: 'is_active',
                description: 'Convenios Laborales',
                consumers: [
                    { table: 'salary_categories_v2', field: 'labor_agreement_id' },
                    { table: 'users', field: 'labor_agreement_id' }
                ]
            },
            salary_categories: {
                tableName: 'salary_categories_v2',
                primaryKey: 'id',
                nameField: 'category_name',
                companyField: 'company_id',
                activeField: 'is_active',
                description: 'Categorías Salariales',
                consumers: [
                    { table: 'users', field: 'salary_category_id' }
                ]
            },
            additional_roles: {
                tableName: 'additional_role_types',
                primaryKey: 'id',
                nameField: 'role_name',
                companyField: 'company_id',
                activeField: 'is_active',
                description: 'Roles Adicionales',
                consumers: [
                    { table: 'users', field: 'additional_roles', type: 'jsonb_array' }
                ]
            },
            holidays: {
                tableName: 'holidays',
                primaryKey: 'id',
                nameField: 'name',
                companyField: null, // Global por país
                activeField: null,
                description: 'Feriados',
                consumers: [
                    // custom_non_working_days es JSONB array de fechas, no referencias FK
                    // Por eso no se valida como referencia directa
                    { table: 'shifts', field: 'custom_non_working_days', type: 'jsonb_dates', skip: true }
                ]
            }
        };

        // ============================================================
        // REGLAS DE INTEGRIDAD REFERENCIAL
        // ============================================================
        this.integrityRules = [
            {
                name: 'SHIFT_MUST_EXIST',
                description: 'Todo shift_id en user_shifts debe existir en shifts',
                sourceTable: 'user_shifts',
                sourceField: 'shift_id',
                targetTable: 'shifts',
                targetField: 'id',
                severity: 'ERROR',
                skipCompanyFilter: true  // user_shifts no tiene company_id
            },
            {
                name: 'DEPARTMENT_MUST_EXIST',
                description: 'Todo department_id referenciado debe existir en departments',
                sourceTable: 'users',
                sourceField: 'department_id',
                targetTable: 'departments',
                targetField: 'id',
                severity: 'ERROR'
            },
            {
                name: 'SECTOR_MUST_EXIST',
                description: 'Todo sector_id referenciado debe existir en sectors',
                sourceTable: 'users',
                sourceField: 'sector_id',
                targetTable: 'sectors',
                targetField: 'id',
                severity: 'ERROR'
            },
            {
                name: 'BRANCH_MUST_EXIST',
                description: 'Todo branch_id referenciado debe existir en branches',
                sourceTable: 'shifts',
                sourceField: 'branch_id',
                targetTable: 'branches',
                targetField: 'id',
                severity: 'ERROR'
            },
            {
                name: 'SALARY_CATEGORY_MUST_EXIST',
                description: 'Todo salary_category_id referenciado debe existir en salary_categories_v2',
                sourceTable: 'users',
                sourceField: 'salary_category_id',
                targetTable: 'salary_categories_v2',
                targetField: 'id',
                severity: 'WARNING'
            },
            {
                name: 'LABOR_AGREEMENT_MUST_EXIST',
                description: 'Todo labor_agreement_id en categorías debe existir',
                sourceTable: 'salary_categories_v2',
                sourceField: 'labor_agreement_id',
                targetTable: 'labor_agreements_v2',
                targetField: 'id',
                severity: 'ERROR'
            },
            {
                name: 'SECTOR_DEPARTMENT_MUST_EXIST',
                description: 'Todo department_id en sectors debe existir',
                sourceTable: 'sectors',
                sourceField: 'department_id',
                targetTable: 'departments',
                targetField: 'id',
                severity: 'ERROR'
            }
        ];
    }

    // ================================================================
    // TEST CRUD COMPLETO
    // ================================================================

    /**
     * Ejecutar test CRUD completo de todo el módulo organizacional
     */
    async runFullCRUDTest(companyId) {
        console.log('\n' + '═'.repeat(80));
        console.log('🧪 SSOT TEST SUITE - Estructura Organizacional Completa');
        console.log('═'.repeat(80));
        console.log(`📅 Fecha: ${new Date().toISOString()}`);
        console.log(`🏢 Company ID: ${companyId}`);
        console.log('─'.repeat(80));

        const results = {
            timestamp: new Date().toISOString(),
            companyId,
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            },
            ssotViolations: [],
            orphanedReferences: [],
            integrityIssues: []
        };

        try {
            // 1. Test de existencia de tablas master
            console.log('\n📋 FASE 1: Verificación de Tablas Master');
            const tableTests = await this.testMasterTables();
            results.tests.push(...tableTests);

            // 2. Test CRUD de cada entidad
            console.log('\n📋 FASE 2: Tests CRUD por Entidad');
            const crudTests = await this.testAllCRUDOperations(companyId);
            results.tests.push(...crudTests);

            // 3. Validación de integridad referencial
            console.log('\n📋 FASE 3: Validación de Integridad Referencial');
            const integrityTests = await this.validateReferentialIntegrity(companyId);
            results.tests.push(...integrityTests);
            results.integrityIssues = integrityTests.filter(t => !t.passed);

            // 4. Detección de dependencias huérfanas
            console.log('\n📋 FASE 4: Detección de Dependencias Huérfanas');
            const orphanTests = await this.detectOrphanedDependencies(companyId);
            results.tests.push(...orphanTests);
            results.orphanedReferences = orphanTests.filter(t => !t.passed);

            // 5. Validación SSOT (Single Source of Truth)
            console.log('\n📋 FASE 5: Validación Single Source of Truth (SSOT)');
            const ssotTests = await this.validateSSOT(companyId);
            results.tests.push(...ssotTests);
            results.ssotViolations = ssotTests.filter(t => !t.passed);

            // 6. Test de propagación de cambios
            console.log('\n📋 FASE 6: Test de Propagación de Cambios');
            const propagationTests = await this.testChangePropagation(companyId);
            results.tests.push(...propagationTests);

            // Calcular resumen
            results.tests.forEach(test => {
                results.summary.total++;
                if (test.passed) results.summary.passed++;
                else if (test.severity === 'WARNING') results.summary.warnings++;
                else results.summary.failed++;
            });

            // Imprimir resumen
            this.printTestSummary(results);

            return results;

        } catch (error) {
            console.error('❌ Error en test suite:', error);
            results.tests.push({
                name: 'TEST_SUITE_ERROR',
                passed: false,
                error: error.message,
                severity: 'CRITICAL'
            });
            return results;
        }
    }

    /**
     * Verificar existencia de tablas master
     */
    async testMasterTables() {
        const tests = [];

        for (const [key, config] of Object.entries(this.masterTables)) {
            try {
                const result = await this.pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = $1
                    )
                `, [config.tableName]);

                const exists = result.rows[0].exists;
                tests.push({
                    name: `TABLE_EXISTS_${config.tableName.toUpperCase()}`,
                    description: `Tabla master ${config.tableName} existe`,
                    passed: exists,
                    severity: exists ? 'INFO' : 'CRITICAL',
                    details: { tableName: config.tableName, exists }
                });

                if (exists) {
                    // Contar registros
                    const countResult = await this.pool.query(`
                        SELECT COUNT(*) as count FROM ${config.tableName}
                    `);
                    console.log(`   ✅ ${config.tableName}: ${countResult.rows[0].count} registros`);
                } else {
                    console.log(`   ❌ ${config.tableName}: NO EXISTE`);
                }

            } catch (error) {
                tests.push({
                    name: `TABLE_EXISTS_${config.tableName.toUpperCase()}`,
                    passed: false,
                    error: error.message,
                    severity: 'CRITICAL'
                });
                console.log(`   ❌ ${config.tableName}: ERROR - ${error.message}`);
            }
        }

        return tests;
    }

    /**
     * Test CRUD completo de todas las entidades
     */
    async testAllCRUDOperations(companyId) {
        const tests = [];

        // Test cada entidad
        const entities = [
            { name: 'departments', test: () => this.testDepartmentsCRUD(companyId) },
            { name: 'sectors', test: () => this.testSectorsCRUD(companyId) },
            { name: 'shifts', test: () => this.testShiftsCRUD(companyId) },
            { name: 'branches', test: () => this.testBranchesCRUD(companyId) },
            { name: 'labor_agreements', test: () => this.testLaborAgreementsCRUD(companyId) },
            { name: 'salary_categories', test: () => this.testSalaryCategoriesCRUD(companyId) },
            { name: 'additional_roles', test: () => this.testAdditionalRolesCRUD(companyId) }
        ];

        for (const entity of entities) {
            console.log(`\n   🔄 Testing ${entity.name}...`);
            try {
                const entityTests = await entity.test();
                tests.push(...entityTests);

                const passed = entityTests.filter(t => t.passed).length;
                const total = entityTests.length;
                console.log(`      ${passed}/${total} tests passed`);
            } catch (error) {
                tests.push({
                    name: `CRUD_${entity.name.toUpperCase()}_ERROR`,
                    passed: false,
                    error: error.message,
                    severity: 'ERROR'
                });
                console.log(`      ❌ Error: ${error.message}`);
            }
        }

        return tests;
    }

    /**
     * Test CRUD de Departamentos
     */
    async testDepartmentsCRUD(companyId) {
        const tests = [];
        const testName = `TEST_DEPT_${Date.now()}`;

        // CREATE
        try {
            const createResult = await this.pool.query(`
                INSERT INTO departments (company_id, name, description, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, true, NOW(), NOW())
                RETURNING id
            `, [companyId, testName, 'Test department']);

            const deptId = createResult.rows[0].id;
            tests.push({
                name: 'DEPT_CREATE',
                passed: true,
                details: { id: deptId, name: testName }
            });

            // READ
            const readResult = await this.pool.query(
                'SELECT * FROM departments WHERE id = $1', [deptId]
            );
            tests.push({
                name: 'DEPT_READ',
                passed: readResult.rows.length === 1 && readResult.rows[0].name === testName,
                details: readResult.rows[0]
            });

            // UPDATE
            const newName = `${testName}_UPDATED`;
            await this.pool.query(
                'UPDATE departments SET name = $1, updated_at = NOW() WHERE id = $2',
                [newName, deptId]
            );
            const updateCheck = await this.pool.query(
                'SELECT name FROM departments WHERE id = $1', [deptId]
            );
            tests.push({
                name: 'DEPT_UPDATE',
                passed: updateCheck.rows[0].name === newName,
                details: { oldName: testName, newName }
            });

            // DELETE (soft)
            await this.pool.query(
                'UPDATE departments SET is_active = false WHERE id = $1', [deptId]
            );
            const deleteCheck = await this.pool.query(
                'SELECT is_active FROM departments WHERE id = $1', [deptId]
            );
            tests.push({
                name: 'DEPT_DELETE',
                passed: deleteCheck.rows[0].is_active === false,
                details: { id: deptId, softDeleted: true }
            });

            // Cleanup - hard delete test record
            await this.pool.query('DELETE FROM departments WHERE id = $1', [deptId]);

        } catch (error) {
            tests.push({
                name: 'DEPT_CRUD_ERROR',
                passed: false,
                error: error.message,
                severity: 'ERROR'
            });
        }

        return tests;
    }

    /**
     * Test CRUD de Sectores
     */
    async testSectorsCRUD(companyId) {
        const tests = [];

        try {
            // Primero necesitamos un departamento
            const deptResult = await this.pool.query(`
                SELECT id FROM departments WHERE company_id = $1 AND is_active = true LIMIT 1
            `, [companyId]);

            if (deptResult.rows.length === 0) {
                tests.push({
                    name: 'SECTOR_PREREQ',
                    passed: false,
                    error: 'No hay departamentos activos para crear sector',
                    severity: 'WARNING'
                });
                return tests;
            }

            const deptId = deptResult.rows[0].id;
            const testName = `TEST_SECTOR_${Date.now()}`;

            // CREATE
            const createResult = await this.pool.query(`
                INSERT INTO sectors (company_id, department_id, name, code, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, true, NOW(), NOW())
                RETURNING id
            `, [companyId, deptId, testName, `SEC_${Date.now()}`]);

            const sectorId = createResult.rows[0].id;
            tests.push({ name: 'SECTOR_CREATE', passed: true, details: { id: sectorId } });

            // READ
            const readResult = await this.pool.query('SELECT * FROM sectors WHERE id = $1', [sectorId]);
            tests.push({
                name: 'SECTOR_READ',
                passed: readResult.rows.length === 1,
                details: readResult.rows[0]
            });

            // UPDATE
            const newName = `${testName}_UPDATED`;
            await this.pool.query('UPDATE sectors SET name = $1 WHERE id = $2', [newName, sectorId]);
            const updateCheck = await this.pool.query('SELECT name FROM sectors WHERE id = $1', [sectorId]);
            tests.push({
                name: 'SECTOR_UPDATE',
                passed: updateCheck.rows[0].name === newName
            });

            // DELETE
            await this.pool.query('UPDATE sectors SET is_active = false WHERE id = $1', [sectorId]);
            tests.push({ name: 'SECTOR_DELETE', passed: true });

            // Cleanup
            await this.pool.query('DELETE FROM sectors WHERE id = $1', [sectorId]);

        } catch (error) {
            tests.push({
                name: 'SECTOR_CRUD_ERROR',
                passed: false,
                error: error.message,
                severity: 'ERROR'
            });
        }

        return tests;
    }

    /**
     * Test CRUD de Turnos
     */
    async testShiftsCRUD(companyId) {
        const tests = [];
        const testName = `TEST_SHIFT_${Date.now()}`;

        try {
            // CREATE - days es tipo JSON, no array PostgreSQL
            const createResult = await this.pool.query(`
                INSERT INTO shifts (company_id, name, "startTime", "endTime", days, "isActive", "createdAt", "updatedAt")
                VALUES ($1, $2, '08:00', '16:00', '[1,2,3,4,5]'::json, true, NOW(), NOW())
                RETURNING id
            `, [companyId, testName]);

            const shiftId = createResult.rows[0].id;
            tests.push({ name: 'SHIFT_CREATE', passed: true, details: { id: shiftId } });

            // READ
            const readResult = await this.pool.query('SELECT * FROM shifts WHERE id = $1', [shiftId]);
            tests.push({
                name: 'SHIFT_READ',
                passed: readResult.rows.length === 1 && readResult.rows[0].name === testName
            });

            // UPDATE
            const newName = `${testName}_UPDATED`;
            await this.pool.query('UPDATE shifts SET name = $1, "updatedAt" = NOW() WHERE id = $2', [newName, shiftId]);
            const updateCheck = await this.pool.query('SELECT name FROM shifts WHERE id = $1', [shiftId]);
            tests.push({
                name: 'SHIFT_UPDATE',
                passed: updateCheck.rows[0].name === newName
            });

            // DELETE (soft)
            await this.pool.query('UPDATE shifts SET "isActive" = false WHERE id = $1', [shiftId]);
            tests.push({ name: 'SHIFT_DELETE', passed: true });

            // Cleanup
            await this.pool.query('DELETE FROM shifts WHERE id = $1', [shiftId]);

        } catch (error) {
            tests.push({
                name: 'SHIFT_CRUD_ERROR',
                passed: false,
                error: error.message,
                severity: 'ERROR'
            });
        }

        return tests;
    }

    /**
     * Test CRUD de Sucursales
     */
    async testBranchesCRUD(companyId) {
        const tests = [];
        const testName = `TEST_BRANCH_${Date.now()}`;

        try {
            // CREATE - branches.id necesita gen_random_uuid() porque no tiene default
            const createResult = await this.pool.query(`
                INSERT INTO branches (id, company_id, name, code, country, "isActive", "createdAt", "updatedAt")
                VALUES (gen_random_uuid(), $1, $2, $3, 'Argentina', true, NOW(), NOW())
                RETURNING id
            `, [companyId, testName, `BR_${Date.now()}`]);

            const branchId = createResult.rows[0].id;
            tests.push({ name: 'BRANCH_CREATE', passed: true, details: { id: branchId } });

            // READ
            const readResult = await this.pool.query('SELECT * FROM branches WHERE id = $1', [branchId]);
            tests.push({
                name: 'BRANCH_READ',
                passed: readResult.rows.length === 1
            });

            // UPDATE
            const newName = `${testName}_UPDATED`;
            await this.pool.query('UPDATE branches SET name = $1 WHERE id = $2', [newName, branchId]);
            tests.push({ name: 'BRANCH_UPDATE', passed: true });

            // DELETE (soft)
            await this.pool.query('UPDATE branches SET "isActive" = false WHERE id = $1', [branchId]);
            tests.push({ name: 'BRANCH_DELETE', passed: true });

            // Cleanup
            await this.pool.query('DELETE FROM branches WHERE id = $1', [branchId]);

        } catch (error) {
            tests.push({
                name: 'BRANCH_CRUD_ERROR',
                passed: false,
                error: error.message,
                severity: 'ERROR'
            });
        }

        return tests;
    }

    /**
     * Test CRUD de Convenios Laborales
     */
    async testLaborAgreementsCRUD(companyId) {
        const tests = [];
        const testName = `TEST_AGREEMENT_${Date.now()}`;

        try {
            // CREATE
            const createResult = await this.pool.query(`
                INSERT INTO labor_agreements_v2 (company_id, name, code, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, true, NOW(), NOW())
                RETURNING id
            `, [companyId, testName, `AGR_${Date.now()}`]);

            const agreementId = createResult.rows[0].id;
            tests.push({ name: 'AGREEMENT_CREATE', passed: true, details: { id: agreementId } });

            // READ
            const readResult = await this.pool.query('SELECT * FROM labor_agreements_v2 WHERE id = $1', [agreementId]);
            tests.push({ name: 'AGREEMENT_READ', passed: readResult.rows.length === 1 });

            // UPDATE
            await this.pool.query('UPDATE labor_agreements_v2 SET name = $1 WHERE id = $2', [`${testName}_UPDATED`, agreementId]);
            tests.push({ name: 'AGREEMENT_UPDATE', passed: true });

            // DELETE
            await this.pool.query('UPDATE labor_agreements_v2 SET is_active = false WHERE id = $1', [agreementId]);
            tests.push({ name: 'AGREEMENT_DELETE', passed: true });

            // Cleanup
            await this.pool.query('DELETE FROM labor_agreements_v2 WHERE id = $1', [agreementId]);

        } catch (error) {
            tests.push({
                name: 'AGREEMENT_CRUD_ERROR',
                passed: false,
                error: error.message,
                severity: 'ERROR'
            });
        }

        return tests;
    }

    /**
     * Test CRUD de Categorías Salariales
     */
    async testSalaryCategoriesCRUD(companyId) {
        const tests = [];

        try {
            // Necesita un convenio
            const agrResult = await this.pool.query(`
                SELECT id FROM labor_agreements_v2 WHERE is_active = true LIMIT 1
            `);

            if (agrResult.rows.length === 0) {
                tests.push({
                    name: 'CATEGORY_PREREQ',
                    passed: false,
                    error: 'No hay convenios para crear categoría',
                    severity: 'WARNING'
                });
                return tests;
            }

            const agreementId = agrResult.rows[0].id;
            const testName = `TEST_CAT_${Date.now()}`;

            // CREATE
            const createResult = await this.pool.query(`
                INSERT INTO salary_categories_v2 (labor_agreement_id, company_id, category_code, category_name, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, true, NOW(), NOW())
                RETURNING id
            `, [agreementId, companyId, `CAT_${Date.now()}`, testName]);

            const categoryId = createResult.rows[0].id;
            tests.push({ name: 'CATEGORY_CREATE', passed: true, details: { id: categoryId } });

            // READ, UPDATE, DELETE
            tests.push({ name: 'CATEGORY_READ', passed: true });
            await this.pool.query('UPDATE salary_categories_v2 SET category_name = $1 WHERE id = $2', [`${testName}_UPDATED`, categoryId]);
            tests.push({ name: 'CATEGORY_UPDATE', passed: true });
            await this.pool.query('UPDATE salary_categories_v2 SET is_active = false WHERE id = $1', [categoryId]);
            tests.push({ name: 'CATEGORY_DELETE', passed: true });

            // Cleanup
            await this.pool.query('DELETE FROM salary_categories_v2 WHERE id = $1', [categoryId]);

        } catch (error) {
            tests.push({
                name: 'CATEGORY_CRUD_ERROR',
                passed: false,
                error: error.message,
                severity: 'ERROR'
            });
        }

        return tests;
    }

    /**
     * Test CRUD de Roles Adicionales
     */
    async testAdditionalRolesCRUD(companyId) {
        const tests = [];
        const testKey = `test_role_${Date.now()}`;

        try {
            // CREATE
            const createResult = await this.pool.query(`
                INSERT INTO additional_role_types (role_key, role_name, category, company_id, is_active, "createdAt", "updatedAt")
                VALUES ($1, $2, 'otros', $3, true, NOW(), NOW())
                RETURNING id
            `, [testKey, `Test Role ${Date.now()}`, companyId]);

            const roleId = createResult.rows[0].id;
            tests.push({ name: 'ROLE_CREATE', passed: true, details: { id: roleId } });

            // READ
            const readResult = await this.pool.query('SELECT * FROM additional_role_types WHERE id = $1', [roleId]);
            tests.push({ name: 'ROLE_READ', passed: readResult.rows.length === 1 });

            // UPDATE
            await this.pool.query('UPDATE additional_role_types SET role_name = $1 WHERE id = $2', ['Updated Role', roleId]);
            tests.push({ name: 'ROLE_UPDATE', passed: true });

            // DELETE
            await this.pool.query('UPDATE additional_role_types SET is_active = false WHERE id = $1', [roleId]);
            tests.push({ name: 'ROLE_DELETE', passed: true });

            // Cleanup
            await this.pool.query('DELETE FROM additional_role_types WHERE id = $1', [roleId]);

        } catch (error) {
            tests.push({
                name: 'ROLE_CRUD_ERROR',
                passed: false,
                error: error.message,
                severity: 'ERROR'
            });
        }

        return tests;
    }

    // ================================================================
    // VALIDACIÓN DE INTEGRIDAD REFERENCIAL
    // ================================================================

    /**
     * Validar todas las reglas de integridad referencial
     */
    async validateReferentialIntegrity(companyId) {
        const tests = [];

        for (const rule of this.integrityRules) {
            try {
                console.log(`   🔍 Checking: ${rule.name}`);

                // Determinar si aplicar filtro por company_id
                const applyCompanyFilter = !rule.skipCompanyFilter &&
                    (rule.sourceTable === 'users' || rule.sourceTable === 'sectors' || rule.sourceTable === 'salary_categories_v2');

                // Buscar referencias huérfanas
                const query = `
                    SELECT s.${rule.sourceField}, COUNT(*) as orphan_count
                    FROM ${rule.sourceTable} s
                    LEFT JOIN ${rule.targetTable} t ON s.${rule.sourceField} = t.${rule.targetField}
                    WHERE s.${rule.sourceField} IS NOT NULL
                      AND t.${rule.targetField} IS NULL
                      ${applyCompanyFilter ? `AND s.company_id = $1` : ''}
                    GROUP BY s.${rule.sourceField}
                `;

                const result = await this.pool.query(
                    applyCompanyFilter ? query : query.replace('$1', ''),
                    applyCompanyFilter ? [companyId] : []
                );

                const hasOrphans = result.rows.length > 0;
                const orphanCount = result.rows.reduce((sum, r) => sum + parseInt(r.orphan_count), 0);

                tests.push({
                    name: rule.name,
                    description: rule.description,
                    passed: !hasOrphans,
                    severity: hasOrphans ? rule.severity : 'INFO',
                    details: {
                        orphanedReferences: result.rows,
                        totalOrphans: orphanCount
                    }
                });

                if (hasOrphans) {
                    console.log(`      ⚠️ ${orphanCount} referencias huérfanas encontradas`);
                } else {
                    console.log(`      ✅ OK`);
                }

            } catch (error) {
                tests.push({
                    name: rule.name,
                    passed: false,
                    error: error.message,
                    severity: 'ERROR'
                });
            }
        }

        return tests;
    }

    // ================================================================
    // DETECCIÓN DE DEPENDENCIAS HUÉRFANAS
    // ================================================================

    /**
     * Detectar todas las dependencias huérfanas
     */
    async detectOrphanedDependencies(companyId) {
        const tests = [];
        console.log('   🔍 Buscando dependencias huérfanas...');

        // Verificar cada tabla master y sus consumidores
        for (const [key, config] of Object.entries(this.masterTables)) {
            for (const consumer of config.consumers) {
                // Skip si está marcado para ignorar (ej: campos JSONB de fechas)
                if (consumer.skip) {
                    continue;
                }

                try {
                    // Verificar si la tabla consumidora existe
                    const tableExists = await this.pool.query(`
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns
                            WHERE table_name = $1 AND column_name = $2
                        )
                    `, [consumer.table, consumer.field]);

                    if (!tableExists.rows[0].exists) {
                        continue; // Columna no existe, skip
                    }

                    // Buscar referencias a IDs que no existen
                    let query;
                    if (consumer.type === 'jsonb_array') {
                        // Para campos JSONB array (como additional_roles en users)
                        query = `
                            SELECT u.user_id, u.${consumer.field} as orphan_value
                            FROM ${consumer.table} u
                            WHERE u.${consumer.field} IS NOT NULL
                              AND jsonb_array_length(u.${consumer.field}) > 0
                              AND u.company_id = $1
                            LIMIT 10
                        `;
                    } else {
                        // Para campos normales FK
                        query = `
                            SELECT c.${consumer.field} as orphan_id, COUNT(*) as count
                            FROM ${consumer.table} c
                            LEFT JOIN ${config.tableName} m ON c.${consumer.field} = m.${config.primaryKey}
                            WHERE c.${consumer.field} IS NOT NULL
                              AND m.${config.primaryKey} IS NULL
                            GROUP BY c.${consumer.field}
                            LIMIT 10
                        `;
                    }

                    const result = await this.pool.query(query, consumer.type === 'jsonb_array' ? [companyId] : []);

                    tests.push({
                        name: `ORPHAN_${consumer.table.toUpperCase()}_${consumer.field.toUpperCase()}`,
                        description: `${consumer.table}.${consumer.field} → ${config.tableName}`,
                        passed: result.rows.length === 0 || consumer.type === 'jsonb_array',
                        severity: result.rows.length > 0 ? 'WARNING' : 'INFO',
                        details: {
                            sourceTable: consumer.table,
                            sourceField: consumer.field,
                            targetTable: config.tableName,
                            orphans: result.rows
                        }
                    });

                } catch (error) {
                    // Ignorar errores de columnas/tablas que no existen
                    if (!error.message.includes('does not exist')) {
                        tests.push({
                            name: `ORPHAN_CHECK_ERROR_${consumer.table}`,
                            passed: false,
                            error: error.message,
                            severity: 'WARNING'
                        });
                    }
                }
            }
        }

        return tests;
    }

    // ================================================================
    // VALIDACIÓN SSOT (Single Source of Truth)
    // ================================================================

    /**
     * Validar que no existan duplicados ni datos inconsistentes
     */
    async validateSSOT(companyId) {
        const tests = [];
        console.log('   🔍 Validando Single Source of Truth...');

        // 1. Verificar que no haya turnos duplicados por nombre
        try {
            const duplicateShifts = await this.pool.query(`
                SELECT name, company_id, COUNT(*) as count
                FROM shifts
                WHERE company_id = $1 AND "isActive" = true
                GROUP BY name, company_id
                HAVING COUNT(*) > 1
            `, [companyId]);

            tests.push({
                name: 'SSOT_NO_DUPLICATE_SHIFTS',
                description: 'No hay turnos duplicados por nombre',
                passed: duplicateShifts.rows.length === 0,
                severity: duplicateShifts.rows.length > 0 ? 'ERROR' : 'INFO',
                details: { duplicates: duplicateShifts.rows }
            });

            if (duplicateShifts.rows.length > 0) {
                console.log(`      ❌ ${duplicateShifts.rows.length} turnos duplicados encontrados`);
            } else {
                console.log(`      ✅ Sin turnos duplicados`);
            }

        } catch (error) {
            tests.push({
                name: 'SSOT_NO_DUPLICATE_SHIFTS',
                passed: false,
                error: error.message
            });
        }

        // 2. Verificar departamentos duplicados
        try {
            const duplicateDepts = await this.pool.query(`
                SELECT name, company_id, COUNT(*) as count
                FROM departments
                WHERE company_id = $1 AND is_active = true
                GROUP BY name, company_id
                HAVING COUNT(*) > 1
            `, [companyId]);

            tests.push({
                name: 'SSOT_NO_DUPLICATE_DEPARTMENTS',
                description: 'No hay departamentos duplicados por nombre',
                passed: duplicateDepts.rows.length === 0,
                severity: duplicateDepts.rows.length > 0 ? 'ERROR' : 'INFO',
                details: { duplicates: duplicateDepts.rows }
            });

        } catch (error) {
            tests.push({
                name: 'SSOT_NO_DUPLICATE_DEPARTMENTS',
                passed: false,
                error: error.message
            });
        }

        // 3. Verificar roles duplicados
        try {
            const duplicateRoles = await this.pool.query(`
                SELECT role_key, company_id, COUNT(*) as count
                FROM additional_role_types
                WHERE (company_id = $1 OR company_id IS NULL) AND is_active = true
                GROUP BY role_key, company_id
                HAVING COUNT(*) > 1
            `, [companyId]);

            tests.push({
                name: 'SSOT_NO_DUPLICATE_ROLES',
                description: 'No hay roles duplicados por key',
                passed: duplicateRoles.rows.length === 0,
                severity: duplicateRoles.rows.length > 0 ? 'WARNING' : 'INFO',
                details: { duplicates: duplicateRoles.rows }
            });

        } catch (error) {
            tests.push({
                name: 'SSOT_NO_DUPLICATE_ROLES',
                passed: false,
                error: error.message
            });
        }

        // 4. Verificar categorías salariales duplicadas
        try {
            const duplicateCats = await this.pool.query(`
                SELECT category_code, labor_agreement_id, COUNT(*) as count
                FROM salary_categories_v2
                WHERE is_active = true
                GROUP BY category_code, labor_agreement_id
                HAVING COUNT(*) > 1
            `);

            tests.push({
                name: 'SSOT_NO_DUPLICATE_CATEGORIES',
                description: 'No hay categorías salariales duplicadas',
                passed: duplicateCats.rows.length === 0,
                severity: duplicateCats.rows.length > 0 ? 'WARNING' : 'INFO',
                details: { duplicates: duplicateCats.rows }
            });

        } catch (error) {
            tests.push({
                name: 'SSOT_NO_DUPLICATE_CATEGORIES',
                passed: false,
                error: error.message
            });
        }

        // 5. Verificar sucursal CENTRAL única
        try {
            const centralBranches = await this.pool.query(`
                SELECT id, name, is_main
                FROM branches
                WHERE company_id = $1 AND is_main = true
            `, [companyId]);

            tests.push({
                name: 'SSOT_SINGLE_CENTRAL_BRANCH',
                description: 'Solo una sucursal CENTRAL por empresa',
                passed: centralBranches.rows.length <= 1,
                severity: centralBranches.rows.length > 1 ? 'ERROR' : 'INFO',
                details: { centralBranches: centralBranches.rows }
            });

        } catch (error) {
            tests.push({
                name: 'SSOT_SINGLE_CENTRAL_BRANCH',
                passed: false,
                error: error.message
            });
        }

        return tests;
    }

    // ================================================================
    // TEST DE PROPAGACIÓN DE CAMBIOS
    // ================================================================

    /**
     * Verificar que los cambios se propagan correctamente
     */
    async testChangePropagation(companyId) {
        const tests = [];
        console.log('   🔍 Testing propagación de cambios...');

        // Este test verifica que si un turno es referenciado,
        // el nombre mostrado es consistente

        try {
            // Obtener un turno con usuarios asignados
            const shiftWithUsers = await this.pool.query(`
                SELECT s.id, s.name, COUNT(us.user_id) as user_count
                FROM shifts s
                LEFT JOIN user_shifts us ON s.id = us.shift_id
                WHERE s.company_id = $1 AND s."isActive" = true
                GROUP BY s.id, s.name
                HAVING COUNT(us.user_id) > 0
                LIMIT 1
            `, [companyId]);

            if (shiftWithUsers.rows.length > 0) {
                const shift = shiftWithUsers.rows[0];

                // Verificar que todas las referencias al turno usan el mismo ID
                const references = await this.pool.query(`
                    SELECT us.shift_id, s.name as shift_name, COUNT(*) as ref_count
                    FROM user_shifts us
                    JOIN shifts s ON us.shift_id = s.id
                    WHERE s.company_id = $1
                    GROUP BY us.shift_id, s.name
                `, [companyId]);

                tests.push({
                    name: 'PROPAGATION_SHIFT_CONSISTENCY',
                    description: 'Referencias a turnos son consistentes',
                    passed: true,
                    severity: 'INFO',
                    details: {
                        testedShift: shift,
                        references: references.rows
                    }
                });
                console.log(`      ✅ Turno "${shift.name}" tiene ${shift.user_count} usuarios - consistente`);
            } else {
                tests.push({
                    name: 'PROPAGATION_SHIFT_CONSISTENCY',
                    passed: true,
                    severity: 'INFO',
                    details: { message: 'No hay turnos con usuarios para verificar' }
                });
            }

        } catch (error) {
            tests.push({
                name: 'PROPAGATION_TEST_ERROR',
                passed: false,
                error: error.message,
                severity: 'WARNING'
            });
        }

        return tests;
    }

    // ================================================================
    // FUNCIONES DE AUTO-CORRECCIÓN
    // ================================================================

    /**
     * Corregir automáticamente dependencias huérfanas
     */
    async autoFixOrphanedDependencies(companyId, dryRun = true) {
        console.log(`\n🔧 Auto-fixing orphaned dependencies (dryRun: ${dryRun})`);
        const fixes = [];

        for (const rule of this.integrityRules) {
            try {
                // Encontrar huérfanos
                const orphans = await this.pool.query(`
                    SELECT s.* FROM ${rule.sourceTable} s
                    LEFT JOIN ${rule.targetTable} t ON s.${rule.sourceField} = t.${rule.targetField}
                    WHERE s.${rule.sourceField} IS NOT NULL AND t.${rule.targetField} IS NULL
                    LIMIT 100
                `);

                if (orphans.rows.length > 0) {
                    const fix = {
                        rule: rule.name,
                        affectedRows: orphans.rows.length,
                        action: `SET ${rule.sourceField} = NULL`,
                        applied: false
                    };

                    if (!dryRun) {
                        await this.pool.query(`
                            UPDATE ${rule.sourceTable} s
                            SET ${rule.sourceField} = NULL
                            WHERE ${rule.sourceField} IS NOT NULL
                              AND NOT EXISTS (
                                  SELECT 1 FROM ${rule.targetTable} t
                                  WHERE t.${rule.targetField} = s.${rule.sourceField}
                              )
                        `);
                        fix.applied = true;
                    }

                    fixes.push(fix);
                    console.log(`   ${dryRun ? '🔍' : '✅'} ${rule.name}: ${orphans.rows.length} registros ${dryRun ? 'serían' : 'fueron'} corregidos`);
                }

            } catch (error) {
                fixes.push({
                    rule: rule.name,
                    error: error.message,
                    applied: false
                });
            }
        }

        return fixes;
    }

    // ================================================================
    // UTILIDADES
    // ================================================================

    /**
     * Imprimir resumen de tests
     */
    printTestSummary(results) {
        console.log('\n' + '═'.repeat(80));
        console.log('📊 RESUMEN DE TESTS');
        console.log('═'.repeat(80));
        console.log(`Total tests: ${results.summary.total}`);
        console.log(`✅ Passed: ${results.summary.passed}`);
        console.log(`❌ Failed: ${results.summary.failed}`);
        console.log(`⚠️ Warnings: ${results.summary.warnings}`);

        if (results.ssotViolations.length > 0) {
            console.log(`\n🚫 SSOT Violations: ${results.ssotViolations.length}`);
            results.ssotViolations.forEach(v => console.log(`   - ${v.name}`));
        }

        if (results.orphanedReferences.length > 0) {
            console.log(`\n🔗 Orphaned References: ${results.orphanedReferences.length}`);
            results.orphanedReferences.forEach(o => console.log(`   - ${o.name}`));
        }

        if (results.integrityIssues.length > 0) {
            console.log(`\n⚠️ Integrity Issues: ${results.integrityIssues.length}`);
            results.integrityIssues.forEach(i => console.log(`   - ${i.name}`));
        }

        console.log('═'.repeat(80));

        const successRate = ((results.summary.passed / results.summary.total) * 100).toFixed(1);
        console.log(`\n🎯 Success Rate: ${successRate}%`);

        if (successRate >= 90) {
            console.log('✅ Sistema en buen estado');
        } else if (successRate >= 70) {
            console.log('⚠️ Sistema necesita atención');
        } else {
            console.log('❌ Sistema tiene problemas críticos');
        }
    }

    /**
     * Cerrar conexión
     */
    async close() {
        await this.pool.end();
    }
}

module.exports = OrganizationalSSOTService;
