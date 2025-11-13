/**
 * =====================================================================
 * MODELO: AponntStaffCompany
 * =====================================================================
 *
 * Relación many-to-many entre staff de Aponnt y empresas cliente.
 * Define qué vendedores/soportes atienden qué empresas.
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AponntStaffCompany = sequelize.define('AponntStaffCompany', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },

    // Relaciones
    staff_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'aponnt_staff',
        key: 'id'
      }
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      }
    },

    // Metadata
    assigned_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    assigned_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'aponnt_staff',
        key: 'id'
      },
      comment: 'Quién realizó la asignación (supervisor/admin)'
    },
    assignment_note: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Estado
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    deactivated_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deactivated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'aponnt_staff',
        key: 'id'
      }
    }
  }, {
    tableName: 'aponnt_staff_companies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['staff_id', 'company_id']
      },
      { fields: ['staff_id'] },
      { fields: ['company_id'] },
      { fields: ['is_active'] }
    ]
  });

  // Asociaciones
  AponntStaffCompany.associate = (models) => {
    // Relación con staff
    AponntStaffCompany.belongsTo(models.AponntStaff, {
      foreignKey: 'staff_id',
      as: 'staff'
    });

    // Relación con company
    AponntStaffCompany.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company'
    });

    // Quién asignó
    AponntStaffCompany.belongsTo(models.AponntStaff, {
      foreignKey: 'assigned_by',
      as: 'assigner'
    });

    // Quién desactivó
    AponntStaffCompany.belongsTo(models.AponntStaff, {
      foreignKey: 'deactivated_by',
      as: 'deactivator'
    });
  };

  return AponntStaffCompany;
};
