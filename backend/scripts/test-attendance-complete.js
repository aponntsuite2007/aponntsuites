/**
 * TEST COMPLETO - MÓDULO DE ASISTENCIAS
 * Verifica: CRUD, Métricas, Velocidad, Filtros, Gráficas, Multi-tenant
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:9998';
const COMPANY_ID = 11; // ISI

(async () => {
    console.log('═'.repeat(80));
    console.log('TEST COMPLETO - MÓDULO DE ASISTENCIAS');
    console.log('═'.repeat(80));

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const results = {
        crud: { create: false, read: false, update: false, delete: false },
        metrics: { kpis: false, stats: false },
        speed: { list: 0, stats: 0 },
        filters: { date: false, status: false, employee: false, department: false },
        charts: { daily: false, distribution: false },
        multiTenant: { isolation: false }
    };

    let authToken = '';
    const apiTimes = [];

    // Monitor API calls (simplified - timing via manual measurement)
    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            const status = r.status();
            const url = r.url().split('/api/')[1]?.substring(0, 60);

            if (['GET', 'POST', 'PUT', 'DELETE'].includes(method)) {
                apiTimes.push({ method, url, status, time: 0 });
                if (status >= 400) {
                    console.log(`      ❌ ${method} ${status}: ${url}`);
                }
            }
        }
    });

    try {
        // =========================================================================
        // LOGIN
        // =========================================================================
        console.log('\n▶ LOGIN');
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForSelector('#companySelect', { timeout: 15000 });
        await page.selectOption('#companySelect', 'isi');
        await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.evaluate(() => {
            document.getElementById('loginButton').disabled = false;
            document.getElementById('loginButton').click();
        });
        await page.waitForTimeout(5000);

        // Get token
        authToken = await page.evaluate(() => localStorage.getItem('authToken'));
        console.log(`  ✓ OK - Token obtenido: ${authToken ? 'Sí' : 'No'}`);

        // =========================================================================
        // 1. VERIFICAR MULTI-TENANT
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 1. VERIFICACIÓN MULTI-TENANT');
        console.log('═'.repeat(60));

        // Test API directly to ensure company isolation
        const mtResponse = await page.evaluate(async (companyId) => {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/v1/attendance?company_id=${companyId}&limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            // Check all records belong to company
            const allSameCompany = data.data?.every(r => r.company_id === companyId) ?? true;
            return {
                status: response.status,
                count: data.data?.length || 0,
                allSameCompany,
                sampleCompanyId: data.data?.[0]?.company_id
            };
        }, COMPANY_ID);

        console.log(`  Registros obtenidos: ${mtResponse.count}`);
        console.log(`  Todos de company_id=${COMPANY_ID}: ${mtResponse.allSameCompany ? '✅' : '❌'}`);
        results.multiTenant.isolation = mtResponse.allSameCompany;

        // =========================================================================
        // 2. NAVEGAR AL MÓDULO DE ASISTENCIAS
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 2. NAVEGACIÓN AL MÓDULO');
        console.log('═'.repeat(60));

        // Click on Asistencias menu
        const navResult = await page.evaluate(() => {
            const menuItems = document.querySelectorAll('.sidebar-item, .menu-item, [data-module]');
            for (const item of menuItems) {
                if (item.textContent.includes('Asistencia') || item.textContent.includes('Control de Asistencia')) {
                    item.click();
                    return true;
                }
            }
            // Try alternative navigation
            if (typeof loadModule === 'function') {
                loadModule('attendance');
                return true;
            }
            return false;
        });
        await page.waitForTimeout(3000);
        console.log(`  Navegación: ${navResult ? '✓' : '❌'}`);

        // =========================================================================
        // 3. VERIFICAR VELOCIDAD DE LISTADO
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 3. VELOCIDAD DE RESPUESTA');
        console.log('═'.repeat(60));

        // Test list speed with different page sizes
        const speedTests = [];
        for (const limit of [10, 25, 50]) {
            const startTime = Date.now();
            const speedResult = await page.evaluate(async (companyId, limit) => {
                const token = localStorage.getItem('authToken');
                const start = performance.now();
                const response = await fetch(`/api/v1/attendance?company_id=${companyId}&limit=${limit}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                const end = performance.now();
                return {
                    time: end - start,
                    count: data.data?.length || 0,
                    status: response.status
                };
            }, COMPANY_ID, limit);

            speedTests.push({ limit, time: speedResult.time, count: speedResult.count });
            console.log(`  Listar ${limit} registros: ${Math.round(speedResult.time)}ms (${speedResult.count} obtenidos)`);
        }

        results.speed.list = Math.round(speedTests[0].time);
        const avgSpeed = speedTests.reduce((a, b) => a + b.time, 0) / speedTests.length;
        console.log(`  Promedio: ${Math.round(avgSpeed)}ms ${avgSpeed < 500 ? '✅' : avgSpeed < 1000 ? '⚠️' : '❌'}`);

        // Test stats speed
        const statsStart = Date.now();
        const statsResult = await page.evaluate(async (companyId) => {
            const token = localStorage.getItem('authToken');
            const start = performance.now();
            const response = await fetch(`/api/v1/attendance/stats?company_id=${companyId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const end = performance.now();
            return { time: end - start, data };
        }, COMPANY_ID);

        results.speed.stats = Math.round(statsResult.time);
        console.log(`  Stats: ${Math.round(statsResult.time)}ms ${statsResult.time < 500 ? '✅' : '⚠️'}`);

        // =========================================================================
        // 4. VERIFICAR MÉTRICAS Y KPIs
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 4. MÉTRICAS Y KPIs');
        console.log('═'.repeat(60));

        // Get stats
        const metricsResult = await page.evaluate(async (companyId) => {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/v1/attendance/stats?company_id=${companyId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return await response.json();
        }, COMPANY_ID);

        if (metricsResult.success !== false) {
            console.log(`  Total registros: ${metricsResult.total || metricsResult.data?.total || 'N/A'}`);
            console.log(`  Presentes: ${metricsResult.present || metricsResult.data?.present || 'N/A'}`);
            console.log(`  Tardíos: ${metricsResult.late || metricsResult.data?.late || 'N/A'}`);
            console.log(`  Ausentes: ${metricsResult.absent || metricsResult.data?.absent || 'N/A'}`);
            results.metrics.stats = true;
        } else {
            console.log(`  ❌ Error obteniendo métricas: ${metricsResult.message}`);
        }

        // Get detailed stats
        const detailedStats = await page.evaluate(async (companyId) => {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/v1/attendance/stats/detailed?company_id=${companyId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return await response.json();
        }, COMPANY_ID);

        if (detailedStats.success !== false && detailedStats.data) {
            console.log(`  Horas normales: ${detailedStats.data.totalNormalHours || 'N/A'}`);
            console.log(`  Horas extras: ${detailedStats.data.totalOvertimeHours || 'N/A'}`);
            results.metrics.kpis = true;
        }

        // =========================================================================
        // 5. VERIFICAR FILTROS
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 5. FILTROS');
        console.log('═'.repeat(60));

        // Test date filter
        const today = new Date().toISOString().split('T')[0];
        const dateFilterResult = await page.evaluate(async (companyId, date) => {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/v1/attendance?company_id=${companyId}&date=${date}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            return { status: response.status, count: data.data?.length || 0 };
        }, COMPANY_ID, today);
        results.filters.date = dateFilterResult.status === 200;
        console.log(`  Filtro por fecha: ${results.filters.date ? '✅' : '❌'} (${dateFilterResult.count} registros)`);

        // Test status filter
        const statusFilterResult = await page.evaluate(async (companyId) => {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/v1/attendance?company_id=${companyId}&status=late`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const allLate = data.data?.every(r => r.status === 'late' || r.status === 'present') ?? true;
            return { status: response.status, count: data.data?.length || 0, allLate };
        }, COMPANY_ID);
        results.filters.status = statusFilterResult.status === 200;
        console.log(`  Filtro por status: ${results.filters.status ? '✅' : '❌'} (${statusFilterResult.count} registros)`);

        // Test department filter
        const deptFilterResult = await page.evaluate(async (companyId) => {
            const token = localStorage.getItem('authToken');
            // First get a department ID
            const deptResponse = await fetch(`/api/v1/departments?company_id=${companyId}&limit=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const depts = await deptResponse.json();
            const deptId = depts.data?.[0]?.id || depts[0]?.id;

            if (!deptId) return { status: 200, count: 0, hasDept: false };

            const response = await fetch(`/api/v1/attendance?company_id=${companyId}&department_id=${deptId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            return { status: response.status, count: data.data?.length || 0, hasDept: true };
        }, COMPANY_ID);
        results.filters.department = deptFilterResult.status === 200;
        console.log(`  Filtro por departamento: ${results.filters.department ? '✅' : '❌'} (${deptFilterResult.count} registros)`);

        // Test employee filter
        const empFilterResult = await page.evaluate(async (companyId) => {
            const token = localStorage.getItem('authToken');
            // First get a user ID
            const userResponse = await fetch(`/api/v1/users?company_id=${companyId}&limit=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const users = await userResponse.json();
            const userId = users.data?.[0]?.id || users[0]?.id;

            if (!userId) return { status: 200, count: 0, hasUser: false };

            const response = await fetch(`/api/v1/attendance?company_id=${companyId}&user_id=${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            return { status: response.status, count: data.data?.length || 0, hasUser: true };
        }, COMPANY_ID);
        results.filters.employee = empFilterResult.status === 200;
        console.log(`  Filtro por empleado: ${results.filters.employee ? '✅' : '❌'} (${empFilterResult.count} registros)`);

        // =========================================================================
        // 6. VERIFICAR GRÁFICAS (Chart Data)
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 6. DATOS PARA GRÁFICAS');
        console.log('═'.repeat(60));

        // Test chart endpoint
        const chartResult = await page.evaluate(async (companyId) => {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/v1/attendance/stats/chart?company_id=${companyId}&days=30`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            return {
                status: response.status,
                hasData: Array.isArray(data.data) || Array.isArray(data),
                dataPoints: data.data?.length || data.length || 0
            };
        }, COMPANY_ID);
        results.charts.daily = chartResult.status === 200 && chartResult.hasData;
        console.log(`  Datos diarios (30 días): ${results.charts.daily ? '✅' : '❌'} (${chartResult.dataPoints} puntos)`);

        // Test summary/distribution
        const summaryResult = await page.evaluate(async (companyId) => {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/v1/attendance/stats/summary?company_id=${companyId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            return {
                status: response.status,
                hasDistribution: !!data.distribution || !!data.data?.distribution
            };
        }, COMPANY_ID);
        results.charts.distribution = summaryResult.status === 200;
        console.log(`  Distribución/Resumen: ${results.charts.distribution ? '✅' : '❌'}`);

        // =========================================================================
        // 7. VERIFICAR CRUD
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 7. OPERACIONES CRUD');
        console.log('═'.repeat(60));

        // READ - Already tested above
        results.crud.read = mtResponse.status === 200;
        console.log(`  READ: ${results.crud.read ? '✅' : '❌'}`);

        // CREATE - Test manual attendance creation
        const createResult = await page.evaluate(async (companyId) => {
            const token = localStorage.getItem('authToken');

            // First get a user to create attendance for
            const userResponse = await fetch(`/api/v1/users?company_id=${companyId}&limit=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const users = await userResponse.json();
            const userId = users.data?.[0]?.id || users[0]?.id;

            if (!userId) return { status: 400, message: 'No user found' };

            // Create attendance record
            const response = await fetch(`/api/v1/attendance`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    company_id: companyId,
                    user_id: userId,
                    date: new Date().toISOString().split('T')[0],
                    check_in: new Date().toISOString(),
                    status: 'present',
                    origin_type: 'manual',
                    checkInMethod: 'manual'
                })
            });
            const data = await response.json();
            return { status: response.status, id: data.data?.id || data.id, message: data.message };
        }, COMPANY_ID);
        results.crud.create = createResult.status === 201 || createResult.status === 200;
        console.log(`  CREATE: ${results.crud.create ? '✅' : '❌'} ${createResult.message || ''}`);

        // UPDATE - If we created one, try to update it
        if (createResult.id) {
            const updateResult = await page.evaluate(async (id, companyId) => {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`/api/v1/attendance/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        company_id: companyId,
                        status: 'late',
                        notes: 'Test update'
                    })
                });
                const data = await response.json();
                return { status: response.status, message: data.message };
            }, createResult.id, COMPANY_ID);
            results.crud.update = updateResult.status === 200;
            console.log(`  UPDATE: ${results.crud.update ? '✅' : '❌'} ${updateResult.message || ''}`);

            // DELETE
            const deleteResult = await page.evaluate(async (id, companyId) => {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`/api/v1/attendance/${id}?company_id=${companyId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                return { status: response.status, message: data.message };
            }, createResult.id, COMPANY_ID);
            results.crud.delete = deleteResult.status === 200 || deleteResult.status === 204;
            console.log(`  DELETE: ${results.crud.delete ? '✅' : '❌'} ${deleteResult.message || ''}`);
        } else {
            console.log(`  UPDATE: ⚠️ No se pudo probar (no se creó registro)`);
            console.log(`  DELETE: ⚠️ No se pudo probar (no se creó registro)`);
        }

        // =========================================================================
        // 8. VERIFICAR ANALYTICS (Scoring y Patrones)
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 8. ANALYTICS (SCORING Y PATRONES)');
        console.log('═'.repeat(60));

        const analyticsResult = await page.evaluate(async (companyId) => {
            const token = localStorage.getItem('authToken');

            // Company stats
            const statsResponse = await fetch(`/api/attendance-analytics/company/${companyId}/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const stats = await statsResponse.json();

            // Critical patterns
            const patternsResponse = await fetch(`/api/attendance-analytics/company/${companyId}/critical-patterns`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const patterns = await patternsResponse.json();

            return {
                statsOk: statsResponse.status === 200,
                stats: stats.data || stats,
                patternsOk: patternsResponse.status === 200,
                patternsCount: patterns.data?.length || patterns.length || 0
            };
        }, COMPANY_ID);

        console.log(`  Stats empresa: ${analyticsResult.statsOk ? '✅' : '❌'}`);
        console.log(`  Patrones críticos: ${analyticsResult.patternsOk ? '✅' : '❌'} (${analyticsResult.patternsCount} encontrados)`);
        if (analyticsResult.stats?.averageScore) {
            console.log(`  Score promedio: ${analyticsResult.stats.averageScore}`);
        }

    } catch (error) {
        console.log('\n❌ ERROR:', error.message);
        await page.screenshot({ path: 'test-attendance-error.png' });
    }

    await browser.close();

    // =========================================================================
    // RESUMEN FINAL
    // =========================================================================
    console.log('\n' + '═'.repeat(80));
    console.log('RESUMEN FINAL - MÓDULO DE ASISTENCIAS');
    console.log('═'.repeat(80));

    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│ CATEGORÍA           │ RESULTADO │ DETALLES                  │');
    console.log('├─────────────────────────────────────────────────────────────┤');

    // CRUD
    const crudScore = Object.values(results.crud).filter(v => v).length;
    console.log(`│ CRUD                │ ${crudScore}/4      │ C:${results.crud.create ? '✅' : '❌'} R:${results.crud.read ? '✅' : '❌'} U:${results.crud.update ? '✅' : '❌'} D:${results.crud.delete ? '✅' : '❌'}                  │`);

    // Métricas
    const metricsScore = Object.values(results.metrics).filter(v => v).length;
    console.log(`│ Métricas            │ ${metricsScore}/2      │ KPIs:${results.metrics.kpis ? '✅' : '❌'} Stats:${results.metrics.stats ? '✅' : '❌'}               │`);

    // Velocidad
    const speedOk = results.speed.list < 500 && results.speed.stats < 500;
    console.log(`│ Velocidad           │ ${speedOk ? '✅' : '⚠️'}       │ List:${results.speed.list}ms Stats:${results.speed.stats}ms      │`);

    // Filtros
    const filtersScore = Object.values(results.filters).filter(v => v).length;
    console.log(`│ Filtros             │ ${filtersScore}/4      │ Date:${results.filters.date ? '✅' : '❌'} Status:${results.filters.status ? '✅' : '❌'} Dept:${results.filters.department ? '✅' : '❌'} Emp:${results.filters.employee ? '✅' : '❌'} │`);

    // Gráficas
    const chartsScore = Object.values(results.charts).filter(v => v).length;
    console.log(`│ Gráficas            │ ${chartsScore}/2      │ Daily:${results.charts.daily ? '✅' : '❌'} Dist:${results.charts.distribution ? '✅' : '❌'}              │`);

    // Multi-tenant
    console.log(`│ Multi-Tenant        │ ${results.multiTenant.isolation ? '✅' : '❌'}       │ Aislamiento de datos       │`);

    console.log('└─────────────────────────────────────────────────────────────┘');

    // Calculate total score
    const totalTests = 4 + 2 + 1 + 4 + 2 + 1; // 14 tests
    const passedTests = crudScore + metricsScore + (speedOk ? 1 : 0) + filtersScore + chartsScore + (results.multiTenant.isolation ? 1 : 0);
    const percentage = Math.round((passedTests / totalTests) * 100);

    console.log(`\n📊 RESULTADO TOTAL: ${passedTests}/${totalTests} (${percentage}%)`);
    console.log('═'.repeat(80));
})();
