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
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('============================================');
  console.log('  FULL HR PIPELINE TEST');
  console.log('  Attendance → Shift → Overtime → HourBank');
  console.log('============================================\n');

  // 1. Login
  console.log('--- 1. LOGIN ---');
  const login = await request('POST', '/auth/login', {
    identifier: 'administrador',
    password: 'admin123',
    companySlug: 'aponnt-empresa-demo'
  });
  if (login.status !== 200) {
    console.log('FAIL: Login failed:', JSON.stringify(login.body));
    return;
  }
  const token = login.body.token;
  console.log('OK: Logged in as', login.body.user?.firstName, login.body.user?.lastName);

  // 2. Check-in
  console.log('\n--- 2. CHECK-IN ---');
  const checkin = await request('POST', '/attendance/checkin', { method: 'mobile_app' }, token);
  console.log('Status:', checkin.status);
  console.log('Message:', checkin.body.message || checkin.body.error);
  if (checkin.status === 201) {
    const att = checkin.body.attendance;
    console.log('Attendance ID:', att?.id);
    console.log('shift_id:', att?.shift_id || '(none - no shift assigned)');
    console.log('status:', att?.status);
    console.log('is_late:', att?.is_late);
    console.log('minutes_late:', att?.minutes_late);
  }

  // 3. Check-out
  console.log('\n--- 3. CHECK-OUT ---');
  const checkout = await request('POST', '/attendance/checkout', { method: 'mobile_app' }, token);
  console.log('Status:', checkout.status);
  console.log('Message:', checkout.body.message || checkout.body.error);
  if (checkout.status === 200) {
    const att = checkout.body.attendance;
    console.log('workingHours:', att?.workingHours);
    console.log('overtime_hours:', att?.overtime_hours);
    console.log('overtime_destination:', att?.overtime_destination);
  }

  // 4. Verify full DB record
  console.log('\n--- 4. DB VERIFICATION ---');
  const {Sequelize} = require('sequelize');
  const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', {logging: false});
  const [rows] = await seq.query(`
    SELECT id, "UserId", company_id, date,
           "checkInTime", "checkOutTime",
           status, origin_type,
           "checkInMethod", "checkOutMethod",
           "workingHours", overtime_hours, overtime_destination,
           shift_id, is_late, minutes_late,
           hour_bank_transaction_id
    FROM attendances
    ORDER BY "createdAt" DESC LIMIT 1
  `);
  const record = rows[0];
  console.log(JSON.stringify(record, null, 2));

  // 5. Check server logs for pipeline messages
  console.log('\n--- 5. PIPELINE CHECKS ---');
  const checks = [
    ['UUID id', record.id && record.id.includes('-')],
    ['company_id=1', record.company_id === 1],
    ['checkInTime set', record.checkInTime !== null],
    ['checkOutTime set', record.checkOutTime !== null],
    ['origin_type=mobile_app', record.origin_type === 'mobile_app'],
    ['checkInMethod=mobile', record.checkInMethod === 'mobile'],
    ['checkOutMethod=mobile', record.checkOutMethod === 'mobile'],
    ['status set', record.status !== null],
    ['workingHours calculated', record.workingHours !== null],
  ];

  let passed = 0;
  checks.forEach(([name, pass]) => {
    console.log(pass ? '  PASS' : '  FAIL', name);
    if (pass) passed++;
  });

  // Informational (not pass/fail since shift might not be assigned)
  console.log('\n--- INFO (depends on shift assignment) ---');
  console.log('  shift_id:', record.shift_id || '(none)');
  console.log('  overtime_hours:', record.overtime_hours || '0');
  console.log('  overtime_destination:', record.overtime_destination || '(none)');
  console.log('  hour_bank_transaction_id:', record.hour_bank_transaction_id || '(none)');

  console.log(`\n=== RESULT: ${passed}/${checks.length} core checks passed ===`);

  await seq.close();
}

test().catch(e => console.error('ERROR:', e.message));
