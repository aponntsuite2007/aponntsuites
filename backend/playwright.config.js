// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

// CRÍTICO: Cargar variables de entorno de .env.e2e ANTES de ejecutar tests
require('dotenv').config({ path: path.join(__dirname, 'tests', 'e2e', '.env.e2e') });

console.log('🔐 E2E_SERVICE_TOKEN:', process.env.E2E_SERVICE_TOKEN ? 'LOADED ✅' : 'NOT LOADED ❌');

/**
 * Playwright Configuration - Smart E2E Testing System
 * Testing CRUD real con verificación de persistencia en BD
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: ['modules/**/*.spec.js', 'levels/**/*.spec.js'],

  // Timeout por test (3 minutos - CRUD puede ser largo)
  timeout: 60000,

  // Expect timeout (30 segundos para auto-wait)
  expect: {
    timeout: 30000
  },

  // Sin modo watch (CI/CD friendly)
  fullyParallel: false,

  // Reintentar tests fallidos (detectar flakiness)
  retries: process.env.CI ? 2 : 1,

  // Workers (ejecutar tests en paralelo)
  workers: process.env.CI ? 1 : 3,

  // Reporter - HTML visual + JSON para CI
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],

  use: {
    // Base URL de la aplicación
    baseURL: 'http://localhost:9998',

    // Screenshots: solo cuando falla
    screenshot: 'only-on-failure',

    // Video: solo cuando falla
    video: 'retain-on-failure',

    // Trace: para debugging profundo
    trace: 'on-first-retry',

    // Viewport
    viewport: { width: 1920, height: 1080 },

    // Ignore HTTPS errors (desarrollo local)
    ignoreHTTPSErrors: true,

    // Action timeout (tiempo máximo para cada acción)
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Credenciales por defecto para todos los tests
        storageState: undefined
      },
    },
  ],

  // Servidor web local (Playwright puede levantarlo automáticamente)
  // webServer: {
  //   command: 'PORT=9998 npm start',
  //   url: 'http://localhost:9998',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
