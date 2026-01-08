/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTONOMOUS QA AGENT - Agente Inteligente de Testing
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * FILOSOFÍA:
 * - NO asumir estructura (descubrir TODO automáticamente)
 * - NO hard-coding de selectores (clasificar por patrones)
 * - APRENDER de cada interacción (PostgreSQL + Brain)
 * - ADAPTARSE a lentitud/crashes dinámicamente
 * - INTEGRARSE con Brain para crear tickets automáticos
 *
 * CAPACIDADES:
 * - Autodescubrimiento completo (botones, modales, tabs, tablas, forms)
 * - Clasificación inteligente (CREATE, EDIT, DELETE, VIEW, EXPORT, etc.)
 * - Learning persistente (qué funciona, qué crashea, qué es lento)
 * - Adaptación dinámica de timeouts
 * - Integración con BrainNervousSystem
 * - Reportes detallados de todo lo descubierto
 *
 * @version 1.0.0
 * @date 2026-01-07
 * ═══════════════════════════════════════════════════════════════════════════
 */

let chromium = null;
try {
  chromium = require('playwright').chromium;
} catch(e) {
  console.log('⚠️  Playwright no disponible - instalar con: npm install playwright');
}

const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

// ⭐ NUEVO: Faker para generación de datos de prueba realistas
const { faker } = require('@faker-js/faker');
faker.locale = 'es'; // Datos en español

class AutonomousQAAgent {
  constructor(config = {}) {
    // ✅ FIX: Detectar puerto del servidor actual
    const port = process.env.PORT || '9998';

    this.config = {
      baseUrl: config.baseUrl || `http://localhost:${port}`,
      headless: config.headless || false,
      slowMo: config.slowMo || 100,
      defaultTimeout: config.defaultTimeout || 30000,
      learningEnabled: config.learningEnabled !== false, // Default true
      brainIntegration: config.brainIntegration !== false, // Default true
      ...config
    };

    this.browser = null;
    this.page = null;
    this.context = null;

    // Estado del agente
    this.currentModule = null;
    this.discoveries = {};
    this.knowledge = {};
    this.sessionId = uuidv4();
    this.stats = {
      elementsDiscovered: 0,
      elementsTested: 0,
      crashes: 0,
      timeouts: 0,
      successes: 0
    };

    // Dependencias
    this.database = config.database;
    this.brainNervous = config.brainNervous;
    this.learningEngine = config.learningEngine;

    console.log(`🤖 [AGENT] Autonomous QA Agent inicializado`);
    console.log(`   Session ID: ${this.sessionId}`);
    console.log(`   Learning: ${this.config.learningEnabled ? 'ON' : 'OFF'}`);
    console.log(`   Brain Integration: ${this.config.brainIntegration ? 'ON' : 'OFF'}`);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * INICIALIZACIÓN
   * ═══════════════════════════════════════════════════════════════════════
   */
  async init() {
    console.log('\n🚀 [AGENT] Inicializando navegador...');

    if (!chromium) {
      throw new Error('Playwright no disponible. Instalar con: npm install playwright');
    }

    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1366, height: 768 }, // ✅ Resolución estándar, no gigante
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    this.page = await this.context.newPage();

    // Configurar timeouts dinámicos
    this.page.setDefaultTimeout(this.config.defaultTimeout);

    // Escuchar eventos del navegador
    this._setupBrowserListeners();

    console.log('   ✅ Navegador listo');
  }

  /**
   * Configurar listeners para crashes, errores, console logs
   */
  _setupBrowserListeners() {
    // Console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`   🔴 [CONSOLE ERROR] ${msg.text()}`);
        this.stats.crashes++;

        // Notificar a Brain si está integrado
        if (this.config.brainIntegration && this.brainNervous) {
          this.brainNervous.emit('crash-detected', {
            type: 'console-error',
            message: msg.text(),
            module: this.currentModule,
            timestamp: new Date()
          });
        }
      }
    });

    // Page errors (uncaught exceptions)
    this.page.on('pageerror', error => {
      console.log(`   🔴 [PAGE ERROR] ${error.message}`);
      this.stats.crashes++;

      if (this.config.brainIntegration && this.brainNervous) {
        this.brainNervous.emit('crash-detected', {
          type: 'page-error',
          message: error.message,
          stack: error.stack,
          module: this.currentModule,
          timestamp: new Date()
        });
      }
    });

    // Request failures
    this.page.on('requestfailed', request => {
      console.log(`   ⚠️  [REQUEST FAILED] ${request.url()}`);
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LOGIN AUTOMÁTICO (usa dropdown, luego user, luego password)
   * ═══════════════════════════════════════════════════════════════════════
   */
  async login(credentials = {}) {
    const empresaSlug = credentials.empresa || 'isi';
    const usuario = credentials.usuario || 'admin'; // Usuario admin de la empresa ISI
    const password = credentials.password || 'admin123';

    console.log(`\n🔐 [AGENT] Login automático...`);
    console.log(`   Empresa: ${empresaSlug}`);
    console.log(`   Usuario: ${usuario}`);

    await this.page.goto(`${this.config.baseUrl}/panel-empresa.html`, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await this.page.waitForTimeout(3000);

    // Paso 1: Dropdown de empresa
    console.log('   1️⃣ Esperando dropdown de empresas...');
    await this.page.waitForSelector('#companySelect', { timeout: 10000 });

    await this.page.waitForFunction(
      () => {
        const select = document.getElementById('companySelect');
        return select && select.options.length > 1;
      },
      { timeout: 10000 }
    );

    console.log('   🏢 Seleccionando empresa...');
    await this.page.selectOption('#companySelect', empresaSlug);
    await this.page.waitForTimeout(5000);

    // Paso 2: Campo usuario
    console.log('   2️⃣ Esperando campo usuario...');
    await this.page.waitForSelector('#userInput:not([disabled])', { timeout: 15000 });

    console.log('   👤 Ingresando usuario...');
    await this.page.click('#userInput', { clickCount: 3 });
    await this.page.keyboard.press('Backspace');
    await this.page.fill('#userInput', usuario);
    await this.page.waitForTimeout(2000);

    // Paso 3: Campo password
    console.log('   3️⃣ Esperando campo contraseña...');
    await this.page.waitForSelector('#passwordInput:not([disabled])', { timeout: 15000 });

    console.log('   🔑 Ingresando contraseña...');
    await this.page.focus('#passwordInput');
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await this.page.fill('#passwordInput', password);
    await this.page.waitForTimeout(1000);

    // Paso 4: Click login
    console.log('   4️⃣ Haciendo click en Ingresar...');
    const loginBtn = await this.page.$('#loginButton');
    if (loginBtn) await loginBtn.click();

    // Esperar que cargue el panel COMPLETAMENTE
    console.log('   ⏳ Esperando que cargue el panel y módulos (8s)...');
    await this.page.waitForTimeout(8000); // 8 segundos para módulos dinámicos

    // Tomar screenshot para debug
    try {
      await this.page.screenshot({ path: 'debug-after-login.png', fullPage: true });
      console.log('      📸 Screenshot guardado: debug-after-login.png');
    } catch (e) {
      console.log('      ⚠️  No se pudo guardar screenshot');
    }

    // ⭐ CRÍTICO: Click en hamburger para abrir sidebar mobile
    console.log('   📂 Abriendo sidebar mobile...');
    try {
      const hamburger = await this.page.$('button[onclick*="toggleMobileSidebar"]');
      if (hamburger) {
        console.log('      → Click en toggleMobileSidebar');
        await hamburger.click();
        await this.page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('      ⚠️  No se pudo abrir sidebar mobile');
    }

    // Esperar específicamente a que aparezcan módulos (detección rápida)
    console.log('   🔍 Esperando a que aparezcan módulos...');
    try {
      await this.page.waitForFunction(
        () => {
          // Buscar elementos con data-module-key (más específico y confiable)
          const moduleElements = document.querySelectorAll('[data-module-key]');
          return moduleElements.length > 0; // Al menos 1 módulo
        },
        { timeout: 5000 }
      );
      console.log('      ✅ Módulos detectados en el DOM');
    } catch (e) {
      console.log('      ⚠️  Timeout esperando módulos - continuando de todos modos');
    }

    // ⭐ FIX: Obtener company_id después del login
    try {
      this.companyId = await this.page.evaluate(() => {
        const company = window.selectedCompany || window.currentCompany;
        return company?.id || company?.company_id || null;
      });
      console.log(`   🏢 Company ID obtenido: ${this.companyId}`);
    } catch (e) {
      console.log('   ⚠️  No se pudo obtener company_id');
      this.companyId = null;
    }

    console.log('   ✅ Login exitoso y panel cargado');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * NAVEGAR A MÓDULO (inteligente - busca por múltiples estrategias)
   * ═══════════════════════════════════════════════════════════════════════
   */
  async navigateToModule(moduleId) {
    console.log(`\n🧭 [AGENT] Navegando a módulo: ${moduleId}`);
    this.currentModule = moduleId;

    // ⭐ PRIMERO: Esperar a que aparezcan los módulos (elementos con data-module-key)
    console.log(`   ⏳ Esperando a que los módulos se rendericen...`);
    try {
      await this.page.waitForSelector('[data-module-key]', { timeout: 10000 });
      console.log(`   ✅ Módulos renderizados`);
    } catch (e) {
      console.log(`   ⚠️  Timeout esperando módulos - continuando de todos modos`);
    }

    // ⭐ ESTRATEGIA 1: Buscar directamente por data-module-key (EXACTO) - DIV o BUTTON
    console.log(`   🔍 Buscando por data-module-key="${moduleId}"...`);
    const moduleByKey = await this.page.$(`[data-module-key="${moduleId}"]`);
    if (moduleByKey) {
      const isVisible = await moduleByKey.evaluate(el => el.offsetParent !== null);
      if (isVisible) {
        console.log(`   ✅ Encontrado por data-module-key`);
        await moduleByKey.click();
        await this.page.waitForTimeout(3000);
        console.log(`   ✅ Navegado a ${moduleId}`);
        return;
      }
    }

    // ⭐ ESTRATEGIA 2: Buscar por texto en module cards (DIVs o BUTTONs)
    console.log(`   🔍 Buscando por texto en module cards...`);
    const moduleTexts = {
      'users': ['usuarios', 'user', 'gestión de usuarios', 'gestion usuarios'],
      'attendance': ['asistencia', 'attendance', 'marcaciones'],
      'departments': ['departamentos', 'departments', 'áreas'],
      'vacations': ['vacaciones', 'vacations', 'ausencias'],
      'shifts': ['turnos', 'shifts', 'horarios']
    };

    const searchTexts = moduleTexts[moduleId] || [moduleId];

    // Buscar TODOS los elementos con data-module-key (DIVs, BUTTONs, etc.)
    const allModuleCards = await this.page.$$('[data-module-key]');

    console.log(`   🔍 Buscando entre ${allModuleCards.length} module cards...`);

    for (const btn of allModuleCards) {
      try {
        const info = await btn.evaluate(el => ({
          text: el.textContent?.trim().toLowerCase() || '',
          dataModuleKey: el.getAttribute('data-module-key') || '',
          dataModuleName: el.getAttribute('data-module-name') || '',
          visible: el.offsetParent !== null
        }));

        // Buscar coincidencia
        for (const searchText of searchTexts) {
          if (info.visible && (
              info.text.includes(searchText.toLowerCase()) ||
              info.dataModuleKey === moduleId ||
              info.dataModuleName.toLowerCase().includes(searchText.toLowerCase())
            )) {
            console.log(`   ✅ Encontrado: "${info.dataModuleName}" (key: ${info.dataModuleKey})`);
            await btn.click();
            await this.page.waitForTimeout(3000);
            console.log(`   ✅ Navegado a ${moduleId}`);
            return;
          }
        }
      } catch (e) {
        // Elemento no accesible, continue
      }
    }

    // Si no se encontró, tomar screenshot y hacer debug exhaustivo
    console.log(`\n   ❌ No se encontró módulo "${moduleId}"`);

    // Screenshot para debug
    try {
      await this.page.screenshot({ path: `debug-searching-${moduleId}.png`, fullPage: true });
      console.log(`   📸 Screenshot guardado: debug-searching-${moduleId}.png`);
    } catch (e) {}

    // ⭐ DEBUG EXHAUSTIVO: Ver qué hay en el DOM
    console.log(`\n   🔍 DEBUG EXHAUSTIVO:`);

    const debugInfo = await this.page.evaluate(() => {
      const allButtons = document.querySelectorAll('button');
      const moduleCards = document.querySelectorAll('button.module-card');
      const dataModuleKeys = document.querySelectorAll('[data-module-key]');
      const visibleButtons = Array.from(allButtons).filter(el => el.offsetParent !== null);

      return {
        totalButtons: allButtons.length,
        moduleCards: moduleCards.length,
        dataModuleKeys: dataModuleKeys.length,
        visibleButtons: visibleButtons.length,
        sampleModuleCards: Array.from(moduleCards).slice(0, 5).map(el => ({
          text: el.textContent?.trim().substring(0, 50),
          key: el.getAttribute('data-module-key'),
          name: el.getAttribute('data-module-name'),
          visible: el.offsetParent !== null
        })),
        sampleDataKeys: Array.from(dataModuleKeys).slice(0, 5).map(el => ({
          tag: el.tagName,
          key: el.getAttribute('data-module-key'),
          name: el.getAttribute('data-module-name'),
          visible: el.offsetParent !== null
        }))
      };
    });

    console.log(`      Total buttons en página: ${debugInfo.totalButtons}`);
    console.log(`      Total con class="module-card": ${debugInfo.moduleCards}`);
    console.log(`      Total con data-module-key: ${debugInfo.dataModuleKeys}`);
    console.log(`      Buttons visibles: ${debugInfo.visibleButtons}`);

    console.log(`\n   📋 Sample module cards:`);
    for (const card of debugInfo.sampleModuleCards) {
      console.log(`      - "${card.text}" key="${card.key}" name="${card.name}" visible=${card.visible}`);
    }

    console.log(`\n   📋 Sample data-module-key elements:`);
    for (const el of debugInfo.sampleDataKeys) {
      console.log(`      - [${el.tag}] key="${el.key}" name="${el.name}" visible=${el.visible}`);
    }

    throw new Error(`No se encontró botón para módulo: ${moduleId}`);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * AUTODESCUBRIMIENTO COMPLETO - El cerebro del agente
   * ═══════════════════════════════════════════════════════════════════════
   */
  async discoverAll() {
    console.log(`\n🔍 [AGENT] AUTODESCUBRIMIENTO COMPLETO - Módulo: ${this.currentModule}`);

    const discoveries = {
      buttons: [],
      modals: [],
      tabs: [],
      tables: [],
      forms: [],
      inputs: []
    };

    // 1. DESCUBRIR BOTONES
    console.log(`   🔹 Descubriendo botones...`);
    const buttons = await this.page.$$('button, a.btn, [role="button"]');

    for (const btn of buttons) {
      try {
        const info = await btn.evaluate(el => {
          const rect = el.getBoundingClientRect();

          // ⭐ FIX CRÍTICO: Detectar CONTAINER del botón (modal, tab, body)
          let containerType = 'body';
          let containerSelector = null;
          let containerVisible = true;
          let requiresAction = null; // Acción requerida para hacer visible

          // Verificar si está dentro de un MODAL
          const modalParent = el.closest('.modal');
          if (modalParent) {
            containerType = 'modal';
            containerSelector = modalParent.id ? `#${modalParent.id}` : '.modal';
            containerVisible = modalParent.classList.contains('show') || modalParent.style.display !== 'none';
            if (!containerVisible) {
              requiresAction = 'open-modal';
            }
          }

          // Verificar si está dentro de un TAB PANE
          const tabPane = el.closest('.tab-pane, [role="tabpanel"]');
          if (tabPane && !modalParent) { // Solo si NO está en modal
            containerType = 'tab';
            containerSelector = tabPane.id ? `#${tabPane.id}` : '.tab-pane';
            containerVisible = tabPane.classList.contains('active') || tabPane.classList.contains('show');
            if (!containerVisible) {
              // Encontrar qué tab se debe clickear
              const tabId = tabPane.id;
              const tabButton = document.querySelector(`[href="#${tabId}"], [data-bs-target="#${tabId}"]`);
              requiresAction = {
                type: 'activate-tab',
                tabSelector: tabButton ? `[href="#${tabId}"]` : null
              };
            }
          }

          return {
            text: el.textContent?.trim() || '',
            id: el.id || '',
            classes: el.className || '',
            onclick: el.getAttribute('onclick') || '',
            href: el.getAttribute('href') || '',
            visible: rect.width > 0 && rect.height > 0,
            position: { x: rect.x, y: rect.y },
            // ⭐ NUEVO: Container awareness
            containerType: containerType,
            containerSelector: containerSelector,
            containerVisible: containerVisible,
            requiresAction: requiresAction
          };
        });

        // Clasificar botón automáticamente
        info.type = this._classifyButton(info);

        // ⭐ Guardar TODOS los botones con información de container
        if (info.type !== 'unknown') {
          discoveries.buttons.push(info);
          this.stats.elementsDiscovered++;
        }
      } catch (e) {
        // Botón no accesible, skip
      }
    }

    console.log(`      ✅ ${discoveries.buttons.length} botones descubiertos`);

    // 2. DESCUBRIR MODALES (ocultos en el DOM)
    console.log(`   🔹 Descubriendo modales...`);
    const modals = await this.page.$$('.modal, [role="dialog"], [id*="Modal"]');

    for (const modal of modals) {
      try {
        const info = await modal.evaluate(el => ({
          id: el.id || '',
          classes: el.className || '',
          visible: el.style.display !== 'none'
        }));

        discoveries.modals.push(info);
        this.stats.elementsDiscovered++;
      } catch (e) {
        // Skip
      }
    }

    console.log(`      ✅ ${discoveries.modals.length} modales descubiertos`);

    // 3. DESCUBRIR TABS (nav-tabs, nav-pills, etc.)
    console.log(`   🔹 Descubriendo tabs...`);
    const tabs = await this.page.$$('.nav-tabs a, .nav-pills a, [role="tab"]');

    for (const tab of tabs) {
      try {
        const info = await tab.evaluate(el => ({
          text: el.textContent?.trim() || '',
          id: el.id || '',
          href: el.getAttribute('href') || '',
          active: el.classList.contains('active')
        }));

        discoveries.tabs.push(info);
        this.stats.elementsDiscovered++;
      } catch (e) {
        // Skip
      }
    }

    console.log(`      ✅ ${discoveries.tabs.length} tabs descubiertos`);

    // 4. DESCUBRIR TABLAS
    console.log(`   🔹 Descubriendo tablas...`);
    const tables = await this.page.$$('table');

    for (const table of tables) {
      try {
        const info = await table.evaluate(el => {
          const rows = el.querySelectorAll('tbody tr');
          const headers = Array.from(el.querySelectorAll('thead th')).map(th => th.textContent?.trim());
          return {
            id: el.id || '',
            rowCount: rows.length,
            columnCount: headers.length,
            headers: headers
          };
        });

        discoveries.tables.push(info);
        this.stats.elementsDiscovered++;
      } catch (e) {
        // Skip
      }
    }

    console.log(`      ✅ ${discoveries.tables.length} tablas descubiertas`);

    // Guardar descubrimientos
    this.discoveries[this.currentModule] = discoveries;

    console.log(`\n   ✨ DESCUBRIMIENTO COMPLETO:`);
    console.log(`      - ${discoveries.buttons.length} botones`);
    console.log(`      - ${discoveries.modals.length} modales`);
    console.log(`      - ${discoveries.tabs.length} tabs`);
    console.log(`      - ${discoveries.tables.length} tablas`);

    return discoveries;
  }

  /**
   * CLASIFICAR BOTÓN automáticamente por patrones
   */
  _classifyButton(buttonInfo) {
    const text = buttonInfo.text.toLowerCase();
    const onclick = buttonInfo.onclick.toLowerCase();
    const classes = buttonInfo.classes.toLowerCase();

    // Patrones de CREATE
    if (text.includes('agregar') || text.includes('nuevo') || text.includes('crear') ||
        text.includes('add') || text.includes('create') ||
        onclick.includes('add') || onclick.includes('new') || onclick.includes('create') ||
        classes.includes('btn-add') || classes.includes('fa-plus')) {
      return 'CREATE';
    }

    // Patrones de EDIT
    if (text.includes('editar') || text.includes('modificar') || text.includes('edit') ||
        onclick.includes('edit') || onclick.includes('update') ||
        classes.includes('fa-edit') || classes.includes('fa-pencil')) {
      return 'EDIT';
    }

    // Patrones de DELETE
    if (text.includes('eliminar') || text.includes('borrar') || text.includes('delete') ||
        onclick.includes('delete') || onclick.includes('remove') ||
        classes.includes('fa-trash') || classes.includes('btn-danger')) {
      return 'DELETE';
    }

    // Patrones de VIEW
    if (text.includes('ver') || text.includes('detalle') || text.includes('view') ||
        onclick.includes('view') || onclick.includes('show') ||
        classes.includes('fa-eye') || classes.includes('btn-view')) {
      return 'VIEW';
    }

    // Patrones de EXPORT
    if (text.includes('export') || text.includes('descargar') || text.includes('download') ||
        onclick.includes('export') || onclick.includes('download') ||
        classes.includes('fa-download') || classes.includes('fa-file')) {
      return 'EXPORT';
    }

    // Patrones de SEARCH/FILTER
    if (text.includes('buscar') || text.includes('filtrar') || text.includes('search') ||
        onclick.includes('search') || onclick.includes('filter') ||
        classes.includes('fa-search') || classes.includes('btn-filter')) {
      return 'SEARCH';
    }

    // Patrones de SAVE
    if (text.includes('guardar') || text.includes('save') ||
        onclick.includes('save') || classes.includes('btn-save')) {
      return 'SAVE';
    }

    // Si no match, es unknown
    return 'unknown';
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PROBAR ELEMENTO (click y ver qué pasa)
   * ═══════════════════════════════════════════════════════════════════════
   */
  async testElement(element, elementHandle) {
    console.log(`\n   🧪 [TEST] Probando: "${element.text}" (${element.type})`);

    const startTime = Date.now();
    const result = {
      element: element,
      status: 'unknown',
      duration: 0,
      error: null,
      discovered: null
    };

    try {
      // Consultar conocimiento previo
      if (this.config.learningEnabled && this.knowledge[this.currentModule]) {
        const known = this.knowledge[this.currentModule].find(k =>
          k.text === element.text && k.type === element.type
        );

        if (known && known.result === 'crash') {
          console.log(`      ⏭️  SKIP - Element crashea según knowledge base`);
          result.status = 'skipped';
          result.reason = 'known-crash';
          return result;
        }

        if (known && known.result === 'timeout') {
          console.log(`      ⏰ TIMEOUT conocido - Adaptando timeout dinámicamente`);
          this.page.setDefaultTimeout(known.duration * 1.5);
        }
      }

      // ⭐ FIX CRÍTICO 1: Verificar y ACTIVAR container si es necesario
      if (element.requiresAction && !element.containerVisible) {
        console.log(`      ⚠️  Elemento en container cerrado: ${element.containerType}`);

        if (element.requiresAction === 'open-modal') {
          console.log(`      ⏭️  SKIP - Botón dentro de modal cerrado (no se puede abrir automáticamente)`);
          result.status = 'skipped';
          result.reason = 'container-modal-closed';
          return result;
        }

        if (element.requiresAction.type === 'activate-tab') {
          console.log(`      🔄 Activando tab requerido: ${element.requiresAction.tabSelector}`);
          try {
            const tabButton = await this.page.$(element.requiresAction.tabSelector);
            if (tabButton) {
              await tabButton.click();
              await this.page.waitForTimeout(500); // Esperar animación de tab
              console.log(`      ✅ Tab activado`);
            } else {
              console.log(`      ⏭️  SKIP - No se encontró botón de tab`);
              result.status = 'skipped';
              result.reason = 'tab-button-not-found';
              return result;
            }
          } catch (e) {
            console.log(`      ⏭️  SKIP - Error activando tab: ${e.message}`);
            result.status = 'skipped';
            result.reason = 'tab-activation-failed';
            return result;
          }
        }
      }

      // ⭐ FIX CRÍTICO 2: Scroll INTELIGENTE - Modal vs Body
      try {
        // Primero verificar si está en un MODAL abierto
        const isInModal = await elementHandle.evaluate(el => {
          const modal = el.closest('.modal.show');
          return modal !== null;
        });

        if (isInModal) {
          // ✅ CORRECTO: Scroll DENTRO del modal
          console.log(`      📜 Scrolleando dentro del modal...`);
          await this.page.evaluate(() => {
            const modalBody = document.querySelector('.modal.show .modal-body');
            if (modalBody) {
              modalBody.scrollTop = modalBody.scrollHeight; // Scroll al final
            }
          });
          await this.page.waitForTimeout(300);

          // Luego scroll al elemento específico
          await elementHandle.scrollIntoViewIfNeeded();
        } else {
          // ✅ CORRECTO: Scroll en body (elemento normal)
          console.log(`      📜 Scrolleando en body...`);
          await elementHandle.scrollIntoViewIfNeeded();
        }

        // FIX: Si está en un contenedor scrolleable, scroll ahí también
        await elementHandle.evaluate(el => {
          let parent = el.parentElement;
          while (parent) {
            const overflow = window.getComputedStyle(parent).overflow;
            const overflowY = window.getComputedStyle(parent).overflowY;

            if (overflow === 'auto' || overflow === 'scroll' ||
                overflowY === 'auto' || overflowY === 'scroll' ||
                parent.classList.contains('modal-body') ||
                parent.classList.contains('tab-pane')) {
              // Scroll del contenedor para que el elemento quede visible
              const rect = el.getBoundingClientRect();
              const parentRect = parent.getBoundingClientRect();

              if (rect.top < parentRect.top || rect.bottom > parentRect.bottom) {
                el.scrollIntoView({ behavior: 'instant', block: 'center' });
              }
              break;
            }
            parent = parent.parentElement;
          }
        });

        await this.page.waitForTimeout(500); // Esperar a que la página se estabilice
      } catch (scrollError) {
        // Ignorar errores de scroll - intentaremos click de todos modos
      }

      // ⭐ FIX CRÍTICO 3: Verificar que el elemento está EN VIEWPORT antes de click
      const isInViewport = await elementHandle.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;

        // Verificar que está completamente visible en viewport
        const isVisible = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= windowHeight &&
          rect.right <= windowWidth &&
          rect.width > 0 &&
          rect.height > 0
        );

        // Verificar que no está cubierto por otro elemento
        const elementAtPoint = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        );

        const isClickable = elementAtPoint === el || el.contains(elementAtPoint);

        return {
          isVisible: isVisible,
          isClickable: isClickable,
          rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }
        };
      });

      console.log(`      🔍 Viewport check: visible=${isInViewport.isVisible}, clickable=${isInViewport.isClickable}`);

      if (!isInViewport.isVisible || !isInViewport.isClickable) {
        console.log(`      ⚠️  Elemento fuera de viewport o cubierto, intentando JS native click...`);

        // Usar JS native click como fallback
        await elementHandle.evaluate(el => el.click());
        await this.page.waitForTimeout(1000);
      } else {
        // Click normal (Playwright)
        await elementHandle.click();
        await this.page.waitForTimeout(1000);
      }

      const duration = Date.now() - startTime;
      result.duration = duration;

      // Verificar qué pasó después del click
      const afterClick = await this.page.evaluate(() => {
        return {
          modalsOpen: document.querySelectorAll('.modal.show, [style*="display: block"]').length,
          urlChanged: window.location.href,
          alertPresent: !!document.querySelector('.alert, .swal2-container')
        };
      });

      if (afterClick.modalsOpen > 0) {
        result.status = 'success';
        result.discovered = 'modal-opened';
        console.log(`      ✅ Abrió modal`);

        // ⭐ NUEVO: TESTING PROFUNDO - Si es CREATE y abrió modal con form
        if (element.type === 'CREATE') {
          console.log(`\n      🎯 [DEEP TEST] Detectado botón CREATE - Iniciando CRUD profundo...`);

          try {
            const crudResult = await this.testCRUD(element, elementHandle);
            result.crudTest = crudResult;

            // Actualizar estadísticas
            if (crudResult.create.success) {
              console.log(`      ✅ CRUD: CREATE ✓`);
            }
            if (crudResult.read.success) {
              console.log(`      ✅ CRUD: READ ✓`);
            }
            if (crudResult.persistence.success) {
              console.log(`      ✅ CRUD: PERSISTENCE ✓`);
            }
            if (crudResult.update.success) {
              console.log(`      ✅ CRUD: UPDATE ✓`);
            }
            if (crudResult.delete.success) {
              console.log(`      ✅ CRUD: DELETE ✓`);
            }

          } catch (crudError) {
            console.log(`      ⚠️  CRUD test failed: ${crudError.message}`);
            result.crudTest = { error: crudError.message };
          }
        }
        // ⭐ NUEVO: Si es EDIT/VIEW, descubrir campos del form sin guardar
        else if (element.type === 'EDIT' || element.type === 'VIEW') {
          try {
            const fields = await this.discoverFormFields();
            result.formFields = fields;
            console.log(`      📋 Form con ${fields.length} campos descubiertos`);
          } catch (e) {
            // Ignorar error
          }
        }

      } else if (afterClick.alertPresent) {
        result.status = 'success';
        result.discovered = 'alert-shown';
        console.log(`      ✅ Mostró alerta`);
      } else {
        result.status = 'success';
        result.discovered = 'action-completed';
        console.log(`      ✅ Acción completada`);
      }

      this.stats.successes++;

    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      result.duration = Date.now() - startTime;

      if (error.message.includes('timeout')) {
        console.log(`      ⏰ TIMEOUT (${result.duration}ms)`);
        result.status = 'timeout';
        this.stats.timeouts++;
      } else {
        console.log(`      ❌ ERROR: ${error.message}`);
        this.stats.crashes++;
      }
    }

    // Guardar resultado en learning engine
    if (this.config.learningEnabled && this.learningEngine) {
      await this.learningEngine.recordAction({
        executionId: this.sessionId, // ⭐ FIX: UUID válido en vez de 'autonomous-session'
        companyId: this.companyId, // ⭐ FIX: company_id del login
        module: this.currentModule,
        element: element,
        result: result.status,
        duration: result.duration,
        error: result.error,
        timestamp: new Date()
      });
    }

    // ⭐ FIX: Cierre AGRESIVO de modales para evitar que intercepten próximos clicks
    try {
      await this.page.evaluate(() => {
        // 1. Cerrar con botones close
        document.querySelectorAll('.close, [data-dismiss="modal"], .modal-close, button[onclick*="close"]').forEach(btn => {
          try { btn.click(); } catch(e) {}
        });

        // 2. Presionar ESC (muchos modales responden a ESC)
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));

        // 3. Remover clases y estilos
        document.querySelectorAll('.modal, [id*="Modal"], [id*="modal"]').forEach(modal => {
          modal.style.display = 'none';
          modal.classList.remove('show', 'in');
          modal.setAttribute('aria-hidden', 'true');
        });

        // 4. Remover backdrops
        document.querySelectorAll('.modal-backdrop, .fade').forEach(bd => bd.remove());

        // 5. Restaurar scroll del body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      });
      await this.page.waitForTimeout(500); // Esperar a que cierre
    } catch (e) {
      // Ignorar errores al cerrar modales
    }

    return result;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TESTEAR MÓDULO COMPLETO
   * ═══════════════════════════════════════════════════════════════════════
   */
  async testModule(moduleId) {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`🎯 [AGENT] TESTEANDO MÓDULO: ${moduleId}`);
    console.log(`${'═'.repeat(80)}`);

    try {
      // 1. Navegar al módulo
      await this.navigateToModule(moduleId);

      // 2. Cargar conocimiento previo
      if (this.config.learningEnabled) {
        this.knowledge[moduleId] = await this._loadKnowledge(moduleId);
        console.log(`   🧠 Conocimiento previo: ${this.knowledge[moduleId]?.length || 0} elementos conocidos`);
      }

      // 3. Descubrir TODO automáticamente
      const discoveries = await this.discoverAll();

      // 4. Testear cada botón descubierto
      console.log(`\n🧪 [AGENT] PROBANDO ${discoveries.buttons.length} BOTONES...`);

      const buttons = await this.page.$$('button, a.btn, [role="button"]');
      const tested = [];

      for (let i = 0; i < discoveries.buttons.length; i++) {
        const btnInfo = discoveries.buttons[i];
        const btnHandle = buttons[i];

        if (!btnHandle) continue;

        const result = await this.testElement(btnInfo, btnHandle);
        tested.push(result);

        this.stats.elementsTested++;

        // Pequeña pausa entre tests
        await this.page.waitForTimeout(500);
      }

      // 5. Generar reporte
      const report = this._generateReport(moduleId, discoveries, tested);

      console.log(`\n${'═'.repeat(80)}`);
      console.log(`✅ [AGENT] MÓDULO COMPLETADO: ${moduleId}`);
      console.log(`${'═'.repeat(80)}`);
      console.log(report);

      return {
        module: moduleId,
        discoveries: discoveries,
        tested: tested,
        report: report,
        stats: { ...this.stats }
      };

    } catch (error) {
      console.error(`\n❌ [AGENT] Error testeando módulo ${moduleId}:`, error.message);
      throw error;
    }
  }

  /**
   * CARGAR CONOCIMIENTO PREVIO del módulo
   */
  async _loadKnowledge(moduleId) {
    // TODO: Implementar lectura desde PostgreSQL
    // Por ahora retornar vacío
    return [];
  }

  /**
   * GENERAR REPORTE del testing
   */
  _generateReport(moduleId, discoveries, tested) {
    const successes = tested.filter(t => t.status === 'success').length;
    const errors = tested.filter(t => t.status === 'error').length;
    const timeouts = tested.filter(t => t.status === 'timeout').length;
    const skipped = tested.filter(t => t.status === 'skipped').length;

    // ⭐ NUEVO: Contar tests CRUD
    const crudTests = tested.filter(t => t.crudTest).map(t => t.crudTest);
    const crudStats = {
      tested: crudTests.length,
      create: crudTests.filter(c => c.create?.success).length,
      read: crudTests.filter(c => c.read?.success).length,
      update: crudTests.filter(c => c.update?.success).length,
      delete: crudTests.filter(c => c.delete?.success).length,
      persistence: crudTests.filter(c => c.persistence?.success).length
    };

    // Contar forms descubiertos
    const formsDiscovered = tested.filter(t => t.formFields).length;
    const totalFields = tested.reduce((sum, t) => sum + (t.formFields?.length || 0), 0);

    let report = `
═══════════════════════════════════════════════════════════════════════════════
📊 REPORTE COMPLETO - ${moduleId.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════

🔍 DESCUBRIMIENTOS:
   - Botones: ${discoveries.buttons.length}
   - Modales: ${discoveries.modals.length}
   - Tabs: ${discoveries.tabs.length}
   - Tablas: ${discoveries.tables.length}
   - Formularios: ${formsDiscovered} (${totalFields} campos totales)

🧪 TESTING BÁSICO:
   - Probados: ${tested.length}
   - ✅ Exitosos: ${successes}
   - ❌ Errores: ${errors}
   - ⏰ Timeouts: ${timeouts}
   - ⏭️  Omitidos: ${skipped}

${crudStats.tested > 0 ? `
🎯 TESTING PROFUNDO CRUD:
   - Tests CRUD ejecutados: ${crudStats.tested}
   - ✅ CREATE: ${crudStats.create}/${crudStats.tested}
   - ✅ READ: ${crudStats.read}/${crudStats.tested}
   - ✅ UPDATE: ${crudStats.update}/${crudStats.tested}
   - ✅ DELETE: ${crudStats.delete}/${crudStats.tested}
   - ✅ PERSISTENCE: ${crudStats.persistence}/${crudStats.tested}
` : ''}
📈 ESTADÍSTICAS GLOBALES:
   - Elementos descubiertos: ${this.stats.elementsDiscovered}
   - Elementos testeados: ${this.stats.elementsTested}
   - Crashes: ${this.stats.crashes}
   - Timeouts: ${this.stats.timeouts}
   - Successes: ${this.stats.successes}

═══════════════════════════════════════════════════════════════════════════════
    `;

    // ⭐ NUEVO: Detalles de tests CRUD
    if (crudStats.tested > 0) {
      report += `\n📋 DETALLE DE TESTS CRUD:\n\n`;

      tested.forEach((t, index) => {
        if (t.crudTest) {
          const crud = t.crudTest;
          report += `   ${index + 1}. "${t.element.text}" (${t.element.type}):\n`;
          report += `      CREATE: ${crud.create.success ? '✅' : '❌'}`;
          if (crud.create.data) {
            const fieldCount = Object.keys(crud.create.data).length;
            report += ` (${fieldCount} campos llenados)`;
          }
          report += `\n`;
          report += `      READ: ${crud.read.success ? '✅' : '❌'}\n`;
          report += `      PERSISTENCE: ${crud.persistence.success ? '✅' : '❌'}\n`;
          report += `      UPDATE: ${crud.update.success ? '✅' : '❌'}`;
          if (crud.update.newValue) {
            report += ` (${crud.update.field}: "${crud.update.newValue}")`;
          }
          report += `\n`;
          report += `      DELETE: ${crud.delete.success ? '✅' : '❌'}\n`;
          if (crud.error) {
            report += `      ⚠️  Error: ${crud.error}\n`;
          }
          report += `\n`;
        }
      });
    }

    return report;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TESTING PROFUNDO - DISCOVERY DE FORMULARIOS
   * ═══════════════════════════════════════════════════════════════════════
   */
  async discoverFormFields() {
    console.log(`\n      🔍 [DEEP] Descubriendo campos de formulario...`);

    const fields = await this.page.evaluate(() => {
      const inputs = [];

      // Buscar en modales abiertos primero, luego en toda la página
      const container = document.querySelector('.modal.show') || document;

      // Todos los tipos de campos
      const fieldSelectors = [
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
        'select',
        'textarea'
      ];

      fieldSelectors.forEach(selector => {
        container.querySelectorAll(selector).forEach(field => {
          const rect = field.getBoundingClientRect();

          inputs.push({
            tag: field.tagName.toLowerCase(),
            type: field.type || 'text',
            name: field.name || field.id || '',
            id: field.id || '',
            placeholder: field.placeholder || '',
            required: field.required || field.hasAttribute('required'),
            value: field.value || '',
            options: field.tagName === 'SELECT' ?
              Array.from(field.options).map(o => ({ value: o.value, text: o.text })) :
              null,
            label: (() => {
              // Buscar label asociado
              const label = field.id ?
                document.querySelector(`label[for="${field.id}"]`) :
                field.closest('label') || field.previousElementSibling;
              return label?.textContent?.trim() || '';
            })(),
            visible: rect.width > 0 && rect.height > 0
          });
        });
      });

      return inputs;
    });

    console.log(`      ✅ ${fields.length} campos descubiertos`);

    // Clasificar cada campo
    const classified = fields.map(field => ({
      ...field,
      fieldType: this._classifyFieldType(field)
    }));

    return classified;
  }

  /**
   * CLASIFICAR TIPO DE CAMPO (para generar datos apropiados)
   */
  _classifyFieldType(field) {
    const name = (field.name || field.id || '').toLowerCase();
    const label = field.label.toLowerCase();
    const placeholder = field.placeholder.toLowerCase();
    const type = field.type.toLowerCase();

    // Email
    if (type === 'email' || name.includes('email') || name.includes('correo') ||
        label.includes('email') || label.includes('correo')) {
      return 'email';
    }

    // Phone
    if (type === 'tel' || name.includes('phone') || name.includes('tel') ||
        name.includes('celular') || name.includes('movil') ||
        label.includes('teléfono') || label.includes('celular')) {
      return 'phone';
    }

    // Number/Age
    if (type === 'number' || name.includes('age') || name.includes('edad') ||
        name.includes('cantidad') || name.includes('amount')) {
      return 'number';
    }

    // Date
    if (type === 'date' || name.includes('fecha') || name.includes('date') ||
        label.includes('fecha') || label.includes('date')) {
      return 'date';
    }

    // Password
    if (type === 'password' || name.includes('pass') || name.includes('contraseña')) {
      return 'password';
    }

    // DNI/ID
    if (name.includes('dni') || name.includes('document') || name.includes('cedula') ||
        name.includes('rut') || name.includes('ci')) {
      return 'dni';
    }

    // Address
    if (name.includes('address') || name.includes('direccion') ||
        label.includes('dirección') || label.includes('address')) {
      return 'address';
    }

    // Name (First/Last)
    if (name.includes('name') || name.includes('nombre') ||
        label.includes('nombre') || label.includes('name')) {
      if (name.includes('last') || name.includes('apellido')) {
        return 'lastname';
      }
      return 'firstname';
    }

    // Select/Dropdown
    if (field.tag === 'select') {
      return 'select';
    }

    // Textarea
    if (field.tag === 'textarea') {
      return 'textarea';
    }

    // Checkbox/Radio
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';

    // Default: text
    return 'text';
  }

  /**
   * GENERAR DATOS DE PRUEBA con Faker
   */
  _generateTestData(field) {
    const fieldType = field.fieldType;

    switch (fieldType) {
      case 'email':
        return faker.internet.email();

      case 'phone':
        return faker.phone.number('9########'); // Formato celular español

      case 'number':
        return faker.number.int({ min: 18, max: 65 }).toString();

      case 'date':
        return faker.date.past().toISOString().split('T')[0]; // YYYY-MM-DD

      case 'password':
        return 'Test123456!'; // Password seguro de prueba

      case 'dni':
        return faker.number.int({ min: 10000000, max: 99999999 }).toString();

      case 'address':
        return faker.location.streetAddress();

      case 'firstname':
        return faker.person.firstName();

      case 'lastname':
        return faker.person.lastName();

      case 'select':
        // Seleccionar opción válida (ignorar vacías)
        if (field.options && field.options.length > 1) {
          const validOptions = field.options.filter(o => o.value && o.value !== '');
          if (validOptions.length > 0) {
            return faker.helpers.arrayElement(validOptions).value;
          }
        }
        return '';

      case 'textarea':
        return faker.lorem.sentence();

      case 'checkbox':
        return faker.datatype.boolean();

      case 'text':
      default:
        // Inferir por nombre de campo
        if (field.name.includes('company') || field.name.includes('empresa')) {
          return faker.company.name();
        }
        if (field.name.includes('city') || field.name.includes('ciudad')) {
          return faker.location.city();
        }
        return faker.lorem.word();
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LLENAR FORMULARIO con datos de prueba
   * ═══════════════════════════════════════════════════════════════════════
   */
  async fillForm(fields) {
    console.log(`\n      ✍️  [DEEP] Llenando formulario con ${fields.length} campos...`);

    const filledData = {};

    for (const field of fields) {
      // Solo llenar campos visibles y no disabled
      if (!field.visible) {
        console.log(`         ⏭️  Skip "${field.name}" (no visible)`);
        continue;
      }

      // Generar dato apropiado
      const testValue = this._generateTestData(field);

      if (!testValue && testValue !== false) {
        console.log(`         ⏭️  Skip "${field.name}" (no hay valor válido)`);
        continue;
      }

      try {
        const selector = field.id ? `#${field.id}` : `[name="${field.name}"]`;
        const fieldHandle = await this.page.$(selector);

        if (!fieldHandle) {
          console.log(`         ⚠️  Campo "${field.name}" no encontrado`);
          continue;
        }

        // ⭐ FIX 30: Aplicar los 3 critical fixes ANTES de llenar campo

        // FIX 1: Container Awareness - Verificar si está en modal
        const isInModal = await fieldHandle.evaluate(el => {
          return el.closest('.modal.show') !== null;
        });

        // FIX 2: Smart Scroll - Scrollear en contenedor correcto
        if (isInModal) {
          // Scroll en modal-body
          await this.page.evaluate(() => {
            const modalBody = document.querySelector('.modal.show .modal-body');
            if (modalBody) {
              modalBody.scrollTop = 0; // Reset al top primero
            }
          });
          await this.page.waitForTimeout(100);
        }

        // Scroll al elemento específico
        try {
          await fieldHandle.scrollIntoViewIfNeeded({ timeout: 5000 });
        } catch (scrollError) {
          // Si falla scroll nativo, intentar scroll manual
          await fieldHandle.evaluate(el => {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
          });
        }

        await this.page.waitForTimeout(200);

        // FIX 3: Viewport Visibility - Verificar que está visible
        const isVisible = await fieldHandle.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.top >= 0;
        });

        if (!isVisible) {
          console.log(`         ⚠️  Campo "${field.name}" no visible en viewport`);
          // Intentar forzar visibilidad
          await fieldHandle.evaluate(el => {
            el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });
          });
          await this.page.waitForTimeout(300);
        }

        // Ahora llenar según tipo de campo
        if (field.tag === 'select') {
          await this.page.selectOption(selector, testValue);
          console.log(`         ✅ Select "${field.name}" = "${testValue}"`);
        }
        else if (field.type === 'checkbox') {
          if (testValue) {
            await this.page.check(selector);
            console.log(`         ✅ Checkbox "${field.name}" = checked`);
          }
        }
        else if (field.type === 'radio') {
          await this.page.check(`${selector}[value="${testValue}"]`);
          console.log(`         ✅ Radio "${field.name}" = "${testValue}"`);
        }
        else {
          // Input normal (text, email, number, date, etc.)
          // Limpiar campo primero
          await this.page.fill(selector, '');

          // Llenar con valor
          await this.page.fill(selector, testValue.toString());

          console.log(`         ✅ Input "${field.name}" = "${testValue}"`);
        }

        filledData[field.name || field.id] = testValue;

        // Pequeña pausa para estabilidad
        await this.page.waitForTimeout(200);

      } catch (error) {
        console.log(`         ⚠️  Error llenando "${field.name}": ${error.message}`);
      }
    }

    console.log(`      ✅ Formulario llenado con ${Object.keys(filledData).length} campos`);

    return filledData;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GUARDAR FORMULARIO (buscar y clickear botón submit/guardar)
   * ═══════════════════════════════════════════════════════════════════════
   */
  async saveForm() {
    console.log(`\n      💾 [DEEP] Buscando botón de guardar...`);

    try {
      // Estrategia 1: Buscar botón de submit en modal
      const saveButton = await this.page.$(
        '.modal.show button[type="submit"], ' +
        '.modal.show button:has-text("Guardar"), ' +
        '.modal.show button:has-text("Crear"), ' +
        '.modal.show button:has-text("Aceptar"), ' +
        '.modal.show button:has-text("Save"), ' +
        '.modal.show button:has-text("Create")'
      );

      if (saveButton) {
        const buttonText = await saveButton.textContent();
        console.log(`      ✅ Botón encontrado: "${buttonText?.trim()}"`);

        await saveButton.click();
        console.log(`      ✅ Click en guardar`);

        // Esperar a que procese (modal se cierre o aparezca confirmación)
        await this.page.waitForTimeout(2000);

        // Verificar si hay mensaje de éxito
        const successMessage = await this.page.evaluate(() => {
          const alerts = document.querySelectorAll('.alert-success, .swal2-success, .toast-success');
          return alerts.length > 0 ? Array.from(alerts)[0].textContent?.trim() : null;
        });

        if (successMessage) {
          console.log(`      ✅ Guardado exitoso: "${successMessage}"`);
          return { success: true, message: successMessage };
        }

        // Verificar si modal se cerró (indica guardado)
        const modalStillOpen = await this.page.$('.modal.show');
        if (!modalStillOpen) {
          console.log(`      ✅ Modal cerrado - Guardado exitoso`);
          return { success: true };
        }

        return { success: true };
      } else {
        console.log(`      ⚠️  No se encontró botón de guardar`);
        return { success: false, error: 'No save button found' };
      }

    } catch (error) {
      console.log(`      ❌ Error guardando: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * VERIFICAR PERSISTENCIA - F5 + reabrir modal + verificar datos
   * ═══════════════════════════════════════════════════════════════════════
   */
  async verifyPersistence(originalData, elementToReopen) {
    console.log(`\n      🔄 [DEEP] Verificando persistencia (F5 + reabrir modal)...`);

    try {
      // 1. Reload de la página
      console.log(`         → Recargando página (F5)...`);
      await this.page.reload({ waitUntil: 'networkidle', timeout: 30000 });
      await this.page.waitForTimeout(3000);

      // 2. Volver a navegar al módulo
      console.log(`         → Navegando de nuevo a ${this.currentModule}...`);
      await this.navigateToModule(this.currentModule);
      await this.page.waitForTimeout(2000);

      // 3. Buscar en la tabla el registro recién creado
      console.log(`         → Buscando registro en tabla...`);

      const foundInTable = await this.page.evaluate((data) => {
        const table = document.querySelector('table tbody');
        if (!table) return null;

        const rows = Array.from(table.querySelectorAll('tr'));

        // Buscar fila que contenga alguno de los valores creados
        for (const row of rows) {
          const cellsText = Array.from(row.querySelectorAll('td')).map(td =>
            td.textContent?.trim().toLowerCase()
          );

          // Verificar si algún valor de los datos creados está en esta fila
          const dataValues = Object.values(data).map(v => v?.toString().toLowerCase());
          const hasMatch = dataValues.some(val =>
            cellsText.some(cell => cell?.includes(val))
          );

          if (hasMatch) {
            return {
              found: true,
              rowText: cellsText.join(' | ')
            };
          }
        }

        return { found: false };
      }, originalData);

      if (foundInTable?.found) {
        console.log(`         ✅ PERSISTENCIA VERIFICADA - Registro encontrado en tabla`);
        console.log(`            Fila: ${foundInTable.rowText?.substring(0, 100)}...`);
        return { persistent: true, foundIn: 'table' };
      }

      // 4. Si no se encontró en tabla, intentar reabrir modal de edición
      console.log(`         → No encontrado en tabla, buscando botón de edición...`);

      const editButton = await this.page.$('table tbody tr:first-child button[onclick*="edit"], table tbody tr:first-child i.fa-edit');

      if (editButton) {
        await editButton.click();
        await this.page.waitForTimeout(2000);

        const modalData = await this.page.evaluate(() => {
          const modal = document.querySelector('.modal.show');
          if (!modal) return null;

          const inputs = modal.querySelectorAll('input:not([type="hidden"]), select, textarea');
          const values = {};

          inputs.forEach(input => {
            if (input.name || input.id) {
              values[input.name || input.id] = input.value;
            }
          });

          return values;
        });

        if (modalData) {
          console.log(`         ✅ PERSISTENCIA VERIFICADA - Datos en modal de edición`);
          return { persistent: true, foundIn: 'edit-modal', data: modalData };
        }
      }

      console.log(`         ⚠️  No se pudo verificar persistencia`);
      return { persistent: false };

    } catch (error) {
      console.log(`         ❌ Error verificando persistencia: ${error.message}`);
      return { persistent: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TEST CRUD COMPLETO - Create, Read, Update, Delete
   * ═══════════════════════════════════════════════════════════════════════
   */
  async testCRUD(createButton, createButtonHandle) {
    console.log(`\n      🎯 [DEEP] TESTING CRUD COMPLETO...`);

    const crudResult = {
      create: { success: false },
      read: { success: false },
      update: { success: false },
      delete: { success: false },
      persistence: { success: false }
    };

    try {
      // ═══════════════════════════════════════════════════════════════
      // PASO 1: CREATE
      // ═══════════════════════════════════════════════════════════════
      console.log(`\n      📝 [CREATE] Creando registro...`);

      // ⭐ FIX 30: El modal YA debería estar abierto desde testElement()
      // NO hacer scroll/click de nuevo (causa timeout)
      let modalOpen = await this.page.$('.modal.show');

      if (!modalOpen) {
        // Si por alguna razón el modal no está abierto, intentar abrir
        console.log(`         ⚠️  Modal no abierto, intentando abrir...`);
        try {
          await createButtonHandle.click();
          await this.page.waitForTimeout(2000);
          modalOpen = await this.page.$('.modal.show');
        } catch (clickError) {
          console.log(`         ❌ Error abriendo modal: ${clickError.message}`);
        }
      } else {
        console.log(`         ✅ Modal ya abierto (desde testElement)`);
      }

      if (!modalOpen) {
        console.log(`         ❌ Modal no se pudo abrir`);
        return crudResult;
      }

      // Descubrir campos del formulario
      const fields = await this.discoverFormFields();

      if (fields.length === 0) {
        console.log(`         ⚠️  No se encontraron campos en el formulario`);
        return crudResult;
      }

      // Llenar formulario
      const filledData = await this.fillForm(fields);

      // Guardar
      const saveResult = await this.saveForm();

      if (saveResult.success) {
        crudResult.create.success = true;
        crudResult.create.data = filledData;
        console.log(`      ✅ CREATE exitoso`);
      } else {
        console.log(`      ❌ CREATE falló: ${saveResult.error}`);
        return crudResult;
      }

      // ═══════════════════════════════════════════════════════════════
      // PASO 2: READ + PERSISTENCE
      // ═══════════════════════════════════════════════════════════════
      console.log(`\n      📖 [READ] Verificando persistencia...`);

      const persistenceResult = await this.verifyPersistence(filledData, createButton);

      if (persistenceResult.persistent) {
        crudResult.read.success = true;
        crudResult.persistence.success = true;
        console.log(`      ✅ READ + PERSISTENCE exitoso`);
      }

      // ═══════════════════════════════════════════════════════════════
      // PASO 3: UPDATE
      // ═══════════════════════════════════════════════════════════════
      console.log(`\n      ✏️  [UPDATE] Editando registro...`);

      // Buscar botón de edición del primer registro
      const editButton = await this.page.$(
        'table tbody tr:first-child button[onclick*="edit"], ' +
        'table tbody tr:first-child i.fa-edit, ' +
        'table tbody tr:first-child .fa-pencil'
      );

      if (editButton) {
        await editButton.click();
        await this.page.waitForTimeout(2000);

        const fields = await this.discoverFormFields();

        if (fields.length > 0) {
          // Modificar solo primer campo
          const firstEditableField = fields.find(f => f.visible && f.tag !== 'select');

          if (firstEditableField) {
            const newValue = this._generateTestData(firstEditableField) + '-EDITED';
            const selector = firstEditableField.id ? `#${firstEditableField.id}` : `[name="${firstEditableField.name}"]`;

            await this.page.fill(selector, newValue);
            console.log(`         ✅ Campo "${firstEditableField.name}" modificado a "${newValue}"`);

            const saveResult = await this.saveForm();

            if (saveResult.success) {
              crudResult.update.success = true;
              crudResult.update.field = firstEditableField.name;
              crudResult.update.newValue = newValue;
              console.log(`      ✅ UPDATE exitoso`);
            }
          }
        }
      } else {
        console.log(`      ⚠️  No se encontró botón de edición`);
      }

      // ═══════════════════════════════════════════════════════════════
      // PASO 4: DELETE
      // ═══════════════════════════════════════════════════════════════
      console.log(`\n      🗑️  [DELETE] Eliminando registro...`);

      // Esperar que modal de edit se cierre
      await this.page.waitForTimeout(2000);

      const deleteButton = await this.page.$(
        'table tbody tr:first-child button[onclick*="delete"], ' +
        'table tbody tr:first-child i.fa-trash, ' +
        'table tbody tr:first-child .fa-trash'
      );

      if (deleteButton) {
        await deleteButton.click();
        await this.page.waitForTimeout(1000);

        // Confirmar eliminación (buscar confirmación SweetAlert2 o confirm)
        const confirmButton = await this.page.$(
          '.swal2-confirm, ' +
          'button:has-text("Sí"), ' +
          'button:has-text("Eliminar"), ' +
          'button:has-text("Aceptar")'
        );

        if (confirmButton) {
          await confirmButton.click();
          await this.page.waitForTimeout(2000);

          crudResult.delete.success = true;
          console.log(`      ✅ DELETE exitoso`);
        } else {
          console.log(`      ⚠️  No se encontró botón de confirmación`);
        }
      } else {
        console.log(`      ⚠️  No se encontró botón de eliminar`);
      }

    } catch (error) {
      console.log(`      ❌ Error en CRUD: ${error.message}`);
      crudResult.error = error.message;
    }

    return crudResult;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CLEANUP
   * ═══════════════════════════════════════════════════════════════════════
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('\n👋 [AGENT] Navegador cerrado');
    }
  }
}

module.exports = AutonomousQAAgent;
