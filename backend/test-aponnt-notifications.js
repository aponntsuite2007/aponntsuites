/**
 * ============================================================================
 * TEST: CIRCUITO APONNT → EMPRESAS - Notificaciones Automáticas
 * ============================================================================
 *
 * Prueba el flujo completo de notificaciones:
 * 1. Alta de empresa → Email + Notificación interna
 * 2. Cambio de módulos → Email + Notificación interna
 * 3. Aviso de plataforma → Broadcast a todas las empresas
 *
 * ============================================================================
 */

const aponntNotificationService = require('./src/services/AponntNotificationService');

async function testAponntNotifications() {
    console.log('🧪 ========================================');
    console.log('   TEST: NOTIFICACIONES APONNT → EMPRESAS');
    console.log('   ========================================\n');

    try {
        // =================================================================
        // TEST 1: NOTIFICACIÓN DE NUEVA EMPRESA
        // =================================================================
        console.log('\n📋 TEST 1: Notificación de nueva empresa registrada\n');

        const testCompanyData = {
            id: 999,
            name: 'Test Company ISI',
            contactEmail: 'test@isi.com.ar',
            licenseType: 'professional',
            maxEmployees: 100,
            modules: ['users', 'attendance', 'reports', 'notifications'],
            slug: 'test-company-isi'
        };

        console.log('📤 Enviando notificación de nueva empresa...');
        const result1 = await aponntNotificationService.notifyNewCompany(testCompanyData);

        if (result1.success) {
            console.log('✅ TEST 1 PASSED - Notificaciones enviadas:');
            console.log(JSON.stringify(result1.notifications, null, 2));
        } else {
            console.log('❌ TEST 1 FAILED:', result1.error);
        }

        // =================================================================
        // TEST 2: NOTIFICACIÓN DE CAMBIO EN MÓDULOS
        // =================================================================
        console.log('\n📋 TEST 2: Notificación de cambio en módulos/facturación\n');

        const changeData = {
            added: [
                { id: 10, name: 'Biometric Advanced' },
                { id: 15, name: 'AI Assistant' }
            ],
            removed: [
                { id: 5, name: 'Basic Reports' }
            ],
            newTotal: 15000,
            previousTotal: 10000
        };

        console.log('📤 Enviando notificación de cambio de módulos...');
        const result2 = await aponntNotificationService.notifyModuleChange(11, changeData);

        if (result2.success) {
            console.log('✅ TEST 2 PASSED - Notificaciones enviadas:');
            console.log(JSON.stringify(result2.notifications, null, 2));
        } else {
            console.log('❌ TEST 2 FAILED:', result2.error);
        }

        // =================================================================
        // TEST 3: AVISO DE PLATAFORMA (BROADCAST)
        // =================================================================
        console.log('\n📋 TEST 3: Aviso de plataforma (broadcast a todas las empresas)\n');

        const announcementData = {
            title: '🎉 Nueva funcionalidad: Dashboard Biométrico v2.0',
            message: 'Hemos lanzado la nueva versión del Dashboard Biométrico con mejoras en performance y nuevas visualizaciones.',
            type: 'info',
            priority: 'medium',
            sendEmail: false, // No enviar emails reales en test
            html: `
                <h2>🎉 Nueva funcionalidad disponible</h2>
                <p>Dashboard Biométrico v2.0 ya está disponible para todas las empresas.</p>
                <ul>
                    <li>✨ Mejoras en performance (5x más rápido)</li>
                    <li>📊 Nuevas visualizaciones de datos</li>
                    <li>🔍 Filtros avanzados</li>
                </ul>
            `,
            text: `
                Nueva funcionalidad disponible

                Dashboard Biométrico v2.0 ya está disponible.
                - Mejoras en performance (5x más rápido)
                - Nuevas visualizaciones
                - Filtros avanzados
            `,
            actionUrl: '/dashboard',
            metadata: {
                version: '2.0.0',
                releaseDate: '2025-10-29'
            }
        };

        console.log('📤 Enviando aviso de plataforma...');
        const result3 = await aponntNotificationService.notifyPlatformAnnouncement(announcementData);

        if (result3.success) {
            console.log(`✅ TEST 3 PASSED - Enviado a ${result3.successCount}/${result3.totalCompanies} empresas`);
        } else {
            console.log('❌ TEST 3 FAILED:', result3.error);
        }

        // =================================================================
        // TEST 4: ALERTA CRÍTICA DEL SISTEMA
        // =================================================================
        console.log('\n📋 TEST 4: Alerta crítica del sistema\n');

        const alertData = {
            title: 'Límite de empleados alcanzado',
            message: 'Tu empresa ha alcanzado el 95% del límite de empleados contratados. Te recomendamos ampliar tu plan.',
            details: 'Empleados actuales: 95/100. Para agregar más empleados, contacta a soporte.',
            actionUrl: '/billing/upgrade',
            metadata: {
                currentEmployees: 95,
                maxEmployees: 100,
                percentage: 95
            }
        };

        console.log('📤 Enviando alerta crítica...');
        const result4 = await aponntNotificationService.notifySystemAlert(11, alertData);

        if (result4.success) {
            console.log('✅ TEST 4 PASSED - Alerta enviada:');
            console.log(JSON.stringify(result4.notifications, null, 2));
        } else {
            console.log('❌ TEST 4 FAILED:', result4.error);
        }

        // =================================================================
        // RESUMEN
        // =================================================================
        console.log('\n🎯 ========================================');
        console.log('   RESUMEN DE TESTS');
        console.log('   ========================================\n');

        const allPassed = result1.success && result2.success && result3.success && result4.success;

        if (allPassed) {
            console.log('✅ TODOS LOS TESTS PASARON');
            console.log('\n📊 Estadísticas:');
            console.log(`   - Nueva empresa: ${result1.notifications.length} notificaciones enviadas`);
            console.log(`   - Cambio módulos: ${result2.notifications.length} notificaciones enviadas`);
            console.log(`   - Aviso plataforma: ${result3.successCount}/${result3.totalCompanies} empresas notificadas`);
            console.log(`   - Alerta crítica: ${result4.notifications.length} notificaciones enviadas`);
        } else {
            console.log('❌ ALGUNOS TESTS FALLARON');
            console.log('\nRevisá los logs arriba para ver los detalles.');
        }

        console.log('\n🔔 Sistema de notificaciones Aponnt → Empresas verificado');
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ ERROR EN TEST:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Ejecutar tests
if (require.main === module) {
    testAponntNotifications()
        .then(() => {
            console.log('✅ Tests completados');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Error ejecutando tests:', error);
            process.exit(1);
        });
}

module.exports = testAponntNotifications;
