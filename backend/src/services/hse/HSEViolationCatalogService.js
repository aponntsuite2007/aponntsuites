/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HSE VIOLATION CATALOG SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * SSOT para catálogo de violaciones de seguridad.
 * Usado por: Módulo Médico, Detección IA, Dashboard HSE
 *
 * Fuente primaria: BD (hse_violation_catalog)
 * Cache: En memoria con TTL de 5 minutos
 */

class HSEViolationCatalogService {
  constructor(database) {
    this.db = database;
    this.cache = null;
    this.cacheExpiry = null;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * SSOT: Obtener catálogo completo desde BD
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<Array>} Lista de violaciones
   */
  async getCatalog(options = {}) {
    const {
      category = null,
      forAI = false,
      forMedical = false,
      activeOnly = true,
      forceRefresh = false
    } = options;

    // Check cache
    if (this.cache && this.cacheExpiry > Date.now() && !forceRefresh) {
      return this.filterCatalog(this.cache, options);
    }

    // SSOT: Leer desde BD
    const query = `
      SELECT
        code,
        category,
        name,
        name_short,
        description,
        icon,
        is_detectable_by_ai,
        ai_model_tag,
        ai_confidence_threshold,
        is_medical_selectable,
        related_cie10_codes,
        body_locations,
        default_training_template_id,
        training_is_mandatory,
        default_sanction_type,
        reincidence_threshold,
        display_order
      FROM hse_violation_catalog
      WHERE is_active = $1
      ORDER BY category, display_order, name
    `;

    const result = await this.db.query(query, [activeOnly]);
    this.cache = result.rows;
    this.cacheExpiry = Date.now() + this.CACHE_TTL;

    console.log(`[HSE] Catálogo cargado: ${this.cache.length} violaciones`);
    return this.filterCatalog(this.cache, options);
  }

  /**
   * Filtrar catálogo según opciones
   */
  filterCatalog(catalog, options) {
    let filtered = [...catalog];

    if (options.category) {
      filtered = filtered.filter(v => v.category === options.category);
    }
    if (options.forAI) {
      filtered = filtered.filter(v => v.is_detectable_by_ai);
    }
    if (options.forMedical) {
      filtered = filtered.filter(v => v.is_medical_selectable);
    }

    return filtered;
  }

  /**
   * SSOT: Obtener violación por código
   */
  async getByCode(code) {
    const catalog = await this.getCatalog({ activeOnly: true });
    return catalog.find(v => v.code === code) || null;
  }

  /**
   * SSOT: Obtener múltiples violaciones por códigos
   */
  async getByCodes(codes) {
    if (!codes || codes.length === 0) return [];
    const catalog = await this.getCatalog({ activeOnly: true });
    return catalog.filter(v => codes.includes(v.code));
  }

  /**
   * SSOT: Validar que códigos existen en catálogo
   */
  async validateCodes(codes) {
    if (!codes || codes.length === 0) return { valid: true, invalid: [] };

    const catalog = await this.getCatalog({ activeOnly: true });
    const catalogCodes = catalog.map(v => v.code);
    const invalidCodes = codes.filter(c => !catalogCodes.includes(c));

    return {
      valid: invalidCodes.length === 0,
      invalid: invalidCodes
    };
  }

  /**
   * SSOT: Obtener tags para Azure Custom Vision
   * Mapea: ai_model_tag -> code
   */
  async getAIModelTags() {
    const catalog = await this.getCatalog({ forAI: true });
    return catalog.reduce((acc, v) => {
      if (v.ai_model_tag) {
        acc[v.ai_model_tag] = {
          code: v.code,
          name: v.name,
          confidence_threshold: v.ai_confidence_threshold
        };
      }
      return acc;
    }, {});
  }

  /**
   * SSOT: Obtener violaciones relacionadas con código CIE-10
   * Para sugerir violaciones cuando el médico ingresa diagnóstico
   */
  async getRelatedToCIE10(cie10Code) {
    if (!cie10Code) return [];

    const catalog = await this.getCatalog({ forMedical: true });
    const codePrefix = cie10Code.substring(0, 3); // S62 de S62.3

    return catalog.filter(v =>
      v.related_cie10_codes &&
      v.related_cie10_codes.some(c =>
        c === cie10Code || c === codePrefix || cie10Code.startsWith(c)
      )
    );
  }

  /**
   * SSOT: Obtener violaciones por ubicación del cuerpo
   * Para sugerir violaciones cuando el médico indica parte afectada
   */
  async getRelatedToBodyLocation(bodyLocation) {
    if (!bodyLocation) return [];

    const catalog = await this.getCatalog({ forMedical: true });
    const location = bodyLocation.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return catalog.filter(v =>
      v.body_locations &&
      v.body_locations.some(bl => {
        const normalized = bl.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return normalized.includes(location) || location.includes(normalized);
      })
    );
  }

  /**
   * Obtener catálogo agrupado por categoría
   * Para UI de selección
   */
  async getCatalogGrouped(options = {}) {
    const catalog = await this.getCatalog(options);

    return {
      EPP: catalog.filter(v => v.category === 'EPP'),
      PROCEDIMIENTO: catalog.filter(v => v.category === 'PROCEDIMIENTO'),
      CONDICION: catalog.filter(v => v.category === 'CONDICION')
    };
  }

  /**
   * Obtener estadísticas del catálogo
   */
  async getStats() {
    const catalog = await this.getCatalog({ activeOnly: true });

    return {
      total: catalog.length,
      byCategory: {
        EPP: catalog.filter(v => v.category === 'EPP').length,
        PROCEDIMIENTO: catalog.filter(v => v.category === 'PROCEDIMIENTO').length,
        CONDICION: catalog.filter(v => v.category === 'CONDICION').length
      },
      aiDetectable: catalog.filter(v => v.is_detectable_by_ai).length,
      medicalSelectable: catalog.filter(v => v.is_medical_selectable).length
    };
  }

  /**
   * SSOT: Invalidar cache
   */
  invalidateCache() {
    this.cache = null;
    this.cacheExpiry = null;
    console.log('[HSE] Cache de catálogo invalidado');
  }

  /**
   * Agregar nueva violación al catálogo
   */
  async addViolation(violation, userId = null) {
    const query = `
      INSERT INTO hse_violation_catalog (
        code, category, name, name_short, description, icon,
        is_detectable_by_ai, ai_model_tag, ai_confidence_threshold,
        is_medical_selectable, related_cie10_codes, body_locations,
        default_training_template_id, training_is_mandatory,
        default_sanction_type, reincidence_threshold,
        display_order, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      violation.code,
      violation.category,
      violation.name,
      violation.name_short || null,
      violation.description || null,
      violation.icon || null,
      violation.is_detectable_by_ai || false,
      violation.ai_model_tag || null,
      violation.ai_confidence_threshold || 0.70,
      violation.is_medical_selectable !== false,
      violation.related_cie10_codes || null,
      violation.body_locations || null,
      violation.default_training_template_id || null,
      violation.training_is_mandatory !== false,
      violation.default_sanction_type || null,
      violation.reincidence_threshold || 3,
      violation.display_order || 0,
      userId
    ]);

    this.invalidateCache();
    return result.rows[0];
  }

  /**
   * Actualizar violación existente
   */
  async updateViolation(code, updates, userId = null) {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'name_short', 'description', 'icon',
      'is_detectable_by_ai', 'ai_model_tag', 'ai_confidence_threshold',
      'is_medical_selectable', 'related_cie10_codes', 'body_locations',
      'default_training_template_id', 'training_is_mandatory',
      'default_sanction_type', 'reincidence_threshold',
      'display_order', 'is_active'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    setClause.push(`updated_at = NOW()`);
    setClause.push(`updated_by = $${paramIndex}`);
    values.push(userId);
    paramIndex++;

    values.push(code);

    const query = `
      UPDATE hse_violation_catalog
      SET ${setClause.join(', ')}
      WHERE code = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    this.invalidateCache();

    if (result.rows.length === 0) {
      throw new Error(`Violación no encontrada: ${code}`);
    }

    return result.rows[0];
  }
}

module.exports = HSEViolationCatalogService;
