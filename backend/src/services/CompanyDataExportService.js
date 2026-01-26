/**
 * COMPANY DATA EXPORT SERVICE
 * Exporta todos los datos operacionales de una empresa a un ZIP
 * para entrega al cliente antes de la baja definitiva.
 *
 * @version 1.0.0
 * @date 2026-01-24
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Directorio temporal para exports
const EXPORTS_DIR = path.join(__dirname, '../../exports');

/**
 * Definición de tablas operacionales a exportar, agrupadas por categoría.
 * Las tablas administrativas/financieras NO se exportan (se conservan en BD).
 */
const EXPORT_TABLES = {
  // FASE 1: Datos biométricos y privacidad crítica
  privacy_critical: [
    { table: 'users', fk: 'company_id', label: 'Usuarios' },
    { table: 'biometric_data', fk: null, join: 'JOIN users u ON biometric_data.user_id = u.user_id WHERE u.company_id = :companyId', label: 'Datos Biométricos' },
    { table: 'facial_biometric_data', fk: 'company_id', label: 'Datos Biométricos Faciales' },
    { table: 'biometric_consents', fk: 'company_id', label: 'Consentimientos Biométricos' },
    { table: 'medical_records', fk: 'company_id', label: 'Registros Médicos' },
    { table: 'user_medical_exams', fk: 'company_id', label: 'Exámenes Médicos' },
    { table: 'user_medical_advanced', fk: 'company_id', label: 'Datos Médicos Avanzados' },
    { table: 'user_medical_documents', fk: 'company_id', label: 'Documentos Médicos' },
    { table: 'user_allergies', fk: 'company_id', label: 'Alergias' },
    { table: 'user_chronic_conditions', fk: 'company_id', label: 'Condiciones Crónicas' },
    { table: 'user_vaccinations', fk: 'company_id', label: 'Vacunaciones' },
    { table: 'employee_locations', fk: 'company_id', label: 'Ubicaciones GPS' }
  ],

  // FASE 2: Datos de alto volumen
  high_volume: [
    { table: 'attendances', fk: 'company_id', label: 'Fichajes/Asistencia' },
    { table: 'attendance_batches', fk: 'company_id', label: 'Lotes de Asistencia' },
    { table: 'attendance_patterns', fk: 'company_id', label: 'Patrones de Asistencia' },
    { table: 'attendance_profiles', fk: 'company_id', label: 'Perfiles de Asistencia' },
    { table: 'attendance_analytics_caches', fk: 'company_id', label: 'Cache de Analíticas' },
    { table: 'notifications', fk: 'company_id', label: 'Notificaciones' },
    { table: 'notification_actions_logs', fk: 'company_id', label: 'Logs de Acciones' },
    { table: 'document_access_logs', fk: 'company_id', label: 'Logs de Acceso a Documentos' },
    { table: 'user_audit_logs', fk: 'company_id', label: 'Logs de Auditoría' }
  ],

  // FASE 3: Estructura organizacional
  organizational: [
    { table: 'departments', fk: 'company_id', label: 'Departamentos' },
    { table: 'branches', fk: 'company_id', label: 'Sucursales' },
    { table: 'shifts', fk: 'company_id', label: 'Turnos' },
    { table: 'kiosks', fk: 'company_id', label: 'Kioscos' },
    { table: 'additional_role_types', fk: 'company_id', label: 'Tipos de Rol' },
    { table: 'organizational_positions', fk: 'company_id', label: 'Posiciones Organizacionales' }
  ],

  // FASE 4: Datos de empleados
  employee_data: [
    { table: 'user_documents', fk: 'company_id', label: 'Documentos de Empleados' },
    { table: 'user_work_history', fk: 'company_id', label: 'Historial Laboral' },
    { table: 'user_education', fk: 'company_id', label: 'Educación' },
    { table: 'user_professional_licenses', fk: 'company_id', label: 'Licencias Profesionales' },
    { table: 'user_driver_licenses', fk: 'company_id', label: 'Licencias de Conducir' },
    { table: 'user_children', fk: 'company_id', label: 'Hijos' },
    { table: 'user_family_members', fk: 'company_id', label: 'Familia' },
    { table: 'user_shift_assignments', fk: 'company_id', label: 'Asignaciones de Turno' },
    { table: 'user_salary_configs', fk: 'company_id', label: 'Configuración Salarial' },
    { table: 'user_salary_advanced', fk: 'company_id', label: 'Adelantos Salariales' },
    { table: 'user_work_restrictions', fk: 'company_id', label: 'Restricciones Laborales' },
    { table: 'user_activity_restrictions', fk: 'company_id', label: 'Restricciones de Actividad' },
    { table: 'user_union_affiliations', fk: 'company_id', label: 'Afiliaciones Sindicales' },
    { table: 'user_disciplinary_actions', fk: 'company_id', label: 'Acciones Disciplinarias' },
    { table: 'user_legal_issues', fk: 'company_id', label: 'Asuntos Legales' }
  ],

  // FASE 5: Operaciones
  operations: [
    { table: 'sanctions', fk: 'company_id', label: 'Sanciones' },
    { table: 'vacation_requests', fk: 'company_id', label: 'Solicitudes de Vacaciones' },
    { table: 'extraordinary_licenses', fk: 'company_id', label: 'Licencias Extraordinarias' },
    { table: 'visitors', fk: 'company_id', label: 'Visitantes' },
    { table: 'visitor_gps_trackings', fk: 'company_id', label: 'GPS de Visitantes' },
    { table: 'access_notifications', fk: 'company_id', label: 'Notificaciones de Acceso' },
    { table: 'trainings', fk: 'company_id', label: 'Capacitaciones' },
    { table: 'training_assignments', fk: 'company_id', label: 'Asignaciones de Capacitación' },
    { table: 'training_progresses', fk: 'company_id', label: 'Progreso de Capacitación' },
    { table: 'support_tickets', fk: 'company_id', label: 'Tickets de Soporte' },
    { table: 'company_tasks', fk: 'company_id', label: 'Tareas' },
    { table: 'administrative_tasks', fk: 'company_id', label: 'Tareas Administrativas' },
    { table: 'experience_recognitions', fk: 'company_id', label: 'Reconocimientos' },
    { table: 'experience_comments', fk: 'company_id', label: 'Comentarios de Experiencia' },
    { table: 'emotional_analyses', fk: 'company_id', label: 'Análisis Emocional' },
    { table: 'scoring_histories', fk: 'company_id', label: 'Historial de Scoring' }
  ],

  // FASE 6: Documentos y DMS
  documents: [
    { table: 'documents', fk: 'company_id', label: 'Documentos DMS' },
    { table: 'document_versions', fk: 'company_id', label: 'Versiones de Documentos' },
    { table: 'document_metadata', fk: 'company_id', label: 'Metadata de Documentos' },
    { table: 'document_permissions', fk: 'company_id', label: 'Permisos de Documentos' },
    { table: 'document_requests', fk: 'company_id', label: 'Solicitudes de Documentos' },
    { table: 'document_alerts', fk: 'company_id', label: 'Alertas de Documentos' }
  ],

  // FASE 7: Payroll y compensaciones
  payroll: [
    { table: 'commissions', fk: 'company_id', label: 'Comisiones' },
    { table: 'commission_liquidations', fk: 'company_id', label: 'Liquidaciones de Comisiones' },
    { table: 'commission_payments', fk: 'company_id', label: 'Pagos de Comisiones' },
    { table: 'payroll_runs', fk: 'company_id', label: 'Corridas de Nómina' },
    { table: 'user_payroll_assignments', fk: 'company_id', label: 'Asignaciones de Nómina' },
    { table: 'user_payroll_bonuses', fk: 'company_id', label: 'Bonificaciones' }
  ],

  // FASE 8: EPP y seguridad
  safety: [
    { table: 'epp_deliveries', fk: 'company_id', label: 'Entregas de EPP' },
    { table: 'epp_inspections', fk: 'company_id', label: 'Inspecciones de EPP' },
    { table: 'epp_catalogs', fk: 'company_id', label: 'Catálogo EPP' },
    { table: 'epp_categories', fk: 'company_id', label: 'Categorías EPP' },
    { table: 'epp_role_requirements', fk: 'company_id', label: 'Requisitos EPP por Rol' }
  ],

  // FASE 9: Configuraciones operativas
  configs: [
    { table: 'company_modules', fk: 'company_id', label: 'Módulos Activos' },
    { table: 'notification_templates', fk: 'company_id', label: 'Templates de Notificación' },
    { table: 'notification_workflows', fk: 'company_id', label: 'Workflows de Notificación' },
    { table: 'vacation_configurations', fk: 'company_id', label: 'Configuración de Vacaciones' },
    { table: 'vacation_scales', fk: 'company_id', label: 'Escalas de Vacaciones' },
    { table: 'payroll_templates', fk: 'company_id', label: 'Templates de Nómina' },
    { table: 'payroll_concept_types', fk: 'company_id', label: 'Conceptos de Nómina' },
    { table: 'company_risk_configs', fk: 'company_id', label: 'Configuración de Riesgos' },
    { table: 'hse_company_configs', fk: 'company_id', label: 'Configuración HSE' },
    { table: 'consent_definitions', fk: 'company_id', label: 'Definiciones de Consentimiento' },
    { table: 'assistant_conversations', fk: 'company_id', label: 'Conversaciones IA' }
  ]
};

class CompanyDataExportService {

  /**
   * Exporta TODOS los datos operacionales de una empresa a un ZIP
   * @param {number} companyId - ID de la empresa
   * @param {Object} options - Opciones de exportación
   * @param {string} options.format - 'json' o 'csv' (default: 'json')
   * @param {Function} options.onProgress - Callback de progreso (phase, table, count)
   * @returns {Object} { zipPath, totalRecords, recordsByTable, sizeMB }
   */
  async exportAll(companyId, options = {}) {
    const format = options.format || 'json';
    const onProgress = options.onProgress || (() => {});

    // Asegurar que existe el directorio de exports
    if (!fs.existsSync(EXPORTS_DIR)) {
      fs.mkdirSync(EXPORTS_DIR, { recursive: true });
    }

    // Obtener info de la empresa para el nombre del archivo
    const [company] = await sequelize.query(
      'SELECT name, slug FROM companies WHERE company_id = :companyId',
      { replacements: { companyId }, type: QueryTypes.SELECT }
    );

    if (!company) {
      throw new Error(`Empresa con ID ${companyId} no encontrada`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const zipFileName = `export_${company.slug || companyId}_${timestamp}.zip`;
    const zipPath = path.join(EXPORTS_DIR, zipFileName);
    const tempDir = path.join(EXPORTS_DIR, `temp_${companyId}_${Date.now()}`);

    // Crear directorio temporal
    fs.mkdirSync(tempDir, { recursive: true });

    const recordsByTable = {};
    let totalRecords = 0;

    try {
      // Iterar por cada fase de exportación
      const phases = Object.keys(EXPORT_TABLES);

      for (let phaseIdx = 0; phaseIdx < phases.length; phaseIdx++) {
        const phaseName = phases[phaseIdx];
        const tables = EXPORT_TABLES[phaseName];

        // Crear subdirectorio por fase
        const phaseDir = path.join(tempDir, `${String(phaseIdx + 1).padStart(2, '0')}_${phaseName}`);
        fs.mkdirSync(phaseDir, { recursive: true });

        for (const tableDef of tables) {
          try {
            const count = await this._exportTable(companyId, tableDef, phaseDir, format);
            if (count > 0) {
              recordsByTable[tableDef.table] = count;
              totalRecords += count;
            }
            onProgress(phaseName, tableDef.table, count);
          } catch (tableError) {
            // Si una tabla no existe, logear y continuar
            console.warn(`⚠️ [Export] Tabla ${tableDef.table} no encontrada o error: ${tableError.message}`);
            recordsByTable[tableDef.table] = { error: tableError.message };
          }
        }
      }

      // Generar resumen
      const summary = {
        company_id: companyId,
        company_name: company.name,
        export_date: new Date().toISOString(),
        total_records: totalRecords,
        records_by_table: recordsByTable,
        format: format,
        phases_exported: phases.length
      };

      fs.writeFileSync(
        path.join(tempDir, 'EXPORT_SUMMARY.json'),
        JSON.stringify(summary, null, 2)
      );

      // Comprimir en ZIP
      await this._createZip(tempDir, zipPath);

      // Obtener tamaño del ZIP
      const zipStats = fs.statSync(zipPath);
      const sizeMB = (zipStats.size / 1024 / 1024).toFixed(2);

      console.log(`✅ [Export] Empresa ${companyId}: ${totalRecords} registros exportados (${sizeMB} MB)`);

      return {
        zipPath,
        zipFileName,
        totalRecords,
        recordsByTable,
        sizeMB: parseFloat(sizeMB)
      };
    } finally {
      // Limpiar directorio temporal
      this._cleanupDir(tempDir);
    }
  }

  /**
   * Exporta una tabla individual
   * @private
   */
  async _exportTable(companyId, tableDef, outputDir, format) {
    let query;

    if (tableDef.join) {
      // Query customizada (para tablas sin FK directo a company_id)
      query = `SELECT ${tableDef.table}.* FROM ${tableDef.table} ${tableDef.join}`;
    } else if (tableDef.fk) {
      query = `SELECT * FROM ${tableDef.table} WHERE ${tableDef.fk} = :companyId`;
    } else {
      return 0;
    }

    const rows = await sequelize.query(query, {
      replacements: { companyId },
      type: QueryTypes.SELECT
    });

    if (rows.length === 0) return 0;

    const fileName = `${tableDef.table}.${format}`;
    const filePath = path.join(outputDir, fileName);

    if (format === 'csv') {
      const csv = this._toCSV(rows);
      fs.writeFileSync(filePath, csv, 'utf8');
    } else {
      fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf8');
    }

    return rows.length;
  }

  /**
   * Convierte array de objetos a CSV
   * @private
   */
  _toCSV(rows) {
    if (rows.length === 0) return '';

    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];

    for (const row of rows) {
      const values = headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      lines.push(values.join(','));
    }

    return lines.join('\n');
  }

  /**
   * Crea un archivo ZIP desde un directorio
   * @private
   */
  _createZip(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Elimina recursivamente un directorio temporal
   * @private
   */
  _cleanupDir(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`⚠️ [Export] No se pudo limpiar ${dirPath}: ${err.message}`);
    }
  }

  /**
   * Limpia exports antiguos (> daysOld días)
   * @param {number} daysOld - Días de antigüedad para borrar
   * @returns {number} Cantidad de archivos eliminados
   */
  cleanupOldExports(daysOld = 30) {
    if (!fs.existsSync(EXPORTS_DIR)) return 0;

    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let deleted = 0;

    const files = fs.readdirSync(EXPORTS_DIR);
    for (const file of files) {
      if (!file.endsWith('.zip')) continue;
      const filePath = path.join(EXPORTS_DIR, file);
      const stats = fs.statSync(filePath);
      if (stats.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`🗑️ [Export] ${deleted} exports antiguos eliminados`);
    }

    return deleted;
  }
}

module.exports = new CompanyDataExportService();
