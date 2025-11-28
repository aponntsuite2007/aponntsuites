const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attendance = sequelize.define('Attendance', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'UserId',
      references: {
        model: 'users',
        key: 'user_id'
      },
      // Index for fast user lookups
      index: true,
      comment: 'UUID reference to users table'
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'company_id',
      references: {
        model: 'companies',
        key: 'company_id'
      },
      index: true,
      comment: 'Multi-tenant: company this attendance belongs to'
    },
    employee_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'employee_id',
      // Denormalized field for faster queries
      index: true,
      comment: 'Denormalized employee ID for faster queries'
    },
    branch_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'BranchId',
      references: {
        model: 'branches',
        key: 'id'
      },
      index: true
    },
    check_in: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'checkInTime',
      // Partitioning key for time-based partitioning
      index: true,
      comment: 'Check-in timestamp (real column name in production)'
    },
    check_out: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'checkOutTime',
      index: true,
      comment: 'Check-out timestamp (real column name in production)'
    },
    break_out: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when employee starts break'
    },
    break_in: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when employee returns from break'
    },
    kiosk_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'kiosks',
        key: 'id'
      },
      index: true,
      comment: 'Kiosk usado para registrar asistencia (null si es app móvil)'
    },
    origin_type: {
      type: DataTypes.ENUM('kiosk', 'mobile_app', 'web', 'manual'),
      allowNull: false,
      defaultValue: 'kiosk',
      index: true,
      comment: 'Origen del registro de asistencia'
    },
    checkInLocation: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'checkInLocation',
      comment: 'Check-in location description or coordinates (real column name in production)'
    },
    checkOutLocation: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'checkOutLocation',
      comment: 'Check-out location description or coordinates'
    },
    clock_in_location: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true,
      field: 'clock_in_location',
      // Spatial index for location-based queries
      spatialIndex: true,
      comment: 'GPS coordinates for check-in (PostGIS)'
    },
    clock_out_location: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true,
      field: 'clock_out_location',
      spatialIndex: true,
      comment: 'GPS coordinates for check-out (PostGIS)'
    },
    clock_in_ip: {
      type: DataTypes.INET,
      allowNull: true
    },
    clock_out_ip: {
      type: DataTypes.INET,
      allowNull: true
    },
    checkInMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'checkInMethod',
      index: true,
      comment: 'Method used for check-in (fingerprint, facial, manual, etc.)'
    },
    checkOutMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'checkOutMethod',
      index: true,
      comment: 'Method used for check-out'
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'status',
      index: true,
      comment: 'Attendance status: present, absent, late, etc.'
    },
    workingHours: {
      type: DataTypes.NUMERIC,
      allowNull: true,
      field: 'workingHours',
      comment: 'Calculated work hours (real column name in production)'
    },
    break_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Break time in minutes'
    },
    overtime_hours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    approved_by: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // High-concurrency optimizations
    is_processed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      index: true,
      comment: 'Flag to track if attendance has been processed for payroll'
    },
    batch_id: {
      type: DataTypes.UUID,
      allowNull: true,
      index: true,
      comment: 'Batch ID for bulk operations'
    },
    processing_queue: {
      type: DataTypes.INTEGER,
      allowNull: true,
      index: true,
      comment: 'Queue number for processing order'
    },
    // Denormalized fields for faster reporting
    date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date',
      index: true,
      comment: 'Date of attendance (real column name in production)'
    },
    work_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'work_date',
      // Computed from check_in date
      index: true,
      comment: 'Work date calculated from check_in'
    },
    department_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      index: true,
      comment: 'Denormalized department for faster reporting'
    },
    shift_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      index: true,
      comment: 'Associated shift'
    },
    // Performance tracking
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'createdAt'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updatedAt'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Optimistic locking version'
    },
    // ============================================================================
    // PP-7-IMPL-1: Campos de justificación de ausencias (FALLBACK sin módulo médico)
    // DATO ÚNICO: La justificación se guarda AQUÍ y liquidación LEE de AQUÍ
    // ============================================================================
    is_justified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_justified',
      index: true,
      comment: 'DATO ÚNICO: Si la ausencia/tardanza está justificada. Usado por liquidación.'
    },
    absence_type: {
      type: DataTypes.ENUM('medical', 'vacation', 'suspension', 'personal', 'bereavement', 'maternity', 'paternity', 'study', 'union', 'other'),
      allowNull: true,
      field: 'absence_type',
      comment: 'Tipo de ausencia: medical, vacation, suspension, personal, etc.'
    },
    absence_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'absence_reason',
      comment: 'Descripción/motivo de la ausencia. Requerido si absence_type = other'
    },
    justified_by: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'justified_by',
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'UUID del usuario (RRHH/admin) que justificó la ausencia'
    },
    justified_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'justified_at',
      comment: 'Timestamp de cuándo se justificó la ausencia'
    },
    medical_certificate_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'medical_certificate_id',
      references: {
        model: 'medical_certificates',
        key: 'id'
      },
      comment: 'FK al certificado médico (si justificación viene del módulo médico)'
    }
  }, {
    tableName: 'attendances',
    underscored: false,
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    version: 'version',
    
    // Database-level optimizations
    indexes: [
      // Primary composite index for most common queries
      {
        name: 'idx_attendance_user_date_primary',
        fields: ['UserId', 'work_date'],
        using: 'BTREE'
      },
      // Index for clock-in operations (most frequent)
      {
        name: 'idx_attendance_clock_in_fast',
        fields: ['checkInTime', 'UserId'],
        using: 'BTREE'
      },
      // Index for incomplete attendances
      {
        name: 'idx_attendance_incomplete',
        fields: ['UserId', 'checkInTime'],
        where: {
          checkOutTime: null
        },
        using: 'BTREE'
      },
      // Index for batch processing
      {
        name: 'idx_attendance_batch_processing',
        fields: ['batch_id', 'processing_queue'],
        where: {
          is_processed: false
        },
        using: 'BTREE'
      },
      // Spatial indexes for location-based queries
      {
        name: 'idx_attendance_clock_in_location',
        fields: ['clock_in_location'],
        using: 'GIST'
      },
      {
        name: 'idx_attendance_clock_out_location',
        fields: ['clock_out_location'],
        using: 'GIST'
      },
      // Reporting indexes
      {
        name: 'idx_attendance_reporting',
        fields: ['department_id', 'work_date', 'status'],
        using: 'BTREE'
      },
      // Branch-based reporting
      {
        name: 'idx_attendance_branch_reporting',
        fields: ['BranchId', 'work_date', 'is_processed'],
        using: 'BTREE'
      }
    ],
    
    // Hooks for optimizations
    hooks: {
      beforeCreate: (attendance, options) => {
        // Set work_date from check_in
        if (attendance.check_in) {
          attendance.work_date = attendance.check_in.toISOString().split('T')[0];
        }

        // Generate batch_id for high-concurrency scenarios
        if (!attendance.batch_id) {
          attendance.batch_id = require('crypto').randomUUID();
        }
      },

      beforeUpdate: (attendance, options) => {
        // Update work_hours when check_out is set
        if (attendance.check_out && attendance.check_in) {
          const diffMs = new Date(attendance.check_out) - new Date(attendance.check_in);
          attendance.work_hours = (diffMs / (1000 * 60 * 60)).toFixed(2);
        }
      },
      
      afterCreate: async (attendance, options) => {
        // Async processing for high-concurrency scenarios
        if (process.env.ENABLE_ASYNC_PROCESSING === 'true') {
          setImmediate(() => {
            processAttendanceAsync(attendance);
          });
        }
      }
    },
    
    // Custom scopes for optimized queries
    scopes: {
      incomplete: {
        where: {
          check_out: null
        }
      },
      today: {
        where: {
          work_date: new Date().toISOString().split('T')[0]
        }
      },
      byUser: (userId) => ({
        where: {
          user_id: userId
        }
      }),
      byDateRange: (startDate, endDate) => ({
        where: {
          work_date: {
            [sequelize.Sequelize.Op.between]: [startDate, endDate]
          }
        }
      }),
      forProcessing: {
        where: {
          is_processed: false
        },
        order: [['processing_queue', 'ASC'], ['createdAt', 'ASC']]
      },
      // High-performance scope for bulk operations
      bulkReadable: {
        attributes: ['id', 'user_id', 'employee_id', 'check_in', 'check_out', 'work_date', 'status'],
        raw: true
      }
    },
    
    // Model-level configuration
    paranoid: false, // Don't use soft deletes for performance
    freezeTableName: true,
    
    // Custom validation
    validate: {
      clockOutAfterClockIn() {
        if (this.check_out && this.check_in && this.check_out <= this.check_in) {
          throw new Error('Clock out time must be after clock in time');
        }
      }
    }
  });

  // Class methods for high-concurrency operations
  Attendance.bulkClockIn = async function(attendanceData) {
    const transaction = await sequelize.transaction({
      isolationLevel: sequelize.Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });

    try {
      const batchId = require('crypto').randomUUID();
      const processedData = attendanceData.map((data, index) => ({
        ...data,
        batch_id: batchId,
        processing_queue: index,
        work_date: data.check_in.toISOString().split('T')[0]
      }));

      const result = await Attendance.bulkCreate(processedData, {
        transaction,
        returning: ['id', 'user_id', 'check_in'],
        updateOnDuplicate: ['check_in', 'updatedAt']
      });

      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  Attendance.bulkClockOut = async function(clockOutData) {
    const transaction = await sequelize.transaction({
      isolationLevel: sequelize.Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });

    try {
      const promises = clockOutData.map(data =>
        Attendance.update({
          check_out: data.check_out,
          clock_out_location: data.clock_out_location,
          checkOutMethod: data.checkOutMethod,
          clock_out_ip: data.clock_out_ip
        }, {
          where: {
            user_id: data.user_id,
            work_date: data.work_date,
            check_out: null
          },
          transaction
        })
      );

      const results = await Promise.all(promises);
      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  // Instance methods
  Attendance.prototype.calculateWorkHours = function() {
    if (this.check_out && this.check_in) {
      const diffMs = new Date(this.check_out) - new Date(this.check_in);
      const hours = diffMs / (1000 * 60 * 60);
      this.work_hours = Math.max(0, hours - (this.break_time / 60));
      return this.work_hours;
    }
    return 0;
  };

  return Attendance;
};

// Async processing function for high-concurrency scenarios
async function processAttendanceAsync(attendance) {
  try {
    // Background processing logic
    // - Update related statistics
    // - Send notifications
    // - Update caches
    console.log(`Processing attendance ${attendance.id} asynchronously`);
  } catch (error) {
    console.error('Error in async attendance processing:', error);
  }
}