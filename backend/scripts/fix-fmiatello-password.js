const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function fix() {
    const client = new Client({ host: 'localhost', port: 5432, database: 'attendance_system', user: 'postgres', password: 'Aedr15150302' });
    await client.connect();

    // Generar hash para admin123
    const newHash = await bcrypt.hash('admin123', 12);
    console.log('Nuevo hash para admin123:', newHash);

    // Actualizar usuario administrador de FMIATELLO
    await client.query('UPDATE users SET password = $1 WHERE usuario = $2 AND company_id = $3', [newHash, 'administrador', 124]);
    console.log('Password actualizado para administrador@FMIATELLO');

    // Verificar
    const result = await client.query("SELECT password FROM users WHERE usuario = 'administrador' AND company_id = 124");
    const match = await bcrypt.compare('admin123', result.rows[0].password);
    console.log('Verificación: ¿Coincide admin123?:', match);

    await client.end();
}
fix();
