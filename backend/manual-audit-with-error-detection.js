/**
 * AUDITOR MANUAL CON DETECCIÓN DE ERRORES REALES
 *
 * Este script ejecuta una auditoría a demanda y detecta errores REALES
 * que aparecen en la navegación del sistema (como "Error cargando capacitaciones")
 *
 * USO:
 * PORT=9999 node manual-audit-with-error-detection.js
 */

const axios = require('axios');

const PORT = process.env.PORT || 9999;
const BASE_URL = `http://localhost:${PORT}`;

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function getAuthToken() {
  try {
    console.log(`\n${colors.cyan}🔐 Autenticando...${colors.reset}`);
    const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      identifier: 'admin',
      password: 'admin123',
      companyId: 11
    });

    if (!response.data.token) {
      throw new Error('No se pudo obtener token de autenticación');
    }

    console.log(`${colors.green}✅ Autenticado correctamente${colors.reset}\n`);
    return response.data.token;
  } catch (error) {
    console.error(`${colors.red}❌ Error de autenticación:${colors.reset}`, error.message);
    process.exit(1);
  }
}

async function runAudit(token) {
  try {
    console.log(`${colors.bright}${colors.blue}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║  🔍 EJECUTANDO AUDITORÍA MANUAL                         ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}╚══════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const response = await axios.post(`${BASE_URL}/api/audit/run`, {
      parallel: true,
      autoHeal: false // NO auto-reparar automáticamente
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const executionId = response.data.execution_id;
    console.log(`${colors.cyan}📋 Execution ID:${colors.reset} ${executionId}`);
    console.log(`${colors.yellow}⏳ La auditoría está corriendo en background...${colors.reset}\n`);

    return executionId;
  } catch (error) {
    console.error(`${colors.red}❌ Error ejecutando auditoría:${colors.reset}`, error.message);
    process.exit(1);
  }
}

async function waitForCompletion(token, executionId) {
  console.log(`${colors.cyan}⏱️  Esperando a que complete la auditoría...${colors.reset}\n`);

  let attempts = 0;
  const maxAttempts = 120; // 10 minutos máximo (cada 5 segundos)

  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`${BASE_URL}/api/audit/executions/${executionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const { status, summary, logs } = response.data;

      if (status === 'completed' && summary) {
        console.log(`\n${colors.green}✅ Auditoría completada!${colors.reset}\n`);
        return { summary, logs };
      }

      // Mostrar progreso
      process.stdout.write(`\r${colors.yellow}⏳ Auditoría en progreso... (${attempts * 5}s)${colors.reset}`);

      await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
      attempts++;

    } catch (error) {
      console.error(`\n${colors.red}❌ Error consultando estado:${colors.reset}`, error.message);
      break;
    }
  }

  if (attempts >= maxAttempts) {
    console.log(`\n${colors.red}❌ Timeout: La auditoría tomó más de 10 minutos${colors.reset}`);
  }

  return null;
}

function displayResults(summary, logs) {
  console.log(`${colors.bright}${colors.blue}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║  📊 RESULTADOS DE LA AUDITORÍA                          ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // Resumen general
  console.log(`${colors.cyan}Total de tests:${colors.reset} ${summary.total}`);
  console.log(`${colors.green}✅ Pasados:${colors.reset} ${summary.passed}`);
  console.log(`${colors.red}❌ Fallidos:${colors.reset} ${summary.failed}`);
  console.log(`${colors.yellow}⚠️  Warnings:${colors.reset} ${summary.warnings}`);
  console.log(`${colors.cyan}⏱️  Duración:${colors.reset} ${summary.total_duration}ms\n`);

  // Detectar errores REALES (mensajes de error visibles)
  console.log(`${colors.bright}${colors.red}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.red}🔴 ERRORES REALES DETECTADOS EN LA NAVEGACIÓN${colors.reset}`);
  console.log(`${colors.bright}${colors.red}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  const realErrors = logs.filter(log =>
    log.status === 'fail' &&
    log.error_message &&
    (log.error_message.includes('Error cargando') ||
     log.error_message.includes('ERROR DETECTADO'))
  );

  if (realErrors.length === 0) {
    console.log(`${colors.green}✅ No se detectaron errores de navegación visibles al usuario${colors.reset}\n`);
  } else {
    realErrors.forEach((error, index) => {
      console.log(`${colors.red}${index + 1}. ${error.module_name}${colors.reset}`);
      console.log(`   Mensaje: ${error.error_message}`);
      if (error.error_context) {
        console.log(`   Contexto: ${JSON.stringify(error.error_context, null, 2)}`);
      }
      console.log('');
    });
  }

  // Mostrar módulos testeados
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}📋 MÓDULOS TESTEADOS${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  const modulesTested = summary.modules_tested || [];
  console.log(`Total: ${modulesTested.length} módulos`);
  console.log(modulesTested.join(', '));
  console.log('');

  // Resumen de fallos
  const failedTests = logs.filter(log => log.status === 'fail');
  if (failedTests.length > 0) {
    console.log(`${colors.bright}${colors.red}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.red}❌ TOP 10 TESTS QUE FALLARON${colors.reset}`);
    console.log(`${colors.bright}${colors.red}═══════════════════════════════════════════════════════════${colors.reset}\n`);

    failedTests.slice(0, 10).forEach((test, index) => {
      console.log(`${index + 1}. ${colors.yellow}${test.test_name}${colors.reset} (${test.module_name})`);
      if (test.error_message) {
        console.log(`   Error: ${test.error_message.substring(0, 150)}...`);
      }
      console.log('');
    });
  }
}

async function main() {
  console.clear();

  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}   AUDITOR MANUAL - DETECCIÓN DE ERRORES REALES${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  const token = await getAuthToken();
  const executionId = await runAudit(token);
  const result = await waitForCompletion(token, executionId);

  if (result) {
    displayResults(result.summary, result.logs);
  }

  console.log(`\n${colors.green}✅ Auditoría finalizada${colors.reset}\n`);
  process.exit(0);
}

main();
