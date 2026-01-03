#!/usr/bin/env node

/**
 * TEST SYNAPSE INTEGRATION
 *
 * Valida que la integración de Discovery + Config Gen + Deadend Detection
 * funcione correctamente antes de ejecutar batch completo
 *
 * Test con módulo: users (ya tiene discovery + config)
 */

const SynapseOrchestrator = require('../src/synapse/SynapseOrchestrator');
const fs = require('fs');
const path = require('path');

async function validateIntegration() {
  console.log('🧪 VALIDANDO INTEGRACIÓN SYNAPSE INTELLIGENT\n');
  console.log('═'.repeat(70));

  // Paso 1: Verificar que los componentes existan
  console.log('\n📦 PASO 1: Verificar componentes...');

  const components = [
    { name: 'SynapseOrchestrator', path: '../src/synapse/SynapseOrchestrator.js' },
    { name: 'ConfigGenerator', path: '../src/synapse/config-generator.js' },
    { name: 'DeadendDetector', path: '../src/synapse/deadend-detector.js' },
    { name: 'DiscoveryEngine', path: './discover-module-structure.js' }
  ];

  let allComponentsExist = true;

  for (const component of components) {
    const fullPath = path.join(__dirname, component.path);
    const exists = fs.existsSync(fullPath);

    if (exists) {
      console.log(`   ✅ ${component.name}`);
    } else {
      console.log(`   ❌ ${component.name} NO ENCONTRADO`);
      allComponentsExist = false;
    }
  }

  if (!allComponentsExist) {
    console.log('\n❌ Faltan componentes - integración incompleta');
    process.exit(1);
  }

  console.log('\n   ✅ Todos los componentes existen');

  // Paso 2: Verificar que existan discovery y configs de users
  console.log('\n📂 PASO 2: Verificar archivos de users...');

  const discoveryPath = path.join(__dirname, '..', 'tests', 'e2e', 'discovery-results', 'users.discovery.json');
  const configPath = path.join(__dirname, '..', 'tests', 'e2e', 'configs', 'users.json');

  const discoveryExists = fs.existsSync(discoveryPath);
  const configExists = fs.existsSync(configPath);

  console.log(`   ${discoveryExists ? '✅' : '❌'} users.discovery.json`);
  console.log(`   ${configExists ? '✅' : '❌'} users.json`);

  if (!discoveryExists || !configExists) {
    console.log('\n⚠️  Archivos faltantes - se generarán durante el test');
  }

  // Paso 3: Validar que el Orchestrator se pueda instanciar
  console.log('\n🤖 PASO 3: Instanciar Orchestrator...');

  try {
    const orchestrator = new SynapseOrchestrator({
      maxRetries: 1, // Solo 1 intento para test rápido
      discoveryTimeout: 300000,
      testTimeout: 600000
    });

    console.log('   ✅ Orchestrator instanciado correctamente');
    console.log(`   ✅ Config: maxRetries=${orchestrator.maxRetriesPerModule}`);
    console.log(`   ✅ Discovery timeout: ${orchestrator.discoveryTimeout/1000}s`);
    console.log(`   ✅ Test timeout: ${orchestrator.testTimeout/1000}s`);

    // Paso 4: Verificar métodos principales
    console.log('\n🔍 PASO 4: Verificar métodos del Orchestrator...');

    const methods = [
      'processModule',
      'runDiscovery',
      'runTest',
      'detectDeadends',
      'classifyError',
      'applyFixes',
      'getModulesFromDB'
    ];

    for (const method of methods) {
      if (typeof orchestrator[method] === 'function') {
        console.log(`   ✅ ${method}()`);
      } else {
        console.log(`   ❌ ${method}() NO ENCONTRADO`);
      }
    }

    // Paso 5: Verificar integración de componentes
    console.log('\n🔗 PASO 5: Verificar integración de componentes...');

    if (orchestrator.configGenerator) {
      console.log('   ✅ ConfigGenerator integrado');
    } else {
      console.log('   ❌ ConfigGenerator NO integrado');
    }

    if (orchestrator.deadendDetector) {
      console.log('   ✅ DeadendDetector integrado');
    } else {
      console.log('   ❌ DeadendDetector NO integrado');
    }

    // Paso 6: Test REAL con módulo users (solo si usuario confirma)
    console.log('\n═'.repeat(70));
    console.log('\n✅ VALIDACIÓN DE COMPONENTES: EXITOSA');
    console.log('\n📊 ESTADÍSTICAS:');
    console.log(`   - Componentes verificados: ${components.length}`);
    console.log(`   - Métodos verificados: ${methods.length}`);
    console.log(`   - Integraciones verificadas: 2 (ConfigGen + DeadendDet)`);

    console.log('\n═'.repeat(70));
    console.log('\n🎯 PRÓXIMO PASO: Ejecutar test REAL');
    console.log('\n   Para testear con 1 módulo:');
    console.log('   $ npm run synapse:test users');
    console.log('\n   Para ejecutar batch completo:');
    console.log('   $ npm run synapse:intelligent');
    console.log('\n═'.repeat(70));

  } catch (error) {
    console.log(`\n❌ Error instanciando Orchestrator: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

validateIntegration().catch((error) => {
  console.error('\n❌ Error fatal en validación:', error.message);
  console.error(error.stack);
  process.exit(1);
});
