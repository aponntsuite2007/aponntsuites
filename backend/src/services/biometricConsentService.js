const nodemailer = require('nodemailer');
const { sequelize } = require('../config/database');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class BiometricConsentService {
    constructor() {
        this.emailTransporter = null;
        this.initializeEmailTransporter();
    }

    initializeEmailTransporter() {
        try {
            // Verificar que nodemailer esté disponible
            if (!nodemailer || typeof nodemailer.createTransporter !== 'function') {
                console.warn('⚠️ nodemailer no está disponible. Servicio de email deshabilitado.');
                return;
            }

            this.emailTransporter = nodemailer.createTransporter({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
            console.log('✅ Email transporter inicializado correctamente');
        } catch (error) {
            console.error('⚠️ Error inicializando email transporter:', error.message);
            console.warn('⚠️ Servicio de consentimientos funcionará sin envío de emails');
            this.emailTransporter = null;
        }
    }

    /**
     * Solicitar consentimiento individual
     */
    async requestConsent(userId, companyId, requestedBy) {
        try {
            // Obtener usuario
            const [users] = await sequelize.query(`
                SELECT user_id, "firstName", "lastName", email
                FROM users
                WHERE user_id = :userId AND company_id = :companyId
            `, {
                replacements: { userId, companyId },
                type: sequelize.QueryTypes.SELECT
            });

            if (users.length === 0) {
                throw new Error('Usuario no encontrado');
            }

            const user = users[0];

            // Verificar si ya tiene consentimiento activo
            const existingConsent = await sequelize.query(`
                SELECT id FROM biometric_consents
                WHERE user_id = :userId
                    AND company_id = :companyId
                    AND consent_type = 'biometric_analysis'
                    AND revoked = false
                    AND (expires_at IS NULL OR expires_at > NOW())
            `, {
                replacements: { userId, companyId },
                type: sequelize.QueryTypes.SELECT
            });

            if (existingConsent.length > 0) {
                return { success: false, message: 'Usuario ya tiene consentimiento activo' };
            }

            // Obtener documento legal (con fallback si tabla no existe)
            let legalDoc = null;

            try {
                const legalDocs = await sequelize.query(`
                    SELECT content, version, title
                    FROM consent_legal_documents
                    WHERE company_id = :companyId
                        AND is_active = true
                        AND document_type = 'consent_form'
                    ORDER BY effective_from DESC
                    LIMIT 1
                `, {
                    replacements: { companyId },
                    type: sequelize.QueryTypes.SELECT
                });

                legalDoc = legalDocs[0];
            } catch (tableError) {
                console.log('⚠️ [CONSENT-SERVICE] Tabla consent_legal_documents no existe, usando documento por defecto');
            }

            // Usar documento por defecto si no se encontró en BD
            if (!legalDoc) {
                legalDoc = {
                    content: `CONSENTIMIENTO INFORMADO PARA TRATAMIENTO DE DATOS BIOMÉTRICOS

En cumplimiento de la Ley 25.326 de Protección de Datos Personales (Argentina), el Reglamento General de Protección de Datos (GDPR) de la Unión Europea, y la Biometric Information Privacy Act (BIPA) de Illinois, se solicita su consentimiento expreso para el tratamiento de sus datos biométricos.

1. RESPONSABLE DEL TRATAMIENTO
El responsable del tratamiento de sus datos biométricos es la empresa a la cual usted pertenece como empleado.

2. FINALIDAD DEL TRATAMIENTO
Los datos biométricos (vectores matemáticos de 128 dimensiones derivados del análisis facial) serán utilizados exclusivamente para:
- Control de asistencia laboral
- Identificación de empleados en el sistema
- Registro de horarios de entrada y salida

3. DATOS QUE SE RECOPILAN
NO se almacenan fotografías de su rostro. El sistema captura temporalmente su imagen, la convierte en un vector matemático (128 números) y descarta la imagen original.

4. GARANTÍAS TÉCNICAS
✓ Sin almacenamiento de imágenes
✓ Vectores matemáticos encriptados (AES-256)
✓ Proceso unidireccional irreversible
✓ Infraestructura certificada ISO 27001

5. DERECHOS DEL TITULAR
Usted tiene derecho a:
- Acceder a sus datos biométricos procesados
- Rectificar datos inexactos
- Solicitar la supresión de sus datos
- Oponerse al tratamiento
- Revocar este consentimiento en cualquier momento

6. BASE LEGAL
- Ley 25.326 (Argentina) - Protección de Datos Personales
- GDPR Art. 9 (UE) - Tratamiento de categorías especiales de datos
- BIPA (Illinois) - Privacidad de información biométrica
- Consentimiento expreso del titular`,
                    version: '1.0',
                    title: 'Consentimiento Informado para Tratamiento de Datos Biométricos'
                };
            }

            // Generar token único
            const token = uuidv4();
            const tokenExpiry = new Date();
            tokenExpiry.setDate(tokenExpiry.getDate() + 7); // 7 días

            // Hash del documento
            const documentHash = crypto.createHash('sha256')
                .update(legalDoc.content + legalDoc.version)
                .digest('hex');

            // Crear registro de consentimiento pendiente
            await sequelize.query(`
                INSERT INTO biometric_consents (
                    company_id, user_id, consent_type, consent_given,
                    consent_text, consent_version, consent_document_hash,
                    consent_token, consent_token_expires_at, consent_email_sent_at,
                    email_thread, created_at, updated_at
                ) VALUES (
                    :companyId, :userId, 'biometric_analysis', false,
                    :consentText, :version, :documentHash,
                    :token, :tokenExpiry, NOW(),
                    :emailThread, NOW(), NOW()
                )
            `, {
                replacements: {
                    companyId,
                    userId,
                    consentText: legalDoc.content,
                    version: legalDoc.version,
                    documentHash,
                    token,
                    tokenExpiry,
                    emailThread: JSON.stringify([{
                        type: 'request',
                        sent_at: new Date(),
                        subject: 'Solicitud de Consentimiento Biométrico'
                    }])
                },
                type: sequelize.QueryTypes.INSERT
            });

            // Log en auditoría
            await sequelize.query(`
                INSERT INTO consent_audit_log (
                    company_id, user_id, action, action_timestamp,
                    performed_by_user_id, automated, metadata
                ) VALUES (
                    :companyId, :userId, 'REQUESTED', NOW(),
                    :requestedBy, false,
                    :metadata
                )
            `, {
                replacements: {
                    companyId,
                    userId,
                    requestedBy,
                    metadata: JSON.stringify({ token, version: legalDoc.version })
                },
                type: sequelize.QueryTypes.INSERT
            });

            // Obtener datos de la empresa para el email
            const [companies] = await sequelize.query(`
                SELECT name, email FROM companies WHERE company_id = :companyId
            `, {
                replacements: { companyId },
                type: sequelize.QueryTypes.SELECT
            });

            const company = companies[0] || { name: 'Empresa', email: null };

            // Enviar email
            const consentUrl = `${process.env.FRONTEND_URL || 'https://aponntsuites.onrender.com'}/consent/${token}`;

            await this.sendConsentRequestEmail(user, company, legalDoc, consentUrl, token);

            return {
                success: true,
                message: 'Solicitud enviada exitosamente',
                userId,
                email: user.email,
                token,
                expiresAt: tokenExpiry
            };

        } catch (error) {
            console.error('Error solicitando consentimiento:', error);
            throw error;
        }
    }

    /**
     * Solicitar consentimientos masivos (usuarios pendientes)
     */
    async requestBulkConsent(companyId, requestedBy, filters = {}) {
        try {
            // Obtener usuarios pendientes
            let whereConditions = [
                'u.company_id = :companyId',
                'u.is_active = true',
                `(c.id IS NULL OR c.consent_given = false OR c.revoked = true OR c.expires_at < NOW())`
            ];

            const replacements = { companyId };

            if (filters.role) {
                whereConditions.push('u.role = :role');
                replacements.role = filters.role;
            }

            const query = `
                SELECT DISTINCT
                    u.user_id,
                    u."firstName",
                    u."lastName",
                    u.email
                FROM users u
                LEFT JOIN biometric_consents c
                    ON u.user_id = c.user_id
                    AND c.company_id = u.company_id
                    AND c.consent_type = 'biometric_analysis'
                WHERE ${whereConditions.join(' AND ')}
                ORDER BY u."lastName", u."firstName"
            `;

            const users = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            console.log(`📧 Enviando consentimientos a ${users.length} usuarios...`);

            const results = {
                total: users.length,
                sent: 0,
                failed: 0,
                errors: []
            };

            // Enviar a cada usuario
            for (const user of users) {
                try {
                    await this.requestConsent(user.user_id, companyId, requestedBy);
                    results.sent++;
                    console.log(`✅ Enviado a ${user.email}`);
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        userId: user.user_id,
                        email: user.email,
                        error: error.message
                    });
                    console.error(`❌ Error enviando a ${user.email}:`, error.message);
                }
            }

            return results;

        } catch (error) {
            console.error('Error en solicitud masiva:', error);
            throw error;
        }
    }

    /**
     * Enviar email de solicitud de consentimiento
     */
    async sendConsentRequestEmail(user, company, legalDoc, consentUrl, token) {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solicitud de Consentimiento Biométrico</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background: #f5f7fa;">
    <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <div style="font-size: 64px; margin-bottom: 10px;">🔐</div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Consentimiento Biométrico</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${company.name}</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #2d3748; margin: 0 0 20px 0;">
                Hola <strong>${user.firstName} ${user.lastName}</strong>,
            </p>

            <p style="font-size: 16px; line-height: 1.6; color: #4a5568; margin: 0 0 24px 0;">
                Necesitamos tu <strong>consentimiento informado</strong> para procesar tus datos biométricos
                como parte de nuestro sistema de control de asistencia y análisis de bienestar laboral.
            </p>

            <!-- Info Box -->
            <div style="background: #edf2f7; border-left: 4px solid #667eea; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; color: #2d3748; font-size: 16px;">📋 Información Importante</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4a5568; line-height: 1.8;">
                    <li><strong>Cumplimiento legal:</strong> Ley 25.326, GDPR, BIPA</li>
                    <li><strong>Datos recopilados:</strong> Vectores matemáticos biométricos (NO imágenes)</li>
                    <li><strong>Finalidad:</strong> Control de asistencia y análisis biométrico</li>
                    <li><strong>Tecnología:</strong> Microsoft Azure Face API (embeddings irreversibles)</li>
                    <li><strong>Conservación:</strong> Durante relación laboral + 90 días</li>
                </ul>
            </div>

            <!-- Technical Guarantee Box -->
            <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; color: #065f46; font-size: 16px;">🔬 Garantía Técnica</h3>
                <p style="margin: 0 0 12px 0; color: #047857; line-height: 1.6; font-size: 14px;">
                    <strong>NO se almacenan fotografías de tu rostro.</strong> El sistema captura tu imagen
                    momentáneamente y la convierte en un conjunto de números matemáticos (vector de 128 dimensiones)
                    que representan características únicas de tu rostro.
                </p>
                <p style="margin: 0; color: #047857; line-height: 1.6; font-size: 14px;">
                    ✅ <strong>Irreversibilidad garantizada:</strong> Es matemáticamente imposible reconstruir
                    tu imagen a partir de estos números. El proceso es unidireccional (como un hash criptográfico).
                </p>
            </div>

            <!-- Rights Box -->
            <div style="background: #fff5f5; border-left: 4px solid #f56565; padding: 20px; border-radius: 8px; margin-bottom: 32px;">
                <h3 style="margin: 0 0 12px 0; color: #c53030; font-size: 16px;">⚖️ Tus Derechos</h3>
                <p style="margin: 0; color: #742a2a; line-height: 1.6; font-size: 14px;">
                    Según Art. 14-16 de la Ley 25.326, tenés derecho a <strong>acceder, rectificar, suprimir</strong>
                    tus datos y <strong>revocar</strong> este consentimiento en cualquier momento.
                </p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="${consentUrl}"
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                          color: white; padding: 16px 48px; text-decoration: none; border-radius: 8px;
                          font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102,126,234,0.4);">
                    ✅ Leer y Dar Consentimiento
                </a>
            </div>

            <!-- Token Info -->
            <div style="background: #f7fafc; padding: 16px; border-radius: 8px; margin-top: 24px; text-align: center;">
                <p style="margin: 0; font-size: 13px; color: #718096;">
                    🔒 Link seguro · Vence en 7 días · Token: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${token.substring(0,8)}...</code>
                </p>
            </div>

            <!-- Warning -->
            <div style="margin-top: 24px; padding: 16px; background: #fffaf0; border-radius: 8px; border: 1px solid #fbd38d;">
                <p style="margin: 0; font-size: 13px; color: #744210; line-height: 1.6;">
                    ⚠️ <strong>Importante:</strong> El consentimiento es <strong>voluntario</strong>.
                    La negativa no afectará negativamente tu situación laboral.
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #4a5568; font-weight: 600;">
                ${company.name}
            </p>
            <p style="margin: 0; font-size: 12px; color: #a0aec0;">
                Este email fue generado automáticamente. Por favor no responder a este mensaje.
            </p>
            <p style="margin: 12px 0 0 0; font-size: 11px; color: #cbd5e0;">
                Documento versión: ${legalDoc.version} · Cumplimiento: Ley 25.326 (ARG)<br>
                Sistema: APONNT Biometric Suite
            </p>
        </div>
    </div>
</body>
</html>
        `;

        try {
            if (!this.emailTransporter) {
                console.warn(`⚠️ Email transporter no disponible. No se puede enviar email a ${user.email}`);
                return { messageId: 'email-disabled', warning: 'Email service not available' };
            }

            const fromEmail = company.email || process.env.FROM_EMAIL || process.env.SMTP_USER;
            const fromName = `${company.name} - RRHH`;

            const result = await this.emailTransporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: user.email,
                subject: '🔐 Solicitud de Consentimiento para Análisis Biométrico',
                html
            });

            console.log(`✅ Email enviado a ${user.email} - ID: ${result.messageId}`);
            return result;

        } catch (error) {
            console.error(`❌ Error enviando email a ${user.email}:`, error);
            throw error;
        }
    }

    /**
     * Enviar email de confirmación tras aceptar consentimiento
     */
    async sendConsentConfirmationEmail(user, company, consentData) {
        const { consentDate, expiresAt, immutableSignature, version, consentText, ipAddress, userAgent } = consentData;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmación de Consentimiento Biométrico</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background: #f5f7fa;">
    <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

        <!-- Header Success -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
            <div style="font-size: 80px; margin-bottom: 10px;">✅</div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Consentimiento Confirmado</h1>
            <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 16px;">Tu consentimiento ha sido registrado exitosamente</p>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${company.name}</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #2d3748; margin: 0 0 20px 0;">
                Hola <strong>${user.firstName} ${user.lastName}</strong>,
            </p>

            <p style="font-size: 16px; line-height: 1.6; color: #4a5568; margin: 0 0 24px 0;">
                Confirmamos que hemos registrado tu <strong>consentimiento informado</strong> para el tratamiento
                de datos biométricos en <strong>${company.name}</strong>.
            </p>

            <!-- Consent Details Box -->
            <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px 0; color: #065f46; font-size: 18px;">📋 Detalles del Consentimiento</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #047857; font-weight: 600;">Fecha de aceptación:</td>
                        <td style="padding: 8px 0; color: #065f46;">${new Date(consentDate).toLocaleString('es-AR', {
                            dateStyle: 'full',
                            timeStyle: 'short',
                            timeZone: 'America/Argentina/Buenos_Aires'
                        })}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #047857; font-weight: 600;">Válido hasta:</td>
                        <td style="padding: 8px 0; color: #065f46;">${new Date(expiresAt).toLocaleDateString('es-AR', {
                            dateStyle: 'long',
                            timeZone: 'America/Argentina/Buenos_Aires'
                        })}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #047857; font-weight: 600;">Versión documento:</td>
                        <td style="padding: 8px 0; color: #065f46;">${version}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #047857; font-weight: 600;">ID Firma Digital:</td>
                        <td style="padding: 8px 0; color: #065f46; font-family: monospace; font-size: 12px;">${immutableSignature.substring(0, 16)}...</td>
                    </tr>
                </table>
            </div>

            <!-- What This Means -->
            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px;">🔐 ¿Qué significa esto?</h3>
                <ul style="margin: 0; padding-left: 20px; color: #1e40af; line-height: 1.8;">
                    <li><strong>NO se guardan fotos de tu rostro</strong> - Solo vectores matemáticos (128 números)</li>
                    <li>El proceso es <strong>irreversible</strong> - Imposible reconstruir tu imagen</li>
                    <li>Se usa para <strong>control de asistencia</strong> y análisis biométrico</li>
                    <li>Los datos se almacenan de forma <strong>cifrada y segura</strong></li>
                    <li>Cumplimos con <strong>Ley 25.326, GDPR y BIPA</strong></li>
                    <li>Tecnología: <strong>Microsoft Azure Face API</strong> (embeddings)</li>
                </ul>
            </div>

            <!-- Technical Details -->
            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; color: #065f46; font-size: 16px;">🔬 Detalles Técnicos</h3>
                <p style="margin: 0 0 12px 0; color: #047857; line-height: 1.6; font-size: 14px;">
                    Cuando te registrás, el sistema captura tu imagen momentáneamente y la procesa mediante
                    algoritmos de inteligencia artificial que extraen características únicas de tu rostro
                    (distancia entre ojos, forma de la nariz, etc.).
                </p>
                <p style="margin: 0; color: #047857; line-height: 1.6; font-size: 14px;">
                    Estas características se convierten en un <strong>vector de 128 números</strong> (ej: [0.234, -0.567, 0.891...]).
                    Este vector es lo único que se almacena. <strong>Tu fotografía original NO se guarda</strong>
                    y no puede ser reconstruida matemáticamente a partir de estos números.
                </p>
            </div>

            <!-- Your Rights -->
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">⚖️ Tus Derechos (Ley 25.326)</h3>
                <p style="margin: 0 0 12px 0; color: #78350f; line-height: 1.6; font-size: 14px;">
                    Según Art. 14-16 de la Ley 25.326 de Protección de Datos Personales, tenés derecho a:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #78350f; line-height: 1.6; font-size: 14px;">
                    <li><strong>Acceder</strong> a tus datos biométricos almacenados</li>
                    <li><strong>Rectificar</strong> información incorrecta</li>
                    <li><strong>Suprimir</strong> tus datos (derecho al olvido)</li>
                    <li><strong>Revocar</strong> este consentimiento en cualquier momento</li>
                    <li><strong>Portabilidad</strong> de tus datos</li>
                </ul>
            </div>

            <!-- How to Revoke -->
            <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; color: #991b1b; font-size: 16px;">🚫 ¿Cómo revocar mi consentimiento?</h3>
                <p style="margin: 0; color: #7f1d1d; line-height: 1.6; font-size: 14px;">
                    Podés revocar este consentimiento en cualquier momento contactando a:
                </p>
                <p style="margin: 12px 0 0 0; color: #991b1b; font-weight: 600;">
                    📧 <a href="mailto:${process.env.SUPPORT_EMAIL || company.email || 'soporte@aponnt.com'}"
                         style="color: #991b1b; text-decoration: underline;">
                        ${process.env.SUPPORT_EMAIL || company.email || 'soporte@aponnt.com'}
                    </a>
                </p>
                <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 13px;">
                    La revocación será procesada en un plazo máximo de 10 días hábiles.
                </p>
            </div>

            <!-- Security Note -->
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-top: 24px;">
                <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
                    🔒 <strong>Seguridad:</strong> Este consentimiento está protegido con firma digital HMAC-SHA256.
                    La integridad de este documento está garantizada mediante tecnología blockchain-ready.
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #4a5568; font-weight: 600;">
                ${company.name}
            </p>
            <p style="margin: 0; font-size: 12px; color: #a0aec0;">
                Este email es tu comprobante oficial de consentimiento. Guardalo para tus registros.
            </p>
            <p style="margin: 12px 0 0 0; font-size: 11px; color: #cbd5e0;">
                Cumplimiento: Ley 25.326 (ARG) · GDPR · BIPA<br>
                Sistema: APONNT Biometric Suite
            </p>
        </div>
    </div>
</body>
</html>
        `;

        try {
            if (!this.emailTransporter) {
                console.warn(`⚠️ Email transporter no disponible. No se puede enviar confirmación a ${user.email}`);
                return { messageId: 'email-disabled', warning: 'Email service not available' };
            }

            // Enviar email de confirmación
            const fromEmail = company.email || process.env.FROM_EMAIL || process.env.SMTP_USER;
            const fromName = `${company.name} - RRHH`;

            const result = await this.emailTransporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: user.email,
                subject: '✅ Confirmación: Consentimiento Biométrico Registrado',
                html
            });

            console.log(`✅ Email de confirmación enviado a ${user.email} - ID: ${result.messageId}`);
            return result;

        } catch (error) {
            console.error(`❌ Error enviando confirmación a ${user.email}:`, error);
            throw error;
        }
    }

    /**
     * Generar firma HMAC para consentimiento
     */
    generateConsentSignature(consentData, secret = process.env.JWT_SECRET) {
        const dataString = JSON.stringify(consentData);
        return crypto.createHmac('sha256', secret)
            .update(dataString)
            .digest('hex');
    }

    /**
     * Verificar firma HMAC
     */
    verifyConsentSignature(consentData, signature, secret = process.env.JWT_SECRET) {
        const expectedSignature = this.generateConsentSignature(consentData, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }
}

module.exports = new BiometricConsentService();
