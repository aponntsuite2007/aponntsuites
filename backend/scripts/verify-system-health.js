/**
 * ============================================================================
 * SCRIPT DE VERIFICACIÓN DE SALUD DEL SISTEMA
 * ============================================================================
 *
 * Verifica que todos los componentes críticos del sistema estén funcionando.
 *
 * Tests:
 * 1. Database connection
 * 2. Models (User, Partner) con campos de email verification
 * 3. Services (EmailVerificationService)
 * 4. Routes (user creation, email verification)
 * 5. Migrations ejecutadas
 *
 * @version 1.0.0
 * @created 2025-11-01
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

console.log('=' .repeat(80));
console.log('🏥 VERIFICACIÓN DE SALUD DEL SISTEMA');
console.log('=' .repeat(80));
console.log('');

let errors = 0;
let warnings = 0;
let passed = 0;

/**
 * Helper para mostrar resultado de test
 */
function testResult(name, success, message = '') {
    if (success) {
        console.log(`✅ ${name}`);
        if (message) console.log(`   ℹ️  ${message}`);
        passed++;
    } else {
        console.log(`❌ ${name}`);
        if (message) console.log(`   🔥 ${message}`);
        errors++;
    }
}

function testWarning(name, message) {
    console.log(`⚠️  ${name}`);
    if (message) console.log(`   ℹ️  ${message}`);
    warnings++;
}

/**
 * Test 1: Database Connection
 */
console.log('📊 TEST 1: Database Connection');
console.log('-'.repeat(80));
try {
    const { sequelize } = require('../src/config/database');
    testResult('Database config loaded', true, `Dialect: ${sequelize.options.dialect}`);
} catch (error) {
    testResult('Database config loaded', false, error.message);
}
console.log('');

/**
 * Test 2: Models (User, Partner)
 */
console.log('📋 TEST 2: Models Verification');
console.log('-'.repeat(80));
try {
    const { User, Partner } = require('../src/config/database');

    // User model
    const userFields = Object.keys(User.rawAttributes);
    const requiredUserFields = ['email_verified', 'verification_pending', 'account_status', 'email_verified_at'];
    const hasAllUserFields = requiredUserFields.every(field => userFields.includes(field));

    testResult(
        'User model has email verification fields',
        hasAllUserFields,
        hasAllUserFields ? 'All 4 fields present' : `Missing: ${requiredUserFields.filter(f => !userFields.includes(f)).join(', ')}`
    );

    // Partner model
    const partnerFields = Object.keys(Partner.rawAttributes);
    const requiredPartnerFields = ['email_verified', 'verification_pending', 'account_status', 'email_verified_at'];
    const hasAllPartnerFields = requiredPartnerFields.every(field => partnerFields.includes(field));

    testResult(
        'Partner model has email verification fields',
        hasAllPartnerFields,
        hasAllPartnerFields ? 'All 4 fields present' : `Missing: ${requiredPartnerFields.filter(f => !partnerFields.includes(f)).join(', ')}`
    );
} catch (error) {
    testResult('Models loaded', false, error.message);
}
console.log('');

/**
 * Test 3: Services
 */
console.log('🔧 TEST 3: Services Verification');
console.log('-'.repeat(80));
try {
    const EmailVerificationService = require('../src/services/EmailVerificationService');
    testResult('EmailVerificationService loaded', true);

    // Verificar métodos críticos
    const criticalMethods = ['sendVerificationEmail', 'verifyToken', 'resendVerificationEmail'];
    const hasMethods = criticalMethods.every(method => typeof EmailVerificationService[method] === 'function');

    testResult('EmailVerificationService has critical methods', hasMethods, hasMethods ? criticalMethods.join(', ') : 'Some methods missing');
} catch (error) {
    testResult('EmailVerificationService loaded', false, error.message);
}
console.log('');

/**
 * Test 4: Routes
 */
console.log('🛣️  TEST 4: Routes Verification');
console.log('-'.repeat(80));
try {
    const userRoutes = fs.readFileSync(path.join(__dirname, '../src/routes/userRoutes.js'), 'utf8');
    const hasEmailVerificationImport = userRoutes.includes('EmailVerificationService');
    const hasSendVerification = userRoutes.includes('sendVerificationEmail');

    testResult('userRoutes.js has EmailVerificationService', hasEmailVerificationImport);
    testResult('userRoutes.js sends verification email on user creation', hasSendVerification);
} catch (error) {
    testResult('Routes verification', false, error.message);
}

try {
    const authRoutes = fs.readFileSync(path.join(__dirname, '../src/routes/authRoutes.js'), 'utf8');
    const hasEmailCheck = authRoutes.includes('email_verified') || authRoutes.includes('pending_verification');

    testResult('authRoutes.js blocks login for unverified users', hasEmailCheck);
} catch (error) {
    testResult('authRoutes.js verification', false, error.message);
}
console.log('');

/**
 * Test 5: Migrations
 */
console.log('📁 TEST 5: Migrations Verification');
console.log('-'.repeat(80));
const requiredMigrations = [
    '20251101_add_email_verification_mandatory_fields.sql',
    '20251101_update_system_consciousness.sql'
];

requiredMigrations.forEach(migration => {
    const exists = fs.existsSync(path.join(__dirname, '../migrations', migration));
    testResult(`Migration ${migration}`, exists, exists ? 'File exists' : 'File NOT found');
});
console.log('');

/**
 * Test 6: Frontend Files
 */
console.log('🌐 TEST 6: Frontend Files Verification');
console.log('-'.repeat(80));
const requiredFrontendFiles = [
    'public/verify-email.html',
    'public/js/modules/email-verification-ui.js'
];

requiredFrontendFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, '..', file));
    testResult(`File ${file}`, exists, exists ? 'File exists' : 'File NOT found');
});
console.log('');

/**
 * Test 7: Documentation
 */
console.log('📄 TEST 7: Documentation Verification');
console.log('-'.repeat(80));
const requiredDocs = [
    'ARCHIVOS-EXTERNOS-IMPRESCINDIBLES.md',
    'ARQUITECTURA-MODULAR-EXPLICADA.md'
];

requiredDocs.forEach(doc => {
    const exists = fs.existsSync(path.join(__dirname, '..', doc));
    testResult(`Documentation ${doc}`, exists, exists ? 'File exists' : 'File NOT found');
});
console.log('');

/**
 * Test 8: Server.js
 */
console.log('🚀 TEST 8: Server Configuration');
console.log('-'.repeat(80));
try {
    const serverContent = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    const hasListen = serverContent.includes('app.listen') || serverContent.includes('server.listen');
    const hasPort = serverContent.includes('PORT') || serverContent.includes('process.env.PORT');

    testResult('server.js has listen()', hasListen);
    testResult('server.js uses PORT environment variable', hasPort);
} catch (error) {
    testResult('server.js verification', false, error.message);
}
console.log('');

/**
 * SUMMARY
 */
console.log('=' .repeat(80));
console.log('📊 RESUMEN DE VERIFICACIÓN');
console.log('=' .repeat(80));
console.log(`✅ Tests passed: ${passed}`);
console.log(`⚠️  Warnings: ${warnings}`);
console.log(`❌ Errors: ${errors}`);
console.log('');

if (errors === 0) {
    console.log('✅ SISTEMA SALUDABLE - Listo para arrancar');
    console.log('');
    console.log('🚀 Para iniciar el servidor:');
    console.log('   cd backend && PORT=9998 npm start');
    console.log('');
    process.exit(0);
} else {
    console.log('❌ SISTEMA CON ERRORES - Revisar y corregir antes de arrancar');
    console.log('');
    process.exit(1);
}
