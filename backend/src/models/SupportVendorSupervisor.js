/**
 * MÓDULO DE SOPORTE - SupportVendorSupervisor Model
 *
 * Jerarquía de supervisores asignados a cada vendedor
 * Cada vendedor tiene un supervisor que recibe tickets escalados
 *
 * @version 2.0.0
 * @date 2025-01-23
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupportVendorSupervisor = sequelize.define('SupportVendorSupervisor', {
    assignment_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'UUID primary key'
    },

    // Vendor
    vendor_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'CASCADE',
      comment: 'Vendor who needs a supervisor'
    },

    // Supervisor assigned
    supervisor_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'CASCADE',
      comment: 'Supervisor assigned to this vendor'
    },

    // Assignment dates
    assigned_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'When supervisor was assigned'
    },
    assigned_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'SET NULL',
      comment: 'Admin who made the assignment'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this assignment is currently active'
    },

    // Metadata
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional notes about this assignment'
    }
  }, {
    tableName: 'support_vendor_supervisors',
    timestamps: true,
    underscored: true,
    updatedAt: false,
    indexes: [
      { fields: ['vendor_id'] },
      { fields: ['supervisor_id'] },
      { fields: ['is_active'] },
      {
        unique: true,
        fields: ['vendor_id', 'supervisor_id'],
        name: 'unique_vendor_supervisor'
      }
    ],
    comment: 'Vendor-supervisor hierarchy'
  });

  SupportVendorSupervisor.associate = (models) => {
    SupportVendorSupervisor.belongsTo(models.User, {
      foreignKey: 'vendor_id',
      as: 'vendor'
    });

    SupportVendorSupervisor.belongsTo(models.User, {
      foreignKey: 'supervisor_id',
      as: 'supervisor'
    });

    SupportVendorSupervisor.belongsTo(models.User, {
      foreignKey: 'assigned_by_user_id',
      as: 'assignedBy'
    });
  };

  return SupportVendorSupervisor;
};
