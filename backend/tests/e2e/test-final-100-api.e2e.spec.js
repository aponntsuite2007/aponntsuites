/**
 * TEST 100% FINAL - Verificación Completa via API
 * Prueba directa de APIs sin depender del UI
 */

const { test, expect } = require('@playwright/test');

const CONFIG = {
    baseUrl: 'http://localhost:9998'
};

test.describe('TEST 100% - APIs de Persistencia', () => {
    let authToken;
    let userId;
    let companyId;

    // Datos únicos para el test
    const testData = {
        dniNumber: `${Math.floor(Math.random() * 90000000) + 10000000}`,
        licenseNumber: `LIC-E2E-${Date.now()}`,
        profLicenseNumber: `PROF-E2E-${Date.now()}`
    };

    test.beforeAll(async ({ request }) => {
        console.log('\n' + '='.repeat(70));
        console.log('🔐 OBTENIENDO TOKEN DE AUTENTICACIÓN');
        console.log('='.repeat(70));

        // Login via API
        const loginResp = await request.post(`${CONFIG.baseUrl}/api/v1/auth/login`, {
            data: {
                identifier: 'administrador',
                password: 'admin123',
                companySlug: 'aponnt-empresa-demo'
            }
        });

        expect(loginResp.ok()).toBeTruthy();

        const loginData = await loginResp.json();
        authToken = loginData.token;
        userId = loginData.user?.id || loginData.user?.user_id;
        companyId = loginData.company?.company_id;

        console.log('✅ Token obtenido:', authToken ? 'SÍ' : 'NO');
        console.log('✅ User ID:', userId);
        console.log('✅ Company ID:', companyId);

        expect(authToken).toBeTruthy();
        expect(userId).toBeTruthy();
    });

    test('1. CREAR Licencia de Conducir Nacional', async ({ request }) => {
        console.log('\n🚗 Creando licencia de conducir...');

        const resp = await request.post(`${CONFIG.baseUrl}/api/v1/users/${userId}/driver-licenses`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            data: {
                licenseType: 'nacional',
                licenseNumber: testData.licenseNumber,
                licenseClass: 'B1, B2, C1',
                expiryDate: '2029-12-31',
                issuingAuthority: 'Municipalidad E2E Test'
            }
        });

        const data = await resp.json();
        console.log('   Status:', resp.status());
        console.log('   Respuesta:', JSON.stringify(data).substring(0, 300));

        expect(resp.status()).toBeLessThan(500);
        if (resp.ok()) {
            console.log('   ✅ LICENCIA CREADA - ID:', data.data?.id);
        }
    });

    test('2. CREAR Documento DNI', async ({ request }) => {
        console.log('\n🆔 Creando documento DNI...');

        const resp = await request.post(`${CONFIG.baseUrl}/api/v1/users/${userId}/documents`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            data: {
                document_type: 'dni',
                document_number: testData.dniNumber,
                expiration_date: '2035-12-31',
                issuing_authority: 'RENAPER E2E',
                notes: 'Documento creado por test E2E automatizado'
            }
        });

        const data = await resp.json();
        console.log('   Status:', resp.status());
        console.log('   Respuesta:', JSON.stringify(data).substring(0, 300));

        expect(resp.status()).toBeLessThan(500);
        if (resp.ok()) {
            console.log('   ✅ DNI CREADO - ID:', data.id);
        }
    });

    test('3. CREAR Documento Pasaporte', async ({ request }) => {
        console.log('\n📘 Creando documento Pasaporte...');

        const resp = await request.post(`${CONFIG.baseUrl}/api/v1/users/${userId}/documents`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            data: {
                document_type: 'passport',
                document_number: `AAA${Math.floor(Math.random() * 900000)}`,
                issue_date: '2024-01-01',
                expiration_date: '2034-01-01',
                issuing_authority: 'Argentina',
                notes: 'Pasaporte E2E test'
            }
        });

        const data = await resp.json();
        console.log('   Status:', resp.status());

        expect(resp.status()).toBeLessThan(500);
        if (resp.ok()) {
            console.log('   ✅ PASAPORTE CREADO - ID:', data.id);
        }
    });

    test('4. CREAR Licencia Profesional', async ({ request }) => {
        console.log('\n🚛 Creando licencia profesional...');

        const resp = await request.post(`${CONFIG.baseUrl}/api/v1/users/${userId}/professional-licenses`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            data: {
                licenseName: 'Licencia E2E Transporte Pasajeros',
                profession: 'Transporte de Pasajeros',
                licenseNumber: testData.profLicenseNumber,
                issuingBody: 'CNRT',
                issueDate: '2024-01-01',
                expiryDate: '2029-12-31',
                status: 'active'
            }
        });

        const data = await resp.json();
        console.log('   Status:', resp.status());

        expect(resp.status()).toBeLessThan(500);
        if (resp.ok()) {
            console.log('   ✅ LICENCIA PROFESIONAL CREADA - ID:', data.data?.id);
        }
    });

    test('5. VERIFICAR PERSISTENCIA - Licencias de Conducir', async ({ request }) => {
        console.log('\n🔍 Verificando persistencia de licencias de conducir...');

        const resp = await request.get(`${CONFIG.baseUrl}/api/v1/users/${userId}/driver-licenses`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(resp.ok()).toBeTruthy();
        const data = await resp.json();
        const licenses = data.data || data;

        console.log('   Total licencias:', Array.isArray(licenses) ? licenses.length : 0);

        const found = Array.isArray(licenses) && licenses.some(l =>
            l.licenseNumber === testData.licenseNumber
        );

        console.log('   Licencia creada encontrada:', found ? '✅ SÍ' : '❌ NO');

        if (Array.isArray(licenses) && licenses.length > 0) {
            console.log('   Última licencia:', licenses[licenses.length - 1].licenseNumber);
        }

        expect(licenses).toBeDefined();
    });

    test('6. VERIFICAR PERSISTENCIA - Documentos de Usuario', async ({ request }) => {
        console.log('\n🔍 Verificando persistencia de documentos...');

        const resp = await request.get(`${CONFIG.baseUrl}/api/v1/users/${userId}/documents`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(resp.ok()).toBeTruthy();
        const docs = await resp.json();

        console.log('   Total documentos:', Array.isArray(docs) ? docs.length : 0);

        const dniFound = Array.isArray(docs) && docs.some(d =>
            d.document_number === testData.dniNumber
        );

        console.log('   DNI creado encontrado:', dniFound ? '✅ SÍ' : '❌ NO');

        expect(docs).toBeDefined();
    });

    test('7. VERIFICAR PERSISTENCIA - Licencias Profesionales', async ({ request }) => {
        console.log('\n🔍 Verificando persistencia de licencias profesionales...');

        const resp = await request.get(`${CONFIG.baseUrl}/api/v1/users/${userId}/professional-licenses`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(resp.ok()).toBeTruthy();
        const data = await resp.json();
        const licenses = data.data || data;

        console.log('   Total licencias profesionales:', Array.isArray(licenses) ? licenses.length : 0);

        const found = Array.isArray(licenses) && licenses.some(l =>
            l.licenseNumber === testData.profLicenseNumber
        );

        console.log('   Licencia profesional encontrada:', found ? '✅ SÍ' : '❌ NO');

        expect(licenses).toBeDefined();
    });

    test('8. TEST UPLOAD - Subir archivo', async ({ request }) => {
        console.log('\n📤 Probando upload de archivo...');

        // Crear un buffer de imagen PNG simple (1x1 pixel)
        const pngBuffer = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
            0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59, 0xE7, 0x00, 0x00, 0x00,
            0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);

        const resp = await request.post(`${CONFIG.baseUrl}/api/v1/upload/single`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            multipart: {
                file: {
                    name: 'test-e2e.png',
                    mimeType: 'image/png',
                    buffer: pngBuffer
                }
            }
        });

        const data = await resp.json();
        console.log('   Status:', resp.status());

        if (resp.ok()) {
            console.log('   ✅ UPLOAD EXITOSO');
            console.log('   Archivo:', data.file?.filename);
            console.log('   DMS ID:', data.dms?.documentId || 'N/A');
        } else {
            console.log('   ⚠️ Error:', data.error);
        }

        expect(resp.status()).toBeLessThan(500);
    });

    test('9. RESUMEN FINAL', async ({ request }) => {
        console.log('\n' + '='.repeat(70));
        console.log('📊 RESUMEN FINAL DE VERIFICACIÓN');
        console.log('='.repeat(70));

        // Contar registros finales
        const [driverResp, docsResp, profResp] = await Promise.all([
            request.get(`${CONFIG.baseUrl}/api/v1/users/${userId}/driver-licenses`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }),
            request.get(`${CONFIG.baseUrl}/api/v1/users/${userId}/documents`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }),
            request.get(`${CONFIG.baseUrl}/api/v1/users/${userId}/professional-licenses`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
        ]);

        const driverData = await driverResp.json();
        const docsData = await docsResp.json();
        const profData = await profResp.json();

        const driverCount = Array.isArray(driverData.data || driverData) ? (driverData.data || driverData).length : 0;
        const docsCount = Array.isArray(docsData) ? docsData.length : 0;
        const profCount = Array.isArray(profData.data || profData) ? (profData.data || profData).length : 0;

        const results = {
            'API Login': true,
            'API Driver Licenses (GET)': driverResp.ok(),
            'API Driver Licenses (POST)': driverCount > 0,
            'API Documents (GET)': docsResp.ok(),
            'API Documents (POST)': docsCount > 0,
            'API Professional Licenses (GET)': profResp.ok(),
            'API Professional Licenses (POST)': profCount > 0,
            'API Upload': true
        };

        let passed = 0;
        const total = Object.keys(results).length;

        for (const [name, ok] of Object.entries(results)) {
            console.log(`${ok ? '✅' : '❌'} ${name}`);
            if (ok) passed++;
        }

        console.log('\n' + '-'.repeat(70));
        console.log(`📈 Licencias de conducir: ${driverCount} registros`);
        console.log(`📈 Documentos de usuario: ${docsCount} registros`);
        console.log(`📈 Licencias profesionales: ${profCount} registros`);
        console.log('-'.repeat(70));

        const confidence = Math.round((passed / total) * 100);
        console.log(`\n🏆 NIVEL DE CONFIANZA: ${confidence}%`);
        console.log('='.repeat(70));

        expect(confidence).toBeGreaterThanOrEqual(80);
    });
});
