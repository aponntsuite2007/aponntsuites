const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AttendanceBatch = sequelize.define('AttendanceBatch', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    batch_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      defaultValue: DataTypes.UUIDV4,
      index: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      index: true
    },
    operation_type: {
      type: DataTypes.ENUM('clock_in', 'clock_out', 'break_start', 'break_end', 'overtime_start', 'overtime_end'),
      allowNull: false,
      index: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      index: true
    },
    location: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true,
      spatialIndex: true
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true
    },
    device_info: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Device and client information'
    },
    method: {
      type: DataTypes.ENUM('fingerprint', 'facial', 'manual', 'gps', 'app', 'web', 'nfc', 'qr'),
      allowNull: false,
      defaultValue: 'manual',
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
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'duplicate'),
      allowNull: false,
      defaultValue: 'pending',
      index: true
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      index: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attendance_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'attendances',
        key: 'id'
      },
      index: true,
      comment: 'Reference to created/updated attendance record'
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      index: true,
      comment: '1=highest, 10=lowest priority for processing'
    },
    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    max_retries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3
    },
    // Denormalized fields for faster queries
    employee_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      index: true,
      comment: 'Denormalized employee ID for faster lookups'
    },
    work_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      index: true,
      comment: 'Work date extracted from timestamp'
    },
    // Metadata for analysis
    processing_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Time taken to process in milliseconds'
    },
    queue_wait_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Time spent in queue before processing'
    },
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
    tableName: 'attendance_batches',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    
    indexes: [
      // Primary processing index
      {
        name: 'idx_batch_processing_queue',
        fields: ['status', 'priority', 'created_at'],
        where: {
          status: 'pending'
        },
        using: 'BTREE'
      },
      // User-based queries
      {
        name: 'idx_batch_user_date',
        fields: ['user_id', 'work_date', 'operation_type'],
        using: 'BTREE'
      },
      // Duplicate detection
      {
        name: 'idx_batch_duplicate_check',
        fields: ['employee_id', 'operation_type', 'timestamp'],
        using: 'BTREE'
      },
      // Performance monitoring
      {
        name: 'idx_batch_performance',
        fields: ['processed_at', 'processing_time_ms'],
        where: {
          status: 'completed'
        },
        using: 'BTREE'
      },
      // Cleanup queries
      {
        name: 'idx_batch_cleanup',
        fields: ['status', 'created_at'],
        using: 'BTREE'
      },
      // Spatial index for location-based queries
      {
        name: 'idx_batch_location',
        fields: ['location'],
        using: 'GIST'
      }
    ],
    
    hooks: {
      beforeCreate: (batch, options) => {
        // Set work_date from timestamp
        if (batch.timestamp) {
          batch.work_date = batch.timestamp.toISOString().split('T')[0];
        }
        
        // Generate batch_id if not provided
        if (!batch.batch_id) {
          batch.batch_id = require('crypto').randomUUID();
        }
      },
      
      beforeUpdate: (batch, options) => {
        // Set processed_at when status changes to completed or failed
        if (batch.changed('status') && ['completed', 'failed'].includes(batch.status)) {
          batch.processed_at = new Date();
          
          // Calculate processing time
          if (batch.created_at) {
            batch.processing_time_ms = Date.now() - new Date(batch.created_at).getTime();
          }
        }
      }
    },
    
    scopes: {
      pending: {
        where: {
          status: 'pending'
        },
        order: [['priority', 'ASC'], ['created_at', 'ASC']]
      },
      
      failed: {
        where: {
          status: 'failed',
          retry_count: {
            [sequelize.Sequelize.Op.lt]: sequelize.col('max_retries')
          }
        }
      },
      
      forProcessing: {
        where: {
          status: ['pending', 'failed'],
          retry_count: {
            [sequelize.Sequelize.Op.lt]: sequelize.col('max_retries')
          }
        },
        order: [
          ['priority', 'ASC'],
          ['retry_count', 'ASC'],
          ['created_at', 'ASC']
        ]
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
      
      recentActivity: {
        where: {
          created_at: {
            [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }
    }
  });

  // Class methods for batch processing
  AttendanceBatch.processQueue = async function(limit = 100) {
    const transaction = await sequelize.transaction({
      isolationLevel: sequelize.Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    
    try {
      // Get pending batches
      const batches = await AttendanceBatch.scope('forProcessing').findAll({
        limit,
        lock: true,
        transaction
      });
      
      if (batches.length === 0) {
        await transaction.commit();
        return { processed: 0, errors: 0 };
      }
      
      // Mark as processing
      const batchIds = batches.map(b => b.id);
      await AttendanceBatch.update(
        { status: 'processing' },
        { 
          where: { id: batchIds },
          transaction 
        }
      );
      
      await transaction.commit();
      
      // Process each batch (outside transaction for better concurrency)
      const results = {
        processed: 0,
        errors: 0,
        details: []
      };
      
      for (const batch of batches) {
        try {
          const result = await AttendanceBatch.processSingle(batch);
          if (result.success) {
            results.processed++;
          } else {
            results.errors++;
          }
          results.details.push(result);
        } catch (error) {
          results.errors++;
          results.details.push({
            batch_id: batch.batch_id,
            success: false,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  AttendanceBatch.processSingle = async function(batch) {
    const startTime = Date.now();
    const Attendance = require('./Attendance-postgresql')(sequelize);
    
    try {
      let attendanceRecord = null;
      
      if (batch.operation_type === 'clock_in') {
        // Check for existing clock-in today
        const existing = await Attendance.findOne({
          where: {
            user_id: batch.user_id,
            work_date: batch.work_date,
            clock_out: null
          }
        });
        
        if (existing) {
          await batch.update({
            status: 'duplicate',
            error_message: 'User already clocked in today',
            processing_time_ms: Date.now() - startTime
          });
          return { 
            success: false, 
            batch_id: batch.batch_id, 
            error: 'Duplicate clock-in' 
          };
        }
        
        // Create new attendance record
        attendanceRecord = await Attendance.create({
          user_id: batch.user_id,
          employee_id: batch.employee_id,
          branch_id: batch.branch_id,
          clock_in: batch.timestamp,
          clock_in_location: batch.location,
          clock_in_ip: batch.ip_address,
          clock_in_method: batch.method,
          work_date: batch.work_date,
          status: 'present'
        });
        
      } else if (batch.operation_type === 'clock_out') {
        // Find existing attendance for clock-out
        attendanceRecord = await Attendance.findOne({
          where: {
            user_id: batch.user_id,
            work_date: batch.work_date,
            clock_out: null
          }
        });
        
        if (!attendanceRecord) {
          await batch.update({
            status: 'failed',
            error_message: 'No active clock-in found for clock-out',
            processing_time_ms: Date.now() - startTime
          });
          return { 
            success: false, 
            batch_id: batch.batch_id, 
            error: 'No active clock-in' 
          };
        }
        
        // Update attendance record
        await attendanceRecord.update({
          clock_out: batch.timestamp,
          clock_out_location: batch.location,
          clock_out_ip: batch.ip_address,
          clock_out_method: batch.method
        });
      }
      
      // Mark batch as completed
      await batch.update({
        status: 'completed',
        attendance_id: attendanceRecord ? attendanceRecord.id : null,
        processing_time_ms: Date.now() - startTime
      });
      
      return { 
        success: true, 
        batch_id: batch.batch_id, 
        attendance_id: attendanceRecord?.id 
      };
      
    } catch (error) {
      // Mark as failed and increment retry count
      await batch.update({
        status: batch.retry_count >= batch.max_retries - 1 ? 'failed' : 'pending',
        retry_count: batch.retry_count + 1,
        error_message: error.message,
        processing_time_ms: Date.now() - startTime
      });
      
      return { 
        success: false, 
        batch_id: batch.batch_id, 
        error: error.message 
      };
    }
  };

  AttendanceBatch.getProcessingStats = async function() {
    return await AttendanceBatch.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_batches'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'pending' THEN 1 END")), 'pending'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'processing' THEN 1 END")), 'processing'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'completed' THEN 1 END")), 'completed'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'failed' THEN 1 END")), 'failed'],
        [sequelize.fn('AVG', sequelize.col('processing_time_ms')), 'avg_processing_time'],
        [sequelize.fn('MAX', sequelize.col('processing_time_ms')), 'max_processing_time']
      ],
      where: {
        created_at: {
          [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      raw: true
    });
  };

  AttendanceBatch.cleanupOldBatches = async function(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const deleted = await AttendanceBatch.destroy({
      where: {
        status: ['completed', 'failed'],
        created_at: {
          [sequelize.Sequelize.Op.lt]: cutoffDate
        }
      }
    });
    
    return { deleted_count: deleted };
  };

  return AttendanceBatch;
};