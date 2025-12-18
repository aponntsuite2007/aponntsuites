/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COUNTRY REGULATION SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * SSOT para regulaciones de privacidad y seguridad laboral por país.
 * Determina: modo de alertas, retención de datos, requisitos de consentimiento.
 *
 * Fuente primaria: BD (country_safety_regulations)
 */

class CountryRegulationService {
  constructor(database) {
    this.db = database;
    this.cache = new Map();
    this.CACHE_TTL = 30 * 60 * 1000; // 30 minutos
  }

  /**
   * SSOT: Obtener regulación por país
   */
  async getByCountry(countryCode) {
    if (!countryCode) return this.getDefaultRegulation();

    const code = countryCode.toUpperCase();

    // Check cache
    const cached = this.cache.get(code);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    // SSOT: Leer desde BD
    const query = `
      SELECT * FROM country_safety_regulations
      WHERE country_code = $1 AND is_active = true
    `;
    const result = await this.db.query(query, [code]);

    if (result.rows.length === 0) {
      console.log(`[HSE] Regulación no encontrada para ${code}, usando default conservador`);
      return this.getDefaultRegulation(code);
    }

    const regulation = result.rows[0];

    // Cache
    this.cache.set(code, {
      data: regulation,
      expiry: Date.now() + this.CACHE_TTL
    });

    return regulation;
  }

  /**
   * Regulación por defecto (conservadora)
   */
  getDefaultRegulation(countryCode = 'XX') {
    return {
      country_code: countryCode,
      country_name: 'País no configurado',
      allows_individual_tracking: false,
      requires_explicit_consent: true,
      consent_renewal_days: 365,
      image_retention_max_days: 7,
      detection_retention_max_days: 30,
      alert_mode: 'AGGREGATE_ONLY',
      legal_framework: 'Regulación no configurada - modo conservador aplicado',
      regulatory_body: null
    };
  }

  /**
   * Obtener todas las regulaciones
   */
  async getAllRegulations() {
    const query = `
      SELECT * FROM country_safety_regulations
      WHERE is_active = true
      ORDER BY country_name
    `;
    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * SSOT: Determinar modo de alerta según regulación y consentimiento
   * @returns {Object} { mode: 'INDIVIDUAL'|'ANONYMOUS'|'AGGREGATE_ONLY', reason: string }
   */
  async determineAlertMode(employeeId, branchId) {
    // 1. Obtener país de la sucursal
    const branchQuery = `
      SELECT b.id, b.country_code, b.company_id
      FROM branches b
      WHERE b.id = $1
    `;
    const branchResult = await this.db.query(branchQuery, [branchId]);

    if (branchResult.rows.length === 0) {
      return { mode: 'AGGREGATE_ONLY', reason: 'branch_not_found' };
    }

    const branch = branchResult.rows[0];
    const countryCode = branch.country_code || 'XX';

    // 2. Obtener regulación (SSOT)
    const regulation = await this.getByCountry(countryCode);

    // 3. Si no permite tracking individual, retornar modo agregado
    if (!regulation.allows_individual_tracking) {
      return {
        mode: 'AGGREGATE_ONLY',
        reason: 'country_regulation_prohibits',
        legal_framework: regulation.legal_framework
      };
    }

    // 4. Si requiere consentimiento, verificar si empleado lo dio
    if (regulation.requires_explicit_consent) {
      const hasConsent = await this.checkEmployeeConsent(employeeId, 'PPE_MONITORING');

      if (!hasConsent) {
        return {
          mode: 'ANONYMOUS',
          reason: 'no_consent',
          legal_framework: regulation.legal_framework
        };
      }
    }

    // 5. Tiene consentimiento válido
    return {
      mode: 'INDIVIDUAL',
      reason: 'consent_valid',
      legal_framework: regulation.legal_framework
    };
  }

  /**
   * Verificar consentimiento del empleado
   */
  async checkEmployeeConsent(employeeId, consentType = 'PPE_MONITORING') {
    const query = `
      SELECT id, consent_given, consent_date, consent_expires
      FROM employee_ppe_consents
      WHERE employee_id = $1
        AND consent_type = $2
        AND consent_given = true
        AND revoked = false
        AND (consent_expires IS NULL OR consent_expires > NOW())
      ORDER BY consent_date DESC
      LIMIT 1
    `;
    const result = await this.db.query(query, [employeeId, consentType]);
    return result.rows.length > 0;
  }

  /**
   * Obtener configuración de retención para un país
   */
  async getRetentionConfig(countryCode) {
    const regulation = await this.getByCountry(countryCode);
    return {
      imageRetentionDays: regulation.image_retention_max_days,
      detectionRetentionDays: regulation.detection_retention_max_days,
      deleteImagesAfterRetention: true
    };
  }

  /**
   * Registrar consentimiento del empleado
   */
  async registerConsent(employeeId, companyId, consentData) {
    const {
      consentGiven,
      documentVersion,
      documentHash,
      ipAddress,
      userAgent,
      expiresInDays
    } = consentData;

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const query = `
      INSERT INTO employee_ppe_consents (
        company_id, employee_id, consent_type,
        consent_given, consent_date, consent_expires,
        consent_document_version, consent_document_hash,
        ip_address, user_agent
      ) VALUES ($1, $2, 'PPE_MONITORING', $3, NOW(), $4, $5, $6, $7, $8)
      ON CONFLICT (company_id, employee_id, consent_type)
      DO UPDATE SET
        consent_given = EXCLUDED.consent_given,
        consent_date = NOW(),
        consent_expires = EXCLUDED.consent_expires,
        consent_document_version = EXCLUDED.consent_document_version,
        consent_document_hash = EXCLUDED.consent_document_hash,
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        revoked = false,
        revoked_at = NULL,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await this.db.query(query, [
      companyId,
      employeeId,
      consentGiven,
      expiresAt,
      documentVersion,
      documentHash,
      ipAddress,
      userAgent
    ]);

    return result.rows[0];
  }

  /**
   * Revocar consentimiento
   */
  async revokeConsent(employeeId, reason = null) {
    const query = `
      UPDATE employee_ppe_consents
      SET
        revoked = true,
        revoked_at = NOW(),
        revocation_reason = $2,
        updated_at = NOW()
      WHERE employee_id = $1
        AND consent_type = 'PPE_MONITORING'
        AND revoked = false
      RETURNING *
    `;

    const result = await this.db.query(query, [employeeId, reason]);
    return result.rows[0];
  }

  /**
   * Obtener estado de consentimiento de todos los empleados de una empresa
   */
  async getCompanyConsentStatus(companyId) {
    const query = `
      SELECT
        e.id as employee_id,
        e.first_name,
        e.last_name,
        e.email,
        c.consent_given,
        c.consent_date,
        c.consent_expires,
        c.revoked,
        CASE
          WHEN c.id IS NULL THEN 'NOT_REQUESTED'
          WHEN c.revoked THEN 'REVOKED'
          WHEN c.consent_given = false THEN 'DENIED'
          WHEN c.consent_expires < NOW() THEN 'EXPIRED'
          WHEN c.consent_given = true THEN 'ACTIVE'
          ELSE 'UNKNOWN'
        END as consent_status
      FROM employees e
      LEFT JOIN employee_ppe_consents c ON e.id = c.employee_id AND c.consent_type = 'PPE_MONITORING'
      WHERE e.company_id = $1 AND e.is_active = true
      ORDER BY e.last_name, e.first_name
    `;

    const result = await this.db.query(query, [companyId]);
    return result.rows;
  }

  /**
   * Generar documento de consentimiento para un país
   */
  async getConsentDocument(countryCode, companyName) {
    const regulation = await this.getByCountry(countryCode);

    return {
      title: `Consentimiento para Monitoreo de Equipos de Protección Personal (EPP)`,
      version: '1.0',
      country: regulation.country_name,
      legalFramework: regulation.legal_framework,
      regulatoryBody: regulation.regulatory_body,
      content: this.generateConsentText(regulation, companyName),
      dataRetention: {
        images: `${regulation.image_retention_max_days} días`,
        detections: `${regulation.detection_retention_max_days} días`
      },
      renewalRequired: regulation.consent_renewal_days
        ? `Cada ${regulation.consent_renewal_days} días`
        : 'No requiere renovación'
    };
  }

  /**
   * Generar texto de consentimiento según regulación
   */
  generateConsentText(regulation, companyName) {
    return `
CONSENTIMIENTO INFORMADO PARA MONITOREO DE EPP

Empresa: ${companyName}
País: ${regulation.country_name}
Marco Legal: ${regulation.legal_framework}

Por medio del presente documento, autorizo expresamente a ${companyName} a:

1. MONITOREO MEDIANTE CÁMARAS
   Utilizar sistemas de cámaras con inteligencia artificial para detectar el uso
   de Equipos de Protección Personal (EPP) en las instalaciones de trabajo.

2. RECOPILACIÓN DE DATOS
   - Imágenes: Se almacenarán por un máximo de ${regulation.image_retention_max_days} días
   - Registros de detección: Se almacenarán por un máximo de ${regulation.detection_retention_max_days} días

3. FINALIDAD
   El único propósito es garantizar la seguridad laboral y el cumplimiento
   de las normas de seguridad e higiene.

4. DERECHOS DEL TITULAR
   Conforme a ${regulation.legal_framework}, tengo derecho a:
   - Acceder a mis datos personales
   - Solicitar rectificación de datos inexactos
   - Solicitar eliminación de mis datos
   - Revocar este consentimiento en cualquier momento

5. REVOCACIÓN
   Puedo revocar este consentimiento en cualquier momento sin consecuencias
   negativas para mi relación laboral.

${regulation.consent_renewal_days ? `
6. VIGENCIA
   Este consentimiento tiene una vigencia de ${regulation.consent_renewal_days} días
   a partir de la fecha de firma.
` : ''}

Declaro que he leído y comprendido este documento y otorgo mi consentimiento
de manera libre, específica, informada e inequívoca.
    `.trim();
  }

  /**
   * Invalidar cache
   */
  invalidateCache(countryCode = null) {
    if (countryCode) {
      this.cache.delete(countryCode.toUpperCase());
    } else {
      this.cache.clear();
    }
  }
}

module.exports = CountryRegulationService;
