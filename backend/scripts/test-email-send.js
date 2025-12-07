/**
 * TEST DE ENVÍO DE EMAIL
 * Prueba directamente el servicio de email
 */

const EmailService = require('../src/services/emailService');

async function testEmail() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST DE ENVÍO DE EMAIL');
    console.log('='.repeat(60));

    try {
        // Obtener configuración de email de BD
        const { sequelize } = require('../src/config/database');

        const [configs] = await sequelize.query(`
            SELECT config_type, smtp_host, smtp_port, smtp_user, smtp_password, from_email, from_name, is_active
            FROM aponnt_email_config
            WHERE config_type = 'support' AND is_active = true
        `);

        if (configs.length === 0) {
            throw new Error('No se encontró configuración de email activa');
        }

        const config = configs[0];
        console.log('\n📧 Configuración encontrada:');
        console.log(`   Host: ${config.smtp_host}:${config.smtp_port}`);
        console.log(`   User: ${config.smtp_user}`);
        console.log(`   Password: ${config.smtp_password.substring(0, 4)}...${config.smtp_password.substring(config.smtp_password.length - 4)}`);
        console.log(`   From: ${config.from_name} <${config.from_email}>`);

        // Crear transporter con nodemailer directamente
        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: config.smtp_port,
            secure: false,
            auth: {
                user: config.smtp_user,
                pass: config.smtp_password
            }
        });

        console.log('\n🔌 Verificando conexión SMTP...');
        await transporter.verify();
        console.log('   ✅ Conexión SMTP OK');

        // Enviar email de prueba
        console.log('\n📤 Enviando email de prueba...');
        const result = await transporter.sendMail({
            from: `"${config.from_name}" <${config.from_email}>`,
            to: 'aponntsuite@gmail.com',
            subject: '🧪 Test de Sistema de Escalamiento - ' + new Date().toISOString(),
            html: `
                <h2>Test de Configuración de Email</h2>
                <p>Este es un email de prueba enviado desde el sistema de escalamiento de soporte.</p>
                <p><strong>Hora de envío:</strong> ${new Date().toLocaleString('es-AR')}</p>
                <p><strong>Config type:</strong> ${config.config_type}</p>
                <hr>
                <p style="color: green; font-weight: bold;">✅ Si recibes este email, la configuración funciona correctamente.</p>
            `
        });

        console.log('   ✅ Email enviado!');
        console.log(`   Message ID: ${result.messageId}`);
        console.log(`   Accepted: ${result.accepted.join(', ')}`);

        console.log('\n' + '='.repeat(60));
        console.log('✅ TEST COMPLETADO - Revisa tu bandeja de entrada');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.code) console.error('   Código:', error.code);
        if (error.responseCode) console.error('   Response Code:', error.responseCode);
        console.error(error);
    } finally {
        process.exit(0);
    }
}

testEmail();
