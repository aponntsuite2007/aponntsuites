const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Visitor = sequelize.define('Visitor', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Identificación básica
    dni: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true
      },
      comment: 'DNI/Cédula del visitante'
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },

    // Detalles de la visita
    visit_reason: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      },
      comment: 'Motivo de la visita'
    },
    visiting_department_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id'
      },
      comment: 'Departamento que visita'
    },
    responsible_employee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'Empleado responsable de la visita (UUID de users.user_id)'
    },

    // Estado de autorización
    authorization_status: {
      type: DataTypes.ENUM('pending', 'authorized', 'rejected', 'completed'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'pending: esperando aprobación, authorized: aprobado, rejected: rechazado, completed: visita finalizada'
    },
    authorized_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'Usuario que autorizó/rechazó la visita (UUID de users.user_id)'
    },
    authorized_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha/hora de autorización o rechazo'
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Motivo de rechazo si aplica'
    },

    // Rastreo GPS
    gps_tracking_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Si TRUE, se le entrega llavero GPS al visitante'
    },
    keyring_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      comment: 'ID del llavero GPS asignado al visitante'
    },

    // Biometría
    facial_template: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Template facial encriptado capturado en kiosko'
    },
    photo_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'URL de la foto del visitante'
    },

    // Timestamps de ingreso/salida
    check_in: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha/hora de ingreso real a las instalaciones'
    },
    check_out: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha/hora de salida de las instalaciones'
    },
    kiosk_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'kiosks',
        key: 'id'
      },
      comment: 'Kiosko donde se registró el ingreso'
    },

    // Fecha/hora planificada
    scheduled_visit_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Fecha/hora planificada de la visita'
    },
    expected_duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 60,
      comment: 'Duración esperada de la visita en minutos'
    },

    // Estado general
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'FALSE si la visita fue cancelada'
    },

    // Observaciones
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales sobre la visita'
    },

    // CAMPO MULTI-TENANT
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      }
    },

    // ========== ENTERPRISE FEATURES ==========

    // Categoría de visitante (para políticas de seguridad diferenciadas)
    visitor_category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'standard',
      validate: {
        isIn: [['vip', 'contractor', 'auditor', 'medical', 'delivery', 'standard', 'other']]
      },
      comment: 'Categoría: vip, contractor, auditor, medical, delivery, standard, other'
    },

    // Badge físico
    badge_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      comment: 'Número del badge físico impreso (único por visita activa)'
    },

    // Nivel de clearance de seguridad (zonas restringidas)
    security_clearance_level: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 4
      },
      comment: 'Nivel: 1=público, 2=restringido, 3=confidencial, 4=secreto'
    },

    // Audit trail (compliance)
    audit_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Razón documentada de autorización/rechazo'
    },
    audit_ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP desde donde se autorizó/rechazó'
    },
    audit_user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent del navegador que autorizó'
    },

    // Timestamps de cambios de status
    status_updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Última vez que cambió authorization_status'
    },
    status_updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'Quién cambió el status por última vez (UUID de users.user_id)'
    }
  }, {
    tableName: 'visitors',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true, // Soft delete
    deletedAt: 'deleted_at',
    indexes: [
      {
        fields: ['dni', 'company_id']
      },
      {
        fields: ['authorization_status']
      },
      {
        fields: ['scheduled_visit_date']
      },
      {
        fields: ['responsible_employee_id']
      },
      {
        fields: ['visiting_department_id']
      },
      {
        fields: ['company_id']
      },
      {
        fields: ['check_in']
      },
      {
        fields: ['check_out']
      },
      {
        unique: true,
        fields: ['keyring_id'],
        where: {
          deleted_at: null,
          keyring_id: {
            [sequelize.Sequelize.Op.ne]: null
          }
        },
        name: 'visitors_unique_keyring_id'
      }
    ]
  });

  // Métodos de instancia

  /**
   * Obtener nombre completo del visitante
   */
  Visitor.prototype.getFullName = function() {
    return `${this.first_name} ${this.last_name}`.trim();
  };

  /**
   * Verificar si la visita está actualmente en curso
   */
  Visitor.prototype.isCurrentlyVisiting = function() {
    return this.check_in !== null && this.check_out === null;
  };

  /**
   * Calcular duración de la visita en minutos
   */
  Visitor.prototype.getVisitDurationMinutes = function() {
    if (!this.check_in) return 0;

    const endTime = this.check_out || new Date();
    const durationMs = endTime - this.check_in;
    return Math.round(durationMs / 1000 / 60);
  };

  /**
   * Verificar si la visita está vencida (se pasó de la hora planificada)
   */
  Visitor.prototype.isOverdue = function() {
    if (this.check_out) return false; // Ya salió
    if (!this.check_in) return false; // Aún no entró

    const now = new Date();
    const expectedEnd = new Date(this.check_in);
    expectedEnd.setMinutes(expectedEnd.getMinutes() + (this.expected_duration_minutes || 60));

    return now > expectedEnd;
  };

  /**
   * Verificar si requiere rastreo GPS
   */
  Visitor.prototype.requiresGpsTracking = function() {
    return this.gps_tracking_enabled === true && this.keyring_id !== null;
  };

  /**
   * Verificar si puede ingresar (está autorizado y en horario)
   */
  Visitor.prototype.canCheckIn = function() {
    if (this.authorization_status !== 'authorized') return false;
    if (this.check_in !== null) return false; // Ya ingresó

    const now = new Date();
    const scheduled = new Date(this.scheduled_visit_date);

    // Permitir check-in 30 minutos antes hasta 2 horas después
    const minTime = new Date(scheduled);
    minTime.setMinutes(minTime.getMinutes() - 30);
    const maxTime = new Date(scheduled);
    maxTime.setHours(maxTime.getHours() + 2);

    return now >= minTime && now <= maxTime;
  };

  // Hooks

  /**
   * Antes de guardar, validar lógica de negocio
   */
  Visitor.beforeSave(async (visitor) => {
    // Si se asigna keyring, GPS debe estar habilitado
    if (visitor.keyring_id && !visitor.gps_tracking_enabled) {
      visitor.gps_tracking_enabled = true;
    }

    // Si se autoriza o rechaza, guardar timestamp
    if (visitor.changed('authorization_status')) {
      if (['authorized', 'rejected'].includes(visitor.authorization_status)) {
        visitor.authorized_at = visitor.authorized_at || new Date();
      }
    }

    // Si hace check_out, marcar como completed
    if (visitor.changed('check_out') && visitor.check_out) {
      visitor.authorization_status = 'completed';
    }
  });

  /**
   * Validar que check_out sea posterior a check_in
   */
  Visitor.beforeUpdate((visitor) => {
    if (visitor.check_in && visitor.check_out) {
      if (visitor.check_out < visitor.check_in) {
        throw new Error('La hora de salida debe ser posterior a la hora de ingreso');
      }
    }
  });

  return Visitor;
};
