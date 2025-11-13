/**
 * =====================================================================
 * MODELO: AponntStaff
 * =====================================================================
 *
 * Personal operativo de Aponnt (administradores, supervisores, líderes,
 * vendedores, soporte, administrativo, marketing).
 *
 * Incluye autenticación y biométrico (Azure Face API).
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AponntStaff = sequelize.define('AponntStaff', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },

    // Datos personales
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    dni: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(20)
    },

    // Autenticación
    username: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },

    // Rol y jerarquía
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['admin', 'supervisor', 'leader', 'vendor', 'soporte', 'administrativo', 'marketing']]
      }
    },
    leader_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'aponnt_staff',
        key: 'id'
      }
    },
    supervisor_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'aponnt_staff',
        key: 'id'
      }
    },

    // Biométrico (Azure Face API)
    face_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    face_descriptor: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descriptor facial de Azure Face API (formato JSON)'
    },
    face_registered_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    fingerprint_data: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Para futura implementación de huella'
    },
    biometric_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // Estado
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    first_login: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    password_changed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Auditoría
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'aponnt_staff',
        key: 'id'
      }
    }
  }, {
    tableName: 'aponnt_staff',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['username'] },
      { fields: ['email'] },
      { fields: ['dni'] },
      { fields: ['role'] },
      { fields: ['leader_id'] },
      { fields: ['supervisor_id'] }
    ]
  });

  // Asociaciones
  AponntStaff.associate = (models) => {
    // Auto-relación: líder
    AponntStaff.belongsTo(models.AponntStaff, {
      foreignKey: 'leader_id',
      as: 'leader'
    });

    AponntStaff.hasMany(models.AponntStaff, {
      foreignKey: 'leader_id',
      as: 'team_members'
    });

    // Auto-relación: supervisor
    AponntStaff.belongsTo(models.AponntStaff, {
      foreignKey: 'supervisor_id',
      as: 'supervisor'
    });

    AponntStaff.hasMany(models.AponntStaff, {
      foreignKey: 'supervisor_id',
      as: 'supervised_staff'
    });

    // Relación con empresas (many-to-many via AponntStaffCompany)
    AponntStaff.belongsToMany(models.Company, {
      through: models.AponntStaffCompany,
      foreignKey: 'staff_id',
      otherKey: 'company_id',
      as: 'assigned_companies'
    });

    // Auditoría: quién creó
    AponntStaff.belongsTo(models.AponntStaff, {
      foreignKey: 'created_by',
      as: 'creator'
    });

    AponntStaff.hasMany(models.AponntStaff, {
      foreignKey: 'created_by',
      as: 'created_staff'
    });
  };

  return AponntStaff;
};
