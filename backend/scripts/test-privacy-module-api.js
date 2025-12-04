/**
 * Script para verificar que privacy-regulations aparezca en la API de módulos
 */
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 9998,
    path: '/api/modules/active?company_id=11&panel=empresa&role=admin',
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);

            console.log('=== API /api/modules/active Response ===\n');
            console.log('Success:', json.success);
            console.log('Total modules:', json.total_modules);
            console.log('Source:', json.source);

            // Buscar privacy-regulations
            const privacyModule = json.modules?.find(m => m.module_key === 'privacy-regulations');

            if (privacyModule) {
                console.log('\n=== PRIVACY-REGULATIONS MODULE FOUND ===');
                console.log('Name:', privacyModule.name);
                console.log('Frontend file:', privacyModule.frontend_file);
                console.log('Init function:', privacyModule.init_function);
                console.log('Category:', privacyModule.category);
                console.log('Icon:', privacyModule.icon);
            } else {
                console.log('\n NOT FOUND: privacy-regulations');
                console.log('Available modules:');
                json.modules?.slice(0, 10).forEach(m => {
                    console.log(`  - ${m.module_key}: ${m.name}`);
                });
                console.log('  ... and', json.modules?.length - 10, 'more');
            }

        } catch (e) {
            console.error('Parse error:', e.message);
            console.log('Raw response:', data.substring(0, 500));
        }
    });
});

req.on('error', (e) => {
    console.error('Request error:', e.message);
});

req.end();
