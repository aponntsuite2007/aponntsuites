/**
 * Test para ver estructura EXACTA del discovery
 */
const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');
const database = require('../src/config/database');

(async () => {
    const orchestrator = new Phase4TestOrchestrator({
        headless: false,
        slowMo: 100
    }, database.sequelize);

    try {
        await orchestrator.start();

        // Login
        await orchestrator.login('isi', 'admin', 'admin123');

        console.log('\n🔍 DISCOVERY TEST - Módulo: users\n');

        // Navegar al módulo
        await orchestrator.navigateToModule('users');
        await orchestrator.wait(2000);

        // Click en botón "Agregar Usuario" para abrir modal
        const modalOpened = await orchestrator.page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.textContent.includes('Agregar Usuario'));
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });

        if (!modalOpened) {
            console.error('❌ No se pudo abrir modal de crear usuario');
            process.exit(1);
        }

        await orchestrator.wait(2000);

        // Descubrir estructura del modal
        const discovery = await orchestrator.discoverModuleStructure('users');

        console.log('═'.repeat(80));
        console.log('DISCOVERY STRUCTURE:');
        console.log('═'.repeat(80));
        console.log(JSON.stringify(discovery, null, 2));
        console.log('═'.repeat(80));

        await orchestrator.stop();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        await orchestrator.stop();
        process.exit(1);
    }
})();
