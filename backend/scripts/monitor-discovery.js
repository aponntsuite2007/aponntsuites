#!/usr/bin/env node

/**
 * Monitor de progreso del discovery masivo en tiempo real
 */

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, '..', 'tests', 'e2e', 'discovery-results');
const SUMMARY_FILE = path.join(RESULTS_DIR, 'discovery-summary.json');

function getDiscoveryStatus() {
  if (!fs.existsSync(SUMMARY_FILE)) {
    return null;
  }
  
  const summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));
  return summary;
}

function countDiscoveredFiles() {
  if (!fs.existsSync(RESULTS_DIR)) {
    return 0;
  }
  
  const files = fs.readdirSync(RESULTS_DIR);
  const discoveryFiles = files.filter(f => f.endsWith('.discovery.json') && f !== 'discovery-summary.json');
  return discoveryFiles.length;
}

function displayProgress() {
  console.clear();
  console.log('🔍 MONITOR DISCOVERY MASIVO');
  console.log('═'.repeat(70));
  console.log(`⏰ ${new Date().toLocaleTimeString()}`);
  console.log('═'.repeat(70));
  
  const filesDiscovered = countDiscoveredFiles();
  const totalModules = 50;
  const progress = Math.round((filesDiscovered / totalModules) * 100);
  
  console.log(`\n📊 PROGRESO: ${filesDiscovered}/${totalModules} módulos (${progress}%)`);
  
  // Barra de progreso
  const barLength = 50;
  const filledLength = Math.round((filesDiscovered / totalModules) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  console.log(`[${bar}]`);
  
  const summary = getDiscoveryStatus();
  if (summary && summary.modules && summary.modules.length > 0) {
    console.log('\n📋 ÚLTIMOS 5 MÓDULOS COMPLETADOS:');
    const lastModules = summary.modules.slice(-5).reverse();
    lastModules.forEach((m, i) => {
      const icon = m.success ? '✅' : '❌';
      const info = m.modalsFound ? `(${m.modalsFound} modales, ${m.tabsFound} tabs)` : '';
      console.log(`   ${icon} ${m.module} - ${m.duration} ${info}`);
    });
    
    const completed = summary.modules.filter(m => m.success).length;
    const failed = summary.modules.filter(m => !m.success).length;
    
    console.log(`\n📈 ESTADÍSTICAS:`);
    console.log(`   ✅ Completados: ${completed}`);
    console.log(`   ❌ Fallidos: ${failed}`);
    console.log(`   ⏳ Restantes: ${totalModules - summary.modules.length}`);
    
    if (summary.endTime) {
      console.log(`\n✅ DISCOVERY COMPLETO!`);
      console.log(`   Inicio: ${new Date(summary.startTime).toLocaleTimeString()}`);
      console.log(`   Fin: ${new Date(summary.endTime).toLocaleTimeString()}`);
      
      const duration = (new Date(summary.endTime) - new Date(summary.startTime)) / 1000 / 60;
      console.log(`   Duración total: ${duration.toFixed(1)} minutos`);
      
      process.exit(0);
    }
  } else {
    console.log('\n⏳ Esperando inicio del discovery...');
  }
  
  console.log('\n═'.repeat(70));
  console.log('Presiona Ctrl+C para salir del monitor (el discovery continuará)');
}

// Actualizar cada 3 segundos
setInterval(displayProgress, 3000);
displayProgress();
