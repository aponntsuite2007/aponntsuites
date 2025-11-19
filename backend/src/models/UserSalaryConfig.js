const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserSalaryConfig = sequelize.define('UserSalaryConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'user_id'
      },
      index: true
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'company_id',
      references: {
        model: 'companies',
        key: 'id'
      },
      index: true
    },
    baseSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'base_salary',
      comment: 'Salario base (bruto)'
    },
    salaryCurrency: {
      type: DataTypes.STRING(10),
      defaultValue: 'ARS',
      field: 'salary_currency'
    },
    salaryType: {
      type: DataTypes.ENUM('mensual', 'jornal', 'por_hora', 'comision'),
      allowNull: true,
      field: 'salary_type',
      comment: 'Tipo de salario: mensual (fijo), jornal (diario), por_hora, comisión'
    },
    paymentFrequency: {
      type: DataTypes.ENUM('mensual', 'quincenal', 'semanal', 'diario'),
      allowNull: true,
      field: 'payment_frequency'
    },
    paymentDay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'payment_day',
      comment: 'Día del mes o semana de pago (ej: 1, 15, 30)'
    },
    bankName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'bank_name'
    },
    bankAccountNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'bank_account_number'
    },
    bankAccountType: {
      type: DataTypes.ENUM('caja_ahorro', 'cuenta_corriente'),
      allowNull: true,
      field: 'bank_account_type'
    },
    cbu: {
      type: DataTypes.STRING(22),
      allowNull: true,
      comment: 'CBU de 22 dígitos para transferencias bancarias'
    },
    aliasCbu: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'alias_cbu'
    },
    swiftCode: {
      type: DataTypes.STRING(15),
      allowNull: true,
      field: 'swift_code',
      comment: 'Para transferencias internacionales'
    },
    paymentMethod: {
      type: DataTypes.ENUM('transferencia', 'cheque', 'efectivo', 'tarjeta'),
      defaultValue: 'transferencia',
      field: 'payment_method'
    },
    paymentNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'payment_notes'
    },
    bonuses: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'JSON array de bonos [{name, amount, frequency, description}]'
    },
    allowances: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Asignaciones (viáticos, etc.) [{name, amount, frequency}]'
    },
    deductions: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'JSON array de descuentos [{name, amount, type, description}]'
    },
    hasObraSocial: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'has_obra_social'
    },
    obraSocialDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'obra_social_deduction'
    },
    hasSindicato: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_sindicato'
    },
    sindicatoDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'sindicato_deduction'
    },
    taxWithholdingPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'tax_withholding_percentage',
      comment: 'Porcentaje de retención'
    },
    hasTaxExemption: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_tax_exemption'
    },
    taxExemptionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'tax_exemption_reason'
    },
    overtimeEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'overtime_enabled'
    },
    overtimeRateWeekday: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 1.50,
      field: 'overtime_rate_weekday',
      comment: 'Multiplicador para horas extra entre semana (ej: 1.50 = 50% más)'
    },
    overtimeRateWeekend: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 2.00,
      field: 'overtime_rate_weekend',
      comment: 'Multiplicador horas extra fin de semana'
    },
    overtimeRateHoliday: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 2.00,
      field: 'overtime_rate_holiday',
      comment: 'Multiplicador horas extra feriados'
    },
    vacationDaysPerYear: {
      type: DataTypes.INTEGER,
      defaultValue: 14,
      field: 'vacation_days_per_year'
    },
    vacationDaysUsed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'vacation_days_used'
    },
    vacationDaysPending: {
      type: DataTypes.INTEGER,
      defaultValue: 14,
      field: 'vacation_days_pending'
    },
    sacEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'sac_enabled',
      comment: 'Si cobra aguinaldo (SAC - Sueldo Anual Complementario)'
    },
    sacCalculationMethod: {
      type: DataTypes.STRING(50),
      defaultValue: 'best_salary',
      field: 'sac_calculation_method',
      comment: 'average_salary o best_salary'
    },
    lastSalaryReviewDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'last_salary_review_date'
    },
    nextSalaryReviewDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'next_salary_review_date',
      comment: 'Fecha de próxima revisión salarial'
    },
    salaryIncreasePercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'salary_increase_percentage',
      comment: 'Último aumento'
    },
    salaryIncreaseNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'salary_increase_notes'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    lastUpdatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'last_updated_by',
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'user_salary_config',
    timestamps: true,
    underscored: true
  });

  UserSalaryConfig.associate = (models) => {
    UserSalaryConfig.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    UserSalaryConfig.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company'
    });
    UserSalaryConfig.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    UserSalaryConfig.belongsTo(models.User, {
      foreignKey: 'lastUpdatedBy',
      as: 'updater'
    });
  };

  return UserSalaryConfig;
};
