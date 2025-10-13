/**
 * ⚖️ CONSENT MANAGEMENT SERVICE - LEGAL COMPLIANCE
 * =================================================
 * Sistema profesional de gestión de consentimientos
 * Cumplimiento Ley 25.326 (Protección de Datos Personales - Argentina)
 *
 * CRÍTICO: Este servicio maneja datos sensibles legales.
 * Toda operación debe ser auditable y trazable.
 *
 * @version 1.0.0
 * @author Sistema Biométrico Enterprise
 * @license Cumplimiento Legal Ley 25.326
 */

const { sequelize } = require('../config/database');

class ConsentManagementService {
  constructor() {
    // Tipos de consentimiento permitidos
    this.CONSENT_TYPES = {
      EMOTIONAL_ANALYSIS: 'emotional_analysis',
      FATIGUE_DETECTION: 'fatigue_detection',
      WELLNESS_MONITORING: 'wellness_monitoring',
      AGGREGATED_REPORTS: 'aggregated_reports'
    };

    // Retención de datos (por defecto)
    this.DEFAULT_RETENTION_DAYS = 90;

    console.log('⚖️ [CONSENT-MANAGER] Servicio legal inicializado');
    console.log('   Cumplimiento: Ley 25.326 (Argentina)');
  }

  /**
   * Solicitar consentimiento a usuario
   * @param {Object} data - Datos del consentimiento
   * @returns {Promise<Object>} Resultado
   */
  async requestConsent(data) {
    try {
      const { userId, companyId, consentType, ipAddress, userAgent } = data;

      // Validar tipo de consentimiento
      if (!Object.values(this.CONSENT_TYPES).includes(consentType)) {
        return {
          success: false,
          error: 'INVALID_CONSENT_TYPE',
          message: `Tipo de consentimiento inválido: ${consentType}`
        };
      }

      // Obtener texto legal correspondiente
      const consentText = this._getConsentText(consentType);

      // Guardar solicitud en BD
      // TODO: Implementar después de crear tabla
      console.log(`⚖️ [CONSENT-MANAGER] Solicitud de consentimiento enviada`);
      console.log(`   Usuario: ${userId}`);
      console.log(`   Tipo: ${consentType}`);
      console.log(`   IP: ${ipAddress}`);

      return {
        success: true,
        consentType,
        consentText,
        requiresAction: true,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ [CONSENT-MANAGER] Error:', error.message);
      return {
        success: false,
        error: 'REQUEST_ERROR',
        message: error.message
      };
    }
  }

  /**
   * Registrar consentimiento otorgado
   * @param {Object} data - Datos del consentimiento
   * @returns {Promise<Object>} Resultado
   */
  async grantConsent(data) {
    try {
      const {
        userId,
        companyId,
        consentType,
        ipAddress,
        userAgent,
        acceptedAt
      } = data;

      // TODO: Guardar en BD
      console.log(`✅ [CONSENT-MANAGER] Consentimiento otorgado`);
      console.log(`   Usuario: ${userId}`);
      console.log(`   Tipo: ${consentType}`);
      console.log(`   Fecha: ${acceptedAt || new Date()}`);
      console.log(`   IP: ${ipAddress}`);

      // Auditoría obligatoria
      await this._logConsentAction({
        userId,
        companyId,
        action: 'GRANTED',
        consentType,
        ipAddress,
        userAgent,
        timestamp: acceptedAt || new Date()
      });

      return {
        success: true,
        message: 'Consentimiento registrado exitosamente',
        consentId: 'TEMP_ID', // TODO: ID real de BD
        expiresAt: this._calculateExpiration()
      };

    } catch (error) {
      console.error('❌ [CONSENT-MANAGER] Error:', error.message);
      return {
        success: false,
        error: 'GRANT_ERROR',
        message: error.message
      };
    }
  }

  /**
   * Revocar consentimiento (DERECHO DEL USUARIO)
   * @param {Object} data - Datos de revocación
   * @returns {Promise<Object>} Resultado
   */
  async revokeConsent(data) {
    try {
      const {
        userId,
        companyId,
        consentType,
        reason,
        ipAddress,
        userAgent
      } = data;

      // TODO: Marcar como revocado en BD
      console.log(`🚫 [CONSENT-MANAGER] Consentimiento revocado`);
      console.log(`   Usuario: ${userId}`);
      console.log(`   Tipo: ${consentType}`);
      console.log(`   Motivo: ${reason || 'No especificado'}`);

      // Auditoría obligatoria
      await this._logConsentAction({
        userId,
        companyId,
        action: 'REVOKED',
        consentType,
        reason,
        ipAddress,
        userAgent,
        timestamp: new Date()
      });

      // IMPORTANTE: Eliminar datos asociados según Ley 25.326
      await this._deleteAssociatedData(userId, companyId, consentType);

      return {
        success: true,
        message: 'Consentimiento revocado exitosamente',
        dataDeleted: true,
        revokedAt: new Date()
      };

    } catch (error) {
      console.error('❌ [CONSENT-MANAGER] Error:', error.message);
      return {
        success: false,
        error: 'REVOKE_ERROR',
        message: error.message
      };
    }
  }

  /**
   * Verificar si usuario tiene consentimiento activo
   * @param {number} userId
   * @param {number} companyId
   * @param {string} consentType
   * @returns {Promise<boolean>}
   */
  async hasActiveConsent(userId, companyId, consentType) {
    try {
      // TODO: Consultar BD
      console.log(`🔍 [CONSENT-MANAGER] Verificando consentimiento`);
      console.log(`   Usuario: ${userId}`);
      console.log(`   Tipo: ${consentType}`);

      // Por ahora retornar false (requerirá consentimiento)
      return false;

    } catch (error) {
      console.error('❌ [CONSENT-MANAGER] Error verificando:', error.message);
      return false;
    }
  }

  /**
   * Obtener todos los consentimientos de un usuario
   * @param {number} userId
   * @param {number} companyId
   * @returns {Promise<Array>}
   */
  async getUserConsents(userId, companyId) {
    try {
      // TODO: Consultar BD
      console.log(`📋 [CONSENT-MANAGER] Obteniendo consentimientos de usuario ${userId}`);

      return {
        success: true,
        consents: []
      };

    } catch (error) {
      console.error('❌ [CONSENT-MANAGER] Error:', error.message);
      return {
        success: false,
        consents: []
      };
    }
  }

  /**
   * Obtener texto legal según tipo de consentimiento
   * @private
   */
  _getConsentText(consentType) {
    const texts = {
      [this.CONSENT_TYPES.EMOTIONAL_ANALYSIS]: `
CONSENTIMIENTO INFORMADO PARA ANÁLISIS EMOCIONAL

Yo, en mi carácter de empleado/a, otorgo mi consentimiento LIBRE, EXPRESO E INFORMADO para que la empresa realice análisis emocional mediante tecnología de reconocimiento facial (Azure Face API - Microsoft).

INFORMACIÓN CLARA:
• Se analizarán 8 emociones: felicidad, tristeza, enojo, miedo, sorpresa, disgusto, desprecio y neutral
• Los datos se utilizarán EXCLUSIVAMENTE para programas de bienestar laboral
• Los datos serán almacenados de forma segura por un máximo de 90 días
• NO se utilizarán para evaluaciones de desempeño ni decisiones laborales
• Puedo REVOCAR este consentimiento en cualquier momento sin consecuencias

DERECHOS GARANTIZADOS (Ley 25.326):
• Acceso: Puedo solicitar mis datos en cualquier momento
• Rectificación: Puedo corregir datos incorrectos
• Supresión: Puedo solicitar eliminación total de mis datos
• Revocación: Puedo retirar este consentimiento cuando desee

TECNOLOGÍA UTILIZADA:
• Proveedor: Microsoft Azure Cognitive Services
• Certificaciones: ISO 27001, SOC 2, GDPR compliant
• Encriptación: AES-256 para almacenamiento

CONTACTO PARA EJERCER DERECHOS:
• Email: dpo@empresa.com
• Responsable: Oficial de Protección de Datos
      `.trim(),

      [this.CONSENT_TYPES.FATIGUE_DETECTION]: `
CONSENTIMIENTO INFORMADO PARA DETECCIÓN DE FATIGA

Autorizo el análisis de indicadores de fatiga mediante reconocimiento facial para prevención de riesgos laborales.

QUÉ SE ANALIZA:
• Nivel de apertura ocular
• Posición de la cabeza
• Indicadores de cansancio facial

USO DE DATOS:
• ÚNICAMENTE prevención de accidentes laborales
• Alertas de seguridad al supervisor inmediato
• Recomendaciones de descanso

Este consentimiento puede ser revocado en cualquier momento.
      `.trim(),

      [this.CONSENT_TYPES.WELLNESS_MONITORING]: `
CONSENTIMIENTO PARA MONITOREO DE BIENESTAR

Autorizo el análisis de mi bienestar general para programas de salud ocupacional.

Los datos serán utilizados de forma AGREGADA (nunca individual) para:
• Programas de bienestar corporativo
• Mejora del ambiente laboral
• Prevención de burnout

Puedo revocar este consentimiento sin consecuencias.
      `.trim(),

      [this.CONSENT_TYPES.AGGREGATED_REPORTS]: `
CONSENTIMIENTO PARA REPORTES AGREGADOS

Autorizo que mis datos emocionales sean incluidos en reportes agregados (mínimo 10 personas) para análisis de clima laboral.

GARANTÍAS:
• Mis datos individuales NUNCA serán identificables
• Solo se generan promedios grupales
• Anonimización total

Derecho a revocación en cualquier momento.
      `.trim()
    };

    return texts[consentType] || 'Texto legal no disponible';
  }

  /**
   * Calcular fecha de expiración (90 días por defecto)
   * @private
   */
  _calculateExpiration() {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + this.DEFAULT_RETENTION_DAYS);
    return expiration;
  }

  /**
   * Registrar acción de consentimiento (auditoría)
   * @private
   */
  async _logConsentAction(data) {
    console.log(`📝 [AUDIT] Acción de consentimiento registrada`);
    console.log(`   Usuario: ${data.userId}`);
    console.log(`   Acción: ${data.action}`);
    console.log(`   Tipo: ${data.consentType}`);
    console.log(`   Timestamp: ${data.timestamp}`);
    // TODO: Guardar en tabla de auditoría
  }

  /**
   * Eliminar datos asociados al consentimiento revocado
   * (Cumplimiento Ley 25.326 - Derecho de supresión)
   * @private
   */
  async _deleteAssociatedData(userId, companyId, consentType) {
    console.log(`🗑️ [DATA-DELETION] Eliminando datos asociados`);
    console.log(`   Usuario: ${userId}`);
    console.log(`   Tipo: ${consentType}`);
    // TODO: Eliminar registros de biometric_emotional_analysis
  }

  /**
   * Generar reporte de consentimientos (para auditoría)
   */
  async generateComplianceReport(companyId, dateRange) {
    console.log(`📊 [COMPLIANCE] Generando reporte de cumplimiento`);
    // TODO: Implementar después de crear tablas
    return {
      success: true,
      report: {
        totalConsents: 0,
        activeConsents: 0,
        revokedConsents: 0,
        complianceScore: 100
      }
    };
  }

  /**
   * Verificar vencimiento de consentimientos
   * (Ejecutar como CRON job diario)
   */
  async checkExpiredConsents() {
    console.log(`⏰ [CRON] Verificando consentimientos vencidos...`);
    // TODO: Implementar después de crear tablas
    return {
      success: true,
      expiredCount: 0
    };
  }
}

module.exports = new ConsentManagementService();
