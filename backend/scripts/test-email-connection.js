/**
 * 📧 TEST EMAIL CONNECTION
 * ========================
 * Script para verificar la conexión SMTP y enviar email de prueba.
 *
 * Uso:
 *   node scripts/test-email-connection.js
 *   node scripts/test-email-connection.js test@example.com
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const TEST_EMAIL = process.argv[2] || 'pablorivasjordan52@gmail.com';

async function testEmailConnection() {
    console.log('═'.repeat(60));
    console.log('📧 TEST DE CONEXIÓN SMTP');
    console.log('═'.repeat(60));
    console.log('');

    // Mostrar configuración actual
    console.log('📋 CONFIGURACIÓN ACTUAL:');
    console.log('─'.repeat(40));
    console.log('   EMAIL_HOST:', process.env.EMAIL_HOST || process.env.SMTP_HOST || '(no configurado)');
    console.log('   EMAIL_PORT:', process.env.EMAIL_PORT || process.env.SMTP_PORT || '587');
    console.log('   EMAIL_USER:', process.env.EMAIL_USER || process.env.SMTP_USER || '(no configurado)');
    console.log('   EMAIL_PASS:', process.env.EMAIL_PASS || process.env.SMTP_PASS ? '***configurado***' : '(no configurado)');
    console.log('   EMAIL_FROM:', process.env.EMAIL_FROM || process.env.EMAIL_USER || '(no configurado)');
    console.log('');

    // Configuración del transporter
    const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587');
    const user = process.env.EMAIL_USER || process.env.SMTP_USER;
    const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

    if (!user || !pass) {
        console.log('❌ ERROR: Credenciales SMTP no configuradas');
        console.log('');
        console.log('Agrega estas variables al archivo .env:');
        console.log('   EMAIL_HOST=smtp.gmail.com');
        console.log('   EMAIL_PORT=587');
        console.log('   EMAIL_USER=tu-email@gmail.com');
        console.log('   EMAIL_PASS=tu-app-password');
        console.log('');
        console.log('Para Gmail, necesitas un App Password:');
        console.log('   1. Ir a https://myaccount.google.com/apppasswords');
        console.log('   2. Crear una contraseña de aplicación');
        console.log('   3. Usar esa contraseña en EMAIL_PASS');
        return;
    }

    console.log('🔌 VERIFICANDO CONEXIÓN SMTP...');
    console.log('─'.repeat(40));

    const transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: port === 465,
        auth: {
            user: user,
            pass: pass
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        // Test 1: Verificar conexión
        console.log('   Conectando a', host + ':' + port + '...');
        await transporter.verify();
        console.log('   ✅ Conexión SMTP verificada correctamente');
        console.log('');

        // Test 2: Enviar email de prueba
        console.log('📨 ENVIANDO EMAIL DE PRUEBA...');
        console.log('─'.repeat(40));
        console.log('   Destinatario:', TEST_EMAIL);

        const info = await transporter.sendMail({
            from: `"Sistema Biométrico - Test" <${user}>`,
            to: TEST_EMAIL,
            subject: '✅ Test de Conexión SMTP - Sistema Biométrico',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0;">📧 Test de Email</h1>
                        <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Sistema de Asistencia Biométrico</p>
                    </div>

                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #28a745; margin-top: 0;">✅ Conexión SMTP Exitosa</h2>

                        <p>Este email confirma que la configuración de email del sistema está funcionando correctamente.</p>

                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Servidor SMTP:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${host}:${port}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Usuario:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${user}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Fecha/Hora:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date().toLocaleString('es-AR')}</td>
                            </tr>
                        </table>

                        <p style="color: #666; font-size: 12px; margin-top: 30px;">
                            Este es un email de prueba automático. No requiere respuesta.
                        </p>
                    </div>
                </div>
            `
        });

        console.log('   ✅ Email enviado exitosamente');
        console.log('   Message ID:', info.messageId);
        console.log('');

        // Resumen
        console.log('═'.repeat(60));
        console.log('✅ RESULTADO: CONEXIÓN SMTP FUNCIONANDO CORRECTAMENTE');
        console.log('═'.repeat(60));
        console.log('');
        console.log('El sistema puede enviar emails de consentimiento biométrico.');
        console.log('Revisa tu bandeja de entrada en:', TEST_EMAIL);

    } catch (error) {
        console.log('   ❌ Error:', error.message);
        console.log('');

        // Diagnóstico de errores comunes
        console.log('🔍 DIAGNÓSTICO:');
        console.log('─'.repeat(40));

        if (error.code === 'ECONNREFUSED') {
            console.log('   El servidor SMTP rechazó la conexión.');
            console.log('   Posibles causas:');
            console.log('   - Firewall bloqueando puerto', port);
            console.log('   - Servidor SMTP no disponible');
            console.log('   - Host incorrecto');
        } else if (error.code === 'EAUTH') {
            console.log('   Error de autenticación.');
            console.log('   Posibles causas:');
            console.log('   - Contraseña incorrecta');
            console.log('   - Para Gmail: Necesitas App Password, no tu contraseña normal');
            console.log('   - Cuenta bloqueada o requiere verificación');
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ENETUNREACH') {
            console.log('   No se pudo conectar al servidor SMTP.');
            console.log('   Posibles causas:');
            console.log('   - Sin conexión a internet');
            console.log('   - Firewall corporativo bloqueando conexión');
            console.log('   - VPN interfiriendo con la conexión');
        } else if (error.message.includes('self signed certificate')) {
            console.log('   Problema con certificado SSL.');
            console.log('   Ya está configurado rejectUnauthorized: false');
        } else {
            console.log('   Error no identificado:', error.code || 'N/A');
            console.log('   Stack:', error.stack);
        }

        console.log('');
        console.log('═'.repeat(60));
        console.log('❌ RESULTADO: CONEXIÓN SMTP FALLIDA');
        console.log('═'.repeat(60));
    }
}

// Ejecutar
testEmailConnection();
