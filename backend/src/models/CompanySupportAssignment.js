/**
 * MÓDULO DE SOPORTE - CompanySupportAssignment Model
 *
 * Asignación de soporte técnico por empresa
 * Define quién da soporte: vendedor original, otro vendedor, o Aponnt directo
 *
 * @version 2.0.0
 * @date 2025-01-23
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CompanySupportAssignment = sequelize.define('CompanySupportAssignment', {
    assignment_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'UUID primary key'
    },

    // Client company
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      },
      onDelete: 'CASCADE',
      comment: 'Client company'
    },

    // Support type
    support_type: {
      type: DataTypes.ENUM('original_vendor', 'other_vendor', 'aponnt_support'),
      allowNull: false,
      comment: 'Type of support: original_vendor (default), other_vendor, aponnt_support'
    },

    // Assigned vendor/support (NULL if aponnt_support)
    assigned_vendor_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'SET NULL',
      comment: 'Vendor/support assigned (NULL if aponnt_support)'
    },

    // Original vendor (who made the sale)
    original_vendor_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'CASCADE',
      comment: 'Vendor who made the original sale'
    },

    // Assignment dates
    assigned_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'When assignment was made'
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
    }
  }, {
    tableName: 'company_support_assignments',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['company_id'] },
      { fields: ['assigned_vendor_id'] },
      { fields: ['is_active'] }
    ],
    comment: 'Support assignment per company'
  });

  CompanySupportAssignment.associate = (models) => {
    CompanySupportAssignment.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company'
    });

    CompanySupportAssignment.belongsTo(models.User, {
      foreignKey: 'assigned_vendor_id',
      as: 'assignedVendor'
    });

    CompanySupportAssignment.belongsTo(models.User, {
      foreignKey: 'original_vendor_id',
      as: 'originalVendor'
    });

    CompanySupportAssignment.belongsTo(models.User, {
      foreignKey: 'assigned_by_user_id',
      as: 'assignedBy'
    });
  };

  return CompanySupportAssignment;
};
