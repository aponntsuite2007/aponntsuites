/**
 * ProcurementSupplier Model
 * Modelo de Proveedores para el Sistema de Gestión de Compras
 *
 * IMPORTANTE: Este modelo usa la tabla wms_suppliers para unificar
 * toda la gestión de proveedores en una sola fuente de verdad.
 *
 * Módulo Comercial (no core) - Opcional por empresa
 * Inspirado en: SAP Ariba, Coupa, Oracle Procurement
 */

const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementSupplier = sequelize.define('ProcurementSupplier', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'id'
            }
        },

        // Identificación - mapeo a wms_suppliers
        code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'code'
        },
        // Alias para compatibilidad
        supplier_code: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.getDataValue('code');
            },
            set(value) {
                this.setDataValue('code', value);
            }
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        // Alias para compatibilidad
        trade_name: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.getDataValue('name');
            },
            set(value) {
                this.setDataValue('name', value);
            }
        },
        legal_name: {
            type: DataTypes.STRING(255)
        },
        tax_id: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'CUIT/RUT/RFC/EIN'
        },

        // Contacto Principal
        contact_name: {
            type: DataTypes.STRING(200)
        },
        email: {
            type: DataTypes.STRING(255),
            validate: {
                isEmail: true
            }
        },
        // Alias para compatibilidad
        contact_email: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.getDataValue('email');
            },
            set(value) {
                this.setDataValue('email', value);
            }
        },
        phone: {
            type: DataTypes.STRING(50)
        },
        // Alias para compatibilidad
        contact_phone: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.getDataValue('phone');
            },
            set(value) {
                this.setDataValue('phone', value);
            }
        },

        // Dirección
        address: {
            type: DataTypes.TEXT
        },
        city: {
            type: DataTypes.STRING(100)
        },
        country_id: {
            type: DataTypes.INTEGER
        },

        // Términos comerciales
        payment_terms: {
            type: DataTypes.INTEGER,
            defaultValue: 30
        },
        // Alias para compatibilidad
        default_payment_days: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.getDataValue('payment_terms');
            },
            set(value) {
                this.setDataValue('payment_terms', value);
            }
        },
        currency_id: {
            type: DataTypes.INTEGER
        },
        credit_limit: {
            type: DataTypes.DECIMAL(15, 2)
        },
        min_order_amount: {
            type: DataTypes.DECIMAL(15, 2)
        },

        // Estado
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        // Alias para compatibilidad
        status: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.getDataValue('is_active') ? 'active' : 'inactive';
            }
        },

        // Portal de Proveedor
        portal_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        portal_activated_at: {
            type: DataTypes.DATE
        },

        // Datos bancarios
        bank_name: {
            type: DataTypes.STRING(100)
        },
        bank_account_type: {
            type: DataTypes.STRING(50)
        },
        bank_account_number: {
            type: DataTypes.STRING(50)
        },
        bank_cbu: {
            type: DataTypes.STRING(50)
        },
        bank_alias: {
            type: DataTypes.STRING(50)
        },

        // Scoring y métricas
        rating_score: {
            type: DataTypes.DECIMAL(3, 2),
            defaultValue: 0
        },
        // Alias para compatibilidad
        overall_score: {
            type: DataTypes.VIRTUAL,
            get() {
                return parseFloat(this.getDataValue('rating_score')) || 0;
            }
        },
        total_orders: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        total_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        on_time_delivery_rate: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0
        },
        quality_rate: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0
        },
        // Alias para compatibilidad
        quality_score: {
            type: DataTypes.VIRTUAL,
            get() {
                return parseFloat(this.getDataValue('quality_rate')) || 0;
            }
        },
        claims_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        // Lead time y entregas
        avg_lead_time_days: {
            type: DataTypes.DECIMAL(5, 2)
        },
        lead_time_std_dev: {
            type: DataTypes.DECIMAL(5, 2)
        },
        delivery_days: {
            type: DataTypes.STRING(50)
        },
        order_cutoff_time: {
            type: DataTypes.TIME
        },
        visit_frequency_days: {
            type: DataTypes.INTEGER
        },
        last_visit_date: {
            type: DataTypes.DATEONLY
        },
        next_expected_visit: {
            type: DataTypes.DATEONLY
        },

        // Categorías de productos
        product_categories: {
            type: DataTypes.JSONB,
            defaultValue: []
        },

        // Timestamp
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'wms_suppliers', // Usar wms_suppliers en lugar de procurement_suppliers
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ['company_id', 'code']
            },
            {
                unique: true,
                fields: ['company_id', 'tax_id']
            },
            {
                fields: ['company_id', 'is_active']
            }
        ]
    });

    // ========================================
    // MÉTODOS DE INSTANCIA
    // ========================================

    /**
     * Verificar si tiene crédito disponible
     */
    ProcurementSupplier.prototype.hasAvailableCredit = function(amount) {
        if (!this.credit_limit) return true;
        return parseFloat(this.credit_limit) >= amount;
    };

    /**
     * Obtener cuenta bancaria principal
     */
    ProcurementSupplier.prototype.getPrimaryBankAccount = function() {
        if (!this.bank_cbu && !this.bank_account_number) return null;
        return {
            bank_name: this.bank_name,
            account_type: this.bank_account_type,
            account_number: this.bank_account_number,
            cbu: this.bank_cbu,
            alias: this.bank_alias
        };
    };

    /**
     * Verificar si está activo
     */
    ProcurementSupplier.prototype.isApprovedAndActive = function() {
        return this.is_active === true;
    };

    /**
     * Formatear para API
     */
    ProcurementSupplier.prototype.toAPI = function() {
        return {
            id: this.id,
            company_id: this.company_id,
            supplier_code: this.code,
            code: this.code,
            legal_name: this.legal_name,
            trade_name: this.name,
            name: this.name,
            tax_id: this.tax_id,
            contact: {
                name: this.contact_name,
                email: this.email,
                phone: this.phone
            },
            address: {
                street: this.address,
                city: this.city
            },
            status: this.is_active ? 'active' : 'inactive',
            scoring: {
                overall: parseFloat(this.rating_score) || 0,
                quality: parseFloat(this.quality_rate) || 0,
                on_time_rate: parseFloat(this.on_time_delivery_rate) || 0,
                total_orders: this.total_orders,
                total_amount: parseFloat(this.total_amount) || 0,
                claims_count: this.claims_count
            },
            credit: {
                limit: parseFloat(this.credit_limit) || null,
                min_order: parseFloat(this.min_order_amount) || null
            },
            payment_terms: this.payment_terms,
            portal_enabled: this.portal_enabled,
            portal_activated_at: this.portal_activated_at,
            created_at: this.created_at
        };
    };

    // ========================================
    // MÉTODOS ESTÁTICOS
    // ========================================

    /**
     * Buscar proveedores activos de una empresa
     */
    ProcurementSupplier.getActiveByCompany = async function(companyId, options = {}) {
        return this.findAll({
            where: {
                company_id: companyId,
                is_active: true
            },
            order: [['rating_score', 'DESC'], ['name', 'ASC']],
            limit: options.limit || 100
        });
    };

    /**
     * Buscar por código de proveedor
     */
    ProcurementSupplier.findByCode = async function(companyId, supplierCode) {
        return this.findOne({
            where: {
                company_id: companyId,
                code: supplierCode
            }
        });
    };

    /**
     * Buscar por CUIT/Tax ID
     */
    ProcurementSupplier.findByTaxId = async function(companyId, taxId) {
        return this.findOne({
            where: {
                company_id: companyId,
                tax_id: taxId
            }
        });
    };

    /**
     * Obtener top proveedores por scoring
     */
    ProcurementSupplier.getTopByScore = async function(companyId, limit = 10) {
        return this.findAll({
            where: {
                company_id: companyId,
                is_active: true
            },
            order: [['rating_score', 'DESC']],
            limit
        });
    };

    /**
     * Obtener estadísticas de proveedores
     */
    ProcurementSupplier.getStats = async function(companyId) {
        const total = await this.count({ where: { company_id: companyId } });
        const active = await this.count({ where: { company_id: companyId, is_active: true } });
        const portalEnabled = await this.count({ where: { company_id: companyId, portal_enabled: true } });

        const avgScore = await this.findOne({
            where: { company_id: companyId, is_active: true },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating_score')), 'avg_score'],
                [sequelize.fn('AVG', sequelize.col('quality_rate')), 'avg_quality'],
                [sequelize.fn('AVG', sequelize.col('on_time_delivery_rate')), 'avg_on_time']
            ],
            raw: true
        });

        return {
            total,
            active,
            inactive: total - active,
            portal_enabled: portalEnabled,
            avg_overall_score: parseFloat(avgScore?.avg_score) || 0,
            avg_quality_score: parseFloat(avgScore?.avg_quality) || 0,
            avg_on_time_rate: parseFloat(avgScore?.avg_on_time) || 0
        };
    };

    /**
     * Buscar proveedores con filtros
     */
    ProcurementSupplier.search = async function(companyId, filters = {}) {
        const where = { company_id: companyId };

        if (filters.status === 'active') {
            where.is_active = true;
        } else if (filters.status === 'inactive') {
            where.is_active = false;
        }

        if (filters.portalEnabled !== undefined) {
            where.portal_enabled = filters.portalEnabled;
        }

        if (filters.minScore) {
            where.rating_score = { [Op.gte]: filters.minScore };
        }

        if (filters.search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${filters.search}%` } },
                { legal_name: { [Op.iLike]: `%${filters.search}%` } },
                { code: { [Op.iLike]: `%${filters.search}%` } },
                { tax_id: { [Op.iLike]: `%${filters.search}%` } }
            ];
        }

        return this.findAndCountAll({
            where,
            order: [[filters.sortBy || 'name', filters.sortOrder || 'ASC']],
            limit: filters.limit || 50,
            offset: filters.offset || 0
        });
    };

    return ProcurementSupplier;
};
