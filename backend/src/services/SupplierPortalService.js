/**
 * SupplierPortalService.js
 * Servicio completo para el Portal de Proveedores P2P
 *
 * Flujo P2P completo:
 * Requisición → RFQ → Cotización → OC → Recepción → Factura → Reclamo → Pago
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SupplierAuthTokenService = require('./SupplierAuthTokenService');

class SupplierPortalService {
    constructor() {
        // 🔐 SEGURIDAD: No usar fallback de password - debe venir de .env
        this.pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'attendance_system'
        });
        this.authTokenService = new SupplierAuthTokenService(this.pool);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTENTICACIÓN DEL PORTAL
    // ═══════════════════════════════════════════════════════════════════════════

    async registerPortalUser(supplierId, userData) {
        const { email, password, firstName, lastName, phone, role = 'sales' } = userData;

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await this.pool.query(`
            INSERT INTO supplier_portal_users
            (supplier_id, email, password_hash, first_name, last_name, phone, role)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, email, first_name, last_name, role
        `, [supplierId, email, passwordHash, firstName, lastName, phone, role]);

        return result.rows[0];
    }

    async loginPortal(email, password) {
        const result = await this.pool.query(`
            SELECT spu.*, ws.name as supplier_name, ws.id as supplier_id
            FROM supplier_portal_users spu
            JOIN wms_suppliers ws ON spu.supplier_id = ws.id
            WHERE spu.email = $1 AND spu.is_active = true
        `, [email]);

        if (result.rows.length === 0) {
            throw new Error('Credenciales inválidas');
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            throw new Error('Credenciales inválidas');
        }

        // Update login stats
        await this.pool.query(`
            UPDATE supplier_portal_users
            SET last_login = NOW(), login_count = login_count + 1
            WHERE id = $1
        `, [user.id]);

        const token = jwt.sign(
            {
                userId: user.id,
                supplierId: user.supplier_id,
                email: user.email,
                role: user.role,
                type: 'supplier_portal'
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                supplierId: user.supplier_id,
                supplierName: user.supplier_name,
                mustChangePassword: user.must_change_password,
                emailVerified: user.email_verified,
                bankingInfoComplete: user.banking_info_complete,
                canQuote: user.can_quote
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SELF-SERVICE - GESTIÓN DE PERFIL
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Cambiar contraseña (self-service)
     * Requiere contraseña actual para validación
     */
    async changeSelfPassword(portalUserId, supplierId, currentPassword, newPassword) {
        // Verificar contraseña actual
        const userResult = await this.pool.query(`
            SELECT * FROM supplier_portal_users
            WHERE id = $1 AND supplier_id = $2
        `, [portalUserId, supplierId]);

        if (userResult.rows.length === 0) {
            throw new Error('Usuario no encontrado');
        }

        const user = userResult.rows[0];
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

        if (!validPassword) {
            throw new Error('Contraseña actual incorrecta');
        }

        // Validar nueva contraseña (mínimo 8 caracteres)
        if (newPassword.length < 8) {
            throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
        }

        // Hash nueva contraseña
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Actualizar contraseña y marcar que ya fue cambiada
        await this.pool.query(`
            UPDATE supplier_portal_users
            SET password_hash = $1,
                must_change_password = false,
                password_changed_at = NOW(),
                updated_at = NOW()
            WHERE id = $2
        `, [newPasswordHash, portalUserId]);

        console.log(`✅ [SUPPLIER-PORTAL] Usuario ${user.email} cambió su contraseña`);

        return { success: true, message: 'Contraseña cambiada exitosamente' };
    }

    /**
     * Solicitar token 2FA para cambio de datos bancarios
     */
    async requestBankingToken(portalUserId, supplierId, ipAddress) {
        const userResult = await this.pool.query(`
            SELECT spu.*, ws.name as supplier_name, ws.bank_name, ws.bank_account_number
            FROM supplier_portal_users spu
            JOIN wms_suppliers ws ON spu.supplier_id = ws.id
            WHERE spu.id = $1 AND spu.supplier_id = $2
        `, [portalUserId, supplierId]);

        if (userResult.rows.length === 0) {
            throw new Error('Usuario no encontrado');
        }

        const user = userResult.rows[0];

        // Crear token 2FA
        const metadata = {
            email: user.email,
            supplierName: user.supplier_name,
            currentBankName: user.bank_name,
            currentAccountNumber: user.bank_account_number
        };

        const tokenData = await this.authTokenService.createToken(
            supplierId,
            portalUserId,
            'update_banking',
            ipAddress,
            metadata
        );

        // TODO: Enviar token por email (integrar con servicio de email)
        console.log(`📱 [2FA] Token ${tokenData.token} generado para ${user.email} (válido ${tokenData.expiryMinutes} min)`);

        // En producción, NO devolver el token - solo enviarlo por email
        // Por ahora lo devolvemos para testing
        return {
            success: true,
            message: `Código de verificación enviado a ${user.email}`,
            tokenId: tokenData.tokenId,
            expiresAt: tokenData.expiresAt
        };
    }

    /**
     * Actualizar información bancaria con validación 2FA
     */
    async updateBankingInfo(portalUserId, supplierId, bankingData, token2FA, ipAddress) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Validar token 2FA
            const tokenValidation = await this.authTokenService.validateToken(
                supplierId,
                'update_banking',
                token2FA,
                ipAddress
            );

            if (!tokenValidation.valid) {
                throw new Error(tokenValidation.error || 'Token 2FA inválido');
            }

            const { bankName, bankAccountNumber, bankAccountType, bankRoutingNumber, accountHolderName } = bankingData;

            // Obtener datos actuales para auditoría
            const currentData = await client.query(`
                SELECT bank_name, bank_account_number FROM wms_suppliers WHERE id = $1
            `, [supplierId]);

            // Actualizar datos bancarios
            await client.query(`
                UPDATE wms_suppliers
                SET bank_name = $1,
                    bank_account_number = $2,
                    bank_account_type = $3,
                    bank_routing_number = $4,
                    account_holder_name = $5,
                    bank_info_last_updated_at = NOW(),
                    bank_info_last_updated_by = $6,
                    bank_info_2fa_token_id = $7,
                    updated_at = NOW()
                WHERE id = $8
            `, [bankName, bankAccountNumber, bankAccountType, bankRoutingNumber, accountHolderName,
                portalUserId, tokenValidation.tokenId, supplierId]);

            // Marcar que el usuario completó sus datos bancarios
            await client.query(`
                UPDATE supplier_portal_users
                SET banking_info_complete = true,
                    banking_info_verified_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1
            `, [portalUserId]);

            await client.query('COMMIT');

            console.log(`✅ [BANKING] Proveedor ${supplierId} actualizó datos bancarios con 2FA`);
            console.log(`   📝 Banco anterior: ${currentData.rows[0]?.bank_name || 'N/A'}`);
            console.log(`   📝 Banco nuevo: ${bankName}`);

            return {
                success: true,
                message: 'Información bancaria actualizada exitosamente'
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Obtener estado de compliance del proveedor
     * Indica si puede cotizar y qué pasos le faltan
     */
    async getComplianceStatus(portalUserId, supplierId) {
        const result = await this.pool.query(`
            SELECT * FROM check_supplier_can_quote($1)
        `, [portalUserId]);

        const complianceData = result.rows[0];

        // Obtener detalles adicionales
        const userDetails = await this.pool.query(`
            SELECT
                email_verified,
                must_change_password,
                banking_info_complete,
                can_quote,
                email,
                first_name,
                last_name
            FROM supplier_portal_users
            WHERE id = $1 AND supplier_id = $2
        `, [portalUserId, supplierId]);

        const user = userDetails.rows[0];

        return {
            canQuote: complianceData.can_quote,
            reason: complianceData.reason,
            missingSteps: complianceData.missing_steps || [],
            details: {
                emailVerified: user.email_verified,
                passwordChanged: !user.must_change_password,
                bankingInfoComplete: user.banking_info_complete
            },
            user: {
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DASHBOARD DEL PROVEEDOR
    // ═══════════════════════════════════════════════════════════════════════════

    async getSupplierDashboard(supplierId) {
        const [
            pendingRfqs,
            activeOrders,
            pendingClaims,
            pendingPayments,
            monthlyStats,
            recentNotifications
        ] = await Promise.all([
            // RFQs pendientes de respuesta
            this.pool.query(`
                SELECT COUNT(*) as count FROM rfq_invitations ri
                JOIN request_for_quotations rfq ON ri.rfq_id = rfq.id
                WHERE ri.supplier_id = $1
                AND ri.status = 'pending'
                AND rfq.status = 'open'
                AND rfq.submission_deadline > NOW()
            `, [supplierId]),

            // Órdenes activas
            this.pool.query(`
                SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
                FROM purchase_orders
                WHERE supplier_id = $1
                AND status IN ('confirmed', 'in_progress', 'partially_received')
            `, [supplierId]),

            // Reclamos pendientes
            this.pool.query(`
                SELECT COUNT(*) as count FROM supplier_claims
                WHERE supplier_id = $1
                AND status IN ('submitted', 'acknowledged', 'in_progress')
            `, [supplierId]),

            // Pagos pendientes (facturas aprobadas sin pagar)
            this.pool.query(`
                SELECT COUNT(*) as count, COALESCE(SUM(balance_due), 0) as total
                FROM supplier_invoices
                WHERE supplier_id = $1
                AND status = 'approved'
                AND payment_status IN ('pending', 'partial')
            `, [supplierId]),

            // Estadísticas del mes actual
            this.pool.query(`
                SELECT * FROM supplier_monthly_stats
                WHERE supplier_id = $1
                AND year_month = TO_CHAR(NOW(), 'YYYY-MM')
            `, [supplierId]),

            // Notificaciones recientes no leídas
            this.pool.query(`
                SELECT * FROM supplier_notifications
                WHERE supplier_id = $1
                AND read_at IS NULL
                ORDER BY created_at DESC
                LIMIT 10
            `, [supplierId])
        ]);

        return {
            pendingRfqs: parseInt(pendingRfqs.rows[0]?.count || 0),
            activeOrders: {
                count: parseInt(activeOrders.rows[0]?.count || 0),
                total: parseFloat(activeOrders.rows[0]?.total || 0)
            },
            pendingClaims: parseInt(pendingClaims.rows[0]?.count || 0),
            pendingPayments: {
                count: parseInt(pendingPayments.rows[0]?.count || 0),
                total: parseFloat(pendingPayments.rows[0]?.total || 0)
            },
            monthlyStats: monthlyStats.rows[0] || null,
            notifications: recentNotifications.rows
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RFQ - SOLICITUD DE COTIZACIÓN
    // ═══════════════════════════════════════════════════════════════════════════

    async getSupplierRfqs(supplierId, filters = {}) {
        const { status, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE ri.supplier_id = $1';
        const params = [supplierId];

        if (status) {
            params.push(status);
            whereClause += ` AND ri.status = $${params.length}`;
        }

        const result = await this.pool.query(`
            SELECT
                ri.id as invitation_id,
                ri.status as invitation_status,
                ri.invitation_sent_at,
                ri.invitation_read_at,
                rfq.*,
                c.name as company_name,
                (SELECT COUNT(*) FROM rfq_items WHERE rfq_id = rfq.id) as item_count,
                sq.id as quotation_id,
                sq.status as quotation_status
            FROM rfq_invitations ri
            JOIN request_for_quotations rfq ON ri.rfq_id = rfq.id
            JOIN companies c ON rfq.company_id = c.company_id
            LEFT JOIN supplier_quotations sq ON sq.rfq_id = rfq.id AND sq.supplier_id = ri.supplier_id
            ${whereClause}
            ORDER BY rfq.submission_deadline ASC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]);

        return result.rows;
    }

    async getRfqDetails(rfqId, supplierId) {
        const [rfq, items, invitation, existingQuotation] = await Promise.all([
            this.pool.query(`
                SELECT rfq.*, c.name as company_name
                FROM request_for_quotations rfq
                JOIN companies c ON rfq.company_id = c.company_id
                WHERE rfq.id = $1
            `, [rfqId]),

            this.pool.query(`
                SELECT * FROM rfq_items WHERE rfq_id = $1
            `, [rfqId]),

            this.pool.query(`
                SELECT * FROM rfq_invitations
                WHERE rfq_id = $1 AND supplier_id = $2
            `, [rfqId, supplierId]),

            this.pool.query(`
                SELECT sq.*,
                    (SELECT json_agg(sqi.*) FROM supplier_quotation_items sqi WHERE sqi.quotation_id = sq.id) as items
                FROM supplier_quotations sq
                WHERE sq.rfq_id = $1 AND sq.supplier_id = $2
            `, [rfqId, supplierId])
        ]);

        // Mark invitation as read
        if (invitation.rows[0] && !invitation.rows[0].invitation_read_at) {
            await this.pool.query(`
                UPDATE rfq_invitations
                SET invitation_read_at = NOW(), status = 'viewed'
                WHERE id = $1
            `, [invitation.rows[0].id]);
        }

        return {
            rfq: rfq.rows[0],
            items: items.rows,
            invitation: invitation.rows[0],
            existingQuotation: existingQuotation.rows[0]
        };
    }

    async submitQuotation(supplierId, rfqId, quotationData, portalUserId) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const { items, validUntil, deliveryDays, deliveryTerms, paymentTerms, warrantyTerms, notes } = quotationData;

            // Calculate totals
            let subtotal = 0;
            let taxAmount = 0;

            for (const item of items) {
                const lineSubtotal = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100);
                const lineTax = lineSubtotal * (item.taxRate || 21) / 100;
                subtotal += lineSubtotal;
                taxAmount += lineTax;
            }

            const total = subtotal + taxAmount;

            // Generate quotation number
            const countResult = await client.query(`
                SELECT COUNT(*) + 1 as next_num FROM supplier_quotations WHERE supplier_id = $1
            `, [supplierId]);
            const quotationNumber = `COT-${supplierId}-${String(countResult.rows[0].next_num).padStart(5, '0')}`;

            // Insert quotation
            const quotationResult = await client.query(`
                INSERT INTO supplier_quotations
                (rfq_id, supplier_id, quotation_number, status, subtotal, tax_amount, total,
                 valid_until, delivery_days, delivery_terms, payment_terms, warranty_terms, notes,
                 submitted_at, submitted_by)
                VALUES ($1, $2, $3, 'submitted', $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13)
                RETURNING *
            `, [rfqId, supplierId, quotationNumber, subtotal, taxAmount, total,
                validUntil, deliveryDays, deliveryTerms, paymentTerms, warrantyTerms, notes, portalUserId]);

            const quotationId = quotationResult.rows[0].id;

            // Insert items
            for (const item of items) {
                const lineSubtotal = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100);
                const lineTax = lineSubtotal * (item.taxRate || 21) / 100;
                const lineTotal = lineSubtotal + lineTax;

                await client.query(`
                    INSERT INTO supplier_quotation_items
                    (quotation_id, rfq_item_id, product_id, product_code, product_name,
                     quantity, unit_price, discount_percent, tax_rate,
                     line_subtotal, line_tax, line_total, delivery_date, notes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                `, [quotationId, item.rfqItemId, item.productId, item.productCode, item.productName,
                    item.quantity, item.unitPrice, item.discountPercent || 0, item.taxRate || 21,
                    lineSubtotal, lineTax, lineTotal, item.deliveryDate, item.notes]);
            }

            // Update invitation status
            await client.query(`
                UPDATE rfq_invitations
                SET status = 'quoted'
                WHERE rfq_id = $1 AND supplier_id = $2
            `, [rfqId, supplierId]);

            await client.query('COMMIT');

            return quotationResult.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async declineRfq(supplierId, rfqId, reason) {
        await this.pool.query(`
            UPDATE rfq_invitations
            SET status = 'declined', declined_reason = $3, declined_at = NOW()
            WHERE rfq_id = $1 AND supplier_id = $2
        `, [rfqId, supplierId, reason]);

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ÓRDENES DE COMPRA
    // ═══════════════════════════════════════════════════════════════════════════

    async getSupplierOrders(supplierId, filters = {}) {
        const { status, dateFrom, dateTo, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE po.supplier_id = $1';
        const params = [supplierId];

        if (status) {
            params.push(status);
            whereClause += ` AND po.status = $${params.length}`;
        }

        if (dateFrom) {
            params.push(dateFrom);
            whereClause += ` AND po.order_date >= $${params.length}`;
        }

        if (dateTo) {
            params.push(dateTo);
            whereClause += ` AND po.order_date <= $${params.length}`;
        }

        const result = await this.pool.query(`
            SELECT
                po.*,
                c.name as company_name,
                (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id) as item_count,
                (SELECT COUNT(*) FROM goods_receipts WHERE purchase_order_id = po.id) as receipts_count,
                (SELECT COUNT(*) FROM supplier_claims WHERE purchase_order_id = po.id AND status NOT IN ('resolved', 'closed', 'cancelled')) as pending_claims
            FROM purchase_orders po
            JOIN companies c ON po.company_id = c.company_id
            ${whereClause}
            ORDER BY po.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]);

        return result.rows;
    }

    async getOrderDetails(orderId, supplierId) {
        const [order, items, receipts, claims] = await Promise.all([
            this.pool.query(`
                SELECT po.*, c.name as company_name
                FROM purchase_orders po
                JOIN companies c ON po.company_id = c.company_id
                WHERE po.id = $1 AND po.supplier_id = $2
            `, [orderId, supplierId]),

            this.pool.query(`
                SELECT poi.*,
                    COALESCE(
                        (SELECT SUM(quantity_received) FROM goods_receipt_items gri
                         WHERE gri.po_item_id = poi.id), 0
                    ) as total_received
                FROM purchase_order_items poi
                WHERE poi.purchase_order_id = $1
            `, [orderId]),

            this.pool.query(`
                SELECT * FROM goods_receipts
                WHERE purchase_order_id = $1
                ORDER BY receipt_date DESC
            `, [orderId]),

            this.pool.query(`
                SELECT * FROM supplier_claims
                WHERE purchase_order_id = $1
                ORDER BY created_at DESC
            `, [orderId])
        ]);

        return {
            order: order.rows[0],
            items: items.rows,
            receipts: receipts.rows,
            claims: claims.rows
        };
    }

    async confirmOrder(orderId, supplierId, confirmationData) {
        const { expectedDelivery, notes } = confirmationData;

        const result = await this.pool.query(`
            UPDATE purchase_orders
            SET status = 'confirmed',
                expected_delivery = COALESCE($3, expected_delivery),
                notes = COALESCE($4, notes),
                updated_at = NOW()
            WHERE id = $1 AND supplier_id = $2 AND status = 'sent'
            RETURNING *
        `, [orderId, supplierId, expectedDelivery, notes]);

        if (result.rows.length === 0) {
            throw new Error('Orden no encontrada o no puede ser confirmada');
        }

        return result.rows[0];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FACTURAS
    // ═══════════════════════════════════════════════════════════════════════════

    async getSupplierInvoices(supplierId, filters = {}) {
        const { status, paymentStatus, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE si.supplier_id = $1';
        const params = [supplierId];

        if (status) {
            params.push(status);
            whereClause += ` AND si.status = $${params.length}`;
        }

        if (paymentStatus) {
            params.push(paymentStatus);
            whereClause += ` AND si.payment_status = $${params.length}`;
        }

        const result = await this.pool.query(`
            SELECT
                si.*,
                c.name as company_name,
                po.po_number
            FROM supplier_invoices si
            JOIN companies c ON si.company_id = c.company_id
            LEFT JOIN purchase_orders po ON si.purchase_order_id = po.id
            ${whereClause}
            ORDER BY si.invoice_date DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]);

        return result.rows;
    }

    async getInvoiceDetails(invoiceId, supplierId) {
        const [invoice, items, payments, creditNotes] = await Promise.all([
            this.pool.query(`
                SELECT si.*, c.name as company_name, po.po_number
                FROM supplier_invoices si
                JOIN companies c ON si.company_id = c.company_id
                LEFT JOIN purchase_orders po ON si.purchase_order_id = po.id
                WHERE si.id = $1 AND si.supplier_id = $2
            `, [invoiceId, supplierId]),

            this.pool.query(`
                SELECT * FROM supplier_invoice_items WHERE invoice_id = $1
            `, [invoiceId]),

            this.pool.query(`
                SELECT poi.*, payord.payment_order_number, payord.status as payment_status, payord.payment_date
                FROM payment_order_invoices poi
                JOIN payment_orders payord ON poi.payment_order_id = payord.id
                WHERE poi.invoice_id = $1
            `, [invoiceId]),

            this.pool.query(`
                SELECT * FROM supplier_credit_notes WHERE invoice_id = $1
            `, [invoiceId])
        ]);

        return {
            invoice: invoice.rows[0],
            items: items.rows,
            payments: payments.rows,
            creditNotes: creditNotes.rows
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RECLAMOS
    // ═══════════════════════════════════════════════════════════════════════════

    async getSupplierClaims(supplierId, filters = {}) {
        const { status, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE sc.supplier_id = $1';
        const params = [supplierId];

        if (status) {
            params.push(status);
            whereClause += ` AND sc.status = $${params.length}`;
        }

        const result = await this.pool.query(`
            SELECT
                sc.*,
                c.name as company_name,
                po.po_number,
                (SELECT COUNT(*) FROM supplier_claim_items WHERE claim_id = sc.id) as item_count,
                (SELECT COUNT(*) FROM supplier_claim_messages WHERE claim_id = sc.id AND is_internal = false) as message_count
            FROM supplier_claims sc
            JOIN companies c ON sc.company_id = c.company_id
            LEFT JOIN purchase_orders po ON sc.purchase_order_id = po.id
            ${whereClause}
            ORDER BY
                CASE WHEN sc.status IN ('submitted', 'acknowledged') THEN 0 ELSE 1 END,
                sc.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]);

        return result.rows;
    }

    async getClaimDetails(claimId, supplierId) {
        const [claim, items, messages, creditNote, replacement] = await Promise.all([
            this.pool.query(`
                SELECT sc.*, c.name as company_name, po.po_number
                FROM supplier_claims sc
                JOIN companies c ON sc.company_id = c.company_id
                LEFT JOIN purchase_orders po ON sc.purchase_order_id = po.id
                WHERE sc.id = $1 AND sc.supplier_id = $2
            `, [claimId, supplierId]),

            this.pool.query(`
                SELECT * FROM supplier_claim_items WHERE claim_id = $1
            `, [claimId]),

            this.pool.query(`
                SELECT * FROM supplier_claim_messages
                WHERE claim_id = $1 AND is_internal = false
                ORDER BY created_at ASC
            `, [claimId]),

            this.pool.query(`
                SELECT * FROM supplier_credit_notes WHERE claim_id = $1
            `, [claimId]),

            this.pool.query(`
                SELECT rr.*,
                    (SELECT json_agg(rri.*) FROM replacement_receipt_items rri WHERE rri.receipt_id = rr.id) as items
                FROM replacement_receipts rr
                WHERE rr.claim_id = $1
            `, [claimId])
        ]);

        return {
            claim: claim.rows[0],
            items: items.rows,
            messages: messages.rows,
            creditNote: creditNote.rows[0],
            replacement: replacement.rows[0]
        };
    }

    async acknowledgeClaimSupplier(claimId, supplierId, portalUserId) {
        const result = await this.pool.query(`
            UPDATE supplier_claims
            SET status = 'acknowledged',
                acknowledged_at = NOW(),
                acknowledged_by = $3,
                updated_at = NOW()
            WHERE id = $1 AND supplier_id = $2 AND status = 'submitted'
            RETURNING *
        `, [claimId, supplierId, portalUserId]);

        return result.rows[0];
    }

    async respondToClaim(claimId, supplierId, responseData, portalUserId) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const { resolutionType, message, items } = responseData;

            // Add message
            await client.query(`
                INSERT INTO supplier_claim_messages
                (claim_id, sender_type, sender_id, sender_name, message)
                VALUES ($1, 'supplier', $2,
                    (SELECT CONCAT(first_name, ' ', last_name) FROM supplier_portal_users WHERE id = $2),
                    $3)
            `, [claimId, portalUserId, message]);

            // Update claim status
            await client.query(`
                UPDATE supplier_claims
                SET status = 'in_progress',
                    resolution_type = $3,
                    updated_at = NOW()
                WHERE id = $1 AND supplier_id = $2
            `, [claimId, supplierId, resolutionType]);

            // Update item resolutions if provided
            if (items && items.length > 0) {
                for (const item of items) {
                    await client.query(`
                        UPDATE supplier_claim_items
                        SET resolution_type = $2,
                            replacement_quantity = $3,
                            credit_amount = $4,
                            status = 'accepted'
                        WHERE id = $1
                    `, [item.id, item.resolutionType, item.replacementQuantity, item.creditAmount]);
                }
            }

            await client.query('COMMIT');

            return { success: true };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async submitCreditNote(claimId, supplierId, creditNoteData) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const claim = await client.query(`
                SELECT * FROM supplier_claims WHERE id = $1 AND supplier_id = $2
            `, [claimId, supplierId]);

            if (!claim.rows[0]) {
                throw new Error('Reclamo no encontrado');
            }

            const { creditNoteNumber, creditNoteDate, items, notes } = creditNoteData;

            // Calculate totals
            let subtotal = 0;
            let taxAmount = 0;

            for (const item of items) {
                const lineSubtotal = item.quantity * item.unitPrice;
                const lineTax = lineSubtotal * (item.taxRate || 21) / 100;
                subtotal += lineSubtotal;
                taxAmount += lineTax;
            }

            const total = subtotal + taxAmount;

            // Generate internal number
            const countResult = await client.query(`
                SELECT COUNT(*) + 1 as next_num FROM supplier_credit_notes WHERE supplier_id = $1
            `, [supplierId]);
            const internalNumber = `NC-${supplierId}-${String(countResult.rows[0].next_num).padStart(5, '0')}`;

            // Insert credit note
            const cnResult = await client.query(`
                INSERT INTO supplier_credit_notes
                (company_id, credit_note_number, internal_number, supplier_id, claim_id,
                 reason, credit_note_date, subtotal, tax_amount, total, balance, status)
                VALUES ($1, $2, $3, $4, $5, 'claim_resolution', $6, $7, $8, $9, $9, 'pending')
                RETURNING *
            `, [claim.rows[0].company_id, creditNoteNumber, internalNumber, supplierId, claimId,
                creditNoteDate, subtotal, taxAmount, total]);

            const creditNoteId = cnResult.rows[0].id;

            // Insert items
            for (const item of items) {
                const lineSubtotal = item.quantity * item.unitPrice;
                const lineTax = lineSubtotal * (item.taxRate || 21) / 100;
                const lineTotal = lineSubtotal + lineTax;

                await client.query(`
                    INSERT INTO supplier_credit_note_items
                    (credit_note_id, claim_item_id, product_id, product_code, product_name,
                     quantity, unit_price, tax_rate, line_subtotal, line_tax, line_total, notes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [creditNoteId, item.claimItemId, item.productId, item.productCode, item.productName,
                    item.quantity, item.unitPrice, item.taxRate || 21, lineSubtotal, lineTax, lineTotal, notes]);
            }

            // Update claim
            await client.query(`
                UPDATE supplier_claims
                SET status = 'resolved',
                    resolution_type = 'credit_note',
                    resolution_notes = $3,
                    resolved_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1 AND supplier_id = $2
            `, [claimId, supplierId, `Nota de crédito ${creditNoteNumber} emitida`]);

            await client.query('COMMIT');

            return cnResult.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PAGOS
    // ═══════════════════════════════════════════════════════════════════════════

    async getSupplierPayments(supplierId, filters = {}) {
        const { status, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE payord.supplier_id = $1';
        const params = [supplierId];

        if (status) {
            params.push(status);
            whereClause += ` AND payord.status = $${params.length}`;
        }

        const result = await this.pool.query(`
            SELECT
                payord.*,
                c.name as company_name,
                (SELECT COUNT(*) FROM payment_order_invoices WHERE payment_order_id = payord.id) as invoice_count
            FROM payment_orders payord
            JOIN companies c ON payord.company_id = c.company_id
            ${whereClause}
            ORDER BY payord.scheduled_date DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]);

        return result.rows;
    }

    async getPaymentDetails(paymentId, supplierId) {
        const [payment, invoices, creditNotes] = await Promise.all([
            this.pool.query(`
                SELECT payord.*, c.name as company_name
                FROM payment_orders payord
                JOIN companies c ON payord.company_id = c.company_id
                WHERE payord.id = $1 AND payord.supplier_id = $2
            `, [paymentId, supplierId]),

            this.pool.query(`
                SELECT poi.*, si.invoice_number, si.invoice_date, si.total as invoice_total
                FROM payment_order_invoices poi
                JOIN supplier_invoices si ON poi.invoice_id = si.id
                WHERE poi.payment_order_id = $1
            `, [paymentId]),

            this.pool.query(`
                SELECT pocn.*, scn.credit_note_number, scn.credit_note_date, scn.total as cn_total
                FROM payment_order_credit_notes pocn
                JOIN supplier_credit_notes scn ON pocn.credit_note_id = scn.id
                WHERE pocn.payment_order_id = $1
            `, [paymentId])
        ]);

        return {
            payment: payment.rows[0],
            invoices: invoices.rows,
            creditNotes: creditNotes.rows
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OFERTAS Y PROMOCIONES
    // ═══════════════════════════════════════════════════════════════════════════

    async getSupplierOffers(supplierId, filters = {}) {
        const { status, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE so.supplier_id = $1';
        const params = [supplierId];

        if (status) {
            params.push(status);
            whereClause += ` AND so.status = $${params.length}`;
        }

        const result = await this.pool.query(`
            SELECT
                so.*,
                (SELECT COUNT(*) FROM supplier_offer_items WHERE offer_id = so.id) as item_count,
                (SELECT COUNT(*) FROM supplier_offer_views WHERE offer_id = so.id) as total_views
            FROM supplier_offers so
            ${whereClause}
            ORDER BY so.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]);

        return result.rows;
    }

    async createOffer(supplierId, offerData, portalUserId) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const {
                title, description, offerType, validFrom, validUntil,
                minOrderAmount, minOrderQuantity, discountType, discountValue,
                freeShipping, termsConditions, targetCompanies, items
            } = offerData;

            // Generate offer number
            const countResult = await client.query(`
                SELECT COUNT(*) + 1 as next_num FROM supplier_offers WHERE supplier_id = $1
            `, [supplierId]);
            const offerNumber = `OF-${supplierId}-${String(countResult.rows[0].next_num).padStart(5, '0')}`;

            // Insert offer
            const offerResult = await client.query(`
                INSERT INTO supplier_offers
                (supplier_id, offer_number, title, description, offer_type,
                 valid_from, valid_until, min_order_amount, min_order_quantity,
                 discount_type, discount_value, free_shipping, terms_conditions,
                 target_companies, status, submitted_at, submitted_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending_approval', NOW(), $15)
                RETURNING *
            `, [supplierId, offerNumber, title, description, offerType,
                validFrom, validUntil, minOrderAmount, minOrderQuantity,
                discountType, discountValue, freeShipping || false, termsConditions,
                JSON.stringify(targetCompanies || []), portalUserId]);

            const offerId = offerResult.rows[0].id;

            // Insert items
            if (items && items.length > 0) {
                for (const item of items) {
                    await client.query(`
                        INSERT INTO supplier_offer_items
                        (offer_id, product_id, product_code, product_name, description,
                         regular_price, offer_price, discount_percent, min_quantity,
                         max_quantity, available_stock, unit_of_measure, image_url)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    `, [offerId, item.productId, item.productCode, item.productName, item.description,
                        item.regularPrice, item.offerPrice, item.discountPercent, item.minQuantity || 1,
                        item.maxQuantity, item.availableStock, item.unitOfMeasure, item.imageUrl]);
                }
            }

            await client.query('COMMIT');

            return offerResult.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updateOffer(offerId, supplierId, offerData) {
        const {
            title, description, offerType, validFrom, validUntil,
            minOrderAmount, minOrderQuantity, discountType, discountValue,
            freeShipping, termsConditions, targetCompanies
        } = offerData;

        const result = await this.pool.query(`
            UPDATE supplier_offers
            SET title = COALESCE($3, title),
                description = COALESCE($4, description),
                offer_type = COALESCE($5, offer_type),
                valid_from = COALESCE($6, valid_from),
                valid_until = COALESCE($7, valid_until),
                min_order_amount = COALESCE($8, min_order_amount),
                min_order_quantity = COALESCE($9, min_order_quantity),
                discount_type = COALESCE($10, discount_type),
                discount_value = COALESCE($11, discount_value),
                free_shipping = COALESCE($12, free_shipping),
                terms_conditions = COALESCE($13, terms_conditions),
                target_companies = COALESCE($14, target_companies),
                updated_at = NOW()
            WHERE id = $1 AND supplier_id = $2 AND status IN ('draft', 'pending_approval')
            RETURNING *
        `, [offerId, supplierId, title, description, offerType, validFrom, validUntil,
            minOrderAmount, minOrderQuantity, discountType, discountValue,
            freeShipping, termsConditions, JSON.stringify(targetCompanies || [])]);

        return result.rows[0];
    }

    async cancelOffer(offerId, supplierId) {
        const result = await this.pool.query(`
            UPDATE supplier_offers
            SET status = 'cancelled', updated_at = NOW()
            WHERE id = $1 AND supplier_id = $2 AND status NOT IN ('expired', 'cancelled')
            RETURNING *
        `, [offerId, supplierId]);

        return result.rows[0];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ESTADÍSTICAS
    // ═══════════════════════════════════════════════════════════════════════════

    async getSupplierStatistics(supplierId, period = 'year') {
        let dateFilter = '';
        if (period === 'month') {
            dateFilter = "AND created_at >= NOW() - INTERVAL '1 month'";
        } else if (period === 'quarter') {
            dateFilter = "AND created_at >= NOW() - INTERVAL '3 months'";
        } else if (period === 'year') {
            dateFilter = "AND created_at >= NOW() - INTERVAL '1 year'";
        }

        const [orders, invoices, claims, performance] = await Promise.all([
            // Order statistics
            this.pool.query(`
                SELECT
                    COUNT(*) as total_orders,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
                    COALESCE(SUM(total), 0) as total_amount,
                    COALESCE(AVG(total), 0) as avg_order_value
                FROM purchase_orders
                WHERE supplier_id = $1 ${dateFilter}
            `, [supplierId]),

            // Invoice statistics
            this.pool.query(`
                SELECT
                    COUNT(*) as total_invoices,
                    COALESCE(SUM(total), 0) as total_invoiced,
                    COALESCE(SUM(balance_due), 0) as pending_payment,
                    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) as total_paid
                FROM supplier_invoices
                WHERE supplier_id = $1 ${dateFilter}
            `, [supplierId]),

            // Claim statistics
            this.pool.query(`
                SELECT
                    COUNT(*) as total_claims,
                    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_claims,
                    COALESCE(SUM(total_claimed_amount), 0) as total_claimed,
                    COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - submitted_at)) / 86400), 0) as avg_resolution_days
                FROM supplier_claims
                WHERE supplier_id = $1 ${dateFilter}
            `, [supplierId]),

            // Performance metrics
            this.pool.query(`
                SELECT
                    COALESCE(AVG(on_time_delivery_rate), 0) as avg_on_time_rate,
                    COALESCE(AVG(quality_score), 0) as avg_quality_score,
                    COALESCE(AVG(response_time_hours), 0) as avg_response_time
                FROM supplier_monthly_stats
                WHERE supplier_id = $1
                AND year_month >= TO_CHAR(NOW() - INTERVAL '12 months', 'YYYY-MM')
            `, [supplierId])
        ]);

        // Monthly trend
        const monthlyTrend = await this.pool.query(`
            SELECT
                year_month,
                total_po_amount,
                total_invoice_amount,
                total_claims,
                on_time_delivery_rate,
                quality_score
            FROM supplier_monthly_stats
            WHERE supplier_id = $1
            ORDER BY year_month DESC
            LIMIT 12
        `, [supplierId]);

        return {
            orders: orders.rows[0],
            invoices: invoices.rows[0],
            claims: claims.rows[0],
            performance: performance.rows[0],
            monthlyTrend: monthlyTrend.rows.reverse()
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NOTIFICACIONES
    // ═══════════════════════════════════════════════════════════════════════════

    async getSupplierNotifications(supplierId, filters = {}) {
        const { unreadOnly, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE supplier_id = $1';
        const params = [supplierId];

        if (unreadOnly) {
            whereClause += ' AND read_at IS NULL';
        }

        const result = await this.pool.query(`
            SELECT * FROM supplier_notifications
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]);

        return result.rows;
    }

    async markNotificationRead(notificationId, supplierId) {
        await this.pool.query(`
            UPDATE supplier_notifications
            SET read_at = NOW()
            WHERE id = $1 AND supplier_id = $2 AND read_at IS NULL
        `, [notificationId, supplierId]);

        return { success: true };
    }

    async markAllNotificationsRead(supplierId) {
        await this.pool.query(`
            UPDATE supplier_notifications
            SET read_at = NOW()
            WHERE supplier_id = $1 AND read_at IS NULL
        `, [supplierId]);

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENVÍO DE NOTIFICACIONES (para uso interno)
    // ═══════════════════════════════════════════════════════════════════════════

    async sendNotification(supplierId, notificationData) {
        const {
            companyId, type, title, message, referenceType, referenceId,
            priority = 'normal', actionUrl, actionRequired = false, actionDeadline
        } = notificationData;

        const result = await this.pool.query(`
            INSERT INTO supplier_notifications
            (supplier_id, company_id, notification_type, title, message,
             reference_type, reference_id, priority, action_url, action_required, action_deadline)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [supplierId, companyId, type, title, message,
            referenceType, referenceId, priority, actionUrl, actionRequired, actionDeadline]);

        return result.rows[0];
    }

    // Notify supplier about new RFQ
    async notifyNewRfq(rfqId, supplierId, companyId) {
        const rfq = await this.pool.query(`
            SELECT rfq.*, c.name as company_name
            FROM request_for_quotations rfq
            JOIN companies c ON rfq.company_id = c.company_id
            WHERE rfq.id = $1
        `, [rfqId]);

        if (rfq.rows[0]) {
            return this.sendNotification(supplierId, {
                companyId,
                type: 'rfq_invitation',
                title: `Nueva solicitud de cotización: ${rfq.rows[0].rfq_number}`,
                message: `${rfq.rows[0].company_name} le invita a cotizar. Fecha límite: ${rfq.rows[0].submission_deadline}`,
                referenceType: 'rfq',
                referenceId: rfqId,
                priority: 'high',
                actionUrl: `/portal/rfq/${rfqId}`,
                actionRequired: true,
                actionDeadline: rfq.rows[0].submission_deadline
            });
        }
    }

    // Notify supplier about new purchase order
    async notifyNewPurchaseOrder(poId, supplierId, companyId) {
        const po = await this.pool.query(`
            SELECT po.*, c.name as company_name
            FROM purchase_orders po
            JOIN companies c ON po.company_id = c.company_id
            WHERE po.id = $1
        `, [poId]);

        if (po.rows[0]) {
            return this.sendNotification(supplierId, {
                companyId,
                type: 'po_received',
                title: `Nueva orden de compra: ${po.rows[0].po_number}`,
                message: `Recibió una orden de compra de ${po.rows[0].company_name} por $${po.rows[0].total}`,
                referenceType: 'purchase_order',
                referenceId: poId,
                priority: 'high',
                actionUrl: `/portal/orders/${poId}`,
                actionRequired: true
            });
        }
    }

    // Notify supplier about new claim
    async notifyNewClaim(claimId, supplierId, companyId) {
        const claim = await this.pool.query(`
            SELECT sc.*, c.name as company_name
            FROM supplier_claims sc
            JOIN companies c ON sc.company_id = c.company_id
            WHERE sc.id = $1
        `, [claimId]);

        if (claim.rows[0]) {
            return this.sendNotification(supplierId, {
                companyId,
                type: 'claim_received',
                title: `Nuevo reclamo: ${claim.rows[0].claim_number}`,
                message: `${claim.rows[0].company_name} ha registrado un reclamo. Por favor revise y responda.`,
                referenceType: 'claim',
                referenceId: claimId,
                priority: 'high',
                actionUrl: `/portal/claims/${claimId}`,
                actionRequired: true,
                actionDeadline: claim.rows[0].due_date
            });
        }
    }

    // Notify supplier about scheduled payment
    async notifyPaymentScheduled(paymentId, supplierId, companyId) {
        const payment = await this.pool.query(`
            SELECT payord.*, c.name as company_name
            FROM payment_orders payord
            JOIN companies c ON payord.company_id = c.company_id
            WHERE payord.id = $1
        `, [paymentId]);

        if (payment.rows[0]) {
            return this.sendNotification(supplierId, {
                companyId,
                type: 'payment_scheduled',
                title: `Pago programado: ${payment.rows[0].payment_order_number}`,
                message: `${payment.rows[0].company_name} ha programado un pago de $${payment.rows[0].net_amount} para el ${payment.rows[0].scheduled_date}`,
                referenceType: 'payment',
                referenceId: paymentId,
                priority: 'normal',
                actionUrl: `/portal/payments/${paymentId}`
            });
        }
    }
    /**
     * Get supplier profile
     */
    async getSupplierProfile(supplierId, portalUserId) {
        const query = `
            SELECT
                s.supplier_id,
                s.name,
                s.contact_email,
                s.contact_phone,
                s.address,
                s.city,
                s.province,
                s.country,
                s.postal_code,
                s.tax_id,
                s.bank_name,
                s.bank_account,
                s.bank_cbu_cvu,
                spu.email as portal_email,
                spu.email_verified,
                spu.must_change_password,
                spu.last_password_change,
                spu.account_status,
                spu.created_at as portal_created_at
            FROM wms_suppliers s
            JOIN supplier_portal_users spu ON spu.supplier_id = s.supplier_id
            WHERE s.supplier_id = $1 AND spu.id = $2
        `;

        const result = await this.pool.query(query, [supplierId, portalUserId]);

        if (result.rows.length === 0) {
            throw new Error('Perfil no encontrado');
        }

        return result.rows[0];
    }

    /**
     * Update supplier profile (contact info only - no banking)
     */
    async updateSupplierProfile(supplierId, portalUserId, data) {
        const {
            contact_phone,
            address,
            city,
            province,
            country,
            postal_code
        } = data;

        const query = `
            UPDATE wms_suppliers
            SET
                contact_phone = COALESCE($1, contact_phone),
                address = COALESCE($2, address),
                city = COALESCE($3, city),
                province = COALESCE($4, province),
                country = COALESCE($5, country),
                postal_code = COALESCE($6, postal_code),
                updated_at = CURRENT_TIMESTAMP
            WHERE supplier_id = $7
            RETURNING *
        `;

        const result = await this.pool.query(query, [
            contact_phone,
            address,
            city,
            province,
            country,
            postal_code,
            supplierId
        ]);

        return result.rows[0];
    }

    /**
     * Change password (portal user) - uses password_hash column
     */
    async changePortalPassword(portalUserId, currentPassword, newPassword) {
        // Get current password hash
        const userQuery = await this.pool.query(
            'SELECT password_hash FROM supplier_portal_users WHERE id = $1',
            [portalUserId]
        );

        if (userQuery.rows.length === 0) {
            throw new Error('Usuario no encontrado');
        }

        const user = userQuery.rows[0];

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
            throw new Error('Contraseña actual incorrecta');
        }

        // Validate new password strength
        if (!newPassword || newPassword.length < 8) {
            throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        const updateQuery = `
            UPDATE supplier_portal_users
            SET
                password_hash = $1,
                must_change_password = false,
                last_password_change = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, email, must_change_password, last_password_change
        `;

        const result = await this.pool.query(updateQuery, [hashedPassword, portalUserId]);

        return result.rows[0];
    }
}

module.exports = new SupplierPortalService();
