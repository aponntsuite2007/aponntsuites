/**
 * DIAGNÓSTICO DE MÓDULOS RRHH
 * Verifica qué botones existen en cada módulo
 */

const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const MODULES = [
    'users',
    'vacation-management',
    'training-management',
    'sanctions-management',
    'job-postings',
    'organizational-structure'
];

async function main() {
    console.log('\n🔍 DIAGNÓSTICO DE MÓDULOS RRHH\n');

    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1400, height: 900 }
    });

    const page = await browser.newPage();
    page.on('dialog', async d => await d.accept());

    try {
        // LOGIN
        console.log('🔐 Login...');
        await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle2' });
        await sleep(2000);
        await page.select('#companySelect', 'isi');
        await sleep(2000);
        await page.evaluate(() => {
            document.getElementById('userInput').disabled = false;
            document.getElementById('userInput').value = 'admin';
            document.getElementById('passwordInput').disabled = false;
            document.getElementById('passwordInput').value = 'admin123';
            document.getElementById('multiTenantLoginForm').dispatchEvent(new Event('submit', { bubbles: true }));
        });
        await sleep(5000);
        console.log('✅ Login OK\n');

        // DIAGNOSTICAR CADA MÓDULO
        for (const moduleId of MODULES) {
            console.log(`\n${'═'.repeat(60)}`);
            console.log(`📦 ${moduleId}`);
            console.log(`${'═'.repeat(60)}`);

            // Cargar módulo
            await page.evaluate((id) => {
                if (window.showTab) window.showTab(id);
                else if (window.showModuleContent) window.showModuleContent(id);
            }, moduleId);
            await sleep(3000);

            // Diagnóstico
            const info = await page.evaluate(() => {
                const mainContent = document.getElementById('mainContent');
                const contentText = mainContent?.innerText?.substring(0, 200) || 'NO CONTENT';

                // Buscar todos los botones
                const allButtons = [];
                document.querySelectorAll('button, .btn, .ve-btn, a.btn').forEach(btn => {
                    const text = btn.textContent.trim().substring(0, 40);
                    const className = btn.className;
                    const onclick = btn.getAttribute('onclick') || '';
                    if (text && text.length < 40) {
                        allButtons.push({
                            text,
                            class: className.substring(0, 50),
                            onclick: onclick.substring(0, 60)
                        });
                    }
                });

                // Buscar botones específicos de crear
                const createButtons = allButtons.filter(b =>
                    b.text.toLowerCase().includes('nuevo') ||
                    b.text.toLowerCase().includes('nueva') ||
                    b.text.toLowerCase().includes('agregar') ||
                    b.text.toLowerCase().includes('crear') ||
                    b.text.includes('+')
                );

                // Containers encontrados
                const containers = [];
                ['#mainContent', '.vacation-enterprise', '.users-container', '.training-container']
                    .forEach(sel => {
                        const el = document.querySelector(sel);
                        if (el && el.offsetHeight > 0) {
                            containers.push(sel);
                        }
                    });

                return {
                    content: contentText,
                    totalButtons: allButtons.length,
                    createButtons,
                    containers
                };
            });

            console.log(`📄 Content preview: ${info.content.substring(0, 100)}...`);
            console.log(`🔘 Total buttons: ${info.totalButtons}`);
            console.log(`📦 Containers activos: ${info.containers.join(', ')}`);
            console.log(`\n🎯 Botones de crear encontrados:`);

            if (info.createButtons.length === 0) {
                console.log('   ⚠️ NINGUNO');
            } else {
                info.createButtons.forEach(b => {
                    console.log(`   • "${b.text}" [onclick: ${b.onclick || 'none'}]`);
                });
            }
        }

        console.log('\n\n✅ Diagnóstico completado\n');
        await browser.close();

    } catch (err) {
        console.error('❌ ERROR:', err);
        await browser.close();
    }
}

main();
