/**
 * Test HSE Module APIs
 */

async function test() {
  try {
    console.log('🛡️ Testing HSE Module APIs...\n');

    // Wait for server
    await new Promise(r => setTimeout(r, 2000));

    // Login
    const loginRes = await fetch('http://localhost:9998/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'administrador', password: 'admin123', companyId: 1 })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Login OK\n');

    const headers = { 'Authorization': 'Bearer ' + token };

    // Test 1: Categories
    console.log('📋 Test 1: GET /api/v1/hse/categories');
    const catRes = await fetch('http://localhost:9998/api/v1/hse/categories', { headers });
    const catData = await catRes.json();
    console.log('   Result:', catData.success ? `${catData.categories?.length || 0} categories` : catData.error);
    if (catData.categories?.[0]) {
      console.log('   Sample:', catData.categories[0].code, '-', catData.categories[0].name_es);
    }
    console.log('');

    // Test 2: Catalog (empty initially)
    console.log('📋 Test 2: GET /api/v1/hse/catalog');
    const catalogRes = await fetch('http://localhost:9998/api/v1/hse/catalog', { headers });
    const catalogData = await catalogRes.json();
    console.log('   Result:', catalogData.success ? `${catalogData.catalog?.length || 0} items` : catalogData.error);
    console.log('');

    // Test 3: Dashboard KPIs
    console.log('📋 Test 3: GET /api/v1/hse/dashboard');
    const dashRes = await fetch('http://localhost:9998/api/v1/hse/dashboard', { headers });
    const dashData = await dashRes.json();
    console.log('   Result:', dashData.success ? 'KPIs received' : dashData.error);
    if (dashData.kpis) {
      console.log('   KPIs:', JSON.stringify(dashData.kpis, null, 2).substring(0, 200) + '...');
    }
    console.log('');

    // Test 4: Config
    console.log('📋 Test 4: GET /api/v1/hse/config');
    const cfgRes = await fetch('http://localhost:9998/api/v1/hse/config', { headers });
    const cfgData = await cfgRes.json();
    console.log('   Result:', cfgData.success ? 'Config received' : cfgData.error);
    console.log('');

    // Test 5: Create catalog item
    console.log('📋 Test 5: POST /api/v1/hse/catalog (Create EPP)');
    const newItem = {
      category_id: 1,  // HEAD - Protección de Cabeza
      code: 'CASCO-TEST-001',
      name: 'Casco de Seguridad Industrial Test',
      description: 'Casco de prueba para testing del módulo HSE',
      brand: '3M',
      model: 'H-700',
      default_lifespan_days: 365,
      certifications: JSON.stringify(['EN 397', 'ANSI Z89.1']),
      available_sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
      unit_cost: 45.99
    };
    const createRes = await fetch('http://localhost:9998/api/v1/hse/catalog', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });
    const createData = await createRes.json();
    console.log('   Result:', createData.success ? `Created ID=${createData.item?.id}` : createData.error);
    console.log('');

    // Test 6: Get catalog again
    console.log('📋 Test 6: GET /api/v1/hse/catalog (After create)');
    const catalog2Res = await fetch('http://localhost:9998/api/v1/hse/catalog', { headers });
    const catalog2Data = await catalog2Res.json();
    console.log('   Result:', catalog2Data.success ? `${catalog2Data.catalog?.length || 0} items` : catalog2Data.error);
    console.log('');

    // Test 7: Requirements matrix
    console.log('📋 Test 7: GET /api/v1/hse/requirements');
    const reqRes = await fetch('http://localhost:9998/api/v1/hse/requirements', { headers });
    const reqData = await reqRes.json();
    console.log('   Result:', reqData.success ? `${reqData.requirements?.length || 0} requirements` : reqData.error);
    console.log('');

    // Test 8: Deliveries
    console.log('📋 Test 8: GET /api/v1/hse/deliveries');
    const delRes = await fetch('http://localhost:9998/api/v1/hse/deliveries', { headers });
    const delData = await delRes.json();
    console.log('   Result:', delData.success ? `${delData.deliveries?.length || 0} deliveries` : delData.error);
    console.log('');

    // Test 9: Inspections
    console.log('📋 Test 9: GET /api/v1/hse/inspections');
    const inspRes = await fetch('http://localhost:9998/api/v1/hse/inspections', { headers });
    const inspData = await inspRes.json();
    console.log('   Result:', inspData.success ? `${inspData.inspections?.length || 0} inspections` : inspData.error);
    console.log('');

    // Test 10: Expiring deliveries
    console.log('📋 Test 10: GET /api/v1/hse/deliveries/expiring');
    const expRes = await fetch('http://localhost:9998/api/v1/hse/deliveries/expiring?days=30', { headers });
    const expData = await expRes.json();
    console.log('   Result:', expData.success ? `${expData.deliveries?.length || 0} expiring in 30 days` : expData.error);
    console.log('');

    console.log('═════════════════════════════════════════════');
    console.log('✅ HSE Module API Tests COMPLETED');
    console.log('═════════════════════════════════════════════');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  }
  process.exit(0);
}

test();
