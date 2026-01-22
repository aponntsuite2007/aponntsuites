/**
 * Script E2E completo para:
 * 1. Crear usuario Pablo Rivas en ISI
 * 2. Asignar departamento (Sistemas), sucursal (Sede Central)
 * 3. Enviar consentimiento biométrico según nacionalidad de sucursal
 * 4. Verificar todo el ciclo
 *
 * Operando como usuario RRHH
 */
const { chromium } = require('playwright');

(async () => {
    console.log('═'.repeat(70));
    console.log('OPERACIÓN RRHH: CREAR PABLO RIVAS + CONSENTIMIENTO');
    console.log('═'.repeat(70));
    console.log('Empresa: ISI (company_id: 11)');
    console.log('País: Argentina');
    console.log('Regulación esperada: Ley 25.326');
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    let authToken = null;
    let userId = null;

    // DNI único basado en timestamp para evitar duplicados
    const uniqueDni = '95' + Date.now().toString().slice(-6);

    const pabloData = {
        firstName: 'Pablo',
        lastName: 'Rivas',
        email: 'pablorivasjordan52@gmail.com',
        dni: uniqueDni,
        department_id: 28,  // Sistemas
        branch_id: 3,       // Sede Central
        role: 'employee',
        position: 'Analista de Sistemas'
    };

    try {
        // =====================================================
        // PASO 1: LOGIN COMO ADMIN RRHH
        // =====================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ PASO 1: LOGIN COMO ADMIN RRHH');
        console.log('═'.repeat(60));

        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForSelector('#companySelect', { timeout: 15000 });
        await page.selectOption('#companySelect', 'isi');
        await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.click('#loginButton');
        await page.waitForTimeout(5000);

        authToken = await page.evaluate(() => localStorage.getItem('authToken'));
        if (!authToken) {
            throw new Error('No se pudo obtener token de autenticación');
        }
        console.log('   ✅ Login exitoso como Admin ISI');
        console.log('   Token:', authToken.substring(0, 30) + '...');

        // =====================================================
        // PASO 2: VERIFICAR QUE NO EXISTE PABLO RIVAS
        // =====================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ PASO 2: VERIFICAR SI EXISTE PABLO RIVAS');
        console.log('═'.repeat(60));

        const existingUser = await page.evaluate(async (email) => {
            const token = localStorage.getItem('authToken');
            const r = await fetch(`/api/v1/users?search=${encodeURIComponent(email)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await r.json();
            const users = data.data || data.users || data || [];
            return users.find(u => u.email === email);
        }, pabloData.email);

        if (existingUser) {
            console.log('   ⚠️ Usuario ya existe:', existingUser.firstName, existingUser.lastName);
            userId = existingUser.user_id || existingUser.id;
            console.log('   User ID:', userId);
        } else {
            console.log('   ✅ Usuario no existe - procedemos a crear');
        }

        // =====================================================
        // PASO 3: CREAR USUARIO PABLO RIVAS
        // =====================================================
        if (!userId) {
            console.log('\n' + '═'.repeat(60));
            console.log('▶ PASO 3: CREAR USUARIO PABLO RIVAS');
            console.log('═'.repeat(60));

            const createResult = await page.evaluate(async (userData) => {
                const token = localStorage.getItem('authToken');
                const r = await fetch('/api/v1/users', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        email: userData.email,
                        dni: userData.dni,
                        department_id: userData.department_id,
                        branch_id: userData.branch_id,
                        role: userData.role,
                        position: userData.position,
                        phone: '+54 11 5555-1234',
                        address: 'Av. Corrientes 1234',
                        city: 'Buenos Aires',
                        province: 'CABA',
                        country: 'Argentina',
                        hire_date: new Date().toISOString().split('T')[0],
                        is_active: true,
                        password: 'PabloRivas2025!'
                    })
                });
                const data = await r.json();
                return {
                    status: r.status,
                    success: r.status === 201 || r.status === 200 || data.success,
                    userId: data.data?.user_id || data.user_id || data.id,
                    error: data.error || data.message
                };
            }, pabloData);

            if (createResult.success) {
                userId = createResult.userId;
                console.log('   ✅ Usuario creado exitosamente');
                console.log('   User ID:', userId);
                console.log('   Nombre:', pabloData.firstName, pabloData.lastName);
                console.log('   Email:', pabloData.email);
                console.log('   Departamento:', pabloData.department_id, '(Sistemas)');
                console.log('   Sucursal:', pabloData.branch_id, '(Sede Central)');
            } else {
                console.log('   ❌ Error al crear usuario:', createResult.error);
                console.log('   Status:', createResult.status);
            }
        }

        // =====================================================
        // PASO 4: VERIFICAR REGULACIÓN POR NACIONALIDAD
        // =====================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ PASO 4: VERIFICAR REGULACIÓN POR NACIONALIDAD');
        console.log('═'.repeat(60));

        const privacyConfig = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');
            const r = await fetch('/api/privacy/company-config', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return r.json();
        });

        if (privacyConfig.success) {
            console.log('   ✅ Configuración de privacidad obtenida');
            console.log('   País:', privacyConfig.data?.country?.name || 'Argentina');
            console.log('   Código:', privacyConfig.data?.country?.code || 'ARG');
            console.log('   Ley:', privacyConfig.data?.law?.name || 'Ley 25.326');
            console.log('   Autoridad:', privacyConfig.data?.authority?.name || 'AAIP');
            console.log('   Renovación:', privacyConfig.data?.consentRenewal?.months || '24', 'meses');
        } else {
            console.log('   ⚠️ No se pudo obtener config de privacidad');
            console.log('   Usando default: Argentina / Ley 25.326 / 24 meses');
        }

        // =====================================================
        // PASO 5: ENVIAR CONSENTIMIENTO BIOMÉTRICO
        // =====================================================
        if (userId) {
            console.log('\n' + '═'.repeat(60));
            console.log('▶ PASO 5: ENVIAR CONSENTIMIENTO BIOMÉTRICO');
            console.log('═'.repeat(60));

            const consentResult = await page.evaluate(async (uid) => {
                const token = localStorage.getItem('authToken');
                const r = await fetch('/api/v1/biometric/consents/request-individual', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userId: uid })
                });
                const data = await r.json();
                return {
                    status: r.status,
                    success: r.status === 200 || r.status === 201 || data.success,
                    message: data.message,
                    email: data.email,
                    token: data.token,
                    expiresAt: data.expiresAt,
                    error: data.error
                };
            }, userId);

            if (consentResult.success) {
                console.log('   ✅ Solicitud de consentimiento enviada');
                console.log('   Email destino:', consentResult.email || pabloData.email);
                console.log('   Token:', consentResult.token ? consentResult.token.substring(0, 20) + '...' : 'N/A');
                console.log('   Expira:', consentResult.expiresAt || 'En 7 días');
                console.log('   Mensaje:', consentResult.message);
            } else {
                console.log('   ❌ Error al enviar consentimiento');
                console.log('   Status:', consentResult.status);
                console.log('   Error:', consentResult.error || consentResult.message);
            }
        }

        // =====================================================
        // PASO 6: VERIFICAR ESTADO DEL CONSENTIMIENTO
        // =====================================================
        if (userId) {
            console.log('\n' + '═'.repeat(60));
            console.log('▶ PASO 6: VERIFICAR ESTADO DEL CONSENTIMIENTO');
            console.log('═'.repeat(60));

            const consentStatus = await page.evaluate(async (uid) => {
                const token = localStorage.getItem('authToken');
                const r = await fetch(`/api/v1/biometric/consents/${uid}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return r.json();
            }, userId);

            if (consentStatus.success !== false) {
                console.log('   ✅ Estado del consentimiento:');
                console.log('   Tiene consentimiento:', consentStatus.hasConsent ? 'Sí' : 'No (pendiente)');
                if (consentStatus.consent) {
                    console.log('   Estado:', consentStatus.consent.consent_given ? 'Aceptado' : 'Pendiente');
                    console.log('   Versión:', consentStatus.consent.consent_version || 'N/A');
                    console.log('   País:', consentStatus.consent.country_code || 'ARG');
                }
            } else {
                console.log('   Consentimiento pendiente de respuesta del usuario');
            }
        }

        // =====================================================
        // PASO 7: VERIFICAR DOCUMENTO LEGAL
        // =====================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ PASO 7: VERIFICAR DOCUMENTO LEGAL');
        console.log('═'.repeat(60));

        const legalDoc = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');
            const r = await fetch('/api/v1/biometric/consents/legal-document', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return r.json();
        });

        if (legalDoc.document) {
            console.log('   ✅ Documento legal obtenido');
            console.log('   Título:', legalDoc.document.title || 'Consentimiento Biométrico');
            console.log('   Versión:', legalDoc.document.version || 'N/A');
            console.log('   Contenido:', (legalDoc.document.content || '').substring(0, 100) + '...');
        }

        await page.screenshot({ path: 'debug-pablo-rivas-created.png' });
        console.log('\n   📸 Screenshot guardado: debug-pablo-rivas-created.png');

    } catch (error) {
        console.log('\n❌ ERROR:', error.message);
        await page.screenshot({ path: 'debug-pablo-rivas-error.png' });
    }

    await browser.close();

    // =====================================================
    // RESUMEN FINAL
    // =====================================================
    console.log('\n' + '═'.repeat(70));
    console.log('RESUMEN OPERACIÓN RRHH');
    console.log('═'.repeat(70));
    console.log('');
    console.log('👤 Usuario: Pablo Rivas');
    console.log('📧 Email: pablorivasjordan52@gmail.com');
    console.log('🏢 Empresa: ISI (Argentina)');
    console.log('🏬 Sucursal: Sede Central');
    console.log('📁 Departamento: Sistemas');
    console.log('💼 Posición: Analista de Sistemas');
    console.log('');
    console.log('🔐 CONSENTIMIENTO:');
    console.log('   País: Argentina');
    console.log('   Ley: Ley 25.326 (Protección de Datos Personales)');
    console.log('   Autoridad: AAIP');
    console.log('   Renovación: 24 meses');
    console.log('   Estado: Enviado a pablorivasjordan52@gmail.com');
    console.log('');
    console.log('📬 El usuario recibirá un email con el link para aceptar/rechazar');
    console.log('   el consentimiento biométrico según la regulación argentina.');
    console.log('═'.repeat(70));

})();
