/**
 * Test Finance Submodules - Verifica que los 8 submódulos profesionales estén disponibles
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testFinanceSubmodules() {
    console.log('🧪 Testing Finance Professional Submodules...\n');

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
        // 1. Verificar que finance-dashboard está activo
        const dashboardResponse = await axios.get('http://localhost:9998/api/finance/dashboard?fiscal_year=2026', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('✅ Finance Dashboard API funciona\n');

        // 2. Obtener módulos activos de la empresa
        const modulesResponse = await axios.get('http://localhost:9998/api/v1/company-modules/my-modules', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const activeModules = modulesResponse.data.modules || [];

        console.log('📊 MÓDULOS FINANCE ACTIVOS PARA ISI:\n');

        // Submódulos esperados
        const expectedSubmodules = [
            'finance-dashboard',
            'finance-chart-of-accounts',
            'finance-budget',
            'finance-cash-flow',
            'finance-cost-centers',
            'finance-journal-entries',
            'finance-treasury',
            'finance-reports',
            'finance-executive-dashboard'
        ];

        let allOk = true;

        for (const moduleKey of expectedSubmodules) {
            const module = activeModules.find(m => m.id === moduleKey);

            if (!module) {
                console.log(`❌ ${moduleKey} - NO ENCONTRADO`);
                allOk = false;
            } else {
                const isContracted = module.isContracted;
                const isActive = module.isActive;
                const status = isContracted && isActive ? '✅' : '⚠️';

                console.log(`${status} ${module.name} (${moduleKey})`);
                console.log(`   Contratado: ${isContracted ? 'SÍ' : 'NO'}`);
                console.log(`   Activo: ${isActive ? 'SÍ' : 'NO'}`);
                console.log(`   Operacional: ${module.isOperational ? 'SÍ' : 'NO'}`);
                console.log('');

                if (!isContracted || !isActive) {
                    allOk = false;
                }
            }
        }

        console.log('\n📋 RESUMEN:\n');

        if (allOk) {
            console.log('✅ TODOS LOS SUBMÓDULOS FINANCE ESTÁN CORRECTAMENTE CONFIGURADOS');
            console.log('\n🎯 El Finance Dashboard ahora debería verse PROFESIONAL con acceso a:');
            console.log('   📊 Plan de Cuentas (Chart of Accounts)');
            console.log('   📋 Presupuestos (Budget)');
            console.log('   💰 Flujo de Caja (Cash Flow)');
            console.log('   🏢 Centros de Costo (Cost Centers)');
            console.log('   📝 Asientos Contables (Journal Entries)');
            console.log('   🏦 Tesorería (Treasury)');
            console.log('   📈 Reportes Financieros (Reports)');
            console.log('   📊 Dashboard Ejecutivo (Executive Dashboard)');
        } else {
            console.log('❌ HAY PROBLEMAS CON LA CONFIGURACIÓN DE SUBMÓDULOS');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testFinanceSubmodules();
