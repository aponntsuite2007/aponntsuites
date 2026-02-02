/**
 * TEST VISUAL EXHAUSTIVO - Módulo Expediente 360°
 * Sigue el protocolo de TESTING-VISUAL-EXHAUSTIVO-SPEC.md
 *
 * EMPRESA: ISI | USUARIO: admin | CLAVE: admin123
 *
 * 13 TABS A TESTEAR:
 * 1. Resumen (overview) - Vista general con scoring
 * 2. Personal - Datos personales completos
 * 3. Laboral - Información laboral
 * 4. Asistencia (attendance) - Historial de asistencia
 * 5. Disciplina (discipline) - Sanciones
 * 6. Capacitación (training) - Cursos y certificaciones
 * 7. Médico (medical) - Historial médico
 * 8. Documentos (documents) - Documentación del empleado
 * 9. Timeline - Eventos cronológicos
 * 10. IA (ai-analysis) - Análisis con Ollama
 * 11. Biométrico (biometric) - ENTERPRISE
 * 12. Reemplazos (compatibility) - ENTERPRISE
 * 13. Banco Horas (hour-bank) - ENTERPRISE
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, '../../../screenshots/expediente360-exhaustive');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const bugsFound = [];
const dataAnalysis = {
    tabs: [],
    missingData: [],
    presentData: [],
    recommendations: []
};

function reportBug(category, description, details = {}) {
    const bug = { category, description, details, timestamp: new Date().toISOString() };
    bugsFound.push(bug);
    console.log(`\n🐛 BUG DETECTADO: [${category}]`);
    console.log(`   ${description}`);
    Object.entries(details).forEach(([k, v]) => console.log(`   ${k}: ${v}`));
}

function reportMissingData(section, field, importance) {
    dataAnalysis.missingData.push({ section, field, importance });
    console.log(`⚠️ DATO FALTANTE [${importance}]: ${section} -> ${field}`);
}

function reportPresentData(section, field, value) {
    dataAnalysis.presentData.push({ section, field, hasValue: !!value });
}

async function saveScreenshot(page, name) {
    const filename = `${Date.now()}_${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
    console.log(`📸 Screenshot: ${filename}`);
    return filename;
}

async function login(page) {
    console.log('🔐 Iniciando login con ISI/admin/admin123...');
    await page.goto(`${BASE_URL}/panel-empresa.html`);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Esperar que el dropdown de empresas tenga opciones cargadas
    console.log('⏳ Esperando carga de empresas...');
    await page.waitForFunction(() => {
        const select = document.querySelector('#companySelect');
        return select && select.options.length > 1;
    }, { timeout: 30000 });

    await page.selectOption('#companySelect', 'isi');
    await page.waitForTimeout(1000);
    await page.fill('#userInput', 'admin');
    await page.fill('#passwordInput', 'admin123');
    await page.click('#loginButton');
    await page.waitForTimeout(6000);

    await page.evaluate(() => {
        const loginContainer = document.getElementById('loginContainer');
        if (loginContainer) loginContainer.style.cssText = 'display: none !important;';
        if (typeof showDashboard === 'function') showDashboard();
    });
    await page.waitForTimeout(2000);
    console.log('✅ Login completado');
}

async function navigateToExpediente360(page) {
    console.log('🧭 Navegando al módulo Expediente 360°...');
    await page.evaluate(() => {
        if (typeof showModuleContent === 'function') {
            showModuleContent('employee-360', 'Expediente 360°');
        }
    });
    await page.waitForTimeout(5000);

    // Verificar que el módulo cargó
    const moduleLoaded = await page.evaluate(() => {
        return document.querySelector('.employee-360-wrapper') !== null ||
               document.querySelector('.e360-header') !== null ||
               document.querySelector('[class*="e360"]') !== null;
    });

    if (!moduleLoaded) {
        console.log('⚠️ Módulo no detectado por clase, buscando por contenido...');
        const hasContent = await page.evaluate(() => {
            return document.body.innerText.includes('Expediente 360') ||
                   document.body.innerText.includes('employee-360');
        });
        if (hasContent) {
            console.log('✅ Módulo detectado por contenido');
        } else {
            reportBug('MODULE_NOT_LOADED', 'El módulo Expediente 360° no cargó correctamente');
        }
    } else {
        console.log('✅ Módulo Expediente 360° cargado');
    }
}

async function selectEmployee(page) {
    console.log('👤 Seleccionando empleado para análisis...');

    // Esperar a que el selector de empleados esté disponible
    await page.waitForTimeout(2000);

    const employeeSelected = await page.evaluate(() => {
        // Buscar el selector de empleados
        const selectors = [
            '#employee-select',
            '#e360-employee-select',
            'select[name="employee"]',
            '.e360-employee-selector select',
            'select'
        ];

        for (const sel of selectors) {
            const select = document.querySelector(sel);
            if (select && select.options && select.options.length > 1) {
                // Seleccionar el primer empleado (no el placeholder)
                select.selectedIndex = 1;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return {
                    success: true,
                    employeeName: select.options[1].text,
                    totalEmployees: select.options.length - 1
                };
            }
        }
        return { success: false, reason: 'No se encontró selector de empleados' };
    });

    if (employeeSelected.success) {
        console.log(`✅ Empleado seleccionado: ${employeeSelected.employeeName}`);
        console.log(`   Total empleados disponibles: ${employeeSelected.totalEmployees}`);
        await page.waitForTimeout(1000);

        // IMPORTANTE: Click en "Generar Expediente" para cargar los datos
        console.log('📊 Haciendo click en "Generar Expediente"...');
        await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                if (btn.textContent.includes('Generar Expediente') || btn.textContent.includes('Generar')) {
                    btn.click();
                    return true;
                }
            }
            // Fallback: buscar botón primario
            const primaryBtn = document.querySelector('.btn-primary, button[type="submit"]');
            if (primaryBtn) primaryBtn.click();
            return false;
        });

        console.log('⏳ Esperando carga de expediente completo...');
        await page.waitForTimeout(8000); // Dar tiempo para cargar todos los datos
    } else {
        console.log(`⚠️ ${employeeSelected.reason}`);
    }

    return employeeSelected;
}

async function clickTab(page, tabId) {
    console.log(`   📑 Cambiando a tab: ${tabId}`);
    await page.evaluate((id) => {
        const tab = document.querySelector(`[data-tab="${id}"], .e360-tab[data-tab="${id}"]`);
        if (tab) {
            tab.click();
        } else {
            // Buscar por texto o clase alternativa
            const tabs = document.querySelectorAll('.e360-tab, .tab, [class*="tab"]');
            tabs.forEach(t => {
                if (t.textContent.toLowerCase().includes(id.replace('-', ' '))) {
                    t.click();
                }
            });
        }
    }, tabId);
    await page.waitForTimeout(2000);
}

async function analyzeTabContent(page, tabId, tabName) {
    const analysis = await page.evaluate(({ id, name }) => {
        const tabContent = document.querySelector(`#tab-${id}, .e360-tab-content:not([style*="none"])`);
        if (!tabContent) {
            return {
                tabId: id,
                tabName: name,
                found: false,
                error: 'Tab content no encontrado'
            };
        }

        // Analizar elementos del tab
        const cards = tabContent.querySelectorAll('.card, .e360-card, [class*="card"]');
        const tables = tabContent.querySelectorAll('table, .table');
        const charts = tabContent.querySelectorAll('canvas, .chart, [class*="chart"]');
        const inputs = tabContent.querySelectorAll('input, select, textarea');
        const buttons = tabContent.querySelectorAll('button, .btn');
        const emptyStates = tabContent.querySelectorAll('.empty-state, .no-data, [class*="empty"]');
        const dataFields = tabContent.querySelectorAll('[class*="value"], [class*="data"], .field-value');

        // Detectar campos vacíos o con placeholder
        const emptyFields = [];
        const filledFields = [];

        dataFields.forEach(field => {
            const text = field.textContent.trim();
            if (!text || text === '-' || text === 'N/A' || text === 'No disponible' || text === 'Sin datos') {
                emptyFields.push(field.className || 'unknown-field');
            } else {
                filledFields.push({ class: field.className, value: text.substring(0, 50) });
            }
        });

        // Detectar si hay mensaje de "sin datos"
        const noDataMessage = tabContent.textContent.includes('Sin datos') ||
                             tabContent.textContent.includes('No hay') ||
                             tabContent.textContent.includes('No se encontr');

        return {
            tabId: id,
            tabName: name,
            found: true,
            elements: {
                cards: cards.length,
                tables: tables.length,
                charts: charts.length,
                inputs: inputs.length,
                buttons: buttons.length,
                emptyStates: emptyStates.length
            },
            dataStatus: {
                emptyFields: emptyFields.length,
                filledFields: filledFields.length,
                hasNoDataMessage: noDataMessage,
                sampleData: filledFields.slice(0, 5)
            },
            contentLength: tabContent.textContent.length
        };
    }, { id: tabId, name: tabName });

    return analysis;
}

// ============================================================================
// TESTS
// ============================================================================

test.describe('Testing Exhaustivo - Módulo Expediente 360°', () => {

    test('FASE 0: Verificar APIs del módulo', async ({ page }) => {
        test.setTimeout(60000);

        console.log('\n' + '='.repeat(60));
        console.log('FASE 0: VERIFICACIÓN DE APIs');
        console.log('='.repeat(60));

        await login(page);

        // Verificar endpoint dashboard
        const dashboardResponse = await page.evaluate(async () => {
            try {
                const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                const res = await fetch('/api/employee-360/dashboard', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                return { status: res.status, success: data.success, employees: data.data?.employees?.length || 0 };
            } catch (e) {
                return { error: e.message };
            }
        });

        console.log('📊 API Dashboard:', dashboardResponse);

        if (dashboardResponse.error) {
            reportBug('API_ERROR', 'API dashboard falló', { error: dashboardResponse.error });
        } else if (dashboardResponse.status === 200 && dashboardResponse.success) {
            console.log(`✅ Dashboard OK - ${dashboardResponse.employees} empleados disponibles`);
        }

        expect(dashboardResponse.status).toBe(200);
    });

    test('FASE 1: Carga inicial del módulo', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(120000);

        console.log('\n' + '='.repeat(60));
        console.log('FASE 1: CARGA INICIAL');
        console.log('='.repeat(60));

        await login(page);
        await saveScreenshot(page, 'e360-01-post-login');

        await navigateToExpediente360(page);
        await saveScreenshot(page, 'e360-02-modulo-cargado');

        // Verificar elementos iniciales
        const initialState = await page.evaluate(() => {
            return {
                hasHeader: !!document.querySelector('.e360-header, [class*="e360"]'),
                hasEmployeeSelector: !!document.querySelector('select, .e360-employee-selector'),
                hasPlaceholder: !!document.querySelector('.e360-placeholder, .placeholder'),
                tabs: document.querySelectorAll('.e360-tab, [data-tab]').length,
                techBadges: document.querySelectorAll('.badge, .e360-tech-badges .badge').length
            };
        });

        console.log('📊 Estado inicial:');
        console.log(`   Header: ${initialState.hasHeader ? '✅' : '❌'}`);
        console.log(`   Selector empleados: ${initialState.hasEmployeeSelector ? '✅' : '❌'}`);
        console.log(`   Tabs: ${initialState.tabs}`);
        console.log(`   Tech badges: ${initialState.techBadges}`);

        // Antes de seleccionar empleado, pueden haber pocos tabs o ninguno
        // Los 13 tabs aparecen después de generar el expediente
        expect(initialState.hasEmployeeSelector).toBe(true);
    });

    test('FASE 2: Selección de empleado y carga de datos', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(180000);

        console.log('\n' + '='.repeat(60));
        console.log('FASE 2: SELECCIÓN DE EMPLEADO');
        console.log('='.repeat(60));

        await login(page);
        await navigateToExpediente360(page);

        const employeeInfo = await selectEmployee(page);
        await saveScreenshot(page, 'e360-03-empleado-seleccionado');

        // Verificar que se cargaron datos
        const dataLoaded = await page.evaluate(() => {
            const hasScoring = document.body.textContent.includes('Score') ||
                              document.body.textContent.includes('Puntaje') ||
                              document.querySelector('[class*="score"]');
            const hasEmployeeName = document.querySelector('.employee-name, .e360-employee-info, h3');
            const hasTabContent = document.querySelector('.e360-tab-content:not(:empty)');

            return {
                hasScoring: !!hasScoring,
                hasEmployeeName: !!hasEmployeeName,
                hasTabContent: !!hasTabContent,
                bodyLength: document.body.textContent.length
            };
        });

        console.log('📊 Datos cargados:');
        console.log(`   Scoring visible: ${dataLoaded.hasScoring ? '✅' : '❌'}`);
        console.log(`   Nombre empleado: ${dataLoaded.hasEmployeeName ? '✅' : '❌'}`);
        console.log(`   Contenido tabs: ${dataLoaded.hasTabContent ? '✅' : '❌'}`);
    });

    test('FASE 3: Verificar los 13 TABS uno por uno', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(300000);

        console.log('\n' + '='.repeat(60));
        console.log('FASE 3: VERIFICACIÓN DE 13 TABS');
        console.log('='.repeat(60));

        await login(page);
        await navigateToExpediente360(page);
        await selectEmployee(page);
        await page.waitForTimeout(3000);

        const tabsToTest = [
            { id: 'overview', name: 'Resumen', icon: 'chart-pie' },
            { id: 'personal', name: 'Personal', icon: 'user-circle' },
            { id: 'laboral', name: 'Laboral', icon: 'briefcase' },
            { id: 'attendance', name: 'Asistencia', icon: 'clock' },
            { id: 'discipline', name: 'Disciplina', icon: 'gavel' },
            { id: 'training', name: 'Capacitación', icon: 'graduation-cap' },
            { id: 'medical', name: 'Médico', icon: 'heartbeat' },
            { id: 'documents', name: 'Documentos', icon: 'folder-open' },
            { id: 'timeline', name: 'Timeline', icon: 'history' },
            { id: 'ai-analysis', name: 'IA', icon: 'robot' },
            { id: 'biometric', name: 'Biométrico', icon: 'brain' },
            { id: 'compatibility', name: 'Reemplazos', icon: 'people-arrows' },
            { id: 'hour-bank', name: 'Banco Horas', icon: 'piggy-bank' }
        ];

        const tabResults = [];

        for (const tab of tabsToTest) {
            console.log(`\n📑 TAB ${tabsToTest.indexOf(tab) + 1}/13: ${tab.name} (${tab.id})`);

            await clickTab(page, tab.id);
            await page.waitForTimeout(1500);

            const analysis = await analyzeTabContent(page, tab.id, tab.name);
            await saveScreenshot(page, `e360-tab-${String(tabsToTest.indexOf(tab) + 1).padStart(2, '0')}-${tab.id}`);

            tabResults.push(analysis);
            dataAnalysis.tabs.push(analysis);

            if (analysis.found) {
                console.log(`   ✅ Tab encontrado`);
                console.log(`   📊 Cards: ${analysis.elements.cards}, Tablas: ${analysis.elements.tables}, Gráficos: ${analysis.elements.charts}`);
                console.log(`   📝 Campos llenos: ${analysis.dataStatus.filledFields}, Vacíos: ${analysis.dataStatus.emptyFields}`);

                if (analysis.dataStatus.hasNoDataMessage) {
                    reportMissingData(tab.name, 'Contenido general', 'MEDIA');
                }
            } else {
                console.log(`   ❌ Tab no encontrado: ${analysis.error}`);
                reportBug('TAB_NOT_FOUND', `Tab ${tab.name} no encontrado`, { tabId: tab.id });
            }
        }

        // Resumen de tabs
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE TABS:');
        const tabsFound = tabResults.filter(t => t.found).length;
        console.log(`   Tabs encontrados: ${tabsFound}/13`);

        expect(tabsFound).toBeGreaterThanOrEqual(10);
    });

    test('FASE 4: Análisis de datos por sección', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(180000);

        console.log('\n' + '='.repeat(60));
        console.log('FASE 4: ANÁLISIS PROFUNDO DE DATOS');
        console.log('='.repeat(60));

        await login(page);
        await navigateToExpediente360(page);
        await selectEmployee(page);
        await page.waitForTimeout(3000);

        // Tab PERSONAL - Análisis detallado
        console.log('\n📋 ANALIZANDO TAB PERSONAL...');
        await clickTab(page, 'personal');
        await page.waitForTimeout(2000);

        const personalData = await page.evaluate(() => {
            const fields = {
                // Datos básicos
                nombre: null,
                apellido: null,
                dni: null,
                cuil: null,
                fechaNacimiento: null,
                edad: null,
                sexo: null,
                estadoCivil: null,
                nacionalidad: null,

                // Contacto
                email: null,
                telefono: null,
                celular: null,
                direccion: null,
                ciudad: null,
                provincia: null,
                codigoPostal: null,

                // Contacto de emergencia
                contactoEmergencia: null,
                telefonoEmergencia: null,
                relacionEmergencia: null,

                // Educación
                nivelEducativo: null,
                titulo: null,
                institucion: null,

                // Grupo familiar
                hijos: null,
                conyuge: null
            };

            // Buscar valores en el DOM
            const content = document.querySelector('#tab-personal, .e360-tab-content:not([style*="none"])');
            if (content) {
                const text = content.textContent;

                // Detectar campos con datos
                Object.keys(fields).forEach(key => {
                    const patterns = {
                        nombre: /nombre[:\s]+([^\n,]+)/i,
                        apellido: /apellido[:\s]+([^\n,]+)/i,
                        dni: /dni[:\s]+(\d+)/i,
                        cuil: /cuil[:\s]+([\d-]+)/i,
                        email: /email[:\s]+([^\s,]+@[^\s,]+)/i,
                        telefono: /tel[éeéfonono]*[:\s]+([\d\s+-]+)/i,
                        direccion: /direcci[óo]n[:\s]+([^\n]+)/i,
                        edad: /edad[:\s]+(\d+)/i
                    };

                    if (patterns[key]) {
                        const match = text.match(patterns[key]);
                        if (match) fields[key] = match[1].trim();
                    }
                });

                // Contar secciones visibles
                const sections = content.querySelectorAll('.card, .section, [class*="section"]');
                fields._sectionsCount = sections.length;
                fields._hasData = text.length > 100;
            }

            return fields;
        });

        console.log('📊 Datos Personales detectados:');
        let filledPersonal = 0;
        let emptyPersonal = 0;

        Object.entries(personalData).forEach(([key, value]) => {
            if (key.startsWith('_')) return;
            if (value) {
                filledPersonal++;
                reportPresentData('Personal', key, value);
                console.log(`   ✅ ${key}: ${value}`);
            } else {
                emptyPersonal++;
                reportMissingData('Personal', key, 'MEDIA');
            }
        });

        console.log(`\n   Total: ${filledPersonal} con datos, ${emptyPersonal} vacíos`);

        // Tab LABORAL - Análisis detallado
        console.log('\n📋 ANALIZANDO TAB LABORAL...');
        await clickTab(page, 'laboral');
        await page.waitForTimeout(2000);

        const laboralData = await page.evaluate(() => {
            const fields = {
                // Cargo y puesto
                cargo: null,
                departamento: null,
                sucursal: null,
                centroCosto: null,

                // Contratación
                fechaIngreso: null,
                antiguedad: null,
                tipoContrato: null,
                modalidad: null,

                // Remuneración
                salarioBasico: null,
                convenio: null,
                categoriaConvenio: null,
                obraSocial: null,

                // Jornada
                horario: null,
                turno: null,
                horasSemanales: null,

                // Jerarquía
                supervisor: null,
                subordinados: null,

                // Historial
                promociones: null,
                cambiosSalario: null
            };

            const content = document.querySelector('#tab-laboral, .e360-tab-content:not([style*="none"])');
            if (content) {
                const text = content.textContent;
                fields._hasData = text.length > 100;
                fields._sectionsCount = content.querySelectorAll('.card, .section').length;

                // Detectar algunos campos
                const match = text.match(/ingreso[:\s]+([\d\/\-]+)/i);
                if (match) fields.fechaIngreso = match[1];

                const deptMatch = text.match(/departamento[:\s]+([^\n,]+)/i);
                if (deptMatch) fields.departamento = deptMatch[1];
            }

            return fields;
        });

        console.log('📊 Datos Laborales detectados:');
        Object.entries(laboralData).forEach(([key, value]) => {
            if (key.startsWith('_')) return;
            if (value) {
                console.log(`   ✅ ${key}: ${value}`);
                reportPresentData('Laboral', key, value);
            } else {
                reportMissingData('Laboral', key, 'ALTA');
            }
        });

        await saveScreenshot(page, 'e360-04-analisis-datos');
    });

    test('FASE 5: Verificar funcionalidades interactivas', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(180000);

        console.log('\n' + '='.repeat(60));
        console.log('FASE 5: FUNCIONALIDADES INTERACTIVAS');
        console.log('='.repeat(60));

        await login(page);
        await navigateToExpediente360(page);
        await selectEmployee(page);
        await page.waitForTimeout(3000);

        // Verificar botones de acción
        const actionButtons = await page.evaluate(() => {
            const buttons = [];
            document.querySelectorAll('button, .btn').forEach(btn => {
                const text = btn.textContent.trim();
                const isVisible = btn.offsetParent !== null;
                const isDisabled = btn.disabled;
                buttons.push({ text: text.substring(0, 30), isVisible, isDisabled });
            });
            return buttons;
        });

        console.log('🔘 Botones de acción encontrados:');
        actionButtons.filter(b => b.isVisible).forEach(btn => {
            console.log(`   ${btn.isDisabled ? '⚪' : '🟢'} ${btn.text}`);
        });

        // Verificar selector de rango de fechas
        const dateRangeExists = await page.evaluate(() => {
            return {
                dateFrom: !!document.querySelector('input[type="date"], #date-from, [name*="from"]'),
                dateTo: !!document.querySelector('input[type="date"], #date-to, [name*="to"]'),
                dateRangeComponent: !!document.querySelector('.date-range, .e360-date-range')
            };
        });

        console.log('\n📅 Selector de fechas:');
        console.log(`   Date From: ${dateRangeExists.dateFrom ? '✅' : '❌'}`);
        console.log(`   Date To: ${dateRangeExists.dateTo ? '✅' : '❌'}`);

        // Verificar exportación PDF
        const exportButton = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                if (btn.textContent.includes('PDF') || btn.textContent.includes('Exportar')) {
                    return btn.textContent.trim();
                }
            }
            const exportBtn = document.querySelector('.btn-export');
            return exportBtn ? exportBtn.textContent.trim() : null;
        });

        console.log(`\n📄 Botón exportar PDF: ${exportButton ? '✅ ' + exportButton : '❌ No encontrado'}`);

        // Verificar comparación de empleados
        const comparisonFeature = await page.evaluate(() => {
            let hasCompareButton = false;
            document.querySelectorAll('button').forEach(btn => {
                if (btn.textContent.includes('Comparar')) hasCompareButton = true;
            });
            return {
                hasCompareButton: hasCompareButton || !!document.querySelector('.btn-compare'),
                hasComparisonList: !!document.querySelector('.comparison-list, #comparison-chips')
            };
        });

        console.log(`\n👥 Comparación empleados: ${comparisonFeature.hasCompareButton ? '✅' : '❌'}`);

        await saveScreenshot(page, 'e360-05-funcionalidades');
    });

    test('FASE 6: Verificar scoring y métricas', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(120000);

        console.log('\n' + '='.repeat(60));
        console.log('FASE 6: SCORING Y MÉTRICAS');
        console.log('='.repeat(60));

        await login(page);
        await navigateToExpediente360(page);
        await selectEmployee(page);
        await page.waitForTimeout(3000);

        // Ir al tab de resumen
        await clickTab(page, 'overview');
        await page.waitForTimeout(2000);

        const scoringData = await page.evaluate(() => {
            const content = document.querySelector('#tab-overview, .e360-tab-content');
            const result = {
                totalScore: null,
                grade: null,
                categories: [],
                kpis: [],
                charts: 0
            };

            if (content) {
                // Buscar score total
                const scoreMatch = content.textContent.match(/(\d{1,3})\s*\/\s*100|score[:\s]+(\d+)/i);
                if (scoreMatch) {
                    result.totalScore = scoreMatch[1] || scoreMatch[2];
                }

                // Buscar grado
                const gradeMatch = content.textContent.match(/grado[:\s]+([A-F][+-]?)/i);
                if (gradeMatch) {
                    result.grade = gradeMatch[1];
                }

                // Contar gráficos
                result.charts = content.querySelectorAll('canvas, .chart, svg').length;

                // Buscar categorías de scoring
                const categoryPatterns = ['asistencia', 'puntualidad', 'disciplina', 'capacitación', 'estabilidad'];
                categoryPatterns.forEach(cat => {
                    const regex = new RegExp(`${cat}[:\\s]+(\\d+)`, 'i');
                    const match = content.textContent.match(regex);
                    if (match) {
                        result.categories.push({ name: cat, score: match[1] });
                    }
                });

                // Buscar KPIs
                const kpiCards = content.querySelectorAll('.kpi, .stat-card, .e360-kpi');
                kpiCards.forEach(kpi => {
                    const label = kpi.querySelector('.label, .title')?.textContent || '';
                    const value = kpi.querySelector('.value, .number')?.textContent || '';
                    if (label || value) {
                        result.kpis.push({ label: label.trim(), value: value.trim() });
                    }
                });
            }

            return result;
        });

        console.log('📊 Scoring detectado:');
        console.log(`   Score Total: ${scoringData.totalScore || 'No encontrado'}`);
        console.log(`   Grado: ${scoringData.grade || 'No encontrado'}`);
        console.log(`   Gráficos: ${scoringData.charts}`);

        if (scoringData.categories.length > 0) {
            console.log('   Categorías:');
            scoringData.categories.forEach(cat => {
                console.log(`      - ${cat.name}: ${cat.score}`);
            });
        }

        if (scoringData.kpis.length > 0) {
            console.log('   KPIs:');
            scoringData.kpis.forEach(kpi => {
                console.log(`      - ${kpi.label}: ${kpi.value}`);
            });
        }

        await saveScreenshot(page, 'e360-06-scoring');
    });

    test('RESUMEN: Generar reporte final y análisis de completitud', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(60000);

        console.log('\n' + '='.repeat(60));
        console.log('📊 REPORTE FINAL - EXPEDIENTE 360°');
        console.log('='.repeat(60));

        await login(page);
        await navigateToExpediente360(page);
        await saveScreenshot(page, 'e360-99-estado-final');

        // Generar reporte JSON
        const finalReport = {
            fecha: new Date().toISOString(),
            modulo: 'Expediente 360°',
            empresa: 'ISI',
            bugsEncontrados: bugsFound.length,
            bugs: bugsFound,
            dataAnalysis: {
                tabsAnalyzados: dataAnalysis.tabs.length,
                camposFaltantes: dataAnalysis.missingData.length,
                camposPresentes: dataAnalysis.presentData.length,
                missingDataDetails: dataAnalysis.missingData,
                recommendations: []
            }
        };

        // Generar recomendaciones
        const criticalMissing = dataAnalysis.missingData.filter(d => d.importance === 'ALTA');
        const mediumMissing = dataAnalysis.missingData.filter(d => d.importance === 'MEDIA');

        if (criticalMissing.length > 0) {
            finalReport.dataAnalysis.recommendations.push({
                priority: 'ALTA',
                message: `Hay ${criticalMissing.length} campos críticos sin datos`,
                fields: criticalMissing.map(d => `${d.section}.${d.field}`)
            });
        }

        if (mediumMissing.length > 0) {
            finalReport.dataAnalysis.recommendations.push({
                priority: 'MEDIA',
                message: `Hay ${mediumMissing.length} campos de prioridad media sin datos`,
                fields: mediumMissing.map(d => `${d.section}.${d.field}`)
            });
        }

        // Guardar reporte
        fs.writeFileSync(
            path.join(SCREENSHOTS_DIR, 'reporte-expediente360.json'),
            JSON.stringify(finalReport, null, 2)
        );

        console.log('\n📊 RESUMEN:');
        console.log(`   Bugs encontrados: ${bugsFound.length}`);
        console.log(`   Campos faltantes: ${dataAnalysis.missingData.length}`);
        console.log(`   Campos presentes: ${dataAnalysis.presentData.length}`);

        if (bugsFound.length > 0) {
            console.log('\n🐛 BUGS DETECTADOS:');
            bugsFound.forEach((bug, i) => {
                console.log(`   ${i + 1}. [${bug.category}] ${bug.description}`);
            });
        }

        if (dataAnalysis.missingData.length > 0) {
            console.log('\n⚠️ DATOS FALTANTES PARA 100%:');
            const bySection = {};
            dataAnalysis.missingData.forEach(d => {
                if (!bySection[d.section]) bySection[d.section] = [];
                bySection[d.section].push(d.field);
            });
            Object.entries(bySection).forEach(([section, fields]) => {
                console.log(`   ${section}:`);
                fields.slice(0, 5).forEach(f => console.log(`      - ${f}`));
                if (fields.length > 5) console.log(`      ... y ${fields.length - 5} más`);
            });
        }

        console.log(`\n📄 Reporte guardado en: ${path.join(SCREENSHOTS_DIR, 'reporte-expediente360.json')}`);
    });
});
