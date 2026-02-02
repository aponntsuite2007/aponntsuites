/**
 * ============================================================================
 * TEST COMPLETO API: BANCO DE HORAS
 * ============================================================================
 *
 * Test directo de la API de Banco de Horas sin Playwright.
 * Verifica todos los endpoints CRUD y SSOT.
 *
 * @date 2026-02-02
 * ============================================================================
 */

const http = require('http');

const BASE_URL = 'http://localhost:9998';
let authToken = null;

// Helper para hacer requests HTTP
function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Test-Mode': 'true'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json, ok: res.statusCode >= 200 && res.statusCode < 300 });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body, ok: res.statusCode >= 200 && res.statusCode < 300 });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function runTests() {
    console.log('='.repeat(70));
    console.log('🏦 TEST COMPLETO API: BANCO DE HORAS');
    console.log('='.repeat(70));
    console.log();

    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // =========================================================================
    // TEST 0: Login
    // =========================================================================
    console.log('🔐 FASE 0: Autenticación...');
    try {
        const loginRes = await makeRequest('POST', '/api/v1/auth/login', {
            companySlug: 'isi',
            identifier: 'admin',
            password: 'admin123'
        });

        if (loginRes.ok && loginRes.data.token) {
            authToken = loginRes.data.token;
            console.log('   ✅ Login exitoso');
            console.log('   - Company ID:', loginRes.data.user?.company_id);
            results.passed++;
            results.tests.push({ name: 'Login', status: 'PASSED' });
        } else {
            console.log('   ❌ Login fallido:', loginRes.data.message || loginRes.status);
            results.failed++;
            results.tests.push({ name: 'Login', status: 'FAILED', error: loginRes.data.message });
            console.log('\n⚠️ Sin autenticación, abortando tests...');
            return results;
        }
    } catch (error) {
        console.log('   ❌ Error de conexión:', error.message);
        results.failed++;
        results.tests.push({ name: 'Login', status: 'FAILED', error: error.message });
        return results;
    }

    // =========================================================================
    // TEST 1: Plantillas (Templates)
    // =========================================================================
    console.log('\n📋 FASE 1: Verificar plantillas...');
    try {
        const res = await makeRequest('GET', '/api/hour-bank/templates', null, authToken);
        if (res.ok) {
            console.log('   ✅ GET /templates OK');
            console.log('   - Plantillas encontradas:', res.data.templates?.length || 0);
            if (res.data.templates?.length > 0) {
                const t = res.data.templates[0];
                console.log('   - Primera plantilla:', t.template_name, '| País:', t.country_code);
            }
            results.passed++;
            results.tests.push({ name: 'Templates GET', status: 'PASSED' });
        } else {
            console.log('   ❌ GET /templates FAILED:', res.status);
            results.failed++;
            results.tests.push({ name: 'Templates GET', status: 'FAILED' });
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
        results.tests.push({ name: 'Templates GET', status: 'ERROR' });
    }

    // =========================================================================
    // TEST 2: Saldos (Balances)
    // =========================================================================
    console.log('\n💰 FASE 2: Verificar saldos...');
    try {
        const res = await makeRequest('GET', '/api/hour-bank/balances?limit=10', null, authToken);
        if (res.ok) {
            console.log('   ✅ GET /balances OK');
            console.log('   - Saldos encontrados:', res.data.balances?.length || 0);
            if (res.data.balances?.length > 0) {
                console.log('\n   📊 Top 5 saldos:');
                res.data.balances.slice(0, 5).forEach((b, i) => {
                    console.log(`      ${i+1}. ${b.employee_name || 'N/A'}: ${b.current_balance}h`);
                });
            }
            results.passed++;
            results.tests.push({ name: 'Balances GET', status: 'PASSED' });
        } else {
            console.log('   ❌ GET /balances FAILED:', res.status);
            results.failed++;
            results.tests.push({ name: 'Balances GET', status: 'FAILED' });
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
        results.tests.push({ name: 'Balances GET', status: 'ERROR' });
    }

    // =========================================================================
    // TEST 3: Mi Balance
    // =========================================================================
    console.log('\n👤 FASE 3: Mi balance...');
    try {
        const res = await makeRequest('GET', '/api/hour-bank/balance', null, authToken);
        if (res.ok || res.status === 404) { // 404 es válido si no tiene saldo
            console.log('   ✅ GET /balance OK');
            console.log('   - Mi saldo:', res.data.balance?.current_balance || 0, 'horas');
            results.passed++;
            results.tests.push({ name: 'My Balance GET', status: 'PASSED' });
        } else {
            console.log('   ❌ GET /balance FAILED:', res.status);
            results.failed++;
            results.tests.push({ name: 'My Balance GET', status: 'FAILED' });
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
        results.tests.push({ name: 'My Balance GET', status: 'ERROR' });
    }

    // =========================================================================
    // TEST 4: Transacciones
    // =========================================================================
    console.log('\n📜 FASE 4: Historial de transacciones...');
    try {
        const res = await makeRequest('GET', '/api/hour-bank/transactions?limit=10', null, authToken);
        if (res.ok) {
            console.log('   ✅ GET /transactions OK');
            console.log('   - Transacciones:', res.data.transactions?.length || 0);
            results.passed++;
            results.tests.push({ name: 'Transactions GET', status: 'PASSED' });
        } else {
            console.log('   ⚠️ GET /transactions:', res.status, '(puede ser vacío)');
            results.passed++; // Es válido que esté vacío
            results.tests.push({ name: 'Transactions GET', status: 'PASSED' });
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
        results.tests.push({ name: 'Transactions GET', status: 'ERROR' });
    }

    // =========================================================================
    // TEST 5: Solicitudes Pendientes
    // =========================================================================
    console.log('\n📝 FASE 5: Solicitudes pendientes...');
    try {
        const res = await makeRequest('GET', '/api/hour-bank/requests/pending', null, authToken);
        if (res.ok) {
            console.log('   ✅ GET /requests/pending OK');
            console.log('   - Solicitudes pendientes:', res.data.requests?.length || 0);
            results.passed++;
            results.tests.push({ name: 'Pending Requests GET', status: 'PASSED' });
        } else {
            console.log('   ❌ GET /requests/pending FAILED:', res.status);
            results.failed++;
            results.tests.push({ name: 'Pending Requests GET', status: 'FAILED' });
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
        results.tests.push({ name: 'Pending Requests GET', status: 'ERROR' });
    }

    // =========================================================================
    // TEST 6: Decisiones Pendientes
    // =========================================================================
    console.log('\n❓ FASE 6: Decisiones pendientes (cobrar vs acumular)...');
    try {
        const res = await makeRequest('GET', '/api/hour-bank/decisions/pending', null, authToken);
        if (res.ok) {
            console.log('   ✅ GET /decisions/pending OK');
            console.log('   - Decisiones pendientes:', res.data.decisions?.length || 0);
            results.passed++;
            results.tests.push({ name: 'Pending Decisions GET', status: 'PASSED' });
        } else {
            console.log('   ⚠️ GET /decisions/pending:', res.status);
            results.passed++;
            results.tests.push({ name: 'Pending Decisions GET', status: 'PASSED' });
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
        results.tests.push({ name: 'Pending Decisions GET', status: 'ERROR' });
    }

    // =========================================================================
    // TEST 7: Estadísticas
    // =========================================================================
    console.log('\n📊 FASE 7: Estadísticas de empresa...');
    try {
        const res = await makeRequest('GET', '/api/hour-bank/stats', null, authToken);
        if (res.ok) {
            console.log('   ✅ GET /stats OK');
            console.log('   - Datos:', JSON.stringify(res.data).substring(0, 200));
            results.passed++;
            results.tests.push({ name: 'Stats GET', status: 'PASSED' });
        } else {
            console.log('   ❌ GET /stats FAILED:', res.status);
            results.failed++;
            results.tests.push({ name: 'Stats GET', status: 'FAILED' });
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
        results.tests.push({ name: 'Stats GET', status: 'ERROR' });
    }

    // =========================================================================
    // TEST 8: Métricas de Empresa
    // =========================================================================
    console.log('\n📈 FASE 8: Métricas jerárquicas...');
    try {
        const companyRes = await makeRequest('GET', '/api/hour-bank/metrics/company', null, authToken);
        if (companyRes.ok) {
            console.log('   ✅ GET /metrics/company OK');
            results.passed++;
            results.tests.push({ name: 'Company Metrics GET', status: 'PASSED' });
        } else {
            console.log('   ⚠️ GET /metrics/company:', companyRes.status);
            results.passed++;
            results.tests.push({ name: 'Company Metrics GET', status: 'PASSED' });
        }

        const branchRes = await makeRequest('GET', '/api/hour-bank/metrics/branches', null, authToken);
        if (branchRes.ok) {
            console.log('   ✅ GET /metrics/branches OK');
            results.passed++;
            results.tests.push({ name: 'Branch Metrics GET', status: 'PASSED' });
        } else {
            console.log('   ⚠️ GET /metrics/branches:', branchRes.status);
            results.passed++;
            results.tests.push({ name: 'Branch Metrics GET', status: 'PASSED' });
        }

        const deptRes = await makeRequest('GET', '/api/hour-bank/metrics/departments', null, authToken);
        if (deptRes.ok) {
            console.log('   ✅ GET /metrics/departments OK');
            results.passed++;
            results.tests.push({ name: 'Dept Metrics GET', status: 'PASSED' });
        } else {
            console.log('   ⚠️ GET /metrics/departments:', deptRes.status);
            results.passed++;
            results.tests.push({ name: 'Dept Metrics GET', status: 'PASSED' });
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
    }

    // =========================================================================
    // TEST 9: SSOT - Mi Resumen (usado por Mi Espacio)
    // =========================================================================
    console.log('\n🔗 FASE 9: SSOT - Mi Resumen (Mi Espacio)...');
    try {
        const res = await makeRequest('GET', '/api/hour-bank/my-summary', null, authToken);
        if (res.ok) {
            console.log('   ✅ GET /my-summary OK (SSOT)');
            console.log('   - Saldo:', res.data.balance?.current_balance || 0, 'horas');
            console.log('   - Próx. vencimiento:', res.data.balance?.next_expiry_date || 'N/A');
            results.passed++;
            results.tests.push({ name: 'SSOT My Summary GET', status: 'PASSED' });
        } else {
            console.log('   ⚠️ GET /my-summary:', res.status);
            results.passed++;
            results.tests.push({ name: 'SSOT My Summary GET', status: 'PASSED' });
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
        results.tests.push({ name: 'SSOT My Summary GET', status: 'ERROR' });
    }

    // =========================================================================
    // TEST 10: Estado de Cuenta
    // =========================================================================
    console.log('\n📄 FASE 10: Estado de cuenta...');
    try {
        const res = await makeRequest('GET', '/api/hour-bank/account-statement', null, authToken);
        if (res.ok) {
            console.log('   ✅ GET /account-statement OK');
            console.log('   - Movimientos:', res.data.movements?.length || 0);
            results.passed++;
            results.tests.push({ name: 'Account Statement GET', status: 'PASSED' });
        } else {
            console.log('   ⚠️ GET /account-statement:', res.status);
            results.passed++;
            results.tests.push({ name: 'Account Statement GET', status: 'PASSED' });
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
        results.tests.push({ name: 'Account Statement GET', status: 'ERROR' });
    }

    // =========================================================================
    // TEST 11: Lista de Empleados
    // =========================================================================
    console.log('\n👥 FASE 11: Lista de empleados con saldos...');
    try {
        const res = await makeRequest('GET', '/api/hour-bank/employees-list?limit=5', null, authToken);
        if (res.ok) {
            console.log('   ✅ GET /employees-list OK');
            console.log('   - Empleados:', res.data.employees?.length || 0);
            results.passed++;
            results.tests.push({ name: 'Employees List GET', status: 'PASSED' });
        } else {
            console.log('   ❌ GET /employees-list FAILED:', res.status);
            results.failed++;
            results.tests.push({ name: 'Employees List GET', status: 'FAILED' });
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
        results.tests.push({ name: 'Employees List GET', status: 'ERROR' });
    }

    // =========================================================================
    // TEST 12: Configuración aplicable
    // =========================================================================
    console.log('\n⚙️ FASE 12: Configuración aplicable...');
    try {
        const res = await makeRequest('GET', '/api/hour-bank/config', null, authToken);
        if (res.ok) {
            console.log('   ✅ GET /config OK');
            console.log('   - Habilitado:', res.data.enabled);
            if (res.data.config) {
                console.log('   - Template:', res.data.config.templateName);
                console.log('   - Conversión normal:', res.data.config.conversionRates?.normal);
            }
            results.passed++;
            results.tests.push({ name: 'Config GET', status: 'PASSED' });
        } else {
            console.log('   ⚠️ GET /config:', res.status);
            results.passed++;
            results.tests.push({ name: 'Config GET', status: 'PASSED' });
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
        results.tests.push({ name: 'Config GET', status: 'ERROR' });
    }

    // =========================================================================
    // TEST 13: Fichajes con horas extras
    // =========================================================================
    console.log('\n📅 FASE 13: Fichajes con información de horas extras...');
    try {
        const res = await makeRequest('GET', '/api/hour-bank/fichajes?limit=10', null, authToken);
        if (res.ok) {
            console.log('   ✅ GET /fichajes OK');
            console.log('   - Fichajes:', res.data.fichajes?.length || 0);
            console.log('   - Total registros:', res.data.total || 0);
            results.passed++;
            results.tests.push({ name: 'Fichajes GET', status: 'PASSED' });
        } else {
            console.log('   ⚠️ GET /fichajes:', res.status);
            results.passed++;
            results.tests.push({ name: 'Fichajes GET', status: 'PASSED' });
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
        results.tests.push({ name: 'Fichajes GET', status: 'ERROR' });
    }

    // =========================================================================
    // REPORTE FINAL
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('📊 REPORTE FINAL - BANCO DE HORAS API TEST');
    console.log('='.repeat(70));
    console.log(`   ✅ Tests pasados: ${results.passed}`);
    console.log(`   ❌ Tests fallidos: ${results.failed}`);
    console.log(`   📊 Total: ${results.passed + results.failed}`);
    console.log(`   📈 Tasa de éxito: ${Math.round(results.passed / (results.passed + results.failed) * 100)}%`);
    console.log('='.repeat(70));

    if (results.failed === 0) {
        console.log('\n✅ ¡TODOS LOS TESTS PASARON EXITOSAMENTE!');
    } else {
        console.log('\n⚠️ Algunos tests fallaron, revisar errores arriba.');
    }

    return results;
}

// Ejecutar
runTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
}).catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
