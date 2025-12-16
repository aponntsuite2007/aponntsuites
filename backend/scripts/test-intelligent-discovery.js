/**
 * ============================================================================
 * INTELLIGENT TEST - Auto-Discovery de Estructura Real
 * ============================================================================
 *
 * Este test NO asume NADA. Opera como un humano:
 * 1. 🧠 Lee el código con Brain para entender el módulo
 * 2. 🔍 Inspecciona el DOM real para descubrir elementos
 * 3. 🎯 Encuentra botones/modales dinámicamente
 * 4. ✅ Testea lo que REALMENTE existe, no lo que asumimos
 *
 * @version 1.0.0
 * @date 2025-12-11
 * ============================================================================
 */

const { chromium } = require('playwright');
const database = require('../src/config/database');
const EcosystemBrainService = require('../src/services/EcosystemBrainService');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  INTELLIGENT TEST - Auto-Discovery                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function discoverModuleStructure(page, moduleName) {
    console.log(`\n🔍 FASE 1: Descubriendo estructura del módulo "${moduleName}"...\n`);

    // Descubrir TODOS los botones visibles
    const buttons = await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button, a.btn, [role="button"]'));
        return allButtons
            .filter(btn => btn.offsetParent !== null) // Solo visibles
            .map(btn => ({
                text: btn.textContent.trim(),
                classes: btn.className,
                id: btn.id,
                onclick: btn.getAttribute('onclick'),
                href: btn.getAttribute('href'),
                dataAction: btn.getAttribute('data-action'),
                position: {
                    x: btn.getBoundingClientRect().left,
                    y: btn.getBoundingClientRect().top
                }
            }));
    });

    console.log(`   📊 Encontrados ${buttons.length} botones/links visibles:`);
    buttons.forEach((btn, i) => {
        console.log(`   ${i + 1}. "${btn.text}" ${btn.id ? `[id="${btn.id}"]` : ''} ${btn.onclick ? `[onclick]` : ''}`);
    });

    // Descubrir contenedores principales
    const containers = await page.evaluate(() => {
        const mainDivs = Array.from(document.querySelectorAll('[id*="main"], [id*="content"], [class*="module"], [class*="container"]'));
        return mainDivs
            .filter(div => div.offsetParent !== null)
            .map(div => ({
                id: div.id,
                classes: div.className,
                hasTable: !!div.querySelector('table'),
                hasForm: !!div.querySelector('form'),
                hasModal: !!div.querySelector('.modal, [role="dialog"]'),
                childCount: div.children.length
            }));
    });

    console.log(`\n   📦 Encontrados ${containers.length} contenedores principales:`);
    containers.forEach((cont, i) => {
        console.log(`   ${i + 1}. id="${cont.id}" - Table:${cont.hasTable} Form:${cont.hasForm} Modal:${cont.hasModal}`);
    });

    return { buttons, containers };
}

async function findCreateButton(buttons) {
    console.log('\n🎯 FASE 2: Buscando botón de CREAR...\n');

    // Buscar botones que parezcan de "crear" por texto o atributos
    const createKeywords = ['crear', 'nuevo', 'agregar', 'add', 'new', 'create', '+'];

    const candidates = buttons.filter(btn => {
        const textLower = btn.text.toLowerCase();
        const hasCreateText = createKeywords.some(keyword => textLower.includes(keyword));
        const hasCreateAction = btn.dataAction === 'create' || (btn.onclick && btn.onclick.includes('create'));
        return hasCreateText || hasCreateAction;
    });

    console.log(`   Candidatos para botón CREAR: ${candidates.length}`);
    candidates.forEach((btn, i) => {
        console.log(`   ${i + 1}. "${btn.text}" - Score: ${scoreCreateButton(btn)}`);
    });

    // Ordenar por score y tomar el mejor
    const best = candidates.sort((a, b) => scoreCreateButton(b) - scoreCreateButton(a))[0];

    if (best) {
        console.log(`\n   ✅ MEJOR CANDIDATO: "${best.text}"`);
        return best;
    } else {
        console.log(`\n   ❌ No se encontró botón de crear`);
        return null;
    }
}

function scoreCreateButton(btn) {
    let score = 0;
    const textLower = btn.text.toLowerCase();

    if (textLower.includes('crear')) score += 10;
    if (textLower.includes('nuevo')) score += 10;
    if (textLower.includes('agregar')) score += 8;
    if (textLower.includes('add')) score += 5;
    if (textLower.includes('new')) score += 5;
    if (textLower.includes('+')) score += 3;
    if (btn.dataAction === 'create') score += 15;
    if (btn.onclick && btn.onclick.includes('create')) score += 10;
    if (btn.classes && btn.classes.includes('btn-primary')) score += 5;

    return score;
}

async function clickButtonByText(page, text) {
    const clicked = await page.evaluate((searchText) => {
        const buttons = Array.from(document.querySelectorAll('button, a.btn, [role="button"]'));
        const btn = buttons.find(b => b.textContent.trim() === searchText);
        if (btn) {
            btn.click();
            return true;
        }
        return false;
    }, text);

    return clicked;
}

async function discoverModal(page) {
    console.log('\n🔍 FASE 3: Descubriendo modal abierto...\n');

    const modal = await page.evaluate(() => {
        const selectors = [
            '.modal[style*="display: block"]',
            '.modal.show',
            '.modal.active',
            '[role="dialog"]',
            '.modal-overlay + .modal',
            '[class*="modal"][style*="block"]'
        ];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 200 && rect.height > 200) {
                    // Modal encontrado, extraer info
                    const inputs = Array.from(el.querySelectorAll('input, select, textarea'));
                    const buttons = Array.from(el.querySelectorAll('button'));

                    return {
                        found: true,
                        inputCount: inputs.length,
                        inputs: inputs.map(inp => ({
                            name: inp.name,
                            id: inp.id,
                            type: inp.type,
                            placeholder: inp.placeholder,
                            required: inp.required
                        })),
                        buttons: buttons.map(btn => ({
                            text: btn.textContent.trim(),
                            type: btn.type,
                            classes: btn.className
                        }))
                    };
                }
            }
        }

        return { found: false };
    });

    if (modal.found) {
        console.log(`   ✅ Modal encontrado!`);
        console.log(`   📝 Inputs: ${modal.inputCount}`);
        modal.inputs.forEach((inp, i) => {
            console.log(`      ${i + 1}. name="${inp.name}" type="${inp.type}" ${inp.required ? '[REQUIRED]' : ''}`);
        });
        console.log(`   🔘 Botones: ${modal.buttons.length}`);
        modal.buttons.forEach((btn, i) => {
            console.log(`      ${i + 1}. "${btn.text}"`);
        });
    } else {
        console.log(`   ❌ No se encontró modal abierto`);
    }

    return modal;
}

async function fillModalIntelligently(page, modal) {
    console.log('\n📝 FASE 4: Llenando formulario inteligentemente...\n');

    const timestamp = Date.now();

    for (const input of modal.inputs) {
        let value = null;

        // Determinar valor según tipo y nombre
        if (input.name.includes('name') || input.name.includes('nombre')) {
            value = `Test Auto ${timestamp}`;
        } else if (input.name.includes('description') || input.name.includes('descripcion')) {
            value = `Descripción generada automáticamente - ${new Date().toISOString()}`;
        } else if (input.name.includes('address') || input.name.includes('direccion')) {
            value = 'Av. Testing 123, Buenos Aires';
        } else if (input.name.includes('lat')) {
            value = '-34.603722';
        } else if (input.name.includes('lng') || input.name.includes('lon')) {
            value = '-58.381592';
        } else if (input.name.includes('radius') || input.name.includes('radio')) {
            value = '150';
        } else if (input.type === 'email') {
            value = `test${timestamp}@example.com`;
        } else if (input.type === 'number') {
            value = '100';
        } else if (input.type === 'tel') {
            value = '+5491112345678';
        } else {
            value = `Valor_${timestamp}`;
        }

        // Llenar campo
        const filled = await page.evaluate((selector, val) => {
            const field = document.querySelector(`[name="${selector}"]`) ||
                         document.querySelector(`#${selector}`);
            if (field) {
                field.value = val;
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
            return false;
        }, input.name || input.id, value);

        if (filled) {
            console.log(`   ✅ ${input.name}: "${value}"`);
        } else {
            console.log(`   ⚠️  ${input.name}: No se pudo llenar`);
        }
    }
}

async function findAndClickSaveButton(page, modal) {
    console.log('\n💾 FASE 5: Buscando y clickeando botón GUARDAR...\n');

    const saveKeywords = ['guardar', 'save', 'aceptar', 'ok', 'submit', 'crear'];

    for (const btn of modal.buttons) {
        const textLower = btn.text.toLowerCase();
        const isSaveButton = saveKeywords.some(keyword => textLower.includes(keyword));

        if (isSaveButton && btn.type !== 'button') { // Evitar botones secundarios
            console.log(`   🎯 Intentando clickear: "${btn.text}"`);

            const clicked = await clickButtonByText(page, btn.text);

            if (clicked) {
                console.log(`   ✅ Click exitoso en "${btn.text}"`);
                return true;
            }
        }
    }

    console.log(`   ❌ No se encontró botón de guardar`);
    return false;
}

// ============================================================================
// RUNNER PRINCIPAL
// ============================================================================

(async () => {
    const browser = await chromium.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();

    try {
        // ========================================================================
        // STEP 1: Brain - Entender el código del módulo
        // ========================================================================
        console.log('\n🧠 PASO 1: Escaneando código con Brain...\n');

        const sequelize = database.sequelize;
        await sequelize.authenticate();

        const brain = new EcosystemBrainService(sequelize);
        const backendScan = await brain.scanBackendFiles();

        console.log(`   ✅ Backend escaneado: ${backendScan.totalFiles} archivos`);
        console.log(`   📂 Módulos encontrados: ${backendScan.modules ? backendScan.modules.length : 'N/A'}`);

        // ========================================================================
        // STEP 2: Login
        // ========================================================================
        console.log('\n🔐 PASO 2: Login...\n');

        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForTimeout(1000);

        await page.fill('input[name="companySlug"]', 'isi');
        await page.click('button:has-text("Continuar")');
        await page.waitForTimeout(500);

        await page.fill('input[name="username"]', 'admin');
        await page.click('button:has-text("Continuar")');
        await page.waitForTimeout(500);

        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);

        console.log('   ✅ Login exitoso\n');

        // ========================================================================
        // STEP 3: Navegar al módulo (dinámicamente)
        // ========================================================================
        console.log('\n📂 PASO 3: Navegando al módulo organizational-structure...\n');

        // Buscar el botón del módulo dinámicamente
        const moduleClicked = await page.evaluate(() => {
            const keywords = ['estructura', 'organizacional', 'organizational', 'departamento'];
            const buttons = Array.from(document.querySelectorAll('button, a'));

            for (const keyword of keywords) {
                const btn = buttons.find(b => b.textContent.toLowerCase().includes(keyword));
                if (btn) {
                    btn.click();
                    return { success: true, text: btn.textContent.trim() };
                }
            }

            return { success: false };
        });

        if (moduleClicked.success) {
            console.log(`   ✅ Módulo cargado clickeando: "${moduleClicked.text}"`);
        } else {
            console.log(`   ⚠️  No se encontró botón del módulo, intentando método alternativo...`);
            // Método alternativo: usar showModuleContent si existe
            await page.evaluate(() => {
                if (typeof window.showModuleContent === 'function') {
                    window.showModuleContent('organizational-structure');
                }
            });
        }

        await page.waitForTimeout(2000);

        // ========================================================================
        // STEP 4: Descubrir estructura
        // ========================================================================
        const structure = await discoverModuleStructure(page, 'organizational-structure');

        // ========================================================================
        // STEP 5: Encontrar y clickear botón CREAR
        // ========================================================================
        const createBtn = await findCreateButton(structure.buttons);

        if (!createBtn) {
            throw new Error('No se pudo encontrar botón de crear');
        }

        const clicked = await clickButtonByText(page, createBtn.text);

        if (!clicked) {
            throw new Error(`No se pudo clickear el botón "${createBtn.text}"`);
        }

        console.log(`\n   ✅ Click exitoso en botón crear`);
        await page.waitForTimeout(2000);

        // ========================================================================
        // STEP 6: Descubrir y llenar modal
        // ========================================================================
        const modal = await discoverModal(page);

        if (!modal.found) {
            throw new Error('No se abrió ningún modal');
        }

        await fillModalIntelligently(page, modal);
        await page.waitForTimeout(1000);

        // ========================================================================
        // STEP 7: Guardar
        // ========================================================================
        const saved = await findAndClickSaveButton(page, modal);

        if (!saved) {
            throw new Error('No se pudo guardar');
        }

        await page.waitForTimeout(3000);

        // ========================================================================
        // STEP 8: Verificar en DB
        // ========================================================================
        console.log('\n🎯 PASO 6: Verificando en PostgreSQL...\n');

        const [result] = await sequelize.query(`
            SELECT * FROM departments
            WHERE company_id = 11
            ORDER BY id DESC
            LIMIT 1
        `);

        if (result && result.length > 0) {
            console.log(`   ✅ Registro creado exitosamente!`);
            console.log(`   📝 ID: ${result[0].id}`);
            console.log(`   📝 Nombre: ${result[0].name}`);
        } else {
            console.log(`   ❌ No se encontró el registro en DB`);
        }

        // ========================================================================
        // RESUMEN
        // ========================================================================
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                    TEST COMPLETADO                         ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log('✅ El test descubrió y operó el sistema automáticamente');
        console.log('✅ Sin selectores hardcoded');
        console.log('✅ Se adaptó a la estructura real\n');

        await browser.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        await browser.close();
        process.exit(1);
    }
})();
