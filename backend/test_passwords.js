const bcrypt = require('bcrypt');
const axios = require('axios');

const hashFromDB = '$2b$10$ciS.n7MNiqnLpDzmJ5SwY.fxI89QM6VybZ96QRwQAdSIlFPUx0JVS';

const commonPasswords = [
  '123',
  'admin123',
  'password',
  'admin',
  '123456',
  'isi123',
  'adminisi'
];

async function testPasswords() {
  console.log('🔐 Probando contraseñas contra el hash de ISI...\n');

  for (const password of commonPasswords) {
    const isMatch = await bcrypt.compare(password, hashFromDB);
    console.log(`${password.padEnd(10)} -> ${isMatch ? '✅ MATCH!' : '❌'}`);

    if (isMatch) {
      console.log(`\n🎯 CONTRASEÑA ENCONTRADA: "${password}"`);
      console.log(`📧 Email: admin@isi.com`);
      console.log(`🔑 Password: ${password}`);

      // Probar login real
      console.log('\n🧪 Probando login real...');
      try {
        const response = await axios.post('http://localhost:8001/api/v1/auth/login', {
          identifier: 'admin@isi.com',
          password: password,
          companyId: 11
        });

        if (response.data.token) {
          console.log('🎉 ¡LOGIN EXITOSO!');
          console.log(`   Token: ${response.data.token.substring(0, 50)}...`);
          console.log(`   Usuario: ${response.data.user.firstName} ${response.data.user.lastName}`);
        }
      } catch (error) {
        console.log(`❌ Error en login: ${error.response?.data?.error || error.message}`);
      }

      break;
    }
  }
}

testPasswords();