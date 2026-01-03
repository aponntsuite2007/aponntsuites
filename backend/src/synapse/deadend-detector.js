/**
 * DEADEND DETECTOR - Detecta callejones sin salida y cadenas rotas
 *
 * Identifica cuando:
 * 1. Un select está vacío (falta SSOT configurado)
 * 2. Una acción no produce resultado (botón no responde)
 * 3. Dependencias entre módulos rotas
 * 4. Circuitos de datos incompletos
 */

const fs = require('fs');
const path = require('path');

class DeadendDetector {
  constructor() {
    this.discoveryDir = path.join(__dirname, '..', '..', 'tests', 'e2e', 'discovery-results');
  }

  /**
   * Detecta callejones sin salida en un módulo
   */
  async detectDeadends(page, moduleKey, discovery) {
    const deadends = [];

    console.log(`\n🔍 Detectando callejones sin salida en ${moduleKey}...`);

    // 1. Verificar selects vacíos (SSOT no configurado)
    const emptySelects = await this.detectEmptySelects(page, discovery);
    deadends.push(...emptySelects);

    // 2. Verificar botones que no responden
    const unresponsiveButtons = await this.detectUnresponsiveButtons(page, discovery);
    deadends.push(...unresponsiveButtons);

    // 3. Verificar dependencias rotas entre módulos
    const brokenDependencies = await this.detectBrokenDependencies(discovery);
    deadends.push(...brokenDependencies);

    // 4. Verificar circuitos de datos incompletos
    const brokenCircuits = await this.detectBrokenCircuits(discovery);
    deadends.push(...brokenCircuits);

    return deadends;
  }

  /**
   * Detecta selects vacíos (falta configurar SSOT)
   */
  async detectEmptySelects(page, discovery) {
    const emptySelects = [];

    for (const modal of discovery.modals) {
      if (modal.type !== 'CREATE') continue;

      for (const field of modal.fields) {
        if (field.tagName !== 'select') continue;

        try {
          // Buscar el select en el DOM
          const selector = this.generateFieldSelector(field);
          const optionsCount = await page.locator(`${selector} option`).count();

          // Si tiene solo 1 opción (el placeholder) o 0, es un callejón sin salida
          if (optionsCount <= 1) {
            emptySelects.push({
              type: 'EMPTY_SELECT',
              severity: 'HIGH',
              field: field.label,
              selector,
              modal: modal.type,
              reason: 'Select vacío - probablemente falta configurar SSOT',
              suggestedFix: `Verificar que el SSOT para "${field.label}" esté configurado en el backend`,
              impact: 'Test no podrá completar CREATE porque campo required está vacío'
            });

            console.log(`   ❌ [DEADEND] Select vacío: ${field.label}`);
          }
        } catch (error) {
          // Select no encontrado, pero no es crítico aquí
        }
      }
    }

    return emptySelects;
  }

  /**
   * Detecta botones que no responden (no tienen handler o handler roto)
   */
  async detectUnresponsiveButtons(page, discovery) {
    const unresponsive = [];

    for (const action of discovery.actions) {
      if (action.type === 'UNKNOWN') continue;

      try {
        // Verificar si el botón tiene onclick handler
        if (!action.onclick || action.onclick.trim() === '') {
          unresponsive.push({
            type: 'NO_HANDLER',
            severity: 'MEDIUM',
            button: action.text,
            reason: 'Botón sin handler onclick',
            suggestedFix: `Agregar handler onclick al botón "${action.text}"`,
            impact: 'Botón no hace nada cuando se hace click'
          });

          console.log(`   ⚠️  [DEADEND] Botón sin handler: ${action.text}`);
        }

        // TODO: Verificar si el handler existe en el código JS
        // (requiere parsear el JS del módulo)

      } catch (error) {
        // Error no crítico
      }
    }

    return unresponsive;
  }

  /**
   * Detecta dependencias rotas entre módulos
   */
  async detectBrokenDependencies(discovery) {
    const broken = [];

    for (const modal of discovery.modals) {
      for (const field of modal.fields) {
        if (field.tagName !== 'select') continue;

        // Detectar dependencias por nombre de campo
        const dependency = this.detectFieldDependency(field);

        if (dependency) {
          // Verificar si el módulo dependiente existe y tiene datos
          const dependencyExists = await this.verifyDependencyExists(dependency.module);

          if (!dependencyExists) {
            broken.push({
              type: 'BROKEN_DEPENDENCY',
              severity: 'HIGH',
              field: field.label,
              dependsOn: dependency.module,
              reason: `Campo "${field.label}" depende de módulo "${dependency.module}" que no está configurado`,
              suggestedFix: `1. Configurar módulo "${dependency.module}" primero\n2. Agregar al menos 1 registro en "${dependency.module}"\n3. Verificar relación FK en base de datos`,
              impact: 'Select estará vacío, test fallará si campo es required',
              testOrder: `El test de "${discovery.module}" debe ejecutarse DESPUÉS de "${dependency.module}"`
            });

            console.log(`   ❌ [BROKEN_CHAIN] ${field.label} depende de ${dependency.module} (no configurado)`);
          }
        }
      }
    }

    return broken;
  }

  /**
   * Detecta circuitos de datos rotos
   */
  async detectBrokenCircuits(discovery) {
    const circuits = [];

    // Ejemplo: Modal CREATE tiene campo "Empleado", pero no hay empleados creados
    // El test debe crear datos en orden correcto

    for (const modal of discovery.modals) {
      const requiredDependencies = [];

      for (const field of modal.fields) {
        const dep = this.detectFieldDependency(field);
        if (dep && field.required) {
          requiredDependencies.push(dep.module);
        }
      }

      if (requiredDependencies.length > 0) {
        circuits.push({
          type: 'DATA_CIRCUIT',
          severity: 'INFO',
          module: discovery.module,
          modal: modal.type,
          requiredDataFrom: requiredDependencies,
          reason: `Módulo requiere datos de: ${requiredDependencies.join(', ')}`,
          suggestedFix: `Orden de ejecución de tests:\n${requiredDependencies.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n${requiredDependencies.length + 1}. ${discovery.module}`,
          impact: 'Si se ejecuta sin dependencias, test fallará'
        });

        console.log(`   ℹ️  [CIRCUIT] ${discovery.module} requiere: ${requiredDependencies.join(', ')}`);
      }
    }

    return circuits;
  }

  /**
   * Detecta dependencia de un campo por su nombre
   */
  detectFieldDependency(field) {
    const label = (field.label || field.name || '').toLowerCase();

    // Mapeo de campos a módulos dependientes
    const dependencyMap = {
      'departamento': { module: 'departments', field: 'department_id' },
      'department': { module: 'departments', field: 'department_id' },
      'turno': { module: 'shifts', field: 'shift_id' },
      'shift': { module: 'shifts', field: 'shift_id' },
      'rol': { module: 'roles-and-permissions', field: 'role_id' },
      'role': { module: 'roles-and-permissions', field: 'role_id' },
      'kiosco': { module: 'kiosks', field: 'kiosk_id' },
      'kiosk': { module: 'kiosks', field: 'kiosk_id' },
      'empleado': { module: 'users', field: 'employee_id' },
      'employee': { module: 'users', field: 'employee_id' },
      'user': { module: 'users', field: 'user_id' },
      'usuario': { module: 'users', field: 'user_id' },
      'convenio': { module: 'collective-bargaining-agreements', field: 'cba_id' },
      'cct': { module: 'collective-bargaining-agreements', field: 'cba_id' },
      'sucursal': { module: 'branches', field: 'branch_id' },
      'branch': { module: 'branches', field: 'branch_id' }
    };

    for (const [keyword, dependency] of Object.entries(dependencyMap)) {
      if (label.includes(keyword)) {
        return dependency;
      }
    }

    return null;
  }

  /**
   * Verifica si un módulo dependiente existe y tiene discovery
   */
  async verifyDependencyExists(moduleKey) {
    const discoveryPath = path.join(this.discoveryDir, `${moduleKey}.discovery.json`);

    // Si no existe discovery, asumimos que no está configurado
    if (!fs.existsSync(discoveryPath)) {
      return false;
    }

    // TODO: Verificar en base de datos si tiene al menos 1 registro
    // (requiere conexión a DB)

    return true;
  }

  /**
   * Genera selector para un campo (copiado de config-generator)
   */
  generateFieldSelector(field) {
    if (field.name) return `[name="${field.name}"]`;
    if (field.id) return `#${field.id}`;
    if (field.placeholder) return `${field.tagName}[placeholder*="${field.placeholder}"]`;
    return `${field.tagName}[type="${field.type}"]`;
  }

  /**
   * Genera reporte de deadends
   */
  generateReport(deadends) {
    if (deadends.length === 0) {
      return {
        status: 'CLEAN',
        message: '✅ No se detectaron callejones sin salida',
        deadends: []
      };
    }

    const highSeverity = deadends.filter(d => d.severity === 'HIGH');
    const mediumSeverity = deadends.filter(d => d.severity === 'MEDIUM');
    const info = deadends.filter(d => d.severity === 'INFO');

    return {
      status: highSeverity.length > 0 ? 'CRITICAL' : mediumSeverity.length > 0 ? 'WARNING' : 'INFO',
      message: `⚠️  ${deadends.length} problemas detectados (${highSeverity.length} críticos)`,
      deadends,
      summary: {
        total: deadends.length,
        critical: highSeverity.length,
        warnings: mediumSeverity.length,
        info: info.length
      }
    };
  }

  /**
   * Guarda reporte de deadends
   */
  saveReport(moduleKey, report) {
    const reportPath = path.join(this.discoveryDir, `${moduleKey}.deadends.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    return reportPath;
  }
}

module.exports = DeadendDetector;

// CLI Usage
if (require.main === module) {
  const DeadendDetector = require('./deadend-detector');

  async function run() {
    const detector = new DeadendDetector();

    const moduleKey = process.argv[2];
    if (!moduleKey) {
      console.error('❌ Uso: node deadend-detector.js <moduleKey>');
      process.exit(1);
    }

    const discoveryPath = path.join(detector.discoveryDir, `${moduleKey}.discovery.json`);
    if (!fs.existsSync(discoveryPath)) {
      console.error(`❌ Discovery not found: ${moduleKey}`);
      process.exit(1);
    }

    const discovery = JSON.parse(fs.readFileSync(discoveryPath, 'utf8'));

    // Detectar deadends (sin page, solo análisis estático)
    const deadends = await detector.detectBrokenDependencies(discovery);
    deadends.push(...await detector.detectBrokenCircuits(discovery));

    const report = detector.generateReport(deadends);
    console.log('\n📊 REPORTE:');
    console.log(report.message);
    console.log(JSON.stringify(report.summary, null, 2));

    const reportPath = detector.saveReport(moduleKey, report);
    console.log(`\n📁 Reporte guardado: ${reportPath}`);
  }

  run().catch(console.error);
}
