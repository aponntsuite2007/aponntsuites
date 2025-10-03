const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attendance = sequelize.define('Attendance', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      // Index for fast user lookups
      index: true
    },
    employee_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      // Denormalized field for faster queries
      index: true
    },
    branch_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id'
      },
      index: true
    },
    clock_in: {
      type: DataTypes.DATE,
      allowNull: false,
      // Partitioning key for time-based partitioning
      index: true
    },
    clock_out: {
      type: DataTypes.DATE,
      allowNull: true,
      index: true
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
    clock_in_location: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true,
      // Spatial index for location-based queries
      spatialIndex: true
    },
    clock_out_location: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true,
      spatialIndex: true
    },
    clock_in_ip: {
      type: DataTypes.INET,
      allowNull: true
    },
    clock_out_ip: {
      type: DataTypes.INET,
      allowNull: true
    },
    clock_in_method: {
      type: DataTypes.ENUM('fingerprint', 'facial', 'manual', 'gps', 'app', 'web'),
      allowNull: false,
      defaultValue: 'manual',
      index: true
    },
    clock_out_method: {
      type: DataTypes.ENUM('fingerprint', 'facial', 'manual', 'gps', 'app', 'web'),
      allowNull: true,
      index: true
    },
    status: {
      type: DataTypes.ENUM('present', 'absent', 'late', 'early_departure', 'overtime'),
      allowNull: false,
      defaultValue: 'present',
      index: true
    },
    work_hours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      // Computed field for reporting
      comment: 'Calculated work hours'
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
    work_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      // Computed from clock_in date
      index: true
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
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Optimistic locking version'
    }
  }, {
    tableName: 'attendances',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    version: 'version',
    
    // Database-level optimizations
    indexes: [
      // Primary composite index for most common queries
      {
        name: 'idx_attendance_user_date_primary',
        fields: ['user_id', 'work_date'],
        using: 'BTREE'
      },
      // Index for clock-in operations (most frequent)
      {
        name: 'idx_attendance_clock_in_fast',
        fields: ['clock_in', 'user_id'],
        using: 'BTREE'
      },
      // Index for incomplete attendances
      {
        name: 'idx_attendance_incomplete',
        fields: ['user_id', 'clock_in'],
        where: {
          clock_out: null
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
        fields: ['branch_id', 'work_date', 'is_processed'],
        using: 'BTREE'
      }
    ],
    
    // Hooks for optimizations
    hooks: {
      beforeCreate: (attendance, options) => {
        // Set work_date from clock_in
        if (attendance.clock_in) {
          attendance.work_date = attendance.clock_in.toISOString().split('T')[0];
        }
        
        // Generate batch_id for high-concurrency scenarios
        if (!attendance.batch_id) {
          attendance.batch_id = require('crypto').randomUUID();
        }
      },
      
      beforeUpdate: (attendance, options) => {
        // Update work_hours when clock_out is set
        if (attendance.clock_out && attendance.clock_in) {
          const diffMs = new Date(attendance.clock_out) - new Date(attendance.clock_in);
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
          clock_out: null
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
        order: [['processing_queue', 'ASC'], ['created_at', 'ASC']]
      },
      // High-performance scope for bulk operations
      bulkReadable: {
        attributes: ['id', 'user_id', 'employee_id', 'clock_in', 'clock_out', 'work_date', 'status'],
        raw: true
      }
    },
    
    // Model-level configuration
    paranoid: false, // Don't use soft deletes for performance
    freezeTableName: true,
    
    // Custom validation
    validate: {
      clockOutAfterClockIn() {
        if (this.clock_out && this.clock_in && this.clock_out <= this.clock_in) {
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
        work_date: data.clock_in.toISOString().split('T')[0]
      }));
      
      const result = await Attendance.bulkCreate(processedData, {
        transaction,
        returning: ['id', 'user_id', 'clock_in'],
        updateOnDuplicate: ['clock_in', 'updated_at']
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
          clock_out: data.clock_out,
          clock_out_location: data.clock_out_location,
          clock_out_method: data.clock_out_method,
          clock_out_ip: data.clock_out_ip
        }, {
          where: {
            user_id: data.user_id,
            work_date: data.work_date,
            clock_out: null
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
    if (this.clock_out && this.clock_in) {
      const diffMs = new Date(this.clock_out) - new Date(this.clock_in);
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