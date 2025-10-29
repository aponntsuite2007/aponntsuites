/**
 * MÓDULO DE SOPORTE - SupportSLAPlan Model
 *
 * Planes de SLA contratables por las empresas
 * - Standard (gratis): 24h/72h/8h, sin IA
 * - Pro ($29.99): 8h/24h/4h, con IA
 * - Premium ($79.99): 2h/8h/2h, con IA
 *
 * @version 2.0.0
 * @date 2025-01-23
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupportSLAPlan = sequelize.define('SupportSLAPlan', {
    plan_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'UUID primary key'
    },
    plan_name: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
      comment: 'Internal name: standard, pro, premium'
    },
    display_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Display name for UI'
    },

    // SLA times (in hours)
    first_response_hours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Maximum time for first response'
    },
    resolution_hours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Maximum time for complete resolution'
    },
    escalation_hours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Time without response to auto-escalate to supervisor'
    },

    // Pricing
    price_monthly: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Monthly price in USD'
    },

    // Features
    has_ai_assistant: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether plan includes AI assistant (Ollama) or just fallback'
    },
    priority_level: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: '1=urgent, 2=high, 3=medium, 4=low'
    },

    // Metadata
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether plan is currently available'
    }
  }, {
    tableName: 'support_sla_plans',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['plan_name'], unique: true },
      { fields: ['is_active'] }
    ],
    comment: 'SLA plans available for companies'
  });

  SupportSLAPlan.associate = (models) => {
    SupportSLAPlan.hasMany(models.Company, {
      foreignKey: 'support_sla_plan_id',
      as: 'companies'
    });
  };

  return SupportSLAPlan;
};
