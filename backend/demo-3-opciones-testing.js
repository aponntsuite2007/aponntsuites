/**
 * DEMO DE LAS 3 NUEVAS OPCIONES DE TESTING
 *
 * Este script demuestra cómo usar las 3 nuevas opciones de testing:
 * 1. TEST GLOBAL - Todos los módulos con simulación completa
 * 2. TEST APK KIOSK - Testing específico de Android
 * 3. TEST MÓDULO ESPECÍFICO - Con selector de módulo
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuración base
const BASE_URL = `http://localhost:${process.env.PORT || 9998}`;
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc2NmRlNDk1LWU0ZjMtNGU5MS1hNTA5LTFhNDk1YzUyZTE1YyIsInJvbGUiOiJhZG1pbiIsImVtcGxveWVlSWQiOiJFTVAtSVNJLTAwMSIsImNvbXBhbnlfaWQiOjExLCJpYXQiOjE3NjExNjg3MjAsImV4cCI6MTc2MTI1NTEyMH0.jMdjyuJKDwFzZEO_Mb9EP0fvYSs9EYT2TwagkZUg8r4';

// Funciones de API
async function makeRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { error: error.message };
  }
}

async function testGlobal() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  🌍 OPCIÓN 1: TEST GLOBAL                                 ║');
  console.log('║  Testing completo de TODOS los módulos y submódulos      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('📡 Enviando request a: POST /api/audit/test/global');
  console.log('⚙️  Configuración: Simulación completa + CRUD + Workflows + Datos random\n');

  const result = await makeRequest('/api/audit/test/global', 'POST', {
    parallel: true,
    autoHeal: true
  });

  if (result.error) {
    console.log('❌ Error:', result.error);
    return;
  }

  console.log('✅ Respuesta recibida:');
  console.log(JSON.stringify(result.data, null, 2));

  if (result.data.success) {
    console.log('\n🎯 RESULTADO:');
    console.log(`   • Execution ID: ${result.data.execution_id}`);
    console.log(`   • Status: ${result.data.status}`);
    console.log(`   • Tipo: ${result.data.test_type}`);
    console.log('\n📋 CARACTERÍSTICAS:');
    result.data.features.forEach(feature => {
      console.log(`   ✅ ${feature}`);
    });
  }
}

async function testApkKiosk() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  📱 OPCIÓN 2: TEST APK KIOSK                              ║');
  console.log('║  Testing específico de la aplicación Android Kiosk      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('📡 Enviando request a: POST /api/audit/test/apk-kiosk');
  console.log('⚙️  Configuración: Testing específico de APK Android + Flutter\n');

  const result = await makeRequest('/api/audit/test/apk-kiosk', 'POST', {
    autoHeal: true
  });

  if (result.error) {
    console.log('❌ Error:', result.error);
    return;
  }

  console.log('✅ Respuesta recibida:');
  console.log(JSON.stringify(result.data, null, 2));

  if (result.data.success) {
    console.log('\n🎯 RESULTADO:');
    console.log(`   • Execution ID: ${result.data.execution_id}`);
    console.log(`   • Status: ${result.data.status}`);
    console.log(`   • Tipo: ${result.data.test_type}`);
    console.log('\n📋 CARACTERÍSTICAS:');
    result.data.features.forEach(feature => {
      console.log(`   ✅ ${feature}`);
    });
  }
}

async function listModules() {
  console.log('\n📋 Obteniendo lista de módulos disponibles...\n');

  const result = await makeRequest('/api/audit/test/modules', 'GET');

  if (result.error) {
    console.log('❌ Error:', result.error);
    return null;
  }

  console.log(`✅ ${result.data.total_modules} módulos encontrados`);
  console.log(`📂 Categorías: ${result.data.categories.join(', ')}\n`);

  // Mostrar módulos por categoría (solo los primeros de cada categoría para no saturar)
  console.log('📋 MÓDULOS DISPONIBLES POR CATEGORÍA:\n');

  Object.entries(result.data.modules_by_category).forEach(([category, modules]) => {
    console.log(`🔹 ${category.toUpperCase()}:`);
    modules.slice(0, 3).forEach(module => { // Solo los primeros 3 de cada categoría
      console.log(`   • ${module.key} - ${module.name}`);
      if (module.has_submodules) {
        console.log(`     └─ Submódulos: ${module.submodules.length}`);
      }
    });
    if (modules.length > 3) {
      console.log(`   ... y ${modules.length - 3} más`);
    }
    console.log('');
  });

  return result.data.all_modules;
}

async function testSpecificModule() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  🎯 OPCIÓN 3: TEST MÓDULO ESPECÍFICO                      ║');
  console.log('║  Testing completo de un módulo seleccionado + submódulos ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Primero obtener lista de módulos
  const modules = await listModules();
  if (!modules) return;

  // Obtener módulo del usuario
  const moduleKey = await new Promise((resolve) => {
    rl.question('🔸 Ingrese el KEY del módulo a testear (ej: users, attendance, medical): ', (answer) => {
      resolve(answer.trim());
    });
  });

  if (!moduleKey) {
    console.log('❌ Debe especificar un módulo');
    return;
  }

  console.log(`\n📡 Enviando request a: POST /api/audit/test/module`);
  console.log(`⚙️  Módulo seleccionado: ${moduleKey}`);
  console.log('⚙️  Configuración: Testing específico + CRUD + Workflows del módulo\n');

  const result = await makeRequest('/api/audit/test/module', 'POST', {
    moduleKey,
    autoHeal: true
  });

  if (result.error) {
    console.log('❌ Error:', result.error);
    return;
  }

  console.log('✅ Respuesta recibida:');
  console.log(JSON.stringify(result.data, null, 2));

  if (result.data.success) {
    console.log('\n🎯 RESULTADO:');
    console.log(`   • Módulo: ${result.data.module.name} (${result.data.module.key})`);
    console.log(`   • Categoría: ${result.data.module.category}`);
    console.log(`   • Execution ID: ${result.data.execution_id}`);
    console.log(`   • Status: ${result.data.status}`);
    console.log('\n📋 CARACTERÍSTICAS:');
    result.data.features.forEach(feature => {
      console.log(`   ✅ ${feature}`);
    });
  }
}

async function checkStatus() {
  console.log('\n📊 Verificando estado del auditor...\n');

  const result = await makeRequest('/api/audit/status', 'GET');

  if (result.error) {
    console.log('❌ Error:', result.error);
    return;
  }

  console.log('✅ Estado del auditor:');
  console.log(JSON.stringify(result.data.status, null, 2));
}

function showMenu() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║            🧪 DEMO DE LAS 3 OPCIONES DE TESTING          ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║                                                           ║');
  console.log('║  1️⃣  TEST GLOBAL - Todos los módulos                     ║');
  console.log('║  2️⃣  TEST APK KIOSK - Aplicación Android                 ║');
  console.log('║  3️⃣  TEST MÓDULO ESPECÍFICO - Selector de módulo         ║');
  console.log('║  4️⃣  LISTAR MÓDULOS - Ver opciones disponibles           ║');
  console.log('║  5️⃣  ESTADO - Ver estado del auditor                     ║');
  console.log('║  0️⃣  SALIR                                               ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

async function main() {
  console.log('🚀 Iniciando demo de las 3 opciones de testing...');
  console.log(`🔗 Conectando a: ${BASE_URL}`);
  console.log('🔑 Token configurado: ✅\n');

  while (true) {
    showMenu();

    const option = await new Promise((resolve) => {
      rl.question('Seleccione una opción (0-5): ', (answer) => {
        resolve(answer.trim());
      });
    });

    console.log('\n' + '═'.repeat(60));

    switch (option) {
      case '1':
        await testGlobal();
        break;
      case '2':
        await testApkKiosk();
        break;
      case '3':
        await testSpecificModule();
        break;
      case '4':
        await listModules();
        break;
      case '5':
        await checkStatus();
        break;
      case '0':
        console.log('👋 ¡Hasta luego!');
        rl.close();
        return;
      default:
        console.log('❌ Opción inválida. Por favor seleccione 0-5.');
    }

    console.log('\n' + '═'.repeat(60));
    await new Promise(resolve => {
      rl.question('\nPresione ENTER para continuar...', () => resolve());
    });
  }
}

// Verificar dependencias
if (typeof fetch === 'undefined') {
  console.log('⚠️  fetch no está disponible en Node.js. Instalando node-fetch...');
  try {
    global.fetch = require('node-fetch');
  } catch (error) {
    console.log('❌ Error: No se puede importar node-fetch');
    console.log('💡 Ejecute: npm install node-fetch');
    process.exit(1);
  }
}

// Iniciar demo
main().catch(error => {
  console.error('❌ Error en demo:', error);
  rl.close();
});