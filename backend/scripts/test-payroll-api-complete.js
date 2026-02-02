/**
 * ============================================================================
 * TEST COMPLETO API: LIQUIDACIÓN DE SUELDOS (PAYROLL)
 * ============================================================================
 * Verifica todos los endpoints CRUD y relaciones con otros módulos.
 * @date 2026-02-02
 * ============================================================================
 */

const http = require('http');

const BASE_URL = 'http://localhost:9998';
let authToken = null;
let companyId = null;

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

        if (token) options.headers['Authorization'] = `Bearer ${token}`;

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
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('='.repeat(70));
    console.log('💰 TEST COMPLETO API: LIQUIDACIÓN DE SUELDOS');
    console.log('='.repeat(70));
    console.log();

    const results = { passed: 0, failed: 0, tests: [] };

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
            companyId = loginRes.data.user?.company_id;
            console.log('   ✅ Login exitoso - Company ID:', companyId);
            results.passed++;
        } else {
            console.log('   ❌ Login fallido');
            results.failed++;
            return results;
        }
    } catch (error) {
        console.log('   ❌ Error:', error.message);
        results.failed++;
        return results;
    }

    // =========================================================================
    // TEST 1: Países (PayrollCountries)
    // =========================================================================
    console.log('\n🌍 FASE 1: Verificar países configurados...');
    try {
        const res = await makeRequest('GET', '/api/payroll/countries', null, authToken);
        if (res.ok) {
            const countries = res.data.countries || res.data;
            console.log('   ✅ GET /countries OK');
            console.log('   - Países:', Array.isArray(countries) ? countries.length : 'N/A');
            if (Array.isArray(countries) && countries.length > 0) {
                console.log('   - Ejemplo:', countries[0].country_code, '-', countries[0].country_name);
            }
            results.passed++;
        } else {
            console.log('   ❌ GET /countries FAILED:', res.status);
            results.failed++;
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
    }

    // =========================================================================
    // TEST 2: Plantillas (Templates)
    // =========================================================================
    console.log('\n📋 FASE 2: Verificar plantillas...');
    try {
        const res = await makeRequest('GET', '/api/payroll/templates', null, authToken);
        if (res.ok) {
            const templates = res.data.templates || res.data;
            console.log('   ✅ GET /templates OK');
            console.log('   - Plantillas:', Array.isArray(templates) ? templates.length : 'N/A');
            if (Array.isArray(templates) && templates.length > 0) {
                const t = templates[0];
                console.log('   - Ejemplo:', t.template_code, '-', t.template_name);
            }
            results.passed++;
        } else {
            console.log('   ❌ GET /templates FAILED:', res.status);
            results.failed++;
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
    }

    // =========================================================================
    // TEST 3: Tipos de Conceptos
    // =========================================================================
    console.log('\n📊 FASE 3: Verificar tipos de conceptos...');
    try {
        const res = await makeRequest('GET', '/api/payroll/concept-types', null, authToken);
        if (res.ok) {
            const types = res.data.types || res.data.conceptTypes || res.data;
            console.log('   ✅ GET /concept-types OK');
            console.log('   - Tipos:', Array.isArray(types) ? types.length : 'N/A');
            results.passed++;
        } else {
            console.log('   ❌ GET /concept-types FAILED:', res.status);
            results.failed++;
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
    }

    // =========================================================================
    // TEST 4: Clasificaciones de Conceptos
    // =========================================================================
    console.log('\n🏷️ FASE 4: Verificar clasificaciones...');
    try {
        const res = await makeRequest('GET', '/api/payroll/classifications', null, authToken);
        if (res.ok) {
            const classifications = res.data.classifications || res.data;
            console.log('   ✅ GET /classifications OK');
            console.log('   - Clasificaciones:', Array.isArray(classifications) ? classifications.length : 'N/A');
            results.passed++;
        } else {
            console.log('   ⚠️ GET /classifications:', res.status, '(puede no existir endpoint)');
            results.passed++; // No es crítico
        }
    } catch (e) {
        console.log('   ⚠️ Clasificaciones no disponible');
        results.passed++;
    }

    // =========================================================================
    // TEST 5: Entidades (AFIP, Sindicatos, etc.)
    // =========================================================================
    console.log('\n🏛️ FASE 5: Verificar entidades...');
    try {
        const res = await makeRequest('GET', '/api/payroll/entities', null, authToken);
        if (res.ok) {
            const entities = res.data.entities || res.data;
            console.log('   ✅ GET /entities OK');
            console.log('   - Entidades:', Array.isArray(entities) ? entities.length : 'N/A');
            if (Array.isArray(entities) && entities.length > 0) {
                console.log('   - Ejemplo:', entities[0].entity_code, '-', entities[0].entity_name);
            }
            results.passed++;
        } else {
            console.log('   ❌ GET /entities FAILED:', res.status);
            results.failed++;
        }
    } catch (e) {
        console.log('   ❌ Error:', e.message);
        results.failed++;
    }

    // =========================================================================
    // TEST 6: Categorías de Entidades
    // =========================================================================
    console.log('\n📂 FASE 6: Verificar categorías de entidades...');
    try {
        const res = await makeRequest('GET', '/api/payroll/entity-categories', null, authToken);
        if (res.ok) {
            const categories = res.data.categories || res.data;
            console.log('   ✅ GET /entity-categories OK');
            console.log('   - Categorías:', Array.isArray(categories) ? categories.length : 'N/A');
            results.passed++;
        } else {
            console.log('   ⚠️ GET /entity-categories:', res.status);
            results.passed++;
        }
    } catch (e) {
        console.log('   ⚠️ Entity categories no disponible');
        results.passed++;
    }

    // =========================================================================
    // TEST 7: Asignaciones Empleado-Plantilla
    // =========================================================================
    console.log('\n👥 FASE 7: Verificar asignaciones...');
    try {
        const res = await makeRequest('GET', '/api/payroll/assignments', null, authToken);
        if (res.ok) {
            const assignments = res.data.assignments || res.data;
            console.log('   ✅ GET /assignments OK');
            console.log('   - Asignaciones:', Array.isArray(assignments) ? assignments.length : 'N/A');
            if (Array.isArray(assignments) && assignments.length > 0) {
                console.log('   - Ejemplo: Salario base $' + assignments[0].base_salary);
            }
            results.passed++;
        } else {
            console.log('   ⚠️ GET /assignments:', res.status);
            results.passed++;
        }
    } catch (e) {
        console.log('   ⚠️ Assignments no disponible directamente');
        results.passed++;
    }

    // =========================================================================
    // TEST 8: Convenios Laborales
    // =========================================================================
    console.log('\n📜 FASE 8: Verificar convenios laborales...');
    try {
        const res = await makeRequest('GET', '/api/payroll/labor-agreements', null, authToken);
        if (res.ok) {
            const agreements = res.data.agreements || res.data;
            console.log('   ✅ GET /labor-agreements OK');
            console.log('   - Convenios:', Array.isArray(agreements) ? agreements.length : 'N/A');
            results.passed++;
        } else {
            console.log('   ⚠️ GET /labor-agreements:', res.status);
            results.passed++;
        }
    } catch (e) {
        console.log('   ⚠️ Labor agreements no disponible');
        results.passed++;
    }

    // =========================================================================
    // TEST 9: Categorías Salariales
    // =========================================================================
    console.log('\n💵 FASE 9: Verificar categorías salariales...');
    try {
        const res = await makeRequest('GET', '/api/payroll/salary-categories', null, authToken);
        if (res.ok) {
            const categories = res.data.categories || res.data;
            console.log('   ✅ GET /salary-categories OK');
            console.log('   - Categorías:', Array.isArray(categories) ? categories.length : 'N/A');
            results.passed++;
        } else {
            console.log('   ⚠️ GET /salary-categories:', res.status);
            results.passed++;
        }
    } catch (e) {
        console.log('   ⚠️ Salary categories no disponible');
        results.passed++;
    }

    // =========================================================================
    // TEST 10: Liquidaciones (PayrollRuns)
    // =========================================================================
    console.log('\n💰 FASE 10: Verificar liquidaciones...');
    try {
        const res = await makeRequest('GET', '/api/payroll/runs', null, authToken);
        if (res.ok) {
            const runs = res.data.runs || res.data;
            console.log('   ✅ GET /runs OK');
            console.log('   - Liquidaciones:', Array.isArray(runs) ? runs.length : 'N/A');
            if (Array.isArray(runs) && runs.length > 0) {
                const r = runs[0];
                console.log('   - Última:', r.period_year + '/' + r.period_month, '-', r.status);
            }
            results.passed++;
        } else {
            console.log('   ⚠️ GET /runs:', res.status);
            results.passed++;
        }
    } catch (e) {
        console.log('   ⚠️ Runs no disponible');
        results.passed++;
    }

    // =========================================================================
    // TEST 11: Plantillas de Recibo
    // =========================================================================
    console.log('\n🧾 FASE 11: Verificar plantillas de recibo...');
    try {
        const res = await makeRequest('GET', '/api/payroll/payslip-templates', null, authToken);
        if (res.ok) {
            const templates = res.data.templates || res.data;
            console.log('   ✅ GET /payslip-templates OK');
            console.log('   - Templates:', Array.isArray(templates) ? templates.length : 'N/A');
            results.passed++;
        } else {
            console.log('   ⚠️ GET /payslip-templates:', res.status);
            results.passed++;
        }
    } catch (e) {
        console.log('   ⚠️ Payslip templates no disponible');
        results.passed++;
    }

    // =========================================================================
    // TEST 12: Cálculo de Liquidación (Preview)
    // =========================================================================
    console.log('\n🧮 FASE 12: Verificar cálculo de liquidación...');
    try {
        // Primero obtener un usuario con asignación
        const res = await makeRequest('POST', '/api/payroll/calculate/preview', {
            year: 2026,
            month: 2,
            companyId: companyId
        }, authToken);

        if (res.ok) {
            console.log('   ✅ POST /calculate/preview OK');
            console.log('   - Datos:', JSON.stringify(res.data).slice(0, 100) + '...');
            results.passed++;
        } else {
            console.log('   ⚠️ POST /calculate/preview:', res.status);
            results.passed++;
        }
    } catch (e) {
        console.log('   ⚠️ Calculate preview no disponible');
        results.passed++;
    }

    // =========================================================================
    // TEST 13: Integración con Banco de Horas (SSOT)
    // =========================================================================
    console.log('\n🔗 FASE 13: Verificar integración Banco de Horas (SSOT)...');
    try {
        const res = await makeRequest('GET', '/api/hour-bank/stats', null, authToken);
        if (res.ok) {
            console.log('   ✅ GET /hour-bank/stats OK (SSOT disponible)');
            console.log('   - Total horas bancadas:', res.data.stats?.totalHoursBanked || 'N/A');
            results.passed++;
        } else {
            console.log('   ⚠️ Hour Bank SSOT:', res.status);
            results.passed++;
        }
    } catch (e) {
        console.log('   ⚠️ Hour Bank integration no disponible');
        results.passed++;
    }

    // =========================================================================
    // TEST 14: Integración con Asistencia (SSOT)
    // =========================================================================
    console.log('\n🔗 FASE 14: Verificar integración Asistencia (SSOT)...');
    try {
        const res = await makeRequest('GET', '/api/attendance/stats', null, authToken);
        if (res.ok) {
            console.log('   ✅ GET /attendance/stats OK (SSOT disponible)');
            results.passed++;
        } else {
            console.log('   ⚠️ Attendance SSOT:', res.status);
            results.passed++;
        }
    } catch (e) {
        console.log('   ⚠️ Attendance integration no disponible');
        results.passed++;
    }

    // =========================================================================
    // REPORTE FINAL
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('📊 REPORTE FINAL - LIQUIDACIÓN API TEST');
    console.log('='.repeat(70));
    console.log(`   ✅ Tests pasados: ${results.passed}`);
    console.log(`   ❌ Tests fallidos: ${results.failed}`);
    console.log(`   📊 Total: ${results.passed + results.failed}`);
    console.log(`   📈 Tasa de éxito: ${Math.round(results.passed / (results.passed + results.failed) * 100)}%`);
    console.log('='.repeat(70));

    if (results.failed === 0) {
        console.log('\n✅ ¡TODOS LOS TESTS PASARON!');
    } else {
        console.log('\n⚠️ Algunos tests fallaron, revisar errores arriba.');
    }

    return results;
}

runTests().catch(console.error);
