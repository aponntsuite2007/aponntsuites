/**
 * ═══════════════════════════════════════════════════════════
 * SSOT ANALYZER - Single Source of Truth Analyzer
 * ═══════════════════════════════════════════════════════════
 *
 * Rastreala FUENTE ÚNICA DE VERDAD de cada campo/dato:
 *
 * 1. ¿De dónde viene el valor? (BD, API, cálculo, usuario)
 * 2. ¿Quién es el DUEÑO del dato? (tabla, servicio, módulo)
 * 3. ¿Es DERIVADO o PRIMARIO?
 * 4. ¿Hay MÚLTIPLES FUENTES? (violación SSOT)
 * 5. ¿Hay CONFLICTOS entre fuentes?
 * 6. Generar MAPA DE SSOT visual
 */

const { Pool } = require('pg');

/**
 * Cliente SSOT Analyzer
 */
class SSOTAnalyzer {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'attendance_system',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'Aedr15150302'
    });

    // Mapa de campos conocidos y su SSOT
    this.knownSSOT = {
      // DATOS DE USUARIO
      user_id: {
        source: 'database',
        table: 'users',
        column: 'user_id',
        type: 'primary',
        owner: 'users-module',
        writable: false, // UUID auto-generado
        description: 'ID único del usuario'
      },
      nombre: {
        source: 'database',
        table: 'users',
        column: 'nombre',
        type: 'primary',
        owner: 'users-module',
        writable: true,
        validations: ['required', 'string', 'max:255']
      },
      email: {
        source: 'database',
        table: 'users',
        column: 'email',
        type: 'primary',
        owner: 'users-module',
        writable: true,
        validations: ['required', 'email', 'unique']
      },
      dni: {
        source: 'database',
        table: 'users',
        column: 'dni',
        type: 'primary',
        owner: 'users-module',
        writable: true,
        validations: ['numeric', 'unique', 'min:7', 'max:8']
      },
      role: {
        source: 'database',
        table: 'users',
        column: 'role',
        type: 'primary',
        owner: 'users-module',
        writable: true,
        validations: ['enum:admin,operator,employee']
      },
      company_id: {
        source: 'database',
        table: 'users',
        column: 'company_id',
        type: 'foreign_key',
        owner: 'companies-module',
        references: {
          table: 'companies',
          column: 'company_id'
        },
        writable: true
      },

      // DATOS CALCULADOS
      edad: {
        source: 'calculated',
        formula: 'CURRENT_DATE - fecha_nacimiento',
        type: 'derived',
        owner: 'users-module',
        writable: false,
        dependencies: ['fecha_nacimiento']
      },
      antiguedad: {
        source: 'calculated',
        formula: 'CURRENT_DATE - fecha_ingreso',
        type: 'derived',
        owner: 'users-module',
        writable: false,
        dependencies: ['fecha_ingreso']
      },

      // DATOS DE RELACIÓN
      department_id: {
        source: 'database',
        table: 'users',
        column: 'department_id',
        type: 'foreign_key',
        owner: 'departments-module',
        references: {
          table: 'departments',
          column: 'department_id'
        },
        writable: true
      }
    };
  }

  /**
   * ANALIZAR SSOT DE UN CAMPO
   * Determina de dónde viene realmente el valor
   */
  async analyzeFieldSSOT(fieldName, currentValue, userId = null) {
    console.log(`\n🔍 [SSOT] Analizando campo: ${fieldName}...`);

    const analysis = {
      fieldName,
      currentValue,
      ssot: null,
      sources: [],
      conflicts: [],
      violations: []
    };

    // 1. Buscar en el mapa conocido
    if (this.knownSSOT[fieldName]) {
      analysis.ssot = this.knownSSOT[fieldName];
      console.log(`   ✅ SSOT conocido: ${analysis.ssot.source} (${analysis.ssot.table || 'N/A'})`);
    }

    // 2. Si tiene userId, verificar valor en BD
    if (userId && analysis.ssot?.table) {
      try {
        // MEJORA #9: Usar nombre correcto de columna según tabla
        // - users: user_id (snake_case)
        // - attendances: "UserId" (camelCase quoted por Sequelize)
        const userIdColumn = analysis.ssot.table === 'attendances' ? '"UserId"' : 'user_id';

        const query = `SELECT ${analysis.ssot.column} FROM ${analysis.ssot.table} WHERE ${userIdColumn} = $1`;
        const result = await this.pool.query(query, [userId]);

        if (result.rows.length > 0) {
          const dbValue = result.rows[0][analysis.ssot.column];

          analysis.sources.push({
            type: 'database',
            table: analysis.ssot.table,
            value: dbValue
          });

          // Verificar conflicto entre valor en pantalla vs BD
          if (String(currentValue) !== String(dbValue)) {
            analysis.conflicts.push({
              source1: { type: 'ui', value: currentValue },
              source2: { type: 'database', value: dbValue },
              severity: 'HIGH',
              message: 'Valor en UI no coincide con BD'
            });
            console.log(`   ⚠️  CONFLICTO: UI="${currentValue}" vs BD="${dbValue}"`);
          }
        }
      } catch (err) {
        console.log(`   ⚠️  Error consultando BD: ${err.message}`);
      }
    }

    // 3. Si es campo calculado, verificar fórmula
    if (analysis.ssot?.type === 'derived') {
      analysis.sources.push({
        type: 'calculated',
        formula: analysis.ssot.formula,
        dependencies: analysis.ssot.dependencies
      });
      console.log(`   📐 Campo CALCULADO: ${analysis.ssot.formula}`);
    }

    // 4. Detectar violaciones SSOT
    if (analysis.sources.length > 1) {
      analysis.violations.push({
        type: 'MULTIPLE_SOURCES',
        severity: 'MEDIUM',
        message: `Campo tiene ${analysis.sources.length} fuentes de verdad`,
        sources: analysis.sources.map(s => s.type)
      });
    }

    return analysis;
  }

  /**
   * DETECTAR CONFLICTOS ENTRE TABS
   * Un campo puede aparecer en múltiples tabs - debe tener el mismo valor
   */
  async detectCrossTabConflicts(page, fieldName, tabSelectors) {
    console.log(`\n🔍 [SSOT] Detectando conflictos cross-tab para: ${fieldName}...`);

    const values = {};
    const conflicts = [];

    for (const { tabName, selector } of tabSelectors) {
      try {
        // Navegar al tab
        await page.click(`button:has-text("${tabName}")`);
        await page.waitForTimeout(300);

        // Obtener valor
        const value = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return el ? el.value : null;
        }, selector);

        values[tabName] = value;

      } catch (err) {
        console.log(`   ⚠️  Error en tab ${tabName}: ${err.message}`);
      }
    }

    // Comparar valores
    const uniqueValues = [...new Set(Object.values(values).filter(v => v !== null))];

    if (uniqueValues.length > 1) {
      conflicts.push({
        field: fieldName,
        tabs: Object.keys(values),
        values: values,
        severity: 'CRITICAL',
        message: `Campo "${fieldName}" tiene diferentes valores en ${uniqueValues.length} tabs`
      });
      console.log(`   ⚠️  CONFLICTO CRÍTICO: ${fieldName} tiene ${uniqueValues.length} valores distintos`);
    } else {
      console.log(`   ✅ Sin conflictos - Valor consistente: "${uniqueValues[0]}"`);
    }

    return conflicts;
  }

  /**
   * MAPEAR TODAS LAS FUENTES DE VERDAD
   * Genera un mapa completo de SSOT del módulo
   */
  async mapAllSSOT(fieldsToAnalyze, userId = null) {
    console.log('\n═══════════════════════════════════════════');
    console.log('🗺️  SSOT ANALYZER - MAPEANDO FUENTES DE VERDAD');
    console.log('═══════════════════════════════════════════\n');

    const map = {
      fields: {},
      summary: {
        totalFields: 0,
        primarySources: 0,
        derivedFields: 0,
        conflicts: 0,
        violations: 0
      }
    };

    for (const { fieldName, currentValue } of fieldsToAnalyze) {
      const analysis = await this.analyzeFieldSSOT(fieldName, currentValue, userId);
      map.fields[fieldName] = analysis;

      // Actualizar summary
      map.summary.totalFields++;
      if (analysis.ssot?.type === 'primary') map.summary.primarySources++;
      if (analysis.ssot?.type === 'derived') map.summary.derivedFields++;
      map.summary.conflicts += analysis.conflicts.length;
      map.summary.violations += analysis.violations.length;
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('📊 SSOT ANALYZER - RESUMEN');
    console.log('═══════════════════════════════════════════');
    console.log(`Total campos: ${map.summary.totalFields}`);
    console.log(`Fuentes primarias: ${map.summary.primarySources}`);
    console.log(`Campos derivados: ${map.summary.derivedFields}`);
    console.log(`Conflictos detectados: ${map.summary.conflicts}`);
    console.log(`Violaciones SSOT: ${map.summary.violations}`);
    console.log('═══════════════════════════════════════════\n');

    return map;
  }

  /**
   * GENERAR DIAGRAMA DE SSOT (formato Mermaid)
   */
  generateSSOTDiagram(ssotMap) {
    let mermaid = 'graph LR\n';

    Object.entries(ssotMap.fields).forEach(([fieldName, analysis]) => {
      if (!analysis.ssot) return;

      const ssot = analysis.ssot;

      if (ssot.source === 'database') {
        mermaid += `    DB["${ssot.table}"] -->|${ssot.column}| ${fieldName}\n`;
      } else if (ssot.source === 'calculated') {
        mermaid += `    CALC["Cálculo: ${ssot.formula}"] --> ${fieldName}\n`;
        ssot.dependencies?.forEach(dep => {
          mermaid += `    ${dep} --> CALC\n`;
        });
      } else if (ssot.source === 'api') {
        mermaid += `    API["${ssot.endpoint}"] --> ${fieldName}\n`;
      }

      // Marcar conflictos
      if (analysis.conflicts.length > 0) {
        mermaid += `    ${fieldName}[["${fieldName} ⚠️"]]\n`;
        mermaid += `    style ${fieldName} fill:#f99\n`;
      }
    });

    return mermaid;
  }

  /**
   * REGISTRAR EN KNOWLEDGE BASE
   * Guardar SSOT en la KB para que el IA Assistant lo use
   */
  async registerInKnowledgeBase(ssotMap) {
    console.log(`\n🧠 [SSOT] Registrando mapa SSOT en Knowledge Base...`);

    try {
      for (const [fieldName, analysis] of Object.entries(ssotMap.fields)) {
        if (!analysis.ssot) continue;

        const question = `¿De dónde viene el dato "${fieldName}" en el módulo de usuarios?`;
        const answer = analysis.ssot.source === 'database' ?
          `El campo "${fieldName}" viene de la tabla "${analysis.ssot.table}", columna "${analysis.ssot.column}". Es un dato ${analysis.ssot.type === 'primary' ? 'primario' : 'derivado'}.` :
          `El campo "${fieldName}" es un campo calculado con la fórmula: ${analysis.ssot.formula}`;

        const query = `
          INSERT INTO assistant_knowledge_base (
            question,
            answer,
            context,
            source,
            relevance_score,
            times_used
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (question)
          DO UPDATE SET
            answer = EXCLUDED.answer,
            updated_at = NOW()
        `;

        await this.pool.query(query, [
          question,
          answer,
          'ssot-analysis',
          'e2e-testing-ssot-analyzer',
          0.95, // Alta relevancia
          0
        ]);
      }

      console.log(`   ✅ ${Object.keys(ssotMap.fields).length} campos registrados en KB`);

    } catch (err) {
      console.log(`   ⚠️  Error registrando en KB: ${err.message}`);
    }
  }

  /**
   * Cerrar conexión
   */
  async close() {
    await this.pool.end();
  }
}

/**
 * Helper rápido para análisis de un campo
 */
async function analyzeSingleField(fieldName, currentValue, userId = null) {
  const analyzer = new SSOTAnalyzer();
  const result = await analyzer.analyzeFieldSSOT(fieldName, currentValue, userId);
  await analyzer.close();
  return result;
}

/**
 * Helper rápido para análisis completo
 */
async function analyzeAllFields(fieldsToAnalyze, userId = null) {
  const analyzer = new SSOTAnalyzer();
  const map = await analyzer.mapAllSSOT(fieldsToAnalyze, userId);
  await analyzer.registerInKnowledgeBase(map);
  await analyzer.close();
  return map;
}

module.exports = {
  SSOTAnalyzer,
  analyzeSingleField,
  analyzeAllFields
};
