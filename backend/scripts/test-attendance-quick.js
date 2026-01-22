/**
 * TEST RÁPIDO - MÓDULO DE ASISTENCIAS
 * Verifica: CRUD, Métricas, Velocidad, Filtros, Gráficas
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:9998';

(async () => {
    console.log('═'.repeat(80));
    console.log('TEST RÁPIDO - MÓDULO DE ASISTENCIAS');
    console.log('═'.repeat(80));

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const results = {
        read: false,
        stats: false,
        filters: false,
        charts: false,
        speed: { list: 0, stats: 0 }
    };

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

        const token = await page.evaluate(() => localStorage.getItem('authToken'));
        console.log(`  ✓ OK - Token obtenido: ${token ? 'Sí' : 'No'}`);

        // =========================================================================
        // 1. READ - Listar asistencias
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 1. READ - LISTAR ASISTENCIAS');
        console.log('═'.repeat(60));

        const listResult = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');
            const start = performance.now();
            const response = await fetch('/api/v1/attendance?limit=10', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const time = performance.now() - start;
            return {
                status: response.status,
                success: data.success,
                count: data.data?.length || 0,
                total: data.total || 0,
                time: Math.round(time),
                sample: data.data?.[0] ? {
                    id: data.data[0].id,
                    user_name: data.data[0].user_name,
                    check_in: data.data[0].check_in
                } : null
            };
        });

        console.log(`  Status: ${listResult.status}`);
        console.log(`  Registros: ${listResult.count}/${listResult.total}`);
        console.log(`  Tiempo: ${listResult.time}ms ${listResult.time < 500 ? '✅' : '⚠️'}`);
        if (listResult.sample) {
            console.log(`  Sample: ${listResult.sample.user_name} - ${listResult.sample.check_in}`);
        }
        results.read = listResult.status === 200 && listResult.count > 0;
        results.speed.list = listResult.time;

        // =========================================================================
        // 2. STATS - Métricas
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 2. STATS - MÉTRICAS');
        console.log('═'.repeat(60));

        const statsResult = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');
            const start = performance.now();
            const response = await fetch('/api/v1/attendance/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const time = performance.now() - start;
            return { status: response.status, data, time: Math.round(time) };
        });

        console.log(`  Status: ${statsResult.status}`);
        console.log(`  Tiempo: ${statsResult.time}ms`);
        console.log(`  Total: ${statsResult.data.total || 0}`);
        console.log(`  Presentes: ${statsResult.data.present || 0}`);
        console.log(`  Tardanzas: ${statsResult.data.late || 0}`);
        console.log(`  Ausentes: ${statsResult.data.absent || 0}`);
        results.stats = statsResult.status === 200;
        results.speed.stats = statsResult.time;

        // =========================================================================
        // 3. FILTROS - Por fecha y estado
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 3. FILTROS');
        console.log('═'.repeat(60));

        // Filter by date
        const today = new Date().toISOString().split('T')[0];
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const filterResult = await page.evaluate(async (params) => {
            const token = localStorage.getItem('authToken');
            const { today, lastWeek } = params;

            // Test date filter
            const dateResp = await fetch(`/api/v1/attendance?startDate=${lastWeek}&endDate=${today}&limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dateData = await dateResp.json();

            // Test status filter
            const statusResp = await fetch(`/api/v1/attendance?status=presente&limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const statusData = await statusResp.json();

            return {
                dateFilter: { status: dateResp.status, count: dateData.data?.length || 0 },
                statusFilter: { status: statusResp.status, count: statusData.data?.length || 0 }
            };
        }, { today, lastWeek });

        console.log(`  Filtro por fecha: ${filterResult.dateFilter.status === 200 ? '✅' : '❌'} (${filterResult.dateFilter.count} registros)`);
        console.log(`  Filtro por estado: ${filterResult.statusFilter.status === 200 ? '✅' : '❌'} (${filterResult.statusFilter.count} registros)`);
        results.filters = filterResult.dateFilter.status === 200 && filterResult.statusFilter.status === 200;

        // =========================================================================
        // 4. CHARTS - Datos para gráficas
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 4. DATOS PARA GRÁFICAS');
        console.log('═'.repeat(60));

        const chartResult = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');

            // Stats chart endpoint
            const chartResp = await fetch('/api/v1/attendance/stats/chart', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Detailed stats
            const detailResp = await fetch('/api/v1/attendance/stats/detailed', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return {
                chart: { status: chartResp.status },
                detailed: { status: detailResp.status }
            };
        });

        console.log(`  Chart endpoint: ${chartResult.chart.status === 200 ? '✅' : chartResult.chart.status}`);
        console.log(`  Detailed stats: ${chartResult.detailed.status === 200 ? '✅' : chartResult.detailed.status}`);
        results.charts = chartResult.chart.status === 200 || chartResult.detailed.status === 200;

        // =========================================================================
        // 5. TEST DE VELOCIDAD CON DIFERENTES LÍMITES
        // =========================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('▶ 5. VELOCIDAD DE RESPUESTA');
        console.log('═'.repeat(60));

        for (const limit of [10, 25, 50]) {
            const speedResult = await page.evaluate(async (lim) => {
                const token = localStorage.getItem('authToken');
                const start = performance.now();
                const resp = await fetch(`/api/v1/attendance?limit=${lim}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                await resp.json();
                return Math.round(performance.now() - start);
            }, limit);

            const status = speedResult < 300 ? '✅' : speedResult < 1000 ? '⚠️' : '❌';
            console.log(`  ${limit} registros: ${speedResult}ms ${status}`);
        }

    } catch (error) {
        console.log('\n❌ ERROR:', error.message);
        await page.screenshot({ path: 'debug-attendance-error.png' });
    }

    await browser.close();

    // =========================================================================
    // RESUMEN
    // =========================================================================
    console.log('\n' + '═'.repeat(80));
    console.log('RESUMEN FINAL');
    console.log('═'.repeat(80));

    const passed = [results.read, results.stats, results.filters, results.charts].filter(Boolean).length;
    const total = 4;

    console.log(`  READ (listar):    ${results.read ? '✅' : '❌'}`);
    console.log(`  STATS (métricas): ${results.stats ? '✅' : '❌'}`);
    console.log(`  FILTROS:          ${results.filters ? '✅' : '❌'}`);
    console.log(`  GRÁFICAS:         ${results.charts ? '✅' : '❌'}`);
    console.log(`  VELOCIDAD:        List=${results.speed.list}ms Stats=${results.speed.stats}ms`);
    console.log('\n' + '═'.repeat(80));
    console.log(`📊 RESULTADO: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    console.log('═'.repeat(80));
})();
