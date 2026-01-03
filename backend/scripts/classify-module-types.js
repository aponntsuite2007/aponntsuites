/**
 * CLASIFICADOR AUTOMÁTICO DE TIPOS DE MÓDULOS
 * Detecta si un módulo es: CRUD, Dashboard, Workflow, Panel
 */

const fs = require('fs');
const path = require('path');

async function classifyModule(moduleKey) {
  const modulePath = `public/js/modules/${moduleKey}.js`;
  
  if (!fs.existsSync(modulePath)) {
    return { type: 'NO_FRONTEND', reason: 'Archivo no existe' };
  }
  
  const content = fs.readFileSync(modulePath, 'utf8');
  
  // Detectar tipo por patrones en el código
  const patterns = {
    CRUD: [
      /createButton|btnCreate|btn-add/i,
      /editButton|btnEdit|btn-edit/i,
      /deleteButton|btnDelete|btn-delete/i,
      /\.modal/,
      /showModal|openModal/
    ],
    DASHBOARD: [
      /dashboard|chart|graph|metric/i,
      /renderChart|renderGraph/i,
      /canvas|svg/i,
      /\.stats|\.metrics/
    ],
    WORKFLOW: [
      /workflow|proceso|flujo/i,
      /nextStep|prevStep|currentStep/i,
      /wizard|stepper/i
    ],
    READONLY: [
      /readonly|solo lectura|view-only/i,
      /!.*create|!.*edit|!.*delete/
    ]
  };
  
  const scores = {
    CRUD: 0,
    DASHBOARD: 0,
    WORKFLOW: 0,
    READONLY: 0
  };
  
  // Contar matches de cada patrón
  for (const [type, typePatterns] of Object.entries(patterns)) {
    for (const pattern of typePatterns) {
      if (pattern.test(content)) {
        scores[type]++;
      }
    }
  }
  
  // Determinar tipo dominante
  const maxScore = Math.max(...Object.values(scores));
  const detectedType = Object.keys(scores).find(k => scores[k] === maxScore);
  
  return {
    type: detectedType,
    scores,
    confidence: maxScore > 2 ? 'HIGH' : maxScore > 0 ? 'MEDIUM' : 'LOW'
  };
}

// Ejecutar para todos los módulos
async function classifyAll() {
  const configs = fs.readdirSync('tests/e2e/configs')
    .filter(f => f.endsWith('.config.js'))
    .map(f => f.replace('.config.js', ''));
  
  const results = {};
  
  for (const moduleKey of configs) {
    results[moduleKey] = await classifyModule(moduleKey);
  }
  
  console.log('=== CLASIFICACIÓN DE MÓDULOS ===\n');
  
  for (const [type, modules] of Object.entries(groupBy(results))) {
    console.log(`${type}:`);
    console.log(modules.map(m => `  - ${m}`).join('\n'));
    console.log('');
  }
  
  fs.writeFileSync(
    'MODULE_CLASSIFICATION.json',
    JSON.stringify(results, null, 2)
  );
}

function groupBy(results) {
  const grouped = {};
  for (const [key, val] of Object.entries(results)) {
    if (!grouped[val.type]) grouped[val.type] = [];
    grouped[val.type].push(key);
  }
  return grouped;
}

classifyAll();
