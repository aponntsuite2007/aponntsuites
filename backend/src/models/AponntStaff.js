const { DataTypes } = require('sequelize');

/**
 * ============================================================================
 * MODELO: AponntStaff
 * ============================================================================
 *
 * Staff de Aponnt (vendedores, gerentes, desarrollo, administrativos, externos).
 * Tabla SEPARADA de users (empresas) para aislación total.
 *
 * Características:
 * - Relación 1-to-1 OPCIONAL con users (solo si tiene acceso al sistema)
 * - Sistema de autenticación propio
 * - Soporte multi-país para área de ventas
 * - Estructura jerárquica auto-referencial
 *
 * Autor: Claude Code
 * Fecha: 2025-01-21
 */

module.exports = (sequelize) => {
  const AponntStaff = sequelize.define('AponntStaff', {
    staff_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'UUID único del staff'
    },

    // Relación OPCIONAL con users (solo si tiene acceso al sistema)
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'SET NULL',
      comment: 'FK a users (OPCIONAL). Solo si el staff tiene acceso al sistema'
    },

    // Datos personales
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      },
      comment: 'Nombre del staff'
    },

    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      },
      comment: 'Apellido del staff'
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      },
      comment: 'Email único del staff (para login y comunicación)'
    },

    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Teléfono de contacto'
    },

    document_type: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Tipo de documento: DNI, Passport, RUT, etc.'
    },

    document_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Número de documento'
    },

    // Rol organizacional
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'aponnt_staff_roles',
        key: 'role_id'
      },
      onDelete: 'RESTRICT',
      comment: 'FK a aponnt_staff_roles. Define el rol organizacional'
    },

    // Jerarquía organizacional (auto-referencia)
    reports_to_staff_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'aponnt_staff',
        key: 'staff_id'
      },
      onDelete: 'SET NULL',
      comment: 'FK a aponnt_staff (auto-referencia). Define la jerarquía'
    },

    // Ubicación geográfica y nacionalidad (CRÍTICO para multi-país)
    country: {
      type: DataTypes.STRING(2),
      allowNull: false,
      validate: {
        len: [2, 2],
        isUppercase: true
      },
      comment: 'País asignado (código ISO-2): AR, BR, CL, MX, US, ES'
    },

    nationality: {
      type: DataTypes.STRING(2),
      allowNull: true,
      validate: {
        len: [2, 2],
        isUppercase: true
      },
      comment: 'Nacionalidad del empleado (código ISO-2)'
    },

    // Clasificación organizacional (denormalizados desde role para queries rápidas)
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 4
      },
      comment: 'Nivel jerárquico: 0=CEO, 1=Gerentes, 2=Jefes, 3=Coordinadores, 4=Operativos'
    },

    area: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['ventas', 'admin', 'desarrollo', 'externo', 'direccion']]
      },
      comment: 'Área organizacional: ventas, admin, desarrollo, externo, direccion'
    },

    // Preferencias
    language_preference: {
      type: DataTypes.STRING(2),
      defaultValue: 'es',
      validate: {
        isIn: [['es', 'en', 'pt', 'fr', 'de', 'it']]
      },
      comment: 'Idioma preferido: es, en, pt, fr, de, it'
    },

    // Contratación
    contract_type: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['interno', 'externo', 'freelance']]
      },
      comment: 'Tipo de contrato: interno, externo, freelance'
    },

    hire_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fecha de contratación'
    },

    termination_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fecha de terminación del contrato'
    },

    // Datos bancarios (para comisiones)
    cbu: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'CBU/IBAN para depósitos'
    },

    bank_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Nombre del banco'
    },

    bank_account_type: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['checking', 'savings']]
      },
      comment: 'Tipo de cuenta bancaria'
    },

    // Configuración de vendedores (solo para staff de ventas)
    accepts_support_packages: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si acepta paquetes de soporte (vendedores)'
    },

    accepts_auctions: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si acepta subastas de soporte (vendedores)'
    },

    whatsapp_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'WhatsApp para contacto con clientes'
    },

    global_rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 5
      },
      comment: 'Calificación global del vendedor (0-5)'
    },

    // Estado
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si el staff está activo'
    },

    // Auditoría
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'SET NULL',
      comment: 'Usuario que creó el registro'
    },

    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'SET NULL',
      comment: 'Usuario que actualizó el registro'
    }
  }, {
    tableName: 'aponnt_staff',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: false
  });

  /**
   * Asociaciones del modelo
   */
  AponntStaff.associate = (models) => {
    // Relación con User (1-to-1 opcional)
    AponntStaff.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user_account',
      onDelete: 'SET NULL'
    });

    // Relación con AponntStaffRole
    AponntStaff.belongsTo(models.AponntStaffRole, {
      foreignKey: 'role_id',
      as: 'role',
      onDelete: 'RESTRICT'
    });

    // Auto-asociación para jerarquía
    AponntStaff.belongsTo(models.AponntStaff, {
      foreignKey: 'reports_to_staff_id',
      as: 'supervisor',
      onDelete: 'SET NULL'
    });

    AponntStaff.hasMany(models.AponntStaff, {
      foreignKey: 'reports_to_staff_id',
      as: 'subordinates',
      onDelete: 'SET NULL'
    });

    // Relaciones con comisiones y ratings (si existen)
    if (models.VendorCommission) {
      AponntStaff.hasMany(models.VendorCommission, {
        foreignKey: 'vendorId',
        sourceKey: 'user_id',
        as: 'commissions'
      });
    }

    if (models.VendorRating) {
      AponntStaff.hasMany(models.VendorRating, {
        foreignKey: 'vendorId',
        sourceKey: 'user_id',
        as: 'ratings'
      });
    }
  };

  /**
   * Métodos de instancia
   */

  // Obtener nombre completo
  AponntStaff.prototype.getFullName = function() {
    return `${this.first_name} ${this.last_name}`;
  };

  // Verificar si tiene acceso al sistema
  AponntStaff.prototype.hasSystemAccess = function() {
    return this.user_id !== null;
  };

  // Verificar si es vendedor
  AponntStaff.prototype.isVendor = function() {
    return this.area === 'ventas' && this.accepts_support_packages === true;
  };

  // Verificar si es de un país específico
  AponntStaff.prototype.isFromCountry = function(countryCode) {
    return this.country === countryCode.toUpperCase();
  };

  /**
   * Métodos de clase (estáticos)
   */

  // Obtener todo el staff de un país
  AponntStaff.getByCountry = async function(countryCode, options = {}) {
    return await this.findAll({
      where: {
        country: countryCode.toUpperCase(),
        is_active: true,
        ...options.where
      },
      include: options.include || [
        { model: sequelize.models.AponntStaffRole, as: 'role' },
        { model: sequelize.models.AponntStaff, as: 'supervisor' }
      ],
      order: options.order || [['level', 'ASC'], ['last_name', 'ASC']]
    });
  };

  // Obtener staff de un área específica
  AponntStaff.getByArea = async function(area, options = {}) {
    return await this.findAll({
      where: {
        area,
        is_active: true,
        ...options.where
      },
      include: options.include || [
        { model: sequelize.models.AponntStaffRole, as: 'role' }
      ],
      order: options.order || [['level', 'ASC'], ['last_name', 'ASC']]
    });
  };

  // Obtener vendedores de un país
  AponntStaff.getVendorsByCountry = async function(countryCode) {
    return await this.findAll({
      where: {
        area: 'ventas',
        country: countryCode.toUpperCase(),
        is_active: true,
        accepts_support_packages: true
      },
      include: [
        { model: sequelize.models.AponntStaffRole, as: 'role' },
        { model: sequelize.models.AponntStaff, as: 'supervisor' }
      ],
      order: [['level', 'ASC'], ['last_name', 'ASC']]
    });
  };

  // Obtener jerarquía completa de un país (recursivo)
  AponntStaff.getHierarchyByCountry = async function(countryCode) {
    // Query recursivo SQL para obtener toda la jerarquía
    const query = `
      WITH RECURSIVE hierarchy AS (
        -- Gerente Regional o CEO del país
        SELECT s.*, r.role_name, r.role_code, 0 as depth
        FROM aponnt_staff s
        INNER JOIN aponnt_staff_roles r ON s.role_id = r.role_id
        WHERE s.country = :country
          AND s.is_active = true
          AND s.reports_to_staff_id IS NULL

        UNION ALL

        -- Subordinados recursivamente
        SELECT s.*, r.role_name, r.role_code, h.depth + 1
        FROM aponnt_staff s
        INNER JOIN aponnt_staff_roles r ON s.role_id = r.role_id
        INNER JOIN hierarchy h ON s.reports_to_staff_id = h.staff_id
        WHERE s.is_active = true
      )
      SELECT * FROM hierarchy ORDER BY depth, level, last_name
    `;

    return await sequelize.query(query, {
      replacements: { country: countryCode.toUpperCase() },
      type: sequelize.QueryTypes.SELECT
    });
  };

  return AponntStaff;
};
