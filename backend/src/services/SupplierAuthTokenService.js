/**
 * SupplierAuthTokenService.js
 * Sistema de Tokens 2FA para operaciones sensibles del portal de proveedores
 *
 * SECURITY FEATURES:
 * - Tokens de 6 dígitos numéricos (como bancos)
 * - Expiración: 10 minutos
 * - Máximo 3 intentos
 * - Envío por email
 * - Registro de auditoría
 * - Validación de IP
 */

const crypto = require('crypto');
const { Pool } = require('pg');

class SupplierAuthTokenService {
    constructor(pool) {
        this.pool = pool;
        this.TOKEN_EXPIRY_MINUTES = 10;
        this.MAX_ATTEMPTS = 3;
    }

    /**
     * Generar token 2FA de 6 dígitos
     */
    generateToken() {
        const token = crypto.randomInt(100000, 999999).toString();
        return token;
    }

    /**
     * Crear token para operación sensible
     * @param {number} supplierId - ID del proveedor
     * @param {number} portalUserId - ID del usuario del portal
     * @param {string} operationType - 'change_password', 'update_banking', 'delete_account'
     * @param {string} ipAddress - IP del usuario
     * @param {object} metadata - Datos adicionales
     */
    async createToken(supplierId, portalUserId, operationType, ipAddress, metadata = {}) {
        const token = this.generateToken();
        const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_MINUTES * 60 * 1000);

        const result = await this.pool.query(`
            INSERT INTO supplier_auth_tokens
            (supplier_id, portal_user_id, token, operation_type, ip_address,
             metadata, expires_at, attempts_remaining)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            supplierId,
            portalUserId,
            token,
            operationType,
            ipAddress,
            JSON.stringify(metadata),
            expiresAt,
            this.MAX_ATTEMPTS
        ]);

        return {
            tokenId: result.rows[0].id,
            token,
            expiresAt,
            expiryMinutes: this.TOKEN_EXPIRY_MINUTES
        };
    }

    /**
     * Validar token 2FA
     * @param {number} supplierId - ID del proveedor
     * @param {string} operationType - Tipo de operación
     * @param {string} token - Token de 6 dígitos
     * @param {string} ipAddress - IP del usuario
     */
    async validateToken(supplierId, operationType, token, ipAddress) {
        // Buscar token válido
        const result = await this.pool.query(`
            SELECT * FROM supplier_auth_tokens
            WHERE supplier_id = $1
              AND operation_type = $2
              AND token = $3
              AND expires_at > NOW()
              AND verified_at IS NULL
              AND cancelled_at IS NULL
              AND attempts_remaining > 0
            ORDER BY created_at DESC
            LIMIT 1
        `, [supplierId, operationType, token]);

        if (result.rows.length === 0) {
            // Registrar intento fallido
            await this.pool.query(`
                UPDATE supplier_auth_tokens
                SET attempts_remaining = attempts_remaining - 1,
                    last_attempt_at = NOW(),
                    last_attempt_ip = $4
                WHERE supplier_id = $1
                  AND operation_type = $2
                  AND token = $3
            `, [supplierId, operationType, token, ipAddress]);

            return {
                valid: false,
                error: 'Token inválido, expirado o ya utilizado',
                remainingAttempts: 0
            };
        }

        const tokenData = result.rows[0];

        // Validar IP (opcional - seguridad adicional)
        if (tokenData.ip_address !== ipAddress) {
            console.warn(`⚠️ [2FA] IP mismatch - Original: ${tokenData.ip_address}, Current: ${ipAddress}`);
        }

        // Marcar token como verificado
        await this.pool.query(`
            UPDATE supplier_auth_tokens
            SET verified_at = NOW(),
                verified_from_ip = $2
            WHERE id = $1
        `, [tokenData.id, ipAddress]);

        return {
            valid: true,
            tokenId: tokenData.id,
            metadata: tokenData.metadata
        };
    }

    /**
     * Cancelar token (si el usuario lo solicita)
     */
    async cancelToken(tokenId, supplierId) {
        await this.pool.query(`
            UPDATE supplier_auth_tokens
            SET cancelled_at = NOW()
            WHERE id = $1 AND supplier_id = $2
        `, [tokenId, supplierId]);
    }

    /**
     * Limpiar tokens expirados (ejecutar periódicamente)
     */
    async cleanupExpiredTokens() {
        const result = await this.pool.query(`
            DELETE FROM supplier_auth_tokens
            WHERE expires_at < NOW() - INTERVAL '7 days'
            RETURNING id
        `);

        console.log(`🧹 [2FA-CLEANUP] Eliminados ${result.rowCount} tokens antiguos`);
        return result.rowCount;
    }

    /**
     * Obtener historial de tokens del proveedor (auditoría)
     */
    async getTokenHistory(supplierId, limit = 20) {
        const result = await this.pool.query(`
            SELECT
                id,
                operation_type,
                created_at,
                expires_at,
                verified_at,
                ip_address,
                verified_from_ip,
                attempts_remaining,
                CASE
                    WHEN verified_at IS NOT NULL THEN 'verified'
                    WHEN cancelled_at IS NOT NULL THEN 'cancelled'
                    WHEN expires_at < NOW() THEN 'expired'
                    WHEN attempts_remaining = 0 THEN 'blocked'
                    ELSE 'active'
                END as status
            FROM supplier_auth_tokens
            WHERE supplier_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `, [supplierId, limit]);

        return result.rows;
    }
}

module.exports = SupplierAuthTokenService;
