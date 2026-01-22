/**
 * DEBUG - UPDATE SECTOR
 * Tests why sector update is not working
 */
const { chromium } = require('playwright');

(async () => {
    console.log('='.repeat(80));
    console.log('DEBUG - UPDATE SECTOR');
    console.log('='.repeat(80));

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    // Monitor ALL API calls
    const apiCalls = [];
    page.on('request', r => {
        if (r.url().includes('/api/')) {
            apiCalls.push({
                time: new Date().toISOString(),
                method: r.method(),
                url: r.url(),
                postData: r.postData()
            });
        }
    });

    page.on('response', async r => {
        if (r.url().includes('/api/')) {
            const method = r.request().method();
            const status = r.status();
            console.log(`  📡 ${method} ${status}: ${r.url().split('/api/')[1]?.substring(0, 80)}`);

            if (status >= 400) {
                try {
                    const body = await r.text();
                    console.log(`     ERROR: ${body.substring(0, 300)}`);
                } catch {}
            }
        }
    });

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`  🔴 CONSOLE: ${msg.text().substring(0, 200)}`);
        }
    });

    try {
        // LOGIN
        console.log('\n▶ LOGIN');
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForSelector('#companySelect', { timeout: 15000 });
        await page.selectOption('#companySelect', 'isi');
        await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
        await page.fill('#userInput', 'admin');
        await page.fill('#passwordInput', 'admin123');
        await page.evaluate(() => {
            document.getElementById('loginButton').disabled = false;
            document.getElementById('loginButton').click();
        });
        await page.waitForTimeout(5000);
        console.log('  ✓ OK');

        // NAVEGAR
        await page.click('text=Estructura Organizacional');
        await page.waitForTimeout(4000);

        // GO TO SECTORS
        await page.evaluate(() => OrgEngine.showTab('sectors'));
        await page.waitForTimeout(3000);

        // Check if there are existing sectors
        const sectorCount = await page.evaluate(() => OrgState.sectors?.length || 0);
        console.log(`\n▶ SECTORES EXISTENTES: ${sectorCount}`);

        if (sectorCount === 0) {
            console.log('  ⚠️ No hay sectores, creando uno primero...');
            await page.evaluate(() => {
                const btn = document.querySelector('button.org-btn-primary');
                if (btn && btn.textContent.includes('Nuevo Sector')) btn.click();
            });
            await page.waitForTimeout(2000);

            await page.evaluate(() => {
                const form = document.getElementById('org-sector-form');
                if (!form) return;

                const deptSel = form.querySelector('select[name="department_id"]');
                if (deptSel && deptSel.options.length > 1) {
                    deptSel.value = deptSel.options[1].value;
                }

                const name = form.querySelector('input[name="name"]');
                if (name) name.value = 'TEST_SECTOR_FOR_UPDATE';
            });

            await page.evaluate(() => {
                const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Crear Sector'));
                if (btn) btn.click();
            });
            await page.waitForTimeout(3000);
        }

        // AHORA EDITAR EL PRIMER SECTOR
        console.log('\n▶ INTENTANDO EDITAR SECTOR...');

        // Get first sector data
        const firstSector = await page.evaluate(() => OrgState.sectors?.[0] || null);
        console.log('  First sector:', JSON.stringify(firstSector, null, 2));

        if (!firstSector) {
            console.log('  ❌ No hay sectores para editar');
            await browser.close();
            return;
        }

        console.log(`  ID del sector: ${firstSector.id}`);

        // Clear API calls history
        apiCalls.length = 0;

        // Click edit button
        console.log('\n▶ CLICK EN BOTÓN EDITAR');
        const editBtnExists = await page.evaluate((sectorId) => {
            const btn = document.querySelector(`button[onclick*="openSectorModal(${sectorId})"]`);
            if (btn) {
                console.log('Found edit button, clicking...');
                btn.click();
                return true;
            }
            return false;
        }, firstSector.id);

        console.log(`  Edit button found: ${editBtnExists}`);
        await page.waitForTimeout(2000);

        // Check if modal is open
        const modalState = await page.evaluate(() => {
            const modal = document.getElementById('org-modal');
            if (!modal) return { exists: false };

            const form = document.getElementById('org-sector-form');
            if (!form) return { exists: true, hasForm: false };

            const formData = Object.fromEntries(new FormData(form).entries());
            return {
                exists: true,
                hasForm: true,
                formData
            };
        });

        console.log('  Modal state:', JSON.stringify(modalState, null, 2));

        if (!modalState.exists || !modalState.hasForm) {
            console.log('  ❌ Modal no se abrió correctamente');
            await browser.close();
            return;
        }

        // Modify the name
        const newName = 'UPDATED_SECTOR_' + Date.now().toString().slice(-6);
        console.log(`\n▶ CAMBIANDO NOMBRE A: ${newName}`);

        await page.evaluate((newName) => {
            const form = document.getElementById('org-sector-form');
            const nameInput = form.querySelector('input[name="name"]');
            if (nameInput) {
                nameInput.value = newName;
                nameInput.dispatchEvent(new Event('input', {bubbles: true}));
            }
        }, newName);

        // Check form data before save
        const formDataBeforeSave = await page.evaluate(() => {
            const form = document.getElementById('org-sector-form');
            return Object.fromEntries(new FormData(form).entries());
        });
        console.log('  Form data before save:', JSON.stringify(formDataBeforeSave));

        // Click save button
        console.log('\n▶ CLICK EN GUARDAR CAMBIOS');
        await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')];
            const saveBtn = btns.find(b => b.textContent.includes('Guardar Cambios'));
            if (saveBtn) {
                console.log('Found save button:', saveBtn.textContent);
                saveBtn.click();
            } else {
                console.log('Save button NOT found!');
                console.log('Available buttons:', btns.map(b => b.textContent));
            }
        });

        await page.waitForTimeout(5000);

        // Log API calls made
        console.log('\n▶ API CALLS REALIZADOS:');
        apiCalls.forEach((call, i) => {
            console.log(`  ${i + 1}. ${call.method} ${call.url.split('/api/')[1] || call.url}`);
            if (call.postData) {
                console.log(`     DATA: ${call.postData.substring(0, 200)}`);
            }
        });

        // Check if update was called
        const putCalls = apiCalls.filter(c => c.method === 'PUT');
        console.log(`\n▶ PUT CALLS: ${putCalls.length}`);

        if (putCalls.length === 0) {
            console.log('  ❌ NO SE HIZO NINGÚN PUT REQUEST!');

            // Check for errors in OrgAPI
            console.log('\n▶ DIAGNOSTICANDO...');
            const diagResult = await page.evaluate(() => {
                try {
                    // Check if OrgAPI.updateSector exists
                    if (typeof OrgAPI.updateSector !== 'function') {
                        return { error: 'OrgAPI.updateSector no es una función' };
                    }

                    // Check if OrgEngine.saveSector exists
                    if (typeof OrgEngine.saveSector !== 'function') {
                        return { error: 'OrgEngine.saveSector no es una función' };
                    }

                    return { ok: true, message: 'Functions exist' };
                } catch (e) {
                    return { error: e.message };
                }
            });
            console.log('  Diag:', JSON.stringify(diagResult));
        }

        await page.screenshot({ path: 'debug-update-sector-result.png' });

    } catch (error) {
        console.log('\nERROR:', error.message);
        console.log(error.stack);
        await page.screenshot({ path: 'debug-update-sector-error.png' });
    }

    await browser.close();
    console.log('\n' + '='.repeat(80));
    console.log('FIN DEBUG');
    console.log('='.repeat(80));
})();
