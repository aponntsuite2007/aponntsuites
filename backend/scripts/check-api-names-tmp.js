const https = require('https');

const url = 'https://www.aponnt.com/api/modules/active?company_id=4&panel=empresa&role=admin';

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const target = ['art-management', 'training-management', 'legal-dashboard',
                'vacation-management', 'payroll-liquidation', 'medical', 'marketplace'];

            console.log('=== VERIFICACION DE NOMBRES ===\n');
            target.forEach(key => {
                const mod = json.modules.find(m => m.module_key === key);
                if (mod) {
                    console.log(key + ':');
                    console.log('  name: "' + mod.name + '"');
                    console.log('  icon: "' + mod.icon + '"\n');
                } else {
                    console.log(key + ': NOT FOUND\n');
                }
            });
        } catch (e) {
            console.error('Error parsing:', e.message);
        }
    });
}).on('error', e => console.error('Request error:', e.message));
