/**
 * TEST FINAL DE ENDPOINTS - Verifica todos los módulos del sistema
 */
const axios = require('axios');

const MODULES = {
  'departments': { path: '/api/v1/departments', wrapper: 'departments' },
  'users': { path: '/api/v1/users', wrapper: 'users' },
  'shifts': { path: '/api/v1/shifts', wrapper: 'shifts' },
  'kiosks': { path: '/api/kiosks', wrapper: null },
  'attendance': { path: '/api/v1/attendance', wrapper: 'data' },
  'branches': { path: '/api/v1/branches', wrapper: null },
  'sanctions': { path: '/api/v1/sanctions', wrapper: 'sanctions' },
  'visitors': { path: '/api/v1/visitors', wrapper: 'visitors' },
  'notifications': { path: '/api/v1/notifications', wrapper: 'notifications' },
  'biometric-consents': { path: '/api/v1/biometric/consents', wrapper: 'consents' },
  'positions': { path: '/api/v1/organizational/positions?company_id=1', wrapper: 'data' },
  'training': { path: '/api/v1/trainings', wrapper: 'trainings' },
  'job-postings': { path: '/api/job-postings/offers', wrapper: 'offers' },
  'support-tickets': { path: '/api/support/v2/tickets', wrapper: 'tickets' },
  'logistics-warehouses': { path: '/api/logistics/warehouses', wrapper: 'data' },
  'logistics-shipments': { path: '/api/logistics/shipments', wrapper: 'data' },
  'facturacion': { path: '/api/siac/facturacion/facturas', wrapper: 'facturas' },
  'engineering-metadata': { path: '/api/engineering/metadata', wrapper: 'data' },
  'location-current': { path: '/api/v1/location/current', wrapper: 'data' },
  'location-branches': { path: '/api/v1/location/branches', wrapper: 'data' }
};

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:9998/api/v1/auth/login', {
      identifier: 'administrador',
      password: 'admin123',
      companySlug: 'aponnt-empresa-demo'
    });
    const token = loginRes.data.token;
    console.log('Login OK\n');

    let passed = 0, failed = 0;

    for (const [name, config] of Object.entries(MODULES)) {
      try {
        const res = await axios.get('http://localhost:9998' + config.path, {
          headers: { Authorization: 'Bearer ' + token }
        });

        let data = res.data;
        if (config.wrapper && data[config.wrapper]) {
          data = data[config.wrapper];
        }

        const hasData = Array.isArray(data) || (data && Object.keys(data).length > 0);
        console.log(`[OK] ${name.padEnd(25)} -> ${res.status} ${hasData ? '(data OK)' : '(empty)'}`);
        passed++;
      } catch (e) {
        console.log(`[X]  ${name.padEnd(25)} -> ${e.response?.status || 'ERR'} ${e.response?.data?.error || e.message}`);
        failed++;
      }
    }

    console.log(`\nRESULTADO: ${passed}/${passed + failed} endpoints funcionando (${Math.round(passed/(passed+failed)*100)}%)`);
  } catch (e) {
    console.log('Error:', e.response?.data || e.message);
  }
}

test();
