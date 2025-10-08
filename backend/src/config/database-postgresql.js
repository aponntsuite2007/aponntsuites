const { Sequelize } = require('sequelize');

/**
 * PostgreSQL Database Configuration
 * Optimized for high concurrency (100k-200k concurrent users)
 */

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || process.env.DB_NAME || 'attendance_system',
  process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'Aedr15150302',
  {
    host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    timezone: '+00:00',
    
    // Optimized connection pool for high concurrency
    pool: {
      max: 50,        // Maximum connections (increased for high load)
      min: 10,        // Minimum connections (keep warm connections)
      acquire: 60000, // Maximum time to wait for connection
      idle: 30000,    // Maximum time connection can be idle
      evict: 10000    // Check for idle connections every 10s
    },
    
    // PostgreSQL specific optimizations
    dialectOptions: {
      timezone: '+00:00',
      useUTC: false,
      dateStrings: true,
      typeCast: true,
      connectTimeout: 60000,
      acquireTimeout: 60000,
      timeout: 60000,
      // Enable prepared statements for better performance
      statement_timeout: 30000,
      query_timeout: 30000
    },
    
    // Query optimizations
    define: {
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      // Use BIGINT for IDs to handle large datasets
      defaultScope: {
        raw: false
      }
    },
    
    // Benchmarking and monitoring
    benchmark: process.env.NODE_ENV === 'development',
    
    // Query retry configuration
    retry: {
      max: 3,
      match: [
        /ConnectionError/,
        /ConnectionRefusedError/,
        /ConnectionTimedOutError/,
        /TimeoutError/
      ]
    },
    
    // Additional PostgreSQL optimizations
    logQueryParameters: process.env.NODE_ENV === 'development',
    transactionType: 'IMMEDIATE',
    isolationLevel: 'READ_COMMITTED',
    
    // Custom hooks for optimization
    hooks: {
      beforeConnect: async (config) => {
        console.log('🔄 Connecting to PostgreSQL with optimized settings...');
      }
      // afterConnect hook disabled to prevent connection errors
      // afterConnect: async (connection, config) => {
      //   // Set session-level optimizations
      //   await connection.query(`
      //     SET work_mem = '256MB';
      //     SET maintenance_work_mem = '1GB';
      //     SET effective_cache_size = '4GB';
      //     SET random_page_cost = 1.1;
      //     SET cpu_tuple_cost = 0.01;
      //     SET cpu_index_tuple_cost = 0.005;
      //     SET cpu_operator_cost = 0.0025;
      //     SET default_statistics_target = 1000;
      //     SET checkpoint_completion_target = 0.9;
      //     SET wal_buffers = '64MB';
      //     SET shared_preload_libraries = 'pg_stat_statements';
      //   `);
      //   console.log('✅ PostgreSQL session optimized for high concurrency');
      // }
    }
  }
);

console.log('🚀 PostgreSQL Configuration - Optimized for High Concurrency (100k-200k users)');

// Import optimized PostgreSQL models
const User = require('../models/User-postgresql')(sequelize);
const Attendance = require('../models/Attendance-postgresql')(sequelize);
const Shift = require('../models/Shift-postgresql')(sequelize);
const Branch = require('../models/Branch-postgresql')(sequelize);
const Department = require('../models/Department-postgresql')(sequelize);
// const BiometricData = require('../models/BiometricData-postgresql')(sequelize);  // Not needed
// const FacialBiometricData = require('../models/FacialBiometricData-postgresql')(sequelize);  // Not needed
// const EmployeeLocation = require('../models/EmployeeLocation-postgresql')(sequelize);  // Not needed
const AttendanceBatch = require('../models/AttendanceBatch-postgresql')(sequelize);

// Define optimized associations
User.hasMany(Attendance, { 
  foreignKey: 'user_id',
  as: 'attendances'
});
Attendance.belongsTo(User, { 
  foreignKey: 'user_id',
  as: 'user'
});

User.belongsToMany(Shift, { 
  through: 'user_shifts',
  foreignKey: 'user_id',
  otherKey: 'shift_id',
  as: 'shifts'
});

Shift.belongsToMany(User, { 
  through: 'user_shifts',
  foreignKey: 'shift_id',
  otherKey: 'user_id',
  as: 'users'
});

User.belongsTo(Branch, { 
  as: 'defaultBranch',
  foreignKey: 'default_branch_id'
});

User.belongsToMany(Branch, {
  through: 'user_branches',
  as: 'authorizedBranches',
  foreignKey: 'user_id',
  otherKey: 'branch_id'
});

// User.hasMany(BiometricData, {
//   foreignKey: 'user_id',
//   as: 'biometricData'
// });

// BiometricData.belongsTo(User, {
//   foreignKey: 'user_id',
//   as: 'user'
// });

Attendance.belongsTo(Branch, {
  foreignKey: 'branch_id',
  as: 'branch'
});

Branch.hasMany(Attendance, {
  foreignKey: 'branch_id',
  as: 'attendances'
});

Department.hasMany(User, { 
  foreignKey: 'department_id',
  as: 'employees'
});

User.belongsTo(Department, { 
  foreignKey: 'department_id',
  as: 'department'
});

// Facial biometric associations
// User.hasMany(FacialBiometricData, {
//   foreignKey: 'user_id',
//   as: 'facialBiometrics'
// });

// FacialBiometricData.belongsTo(User, {
//   foreignKey: 'user_id',
//   as: 'user'
// });

// Employee location associations
// User.hasMany(EmployeeLocation, {
//   foreignKey: 'user_id',
//   as: 'locations'
// });

// EmployeeLocation.belongsTo(User, {
//   foreignKey: 'user_id',
//   as: 'employee'
// });

// Batch attendance for high-volume operations
User.hasMany(AttendanceBatch, {
  foreignKey: 'user_id',
  as: 'attendanceBatches'
});

AttendanceBatch.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

module.exports = {
  sequelize,
  User,
  Attendance,
  Shift,
  Branch,
  Department,
  // BiometricData,
  // FacialBiometricData,
  // EmployeeLocation,
  AttendanceBatch,
  
  connect: async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ PostgreSQL Connection established (High Concurrency Mode)');
      
      // Test connection performance
      const start = Date.now();
      await sequelize.query('SELECT 1 as test');
      const latency = Date.now() - start;
      console.log(`📊 Database latency: ${latency}ms`);
      
      return true;
    } catch (error) {
      console.error('❌ Error connecting to PostgreSQL:', error);
      throw error;
    }
  },
  
  sync: async (options = {}) => {
    try {
      const syncOptions = {
        force: false,
        alter: false,
        ...options
      };
      
      await sequelize.sync(syncOptions);
      console.log('🎯 PostgreSQL Database synchronized (High Performance Mode)');
      
      // Create performance-critical indexes
      await createOptimizedIndexes();
      
      return true;
    } catch (error) {
      console.error('❌ Error synchronizing PostgreSQL:', error);
      throw error;
    }
  },
  
  close: async () => {
    try {
      await sequelize.close();
      console.log('🔐 PostgreSQL connection closed');
      return true;
    } catch (error) {
      console.error('Error closing PostgreSQL connection:', error);
      throw error;
    }
  },
  
  isConnected: async () => {
    try {
      await sequelize.authenticate();
      return true;
    } catch {
      return false;
    }
  },
  
  // Bulk operations for high concurrency
  bulkAttendance: async (attendanceRecords) => {
    try {
      const result = await Attendance.bulkCreate(attendanceRecords, {
        updateOnDuplicate: ['clock_out', 'updated_at'],
        returning: true
      });
      return result;
    } catch (error) {
      console.error('Error in bulk attendance:', error);
      throw error;
    }
  },
  
  // Optimized queries for reporting
  getAttendanceStats: async (dateRange) => {
    return await sequelize.query(`
      SELECT 
        DATE(clock_in) as date,
        COUNT(*) as total_entries,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(EXTRACT(EPOCH FROM (clock_out - clock_in))) as avg_duration
      FROM attendances 
      WHERE clock_in BETWEEN :start_date AND :end_date
      GROUP BY DATE(clock_in)
      ORDER BY date;
    `, {
      replacements: {
        start_date: dateRange.start,
        end_date: dateRange.end
      },
      type: Sequelize.QueryTypes.SELECT
    });
  }
};

// Create optimized indexes for high concurrency scenarios
async function createOptimizedIndexes() {
  const queries = [
    // Attendance table indexes (most critical for check-in/check-out)
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_user_date 
     ON attendances (user_id, DATE(clock_in))`,
    
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_clock_in 
     ON attendances (clock_in) WHERE clock_in IS NOT NULL`,
     
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_branch_date 
     ON attendances (branch_id, DATE(clock_in))`,
     
    // User table indexes
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_employee_id 
     ON users (employee_id) WHERE employee_id IS NOT NULL`,
     
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active 
     ON users (is_active) WHERE is_active = true`,
     
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_department 
     ON users (department_id) WHERE department_id IS NOT NULL`,
     
    // Biometric data indexes
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_biometric_user_type 
     ON biometric_data (user_id, type)`,
     
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_facial_biometric_user 
     ON facial_biometric_data (user_id)`,
     
    // Location-based indexes
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_locations_user_time 
     ON employee_locations (user_id, recorded_at)`,
     
    // Composite indexes for complex queries
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_complex 
     ON attendances (user_id, branch_id, clock_in, clock_out)`,
     
    // Partial indexes for better performance
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_incomplete 
     ON attendances (user_id, clock_in) WHERE clock_out IS NULL`
  ];
  
  for (const query of queries) {
    try {
      await sequelize.query(query);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.warn(`Index creation warning: ${error.message}`);
      }
    }
  }
  
  console.log('📊 Optimized indexes created for high concurrency');
}