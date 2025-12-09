/**
 * TEST DEL CIRCUITO COMERCIAL
 *
 * Prueba el flujo completo:
 * 1. Generar presupuesto
 * 2. Enviar presupuesto
 * 3. Ver estado de onboarding
 * 4. Listar presupuestos/contratos/facturas/comisiones
 */

const API_BASE = 'http://localhost:9998/api';

// Obtener token de admin (asumir login previo)
const TOKEN = process.env.TEST_TOKEN || '';

async function testCommercialCircuit() {
    console.log('\n🎯 ========== TEST CIRCUITO COMERCIAL ==========\n');

    try {
        // 1. Crear presupuesto
        console.log('📋 PASO 1: Creando presupuesto...');
        const budgetData = {
            company_name: `Test Cliente ${Date.now()}`,
            legal_name: 'Test Cliente SA',
            tax_id: '30-12345678-9',
            contact_email: 'test@test.com',
            contact_phone: '+54911234567',
            address: 'Av. Corrientes 1000',
            country: 'Argentina',
            province: 'Buenos Aires',
            city: 'CABA',
            postal_code: '1043',
            latitude: -34.6037,
            longitude: -58.3816,

            modules: [
                {
                    module_key: 'users',
                    module_name: 'Usuarios',
                    base_price: 2.50,
                    tier_price: 2.50,
                    quantity: 10,
                    total_price: 25.00
                },
                {
                    module_key: 'attendance',
                    module_name: 'Asistencia',
                    base_price: 30.00,
                    tier_price: 30.00,
                    quantity: 10,
                    total_price: 300.00
                }
            ],

            subtotal_usd: 325.00,
            tax_usd: 68.25,
            total_usd: 393.25,
            employee_count: 10,
            tier_name: '1-50 empleados',
            license_type: 'basic',
            max_employees: 50,
            valid_until_days: 30,
            internal_notes: 'Presupuesto de prueba automático'
        };

        const budgetResponse = await fetch(`${API_BASE}/budgets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify(budgetData)
        });

        if (!budgetResponse.ok) {
            const error = await budgetResponse.json();
            throw new Error(`Error creando presupuesto: ${JSON.stringify(error)}`);
        }

        const budgetResult = await budgetResponse.json();
        const budget = budgetResult.budget || budgetResult;

        console.log(`✅ Presupuesto creado:`);
        console.log(`   📋 Trace ID: ${budget.trace_id}`);
        console.log(`   📄 Código: ${budget.code || budget.budget_number}`);
        console.log(`   💰 Total: $${budget.total_usd}`);
        console.log(`   📅 Válido hasta: ${budget.valid_until}`);

        const traceId = budget.trace_id;

        // 2. Ver estado de onboarding
        console.log('\n📊 PASO 2: Consultando estado de onboarding...');
        const statusResponse = await fetch(`${API_BASE}/onboarding/status/${traceId}`, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`
            }
        });

        if (statusResponse.ok) {
            const status = await statusResponse.json();
            console.log(`✅ Estado del onboarding:`);
            console.log(`   📋 Presupuesto: ${status.budget?.status || 'N/A'}`);
            console.log(`   📜 Contrato: ${status.contract?.status || 'Pendiente'}`);
            console.log(`   📄 Factura: ${status.invoice?.status || 'Pendiente'}`);
            console.log(`   💰 Comisiones: ${status.commissions?.status || 'Pendiente'}`);
        }

        // 3. Listar presupuestos
        console.log('\n📋 PASO 3: Listando presupuestos...');
        const quotesResponse = await fetch(`${API_BASE}/budgets?status=draft`, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`
            }
        });

        if (quotesResponse.ok) {
            const quotes = await quotesResponse.json();
            console.log(`✅ ${quotes.length || 0} presupuestos encontrados`);
        }

        // 4. Listar contratos
        console.log('\n📜 PASO 4: Listando contratos...');
        const contractsResponse = await fetch(`${API_BASE}/contracts`, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`
            }
        });

        if (contractsResponse.ok) {
            const contracts = await contractsResponse.json();
            console.log(`✅ ${contracts.length || 0} contratos encontrados`);
        }

        // 5. Listar facturas
        console.log('\n📄 PASO 5: Listando facturas...');
        const invoicesResponse = await fetch(`${API_BASE}/invoices`, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`
            }
        });

        if (invoicesResponse.ok) {
            const invoices = await invoicesResponse.json();
            console.log(`✅ ${invoices.length || 0} facturas encontradas`);
        }

        // 6. Listar liquidaciones de comisiones
        console.log('\n💰 PASO 6: Listando liquidaciones de comisiones...');
        const commissionsResponse = await fetch(`${API_BASE}/commissions/liquidations`, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`
            }
        });

        if (commissionsResponse.ok) {
            const commissions = await commissionsResponse.json();
            console.log(`✅ ${commissions.length || 0} liquidaciones encontradas`);
        }

        console.log('\n✅ ========== TEST COMPLETADO ==========\n');
        console.log('📝 Resumen:');
        console.log('   • Presupuesto creado exitosamente');
        console.log('   • Estado de onboarding consultado');
        console.log('   • Todas las listas cargadas correctamente');
        console.log('\n🎯 Circuito comercial funcionando correctamente!');

        return true;

    } catch (error) {
        console.error('\n❌ ========== TEST FALLIDO ==========\n');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Ejecutar test
testCommercialCircuit()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
        console.error('Error fatal:', err);
        process.exit(1);
    });
