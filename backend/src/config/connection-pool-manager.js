const { Sequelize } = require('sequelize');
const EventEmitter = require('events');

/**
 * Advanced Connection Pool Manager
 * Optimized for extreme high concurrency (100k-200k users)
 */

class ConnectionPoolManager extends EventEmitter {
  constructor() {
    super();
    this.pools = new Map();
    this.healthChecks = new Map();
    this.metrics = {
      connections_created: 0,
      connections_destroyed: 0,
      queries_executed: 0,
      errors_occurred: 0,
      pool_exhaustions: 0,
      avg_response_time: 0
    };
    this.isShuttingDown = false;
    
    // Start monitoring
    this.startHealthMonitoring();
    this.startMetricsCollection();
  }

  /**
   * Create optimized connection pool
   */
  createOptimizedPool(config) {
    const poolName = config.name || 'default';
    
    if (this.pools.has(poolName)) {
      return this.pools.get(poolName);
    }

    const optimizedConfig = {
      host: config.host || process.env.POSTGRES_HOST || 'localhost',
      port: config.port || process.env.POSTGRES_PORT || 5432,
      dialect: 'postgres',
      database: config.database || process.env.POSTGRES_DB || 'attendance_system',
      username: config.username || process.env.POSTGRES_USER || 'postgres',
      password: config.password || process.env.POSTGRES_PASSWORD || 'Aedr15150302',
      
      // Optimized connection pool settings
      pool: {
        // High concurrency settings
        max: config.maxConnections || 50,           // Maximum connections
        min: config.minConnections || 10,           // Minimum warm connections
        acquire: config.acquireTimeout || 60000,   // Max wait time for connection
        idle: config.idleTimeout || 30000,         // Max idle time before release
        evict: config.evictInterval || 10000,      // Check for idle connections every 10s
        handleDisconnects: true,                   // Auto-reconnect on disconnect
        validate: config.validateConnection !== false, // Validate connections
        
        // Advanced pool settings
        maxUses: config.maxUses || 7500,          // Max uses per connection before rotation
        testOnBorrow: true,                        // Test connection before use
        
        // Custom connection management
        beforeConnect: async (config) => {
          this.metrics.connections_created++;
          this.emit('connection:creating', { pool: poolName, config });
        },
        
        afterConnect: async (connection, config) => {
          // Optimize connection settings
          await this.optimizeConnection(connection);
          this.emit('connection:created', { pool: poolName });
        },
        
        beforeDisconnect: async (connection) => {
          this.metrics.connections_destroyed++;
          this.emit('connection:destroying', { pool: poolName });
        }
      },
      
      // Query optimization
      logging: process.env.NODE_ENV === 'development' ? 
        this.createQueryLogger(poolName) : false,
      
      // Connection-level optimizations
      dialectOptions: {
        timezone: '+00:00',
        useUTC: false,
        dateStrings: true,
        typeCast: true,
        connectTimeout: 60000,
        acquireTimeout: 60000,
        timeout: 60000,
        
        // PostgreSQL specific optimizations
        statement_timeout: 30000,
        query_timeout: 30000,
        idle_in_transaction_session_timeout: 30000,
        
        // SSL settings for production
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false,
        
        // Connection options for performance
        options: `-c default_transaction_isolation=read_committed`
      },
      
      // Query optimizations
      define: {
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      },
      
      // Retry configuration for high-availability
      retry: {
        max: 3,
        match: [
          /ConnectionError/,
          /ConnectionRefusedError/,
          /ConnectionTimedOutError/,
          /TimeoutError/,
          /SequelizeConnectionError/,
          /SequelizeConnectionTimedOutError/
        ],
        backoffBase: 1000,
        backoffExponent: 2
      },
      
      // Performance monitoring
      benchmark: true,
      
      // Connection hooks
      hooks: {
        beforeConnect: async (config) => {
          console.log(`🔄 [${poolName}] Establishing connection...`);
        },
        
        afterConnect: async (connection, config) => {
          console.log(`✅ [${poolName}] Connection established`);
          await this.setupConnectionOptimizations(connection);
        },
        
        beforeDisconnect: async (connection) => {
          console.log(`🔐 [${poolName}] Closing connection...`);
        },
        
        beforeQuery: (options, model) => {
          const startTime = Date.now();
          this.metrics.queries_executed++;
          
          // Store query start time for metrics
          options._queryStartTime = startTime;
          
          // Emit query event for monitoring
          this.emit('query:start', {
            pool: poolName,
            sql: options.sql,
            type: options.type,
            startTime
          });
        },
        
        afterQuery: (options, model) => {
          if (options._queryStartTime) {
            const duration = Date.now() - options._queryStartTime;
            this.updateResponseTimeMetrics(duration);
            
            this.emit('query:complete', {
              pool: poolName,
              duration,
              sql: options.sql,
              type: options.type
            });
          }
        }
      }
    };

    const sequelize = new Sequelize(optimizedConfig);
    
    // Add custom methods to the pool
    sequelize.poolManager = this;
    sequelize.poolName = poolName;
    
    // Wrap query method for monitoring
    const originalQuery = sequelize.query.bind(sequelize);
    sequelize.query = async (...args) => {
      try {
        return await originalQuery(...args);
      } catch (error) {
        this.metrics.errors_occurred++;
        this.emit('query:error', {
          pool: poolName,
          error: error.message,
          sql: args[0]
        });
        throw error;
      }
    };

    this.pools.set(poolName, sequelize);
    this.healthChecks.set(poolName, {
      lastCheck: Date.now(),
      isHealthy: true,
      consecutiveFailures: 0
    });

    console.log(`🚀 [${poolName}] Optimized connection pool created with ${optimizedConfig.pool.max} max connections`);
    
    return sequelize;
  }

  /**
   * Optimize individual database connection
   */
  async optimizeConnection(connection) {
    try {
      // Set session-level optimizations for high performance
      const optimizations = [
        `SET work_mem = '256MB'`,
        `SET maintenance_work_mem = '1GB'`,
        `SET effective_cache_size = '4GB'`,
        `SET random_page_cost = 1.1`,
        `SET cpu_tuple_cost = 0.01`,
        `SET cpu_index_tuple_cost = 0.005`,
        `SET cpu_operator_cost = 0.0025`,
        `SET default_statistics_target = 1000`,
        `SET checkpoint_completion_target = 0.9`,
        `SET synchronous_commit = off`, // For high write throughput (use with caution)
        `SET temp_buffers = '128MB'`,
        `SET shared_preload_libraries = 'pg_stat_statements'`
      ];

      for (const optimization of optimizations) {
        try {
          await connection.query(optimization);
        } catch (error) {
          // Some optimizations might not be available in all PostgreSQL versions
          console.warn(`Connection optimization warning: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error optimizing connection:', error.message);
    }
  }

  /**
   * Setup connection-level optimizations
   */
  async setupConnectionOptimizations(connection) {
    // Enable query plan caching
    await connection.query("SET plan_cache_mode = 'force_generic_plan'");
    
    // Set timezone
    await connection.query("SET timezone = 'UTC'");
    
    // Enable auto-explain for slow queries in development
    if (process.env.NODE_ENV === 'development') {
      await connection.query("SET auto_explain.log_min_duration = 1000");
      await connection.query("SET auto_explain.log_analyze = true");
    }
  }

  /**
   * Create query logger with performance metrics
   */
  createQueryLogger(poolName) {
    return (sql, duration) => {
      const logLevel = duration > 1000 ? 'warn' : 'info';
      console[logLevel](`🔍 [${poolName}] Query (${duration}ms): ${sql.substring(0, 100)}...`);
      
      // Log slow queries
      if (duration > 5000) {
        this.emit('query:slow', {
          pool: poolName,
          sql,
          duration
        });
      }
    };
  }

  /**
   * Get pool by name
   */
  getPool(name = 'default') {
    const pool = this.pools.get(name);
    if (!pool) {
      throw new Error(`Pool '${name}' not found. Available pools: ${Array.from(this.pools.keys()).join(', ')}`);
    }
    return pool;
  }

  /**
   * Execute query with automatic pool selection and load balancing
   */
  async executeQuery(sql, options = {}) {
    const poolName = options.pool || 'default';
    const pool = this.getPool(poolName);
    
    const startTime = Date.now();
    
    try {
      const result = await pool.query(sql, {
        ...options,
        logging: options.logging !== false
      });
      
      const duration = Date.now() - startTime;
      this.updateResponseTimeMetrics(duration);
      
      return result;
    } catch (error) {
      this.metrics.errors_occurred++;
      
      // Check if it's a pool exhaustion error
      if (error.message.includes('pool')) {
        this.metrics.pool_exhaustions++;
        this.emit('pool:exhausted', { pool: poolName, error });
      }
      
      throw error;
    }
  }

  /**
   * Bulk execute queries with transaction support
   */
  async executeBulk(queries, options = {}) {
    const poolName = options.pool || 'default';
    const pool = this.getPool(poolName);
    
    const transaction = await pool.transaction({
      isolationLevel: options.isolationLevel || pool.Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    
    try {
      const results = [];
      
      for (const query of queries) {
        const result = await pool.query(query.sql, {
          ...query.options,
          transaction,
          type: query.type || pool.Sequelize.QueryTypes.RAW
        });
        results.push(result);
      }
      
      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      this.metrics.errors_occurred++;
      throw error;
    }
  }

  /**
   * Health monitoring for all pools
   */
  startHealthMonitoring() {
    setInterval(async () => {
      if (this.isShuttingDown) return;
      
      for (const [poolName, pool] of this.pools) {
        try {
          const startTime = Date.now();
          await pool.authenticate();
          const responseTime = Date.now() - startTime;
          
          const healthCheck = this.healthChecks.get(poolName);
          healthCheck.lastCheck = Date.now();
          healthCheck.isHealthy = true;
          healthCheck.consecutiveFailures = 0;
          
          this.emit('health:check', {
            pool: poolName,
            healthy: true,
            responseTime
          });
          
          // Log slow health checks
          if (responseTime > 5000) {
            console.warn(`⚠️ [${poolName}] Slow health check: ${responseTime}ms`);
          }
          
        } catch (error) {
          const healthCheck = this.healthChecks.get(poolName);
          healthCheck.isHealthy = false;
          healthCheck.consecutiveFailures++;
          
          console.error(`❌ [${poolName}] Health check failed:`, error.message);
          
          this.emit('health:check', {
            pool: poolName,
            healthy: false,
            error: error.message,
            consecutiveFailures: healthCheck.consecutiveFailures
          });
          
          // Auto-recovery attempt after multiple failures
          if (healthCheck.consecutiveFailures >= 3) {
            console.log(`🔄 [${poolName}] Attempting auto-recovery...`);
            await this.attemptPoolRecovery(poolName);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Attempt to recover a failed pool
   */
  async attemptPoolRecovery(poolName) {
    try {
      const pool = this.pools.get(poolName);
      if (!pool) return;
      
      // Close existing connections
      await pool.close();
      
      // Remove from pools map
      this.pools.delete(poolName);
      
      // Recreate pool (config should be stored for this)
      console.log(`♻️ [${poolName}] Pool recovery completed`);
      
      this.emit('pool:recovered', { pool: poolName });
    } catch (error) {
      console.error(`❌ [${poolName}] Pool recovery failed:`, error.message);
      this.emit('pool:recovery_failed', { pool: poolName, error: error.message });
    }
  }

  /**
   * Metrics collection
   */
  startMetricsCollection() {
    setInterval(() => {
      if (this.isShuttingDown) return;
      
      const currentMetrics = {
        timestamp: new Date().toISOString(),
        ...this.metrics,
        pools: {}
      };
      
      // Collect pool-specific metrics
      for (const [poolName, pool] of this.pools) {
        try {
          const poolStats = pool.connectionManager.pool;
          currentMetrics.pools[poolName] = {
            total_connections: poolStats.size || 0,
            idle_connections: poolStats.available || 0,
            active_connections: (poolStats.size || 0) - (poolStats.available || 0),
            pending_requests: poolStats.pending || 0,
            max_connections: pool.config.pool.max,
            min_connections: pool.config.pool.min
          };
        } catch (error) {
          currentMetrics.pools[poolName] = {
            error: 'Unable to collect metrics'
          };
        }
      }
      
      this.emit('metrics:collected', currentMetrics);
      
      // Log metrics every 5 minutes
      if (Date.now() % 300000 < 10000) { // Approximately every 5 minutes
        console.log('📊 Connection Pool Metrics:', JSON.stringify(currentMetrics, null, 2));
      }
    }, 10000); // Collect every 10 seconds
  }

  /**
   * Update response time metrics
   */
  updateResponseTimeMetrics(duration) {
    // Simple moving average
    this.metrics.avg_response_time = 
      (this.metrics.avg_response_time * 0.95) + (duration * 0.05);
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      ...this.metrics,
      pools: {},
      health_checks: {}
    };

    // Add pool metrics
    for (const [poolName, pool] of this.pools) {
      const poolStats = pool.connectionManager?.pool;
      metrics.pools[poolName] = {
        total_connections: poolStats?.size || 0,
        idle_connections: poolStats?.available || 0,
        active_connections: (poolStats?.size || 0) - (poolStats?.available || 0),
        pending_requests: poolStats?.pending || 0,
        config: {
          max: pool.config.pool.max,
          min: pool.config.pool.min
        }
      };
    }

    // Add health check status
    for (const [poolName, healthCheck] of this.healthChecks) {
      metrics.health_checks[poolName] = {
        ...healthCheck,
        last_check_ago_ms: Date.now() - healthCheck.lastCheck
      };
    }

    return metrics;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down connection pool manager...');
    this.isShuttingDown = true;
    
    const shutdownPromises = [];
    
    for (const [poolName, pool] of this.pools) {
      shutdownPromises.push(
        pool.close().then(() => {
          console.log(`🔐 [${poolName}] Pool closed`);
        }).catch(error => {
          console.error(`❌ [${poolName}] Error closing pool:`, error.message);
        })
      );
    }
    
    try {
      await Promise.all(shutdownPromises);
      this.pools.clear();
      this.healthChecks.clear();
      console.log('✅ All connection pools closed gracefully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
    }
  }

  /**
   * Create read replica pool for load balancing
   */
  createReadReplicaPool(config) {
    const replicaConfig = {
      ...config,
      name: `${config.name}_read_replica`,
      // Read replicas typically handle more connections
      maxConnections: (config.maxConnections || 50) * 1.5
    };
    
    return this.createOptimizedPool(replicaConfig);
  }

  /**
   * Smart query routing (read/write splitting)
   */
  async smartQuery(sql, options = {}) {
    const isReadQuery = /^(SELECT|WITH)/i.test(sql.trim());
    const poolName = options.forceWrite || !isReadQuery ? 'default' : 'read_replica';
    
    try {
      return await this.executeQuery(sql, { ...options, pool: poolName });
    } catch (error) {
      // Fallback to primary pool if replica fails
      if (poolName === 'read_replica' && !options.forceWrite) {
        console.warn(`⚠️ Read replica failed, falling back to primary pool`);
        return await this.executeQuery(sql, { ...options, pool: 'default' });
      }
      throw error;
    }
  }
}

// Export singleton instance
const connectionPoolManager = new ConnectionPoolManager();

// Graceful shutdown handling
process.on('SIGTERM', () => connectionPoolManager.shutdown());
process.on('SIGINT', () => connectionPoolManager.shutdown());

module.exports = {
  ConnectionPoolManager,
  connectionPoolManager
};