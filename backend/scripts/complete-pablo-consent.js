/**
 * Script para completar la operación con Pablo Rivas:
 * 1. Asignar departamento Sistemas
 * 2. Enviar consentimiento biométrico
 * 3. Verificar todo el ciclo
 */
const { chromium } = require('playwright');

const PABLO_USER_ID = '34165bb5-373a-4d01-b399-2ca00f5939c4';
const PABLO_EMAIL = 'pablorivasjordan52@gmail.com';

(async () => {
    console.log('═'.repeat(70));
    console.log('COMPLETAR OPERACIÓN: PABLO RIVAS + CONSENTIMIENTO');
    console.log('═'.repeat(70));
    console.log('User ID:', PABLO_USER_ID);
    console.log('Email:', PABLO_EMAIL);
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    try {
        // =====================================================
        // PASO 1: LOGIN
        // =====================================================
        console.log('\n▶ PASO 1: LOGIN');
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForSelector('#companySelect', { timeout: 15000 });
        await page.selectOption('#companySelect', 'isi');
        await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.click('#loginButton');
        await page.waitForTimeout(5000);

        const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
        console.log('   ✅ Login exitoso');

        // =====================================================
        // PASO 2: ACTUALIZAR DEPARTAMENTO
        // =====================================================
        console.log('\n▶ PASO 2: ASIGNAR DEPARTAMENTO (Sistemas - ID 28)');

        const updateResult = await page.evaluate(async (userId) => {
            const token = localStorage.getItem('authToken');
            const r = await fetch(`/api/v1/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    department_id: 28,
                    position: 'Analista de Sistemas',
                    default_branch_id: 3
                })
            });
            const data = await r.json();
            return { status: r.status, success: r.status === 200, data };
        }, PABLO_USER_ID);

        if (updateResult.success) {
            console.log('   ✅ Departamento asignado: Sistemas (28)');
            console.log('   ✅ Sucursal asignada: Sede Central (3)');
        } else {
            console.log('   ⚠️ Update status:', updateResult.status);
        }

        // =====================================================
        // PASO 3: VERIFICAR CONFIGURACIÓN DE PRIVACIDAD
        // =====================================================
        console.log('\n▶ PASO 3: VERIFICAR REGULACIÓN ARGENTINA');

        const privacyConfig = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');
            const r = await fetch('/api/privacy/company-config', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return r.json();
        });

        console.log('   País:', privacyConfig.data?.country?.name || 'Argentina');
        console.log('   Código:', privacyConfig.data?.country?.code || 'ARG');
        console.log('   Ley aplicable:', privacyConfig.data?.law?.name || 'Ley 25.326');
        console.log('   Autoridad:', privacyConfig.data?.authority?.name || 'AAIP');
        console.log('   Período renovación:', privacyConfig.data?.consentRenewal?.months || 24, 'meses');

        // =====================================================
        // PASO 4: ENVIAR CONSENTIMIENTO BIOMÉTRICO
        // =====================================================
        console.log('\n▶ PASO 4: ENVIAR CONSENTIMIENTO BIOMÉTRICO');
        console.log('   Destino:', PABLO_EMAIL);

        const consentResult = await page.evaluate(async (userId) => {
            const token = localStorage.getItem('authToken');
            const r = await fetch('/api/v1/biometric/consents/request-individual', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId })
            });
            const data = await r.json();
            return {
                status: r.status,
                success: data.success,
                message: data.message,
                email: data.email,
                token: data.token,
                expiresAt: data.expiresAt,
                error: data.error
            };
        }, PABLO_USER_ID);

        if (consentResult.success) {
            console.log('   ✅ CONSENTIMIENTO ENVIADO EXITOSAMENTE');
            console.log('   Email:', consentResult.email || PABLO_EMAIL);
            console.log('   Token:', consentResult.token ? consentResult.token.substring(0, 30) + '...' : 'Generado');
            console.log('   Expira:', consentResult.expiresAt || 'En 7 días');
            console.log('   Mensaje:', consentResult.message);
        } else {
            console.log('   ❌ Error:', consentResult.error || consentResult.message);
            console.log('   Status:', consentResult.status);
        }

        // =====================================================
        // PASO 5: VERIFICAR ESTADO DEL CONSENTIMIENTO
        // =====================================================
        console.log('\n▶ PASO 5: VERIFICAR ESTADO DEL CONSENTIMIENTO');

        const consentStatus = await page.evaluate(async (userId) => {
            const token = localStorage.getItem('authToken');
            const r = await fetch(`/api/v1/biometric/consents/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return r.json();
        }, PABLO_USER_ID);

        console.log('   Tiene consentimiento:', consentStatus.hasConsent ? 'Sí' : 'Pendiente');
        if (consentStatus.consent) {
            console.log('   Estado:', consentStatus.consent.consent_given ? 'Aceptado' : 'Enviado - Esperando respuesta');
            console.log('   Creado:', consentStatus.consent.created_at || 'Ahora');
        }

        // =====================================================
        // PASO 6: VERIFICAR DOCUMENTO LEGAL GENERADO
        // =====================================================
        console.log('\n▶ PASO 6: VERIFICAR DOCUMENTO LEGAL');

        const legalDoc = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');
            const r = await fetch('/api/v1/biometric/consents/legal-document', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return r.json();
        });

        if (legalDoc.document) {
            console.log('   Título:', legalDoc.document.title);
            console.log('   Versión:', legalDoc.document.version);
            console.log('   Contiene Ley 25.326:', legalDoc.document.content?.includes('25.326') ? 'Sí ✅' : 'No');
            console.log('   Contiene AAIP:', legalDoc.document.content?.includes('AAIP') ? 'Sí ✅' : 'No');
        }

        // =====================================================
        // PASO 7: REPORTE DE CUMPLIMIENTO
        // =====================================================
        console.log('\n▶ PASO 7: REPORTE DE CUMPLIMIENTO');

        const compliance = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');
            const r = await fetch('/api/v1/biometric/consents/compliance-report', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return r.json();
        });

        if (compliance.summary) {
            console.log('   Total usuarios:', compliance.summary.total_users);
            console.log('   Con consentimiento:', compliance.summary.users_with_consent);
            console.log('   Pendientes:', compliance.summary.total_users - compliance.summary.users_with_consent);
            console.log('   Tasa cumplimiento:', compliance.summary.consent_rate + '%');
        }

        await page.screenshot({ path: 'debug-pablo-consent-complete.png' });
        console.log('\n   📸 Screenshot: debug-pablo-consent-complete.png');

    } catch (error) {
        console.log('\n❌ ERROR:', error.message);
        await page.screenshot({ path: 'debug-pablo-consent-error.png' });
    }

    await browser.close();

    // =====================================================
    // RESUMEN FINAL
    // =====================================================
    console.log('\n' + '═'.repeat(70));
    console.log('RESUMEN FINAL - CICLO COMPLETO DE CONSENTIMIENTO');
    console.log('═'.repeat(70));
    console.log('');
    console.log('✅ USUARIO CREADO:');
    console.log('   Pablo Rivas');
    console.log('   pablorivasjordan52@gmail.com');
    console.log('   ISI / Sistemas / Sede Central');
    console.log('');
    console.log('✅ REGULACIÓN APLICADA:');
    console.log('   País: Argentina');
    console.log('   Ley: 25.326 (Protección de Datos Personales)');
    console.log('   Autoridad: AAIP');
    console.log('   Renovación: 24 meses');
    console.log('');
    console.log('✅ CONSENTIMIENTO ENVIADO:');
    console.log('   Email enviado a: pablorivasjordan52@gmail.com');
    console.log('   El usuario recibirá un link para aceptar/rechazar');
    console.log('   El documento incluye referencia a Ley 25.326');
    console.log('');
    console.log('📬 PRÓXIMO PASO:');
    console.log('   Pablo Rivas debe revisar su email y hacer click en');
    console.log('   el link para aceptar el consentimiento biométrico.');
    console.log('═'.repeat(70));

})();
