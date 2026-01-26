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
  const eL = await apiCall('POST', '/api/v1/auth/login', { identifier: 'administrador', password: 'admin123', companySlug: 'aponnt-empresa-demo' });
  const eT = eL.body.token;

  // Create shift
  const shift = await apiCall('POST', '/api/v1/shifts', {
    name: 'Debug-Shift-' + Date.now(), shift_type: 'standard', startTime: '09:00', endTime: '17:00'
  }, eT);
  console.log('CREATE status:', shift.status);
  console.log('Shift ID:', shift.body?.shift?.id);

  if (shift.body?.shift?.id) {
    const id = shift.body.shift.id;

    // Try READ
    const read = await apiCall('GET', `/api/v1/shifts/${id}`, null, eT);
    console.log('READ status:', read.status);
    console.log('READ body:', JSON.stringify(read.body).substring(0, 300));

    // Try UPDATE for comparison
    const upd = await apiCall('PUT', `/api/v1/shifts/${id}`, { name: 'Updated' }, eT);
    console.log('UPDATE status:', upd.status);

    // Delete
    await apiCall('DELETE', `/api/v1/shifts/${id}`, null, eT);
  }

  // Also test company update
  console.log('\n--- Company Update Debug ---');
  const sL = await apiCall('POST', '/api/aponnt/staff/login', { email: 'admin@aponnt.com', password: 'admin123' });
  const sT = sL.body.token;
  const ts = Date.now();
  const comp = await apiCall('POST', '/api/aponnt/dashboard/companies', {
    name: 'Debug2-' + ts, slug: 'debug2-' + ts, legal_name: 'D SA',
    taxId: '20-77777777-7', contactEmail: 'd@co.com', contactPhone: '+54-11-0000',
    address: 'Av D 1', city: 'CABA', province: 'Buenos Aires', country: 'AR',
    max_employees: 5, license_type: 'basic'
  }, sT);
  console.log('Comp CREATE:', comp.status, 'ID:', comp.body?.company?.id);

  if (comp.body?.company?.id) {
    const upd = await apiCall('PUT', `/api/aponnt/dashboard/companies/${comp.body.company.id}`, { phone: '+54-11-9999' }, sT);
    console.log('Comp UPDATE:', upd.status, JSON.stringify(upd.body).substring(0, 200));
  }
}

run().catch(e => console.error(e.message));
