/**
 * ============================================================================
 * STATIC HTML ANALYZER - Análisis Estático de UI
 * ============================================================================
 *
 * Analiza archivos HTML estáticamente para descubrir:
 * - Todos los módulos definidos
 * - Todos los botones, inputs, selects
 * - Todos los modales y sus campos
 * - Estructuras de tabs
 *
 * Complementa al UIDeepCrawler para elementos que no requieren JavaScript
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

class StaticHTMLAnalyzer {
    constructor(options = {}) {
        this.config = {
            publicDir: options.publicDir || path.join(__dirname, '../../../public'),
            outputDir: options.outputDir || path.join(__dirname, '../knowledge/ui'),
            ...options
        };

        this.results = {
            analyzedAt: null,
            files: [],
            modules: {},
            globalElements: {
                buttons: [],
                inputs: [],
                selects: [],
                modals: [],
                tabs: [],
                tables: [],
                forms: []
            },
            stats: {
                filesAnalyzed: 0,
                totalButtons: 0,
                totalInputs: 0,
                totalModals: 0,
                totalTabs: 0
            }
        };
    }

    /**
     * Analizar todos los archivos HTML principales
     */
    async analyzeAll() {
        console.log('\n' + '═'.repeat(60));
        console.log('📄 STATIC HTML ANALYZER - Análisis Estático');
        console.log('═'.repeat(60));

        this.results.analyzedAt = new Date().toISOString();

        // Archivos principales a analizar
        const htmlFiles = [
            'panel-empresa.html',
            'panel-administrativo.html'
        ];

        for (const file of htmlFiles) {
            const filePath = path.join(this.config.publicDir, file);
            if (fs.existsSync(filePath)) {
                await this.analyzeFile(filePath, file);
            }
        }

        // Analizar archivos JS de módulos
        await this.analyzeModuleJS();

        // Guardar resultados
        await this.saveResults();

        console.log('\n' + '═'.repeat(60));
        console.log('📊 RESUMEN DEL ANÁLISIS ESTÁTICO');
        console.log('═'.repeat(60));
        console.log(`   Archivos analizados: ${this.results.stats.filesAnalyzed}`);
        console.log(`   Botones encontrados: ${this.results.stats.totalButtons}`);
        console.log(`   Inputs encontrados: ${this.results.stats.totalInputs}`);
        console.log(`   Modales encontrados: ${this.results.stats.totalModals}`);
        console.log(`   Tabs encontrados: ${this.results.stats.totalTabs}`);
        console.log(`   Módulos detectados: ${Object.keys(this.results.modules).length}`);

        return this.results;
    }

    /**
     * Analizar un archivo HTML
     */
    async analyzeFile(filePath, fileName) {
        console.log(`\n📄 Analizando: ${fileName}`);

        try {
            const html = fs.readFileSync(filePath, 'utf8');
            const $ = cheerio.load(html);

            this.results.files.push(fileName);
            this.results.stats.filesAnalyzed++;

            // Extraer módulos definidos
            this.extractModules($, fileName);

            // Extraer elementos globales
            this.extractButtons($, fileName);
            this.extractInputs($, fileName);
            this.extractSelects($, fileName);
            this.extractModals($, fileName);
            this.extractTabs($, fileName);
            this.extractTables($, fileName);
            this.extractForms($, fileName);

            console.log(`   ✅ Análisis completado`);

        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        }
    }

    /**
     * Extraer definiciones de módulos
     */
    extractModules($, fileName) {
        // Buscar data-module, data-module-key, etc.
        $('[data-module], [data-module-key], [data-section]').each((i, el) => {
            const $el = $(el);
            const moduleKey = $el.attr('data-module') ||
                             $el.attr('data-module-key') ||
                             $el.attr('data-section');

            if (moduleKey && !this.results.modules[moduleKey]) {
                this.results.modules[moduleKey] = {
                    key: moduleKey,
                    sourceFile: fileName,
                    elements: {
                        buttons: [],
                        inputs: [],
                        modals: [],
                        tabs: []
                    }
                };
            }
        });

        // Buscar en comentarios HTML que definen módulos
        const moduleComments = $.html().match(/<!--\s*MODULE:\s*(\w+)/gi) || [];
        moduleComments.forEach(comment => {
            const match = comment.match(/MODULE:\s*(\w+)/i);
            if (match && match[1]) {
                const moduleKey = match[1].toLowerCase();
                if (!this.results.modules[moduleKey]) {
                    this.results.modules[moduleKey] = {
                        key: moduleKey,
                        sourceFile: fileName,
                        elements: { buttons: [], inputs: [], modals: [], tabs: [] }
                    };
                }
            }
        });

        // Buscar funciones render* que sugieren módulos
        const renderFunctions = $.html().match(/function\s+render(\w+)/gi) || [];
        renderFunctions.forEach(fn => {
            const match = fn.match(/render(\w+)/i);
            if (match && match[1]) {
                const moduleKey = match[1].toLowerCase().replace(/module|view|section/gi, '');
                if (moduleKey.length > 2 && !this.results.modules[moduleKey]) {
                    this.results.modules[moduleKey] = {
                        key: moduleKey,
                        sourceFile: fileName,
                        inferredFrom: 'renderFunction',
                        elements: { buttons: [], inputs: [], modals: [], tabs: [] }
                    };
                }
            }
        });
    }

    /**
     * Extraer botones
     */
    extractButtons($, fileName) {
        $('button, .btn, [role="button"], input[type="submit"], input[type="button"]').each((i, el) => {
            const $el = $(el);
            const button = {
                index: i,
                text: $el.text().trim().substring(0, 100) || $el.attr('value') || '',
                id: $el.attr('id') || null,
                classes: $el.attr('class') || '',
                type: $el.attr('type') || 'button',
                onclick: $el.attr('onclick')?.substring(0, 200) || null,
                dataAction: $el.attr('data-action') || null,
                dataModule: $el.attr('data-module') || null,
                disabled: $el.attr('disabled') !== undefined,
                sourceFile: fileName
            };

            // Inferir acción del onclick o texto
            button.inferredAction = this.inferButtonAction(button);

            this.results.globalElements.buttons.push(button);
            this.results.stats.totalButtons++;

            // Asociar a módulo si tiene data-module
            if (button.dataModule && this.results.modules[button.dataModule]) {
                this.results.modules[button.dataModule].elements.buttons.push(button);
            }
        });
    }

    /**
     * Inferir acción de un botón
     */
    inferButtonAction(button) {
        const text = (button.text + ' ' + (button.onclick || '')).toLowerCase();

        if (text.includes('nuevo') || text.includes('crear') || text.includes('add') || text.includes('new')) {
            return 'create';
        }
        if (text.includes('editar') || text.includes('edit') || text.includes('modificar')) {
            return 'edit';
        }
        if (text.includes('eliminar') || text.includes('delete') || text.includes('borrar')) {
            return 'delete';
        }
        if (text.includes('guardar') || text.includes('save') || text.includes('grabar')) {
            return 'save';
        }
        if (text.includes('cancelar') || text.includes('cancel') || text.includes('cerrar') || text.includes('close')) {
            return 'cancel';
        }
        if (text.includes('buscar') || text.includes('search') || text.includes('filtrar')) {
            return 'search';
        }
        if (text.includes('exportar') || text.includes('export') || text.includes('descargar')) {
            return 'export';
        }
        return 'unknown';
    }

    /**
     * Extraer inputs
     */
    extractInputs($, fileName) {
        $('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea').each((i, el) => {
            const $el = $(el);
            const $label = $(`label[for="${$el.attr('id')}"]`);

            const input = {
                index: i,
                name: $el.attr('name') || null,
                id: $el.attr('id') || null,
                type: $el.attr('type') || 'text',
                label: $label.text().trim() || $el.attr('placeholder') || null,
                placeholder: $el.attr('placeholder') || null,
                required: $el.attr('required') !== undefined,
                pattern: $el.attr('pattern') || null,
                maxLength: $el.attr('maxlength') ? parseInt($el.attr('maxlength')) : null,
                minLength: $el.attr('minlength') ? parseInt($el.attr('minlength')) : null,
                dataModule: $el.closest('[data-module]').attr('data-module') || null,
                sourceFile: fileName
            };

            this.results.globalElements.inputs.push(input);
            this.results.stats.totalInputs++;

            if (input.dataModule && this.results.modules[input.dataModule]) {
                this.results.modules[input.dataModule].elements.inputs.push(input);
            }
        });
    }

    /**
     * Extraer selects
     */
    extractSelects($, fileName) {
        $('select').each((i, el) => {
            const $el = $(el);
            const $label = $(`label[for="${$el.attr('id')}"]`);

            const options = [];
            $el.find('option').each((j, opt) => {
                options.push({
                    value: $(opt).attr('value') || '',
                    text: $(opt).text().trim()
                });
            });

            const select = {
                index: i,
                name: $el.attr('name') || null,
                id: $el.attr('id') || null,
                label: $label.text().trim() || null,
                required: $el.attr('required') !== undefined,
                options: options.slice(0, 20), // Limit options
                optionCount: options.length,
                dataModule: $el.closest('[data-module]').attr('data-module') || null,
                sourceFile: fileName
            };

            this.results.globalElements.selects.push(select);
        });
    }

    /**
     * Extraer modales
     */
    extractModals($, fileName) {
        $('.modal, [role="dialog"], .modal-dialog, [data-modal]').each((i, el) => {
            const $el = $(el);
            const modalId = $el.attr('id') || `modal-${i}`;

            // Extraer título del modal
            const title = $el.find('.modal-title, .modal-header h4, .modal-header h5, h2').first().text().trim();

            // Extraer campos del modal
            const fields = [];
            $el.find('input:not([type="hidden"]), select, textarea').each((j, field) => {
                const $field = $(field);
                fields.push({
                    name: $field.attr('name') || $field.attr('id'),
                    type: $field.attr('type') || field.tagName.toLowerCase(),
                    required: $field.attr('required') !== undefined,
                    label: $(`label[for="${$field.attr('id')}"]`).text().trim() || $field.attr('placeholder')
                });
            });

            // Extraer tabs del modal
            const tabs = [];
            $el.find('.nav-tabs .nav-link, .tab-button, [role="tab"]').each((j, tab) => {
                tabs.push({
                    text: $(tab).text().trim(),
                    id: $(tab).attr('id') || $(tab).attr('href')?.replace('#', '')
                });
            });

            // Extraer botones del modal
            const buttons = [];
            $el.find('.modal-footer button, .modal-actions button').each((j, btn) => {
                buttons.push({
                    text: $(btn).text().trim(),
                    type: $(btn).attr('type'),
                    classes: $(btn).attr('class')
                });
            });

            const modal = {
                id: modalId,
                title: title || null,
                tabCount: tabs.length,
                tabs: tabs,
                fieldCount: fields.length,
                fields: fields.slice(0, 50), // Limit fields
                buttons: buttons,
                sourceFile: fileName
            };

            this.results.globalElements.modals.push(modal);
            this.results.stats.totalModals++;
        });
    }

    /**
     * Extraer tabs
     */
    extractTabs($, fileName) {
        $('.nav-tabs, .tab-list, [role="tablist"]').each((i, tabList) => {
            const $tabList = $(tabList);
            const tabs = [];

            $tabList.find('.nav-link, .tab, [role="tab"]').each((j, tab) => {
                const $tab = $(tab);
                tabs.push({
                    index: j,
                    text: $tab.text().trim(),
                    id: $tab.attr('id') || null,
                    href: $tab.attr('href') || $tab.attr('data-target'),
                    active: $tab.hasClass('active')
                });
            });

            if (tabs.length > 0) {
                this.results.globalElements.tabs.push({
                    index: i,
                    tabListId: $tabList.attr('id') || null,
                    tabCount: tabs.length,
                    tabs: tabs,
                    sourceFile: fileName
                });
                this.results.stats.totalTabs += tabs.length;
            }
        });
    }

    /**
     * Extraer tablas
     */
    extractTables($, fileName) {
        $('table, .data-table, [role="grid"]').each((i, el) => {
            const $el = $(el);
            const headers = [];

            $el.find('th, .header-cell').each((j, th) => {
                headers.push($(th).text().trim());
            });

            this.results.globalElements.tables.push({
                index: i,
                id: $el.attr('id') || null,
                classes: $el.attr('class') || '',
                headers: headers,
                columnCount: headers.length,
                sourceFile: fileName
            });
        });
    }

    /**
     * Extraer formularios
     */
    extractForms($, fileName) {
        $('form').each((i, el) => {
            const $el = $(el);
            const fields = [];

            $el.find('input:not([type="hidden"]), select, textarea').each((j, field) => {
                const $field = $(field);
                fields.push({
                    name: $field.attr('name'),
                    type: $field.attr('type') || field.tagName.toLowerCase(),
                    required: $field.attr('required') !== undefined
                });
            });

            this.results.globalElements.forms.push({
                index: i,
                id: $el.attr('id') || null,
                action: $el.attr('action') || null,
                method: $el.attr('method') || 'get',
                fieldCount: fields.length,
                fields: fields.slice(0, 30),
                sourceFile: fileName
            });
        });
    }

    /**
     * Analizar archivos JS de módulos para extraer más información
     */
    async analyzeModuleJS() {
        console.log('\n📜 Analizando archivos JS de módulos...');

        const jsModulesDir = path.join(this.config.publicDir, 'js', 'modules');

        if (!fs.existsSync(jsModulesDir)) {
            console.log('   ⚠️ Directorio de módulos JS no encontrado');
            return;
        }

        const jsFiles = fs.readdirSync(jsModulesDir).filter(f => f.endsWith('.js'));
        console.log(`   Encontrados ${jsFiles.length} archivos JS`);

        for (const jsFile of jsFiles.slice(0, 30)) { // Limit to 30 files
            try {
                const content = fs.readFileSync(path.join(jsModulesDir, jsFile), 'utf8');
                const moduleKey = jsFile.replace('.js', '').replace(/-/g, '_');

                // Buscar definiciones de funciones importantes
                const functions = content.match(/(?:async\s+)?function\s+(\w+)|(\w+)\s*[=:]\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)/g) || [];

                // Buscar endpoints API
                const apiCalls = content.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/g) || [];
                const endpoints = apiCalls.map(call => {
                    const match = call.match(/['"`]([^'"`]+)['"`]/);
                    return match ? match[1] : null;
                }).filter(Boolean);

                // Buscar referencias a elementos DOM
                const domRefs = content.match(/getElementById\s*\(\s*['"`]([^'"`]+)['"`]\)|querySelector\s*\(\s*['"`]([^'"`]+)['"`]\)/g) || [];

                if (!this.results.modules[moduleKey]) {
                    this.results.modules[moduleKey] = {
                        key: moduleKey,
                        sourceFile: jsFile,
                        elements: { buttons: [], inputs: [], modals: [], tabs: [] }
                    };
                }

                this.results.modules[moduleKey].jsAnalysis = {
                    functionCount: functions.length,
                    apiEndpoints: [...new Set(endpoints)].slice(0, 20),
                    domReferences: domRefs.length
                };

            } catch (e) {
                // Ignore file read errors
            }
        }
    }

    /**
     * Guardar resultados
     */
    async saveResults() {
        console.log('\n💾 Guardando resultados...');

        // Asegurar que el directorio existe
        if (!fs.existsSync(this.config.outputDir)) {
            fs.mkdirSync(this.config.outputDir, { recursive: true });
        }

        const outputPath = path.join(this.config.outputDir, 'static-analysis.json');
        fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
        console.log(`   ✅ Guardado en: ${outputPath}`);

        // También crear un resumen por módulo
        const moduleSummary = {};
        for (const [key, mod] of Object.entries(this.results.modules)) {
            moduleSummary[key] = {
                sourceFile: mod.sourceFile,
                buttonCount: mod.elements?.buttons?.length || 0,
                inputCount: mod.elements?.inputs?.length || 0,
                hasJSAnalysis: !!mod.jsAnalysis,
                apiEndpoints: mod.jsAnalysis?.apiEndpoints?.length || 0
            };
        }

        const summaryPath = path.join(this.config.outputDir, 'modules-summary.json');
        fs.writeFileSync(summaryPath, JSON.stringify(moduleSummary, null, 2));
        console.log(`   ✅ Resumen guardado en: ${summaryPath}`);

        return outputPath;
    }
}

module.exports = StaticHTMLAnalyzer;
