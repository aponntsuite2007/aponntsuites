/**
 * ============================================================================
 * UI DEEP CRAWLER - Descubrimiento Profundo de Elementos UI
 * ============================================================================
 *
 * Propósito: Descubrir CADA elemento del UI automáticamente
 * - Navega por todas las pantallas
 * - Descubre todos los botones, inputs, selects, modales
 * - Registra qué hace cada elemento
 * - Mapea flujos de navegación
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class UIDeepCrawler {
    constructor(options = {}) {
        this.config = {
            baseUrl: options.baseUrl || 'http://localhost:9998',
            credentials: options.credentials || {
                companySlug: 'isi',
                identifier: 'admin',
                password: 'admin123'
            },
            outputDir: options.outputDir || path.join(__dirname, '../knowledge/ui'),
            screenshotDir: options.screenshotDir || path.join(__dirname, '../knowledge/screenshots'),
            headless: options.headless !== false, // Default true for production
            slowMo: options.slowMo || 50,
            timeout: options.timeout || 30000,
            ...options
        };

        this.browser = null;
        this.page = null;
        this.authToken = null;
        this.discoveredElements = new Map(); // module -> elements
        this.navigationMap = new Map(); // screen -> [reachable screens]
        this.stats = {
            pagesVisited: 0,
            elementsDiscovered: 0,
            modalsFound: 0,
            formsAnalyzed: 0,
            errorsEncountered: 0
        };

        // Ensure output directories exist
        this.ensureDirectories();
    }

    ensureDirectories() {
        [this.config.outputDir, this.config.screenshotDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    /**
     * ========================================================================
     * INICIALIZACIÓN
     * ========================================================================
     */
    async initialize() {
        console.log('\n' + '═'.repeat(60));
        console.log('🔍 UI DEEP CRAWLER - Iniciando');
        console.log('═'.repeat(60));

        try {
            // Launch browser
            this.browser = await puppeteer.launch({
                headless: this.config.headless,
                slowMo: this.config.slowMo,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--window-size=1920,1080'
                ]
            });

            this.page = await this.browser.newPage();
            await this.page.setViewport({ width: 1920, height: 1080 });

            // Set default timeout
            this.page.setDefaultTimeout(this.config.timeout);

            // Listen for console messages
            this.page.on('console', msg => {
                if (msg.type() === 'error') {
                    console.log('   [Browser Error]', msg.text().substring(0, 100));
                }
            });

            console.log('✅ Browser iniciado');
            return true;

        } catch (error) {
            console.error('❌ Error iniciando browser:', error.message);
            throw error;
        }
    }

    /**
     * ========================================================================
     * AUTENTICACIÓN
     * ========================================================================
     */
    async login() {
        console.log('\n📝 Iniciando sesión...');

        try {
            await this.page.goto(`${this.config.baseUrl}/panel-empresa.html`, {
                waitUntil: 'networkidle2'
            });

            // Wait for login form to load
            await this.page.waitForSelector('#multiTenantLoginForm, #companySelect', {
                timeout: 10000
            });

            // Wait for companies to load in the select
            await this.wait(2000);

            // PASO 1: Seleccionar empresa del dropdown
            console.log('   Paso 1: Seleccionando empresa...');
            const companySelect = await this.page.$('#companySelect');
            if (companySelect) {
                // Wait for options to load
                await this.page.waitForFunction(() => {
                    const select = document.querySelector('#companySelect');
                    return select && select.options.length > 1;
                }, { timeout: 10000 });

                // Find the company option by slug
                const companyValue = await this.page.evaluate((slug) => {
                    const select = document.querySelector('#companySelect');
                    for (let opt of select.options) {
                        if (opt.value === slug || opt.textContent.toLowerCase().includes(slug.toLowerCase())) {
                            return opt.value;
                        }
                    }
                    // If not found, try to find by partial match
                    for (let opt of select.options) {
                        if (opt.value && opt.value !== '') {
                            return opt.value; // Return first valid option
                        }
                    }
                    return null;
                }, this.config.credentials.companySlug);

                if (companyValue) {
                    await this.page.select('#companySelect', companyValue);
                    await this.wait(500);
                }
            }

            // PASO 2: Ingresar usuario
            console.log('   Paso 2: Ingresando usuario...');
            await this.page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
            const userInput = await this.page.$('#userInput');
            if (userInput) {
                await userInput.click();
                await userInput.type(this.config.credentials.identifier);
                await this.wait(300);
            }

            // PASO 3: Ingresar contraseña
            console.log('   Paso 3: Ingresando contraseña...');
            await this.page.waitForSelector('#passwordInput:not([disabled])', { timeout: 5000 });
            const passInput = await this.page.$('#passwordInput');
            if (passInput) {
                await passInput.click();
                await passInput.type(this.config.credentials.password);
                await this.wait(300);
            }

            // Click login button
            console.log('   Paso 4: Enviando formulario...');
            await this.page.waitForSelector('#loginButton:not([disabled])', { timeout: 5000 });
            const loginBtn = await this.page.$('#loginButton');

            if (loginBtn) {
                await Promise.all([
                    this.page.waitForFunction(() => {
                        // Wait until login container is hidden or dashboard is visible
                        const loginContainer = document.querySelector('#loginContainer');
                        const dashboard = document.querySelector('#main-content, .dashboard, .main-panel');
                        return (loginContainer && loginContainer.style.display === 'none') || dashboard;
                    }, { timeout: 15000 }).catch(() => {}),
                    loginBtn.click()
                ]);
            }

            // Wait for dashboard to fully load
            await this.wait(3000);

            // Extract auth token from localStorage
            this.authToken = await this.page.evaluate(() => {
                return localStorage.getItem('token') || sessionStorage.getItem('token');
            });

            // Take screenshot after login
            await this.takeScreenshot('after-login');

            if (this.authToken) {
                console.log('✅ Login exitoso (token obtenido)');
                return true;
            } else {
                // Check if we're on the dashboard anyway
                const isDashboard = await this.page.evaluate(() => {
                    return document.querySelector('#main-content, .dashboard, .sidebar') !== null;
                });
                if (isDashboard) {
                    console.log('✅ Login exitoso (dashboard visible)');
                    return true;
                }
                console.log('⚠️ Login sin token, verificando estado...');
                return true; // Try to continue anyway
            }

        } catch (error) {
            console.error('❌ Error en login:', error.message);
            await this.takeScreenshot('login-error');
            return false;
        }
    }

    /**
     * ========================================================================
     * DESCUBRIMIENTO DE MÓDULOS
     * ========================================================================
     */
    async discoverModules() {
        console.log('\n📦 Descubriendo módulos disponibles...');

        try {
            // Find sidebar/menu items
            const menuItems = await this.page.$$eval(
                '.sidebar-menu a, .nav-menu a, [data-module], .menu-item, .sidebar-item',
                elements => elements.map(el => ({
                    text: el.textContent?.trim(),
                    href: el.href || el.getAttribute('data-module'),
                    id: el.id,
                    classes: el.className
                })).filter(item => item.text && item.text.length > 0)
            );

            console.log(`   Encontrados ${menuItems.length} items de menú`);

            // Also discover modules from any module buttons/cards
            const moduleCards = await this.page.$$eval(
                '[data-module-key], .module-card, .module-btn',
                elements => elements.map(el => ({
                    key: el.getAttribute('data-module-key') || el.id,
                    text: el.textContent?.trim(),
                    visible: el.offsetParent !== null
                }))
            );

            console.log(`   Encontrados ${moduleCards.length} tarjetas de módulo`);

            return { menuItems, moduleCards };

        } catch (error) {
            console.error('❌ Error descubriendo módulos:', error.message);
            return { menuItems: [], moduleCards: [] };
        }
    }

    /**
     * ========================================================================
     * CRAWL PROFUNDO DE UN MÓDULO
     * ========================================================================
     */
    async crawlModule(moduleKey) {
        console.log(`\n🔎 Crawling módulo: ${moduleKey}`);

        const moduleData = {
            key: moduleKey,
            crawledAt: new Date().toISOString(),
            screens: [],
            elements: {
                buttons: [],
                inputs: [],
                selects: [],
                tables: [],
                modals: [],
                tabs: [],
                links: []
            },
            flows: [],
            errors: []
        };

        try {
            // Navigate to module if needed
            const moduleSelector = `[data-module="${moduleKey}"], [data-module-key="${moduleKey}"], #module-${moduleKey}`;
            const moduleBtn = await this.page.$(moduleSelector);

            if (moduleBtn) {
                await moduleBtn.click();
                await this.wait(1000);
            }

            // Take initial screenshot
            await this.takeScreenshot(`module-${moduleKey}-initial`);

            // Discover all visible elements
            console.log('   📍 Descubriendo elementos visibles...');
            const visibleElements = await this.discoverVisibleElements();
            Object.assign(moduleData.elements, visibleElements);

            // Discover and explore modals
            console.log('   📍 Buscando modales...');
            const modals = await this.discoverModals(moduleKey);
            moduleData.elements.modals = modals;
            this.stats.modalsFound += modals.length;

            // Discover tabs if present
            console.log('   📍 Buscando tabs...');
            const tabs = await this.discoverTabs();
            moduleData.elements.tabs = tabs;

            // Discover forms
            console.log('   📍 Analizando formularios...');
            const forms = await this.analyzeForms();
            moduleData.forms = forms;
            this.stats.formsAnalyzed += forms.length;

            // Count total elements
            const totalElements = Object.values(moduleData.elements)
                .reduce((sum, arr) => sum + arr.length, 0);

            this.stats.elementsDiscovered += totalElements;
            console.log(`   ✅ ${totalElements} elementos descubiertos`);

            // Store discovered data
            this.discoveredElements.set(moduleKey, moduleData);

            return moduleData;

        } catch (error) {
            console.error(`   ❌ Error en módulo ${moduleKey}:`, error.message);
            this.stats.errorsEncountered++;
            moduleData.errors.push({
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            return moduleData;
        }
    }

    /**
     * ========================================================================
     * DESCUBRIMIENTO DE ELEMENTOS VISIBLES
     * ========================================================================
     */
    async discoverVisibleElements() {
        return await this.page.evaluate(() => {
            const results = {
                buttons: [],
                inputs: [],
                selects: [],
                tables: [],
                links: []
            };

            // Discover buttons
            document.querySelectorAll('button, .btn, [role="button"], input[type="submit"], input[type="button"]').forEach((btn, idx) => {
                if (btn.offsetParent !== null) { // Is visible
                    results.buttons.push({
                        index: idx,
                        text: btn.textContent?.trim() || btn.value || '',
                        id: btn.id || null,
                        classes: btn.className,
                        type: btn.type || 'button',
                        disabled: btn.disabled,
                        selector: btn.id ? `#${btn.id}` : `.${btn.className.split(' ')[0]}`,
                        position: {
                            top: btn.getBoundingClientRect().top,
                            left: btn.getBoundingClientRect().left
                        }
                    });
                }
            });

            // Discover inputs
            document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea').forEach((input, idx) => {
                if (input.offsetParent !== null) {
                    const label = document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() ||
                                  input.placeholder ||
                                  input.name;
                    results.inputs.push({
                        index: idx,
                        name: input.name || null,
                        id: input.id || null,
                        type: input.type || 'text',
                        label: label,
                        required: input.required,
                        placeholder: input.placeholder || null,
                        pattern: input.pattern || null,
                        maxLength: input.maxLength > 0 ? input.maxLength : null,
                        selector: input.id ? `#${input.id}` : `[name="${input.name}"]`
                    });
                }
            });

            // Discover selects
            document.querySelectorAll('select').forEach((select, idx) => {
                if (select.offsetParent !== null) {
                    const label = document.querySelector(`label[for="${select.id}"]`)?.textContent?.trim() ||
                                  select.name;
                    const options = Array.from(select.options).map(opt => ({
                        value: opt.value,
                        text: opt.textContent?.trim()
                    }));
                    results.selects.push({
                        index: idx,
                        name: select.name || null,
                        id: select.id || null,
                        label: label,
                        required: select.required,
                        options: options,
                        optionCount: options.length,
                        selector: select.id ? `#${select.id}` : `[name="${select.name}"]`
                    });
                }
            });

            // Discover tables
            document.querySelectorAll('table, .data-table, [role="grid"]').forEach((table, idx) => {
                if (table.offsetParent !== null) {
                    const headers = Array.from(table.querySelectorAll('th, .header-cell'))
                        .map(th => th.textContent?.trim());
                    const rowCount = table.querySelectorAll('tbody tr, .data-row').length;
                    results.tables.push({
                        index: idx,
                        id: table.id || null,
                        classes: table.className,
                        headers: headers,
                        columnCount: headers.length,
                        rowCount: rowCount,
                        selector: table.id ? `#${table.id}` : `table:nth-of-type(${idx + 1})`
                    });
                }
            });

            // Discover links
            document.querySelectorAll('a[href]').forEach((link, idx) => {
                if (link.offsetParent !== null && !link.href.includes('javascript:')) {
                    results.links.push({
                        index: idx,
                        text: link.textContent?.trim(),
                        href: link.href,
                        id: link.id || null,
                        target: link.target || null
                    });
                }
            });

            return results;
        });
    }

    /**
     * ========================================================================
     * DESCUBRIMIENTO DE MODALES
     * ========================================================================
     */
    async discoverModals(moduleKey) {
        const modals = [];

        // Find modal triggers (buttons that open modals)
        const modalTriggers = await this.page.$$eval(
            '[data-toggle="modal"], [data-bs-toggle="modal"], .modal-trigger, [onclick*="modal"], button:not(:disabled)',
            btns => btns.filter(btn => {
                const text = btn.textContent?.toLowerCase() || '';
                return text.includes('nuevo') || text.includes('crear') ||
                       text.includes('agregar') || text.includes('editar') ||
                       text.includes('add') || text.includes('new');
            }).map(btn => ({
                text: btn.textContent?.trim(),
                id: btn.id,
                classes: btn.className,
                selector: btn.id ? `#${btn.id}` : null
            }))
        );

        console.log(`   Encontrados ${modalTriggers.length} posibles triggers de modal`);

        // Try to open each modal and analyze it
        for (const trigger of modalTriggers.slice(0, 5)) { // Limit to 5 to avoid too long crawl
            try {
                const btnSelector = trigger.selector || `button:contains("${trigger.text}")`;
                const btn = await this.page.$(trigger.selector || `#${trigger.id}`);

                if (btn) {
                    await btn.click();
                    await this.wait(500);

                    // Check if modal opened
                    const modalContent = await this.analyzeOpenModal();
                    if (modalContent) {
                        modals.push({
                            trigger: trigger,
                            ...modalContent
                        });

                        // Take screenshot
                        await this.takeScreenshot(`modal-${moduleKey}-${modals.length}`);

                        // Close modal
                        await this.closeModal();
                    }
                }
            } catch (e) {
                // Modal might not have opened, continue
            }
        }

        return modals;
    }

    /**
     * ========================================================================
     * ANÁLISIS DE MODAL ABIERTO
     * ========================================================================
     */
    async analyzeOpenModal() {
        return await this.page.evaluate(() => {
            // Find visible modal
            const modal = document.querySelector('.modal.show, .modal:not(.hidden), [role="dialog"]:not([hidden]), .modal-content:visible');

            if (!modal || modal.offsetParent === null) return null;

            // Get modal title
            const title = modal.querySelector('.modal-title, .modal-header h5, .modal-header h4, h2')?.textContent?.trim();

            // Get tabs inside modal
            const tabs = Array.from(modal.querySelectorAll('.nav-tab, .tab-button, [role="tab"], .nav-link')).map(tab => ({
                text: tab.textContent?.trim(),
                id: tab.id,
                active: tab.classList.contains('active')
            }));

            // Get form fields inside modal
            const fields = [];
            modal.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(field => {
                const label = document.querySelector(`label[for="${field.id}"]`)?.textContent?.trim() ||
                              field.closest('.form-group')?.querySelector('label')?.textContent?.trim() ||
                              field.placeholder || field.name;

                fields.push({
                    name: field.name || field.id,
                    type: field.tagName.toLowerCase() === 'select' ? 'select' : (field.type || 'text'),
                    label: label,
                    required: field.required || field.classList.contains('required'),
                    validation: field.pattern || null
                });
            });

            // Get action buttons
            const actions = Array.from(modal.querySelectorAll('.modal-footer button, .modal-actions button')).map(btn => ({
                text: btn.textContent?.trim(),
                type: btn.type,
                classes: btn.className
            }));

            return {
                title: title,
                tabCount: tabs.length,
                tabs: tabs,
                fieldCount: fields.length,
                fields: fields,
                actions: actions
            };
        });
    }

    /**
     * ========================================================================
     * CERRAR MODAL
     * ========================================================================
     */
    async closeModal() {
        try {
            // Try multiple ways to close
            const closeBtn = await this.page.$('.modal .close, .modal .btn-close, [data-dismiss="modal"], [data-bs-dismiss="modal"]');
            if (closeBtn) {
                await closeBtn.click();
                await this.wait(300);
                return;
            }

            // Press Escape
            await this.page.keyboard.press('Escape');
            await this.wait(300);

        } catch (e) {
            // Ignore close errors
        }
    }

    /**
     * ========================================================================
     * DESCUBRIMIENTO DE TABS
     * ========================================================================
     */
    async discoverTabs() {
        return await this.page.evaluate(() => {
            const tabs = [];
            document.querySelectorAll('.nav-tabs .nav-link, .tab-list .tab, [role="tablist"] [role="tab"], .tabs button').forEach((tab, idx) => {
                tabs.push({
                    index: idx,
                    text: tab.textContent?.trim(),
                    id: tab.id || null,
                    active: tab.classList.contains('active'),
                    panelId: tab.getAttribute('data-target') || tab.getAttribute('href')?.replace('#', '')
                });
            });
            return tabs;
        });
    }

    /**
     * ========================================================================
     * ANÁLISIS DE FORMULARIOS
     * ========================================================================
     */
    async analyzeForms() {
        return await this.page.evaluate(() => {
            const forms = [];
            document.querySelectorAll('form').forEach((form, idx) => {
                const fields = [];
                form.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(field => {
                    fields.push({
                        name: field.name,
                        type: field.type || field.tagName.toLowerCase(),
                        required: field.required,
                        validation: {
                            pattern: field.pattern || null,
                            minLength: field.minLength > 0 ? field.minLength : null,
                            maxLength: field.maxLength > 0 ? field.maxLength : null,
                            min: field.min || null,
                            max: field.max || null
                        }
                    });
                });

                forms.push({
                    index: idx,
                    id: form.id || null,
                    action: form.action,
                    method: form.method,
                    fieldCount: fields.length,
                    fields: fields
                });
            });
            return forms;
        });
    }

    /**
     * ========================================================================
     * SCREENSHOT
     * ========================================================================
     */
    async takeScreenshot(name) {
        try {
            const filename = `${name}-${Date.now()}.png`;
            await this.page.screenshot({
                path: path.join(this.config.screenshotDir, filename),
                fullPage: true
            });
        } catch (e) {
            // Ignore screenshot errors
        }
    }

    /**
     * ========================================================================
     * CRAWL COMPLETO
     * ========================================================================
     */
    async crawlAll(modules = null) {
        console.log('\n' + '═'.repeat(60));
        console.log('🚀 INICIANDO CRAWL COMPLETO');
        console.log('═'.repeat(60));

        const startTime = Date.now();

        try {
            // Initialize browser
            await this.initialize();

            // Login
            const loggedIn = await this.login();
            if (!loggedIn) {
                throw new Error('No se pudo iniciar sesión');
            }

            // Wait for page to fully load
            await this.wait(2000);

            // Discover available modules
            const { menuItems, moduleCards } = await this.discoverModules();

            // Determine which modules to crawl
            let modulesToCrawl = modules || [
                'users', 'departments', 'attendance', 'shifts', 'kiosks',
                'vacation', 'medical', 'payroll', 'notifications'
            ];

            // Crawl each module
            for (const moduleKey of modulesToCrawl) {
                try {
                    await this.crawlModule(moduleKey);
                    this.stats.pagesVisited++;
                } catch (e) {
                    console.error(`Error crawling ${moduleKey}:`, e.message);
                }
            }

            // Save all discovered data
            await this.saveDiscoveredData();

            const duration = ((Date.now() - startTime) / 1000).toFixed(1);

            console.log('\n' + '═'.repeat(60));
            console.log('📊 RESUMEN DEL CRAWL');
            console.log('═'.repeat(60));
            console.log(`   Páginas visitadas: ${this.stats.pagesVisited}`);
            console.log(`   Elementos descubiertos: ${this.stats.elementsDiscovered}`);
            console.log(`   Modales encontrados: ${this.stats.modalsFound}`);
            console.log(`   Formularios analizados: ${this.stats.formsAnalyzed}`);
            console.log(`   Errores: ${this.stats.errorsEncountered}`);
            console.log(`   Duración: ${duration}s`);

            return {
                success: true,
                stats: this.stats,
                duration: parseFloat(duration)
            };

        } catch (error) {
            console.error('❌ Error en crawl:', error.message);
            return {
                success: false,
                error: error.message,
                stats: this.stats
            };

        } finally {
            await this.close();
        }
    }

    /**
     * ========================================================================
     * GUARDAR DATOS DESCUBIERTOS
     * ========================================================================
     */
    async saveDiscoveredData() {
        console.log('\n💾 Guardando datos descubiertos...');

        const output = {
            crawledAt: new Date().toISOString(),
            stats: this.stats,
            modules: {}
        };

        for (const [key, data] of this.discoveredElements) {
            output.modules[key] = data;
        }

        // Save to JSON file
        const outputPath = path.join(this.config.outputDir, 'ui-discovery.json');
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        console.log(`   ✅ Guardado en: ${outputPath}`);

        // Also update modules-registry.json with new UI data
        await this.updateModulesRegistry();

        return outputPath;
    }

    /**
     * ========================================================================
     * ACTUALIZAR REGISTRY CON DATOS DE UI
     * ========================================================================
     */
    async updateModulesRegistry() {
        try {
            const registryPath = path.join(__dirname, '../../auditor/registry/modules-registry.json');
            const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

            for (const [moduleKey, crawlData] of this.discoveredElements) {
                // Find module in registry
                const moduleIdx = registry.modules.findIndex(m =>
                    m.id === moduleKey || m.key === moduleKey
                );

                if (moduleIdx >= 0) {
                    // Update UI section
                    registry.modules[moduleIdx].ui = {
                        mainButtons: crawlData.elements.buttons.slice(0, 20).map(b => ({
                            text: b.text,
                            selector: b.selector,
                            type: b.type,
                            discoveredAt: crawlData.crawledAt
                        })),
                        tabs: crawlData.elements.tabs.map(t => ({
                            label: t.text,
                            id: t.id,
                            discoveredAt: crawlData.crawledAt
                        })),
                        inputs: crawlData.elements.inputs.slice(0, 30).map(i => ({
                            name: i.name,
                            type: i.type,
                            label: i.label,
                            required: i.required,
                            discoveredAt: crawlData.crawledAt
                        })),
                        modals: crawlData.elements.modals.map(m => ({
                            title: m.title,
                            tabCount: m.tabCount,
                            fieldCount: m.fieldCount,
                            discoveredAt: crawlData.crawledAt
                        })),
                        tables: crawlData.elements.tables.map(t => ({
                            id: t.id,
                            columns: t.headers,
                            discoveredAt: crawlData.crawledAt
                        }))
                    };

                    registry.modules[moduleIdx].lastCrawl = crawlData.crawledAt;
                }
            }

            // Save updated registry
            fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
            console.log('   ✅ modules-registry.json actualizado');

        } catch (error) {
            console.log('   ⚠️ No se pudo actualizar registry:', error.message);
        }
    }

    /**
     * ========================================================================
     * CERRAR BROWSER
     * ========================================================================
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Browser cerrado');
        }
    }

    /**
     * ========================================================================
     * UTILIDAD: WAIT (compatibilidad con Puppeteer nuevo)
     * ========================================================================
     */
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = UIDeepCrawler;
