/**
 * ============================================================================
 * AFIP CERTIFICATE MANAGER - Gestión Segura de Certificados Multi-Tenant
 * ============================================================================
 *
 * Gestiona certificados digitales X.509 de AFIP de manera segura y parametrizable.
 * Cada empresa tiene su propio certificado independiente.
 *
 * FEATURES:
 * - Encriptación de claves privadas (AES-256-CBC)
 * - Almacenamiento en BD (company_fiscal_config)
 * - Validación de expiración
 * - Soporte testing + producción
 *
 * IMPORTANTE: Las claves privadas NUNCA se devuelven sin desencriptar.
 *
 * Created: 2025-01-20
 */

const crypto = require('crypto');
const { Sequelize } = require('sequelize');

// Configurar conexión directa
const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD,
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

// CRITICAL: Esta clave debe estar en .env en producción
const ENCRYPTION_KEY = process.env.CERT_ENCRYPTION_KEY || 'change-this-key-in-production-32bytes!!';

class AfipCertificateManager {
    /**
     * Encriptar clave privada con AES-256-CBC
     *
     * @param {string} privateKeyPEM - Clave privada en formato PEM
     * @returns {string} Clave encriptada en Base64
     */
    encryptPrivateKey(privateKeyPEM) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(privateKeyPEM, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        // Concatenar IV + encrypted data
        const combined = iv.toString('base64') + ':' + encrypted;
        return combined;
    }

    /**
     * Desencriptar clave privada
     *
     * @param {string} encryptedData - Clave encriptada
     * @returns {string} Clave privada en formato PEM
     */
    decryptPrivateKey(encryptedData) {
        try {
            const algorithm = 'aes-256-cbc';
            const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

            // Separar IV y datos encriptados
            const [ivBase64, encrypted] = encryptedData.split(':');
            const iv = Buffer.from(ivBase64, 'base64');

            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            let decrypted = decipher.update(encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('❌ [CERT] Error desencriptando clave privada:', error.message);
            throw new Error('No se pudo desencriptar la clave privada. Verifique CERT_ENCRYPTION_KEY.');
        }
    }

    /**
     * Guardar certificado de empresa en BD
     *
     * @param {number} companyId - ID de la empresa
     * @param {Object} certData - Datos del certificado
     * @returns {boolean} Éxito
     */
    async saveCertificate(companyId, certData) {
        console.log(`🔐 [CERT] Guardando certificado para company ${companyId}...`);

        const {
            certificatePEM,
            privateKeyPEM,
            certificateExpiration,
            certificateType = 'TESTING' // TESTING | PRODUCTION
        } = certData;

        // Validar datos
        if (!certificatePEM || !privateKeyPEM) {
            throw new Error('Se requieren certificatePEM y privateKeyPEM');
        }

        // Encriptar clave privada
        const encryptedPrivateKey = this.encryptPrivateKey(privateKeyPEM);

        // Actualizar en BD
        const [result] = await sequelize.query(
            `UPDATE company_fiscal_config
             SET certificate_pem = :certificatePEM,
                 private_key_encrypted = :encryptedPrivateKey,
                 certificate_expiration = :certificateExpiration,
                 certificate_type = :certificateType,
                 updated_at = CURRENT_TIMESTAMP
             WHERE company_id = :companyId
             RETURNING id`,
            {
                replacements: {
                    companyId,
                    certificatePEM,
                    encryptedPrivateKey,
                    certificateExpiration,
                    certificateType
                },
                type: Sequelize.QueryTypes.UPDATE
            }
        );

        if (result.length === 0) {
            throw new Error(`No se encontró configuración fiscal para company ${companyId}`);
        }

        console.log(`✅ [CERT] Certificado guardado exitosamente`);
        return true;
    }

    /**
     * Obtener certificado y clave privada de empresa
     *
     * @param {number} companyId - ID de la empresa
     * @returns {Object} { certificatePEM, privateKeyPEM, expiration, type }
     */
    async getCertificate(companyId) {
        const [config] = await sequelize.query(
            `SELECT
                certificate_pem,
                private_key_encrypted,
                certificate_expiration,
                certificate_type
             FROM company_fiscal_config
             WHERE company_id = :companyId
               AND is_active = true`,
            {
                replacements: { companyId },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        if (!config) {
            throw new Error(`No se encontró configuración fiscal para company ${companyId}`);
        }

        if (!config.certificate_pem || !config.private_key_encrypted) {
            throw new Error(`La empresa ${companyId} no tiene certificado digital configurado`);
        }

        // Verificar expiración
        if (config.certificate_expiration && new Date(config.certificate_expiration) < new Date()) {
            throw new Error(`El certificado de la empresa ${companyId} está vencido`);
        }

        // Desencriptar clave privada
        const privateKeyPEM = this.decryptPrivateKey(config.private_key_encrypted);

        return {
            certificatePEM: config.certificate_pem,
            privateKeyPEM,
            expiration: config.certificate_expiration,
            type: config.certificate_type
        };
    }

    /**
     * Validar si empresa tiene certificado válido
     *
     * @param {number} companyId - ID de la empresa
     * @returns {Object} { valid, message, expiration }
     */
    async validateCertificate(companyId) {
        try {
            const [config] = await sequelize.query(
                `SELECT
                    certificate_pem,
                    certificate_expiration,
                    certificate_type
                 FROM company_fiscal_config
                 WHERE company_id = :companyId
                   AND is_active = true`,
                {
                    replacements: { companyId },
                    type: Sequelize.QueryTypes.SELECT
                }
            );

            if (!config) {
                return {
                    valid: false,
                    message: 'No se encontró configuración fiscal'
                };
            }

            if (!config.certificate_pem) {
                return {
                    valid: false,
                    message: 'No tiene certificado digital configurado'
                };
            }

            const expiration = new Date(config.certificate_expiration);
            const now = new Date();

            if (expiration < now) {
                return {
                    valid: false,
                    message: 'Certificado vencido',
                    expiration
                };
            }

            // Advertir si vence en menos de 30 días
            const daysToExpire = Math.floor((expiration - now) / (1000 * 60 * 60 * 24));
            if (daysToExpire < 30) {
                return {
                    valid: true,
                    warning: `Certificado vence en ${daysToExpire} días`,
                    expiration,
                    type: config.certificate_type
                };
            }

            return {
                valid: true,
                message: 'Certificado válido',
                expiration,
                type: config.certificate_type
            };

        } catch (error) {
            return {
                valid: false,
                message: error.message
            };
        }
    }

    /**
     * Eliminar certificado de empresa (soft delete)
     *
     * @param {number} companyId - ID de la empresa
     * @returns {boolean} Éxito
     */
    async removeCertificate(companyId) {
        console.log(`🗑️ [CERT] Eliminando certificado para company ${companyId}...`);

        await sequelize.query(
            `UPDATE company_fiscal_config
             SET certificate_pem = NULL,
                 private_key_encrypted = NULL,
                 certificate_expiration = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE company_id = :companyId`,
            {
                replacements: { companyId },
                type: Sequelize.QueryTypes.UPDATE
            }
        );

        console.log(`✅ [CERT] Certificado eliminado`);
        return true;
    }
}

module.exports = new AfipCertificateManager();
