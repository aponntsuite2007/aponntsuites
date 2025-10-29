/**
 * MÓDULO DE SOPORTE - SupportVendorStats Model
 *
 * Estadísticas agregadas de performance de soporte por vendedor
 *
 * @version 2.0.0
 * @date 2025-01-23
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupportVendorStats = sequelize.define('SupportVendorStats', {
    stat_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'UUID primary key'
    },
    vendor_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'CASCADE',
      comment: 'Vendor for these statistics'
    },

    // Period
    period_start: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Start date of statistics period'
    },
    period_end: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'End date of statistics period'
    },

    // Statistics
    total_tickets: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total tickets assigned'
    },
    tickets_resolved: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Tickets marked as resolved'
    },
    tickets_closed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Tickets closed'
    },
    avg_resolution_time_hours: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Average resolution time in hours'
    },
    avg_rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Average client rating (1.00 to 5.00)'
    },

    // Metadata
    calculated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'When these stats were calculated'
    }
  }, {
    tableName: 'support_vendor_stats',
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ['vendor_id'] },
      { fields: ['period_start', 'period_end'] },
      {
        unique: true,
        fields: ['vendor_id', 'period_start', 'period_end'],
        name: 'unique_vendor_period'
      }
    ],
    comment: 'Aggregated support performance statistics by vendor'
  });

  SupportVendorStats.associate = (models) => {
    SupportVendorStats.belongsTo(models.User, {
      foreignKey: 'vendor_id',
      as: 'vendor'
    });
  };

  return SupportVendorStats;
};
