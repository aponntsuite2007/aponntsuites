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

    // Rol y jerarquía (Sistema de Roles y Comisiones - 11 roles)
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [[
          'ceo',                      // Gerente General (ve TODO)
          'regional_sales_manager',   // Gerente Regional de Ventas
          'regional_support_manager', // Gerente Regional de Soporte
          'sales_supervisor',         // Supervisor de Ventas
          'support_supervisor',       // Supervisor de Soporte
          'sales_leader',             // Líder de Ventas
          'sales_rep',                // Vendedor (Representante de Ventas)
          'support_agent',            // Agente de Soporte
          'admin',                    // Administrador del Sistema
          'marketing',                // Marketing
          'accounting'                // Contabilidad/Administrativo
        ]]
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
    regional_manager_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'aponnt_staff',
        key: 'id'
      }
    },
    ceo_id: {
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

    // Comisiones (Sistema de Roles y Comisiones)
    sales_commission_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 10.00,
      comment: 'Porcentaje de comisión por ventas (permanente)'
    },
    support_commission_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      comment: 'Porcentaje de comisión por soporte (temporal)'
    },
    pyramid_commission_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      comment: 'Porcentaje de comisión piramidal (SOLO ventas)'
    },

    // Configuración (Sistema de Roles y Comisiones)
    accepts_support_packages: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si acepta paquetes de soporte'
    },
    participates_in_auctions: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si participa en subastas de empresas'
    },

    // Datos bancarios y rating
    cbu: {
      type: DataTypes.STRING(22),
      allowNull: true,
      comment: 'CBU del vendedor para transferencias'
    },
    rating: {
      type: DataTypes.DECIMAL(3, 1),
      defaultValue: 0.0,
      comment: 'Rating promedio (0-5)'
    },
    total_ratings: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Cantidad de calificaciones recibidas'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas administrativas'
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
      { fields: ['supervisor_id'] },
      { fields: ['regional_manager_id'] },
      { fields: ['ceo_id'] }
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

    // Auto-relación: gerente regional (Sistema de Roles y Comisiones)
    AponntStaff.belongsTo(models.AponntStaff, {
      foreignKey: 'regional_manager_id',
      as: 'regional_manager'
    });

    AponntStaff.hasMany(models.AponntStaff, {
      foreignKey: 'regional_manager_id',
      as: 'regional_team'
    });

    // Auto-relación: CEO (Sistema de Roles y Comisiones)
    AponntStaff.belongsTo(models.AponntStaff, {
      foreignKey: 'ceo_id',
      as: 'ceo'
    });

    AponntStaff.hasMany(models.AponntStaff, {
      foreignKey: 'ceo_id',
      as: 'all_staff'
    });

    // Relación con empresas (many-to-many via AponntStaffCompany)
    AponntStaff.belongsToMany(models.Company, {
      through: models.AponntStaffCompany,
      foreignKey: 'staff_id',
      otherKey: 'company_id',
      as: 'assigned_companies'
    });

    // Relación con empresas creadas (Sistema de Roles y Comisiones)
    AponntStaff.hasMany(models.Company, {
      foreignKey: 'created_by_staff_id',
      as: 'created_companies'
    });

    // Relación con empresas como vendedor de venta (Sistema de Roles y Comisiones)
    AponntStaff.hasMany(models.Company, {
      foreignKey: 'assigned_vendor_id',
      as: 'sales_companies'
    });

    // Relación con empresas como vendedor de soporte (Sistema de Roles y Comisiones)
    AponntStaff.hasMany(models.Company, {
      foreignKey: 'support_vendor_id',
      as: 'support_companies'
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
