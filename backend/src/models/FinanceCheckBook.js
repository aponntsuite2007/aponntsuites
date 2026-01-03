/**
 * Finance CheckBook Model
 * Gestión de Chequeras - Cartera de cheques
 * Control de numeración y disponibilidad de cheques
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceCheckBook = sequelize.define('FinanceCheckBook', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'company_id' }
        },
        branch_id: {
            type: DataTypes.INTEGER,
            references: { model: 'branches', key: 'id' }
        },

        // Identificación
        checkbook_number: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Número de chequera asignado por el banco'
        },
        checkbook_code: {
            type: DataTypes.STRING(20),
            comment: 'Código interno para referencia rápida'
        },

        // Cuenta bancaria
        bank_account_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_bank_accounts', key: 'id' }
        },
        bank_name: {
            type: DataTypes.STRING(200),
            comment: 'Nombre del banco desnormalizado'
        },
        account_number: {
            type: DataTypes.STRING(50),
            comment: 'Número de cuenta desnormalizado'
        },
        account_type: {
            type: DataTypes.STRING(30),
            validate: {
                isIn: [['checking', 'savings', null]]
            }
        },

        // Moneda
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },

        // Rango de cheques
        first_check_number: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Primer número de cheque de la chequera'
        },
        last_check_number: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Último número de cheque de la chequera'
        },
        current_check_number: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Próximo cheque disponible'
        },

        // Contadores
        checks_total: {
            type: DataTypes.INTEGER,
            comment: 'Total de cheques en la chequera'
        },
        checks_used: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Cheques ya emitidos'
        },
        checks_voided: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Cheques anulados'
        },
        checks_available: {
            type: DataTypes.INTEGER,
            comment: 'Cheques disponibles para uso'
        },

        // Estado
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'active',
            validate: {
                isIn: [['active', 'exhausted', 'cancelled', 'expired']]
            }
        },

        // Fechas
        received_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha de recepción de la chequera'
        },
        activated_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha de activación'
        },
        expiry_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha de vencimiento de la chequera'
        },

        // Ubicación física
        location: {
            type: DataTypes.STRING(200),
            comment: 'Ubicación física de la chequera (caja fuerte, etc)'
        },
        assigned_to: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' },
            comment: 'Usuario responsable de la chequera'
        },

        // Notas
        notes: {
            type: DataTypes.TEXT
        },

        // Auditoría
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'finance_checkbooks',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'checkbook_number'] },
            { fields: ['company_id', 'status'] },
            { fields: ['bank_account_id'] },
            { fields: ['assigned_to'] }
        ],
        hooks: {
            beforeCreate: async (checkbook) => {
                // Calcular totales
                checkbook.checks_total = checkbook.last_check_number - checkbook.first_check_number + 1;
                checkbook.checks_available = checkbook.checks_total;
                checkbook.current_check_number = checkbook.first_check_number;
            },
            beforeUpdate: async (checkbook) => {
                // Recalcular disponibles
                checkbook.checks_available = checkbook.checks_total -
                    checkbook.checks_used -
                    checkbook.checks_voided;

                // Verificar si está agotada
                if (checkbook.checks_available <= 0 && checkbook.status === 'active') {
                    checkbook.status = 'exhausted';
                }
            }
        }
    });

    // Obtener próximo número de cheque
    FinanceCheckBook.prototype.getNextCheckNumber = function() {
        if (this.status !== 'active') {
            throw new Error('La chequera no está activa');
        }
        if (this.current_check_number > this.last_check_number) {
            throw new Error('No hay cheques disponibles en esta chequera');
        }
        return this.current_check_number;
    };

    // Marcar cheque como usado
    FinanceCheckBook.prototype.useCheck = async function() {
        const checkNumber = this.getNextCheckNumber();
        this.current_check_number = checkNumber + 1;
        this.checks_used += 1;
        this.checks_available = this.checks_total - this.checks_used - this.checks_voided;

        if (this.checks_available <= 0) {
            this.status = 'exhausted';
        }

        await this.save();
        return checkNumber;
    };

    // Anular un cheque (sin usarlo)
    FinanceCheckBook.prototype.voidCheck = async function(checkNumber, reason) {
        if (checkNumber < this.first_check_number || checkNumber > this.last_check_number) {
            throw new Error('Número de cheque fuera de rango');
        }

        // Si es el próximo cheque, avanzar el contador
        if (checkNumber === this.current_check_number) {
            this.current_check_number += 1;
        }

        this.checks_voided += 1;
        this.checks_available = this.checks_total - this.checks_used - this.checks_voided;

        if (this.checks_available <= 0) {
            this.status = 'exhausted';
        }

        await this.save();
        return true;
    };

    // Verificar si un número de cheque está disponible
    FinanceCheckBook.prototype.isCheckAvailable = function(checkNumber) {
        return checkNumber >= this.current_check_number &&
               checkNumber <= this.last_check_number &&
               this.status === 'active';
    };

    // Cancelar chequera
    FinanceCheckBook.prototype.cancel = async function(reason) {
        this.status = 'cancelled';
        this.notes = (this.notes || '') + `\n[CANCELADA] ${new Date().toISOString()}: ${reason}`;
        return this.save();
    };

    // Obtener chequeras activas
    FinanceCheckBook.getActive = async function(companyId, currency = null) {
        const where = {
            company_id: companyId,
            status: 'active'
        };
        if (currency) {
            where.currency = currency;
        }
        return this.findAll({
            where,
            order: [['created_at', 'ASC']]
        });
    };

    // Obtener chequera con cheques disponibles
    FinanceCheckBook.getWithAvailableChecks = async function(companyId, bankAccountId = null) {
        const { Op } = sequelize.Sequelize;
        const where = {
            company_id: companyId,
            status: 'active',
            checks_available: { [Op.gt]: 0 }
        };
        if (bankAccountId) {
            where.bank_account_id = bankAccountId;
        }
        return this.findAll({
            where,
            order: [['current_check_number', 'ASC']]
        });
    };

    // Estadísticas de chequeras
    FinanceCheckBook.getStats = async function(companyId) {
        const { Op } = sequelize.Sequelize;

        const [activeBooks, exhaustedBooks, totalAvailable, totalUsed] = await Promise.all([
            this.count({ where: { company_id: companyId, status: 'active' } }),
            this.count({ where: { company_id: companyId, status: 'exhausted' } }),
            this.sum('checks_available', { where: { company_id: companyId, status: 'active' } }),
            this.sum('checks_used', { where: { company_id: companyId } })
        ]);

        return {
            active_checkbooks: activeBooks || 0,
            exhausted_checkbooks: exhaustedBooks || 0,
            total_checks_available: parseInt(totalAvailable) || 0,
            total_checks_used: parseInt(totalUsed) || 0
        };
    };

    // Asociaciones
    FinanceCheckBook.associate = (models) => {
        FinanceCheckBook.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceCheckBook.belongsTo(models.Branch, {
            foreignKey: 'branch_id',
            as: 'branch'
        });
        FinanceCheckBook.belongsTo(models.FinanceBankAccount, {
            foreignKey: 'bank_account_id',
            as: 'bankAccount'
        });
        FinanceCheckBook.belongsTo(models.User, {
            foreignKey: 'assigned_to',
            as: 'assignee'
        });
        FinanceCheckBook.belongsTo(models.User, {
            foreignKey: 'created_by',
            as: 'creator'
        });
        FinanceCheckBook.hasMany(models.FinanceIssuedCheck, {
            foreignKey: 'checkbook_id',
            as: 'issuedChecks'
        });
    };

    return FinanceCheckBook;
};
