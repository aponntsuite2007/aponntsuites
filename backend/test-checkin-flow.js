const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 9998,
      path: '/api/v1' + path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  // 1. Login
  console.log('=== 1. LOGIN ===');
  const login = await request('POST', '/auth/login', {
    identifier: 'administrador',
    password: 'admin123',
    companySlug: 'aponnt-empresa-demo'
  });
  console.log('Status:', login.status);
  if (login.status !== 200) { console.log('Login failed:', JSON.stringify(login.body)); return; }
  const token = login.body.token;
  console.log('Token OK, user:', login.body.user?.firstName);

  // 2. Check today status
  console.log('\n=== 2. TODAY STATUS ===');
  const status = await request('GET', '/attendance/today/status', null, token);
  console.log('Status:', status.status, JSON.stringify(status.body));

  // 3. Check-in
  console.log('\n=== 3. CHECK-IN ===');
  const checkin = await request('POST', '/attendance/checkin', { method: 'mobile_app' }, token);
  console.log('Status:', checkin.status, checkin.body.message || checkin.body.error);
  if (checkin.body.attendance) {
    console.log('Attendance ID:', checkin.body.attendance.id);
  }

  // 4. Check-out
  console.log('\n=== 4. CHECK-OUT ===');
  const checkout = await request('POST', '/attendance/checkout', { method: 'mobile_app' }, token);
  console.log('Status:', checkout.status, checkout.body.message || checkout.body.error);

  // 5. Verify in DB
  console.log('\n=== 5. DB RECORD ===');
  const {Sequelize} = require('sequelize');
  const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', {logging: false});
  const [rows] = await seq.query(`SELECT id, "UserId", company_id, date, "checkInTime", "checkOutTime", status, origin_type, "checkInMethod", "checkOutMethod" FROM attendances ORDER BY "createdAt" DESC LIMIT 1`);
  console.log(JSON.stringify(rows[0], null, 2));
  await seq.close();

  console.log('\n=== RESULT ===');
  const record = rows[0];
  const checks = [
    ['UUID id', record.id && record.id.includes('-')],
    ['company_id set', record.company_id !== null],
    ['checkInTime set', record.checkInTime !== null],
    ['checkOutTime set', record.checkOutTime !== null],
    ['origin_type=mobile_app', record.origin_type === 'mobile_app'],
    ['checkInMethod=mobile', record.checkInMethod === 'mobile'],
    ['checkOutMethod=mobile', record.checkOutMethod === 'mobile'],
    ['status=present', record.status === 'present'],
  ];
  checks.forEach(([name, pass]) => console.log(pass ? '  PASS' : '  FAIL', name));
  const passed = checks.filter(c => c[1]).length;
  console.log(`\n${passed}/${checks.length} checks passed`);
}

test().catch(e => console.error('ERROR:', e.message));
