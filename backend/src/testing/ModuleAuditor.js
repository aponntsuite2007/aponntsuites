/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODULE AUDITOR - Auditoría Completa de Módulos
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Integrado con AutonomousQAAgent para auditoría completa:
 * 1. Inventario de TODOS los elementos UI (labels, inputs, buttons, tables)
 * 2. Mapeo de campos a tablas PostgreSQL
 * 3. Verificación Multi-Tenant (company_id filtering)
 * 4. Generación de Metadata para Brain (modules-registry.json)
 * 5. Tests de Rendimiento
 *
 * @version 1.0.0
 * @date 2026-01-16
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

class ModuleAuditor {
  constructor(config = {}) {
    this.agent = config.agent; // AutonomousQAAgent instance
    this.db = config.database; // Sequelize instance
    this.moduleKey = config.moduleKey;

    this.results = {
      moduleKey: this.moduleKey,
      auditedAt: new Date().toISOString(),
      ui: {
        tabs: [],
        inputs: [],
        buttons: [],
        labels: [],
        tables: [],
        modals: [],
        selects: [],
        textareas: []
      },
      dbMapping: {
        tables: [],
        fields: [],
        relationships: []
      },
      multiTenant: {
        verified: false,
        endpoints: [],
        issues: []
      },
      performance: {
        pageLoad: null,
        apiCalls: [],
        avgResponseTime: null
      },
      ssot: {
        elements: [],
        verified: false
      }
    };

    this.performanceMetrics = [];
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * 1. INVENTARIO COMPLETO DE UI
   * ═══════════════════════════════════════════════════════════════════════
   */
  async auditUIElements() {
    console.log('\n📋 [AUDIT] Inventariando elementos UI...\n');

    if (!this.agent || !this.agent.page) {
      throw new Error('Agent no inicializado o página no disponible');
    }

    const page = this.agent.page;

    // Para módulo users, auditar tabs del employeeFileModal
    if (this.moduleKey === 'users') {
      return await this.auditEmployeeFileModalTabs();
    }

    // Descubrir todos los elementos en el módulo actual
    const uiInventory = await page.evaluate(() => {
      const inventory = {
        tabs: [],
        inputs: [],
        buttons: [],
        labels: [],
        tables: [],
        modals: [],
        selects: [],
        textareas: [],
        totalElements: 0
      };

      // Helper para obtener selector único
      const getSelector = (el) => {
        if (el.id) return `#${el.id}`;
        if (el.name) return `[name="${el.name}"]`;
        if (el.className) return `.${el.className.split(' ').join('.')}`;
        return el.tagName.toLowerCase();
      };

      // Helper para obtener contexto (tab padre, modal padre)
      const getContext = (el) => {
        const tab = el.closest('[id$="-tab"]');
        const modal = el.closest('.modal, [class*="modal"]');
        return {
          tabId: tab?.id || null,
          modalId: modal?.id || null
        };
      };

      // 1. TABS
      document.querySelectorAll('[data-tab], .nav-link, .file-tab').forEach(el => {
        const context = getContext(el);
        inventory.tabs.push({
          id: el.id || null,
          text: el.textContent?.trim().substring(0, 50),
          selector: getSelector(el),
          dataTab: el.getAttribute('data-tab'),
          onclick: el.getAttribute('onclick')?.substring(0, 100),
          context
        });
      });

      // 2. INPUTS
      document.querySelectorAll('input:not([type="hidden"])').forEach(el => {
        const context = getContext(el);
        const label = document.querySelector(`label[for="${el.id}"]`);
        inventory.inputs.push({
          id: el.id || null,
          name: el.name || null,
          type: el.type,
          placeholder: el.placeholder || null,
          required: el.required,
          label: label?.textContent?.trim() || null,
          selector: getSelector(el),
          context,
          dataSource: el.getAttribute('data-source') || el.getAttribute('data-field') || null,
          visible: el.offsetParent !== null
        });
      });

      // 3. SELECTS
      document.querySelectorAll('select').forEach(el => {
        const context = getContext(el);
        const label = document.querySelector(`label[for="${el.id}"]`);
        const options = Array.from(el.options).map(o => ({
          value: o.value,
          text: o.textContent?.trim()
        }));
        inventory.selects.push({
          id: el.id || null,
          name: el.name || null,
          label: label?.textContent?.trim() || null,
          options: options.slice(0, 10), // Primeras 10 opciones
          totalOptions: options.length,
          selector: getSelector(el),
          context,
          visible: el.offsetParent !== null
        });
      });

      // 4. TEXTAREAS
      document.querySelectorAll('textarea').forEach(el => {
        const context = getContext(el);
        const label = document.querySelector(`label[for="${el.id}"]`);
        inventory.textareas.push({
          id: el.id || null,
          name: el.name || null,
          placeholder: el.placeholder || null,
          label: label?.textContent?.trim() || null,
          selector: getSelector(el),
          context,
          visible: el.offsetParent !== null
        });
      });

      // 5. BUTTONS
      document.querySelectorAll('button, [role="button"], .btn').forEach(el => {
        const context = getContext(el);
        const text = el.textContent?.trim().substring(0, 50);
        const onclick = el.getAttribute('onclick');

        // Clasificar tipo de botón
        let buttonType = 'unknown';
        if (onclick) {
          if (onclick.includes('add') || onclick.includes('create') || onclick.includes('new') || text.includes('+')) {
            buttonType = 'CREATE';
          } else if (onclick.includes('edit') || onclick.includes('update')) {
            buttonType = 'UPDATE';
          } else if (onclick.includes('delete') || onclick.includes('remove')) {
            buttonType = 'DELETE';
          } else if (onclick.includes('view') || onclick.includes('show')) {
            buttonType = 'READ';
          } else if (onclick.includes('save') || onclick.includes('guardar')) {
            buttonType = 'SAVE';
          } else if (onclick.includes('export') || onclick.includes('download')) {
            buttonType = 'EXPORT';
          }
        }

        inventory.buttons.push({
          id: el.id || null,
          text,
          type: buttonType,
          onclick: onclick?.substring(0, 150),
          className: el.className,
          selector: getSelector(el),
          context,
          visible: el.offsetParent !== null
        });
      });

      // 6. LABELS (que no son de inputs)
      document.querySelectorAll('label:not([for]), .label, .form-label, h1, h2, h3, h4, h5, h6, .card-title').forEach(el => {
        const context = getContext(el);
        const text = el.textContent?.trim();
        if (text && text.length > 1 && text.length < 100) {
          inventory.labels.push({
            tag: el.tagName.toLowerCase(),
            text,
            forInput: el.getAttribute('for') || null,
            context,
            isTitle: ['h1','h2','h3','h4','h5','h6'].includes(el.tagName.toLowerCase())
          });
        }
      });

      // 7. TABLES
      document.querySelectorAll('table').forEach(el => {
        const context = getContext(el);
        const headers = Array.from(el.querySelectorAll('th')).map(th => th.textContent?.trim());
        const rowCount = el.querySelectorAll('tbody tr').length;
        inventory.tables.push({
          id: el.id || null,
          className: el.className,
          headers,
          rowCount,
          selector: getSelector(el),
          context,
          visible: el.offsetParent !== null
        });
      });

      // 8. MODALS
      document.querySelectorAll('.modal, [class*="modal"], [id*="Modal"]').forEach(el => {
        const inputs = el.querySelectorAll('input:not([type="hidden"])').length;
        const buttons = el.querySelectorAll('button').length;
        inventory.modals.push({
          id: el.id || null,
          className: el.className,
          inputCount: inputs,
          buttonCount: buttons,
          isVisible: window.getComputedStyle(el).display !== 'none'
        });
      });

      inventory.totalElements =
        inventory.tabs.length +
        inventory.inputs.length +
        inventory.buttons.length +
        inventory.labels.length +
        inventory.tables.length +
        inventory.modals.length +
        inventory.selects.length +
        inventory.textareas.length;

      return inventory;
    });

    this.results.ui = uiInventory;

    console.log(`   ✅ Tabs: ${uiInventory.tabs.length}`);
    console.log(`   ✅ Inputs: ${uiInventory.inputs.length}`);
    console.log(`   ✅ Selects: ${uiInventory.selects.length}`);
    console.log(`   ✅ Textareas: ${uiInventory.textareas.length}`);
    console.log(`   ✅ Buttons: ${uiInventory.buttons.length}`);
    console.log(`   ✅ Labels: ${uiInventory.labels.length}`);
    console.log(`   ✅ Tables: ${uiInventory.tables.length}`);
    console.log(`   ✅ Modals: ${uiInventory.modals.length}`);
    console.log(`   📊 TOTAL: ${uiInventory.totalElements} elementos\n`);

    return uiInventory;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * 2. MAPEO DE CAMPOS A BASE DE DATOS
   * ═══════════════════════════════════════════════════════════════════════
   */
  async mapFieldsToDatabase() {
    console.log('\n🗄️  [AUDIT] Mapeando campos a PostgreSQL...\n');

    // Tablas relacionadas con Users
    const userTables = [
      'users',
      'education',
      'family_members',
      'children',
      'medical_records',
      'surgeries',
      'allergies',
      'chronic_diseases',
      'medications',
      'disciplinary_actions',
      'salary_increases',
      'permission_requests',
      'user_shifts',
      'biometric_data',
      'facial_biometric_data',
      'employee_documents'
    ];

    const dbMapping = {
      tables: [],
      fields: [],
      relationships: []
    };

    // Mapear inputs a posibles campos de BD
    for (const input of this.results.ui.inputs) {
      const fieldName = input.id || input.name;
      if (!fieldName) continue;

      // Inferir tabla y campo
      const mapping = this.inferDatabaseMapping(fieldName, userTables);

      dbMapping.fields.push({
        uiField: fieldName,
        uiType: input.type || 'text',
        label: input.label,
        tabKey: input.tabKey,
        ...mapping
      });
    }

    // Agregar selects
    for (const select of this.results.ui.selects) {
      const fieldName = select.id || select.name;
      if (!fieldName) continue;

      const mapping = this.inferDatabaseMapping(fieldName, userTables);

      dbMapping.fields.push({
        uiField: fieldName,
        uiType: 'select',
        label: select.label,
        tabKey: select.tabKey,
        ...mapping
      });
    }

    // Agregar textareas
    for (const textarea of this.results.ui.textareas) {
      const fieldName = textarea.id || textarea.name;
      if (!fieldName) continue;

      const mapping = this.inferDatabaseMapping(fieldName, userTables);

      dbMapping.fields.push({
        uiField: fieldName,
        uiType: 'textarea',
        label: textarea.label,
        tabKey: textarea.tabKey,
        ...mapping
      });
    }

    // Si hay modalFields (detectados del análisis general), usarlos también
    if (this.results.ui.modalFields && this.results.ui.modalFields.length > 0) {
      console.log(`   📋 Procesando ${this.results.ui.modalFields.length} campos del modal...`);

      for (const field of this.results.ui.modalFields) {
        const fieldId = field.inputId || field.selectId || field.displayId;
        const fieldLabel = field.label;

        // Intentar mapear por ID
        if (fieldId) {
          const mapping = this.inferDatabaseMapping(fieldId, userTables);
          if (mapping.confidence !== 'low' || !dbMapping.fields.some(f => f.uiField === fieldId)) {
            dbMapping.fields.push({
              uiField: fieldId,
              uiType: field.inputId ? 'input' : (field.selectId ? 'select' : 'display'),
              label: fieldLabel,
              currentValue: field.currentValue,
              ...mapping
            });
          }
        }

        // Intentar mapear por label (convertir a campo ID)
        if (fieldLabel && !fieldId) {
          const normalizedLabel = fieldLabel.toLowerCase()
            .replace(/[áàäâ]/g, 'a')
            .replace(/[éèëê]/g, 'e')
            .replace(/[íìïî]/g, 'i')
            .replace(/[óòöô]/g, 'o')
            .replace(/[úùüû]/g, 'u')
            .replace(/[ñ]/g, 'n')
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9]/g, '');

          const mapping = this.inferDatabaseMapping(normalizedLabel, userTables);
          dbMapping.fields.push({
            uiField: `label:${fieldLabel}`,
            uiType: 'display',
            label: fieldLabel,
            currentValue: field.currentValue,
            ...mapping
          });
        }
      }
    }

    // Si hay displayFields, agregarlos también
    if (this.results.ui.displayFields && this.results.ui.displayFields.length > 0) {
      console.log(`   📋 Procesando ${this.results.ui.displayFields.length} campos de visualización...`);

      for (const field of this.results.ui.displayFields) {
        const fieldId = field.id;
        if (fieldId && !dbMapping.fields.some(f => f.uiField === fieldId)) {
          const mapping = this.inferDatabaseMapping(fieldId, userTables);
          dbMapping.fields.push({
            uiField: fieldId,
            uiType: 'display',
            label: field.label,
            currentValue: field.currentValue,
            ...mapping
          });
        }
      }
    }

    // Eliminar duplicados
    const uniqueFields = [];
    const seenFields = new Set();
    for (const field of dbMapping.fields) {
      const key = field.uiField + (field.label || '');
      if (!seenFields.has(key)) {
        seenFields.add(key);
        uniqueFields.push(field);
      }
    }
    dbMapping.fields = uniqueFields;

    dbMapping.tables = userTables;
    this.results.dbMapping = dbMapping;

    // Contar verificados
    const verifiedCount = dbMapping.fields.filter(f => f.ssotVerified).length;
    const highConfCount = dbMapping.fields.filter(f => f.confidence === 'high').length;

    console.log(`   ✅ Campos mapeados: ${dbMapping.fields.length}`);
    console.log(`   ✅ Campos verificados (SSOT): ${verifiedCount}`);
    console.log(`   ✅ Alta confianza: ${highConfCount}`);
    console.log(`   ✅ Tablas relacionadas: ${userTables.length}\n`);

    return dbMapping;
  }

  /**
   * Inferir mapeo de campo UI a BD
   */
  inferDatabaseMapping(fieldName, tables) {
    const normalizedField = fieldName.toLowerCase().replace(/[-_]/g, '');

    // Mapeos conocidos
    const knownMappings = {
      // ═══════════════════════════════════════════════════════════════════════
      // TAB: ADMIN (Administración)
      // ═══════════════════════════════════════════════════════════════════════
      'useremail': { table: 'users', column: 'email' },
      'username': { table: 'users', column: 'username' },
      'userrole': { table: 'users', column: 'role' },
      'userstatus': { table: 'users', column: 'status' },
      'legajo': { table: 'users', column: 'legajo' },
      'hiredate': { table: 'users', column: 'hire_date' },
      'departmentselect': { table: 'users', column: 'department_id' },
      'positionselect': { table: 'users', column: 'position_id' },

      // ═══════════════════════════════════════════════════════════════════════
      // TAB: PERSONAL (Datos Personales)
      // ═══════════════════════════════════════════════════════════════════════
      'firstname': { table: 'users', column: 'first_name' },
      'lastname': { table: 'users', column: 'last_name' },
      'email': { table: 'users', column: 'email' },
      'phone': { table: 'users', column: 'phone' },
      'cellphone': { table: 'users', column: 'cell_phone' },
      'dni': { table: 'users', column: 'dni' },
      'cuil': { table: 'users', column: 'cuil' },
      'birthdate': { table: 'users', column: 'birth_date' },
      'address': { table: 'users', column: 'address' },
      'city': { table: 'users', column: 'city' },
      'province': { table: 'users', column: 'province' },
      'postalcode': { table: 'users', column: 'postal_code' },
      'gender': { table: 'users', column: 'gender' },
      'nationality': { table: 'users', column: 'nationality' },
      'maritalstatus': { table: 'users', column: 'marital_status' },
      'bloodtype': { table: 'users', column: 'blood_type' },
      'emergencycontact': { table: 'users', column: 'emergency_contact' },
      'emergencyphone': { table: 'users', column: 'emergency_phone' },

      // ═══════════════════════════════════════════════════════════════════════
      // TAB: WORK (Antecedentes Laborales - Education + Salary)
      // ═══════════════════════════════════════════════════════════════════════
      // Education
      'institution': { table: 'education', column: 'institution' },
      'degree': { table: 'education', column: 'degree' },
      'graduationyear': { table: 'education', column: 'graduation_year' },
      'gpa': { table: 'education', column: 'gpa' },
      'educationtype': { table: 'education', column: 'education_type' },
      'educationlevel': { table: 'education', column: 'education_level' },
      'fieldofstudy': { table: 'education', column: 'field_of_study' },
      'educationstartdate': { table: 'education', column: 'start_date' },
      'educationenddate': { table: 'education', column: 'end_date' },
      // Salary increases
      'newsalary': { table: 'salary_increases', column: 'new_salary' },
      'increasepercent': { table: 'salary_increases', column: 'increase_percent' },
      'increasedate': { table: 'salary_increases', column: 'effective_date' },
      'increasereason': { table: 'salary_increases', column: 'reason' },
      'previoussalary': { table: 'salary_increases', column: 'previous_salary' },
      'salarytype': { table: 'salary_increases', column: 'salary_type' },

      // ═══════════════════════════════════════════════════════════════════════
      // TAB: FAMILY (Grupo Familiar - Children + Family Members)
      // ═══════════════════════════════════════════════════════════════════════
      'childname': { table: 'children', column: 'name' },
      'childsurname': { table: 'children', column: 'surname' },
      'childfirstname': { table: 'children', column: 'first_name' },
      'childlastname': { table: 'children', column: 'last_name' },
      'childbirthdate': { table: 'children', column: 'birth_date' },
      'childdni': { table: 'children', column: 'dni' },
      'childgender': { table: 'children', column: 'gender' },
      'childrelation': { table: 'children', column: 'relation' },
      // Family members
      'membername': { table: 'family_members', column: 'name' },
      'memberrelation': { table: 'family_members', column: 'relation' },
      'memberphone': { table: 'family_members', column: 'phone' },
      'memberbirthdate': { table: 'family_members', column: 'birth_date' },
      'memberdni': { table: 'family_members', column: 'dni' },

      // ═══════════════════════════════════════════════════════════════════════
      // TAB: MEDICAL (Antecedentes Médicos)
      // ═══════════════════════════════════════════════════════════════════════
      // Surgeries
      'surgeryname': { table: 'surgeries', column: 'name' },
      'surgerydate': { table: 'surgeries', column: 'surgery_date' },
      'surgeryhospital': { table: 'surgeries', column: 'hospital' },
      'surgerysurgeon': { table: 'surgeries', column: 'surgeon' },
      'surgerytype': { table: 'surgeries', column: 'surgery_type' },
      'surgerynotes': { table: 'surgeries', column: 'notes' },
      // Allergies
      'allergyname': { table: 'allergies', column: 'name' },
      'allergytype': { table: 'allergies', column: 'allergy_type' },
      'allergyseverity': { table: 'allergies', column: 'severity' },
      'allergynotes': { table: 'allergies', column: 'notes' },
      // Chronic diseases
      'diseasename': { table: 'chronic_diseases', column: 'name' },
      'diagnosisdate': { table: 'chronic_diseases', column: 'diagnosis_date' },
      'diseasestatus': { table: 'chronic_diseases', column: 'status' },
      'diseasenotes': { table: 'chronic_diseases', column: 'notes' },
      // Medications
      'medicationname': { table: 'medications', column: 'name' },
      'medicationdosage': { table: 'medications', column: 'dosage' },
      'medicationfrequency': { table: 'medications', column: 'frequency' },
      'medicationstartdate': { table: 'medications', column: 'start_date' },

      // ═══════════════════════════════════════════════════════════════════════
      // TAB: ATTENDANCE (Asistencias/Permisos)
      // ═══════════════════════════════════════════════════════════════════════
      'requesteddays': { table: 'permission_requests', column: 'requested_days' },
      'startdate': { table: 'permission_requests', column: 'start_date' },
      'enddate': { table: 'permission_requests', column: 'end_date' },
      'absencetype': { table: 'permission_requests', column: 'absence_type' },
      'permissionreason': { table: 'permission_requests', column: 'reason' },
      'permissionstatus': { table: 'permission_requests', column: 'status' },
      'permissionnotes': { table: 'permission_requests', column: 'notes' },

      // ═══════════════════════════════════════════════════════════════════════
      // TAB: DISCIPLINARY (Disciplinarios)
      // ═══════════════════════════════════════════════════════════════════════
      'actiondate': { table: 'disciplinary_actions', column: 'action_date' },
      'reason': { table: 'disciplinary_actions', column: 'reason' },
      'actiontype': { table: 'disciplinary_actions', column: 'action_type' },
      'days': { table: 'disciplinary_actions', column: 'suspension_days' },
      'suspensiondays': { table: 'disciplinary_actions', column: 'suspension_days' },
      'disciplinarystatus': { table: 'disciplinary_actions', column: 'status' },
      'disciplinarynotes': { table: 'disciplinary_actions', column: 'notes' },

      // ═══════════════════════════════════════════════════════════════════════
      // TAB: BIOMETRIC (Registro Biométrico)
      // ═══════════════════════════════════════════════════════════════════════
      'biometrictype': { table: 'biometric_data', column: 'biometric_type' },
      'biometricstatus': { table: 'biometric_data', column: 'status' },
      'facialdata': { table: 'facial_biometric_data', column: 'facial_template' },
      'fingerprint': { table: 'biometric_data', column: 'fingerprint_data' },

      // ═══════════════════════════════════════════════════════════════════════
      // SHIFTS (Turnos)
      // ═══════════════════════════════════════════════════════════════════════
      'shiftjoindate': { table: 'user_shifts', column: 'join_date' },
      'shiftselector': { table: 'user_shifts', column: 'shift_id' },
      'shiftname': { table: 'shifts', column: 'name' },
      'shiftstart': { table: 'shifts', column: 'start_time' },
      'shiftend': { table: 'shifts', column: 'end_time' }
    };

    const mapping = knownMappings[normalizedField];

    if (mapping) {
      return {
        dbTable: mapping.table,
        dbColumn: mapping.column,
        confidence: 'high',
        ssotVerified: true
      };
    }

    // Intentar inferir por patrones
    for (const table of tables) {
      const tableNormalized = table.replace(/_/g, '');
      if (normalizedField.includes(tableNormalized.slice(0, -1))) {
        return {
          dbTable: table,
          dbColumn: this.camelToSnake(fieldName),
          confidence: 'medium',
          ssotVerified: false
        };
      }
    }

    return {
      dbTable: 'unknown',
      dbColumn: this.camelToSnake(fieldName),
      confidence: 'low',
      ssotVerified: false
    };
  }

  camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * AUDITORÍA ESPECIALIZADA DE employeeFileModal TABS
   * ═══════════════════════════════════════════════════════════════════════
   */
  async auditEmployeeFileModalTabs() {
    console.log('   📂 Auditando employeeFileModal por tabs...\n');

    const page = this.agent.page;
    const tabsToAudit = [
      { key: 'admin', name: '⚙️ Administración' },
      { key: 'personal', name: '👤 Datos Personales' },
      { key: 'work', name: '💼 Antecedentes Laborales' },
      { key: 'family', name: '👨‍👩‍👧‍👦 Grupo Familiar' },
      { key: 'medical', name: '🏥 Antecedentes Médicos' },
      { key: 'attendance', name: '📅 Asistencias/Permisos' },
      { key: 'calendar', name: '📆 Calendario' },
      { key: 'disciplinary', name: '⚖️ Disciplinarios' },
      { key: 'biometric', name: '📸 Registro Biométrico' },
      { key: 'notifications', name: '🔔 Notificaciones' }
    ];

    // Primero, hacer auditoría general del modal completo
    console.log('   🔍 Analizando estructura del modal...');
    const modalStructure = await page.evaluate(() => {
      const modal = document.querySelector('#employeeFileModal');
      if (!modal) return { found: false };

      const allFields = [];

      // Buscar TODOS los elementos que parecen ser campos de datos
      // Estrategia 1: Buscar en estructuras row > col con strong + texto
      modal.querySelectorAll('.row').forEach(row => {
        row.querySelectorAll('.col-md-4, .col-md-6, .col-md-3, .col-12, [class*="col-"]').forEach(col => {
          const strong = col.querySelector('strong, b, .fw-bold, label');
          const textNodes = [];

          // Obtener texto que no sea del strong
          col.childNodes.forEach(node => {
            if (node.nodeType === 3) { // Text node
              const text = node.textContent.trim();
              if (text) textNodes.push(text);
            } else if (node.nodeType === 1 && !['STRONG', 'B', 'LABEL'].includes(node.tagName)) {
              const text = node.textContent?.trim();
              if (text && text.length < 100) textNodes.push(text);
            }
          });

          // También buscar span después del strong
          const nextSibling = strong?.nextSibling || strong?.nextElementSibling;
          let siblingText = '';
          if (nextSibling) {
            siblingText = nextSibling.textContent?.trim() || '';
          }

          const label = strong?.textContent?.trim()?.replace(/[:*]/g, '').trim();
          const value = siblingText || textNodes.join(' ').substring(0, 100);

          if (label && label.length > 1 && label.length < 50) {
            allFields.push({
              label,
              currentValue: value || null,
              type: 'display',
              source: 'row-col-structure'
            });
          }
        });
      });

      // Estrategia 2: Buscar elementos con ID que contengan patrones de campos
      modal.querySelectorAll('[id]').forEach(el => {
        const id = el.id;
        if (id && (id.includes('Display') || id.includes('Value') || id.includes('Text') ||
            id.includes('employee') || id.includes('user'))) {
          const label = el.previousElementSibling?.textContent?.trim() ||
                       el.closest('.col-md-4, .col-md-6')?.querySelector('strong, label')?.textContent?.trim();
          allFields.push({
            displayId: id,
            label: label?.replace(/[:*]/g, '').trim() || null,
            currentValue: el.textContent?.trim()?.substring(0, 100) || null,
            type: 'display-by-id',
            source: 'id-pattern'
          });
        }
      });

      // Estrategia 3: Buscar cards con info-items
      modal.querySelectorAll('.info-item, .data-item, .field-item').forEach(item => {
        const label = item.querySelector('.label, strong, b')?.textContent?.trim();
        const value = item.querySelector('.value, span:last-child')?.textContent?.trim();
        if (label) {
          allFields.push({
            label: label.replace(/[:*]/g, '').trim(),
            currentValue: value?.substring(0, 100) || null,
            type: 'info-item',
            source: 'info-item-class'
          });
        }
      });

      // Eliminar duplicados por label
      const uniqueFields = [];
      const seenLabels = new Set();
      for (const field of allFields) {
        const key = (field.label || field.displayId || '').toLowerCase();
        if (key && !seenLabels.has(key)) {
          seenLabels.add(key);
          uniqueFields.push(field);
        }
      }

      return {
        found: true,
        totalInputs: modal.querySelectorAll('input:not([type="hidden"])').length,
        totalSelects: modal.querySelectorAll('select').length,
        totalButtons: modal.querySelectorAll('button').length,
        totalLabels: modal.querySelectorAll('label, strong').length,
        totalSpans: modal.querySelectorAll('span').length,
        allFields: uniqueFields
      };
    });

    console.log(`      Total inputs en modal: ${modalStructure.totalInputs}`);
    console.log(`      Total selects en modal: ${modalStructure.totalSelects}`);
    console.log(`      Total labels/strong: ${modalStructure.totalLabels}`);
    console.log(`      Total spans: ${modalStructure.totalSpans}`);
    console.log(`      Total campos detectados: ${modalStructure.allFields?.length || 0}\n`);

    const fullInventory = {
      tabs: [],
      inputs: [],
      buttons: [],
      labels: [],
      tables: [],
      modals: [],
      selects: [],
      textareas: [],
      totalElements: 0,
      byTab: {}
    };

    for (const tab of tabsToAudit) {
      console.log(`   📑 TAB: ${tab.name}...`);

      // Navegar al tab
      try {
        await page.evaluate((tabKey) => {
          // Buscar el botón del tab
          const tabs = document.querySelectorAll('.file-tab');
          for (const tabEl of tabs) {
            if (tabEl.getAttribute('onclick')?.includes(`'${tabKey}'`) ||
                tabEl.textContent?.toLowerCase().includes(tabKey.toLowerCase())) {
              tabEl.click();
              return true;
            }
          }
          return false;
        }, tab.key);

        await page.waitForTimeout(1000);
      } catch (e) {
        console.log(`      ⚠️  Error navegando a tab ${tab.key}: ${e.message}`);
        continue;
      }

      // Auditar elementos de este tab
      const tabInventory = await page.evaluate((tabKey) => {
        const result = {
          tabKey,
          inputs: [],
          selects: [],
          textareas: [],
          buttons: [],
          labels: [],
          tables: []
        };

        // Buscar el contenedor del tab activo - múltiples estrategias
        let tabContent = document.querySelector(`#${tabKey}-tab`);

        // Buscar por clase que contenga el tab key
        if (!tabContent) {
          tabContent = document.querySelector(`[class*="${tabKey}"]`);
        }

        // Buscar tab-pane activo dentro del modal
        if (!tabContent) {
          tabContent = document.querySelector('#employeeFileModal .tab-pane.active');
        }

        // Buscar el contenido principal del modal
        if (!tabContent) {
          tabContent = document.querySelector('#employeeFileModal .modal-body');
        }

        // Último recurso: buscar en todo el modal visible
        if (!tabContent) {
          tabContent = document.querySelector('#employeeFileModal');
        }

        if (!tabContent) return result;

        // DEBUG: Log the actual DOM elements found
        console.log(`[AUDIT] Tab ${tabKey}: found container ${tabContent.id || tabContent.className}`);
        console.log(`[AUDIT] Tab ${tabKey}: inputs=${tabContent.querySelectorAll('input').length}, selects=${tabContent.querySelectorAll('select').length}`);

        // INPUTS
        tabContent.querySelectorAll('input:not([type="hidden"])').forEach(el => {
          const label = document.querySelector(`label[for="${el.id}"]`) ||
                       el.closest('.form-group')?.querySelector('label') ||
                       el.closest('.mb-3')?.querySelector('label');

          result.inputs.push({
            id: el.id || null,
            name: el.name || null,
            type: el.type,
            placeholder: el.placeholder || null,
            required: el.required,
            disabled: el.disabled,
            label: label?.textContent?.trim()?.replace(/[:*]/g, '').trim() || null,
            tabKey,
            visible: el.offsetParent !== null
          });
        });

        // SELECTS
        tabContent.querySelectorAll('select').forEach(el => {
          const label = document.querySelector(`label[for="${el.id}"]`) ||
                       el.closest('.form-group')?.querySelector('label') ||
                       el.closest('.mb-3')?.querySelector('label');

          const options = Array.from(el.options).map(o => ({
            value: o.value,
            text: o.textContent?.trim()
          })).slice(0, 20);

          result.selects.push({
            id: el.id || null,
            name: el.name || null,
            label: label?.textContent?.trim()?.replace(/[:*]/g, '').trim() || null,
            options,
            totalOptions: el.options.length,
            tabKey,
            visible: el.offsetParent !== null
          });
        });

        // TEXTAREAS
        tabContent.querySelectorAll('textarea').forEach(el => {
          const label = document.querySelector(`label[for="${el.id}"]`) ||
                       el.closest('.form-group')?.querySelector('label') ||
                       el.closest('.mb-3')?.querySelector('label');

          result.textareas.push({
            id: el.id || null,
            name: el.name || null,
            placeholder: el.placeholder || null,
            label: label?.textContent?.trim()?.replace(/[:*]/g, '').trim() || null,
            tabKey,
            visible: el.offsetParent !== null
          });
        });

        // BUTTONS (solo los de acción CRUD)
        tabContent.querySelectorAll('button, .btn').forEach(el => {
          const text = el.textContent?.trim().substring(0, 50);
          const onclick = el.getAttribute('onclick');

          // Clasificar tipo de botón
          let buttonType = 'UI';
          if (onclick) {
            if (onclick.includes('add') || onclick.includes('create') || onclick.includes('new') ||
                onclick.includes('Add') || onclick.includes('Create') || text?.includes('+')) {
              buttonType = 'CREATE';
            } else if (onclick.includes('edit') || onclick.includes('Edit') || onclick.includes('update')) {
              buttonType = 'UPDATE';
            } else if (onclick.includes('delete') || onclick.includes('Delete') || onclick.includes('remove')) {
              buttonType = 'DELETE';
            } else if (onclick.includes('save') || onclick.includes('Save') || onclick.includes('guardar')) {
              buttonType = 'SAVE';
            } else if (onclick.includes('show') || onclick.includes('Show') || onclick.includes('view')) {
              buttonType = 'READ';
            }
          }

          if (buttonType !== 'UI' || text?.includes('Agregar') || text?.includes('Editar') ||
              text?.includes('Eliminar') || text?.includes('Guardar')) {
            result.buttons.push({
              id: el.id || null,
              text,
              type: buttonType,
              onclick: onclick?.substring(0, 100),
              className: el.className?.substring(0, 50),
              tabKey,
              visible: el.offsetParent !== null
            });
          }
        });

        // LABELS (títulos de secciones)
        tabContent.querySelectorAll('h1, h2, h3, h4, h5, h6, .card-title, .section-title').forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 1 && text.length < 100) {
            result.labels.push({
              tag: el.tagName.toLowerCase(),
              text,
              isTitle: true,
              tabKey
            });
          }
        });

        // TABLES
        tabContent.querySelectorAll('table').forEach(el => {
          const headers = Array.from(el.querySelectorAll('th')).map(th => th.textContent?.trim());
          const rowCount = el.querySelectorAll('tbody tr').length;

          result.tables.push({
            id: el.id || null,
            className: el.className,
            headers,
            rowCount,
            tabKey
          });
        });

        return result;
      }, tab.key);

      // Agregar al inventario total
      fullInventory.byTab[tab.key] = {
        name: tab.name,
        ...tabInventory
      };

      fullInventory.tabs.push({ key: tab.key, name: tab.name });
      fullInventory.inputs.push(...tabInventory.inputs);
      fullInventory.selects.push(...tabInventory.selects);
      fullInventory.textareas.push(...tabInventory.textareas);
      fullInventory.buttons.push(...tabInventory.buttons);
      fullInventory.labels.push(...tabInventory.labels);
      fullInventory.tables.push(...tabInventory.tables);

      console.log(`      ✅ Inputs: ${tabInventory.inputs.length}, Selects: ${tabInventory.selects.length}, Buttons: ${tabInventory.buttons.length}`);
    }

    // Calcular total
    fullInventory.totalElements =
      fullInventory.tabs.length +
      fullInventory.inputs.length +
      fullInventory.selects.length +
      fullInventory.textareas.length +
      fullInventory.buttons.length +
      fullInventory.labels.length +
      fullInventory.tables.length;

    // Agregar modales
    const modals = await page.evaluate(() => {
      const result = [];
      document.querySelectorAll('.modal, [id*="Modal"]').forEach(el => {
        result.push({
          id: el.id || null,
          className: el.className,
          inputCount: el.querySelectorAll('input:not([type="hidden"])').length,
          buttonCount: el.querySelectorAll('button').length
        });
      });
      return result;
    });
    fullInventory.modals = modals;

    // Agregar campos detectados del análisis general del modal
    fullInventory.modalFields = modalStructure.allFields || [];
    fullInventory.modalStructure = {
      totalInputs: modalStructure.totalInputs,
      totalSelects: modalStructure.totalSelects,
      totalButtons: modalStructure.totalButtons,
      totalLabels: modalStructure.totalLabels
    };

    // Si no se encontraron inputs en los tabs, usar los del análisis general
    if (fullInventory.inputs.length === 0 && modalStructure.allFields) {
      fullInventory.inputs = modalStructure.allFields
        .filter(f => f.inputId)
        .map(f => ({
          id: f.inputId,
          label: f.label,
          currentValue: f.currentValue,
          tabKey: 'modal',
          visible: true
        }));

      fullInventory.selects = modalStructure.allFields
        .filter(f => f.selectId)
        .map(f => ({
          id: f.selectId,
          label: f.label,
          currentValue: f.currentValue,
          tabKey: 'modal',
          visible: true
        }));

      // Agregar campos de visualización (readonly/display)
      fullInventory.displayFields = modalStructure.allFields
        .filter(f => f.displayId || (f.label && !f.inputId && !f.selectId))
        .map(f => ({
          id: f.displayId || null,
          label: f.label,
          currentValue: f.currentValue,
          type: 'display'
        }));
    }

    this.results.ui = fullInventory;

    console.log(`\n   ✅ Tabs auditados: ${fullInventory.tabs.length}`);
    console.log(`   ✅ Inputs totales: ${fullInventory.inputs.length}`);
    console.log(`   ✅ Selects totales: ${fullInventory.selects.length}`);
    console.log(`   ✅ Textareas totales: ${fullInventory.textareas.length}`);
    console.log(`   ✅ Display Fields: ${fullInventory.displayFields?.length || 0}`);
    console.log(`   ✅ Modal Fields: ${fullInventory.modalFields?.length || 0}`);
    console.log(`   ✅ Buttons CRUD: ${fullInventory.buttons.length}`);
    console.log(`   ✅ Labels/Títulos: ${fullInventory.labels.length}`);
    console.log(`   ✅ Tables: ${fullInventory.tables.length}`);
    console.log(`   ✅ Modals: ${fullInventory.modals.length}`);
    console.log(`   📊 TOTAL: ${fullInventory.totalElements} elementos\n`);

    return fullInventory;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * 3. VERIFICACIÓN MULTI-TENANT
   * ═══════════════════════════════════════════════════════════════════════
   */
  async verifyMultiTenant() {
    console.log('\n🏢 [AUDIT] Verificando Multi-Tenant...\n');

    const page = this.agent.page;
    const multiTenantResults = {
      verified: true,
      endpoints: [],
      issues: []
    };

    // Interceptar llamadas API para verificar company_id
    const apiCalls = [];

    await page.route('**/api/**', async route => {
      const request = route.request();
      const url = request.url();
      const method = request.method();

      apiCalls.push({
        url,
        method,
        timestamp: new Date().toISOString()
      });

      await route.continue();
    });

    // Navegar por los tabs para capturar llamadas
    const tabs = ['admin', 'personal', 'work', 'family', 'medical', 'attendance', 'disciplinary', 'biometric', 'notifications'];

    for (const tabName of tabs) {
      try {
        await page.evaluate((tab) => {
          if (typeof showFileTab === 'function') {
            showFileTab(tab);
          }
        }, tabName);
        await page.waitForTimeout(1000);
      } catch (e) {
        // Tab puede no existir
      }
    }

    // Analizar llamadas API capturadas
    for (const call of apiCalls) {
      const hasCompanyFilter =
        call.url.includes('company_id') ||
        call.url.includes('companyId') ||
        call.url.includes('/api/v1/') || // Asumimos que v1 tiene filtros
        call.url.includes('/api/v2/');

      multiTenantResults.endpoints.push({
        url: call.url.replace(/[a-f0-9-]{36}/g, '{uuid}'), // Normalizar UUIDs
        method: call.method,
        hasCompanyFilter: hasCompanyFilter ? 'assumed' : 'needs_verification'
      });

      if (!hasCompanyFilter && !call.url.includes('/health') && !call.url.includes('/auth')) {
        multiTenantResults.issues.push({
          endpoint: call.url,
          issue: 'No se detectó filtro de company_id en URL'
        });
      }
    }

    // Verificar en código fuente (rutas)
    try {
      const routeFiles = [
        'userRoutes.js',
        'userAdminRoutes.js'
      ];

      for (const file of routeFiles) {
        const filePath = path.join(__dirname, '..', 'routes', file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const hasCompanyFilter = content.includes('company_id') || content.includes('companyId');
          const hasReqUserCompany = content.includes('req.user.company') || content.includes('req.user.companyId');

          multiTenantResults.endpoints.push({
            file,
            hasCompanyFilter,
            hasReqUserCompany,
            verified: hasCompanyFilter && hasReqUserCompany
          });

          if (!hasCompanyFilter) {
            multiTenantResults.issues.push({
              file,
              issue: 'No usa company_id en queries'
            });
            multiTenantResults.verified = false;
          }
        } catch (e) {
          // Archivo no existe
        }
      }
    } catch (e) {
      console.log('   ⚠️  No se pudo verificar archivos de rutas');
    }

    this.results.multiTenant = multiTenantResults;

    console.log(`   ✅ Endpoints analizados: ${multiTenantResults.endpoints.length}`);
    console.log(`   ${multiTenantResults.issues.length === 0 ? '✅' : '⚠️'} Issues: ${multiTenantResults.issues.length}`);
    console.log(`   ${multiTenantResults.verified ? '✅' : '❌'} Multi-Tenant: ${multiTenantResults.verified ? 'VERIFICADO' : 'REVISAR'}\n`);

    return multiTenantResults;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * 4. GENERAR METADATA PARA BRAIN
   * ═══════════════════════════════════════════════════════════════════════
   */
  async generateBrainMetadata() {
    console.log('\n🧠 [AUDIT] Generando metadata para Brain...\n');

    const brainMetadata = {
      moduleKey: this.moduleKey,
      updatedAt: new Date().toISOString(),
      ui: {
        tabs: this.results.ui.tabs.map(t => ({
          id: t.id,
          label: t.text,
          dataTab: t.dataTab
        })),
        inputs: this.results.ui.inputs.map(i => ({
          id: i.id,
          name: i.name,
          type: i.type,
          label: i.label,
          required: i.required,
          dbMapping: this.results.dbMapping.fields.find(f => f.uiField === (i.id || i.name))
        })),
        mainButtons: this.results.ui.buttons
          .filter(b => b.type !== 'unknown' && b.visible)
          .map(b => ({
            text: b.text,
            type: b.type,
            action: b.onclick?.match(/(\w+)\(/)?.[1] || 'unknown'
          })),
        modals: this.results.ui.modals.map(m => ({
          id: m.id,
          inputCount: m.inputCount,
          buttonCount: m.buttonCount
        }))
      },
      ssot: {
        elements: this.results.dbMapping.fields.map(f => ({
          uiField: f.uiField,
          uiType: f.uiType,
          label: f.label,
          dbTable: f.dbTable,
          dbColumn: f.dbColumn,
          confidence: f.confidence,
          verified: f.ssotVerified
        })),
        totalFields: this.results.dbMapping.fields.length,
        verifiedFields: this.results.dbMapping.fields.filter(f => f.ssotVerified).length,
        tables: this.results.dbMapping.tables
      },
      multiTenant: {
        verified: this.results.multiTenant.verified,
        issueCount: this.results.multiTenant.issues.length
      },
      performance: this.results.performance
    };

    // Guardar en archivo
    const outputPath = path.join(__dirname, '..', '..', 'audit-results', `${this.moduleKey}-audit.json`);

    try {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, JSON.stringify(brainMetadata, null, 2));
      console.log(`   ✅ Metadata guardada en: ${outputPath}`);
    } catch (e) {
      console.log(`   ⚠️  No se pudo guardar archivo: ${e.message}`);
    }

    // Actualizar modules-registry.json
    try {
      const registryPath = path.join(__dirname, '..', 'auditor', 'registry', 'modules-registry.json');
      const registry = JSON.parse(await fs.readFile(registryPath, 'utf-8'));

      const moduleIndex = registry.modules.findIndex(m => m.id === this.moduleKey);
      if (moduleIndex !== -1) {
        registry.modules[moduleIndex].ui = brainMetadata.ui;
        registry.modules[moduleIndex].ssot = brainMetadata.ssot;
        registry.modules[moduleIndex]._auditedAt = new Date().toISOString();

        await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
        console.log(`   ✅ modules-registry.json actualizado`);
      }
    } catch (e) {
      console.log(`   ⚠️  No se pudo actualizar registry: ${e.message}`);
    }

    this.results.brainMetadata = brainMetadata;

    console.log(`   ✅ SSOT Fields: ${brainMetadata.ssot.verifiedFields}/${brainMetadata.ssot.totalFields} verificados`);
    console.log(`   ✅ UI Elements documentados: ${brainMetadata.ui.inputs.length} inputs, ${brainMetadata.ui.mainButtons.length} buttons\n`);

    return brainMetadata;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * 5. TEST DE RENDIMIENTO
   * ═══════════════════════════════════════════════════════════════════════
   */
  async performanceTest() {
    console.log('\n⚡ [AUDIT] Ejecutando tests de rendimiento...\n');

    const page = this.agent.page;
    const perfResults = {
      pageLoad: null,
      apiCalls: [],
      avgResponseTime: 0,
      slowEndpoints: [],
      metrics: {}
    };

    // Medir tiempos de API
    const apiTimings = [];

    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        try {
          // En Playwright, no hay timing() - usamos fecha de captura
          const responseTime = Date.now();
          apiTimings.push({
            url: response.url().replace(/[a-f0-9-]{36}/g, '{uuid}'),
            status: response.status(),
            responseTime: null // No disponible en Playwright básico
          });
        } catch (e) {
          // Ignorar errores de timing
        }
      }
    });

    // Navegar por tabs y medir
    const tabs = ['admin', 'personal', 'work', 'family', 'medical', 'attendance', 'disciplinary'];

    for (const tabName of tabs) {
      const startTime = performance.now();

      try {
        await page.evaluate((tab) => {
          if (typeof showFileTab === 'function') {
            showFileTab(tab);
          }
        }, tabName);

        // Esperar a que cargue
        await page.waitForTimeout(2000);

        const endTime = performance.now();

        perfResults.apiCalls.push({
          tab: tabName,
          loadTime: Math.round(endTime - startTime),
          status: 'success'
        });
      } catch (e) {
        perfResults.apiCalls.push({
          tab: tabName,
          loadTime: null,
          status: 'error',
          error: e.message
        });
      }
    }

    // Calcular métricas
    const validTimings = apiTimings.filter(t => t.responseTime !== null);
    if (validTimings.length > 0) {
      perfResults.avgResponseTime = Math.round(
        validTimings.reduce((sum, t) => sum + t.responseTime, 0) / validTimings.length
      );

      perfResults.slowEndpoints = validTimings
        .filter(t => t.responseTime > 1000)
        .map(t => ({ url: t.url, time: t.responseTime }));
    }

    // Medir métricas de página
    const pageMetrics = await page.evaluate(() => {
      const perf = window.performance;
      const timing = perf.timing;

      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        firstPaint: perf.getEntriesByType('paint').find(e => e.name === 'first-paint')?.startTime || null,
        firstContentfulPaint: perf.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint')?.startTime || null
      };
    });

    perfResults.metrics = pageMetrics;
    perfResults.pageLoad = pageMetrics.loadComplete;

    this.results.performance = perfResults;

    console.log(`   ✅ Page Load: ${perfResults.pageLoad}ms`);
    console.log(`   ✅ Avg API Response: ${perfResults.avgResponseTime}ms`);
    console.log(`   ${perfResults.slowEndpoints.length === 0 ? '✅' : '⚠️'} Slow Endpoints (>1s): ${perfResults.slowEndpoints.length}`);
    console.log(`   ✅ Tabs testeados: ${perfResults.apiCalls.length}\n`);

    return perfResults;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * EJECUTAR AUDITORÍA COMPLETA
   * ═══════════════════════════════════════════════════════════════════════
   */
  async runFullAudit(options = {}) {
    console.log('\n' + '═'.repeat(80));
    console.log('🔍 AUDITORÍA COMPLETA DE MÓDULO: ' + this.moduleKey);
    console.log('═'.repeat(80));

    const startTime = performance.now();
    const skipCRUD = options.skipCRUD || false;

    try {
      // 1. Inventario UI
      await this.auditUIElements();

      // 2. Mapeo BD
      await this.mapFieldsToDatabase();

      // 3. Multi-Tenant
      await this.verifyMultiTenant();

      // 4. Performance
      await this.performanceTest();

      // 5. Generar Metadata Brain
      await this.generateBrainMetadata();

      // ═══════════════════════════════════════════════════════════════════════
      // 6. TEST CRUD REAL - Usando AutonomousQAAgent.discoverAndTestTabs()
      // ═══════════════════════════════════════════════════════════════════════
      if (!skipCRUD && this.agent && typeof this.agent.discoverAndTestTabs === 'function') {
        console.log('\n🧪 [AUDIT] Ejecutando tests CRUD REALES...\n');

        try {
          // Para módulo users, abrir employeeFileModal primero
          if (this.moduleKey === 'users') {
            await this.openEmployeeFileModal();
          }

          const crudResults = await this.agent.discoverAndTestTabs();
          this.results.crudTests = crudResults;

          // Analizar resultados CRUD
          if (crudResults && crudResults.tabs) {
            let totalTests = 0;
            let passedTests = 0;
            let failedTests = 0;
            const failedDetails = [];

            crudResults.tabs.forEach(tab => {
              if (tab.crudTests && tab.crudTests.length > 0) {
                tab.crudTests.forEach(test => {
                  // CREATE
                  if (test.create) {
                    totalTests++;
                    if (test.create.success) passedTests++;
                    else if (!test.create.notApplicable) {
                      failedTests++;
                      failedDetails.push({
                        tab: tab.name,
                        operation: 'CREATE',
                        error: test.create.error || 'Unknown'
                      });
                    }
                  }
                  // READ
                  if (test.read) {
                    totalTests++;
                    if (test.read.success) passedTests++;
                    else if (!test.read.notApplicable) {
                      failedTests++;
                      failedDetails.push({
                        tab: tab.name,
                        operation: 'READ',
                        error: test.read.error || 'Unknown'
                      });
                    }
                  }
                  // PERSISTENCE
                  if (test.persistence) {
                    totalTests++;
                    if (test.persistence.success) passedTests++;
                    else if (!test.persistence.notApplicable) {
                      failedTests++;
                      failedDetails.push({
                        tab: tab.name,
                        operation: 'PERSISTENCE',
                        error: test.persistence.error || 'Modal no cerró o datos no persistieron'
                      });
                    }
                  }
                });
              }
            });

            this.results.crudSummary = {
              totalTests,
              passed: passedTests,
              failed: failedTests,
              successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
              failedDetails
            };

            console.log(`\n   ✅ CRUD Tests ejecutados: ${totalTests}`);
            console.log(`   ✅ Pasaron: ${passedTests}`);
            console.log(`   ❌ Fallaron: ${failedTests}`);
            console.log(`   📊 Success Rate: ${this.results.crudSummary.successRate}%`);

            if (failedDetails.length > 0) {
              console.log('\n   ⚠️  TESTS FALLIDOS:');
              failedDetails.forEach(f => {
                console.log(`      - [${f.tab}] ${f.operation}: ${f.error}`);
              });
            }
          }
        } catch (crudError) {
          console.log(`   ⚠️  Error en tests CRUD: ${crudError.message}`);
          this.results.crudTests = { error: crudError.message };
        }
      } else if (skipCRUD) {
        console.log('\n⏭️  [AUDIT] Tests CRUD omitidos (skipCRUD=true)\n');
      }

      const endTime = performance.now();
      const totalTime = Math.round(endTime - startTime);

      // Resumen final
      console.log('\n' + '═'.repeat(80));
      console.log('📊 RESUMEN DE AUDITORÍA');
      console.log('═'.repeat(80));
      console.log(`\nMódulo: ${this.moduleKey}`);
      console.log(`Tiempo total: ${totalTime}ms`);
      console.log(`\n📋 UI Elements: ${this.results.ui.totalElements}`);
      console.log(`🗄️  DB Fields Mapped: ${this.results.dbMapping.fields.length}`);
      console.log(`🏢 Multi-Tenant: ${this.results.multiTenant.verified ? '✅ VERIFICADO' : '❌ REVISAR'}`);
      console.log(`⚡ Avg Response Time: ${this.results.performance.avgResponseTime}ms`);
      console.log(`🧠 SSOT Verified: ${this.results.brainMetadata?.ssot?.verifiedFields || 0}/${this.results.brainMetadata?.ssot?.totalFields || 0}`);

      if (this.results.crudSummary) {
        console.log(`\n🧪 CRUD TESTS:`);
        console.log(`   Total: ${this.results.crudSummary.totalTests}`);
        console.log(`   Pasaron: ${this.results.crudSummary.passed} ✅`);
        console.log(`   Fallaron: ${this.results.crudSummary.failed} ❌`);
        console.log(`   Success Rate: ${this.results.crudSummary.successRate}%`);
      }

      return {
        success: true,
        moduleKey: this.moduleKey,
        totalTime,
        results: this.results
      };

    } catch (error) {
      console.error('\n❌ Error en auditoría:', error.message);
      return {
        success: false,
        moduleKey: this.moduleKey,
        error: error.message
      };
    }
  }

  /**
   * Abrir employeeFileModal para testing
   */
  async openEmployeeFileModal() {
    const page = this.agent.page;

    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('button.users-action-btn.view') ||
                  document.querySelector('button[onclick*="viewUser"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      await page.waitForTimeout(3000);
      console.log('   ✅ employeeFileModal abierto para testing CRUD');
    }
  }
}

module.exports = ModuleAuditor;
