const axios = require('axios');
const BASE = 'http://localhost:9998/api';

async function getAdmins() {
  const login = await axios.post(BASE + '/v1/auth/login', {
    identifier: 'rrhh2@isi.test',
    password: 'admin123',
    companySlug: 'isi'
  });
  const token = login.data.token;

  const users = await axios.get(BASE + '/v1/users?limit=100', {
    headers: { Authorization: 'Bearer ' + token }
  });

  console.log('Usuarios en ISI (company_id=11):');
  const allUsers = users.data.users || users.data;
  allUsers.slice(0, 15).forEach(u => {
    console.log(`  - ${u.email} | role: ${u.role} | name: ${u.first_name} ${u.last_name}`);
  });

  console.log('\n--- Admins/Supervisors ---');
  const admins = allUsers.filter(u =>
    u.role === 'admin' || u.role === 'supervisor' || u.role === 'manager'
  );
  admins.forEach(u => {
    console.log(`  - ${u.email} | role: ${u.role}`);
  });
}
getAdmins().catch(e => console.error(e.response?.data || e.message));
