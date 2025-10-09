#!/usr/bin/env node

/**
 * 🤖 AI AUTONOMOUS DEVELOPMENT - CLI AUTOMATION TOOL
 * ==================================================
 * Sistema de testing y desarrollo autónomo
 *
 * Comandos:
 * - node automation-cli.js full-cycle    # Ciclo completo
 * - node automation-cli.js compile       # Solo compilar
 * - node automation-cli.js test-only     # Solo testear
 * - node automation-cli.js health        # Health check
 * - node automation-cli.js analyze-logs  # Analizar logs
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

// Configuración
const CONFIG = {
  project: {
    root: path.join(__dirname, '..'),
    backend: {
      path: path.join(__dirname, '../backend'),
      port: 3001,
      healthEndpoint: '/api/v1/health'
    },
    frontend: {
      path: path.join(__dirname, '../frontend_flutter'),
      buildPath: 'build/app/outputs/flutter-apk/app-debug.apk'
    },
    emulator: {
      name: 'Medium_Phone_API_36.0',
      package: 'com.example.attendance_system'
    }
  },
  adb: 'C:\\Users\\notebook\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe',
  emulator: 'C:\\Users\\notebook\\AppData\\Local\\Android\\Sdk\\emulator\\emulator.exe',
  logsDir: path.join(__dirname, 'logs')
};

// Utilidades
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logSuccess = (msg) => console.log(`✅ ${msg}`);
const logError = (msg) => console.log(`❌ ${msg}`);
const logInfo = (msg) => console.log(`ℹ️  ${msg}`);
const logProgress = (msg) => console.log(`🔄 ${msg}`);

// Crear directorio de logs si no existe
if (!fs.existsSync(CONFIG.logsDir)) {
  fs.mkdirSync(CONFIG.logsDir, { recursive: true });
}

// Sesión de logging
const sessionId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const sessionLog = {
  id: sessionId,
  startTime: new Date().toISOString(),
  steps: [],
  errors: [],
  metrics: {}
};

function logStep(step, status, data = {}) {
  sessionLog.steps.push({
    timestamp: new Date().toISOString(),
    step,
    status,
    ...data
  });
}

function saveSession() {
  sessionLog.endTime = new Date().toISOString();
  const duration = new Date(sessionLog.endTime) - new Date(sessionLog.startTime);
  sessionLog.metrics.totalDuration = `${(duration / 1000).toFixed(2)}s`;

  const logPath = path.join(CONFIG.logsDir, `session-${sessionId}.json`);
  fs.writeFileSync(logPath, JSON.stringify(sessionLog, null, 2));
  logInfo(`Session saved: ${logPath}`);
}

// Health Check
async function healthCheck() {
  logProgress('Running health check...');

  try {
    // 1. Backend check
    logInfo('Checking backend...');
    const backendUrl = `http://localhost:${CONFIG.project.backend.port}${CONFIG.project.backend.healthEndpoint}`;

    try {
      const response = await fetch(backendUrl);
      if (response.ok) {
        logSuccess('Backend is running');
        logStep('health-backend', 'success');
      } else {
        logError('Backend returned non-200 status');
        logStep('health-backend', 'error', { status: response.status });
      }
    } catch (e) {
      logError(`Backend not accessible: ${e.message}`);
      logStep('health-backend', 'error', { error: e.message });
    }

    // 2. Emulator check
    logInfo('Checking emulator...');
    const { stdout } = await execPromise(`"${CONFIG.adb}" devices`);

    if (stdout.includes('device') && !stdout.includes('offline')) {
      logSuccess('Emulator is running');
      logStep('health-emulator', 'success');
    } else {
      logError('No emulator detected');
      logStep('health-emulator', 'error');
    }

    // 3. Flutter check
    logInfo('Checking Flutter...');
    try {
      await execPromise('flutter --version');
      logSuccess('Flutter SDK found');
      logStep('health-flutter', 'success');
    } catch (e) {
      logError('Flutter SDK not found');
      logStep('health-flutter', 'error');
    }

    logSuccess('Health check completed');
    return true;

  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    sessionLog.errors.push({ step: 'health-check', error: error.message });
    return false;
  }
}

// Compilar APK
async function compileAPK() {
  logProgress('Compiling APK...');
  const startTime = Date.now();

  try {
    logInfo('Running: flutter build apk --debug');

    const { stdout, stderr } = await execPromise(
      'flutter build apk --debug',
      { cwd: CONFIG.project.frontend.path, timeout: 300000 }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (stdout.includes('Built build')) {
      logSuccess(`APK compiled successfully in ${duration}s`);
      logStep('compile-apk', 'success', { duration: `${duration}s` });
      return true;
    } else {
      logError('Compilation failed');
      logStep('compile-apk', 'error', { stdout, stderr });
      return false;
    }

  } catch (error) {
    logError(`Compilation error: ${error.message}`);
    sessionLog.errors.push({ step: 'compile-apk', error: error.message });
    logStep('compile-apk', 'error', { error: error.message });
    return false;
  }
}

// Instalar APK
async function installAPK() {
  logProgress('Installing APK...');

  try {
    const apkPath = path.join(CONFIG.project.frontend.path, CONFIG.project.frontend.buildPath);

    logInfo(`Installing: ${apkPath}`);

    const { stdout } = await execPromise(
      `"${CONFIG.adb}" install -r "${apkPath}"`,
      { timeout: 60000 }
    );

    if (stdout.includes('Success')) {
      logSuccess('APK installed successfully');
      logStep('install-apk', 'success');
      return true;
    } else {
      logError('Installation failed');
      logStep('install-apk', 'error', { output: stdout });
      return false;
    }

  } catch (error) {
    logError(`Installation error: ${error.message}`);
    sessionLog.errors.push({ step: 'install-apk', error: error.message });
    return false;
  }
}

// Limpiar datos de la app
async function clearAppData() {
  logProgress('Clearing app data...');

  try {
    await execPromise(`"${CONFIG.adb}" shell pm clear ${CONFIG.project.emulator.package}`);
    logSuccess('App data cleared');
    logStep('clear-data', 'success');
    return true;
  } catch (error) {
    logError(`Clear data failed: ${error.message}`);
    return false;
  }
}

// Ejecutar app
async function launchApp() {
  logProgress('Launching app...');

  try {
    // Limpiar logs
    await execPromise(`"${CONFIG.adb}" logcat -c`);

    // Iniciar app
    await execPromise(
      `"${CONFIG.adb}" shell am start -n ${CONFIG.project.emulator.package}/.MainActivity`
    );

    logSuccess('App launched');
    logStep('launch-app', 'success');
    return true;
  } catch (error) {
    logError(`Launch failed: ${error.message}`);
    sessionLog.errors.push({ step: 'launch-app', error: error.message });
    return false;
  }
}

// Capturar logs
async function captureLogs(duration = 8000) {
  logProgress(`Capturing logs for ${duration/1000}s...`);

  try {
    await sleep(duration);

    const { stdout } = await execPromise(
      `"${CONFIG.adb}" logcat -d -s flutter:V`
    );

    // Guardar logs
    const logsPath = path.join(CONFIG.logsDir, `logs-${sessionId}.txt`);
    fs.writeFileSync(logsPath, stdout);

    logSuccess(`Logs saved: ${logsPath}`);
    logStep('capture-logs', 'success', { logsPath });

    return stdout;
  } catch (error) {
    logError(`Capture logs failed: ${error.message}`);
    return '';
  }
}

// Analizar logs
function analyzeLogs(logs) {
  logProgress('Analyzing logs...');

  const analysis = {
    errors: [],
    warnings: [],
    success: [],
    patterns: {}
  };

  const lines = logs.split('\n');

  for (const line of lines) {
    if (line.includes('❌') || line.includes('Error')) {
      analysis.errors.push(line.trim());
    } else if (line.includes('⚠️')) {
      analysis.warnings.push(line.trim());
    } else if (line.includes('✅')) {
      analysis.success.push(line.trim());
    }

    // Patrones específicos
    if (line.includes('KIOSK')) analysis.patterns.kiosk = (analysis.patterns.kiosk || 0) + 1;
    if (line.includes('LOGIN')) analysis.patterns.login = (analysis.patterns.login || 0) + 1;
    if (line.includes('STARTUP')) analysis.patterns.startup = (analysis.patterns.startup || 0) + 1;
  }

  logInfo(`Found ${analysis.errors.length} errors, ${analysis.warnings.length} warnings, ${analysis.success.length} success messages`);

  logStep('analyze-logs', 'success', {
    errorCount: analysis.errors.length,
    warningCount: analysis.warnings.length,
    successCount: analysis.success.length
  });

  return analysis;
}

// Ciclo completo
async function fullCycle() {
  console.log('\n🤖 AI AUTONOMOUS DEVELOPMENT - FULL CYCLE\n');
  console.log('='.repeat(50) + '\n');

  const startTime = Date.now();

  // 1. Health Check
  const healthOk = await healthCheck();
  if (!healthOk) {
    logError('Health check failed. Aborting.');
    saveSession();
    return;
  }

  console.log('');

  // 2. Compile
  const compileOk = await compileAPK();
  if (!compileOk) {
    logError('Compilation failed. Aborting.');
    saveSession();
    return;
  }

  console.log('');

  // 3. Install
  const installOk = await installAPK();
  if (!installOk) {
    logError('Installation failed. Aborting.');
    saveSession();
    return;
  }

  console.log('');

  // 4. Clear data
  await clearAppData();

  console.log('');

  // 5. Launch
  const launchOk = await launchApp();
  if (!launchOk) {
    logError('Launch failed. Aborting.');
    saveSession();
    return;
  }

  console.log('');

  // 6. Capture logs
  const logs = await captureLogs(8000);

  console.log('');

  // 7. Analyze
  const analysis = analyzeLogs(logs);

  console.log('');

  // Resumen
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`⏱️  Total duration: ${duration}s`);
  console.log(`✅ Success messages: ${analysis.success.length}`);
  console.log(`❌ Errors found: ${analysis.errors.length}`);
  console.log(`⚠️  Warnings: ${analysis.warnings.length}`);

  if (analysis.errors.length > 0) {
    console.log('\n🐛 ERRORS DETECTED:');
    analysis.errors.slice(0, 5).forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  } else {
    console.log('\n✅ NO ERRORS - TESTING SUCCESSFUL!');
  }

  console.log('\n' + '='.repeat(50) + '\n');

  sessionLog.metrics.duration = `${duration}s`;
  sessionLog.metrics.errors = analysis.errors.length;
  sessionLog.metrics.success = analysis.success.length;

  saveSession();
}

// CLI Main
async function main() {
  const command = process.argv[2] || 'help';

  switch (command) {
    case 'full-cycle':
      await fullCycle();
      break;

    case 'compile':
      await compileAPK();
      saveSession();
      break;

    case 'test-only':
      await healthCheck();
      await installAPK();
      await clearAppData();
      await launchApp();
      const logs = await captureLogs();
      analyzeLogs(logs);
      saveSession();
      break;

    case 'health':
      await healthCheck();
      saveSession();
      break;

    case 'analyze-logs':
      const latestLog = fs.readdirSync(CONFIG.logsDir)
        .filter(f => f.startsWith('logs-'))
        .sort()
        .reverse()[0];

      if (latestLog) {
        const content = fs.readFileSync(path.join(CONFIG.logsDir, latestLog), 'utf-8');
        analyzeLogs(content);
      } else {
        logError('No logs found');
      }
      break;

    case 'help':
    default:
      console.log(`
🤖 AI AUTONOMOUS DEVELOPMENT CLI

Usage:
  node automation-cli.js <command>

Commands:
  full-cycle     Run complete testing cycle (recommended)
  compile        Compile APK only
  test-only      Test without compiling
  health         Health check all components
  analyze-logs   Analyze latest logs
  help           Show this help

Examples:
  node automation-cli.js full-cycle
  node automation-cli.js health
      `);
      break;
  }
}

// Run
main().catch(error => {
  logError(`Fatal error: ${error.message}`);
  sessionLog.errors.push({ step: 'main', error: error.message });
  saveSession();
  process.exit(1);
});
