#!/usr/bin/env node
/**
 * SYNAPSE Enterprise Testing - Phase Runner
 * Ejecuta las 7 fases de testing empresarial
 *
 * Uso:
 *   node run-enterprise-phases.js              # Ejecutar todas las fases
 *   node run-enterprise-phases.js --phase=1    # Ejecutar solo fase 1
 *   node run-enterprise-phases.js --phase=4    # Ejecutar solo fase 4 (security)
 *   node run-enterprise-phases.js --quick      # Modo rapido (menos usuarios/ops)
 */
const { execSync } = require('child_process');
const path = require('path');

const PHASES = [
  { num: 1, name: 'Multi-tenant Stress', file: 'level3-phase1-multitenant-stress.spec.js' },
  { num: 2, name: 'Concurrent Operations', file: 'level3-phase2-concurrent-ops.spec.js' },
  { num: 3, name: 'Business Logic', file: 'level3-phase3-business-logic.spec.js' },
  { num: 4, name: 'Security Attacks', file: 'level3-phase4-security.spec.js' },
  { num: 5, name: 'Data Integrity', file: 'level3-phase5-data-integrity.spec.js' },
  { num: 6, name: 'Performance Degradation', file: 'level3-phase6-performance.spec.js' },
  { num: 7, name: 'Chaos Engineering', file: 'level3-phase7-chaos.spec.js' }
];

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    phase: null,
    quick: false,
    users: 1000,
    companies: 10,
    concurrentOps: 100
  };

  for (const arg of args) {
    if (arg.startsWith('--phase=')) {
      config.phase = parseInt(arg.split('=')[1]);
    } else if (arg === '--quick') {
      config.quick = true;
      config.users = 100;
      config.companies = 5;
      config.concurrentOps = 20;
    } else if (arg.startsWith('--users=')) {
      config.users = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--companies=')) {
      config.companies = parseInt(arg.split('=')[1]);
    }
  }

  return config;
}

function runPhase(phase, config) {
  const cmd = `npx playwright test tests/e2e/levels/${phase.file} --project=chromium`;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`FASE ${phase.num}: ${phase.name}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`Config: USERS=${config.users}, COMPANIES=${config.companies}`);
  console.log(`Ejecutando: ${cmd}\n`);

  try {
    execSync(cmd, {
      cwd: path.resolve(__dirname, '../../..'),
      stdio: 'inherit',
      env: {
        ...process.env,
        USERS: String(config.users),
        COMPANIES: String(config.companies),
        CONCURRENT_OPS: String(config.concurrentOps)
      }
    });
    return { phase: phase.num, status: 'PASSED' };
  } catch (error) {
    return { phase: phase.num, status: 'FAILED', error: error.message };
  }
}

async function main() {
  const config = parseArgs();
  const startTime = Date.now();
  const results = [];

  console.log('\n' + '╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' SYNAPSE Level 3 - Enterprise Testing '.padStart(38).padEnd(58) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');

  console.log(`\nConfiguracion:`);
  console.log(`  Users: ${config.users}`);
  console.log(`  Companies: ${config.companies}`);
  console.log(`  Concurrent Ops: ${config.concurrentOps}`);
  console.log(`  Mode: ${config.quick ? 'QUICK' : 'FULL'}`);

  if (config.phase) {
    // Ejecutar solo una fase
    const phase = PHASES.find(p => p.num === config.phase);
    if (!phase) {
      console.error(`Fase ${config.phase} no existe. Disponibles: 1-7`);
      process.exit(1);
    }
    results.push(runPhase(phase, config));
  } else {
    // Ejecutar todas las fases
    for (const phase of PHASES) {
      results.push(runPhase(phase, config));
    }
  }

  // Resumen final
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;

  console.log('\n' + '═'.repeat(60));
  console.log('RESUMEN FINAL');
  console.log('═'.repeat(60));
  console.log(`Tiempo total: ${elapsed} segundos`);
  console.log(`Fases ejecutadas: ${results.length}`);
  console.log(`Fases PASSED: ${passed}`);
  console.log(`Fases FAILED: ${failed}`);

  for (const r of results) {
    const icon = r.status === 'PASSED' ? '✅' : '❌';
    console.log(`  ${icon} Fase ${r.phase}: ${r.status}`);
  }

  console.log('═'.repeat(60));

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
