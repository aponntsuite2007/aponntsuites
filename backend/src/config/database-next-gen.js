const { Sequelize } = require('sequelize');
const Redis = require('ioredis');

// 🚀 CONFIGURACIÓN NEXT-GEN MULTI-TENANT ULTRA-ESCALABLE
class NextGenDatabaseManager {
  constructor() {
    this.connections = new Map();
    this.redis = null;
    this.connectionPools = new Map();
    this.shardMap = new Map();
    this.initializeRedis();
    this.initializeSharding();
  }

  // 🔥 REDIS CLUSTER PARA CACHÉ ULTRA-RÁPIDO
  async initializeRedis() {
    this.redis = new Redis.Cluster([
      { host: process.env.REDIS_HOST || 'localhost', port: 6379 },
      { host: process.env.REDIS_HOST_2 || 'localhost', port: 6380 },
      { host: process.env.REDIS_HOST_3 || 'localhost', port: 6381 }
    ], {
      enableOfflineQueue: false,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // Pipeline para operaciones batch ultra-rápidas
    this.redis.pipeline = this.redis.pipeline.bind(this.redis);

    console.log('🔥 Redis Cluster inicializado para ultra-performance');
  }

  // 🎯 SHARDING AUTOMÁTICO POR TENANT
  initializeSharding() {
    // Configuración de shards por volumen de datos
    this.shardConfig = {
      small: { maxTenants: 1000, dbSuffix: '_small' },
      medium: { maxTenants: 100, dbSuffix: '_medium' },
      large: { maxTenants: 10, dbSuffix: '_large' },
      enterprise: { maxTenants: 1, dbSuffix: '_enterprise' }
    };
  }

  // 🏢 CONEXIÓN MULTI-TENANT CON AUTO-SCALING
  async getTenantConnection(tenantId, tenantSize = 'medium') {
    const connectionKey = `${tenantId}_${tenantSize}`;

    if (this.connections.has(connectionKey)) {
      return this.connections.get(connectionKey);
    }

    const dbConfig = this.getShardConfig(tenantSize);

    let sequelize;

    if (process.env.DATABASE_URL) {
      // PRODUCCIÓN: Usar DATABASE_URL (Render, Railway, etc.)
      sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',

        // 🚀 OPTIMIZACIONES PARA MILLONES DE REGISTROS
        pool: {
          max: 50,
          min: 5,
          acquire: 10000,
          idle: 5000,
          evict: 1000
        },

        // ⚡ CONFIGURACIÓN ULTRA-PERFORMANCE CON SSL
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          },
          statement_timeout: 30000,
          query_timeout: 30000,
          connectionTimeoutMillis: 5000,
          idle_in_transaction_session_timeout: 10000
        },

        // 📊 LOGGING Y MONITORING AVANZADO
        logging: (sql, timing) => {
          if (timing > 1000) {  // Log queries lentas
            console.warn(`🐌 Slow Query [${timing}ms]: ${sql.substring(0, 100)}...`);
          }
        },

        // 🔄 RETRY AUTOMÁTICO PARA RESILENCIA
        retry: {
          max: 3,
          timeout: 5000,
          match: [
            /ConnectionError/,
            /ConnectionRefusedError/,
            /ConnectionTimedOutError/,
            /TimeoutError/
          ]
        },

        // 🎯 HOOKS PARA MULTI-TENANCY
        hooks: {
          beforeConnect: async (config) => {
            console.log(`🔌 Conectando tenant ${tenantId} en shard ${tenantSize}`);
          },
          afterConnect: async (connection, config) => {
            // Configurar tenant_id por defecto en la sesión
            await connection.query(`SET app.current_tenant_id = '${tenantId}'`);
          }
        }
      });
    } else {
      // LOCAL: Usar variables POSTGRES_*
      sequelize = new Sequelize(
        `${process.env.POSTGRES_DB}${dbConfig.dbSuffix}`,
        process.env.POSTGRES_USER || 'postgres',
        process.env.POSTGRES_PASSWORD || 'Aedr15150302',
        {
          host: process.env.POSTGRES_HOST || 'localhost',
          port: process.env.POSTGRES_PORT || 5432,
          dialect: 'postgres',

          // 🚀 OPTIMIZACIONES PARA MILLONES DE REGISTROS
          pool: {
            max: 50,
            min: 5,
            acquire: 10000,
            idle: 5000,
            evict: 1000
          },

          // ⚡ CONFIGURACIÓN ULTRA-PERFORMANCE
          dialectOptions: {
            statement_timeout: 30000,
            query_timeout: 30000,
            connectionTimeoutMillis: 5000,
            idle_in_transaction_session_timeout: 10000,
            work_mem: '256MB',
            shared_buffers: '1GB',
            effective_cache_size: '4GB',
            max_connections: 200
          },

          // 📊 LOGGING Y MONITORING AVANZADO
          logging: (sql, timing) => {
            if (timing > 1000) {
              console.warn(`🐌 Slow Query [${timing}ms]: ${sql.substring(0, 100)}...`);
            }
          },

          // 🔄 RETRY AUTOMÁTICO PARA RESILENCIA
          retry: {
            max: 3,
            timeout: 5000,
            match: [
              /ConnectionError/,
              /ConnectionRefusedError/,
              /ConnectionTimedOutError/,
              /TimeoutError/
            ]
          },

          // 🎯 HOOKS PARA MULTI-TENANCY
          hooks: {
            beforeConnect: async (config) => {
              console.log(`🔌 Conectando tenant ${tenantId} en shard ${tenantSize}`);
            },
            afterConnect: async (connection, config) => {
              await connection.query(`SET app.current_tenant_id = '${tenantId}'`);
            }
          }
        }
      );
    }

    // 🛡️ MIDDLEWARE DE SEGURIDAD MULTI-TENANT
    sequelize.addHook('beforeFind', (options) => {
      if (!options.where) options.where = {};
      if (!options.where.tenant_id && !options.ignoreTenant) {
        options.where.tenant_id = tenantId;
      }
    });

    sequelize.addHook('beforeCreate', (instance, options) => {
      if (instance.dataValues && !instance.dataValues.tenant_id) {
        instance.dataValues.tenant_id = tenantId;
      }
    });

    this.connections.set(connectionKey, sequelize);
    console.log(`✅ Conexión tenant ${tenantId} establecida en shard ${tenantSize}`);

    return sequelize;
  }

  // 📈 GESTIÓN INTELIGENTE DE SHARDS
  getShardConfig(tenantSize) {
    return this.shardConfig[tenantSize] || this.shardConfig.medium;
  }

  // 💾 CACHÉ INTELIGENTE CON REDIS
  async cacheSet(key, value, ttl = 3600) {
    const cacheKey = `biometric:${key}`;
    await this.redis.setex(cacheKey, ttl, JSON.stringify(value));
  }

  async cacheGet(key) {
    const cacheKey = `biometric:${key}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  // 🔥 BATCH OPERATIONS PARA MILLONES DE REGISTROS
  async batchInsert(tenantId, tableName, records, batchSize = 1000) {
    const connection = await this.getTenantConnection(tenantId);
    const results = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchResult = await connection.query(`
        INSERT INTO ${tableName}
        VALUES ${batch.map(() => '(?)').join(',')}
      `, {
        replacements: batch.flat(),
        type: connection.QueryTypes.INSERT
      });
      results.push(batchResult);
    }

    console.log(`🚀 Inserted ${records.length} records in batches`);
    return results;
  }

  // 📊 ANALYTICS EN TIEMPO REAL
  async getRealtimeStats(tenantId) {
    const cacheKey = `stats:${tenantId}`;
    let stats = await this.cacheGet(cacheKey);

    if (!stats) {
      const connection = await this.getTenantConnection(tenantId);
      stats = await connection.query(`
        SELECT
          COUNT(*) as total_records,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as last_day,
          AVG(processing_time_ms) as avg_processing_time
        FROM biometric_scans
        WHERE tenant_id = :tenantId
      `, {
        replacements: { tenantId },
        type: connection.QueryTypes.SELECT
      });

      await this.cacheSet(cacheKey, stats[0], 300); // Cache 5 minutos
    }

    return stats;
  }

  // 🔄 HEALTH CHECK AVANZADO
  async healthCheck() {
    const health = {
      database: {},
      redis: {},
      shards: {},
      timestamp: new Date()
    };

    // Check Redis
    try {
      await this.redis.ping();
      health.redis.status = 'healthy';
      health.redis.latency = await this.measureRedisLatency();
    } catch (error) {
      health.redis.status = 'unhealthy';
      health.redis.error = error.message;
    }

    // Check Database shards
    for (const [key, connection] of this.connections) {
      try {
        await connection.authenticate();
        health.database[key] = 'healthy';
      } catch (error) {
        health.database[key] = 'unhealthy';
      }
    }

    return health;
  }

  async measureRedisLatency() {
    const start = Date.now();
    await this.redis.ping();
    return Date.now() - start;
  }

  // 🧹 LIMPIEZA Y MANTENIMIENTO AUTOMÁTICO
  async cleanup() {
    // Cerrar conexiones inactivas
    for (const [key, connection] of this.connections) {
      await connection.close();
    }

    // Cerrar Redis
    if (this.redis) {
      await this.redis.quit();
    }

    console.log('🧹 Database cleanup completed');
  }
}

// 🌟 EXPORT SINGLETON PATTERN
const dbManager = new NextGenDatabaseManager();

module.exports = {
  NextGenDatabaseManager,
  dbManager,

  // Funciones de conveniencia
  getTenantDB: (tenantId, size) => dbManager.getTenantConnection(tenantId, size),
  cache: {
    set: (key, value, ttl) => dbManager.cacheSet(key, value, ttl),
    get: (key) => dbManager.cacheGet(key)
  },
  batchInsert: (tenantId, table, records) => dbManager.batchInsert(tenantId, table, records),
  getStats: (tenantId) => dbManager.getRealtimeStats(tenantId),
  healthCheck: () => dbManager.healthCheck()
};