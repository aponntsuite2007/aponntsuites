/**
 * Company Account Routes - DATOS REALES
 * API para la relación comercial APONNT <-> Empresa Cliente
 *
 * USA TABLAS EXISTENTES:
 * - budgets (presupuestos) - del workflow de alta de empresa
 * - contracts (contratos) - del workflow de onboarding
 * - siac_facturas + siac_clientes (facturas) - sistema de facturación
 * - company_communications (comunicaciones) - NUEVA
 * - company_account_notifications (campanita) - NUEVA
 *
 * RESTRICCIÓN: Solo administradores de empresa
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { Pool } = require('pg');

// Database connection - usando variables individuales (igual que budgetOnboardingRoutes)
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB || 'attendance_system',
    port: 5432
});

// ============================================================================
// MIDDLEWARE: Solo admins pueden acceder
// ============================================================================
const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Acceso denegado. Solo administradores pueden acceder a este módulo.'
        });
    }
    next();
};

// Aplicar middleware a todas las rutas
router.use(auth);
router.use(adminOnly);

// ============================================================================
// HELPERS
// ============================================================================

function getCompanyId(req) {
    return req.user?.company_id || req.companyId;
}

// ============================================================================
// QUOTES / PRESUPUESTOS (tabla: budgets)
// ============================================================================

/**
 * GET /api/company-account/quotes
 * Obtiene todos los presupuestos de la empresa desde tabla budgets
 */
router.get('/quotes', async (req, res) => {
    try {
        const companyId = getCompanyId(req);

        const result = await pool.query(`
            SELECT
                b.id,
                b.budget_code as quote_number,
                b.created_at,
                b.valid_until,
                b.notes as description,
                b.total_monthly as total,
                (b.total_monthly * 12) as total_annual,
                b.status,
                b.selected_modules,
                b.contracted_employees,
                b.subtotal,
                b.price_per_employee,
                b.payment_method,
                b.sent_at,
                b.accepted_at,
                b.rejected_at,
                b.rejection_reason,
                CONCAT(s.first_name, ' ', s.last_name) as vendor_name,
                s.email as vendor_email
            FROM budgets b
            LEFT JOIN aponnt_staff s ON b.vendor_id = s.staff_id
            WHERE b.company_id = $1
            ORDER BY b.created_at DESC
        `, [companyId]);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error getting quotes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/company-account/quotes/:id
 * Obtiene detalle de un presupuesto específico
 */
router.get('/quotes/:id', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const { id } = req.params;

        const result = await pool.query(`
            SELECT
                b.*,
                CONCAT(s.first_name, ' ', s.last_name) as vendor_name,
                s.email as vendor_email,
                c.name as company_name
            FROM budgets b
            LEFT JOIN aponnt_staff s ON b.vendor_id = s.staff_id
            LEFT JOIN companies c ON b.company_id = c.company_id
            WHERE b.id = $1 AND b.company_id = $2
        `, [id, companyId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error getting quote detail:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// CONTRACTS / CONTRATOS (tabla: contracts)
// ============================================================================

/**
 * GET /api/company-account/contracts
 * Obtiene todos los contratos de la empresa
 */
router.get('/contracts', async (req, res) => {
    try {
        const companyId = getCompanyId(req);

        const result = await pool.query(`
            SELECT
                c.id,
                c.contract_code,
                c.contract_type as type,
                c.status,
                c.signed_at,
                c.contract_date,
                c.valid_until,
                c.signer_name as signed_by,
                c.signer_email,
                c.signer_role,
                c.total_monthly,
                (c.total_monthly * 12) as total_annual,
                c.payment_method,
                c.created_at,
                b.budget_code as related_quote,
                CONCAT(s.first_name, ' ', s.last_name) as vendor_name
            FROM contracts c
            LEFT JOIN budgets b ON c.budget_id = b.id
            LEFT JOIN aponnt_staff s ON b.vendor_id = s.staff_id
            WHERE c.company_id = $1
            ORDER BY c.created_at DESC
        `, [companyId]);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error getting contracts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/company-account/contracts/:id
 * Obtiene detalle de un contrato específico
 */
router.get('/contracts/:id', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const { id } = req.params;

        const result = await pool.query(`
            SELECT
                c.*,
                b.budget_code as related_quote,
                b.selected_modules,
                CONCAT(s.first_name, ' ', s.last_name) as vendor_name,
                comp.name as company_name
            FROM contracts c
            LEFT JOIN budgets b ON c.budget_id = b.id
            LEFT JOIN aponnt_staff s ON b.vendor_id = s.staff_id
            LEFT JOIN companies comp ON c.company_id = comp.company_id
            WHERE c.id = $1 AND c.company_id = $2
        `, [id, companyId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error getting contract detail:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// INVOICES / FACTURAS (tablas: siac_facturas + siac_clientes)
// ============================================================================

/**
 * GET /api/company-account/invoices
 * Obtiene todas las facturas de la empresa
 */
router.get('/invoices', async (req, res) => {
    try {
        const companyId = getCompanyId(req);

        const result = await pool.query(`
            SELECT
                f.id,
                f.numero_completo as invoice_number,
                f.fecha_factura as created_at,
                f.fecha_vencimiento as due_date,
                f.cliente_razon_social as client_name,
                f.cliente_documento_numero as client_tax_id,
                f.cliente_email,
                f.subtotal,
                f.descuento_porcentaje,
                f.descuento_importe,
                f.total_impuestos as tax,
                f.total_neto,
                f.total_factura as total,
                f.estado as status,
                f.observaciones as notes,
                f.notas_internas,
                f.cae,
                f.fecha_vencimiento_cae,
                f.tipo_comprobante_id
            FROM siac_facturas f
            INNER JOIN siac_clientes cl ON f.cliente_id = cl.id
            WHERE cl.company_id = $1
            ORDER BY f.fecha_factura DESC
        `, [companyId]);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error getting invoices:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/company-account/invoices/:id
 * Obtiene detalle de una factura específica
 */
router.get('/invoices/:id', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const { id } = req.params;

        const result = await pool.query(`
            SELECT
                f.*,
                comp.name as company_name
            FROM siac_facturas f
            INNER JOIN siac_clientes cl ON f.cliente_id = cl.id
            LEFT JOIN companies comp ON cl.company_id = comp.company_id
            WHERE f.id = $1 AND cl.company_id = $2
        `, [id, companyId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Factura no encontrada' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error getting invoice detail:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// COMMUNICATIONS / COMUNICACIONES (tabla: company_communications)
// ============================================================================

/**
 * GET /api/company-account/communications
 * Obtiene todas las comunicaciones APONNT <-> Empresa
 */
router.get('/communications', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const { status, direction } = req.query;

        let query = `
            SELECT
                cc.id,
                cc.direction,
                cc.department,
                cc.from_name,
                cc.subject,
                cc.message,
                cc.priority,
                cc.status,
                cc.requires_response,
                cc.response_deadline,
                cc.parent_id,
                cc.attachments,
                cc.read_at,
                cc.replied_at,
                cc.created_at,
                cc.updated_at,
                CASE WHEN cc.direction = 'inbound' THEN true ELSE false END as from_aponnt,
                CONCAT(s.first_name, ' ', s.last_name) as staff_name
            FROM company_communications cc
            LEFT JOIN aponnt_staff s ON cc.from_staff_id = s.staff_id
            WHERE cc.company_id = $1
        `;

        const params = [companyId];
        let paramIndex = 2;

        if (status) {
            query += ` AND cc.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (direction) {
            query += ` AND cc.direction = $${paramIndex}`;
            params.push(direction);
            paramIndex++;
        }

        query += ` ORDER BY cc.created_at DESC LIMIT 100`;

        const result = await pool.query(query, params);

        // Contar no leídos
        const unreadResult = await pool.query(`
            SELECT COUNT(*) as unread_count
            FROM company_communications
            WHERE company_id = $1 AND status = 'unread'
        `, [companyId]);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
            unread_count: parseInt(unreadResult.rows[0].unread_count)
        });
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error getting communications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/company-account/communications
 * Envía una nueva comunicación de la empresa hacia APONNT
 */
router.post('/communications', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const userId = req.user?.id || req.userId;
        const { department, subject, message, priority, parent_id } = req.body;

        if (!subject || !message) {
            return res.status(400).json({
                success: false,
                error: 'Asunto y mensaje son requeridos'
            });
        }

        // Obtener nombre del usuario
        const userResult = await pool.query(`
            SELECT CONCAT("firstName", ' ', "lastName") as full_name
            FROM users WHERE user_id = $1
        `, [userId]);

        const fromName = userResult.rows[0]?.full_name || 'Usuario';

        const result = await pool.query(`
            INSERT INTO company_communications (
                company_id, direction, department, from_user_id, from_name,
                subject, message, priority, status, parent_id
            ) VALUES (
                $1, 'outbound', $2, $3, $4, $5, $6, $7, 'unread', $8
            )
            RETURNING *
        `, [
            companyId,
            department || 'support',
            userId,
            fromName,
            subject,
            message,
            priority || 'normal',
            parent_id || null
        ]);

        // Crear notificación para staff de APONNT (futuro: integrar con notificaciones internas)
        console.log(`[COMPANY-ACCOUNT] Nueva comunicación de empresa ${companyId}: ${subject}`);

        res.json({
            success: true,
            message: 'Comunicación enviada correctamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error sending communication:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/company-account/communications/:id/read
 * Marca una comunicación como leída
 */
router.put('/communications/:id/read', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const userId = req.user?.id || req.userId;
        const { id } = req.params;

        const result = await pool.query(`
            UPDATE company_communications
            SET status = 'read', read_at = NOW(), read_by = $3
            WHERE id = $1 AND company_id = $2
            RETURNING *
        `, [id, companyId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Comunicación no encontrada' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error marking communication as read:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/company-account/communications/:id
 * Obtiene detalle de una comunicación con su hilo
 */
router.get('/communications/:id', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const { id } = req.params;

        // Obtener comunicación principal
        const mainResult = await pool.query(`
            SELECT cc.*,
                   CONCAT(s.first_name, ' ', s.last_name) as staff_name
            FROM company_communications cc
            LEFT JOIN aponnt_staff s ON cc.from_staff_id = s.staff_id
            WHERE cc.id = $1 AND cc.company_id = $2
        `, [id, companyId]);

        if (mainResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Comunicación no encontrada' });
        }

        // Obtener respuestas (hilo)
        const threadResult = await pool.query(`
            SELECT cc.*,
                   CONCAT(s.first_name, ' ', s.last_name) as staff_name
            FROM company_communications cc
            LEFT JOIN aponnt_staff s ON cc.from_staff_id = s.staff_id
            WHERE cc.parent_id = $1 AND cc.company_id = $2
            ORDER BY cc.created_at ASC
        `, [id, companyId]);

        res.json({
            success: true,
            data: mainResult.rows[0],
            thread: threadResult.rows
        });
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error getting communication detail:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// NOTIFICATIONS / CAMPANITA (tabla: company_account_notifications)
// ============================================================================

/**
 * GET /api/company-account/notifications
 * Obtiene notificaciones de cuenta para el admin
 */
router.get('/notifications', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const userId = req.user?.id;
        const { unread_only } = req.query;

        let query = `
            SELECT
                id,
                notification_type,
                title,
                message,
                reference_type,
                reference_id,
                priority,
                is_read,
                read_at,
                dismissed_at,
                action_url,
                created_at
            FROM company_account_notifications
            WHERE company_id = $1
              AND (user_id IS NULL OR user_id = $2)
              AND dismissed_at IS NULL
        `;

        const params = [companyId, userId];

        if (unread_only === 'true') {
            query += ` AND is_read = false`;
        }

        query += ` ORDER BY created_at DESC LIMIT 50`;

        const result = await pool.query(query, params);

        // Contar no leídas
        const unreadResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM company_account_notifications
            WHERE company_id = $1
              AND (user_id IS NULL OR user_id = $2)
              AND is_read = false
              AND dismissed_at IS NULL
        `, [companyId, userId]);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
            unread_count: parseInt(unreadResult.rows[0].count)
        });
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error getting notifications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/company-account/notifications/:id/read
 * Marca una notificación como leída
 */
router.put('/notifications/:id/read', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const { id } = req.params;

        const result = await pool.query(`
            UPDATE company_account_notifications
            SET is_read = true, read_at = NOW()
            WHERE id = $1 AND company_id = $2
            RETURNING *
        `, [id, companyId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Notificación no encontrada' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error marking notification as read:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/company-account/notifications/read-all
 * Marca todas las notificaciones como leídas
 */
router.put('/notifications/read-all', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const userId = req.user?.id;

        await pool.query(`
            UPDATE company_account_notifications
            SET is_read = true, read_at = NOW()
            WHERE company_id = $1
              AND (user_id IS NULL OR user_id = $2)
              AND is_read = false
        `, [companyId, userId]);

        res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error marking all notifications as read:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/company-account/notifications/:id
 * Descarta (dismiss) una notificación
 */
router.delete('/notifications/:id', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const { id } = req.params;

        const result = await pool.query(`
            UPDATE company_account_notifications
            SET dismissed_at = NOW()
            WHERE id = $1 AND company_id = $2
            RETURNING *
        `, [id, companyId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Notificación no encontrada' });
        }

        res.json({ success: true, message: 'Notificación descartada' });
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error dismissing notification:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// SUMMARY / RESUMEN EJECUTIVO
// ============================================================================

/**
 * GET /api/company-account/summary
 * Resumen ejecutivo de la cuenta comercial
 */
router.get('/summary', async (req, res) => {
    try {
        const companyId = getCompanyId(req);

        // Queries en paralelo para mejor performance
        const [
            quotesResult,
            contractsResult,
            invoicesResult,
            communicationsResult,
            notificationsResult
        ] = await Promise.all([
            // Presupuestos pendientes
            pool.query(`
                SELECT COUNT(*) as pending_count,
                       COALESCE(SUM(total_monthly), 0) as pending_total
                FROM budgets
                WHERE company_id = $1 AND status = 'PENDING'
            `, [companyId]),

            // Contratos activos
            pool.query(`
                SELECT COUNT(*) as active_count
                FROM contracts
                WHERE company_id = $1 AND status = 'SIGNED'
            `, [companyId]),

            // Facturas pendientes
            pool.query(`
                SELECT COUNT(*) as pending_count,
                       COALESCE(SUM(f.total_factura), 0) as pending_total
                FROM siac_facturas f
                INNER JOIN siac_clientes cl ON f.cliente_id = cl.id
                WHERE cl.company_id = $1 AND f.estado = 'pendiente'
            `, [companyId]),

            // Comunicaciones sin leer
            pool.query(`
                SELECT COUNT(*) as unread_count
                FROM company_communications
                WHERE company_id = $1 AND status = 'unread'
            `, [companyId]),

            // Notificaciones sin leer
            pool.query(`
                SELECT COUNT(*) as unread_count
                FROM company_account_notifications
                WHERE company_id = $1 AND is_read = false AND dismissed_at IS NULL
            `, [companyId])
        ]);

        res.json({
            success: true,
            data: {
                quotes: {
                    pending_count: parseInt(quotesResult.rows[0].pending_count),
                    pending_total: parseFloat(quotesResult.rows[0].pending_total)
                },
                contracts: {
                    active_count: parseInt(contractsResult.rows[0].active_count)
                },
                invoices: {
                    pending_count: parseInt(invoicesResult.rows[0].pending_count),
                    pending_total: parseFloat(invoicesResult.rows[0].pending_total)
                },
                communications: {
                    unread_count: parseInt(communicationsResult.rows[0].unread_count)
                },
                notifications: {
                    unread_count: parseInt(notificationsResult.rows[0].unread_count)
                }
            }
        });
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error getting summary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// DOCUMENT DOWNLOAD (placeholder para futuro PDF generator)
// ============================================================================

/**
 * GET /api/company-account/:type/:id/download
 * Descarga un documento (quote, contract, invoice) en PDF
 */
router.get('/:type/:id/download', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const { type, id } = req.params;

        const validTypes = ['quotes', 'contracts', 'invoices'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Tipo de documento inválido'
            });
        }

        // Verificar que el documento pertenece a la empresa
        let document = null;

        if (type === 'quotes') {
            const result = await pool.query(
                'SELECT * FROM budgets WHERE id = $1 AND company_id = $2',
                [id, companyId]
            );
            document = result.rows[0];
        } else if (type === 'contracts') {
            const result = await pool.query(
                'SELECT * FROM contracts WHERE id = $1 AND company_id = $2',
                [id, companyId]
            );
            document = result.rows[0];
        } else if (type === 'invoices') {
            const result = await pool.query(`
                SELECT f.* FROM siac_facturas f
                INNER JOIN siac_clientes cl ON f.cliente_id = cl.id
                WHERE f.id = $1 AND cl.company_id = $2
            `, [id, companyId]);
            document = result.rows[0];
        }

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Documento no encontrado'
            });
        }

        // TODO: Implementar generación real de PDF
        // Por ahora devolver info del documento
        res.json({
            success: true,
            message: 'Funcionalidad de descarga PDF en desarrollo',
            document: document
        });

    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Error downloading document:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
