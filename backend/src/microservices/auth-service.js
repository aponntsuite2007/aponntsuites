const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const OAuth2Strategy = require('passport-oauth2');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const rateLimit = require('express-rate-limit');
const Boom = require('@hapi/boom');
const { dbManager } = require('../config/database-next-gen');
const { getBaseUrl } = require('../utils/urlHelper');

// 🔐 SERVICIO DE AUTENTICACIÓN NEXT-GEN
class NextGenAuthService {
  constructor() {
    this.app = express();
    this.jwtSecret = process.env.JWT_SECRET || 'ultra-secret-biometric-key';
    this.refreshTokens = new Map();
    this.initializeMiddleware();
    this.initializePassport();
    this.initializeRoutes();
  }

  // 🚀 MIDDLEWARE DE SEGURIDAD AVANZADA
  initializeMiddleware() {
    // Rate limiting ultra-agresivo para auth
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 5, // máximo 5 intentos por IP
      message: { error: 'Demasiados intentos de autenticación' },
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Rate limiting para registro
    const registerLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hora
      max: 3, // máximo 3 registros por IP por hora
      message: { error: 'Demasiados intentos de registro' },
    });

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Sesiones con Redis
    this.app.use(session({
      store: new RedisStore({ client: dbManager.redis }),
      secret: this.jwtSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
      }
    }));

    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // Aplicar rate limiting
    this.app.use('/auth/login', authLimiter);
    this.app.use('/auth/register', registerLimiter);
  }

  // 🛡️ CONFIGURACIÓN PASSPORT AVANZADA
  initializePassport() {
    // Estrategia JWT
    passport.use(new JwtStrategy({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: this.jwtSecret,
      algorithms: ['HS256']
    }, async (payload, done) => {
      try {
        const connection = await dbManager.getTenantConnection(payload.tenantId);
        const user = await connection.query(`
          SELECT id, email, role, tenant_id, company_id, first_name, last_name, active
          FROM users
          WHERE id = :userId AND tenant_id = :tenantId AND active = true
        `, {
          replacements: { userId: payload.userId, tenantId: payload.tenantId },
          type: connection.QueryTypes.SELECT
        });

        if (user.length > 0) {
          return done(null, user[0]);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    }));

    // Estrategia OAuth2 para integración empresarial
    passport.use('oauth2', new OAuth2Strategy({
      authorizationURL: process.env.OAUTH2_AUTH_URL,
      tokenURL: process.env.OAUTH2_TOKEN_URL,
      clientID: process.env.OAUTH2_CLIENT_ID,
      clientSecret: process.env.OAUTH2_CLIENT_SECRET,
      callbackURL: process.env.OAUTH2_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Implementar lógica de mapeo de usuario OAuth2
        const userInfo = await this.getOAuth2UserInfo(accessToken);
        const user = await this.findOrCreateOAuth2User(userInfo);
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));

    passport.serializeUser((user, done) => {
      done(null, { id: user.user_id, tenantId: user.tenant_id });
    });

    passport.deserializeUser(async (serializedUser, done) => {
      try {
        const connection = await dbManager.getTenantConnection(serializedUser.tenantId);
        const user = await connection.query(`
          SELECT * FROM users WHERE user_id = :id AND tenant_id = :tenantId
        `, {
          replacements: serializedUser,
          type: connection.QueryTypes.SELECT
        });
        done(null, user[0] || null);
      } catch (error) {
        done(error, null);
      }
    });
  }

  // 🌐 RUTAS DE AUTENTICACIÓN
  initializeRoutes() {
    // 🔑 LOGIN BIOMÉTRICO AVANZADO
    this.app.post('/auth/login', async (req, res) => {
      try {
        const { email, password, tenantId, biometricData } = req.body;

        if (!email || !password || !tenantId) {
          throw Boom.badRequest('Email, password y tenantId son requeridos');
        }

        // Validar usuario
        const connection = await dbManager.getTenantConnection(tenantId);
        const users = await connection.query(`
          SELECT id, email, password, role, company_id, first_name, last_name, active,
                 failed_attempts, locked_until
          FROM users
          WHERE email = :email AND tenant_id = :tenantId
        `, {
          replacements: { email, tenantId },
          type: connection.QueryTypes.SELECT
        });

        if (users.length === 0) {
          throw Boom.unauthorized('Credenciales inválidas');
        }

        const user = users[0];

        // Verificar si la cuenta está bloqueada
        if (user.locked_until && new Date() < new Date(user.locked_until)) {
          throw Boom.locked('Cuenta temporalmente bloqueada');
        }

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          await this.handleFailedLogin(connection, user.user_id, tenantId);
          throw Boom.unauthorized('Credenciales inválidas');
        }

        // Verificación biométrica opcional
        if (biometricData) {
          const biometricValid = await this.validateBiometricData(user.user_id, tenantId, biometricData);
          if (!biometricValid) {
            throw Boom.unauthorized('Verificación biométrica fallida');
          }
        }

        // Reset failed attempts
        await connection.query(`
          UPDATE users
          SET failed_attempts = 0, locked_until = NULL
          WHERE id = :id AND tenant_id = :tenantId
        `, {
          replacements: { id: user.user_id, tenantId },
          type: connection.QueryTypes.UPDATE
        });

        // Generar tokens
        const tokens = await this.generateTokens(user, tenantId);

        // Log del login
        await this.logAuthEvent('login_success', user.user_id, tenantId, req.ip);

        res.json({
          success: true,
          user: {
            id: user.user_id,
            email: user.email,
            role: user.role,
            company_id: user.company_id,
            first_name: user.first_name,
            last_name: user.last_name
          },
          tokens,
          expiresIn: '24h'
        });

      } catch (error) {
        if (Boom.isBoom(error)) {
          return res.status(error.output.statusCode).json(error.output.payload);
        }
        res.status(500).json({ error: error.message });
      }
    });

    // 🔄 REFRESH TOKEN
    this.app.post('/auth/refresh', async (req, res) => {
      try {
        const { refreshToken } = req.body;

        if (!this.refreshTokens.has(refreshToken)) {
          throw Boom.unauthorized('Refresh token inválido');
        }

        const tokenData = this.refreshTokens.get(refreshToken);

        // Verificar expiración
        if (Date.now() > tokenData.expiresAt) {
          this.refreshTokens.delete(refreshToken);
          throw Boom.unauthorized('Refresh token expirado');
        }

        // Generar nuevos tokens
        const tokens = await this.generateTokens(tokenData.user, tokenData.tenantId);

        // Eliminar el refresh token usado
        this.refreshTokens.delete(refreshToken);

        res.json({
          success: true,
          tokens
        });

      } catch (error) {
        if (Boom.isBoom(error)) {
          return res.status(error.output.statusCode).json(error.output.payload);
        }
        res.status(500).json({ error: error.message });
      }
    });

    // 🚪 LOGOUT
    this.app.post('/auth/logout', passport.authenticate('jwt', { session: false }), async (req, res) => {
      try {
        const { refreshToken } = req.body;

        if (refreshToken) {
          this.refreshTokens.delete(refreshToken);
        }

        // Invalidar token en blacklist
        await this.blacklistToken(req.headers.authorization);

        // Log del logout
        await this.logAuthEvent('logout', req.user.user_id, req.user.tenant_id, req.ip);

        res.json({ success: true, message: 'Logout exitoso' });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 👤 PERFIL DE USUARIO
    this.app.get('/auth/profile', passport.authenticate('jwt', { session: false }), async (req, res) => {
      try {
        const connection = await dbManager.getTenantConnection(req.user.tenant_id);
        const users = await connection.query(`
          SELECT u.id, u.email, u.role, u.company_id, u.first_name, u.last_name,
                 u.created_at, u.last_login, c.name as company_name
          FROM users u
          LEFT JOIN companies c ON u.company_id = c.id
          WHERE u.id = :userId AND u.tenant_id = :tenantId
        `, {
          replacements: { userId: req.user.user_id, tenantId: req.user.tenant_id },
          type: connection.QueryTypes.SELECT
        });

        if (users.length === 0) {
          throw Boom.notFound('Usuario no encontrado');
        }

        res.json({
          success: true,
          user: users[0]
        });

      } catch (error) {
        if (Boom.isBoom(error)) {
          return res.status(error.output.statusCode).json(error.output.payload);
        }
        res.status(500).json({ error: error.message });
      }
    });

    // 🔐 CAMBIO DE CONTRASEÑA
    this.app.post('/auth/change-password', passport.authenticate('jwt', { session: false }), async (req, res) => {
      try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
          throw Boom.badRequest('Contraseña actual y nueva son requeridas');
        }

        if (newPassword.length < 8) {
          throw Boom.badRequest('La nueva contraseña debe tener al menos 8 caracteres');
        }

        const connection = await dbManager.getTenantConnection(req.user.tenant_id);
        const users = await connection.query(`
          SELECT password FROM users
          WHERE id = :id AND tenant_id = :tenantId
        `, {
          replacements: { id: req.user.user_id, tenantId: req.user.tenant_id },
          type: connection.QueryTypes.SELECT
        });

        // Verificar contraseña actual
        const validPassword = await bcrypt.compare(currentPassword, users[0].password);
        if (!validPassword) {
          throw Boom.unauthorized('Contraseña actual incorrecta');
        }

        // Hash nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Actualizar contraseña
        await connection.query(`
          UPDATE users
          SET password = :password, password_changed_at = NOW()
          WHERE id = :id AND tenant_id = :tenantId
        `, {
          replacements: {
            password: hashedPassword,
            id: req.user.user_id,
            tenantId: req.user.tenant_id
          },
          type: connection.QueryTypes.UPDATE
        });

        // Log del cambio
        await this.logAuthEvent('password_change', req.user.user_id, req.user.tenant_id, req.ip);

        res.json({
          success: true,
          message: 'Contraseña cambiada exitosamente'
        });

      } catch (error) {
        if (Boom.isBoom(error)) {
          return res.status(error.output.statusCode).json(error.output.payload);
        }
        res.status(500).json({ error: error.message });
      }
    });

    // 🌐 RUTAS OAUTH2
    this.app.get('/auth/oauth2', passport.authenticate('oauth2'));

    this.app.get('/auth/oauth2/callback',
      passport.authenticate('oauth2', { failureRedirect: '/auth/login?error=oauth2' }),
      async (req, res) => {
        try {
          const tokens = await this.generateTokens(req.user, req.user.tenant_id);
          res.redirect(`${getBaseUrl()}/dashboard?token=${tokens.accessToken}`);
        } catch (error) {
          res.redirect('/auth/login?error=token_generation');
        }
      }
    );

    // 📊 HEALTH CHECK
    this.app.get('/auth/health', (req, res) => {
      res.json({
        service: 'auth-service',
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
      });
    });
  }

  // 🔑 GENERACIÓN DE TOKENS
  async generateTokens(user, tenantId) {
    const payload = {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      tenantId: tenantId,
      companyId: user.company_id
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: '24h',
      algorithm: 'HS256'
    });

    const refreshToken = jwt.sign(
      { userId: user.user_id, tenantId: tenantId },
      this.jwtSecret,
      { expiresIn: '7d' }
    );

    // Almacenar refresh token
    this.refreshTokens.set(refreshToken, {
      user: user,
      tenantId: tenantId,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 días
    });

    // Almacenar en Redis para distribución
    await dbManager.cache.set(`refresh_token:${refreshToken}`, {
      userId: user.user_id,
      tenantId: tenantId,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
    }, 604800); // 7 días

    return { accessToken, refreshToken };
  }

  // 🚫 BLACKLIST DE TOKENS
  async blacklistToken(authHeader) {
    if (!authHeader) return;

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.decode(token);

    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await dbManager.cache.set(`blacklist:${token}`, true, ttl);
      }
    }
  }

  // 🔒 MANEJO DE INTENTOS FALLIDOS
  async handleFailedLogin(connection, userId, tenantId) {
    await connection.query(`
      UPDATE users
      SET failed_attempts = COALESCE(failed_attempts, 0) + 1,
          locked_until = CASE
            WHEN COALESCE(failed_attempts, 0) + 1 >= 5
            THEN NOW() + INTERVAL '30 minutes'
            ELSE NULL
          END
      WHERE id = :id AND tenant_id = :tenantId
    `, {
      replacements: { id: userId, tenantId },
      type: connection.QueryTypes.UPDATE
    });
  }

  // 📊 VALIDACIÓN BIOMÉTRICA
  async validateBiometricData(userId, tenantId, biometricData) {
    try {
      // Obtener datos biométricos almacenados
      const connection = await dbManager.getTenantConnection(tenantId);
      const storedBiometrics = await connection.query(`
        SELECT face_descriptor, confidence_threshold
        FROM facial_biometric_data
        WHERE user_id = :userId AND tenant_id = :tenantId AND active = true
        ORDER BY created_at DESC LIMIT 1
      `, {
        replacements: { userId, tenantId },
        type: connection.QueryTypes.SELECT
      });

      if (storedBiometrics.length === 0) {
        return false; // No hay datos biométricos almacenados
      }

      // Comparar descriptores faciales (implementar algoritmo de similitud)
      const similarity = this.calculateFaceSimilarity(
        storedBiometrics[0].face_descriptor,
        biometricData.faceDescriptor
      );

      const threshold = storedBiometrics[0].confidence_threshold || 0.8;
      return similarity >= threshold;

    } catch (error) {
      console.error('Error validando biometría:', error);
      return false;
    }
  }

  // 🧮 CÁLCULO DE SIMILITUD FACIAL
  calculateFaceSimilarity(descriptor1, descriptor2) {
    if (!descriptor1 || !descriptor2) return 0;

    try {
      const desc1 = JSON.parse(descriptor1);
      const desc2 = JSON.parse(descriptor2);

      // Calcular distancia euclidiana
      let sum = 0;
      for (let i = 0; i < Math.min(desc1.length, desc2.length); i++) {
        sum += Math.pow(desc1[i] - desc2[i], 2);
      }

      const distance = Math.sqrt(sum);
      // Convertir distancia a similitud (0-1)
      return Math.max(0, 1 - (distance / 2));

    } catch (error) {
      return 0;
    }
  }

  // 📝 LOG DE EVENTOS DE AUTH
  async logAuthEvent(eventType, userId, tenantId, ipAddress) {
    try {
      const connection = await dbManager.getTenantConnection(tenantId);
      await connection.query(`
        INSERT INTO auth_logs (user_id, tenant_id, event_type, ip_address, timestamp)
        VALUES (:userId, :tenantId, :eventType, :ipAddress, NOW())
      `, {
        replacements: { userId, tenantId, eventType, ipAddress },
        type: connection.QueryTypes.INSERT
      });
    } catch (error) {
      console.error('Error logging auth event:', error);
    }
  }

  // 🌐 OBTENER INFO USUARIO OAUTH2
  async getOAuth2UserInfo(accessToken) {
    // Implementar según el proveedor OAuth2
    return {
      email: 'user@company.com',
      name: 'OAuth User'
    };
  }

  // 👤 ENCONTRAR O CREAR USUARIO OAUTH2
  async findOrCreateOAuth2User(userInfo) {
    // Implementar lógica de creación/búsqueda de usuario OAuth2
    return userInfo;
  }

  // 🚀 INICIAR SERVICIO
  start(port = 3001) {
    this.app.listen(port, () => {
      console.log(`🔐 Auth Service iniciado en puerto ${port}`);
    });
  }
}

// 🌟 EXPORT Y FUNCIONES DE UTILIDAD
const authService = new NextGenAuthService();

module.exports = {
  NextGenAuthService,
  authService,

  // Middleware de autenticación para otros servicios
  authenticate: passport.authenticate('jwt', { session: false }),

  // Middleware de autorización por rol
  authorize: (roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      next();
    };
  },

  // Verificar si token está en blacklist
  checkBlacklist: async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const isBlacklisted = await dbManager.cache.get(`blacklist:${token}`);
        if (isBlacklisted) {
          return res.status(401).json({ error: 'Token invalidado' });
        }
      }
      next();
    } catch (error) {
      next();
    }
  }
};