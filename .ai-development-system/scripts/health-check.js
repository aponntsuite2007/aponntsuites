#!/usr/bin/env node

/**
 * 🏥 HEALTH CHECK SCRIPT
 * =====================
 * Verifica estado de todos los componentes del sistema
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const CONFIG = {
  backend: {
    url: 'http://localhost:3001',
    healthEndpoint: '/api/v1/health',
    timeout: 5000
  },
  emulator: {
    adb: 'C:\\Users\\notebook\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe',
    emulatorCmd: 'C:\\Users\\notebook\\AppData\\Local\\Android\\Sdk\\emulator\\emulator.exe'
  }
};

class HealthChecker {
  constructor() {
    this.results = {
      backend: null,
      database: null,
      emulator: null,
      flutter: null,
      node: null,
      overall: null
    };
  }

  /**
   * Check completo de todos los componentes
   */
  async checkAll() {
    console.log('\n🏥 HEALTH CHECK - Sistema de Asistencia Biométrico\n');
    console.log('═'.repeat(60) + '\n');

    await this.checkNode();
    await this.checkFlutter();
    await this.checkBackend();
    await this.checkEmulator();

    this.calculateOverallHealth();
    this.printReport();

    return this.results;
  }

  /**
   * Verificar Node.js
   */
  async checkNode() {
    process.stdout.write('📦 Node.js... ');

    try {
      const { stdout } = await execPromise('node --version');
      const version = stdout.trim();

      this.results.node = {
        status: 'OK',
        version,
        healthy: true
      };

      console.log(`✅ ${version}`);
    } catch (error) {
      this.results.node = {
        status: 'ERROR',
        error: error.message,
        healthy: false
      };

      console.log('❌ No encontrado');
    }
  }

  /**
   * Verificar Flutter SDK
   */
  async checkFlutter() {
    process.stdout.write('🔷 Flutter SDK... ');

    try {
      const { stdout } = await execPromise('flutter --version', { timeout: 10000 });
      const versionMatch = stdout.match(/Flutter (\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';

      this.results.flutter = {
        status: 'OK',
        version,
        healthy: true
      };

      console.log(`✅ ${version}`);
    } catch (error) {
      this.results.flutter = {
        status: 'ERROR',
        error: error.message,
        healthy: false
      };

      console.log('❌ No encontrado');
    }
  }

  /**
   * Verificar Backend
   */
  async checkBackend() {
    process.stdout.write('🌐 Backend... ');

    try {
      const url = `${CONFIG.backend.url}${CONFIG.backend.healthEndpoint}`;

      // Intentar con fetch (Node.js 18+)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONFIG.backend.timeout);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json().catch(() => ({}));

        this.results.backend = {
          status: 'OK',
          url: CONFIG.backend.url,
          port: 3001,
          healthy: true,
          response: data
        };

        console.log(`✅ Running on :3001`);
      } else {
        this.results.backend = {
          status: 'ERROR',
          error: `HTTP ${response.status}`,
          healthy: false
        };

        console.log(`❌ HTTP ${response.status}`);
      }
    } catch (error) {
      this.results.backend = {
        status: 'ERROR',
        error: error.message,
        healthy: false
      };

      console.log('❌ No accesible');
    }
  }

  /**
   * Verificar Emulador Android
   */
  async checkEmulator() {
    process.stdout.write('📱 Emulador Android... ');

    try {
      const { stdout } = await execPromise(`"${CONFIG.emulator.adb}" devices`);

      const devices = stdout.split('\n')
        .filter(line => line.includes('device') && !line.includes('List'))
        .filter(line => !line.includes('offline'));

      if (devices.length > 0) {
        const deviceId = devices[0].split('\t')[0];

        this.results.emulator = {
          status: 'OK',
          deviceId,
          deviceCount: devices.length,
          healthy: true
        };

        console.log(`✅ ${deviceId}`);
      } else {
        this.results.emulator = {
          status: 'ERROR',
          error: 'No devices found',
          healthy: false
        };

        console.log('❌ No activo');
      }
    } catch (error) {
      this.results.emulator = {
        status: 'ERROR',
        error: error.message,
        healthy: false
      };

      console.log('❌ ADB no disponible');
    }
  }

  /**
   * Calcular salud general del sistema
   */
  calculateOverallHealth() {
    const components = Object.values(this.results).filter(r => r !== null);
    const healthyCount = components.filter(r => r.healthy).length;
    const totalCount = components.length;
    const healthPercentage = (healthyCount / totalCount) * 100;

    this.results.overall = {
      healthy: healthPercentage === 100,
      healthPercentage,
      healthyComponents: healthyCount,
      totalComponents: totalCount,
      status: healthPercentage === 100 ? 'HEALTHY' :
              healthPercentage >= 75 ? 'DEGRADED' : 'CRITICAL'
    };
  }

  /**
   * Imprimir reporte
   */
  printReport() {
    console.log('\n' + '═'.repeat(60));
    console.log('  📊 RESUMEN');
    console.log('═'.repeat(60));

    const { overall } = this.results;

    console.log(`\nEstado General: ${this.getStatusEmoji(overall.status)} ${overall.status}`);
    console.log(`Salud: ${overall.healthPercentage.toFixed(0)}% (${overall.healthyComponents}/${overall.totalComponents} componentes)`);

    // Componentes con problemas
    const unhealthy = Object.entries(this.results)
      .filter(([key, value]) => value && !value.healthy && key !== 'overall');

    if (unhealthy.length > 0) {
      console.log('\n⚠️  COMPONENTES CON PROBLEMAS:');
      unhealthy.forEach(([name, data]) => {
        console.log(`   - ${name}: ${data.error}`);
      });
    }

    console.log('\n' + '═'.repeat(60) + '\n');
  }

  /**
   * Obtener emoji según estado
   */
  getStatusEmoji(status) {
    switch (status) {
      case 'HEALTHY': return '✅';
      case 'DEGRADED': return '⚠️';
      case 'CRITICAL': return '❌';
      default: return 'ℹ️';
    }
  }
}

// Si se ejecuta directamente
if (require.main === module) {
  const checker = new HealthChecker();

  checker.checkAll().then(results => {
    const exitCode = results.overall.healthy ? 0 : 1;
    process.exit(exitCode);
  }).catch(error => {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  });
}

module.exports = HealthChecker;
