/**
 * ARSENAL DE TESTING - EJECUCION MAXIMA POTENCIA
 * Ejecuta todos los sistemas de testing del proyecto
 */

const path = require('path');
const fs = require('fs');

console.log('='.repeat(70));
console.log('  ARSENAL DE TESTING - MAXIMA POTENCIA');
console.log('  Timestamp:', new Date().toISOString());
console.log('='.repeat(70));

const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

function logTest(name, status, details = '') {
    const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
    console.log(`  ${icon} ${name}: ${status} ${details}`);
    results.tests.push({ name, status, details });
    if (status === 'PASS') results.passed++;
    else if (status === 'FAIL') results.failed++;
    else results.warnings++;
}

async function runTests() {
    // ============================================================
    // TEST 1: SYSTEM REGISTRY
    // ============================================================
    console.log('\n[1] SYSTEM REGISTRY');
    console.log('-'.repeat(50));

    try {
        const SystemRegistry = require('../src/auditor/registry/SystemRegistry');

        // Mock database object (vacío - para testing sin BD)
        const mockDb = {};
        const registry = new SystemRegistry(mockDb);

        // Cargar desde archivo JSON (bypass de BD)
        await registry.loadFromFile();

        // Check if modules loaded
        const modules = registry.getAllModules ? registry.getAllModules() :
                       Array.from(registry.modules.values());
        const modCount = modules.length;

        if (modCount >= 40) {
            logTest('Module Count', 'PASS', `${modCount} modules registered`);
        } else if (modCount > 0) {
            logTest('Module Count', 'WARN', `Only ${modCount} modules (expected 40+)`);
        } else {
            logTest('Module Count', 'FAIL', 'No modules found');
        }

        // Check categories
        const categories = {};
        Object.entries(modules).forEach(([key, mod]) => {
            const cat = mod.category || 'uncategorized';
            categories[cat] = (categories[cat] || 0) + 1;
        });

        const catCount = Object.keys(categories).length;
        if (catCount >= 5) {
            logTest('Categories', 'PASS', `${catCount} categories found`);
        } else {
            logTest('Categories', 'WARN', `Only ${catCount} categories`);
        }

        // Print categories
        console.log('  Categories breakdown:');
        Object.entries(categories).sort((a,b) => b[1]-a[1]).forEach(([cat, count]) => {
            console.log(`    - ${cat}: ${count}`);
        });

    } catch (err) {
        logTest('SystemRegistry Load', 'FAIL', err.message);
    }

    // ============================================================
    // TEST 2: AUDITOR ENGINE
    // ============================================================
    console.log('\n[2] AUDITOR ENGINE');
    console.log('-'.repeat(50));

    try {
        const AuditorEngine = require('../src/auditor/core/AuditorEngine');

        // Mock database con AuditLog para testing sin BD
        const mockAuditLog = {
            findAll: async () => [],
            create: async (data) => data,
            update: async () => [1],
            getExecutionSummary: async () => ({ total: 0, passed: 0, failed: 0, warnings: 0 })
        };
        const mockDb = { AuditLog: mockAuditLog };

        const auditor = new AuditorEngine(mockDb);

        logTest('Engine Load', 'PASS', 'AuditorEngine instantiated');

        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(auditor))
            .filter(m => m !== 'constructor' && typeof auditor[m] === 'function');

        logTest('Methods Available', 'PASS', `${methods.length} methods: ${methods.slice(0,5).join(', ')}...`);

    } catch (err) {
        logTest('AuditorEngine Load', 'FAIL', err.message);
    }

    // ============================================================
    // TEST 3: PHASE 4 TEST ORCHESTRATOR
    // ============================================================
    console.log('\n[3] PHASE 4 TEST ORCHESTRATOR');
    console.log('-'.repeat(50));

    try {
        const Phase4Orch = require('../src/auditor/core/Phase4TestOrchestrator');
        logTest('Orchestrator Load', 'PASS', 'Phase4TestOrchestrator loaded');

        if (typeof Phase4Orch === 'function' || typeof Phase4Orch.runAllTests === 'function') {
            logTest('Orchestrator Callable', 'PASS', 'Can be executed');
        }
    } catch (err) {
        logTest('Phase4 Orchestrator', 'FAIL', err.message);
    }

    // ============================================================
    // TEST 4: BRAIN INTELLIGENT TEST SERVICE
    // ============================================================
    console.log('\n[4] BRAIN INTELLIGENT TEST SERVICE');
    console.log('-'.repeat(50));

    try {
        const BrainTest = require('../src/services/BrainIntelligentTestService');
        logTest('Brain Service Load', 'PASS', 'BrainIntelligentTestService loaded');

        if (BrainTest) {
            const props = Object.keys(BrainTest);
            logTest('Brain Properties', 'PASS', `${props.length} properties/methods`);
        }
    } catch (err) {
        logTest('Brain Test Service', 'FAIL', err.message);
    }

    // ============================================================
    // TEST 5: ENGINEERING METADATA
    // ============================================================
    console.log('\n[5] ENGINEERING METADATA');
    console.log('-'.repeat(50));

    try {
        const metadata = require('../engineering-metadata');

        if (metadata.modules) {
            const modCount = Object.keys(metadata.modules).length;
            logTest('Modules in Metadata', 'PASS', `${modCount} modules tracked`);
        }

        if (metadata.roadmap) {
            const phases = Object.keys(metadata.roadmap).length;
            logTest('Roadmap Phases', 'PASS', `${phases} phases defined`);
        }

        if (metadata.project) {
            logTest('Project Info', 'PASS', `${metadata.project.name || 'Project defined'}`);
        }

    } catch (err) {
        logTest('Engineering Metadata', 'FAIL', err.message);
    }

    // ============================================================
    // TEST 6: KEY SERVICES
    // ============================================================
    console.log('\n[6] KEY SERVICES');
    console.log('-'.repeat(50));

    const services = [
        { name: 'AssistantService', path: '../src/services/AssistantService' },
        { name: 'NotificationUnifiedService', path: '../src/services/NotificationUnifiedService' },
        { name: 'DocumentExpirationNotificationService', path: '../src/services/DocumentExpirationNotificationService' },
    ];

    for (const svc of services) {
        try {
            require(svc.path);
            logTest(svc.name, 'PASS', 'Loaded successfully');
        } catch (err) {
            logTest(svc.name, 'FAIL', err.message.substring(0, 50));
        }
    }

    // ============================================================
    // TEST 7: ROUTES
    // ============================================================
    console.log('\n[7] API ROUTES');
    console.log('-'.repeat(50));

    const routes = [
        { name: 'auditorRoutes', path: '../src/routes/auditorRoutes' },
        { name: 'engineeringRoutes', path: '../src/routes/engineeringRoutes' },
        { name: 'criticalPathRoutes', path: '../src/routes/criticalPathRoutes' },
    ];

    for (const route of routes) {
        try {
            require(route.path);
            logTest(route.name, 'PASS', 'Loaded successfully');
        } catch (err) {
            logTest(route.name, 'FAIL', err.message.substring(0, 50));
        }
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(70));
    console.log('  SUMMARY');
    console.log('='.repeat(70));
    console.log(`  Total Tests: ${results.tests.length}`);
    console.log(`  ✓ Passed: ${results.passed}`);
    console.log(`  ✗ Failed: ${results.failed}`);
    console.log(`  ⚠ Warnings: ${results.warnings}`);
    console.log('');

    const successRate = ((results.passed / results.tests.length) * 100).toFixed(1);
    console.log(`  Success Rate: ${successRate}%`);

    if (results.failed === 0) {
        console.log('\n  🎉 ALL TESTS PASSED! ARSENAL READY FOR BATTLE!');
    } else {
        console.log('\n  ⚠ Some tests failed. Review errors above.');
    }

    console.log('='.repeat(70));
}

runTests().catch(console.error);
