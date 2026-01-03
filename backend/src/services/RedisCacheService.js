/**
 * ENTERPRISE REDIS CACHE SERVICE
 * ==============================
 * High-performance caching layer for 100k+ concurrent users
 *
 * Features:
 * - Redis primary storage with in-memory fallback
 * - Automatic cache invalidation patterns
 * - TTL management per key pattern
 * - Cache hit/miss metrics
 * - Graceful degradation if Redis unavailable
 */

const Redis = require('ioredis');

class RedisCacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.memoryCache = new Map();
    this.memoryCacheTTL = new Map();

    // Cache metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
      errors: 0
    };

    // TTL configurations per key pattern (in seconds)
    this.ttlConfig = {
      'modules:': 300,           // 5 min - Active modules per company
      'system_modules:': 1800,   // 30 min - System modules (rarely change)
      'users:list:': 60,         // 1 min - User lists
      'users:count:': 120,       // 2 min - User counts
      'company:': 600,           // 10 min - Company data
      'permissions:': 300,       // 5 min - User permissions
      'dashboard:': 60,          // 1 min - Dashboard stats
      'default': 120             // 2 min default
    };

    this.initialize();
  }

  async initialize() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        retryDelayOnClusterDown: 100,
        enableReadyCheck: true,
        connectTimeout: 5000,
        lazyConnect: true,
        // Connection pool settings
        family: 4,
        keepAlive: 10000
      });

      this.redis.on('connect', () => {
        console.log('🔴 [REDIS] Conectado a Redis');
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        console.warn('⚠️ [REDIS] Error de conexión, usando cache en memoria:', err.message);
        this.isConnected = false;
        this.metrics.errors++;
      });

      this.redis.on('close', () => {
        console.warn('⚠️ [REDIS] Conexión cerrada');
        this.isConnected = false;
      });

      // Attempt connection
      await this.redis.connect().catch(() => {
        console.log('⚠️ [REDIS] No disponible, usando cache en memoria como fallback');
      });

    } catch (error) {
      console.warn('⚠️ [REDIS] Error inicializando, usando cache en memoria:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Get TTL for a key based on pattern matching
   */
  getTTL(key) {
    for (const [pattern, ttl] of Object.entries(this.ttlConfig)) {
      if (key.startsWith(pattern)) {
        return ttl;
      }
    }
    return this.ttlConfig.default;
  }

  /**
   * GET - Retrieve value from cache
   */
  async get(key) {
    try {
      // Try Redis first
      if (this.isConnected && this.redis) {
        const value = await this.redis.get(key);
        if (value) {
          this.metrics.hits++;
          return JSON.parse(value);
        }
      }

      // Fallback to memory cache
      if (this.memoryCache.has(key)) {
        const ttlExpiry = this.memoryCacheTTL.get(key);
        if (ttlExpiry && Date.now() < ttlExpiry) {
          this.metrics.hits++;
          return this.memoryCache.get(key);
        } else {
          // Expired - clean up
          this.memoryCache.delete(key);
          this.memoryCacheTTL.delete(key);
        }
      }

      this.metrics.misses++;
      return null;
    } catch (error) {
      this.metrics.errors++;
      console.warn(`⚠️ [REDIS] Error getting key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * SET - Store value in cache with TTL
   */
  async set(key, value, customTTL = null) {
    try {
      const ttl = customTTL || this.getTTL(key);
      const serialized = JSON.stringify(value);

      // Store in Redis if connected
      if (this.isConnected && this.redis) {
        await this.redis.setex(key, ttl, serialized);
      }

      // Always store in memory cache as backup
      this.memoryCache.set(key, value);
      this.memoryCacheTTL.set(key, Date.now() + (ttl * 1000));

      this.metrics.sets++;
      return true;
    } catch (error) {
      this.metrics.errors++;
      console.warn(`⚠️ [REDIS] Error setting key ${key}:`, error.message);

      // Store in memory as fallback
      this.memoryCache.set(key, value);
      this.memoryCacheTTL.set(key, Date.now() + (120 * 1000)); // 2 min default
      return false;
    }
  }

  /**
   * DELETE - Remove specific key
   */
  async del(key) {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.del(key);
      }
      this.memoryCache.delete(key);
      this.memoryCacheTTL.delete(key);
      this.metrics.invalidations++;
      return true;
    } catch (error) {
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * INVALIDATE PATTERN - Remove all keys matching pattern
   * Critical for cache coherency on write operations
   */
  async invalidatePattern(pattern) {
    try {
      let count = 0;

      // Invalidate in Redis
      if (this.isConnected && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          count += keys.length;
        }
      }

      // Invalidate in memory cache
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*'));
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          this.memoryCacheTTL.delete(key);
          count++;
        }
      }

      this.metrics.invalidations += count;
      console.log(`🗑️ [CACHE] Invalidated ${count} keys matching: ${pattern}`);
      return count;
    } catch (error) {
      this.metrics.errors++;
      console.warn(`⚠️ [REDIS] Error invalidating pattern ${pattern}:`, error.message);
      return 0;
    }
  }

  /**
   * GET OR SET - Atomic get-or-compute pattern
   * Most common usage: cache miss -> compute -> store
   */
  async getOrSet(key, computeFn, customTTL = null) {
    // Try cache first
    let value = await this.get(key);
    if (value !== null) {
      return value;
    }

    // Cache miss - compute value
    try {
      value = await computeFn();
      if (value !== undefined && value !== null) {
        await this.set(key, value, customTTL);
      }
      return value;
    } catch (error) {
      console.error(`❌ [CACHE] Error computing value for ${key}:`, error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIFIC CACHE HELPERS FOR CRITICAL ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Cache key generators
   */
  keys = {
    activeModules: (companyId, panel) => `modules:company:${companyId}:panel:${panel || 'default'}`,
    systemModules: () => `system_modules:all`,
    userList: (companyId, page, limit) => `users:list:${companyId}:${page}:${limit}`,
    userCount: (companyId) => `users:count:${companyId}`,
    company: (companyId) => `company:${companyId}`,
    permissions: (userId) => `permissions:user:${userId}`,
    dashboardStats: (companyId) => `dashboard:company:${companyId}`
  };

  /**
   * Invalidate all caches for a company (on module activation/deactivation)
   */
  async invalidateCompany(companyId) {
    await Promise.all([
      this.invalidatePattern(`modules:company:${companyId}:*`),
      this.invalidatePattern(`users:*:${companyId}:*`),
      this.invalidatePattern(`dashboard:company:${companyId}*`),
      this.invalidatePattern(`company:${companyId}*`)
    ]);
  }

  /**
   * Invalidate user-related caches (on user CRUD)
   */
  async invalidateUsers(companyId) {
    await Promise.all([
      this.invalidatePattern(`users:list:${companyId}:*`),
      this.invalidatePattern(`users:count:${companyId}`)
    ]);
  }

  /**
   * Invalidate system-wide caches (on system module changes)
   */
  async invalidateSystemModules() {
    await this.invalidatePattern('system_modules:*');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // METRICS & MONITORING
  // ═══════════════════════════════════════════════════════════════════════════

  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total > 0 ? ((this.metrics.hits / total) * 100).toFixed(2) + '%' : 'N/A',
      isRedisConnected: this.isConnected,
      memoryCacheSize: this.memoryCache.size
    };
  }

  async healthCheck() {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.ping();
        return { status: 'healthy', backend: 'redis', connected: true };
      }
      return { status: 'degraded', backend: 'memory', connected: false };
    } catch {
      return { status: 'degraded', backend: 'memory', connected: false };
    }
  }

  /**
   * Cleanup expired memory cache entries (run periodically)
   */
  cleanupMemoryCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, expiry] of this.memoryCacheTTL.entries()) {
      if (now >= expiry) {
        this.memoryCache.delete(key);
        this.memoryCacheTTL.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 [CACHE] Cleaned ${cleaned} expired memory cache entries`);
    }
    return cleaned;
  }
}

// Singleton instance
const cacheService = new RedisCacheService();

// Periodic cleanup every 5 minutes
setInterval(() => {
  cacheService.cleanupMemoryCache();
}, 5 * 60 * 1000);

module.exports = cacheService;
