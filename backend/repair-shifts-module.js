/**
 * REPARACIÓN AUTOMÁTICA DEL MÓDULO SHIFTS
 *
 * Sistema de auto-reparación profunda con:
 * - Análisis de Ollama (LLM local)
 * - AdvancedHealer con diagnóstico inteligente
 * - Fix automático del error "showShiftsContent NO es función"
 *
 * @version 1.0.0
 */

require('dotenv').config();
const database = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function main() {
  console.clear();

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🔧 AUTO-REPARACIÓN PROFUNDA - MÓDULO SHIFTS                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('🎯 ERROR DETECTADO:');
  console.log('   ❌ "showShiftsContent NO es función"');
  console.log('   📍 Módulo: Gestión de Turnos (shifts)');
  console.log('   🔴 Estado: PRODUCCIÓN - Requiere fix URGENTE');
  console.log('');
  console.log('🔧 SISTEMA DE REPARACIÓN:');
  console.log('   ✅ Análisis con Ollama (Llama 3.1)');
  console.log('   ✅ AdvancedHealer con diagnóstico inteligente');
  console.log('   ✅ Fix automático con backup');
  console.log('');
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('');

  try {
    // Conectar a BD
    console.log('🔌 Conectando a base de datos...');
    await database.sequelize.authenticate();
    console.log('✅ Conectado');
    console.log('');

    // Inicializar componentes
    const SystemRegistry = require('./src/auditor/registry/SystemRegistry');
    const AdvancedHealer = require('./src/auditor/healers/AdvancedHealer');

    const systemRegistry = new SystemRegistry(database);
    await systemRegistry.initialize();
    console.log('✅ SystemRegistry inicializado');

    const healer = new AdvancedHealer(database, systemRegistry);
    console.log('✅ AdvancedHealer inicializado');
    console.log('');

    // ANÁLISIS DEL ERROR
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 FASE 1: ANÁLISIS DEL ERROR');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    const shiftsJsPath = path.join(__dirname, 'public', 'js', 'modules', 'shifts.js');
    const panelHtmlPath = path.join(__dirname, 'public', 'panel-empresa.html');

    // Leer archivos
    console.log('📄 Leyendo shifts.js...');
    const shiftsContent = fs.readFileSync(shiftsJsPath, 'utf8');
    console.log(`✅ Leído (${shiftsContent.length} caracteres)`);

    console.log('📄 Leyendo panel-empresa.html (sección shifts)...');
    const panelContent = fs.readFileSync(panelHtmlPath, 'utf8');
    const shiftsSection = panelContent.substring(
      panelContent.indexOf("case 'shifts':"),
      panelContent.indexOf("case 'shifts':") + 500
    );
    console.log(`✅ Leído (sección relevante)`);
    console.log('');

    // Buscar función showShiftsContent en shifts.js
    console.log('🔍 Buscando función showShiftsContent en shifts.js...');
    const hasFunctionDeclaration = /function\s+showShiftsContent/.test(shiftsContent);
    const hasWindowAssignment = /window\.showShiftsContent\s*=/.test(shiftsContent);

    console.log(`   📌 Declaración "function showShiftsContent": ${hasFunctionDeclaration ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   📌 Asignación "window.showShiftsContent =": ${hasWindowAssignment ? '✅ SÍ' : '❌ NO'}`);
    console.log('');

    // DIAGNÓSTICO
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🧠 FASE 2: DIAGNÓSTICO INTELIGENTE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    let diagnosis = '';
    let suggestedFix = '';

    if (!hasFunctionDeclaration && !hasWindowAssignment) {
      diagnosis = 'CRÍTICO: Función showShiftsContent NO EXISTE en shifts.js';
      suggestedFix = 'Crear función showShiftsContent y exponerla en window';
      console.log('❌ ' + diagnosis);
      console.log('💡 ' + suggestedFix);
    } else if (hasFunctionDeclaration && !hasWindowAssignment) {
      diagnosis = 'Función showShiftsContent existe pero NO está expuesta en window';
      suggestedFix = 'Agregar: window.showShiftsContent = showShiftsContent;';
      console.log('⚠️  ' + diagnosis);
      console.log('💡 ' + suggestedFix);
    } else {
      diagnosis = 'Función parece correcta - revisar carga de script';
      suggestedFix = 'Verificar <script src="js/modules/shifts.js"> en HTML';
      console.log('🤔 ' + diagnosis);
      console.log('💡 ' + suggestedFix);
    }
    console.log('');

    // VERIFICAR CARGA DEL SCRIPT EN HTML
    console.log('🔍 Verificando carga de shifts.js en panel-empresa.html...');
    const hasScriptTag = /<script.*src=["'].*shifts\.js["']/.test(panelContent);
    console.log(`   📌 Tag <script src="...shifts.js">: ${hasScriptTag ? '✅ SÍ' : '❌ NO'}`);
    console.log('');

    if (!hasScriptTag) {
      diagnosis += ' + Script shifts.js NO se está cargando en HTML';
      suggestedFix += ' + Agregar <script src="js/modules/shifts.js"></script>';
      console.log('❌ CRÍTICO: shifts.js no se está cargando en el HTML');
      console.log('');
    }

    // APLICAR FIX AUTOMÁTICO
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔧 FASE 3: APLICAR FIX AUTOMÁTICO');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    // Crear mock de audit log para usar el healer
    const mockAuditLog = {
      id: 'manual-repair-shifts',
      test_name: 'Frontend Test - shifts',
      module_name: 'shifts',
      error_type: 'ReferenceError',
      error_message: 'showShiftsContent is not a function',
      error_stack: shiftsSection,
      file_path: shiftsJsPath,
      diagnosis: diagnosis,
      suggested_fix: suggestedFix
    };

    console.log('🤖 Llamando a AdvancedHealer.heal()...');
    console.log('');

    const healResult = await healer.heal(mockAuditLog);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 RESULTADO DE LA REPARACIÓN');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('Strategy:', healResult.strategy);
    console.log('Success:', healResult.success ? '✅' : '❌');
    console.log('Applied:', healResult.applied ? '✅' : '❌');
    console.log('');

    if (healResult.details) {
      console.log('📝 Detalles:');
      console.log(healResult.details);
      console.log('');
    }

    if (healResult.backup_path) {
      console.log('💾 Backup creado en:', healResult.backup_path);
      console.log('');
    }

    if (healResult.success) {
      console.log('✅ ¡REPARACIÓN COMPLETADA EXITOSAMENTE!');
      console.log('');
      console.log('🔄 PRÓXIMOS PASOS:');
      console.log('   1. Reiniciar servidor (backend)');
      console.log('   2. Abrir http://localhost:9998/panel-empresa.html');
      console.log('   3. Navegar a módulo "Gestión de Turnos"');
      console.log('   4. Verificar que funcione correctamente');
      console.log('');
    } else {
      console.log('❌ REPARACIÓN FALLÓ');
      console.log('');
      console.log('📋 ANÁLISIS MANUAL REQUERIDO:');
      console.log(`   Archivo: ${shiftsJsPath}`);
      console.log(`   Error: ${healResult.message || 'Unknown'}`);
      console.log('');
    }

    await database.sequelize.close();
    process.exit(healResult.success ? 0 : 1);

  } catch (error) {
    console.error('');
    console.error('❌ ERROR FATAL:', error.message);
    console.error('');
    console.error('Stack:');
    console.error(error.stack);
    console.error('');
    process.exit(1);
  }
}

main();
