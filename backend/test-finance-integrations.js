/**
 * Test Finance Integrations Endpoint
 * Verifica que los módulos se muestren como contratados
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testFinanceIntegrations() {
    console.log('🧪 Testing Finance Integrations...\n');

    // Crear token JWT para empresa ISI (ID 11)
    // Usar UUID válido (de un usuario admin real de ISI)
    const token = jwt.sign(
        {
            id: '766de495-e4f3-4e91-a509-1a495c52e15c',  // UUID válido
            role: 'admin',
            employeeId: 'EMP-ISI-001',
            company_id: 11
        },
        'tu_clave_secreta_super_segura_cambiar_en_produccion_2025',
        { expiresIn: '24h' }
    );

    console.log('🔑 Token generado para empresa ISI (ID 11)\n');

    try {
        // Test endpoint /api/finance/integrations
        const response = await axios.get('http://localhost:9998/api/finance/integrations', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Response Status:', response.status);
        console.log('📦 Full Response Data:');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('\n📊 Integration Status:\n');

        const data = response.data.data || response.data;

        // Verificar cada integración
        const integrations = ['payroll', 'billing', 'collections', 'procurement', 'banking'];

        for (const key of integrations) {
            const integration = data[key];
            if (integration) {
                const status = integration.available ? '✅ CONTRATADO' : '❌ NO CONTRATADO';
                console.log(`${status} - ${integration.name}`);
                console.log(`   Módulo: ${integration.module}`);
                console.log(`   Features: ${integration.features_enabled.length} activas\n`);
            }
        }

        // Verificar que los módulos esperados estén contratados
        const expectedContracted = ['payroll', 'billing', 'collections', 'procurement'];
        let allOk = true;

        for (const key of expectedContracted) {
            if (!data[key] || !data[key].available) {
                console.log(`❌ ERROR: ${key} debería estar contratado pero no lo está`);
                allOk = false;
            }
        }

        if (allOk) {
            console.log('✅ TODAS LAS INTEGRACIONES FUNCIONAN CORRECTAMENTE');
        } else {
            console.log('❌ HAY PROBLEMAS CON LAS INTEGRACIONES');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testFinanceIntegrations();
