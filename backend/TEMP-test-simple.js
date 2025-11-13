require('dotenv').config();
const Phase4TestOrchestrator = require('./src/auditor/core/Phase4TestOrchestrator');
const database = require('./src/config/database');

async function testSimple() {
    console.log('\n🚀 TEST FINAL - fillAllTabsData()\n');
    const orchestrator = new Phase4TestOrchestrator(
        { baseUrl: 'http://localhost:9998', headless: false, slowMo: 50, timeout: 30000 },
        database
    );

    try {
        await orchestrator.start();
        await orchestrator.login('isi', 'soporte', 'admin123');
        
        const [users] = await database.sequelize.query(`SELECT user_id FROM users WHERE company_id = 11 ORDER BY user_id DESC LIMIT 1`);
        const userId = users[0].user_id;
        console.log(`✅ Usuario: ${userId}`);

        // NAVEGAR A USERS
        console.log('📍 Navegando a módulo users...');
        await orchestrator.page.evaluate(() => { if (typeof showUsersContent === 'function') showUsersContent(); });
        await orchestrator.wait(3000);

        // EJECUTAR fillAllTabsData()
        console.log('\n🎯 EJECUTANDO fillAllTabsData()...\n');
        const results = await orchestrator.fillAllTabsData(userId);

        // RESULTADOS
        console.log('\n' + '='.repeat(80));
        console.log('✅✅✅ RESULTADOS fillAllTabsData() ✅✅✅');
        console.log('='.repeat(80));
        console.log(`Success: ${results.success}`);
        console.log(`Campos llenados: ${results.filledFields}/${results.totalFields}`);
        console.log(`\nTabs procesados: ${results.tabsProcessed.length}/9\n`);
        results.tabsProcessed.forEach((tab, i) => {
            console.log(`  ${i+1}. ${tab.name}: ${tab.filledFields}/${tab.totalFields} campos`);
        });
        console.log('\n🎉 COMPLETADO - Ctrl+C para salir\n');
        await new Promise(() => {});
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    } finally {
        await orchestrator.stop();
    }
}
testSimple();
