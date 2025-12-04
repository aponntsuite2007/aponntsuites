const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', { logging: false });

async function check() {
  try {
    // Verificar usuario EMP-ISI-001
    console.log('=== VERIFICANDO USUARIO EMP-ISI-001 ===');
    const [users] = await seq.query(
      'SELECT user_id, "employeeId", "firstName", "lastName", biometric_photo_url, biometric_photo_date, biometric_photo_expiration FROM users WHERE "employeeId" = :empId',
      { replacements: { empId: 'EMP-ISI-001' } }
    );

    if (users.length > 0) {
      const u = users[0];
      console.log('Nombre:', u.firstName, u.lastName);
      console.log('User ID (UUID):', u.user_id);
      console.log('Employee ID:', u.employeeId);
      console.log('Photo URL:', u.biometric_photo_url || '❌ NO TIENE FOTO');
      console.log('Fecha captura:', u.biometric_photo_date || 'N/A');
      console.log('Vencimiento:', u.biometric_photo_expiration || 'N/A');

      // Verificar si el archivo existe
      if (u.biometric_photo_url) {
        const filePath = path.join(__dirname, '../public', u.biometric_photo_url);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          console.log('✅ Archivo existe:', filePath);
          console.log('   Tamaño:', (stats.size / 1024).toFixed(2), 'KB');
        } else {
          console.log('❌ Archivo NO existe:', filePath);
        }
      }
    } else {
      console.log('Usuario no encontrado');
    }

    // Verificar templates biométricos
    console.log('\n=== BIOMETRIC TEMPLATES ===');
    const [templates] = await seq.query(`
      SELECT id, employee_id, quality_score, confidence_score, created_at
      FROM biometric_templates WHERE employee_id = 'EMP-ISI-001'
      ORDER BY created_at DESC LIMIT 3
    `);

    if (templates.length > 0) {
      templates.forEach(t => {
        console.log('Template ID:', t.id, '| Quality:', t.quality_score, '| Confidence:', t.confidence_score, '| Created:', t.created_at);
      });
    } else {
      console.log('No hay templates para este usuario');
    }

    // Verificar directorio de fotos
    console.log('\n=== DIRECTORIO DE FOTOS ===');
    const photosDir = path.join(__dirname, '../public/uploads/biometric-photos');
    if (fs.existsSync(photosDir)) {
      const files = fs.readdirSync(photosDir);
      console.log('Directorio existe con', files.length, 'archivos');
      files.slice(-5).forEach(f => console.log('  -', f));
    } else {
      console.log('❌ Directorio NO existe:', photosDir);
    }

  } catch(e) {
    console.log('Error:', e.message);
  }
  await seq.close();
}

check();
