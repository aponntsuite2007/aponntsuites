/**
 * COMPANY DATA EXPORT SERVICE
 * Exporta todos los datos operacionales de una empresa a un ZIP
 * para entrega al cliente antes de la baja definitiva.
 *
 * INCLUYE SISTEMA DE COMPATIBILIDAD PARA RESTAURACIÓN:
 * - Schema snapshot de cada tabla
 * - Fingerprints de estructura para validación
 * - Checksums SHA256 de cada archivo
 * - Versión del sistema al momento del export
 *
 * @version 2.0.0
 * @date 2026-01-28
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Versión del formato de export (para compatibilidad futura)
const EXPORT_FORMAT_VERSION = '2.0.0';
const MIN_COMPATIBILITY_SCORE = 90; // Porcentaje mínimo requerido para restauración

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

      // ═══════════════════════════════════════════════════════════════════
      // METADATA PARA RESTAURACIÓN Y COMPATIBILIDAD
      // ═══════════════════════════════════════════════════════════════════

      // Crear directorio de metadata
      const metadataDir = path.join(tempDir, '_metadata');
      fs.mkdirSync(metadataDir, { recursive: true });

      // 1. Capturar schema snapshot de todas las tablas exportadas
      const schemaSnapshot = await this._captureSchemaSnapshot(Object.keys(recordsByTable));
      fs.writeFileSync(
        path.join(metadataDir, 'schema_snapshot.json'),
        JSON.stringify(schemaSnapshot, null, 2)
      );

      // 2. Generar fingerprints de cada tabla (hash de estructura)
      const fingerprints = this._generateFingerprints(schemaSnapshot);
      fs.writeFileSync(
        path.join(metadataDir, 'table_fingerprints.json'),
        JSON.stringify(fingerprints, null, 2)
      );

      // 3. Calcular checksums de cada archivo exportado
      const fileChecksums = await this._calculateDirectoryChecksums(tempDir);
      fs.writeFileSync(
        path.join(metadataDir, 'file_checksums.json'),
        JSON.stringify(fileChecksums, null, 2)
      );

      // 4. Información del sistema al momento del export
      const systemVersion = await this._getSystemVersion();
      fs.writeFileSync(
        path.join(metadataDir, 'system_version.json'),
        JSON.stringify(systemVersion, null, 2)
      );

      // 5. Manifest de compatibilidad completo
      const compatibilityManifest = {
        export_format_version: EXPORT_FORMAT_VERSION,
        min_compatibility_score: MIN_COMPATIBILITY_SCORE,
        export_timestamp: new Date().toISOString(),
        system_version: systemVersion.app_version,
        database_version: systemVersion.db_version,
        total_tables: Object.keys(schemaSnapshot).length,
        total_columns: Object.values(schemaSnapshot).reduce((sum, t) => sum + t.columns.length, 0),
        tables: Object.keys(schemaSnapshot).map(table => ({
          name: table,
          columns: schemaSnapshot[table].columns.length,
          fingerprint: fingerprints[table],
          records: recordsByTable[table] || 0
        }))
      };
      fs.writeFileSync(
        path.join(metadataDir, 'compatibility_manifest.json'),
        JSON.stringify(compatibilityManifest, null, 2)
      );

      // ═══════════════════════════════════════════════════════════════════
      // RESUMEN PRINCIPAL
      // ═══════════════════════════════════════════════════════════════════

      // Generar resumen
      const summary = {
        company_id: companyId,
        company_name: company.name,
        export_date: new Date().toISOString(),
        export_format_version: EXPORT_FORMAT_VERSION,
        total_records: totalRecords,
        records_by_table: recordsByTable,
        format: format,
        phases_exported: phases.length,
        restoration_compatible: true,
        min_compatibility_for_restore: `${MIN_COMPATIBILITY_SCORE}%`,
        metadata_files: [
          '_metadata/schema_snapshot.json',
          '_metadata/table_fingerprints.json',
          '_metadata/file_checksums.json',
          '_metadata/system_version.json',
          '_metadata/compatibility_manifest.json'
        ]
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

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS DE SCHEMA Y COMPATIBILIDAD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Captura el schema completo de las tablas exportadas
   * @param {string[]} tableNames - Lista de nombres de tablas
   * @returns {Object} Schema snapshot con estructura de cada tabla
   * @private
   */
  async _captureSchemaSnapshot(tableNames) {
    const snapshot = {};

    for (const tableName of tableNames) {
      try {
        // Obtener columnas de la tabla
        const columns = await sequelize.query(`
          SELECT
            column_name,
            data_type,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            is_nullable,
            column_default,
            udt_name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = :tableName
          ORDER BY ordinal_position
        `, { replacements: { tableName }, type: QueryTypes.SELECT });

        if (columns.length === 0) continue;

        // Obtener constraints (PKs, FKs, UNIQUEs)
        const constraints = await sequelize.query(`
          SELECT
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints tc
          LEFT JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          LEFT JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
          WHERE tc.table_schema = 'public' AND tc.table_name = :tableName
        `, { replacements: { tableName }, type: QueryTypes.SELECT });

        // Obtener índices
        const indexes = await sequelize.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE schemaname = 'public' AND tablename = :tableName
        `, { replacements: { tableName }, type: QueryTypes.SELECT });

        snapshot[tableName] = {
          columns: columns.map(c => ({
            name: c.column_name,
            type: c.data_type,
            maxLength: c.character_maximum_length,
            precision: c.numeric_precision,
            scale: c.numeric_scale,
            nullable: c.is_nullable === 'YES',
            default: c.column_default,
            udtName: c.udt_name
          })),
          constraints: constraints.map(c => ({
            name: c.constraint_name,
            type: c.constraint_type,
            column: c.column_name,
            foreignTable: c.foreign_table_name,
            foreignColumn: c.foreign_column_name
          })),
          indexes: indexes.map(i => ({
            name: i.indexname,
            definition: i.indexdef
          })),
          capturedAt: new Date().toISOString()
        };
      } catch (err) {
        console.warn(`⚠️ [Export] No se pudo capturar schema de ${tableName}: ${err.message}`);
      }
    }

    return snapshot;
  }

  /**
   * Genera fingerprints (hashes) de la estructura de cada tabla
   * @param {Object} schemaSnapshot - Schema capturado
   * @returns {Object} { tableName: fingerprint_hash }
   * @private
   */
  _generateFingerprints(schemaSnapshot) {
    const fingerprints = {};

    for (const [tableName, schema] of Object.entries(schemaSnapshot)) {
      // Crear string normalizado de la estructura (solo lo que importa para compatibilidad)
      const structureString = schema.columns
        .map(c => `${c.name}:${c.type}:${c.nullable}:${c.udtName}`)
        .sort()
        .join('|');

      // Generar hash SHA256
      fingerprints[tableName] = crypto
        .createHash('sha256')
        .update(structureString)
        .digest('hex')
        .substring(0, 16); // Solo primeros 16 chars para legibilidad
    }

    return fingerprints;
  }

  /**
   * Calcula checksums SHA256 de todos los archivos en un directorio
   * @param {string} dirPath - Ruta del directorio
   * @returns {Object} { relativePath: sha256_hash }
   * @private
   */
  async _calculateDirectoryChecksums(dirPath) {
    const checksums = {};

    const processDir = (currentPath, basePath) => {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const relativePath = path.relative(basePath, itemPath).replace(/\\/g, '/');
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          processDir(itemPath, basePath);
        } else if (stats.isFile()) {
          const content = fs.readFileSync(itemPath);
          checksums[relativePath] = crypto
            .createHash('sha256')
            .update(content)
            .digest('hex');
        }
      }
    };

    processDir(dirPath, dirPath);
    return checksums;
  }

  /**
   * Obtiene información de versión del sistema
   * @returns {Object} Información de versión
   * @private
   */
  async _getSystemVersion() {
    // Leer package.json
    let appVersion = 'unknown';
    try {
      const pkgPath = path.join(__dirname, '../../package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      appVersion = pkg.version;
    } catch (err) {
      console.warn('⚠️ [Export] No se pudo leer package.json');
    }

    // Obtener versión de PostgreSQL
    let dbVersion = 'unknown';
    try {
      const [result] = await sequelize.query('SELECT version()', { type: QueryTypes.SELECT });
      dbVersion = result.version.split(' ')[1]; // "PostgreSQL 15.2 ..." -> "15.2"
    } catch (err) {
      console.warn('⚠️ [Export] No se pudo obtener versión de PostgreSQL');
    }

    // Obtener conteo total de tablas en el schema public
    let totalTables = 0;
    try {
      const [result] = await sequelize.query(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'",
        { type: QueryTypes.SELECT }
      );
      totalTables = parseInt(result.count);
    } catch (err) { /* ignore */ }

    return {
      app_version: appVersion,
      app_name: 'attendance-system-backend',
      db_version: dbVersion,
      db_dialect: 'postgresql',
      export_format_version: EXPORT_FORMAT_VERSION,
      node_version: process.version,
      platform: process.platform,
      total_tables_in_db: totalTables,
      exported_at: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDACIÓN DE COMPATIBILIDAD PARA RESTAURACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Valida la compatibilidad de un ZIP de export con el schema actual
   * USAR ANTES DE INTENTAR RESTAURAR UNA EMPRESA
   *
   * @param {string} zipPath - Ruta al archivo ZIP de export
   * @returns {Object} { compatible, score, details, errors, warnings }
   */
  async validateCompatibility(zipPath) {
    const AdmZip = require('adm-zip');
    const result = {
      compatible: false,
      score: 0,
      minRequired: MIN_COMPATIBILITY_SCORE,
      details: {
        tablesChecked: 0,
        tablesCompatible: 0,
        tablesMissing: 0,
        columnsChecked: 0,
        columnsCompatible: 0,
        columnsIncompatible: 0,
        columnsNew: 0,
        columnsRemoved: 0
      },
      tableResults: [],
      errors: [],
      warnings: []
    };

    try {
      // Abrir ZIP
      if (!fs.existsSync(zipPath)) {
        result.errors.push(`Archivo no encontrado: ${zipPath}`);
        return result;
      }

      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();

      // Buscar manifest de compatibilidad
      const manifestEntry = zipEntries.find(e => e.entryName === '_metadata/compatibility_manifest.json');
      if (!manifestEntry) {
        result.errors.push('ZIP no contiene _metadata/compatibility_manifest.json - Export incompatible o versión antigua');
        return result;
      }

      const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));

      // Buscar schema snapshot
      const schemaEntry = zipEntries.find(e => e.entryName === '_metadata/schema_snapshot.json');
      if (!schemaEntry) {
        result.errors.push('ZIP no contiene _metadata/schema_snapshot.json');
        return result;
      }

      const exportedSchema = JSON.parse(schemaEntry.getData().toString('utf8'));

      // Verificar versión del formato de export
      if (manifest.export_format_version !== EXPORT_FORMAT_VERSION) {
        result.warnings.push(
          `Versión de formato diferente: Export=${manifest.export_format_version}, Actual=${EXPORT_FORMAT_VERSION}`
        );
      }

      // Capturar schema actual de las tablas que estaban en el export
      const tableNames = Object.keys(exportedSchema);
      const currentSchema = await this._captureSchemaSnapshot(tableNames);

      // Comparar cada tabla
      for (const tableName of tableNames) {
        const exportedTable = exportedSchema[tableName];
        const currentTable = currentSchema[tableName];

        result.details.tablesChecked++;

        const tableResult = {
          table: tableName,
          compatible: true,
          score: 100,
          exportedColumns: exportedTable?.columns?.length || 0,
          currentColumns: currentTable?.columns?.length || 0,
          issues: []
        };

        if (!currentTable) {
          // Tabla ya no existe en el sistema actual
          tableResult.compatible = false;
          tableResult.score = 0;
          tableResult.issues.push('Tabla no existe en el sistema actual');
          result.details.tablesMissing++;
          result.warnings.push(`Tabla ${tableName} no existe en el sistema actual`);
        } else {
          // Comparar columnas
          const exportedCols = new Map(exportedTable.columns.map(c => [c.name, c]));
          const currentCols = new Map(currentTable.columns.map(c => [c.name, c]));

          let compatibleCols = 0;
          let incompatibleCols = 0;

          // Verificar columnas del export en el schema actual
          for (const [colName, exportedCol] of exportedCols) {
            result.details.columnsChecked++;
            const currentCol = currentCols.get(colName);

            if (!currentCol) {
              // Columna fue removida del sistema actual
              result.details.columnsRemoved++;
              tableResult.issues.push(`Columna ${colName} fue eliminada`);
              result.warnings.push(`${tableName}.${colName}: columna eliminada (dato se perdería)`);
              incompatibleCols++;
            } else if (!this._areColumnsCompatible(exportedCol, currentCol)) {
              // Tipos incompatibles
              result.details.columnsIncompatible++;
              tableResult.issues.push(
                `Columna ${colName}: tipo incompatible (${exportedCol.type} → ${currentCol.type})`
              );
              result.errors.push(
                `${tableName}.${colName}: tipo incompatible ${exportedCol.type} → ${currentCol.type}`
              );
              incompatibleCols++;
            } else {
              result.details.columnsCompatible++;
              compatibleCols++;
            }
          }

          // Verificar columnas nuevas en el sistema actual
          for (const [colName, currentCol] of currentCols) {
            if (!exportedCols.has(colName)) {
              result.details.columnsNew++;
              if (!currentCol.nullable && !currentCol.default) {
                // Nueva columna NOT NULL sin default = INCOMPATIBLE
                tableResult.issues.push(
                  `Nueva columna ${colName} es NOT NULL sin default`
                );
                result.errors.push(
                  `${tableName}.${colName}: nueva columna NOT NULL sin default - BLOQUEANTE`
                );
                incompatibleCols++;
              } else {
                // Nueva columna con NULL o default = OK
                result.warnings.push(
                  `${tableName}.${colName}: nueva columna (se llenará con ${currentCol.default || 'NULL'})`
                );
              }
            }
          }

          // Calcular score de la tabla
          const totalCols = exportedCols.size + incompatibleCols;
          tableResult.score = totalCols > 0
            ? Math.round((compatibleCols / totalCols) * 100)
            : 100;

          tableResult.compatible = tableResult.score >= MIN_COMPATIBILITY_SCORE;

          if (tableResult.compatible) {
            result.details.tablesCompatible++;
          }
        }

        result.tableResults.push(tableResult);
      }

      // Calcular score global
      const totalScore = result.tableResults.reduce((sum, t) => sum + t.score, 0);
      result.score = result.tableResults.length > 0
        ? Math.round(totalScore / result.tableResults.length)
        : 0;

      result.compatible = result.score >= MIN_COMPATIBILITY_SCORE && result.errors.length === 0;

      // Resumen final
      if (result.compatible) {
        console.log(`✅ [Compatibility] ZIP compatible (score: ${result.score}%)`);
      } else {
        console.log(`❌ [Compatibility] ZIP INCOMPATIBLE (score: ${result.score}%, min: ${MIN_COMPATIBILITY_SCORE}%)`);
      }

      return result;
    } catch (err) {
      result.errors.push(`Error al validar ZIP: ${err.message}`);
      return result;
    }
  }

  /**
   * Compara si dos definiciones de columna son compatibles para restauración
   * @private
   */
  _areColumnsCompatible(exportedCol, currentCol) {
    // Mismo tipo exacto = compatible
    if (exportedCol.type === currentCol.type && exportedCol.udtName === currentCol.udtName) {
      return true;
    }

    // Mapeo de tipos compatibles (upgrades seguros)
    const compatibleUpgrades = {
      'integer': ['bigint'],
      'smallint': ['integer', 'bigint'],
      'real': ['double precision'],
      'character varying': ['text'],
      'varchar': ['text'],
      'timestamp without time zone': ['timestamp with time zone'],
    };

    const upgrades = compatibleUpgrades[exportedCol.type] || [];
    if (upgrades.includes(currentCol.type)) {
      return true;
    }

    // Tipos incompatibles por defecto
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════════

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
