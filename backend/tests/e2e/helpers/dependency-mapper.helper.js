/**
 * ═══════════════════════════════════════════════════════════
 * DEPENDENCY MAPPER - Detecta Dependencias entre Campos
 * ═══════════════════════════════════════════════════════════
 *
 * Analiza las 10 solapas del modal de usuarios para:
 *
 * 1. Detectar qué campos DEPENDEN de otros
 * 2. Identificar VALIDACIONES CRUZADAS
 * 3. Mapear FLUJO DE DATOS (de dónde viene cada valor)
 * 4. Detectar CAMPOS CALCULADOS vs ESTÁTICOS
 * 5. Encontrar DEPENDENCIAS CIRCULARES
 * 6. Generar GRAFO DE DEPENDENCIAS visual
 */

/**
 * ANALIZADOR DE DEPENDENCIAS - Detecta relaciones en el DOM
 */
async function analyzeDependencies(page, tabName) {
  console.log(`\n🔍 [DEPENDENCY] Analizando dependencias en tab: ${tabName}...`);

  const dependencies = await page.evaluate(() => {
    const deps = {
      fields: {},
      relationships: [],
      calculatedFields: [],
      conditionalFields: [],
      crossValidations: []
    };

    // Obtener TODOS los campos del tab actual
    const inputs = document.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
      const fieldName = input.name || input.id;
      if (!fieldName) return;

      deps.fields[fieldName] = {
        type: input.type || input.tagName.toLowerCase(),
        required: input.required,
        disabled: input.disabled,
        readonly: input.readOnly,
        value: input.value,
        pattern: input.pattern,
        min: input.min,
        max: input.max,
        maxLength: input.maxLength
      };

      // Detectar si el campo tiene eventos que lo hacen dependiente
      const listeners = [];

      // Buscar atributos de eventos
      for (const attr of input.attributes) {
        if (attr.name.startsWith('on') || attr.name.includes('data-depends')) {
          listeners.push({
            event: attr.name,
            handler: attr.value.substring(0, 100) // Primeros 100 chars
          });
        }
      }

      if (listeners.length > 0) {
        deps.fields[fieldName].eventListeners = listeners;
      }

      // Detectar validaciones HTML5
      if (input.validity && !input.validity.valid) {
        deps.fields[fieldName].validationState = {
          valueMissing: input.validity.valueMissing,
          typeMismatch: input.validity.typeMismatch,
          patternMismatch: input.validity.patternMismatch,
          tooLong: input.validity.tooLong,
          tooShort: input.validity.tooShort,
          rangeUnderflow: input.validity.rangeUnderflow,
          rangeOverflow: input.validity.rangeOverflow,
          stepMismatch: input.validity.stepMismatch,
          customError: input.validity.customError
        };
      }
    });

    // Detectar CAMPOS CALCULADOS (tienen fórmulas o son auto-rellenados)
    inputs.forEach(input => {
      const fieldName = input.name || input.id;
      if (!fieldName || input.disabled || input.readOnly) {
        deps.calculatedFields.push(fieldName);
      }
    });

    // Detectar CAMPOS CONDICIONALES (se habilitan/deshabilitan según otros)
    // Buscar en el código JavaScript inline o atributos
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      const code = script.textContent;

      // Buscar patterns como: if (campo1.value == 'X') { campo2.disabled = false }
      const dependencyPatterns = [
        /if\s*\(\s*(\w+)\.value.*?\{\s*(\w+)\.disabled\s*=/gi,
        /if\s*\(\s*(\w+)\.value.*?\{\s*(\w+)\.required\s*=/gi,
        /(\w+)\.addEventListener.*?(\w+)\.disabled/gi
      ];

      dependencyPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(code)) !== null) {
          deps.relationships.push({
            source: match[1],
            target: match[2],
            type: 'conditional'
          });
        }
      });
    });

    return deps;
  });

  console.log(`   ✅ ${Object.keys(dependencies.fields).length} campos encontrados`);
  console.log(`   ✅ ${dependencies.relationships.length} relaciones detectadas`);
  console.log(`   ✅ ${dependencies.calculatedFields.length} campos calculados`);

  return dependencies;
}

/**
 * DETECTAR DEPENDENCIAS DE CAMPOS vía INTERACCIÓN
 * Cambia un campo y ve qué otros campos se modifican
 */
async function detectDynamicDependencies(page, fieldSelector, fieldName) {
  console.log(`   🔬 Probando dependencias dinámicas de: ${fieldName}...`);

  try {
    // Capturar ESTADO INICIAL de TODOS los campos
    const initialState = await page.evaluate(() => {
      const state = {};
      document.querySelectorAll('input, select, textarea').forEach(el => {
        const name = el.name || el.id;
        if (name) {
          state[name] = {
            value: el.value,
            disabled: el.disabled,
            required: el.required,
            visible: el.offsetParent !== null
          };
        }
      });
      return state;
    });

    // CAMBIAR EL CAMPO (trigger events)
    await page.fill(fieldSelector, 'TEST_VALUE_FOR_DEPENDENCY_DETECTION');
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, fieldSelector);

    await page.waitForTimeout(500); // Esperar cambios

    // Capturar ESTADO FINAL
    const finalState = await page.evaluate(() => {
      const state = {};
      document.querySelectorAll('input, select, textarea').forEach(el => {
        const name = el.name || el.id;
        if (name) {
          state[name] = {
            value: el.value,
            disabled: el.disabled,
            required: el.required,
            visible: el.offsetParent !== null
          };
        }
      });
      return state;
    });

    // COMPARAR y encontrar campos que cambiaron
    const dependencies = [];
    for (const [name, finalVal] of Object.entries(finalState)) {
      const initialVal = initialState[name];
      if (!initialVal) continue;

      const changed = {
        value: initialVal.value !== finalVal.value,
        disabled: initialVal.disabled !== finalVal.disabled,
        required: initialVal.required !== finalVal.required,
        visible: initialVal.visible !== finalVal.visible
      };

      if (Object.values(changed).some(v => v)) {
        dependencies.push({
          dependentField: name,
          sourceField: fieldName,
          changes: changed
        });
      }
    }

    if (dependencies.length > 0) {
      console.log(`      → ${dependencies.length} campos afectados por cambio en ${fieldName}`);
    }

    return dependencies;

  } catch (err) {
    console.log(`      ⚠️  Error detectando dependencias: ${err.message}`);
    return [];
  }
}

/**
 * MAPEAR TODAS LAS DEPENDENCIAS DE UN TAB
 * Combina análisis estático + dinámico
 */
async function mapTabDependencies(page, tabName, fieldsToTest = []) {
  console.log(`\n📊 [DEPENDENCY] Mapeando TODAS las dependencias de: ${tabName}`);

  const map = {
    tab: tabName,
    staticAnalysis: null,
    dynamicAnalysis: {},
    dependencyGraph: {
      nodes: [],
      edges: []
    }
  };

  // 1. Análisis estático (código)
  map.staticAnalysis = await analyzeDependencies(page, tabName);

  // 2. Análisis dinámico (interacción)
  for (const { selector, name } of fieldsToTest) {
    const deps = await detectDynamicDependencies(page, selector, name);
    map.dynamicAnalysis[name] = deps;

    // Agregar al grafo
    map.dependencyGraph.nodes.push(name);
    deps.forEach(dep => {
      map.dependencyGraph.edges.push({
        from: name,
        to: dep.dependentField,
        type: Object.keys(dep.changes).filter(k => dep.changes[k]).join(',')
      });
    });
  }

  return map;
}

/**
 * GENERAR GRAFO VISUAL DE DEPENDENCIAS (formato Mermaid)
 */
function generateDependencyGraph(dependencyMap) {
  let mermaid = 'graph TD\n';

  const { nodes, edges } = dependencyMap.dependencyGraph;

  // Nodos
  nodes.forEach(node => {
    mermaid += `    ${node}[${node}]\n`;
  });

  // Edges
  edges.forEach(edge => {
    mermaid += `    ${edge.from} -->|${edge.type}| ${edge.to}\n`;
  });

  return mermaid;
}

/**
 * DETECTAR DEPENDENCIAS CIRCULARES
 * A depende de B, B depende de C, C depende de A = CIRCULAR
 */
function detectCircularDependencies(dependencyMap) {
  const { edges } = dependencyMap.dependencyGraph;

  const graph = {};
  edges.forEach(edge => {
    if (!graph[edge.from]) graph[edge.from] = [];
    graph[edge.from].push(edge.to);
  });

  const visited = new Set();
  const recStack = new Set();
  const cycles = [];

  function dfs(node, path = []) {
    if (recStack.has(node)) {
      // Encontramos un ciclo!
      const cycleStart = path.indexOf(node);
      cycles.push([...path.slice(cycleStart), node]);
      return;
    }

    if (visited.has(node)) return;

    visited.add(node);
    recStack.add(node);

    const neighbors = graph[node] || [];
    neighbors.forEach(neighbor => {
      dfs(neighbor, [...path, node]);
    });

    recStack.delete(node);
  }

  Object.keys(graph).forEach(node => dfs(node));

  if (cycles.length > 0) {
    console.log(`\n⚠️  [DEPENDENCY] ${cycles.length} DEPENDENCIAS CIRCULARES detectadas:`);
    cycles.forEach((cycle, i) => {
      console.log(`   ${i + 1}. ${cycle.join(' → ')}`);
    });
  }

  return cycles;
}

/**
 * ANALIZAR TODAS LAS 10 SOLAPAS
 */
async function mapAllTabsDependencies(page, tabs) {
  console.log('\n═══════════════════════════════════════════');
  console.log('🔍 DEPENDENCY MAPPER - ANÁLISIS COMPLETO');
  console.log('═══════════════════════════════════════════\n');

  const fullMap = {
    tabs: {},
    globalDependencies: {
      crossTabDependencies: [], // Campos de un tab que afectan otro tab
      sharedFields: []            // Campos que aparecen en múltiples tabs
    },
    circularDependencies: [],
    summary: {
      totalFields: 0,
      totalDependencies: 0,
      calculatedFields: 0
    }
  };

  for (const tab of tabs) {
    const tabMap = await mapTabDependencies(page, tab.name, tab.fieldsToTest || []);
    fullMap.tabs[tab.name] = tabMap;

    // Sumar estadísticas
    fullMap.summary.totalFields += Object.keys(tabMap.staticAnalysis.fields).length;
    fullMap.summary.totalDependencies += tabMap.dependencyGraph.edges.length;
    fullMap.summary.calculatedFields += tabMap.staticAnalysis.calculatedFields.length;

    // Detectar circulares de este tab
    const cycles = detectCircularDependencies(tabMap);
    fullMap.circularDependencies.push(...cycles);
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('📊 DEPENDENCY MAPPER - RESUMEN');
  console.log('═══════════════════════════════════════════');
  console.log(`Total de campos: ${fullMap.summary.totalFields}`);
  console.log(`Total de dependencias: ${fullMap.summary.totalDependencies}`);
  console.log(`Campos calculados: ${fullMap.summary.calculatedFields}`);
  console.log(`Dependencias circulares: ${fullMap.circularDependencies.length}`);
  console.log('═══════════════════════════════════════════\n');

  return fullMap;
}

module.exports = {
  analyzeDependencies,
  detectDynamicDependencies,
  mapTabDependencies,
  generateDependencyGraph,
  detectCircularDependencies,
  mapAllTabsDependencies
};
