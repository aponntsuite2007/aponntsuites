const http = require('http');
function apiCall(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 9998, path, method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch(e) { resolve({ status: res.statusCode, body: d }); } }); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  const sL = await apiCall('POST', '/api/aponnt/staff/login', { email: 'admin@aponnt.com', password: 'admin123' });
  const sT = sL.body.token;
  const eL = await apiCall('POST', '/api/v1/auth/login', { identifier: 'administrador', password: 'admin123', companySlug: 'aponnt-empresa-demo' });
  const eT = eL.body.token;

  console.log('--- Company CREATE response structure ---');
  const ts = Date.now();
  const comp = await apiCall('POST', '/api/aponnt/dashboard/companies', {
    name: 'Debug-' + ts, slug: 'debug-' + ts, legal_name: 'Debug SA',
    taxId: '20-88888888-8', contactEmail: 'debug@co.com', contactPhone: '+54-11-0000',
    address: 'Av Debug 1', city: 'CABA', province: 'Buenos Aires', country: 'AR',
    max_employees: 5, license_type: 'basic'
  }, sT);
  console.log('Status:', comp.status);
  console.log('Keys in body.company:', Object.keys(comp.body?.company || {}));
  console.log('company.id:', comp.body?.company?.id);
  console.log('company.company_id:', comp.body?.company?.company_id);

  // Try update with both IDs
  const id = comp.body?.company?.id;
  if (id) {
    const upd = await apiCall('PUT', `/api/aponnt/dashboard/companies/${id}`, { phone: '+54-111' }, sT);
    console.log('\nUpdate with id:', id, '-> Status:', upd.status, 'Body:', JSON.stringify(upd.body).substring(0, 200));
  }

  console.log('\n--- Shift CREATE response structure ---');
  const shift = await apiCall('POST', '/api/v1/shifts', {
    name: 'Debug-Shift-' + ts, shift_type: 'standard', startTime: '09:00', endTime: '17:00'
  }, eT);
  console.log('Status:', shift.status);
  console.log('Keys in body.shift:', Object.keys(shift.body?.shift || {}));
  console.log('shift.id:', shift.body?.shift?.id);
  console.log('shift.shift_id:', shift.body?.shift?.shift_id);

  const shiftId = shift.body?.shift?.id || shift.body?.shift?.shift_id;
  if (shiftId) {
    const read = await apiCall('GET', `/api/v1/shifts/${shiftId}`, null, eT);
    console.log('\nShift READ:', read.status, JSON.stringify(read.body).substring(0, 200));
  }
}

run().catch(e => console.error(e.message));
