/**
 * A MI PASO - Servicio de Búsqueda Inteligente Multi-Fuente
 *
 * Busca en todas las fuentes de conocimiento de la empresa:
 * - Employee Experiences (resueltas + mis experiencias)
 * - Procedures (Manual de Procedimientos)
 * - Company News
 *
 * Aplica scoring inteligente con boosts por:
 * - Fuente (procedures > my_experiences > experiences > news)
 * - Departamento del usuario
 * - Recencia
 * - Popularidad
 */

const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

class AMiPasoService {

  /**
   * Buscar en todas las fuentes de conocimiento
   *
   * @param {string} query - Texto de búsqueda del usuario
   * @param {Object} user - Usuario que realiza la búsqueda
   * @param {number} user.id - UUID del usuario
   * @param {number} user.company_id - Company ID
   * @param {number} user.department_id - Department ID (opcional)
   * @returns {Object} Resultados categorizados por nivel de match
   */
  async search(query, user) {
    const startTime = Date.now();

    try {
      // Normalizar query
      const queryNormalized = this._normalizeQuery(query);
      const keywords = this._extractKeywords(queryNormalized);

      // Buscar en todas las fuentes en paralelo
      const [
        experiencesResolved,
        myExperiences,
        news,
        procedures  // Solo si el módulo está activo
      ] = await Promise.all([
        this._searchExperiencesResolved(keywords, user),
        this._searchMyExperiences(keywords, user),
        this._searchNews(keywords, user),
        this._searchProcedures(keywords, user)
      ]);

      // Combinar resultados
      const allResults = [
        ...experiencesResolved.map(r => ({...r, source: 'EXPERIENCE', icon: '💡', priority: 0.9})),
        ...myExperiences.map(r => ({...r, source: 'MY_EXPERIENCE', icon: '✅', isMine: true, priority: 1.1})),
        ...news.map(r => ({...r, source: 'NEWS', icon: '📰', priority: 0.7})),
        ...procedures.map(r => ({...r, source: 'PROCEDURE', icon: '📘', priority: 1.0}))
      ];

      // Aplicar scoring inteligente
      allResults.forEach(result => {
        result.finalScore = this._calculateScore(result, keywords, user);
        result.confidence = Math.round(result.finalScore * 100);
        result.relevanceExplanation = this._generateRelevanceExplanation(result, keywords, user);
      });

      // Ordenar por score final
      allResults.sort((a, b) => b.finalScore - a.finalScore);

      // Categorizar por nivel de match
      const categorized = {
        exact: allResults.filter(r => r.confidence >= 90),
        high: allResults.filter(r => r.confidence >= 80 && r.confidence < 90),
        medium: allResults.filter(r => r.confidence >= 70 && r.confidence < 80),
        low: allResults.filter(r => r.confidence >= 60 && r.confidence < 70)
      };

      // Registrar búsqueda para analytics
      await this._logSearch(query, queryNormalized, allResults, user);

      const searchTime = (Date.now() - startTime) / 1000;

      return {
        success: true,
        query,
        results: categorized,
        totalResults: allResults.length,
        searchTime: searchTime.toFixed(2),
        timestamp: new Date()
      };

    } catch (error) {
      console.error('[A-MI-PASO] Error en búsqueda:', error);
      throw error;
    }
  }


  /**
   * Buscar experiencias resueltas (de toda la empresa)
   */
  async _searchExperiencesResolved(keywords, user) {
    const whereConditions = {
      company_id: user.company_id,
      status: { [Op.in]: ['IMPLEMENTED', 'AUTO_RESOLVED'] },
      resolution: { [Op.not]: null }
    };

    // Agregar filtro de keywords en título o descripción
    if (keywords.length > 0) {
      const keywordConditions = keywords.map(kw => ({
        [Op.or]: [
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('title')),
            { [Op.like]: `%${kw}%` }
          ),
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('description')),
            { [Op.like]: `%${kw}%` }
          )
        ]
      }));

      whereConditions[Op.or] = keywordConditions;
    }

    const results = await sequelize.query(`
      SELECT
        e.id,
        e.title,
        e.description,
        e.type,
        e.area,
        e.priority,
        e.status,
        e.resolution,
        e.upvotes,
        e.views,
        e.created_at,
        e.resolved_at,
        e.implementation_date,
        e.estimated_time_saved,
        e.related_process_id,
        u.display_name as author_name,
        u.usuario as author_username,
        d.name as department_name,
        e.related_department_id
      FROM employee_experiences e
      LEFT JOIN users u ON e.employee_id = u.user_id
      LEFT JOIN departments d ON e.related_department_id = d.id
      WHERE e.company_id = :companyId
        AND e.status IN ('IMPLEMENTED', 'AUTO_RESOLVED')
        AND e.resolution IS NOT NULL
      ORDER BY e.views DESC, e.upvotes DESC, e.created_at DESC
      LIMIT 10
    `, {
      replacements: { companyId: user.company_id },
      type: sequelize.QueryTypes.SELECT
    });

    return results;
  }


  /**
   * Buscar MIS experiencias (del usuario actual)
   */
  async _searchMyExperiences(keywords, user) {
    const results = await sequelize.query(`
      SELECT
        e.id,
        e.title,
        e.description,
        e.type,
        e.area,
        e.priority,
        e.status,
        e.resolution,
        e.upvotes,
        e.views,
        e.created_at,
        e.resolved_at,
        e.related_process_id,
        d.name as department_name,
        e.related_department_id
      FROM employee_experiences e
      LEFT JOIN departments d ON e.related_department_id = d.id
      WHERE e.company_id = :companyId
        AND e.employee_id = :userId
      ORDER BY e.created_at DESC
      LIMIT 10
    `, {
      replacements: {
        companyId: user.company_id,
        userId: user.id
      },
      type: sequelize.QueryTypes.SELECT
    });

    return results;
  }


  /**
   * Buscar en noticias publicadas
   */
  async _searchNews(keywords, user) {
    const results = await sequelize.query(`
      SELECT
        n.id,
        n.title,
        n.content,
        n.summary,
        n.type,
        n.published_at,
        n.views_count,
        n.likes_count,
        n.related_experience_ids,
        n.related_process_ids,
        n.is_pinned,
        u.display_name as published_by_name
      FROM company_news n
      LEFT JOIN users u ON n.published_by = u.user_id
      WHERE n.company_id = :companyId
        AND n.is_published = true
      ORDER BY n.is_pinned DESC, n.published_at DESC
      LIMIT 5
    `, {
      replacements: { companyId: user.company_id },
      type: sequelize.QueryTypes.SELECT
    });

    return results;
  }


  /**
   * Buscar en Manual de Procedimientos (si está activo)
   */
  async _searchProcedures(keywords, user) {
    try {
      // Verificar si existe la tabla procedures
      const tableExists = await sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'procedures'
        ) as exists
      `, { type: sequelize.QueryTypes.SELECT });

      if (!tableExists[0].exists) {
        return [];
      }

      // Buscar procedimientos
      const results = await sequelize.query(`
        SELECT
          p.id,
          p.code,
          p.title,
          p.description,
          p.department_id,
          p.category,
          p.version,
          p.is_active,
          p.usage_count,
          p.created_at,
          p.updated_at,
          d.name as department_name
        FROM procedures p
        LEFT JOIN departments d ON p.department_id = d.id
        WHERE p.company_id = :companyId
          AND p.is_active = true
        ORDER BY p.usage_count DESC, p.updated_at DESC
        LIMIT 10
      `, {
        replacements: { companyId: user.company_id },
        type: sequelize.QueryTypes.SELECT
      });

      return results;

    } catch (error) {
      // Si hay error (tabla no existe, etc), retornar array vacío
      console.log('[A-MI-PASO] Procedures table not available:', error.message);
      return [];
    }
  }


  /**
   * Calcular score final con boosts
   */
  _calculateScore(result, keywords, user) {
    let score = 0;

    // 1. Match de keywords en título (peso alto: 0.5)
    const titleLower = (result.title || '').toLowerCase();
    const matchedInTitle = keywords.filter(kw => titleLower.includes(kw)).length;
    score += (matchedInTitle / Math.max(keywords.length, 1)) * 0.5;

    // 2. Match de keywords en descripción (peso medio: 0.3)
    const descLower = (result.description || result.content || '').toLowerCase();
    const matchedInDesc = keywords.filter(kw => descLower.includes(kw)).length;
    score += (matchedInDesc / Math.max(keywords.length, 1)) * 0.3;

    // 3. Boost por prioridad de fuente (0.2)
    score += result.priority * 0.2;

    // Aplicar boosts multiplicativos

    // Boost 1: Es mi experiencia (+20%)
    if (result.isMine) {
      score *= 1.2;
    }

    // Boost 2: Es de mi departamento (+15%)
    if (result.related_department_id === user.department_id ||
        result.department_id === user.department_id) {
      score *= 1.15;
    }

    // Boost 3: Reciente (+10% si < 6 meses)
    const createdAt = result.created_at || result.published_at || result.updated_at;
    if (createdAt) {
      const monthsOld = (Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24 * 30);
      if (monthsOld < 6) {
        score *= 1.1;
      }
    }

    // Boost 4: Popular (+5% por cada 10 views hasta max 50%)
    const views = result.views || result.views_count || result.usage_count || 0;
    if (views > 0) {
      const popularityBoost = 1 + Math.min(views / 10, 5) * 0.05;
      score *= popularityBoost;
    }

    // Boost 5: Ya implementado (+10%)
    if (result.status === 'IMPLEMENTED' || result.status === 'AUTO_RESOLVED') {
      score *= 1.1;
    }

    // Normalizar score a rango 0-1
    return Math.min(score, 1);
  }


  /**
   * Generar explicación de relevancia
   */
  _generateRelevanceExplanation(result, keywords, user) {
    const explanations = [];

    // 1. Keywords matcheadas
    const titleLower = (result.title || '').toLowerCase();
    const matchedKeywords = keywords.filter(kw => titleLower.includes(kw));

    if (matchedKeywords.length > 0) {
      explanations.push({
        icon: '✓',
        text: `Coincide: "${matchedKeywords.join('", "')}"`,
        type: 'keyword_match'
      });
    }

    // 2. Departamento
    if (result.related_department_id === user.department_id ||
        result.department_id === user.department_id) {
      explanations.push({
        icon: '✓',
        text: `Tu departamento: ${result.department_name || 'N/A'}`,
        type: 'department_match'
      });
    }

    // 3. Es mío
    if (result.isMine) {
      explanations.push({
        icon: '✓',
        text: 'Es tu propia experiencia/aporte',
        type: 'own_content'
      });
    }

    // 4. Ya fue resuelto
    if (result.status === 'IMPLEMENTED') {
      explanations.push({
        icon: '✓',
        text: 'Ya fue implementado ✅',
        type: 'resolved'
      });
    }

    // 5. Popular
    const views = result.views || result.views_count || result.usage_count || 0;
    if (views > 50) {
      explanations.push({
        icon: '✓',
        text: `Contenido popular (${views} visualizaciones)`,
        type: 'popularity'
      });
    }

    // 6. Reciente
    const createdAt = result.created_at || result.published_at || result.updated_at;
    if (createdAt) {
      const daysOld = (Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24);
      if (daysOld < 30) {
        explanations.push({
          icon: '✓',
          text: 'Actualizado recientemente',
          type: 'recency'
        });
      }
    }

    // 7. Proceso relacionado
    if (result.related_process_id) {
      explanations.push({
        icon: '✓',
        text: 'Vinculado a proceso oficial',
        type: 'has_process'
      });
    }

    return explanations;
  }


  /**
   * Normalizar query (lowercase, sin acentos, trim)
   */
  _normalizeQuery(query) {
    return query
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');  // Eliminar acentos
  }


  /**
   * Extraer keywords del query
   */
  _extractKeywords(query) {
    // Palabras a ignorar (stop words en español)
    const stopWords = [
      'el', 'la', 'de', 'del', 'en', 'y', 'a', 'un', 'una', 'por', 'para',
      'con', 'como', 'que', 'es', 'se', 'al', 'los', 'las', 'lo'
    ];

    return query
      .split(/\s+/)
      .filter(word => word.length > 2)  // Mínimo 3 caracteres
      .filter(word => !stopWords.includes(word))
      .slice(0, 10);  // Máximo 10 keywords
  }


  /**
   * Registrar búsqueda para analytics
   */
  async _logSearch(query, queryNormalized, results, user) {
    try {
      const resultsSummary = {
        procedures: results.filter(r => r.source === 'PROCEDURE').length,
        experiences: results.filter(r => r.source === 'EXPERIENCE').length,
        my_experiences: results.filter(r => r.source === 'MY_EXPERIENCE').length,
        news: results.filter(r => r.source === 'NEWS').length
      };

      await sequelize.query(`
        INSERT INTO a_mi_me_paso_searches (
          company_id,
          user_id,
          query,
          query_normalized,
          results_count,
          results_summary,
          user_department_id,
          search_context,
          created_at
        ) VALUES (
          :companyId,
          :userId,
          :query,
          :queryNormalized,
          :resultsCount,
          :resultsSummary,
          :departmentId,
          'MI_ESPACIO',
          NOW()
        )
      `, {
        replacements: {
          companyId: user.company_id,
          userId: user.id,
          query,
          queryNormalized,
          resultsCount: results.length,
          resultsSummary: JSON.stringify(resultsSummary),
          departmentId: user.department_id || null
        },
        type: sequelize.QueryTypes.INSERT
      });
    } catch (error) {
      console.error('[A-MI-PASO] Error logging search:', error);
      // No fallar si falla el logging
    }
  }


  /**
   * Obtener búsquedas populares
   */
  async getPopularSearches(companyId, days = 7) {
    const results = await sequelize.query(`
      SELECT * FROM get_popular_searches(:companyId, :days, 10)
    `, {
      replacements: { companyId, days },
      type: sequelize.QueryTypes.SELECT
    });

    return results;
  }


  /**
   * Detectar knowledge gaps (búsquedas frecuentes con pocos resultados)
   */
  async detectKnowledgeGaps(companyId) {
    const results = await sequelize.query(`
      SELECT * FROM detect_knowledge_gaps(:companyId, 30, 5, 3)
    `, {
      replacements: { companyId },
      type: sequelize.QueryTypes.SELECT
    });

    return results;
  }


  /**
   * Registrar feedback de búsqueda
   */
  async registerFeedback(searchId, wasHelpful, feedbackComment = null) {
    await sequelize.query(`
      UPDATE a_mi_me_paso_searches
      SET was_helpful = :wasHelpful,
          feedback_comment = :feedbackComment
      WHERE id = :searchId
    `, {
      replacements: { searchId, wasHelpful, feedbackComment },
      type: sequelize.QueryTypes.UPDATE
    });

    return { success: true };
  }
}

module.exports = new AMiPasoService();
