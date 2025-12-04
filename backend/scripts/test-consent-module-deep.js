/**
 * ============================================================================
 * TEST CRUD PROFUNDO - Módulo de Consentimientos Biométricos
 * ============================================================================
 *
 * SINGLE SOURCE OF TRUTH (SSOT) Validation:
 * - payroll_countries → Fuente de verdad para regulaciones
 * - company_branches → Fuente de verdad para ubicación
 * - biometric_consents → Registros vinculados a branch/country
 *
 * TESTS:
 * 1. Detección automática de región por país
 * 2. CRUD completo de consentimientos
 * 3. Sincronización branch-consent
 * 4. Invalidación automática por cambio de país
 * 5. Validación de integridad SSOT
 * 6. Historial de cambios
 *
 * @version 1.0.0
 * @date 2025-12-01
 */

const { sequelize } = require('../src/config/database');
const ConsentRegionService = require('../src/services/ConsentRegionService');
const ConsentBranchSyncService = require('../src/services/ConsentBranchSyncService');

// Colores para output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.cyan}${colors.bold}═══ ${msg} ═══${colors.reset}\n`)
};

class ConsentModuleDeepTest {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            tests: []
        };
        this.testData = {
            companyId: null,
            userId: null,
            branches: [],
            countries: []
        };
    }

    async run() {
        console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║     TEST CRUD PROFUNDO - MÓDULO DE CONSENTIMIENTOS BIOMÉTRICOS       ║
║                    SINGLE SOURCE OF TRUTH (SSOT)                     ║
╚══════════════════════════════════════════════════════════════════════╝
`);

        try {
            // Setup
            await this.setup();

            // Tests
            await this.test1_RegionDetection();
            await this.test2_DatabaseSchema();
            await this.test3_BranchCountryRelation();
            await this.test4_ConsentCRUD();
            await this.test5_BranchChangeSimulation();
            await this.test6_SSOTIntegrity();
            await this.test7_ConsentDashboard();
            await this.test8_DependencyValidation();
            await this.test9_OrphanAndDuplicateValidation();

            // Summary
            this.printSummary();

        } catch (error) {
            log.error(`Error fatal: ${error.message}`);
            console.error(error);
        }

        process.exit(this.results.failed > 0 ? 1 : 0);
    }

    async setup() {
        log.section('SETUP - Preparando datos de prueba');

        // Obtener una empresa activa
        const [companies] = await sequelize.query(`
            SELECT company_id, name FROM companies WHERE is_active = true LIMIT 1
        `);

        if (companies.length === 0) {
            throw new Error('No hay empresas activas para testear');
        }

        this.testData.companyId = companies[0].company_id;
        log.info(`Empresa de prueba: ${companies[0].name} (ID: ${companies[0].company_id})`);

        // Obtener un usuario activo
        const [users] = await sequelize.query(`
            SELECT user_id, "firstName", "lastName", branch_id, default_branch_id
            FROM users
            WHERE company_id = :companyId AND is_active = true
            LIMIT 1
        `, { replacements: { companyId: this.testData.companyId } });

        if (users.length > 0) {
            this.testData.userId = users[0].user_id;
            log.info(`Usuario de prueba: ${users[0].firstName} ${users[0].lastName}`);
        } else {
            log.warn('No hay usuarios activos - algunos tests serán limitados');
        }

        // Obtener sucursales
        const [branches] = await sequelize.query(`
            SELECT cb.id, cb.branch_name, cb.country_id, pc.country_code, pc.country_name
            FROM company_branches cb
            LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
            WHERE cb.company_id = :companyId AND cb.is_active = true
        `, { replacements: { companyId: this.testData.companyId } });

        this.testData.branches = branches;
        log.info(`Sucursales encontradas: ${branches.length}`);

        // Obtener países configurados
        const [countries] = await sequelize.query(`
            SELECT id, country_code, country_name, consent_renewal_months
            FROM payroll_countries
            WHERE is_active = true
            ORDER BY country_name
        `);

        this.testData.countries = countries;
        log.info(`Países configurados: ${countries.length}`);
    }

    async test1_RegionDetection() {
        log.section('TEST 1: Detección Automática de Región');

        const testCases = [
            { code: 'ARG', expectedRegion: 'LATAM', expectedMonths: 24 },
            { code: 'DEU', expectedRegion: 'GDPR', expectedMonths: 12 },
            { code: 'USA', expectedRegion: 'USA', expectedMonths: 36 },
            { code: 'ESP', expectedRegion: 'GDPR', expectedMonths: 12 },
            { code: 'BRA', expectedRegion: 'LATAM', expectedMonths: 24 },
            { code: 'CHE', expectedRegion: 'GDPR', expectedMonths: 12 }, // Suiza
            { code: 'JPN', expectedRegion: 'ASIA_STRICT', expectedMonths: 12 },
            { code: 'XXX', expectedRegion: 'GLOBAL', expectedMonths: 24 } // País ficticio
        ];

        for (const tc of testCases) {
            const info = ConsentRegionService.getCountryInfo(tc.code);

            if (info.region === tc.expectedRegion && info.defaultMonths === tc.expectedMonths) {
                log.success(`${tc.code} → ${info.region} (${info.defaultMonths}m) ✓`);
                this.recordTest(`Region_${tc.code}`, true);
            } else {
                log.error(`${tc.code} → Esperado: ${tc.expectedRegion}/${tc.expectedMonths}m, Obtenido: ${info.region}/${info.defaultMonths}m`);
                this.recordTest(`Region_${tc.code}`, false);
            }
        }

        // Test de getAllRegions
        const regions = ConsentRegionService.getAllRegions();
        if (Object.keys(regions).length >= 4) {
            log.success(`Regiones definidas: ${Object.keys(regions).join(', ')}`);
            this.recordTest('AllRegionsDefined', true);
        } else {
            log.error('Faltan regiones en la definición');
            this.recordTest('AllRegionsDefined', false);
        }
    }

    async test2_DatabaseSchema() {
        log.section('TEST 2: Esquema de Base de Datos');

        // Verificar tabla biometric_consents
        const [consentCols] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'biometric_consents'
            ORDER BY ordinal_position
        `);

        const requiredCols = ['id', 'user_id', 'company_id', 'consent_given', 'consent_date', 'expires_at'];
        const optionalCols = ['branch_id', 'country_id', 'country_code', 'invalidated_reason', 'invalidated_at'];

        for (const col of requiredCols) {
            if (consentCols.some(c => c.column_name === col)) {
                log.success(`biometric_consents.${col} existe`);
                this.recordTest(`Schema_${col}`, true);
            } else {
                log.error(`biometric_consents.${col} NO existe`);
                this.recordTest(`Schema_${col}`, false);
            }
        }

        for (const col of optionalCols) {
            if (consentCols.some(c => c.column_name === col)) {
                log.success(`biometric_consents.${col} existe (SSOT)`);
                this.recordTest(`Schema_SSOT_${col}`, true);
            } else {
                log.warn(`biometric_consents.${col} no existe - Ejecutar migración`);
                this.recordTest(`Schema_SSOT_${col}`, false, true);
            }
        }

        // Verificar tabla payroll_countries
        const [countryCols] = await sequelize.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'payroll_countries'
        `);

        if (countryCols.some(c => c.column_name === 'consent_renewal_months')) {
            log.success('payroll_countries.consent_renewal_months existe');
            this.recordTest('Schema_consent_renewal_months', true);
        } else {
            log.warn('payroll_countries.consent_renewal_months no existe - Ejecutar migración');
            this.recordTest('Schema_consent_renewal_months', false, true);
        }
    }

    async test3_BranchCountryRelation() {
        log.section('TEST 3: Relación Sucursal-País (SSOT)');

        if (this.testData.branches.length === 0) {
            log.warn('No hay sucursales para testear');
            return;
        }

        let branchesWithCountry = 0;
        let branchesWithoutCountry = 0;

        for (const branch of this.testData.branches) {
            if (branch.country_id && branch.country_code) {
                log.success(`Sucursal "${branch.name}" → ${branch.country_name} (${branch.country_code})`);
                branchesWithCountry++;
            } else {
                log.warn(`Sucursal "${branch.name}" sin país configurado`);
                branchesWithoutCountry++;
            }
        }

        this.recordTest('BranchesWithCountry', branchesWithCountry > 0);
        if (branchesWithoutCountry > 0) {
            this.recordTest('BranchesWithoutCountry', false, true);
        }

        log.info(`Resumen: ${branchesWithCountry} con país, ${branchesWithoutCountry} sin país`);
    }

    async test4_ConsentCRUD() {
        log.section('TEST 4: CRUD de Consentimientos');

        if (!this.testData.userId) {
            log.warn('No hay usuario para testear CRUD');
            return;
        }

        // READ - Obtener consentimientos del usuario
        const [consents] = await sequelize.query(`
            SELECT id, consent_given, consent_date, expires_at, revoked
            FROM biometric_consents
            WHERE user_id = :userId
            ORDER BY consent_date DESC
        `, { replacements: { userId: this.testData.userId } });

        log.info(`Consentimientos encontrados para usuario: ${consents.length}`);

        if (consents.length > 0) {
            const latest = consents[0];
            log.success(`Último consentimiento: ID ${latest.id}, dado: ${latest.consent_given}, revocado: ${latest.revoked}`);
            this.recordTest('ConsentRead', true);

            // Verificar expires_at
            if (latest.expires_at) {
                const expiresDate = new Date(latest.expires_at);
                const now = new Date();
                const daysUntil = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));
                log.info(`Expira en: ${daysUntil} días (${expiresDate.toLocaleDateString()})`);
                this.recordTest('ConsentHasExpiry', true);
            } else {
                log.warn('Consentimiento sin fecha de expiración');
                this.recordTest('ConsentHasExpiry', false, true);
            }
        } else {
            log.info('Usuario sin consentimientos previos');
            this.recordTest('ConsentRead', true);
        }

        // Verificar estado usando servicio
        const status = await ConsentBranchSyncService.getUserConsentStatus(this.testData.userId);
        if (status.success) {
            log.success(`Estado de consentimiento: válido=${status.has_valid_consent}, necesita_renovar=${status.needs_renewal}`);
            this.recordTest('ConsentStatusService', true);
        } else {
            log.error('Error obteniendo estado de consentimiento');
            this.recordTest('ConsentStatusService', false);
        }
    }

    async test5_BranchChangeSimulation() {
        log.section('TEST 5: Simulación de Cambio de Sucursal');

        if (!this.testData.userId || this.testData.branches.length < 2) {
            log.warn('Se necesitan al menos 2 sucursales para simular cambio');
            return;
        }

        // Buscar dos sucursales con países diferentes
        const branchWithCountry = this.testData.branches.find(b => b.country_code);
        const differentCountryBranch = this.testData.branches.find(b =>
            b.country_code && b.country_code !== branchWithCountry?.country_code
        );

        if (!branchWithCountry) {
            log.warn('No hay sucursales con país configurado');
            return;
        }

        // Simular cambio a la misma sucursal (debería mantener consentimiento)
        const sameResult = await ConsentBranchSyncService.simulateBranchChange(
            this.testData.userId,
            branchWithCountry.id
        );

        if (sameResult.success) {
            log.success(`Simulación misma sucursal: ${sameResult.message}`);
            this.recordTest('SimulateSameBranch', true);
        } else {
            log.error(`Error en simulación: ${sameResult.error}`);
            this.recordTest('SimulateSameBranch', false);
        }

        // Simular cambio a sucursal de diferente país
        if (differentCountryBranch) {
            const diffResult = await ConsentBranchSyncService.simulateBranchChange(
                this.testData.userId,
                differentCountryBranch.id
            );

            if (diffResult.success) {
                log.info(`Simulación cambio de país:`);
                log.info(`  Actual: ${diffResult.currentState.countryName} (${diffResult.currentState.renewalMonths}m)`);
                log.info(`  Nuevo: ${diffResult.newState.countryName} (${diffResult.newState.renewalMonths}m)`);
                log.info(`  Impacto: ${diffResult.impact.consentWillBeInvalidated ? 'SE INVALIDARÁ' : 'Se mantendrá'}`);

                if (diffResult.impact.countryChanges) {
                    log.success('Cambio de país detectado correctamente');
                    this.recordTest('SimulateDiffCountry', true);
                } else {
                    log.warn('No se detectó cambio de país');
                    this.recordTest('SimulateDiffCountry', false, true);
                }
            }
        } else {
            log.warn('No hay sucursales de diferentes países para simular');
        }
    }

    async test6_SSOTIntegrity() {
        log.section('TEST 6: Validación de Integridad SSOT');

        const validation = await ConsentBranchSyncService.validateSSOTIntegrity(this.testData.companyId);

        if (validation.success) {
            if (validation.isValid) {
                log.success(`Integridad SSOT: SIN PROBLEMAS ACTIONABLES`);
                this.recordTest('SSOTIntegrity', true);

                // Mostrar issues INFO como notas (no afectan el resultado)
                if (validation.infoCount > 0) {
                    log.info(`  (${validation.infoCount} notas informativas - limitaciones documentadas)`);
                    for (const issue of validation.issues.filter(i => i.severity === 'INFO')) {
                        log.info(`  🟢 ${issue.type}: ${issue.details?.message || issue.details}`);
                    }
                }
            } else {
                log.warn(`Integridad SSOT: ${validation.issueCount} problemas detectados`);

                for (const issue of validation.issues) {
                    const icon = issue.severity === 'HIGH' ? '🔴' : issue.severity === 'MEDIUM' ? '🟡' : '🟢';
                    log.info(`  ${icon} ${issue.type}: ${issue.count} casos`);

                    if (issue.fix) {
                        log.info(`     Fix: ${issue.fix}`);
                    }
                }

                this.recordTest('SSOTIntegrity', false, true);
            }
        } else {
            log.error('Error validando integridad SSOT');
            this.recordTest('SSOTIntegrity', false);
        }
    }

    async test7_ConsentDashboard() {
        log.section('TEST 7: Dashboard de Consentimientos');

        const dashboard = await ConsentBranchSyncService.getCompanyConsentDashboard(this.testData.companyId);

        if (dashboard.success) {
            log.success(`Dashboard generado: ${dashboard.total} usuarios`);
            log.info('Resumen por estado:');
            log.info(`  ✓ Activos: ${dashboard.summary.active}`);
            log.info(`  ⚠ Por expirar: ${dashboard.summary.expiringSoon}`);
            log.info(`  ✗ Expirados: ${dashboard.summary.expired}`);
            log.info(`  ⏳ Pendientes: ${dashboard.summary.pending}`);
            log.info(`  ○ Sin consentimiento: ${dashboard.summary.noConsent}`);

            this.recordTest('ConsentDashboard', true);
        } else {
            log.error('Error generando dashboard');
            this.recordTest('ConsentDashboard', false);
        }
    }

    async test8_DependencyValidation() {
        log.section('TEST 8: Validación de Dependencias');

        // Verificar que las FK existen
        // NOTA: users.company_id -> companies no tiene FK formal porque companies usa company_id como PK
        const dependencies = [
            { table: 'biometric_consents', fk: 'user_id', references: 'users' },
            { table: 'biometric_consents', fk: 'company_id', references: 'companies' },
            { table: 'company_branches', fk: 'company_id', references: 'companies' },
            { table: 'company_branches', fk: 'country_id', references: 'payroll_countries' }
        ];

        for (const dep of dependencies) {
            const [fks] = await sequelize.query(`
                SELECT tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = :table
                  AND tc.constraint_type = 'FOREIGN KEY'
                  AND kcu.column_name = :column
            `, { replacements: { table: dep.table, column: dep.fk } });

            if (fks.length > 0) {
                log.success(`FK: ${dep.table}.${dep.fk} → ${dep.references}`);
                this.recordTest(`FK_${dep.table}_${dep.fk}`, true);
            } else {
                log.warn(`FK faltante: ${dep.table}.${dep.fk} → ${dep.references}`);
                this.recordTest(`FK_${dep.table}_${dep.fk}`, false, true);
            }
        }

        // Verificar trigger de cambio de sucursal
        const [triggers] = await sequelize.query(`
            SELECT tgname FROM pg_trigger
            WHERE tgname = 'trg_user_branch_change_consent'
        `);

        if (triggers.length > 0) {
            log.success('Trigger trg_user_branch_change_consent existe');
            this.recordTest('TriggerBranchChange', true);
        } else {
            log.warn('Trigger de cambio de sucursal no existe - Ejecutar migración');
            this.recordTest('TriggerBranchChange', false, true);
        }

        // Verificar función de detección de país
        const [functions] = await sequelize.query(`
            SELECT proname FROM pg_proc
            WHERE proname IN ('fn_get_branch_country', 'fn_get_user_consent_status', 'fn_handle_user_branch_change')
        `);

        log.info(`Funciones PostgreSQL encontradas: ${functions.map(f => f.proname).join(', ') || 'ninguna'}`);

        if (functions.length >= 2) {
            log.success('Funciones SSOT instaladas');
            this.recordTest('FunctionsSSOT', true);
        } else {
            log.warn('Faltan funciones SSOT - Ejecutar migración');
            this.recordTest('FunctionsSSOT', false, true);
        }
    }

    async test9_OrphanAndDuplicateValidation() {
        log.section('TEST 9: Validación de Huérfanos y Duplicados (SSOT)');

        let hasOrphans = false;
        let hasDuplicates = false;

        // 1. Consentimientos con user_id que no existe en users
        const [orphanUserConsents] = await sequelize.query(`
            SELECT bc.id, bc.user_id, bc.company_id
            FROM biometric_consents bc
            LEFT JOIN users u ON u.user_id = bc.user_id
            WHERE u.user_id IS NULL
        `);

        if (orphanUserConsents.length > 0) {
            log.error(`Consentimientos huérfanos (user_id inválido): ${orphanUserConsents.length}`);
            orphanUserConsents.slice(0, 5).forEach(o => {
                log.info(`  → ID=${o.id}, user_id=${o.user_id}`);
            });
            hasOrphans = true;
            this.recordTest('OrphanConsents_User', false);
        } else {
            log.success('Sin consentimientos huérfanos por user_id');
            this.recordTest('OrphanConsents_User', true);
        }

        // 2. Consentimientos con company_id que no existe en companies
        const [orphanCompanyConsents] = await sequelize.query(`
            SELECT bc.id, bc.user_id, bc.company_id
            FROM biometric_consents bc
            LEFT JOIN companies c ON c.company_id = bc.company_id
            WHERE c.company_id IS NULL
        `);

        if (orphanCompanyConsents.length > 0) {
            log.error(`Consentimientos huérfanos (company_id inválido): ${orphanCompanyConsents.length}`);
            orphanCompanyConsents.slice(0, 5).forEach(o => {
                log.info(`  → ID=${o.id}, company_id=${o.company_id}`);
            });
            hasOrphans = true;
            this.recordTest('OrphanConsents_Company', false);
        } else {
            log.success('Sin consentimientos huérfanos por company_id');
            this.recordTest('OrphanConsents_Company', true);
        }

        // 3. Sucursales con company_id que no existe en companies
        const [orphanBranches] = await sequelize.query(`
            SELECT cb.id, cb.branch_name, cb.company_id
            FROM company_branches cb
            LEFT JOIN companies c ON c.company_id = cb.company_id
            WHERE c.company_id IS NULL
        `);

        if (orphanBranches.length > 0) {
            log.error(`Sucursales huérfanas (company_id inválido): ${orphanBranches.length}`);
            orphanBranches.slice(0, 5).forEach(o => {
                log.info(`  → ID=${o.id}, nombre=${o.branch_name}`);
            });
            hasOrphans = true;
            this.recordTest('OrphanBranches', false);
        } else {
            log.success('Sin sucursales huérfanas');
            this.recordTest('OrphanBranches', true);
        }

        // 4. Sucursales con country_id que no existe en payroll_countries
        const [branchesInvalidCountry] = await sequelize.query(`
            SELECT cb.id, cb.branch_name, cb.country_id
            FROM company_branches cb
            WHERE cb.country_id IS NOT NULL
              AND cb.country_id NOT IN (SELECT id FROM payroll_countries)
        `);

        if (branchesInvalidCountry.length > 0) {
            log.error(`Sucursales con country_id inválido: ${branchesInvalidCountry.length}`);
            branchesInvalidCountry.slice(0, 5).forEach(o => {
                log.info(`  → ID=${o.id}, nombre=${o.branch_name}, country_id=${o.country_id}`);
            });
            hasOrphans = true;
            this.recordTest('BranchesInvalidCountry', false);
        } else {
            log.success('Sucursales con country_id válido o NULL');
            this.recordTest('BranchesInvalidCountry', true);
        }

        // 5. Duplicados: Múltiples consentimientos ACTIVOS para mismo user+company
        const [duplicateActiveConsents] = await sequelize.query(`
            SELECT user_id, company_id, COUNT(*) as count
            FROM biometric_consents
            WHERE consent_given = TRUE
              AND (revoked IS NULL OR revoked = FALSE)
              AND (invalidated_at IS NULL)
              AND (expires_at IS NULL OR expires_at > NOW())
            GROUP BY user_id, company_id
            HAVING COUNT(*) > 1
        `);

        if (duplicateActiveConsents.length > 0) {
            log.error(`Usuarios con múltiples consentimientos ACTIVOS: ${duplicateActiveConsents.length}`);
            duplicateActiveConsents.slice(0, 5).forEach(d => {
                log.info(`  → user_id=${d.user_id}, company_id=${d.company_id}, count=${d.count}`);
            });
            hasDuplicates = true;
            this.recordTest('DuplicateActiveConsents', false);
        } else {
            log.success('Sin duplicados de consentimientos activos');
            this.recordTest('DuplicateActiveConsents', true);
        }

        // 6. Sucursales duplicadas (mismo branch_code en misma empresa)
        const [duplicateBranches] = await sequelize.query(`
            SELECT company_id, branch_code, COUNT(*) as count
            FROM company_branches
            WHERE branch_code IS NOT NULL
            GROUP BY company_id, branch_code
            HAVING COUNT(*) > 1
        `);

        if (duplicateBranches.length > 0) {
            log.error(`Sucursales con branch_code duplicado: ${duplicateBranches.length}`);
            duplicateBranches.slice(0, 5).forEach(d => {
                log.info(`  → company_id=${d.company_id}, branch_code=${d.branch_code}, count=${d.count}`);
            });
            hasDuplicates = true;
            this.recordTest('DuplicateBranches', false);
        } else {
            log.success('Sin sucursales con branch_code duplicado');
            this.recordTest('DuplicateBranches', true);
        }

        // 7. Países duplicados por country_code
        const [duplicateCountries] = await sequelize.query(`
            SELECT country_code, COUNT(*) as count
            FROM payroll_countries
            WHERE country_code IS NOT NULL
            GROUP BY country_code
            HAVING COUNT(*) > 1
        `);

        if (duplicateCountries.length > 0) {
            log.error(`Países con country_code duplicado: ${duplicateCountries.length}`);
            duplicateCountries.slice(0, 5).forEach(d => {
                log.info(`  → country_code=${d.country_code}, count=${d.count}`);
            });
            hasDuplicates = true;
            this.recordTest('DuplicateCountries', false);
        } else {
            log.success('Sin países con country_code duplicado');
            this.recordTest('DuplicateCountries', true);
        }

        // Resumen
        if (!hasOrphans && !hasDuplicates) {
            log.success('✓ INTEGRIDAD DE DATOS: Sin huérfanos ni duplicados');
        } else {
            if (hasOrphans) log.warn('⚠ Se detectaron registros huérfanos - Requiere limpieza');
            if (hasDuplicates) log.warn('⚠ Se detectaron duplicados - Requiere deduplicación');
        }
    }

    recordTest(name, passed, isWarning = false) {
        if (passed) {
            this.results.passed++;
        } else if (isWarning) {
            this.results.warnings++;
        } else {
            this.results.failed++;
        }

        this.results.tests.push({ name, passed, isWarning });
    }

    printSummary() {
        log.section('RESUMEN DE TESTS');

        const total = this.results.passed + this.results.failed + this.results.warnings;
        const passRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;

        console.log(`
┌─────────────────────────────────────────────────────────────┐
│  RESULTADOS                                                 │
├─────────────────────────────────────────────────────────────┤
│  ${colors.green}✓ Pasados:${colors.reset}    ${String(this.results.passed).padEnd(5)}                                  │
│  ${colors.yellow}⚠ Warnings:${colors.reset}   ${String(this.results.warnings).padEnd(5)}  (requieren migración)         │
│  ${colors.red}✗ Fallados:${colors.reset}   ${String(this.results.failed).padEnd(5)}                                  │
├─────────────────────────────────────────────────────────────┤
│  Total:        ${String(total).padEnd(5)}                                  │
│  Tasa éxito:   ${passRate}%                                       │
└─────────────────────────────────────────────────────────────┘
`);

        if (this.results.warnings > 0) {
            console.log(`${colors.yellow}⚠ Para resolver warnings, ejecutar:${colors.reset}`);
            console.log(`  psql -d sistema_asistencia -f migrations/20251201_consent_branch_sync_trigger.sql`);
            console.log(`  psql -d sistema_asistencia -f migrations/20251201_add_consent_renewal_months.sql`);
        }

        if (this.results.failed > 0) {
            console.log(`\n${colors.red}✗ Tests fallados:${colors.reset}`);
            this.results.tests
                .filter(t => !t.passed && !t.isWarning)
                .forEach(t => console.log(`  - ${t.name}`));
        }

        console.log(`
═══════════════════════════════════════════════════════════════════
SSOT (Single Source of Truth) para Consentimientos:

  1. payroll_countries.consent_renewal_months → Período por país
  2. company_branches.country_id → País de la sucursal
  3. biometric_consents.branch_id/country_id → Tracking de ubicación

  Cuando un usuario cambia de sucursal a otro país:
  → El trigger trg_user_branch_change_consent detecta el cambio
  → Si el país cambia, el consentimiento se INVALIDA automáticamente
  → El usuario debe dar nuevo consentimiento según regulaciones del nuevo país
═══════════════════════════════════════════════════════════════════
`);
    }
}

// Ejecutar tests
const test = new ConsentModuleDeepTest();
test.run();
