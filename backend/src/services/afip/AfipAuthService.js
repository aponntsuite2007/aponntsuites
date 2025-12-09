/**
 * ============================================================================
 * AFIP AUTH SERVICE - Autenticación WSAA Multi-Tenant
 * ============================================================================
 *
 * Servicio para autenticación con WSAA (Web Service de Autenticación y Autorización)
 * de AFIP. Obtiene Token de Acceso (TA) válido por 12 horas.
 *
 * FEATURES:
 * - 100% Multi-tenant (usa certificado de cada empresa)
 * - Cache de tokens (12h TTL) en BD
 * - Ambiente testing y producción parametrizable
 * - Log completo de autenticaciones
 *
 * FLUJO:
 * 1. Generar TRA (Ticket de Requerimiento de Acceso) XML
 * 2. Firmar TRA con certificado digital de empresa
 * 3. Enviar a WSAA loginCms()
 * 4. Cachear Token + Sign en BD
 *
 * Created: 2025-01-20
 */

const soap = require('soap');
const forge = require('node-forge');
const moment = require('moment');
const { Sequelize } = require('sequelize');
const AfipCertificateManager = require('./AfipCertificateManager');
const { ENDPOINTS, SERVICIOS_WSAA } = require('./utils/afip-constants');

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

class AfipAuthService {
    /**
     * Obtener Token de Acceso (TA) de AFIP para una empresa
     *
     * @param {number} companyId - ID de la empresa
     * @param {string} service - Servicio AFIP (wsfe, wsfex, etc.)
     * @returns {Object} { token, sign, expiration }
     */
    async getAccessTicket(companyId, service = SERVICIOS_WSAA.WSFE) {
        console.log(`🔐 [WSAA] Obteniendo token para company ${companyId}, service ${service}...`);

        // 1. Verificar si hay token cacheado válido
        const cachedToken = await this.getCachedToken(companyId, service);
        if (cachedToken) {
            console.log(`✅ [WSAA] Token cacheado válido (expira ${cachedToken.expiration})`);
            return cachedToken;
        }

        // 2. Obtener configuración fiscal de la empresa
        const [fiscalConfig] = await sequelize.query(
            `SELECT
                cuit,
                afip_environment,
                certificate_type
             FROM company_fiscal_config
             WHERE company_id = :companyId
               AND is_active = true`,
            {
                replacements: { companyId },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        if (!fiscalConfig) {
            throw new Error(`Empresa ${companyId} no tiene configuración fiscal`);
        }

        const environment = fiscalConfig.afip_environment || 'TESTING';

        // 3. Obtener certificado digital
        const cert = await AfipCertificateManager.getCertificate(companyId);

        // 4. Generar TRA (Ticket de Requerimiento de Acceso)
        const tra = this.generateTRA(service);

        // 5. Firmar TRA con certificado
        const signedTRA = this.signTRA(tra, cert.certificatePEM, cert.privateKeyPEM);

        // 6. Llamar a WSAA loginCms()
        const endpoint = environment === 'PRODUCTION'
            ? ENDPOINTS.WSAA.PRODUCTION
            : ENDPOINTS.WSAA.TESTING;

        console.log(`   🌐 Endpoint WSAA: ${endpoint}`);

        const credentials = await this.callWSAALoginCms(endpoint, signedTRA);

        // 7. Parsear y extraer Token + Sign
        const { token, sign, expiration } = this.parseCredentials(credentials);

        // 8. Cachear en BD
        await this.cacheToken(companyId, service, token, sign, expiration);

        // 9. Log de autenticación
        await this.logAuthentication(companyId, service, tra, credentials, true, environment);

        console.log(`✅ [WSAA] Token obtenido exitosamente (expira ${expiration})`);

        return { token, sign, expiration };
    }

    /**
     * Generar TRA (Ticket de Requerimiento de Acceso) XML
     *
     * @param {string} service - Servicio AFIP (wsfe, wsfex, etc.)
     * @returns {string} XML del TRA
     */
    generateTRA(service) {
        const uniqueId = Math.floor(Date.now() / 1000); // Timestamp UNIX
        const generationTime = moment().toISOString();
        const expirationTime = moment().add(12, 'hours').toISOString();

        const tra = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
    <header>
        <uniqueId>${uniqueId}</uniqueId>
        <generationTime>${generationTime}</generationTime>
        <expirationTime>${expirationTime}</expirationTime>
    </header>
    <service>${service}</service>
</loginTicketRequest>`;

        return tra;
    }

    /**
     * Firmar TRA con certificado digital usando PKCS#7
     *
     * @param {string} tra - XML del TRA
     * @param {string} certificatePEM - Certificado en formato PEM
     * @param {string} privateKeyPEM - Clave privada en formato PEM
     * @returns {string} TRA firmado en Base64
     */
    signTRA(tra, certificatePEM, privateKeyPEM) {
        try {
            // Convertir PEM a objetos forge
            const cert = forge.pki.certificateFromPem(certificatePEM);
            const privateKey = forge.pki.privateKeyFromPem(privateKeyPEM);

            // Crear mensaje PKCS#7
            const p7 = forge.pkcs7.createSignedData();
            p7.content = forge.util.createBuffer(tra, 'utf8');

            // Agregar certificado
            p7.addCertificate(cert);

            // Firmar
            p7.addSigner({
                key: privateKey,
                certificate: cert,
                digestAlgorithm: forge.pki.oids.sha256,
                authenticatedAttributes: [{
                    type: forge.pki.oids.contentType,
                    value: forge.pki.oids.data
                }, {
                    type: forge.pki.oids.messageDigest
                }, {
                    type: forge.pki.oids.signingTime,
                    value: new Date()
                }]
            });

            // Generar PKCS#7 en formato DER
            p7.sign();

            const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
            const signedTRA = forge.util.encode64(der);

            return signedTRA;
        } catch (error) {
            console.error('❌ [WSAA] Error firmando TRA:', error.message);
            throw new Error(`Error al firmar TRA: ${error.message}`);
        }
    }

    /**
     * Llamar a WSAA loginCms() vía SOAP
     *
     * @param {string} endpoint - URL del WSDL de WSAA
     * @param {string} signedTRA - TRA firmado en Base64
     * @returns {string} XML de credenciales
     */
    async callWSAALoginCms(endpoint, signedTRA) {
        try {
            const client = await soap.createClientAsync(endpoint);

            const args = {
                in0: signedTRA
            };

            const [result] = await client.loginCmsAsync(args);

            return result.loginCmsReturn;
        } catch (error) {
            console.error('❌ [WSAA] Error en loginCms():', error.message);
            throw new Error(`Error en WSAA loginCms: ${error.message}`);
        }
    }

    /**
     * Parsear XML de credenciales de AFIP
     *
     * @param {string} credentialsXML - XML de credenciales
     * @returns {Object} { token, sign, expiration }
     */
    parseCredentials(credentialsXML) {
        try {
            const xml2js = require('xml2js');
            const parser = new xml2js.Parser();

            let credentials;
            parser.parseString(credentialsXML, (err, result) => {
                if (err) throw err;
                credentials = result;
            });

            const token = credentials.loginTicketResponse.credentials[0].token[0];
            const sign = credentials.loginTicketResponse.credentials[0].sign[0];
            const expiration = credentials.loginTicketResponse.header[0].expirationTime[0];

            return {
                token,
                sign,
                expiration: new Date(expiration)
            };
        } catch (error) {
            console.error('❌ [WSAA] Error parseando credenciales:', error.message);
            throw new Error(`Error al parsear credenciales: ${error.message}`);
        }
    }

    /**
     * Cachear token en BD
     *
     * @param {number} companyId - ID de la empresa
     * @param {string} service - Servicio AFIP
     * @param {string} token - Token obtenido
     * @param {string} sign - Sign obtenido
     * @param {Date} expiration - Fecha de expiración
     */
    async cacheToken(companyId, service, token, sign, expiration) {
        await sequelize.query(
            `UPDATE company_fiscal_config
             SET cached_token = :token,
                 cached_sign = :sign,
                 token_expiration = :expiration,
                 updated_at = CURRENT_TIMESTAMP
             WHERE company_id = :companyId`,
            {
                replacements: {
                    companyId,
                    token,
                    sign,
                    expiration
                },
                type: Sequelize.QueryTypes.UPDATE
            }
        );
    }

    /**
     * Obtener token cacheado si es válido
     *
     * @param {number} companyId - ID de la empresa
     * @param {string} service - Servicio AFIP
     * @returns {Object|null} { token, sign, expiration } o null
     */
    async getCachedToken(companyId, service) {
        const [cached] = await sequelize.query(
            `SELECT
                cached_token,
                cached_sign,
                token_expiration
             FROM company_fiscal_config
             WHERE company_id = :companyId
               AND cached_token IS NOT NULL
               AND token_expiration > CURRENT_TIMESTAMP + INTERVAL '5 minutes'`,
            {
                replacements: { companyId },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        if (!cached) {
            return null;
        }

        return {
            token: cached.cached_token,
            sign: cached.cached_sign,
            expiration: cached.token_expiration
        };
    }

    /**
     * Registrar autenticación en log
     *
     * @param {number} companyId - ID de la empresa
     * @param {string} service - Servicio AFIP
     * @param {string} traXML - TRA enviado
     * @param {string} responseXML - Response de WSAA
     * @param {boolean} success - Éxito o fallo
     * @param {string} environment - TESTING | PRODUCTION
     */
    async logAuthentication(companyId, service, traXML, responseXML, success, environment) {
        const crypto = require('crypto');

        // Hash del token para log (no guardar token completo)
        const tokenHash = crypto.createHash('sha256').update(responseXML || '').digest('hex');

        await sequelize.query(
            `INSERT INTO afip_auth_log (
                company_id,
                service,
                token_hash,
                generation_time,
                expiration_time,
                tra_xml,
                response_xml,
                success,
                environment
            ) VALUES (
                :companyId,
                :service,
                :tokenHash,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP + INTERVAL '12 hours',
                :traXML,
                :responseXML,
                :success,
                :environment
            )`,
            {
                replacements: {
                    companyId,
                    service,
                    tokenHash,
                    traXML,
                    responseXML,
                    success,
                    environment
                },
                type: Sequelize.QueryTypes.INSERT
            }
        );
    }

    /**
     * Invalidar token cacheado
     *
     * @param {number} companyId - ID de la empresa
     */
    async invalidateToken(companyId) {
        await sequelize.query(
            `UPDATE company_fiscal_config
             SET cached_token = NULL,
                 cached_sign = NULL,
                 token_expiration = NULL
             WHERE company_id = :companyId`,
            {
                replacements: { companyId },
                type: Sequelize.QueryTypes.UPDATE
            }
        );

        console.log(`🗑️ [WSAA] Token invalidado para company ${companyId}`);
    }
}

module.exports = new AfipAuthService();
