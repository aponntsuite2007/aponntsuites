/**
 * TEST RÁPIDO - Verificar endpoint /api/audit/test/global
 */

const http = require('http');

// Primero obtener token de login
function login() {
  return new Promise((resolve, reject) => {
    const loginData = JSON.stringify({
      empresa: 'aponnt-empresa-demo',
      usuario: 'administrador',
      password: 'admin123'
    });

    const options = {
      hostname: 'localhost',
      port: 9998,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.token) {
            console.log('✅ [LOGIN] Token obtenido');
            resolve(parsed.token);
          } else {
            reject(new Error('No se recibió token'));
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(loginData);
    req.end();
  });
}

// Luego ejecutar audit
function runAudit(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 9998,
      path: '/api/audit/test/global',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    console.log('🌍 [TEST] Enviando POST a /api/audit/test/global...');

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`📊 [RESPONSE] Status: ${res.statusCode}`);
        console.log(`📊 [RESPONSE] Body:\n${data}\n`);
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ [ERROR]:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Ejecutar test
(async () => {
  try {
    const token = await login();
    await runAudit(token);
    console.log('\n✅ [TEST] Completado - Revisa logs del servidor para ver si ejecuta Puppeteer\n');
  } catch (error) {
    console.error('\n❌ [TEST] Error:', error.message, '\n');
  }
})();
