const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'attendance_system',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  port: process.env.POSTGRES_PORT || 5432,
});

async function verifyPasswordHash() {
  try {
    // 1. Obtener el usuario testuser
    const result = await pool.query(`
      SELECT user_id, usuario, password, "isActive", email_verified, account_status, company_id
      FROM users
      WHERE usuario = 'testuser' AND company_id = 11
    `);

    if (result.rows.length === 0) {
      console.log('❌ Usuario testuser no encontrado');
      await pool.end();
      return;
    }

    const user = result.rows[0];

    console.log('✅ Usuario encontrado:');
    console.log('   Usuario:', user.usuario);
    console.log('   User ID:', user.user_id);
    console.log('   Company ID:', user.company_id);
    console.log('   Is Active:', user.isActive);
    console.log('   Email Verified:', user.email_verified);
    console.log('   Account Status:', user.account_status);
    console.log('   Password Hash:', user.password.substring(0, 30) + '...');
    console.log('');

    // 2. Probar si la contraseña "admin123" coincide
    const testPassword = 'admin123';
    console.log('🔐 Probando contraseña:', testPassword);

    const isMatch = await bcrypt.compare(testPassword, user.password);

    console.log('   Resultado bcrypt.compare():', isMatch ? '✅ MATCH' : '❌ NO MATCH');
    console.log('');

    if (!isMatch) {
      console.log('❌ LA CONTRASEÑA NO COINCIDE');
      console.log('');
      console.log('💡 Posibles causas:');
      console.log('1. El hash en la BD no es de "admin123"');
      console.log('2. bcrypt no hasheó correctamente cuando reseteamos');
      console.log('3. Hay algún problema con bcrypt vs bcryptjs');
      console.log('');
      console.log('🔧 Solución: Voy a resetear la contraseña de nuevo...');

      // Resetear contraseña de nuevo
      const newHash = await bcrypt.hash('admin123', 10);
      console.log('   Nuevo hash generado:', newHash.substring(0, 30) + '...');

      await pool.query(`
        UPDATE users
        SET password = $1, "updatedAt" = NOW()
        WHERE user_id = $2
      `, [newHash, user.user_id]);

      console.log('');
      console.log('✅ Contraseña reseteada de nuevo');
      console.log('   Probá login nuevamente con: testuser / admin123');
    } else {
      console.log('✅ LA CONTRASEÑA COINCIDE CORRECTAMENTE');
      console.log('');

      // Verificar si es el email verification el problema
      if (!user.email_verified) {
        console.log('⚠️  PROBLEMA DETECTADO: Email no verificado');
        console.log('   email_verified:', user.email_verified);
        console.log('   account_status:', user.account_status);
        console.log('');
        console.log('🔧 Solución: Voy a marcar el email como verificado...');

        await pool.query(`
          UPDATE users
          SET email_verified = true,
              account_status = 'active',
              verification_pending = false,
              "updatedAt" = NOW()
          WHERE user_id = $1
        `, [user.user_id]);

        console.log('✅ Email marcado como verificado');
        console.log('   Probá login nuevamente');
      } else {
        console.log('✅ TODO ESTÁ CORRECTO');
        console.log('   El login debería funcionar');
      }
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await pool.end();
  }
}

verifyPasswordHash();
