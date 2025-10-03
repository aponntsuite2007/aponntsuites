const { DataTypes } = require('sequelize');

// Modelos para APONNT Dashboard - Compatible con estructura PostgreSQL existente
function initAponntModels(sequelize) {

    // Modelo Company actualizado para estructura existente
    const Company = sequelize.define('Company', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        slug: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        legal_name: {
            type: DataTypes.STRING(255),
            field: 'legal_name'
        },
        tax_id: {
            type: DataTypes.STRING(255),
            field: 'tax_id'
        },
        email: {
            type: DataTypes.STRING(255)
        },
        phone: {
            type: DataTypes.STRING(50)
        },
        contact_phone: {
            type: DataTypes.STRING(50),
            field: 'contact_phone'
        },
        address: {
            type: DataTypes.TEXT
        },
        city: {
            type: DataTypes.STRING(255)
        },
        state: {
            type: DataTypes.STRING(255)
        },
        country: {
            type: DataTypes.STRING(255)
        },
        timezone: {
            type: DataTypes.STRING(255)
        },
        currency: {
            type: DataTypes.STRING(255)
        },
        active_modules: {
            type: DataTypes.JSONB,
            field: 'active_modules'
        },
        license_type: {
            type: DataTypes.STRING(50),
            defaultValue: 'basic',
            field: 'license_type'
        },
        max_employees: {
            type: DataTypes.INTEGER,
            defaultValue: 50,
            field: 'max_employees'
        },
        max_branches: {
            type: DataTypes.INTEGER,
            field: 'max_branches'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'active'
        },
        trial_ends_at: {
            type: DataTypes.DATE,
            field: 'trial_ends_at'
        },
        subscription_expires_at: {
            type: DataTypes.DATE,
            field: 'subscription_expires_at'
        },
        modules_pricing: {
            type: DataTypes.JSONB,
            field: 'modules_pricing'
        },
        pricing_info: {
            type: DataTypes.JSONB,
            field: 'pricing_info'
        },
        settings: {
            type: DataTypes.JSONB
        },
        displayName: {
            type: DataTypes.STRING(255)
        },
        description: {
            type: DataTypes.TEXT
        },
        // CAMPOS DE GEOLOCALIZACI\u00d3N - FUNDAMENTALES PARA FICHAJE
        latitude: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true,
            comment: 'Latitud para fichaje geolocalizado'
        },
        longitude: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true,
            comment: 'Longitud para fichaje geolocalizado'
        }
    }, {
        tableName: 'companies',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // Modelo de módulos del sistema
    const SystemModule = sequelize.define('SystemModule', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        module_key: {
            type: DataTypes.STRING(50),
            unique: true,
            allowNull: false,
            field: 'module_key'
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        icon: {
            type: DataTypes.STRING(10)
        },
        description: {
            type: DataTypes.TEXT
        },
        base_price: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.00,
            field: 'base_price'
        },
        color: {
            type: DataTypes.STRING(7)
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        }
    }, {
        tableName: 'system_modules',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // Modelo de módulos contratados por empresa
    const CompanyModule = sequelize.define('CompanyModule', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'company_id',
            references: {
                model: 'companies',
                key: 'id'
            }
        },
        module_key: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'module_key'
        },
        contracted_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            field: 'contracted_price'
        },
        contracted_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'contracted_at'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        }
    }, {
        tableName: 'company_modules',
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ['company_id', 'module_key']
            }
        ]
    });

    // Modelo de facturas
    const Invoice = sequelize.define('Invoice', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        invoice_number: {
            type: DataTypes.STRING(50),
            unique: true,
            allowNull: false,
            field: 'invoice_number'
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'company_id',
            references: {
                model: 'companies',
                key: 'id'
            }
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        subtotal: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        tax_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.00,
            field: 'tax_amount'
        },
        due_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'due_date'
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'pending'
        },
        qr_code: {
            type: DataTypes.STRING(100),
            field: 'qr_code'
        },
        payment_date: {
            type: DataTypes.DATE,
            field: 'payment_date'
        },
        notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'invoices',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // Modelo de métodos de pago
    const PaymentMethod = sequelize.define('PaymentMethod', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            field: 'company_id',
            references: {
                model: 'companies',
                key: 'id'
            }
        },
        qr_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'qr_enabled'
        },
        card_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'card_enabled'
        },
        card_type: {
            type: DataTypes.STRING(20),
            field: 'card_type'
        },
        card_last4: {
            type: DataTypes.STRING(4),
            field: 'card_last4'
        },
        autopay_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'autopay_enabled'
        }
    }, {
        tableName: 'payment_methods',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // Modelo de pagos
    const Payment = sequelize.define('Payment', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        invoice_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'invoice_id',
            references: {
                model: 'invoices',
                key: 'id'
            }
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'company_id',
            references: {
                model: 'companies',
                key: 'id'
            }
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        payment_method: {
            type: DataTypes.STRING(20),
            allowNull: false,
            field: 'payment_method'
        },
        payment_reference: {
            type: DataTypes.STRING(100),
            field: 'payment_reference'
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'completed'
        },
        processed_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'processed_at'
        },
        notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'payments',
        timestamps: false
    });

    // Modelo de notificaciones
    const SystemNotification = sequelize.define('SystemNotification', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            field: 'company_id',
            references: {
                model: 'companies',
                key: 'id'
            }
        },
        type: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'unread'
        },
        read_at: {
            type: DataTypes.DATE,
            field: 'read_at'
        }
    }, {
        tableName: 'system_notifications',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    // Modelo de configuración de precios
    const PricingConfig = sequelize.define('PricingConfig', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        tax_rate: {
            type: DataTypes.DECIMAL(5, 4),
            defaultValue: 0.21,
            field: 'tax_rate'
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'USD'
        },
        tiers: {
            type: DataTypes.JSONB,
            allowNull: false
        },
        updated_by: {
            type: DataTypes.STRING(100),
            field: 'updated_by'
        }
    }, {
        tableName: 'pricing_config',
        timestamps: true,
        createdAt: false,
        updatedAt: 'updated_at'
    });

    // Definir relaciones
    Company.hasMany(CompanyModule, { foreignKey: 'company_id', as: 'companyModules' });
    CompanyModule.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

    Company.hasMany(Invoice, { foreignKey: 'company_id', as: 'invoices' });
    Invoice.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

    Company.hasOne(PaymentMethod, { foreignKey: 'company_id', as: 'paymentMethod' });
    PaymentMethod.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

    Company.hasMany(Payment, { foreignKey: 'company_id', as: 'payments' });
    Payment.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

    Invoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments' });
    Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

    Company.hasMany(SystemNotification, { foreignKey: 'company_id', as: 'notifications' });
    SystemNotification.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

    return {
        Company,
        SystemModule,
        CompanyModule,
        Invoice,
        PaymentMethod,
        Payment,
        SystemNotification,
        PricingConfig
    };
}

module.exports = { initAponntModels };