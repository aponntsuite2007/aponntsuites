#!/usr/bin/env node
/**
 * ============================================================================
 * VERIFY BRAIN WORKFLOW DETECTION
 * ============================================================================
 *
 * Verifica que el sistema Brain puede detectar el AttendanceWorkflowService
 * mediante LIVE_CODE_SCAN.
 *
 * USO:
 *   node scripts/verify-brain-workflow-detection.js
 *
 * @version 1.0.0
 * @date 2025-12-14
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

console.log('');
console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║              🧠 BRAIN WORKFLOW DETECTION VERIFICATION                      ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log('');

const workflowPath = path.join(__dirname, '..', 'src', 'services', 'AttendanceWorkflowService.js');
const registryPath = path.join(__dirname, '..', 'src', 'auditor', 'registry', 'modules-registry.json');
const docPath = path.join(__dirname, '..', 'docs', 'WORKFLOW-FICHAJE-COMPLETO.md');

let allPassed = true;
const results = [];

// ============================================================================
// TEST 1: File exists
// ============================================================================
console.log('📁 Test 1: Verificando existencia de archivos...');

const filesToCheck = [
    { path: workflowPath, name: 'AttendanceWorkflowService.js' },
    { path: registryPath, name: 'modules-registry.json' },
    { path: docPath, name: 'WORKFLOW-FICHAJE-COMPLETO.md' }
];

filesToCheck.forEach(({ path: filePath, name }) => {
    const exists = fs.existsSync(filePath);
    results.push({ test: `File ${name}`, passed: exists });
    if (!exists) allPassed = false;
    console.log(`   ${exists ? '✅' : '❌'} ${name}: ${exists ? 'Existe' : 'NO ENCONTRADO'}`);
});

// ============================================================================
// TEST 2: Static STAGES pattern detection (como lo hace Brain)
// ============================================================================
console.log('\n🔍 Test 2: Verificando patrón "static STAGES = {"...');

const workflowContent = fs.readFileSync(workflowPath, 'utf8');
const stagesStartMatch = workflowContent.match(/static\s+STAGES\s*=\s*\{/);
const hasStagesPattern = !!stagesStartMatch;
results.push({ test: 'Static STAGES pattern', passed: hasStagesPattern });

if (hasStagesPattern) {
    console.log('   ✅ Patrón detectado correctamente');
    console.log(`   📍 Posición: carácter ${stagesStartMatch.index}`);
} else {
    console.log('   ❌ Patrón NO detectado');
    allPassed = false;
}

// ============================================================================
// TEST 3: Verificar estructura STAGES
// ============================================================================
console.log('\n📊 Test 3: Verificando estructura de STAGES...');

try {
    const AttendanceWorkflowService = require(workflowPath);

    if (AttendanceWorkflowService.STAGES) {
        const stageKeys = Object.keys(AttendanceWorkflowService.STAGES);
        console.log(`   ✅ STAGES encontrado con ${stageKeys.length} stages`);
        results.push({ test: 'STAGES structure', passed: true });

        // Contar por categoría
        const categories = {};
        stageKeys.forEach(key => {
            const stage = AttendanceWorkflowService.STAGES[key];
            const cat = stage.category || 'unknown';
            categories[cat] = (categories[cat] || 0) + 1;
        });

        console.log('\n   📈 Distribución por categoría:');
        Object.entries(categories).forEach(([cat, count]) => {
            console.log(`      - ${cat}: ${count} stages`);
        });

        // Verificar stages críticos
        const criticalStages = ['BIOMETRIC_CAPTURE', 'IDENTIFICATION', 'REGISTERED', 'AUTHORIZATION_REQUIRED'];
        console.log('\n   🎯 Stages críticos:');
        criticalStages.forEach(stage => {
            const exists = !!AttendanceWorkflowService.STAGES[stage];
            console.log(`      ${exists ? '✅' : '❌'} ${stage}`);
            if (!exists) allPassed = false;
        });

        // Verificar estados finales
        const finalStages = stageKeys.filter(k => AttendanceWorkflowService.STAGES[k].is_final);
        const rejectionStages = stageKeys.filter(k => AttendanceWorkflowService.STAGES[k].is_rejection);
        console.log(`\n   🏁 Estados finales: ${finalStages.length}`);
        console.log(`   ❌ Estados de rechazo: ${rejectionStages.length}`);
        results.push({ test: 'Final states', passed: finalStages.length > 0 });
        results.push({ test: 'Rejection states', passed: rejectionStages.length > 0 });

    } else {
        console.log('   ❌ STAGES no encontrado en la clase');
        results.push({ test: 'STAGES structure', passed: false });
        allPassed = false;
    }

    // Verificar WORKFLOW_METADATA
    if (AttendanceWorkflowService.WORKFLOW_METADATA) {
        console.log('\n   ✅ WORKFLOW_METADATA encontrado');
        results.push({ test: 'WORKFLOW_METADATA', passed: true });

        const meta = AttendanceWorkflowService.WORKFLOW_METADATA;
        console.log(`      - name: ${meta.name}`);
        console.log(`      - version: ${meta.version}`);
        console.log(`      - module: ${meta.module}`);
        console.log(`      - entry_point: ${meta.entry_point}`);
    } else {
        console.log('   ⚠️ WORKFLOW_METADATA no encontrado');
        results.push({ test: 'WORKFLOW_METADATA', passed: false });
    }

    // Verificar helper methods
    const helpers = ['getStagesInOrder', 'getFinalStages', 'getRejectionStages', 'generateMermaidDiagram'];
    console.log('\n   🔧 Helper methods:');
    helpers.forEach(method => {
        const exists = typeof AttendanceWorkflowService[method] === 'function';
        console.log(`      ${exists ? '✅' : '❌'} ${method}()`);
    });

} catch (error) {
    console.log(`   ❌ Error al cargar el módulo: ${error.message}`);
    results.push({ test: 'Module load', passed: false });
    allPassed = false;
}

// ============================================================================
// TEST 4: Verificar referencia en registry
// ============================================================================
console.log('\n📚 Test 4: Verificando referencia en modules-registry.json...');

try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const attendanceModule = registry.modules.find(m => m.id === 'attendance');

    if (attendanceModule && attendanceModule.workflows) {
        console.log('   ✅ Módulo attendance tiene workflows definidos');
        results.push({ test: 'Registry workflows', passed: true });

        if (attendanceModule.workflows.clock_in) {
            console.log('   ✅ Workflow "clock_in" registrado');
            console.log(`      - service: ${attendanceModule.workflows.clock_in.service}`);
            console.log(`      - stages_count: ${attendanceModule.workflows.clock_in.stages_count}`);
            console.log(`      - documentation: ${attendanceModule.workflows.clock_in.documentation}`);
            results.push({ test: 'clock_in workflow', passed: true });
        } else {
            console.log('   ❌ Workflow "clock_in" NO encontrado');
            results.push({ test: 'clock_in workflow', passed: false });
            allPassed = false;
        }
    } else {
        console.log('   ❌ Módulo attendance no tiene workflows definidos');
        results.push({ test: 'Registry workflows', passed: false });
        allPassed = false;
    }
} catch (error) {
    console.log(`   ❌ Error al leer registry: ${error.message}`);
    allPassed = false;
}

// ============================================================================
// TEST 5: Generar diagrama Mermaid
// ============================================================================
console.log('\n📊 Test 5: Generando diagrama Mermaid...');

try {
    const AttendanceWorkflowService = require(workflowPath);
    const mermaid = AttendanceWorkflowService.generateMermaidDiagram();

    if (mermaid && mermaid.includes('graph TD')) {
        console.log('   ✅ Diagrama Mermaid generado correctamente');
        console.log(`   📏 Longitud: ${mermaid.length} caracteres`);
        results.push({ test: 'Mermaid diagram', passed: true });

        // Guardar diagrama
        const mermaidPath = path.join(__dirname, '..', 'docs', 'workflow-fichaje-diagram.mmd');
        fs.writeFileSync(mermaidPath, mermaid);
        console.log(`   💾 Guardado en: docs/workflow-fichaje-diagram.mmd`);
    } else {
        console.log('   ❌ Error generando diagrama');
        results.push({ test: 'Mermaid diagram', passed: false });
    }
} catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
}

// ============================================================================
// RESUMEN
// ============================================================================
console.log('\n');
console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║                              📋 RESUMEN                                    ║');
console.log('╠════════════════════════════════════════════════════════════════════════════╣');

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

console.log(`║  Tests pasados:  ${String(passed).padEnd(5)}                                              ║`);
console.log(`║  Tests fallidos: ${String(failed).padEnd(5)}                                              ║`);
console.log('╠════════════════════════════════════════════════════════════════════════════╣');

if (allPassed) {
    console.log('║  ✅ BRAIN PUEDE DETECTAR EL WORKFLOW CORRECTAMENTE                        ║');
    console.log('║                                                                            ║');
    console.log('║  El workflow AttendanceWorkflowService será detectado por                  ║');
    console.log('║  EcosystemBrainService.getWorkflowsConnected() via LIVE_CODE_SCAN          ║');
} else {
    console.log('║  ❌ HAY PROBLEMAS QUE DEBEN CORREGIRSE                                     ║');
    console.log('║                                                                            ║');
    results.filter(r => !r.passed).forEach(r => {
        console.log(`║  - ${r.test.padEnd(70)}║`);
    });
}

console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log('');

process.exit(allPassed ? 0 : 1);
