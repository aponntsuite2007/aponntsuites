/**
 * Verificar que FMIATELLO puede hacer login con administrador/admin123
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function verify() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'attendance_system',
        user: 'postgres',
        password: 'Aedr15150302'
    });
    await client.connect();

    const companyId = 124; // FMIATELLO
    const testPassword = 'admin123';

    // Buscar usuario administrador de FMIATELLO
    const result = await client.query(`
        SELECT user_id, usuario, password_hash, nombre, apellido, role, is_active, email
        FROM users
        WHERE company_id = $1 AND usuario = 'administrador'
    `, [companyId]);

    if (result.rows.length === 0) {
        console.log('❌ No existe usuario "administrador" para FMIATELLO');
        await client.end();
        return;
    }

    const user = result.rows[0];
    console.log('\n=== USUARIO ADMINISTRADOR DE FMIATELLO ===');
    console.log(`user_id: ${user.user_id}`);
    console.log(`usuario: ${user.usuario}`);
    console.log(`nombre: ${user.nombre} ${user.apellido}`);
    console.log(`email: ${user.email}`);
    console.log(`role: ${user.role}`);
    console.log(`is_active: ${user.is_active}`);
    console.log(`password_hash (primeros 20 chars): ${user.password_hash?.substring(0, 20)}...`);

    // Verificar password
    const passwordMatch = await bcrypt.compare(testPassword, user.password_hash);
    console.log(`\n🔐 Verificación password "admin123": ${passwordMatch ? '✅ CORRECTO' : '❌ INCORRECTO'}`);

    if (!passwordMatch) {
        // Generar nuevo hash para admin123
        const newHash = await bcrypt.hash(testPassword, 10);
        console.log(`\n⚠️ Password incorrecto. Actualizando a "admin123"...`);

        await client.query(`
            UPDATE users SET password_hash = $1 WHERE user_id = $2
        `, [newHash, user.user_id]);

        console.log(`✅ Password actualizado correctamente`);
    }

    // Verificar empresa activa
    const companyResult = await client.query(`
        SELECT name, slug, is_active, activated_at, onboarding_status
        FROM companies WHERE company_id = $1
    `, [companyId]);

    if (companyResult.rows.length > 0) {
        const company = companyResult.rows[0];
        console.log('\n=== EMPRESA FMIATELLO ===');
        console.log(`name: ${company.name}`);
        console.log(`slug: ${company.slug}`);
        console.log(`is_active: ${company.is_active}`);
        console.log(`activated_at: ${company.activated_at}`);
        console.log(`onboarding_status: ${company.onboarding_status}`);
    }

    console.log('\n=== CREDENCIALES PARA LOGIN ===');
    console.log('EMPRESA: fmiatello (o el slug exacto)');
    console.log('USUARIO: administrador');
    console.log('PASSWORD: admin123');

    await client.end();
}

verify().catch(e => console.error('Error:', e.message));
