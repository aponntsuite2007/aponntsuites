# 🔗 INTEGRACIÓN: Engineering Metadata + AI Assistant

## 📋 OBJETIVO

Conectar el sistema de **engineering-metadata.js** con el **AI Assistant** (AssistantService.js + modules-registry.json) para generar tutoriales contextuales automáticos basados en:

- **Rol del usuario**: Empresa, Vendedor, Admin, Asociado
- **Pantalla actual**: Módulo específico donde está el usuario
- **Acción en curso**: Crear, editar, ver, exportar, etc.
- **Workflow activo**: Si está en medio de un proceso multi-paso

---

## 🎯 ARQUITECTURA DE INTEGRACIÓN

```
┌─────────────────────────────────────────────────────────────┐
│                   FUENTES DE CONOCIMIENTO                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────┐         ┌─────────────────────┐   │
│  │ engineering-       │         │ modules-registry.   │   │
│  │ metadata.js        │  ←────→ │ json                │   │
│  │                    │  SYNC   │                     │   │
│  │ - Workflows        │         │ - Help sections     │   │
│  │ - Modules          │         │ - quickStart        │   │
│  │ - Roadmap          │         │ - commonIssues      │   │
│  │ - KnownIssues      │         │ - Dependencies      │   │
│  └────────────────────┘         └─────────────────────┘   │
│            │                              │                │
│            └──────────────┬───────────────┘                │
│                           ▼                                │
│              ┌─────────────────────────┐                   │
│              │  AssistantService.js    │                   │
│              │  (Ollama + RAG)         │                   │
│              └─────────────────────────┘                   │
│                           │                                │
│                           ▼                                │
│              ┌─────────────────────────┐                   │
│              │  RESPUESTA CONTEXTUAL   │                   │
│              │  - Role-aware           │                   │
│              │  - Workflow-aware       │                   │
│              │  - Issue-aware          │                   │
│              └─────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 PASO 1: AGREGAR SECCIONES DE AYUDA A WORKFLOWS

### Estructura propuesta para cada workflow:

```javascript
// engineering-metadata.js
workflows: {
  contractModification: {
    name: "Modificación de Contrato",
    status: "DESIGNED",
    implemented: false,
    steps: [ /* 10 steps */ ],

    // ✨ NUEVO: Sección de ayuda contextual
    help: {
      // Tutorial rápido (3-5 pasos)
      quickStart: `
1. Cliente modifica módulos desde panel-empresa → Configuración
2. Sistema genera presupuesto automáticamente
3. Cliente recibe notificación por email y app
4. Cliente aprueba/rechaza presupuesto (deadline: 7 días)
5. Si aprueba: genera contrato → firma digital → activación
      `.trim(),

      // Problemas comunes y soluciones
      commonIssues: [
        {
          problem: "Presupuesto no llega al email del cliente",
          cause: "Email de la empresa desactualizado o servicio SMTP caído",
          solution: `
1. Verificar Companies → [empresa] → Contact Email
2. Verificar estado del servidor SMTP: curl /api/health/smtp
3. Reenviar presupuesto: POST /api/budgets/:id/resend
          `.trim()
        },
        {
          problem: "Contrato queda en 'pending_signature' sin avanzar",
          cause: "Cliente no firmó dentro del plazo (7 días)",
          solution: `
1. Verificar fecha de expiración: SELECT * FROM contracts WHERE id = X
2. Escalate a vendedor: POST /api/contracts/:id/escalate
3. Extender deadline: PUT /api/contracts/:id/extend-deadline
          `.trim()
        },
        {
          problem: "Comisiones no se recalculan después de modificar contrato",
          cause: "Función refresh_vendor_statistics() no se ejecutó",
          solution: `
1. Ejecutar manualmente: SELECT refresh_vendor_statistics(vendor_id)
2. Verificar logs: SELECT * FROM audit_logs WHERE module_name = 'commissions'
3. Contactar a soporte técnico si persiste
          `.trim()
        }
      ],

      // Permisos requeridos
      requiredRoles: ["admin", "empresa"],

      // Módulos que deben estar activos
      requiredModules: ["companies", "budgets", "contracts", "notifications"],

      // URLs relevantes
      relatedEndpoints: [
        "GET /api/budgets/:id",
        "POST /api/budgets/:id/approve",
        "POST /api/budgets/:id/reject",
        "GET /api/contracts/:id",
        "POST /api/contracts/:id/sign"
      ],

      // Archivos importantes del código
      codeFiles: [
        "src/routes/budgetRoutes.js",
        "src/routes/contractRoutes.js",
        "src/services/ContractService.js",
        "public/js/modules/company-settings.js"
      ]
    },

    // Resto de campos existentes...
    affectedModules: ["companies", "budgets", "contracts"],
    estimatedEffort: "50-70 horas",
    designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md"
  },

  monthlyInvoicing: {
    name: "Facturación Mensual Automática",
    // ... resto de campos ...

    help: {
      quickStart: `
1. Cron job ejecuta el día 1 de cada mes (00:00 hs)
2. Busca todos los contratos activos
3. Genera factura por cada contrato
4. Envía factura por email + notificación app
5. Cliente carga comprobante de pago (deadline: 15 días)
6. Cobranzas confirma pago → dispara liquidación de comisiones
      `.trim(),

      commonIssues: [
        {
          problem: "Factura generada con monto incorrecto",
          cause: "Contrato modificado pero no actualizado en companies.monthly_total",
          solution: `
1. Verificar: SELECT monthly_total FROM companies WHERE id = X
2. Comparar con: SELECT SUM(price) FROM active_modules WHERE company_id = X
3. Si difiere: UPDATE companies SET monthly_total = [correcto]
4. Regenerar factura: POST /api/invoices/:id/regenerate
          `.trim()
        },
        {
          problem: "Cliente no recibe email de factura",
          cause: "Email incorrecto o límite de envíos excedido",
          solution: `
1. Verificar email: SELECT contact_email FROM companies WHERE id = X
2. Verificar logs SMTP: SELECT * FROM email_logs WHERE invoice_id = X
3. Reenviar: POST /api/invoices/:id/resend
          `.trim()
        }
      ],

      requiredRoles: ["admin", "cobranzas"],
      requiredModules: ["contracts", "invoicing", "notifications"],
      relatedEndpoints: [
        "GET /api/invoices",
        "POST /api/invoices/:id/upload-payment",
        "POST /api/invoices/:id/confirm-payment"
      ],
      codeFiles: [
        "src/services/InvoicingService.js",
        "src/cron/monthly-invoicing.js"
      ]
    }
  },

  // ... resto de workflows con help sections similares
}
```

---

## 🤖 PASO 2: MEJORAR AssistantService PARA USAR ENGINEERING METADATA

### Modificación en `src/services/AssistantService.js`:

```javascript
const engineeringMetadata = require('../../engineering-metadata');
const modulesRegistry = require('../auditor/registry/modules-registry.json');

class AssistantService {

  /**
   * Construye contexto completo combinando:
   * - modules-registry.json (help existente)
   * - engineering-metadata.js (workflows, knownIssues)
   */
  async buildEnhancedContext(params) {
    const { companyId, userId, context = {} } = params;

    const enhancedContext = {
      user: {},
      module: {},
      workflow: {},
      knownIssues: [],
      relevantEndpoints: []
    };

    // ────────────────────────────────────────────────────────────
    // 1. CONTEXTO DE USUARIO
    // ────────────────────────────────────────────────────────────
    const user = await User.findByPk(userId);
    enhancedContext.user = {
      role: user.role, // empresa, admin, vendor, partner
      companyId: companyId,
      permissions: await this.getUserPermissions(userId)
    };

    // ────────────────────────────────────────────────────────────
    // 2. CONTEXTO DE MÓDULO ACTUAL (si aplica)
    // ────────────────────────────────────────────────────────────
    if (context.module) {
      const moduleKey = context.module;

      // Buscar en modules-registry.json (help estándar)
      const registryModule = modulesRegistry.find(m => m.id === moduleKey);

      // Buscar en engineering-metadata.js (metadata técnico)
      const engineeringModule = engineeringMetadata.modules[moduleKey];

      if (registryModule && engineeringModule) {
        enhancedContext.module = {
          name: registryModule.name,
          description: registryModule.description,
          quickStart: registryModule.help?.quickStart,
          commonIssues: registryModule.help?.commonIssues,

          // Agregar metadata de ingeniería
          status: engineeringModule.status,
          progress: engineeringModule.progress,
          knownIssues: engineeringModule.knownIssues,
          designDoc: engineeringModule.designDoc,

          // Dependencies
          dependencies: registryModule.dependencies,

          // Endpoints disponibles
          endpoints: registryModule.api?.endpoints || []
        };

        // Acumular issues conocidos
        if (engineeringModule.knownIssues) {
          enhancedContext.knownIssues.push(...engineeringModule.knownIssues);
        }
      }
    }

    // ────────────────────────────────────────────────────────────
    // 3. CONTEXTO DE WORKFLOW ACTIVO (si aplica)
    // ────────────────────────────────────────────────────────────
    if (context.workflow) {
      const workflowKey = context.workflow;
      const workflow = engineeringMetadata.workflows[workflowKey];

      if (workflow && workflow.help) {
        enhancedContext.workflow = {
          name: workflow.name,
          status: workflow.status,
          quickStart: workflow.help.quickStart,
          commonIssues: workflow.help.commonIssues,
          requiredRoles: workflow.help.requiredRoles,
          requiredModules: workflow.help.requiredModules,
          relatedEndpoints: workflow.help.relatedEndpoints,
          codeFiles: workflow.help.codeFiles,

          // Steps del workflow
          steps: workflow.steps,
          totalSteps: workflow.steps.length
        };

        // Si el usuario está en un step específico
        if (context.currentStep) {
          const step = workflow.steps.find(s => s.step === context.currentStep);
          enhancedContext.workflow.currentStep = step;
        }

        // Acumular issues conocidos del workflow
        if (workflow.help.commonIssues) {
          enhancedContext.knownIssues.push(...workflow.help.commonIssues.map(issue => ({
            description: issue.problem,
            severity: 'MEDIUM',
            workaround: issue.solution
          })));
        }

        // Acumular endpoints relevantes
        if (workflow.help.relatedEndpoints) {
          enhancedContext.relevantEndpoints.push(...workflow.help.relatedEndpoints);
        }
      }
    }

    // ────────────────────────────────────────────────────────────
    // 4. VERIFICAR PERMISOS Y MÓDULOS ACTIVOS
    // ────────────────────────────────────────────────────────────
    if (enhancedContext.workflow.requiredRoles) {
      const hasPermission = enhancedContext.workflow.requiredRoles.includes(enhancedContext.user.role);
      enhancedContext.workflow.userHasPermission = hasPermission;
    }

    if (enhancedContext.workflow.requiredModules) {
      const company = await Company.findByPk(companyId);
      const activeModules = company.active_modules || [];

      const missingModules = enhancedContext.workflow.requiredModules.filter(
        mod => !activeModules.includes(mod)
      );

      enhancedContext.workflow.missingModules = missingModules;
    }

    return enhancedContext;
  }

  /**
   * Genera respuesta contextual usando Ollama + contexto mejorado
   */
  async chat(params) {
    const { question, context } = params;

    // PASO 1: Buscar en knowledge base (RAG)
    const similarAnswers = await this.searchKnowledgeBase(question);

    // PASO 2: Construir contexto mejorado
    const enhancedContext = await this.buildEnhancedContext(params);

    // PASO 3: Construir prompt para Ollama
    const prompt = this.buildPromptForOllama(question, enhancedContext, similarAnswers);

    // PASO 4: Generar respuesta con Ollama
    const answer = await this.generateAnswerWithOllama(prompt);

    // PASO 5: Guardar en knowledge base
    await this.saveToKnowledgeBase({ question, answer, context: enhancedContext });

    return {
      answer,
      context: enhancedContext,
      sources: similarAnswers
    };
  }

  /**
   * Construye prompt enriquecido para Ollama
   */
  buildPromptForOllama(question, context, similarAnswers) {
    let prompt = `Eres un asistente técnico del Sistema de Asistencia Biométrico Aponnt.\n\n`;

    // Contexto del usuario
    prompt += `USUARIO:\n`;
    prompt += `- Rol: ${context.user.role}\n`;
    prompt += `- Empresa ID: ${context.user.companyId}\n\n`;

    // Contexto del módulo
    if (context.module.name) {
      prompt += `MÓDULO ACTUAL: ${context.module.name}\n`;
      prompt += `- Estado: ${context.module.status} (${context.module.progress}% completo)\n`;

      if (context.module.knownIssues && context.module.knownIssues.length > 0) {
        prompt += `- Issues conocidos:\n`;
        context.module.knownIssues.forEach(issue => {
          prompt += `  * ${issue.description}\n`;
        });
      }

      prompt += `\nTUTORIAL RÁPIDO:\n${context.module.quickStart}\n\n`;
    }

    // Contexto del workflow
    if (context.workflow.name) {
      prompt += `WORKFLOW ACTIVO: ${context.workflow.name}\n`;
      prompt += `- Estado: ${context.workflow.status}\n`;
      prompt += `- Total de pasos: ${context.workflow.totalSteps}\n`;

      if (context.workflow.currentStep) {
        prompt += `- Paso actual: ${context.workflow.currentStep.step} - ${context.workflow.currentStep.name}\n`;
      }

      prompt += `\nPASOS DEL WORKFLOW:\n${context.workflow.quickStart}\n\n`;

      // Verificar permisos
      if (!context.workflow.userHasPermission) {
        prompt += `⚠️ ADVERTENCIA: Este usuario NO tiene permisos para este workflow.\n`;
        prompt += `Roles requeridos: ${context.workflow.requiredRoles.join(', ')}\n\n`;
      }

      // Verificar módulos faltantes
      if (context.workflow.missingModules && context.workflow.missingModules.length > 0) {
        prompt += `⚠️ ADVERTENCIA: Módulos faltantes para ejecutar este workflow:\n`;
        context.workflow.missingModules.forEach(mod => {
          prompt += `  - ${mod}\n`;
        });
        prompt += `\n`;
      }
    }

    // Respuestas similares (RAG)
    if (similarAnswers.length > 0) {
      prompt += `RESPUESTAS SIMILARES EN LA BASE DE CONOCIMIENTO:\n`;
      similarAnswers.forEach((ans, idx) => {
        prompt += `${idx + 1}. Pregunta: "${ans.question}"\n`;
        prompt += `   Respuesta: ${ans.answer}\n`;
        prompt += `   Confianza: ${ans.confidence_score}\n\n`;
      });
    }

    // Problemas comunes
    if (context.knownIssues.length > 0) {
      prompt += `PROBLEMAS COMUNES Y SOLUCIONES:\n`;
      context.knownIssues.forEach((issue, idx) => {
        prompt += `${idx + 1}. Problema: ${issue.description || issue.problem}\n`;
        if (issue.solution || issue.workaround) {
          prompt += `   Solución: ${issue.solution || issue.workaround}\n`;
        }
        prompt += `\n`;
      });
    }

    // Endpoints relevantes
    if (context.relevantEndpoints.length > 0) {
      prompt += `ENDPOINTS RELEVANTES:\n`;
      context.relevantEndpoints.forEach(endpoint => {
        prompt += `- ${endpoint}\n`;
      });
      prompt += `\n`;
    }

    // Pregunta del usuario
    prompt += `PREGUNTA DEL USUARIO:\n"${question}"\n\n`;

    // Instrucciones finales
    prompt += `INSTRUCCIONES:\n`;
    prompt += `1. Responde de forma clara, concisa y técnica\n`;
    prompt += `2. Si la pregunta está relacionada con un issue conocido, menciona la solución\n`;
    prompt += `3. Si el usuario no tiene permisos, explica qué rol necesita\n`;
    prompt += `4. Si faltan módulos, indica cuáles debe activar\n`;
    prompt += `5. Si hay tutorial rápido (quickStart), úsalo como referencia\n`;
    prompt += `6. Usa formato Markdown para mejor legibilidad\n`;
    prompt += `7. Incluye ejemplos de código SQL/JavaScript si es relevante\n`;

    return prompt;
  }
}
```

---

## 🎯 PASO 3: EJEMPLOS DE USO CONTEXTUAL

### Ejemplo 1: Usuario empresa pregunta sobre contratos

**Escenario**:
- **Usuario**: Rol = `empresa`, Company ID = `123`
- **Pantalla**: `panel-empresa.html` → Configuración → Módulos
- **Pregunta**: "¿Cómo cambio los módulos contratados?"

**AssistantService detecta**:
```javascript
context = {
  module: "companies", // Módulo de configuración
  workflow: "contractModification", // Workflow de modificación de contrato
  currentScreen: "company-settings"
}
```

**Respuesta generada**:
```markdown
Para cambiar los módulos contratados, sigue estos pasos:

## PASOS RÁPIDOS:
1. Ve a **Configuración** → **Módulos Activos**
2. Selecciona/deselecciona los módulos que quieras agregar o quitar
3. Haz click en **"Solicitar Cambio"**
4. Recibirás un **presupuesto por email y notificación** (tienes 7 días para decidir)
5. Revisa el presupuesto y **Aprueba o Rechaza**
6. Si apruebas: Firmarás digitalmente el nuevo contrato
7. Una vez firmado, los cambios se activarán automáticamente

## IMPORTANTE:
- El cambio NO es inmediato - requiere aprobación
- Tienes **7 días** para aprobar/rechazar el presupuesto
- Si no respondes, el presupuesto expira y se mantiene tu contrato actual

## ¿NECESITAS AYUDA?
Si no recibes el email del presupuesto, contacta a tu vendedor asignado o escríbenos a soporte@aponnt.com

📚 **Más info**: Ver [Documentación de Contratos](#)
```

**¿Por qué esta respuesta?**
- Usó `workflow.help.quickStart` de `contractModification`
- Detectó que el usuario tiene rol `empresa` (tiene permisos)
- Incluyó información del deadline (7 días) tomada de `workflow.steps[3].timeout`
- Formato amigable, no técnico (SQL/código)

---

### Ejemplo 2: Admin pregunta sobre facturación

**Escenario**:
- **Usuario**: Rol = `admin`
- **Pantalla**: `panel-administrativo.html` → Facturación
- **Pregunta**: "Una empresa dice que su factura tiene monto incorrecto, ¿qué hago?"

**AssistantService detecta**:
```javascript
context = {
  module: "invoicing",
  workflow: "monthlyInvoicing",
  currentScreen: "invoices-list"
}
```

**Respuesta generada**:
```markdown
Si una factura tiene monto incorrecto, sigue estos pasos técnicos:

## DIAGNÓSTICO:

1. **Verificar monto en la empresa**:
   ```sql
   SELECT monthly_total FROM companies WHERE id = [ID_EMPRESA];
   ```

2. **Calcular monto correcto** (suma de módulos activos):
   ```sql
   SELECT SUM(price) FROM active_modules WHERE company_id = [ID_EMPRESA];
   ```

3. **Comparar**:
   - Si `monthly_total` ≠ `SUM(price)` → **Desincronización detectada**

## SOLUCIÓN:

1. **Actualizar monto de la empresa**:
   ```sql
   UPDATE companies
   SET monthly_total = [MONTO_CORRECTO]
   WHERE id = [ID_EMPRESA];
   ```

2. **Regenerar factura**:
   ```bash
   POST /api/invoices/:id/regenerate
   ```

3. **Verificar nueva factura** y notificar al cliente

## PROBLEMA RAÍZ:
Esto ocurre cuando se modifica un contrato pero NO se actualiza `companies.monthly_total`. El workflow de **Modificación de Contrato** debe hacer esto automáticamente en el **Step 9**.

📋 **Verificar**: Si el problema persiste, ejecuta auditoría del módulo Invoicing:
```bash
POST /api/audit/run/invoicing
```

🔗 **Workflow relacionado**: Modificación de Contrato (Step 9)
```

**¿Por qué esta respuesta?**
- Usó `workflow.help.commonIssues[0]` de `monthlyInvoicing`
- Detectó que el usuario tiene rol `admin` → respuesta técnica con SQL
- Incluyó comandos específicos (POST, SQL)
- Referenció el workflow relacionado (`contractModification`)
- Sugirió usar el sistema de auditoría para diagnóstico

---

### Ejemplo 3: Vendedor pregunta sobre comisiones

**Escenario**:
- **Usuario**: Rol = `vendor`, Staff ID = `456`
- **Pantalla**: `app-mobile-vendor` → Mis Comisiones
- **Pregunta**: "¿Por qué mi comisión de este mes está en $0?"

**AssistantService detecta**:
```javascript
context = {
  module: "vendorsCommissions",
  workflow: "monthlyCommissionLiquidation",
  userRole: "vendor"
}
```

**Respuesta generada**:
```markdown
Tu comisión puede estar en $0 por estas razones:

## POSIBLES CAUSAS:

1. **Ningún cliente pagó su factura este mes**
   - Las comisiones se generan SOLO cuando el cliente paga
   - Verifica en "Mis Empresas" → Estado de Pago

2. **Cliente pagó pero cobranzas aún no confirmó**
   - El área de cobranzas tiene hasta 5 días hábiles para confirmar
   - Deadline: día 7 de cada mes

3. **Tu cuenta está en estado "suspended"**
   - Contacta a tu líder o a RRHH

4. **Error técnico en el cálculo**
   - Poco probable, pero posible
   - Contacta a soporte técnico con tu ID de vendedor

## ¿QUÉ PUEDES HACER?

✅ **Verifica el estado de pago de tus empresas**:
   - Ve a "Mis Empresas"
   - Busca columna "Estado Factura Actual"
   - Si dice "Pending", el cliente no pagó aún

✅ **Verifica tu estado como vendedor**:
   - Ve a "Mi Perfil" → Estado
   - Debe decir "active" (verde)

❌ **NO tienes acceso** a forzar el cálculo de comisiones (solo admins)

📞 **Contacto**: Si ninguna de las anteriores aplica, escribe a comisiones@aponnt.com con tu ID de vendedor.
```

**¿Por qué esta respuesta?**
- Detectó `userRole = vendor` → respuesta orientada a NO-técnicos
- NO mostró SQL ni comandos (vendor no tiene acceso)
- Usó `workflow.help.commonIssues` de `monthlyCommissionLiquidation`
- Verificó permisos: vendor NO puede ejecutar cálculos manuales
- Sugirió pasos que SÍ puede hacer (revisar empresas, perfil)

---

## 📋 PASO 4: SINCRONIZACIÓN ENGINEERING-METADATA ↔ MODULES-REGISTRY

### Script de sincronización automática:

```javascript
// scripts/sync-metadata-registry.js

const fs = require('fs');
const engineeringMetadata = require('../engineering-metadata');
const modulesRegistryPath = './src/auditor/registry/modules-registry.json';

function syncMetadataToRegistry() {
  console.log('🔄 Sincronizando engineering-metadata.js → modules-registry.json...\n');

  // Cargar registry actual
  const modulesRegistry = JSON.parse(fs.readFileSync(modulesRegistryPath, 'utf8'));

  let updatedCount = 0;
  let newCount = 0;

  // Por cada módulo en engineering-metadata
  for (const [key, engineeringModule] of Object.entries(engineeringMetadata.modules)) {

    // Buscar en modules-registry
    let registryModule = modulesRegistry.find(m => m.id === key);

    // Si NO existe en registry → CREAR
    if (!registryModule) {
      console.log(`➕ Creando módulo "${key}" en registry...`);

      registryModule = {
        id: key,
        name: engineeringModule.name,
        category: engineeringModule.category.toLowerCase(),
        version: "1.0.0",
        description: engineeringModule.description || "",
        dependencies: engineeringModule.dependencies || { required: [], optional: [], integrates_with: [], provides_to: [] },
        api: engineeringModule.api || { base_path: "", endpoints: [] },
        database: engineeringModule.database || { tables: [], modifications: [] },
        help: {
          quickStart: "Tutorial pendiente",
          commonIssues: []
        },
        commercial: {
          is_core: engineeringModule.category === 'CORE',
          can_work_standalone: false,
          base_price_usd: 0
        }
      };

      modulesRegistry.push(registryModule);
      newCount++;

    } else {
      console.log(`🔄 Actualizando módulo "${key}" en registry...`);
      updatedCount++;
    }

    // SINCRONIZAR CAMPOS CRÍTICOS
    registryModule.name = engineeringModule.name;
    registryModule.description = engineeringModule.description || registryModule.description;
    registryModule.dependencies = engineeringModule.dependencies || registryModule.dependencies;
    registryModule.database = engineeringModule.database || registryModule.database;

    // Si hay knownIssues en engineering → agregar a commonIssues
    if (engineeringModule.knownIssues && engineeringModule.knownIssues.length > 0) {
      if (!registryModule.help) registryModule.help = { quickStart: "", commonIssues: [] };

      engineeringModule.knownIssues.forEach(issue => {
        const existingIssue = registryModule.help.commonIssues.find(i => i.problem === issue.description);
        if (!existingIssue) {
          registryModule.help.commonIssues.push({
            problem: issue.description,
            solution: issue.workaround || "Contactar a soporte técnico"
          });
        }
      });
    }
  }

  // Guardar registry actualizado
  fs.writeFileSync(
    modulesRegistryPath,
    JSON.stringify(modulesRegistry, null, 2),
    'utf8'
  );

  console.log(`\n✅ Sincronización completa:`);
  console.log(`   - Módulos nuevos: ${newCount}`);
  console.log(`   - Módulos actualizados: ${updatedCount}`);
  console.log(`   - Total en registry: ${modulesRegistry.length}`);
}

// Ejecutar
syncMetadataToRegistry();
```

**Uso**:
```bash
node scripts/sync-metadata-registry.js
```

---

## 🚀 PASO 5: COMANDO "ACTUALIZA INGENIERIA" (COMPLETO)

### Cuando el usuario dice "actualiza ingenieria":

```javascript
// En el flujo de Claude Code, ejecutar:

async function actualizarIngenieria(cambios) {
  console.log('🏗️ Actualizando Engineering Metadata...\n');

  // 1. Actualizar engineering-metadata.js
  await updateEngineeringMetadata(cambios);

  // 2. Sincronizar con modules-registry.json
  await syncMetadataToRegistry();

  // 3. Regenerar estadísticas del dashboard
  await regenerateEngineeringStats();

  // 4. Actualizar fecha y latestChanges
  await updateProjectMetadata(cambios);

  console.log('\n✅ Engineering metadata actualizado completamente');
  console.log('   Dashboard: http://localhost:9998/panel-administrativo.html → Tab Ingeniería');
}
```

---

## 📊 RESUMEN DE BENEFICIOS

| Beneficio | Descripción |
|-----------|-------------|
| **Tutoriales contextuales** | AI responde diferente según rol (empresa vs admin vs vendor) |
| **Soluciones proactivas** | AI detecta issues conocidos y sugiere soluciones antes que el usuario pregunte |
| **Permisos automáticos** | AI avisa si el usuario NO tiene permisos para hacer X acción |
| **Workflows guiados** | AI guía paso a paso en procesos complejos (contratos, facturación) |
| **Documentación viva** | engineering-metadata.js ES la fuente de verdad, siempre actualizada |
| **Reducción de tickets** | Usuarios resuelven problemas comunes SIN contactar soporte |

---

## 🔗 ARCHIVOS RELACIONADOS

- `backend/engineering-metadata.js` - Metadata completo (workflows, modules, knownIssues)
- `backend/src/auditor/registry/modules-registry.json` - Registry de módulos (help sections)
- `backend/src/services/AssistantService.js` - AI Assistant con Ollama + RAG
- `backend/scripts/sync-metadata-registry.js` - Script de sincronización
- `backend/COMANDOS-CLAUDE.md` - Comandos rápidos para Claude Code
- `backend/ARQUITECTURA-COMPLETA-ERP-COMISIONES.md` - Diseño completo de workflows

---

**IMPORTANTE**: Este documento es un DISEÑO. La implementación completa requiere:

1. ✅ Agregar secciones `help` a todos los workflows en `engineering-metadata.js`
2. ✅ Modificar `AssistantService.buildEnhancedContext()` con la lógica propuesta
3. ✅ Crear script `sync-metadata-registry.js`
4. ✅ Testear con casos reales (diferentes roles, módulos, workflows)
5. ⏸️ **NO modificar archivos de Phase 4** hasta que la otra sesión complete su trabajo

---

**NEXT STEPS**: Esperar confirmación del usuario para implementar.
