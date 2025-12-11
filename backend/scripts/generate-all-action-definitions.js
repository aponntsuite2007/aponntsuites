/**
 * Script para generar TODAS las definiciones de acciones automáticamente
 */

const ActionDefinitionsGenerator = require('../src/services/ActionDefinitionsGenerator');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  GENERADOR AUTOMÁTICO DE DEFINICIONES DE ACCIONES        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const generator = new ActionDefinitionsGenerator();

console.log('🔄 Generando definiciones para 109 acciones...\n');

const result = generator.exportDefinitions();

console.log('✅ DEFINICIONES GENERADAS:\n');
console.log(`📄 Prerequisites: ${result.prerequisitesPath}`);
console.log(`📄 Processes: ${result.processesPath}`);
console.log(`📊 Total acciones: ${result.totalActions}\n`);

// Mostrar muestra de las definiciones generadas
const fs = require('fs');
const prerequisites = JSON.parse(fs.readFileSync(result.prerequisitesPath, 'utf8'));
const processes = JSON.parse(fs.readFileSync(result.processesPath, 'utf8'));

console.log('📋 MUESTRA DE PREREQUISITOS (primeras 5 acciones):\n');
Object.keys(prerequisites.prerequisites).slice(0, 5).forEach(key => {
    const def = prerequisites.prerequisites[key];
    console.log(`\n🔹 ${key}:`);
    console.log(`   Nombre: ${def.name}`);
    console.log(`   Prerequisites: ${def.requiredChain.length}`);
    console.log(`   Módulos requeridos: ${def.requiredModules.join(', ')}`);
    if (def.alternativeModules) {
        console.log(`   Alternativa: ${def.alternativeModules.fallback}`);
    }
});

console.log('\n\n📋 MUESTRA DE PROCESOS (primeras 5 acciones):\n');
Object.keys(processes.processes).slice(0, 5).forEach(key => {
    const def = processes.processes[key];
    console.log(`\n🔹 ${key}:`);
    console.log(`   Nombre: ${def.name}`);
    console.log(`   Módulo: ${def.module}`);
    console.log(`   Pasos: ${def.steps.length}`);
    console.log(`   Tiempo estimado: ${generator.minutesToReadable(def.estimatedTimeMinutes)}`);
    console.log(`   Requiere aprobación: ${def.requiresApproval ? 'SÍ' : 'NO'}`);
});

console.log('\n\n✅ LISTO - Definiciones generadas para 109 acciones');
console.log('✅ ContextValidator y ProcessChainGenerator pueden ahora cargar estas definiciones\n');
