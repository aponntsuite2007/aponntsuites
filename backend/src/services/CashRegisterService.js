/**
 * Cash Register Service
 * Gestión completa de Cajas con workflow de transferencias
 * PLUG-AND-PLAY: Cualquier módulo puede alimentar las cajas
 */

const { Op, literal } = require('sequelize');

class CashRegisterService {
    constructor(db) {
        this.db = db;
    }

    // =========================================================================
    // GESTIÓN DE CAJAS
    // =========================================================================

    /**
     * Obtener cajas de una empresa
     */
    async getRegisters(companyId, options = {}) {
        const { type, isActive = true, includeAssignments = false } = options;

        const where = { company_id: companyId };
        if (type) where.register_type = type;
        if (isActive !== null) where.is_active = isActive;

        const include = [
            { model: this.db.Department, as: 'department', attributes: ['id', 'name'] }
        ];

        if (includeAssignments) {
            include.push({
                model: this.db.FinanceCashRegisterAssignment,
                as: 'assignments',
                include: [{ model: this.db.User, as: 'user', attributes: ['user_id', 'name', 'email'] }]
            });
        }

        return this.db.FinanceCashRegister.findAll({
            where,
            include,
            order: [['register_type', 'DESC'], ['name', 'ASC']]
        });
    }

    /**
     * Obtener caja asignada a un usuario
     */
    async getUserAssignedRegister(userId, companyId) {
        const assignment = await this.db.FinanceCashRegisterAssignment.findOne({
            where: {
                user_id: userId,
                is_active: true
            },
            include: [{
                model: this.db.FinanceCashRegister,
                as: 'cashRegister',
                where: { company_id: companyId, is_active: true }
            }]
        });

        return assignment?.cashRegister || null;
    }

    /**
     * Crear caja
     */
    async createRegister(companyId, data, createdBy) {
        // Validar que solo haya una caja principal
        if (data.register_type === 'main') {
            const existingMain = await this.db.FinanceCashRegister.findOne({
                where: { company_id: companyId, register_type: 'main', is_active: true }
            });
            if (existingMain) {
                throw new Error('Ya existe una caja principal activa. Solo puede haber una.');
            }
        }

        return this.db.FinanceCashRegister.create({
            company_id: companyId,
            ...data,
            created_by: createdBy
        });
    }

    /**
     * Asignar usuario a caja
     */
    async assignUserToRegister(registerId, userId, permissions = {}, assignedBy) {
        // Verificar que el usuario no esté asignado a otra caja activa
        const existingAssignment = await this.db.FinanceCashRegisterAssignment.findOne({
            where: { user_id: userId, is_active: true }
        });

        if (existingAssignment && existingAssignment.cash_register_id !== registerId) {
            throw new Error('El usuario ya está asignado a otra caja. Primero desasigne de la caja actual.');
        }

        const [assignment, created] = await this.db.FinanceCashRegisterAssignment.findOrCreate({
            where: { cash_register_id: registerId, user_id: userId },
            defaults: {
                can_open: permissions.can_open ?? true,
                can_close: permissions.can_close ?? true,
                can_transfer: permissions.can_transfer ?? true,
                can_count: permissions.can_count ?? true,
                assigned_by: assignedBy,
                is_active: true
            }
        });

        if (!created) {
            await assignment.update({
                ...permissions,
                is_active: true
            });
        }

        return assignment;
    }

    // =========================================================================
    // SESIONES DE CAJA (Apertura/Cierre)
    // =========================================================================

    /**
     * Abrir sesión de caja
     */
    async openSession(registerId, userId, openingAmount, notes = null) {
        const register = await this.db.FinanceCashRegister.findByPk(registerId);
        if (!register) throw new Error('Caja no encontrada');
        if (!register.is_active) throw new Error('La caja está inactiva');

        // Verificar que el usuario esté asignado
        const assignment = await this.db.FinanceCashRegisterAssignment.findOne({
            where: { cash_register_id: registerId, user_id: userId, is_active: true }
        });
        if (!assignment) throw new Error('Usuario no asignado a esta caja');
        if (!assignment.can_open) throw new Error('Usuario no tiene permiso para abrir esta caja');

        // Verificar que no haya sesión abierta
        const openSession = await this.db.FinanceCashRegisterSession.findOne({
            where: { cash_register_id: registerId, status: 'open' }
        });
        if (openSession) throw new Error('Ya existe una sesión abierta para esta caja');

        // Crear sesión
        const session = await this.db.FinanceCashRegisterSession.create({
            company_id: register.company_id,
            cash_register_id: registerId,
            session_date: new Date(),
            opened_by: userId,
            opened_at: new Date(),
            opening_amount: openingAmount,
            expected_amount: openingAmount,
            status: 'open',
            notes
        });

        // Actualizar estado de la caja
        await register.update({
            current_session_id: session.id,
            last_opened_at: new Date()
        });

        return session;
    }

    /**
     * Verificar si se puede cerrar la caja
     */
    async canCloseSession(sessionId) {
        const session = await this.db.FinanceCashRegisterSession.findByPk(sessionId, {
            include: [{ model: this.db.FinanceCashRegister, as: 'cashRegister' }]
        });

        if (!session) throw new Error('Sesión no encontrada');
        if (session.status !== 'open') throw new Error('La sesión no está abierta');

        // Verificar transferencias pendientes (BLOQUEO CRÍTICO)
        const pendingTransfers = await this.db.FinanceCashTransfer.findAll({
            where: {
                [Op.or]: [
                    { source_register_id: session.cash_register_id, status: 'pending', blocks_source_close: true },
                    { destination_register_id: session.cash_register_id, status: 'pending', blocks_destination_close: true }
                ]
            },
            include: [
                { model: this.db.FinanceCashRegister, as: 'sourceRegister', attributes: ['id', 'name'] },
                { model: this.db.FinanceCashRegister, as: 'destinationRegister', attributes: ['id', 'name'] }
            ]
        });

        return {
            canClose: pendingTransfers.length === 0,
            pendingTransfers: pendingTransfers.map(t => ({
                id: t.id,
                type: t.source_register_id === session.cash_register_id ? 'outgoing' : 'incoming',
                amount: t.amount,
                paymentMethod: t.payment_method_name,
                sourceRegister: t.sourceRegister?.name,
                destinationRegister: t.destinationRegister?.name,
                createdAt: t.created_at,
                message: t.source_register_id === session.cash_register_id
                    ? `Transferencia saliente de $${t.amount} pendiente de confirmación`
                    : `Transferencia entrante de $${t.amount} requiere su confirmación o rechazo`
            }))
        };
    }

    /**
     * Cerrar sesión de caja
     */
    async closeSession(sessionId, userId, closingData) {
        const { closingAmount, notes, forceClose = false } = closingData;

        // Verificar permisos
        const session = await this.db.FinanceCashRegisterSession.findByPk(sessionId, {
            include: [{ model: this.db.FinanceCashRegister, as: 'cashRegister' }]
        });
        if (!session) throw new Error('Sesión no encontrada');

        const assignment = await this.db.FinanceCashRegisterAssignment.findOne({
            where: { cash_register_id: session.cash_register_id, user_id: userId, is_active: true }
        });
        if (!assignment?.can_close) throw new Error('Usuario no tiene permiso para cerrar esta caja');

        // Verificar transferencias pendientes
        const { canClose, pendingTransfers } = await this.canCloseSession(sessionId);

        if (!canClose && !forceClose) {
            throw new Error(`No se puede cerrar la caja. Hay ${pendingTransfers.length} transferencia(s) pendiente(s). Debe confirmar o rechazar todas las transferencias antes de cerrar.`);
        }

        // Calcular totales
        const movements = await this.db.FinanceCashMovement.findAll({
            where: { session_id: sessionId }
        });

        const totalIncome = movements
            .filter(m => m.movement_type === 'income')
            .reduce((sum, m) => sum + parseFloat(m.amount), 0);

        const totalExpense = movements
            .filter(m => m.movement_type === 'expense')
            .reduce((sum, m) => sum + parseFloat(m.amount), 0);

        const expectedAmount = parseFloat(session.opening_amount) + totalIncome - totalExpense;
        const difference = closingAmount - expectedAmount;

        // Actualizar sesión
        await session.update({
            closed_by: userId,
            closed_at: new Date(),
            closing_amount: closingAmount,
            expected_amount: expectedAmount,
            difference_amount: difference,
            total_income: totalIncome,
            total_expense: totalExpense,
            status: 'closed',
            close_notes: notes,
            pending_transfers_at_close: pendingTransfers.length > 0 ? pendingTransfers.length : 0
        });

        // Actualizar estado de la caja
        await session.cashRegister.update({
            current_session_id: null,
            current_balance: closingAmount,
            last_closed_at: new Date()
        });

        return {
            session,
            summary: {
                openingAmount: parseFloat(session.opening_amount),
                totalIncome,
                totalExpense,
                expectedAmount,
                closingAmount,
                difference
            }
        };
    }

    // =========================================================================
    // MOVIMIENTOS DE CAJA (PLUG-AND-PLAY)
    // =========================================================================

    /**
     * Registrar movimiento desde cualquier módulo
     * Este es el método PLUG-AND-PLAY que usan otros módulos
     */
    async createMovement(companyId, data, options = {}) {
        const {
            cashRegisterId,
            sessionId,
            movementType,      // 'income', 'expense', 'transfer_in', 'transfer_out'
            amount,
            paymentMethodId,
            sourceModule,      // 'billing', 'warehouse', 'manual', etc.
            sourceDocumentId,
            sourceDocumentNumber,
            category,
            description,
            createdBy,
            metadata = {}
        } = data;

        // Si no se especifica sesión, buscar la sesión abierta de la caja
        let session;
        if (sessionId) {
            session = await this.db.FinanceCashRegisterSession.findByPk(sessionId);
        } else if (cashRegisterId) {
            session = await this.db.FinanceCashRegisterSession.findOne({
                where: { cash_register_id: cashRegisterId, status: 'open' }
            });
        } else {
            // Buscar caja por defecto para este módulo
            const config = await this.db.FinanceCashIntegrationConfig.findOne({
                where: { company_id: companyId, source_module: sourceModule, is_active: true }
            });
            if (config?.default_register_id) {
                session = await this.db.FinanceCashRegisterSession.findOne({
                    where: { cash_register_id: config.default_register_id, status: 'open' }
                });
            }
        }

        if (!session && !options.allowWithoutSession) {
            throw new Error('No hay sesión de caja abierta para registrar el movimiento');
        }

        // Obtener método de pago
        const paymentMethod = paymentMethodId
            ? await this.db.FinancePaymentMethod.findByPk(paymentMethodId)
            : await this.db.FinancePaymentMethod.findOne({
                where: { company_id: companyId, code: 'CASH', is_active: true }
            });

        // Generar número de movimiento
        const lastMovement = await this.db.FinanceCashMovement.findOne({
            where: { company_id: companyId },
            order: [['id', 'DESC']]
        });
        const movementNumber = `MOV-${companyId}-${(lastMovement?.id || 0) + 1}`.padStart(10, '0');

        // Crear movimiento
        const movement = await this.db.FinanceCashMovement.create({
            company_id: companyId,
            cash_register_id: session?.cash_register_id || data.cashRegisterId,
            session_id: session?.id,
            payment_method_id: paymentMethod?.id,
            movement_number: movementNumber,
            movement_date: new Date(),
            movement_type: movementType,
            category,
            description,
            amount,
            currency: 'ARS',
            source_module: sourceModule,
            source_document_id: sourceDocumentId,
            source_document_number: sourceDocumentNumber,
            reference: data.reference,
            metadata,
            status: 'completed',
            created_by: createdBy
        });

        // Actualizar balance de la caja si hay sesión
        if (session) {
            const balanceChange = movementType === 'income' || movementType === 'transfer_in'
                ? parseFloat(amount)
                : -parseFloat(amount);

            await session.update({
                expected_amount: literal(`expected_amount + ${balanceChange}`)
            });
        }

        return movement;
    }

    /**
     * Obtener movimientos de una sesión
     */
    async getSessionMovements(sessionId, options = {}) {
        const { limit = 100, offset = 0 } = options;

        return this.db.FinanceCashMovement.findAndCountAll({
            where: { session_id: sessionId },
            include: [
                { model: this.db.FinancePaymentMethod, as: 'paymentMethod', attributes: ['id', 'name', 'code'] }
            ],
            order: [['movement_date', 'DESC']],
            limit,
            offset
        });
    }

    // =========================================================================
    // TRANSFERENCIAS CON WORKFLOW DE CONFIRMACIÓN
    // =========================================================================

    /**
     * Crear transferencia entre cajas
     */
    async createTransfer(companyId, data, createdBy) {
        const {
            sourceRegisterId,
            destinationRegisterId,
            amount,
            paymentMethodId,
            description,
            notes
        } = data;

        // Validaciones
        if (sourceRegisterId === destinationRegisterId) {
            throw new Error('La caja origen y destino no pueden ser la misma');
        }

        const sourceRegister = await this.db.FinanceCashRegister.findByPk(sourceRegisterId);
        const destRegister = await this.db.FinanceCashRegister.findByPk(destinationRegisterId);

        if (!sourceRegister || sourceRegister.company_id !== companyId) {
            throw new Error('Caja origen no encontrada');
        }
        if (!destRegister || destRegister.company_id !== companyId) {
            throw new Error('Caja destino no encontrada');
        }

        // Verificar sesión abierta en caja origen
        const sourceSession = await this.db.FinanceCashRegisterSession.findOne({
            where: { cash_register_id: sourceRegisterId, status: 'open' }
        });
        if (!sourceSession) {
            throw new Error('La caja origen no tiene sesión abierta');
        }

        // Obtener método de pago
        const paymentMethod = await this.db.FinancePaymentMethod.findByPk(paymentMethodId);
        if (!paymentMethod) {
            throw new Error('Método de pago no encontrado');
        }

        // Generar número de transferencia
        const lastTransfer = await this.db.FinanceCashTransfer.findOne({
            where: { company_id: companyId },
            order: [['id', 'DESC']]
        });
        const transferNumber = `TRF-${companyId}-${(lastTransfer?.id || 0) + 1}`.padStart(10, '0');

        // Crear transferencia con estado PENDING
        const transfer = await this.db.FinanceCashTransfer.create({
            company_id: companyId,
            transfer_number: transferNumber,
            source_register_id: sourceRegisterId,
            source_session_id: sourceSession.id,
            destination_register_id: destinationRegisterId,
            destination_session_id: null, // Se asigna cuando se confirma
            payment_method_id: paymentMethodId,
            payment_method_name: paymentMethod.name,
            amount,
            currency: 'ARS',
            description,
            notes,
            status: 'pending',
            blocks_source_close: true,      // BLOQUEA cierre de caja origen
            blocks_destination_close: true,  // BLOQUEA cierre de caja destino
            initiated_by: createdBy,
            initiated_at: new Date()
        });

        // Crear movimiento de SALIDA en caja origen (bloqueado hasta confirmación)
        await this.createMovement(companyId, {
            cashRegisterId: sourceRegisterId,
            sessionId: sourceSession.id,
            movementType: 'transfer_out',
            amount,
            paymentMethodId,
            sourceModule: 'cash_transfer',
            sourceDocumentId: transfer.id,
            sourceDocumentNumber: transferNumber,
            category: 'transfer',
            description: `Transferencia a ${destRegister.name}`,
            createdBy,
            metadata: { transfer_id: transfer.id, status: 'pending' }
        });

        // Actualizar contador de transferencias pendientes en la caja destino
        await this.db.FinanceCashRegisterSession.update(
            { pending_incoming_transfers: literal('pending_incoming_transfers + 1') },
            { where: { cash_register_id: destinationRegisterId, status: 'open' } }
        );

        return transfer;
    }

    /**
     * Obtener transferencias pendientes de una caja
     */
    async getPendingTransfers(registerId, type = 'all') {
        const where = { status: 'pending' };

        if (type === 'incoming') {
            where.destination_register_id = registerId;
        } else if (type === 'outgoing') {
            where.source_register_id = registerId;
        } else {
            where[Op.or] = [
                { source_register_id: registerId },
                { destination_register_id: registerId }
            ];
        }

        return this.db.FinanceCashTransfer.findAll({
            where,
            include: [
                { model: this.db.FinanceCashRegister, as: 'sourceRegister', attributes: ['id', 'name', 'code'] },
                { model: this.db.FinanceCashRegister, as: 'destinationRegister', attributes: ['id', 'name', 'code'] },
                { model: this.db.FinancePaymentMethod, as: 'paymentMethod', attributes: ['id', 'name', 'code'] }
            ],
            order: [['created_at', 'ASC']]
        });
    }

    /**
     * Confirmar transferencia
     */
    async confirmTransfer(transferId, userId, notes = null) {
        const transfer = await this.db.FinanceCashTransfer.findByPk(transferId, {
            include: [
                { model: this.db.FinanceCashRegister, as: 'sourceRegister' },
                { model: this.db.FinanceCashRegister, as: 'destinationRegister' }
            ]
        });

        if (!transfer) throw new Error('Transferencia no encontrada');
        if (transfer.status !== 'pending') {
            throw new Error(`La transferencia ya fue ${transfer.status === 'confirmed' ? 'confirmada' : transfer.status}`);
        }

        // Verificar que el usuario tenga acceso a la caja destino
        const assignment = await this.db.FinanceCashRegisterAssignment.findOne({
            where: {
                cash_register_id: transfer.destination_register_id,
                user_id: userId,
                is_active: true
            }
        });
        if (!assignment) {
            throw new Error('No tiene permiso para confirmar esta transferencia');
        }

        // Verificar sesión abierta en destino
        const destSession = await this.db.FinanceCashRegisterSession.findOne({
            where: { cash_register_id: transfer.destination_register_id, status: 'open' }
        });
        if (!destSession) {
            throw new Error('La caja destino no tiene sesión abierta');
        }

        // Actualizar transferencia
        await transfer.update({
            status: 'confirmed',
            destination_session_id: destSession.id,
            confirmed_by: userId,
            confirmed_at: new Date(),
            confirmation_notes: notes,
            blocks_source_close: false,      // Desbloquea cierre
            blocks_destination_close: false
        });

        // Crear movimiento de ENTRADA en caja destino
        await this.createMovement(transfer.company_id, {
            cashRegisterId: transfer.destination_register_id,
            sessionId: destSession.id,
            movementType: 'transfer_in',
            amount: transfer.amount,
            paymentMethodId: transfer.payment_method_id,
            sourceModule: 'cash_transfer',
            sourceDocumentId: transfer.id,
            sourceDocumentNumber: transfer.transfer_number,
            category: 'transfer',
            description: `Transferencia desde ${transfer.sourceRegister.name}`,
            createdBy: userId,
            metadata: { transfer_id: transfer.id, status: 'confirmed' }
        });

        // Actualizar contador de transferencias pendientes
        await destSession.update({
            pending_incoming_transfers: literal('GREATEST(pending_incoming_transfers - 1, 0)')
        });

        return transfer;
    }

    /**
     * Rechazar transferencia (auto-reversión)
     */
    async rejectTransfer(transferId, userId, reason) {
        if (!reason) throw new Error('Debe proporcionar un motivo de rechazo');

        const transfer = await this.db.FinanceCashTransfer.findByPk(transferId, {
            include: [
                { model: this.db.FinanceCashRegister, as: 'sourceRegister' },
                { model: this.db.FinanceCashRegister, as: 'destinationRegister' }
            ]
        });

        if (!transfer) throw new Error('Transferencia no encontrada');
        if (transfer.status !== 'pending') {
            throw new Error(`La transferencia ya fue ${transfer.status}`);
        }

        // Verificar que el usuario tenga acceso a la caja destino
        const assignment = await this.db.FinanceCashRegisterAssignment.findOne({
            where: {
                cash_register_id: transfer.destination_register_id,
                user_id: userId,
                is_active: true
            }
        });
        if (!assignment) {
            throw new Error('No tiene permiso para rechazar esta transferencia');
        }

        // Actualizar transferencia a REJECTED
        await transfer.update({
            status: 'rejected',
            rejected_by: userId,
            rejected_at: new Date(),
            rejection_reason: reason,
            blocks_source_close: false,
            blocks_destination_close: false
        });

        // AUTO-REVERSIÓN: Crear movimiento de entrada en caja origen
        const sourceSession = await this.db.FinanceCashRegisterSession.findOne({
            where: { cash_register_id: transfer.source_register_id, status: 'open' }
        });

        if (sourceSession) {
            await this.createMovement(transfer.company_id, {
                cashRegisterId: transfer.source_register_id,
                sessionId: sourceSession.id,
                movementType: 'transfer_in',
                amount: transfer.amount,
                paymentMethodId: transfer.payment_method_id,
                sourceModule: 'cash_transfer_reversal',
                sourceDocumentId: transfer.id,
                sourceDocumentNumber: `REV-${transfer.transfer_number}`,
                category: 'transfer_reversal',
                description: `Reversión de transferencia rechazada por ${transfer.destinationRegister.name}`,
                createdBy: userId,
                metadata: {
                    transfer_id: transfer.id,
                    status: 'reversed',
                    rejection_reason: reason
                }
            });
        }

        // Crear registro de reversión
        await transfer.update({
            reversal_date: new Date(),
            reversal_notes: `Auto-reversión por rechazo: ${reason}`
        });

        // Actualizar contador de transferencias pendientes en destino
        const destSession = await this.db.FinanceCashRegisterSession.findOne({
            where: { cash_register_id: transfer.destination_register_id, status: 'open' }
        });
        if (destSession) {
            await destSession.update({
                pending_incoming_transfers: literal('GREATEST(pending_incoming_transfers - 1, 0)')
            });
        }

        return transfer;
    }

    /**
     * Cancelar transferencia (solo el origen puede cancelar)
     */
    async cancelTransfer(transferId, userId, reason) {
        if (!reason) throw new Error('Debe proporcionar un motivo de cancelación');

        const transfer = await this.db.FinanceCashTransfer.findByPk(transferId);
        if (!transfer) throw new Error('Transferencia no encontrada');
        if (transfer.status !== 'pending') {
            throw new Error(`La transferencia ya fue ${transfer.status}`);
        }

        // Verificar que el usuario tenga acceso a la caja origen
        const assignment = await this.db.FinanceCashRegisterAssignment.findOne({
            where: {
                cash_register_id: transfer.source_register_id,
                user_id: userId,
                is_active: true
            }
        });
        if (!assignment) {
            throw new Error('No tiene permiso para cancelar esta transferencia');
        }

        // Actualizar transferencia
        await transfer.update({
            status: 'cancelled',
            cancelled_by: userId,
            cancelled_at: new Date(),
            cancellation_reason: reason,
            blocks_source_close: false,
            blocks_destination_close: false
        });

        // Revertir el movimiento de salida en caja origen
        const sourceSession = await this.db.FinanceCashRegisterSession.findOne({
            where: { cash_register_id: transfer.source_register_id, status: 'open' }
        });

        if (sourceSession) {
            await this.createMovement(transfer.company_id, {
                cashRegisterId: transfer.source_register_id,
                sessionId: sourceSession.id,
                movementType: 'transfer_in',
                amount: transfer.amount,
                paymentMethodId: transfer.payment_method_id,
                sourceModule: 'cash_transfer_cancellation',
                sourceDocumentId: transfer.id,
                sourceDocumentNumber: `CAN-${transfer.transfer_number}`,
                category: 'transfer_cancellation',
                description: `Cancelación de transferencia`,
                createdBy: userId,
                metadata: {
                    transfer_id: transfer.id,
                    status: 'cancelled',
                    cancellation_reason: reason
                }
            });
        }

        // Actualizar contador en destino
        const destSession = await this.db.FinanceCashRegisterSession.findOne({
            where: { cash_register_id: transfer.destination_register_id, status: 'open' }
        });
        if (destSession) {
            await destSession.update({
                pending_incoming_transfers: literal('GREATEST(pending_incoming_transfers - 1, 0)')
            });
        }

        return transfer;
    }

    // =========================================================================
    // ARQUEOS DE CAJA
    // =========================================================================

    /**
     * Registrar arqueo de caja
     */
    async createCashCount(sessionId, countData, userId) {
        const session = await this.db.FinanceCashRegisterSession.findByPk(sessionId, {
            include: [{ model: this.db.FinanceCashRegister, as: 'cashRegister' }]
        });
        if (!session) throw new Error('Sesión no encontrada');

        const {
            countType,          // 'opening', 'closing', 'audit', 'surprise'
            cashDenominations,  // { bills: { 1000: 5, 500: 10 }, coins: { 50: 10 } }
            totalsByMethod,     // { CASH: 25000, DEBIT: 150000 }
            checksDetail,       // [{ number, bank, amount, due_date }]
            vouchersDetail,     // [{ type, batch, count, amount }]
            notes
        } = countData;

        // Calcular total declarado
        let totalDeclared = 0;
        if (cashDenominations) {
            for (const type in cashDenominations) {
                for (const denom in cashDenominations[type]) {
                    totalDeclared += parseInt(denom) * cashDenominations[type][denom];
                }
            }
        }
        if (totalsByMethod) {
            for (const method in totalsByMethod) {
                if (method !== 'CASH') {
                    totalDeclared += parseFloat(totalsByMethod[method] || 0);
                }
            }
        }

        // Obtener total esperado
        const totalExpected = parseFloat(session.expected_amount || 0);
        const difference = totalDeclared - totalExpected;
        const differencePercent = totalExpected > 0
            ? Math.abs(difference / totalExpected * 100)
            : 0;

        const count = await this.db.FinanceCashCount.create({
            company_id: session.cashRegister.company_id,
            session_id: sessionId,
            cash_register_id: session.cash_register_id,
            count_type: countType,
            count_date: new Date(),
            counted_by: userId,
            cash_denominations: cashDenominations,
            totals_by_method: totalsByMethod,
            checks_detail: checksDetail,
            vouchers_detail: vouchersDetail,
            total_declared: totalDeclared,
            total_expected: totalExpected,
            difference,
            difference_percent: differencePercent,
            notes
        });

        return count;
    }

    // =========================================================================
    // INTEGRACIÓN PLUG-AND-PLAY
    // =========================================================================

    /**
     * Configurar integración de un módulo con cajas
     */
    async configureModuleIntegration(companyId, config) {
        const {
            sourceModule,
            defaultRegisterId,
            autoCreateMovement,
            requiresRegisterSelection,
            documentTypeMapping
        } = config;

        const [integration, created] = await this.db.FinanceCashIntegrationConfig.findOrCreate({
            where: { company_id: companyId, source_module: sourceModule },
            defaults: {
                default_register_id: defaultRegisterId,
                auto_create_movement: autoCreateMovement ?? true,
                requires_register_selection: requiresRegisterSelection ?? false,
                document_type_mapping: documentTypeMapping ?? {},
                is_active: true
            }
        });

        if (!created) {
            await integration.update({
                default_register_id: defaultRegisterId,
                auto_create_movement: autoCreateMovement,
                requires_register_selection: requiresRegisterSelection,
                document_type_mapping: documentTypeMapping
            });
        }

        return integration;
    }

    /**
     * Obtener configuración de integración para un módulo
     */
    async getModuleIntegration(companyId, sourceModule) {
        return this.db.FinanceCashIntegrationConfig.findOne({
            where: { company_id: companyId, source_module: sourceModule, is_active: true },
            include: [{ model: this.db.FinanceCashRegister, as: 'defaultRegister' }]
        });
    }

    // =========================================================================
    // REPORTES Y ESTADÍSTICAS
    // =========================================================================

    /**
     * Obtener resumen de caja
     */
    async getRegisterSummary(registerId, dateFrom = null, dateTo = null) {
        const where = { cash_register_id: registerId };
        if (dateFrom || dateTo) {
            where.session_date = {};
            if (dateFrom) where.session_date[Op.gte] = dateFrom;
            if (dateTo) where.session_date[Op.lte] = dateTo;
        }

        const sessions = await this.db.FinanceCashRegisterSession.findAll({
            where,
            attributes: [
                [literal('COUNT(*)'), 'totalSessions'],
                [literal('SUM(total_income)'), 'totalIncome'],
                [literal('SUM(total_expense)'), 'totalExpense'],
                [literal('SUM(difference_amount)'), 'totalDifference'],
                [literal('AVG(ABS(difference_amount))'), 'avgDifference']
            ],
            raw: true
        });

        const transfers = await this.db.FinanceCashTransfer.findAll({
            where: {
                [Op.or]: [
                    { source_register_id: registerId },
                    { destination_register_id: registerId }
                ],
                status: 'confirmed'
            },
            attributes: [
                [literal(`SUM(CASE WHEN source_register_id = ${registerId} THEN amount ELSE 0 END)`), 'totalOut'],
                [literal(`SUM(CASE WHEN destination_register_id = ${registerId} THEN amount ELSE 0 END)`), 'totalIn']
            ],
            raw: true
        });

        return {
            sessions: sessions[0],
            transfers: transfers[0]
        };
    }
}

module.exports = CashRegisterService;
