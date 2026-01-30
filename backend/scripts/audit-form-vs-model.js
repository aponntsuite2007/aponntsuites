#!/usr/bin/env node
/**
 * AUDIT: Form Fields vs Sequelize Model Fields
 *
 * Analiza estáticamente cada módulo JS del frontend y compara:
 * 1. Campos que el form envía en POST/PUT body → vs modelo Sequelize
 * 2. ENUM values en <option> o hardcoded → vs ENUM del modelo
 * 3. getElementById('X') → vs IDs existentes en el HTML del modal
 * 4. Campos required del modelo que el form nunca envía
 *
 * Run: node backend/scripts/audit-form-vs-model.js
 */

const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, '..', 'public', 'js', 'modules');
const MODELS_DIR = path.join(__dirname, '..', 'src', 'models');
const ROUTES_DIR = path.join(__dirname, '..', 'src', 'routes');

const results = { modules: 0, issues: 0, warnings: 0, details: [] };

function report(severity, module, category, message) {
  const tag = severity === 'ERROR' ? '\x1b[31m[ERROR]\x1b[0m' :
              severity === 'WARN' ? '\x1b[33m[WARN]\x1b[0m' :
              '\x1b[36m[INFO]\x1b[0m';
  console.log(`  ${tag} ${category}: ${message}`);
  results.details.push({ severity, module, category, message });
  if (severity === 'ERROR') results.issues++;
  if (severity === 'WARN') results.warnings++;
}

// ============================================================
// STEP 1: Parse all Sequelize models → extract fields + ENUMs
// ============================================================
function parseModels() {
  const models = {};
  const files = fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.js'));

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(MODELS_DIR, file), 'utf8');

      // Extract model name from sequelize.define('ModelName', ...)
      const defineMatch = content.match(/sequelize\.define\s*\(\s*['"](\w+)['"]/);
      if (!defineMatch) continue;
      const modelName = defineMatch[1];

      // Extract table name
      const tableMatch = content.match(/tableName\s*:\s*['"](\w+)['"]/);
      const tableName = tableMatch ? tableMatch[1] : modelName.toLowerCase() + 's';

      const fields = {};

      // Extract field definitions - match field_name: { type: ..., ... }
      // Use a simpler approach: find all field blocks
      const fieldRegex = /(\w+)\s*:\s*\{[^}]*type\s*:\s*DataTypes\.(\w+)(?:\([^)]*\))?[^}]*\}/gs;
      let match;
      while ((match = fieldRegex.exec(content)) !== null) {
        const fieldName = match[1];
        const fieldType = match[2];
        const fieldBlock = match[0];

        // Check allowNull
        const allowNullMatch = fieldBlock.match(/allowNull\s*:\s*(true|false)/);
        const allowNull = allowNullMatch ? allowNullMatch[1] === 'true' : true;

        // Check ENUM values
        let enumValues = null;
        const enumMatch = fieldBlock.match(/DataTypes\.ENUM\s*\(([^)]+)\)/);
        if (enumMatch) {
          enumValues = enumMatch[1].match(/'([^']+)'/g)?.map(v => v.replace(/'/g, ''));
        }

        // Check isIn validation
        const isInMatch = fieldBlock.match(/isIn\s*:\s*\[\s*\[([^\]]+)\]\s*\]/);
        if (isInMatch && !enumValues) {
          enumValues = isInMatch[1].match(/'([^']+)'/g)?.map(v => v.replace(/'/g, ''));
        }

        // Check defaultValue
        const defaultMatch = fieldBlock.match(/defaultValue\s*:\s*(?:DataTypes\.\w+|'([^']*)'|(\d+)|(true|false))/);
        const hasDefault = !!defaultMatch;

        // Check field mapping (field: 'db_column_name')
        const fieldMappingMatch = fieldBlock.match(/field\s*:\s*['"](\w+)['"]/);
        const dbColumn = fieldMappingMatch ? fieldMappingMatch[1] : fieldName;

        fields[fieldName] = {
          type: fieldType,
          allowNull,
          enumValues,
          hasDefault,
          dbColumn,
          required: !allowNull && !hasDefault && fieldName !== 'id' && fieldName !== 'company_id' && fieldName !== 'created_by'
        };
      }

      if (Object.keys(fields).length > 0) {
        models[modelName] = { file, tableName, fields };
      }
    } catch (e) {
      // Skip files that can't be parsed
    }
  }
  return models;
}

// ============================================================
// STEP 2: Parse frontend JS modules → extract form submissions
// ============================================================
function parseModuleJS(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const findings = {
    fetchCalls: [],
    getElementByIds: [],
    optionValues: [],
    formFields: [],
    enumConstants: []
  };

  // Find fetch POST/PUT calls and extract body fields
  const SKIP_KEYS = new Set(['method','headers','body','Authorization','Bearer','Content','Type',
    'const','let','var','function','return','if','else','true','false',
    'null','undefined','new','this','class','catch','try','async','await',
    'resolve','reject','then','finally','default','case','break','switch']);

  // Pattern 1: JSON.stringify({ field1: value1, field2: value2 })
  const bodyRegex = /JSON\.stringify\s*\(\s*\{([^}]{10,3000})\}\s*\)/g;
  let match;
  while ((match = bodyRegex.exec(content)) !== null) {
    const bodyContent = match[1];
    const fieldNames = [];
    const kvRegex = /(\w+)\s*:/g;
    let kvMatch;
    while ((kvMatch = kvRegex.exec(bodyContent)) !== null) {
      if (!SKIP_KEYS.has(kvMatch[1])) fieldNames.push(kvMatch[1]);
    }
    if (fieldNames.length > 0) {
      const startPos = Math.max(0, match.index - 500);
      const contextBefore = content.substring(startPos, match.index);
      const urlMatch = contextBefore.match(/(?:fetch|api|axios)\s*\(\s*[`'"]([^`'"]+)[`'"]/);
      const methodMatch = contextBefore.match(/method\s*:\s*['"](\w+)['"]/);
      findings.fetchCalls.push({
        url: urlMatch ? urlMatch[1] : 'unknown',
        method: methodMatch ? methodMatch[1] : 'POST',
        fields: fieldNames
      });
    }
  }

  // Pattern 2: FormData - formData.get('fieldName')
  const formDataRegex = /formData\.get\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const formDataFields = [];
  while ((match = formDataRegex.exec(content)) !== null) {
    const field = match[1];
    if (!field.includes('_${') && !field.match(/^\d/)) formDataFields.push(field);
  }
  if (formDataFields.length > 0) {
    findings.fetchCalls.push({ url: 'FormData', method: 'POST', fields: [...new Set(formDataFields)] });
  }

  // Pattern 3: const data = { field: getElementById('x').value } before a fetch
  // Detect object literals assigned to data/body/payload variables
  const dataObjRegex = /(?:const|let|var)\s+(\w*(?:data|Data|body|Body|payload|Payload)\w*)\s*=\s*\{([^}]{20,5000})\}/g;
  while ((match = dataObjRegex.exec(content)) !== null) {
    const varName = match[1];
    const objBody = match[2];
    const fieldNames = [];
    const kvRegex2 = /(\w+)\s*:/g;
    let kvMatch2;
    while ((kvMatch2 = kvRegex2.exec(objBody)) !== null) {
      if (!SKIP_KEYS.has(kvMatch2[1])) fieldNames.push(kvMatch2[1]);
    }
    // Check if this variable is used in a fetch/stringify nearby
    const afterPos = match.index + match[0].length;
    const contextAfter = content.substring(afterPos, Math.min(content.length, afterPos + 1000));
    if (contextAfter.includes(`stringify(${varName})`) || contextAfter.includes(`body: ${varName}`) ||
        contextAfter.includes(`JSON.stringify(${varName})`)) {
      findings.fetchCalls.push({ url: `via ${varName}`, method: 'POST', fields: fieldNames });
    }
  }

  // Pattern 4: form.fieldName.value patterns
  const formFieldRegex = /form\.(\w+)\.value/g;
  const formDirectFields = [];
  while ((match = formFieldRegex.exec(content)) !== null) {
    const field = match[1];
    if (!SKIP_KEYS.has(field) && field !== 'target' && field !== 'elements') {
      formDirectFields.push(field);
    }
  }
  if (formDirectFields.length > 0) {
    findings.fetchCalls.push({ url: 'form.field.value', method: 'POST', fields: [...new Set(formDirectFields)] });
  }

  // Find getElementById calls
  const getElemRegex = /getElementById\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = getElemRegex.exec(content)) !== null) {
    findings.getElementByIds.push(match[1]);
  }

  // Find querySelector with id selectors
  const querySelectorRegex = /querySelector\s*\(\s*['"]#([^'"]+)['"]\s*\)/g;
  while ((match = querySelectorRegex.exec(content)) !== null) {
    findings.getElementByIds.push(match[1]);
  }

  // Find <option value="..."> in template literals
  const optionRegex = /value\s*=\s*["']([^"']{1,50})["'][^>]*>/g;
  while ((match = optionRegex.exec(content)) !== null) {
    const val = match[1];
    if (val && val !== '' && !val.startsWith('$') && !val.startsWith('{') && val !== '#' && val.length < 40) {
      findings.optionValues.push(val);
    }
  }

  // Find ENUM-like config objects: const CONFIG = { key1: { ... }, key2: { ... } }
  // Only extract TOP-LEVEL keys (the ENUM values), not sub-keys like label/icon/color
  const constRegex = /(?:const|let|var)\s+(\w+(?:MAP|CONFIG|STATUS|TYPES|OPTIONS|ENUM|CATEGORIES|SEVERITY))\s*=\s*\{/gi;
  while ((match = constRegex.exec(content)) !== null) {
    const constName = match[1];
    const startIdx = match.index + match[0].length;
    // Find matching closing brace (handle nesting)
    let depth = 1, i = startIdx;
    while (depth > 0 && i < content.length) {
      if (content[i] === '{') depth++;
      if (content[i] === '}') depth--;
      i++;
    }
    const constBody = content.substring(startIdx, i - 1);

    // Extract ONLY top-level keys (depth 0)
    const topKeys = [];
    let d = 0;
    const tkRegex = /['"]?(\w+)['"]?\s*:/g;
    let lastEnd = 0;
    let tkMatch;
    // Re-parse tracking depth
    for (let ci = 0; ci < constBody.length; ci++) {
      if (constBody[ci] === '{') d++;
      if (constBody[ci] === '}') d--;
    }
    // Simpler approach: split by top-level commas
    d = 0;
    let segStart = 0;
    for (let ci = 0; ci <= constBody.length; ci++) {
      if (ci < constBody.length) {
        if (constBody[ci] === '{' || constBody[ci] === '[') d++;
        if (constBody[ci] === '}' || constBody[ci] === ']') d--;
        if (constBody[ci] === ',' && d === 0) {
          const seg = constBody.substring(segStart, ci).trim();
          const km = seg.match(/^['"]?(\w+)['"]?\s*:/);
          if (km) topKeys.push(km[1]);
          segStart = ci + 1;
        }
      } else {
        const seg = constBody.substring(segStart).trim();
        const km = seg.match(/^['"]?(\w+)['"]?\s*:/);
        if (km) topKeys.push(km[1]);
      }
    }

    if (topKeys.length >= 2) {
      findings.enumConstants.push({ name: constName, keys: topKeys });
    }
  }

  // Find name="fieldName" in form HTML templates
  const nameRegex = /name\s*=\s*["']([^"']+)["']/g;
  while ((match = nameRegex.exec(content)) !== null) {
    findings.formFields.push(match[1]);
  }

  return findings;
}

// ============================================================
// STEP 3: Map frontend modules to backend models
// ============================================================
function getModuleModelMapping() {
  return {
    'sanctions-management': ['Sanction'],
    'vacation-management': ['VacationRequest', 'ExtraordinaryLicense'],
    'job-postings': ['JobPosting', 'JobApplication', 'CandidateProfile'],
    'payroll-liquidation': ['PayrollTemplate', 'PayrollTemplateConcept', 'PayrollRun'],
    'hse-management': ['EppCatalog', 'EppDelivery', 'HseInspection'],
    'training-management': ['Training', 'TrainingAssignment'],
    'finance-journal-entries': ['JournalEntry', 'JournalEntryLine'],
    'finance-budget': ['Budget'],
    'finance-treasury': ['TreasuryBankAccount', 'TreasuryTransaction'],
    'finance-cost-centers': ['CostCenter'],
    'medical-dashboard-professional': ['MedicalRecord', 'EmployeeMedicalRecord'],
    'art-management': ['ARTConfiguration', 'ArtIncident'],
    'procedures-manual': ['Procedure'],
    'logistics-dashboard': ['LogisticsCarrier', 'LogisticsVehicle', 'LogisticsZone'],
    'support-system': ['SupportTicket'],
    'visitors': ['Visitor'],
    'dms-dashboard': ['Document'],
    'company-email-smtp-config': ['CompanyEmailConfig'],
    'attendance': ['Attendance'],
    'organizational-structure': ['Sector', 'Position', 'AdditionalRoleType'],
    'roles-permissions': ['Role', 'Permission'],
    'associate-marketplace': ['Contract'],
    'hour-bank': ['HourBankTemplate', 'HourBankRequest'],
    'compliance-dashboard': ['CompanyRiskConfig'],
    'users': ['User', 'Employee', 'EmployeeExperience', 'FamilyMember'],
    'biometric-consent': ['BiometricConsent'],
    'biometric-simple': ['BiometricTemplate'],
    'notifications': ['Notification'],
    'benefits-management': ['Benefit'],
  };
}

// ============================================================
// STEP 4: Cross-reference and find mismatches
// ============================================================
function auditModule(moduleName, jsFindings, models, modelNames) {
  const moduleModels = {};
  for (const mn of modelNames) {
    if (models[mn]) moduleModels[mn] = models[mn];
  }

  if (Object.keys(moduleModels).length === 0) {
    report('INFO', moduleName, 'MODEL', `No Sequelize model found for mapped names: ${modelNames.join(', ')}`);
    return;
  }

  for (const [modelName, model] of Object.entries(moduleModels)) {
    const modelFields = model.fields;
    const requiredFields = Object.entries(modelFields)
      .filter(([_, f]) => f.required)
      .map(([name, _]) => name);

    // Check ENUM values from option tags against model ENUMs
    const modelEnumFields = Object.entries(modelFields)
      .filter(([_, f]) => f.enumValues)
      .reduce((acc, [name, f]) => { acc[name] = f.enumValues; return acc; }, {});

    if (Object.keys(modelEnumFields).length > 0) {
      // Check option values against model ENUMs
      for (const [fieldName, validValues] of Object.entries(modelEnumFields)) {
        // Check if any option values match this enum field
        const invalidOptions = jsFindings.optionValues.filter(v =>
          !validValues.includes(v) &&
          // Check if it looks like it could be for this field
          v.length < 30 && !v.includes('/') && !v.includes('.')
        );

        // More targeted: check enum constants that might map to this field
        for (const enumConst of jsFindings.enumConstants) {
          const constKeys = enumConst.keys;
          const invalidKeys = constKeys.filter(k => !validValues.includes(k));
          const matchingKeys = constKeys.filter(k => validValues.includes(k));

          // If some keys match but others don't, this is likely a mismatch
          if (matchingKeys.length > 0 && invalidKeys.length > 0) {
            report('ERROR', moduleName, 'ENUM',
              `${enumConst.name} has keys [${invalidKeys.join(',')}] not in ${modelName}.${fieldName} valid values [${validValues.join(',')}]`);
          }
        }
      }
    }

    // Check fetch body fields against model fields
    for (const fetchCall of jsFindings.fetchCalls) {
      if (fetchCall.method === 'GET') continue;

      const unknownFields = fetchCall.fields.filter(f => {
        // Check if field exists in any model for this module
        for (const m of Object.values(moduleModels)) {
          if (m.fields[f]) return false;
          // Also check db column names
          for (const field of Object.values(m.fields)) {
            if (field.dbColumn === f) return false;
          }
        }
        return true;
      });

      // Filter out common non-model fields that routes accept directly
      const realUnknown = unknownFields.filter(f =>
        !['id', 'company_id', 'created_by', 'updated_by', 'token', 'page', 'limit',
          'offset', 'sort', 'order', 'search', 'filter', 'filters', 'action',
          'notes', 'reason', 'comment', 'comments', 'message', 'type',
          'startDate', 'endDate', 'date_from', 'date_to', 'year', 'month',
          'userId', 'employeeId', 'user_id', 'employee_id',
          'newPassword', 'password', 'confirmPassword', 'oldPassword',
          'roleId', 'role', 'roles', 'permissions', 'userIds', 'shiftIds',
          'keyringId', 'rejectionReason', 'resolution_notes',
          'signatureMethod', 'assignedPhase', 'joinDate',
          'emergencyPhone', 'allowOutsideRadius', 'authorizedBranches',
          'estado', 'observaciones', 'run_detail_id',
          'scope_type', 'scope_entities', 'document_type', 'parent_id', 'new_parent_id',
          'respect_national_holidays', 'respect_provincial_holidays',
          'salary_category_id', 'sector_id', 'additional_roles',
          'concept_name', 'concept_code', 'concept_type_id', 'formula',
          'entity_id', 'entity_label'].includes(f)
      );

      if (realUnknown.length > 0) {
        const url = fetchCall.url.length > 60 ? fetchCall.url.slice(0, 57) + '...' : fetchCall.url;
        report('WARN', moduleName, 'FIELD',
          `${fetchCall.method} ${url} sends unknown fields: [${realUnknown.join(', ')}]`);
      }
    }

    // Check required fields that no fetch call sends
    if (requiredFields.length > 0 && (jsFindings.fetchCalls.length > 0 || jsFindings.formFields.length > 0)) {
      const allSentFields = new Set();
      for (const fc of jsFindings.fetchCalls) {
        fc.fields.forEach(f => allSentFields.add(f));
      }
      // Also consider form name="" attributes and getElementById IDs as potential field sources
      jsFindings.formFields.forEach(f => allSentFields.add(f));
      // Map common getElementById patterns to field names (e.g. visitorDni → dni)
      jsFindings.getElementByIds.forEach(id => {
        allSentFields.add(id);
        // Also add camelCase-stripped version (visitorDni → Dni → dni)
        const stripped = id.replace(/^[a-z]+(?=[A-Z])/, '');
        if (stripped) allSentFields.add(stripped.charAt(0).toLowerCase() + stripped.slice(1));
      });

      const missingSometimes = requiredFields.filter(f => {
        const dbCol = modelFields[f]?.dbColumn || f;
        // Check direct match, dbColumn match, and snake_case/camelCase variants
        const camel = f.replace(/_(\w)/g, (_, c) => c.toUpperCase());
        const snake = f.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
        return !allSentFields.has(f) && !allSentFields.has(dbCol) &&
               !allSentFields.has(camel) && !allSentFields.has(snake);
      });

      if (missingSometimes.length > 0) {
        report('WARN', moduleName, 'REQUIRED',
          `${modelName} required fields never sent by any form: [${missingSometimes.join(', ')}]`);
      }
    }
  }
}

// ============================================================
// MAIN
// ============================================================
function main() {
  console.log('=========================================');
  console.log(' STATIC AUDIT: Form vs Model');
  console.log(` Date: ${new Date().toISOString()}`);
  console.log('=========================================\n');

  // Step 1: Parse models
  console.log('Parsing Sequelize models...');
  const models = parseModels();
  console.log(`  Found ${Object.keys(models).length} models\n`);

  // Step 2: Get mapping
  const mapping = getModuleModelMapping();

  // Step 3: Audit each module
  const moduleFiles = fs.readdirSync(MODULES_DIR)
    .filter(f => f.endsWith('.js') && !f.includes('.backup') && !f.includes('.bak') && !f.includes('.MYVERSION'));

  console.log(`Scanning ${moduleFiles.length} frontend modules...\n`);

  for (const file of moduleFiles) {
    const moduleName = file.replace('.js', '');
    const modelNames = mapping[moduleName];
    if (!modelNames) continue; // Skip modules without model mapping

    results.modules++;
    console.log(`\n📦 ${moduleName}`);

    try {
      const jsFindings = parseModuleJS(path.join(MODULES_DIR, file));

      console.log(`  fetch calls: ${jsFindings.fetchCalls.length}, getElementByIds: ${jsFindings.getElementByIds.length}, option values: ${jsFindings.optionValues.length}, enum consts: ${jsFindings.enumConstants.length}`);

      auditModule(moduleName, jsFindings, models, modelNames);
    } catch (e) {
      report('ERROR', moduleName, 'PARSE', `Failed to parse: ${e.message}`);
    }
  }

  // Summary
  console.log('\n=========================================');
  console.log(' AUDIT SUMMARY');
  console.log('=========================================');
  console.log(` Modules audited: ${results.modules}`);
  console.log(` \x1b[31mERRORS: ${results.issues}\x1b[0m`);
  console.log(` \x1b[33mWARNINGS: ${results.warnings}\x1b[0m`);
  console.log('=========================================');

  if (results.issues > 0) {
    console.log('\n\x1b[31m--- ERRORS (must fix) ---\x1b[0m');
    results.details.filter(d => d.severity === 'ERROR').forEach(d =>
      console.log(`  ${d.module} [${d.category}]: ${d.message}`)
    );
  }

  if (results.warnings > 0) {
    console.log('\n\x1b[33m--- WARNINGS (review) ---\x1b[0m');
    results.details.filter(d => d.severity === 'WARN').forEach(d =>
      console.log(`  ${d.module} [${d.category}]: ${d.message}`)
    );
  }

  console.log('');
}

main();
