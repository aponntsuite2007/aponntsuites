/**
 * Test que simula exactamente lo que hace el frontend
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testFrontendBehavior() {
    console.log('🧪 Simulando comportamiento del Frontend...\n');

    // Token para ISI (ID 11)
    const token = jwt.sign(
        {
            id: '766de495-e4f3-4e91-a509-1a495c52e15c',
            role: 'admin',
            employeeId: 'EMP-ISI-001',
            company_id: 11
        },
        'tu_clave_secreta_super_segura_cambiar_en_produccion_2025',
        { expiresIn: '24h' }
    );

    try {
        // Exactamente como lo hace el frontend (línea 245)
        const response = await axios.get('http://localhost:9998/api/finance/integrations', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📦 Response completo:');
        console.log(JSON.stringify(response.data, null, 2));

        // Simular línea 278: return result.data
        const data = response.data.data;

        console.log('\n📊 data (result.data):');
        console.log(JSON.stringify(data, null, 2));

        // Simular línea 611: const modules = data?.modules || {};
        const modules = data?.modules || {};

        console.log('\n🔌 modules (data.modules):');
        console.log(JSON.stringify(modules, null, 2));

        console.log('\n✅ VERIFICACIÓN:');
        for (const [key, mod] of Object.entries(modules)) {
            console.log(`${mod.available ? '✅' : '❌'} ${mod.name} - ${mod.available ? `${mod.features_enabled?.length} features` : 'No contratado'}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testFrontendBehavior();
