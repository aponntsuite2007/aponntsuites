/**
 * Script para ejecutar el UI Deep Crawler
 *
 * Uso:
 *   node scripts/run-ui-crawler.js                    # Crawl todos los módulos
 *   node scripts/run-ui-crawler.js users              # Crawl solo users
 *   node scripts/run-ui-crawler.js users,departments  # Crawl específicos
 */

const UIDeepCrawler = require('../src/brain/crawlers/UIDeepCrawler');

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           UI DEEP CRAWLER - Descubrimiento Profundo        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    // Parse command line arguments
    const args = process.argv.slice(2);
    let modules = null;

    if (args.length > 0) {
        modules = args[0].split(',').map(m => m.trim());
        console.log(`\n🎯 Módulos a crawlear: ${modules.join(', ')}`);
    } else {
        console.log('\n🎯 Crawleando todos los módulos principales');
    }

    const crawler = new UIDeepCrawler({
        headless: true,  // Cambiar a false para ver el browser
        slowMo: 100,      // Más lento para mejor captura
        credentials: {
            companySlug: 'isi',
            identifier: 'admin',
            password: 'admin123'
        }
    });

    try {
        const result = await crawler.crawlAll(modules);

        if (result.success) {
            console.log('\n✅ Crawl completado exitosamente');
            console.log('\n📁 Archivos generados:');
            console.log('   • src/brain/knowledge/ui/ui-discovery.json');
            console.log('   • src/brain/knowledge/screenshots/*.png');
            console.log('   • modules-registry.json actualizado');
        } else {
            console.log('\n❌ Crawl falló:', result.error);
        }

        process.exit(result.success ? 0 : 1);

    } catch (error) {
        console.error('\n❌ Error fatal:', error.message);
        process.exit(1);
    }
}

main();
