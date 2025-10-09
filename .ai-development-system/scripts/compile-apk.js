#!/usr/bin/env node

/**
 * 🔨 APK COMPILATION SCRIPT
 * ========================
 * Compila el APK Flutter con manejo de errores y métricas
 */

const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');

const execPromise = util.promisify(exec);

const CONFIG = {
  frontendPath: path.join(__dirname, '../../frontend_flutter'),
  buildPath: 'build/app/outputs/flutter-apk/app-debug.apk',
  buildCommand: 'flutter build apk --debug'
};

async function compileAPK() {
  console.log('\n🔨 COMPILANDO APK...\n');
  const startTime = Date.now();

  try {
    console.log(`📂 Directorio: ${CONFIG.frontendPath}`);
    console.log(`⚙️  Comando: ${CONFIG.buildCommand}\n`);

    const { stdout, stderr } = await execPromise(
      CONFIG.buildCommand,
      {
        cwd: CONFIG.frontendPath,
        timeout: 300000 // 5 minutos max
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Verificar si el APK existe
    const apkPath = path.join(CONFIG.frontendPath, CONFIG.buildPath);
    const apkExists = fs.existsSync(apkPath);

    if (apkExists && stdout.includes('Built build')) {
      const stats = fs.statSync(apkPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log('✅ COMPILACIÓN EXITOSA\n');
      console.log(`⏱️  Tiempo: ${duration}s`);
      console.log(`📦 APK: ${apkPath}`);
      console.log(`📊 Tamaño: ${sizeInMB} MB\n`);

      return {
        success: true,
        duration,
        apkPath,
        size: sizeInMB
      };
    } else {
      console.log('❌ COMPILACIÓN FALLÓ\n');
      console.log('STDOUT:', stdout);
      console.log('STDERR:', stderr);

      return {
        success: false,
        error: 'APK no generado',
        stdout,
        stderr
      };
    }

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('❌ ERROR DE COMPILACIÓN\n');
    console.log(`⏱️  Tiempo antes del error: ${duration}s`);
    console.log(`🐛 Error: ${error.message}\n`);

    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.log('STDERR:', error.stderr);

    return {
      success: false,
      error: error.message,
      duration,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}

// Si se ejecuta directamente
if (require.main === module) {
  compileAPK().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = compileAPK;
