/**
 * Modelos Sequelize para Sistema Salarial Avanzado
 * Incluye: Convenios Laborales, Categorías Salariales, Config Salarial, Payroll Records
 */

const { DataTypes } = require('sequelize');

// ============================================================================
// CATÁLOGO DE CONVENIOS LABORALES
// ============================================================================
const LaborAgreementsCatalog = (sequelize) => {
    return sequelize.define('LaborAgreementsCatalog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        code: {
            type: DataTypes.STRING(20),
            unique: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(300),
            allowNull: false
        },
        industry: DataTypes.STRING(100),
        union_name: DataTypes.STRING(200),
        description: DataTypes.TEXT,
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'labor_agreements_catalog',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });
};

// ============================================================================
// CATEGORÍAS SALARIALES POR CONVENIO
// ============================================================================
const SalaryCategories = (sequelize) => {
    return sequelize.define('SalaryCategories', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        labor_agreement_id: {
            type: DataTypes.INTEGER,
            references: { model: 'labor_agreements_catalog', key: 'id' }
        },
        category_code: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        category_name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        description: DataTypes.TEXT,
        base_salary_reference: DataTypes.DECIMAL(12, 2),
        effective_date: DataTypes.DATEONLY,
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'salary_categories',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });
};

// ============================================================================
// CONFIGURACIÓN SALARIAL DEL USUARIO V2
// ============================================================================
const UserSalaryConfigV2 = (sequelize) => {
    return sequelize.define('UserSalaryConfigV2', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        labor_agreement_id: {
            type: DataTypes.INTEGER,
            references: { model: 'labor_agreements_catalog', key: 'id' }
        },
        salary_category_id: {
            type: DataTypes.INTEGER,
            references: { model: 'salary_categories', key: 'id' }
        },
        custom_category: DataTypes.STRING(100),
        payment_type: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: 'monthly'
        },
        base_salary: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false
        },
        gross_salary: DataTypes.DECIMAL(12, 2),
        net_salary: DataTypes.DECIMAL(12, 2),
        currency: {
            type: DataTypes.STRING(10),
            defaultValue: 'ARS'
        },
        seniority_bonus: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        presentation_bonus: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        food_allowance: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        transport_allowance: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        other_bonuses: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        other_bonuses_detail: DataTypes.TEXT,
        contracted_hours_per_week: {
            type: DataTypes.DECIMAL(4, 1),
            defaultValue: 48
        },
        work_schedule_type: DataTypes.STRING(30),
        hourly_rate: DataTypes.DECIMAL(10, 2),
        overtime_rate_50: DataTypes.DECIMAL(10, 2),
        overtime_rate_100: DataTypes.DECIMAL(10, 2),
        last_salary_update: DataTypes.DATEONLY,
        previous_base_salary: DataTypes.DECIMAL(12, 2),
        salary_increase_percentage: DataTypes.DECIMAL(5, 2),
        salary_increase_reason: DataTypes.STRING(200),
        next_review_date: DataTypes.DATEONLY,
        bank_name: DataTypes.STRING(100),
        bank_account_type: DataTypes.STRING(30),
        bank_account_number: DataTypes.STRING(50),
        bank_cbu: DataTypes.STRING(30),
        bank_alias: DataTypes.STRING(50),
        effective_from: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        effective_to: DataTypes.DATEONLY,
        is_current: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        notes: DataTypes.TEXT,
        created_by: DataTypes.UUID
    }, {
        tableName: 'user_salary_config_v2',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

// ============================================================================
// REGISTROS DE LIQUIDACIÓN (PAYROLL)
// ============================================================================
const UserPayrollRecords = (sequelize) => {
    return sequelize.define('UserPayrollRecords', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        period_year: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        period_month: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        period_type: DataTypes.STRING(30),
        payment_date: DataTypes.DATEONLY,

        // Conceptos de haberes
        base_salary: DataTypes.DECIMAL(12, 2),
        seniority_bonus: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        presentation_bonus: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        overtime_hours: {
            type: DataTypes.DECIMAL(6, 2),
            defaultValue: 0
        },
        overtime_50_amount: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        overtime_100_amount: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        vacation_days_paid: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        vacation_amount: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        sac_aguinaldo: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        commissions: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        bonuses: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        other_earnings: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        other_earnings_detail: DataTypes.TEXT,
        gross_total: DataTypes.DECIMAL(12, 2),

        // Conceptos de deducciones
        jubilacion: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        obra_social: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        ley_19032: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        sindicato: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        ganancias: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        other_deductions: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0
        },
        other_deductions_detail: DataTypes.TEXT,
        deductions_total: DataTypes.DECIMAL(12, 2),

        // Totales
        net_salary: DataTypes.DECIMAL(12, 2),

        // Horas trabajadas
        regular_hours_worked: DataTypes.DECIMAL(6, 2),
        overtime_50_hours: {
            type: DataTypes.DECIMAL(6, 2),
            defaultValue: 0
        },
        overtime_100_hours: {
            type: DataTypes.DECIMAL(6, 2),
            defaultValue: 0
        },
        total_hours_worked: DataTypes.DECIMAL(6, 2),

        // Días
        days_worked: DataTypes.INTEGER,
        absent_days: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        vacation_days_taken: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        sick_days: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        // Estado y documentación
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'draft'
        },
        receipt_number: DataTypes.STRING(50),
        digital_receipt_url: DataTypes.TEXT,
        signed_by_employee: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        signed_date: DataTypes.DATEONLY,

        notes: DataTypes.TEXT,
        created_by: DataTypes.UUID,
        approved_by: DataTypes.UUID
    }, {
        tableName: 'user_payroll_records',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

module.exports = {
    LaborAgreementsCatalog,
    SalaryCategories,
    UserSalaryConfigV2,
    UserPayrollRecords
};
