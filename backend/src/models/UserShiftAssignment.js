/**
 * UserShiftAssignment Model
 *
 * Tabla de asignación de usuarios a turnos rotativos.
 * Los usuarios se ACOPLAN al turno en marcha (no resetean el ciclo).
 *
 * Ejemplo:
 * - Turno "5x2 Producción" arrancó el 15/01
 * - Juan se acopla el 22/01 al grupo "Tarde"
 * - Juan trabaja cuando el turno global está en fase "Tarde"
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserShiftAssignment = sequelize.define('UserShiftAssignment', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },

    // ========================================
    // Relaciones Multi-tenant
    // ========================================

    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'CASCADE',
      index: true
    },

    shift_id: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'shift_id',
      references: {
        model: 'shifts',
        key: 'id'
      },
      onDelete: 'CASCADE',
      index: true
    },

    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'company_id',
      references: {
        model: 'companies',
        key: 'company_id'
      },
      onDelete: 'CASCADE',
      index: true
    },

    // ========================================
    // Configuración de acoplamiento
    // ========================================

    join_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'join_date',
      comment: 'Fecha en que el usuario se ACOPLA al turno en marcha'
    },

    assigned_phase: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'assigned_phase',
      index: true,
      comment: 'Fase/Grupo asignado: mañana, tarde, noche, etc.'
    },

    group_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'group_name',
      comment: 'Nombre descriptivo: "Producción - Paletizado - Mañana"'
    },

    sector: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'sector',
      index: true,
      comment: 'Sector específico dentro del departamento'
    },

    // ========================================
    // Metadata de asignación
    // ========================================

    assigned_by: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assigned_by',
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'SET NULL'
    },

    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'assigned_at'
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
      index: true,
      comment: 'Solo UNA asignación activa por usuario'
    },

    deactivated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deactivated_at'
    },

    deactivated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'deactivated_by',
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'SET NULL'
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'notes'
    },

    // ========================================
    // Timestamps
    // ========================================

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }

  }, {
    tableName: 'user_shift_assignments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    // Índices
    indexes: [
      // Buscar asignación activa de un usuario (query más común)
      {
        name: 'idx_user_shift_active',
        fields: ['user_id', 'is_active', 'join_date'],
        where: {
          is_active: true
        }
      },

      // Filtrar por empresa y turno
      {
        name: 'idx_user_shift_company_shift',
        fields: ['company_id', 'shift_id', 'is_active']
      },

      // Filtrar por fase/grupo
      {
        name: 'idx_user_shift_phase',
        fields: ['assigned_phase', 'is_active'],
        where: {
          is_active: true
        }
      },

      // Búsquedas por sector
      {
        name: 'idx_user_shift_sector',
        fields: ['sector', 'company_id'],
        where: {
          sector: {
            $ne: null
          }
        }
      },

      // Constraint: Solo UNA asignación activa por usuario
      {
        name: 'idx_user_shift_unique_active',
        unique: true,
        fields: ['user_id'],
        where: {
          is_active: true
        }
      }
    ],

    // Hooks
    hooks: {
      beforeCreate: async (assignment, options) => {
        // Desactivar asignaciones previas del usuario
        if (assignment.is_active) {
          await UserShiftAssignment.update(
            { is_active: false, deactivated_at: new Date() },
            {
              where: {
                user_id: assignment.user_id,
                is_active: true,
                id: { [sequelize.Sequelize.Op.ne]: assignment.id }
              },
              transaction: options.transaction
            }
          );
        }
      },

      beforeUpdate: async (assignment, options) => {
        // Si se activa, desactivar las demás
        if (assignment.is_active && assignment.changed('is_active')) {
          await UserShiftAssignment.update(
            { is_active: false, deactivated_at: new Date() },
            {
              where: {
                user_id: assignment.user_id,
                is_active: true,
                id: { [sequelize.Sequelize.Op.ne]: assignment.id }
              },
              transaction: options.transaction
            }
          );
        }
      }
    }
  });

  // ========================================
  // Métodos de clase
  // ========================================

  /**
   * Obtiene la asignación activa de un usuario
   */
  UserShiftAssignment.getActiveAssignment = async function(userId) {
    return await UserShiftAssignment.findOne({
      where: {
        user_id: userId,
        is_active: true
      },
      include: [{
        model: sequelize.models.Shift,
        as: 'shift'
      }],
      order: [['join_date', 'DESC']]
    });
  };

  /**
   * Asigna un usuario a un turno rotativo
   */
  UserShiftAssignment.assignUserToShift = async function(data, transaction = null) {
    const { userId, shiftId, companyId, joinDate, assignedPhase, groupName, sector, assignedBy, notes } = data;

    return await UserShiftAssignment.create({
      user_id: userId,
      shift_id: shiftId,
      company_id: companyId,
      join_date: joinDate || new Date().toISOString().split('T')[0],
      assigned_phase: assignedPhase,
      group_name: groupName,
      sector: sector,
      assigned_by: assignedBy,
      notes: notes,
      is_active: true
    }, { transaction });
  };

  /**
   * Desactiva la asignación de un usuario
   */
  UserShiftAssignment.deactivateAssignment = async function(userId, deactivatedBy = null, transaction = null) {
    return await UserShiftAssignment.update({
      is_active: false,
      deactivated_at: new Date(),
      deactivated_by: deactivatedBy
    }, {
      where: {
        user_id: userId,
        is_active: true
      },
      transaction
    });
  };

  /**
   * Obtiene todos los usuarios de un turno agrupados por fase
   */
  UserShiftAssignment.getUsersByShiftAndPhase = async function(shiftId, companyId) {
    return await UserShiftAssignment.findAll({
      where: {
        shift_id: shiftId,
        company_id: companyId,
        is_active: true
      },
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['user_id', 'nombre', 'apellido', 'legajo', 'email']
      }],
      order: [
        ['assigned_phase', 'ASC'],
        ['join_date', 'ASC']
      ]
    });
  };

  return UserShiftAssignment;
};
