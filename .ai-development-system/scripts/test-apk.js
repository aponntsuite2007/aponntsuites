#!/usr/bin/env node

/**
 * 🧪 APK TESTING SCRIPT
 * ====================
 * Instala, ejecuta y monitorea el APK en el emulador
 */

const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');

const execPromise = util.promisify(exec);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const CONFIG = {
  adb: 'C:\\Users\\notebook\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe',
  apkPath: path.join(__dirname, '../../frontend_flutter/build/app/outputs/flutter-apk/app-debug.apk'),
  package: 'com.example.attendance_system',
  mainActivity: '.MainActivity',
  logDuration: 8000 // ms
};

async function testAPK(options = {}) {
  const {
    clearData = true,
    captureLogs = true,
    logDuration = CONFIG.logDuration
  } = options;

  console.log('\n🧪 TESTING APK...\n');

  try {
    // 1. Verificar emulador
    console.log('📱 Verificando emulador...');
    const { stdout: devices } = await execPromise(`"${CONFIG.adb}" devices`);

    if (!devices.includes('device') || devices.includes('offline')) {
      console.log('❌ No hay emulador activo\n');
      return { success: false, error: 'No emulator' };
    }
    console.log('✅ Emulador activo\n');

    // 2. Verificar APK
    console.log('📦 Verificando APK...');
    if (!fs.existsSync(CONFIG.apkPath)) {
      console.log(`❌ APK no encontrado: ${CONFIG.apkPath}\n`);
      return { success: false, error: 'APK not found' };
    }
    console.log(`✅ APK encontrado: ${CONFIG.apkPath}\n`);

    // 3. Instalar APK
    console.log('📲 Instalando APK...');
    const { stdout: installOutput } = await execPromise(
      `"${CONFIG.adb}" install -r "${CONFIG.apkPath}"`,
      { timeout: 60000 }
    );

    if (!installOutput.includes('Success')) {
      console.log('❌ Instalación falló\n');
      console.log(installOutput);
      return { success: false, error: 'Install failed', output: installOutput };
    }
    console.log('✅ APK instalado\n');

    // 4. Limpiar datos (opcional)
    if (clearData) {
      console.log('🧹 Limpiando datos de la app...');
      await execPromise(`"${CONFIG.adb}" shell pm clear ${CONFIG.package}`);
      console.log('✅ Datos limpiados\n');
    }

    // 5. Limpiar logs previos
    console.log('🗑️  Limpiando logs previos...');
    await execPromise(`"${CONFIG.adb}" logcat -c`);
    console.log('✅ Logs limpiados\n');

    // 6. Ejecutar app
    console.log('🚀 Ejecutando app...');
    await execPromise(
      `"${CONFIG.adb}" shell am start -n ${CONFIG.package}/${CONFIG.mainActivity}`
    );
    console.log(`✅ App ejecutada\n`);

    // 7. Capturar logs (opcional)
    if (captureLogs) {
      console.log(`📋 Capturando logs por ${logDuration/1000}s...`);
      await sleep(logDuration);

      const { stdout: logs } = await execPromise(
        `"${CONFIG.adb}" logcat -d -s flutter:V`
      );

      console.log(`✅ Logs capturados (${logs.split('\n').length} líneas)\n`);

      // Análisis rápido
      const errors = logs.split('\n').filter(line =>
        line.includes('❌') || line.includes('Error') || line.includes('Exception')
      );

      const warnings = logs.split('\n').filter(line =>
        line.includes('⚠️') || line.includes('Warning')
      );

      const success = logs.split('\n').filter(line =>
        line.includes('✅')
      );

      console.log('📊 RESUMEN DE LOGS:');
      console.log(`   ✅ Éxitos: ${success.length}`);
      console.log(`   ❌ Errores: ${errors.length}`);
      console.log(`   ⚠️  Advertencias: ${warnings.length}\n`);

      if (errors.length > 0) {
        console.log('🐛 ERRORES DETECTADOS:');
        errors.slice(0, 5).forEach((error, i) => {
          console.log(`   ${i + 1}. ${error.trim()}`);
        });
        console.log('');
      }

      return {
        success: true,
        logs,
        analysis: {
          errors: errors.length,
          warnings: warnings.length,
          success: success.length,
          errorDetails: errors.slice(0, 10)
        }
      };
    }

    return { success: true };

  } catch (error) {
    console.log(`❌ ERROR: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

// Si se ejecuta directamente
if (require.main === module) {
  const options = {
    clearData: process.argv.includes('--no-clear') ? false : true,
    captureLogs: process.argv.includes('--no-logs') ? false : true,
    logDuration: parseInt(process.argv.find(arg => arg.startsWith('--duration='))?.split('=')[1]) || CONFIG.logDuration
  };

  testAPK(options).then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = testAPK;
