# 🤖 COMANDOS RÁPIDOS PARA CLAUDE CODE

## 📌 USO PRINCIPAL

Cuando el usuario diga cualquiera de estas frases, ejecuta las acciones correspondientes:

---

## 🏗️ "ACTUALIZA INGENIERIA"

**Alias**: `actualiza metadata`, `update engineering`, `refresh metadata`

**¿Cuándo usar?**: Después de completar CUALQUIER cambio (feature, fix, refactor)

### ✅ ACCIONES A EJECUTAR:

1. **Actualizar `engineering-metadata.js`**:
   ```javascript
   // Actualizar fecha
   project.lastUpdated = new Date().toISOString();

   // Agregar a latestChanges (máximo 5)
   project.latestChanges.unshift("✅ [Descripción del cambio]");
   if (project.latestChanges.length > 5) project.latestChanges.pop();

   // Actualizar módulo correspondiente
   modules[moduloKey].progress = nuevoProgreso;
   modules[moduloKey].status = nuevoStatus; // PLANNED → IN_PROGRESS → COMPLETE → PRODUCTION

   // Si es tarea del roadmap
   roadmap[phaseKey].tasks[taskIndex].done = true;
   roadmap[phaseKey].progress = calcularProgreso();
   ```

2. **Recalcular estadísticas globales**:
   ```javascript
   // Total de módulos completados
   const totalModulos = Object.keys(modules).length;
   const modulosCompletos = Object.values(modules).filter(m =>
     m.status === 'PRODUCTION' || m.status === 'COMPLETE'
   ).length;

   // Total de tareas completadas
   const totalTareas = Object.values(roadmap).flatMap(p => p.tasks).length;
   const tareasCompletadas = Object.values(roadmap).flatMap(p => p.tasks).filter(t => t.done).length;

   // Actualizar progreso global
   project.totalProgress = Math.round((tareasCompletadas / totalTareas) * 100);
   ```

3. **Sincronizar con SystemRegistry** (si hay nuevos módulos):
   ```javascript
   // Verificar si el módulo existe en modules-registry.json
   // Si NO existe → Agregar entrada con help/quickStart
   ```

4. **Guardar cambios**:
   ```javascript
   // Escribir engineering-metadata.js
   fs.writeFileSync('engineering-metadata.js',
     `module.exports = ${JSON.stringify(metadata, null, 2)};`
   );
   ```

5. **Confirmar al usuario**:
   ```
   ✅ Engineering metadata actualizado:
   - Módulo: [nombre]
   - Progreso: [X]%
   - Status: [status]
   - Fecha: [timestamp]
   ```

---

## 🆕 "NUEVO MODULO"

**¿Cuándo usar?**: Al crear un módulo completamente nuevo en el sistema

### ✅ ACCIONES A EJECUTAR:

1. **Agregar a `engineering-metadata.js`**:
   ```javascript
   modules: {
     nuevoModulo: {
       name: "Nombre del Módulo",
       status: "PLANNED", // PLANNED → IN_PROGRESS → COMPLETE → PRODUCTION
       progress: 0,
       category: "commercial" | "operational" | "integrations" | "ai",
       priority: "HIGH" | "MEDIUM" | "LOW",
       features: {
         feature1: { done: false, inProgress: false }
       },
       dependencies: {
         required: ["modulo1", "modulo2"],
         optional: ["modulo3"]
       },
       api: {
         routes: "/api/nuevo-modulo",
         endpoints: []
       },
       database: {
         tables: [],
         modifications: []
       },
       knownIssues: [],
       designDoc: "NOMBRE-DEL-DOC.md"
     }
   }
   ```

2. **Agregar a `modules-registry.json`** (para AI Assistant):
   ```json
   {
     "id": "nuevo-modulo",
     "name": "Nombre del Módulo",
     "category": "operational",
     "version": "1.0.0",
     "description": "Descripción completa",
     "dependencies": {
       "required": ["database", "auth"],
       "optional": [],
       "integrates_with": [],
       "provides_to": []
     },
     "api": {
       "base_path": "/api/nuevo-modulo",
       "endpoints": []
     },
     "database": {
       "tables": []
     },
     "help": {
       "quickStart": "1. Paso 1\n2. Paso 2\n3. Paso 3",
       "commonIssues": [
         {
           "problem": "Problema común",
           "solution": "Solución paso a paso"
         }
       ]
     },
     "commercial": {
       "is_core": false,
       "can_work_standalone": false,
       "base_price_usd": 0
     }
   }
   ```

3. **Agregar entrada en roadmap** (si tiene tareas):
   ```javascript
   roadmap.phase_X.tasks.push({
     id: "MOD-1",
     name: "Implementar [Módulo]",
     done: false,
     assignedTo: "backend",
     estimatedHours: 8
   });
   ```

---

## ✅ "MARCAR TAREA COMPLETADA"

**Alias**: `tarea completada`, `task done`, `completar tarea`

**¿Cuándo usar?**: Al finalizar una tarea específica del roadmap

### ✅ ACCIONES A EJECUTAR:

1. **Buscar tarea por ID** en roadmap:
   ```javascript
   let taskFound = false;
   for (const phaseKey in roadmap) {
     const phase = roadmap[phaseKey];
     const task = phase.tasks.find(t => t.id === taskId);
     if (task) {
       task.done = true;
       taskFound = true;

       // Recalcular progreso de la fase
       const totalTasks = phase.tasks.length;
       const doneTasks = phase.tasks.filter(t => t.done).length;
       phase.progress = Math.round((doneTasks / totalTasks) * 100);

       break;
     }
   }
   ```

2. **Actualizar progreso global**:
   ```javascript
   const allTasks = Object.values(roadmap).flatMap(p => p.tasks);
   const completedTasks = allTasks.filter(t => t.done).length;
   project.totalProgress = Math.round((completedTasks / allTasks.length) * 100);
   ```

3. **Agregar a latestChanges**:
   ```javascript
   project.latestChanges.unshift(`✅ Tarea ${taskId} completada: ${task.name}`);
   ```

4. **Usar script CLI** (alternativa):
   ```bash
   node scripts/update-engineering-metadata.js --task VH-1 --done
   ```

---

## 🐛 "AGREGAR BUG CONOCIDO"

**Alias**: `reportar issue`, `agregar problema`, `nuevo issue`

**¿Cuándo usar?**: Al descubrir un bug en un módulo existente

### ✅ ACCIONES A EJECUTAR:

1. **Agregar a knownIssues del módulo**:
   ```javascript
   modules[moduloKey].knownIssues.push({
     description: "Descripción del bug",
     severity: "HIGH" | "MEDIUM" | "LOW",
     discovered: new Date().toISOString(),
     workaround: "Solución temporal (opcional)",
     relatedFiles: ["archivo1.js", "archivo2.js"]
   });
   ```

2. **Usar script CLI** (alternativa):
   ```bash
   node scripts/update-engineering-metadata.js --module users --add-issue "Bug en validación de emails"
   ```

---

## 📊 "VER ESTADISTICAS"

**Alias**: `ver progreso`, `show stats`, `estado del proyecto`

**¿Cuándo usar?**: Cuando el usuario quiera saber el estado general

### ✅ ACCIONES A EJECUTAR:

1. **Leer `engineering-metadata.js`**

2. **Calcular y mostrar**:
   ```
   📊 ESTADO DEL PROYECTO

   Progreso Global: [XX]%
   Última Actualización: [fecha]

   🏗️ MÓDULOS:
   - Total: [X]
   - En Producción: [X]
   - En Desarrollo: [X]
   - Planeados: [X]

   📋 ROADMAP:
   - Total Tareas: [X]
   - Completadas: [X]
   - Pendientes: [X]
   - Fase Actual: [nombre]

   🔥 ÚLTIMOS CAMBIOS:
   [Lista de latestChanges]

   🐛 ISSUES CONOCIDOS:
   [Contar total de knownIssues en todos los módulos]
   ```

---

## 🔗 INTEGRACIÓN CON AI ASSISTANT (AssistantService)

### Cómo el AI Assistant usa engineering-metadata.js:

```javascript
// En AssistantService.buildContext()
const engineeringMetadata = require('../../engineering-metadata');

async buildEngineeringContext(context) {
  const { module, workflow, userRole } = context;

  let engineeringHelp = {};

  // Si el usuario está en un módulo específico
  if (module && engineeringMetadata.modules[module]) {
    const mod = engineeringMetadata.modules[module];
    engineeringHelp.module = {
      name: mod.name,
      status: mod.status,
      progress: mod.progress,
      knownIssues: mod.knownIssues,
      designDoc: mod.designDoc
    };
  }

  // Si el usuario está en un workflow
  if (workflow && engineeringMetadata.workflows[workflow]) {
    const wf = engineeringMetadata.workflows[workflow];
    engineeringHelp.workflow = {
      name: wf.name,
      steps: wf.steps,
      help: wf.help // ← NUEVO: help contextual
    };
  }

  return engineeringHelp;
}

// En AssistantService.chat()
async chat(params) {
  const { question, context } = params;

  // PASO 1: Buscar en knowledge base (RAG)
  const similarAnswers = await this.searchKnowledgeBase(question);

  // PASO 2: Agregar contexto de ingeniería
  const engineeringContext = await this.buildEngineeringContext(context);

  // PASO 3: Construir prompt para Ollama
  const prompt = `
    Usuario pregunta: "${question}"

    Contexto del módulo:
    ${JSON.stringify(engineeringContext.module)}

    Issues conocidos:
    ${engineeringContext.module?.knownIssues?.map(i => `- ${i.description}`).join('\n')}

    Tutorial rápido (quickStart):
    ${engineeringContext.workflow?.help?.quickStart}

    Responde de forma contextual y precisa.
  `;

  // PASO 4: Generar respuesta con Ollama
  const answer = await this.generateAnswer(prompt);

  return answer;
}
```

### Ejemplo de uso contextual:

**Usuario (panel-empresa)**: "¿Cómo agrego un nuevo empleado?"

**AI Assistant detecta**:
- `context.module = "users"`
- `context.userRole = "empresa"`
- `context.currentScreen = "employees-list"`

**AI Assistant construye contexto**:
```javascript
{
  module: {
    name: "Gestión de Usuarios",
    status: "PRODUCTION",
    knownIssues: [
      { description: "Al guardar, departamento no persiste si..." }
    ]
  },
  workflow: {
    name: "Agregar Usuario",
    help: {
      quickStart: "1. Click botón 'Agregar'\n2. Llenar TAB 1...",
      commonIssues: [...]
    }
  }
}
```

**AI Assistant genera respuesta**:
```
Para agregar un nuevo empleado:

1. Haz click en el botón "➕ Agregar Usuario"
2. Completa la TAB 1 (Datos Básicos): nombre, DNI, email
3. IMPORTANTE: Si asignas un departamento, asegúrate de guardarlo
   correctamente (Issue conocido: departamento puede no persistir
   si no haces click en "Guardar" dentro del modal de departamento)
4. Completa las demás TABs según necesites
5. Guarda al final

ℹ️ Más info: Ver documentación en [designDoc]
```

---

## 🎯 WORKFLOW COMPLETO DE USO

### Escenario: Completar una feature del roadmap

```
USER: "Implementa la validación de RUT chileno en el módulo de usuarios"

CLAUDE (internamente):
1. Lee engineering-metadata.js
2. Busca módulo "users"
3. Verifica dependencies, knownIssues
4. Implementa el código
5. Testea
6. USER dice: "actualiza ingenieria"
7. CLAUDE ejecuta comando "ACTUALIZA INGENIERIA":
   - Actualiza modules.users.progress
   - Agrega feature "RUT validation" como completada
   - Agrega a latestChanges
   - Recalcula totalProgress
   - Guarda engineering-metadata.js
8. CLAUDE confirma: "✅ Metadata actualizado - Módulo Users: 75% completo"
```

---

## 📝 CHECKLIST PARA CLAUDE

Antes de cada sesión:
- [ ] Leer `engineering-metadata.js` COMPLETO
- [ ] Verificar fase actual del roadmap
- [ ] Revisar knownIssues de módulos relevantes
- [ ] Verificar deprecated (nunca usar código obsoleto)

Después de cada cambio:
- [ ] Ejecutar "actualiza ingenieria"
- [ ] Verificar que status/progress estén actualizados
- [ ] Confirmar latestChanges refleja el cambio
- [ ] Commit con mensaje descriptivo

Al encontrar bugs:
- [ ] Agregar a knownIssues del módulo
- [ ] Incluir severity, workaround si existe
- [ ] Actualizar engineering-metadata.js

---

## 🚀 SCRIPTS CLI DISPONIBLES

```bash
# Marcar tarea como completada
node scripts/update-engineering-metadata.js --task VH-1 --done

# Actualizar progreso de módulo
node scripts/update-engineering-metadata.js --module users --progress 85

# Agregar issue a módulo
node scripts/update-engineering-metadata.js --module users --add-issue "Bug en validación"

# Cambiar status de módulo
node scripts/update-engineering-metadata.js --module users --status PRODUCTION

# Ver estadísticas
node scripts/update-engineering-metadata.js --stats
```

---

## 📚 ARCHIVOS RELACIONADOS

- `backend/engineering-metadata.js` - Metadata completo del sistema
- `backend/scripts/update-engineering-metadata.js` - Script de actualización CLI
- `backend/src/auditor/registry/modules-registry.json` - Registry de módulos (para AI)
- `backend/src/services/AssistantService.js` - AI Assistant con RAG
- `backend/CLAUDE.md` - Guía principal para Claude
- `backend/.clauderc` - Configuración de Claude Code

---

**IMPORTANTE**: Este archivo NO reemplaza a `engineering-metadata.js`. Es una GUÍA de comandos para que Claude sepa QUÉ HACER cuando el usuario dice "actualiza ingenieria" u otros comandos similares.
