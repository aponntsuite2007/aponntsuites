const { DataTypes } = require('sequelize');

/**
 * ============================================================================
 * MODELO: AponntStaffRole
 * ============================================================================
 *
 * Roles organizacionales para el staff de Aponnt.
 * NO confundir con roles de usuarios de empresas clientes.
 *
 * Características:
 * - Estructura jerárquica de 5 niveles (0: CEO, 1: Gerentes, 2: Jefes, 3: Coordinadores, 4: Operativos)
 * - Soporte multi-país: roles que se replican por país (is_country_specific = true)
 * - i18n: nombres de roles en 6 idiomas (role_name_i18n)
 * - Sistema de comisiones: roles de ventas (is_sales_role = true)
 *
 * Autor: Claude Code
 * Fecha: 2025-01-21
 */

module.exports = (sequelize) => {
  const AponntStaffRole = sequelize.define('AponntStaffRole', {
    role_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'UUID único del rol'
    },

    // Identificación del rol
    role_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 10],
        isUppercase: true
      },
      comment: 'Código único del rol: GG, GR, GA, GD, SV, LV, VEND, etc.'
    },

    role_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      },
      comment: 'Nombre del rol en español (idioma base)'
    },

    // Internacionalización (JSON con 6 idiomas)
    role_name_i18n: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Nombres del rol en múltiples idiomas: {es, en, pt, fr, de, it}'
    },

    // Categorización organizacional
    role_area: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['ventas', 'admin', 'desarrollo', 'externo', 'direccion']]
      },
      comment: 'Área organizacional: ventas, admin, desarrollo, externo, direccion'
    },

    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 4
      },
      comment: 'Nivel jerárquico: 0=CEO, 1=Gerentes, 2=Jefes, 3=Coordinadores, 4=Operativos'
    },

    // Configuraciones del rol
    is_sales_role: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'TRUE si el rol participa en el sistema de comisiones de ventas'
    },

    is_country_specific: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'TRUE si el rol se replica por país (ej: Gerente Regional, Supervisor, Vendedor)'
    },

    // Jerarquía (a nivel de rol)
    reports_to_role_code: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Código del rol superior: GR reporta a GG, SV reporta a GR, etc.'
    },

    // Metadata
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción del rol'
    },

    responsibilities: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array de responsabilidades del rol'
    },

    // Auditoría
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Fecha de creación del rol'
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Fecha de última actualización del rol'
    }
  }, {
    tableName: 'aponnt_staff_roles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: false,  // Mantener nombres de campos como están definidos

    indexes: [
      {
        name: 'idx_staff_roles_area',
        fields: ['role_area']
      },
      {
        name: 'idx_staff_roles_level',
        fields: ['level']
      },
      {
        name: 'idx_staff_roles_country_specific',
        fields: ['is_country_specific'],
        where: {
          is_country_specific: true
        }
      },
      {
        name: 'idx_staff_roles_reports_to',
        fields: ['reports_to_role_code']
      }
    ]
  });

  /**
   * Asociaciones del modelo
   */
  AponntStaffRole.associate = (models) => {
    // Un rol puede tener muchos usuarios asignados
    AponntStaffRole.hasMany(models.User, {
      foreignKey: 'aponnt_staff_role_id',
      as: 'staff_members',
      onDelete: 'SET NULL'
    });

    // Auto-asociación para jerarquía de roles (opcional, si quieres navegarla desde el modelo)
    // Por ahora, la jerarquía se maneja via reports_to_role_code (string)
  };

  /**
   * Métodos de instancia
   */

  // Obtener nombre del rol en idioma específico
  AponntStaffRole.prototype.getNameInLanguage = function(lang = 'es') {
    if (this.role_name_i18n && this.role_name_i18n[lang]) {
      return this.role_name_i18n[lang];
    }
    return this.role_name;  // Fallback al nombre en español
  };

  // Verificar si es rol de ventas
  AponntStaffRole.prototype.isSalesRole = function() {
    return this.is_sales_role === true;
  };

  // Verificar si es rol específico de país
  AponntStaffRole.prototype.isCountrySpecific = function() {
    return this.is_country_specific === true;
  };

  /**
   * Métodos de clase (estáticos)
   */

  // Obtener todos los roles de un área específica
  AponntStaffRole.getRolesByArea = async function(area) {
    return await this.findAll({
      where: { role_area: area },
      order: [['level', 'ASC'], ['role_name', 'ASC']]
    });
  };

  // Obtener todos los roles de ventas (con comisiones)
  AponntStaffRole.getSalesRoles = async function() {
    return await this.findAll({
      where: { is_sales_role: true },
      order: [['level', 'ASC']]
    });
  };

  // Obtener todos los roles que se replican por país
  AponntStaffRole.getCountrySpecificRoles = async function() {
    return await this.findAll({
      where: { is_country_specific: true },
      order: [['level', 'ASC']]
    });
  };

  // Obtener jerarquía de roles
  AponntStaffRole.getHierarchy = async function() {
    const roles = await this.findAll({
      order: [['level', 'ASC'], ['role_name', 'ASC']]
    });

    // Construir árbol jerárquico
    const hierarchy = {};
    roles.forEach(role => {
      const level = role.level;
      if (!hierarchy[level]) {
        hierarchy[level] = [];
      }
      hierarchy[level].push(role);
    });

    return hierarchy;
  };

  return AponntStaffRole;
};
