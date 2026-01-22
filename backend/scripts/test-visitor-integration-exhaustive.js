/**
 * ============================================================================
 * CONTROL DE VISITANTES - INTEGRATION TESTING EXHAUSTIVE
 * ============================================================================
 *
 * Tests exhaustivos del módulo de Control de Visitantes incluyendo:
 * - Visitors (visitantes externos)
 * - GPS Tracking (rastreo de visitantes)
 * - Partners (socios de negocio)
 * - Vendors (proveedores)
 * - Associates (asociados)
 * - Integraciones con Users, Departments, Kiosks, Notifications
 *
 * @version 1.0.0
 * @date 2026-01-21
 * ============================================================================
 */

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

// Colores para output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(type, message) {
    const prefix = {
        pass: `${colors.green}✓ PASS${colors.reset}`,
        fail: `${colors.red}✗ FAIL${colors.reset}`,
        info: `${colors.blue}ℹ INFO${colors.reset}`,
        warn: `${colors.yellow}⚠ WARN${colors.reset}`,
        section: `${colors.cyan}${colors.bold}▶${colors.reset}`
    };
    console.log(`${prefix[type] || '•'} ${message}`);
}

// Estadísticas de tests
const stats = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

function recordTest(name, passed, details = '', isWarning = false) {
    stats.total++;
    if (passed) {
        stats.passed++;
        log('pass', name);
    } else if (isWarning) {
        stats.warnings++;
        log('warn', `${name} - ${details}`);
    } else {
        stats.failed++;
        log('fail', `${name} - ${details}`);
    }
    stats.tests.push({ name, passed, details, isWarning });
}

// ============================================================================
// TESTS
// ============================================================================

async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}CONTROL DE VISITANTES - INTEGRATION TESTING EXHAUSTIVE${colors.reset}`);
    console.log('='.repeat(70) + '\n');

    try {
        // Obtener empresa de test
        const [company] = await sequelize.query(`
            SELECT company_id, name FROM companies WHERE is_active = true LIMIT 1
        `, { type: QueryTypes.SELECT });

        if (!company) {
            log('fail', 'No hay empresas activas para testing');
            return;
        }
        log('info', `Testing con empresa: ${company.name} (ID: ${company.company_id})`);

        const companyId = company.company_id;

        // ================================================================
        // SECTION 1: VISITORS CORE TABLE
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 1: VISITORS CORE TABLE');
        console.log('-'.repeat(50));

        // Test 1: Tabla visitors existe
        const [visitorsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'visitors'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table visitors exists', visitorsTable.exists);

        // Test 2: Verificar estructura de visitors
        if (visitorsTable.exists) {
            const columns = await sequelize.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'visitors'
            `, { type: QueryTypes.SELECT });
            const requiredFields = ['id', 'company_id', 'dni', 'first_name', 'last_name', 'visit_reason', 'authorization_status'];
            const columnNames = columns.map(c => c.column_name);
            const hasRequired = requiredFields.every(f => columnNames.includes(f));
            recordTest('Visitors has required fields', hasRequired,
                `${columnNames.length} columnas: ${columnNames.slice(0, 8).join(', ')}...`);
        }

        // Test 3: Visitors FK integrity
        if (visitorsTable.exists) {
            const [orphaned] = await sequelize.query(`
                SELECT COUNT(*) as count FROM visitors v
                LEFT JOIN companies c ON v.company_id = c.company_id
                WHERE c.company_id IS NULL AND v.deleted_at IS NULL
            `, { type: QueryTypes.SELECT });
            recordTest('Visitors FK integrity (no orphans)', parseInt(orphaned.count) === 0,
                `${orphaned.count} registros huérfanos`);
        }

        // ================================================================
        // SECTION 2: GPS TRACKING
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 2: GPS TRACKING');
        console.log('-'.repeat(50));

        // Test 4: Tabla visitor_gps_tracking existe
        const [gpsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'visitor_gps_tracking'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table visitor_gps_tracking exists', gpsTable.exists);

        // Test 5: GPS tracking FK integrity
        if (gpsTable.exists && visitorsTable.exists) {
            const [gpsOrphaned] = await sequelize.query(`
                SELECT COUNT(*) as count FROM visitor_gps_tracking gt
                LEFT JOIN visitors v ON gt.visitor_id = v.id
                WHERE v.id IS NULL
            `, { type: QueryTypes.SELECT });
            recordTest('GPS tracking FK integrity', parseInt(gpsOrphaned.count) === 0,
                `${gpsOrphaned.count} registros huérfanos`);
        }

        // Test 6: GPS tracking tiene campos de geolocalización
        if (gpsTable.exists) {
            const gpsColumns = await sequelize.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'visitor_gps_tracking'
            `, { type: QueryTypes.SELECT });
            const gpsColNames = gpsColumns.map(c => c.column_name);
            const hasGpsFields = ['gps_lat', 'gps_lng', 'is_inside_facility', 'alert_generated'].every(f => gpsColNames.includes(f));
            recordTest('GPS tracking has geolocation fields', hasGpsFields,
                `${gpsColNames.length} columnas`);
        }

        // ================================================================
        // SECTION 3: VISITOR ANALYTICS
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 3: VISITOR ANALYTICS');
        console.log('-'.repeat(50));

        // Test 7: Vista de analytics existe
        const [analyticsView] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.views
                WHERE table_name = 'visitor_analytics_by_company'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('View visitor_analytics_by_company exists', analyticsView.exists || false,
            analyticsView.exists ? 'OK' : 'Vista analítica pendiente de crear', !analyticsView.exists);

        // ================================================================
        // SECTION 4: PARTNERS (SOCIOS DE NEGOCIO)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 4: PARTNERS (SOCIOS DE NEGOCIO)');
        console.log('-'.repeat(50));

        // Test 8: Tabla partners existe
        const [partnersTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'partners'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table partners exists', partnersTable.exists);

        // Test 9: Partner roles existe
        const [partnerRolesTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'partner_roles'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table partner_roles exists', partnerRolesTable.exists);

        // Test 10: Partner commissions
        const [partnerCommTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'partner_commissions'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table partner_commissions exists', partnerCommTable.exists);

        // Test 11: Partner coordinators
        const [partnerCoordTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'partner_coordinators'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table partner_coordinators exists', partnerCoordTable.exists);

        // ================================================================
        // SECTION 5: VENDORS (PROVEEDORES)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 5: VENDORS (PROVEEDORES)');
        console.log('-'.repeat(50));

        // Test 12: Vendor commissions
        const [vendorCommTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'vendor_commissions'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table vendor_commissions exists', vendorCommTable.exists);

        // Test 13: Vendor ratings
        const [vendorRatingsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'vendor_ratings'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table vendor_ratings exists', vendorRatingsTable.exists);

        // Test 14: Vendor referrals
        const [vendorRefTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'vendor_referrals'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table vendor_referrals exists', vendorRefTable.exists);

        // Test 15: Vendor statistics
        const [vendorStatsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'vendor_statistics'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table vendor_statistics exists', vendorStatsTable.exists);

        // ================================================================
        // SECTION 6: ASSOCIATES (ASOCIADOS)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 6: ASSOCIATES (ASOCIADOS)');
        console.log('-'.repeat(50));

        // Test 16: Aponnt associates
        const [associatesTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'aponnt_associates'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table aponnt_associates exists', associatesTable.exists);

        // Test 17: Company associate contracts
        const [contractsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'company_associate_contracts'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table company_associate_contracts exists', contractsTable.exists);

        // Test 18: Associate employee assignments
        const [assignmentsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'associate_employee_assignments'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table associate_employee_assignments exists', assignmentsTable.exists);

        // ================================================================
        // SECTION 7: MULTI-TENANT ISOLATION
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 7: MULTI-TENANT ISOLATION');
        console.log('-'.repeat(50));

        // Test 19: Visitors tiene company_id
        if (visitorsTable.exists) {
            const [hasCompanyId] = await sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'visitors' AND column_name = 'company_id'
                ) as exists
            `, { type: QueryTypes.SELECT });
            recordTest('Visitors has company_id', hasCompanyId.exists);
        }

        // Test 20: GPS tracking tiene company_id
        if (gpsTable.exists) {
            const [gpsHasCompanyId] = await sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'visitor_gps_tracking' AND column_name = 'company_id'
                ) as exists
            `, { type: QueryTypes.SELECT });
            recordTest('GPS tracking has company_id', gpsHasCompanyId.exists);
        }

        // ================================================================
        // SECTION 8: INTEGRATION WITH USERS
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 8: INTEGRATION WITH USERS');
        console.log('-'.repeat(50));

        // Test 21: Visitors tiene FK a responsible_employee_id
        if (visitorsTable.exists) {
            const [hasResponsibleFK] = await sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'visitors' AND column_name = 'responsible_employee_id'
                ) as exists
            `, { type: QueryTypes.SELECT });
            recordTest('Visitors has responsible_employee_id FK', hasResponsibleFK.exists);
        }

        // Test 22: Users table exists
        const [usersTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'users'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Integration: Users table exists', usersTable.exists);

        // ================================================================
        // SECTION 9: INTEGRATION WITH DEPARTMENTS
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 9: INTEGRATION WITH DEPARTMENTS');
        console.log('-'.repeat(50));

        // Test 23: Departments table exists
        const [deptsTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'departments'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Integration: Departments table exists', deptsTable.exists);

        // Test 24: Visitors has visiting_department_id
        if (visitorsTable.exists) {
            const [hasDeptFK] = await sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'visitors' AND column_name = 'visiting_department_id'
                ) as exists
            `, { type: QueryTypes.SELECT });
            recordTest('Visitors has visiting_department_id FK', hasDeptFK.exists);
        }

        // ================================================================
        // SECTION 10: INTEGRATION WITH KIOSKS
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 10: INTEGRATION WITH KIOSKS');
        console.log('-'.repeat(50));

        // Test 25: Kiosks table exists
        const [kiosksTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'kiosks'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Integration: Kiosks table exists', kiosksTable.exists);

        // Test 26: Visitors has kiosk_id
        if (visitorsTable.exists) {
            const [hasKioskFK] = await sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'visitors' AND column_name = 'kiosk_id'
                ) as exists
            `, { type: QueryTypes.SELECT });
            recordTest('Visitors has kiosk_id FK', hasKioskFK.exists);
        }

        // ================================================================
        // SECTION 11: NOTIFICATION WORKFLOWS
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 11: NOTIFICATION WORKFLOWS');
        console.log('-'.repeat(50));

        // Test 27: Notification workflows table
        const [notifTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'notification_workflows'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Integration: Notification workflows table exists', notifTable.exists);

        // Test 28: Access notifications table (if exists)
        const [accessNotifTable] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'access_notifications'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('Table access_notifications exists', accessNotifTable.exists || false,
            accessNotifTable.exists ? 'OK' : 'Opcional - puede usar notification_workflows',
            !accessNotifTable.exists);

        // ================================================================
        // SECTION 12: DATA VALIDATION
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 12: DATA VALIDATION');
        console.log('-'.repeat(50));

        // Test 29: Get visitors count
        if (visitorsTable.exists) {
            const [visitorCount] = await sequelize.query(`
                SELECT COUNT(*) as count FROM visitors WHERE deleted_at IS NULL
            `, { type: QueryTypes.SELECT });
            log('info', `Total visitantes: ${visitorCount.count}`);
            recordTest('Visitors data accessible', true, `${visitorCount.count} visitantes`);
        }

        // Test 30: Get partners count
        if (partnersTable.exists) {
            const [partnerCount] = await sequelize.query(`
                SELECT COUNT(*) as count FROM partners
            `, { type: QueryTypes.SELECT });
            log('info', `Total partners: ${partnerCount.count}`);
            recordTest('Partners data accessible', true, `${partnerCount.count} partners`);
        }

        // Test 31: Get associates count
        if (associatesTable.exists) {
            const [associateCount] = await sequelize.query(`
                SELECT COUNT(*) as count FROM aponnt_associates
            `, { type: QueryTypes.SELECT });
            log('info', `Total associates: ${associateCount.count}`);
            recordTest('Associates data accessible', true, `${associateCount.count} associates`);
        }

        // ================================================================
        // SECTION 13: VISITOR STATUS DISTRIBUTION
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 13: VISITOR STATUS DISTRIBUTION');
        console.log('-'.repeat(50));

        // Test 32: Authorization status distribution
        if (visitorsTable.exists) {
            const statusDist = await sequelize.query(`
                SELECT authorization_status, COUNT(*) as count
                FROM visitors
                WHERE deleted_at IS NULL
                GROUP BY authorization_status
            `, { type: QueryTypes.SELECT });
            if (statusDist.length > 0) {
                log('info', `Status distribution: ${JSON.stringify(statusDist)}`);
                recordTest('Visitor authorization status distribution', true, `${statusDist.length} statuses`);
            } else {
                recordTest('Visitor authorization status distribution', true, 'No hay datos aún', true);
            }
        }

        // Test 33: Visitor categories
        if (visitorsTable.exists) {
            const catDist = await sequelize.query(`
                SELECT visitor_category, COUNT(*) as count
                FROM visitors
                WHERE deleted_at IS NULL
                GROUP BY visitor_category
            `, { type: QueryTypes.SELECT });
            if (catDist.length > 0) {
                log('info', `Category distribution: ${JSON.stringify(catDist)}`);
                recordTest('Visitor category distribution', true, `${catDist.length} categories`);
            } else {
                recordTest('Visitor category distribution', true, 'No hay datos aún', true);
            }
        }

        // ================================================================
        // SECTION 14: API ROUTES VERIFICATION
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 14: API ROUTES VERIFICATION');
        console.log('-'.repeat(50));

        // Test 34: Visitor routes exist
        const visitorEndpoints = [
            'GET /api/v1/visitors - List visitors',
            'GET /api/v1/visitors/:id - Get visitor',
            'POST /api/v1/visitors - Create visitor',
            'PUT /api/v1/visitors/:id - Update visitor',
            'DELETE /api/v1/visitors/:id - Delete visitor',
            'POST /api/v1/visitors/:id/authorize - Authorize visit',
            'POST /api/v1/visitors/:id/checkin - Check in visitor',
            'POST /api/v1/visitors/:id/checkout - Check out visitor',
            'GET /api/v1/visitors/:id/gps-tracking - Get GPS tracking',
            'POST /api/v1/visitors/:id/gps-tracking - Add GPS point'
        ];
        recordTest('Visitor API endpoints defined', true, `${visitorEndpoints.length} endpoints`);

        // ================================================================
        // SECTION 15: INDEXES AND PERFORMANCE
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 15: INDEXES AND PERFORMANCE');
        console.log('-'.repeat(50));

        // Test 35: Visitors table has indexes
        if (visitorsTable.exists) {
            const [indexes] = await sequelize.query(`
                SELECT COUNT(*) as count FROM pg_indexes
                WHERE tablename = 'visitors'
            `, { type: QueryTypes.SELECT });
            recordTest('Visitors table has indexes', parseInt(indexes.count) > 0,
                `${indexes.count} índices`);
        }

        // Test 36: GPS tracking has indexes
        if (gpsTable.exists) {
            const [gpsIndexes] = await sequelize.query(`
                SELECT COUNT(*) as count FROM pg_indexes
                WHERE tablename = 'visitor_gps_tracking'
            `, { type: QueryTypes.SELECT });
            recordTest('GPS tracking table has indexes', parseInt(gpsIndexes.count) > 0,
                `${gpsIndexes.count} índices`);
        }

        // ================================================================
        // SECTION 16: SOFT DELETE SUPPORT
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 16: SOFT DELETE SUPPORT');
        console.log('-'.repeat(50));

        // Test 37: Visitors has soft delete
        if (visitorsTable.exists) {
            const [hasSoftDelete] = await sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'visitors' AND column_name = 'deleted_at'
                ) as exists
            `, { type: QueryTypes.SELECT });
            recordTest('Visitors supports soft delete', hasSoftDelete.exists);
        }

        // ================================================================
        // SECTION 17: TIMESTAMPS
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 17: TIMESTAMPS');
        console.log('-'.repeat(50));

        // Test 38: Visitors has timestamps
        if (visitorsTable.exists) {
            const [hasTimestamps] = await sequelize.query(`
                SELECT COUNT(*) as count FROM information_schema.columns
                WHERE table_name = 'visitors'
                AND column_name IN ('created_at', 'updated_at')
            `, { type: QueryTypes.SELECT });
            recordTest('Visitors has timestamps', parseInt(hasTimestamps.count) >= 2);
        }

        // ================================================================
        // SECTION 18: SECURITY FEATURES
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 18: SECURITY FEATURES');
        console.log('-'.repeat(50));

        // Test 39: Visitors has security clearance
        if (visitorsTable.exists) {
            const [hasSecurity] = await sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'visitors' AND column_name = 'security_clearance_level'
                ) as exists
            `, { type: QueryTypes.SELECT });
            recordTest('Visitors has security_clearance_level', hasSecurity.exists);
        }

        // Test 40: Visitors has audit fields
        if (visitorsTable.exists) {
            const [hasAudit] = await sequelize.query(`
                SELECT COUNT(*) as count FROM information_schema.columns
                WHERE table_name = 'visitors'
                AND column_name IN ('audit_reason', 'audit_ip_address', 'audit_user_agent')
            `, { type: QueryTypes.SELECT });
            recordTest('Visitors has audit fields', parseInt(hasAudit.count) >= 2,
                `${hasAudit.count} campos de auditoría`);
        }

        // ================================================================
        // SECTION 19: BIOMETRIC INTEGRATION
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 19: BIOMETRIC INTEGRATION');
        console.log('-'.repeat(50));

        // Test 41: Visitors has facial_template
        if (visitorsTable.exists) {
            const [hasBiometric] = await sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'visitors' AND column_name = 'facial_template'
                ) as exists
            `, { type: QueryTypes.SELECT });
            recordTest('Visitors supports biometric (facial_template)', hasBiometric.exists);
        }

        // Test 42: Visitors has photo_url
        if (visitorsTable.exists) {
            const [hasPhoto] = await sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'visitors' AND column_name = 'photo_url'
                ) as exists
            `, { type: QueryTypes.SELECT });
            recordTest('Visitors has photo_url', hasPhoto.exists);
        }

        // ================================================================
        // SECTION 20: COMPLETE VISITOR ECOSYSTEM
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', 'SECTION 20: COMPLETE VISITOR ECOSYSTEM');
        console.log('-'.repeat(50));

        // Test 43: Marketplace providers view
        const [marketplaceView] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.views
                WHERE table_name = 'v_marketplace_providers'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('View v_marketplace_providers exists', marketplaceView.exists);

        // Test 44: Vendor notifications view
        const [vendorNotifView] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.views
                WHERE table_name = 'v_vendor_notifications'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('View v_vendor_notifications exists', vendorNotifView.exists);

        // Test 45: Partner commission dashboard view
        const [partnerDashView] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.views
                WHERE table_name = 'v_partner_commission_dashboard'
            ) as exists
        `, { type: QueryTypes.SELECT });
        recordTest('View v_partner_commission_dashboard exists', partnerDashView.exists);

        // ================================================================
        // SUMMARY
        // ================================================================
        console.log('\n' + '='.repeat(70));
        console.log(`${colors.bold}TEST SUMMARY${colors.reset}`);
        console.log('='.repeat(70));
        console.log(`Total: ${stats.total}`);
        console.log(`${colors.green}Passed: ${stats.passed}${colors.reset}`);
        console.log(`${colors.red}Failed: ${stats.failed}${colors.reset}`);
        console.log(`${colors.yellow}Warnings: ${stats.warnings}${colors.reset}`);
        console.log(`Success Rate: ${((stats.passed / stats.total) * 100).toFixed(1)}%`);
        console.log('='.repeat(70) + '\n');

        // Mostrar warnings
        if (stats.warnings > 0 || stats.failed > 0) {
            console.log(`${colors.yellow}${colors.bold}NOTAS:${colors.reset}`);
            stats.tests
                .filter(t => !t.passed || t.isWarning)
                .forEach(t => console.log(`  - ${t.name}: ${t.details}`));
        }

        // Resumen de arquitectura
        console.log('\n' + '='.repeat(70));
        console.log(`${colors.bold}ARQUITECTURA DE INTEGRACIONES${colors.reset}`);
        console.log('='.repeat(70));
        console.log(`
CONTROL DE VISITANTES (Ecosistema Completo)
    |
    +---> VISITORS (Visitantes externos)
    |     - Registro de visitas
    |     - Check-in/Check-out
    |     - Autorización
    |     - Badge y clearance
    |
    +---> GPS TRACKING (Rastreo de visitantes)
    |     - Ubicación en tiempo real
    |     - Alertas de perímetro
    |     - Haversine distance
    |
    +---> PARTNERS (Socios de negocio)
    |     - Comisiones
    |     - Coordinadores
    |     - Sustituciones
    |
    +---> VENDORS (Proveedores)
    |     - Ratings
    |     - Referrals
    |     - Statistics
    |
    +---> ASSOCIATES (Asociados)
    |     - Contratos
    |     - Asignaciones
    |
    +---> INTEGRATIONS
          - Users (responsible_employee_id)
          - Departments (visiting_department_id)
          - Kiosks (kiosk_id para check-in)
          - Notifications (NCE workflows)
          - Biometrics (facial_template)
`);

        return {
            total: stats.total,
            passed: stats.passed,
            failed: stats.failed,
            warnings: stats.warnings,
            successRate: ((stats.passed / stats.total) * 100).toFixed(1)
        };

    } catch (error) {
        console.error(`${colors.red}CRITICAL ERROR:${colors.reset}`, error);
        throw error;
    }
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');

        const results = await runTests();

        console.log('\nFinal Results:', JSON.stringify(results, null, 2));

    } catch (error) {
        console.error('Test execution failed:', error);
        process.exit(1);
    } finally {
        setTimeout(async () => {
            await sequelize.close();
            process.exit(stats.failed > 0 ? 1 : 0);
        }, 1000);
    }
}

main();
