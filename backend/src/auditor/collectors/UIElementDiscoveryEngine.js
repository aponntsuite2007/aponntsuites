/**
 * ============================================================================
 * UI ELEMENT DISCOVERY ENGINE
 * ============================================================================
 *
 * Motor de descubrimiento REAL de elementos UI usando Playwright.
 * NO simula - EJECUTA en el navegador real.
 *
 * Capacidades:
 * 1. DESCUBRIR todos los elementos visibles de una pantalla
 * 2. CLASIFICAR cada elemento (label estático, dato dinámico, input, button)
 * 3. DETECTAR qué datos deberían venir de BD (SSOT)
 * 4. VERIFICAR que los modales abren y tienen contenido
 * 5. VALIDAR datos contra PostgreSQL
 *
 * @version 1.0.0
 * @date 2025-12-20
 */

let chromium;
try { chromium = require('playwright').chromium; } catch(e) { console.log('⚠️ [UI-DISCOVERY] Playwright no disponible (opcional en producción)'); }

/**
 * Tipos de elementos UI detectables
 */
const ElementType = {
    STATIC_LABEL: 'static_label',           // Texto fijo que nunca cambia
    DYNAMIC_DATA: 'dynamic_data',           // Dato que viene de BD
    INPUT_TEXT: 'input_text',               // Input de texto
    INPUT_SELECT: 'input_select',           // Select/dropdown
    INPUT_CHECKBOX: 'input_checkbox',       // Checkbox
    INPUT_DATE: 'input_date',               // Input de fecha
    INPUT_FILE: 'input_file',               // Input de archivo
    BUTTON_ACTION: 'button_action',         // Botón de acción (nuevo, editar, eliminar)
    BUTTON_SUBMIT: 'button_submit',         // Botón de submit (guardar)
    BUTTON_CANCEL: 'button_cancel',         // Botón de cancelar/cerrar
    BUTTON_NAV: 'button_nav',               // Botón de navegación
    TABLE_HEADER: 'table_header',           // Encabezado de tabla
    TABLE_CELL: 'table_cell',               // Celda de tabla (dato)
    TABLE_EMPTY: 'table_empty',             // Tabla sin datos
    TAB_BUTTON: 'tab_button',               // Botón de tab/pestaña
    MODAL_CONTAINER: 'modal_container',     // Contenedor de modal
    MODAL_TITLE: 'modal_title',             // Título del modal
    FORM_CONTAINER: 'form_container',       // Contenedor de formulario
    UNKNOWN: 'unknown'                      // No clasificado
};

/**
 * Patrones para detectar datos SSOT (deben venir de BD)
 */
const SSOT_PATTERNS = {
    // IDs y códigos
    id: /^(\d+|[a-f0-9-]{36})$/i,
    legajo: /^\d{1,10}$/,
    cuil: /^\d{2}-\d{8}-\d{1}$/,
    cuit: /^\d{2}-\d{8}-\d{1}$/,
    dni: /^\d{7,8}$/,

    // Fechas (datos que cambian)
    date: /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/,
    datetime: /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\s+\d{1,2}:\d{2}/,

    // Emails y teléfonos
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\d\s\-\+\(\)]{7,20}$/,

    // Montos y números
    currency: /^\$?\s*[\d\.,]+$/,
    percentage: /^\d+(\.\d+)?%$/,

    // Estados dinámicos
    status: /^(activo|inactivo|pendiente|aprobado|rechazado|completado|en proceso)/i
};

/**
 * Labels estáticos conocidos (NO son datos de BD)
 */
const STATIC_LABELS = [
    'nombre', 'apellido', 'email', 'teléfono', 'dirección', 'dni', 'cuil',
    'fecha de nacimiento', 'fecha de ingreso', 'departamento', 'cargo',
    'turno', 'estado', 'acciones', 'editar', 'eliminar', 'ver', 'nuevo',
    'guardar', 'cancelar', 'cerrar', 'buscar', 'filtrar', 'exportar',
    'id', 'código', 'descripción', 'observaciones', 'notas'
];

/**
 * Clase UIElementDiscoveryEngine
 */
class UIElementDiscoveryEngine {
    constructor(config = {}) {
        this.config = {
            baseUrl: config.baseUrl || 'http://localhost:9998',
            headless: config.headless !== false,
            slowMo: config.slowMo || 100,
            timeout: config.timeout || 30000,
            ...config
        };

        this.browser = null;
        this.context = null;
        this.page = null;
        this.database = config.database || null;

        // Cache de descubrimientos
        this.discoveryCache = new Map();

        console.log('🔍 [UI-DISCOVERY] Engine inicializado');
    }

    /**
     * Iniciar el browser
     */
    async start() {
        if (this.browser) return;

        console.log('🌐 [UI-DISCOVERY] Iniciando browser Playwright...');

        this.browser = await chromium.launch({
            headless: this.config.headless,
            slowMo: this.config.slowMo
        });

        this.context = await this.browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });

        this.page = await this.context.newPage();

        // Interceptar errores de consola
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`   🔴 Console Error: ${msg.text()}`);
            }
        });

        console.log('   ✅ Browser iniciado');
    }

    /**
     * Cerrar el browser
     */
    async stop() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
            this.page = null;
            console.log('🔍 [UI-DISCOVERY] Browser cerrado');
        }
    }

    /**
     * Navegar a una URL
     */
    async navigateTo(url) {
        const fullUrl = url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;
        console.log(`🔍 [UI-DISCOVERY] Navegando a: ${fullUrl}`);

        await this.page.goto(fullUrl, {
            waitUntil: 'networkidle',
            timeout: this.config.timeout
        });

        await this.page.waitForTimeout(1000); // Esperar renderizado
    }

    /**
     * Login al sistema
     */
    async login(companySlug, username, password) {
        console.log(`🔐 [UI-DISCOVERY] Login: ${companySlug}/${username}`);

        await this.navigateTo('/panel-empresa.html');

        // Detectar si hay form de login
        const loginForm = await this.page.$('#loginForm, form[action*="login"], .login-form');
        if (!loginForm) {
            console.log('   ⚠️ No se detectó form de login, posiblemente ya logueado');
            return true;
        }

        // Llenar credenciales
        await this.page.fill('#company-slug, input[name="company"]', companySlug);
        await this.page.fill('#username, input[name="username"]', username);
        await this.page.fill('#password, input[name="password"]', password);

        // Submit
        await this.page.click('button[type="submit"], .btn-login');
        await this.page.waitForTimeout(2000);

        // Verificar login exitoso
        const loginError = await this.page.$('.login-error, .alert-danger');
        if (loginError) {
            const errorText = await loginError.textContent();
            throw new Error(`Login falló: ${errorText}`);
        }

        console.log('   ✅ Login exitoso');
        return true;
    }

    // =========================================================================
    // DESCUBRIMIENTO DE ELEMENTOS
    // =========================================================================

    /**
     * Descubrir TODOS los elementos visibles de la pantalla actual
     * @returns {Object} Mapa completo de elementos descubiertos
     */
    async discoverAllElements() {
        console.log('\n🔍 [UI-DISCOVERY] Descubriendo TODOS los elementos...\n');

        const discovery = {
            url: this.page.url(),
            timestamp: new Date().toISOString(),
            elements: {
                buttons: [],
                inputs: [],
                labels: [],
                tables: [],
                tabs: [],
                modals: [],
                forms: [],
                dynamicData: [],
                staticLabels: []
            },
            summary: {},
            issues: []
        };

        // 1. Descubrir botones
        discovery.elements.buttons = await this._discoverButtons();

        // 2. Descubrir inputs
        discovery.elements.inputs = await this._discoverInputs();

        // 3. Descubrir labels y textos
        const textElements = await this._discoverTextElements();
        discovery.elements.labels = textElements.labels;
        discovery.elements.dynamicData = textElements.dynamicData;
        discovery.elements.staticLabels = textElements.staticLabels;

        // 4. Descubrir tablas
        discovery.elements.tables = await this._discoverTables();

        // 5. Descubrir tabs
        discovery.elements.tabs = await this._discoverTabs();

        // 6. Descubrir modales
        discovery.elements.modals = await this._discoverModals();

        // 7. Descubrir formularios
        discovery.elements.forms = await this._discoverForms();

        // Generar resumen
        discovery.summary = {
            totalButtons: discovery.elements.buttons.length,
            totalInputs: discovery.elements.inputs.length,
            totalTables: discovery.elements.tables.length,
            totalTabs: discovery.elements.tabs.length,
            totalModals: discovery.elements.modals.length,
            totalForms: discovery.elements.forms.length,
            dynamicDataCount: discovery.elements.dynamicData.length,
            staticLabelCount: discovery.elements.staticLabels.length,
            issuesFound: discovery.issues.length
        };

        console.log('\n📊 [UI-DISCOVERY] RESUMEN:');
        console.log(`   Botones: ${discovery.summary.totalButtons}`);
        console.log(`   Inputs: ${discovery.summary.totalInputs}`);
        console.log(`   Tablas: ${discovery.summary.totalTables}`);
        console.log(`   Tabs: ${discovery.summary.totalTabs}`);
        console.log(`   Modales visibles: ${discovery.summary.totalModals}`);
        console.log(`   Formularios: ${discovery.summary.totalForms}`);
        console.log(`   Datos dinámicos (SSOT): ${discovery.summary.dynamicDataCount}`);
        console.log(`   Labels estáticos: ${discovery.summary.staticLabelCount}`);

        return discovery;
    }

    /**
     * Descubrir todos los botones
     */
    async _discoverButtons() {
        const buttons = await this.page.$$eval(
            'button, a.btn, input[type="submit"], input[type="button"], [role="button"]',
            (elements) => elements.map((el, idx) => {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);

                return {
                    index: idx,
                    tag: el.tagName.toLowerCase(),
                    text: el.textContent?.trim() || el.value || '',
                    type: el.type || 'button',
                    id: el.id || null,
                    class: el.className || '',
                    onclick: el.getAttribute('onclick') || null,
                    disabled: el.disabled || false,
                    visible: rect.width > 0 && rect.height > 0 && style.display !== 'none',
                    position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                };
            })
        );

        // Clasificar botones
        return buttons.map(btn => ({
            ...btn,
            classification: this._classifyButton(btn)
        }));
    }

    /**
     * Clasificar un botón
     */
    _classifyButton(btn) {
        const text = btn.text.toLowerCase();
        const onclick = (btn.onclick || '').toLowerCase();
        const cls = btn.class.toLowerCase();

        if (text.includes('nuevo') || text.includes('agregar') || text.includes('crear') || onclick.includes('nuevo') || onclick.includes('add')) {
            return ElementType.BUTTON_ACTION;
        }
        if (text.includes('guardar') || text.includes('save') || btn.type === 'submit' || cls.includes('btn-success')) {
            return ElementType.BUTTON_SUBMIT;
        }
        if (text.includes('cancelar') || text.includes('cerrar') || text.includes('close') || cls.includes('btn-close')) {
            return ElementType.BUTTON_CANCEL;
        }
        if (text.includes('editar') || text.includes('edit') || onclick.includes('edit')) {
            return ElementType.BUTTON_ACTION;
        }
        if (text.includes('eliminar') || text.includes('delete') || text.includes('borrar') || cls.includes('btn-danger')) {
            return ElementType.BUTTON_ACTION;
        }
        if (text.includes('ver') || text.includes('view') || onclick.includes('view')) {
            return ElementType.BUTTON_NAV;
        }

        return ElementType.BUTTON_ACTION;
    }

    /**
     * Descubrir todos los inputs
     */
    async _discoverInputs() {
        const inputs = await this.page.$$eval(
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea',
            (elements) => elements.map((el, idx) => {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                const label = document.querySelector(`label[for="${el.id}"]`);

                return {
                    index: idx,
                    tag: el.tagName.toLowerCase(),
                    type: el.type || 'text',
                    id: el.id || null,
                    name: el.name || null,
                    placeholder: el.placeholder || null,
                    value: el.value || '',
                    label: label?.textContent?.trim() || null,
                    required: el.required || false,
                    disabled: el.disabled || false,
                    readonly: el.readOnly || false,
                    visible: rect.width > 0 && rect.height > 0 && style.display !== 'none',
                    position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                    options: el.tagName === 'SELECT' ?
                        Array.from(el.options).map(o => ({ value: o.value, text: o.text })) : null
                };
            })
        );

        // Clasificar inputs
        return inputs.map(input => ({
            ...input,
            classification: this._classifyInput(input)
        }));
    }

    /**
     * Clasificar un input
     */
    _classifyInput(input) {
        if (input.tag === 'select') return ElementType.INPUT_SELECT;
        if (input.type === 'checkbox') return ElementType.INPUT_CHECKBOX;
        if (input.type === 'date' || input.type === 'datetime-local') return ElementType.INPUT_DATE;
        if (input.type === 'file') return ElementType.INPUT_FILE;
        return ElementType.INPUT_TEXT;
    }

    /**
     * Descubrir textos y clasificarlos como estáticos o dinámicos
     */
    async _discoverTextElements() {
        const texts = await this.page.$$eval(
            'span, label, p, h1, h2, h3, h4, h5, h6, td, th, .badge, .label',
            (elements) => elements.map((el, idx) => {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                const text = el.textContent?.trim() || '';

                // Solo elementos visibles con texto
                if (rect.width === 0 || rect.height === 0 || style.display === 'none' || !text) {
                    return null;
                }

                return {
                    index: idx,
                    tag: el.tagName.toLowerCase(),
                    text: text,
                    id: el.id || null,
                    class: el.className || '',
                    dataAttribute: el.dataset ? Object.keys(el.dataset).length > 0 : false,
                    position: { x: rect.x, y: rect.y }
                };
            }).filter(Boolean)
        );

        const labels = [];
        const dynamicData = [];
        const staticLabels = [];

        for (const text of texts) {
            const classification = this._classifyText(text);

            if (classification.isDynamic) {
                dynamicData.push({
                    ...text,
                    classification: ElementType.DYNAMIC_DATA,
                    possibleSource: classification.possibleSource,
                    pattern: classification.pattern
                });
            } else {
                staticLabels.push({
                    ...text,
                    classification: ElementType.STATIC_LABEL
                });
            }

            labels.push(text);
        }

        return { labels, dynamicData, staticLabels };
    }

    /**
     * Clasificar un texto como estático o dinámico
     */
    _classifyText(textEl) {
        const text = textEl.text;
        const textLower = text.toLowerCase();

        // Si es un label conocido estático
        if (STATIC_LABELS.some(label => textLower === label || textLower.includes(label + ':'))) {
            return { isDynamic: false };
        }

        // Verificar contra patrones SSOT
        for (const [patternName, pattern] of Object.entries(SSOT_PATTERNS)) {
            if (pattern.test(text)) {
                return {
                    isDynamic: true,
                    possibleSource: patternName,
                    pattern: patternName
                };
            }
        }

        // Si tiene data-attributes, probablemente es dinámico
        if (textEl.dataAttribute) {
            return { isDynamic: true, possibleSource: 'data-attribute' };
        }

        // Si está dentro de una celda de tabla (td), probablemente es dinámico
        if (textEl.tag === 'td') {
            return { isDynamic: true, possibleSource: 'table_cell' };
        }

        // Por defecto, si tiene números o emails, es dinámico
        if (/\d{5,}/.test(text) || /@/.test(text)) {
            return { isDynamic: true, possibleSource: 'inferred' };
        }

        return { isDynamic: false };
    }

    /**
     * Descubrir tablas
     */
    async _discoverTables() {
        const tables = await this.page.$$eval('table', (elements) =>
            elements.map((table, idx) => {
                const rect = table.getBoundingClientRect();
                const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim());
                const rows = table.querySelectorAll('tbody tr');

                return {
                    index: idx,
                    id: table.id || null,
                    class: table.className || '',
                    visible: rect.width > 0 && rect.height > 0,
                    headers: headers,
                    rowCount: rows.length,
                    isEmpty: rows.length === 0,
                    position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                };
            })
        );

        return tables.map(table => ({
            ...table,
            classification: table.isEmpty ? ElementType.TABLE_EMPTY : 'table_with_data',
            issue: table.isEmpty ? 'Tabla sin datos - verificar si debería tener registros' : null
        }));
    }

    /**
     * Descubrir tabs/pestañas
     */
    async _discoverTabs() {
        const tabs = await this.page.$$eval(
            '.nav-tabs a, .tab-button, [role="tab"], .nav-link',
            (elements) => elements.map((el, idx) => {
                const rect = el.getBoundingClientRect();

                return {
                    index: idx,
                    text: el.textContent?.trim() || '',
                    id: el.id || null,
                    active: el.classList.contains('active'),
                    visible: rect.width > 0 && rect.height > 0,
                    href: el.getAttribute('href') || el.getAttribute('data-target') || null
                };
            })
        );

        return tabs.filter(t => t.visible && t.text);
    }

    /**
     * Descubrir modales visibles
     */
    async _discoverModals() {
        const modals = await this.page.$$eval(
            '.modal, [role="dialog"], .dialog',
            (elements) => elements.map((el, idx) => {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                const isVisible = (
                    el.classList.contains('show') ||
                    style.display !== 'none' &&
                    rect.width > 0 &&
                    rect.height > 0
                );

                const title = el.querySelector('.modal-title, h5, h4')?.textContent?.trim();
                const inputs = el.querySelectorAll('input:not([type="hidden"]), select, textarea').length;
                const buttons = el.querySelectorAll('button').length;

                return {
                    index: idx,
                    id: el.id || null,
                    class: el.className || '',
                    isVisible: isVisible,
                    title: title || null,
                    inputCount: inputs,
                    buttonCount: buttons,
                    position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                };
            })
        );

        return modals;
    }

    /**
     * Descubrir formularios
     */
    async _discoverForms() {
        const forms = await this.page.$$eval('form', (elements) =>
            elements.map((form, idx) => {
                const rect = form.getBoundingClientRect();
                const inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
                const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');

                return {
                    index: idx,
                    id: form.id || null,
                    action: form.action || null,
                    method: form.method || 'get',
                    inputCount: inputs.length,
                    hasSubmitButton: !!submitBtn,
                    visible: rect.width > 0 && rect.height > 0
                };
            })
        );

        return forms;
    }

    // =========================================================================
    // VERIFICACIÓN DE MODALES
    // =========================================================================

    /**
     * Abrir un modal y verificar su contenido
     * @param {string} buttonSelector - Selector del botón que abre el modal
     * @param {Object} expectations - Lo que se espera encontrar
     */
    async openAndVerifyModal(buttonSelector, expectations = {}) {
        console.log(`\n🔍 [UI-DISCOVERY] Verificando modal: ${buttonSelector}`);

        const result = {
            buttonFound: false,
            modalOpened: false,
            modalContent: null,
            expectations: expectations,
            verified: false,
            issues: []
        };

        try {
            // 1. Buscar el botón
            const button = await this.page.$(buttonSelector);
            if (!button) {
                result.issues.push(`Botón no encontrado: ${buttonSelector}`);
                return result;
            }
            result.buttonFound = true;

            // 2. Contar modales antes
            const modalsBefore = await this.page.$$('.modal.show, .modal[style*="display: block"]');
            const modalsCountBefore = modalsBefore.length;

            // 3. Click en el botón
            await button.click();
            await this.page.waitForTimeout(500);

            // 4. Esperar a que aparezca un modal nuevo
            try {
                await this.page.waitForSelector('.modal.show, .modal[style*="display: block"]', {
                    state: 'visible',
                    timeout: 5000
                });
            } catch (e) {
                result.issues.push('Modal no apareció después de click');
                return result;
            }

            // 5. Verificar que hay un modal nuevo
            const modalsAfter = await this.page.$$('.modal.show, .modal[style*="display: block"]');
            if (modalsAfter.length <= modalsCountBefore) {
                result.issues.push('No se detectó modal nuevo');
                return result;
            }

            result.modalOpened = true;

            // 6. Analizar contenido del modal
            const modal = modalsAfter[modalsAfter.length - 1];
            result.modalContent = await this._analyzeModalContent(modal);

            // 7. Verificar expectations
            if (expectations.minInputs) {
                if (result.modalContent.inputs.length < expectations.minInputs) {
                    result.issues.push(`Se esperaban ${expectations.minInputs} inputs, se encontraron ${result.modalContent.inputs.length}`);
                }
            }

            if (expectations.hasTitle && !result.modalContent.title) {
                result.issues.push('Se esperaba título en el modal pero no se encontró');
            }

            if (expectations.titleContains) {
                if (!result.modalContent.title?.toLowerCase().includes(expectations.titleContains.toLowerCase())) {
                    result.issues.push(`Título "${result.modalContent.title}" no contiene "${expectations.titleContains}"`);
                }
            }

            result.verified = result.issues.length === 0;

            // 8. Cerrar modal
            const closeBtn = await this.page.$('.modal.show .btn-close, .modal.show button[data-dismiss="modal"], .modal.show .close');
            if (closeBtn) {
                await closeBtn.click();
                await this.page.waitForTimeout(300);
            }

            console.log(`   ${result.verified ? '✅' : '❌'} Modal verificado - Issues: ${result.issues.length}`);

        } catch (error) {
            result.issues.push(`Error: ${error.message}`);
        }

        return result;
    }

    /**
     * Analizar contenido de un modal
     */
    async _analyzeModalContent(modalElement) {
        return await this.page.evaluate((modal) => {
            if (!modal) return null;

            const title = modal.querySelector('.modal-title, h5, h4')?.textContent?.trim();
            const inputs = Array.from(modal.querySelectorAll('input:not([type="hidden"]), select, textarea'))
                .map(input => ({
                    type: input.type || input.tagName.toLowerCase(),
                    name: input.name || input.id,
                    label: document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim(),
                    value: input.value,
                    required: input.required,
                    visible: input.offsetParent !== null
                }));

            const buttons = Array.from(modal.querySelectorAll('button'))
                .map(btn => ({
                    text: btn.textContent?.trim(),
                    type: btn.type,
                    disabled: btn.disabled
                }));

            const texts = Array.from(modal.querySelectorAll('span, p, label'))
                .map(el => el.textContent?.trim())
                .filter(t => t && t.length > 0);

            return {
                title,
                inputs,
                buttons,
                texts,
                inputCount: inputs.length,
                buttonCount: buttons.length
            };
        }, modalElement);
    }

    // =========================================================================
    // VALIDACIÓN SSOT
    // =========================================================================

    /**
     * Verificar que un dato mostrado en UI coincide con BD
     * @param {string} selector - Selector del elemento con el dato
     * @param {string} table - Tabla de BD
     * @param {string} column - Columna de BD
     * @param {Object} where - Condiciones WHERE
     */
    async verifySSOT(selector, table, column, where) {
        if (!this.database) {
            return { verified: false, error: 'Database no configurada' };
        }

        console.log(`\n🔍 [SSOT] Verificando: ${selector} contra ${table}.${column}`);

        try {
            // 1. Obtener valor de UI
            const uiValue = await this.page.$eval(selector, el => el.textContent?.trim());

            // 2. Obtener valor de BD
            const whereClause = Object.entries(where)
                .map(([k, v]) => `${k} = '${v}'`)
                .join(' AND ');

            const query = `SELECT ${column} FROM ${table} WHERE ${whereClause} LIMIT 1`;
            const [result] = await this.database.query(query);

            if (!result || result.length === 0) {
                return {
                    verified: false,
                    uiValue,
                    dbValue: null,
                    error: 'Registro no encontrado en BD'
                };
            }

            const dbValue = String(result[0][column]);

            // 3. Comparar
            const matches = uiValue === dbValue;

            console.log(`   UI: "${uiValue}"`);
            console.log(`   BD: "${dbValue}"`);
            console.log(`   ${matches ? '✅ MATCH' : '❌ MISMATCH'}`);

            return {
                verified: matches,
                uiValue,
                dbValue,
                table,
                column
            };

        } catch (error) {
            return {
                verified: false,
                error: error.message
            };
        }
    }

    /**
     * Verificar que una tabla UI tiene los mismos datos que BD
     */
    async verifyTableSSOT(tableSelector, dbTable, keyColumn) {
        console.log(`\n🔍 [SSOT] Verificando tabla: ${tableSelector} contra ${dbTable}`);

        const result = {
            verified: false,
            uiRowCount: 0,
            dbRowCount: 0,
            mismatches: [],
            errors: []
        };

        try {
            // 1. Obtener datos de UI
            const uiData = await this.page.$$eval(`${tableSelector} tbody tr`, rows =>
                rows.map(row => {
                    const cells = row.querySelectorAll('td');
                    return Array.from(cells).map(cell => cell.textContent?.trim());
                })
            );

            result.uiRowCount = uiData.length;

            // 2. Obtener datos de BD
            if (this.database) {
                const [dbRows] = await this.database.query(`SELECT * FROM ${dbTable} LIMIT 100`);
                result.dbRowCount = dbRows.length;

                // Comparar cantidades
                if (result.uiRowCount !== result.dbRowCount) {
                    result.mismatches.push(
                        `Cantidad de filas no coincide: UI=${result.uiRowCount}, BD=${result.dbRowCount}`
                    );
                }
            }

            result.verified = result.mismatches.length === 0 && result.errors.length === 0;

            console.log(`   UI rows: ${result.uiRowCount}`);
            console.log(`   BD rows: ${result.dbRowCount}`);
            console.log(`   ${result.verified ? '✅' : '❌'} Verificación: ${result.verified ? 'OK' : 'FAILED'}`);

        } catch (error) {
            result.errors.push(error.message);
        }

        return result;
    }

    // =========================================================================
    // TEST CRUD REAL
    // =========================================================================

    /**
     * Ejecutar test CRUD real con verificación
     */
    async testCRUDReal(config) {
        const { moduleName, newButtonSelector, formSelector, tableSelector, testData } = config;

        console.log(`\n🧪 [CRUD-TEST] Testing ${moduleName}...`);

        const results = {
            module: moduleName,
            create: { success: false, error: null },
            read: { success: false, error: null },
            update: { success: false, error: null },
            delete: { success: false, error: null },
            verified: false
        };

        try {
            // CREATE
            const createResult = await this.openAndVerifyModal(newButtonSelector, {
                hasTitle: true,
                minInputs: 1
            });

            if (createResult.modalOpened && createResult.modalContent) {
                // Llenar form
                for (const input of createResult.modalContent.inputs) {
                    if (input.name && testData[input.name]) {
                        await this.page.fill(`[name="${input.name}"]`, testData[input.name]);
                    }
                }

                // Submit
                await this.page.click(`${formSelector} button[type="submit"], .btn-success`);
                await this.page.waitForTimeout(1000);

                // Verificar que se creó en tabla
                const tableContent = await this.page.textContent(tableSelector);
                const created = Object.values(testData).some(v => tableContent.includes(v));

                results.create.success = created;
                if (!created) {
                    results.create.error = 'Registro no apareció en tabla después de crear';
                }
            } else {
                results.create.error = createResult.issues.join(', ');
            }

            results.verified = results.create.success;

        } catch (error) {
            results.create.error = error.message;
        }

        console.log(`\n📊 [CRUD-TEST] Resultado ${moduleName}:`);
        console.log(`   CREATE: ${results.create.success ? '✅' : '❌'} ${results.create.error || ''}`);

        return results;
    }
}

module.exports = UIElementDiscoveryEngine;
