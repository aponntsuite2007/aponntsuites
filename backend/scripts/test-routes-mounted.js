/**
 * TEST RÁPIDO - Verificar que las rutas están correctamente montadas
 * No requiere autenticación, solo verifica que los endpoints existen
 */

const API_BASE = 'http://localhost:9998/api';

async function testRoutesMounted() {
  console.log('\n🎯 ========== TEST DE RUTAS MONTADAS ==========\n');

  const results = {
    passed: [],
    failed: []
  };

  // Test 1: POST /api/budgets (debería dar 401 Unauthorized, NO 404)
  console.log('📋 TEST 1: POST /api/budgets');
  try {
    const response = await fetch(`${API_BASE}/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });

    if (response.status === 404) {
      console.log('   ❌ FAILED: Ruta no encontrada (404)');
      results.failed.push('POST /api/budgets');
    } else if (response.status === 401 || response.status === 403 || response.status === 500) {
      console.log(`   ✅ PASSED: Ruta existe (${response.status})`);
      results.passed.push('POST /api/budgets');
    } else {
      console.log(`   ⚠️  UNEXPECTED: Status ${response.status}`);
      results.passed.push('POST /api/budgets (unexpected)');
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    results.failed.push('POST /api/budgets');
  }

  // Test 2: GET /api/budgets (debería dar 401 o 200, NO 404)
  console.log('\n📋 TEST 2: GET /api/budgets');
  try {
    const response = await fetch(`${API_BASE}/budgets`);

    if (response.status === 404) {
      console.log('   ❌ FAILED: Ruta no encontrada (404)');
      results.failed.push('GET /api/budgets');
    } else if (response.status === 401 || response.status === 403 || response.status === 200) {
      console.log(`   ✅ PASSED: Ruta existe (${response.status})`);
      results.passed.push('GET /api/budgets');
    } else {
      console.log(`   ⚠️  UNEXPECTED: Status ${response.status}`);
      results.passed.push('GET /api/budgets (unexpected)');
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    results.failed.push('GET /api/budgets');
  }

  // Test 3: POST /api/contracts (debería dar 401 o 200, NO 404)
  console.log('\n📋 TEST 3: POST /api/contracts');
  try {
    const response = await fetch(`${API_BASE}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });

    if (response.status === 404) {
      console.log('   ❌ FAILED: Ruta no encontrada (404)');
      results.failed.push('POST /api/contracts');
    } else {
      console.log(`   ✅ PASSED: Ruta existe (${response.status})`);
      results.passed.push('POST /api/contracts');
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    results.failed.push('POST /api/contracts');
  }

  // Test 4: POST /api/invoices (debería dar 401 o 200, NO 404)
  console.log('\n📋 TEST 4: POST /api/invoices');
  try {
    const response = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });

    if (response.status === 404) {
      console.log('   ❌ FAILED: Ruta no encontrada (404)');
      results.failed.push('POST /api/invoices');
    } else {
      console.log(`   ✅ PASSED: Ruta existe (${response.status})`);
      results.passed.push('POST /api/invoices');
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    results.failed.push('POST /api/invoices');
  }

  // Test 5: GET /api/commissions/liquidations (debería dar 401 o 200, NO 404)
  console.log('\n📋 TEST 5: GET /api/commissions/liquidations');
  try {
    const response = await fetch(`${API_BASE}/commissions/liquidations`);

    if (response.status === 404) {
      console.log('   ❌ FAILED: Ruta no encontrada (404)');
      results.failed.push('GET /api/commissions/liquidations');
    } else {
      console.log(`   ✅ PASSED: Ruta existe (${response.status})`);
      results.passed.push('GET /api/commissions/liquidations');
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    results.failed.push('GET /api/commissions/liquidations');
  }

  // Resumen
  console.log('\n📊 ========== RESUMEN ==========\n');
  console.log(`   ✅ PASSED: ${results.passed.length} rutas`);
  console.log(`   ❌ FAILED: ${results.failed.length} rutas\n`);

  if (results.passed.length > 0) {
    console.log('   Rutas funcionando:');
    results.passed.forEach(route => console.log(`     • ${route}`));
  }

  if (results.failed.length > 0) {
    console.log('\n   Rutas fallidas:');
    results.failed.forEach(route => console.log(`     • ${route}`));
  }

  console.log('\n✅ ========== TEST COMPLETADO ==========\n');

  if (results.failed.length > 0) {
    console.log('⚠️  Algunas rutas tienen problemas. Verifica server.js\n');
    return false;
  } else {
    console.log('🎉 Todas las rutas están correctamente montadas!\n');
    return true;
  }
}

// Ejecutar test
testRoutesMounted()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
