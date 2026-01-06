/**
 * REAL USER EXPERIENCE COLLECTOR
 *
 * Testea EXACTAMENTE lo que experimentan los usuarios reales:
 * - Abre navegador como usuario real
 * - Navega a módulos específicos (ej: capacitaciones)
 * - Detecta errores 401/403/500 que experimentan usuarios
 * - NO acepta "SKIP" - si un módulo está en el menú, debe funcionar
 *
 * CASOS DETECTADOS:
 * ❌ Error 401 en /api/v1/trainings al entrar a capacitaciones
 * ❌ "Failed to load resource: 401 Unauthorized"
 * ❌ Modales que no abren por errores de auth
 *
 * @version 1.0.0
 * @date 2025-10-22
 */

// Playwright opcional para produccion
let chromium = null;
try { chromium = require('playwright').chromium; } catch(e) { console.log('Playwright no disponible'); }

class RealUserExperienceCollector {
  constructor(database, systemRegistry) {
    this.database = database;
    this.registry = systemRegistry;
    this.baseUrl = `http://localhost:${process.env.PORT || 9998}`;
    this.browser = null;
    this.page = null;

    // Errores capturados
    this.networkErrors = [];
    this.consoleErrors = [];
    this.jsErrors = [];
  }

  async collect(execution_id, config) {
    console.log('  🎭 [REAL-UX] Iniciando tests de experiencia real de usuario...');

    const results = [];

    try {
      await this.initBrowser();
      await this.loginAsRealUser(config);

      // Tests específicos de módulos que usuarios usan realmente
      const realModules = [
        { name: 'Capacitaciones', url: `${this.baseUrl}/panel-empresa.html`, hash: 'training-management', api: '/api/v1/trainings' },
        { name: 'Usuarios', url: `${this.baseUrl}/panel-empresa.html`, hash: 'users', api: '/api/v1/users' },
        { name: 'Asistencia', url: `${this.baseUrl}/panel-empresa.html`, hash: 'attendance', api: '/api/v1/attendance' },
        { name: 'Departamentos', url: `${this.baseUrl}/panel-empresa.html`, hash: 'departments', api: '/api/v1/departments' },
        { name: 'Notificaciones', url: `${this.baseUrl}/panel-empresa.html`, hash: 'notifications', api: '/api/v1/notifications' }
      ];

      for (const module of realModules) {
        console.log(`    🧪 [REAL-UX] Testeando ${module.name}...`);
        const result = await this.testRealModuleExperience(execution_id, module);
        results.push(result);
      }

    } catch (error) {
      console.error('  ❌ [REAL-UX] Error:', error);
    } finally {
      await this.closeBrowser();
    }

    return results;
  }

  async initBrowser() {
    this.browser = await chromium.launch({
      headless: false, // VISIBLE para depuración
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });

    const context = await this.browser.newContext({ viewport: null });
        this.page = await context.newPage();
    // NOTA: page.setCacheEnabled() NO existe en Playwright
    // await this.page.setCacheEnabled(false);

    // Capturar errores de red (401, 403, 500)
    this.page.on('response', response => {
      if (response.status() >= 400) {
        this.networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date()
        });
        console.log(`      ❌ [NETWORK] ${response.status()} ${response.url()}`);
      }
    });

    // Capturar errores de consola
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        const error = msg.text();
        this.consoleErrors.push({
          message: error, timestamp: new Date()
        });
        console.log(`      ❌ [CONSOLE] ${error}`);
      }
    });

    // Capturar errores de JavaScript
    this.page.on('pageerror', error => {
      this.jsErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
      });
      console.log(`      ❌ [JS-ERROR] ${error.message}`);
    });
  }

  async loginAsRealUser(config) {
    console.log('    🔐 [REAL-UX] Haciendo login como usuario real...');

    await this.page.goto(`${this.baseUrl}/panel-empresa.html`);

    // Esperar que cargue el formulario de login multi-tenant
    await this.page.waitForSelector('#multiTenantLoginForm', { timeout: 10000 });
    console.log('    📝 [REAL-UX] Formulario de login detectado');

    // PASO 1: Seleccionar empresa
    await this.page.waitForSelector('#companySelect', { timeout: 5000 });
    await this.page.selectOption('#companySelect', 'aponnt-empresa-demo');
    console.log('    🏢 [REAL-UX] Empresa seleccionada');

    // PASO 2: Esperar que se habilite el campo usuario y escribir
    await this.page.waitForTimeout(1000); // Esperar que se habilite
    await this.page.fill('#userInput', 'administrador');
    console.log('    👤 [REAL-UX] Usuario ingresado');

    // PASO 3: Esperar que se habilite la contraseña y escribir
    await this.page.waitForTimeout(1000); // Esperar que se habilite
    await this.page.fill('#passwordInput', 'admin123');
    console.log('    🔑 [REAL-UX] Contraseña ingresada');

    // PASO 4: Hacer click en el botón de login
    await this.page.waitForSelector('#loginButton:not([disabled])', { timeout: 5000 });
    await this.page.click('#loginButton');
    console.log('    🔘 [REAL-UX] Botón login presionado');

    // Esperar que cargue el dashboard
    await this.page.waitForSelector('#mainContent, .main-content', { timeout: 15000 });

    console.log('    ✅ [REAL-UX] Login exitoso');
  }

  async testRealModuleExperience(execution_id, module) {
    const { AuditLog } = this.database;

    const log = await AuditLog.create({
      execution_id,
      test_type: 'real-ux',
      module_name: module.name.toLowerCase().replace(' ', '-'),
      test_name: `Real UX - ${module.name}`,
      test_description: `Test de experiencia real del usuario en ${module.name}`,
      status: 'in-progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    // Limpiar errores anteriores
    this.networkErrors = [];
    this.consoleErrors = [];
    this.jsErrors = [];

    try {
      console.log(`      🌐 [REAL-UX] Navegando a ${module.name}...`);

      // Navegar usando hash (como haría un usuario real)
      await this.page.evaluate((hash) => {
        window.location.hash = hash;
      }, module.hash);

      // Esperar que cargue el módulo
      await this.page.waitForTimeout(2000);

      // Buscar si hay botones del módulo y hacer click (simular interacción real)
      const moduleButtons = await this.page.$$(`[data-module="${module.hash}"], [href="#${module.hash}"], .module-${module.hash}`);
      if (moduleButtons.length > 0) {
        console.log(`      🔘 [REAL-UX] Click en botón del módulo ${module.name}`);
        await moduleButtons[0].click();
        await this.page.waitForTimeout(1000);
      }

      // Esperar que se hagan las llamadas API (tiempo real de usuario)
      await this.page.waitForTimeout(5000);

      // Evaluar errores encontrados
      const criticalErrors = this.evaluateErrors(module);

      if (criticalErrors.length > 0) {
        // FALLÓ - Hay errores críticos que impactan al usuario
        await log.update({
          status: 'fail',
          severity: 'high',
          error_message: `${criticalErrors.length} errores críticos detectados`,
          error_context: {
            critical_errors: criticalErrors,
            network_errors: this.networkErrors.slice(0, 5),
            console_errors: this.consoleErrors.slice(0, 5),
            js_errors: this.jsErrors.slice(0, 3)
          },
          duration_ms: Date.now() - startTime,
          completed_at: new Date()
        });

        console.log(`      ❌ [REAL-UX] ${module.name} FALLÓ - ${criticalErrors.length} errores críticos`);
        criticalErrors.forEach(error => {
          console.log(`         • ${error}`);
        });

      } else {
        // PASÓ - No hay errores críticos
        await log.update({
          status: 'pass',
          duration_ms: Date.now() - startTime,
          test_data: {
            network_requests: this.networkErrors.length,
            console_messages: this.consoleErrors.length,
            js_errors: this.jsErrors.length
          },
          completed_at: new Date()
        });

        console.log(`      ✅ [REAL-UX] ${module.name} funcionando correctamente`);
      }

    } catch (error) {
      await log.update({
        status: 'fail',
        severity: 'critical',
        error_type: error.name,
        error_message: error.message,
        duration_ms: Date.now() - startTime,
        completed_at: new Date()
      });

      console.log(`      ❌ [REAL-UX] ${module.name} ERROR CRÍTICO: ${error.message}`);
    }

    return log;
  }

  evaluateErrors(module) {
    const criticalErrors = [];

    // 1. Errores de autenticación/autorización
    const authErrors = this.networkErrors.filter(err =>
      [401, 403].includes(err.status) &&
      err.url.includes(module.api)
    );

    if (authErrors.length > 0) {
      authErrors.forEach(err => {
        criticalErrors.push(`${err.status} ${err.statusText} en ${err.url} - Usuario no puede acceder al contenido`);
      });
    }

    // 2. Errores de servidor
    const serverErrors = this.networkErrors.filter(err =>
      err.status >= 500 &&
      err.url.includes(module.api)
    );

    if (serverErrors.length > 0) {
      serverErrors.forEach(err => {
        criticalErrors.push(`${err.status} Error de servidor en ${err.url} - Funcionalidad rota`);
      });
    }

    // 3. Errores de consola que afectan funcionalidad
    const functionalConsoleErrors = this.consoleErrors.filter(err => {
      const msg = err.message.toLowerCase();
      return msg.includes('failed to load') ||
             msg.includes('unauthorized') ||
             msg.includes('error loading') ||
             msg.includes('cannot read');
    });

    if (functionalConsoleErrors.length > 0) {
      functionalConsoleErrors.forEach(err => {
        criticalErrors.push(`Error de JavaScript: ${err.message}`);
      });
    }

    // 4. Errores de JavaScript que rompen la interfaz
    if (this.jsErrors.length > 0) {
      this.jsErrors.forEach(err => {
        criticalErrors.push(`JavaScript Error: ${err.message}`);
      });
    }

    return criticalErrors;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = RealUserExperienceCollector;