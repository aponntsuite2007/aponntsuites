/**
 * 🔍 Análisis del Sistema de IA, Ayuda y Soporte
 */

const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, '../public/js/modules');

const FILES_TO_ANALYZE = [
  'ai-assistant-chat.js',
  'contextual-help-system.js',
  'unified-help-center.js',
  'support-system.js',
  'admin-support-tickets-view.js',
  'support-brain-dashboard.js'
];

function analyzeFile(filename) {
  const filepath = path.join(MODULES_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return { exists: false, filename };
  }

  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n').length;
  const size = (content.length / 1024).toFixed(1);

  // Buscar patrones clave
  const patterns = {
    usesTickets: /ticket/i.test(content),
    usesOllama: /ollama/i.test(content),
    usesSupportAPI: /\/api\/support/i.test(content),
    usesAssistantAPI: /\/api\/assistant/i.test(content),
    hasInit: /\.init\s*[=(]/.test(content),
    exportsToWindow: /window\.[A-Z]/.test(content),
    description: content.match(/^\s*\*\s*(.+)$/m)?.[1] || 'Sin descripción'
  };

  // Buscar endpoints que usa
  const endpoints = content.match(/\/api\/[a-z0-9\-\/]+/gi) || [];
  const uniqueEndpoints = [...new Set(endpoints)].slice(0, 10);

  return {
    exists: true,
    filename,
    lines,
    size: `${size} KB`,
    ...patterns,
    endpoints: uniqueEndpoints
  };
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('🔍 ANÁLISIS: SISTEMA DE IA, AYUDA Y SOPORTE');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('');

FILES_TO_ANALYZE.forEach(file => {
  const analysis = analyzeFile(file);

  console.log(`┌─────────────────────────────────────────────────────────────────────`);
  console.log(`│ 📦 ${file}`);
  console.log(`├─────────────────────────────────────────────────────────────────────`);

  if (!analysis.exists) {
    console.log(`│ ❌ NO EXISTE`);
  } else {
    console.log(`│ Tamaño: ${analysis.size} (${analysis.lines} líneas)`);
    console.log(`│ Desc: ${analysis.description.substring(0, 60)}...`);
    console.log(`│`);
    console.log(`│ Características:`);
    console.log(`│   - Usa Tickets: ${analysis.usesTickets ? '✅ SÍ' : '❌ NO'}`);
    console.log(`│   - Usa Ollama: ${analysis.usesOllama ? '✅ SÍ' : '❌ NO'}`);
    console.log(`│   - Usa /api/support: ${analysis.usesSupportAPI ? '✅ SÍ' : '❌ NO'}`);
    console.log(`│   - Usa /api/assistant: ${analysis.usesAssistantAPI ? '✅ SÍ' : '❌ NO'}`);
    console.log(`│   - Tiene init(): ${analysis.hasInit ? '✅ SÍ' : '❌ NO'}`);
    console.log(`│   - Exporta a window: ${analysis.exportsToWindow ? '✅ SÍ' : '❌ NO'}`);

    if (analysis.endpoints.length > 0) {
      console.log(`│`);
      console.log(`│ Endpoints que usa:`);
      analysis.endpoints.forEach(ep => console.log(`│   - ${ep}`));
    }
  }

  console.log(`└─────────────────────────────────────────────────────────────────────`);
  console.log('');
});

// Resumen
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('📋 RESUMEN:');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('');
console.log('ARCHIVOS QUE USAN TICKETS:');
FILES_TO_ANALYZE.forEach(file => {
  const analysis = analyzeFile(file);
  if (analysis.exists && analysis.usesTickets) {
    console.log(`  - ${file}`);
  }
});
console.log('');
console.log('ARCHIVOS QUE USAN OLLAMA:');
FILES_TO_ANALYZE.forEach(file => {
  const analysis = analyzeFile(file);
  if (analysis.exists && analysis.usesOllama) {
    console.log(`  - ${file}`);
  }
});
