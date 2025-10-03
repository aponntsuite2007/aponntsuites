/**
 * 🔍 FACE DUPLICATE DETECTOR - SISTEMA ANTI-DUPLICADOS REAL
 * ========================================================
 * Detección de rostros duplicados usando comparación de templates Face-API.js
 * Evita registro de la misma persona en diferentes usuarios
 * Compatible con templates 128D reales
 */

const { sequelize } = require('../config/database');
const crypto = require('crypto');

class FaceDuplicateDetector {
  constructor() {
    this.duplicateThreshold = 0.6; // Umbral de similitud (0.6 = 60% similar)
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default_key_32_chars_long_secure!';

    console.log('🔍 [DUPLICATE-DETECTOR] Sistema anti-duplicados inicializado');
  }

  /**
   * 🎯 Verificar si un template ya existe en la base de datos
   */
  async checkForDuplicates(newTemplate, companyId, excludeUserId = null) {
    try {
      console.log('🔍 [DUPLICATE-DETECTOR] Verificando duplicados...');

      // Obtener todos los templates de la empresa
      const existingTemplates = await this.getCompanyTemplates(companyId, excludeUserId);

      if (existingTemplates.length === 0) {
        console.log('✅ [DUPLICATE-DETECTOR] No hay templates para comparar');
        return { isDuplicate: false, matches: [] };
      }

      console.log(`🔍 [DUPLICATE-DETECTOR] Comparando con ${existingTemplates.length} templates existentes`);

      const matches = [];

      for (const existingTemplate of existingTemplates) {
        try {
          // Desencriptar template existente
          const decryptedTemplate = this.decryptTemplate(existingTemplate.encrypted_template);

          // Calcular similitud entre templates
          const similarity = this.calculateSimilarity(newTemplate, decryptedTemplate);

          console.log(`🔍 [DUPLICATE-DETECTOR] Similitud con usuario ${existingTemplate.employee_id}: ${(similarity * 100).toFixed(1)}%`);

          // Si supera el umbral, es un duplicado
          if (similarity >= this.duplicateThreshold) {
            matches.push({
              employeeId: existingTemplate.employee_id,
              similarity: similarity,
              templateId: existingTemplate.id,
              registeredAt: existingTemplate.created_at,
              userInfo: existingTemplate.user_info || {}
            });
          }

        } catch (templateError) {
          console.warn(`⚠️ [DUPLICATE-DETECTOR] Error procesando template ${existingTemplate.id}:`, templateError.message);
          continue;
        }
      }

      const isDuplicate = matches.length > 0;

      if (isDuplicate) {
        console.log(`🚨 [DUPLICATE-DETECTOR] DUPLICADO DETECTADO! ${matches.length} coincidencia(s)`);
        matches.forEach(match => {
          console.log(`   • Usuario: ${match.employeeId}, Similitud: ${(match.similarity * 100).toFixed(1)}%`);
        });
      } else {
        console.log('✅ [DUPLICATE-DETECTOR] No se detectaron duplicados');
      }

      return {
        isDuplicate,
        matches,
        threshold: this.duplicateThreshold,
        totalChecked: existingTemplates.length
      };

    } catch (error) {
      console.error('❌ [DUPLICATE-DETECTOR] Error verificando duplicados:', error);
      return {
        isDuplicate: false,
        matches: [],
        error: error.message
      };
    }
  }

  /**
   * 📊 Obtener templates de la empresa para comparación
   */
  async getCompanyTemplates(companyId, excludeUserId = null) {
    try {
      let whereClause = 'bt.company_id = :companyId';
      const replacements = { companyId };

      if (excludeUserId) {
        whereClause += ' AND bt.employee_id != :excludeUserId';
        replacements.excludeUserId = excludeUserId;
      }

      const query = `
        SELECT
          bt.id,
          bt.employee_id,
          bt.embedding_encrypted as encrypted_template,
          bt.capture_timestamp as created_at,
          'Usuario' as "firstName",
          bt.employee_id as "lastName",
          'test@email.com' as email
        FROM biometric_templates bt
        WHERE ${whereClause}
        ORDER BY bt.capture_timestamp DESC
      `;

      const templates = await sequelize.query(query, {
        type: sequelize.QueryTypes.SELECT,
        replacements
      });

      return templates.map(template => ({
        ...template,
        user_info: {
          firstName: template.firstName,
          lastName: template.lastName,
          email: template.email,
          fullName: `${template.firstName || ''} ${template.lastName || ''}`.trim()
        }
      }));

    } catch (error) {
      console.error('❌ [DUPLICATE-DETECTOR] Error obteniendo templates:', error);
      return [];
    }
  }

  /**
   * 🔐 Desencriptar template biométrico
   */
  decryptTemplate(encryptedTemplate) {
    try {
      // Separar IV y datos encriptados
      const parts = encryptedTemplate.split(':');
      if (parts.length !== 2) {
        throw new Error('Formato de template encriptado inválido');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encryptedData = Buffer.from(parts[1], 'hex');

      // Crear decipher
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);

      // Desencriptar
      let decrypted = decipher.update(encryptedData, null, 'utf8');
      decrypted += decipher.final('utf8');

      // Parsear JSON
      const templateData = JSON.parse(decrypted);

      // Validar formato del template
      if (!templateData.embedding || !Array.isArray(templateData.embedding)) {
        throw new Error('Template no contiene embedding válido');
      }

      return templateData.embedding;

    } catch (error) {
      console.error('❌ [DUPLICATE-DETECTOR] Error desencriptando template:', error);
      throw new Error('Error desencriptando template: ' + error.message);
    }
  }

  /**
   * 📏 Calcular similitud entre dos templates usando distancia euclidiana
   */
  calculateSimilarity(template1, template2) {
    try {
      // Validar que ambos templates tengan el mismo tamaño
      if (!Array.isArray(template1) || !Array.isArray(template2)) {
        throw new Error('Templates deben ser arrays');
      }

      if (template1.length !== template2.length) {
        throw new Error(`Templates tienen diferente tamaño: ${template1.length} vs ${template2.length}`);
      }

      if (template1.length !== 128) {
        throw new Error(`Template debe tener 128 dimensiones, tiene: ${template1.length}`);
      }

      // Calcular distancia euclidiana
      let distance = 0;
      for (let i = 0; i < template1.length; i++) {
        const diff = template1[i] - template2[i];
        distance += diff * diff;
      }
      distance = Math.sqrt(distance);

      // Convertir distancia a similitud (0-1)
      // Distancia menor = mayor similitud
      // Usamos una función exponencial inversa para mapear distancia a similitud
      const similarity = Math.exp(-distance * 2);

      return Math.min(Math.max(similarity, 0), 1); // Clamp entre 0 y 1

    } catch (error) {
      console.error('❌ [DUPLICATE-DETECTOR] Error calculando similitud:', error);
      return 0;
    }
  }

  /**
   * ⚙️ Configurar umbral de duplicados
   */
  setDuplicateThreshold(threshold) {
    if (threshold >= 0 && threshold <= 1) {
      this.duplicateThreshold = threshold;
      console.log(`⚙️ [DUPLICATE-DETECTOR] Umbral actualizado: ${(threshold * 100).toFixed(1)}%`);
    } else {
      console.warn('⚠️ [DUPLICATE-DETECTOR] Umbral debe estar entre 0 y 1');
    }
  }

  /**
   * 📊 Obtener estadísticas de duplicados
   */
  async getDuplicateStatistics(companyId) {
    try {
      const query = `
        SELECT
          COUNT(*) as total_templates,
          COUNT(DISTINCT employee_id) as unique_employees,
          COUNT(*) - COUNT(DISTINCT employee_id) as potential_duplicates
        FROM biometric_templates
        WHERE company_id = :companyId
      `;

      const result = await sequelize.query(query, {
        type: sequelize.QueryTypes.SELECT,
        replacements: { companyId }
      });

      return {
        totalTemplates: parseInt(result[0].total_templates),
        uniqueEmployees: parseInt(result[0].unique_employees),
        potentialDuplicates: parseInt(result[0].potential_duplicates),
        duplicateRatio: result[0].total_templates > 0 ?
          (result[0].potential_duplicates / result[0].total_templates) : 0
      };

    } catch (error) {
      console.error('❌ [DUPLICATE-DETECTOR] Error obteniendo estadísticas:', error);
      return {
        totalTemplates: 0,
        uniqueEmployees: 0,
        potentialDuplicates: 0,
        duplicateRatio: 0,
        error: error.message
      };
    }
  }

  /**
   * 🗑️ Eliminar template biométrico
   */
  async deleteTemplate(templateId, companyId) {
    try {
      console.log(`🗑️ [DUPLICATE-DETECTOR] Eliminando template ${templateId} de empresa ${companyId}`);

      const result = await sequelize.query(
        'DELETE FROM biometric_templates WHERE id = :templateId AND company_id = :companyId',
        {
          type: sequelize.QueryTypes.DELETE,
          replacements: { templateId, companyId }
        }
      );

      if (result[1] > 0) {
        console.log(`✅ [DUPLICATE-DETECTOR] Template ${templateId} eliminado exitosamente`);
        return { success: true, message: 'Template eliminado' };
      } else {
        console.log(`⚠️ [DUPLICATE-DETECTOR] Template ${templateId} no encontrado`);
        return { success: false, message: 'Template no encontrado' };
      }

    } catch (error) {
      console.error('❌ [DUPLICATE-DETECTOR] Error eliminando template:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔄 Reasignar template a otro usuario
   */
  async reassignTemplate(templateId, newEmployeeId, companyId) {
    try {
      console.log(`🔄 [DUPLICATE-DETECTOR] Reasignando template ${templateId} a usuario ${newEmployeeId}`);

      const result = await sequelize.query(
        'UPDATE biometric_templates SET employee_id = :newEmployeeId WHERE id = :templateId AND company_id = :companyId',
        {
          type: sequelize.QueryTypes.UPDATE,
          replacements: { templateId, newEmployeeId, companyId }
        }
      );

      if (result[1] > 0) {
        console.log(`✅ [DUPLICATE-DETECTOR] Template ${templateId} reasignado a ${newEmployeeId}`);
        return { success: true, message: 'Template reasignado' };
      } else {
        console.log(`⚠️ [DUPLICATE-DETECTOR] Template ${templateId} no encontrado`);
        return { success: false, message: 'Template no encontrado' };
      }

    } catch (error) {
      console.error('❌ [DUPLICATE-DETECTOR] Error reasignando template:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const faceDuplicateDetector = new FaceDuplicateDetector();

module.exports = {
  FaceDuplicateDetector,
  faceDuplicateDetector
};