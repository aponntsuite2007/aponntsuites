/**
 * Configurar Plantillas de Liquidación con Convenios Colectivos Argentinos
 *
 * Convenios:
 * - CCT-130-75: Empleados de Comercio
 * - CCT-260-75: Metalúrgicos (UOM)
 * - CCT-18-75: Bancarios
 */
const { Sequelize } = require('sequelize');
const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', { logging: false });

const COMPANY_ID = 11;

// Conceptos comunes Argentina
const CONCEPTOS_AR = {
  // HABERES (affects_gross = true, is_deduction = false)
  BASICO: { code: 'HAB-BASICO', name: 'Sueldo Básico', isDeduction: false },
  ANTIGUEDAD: { code: 'HAB-ANTIG', name: 'Adicional por Antigüedad', isDeduction: false },
  PRESENTISMO: { code: 'HAB-PRESENT', name: 'Presentismo', isDeduction: false },
  HORAS_EXTRA_50: { code: 'HAB-HE50', name: 'Horas Extra 50%', isDeduction: false },
  HORAS_EXTRA_100: { code: 'HAB-HE100', name: 'Horas Extra 100%', isDeduction: false },
  ADICIONAL_ZONA: { code: 'HAB-ZONA', name: 'Adicional Zona Desfavorable', isDeduction: false },
  TITULO: { code: 'HAB-TITULO', name: 'Adicional por Título', isDeduction: false },
  ASIG_FAM: { code: 'NR-ASIGFAM', name: 'Asignaciones Familiares', isDeduction: false, noRemunerativo: true },
  ESCOLARIDAD: { code: 'NR-ESCOLAR', name: 'Ayuda Escolar Anual', isDeduction: false, noRemunerativo: true },

  // DEDUCCIONES EMPLEADO (is_deduction = true)
  JUBILACION: { code: 'DED-JUB', name: 'Jubilación (11%)', isDeduction: true, rate: 11 },
  OBRA_SOCIAL: { code: 'DED-OS', name: 'Obra Social (3%)', isDeduction: true, rate: 3 },
  PAMI: { code: 'DED-PAMI', name: 'PAMI/INSSJP (3%)', isDeduction: true, rate: 3 },
  SINDICATO: { code: 'DED-SIND', name: 'Cuota Sindical (2%)', isDeduction: true, rate: 2 },
  GANANCIAS: { code: 'DED-GAN', name: 'Impuesto a las Ganancias', isDeduction: true },

  // CONTRIBUCIONES PATRONALES
  CONT_JUB: { code: 'PAT-JUB', name: 'Contrib. Patronal Jubilación (10.17%)', isEmployer: true, rate: 10.17 },
  CONT_OS: { code: 'PAT-OS', name: 'Contrib. Patronal Obra Social (6%)', isEmployer: true, rate: 6 },
  CONT_ASIG: { code: 'PAT-ASIG', name: 'Asignaciones Familiares (4.44%)', isEmployer: true, rate: 4.44 },
  CONT_FNE: { code: 'PAT-FNE', name: 'Fondo Nacional Empleo (0.89%)', isEmployer: true, rate: 0.89 },
  CONT_ART: { code: 'PAT-ART', name: 'ART (2.5% aprox)', isEmployer: true, rate: 2.5 },
};

async function setup() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   CONFIGURAR PLANTILLAS LIQUIDACIÓN - CONVENIOS ARGENTINOS     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // 1. Crear/obtener concept_types necesarios
  console.log('═══ PASO 1: Verificar Concept Types ═══');
  const [[conceptTypes]] = await seq.query(`SELECT COUNT(*) as c FROM payroll_concept_types`);
  console.log(`   Concept types existentes: ${conceptTypes.c}`);

  // 2. Crear plantillas por convenio
  console.log('\n═══ PASO 2: Crear Plantillas por Convenio ═══');

  const convenios = [
    {
      code: 'CCT-130-75',
      name: 'Empleados de Comercio',
      baseSalary: 450000,
      frequency: 'monthly',
      hoursPerMonth: 200,
      presentismo: 8.33, // 8.33% mensual = 1/12 del sueldo anual
      antiguedad: 1, // 1% por año
      extras: { tituloSecundario: 5, tituloUniversitario: 10 }
    },
    {
      code: 'CCT-260-75',
      name: 'Metalúrgicos (UOM)',
      baseSalary: 520000,
      frequency: 'biweekly', // Quincenal
      hoursPerMonth: 180,
      presentismo: 10,
      antiguedad: 1.5,
      extras: { zonaDesfavorable: 20, insalubridad: 15 }
    },
    {
      code: 'CCT-18-75',
      name: 'Bancarios',
      baseSalary: 850000,
      frequency: 'monthly',
      hoursPerMonth: 150, // 7.5 horas/día
      presentismo: 12,
      antiguedad: 2,
      extras: { cajero: 15, atencionPublico: 10 }
    }
  ];

  const templateIds = {};

  for (const conv of convenios) {
    // Verificar si existe
    const [[existing]] = await seq.query(`
      SELECT id FROM payroll_templates WHERE template_code = :code AND company_id = ${COMPANY_ID}
    `, { replacements: { code: conv.code } });

    let templateId;
    if (existing) {
      templateId = existing.id;
      console.log(`   ✓ ${conv.code} ya existe (id: ${templateId})`);
    } else {
      const [[newTemplate]] = await seq.query(`
        INSERT INTO payroll_templates (
          company_id, template_code, template_name, description,
          pay_frequency, calculation_basis, work_hours_per_month,
          work_hours_per_day, work_days_per_week,
          overtime_50_after_hours, overtime_100_after_hours,
          night_shift_start, night_shift_end,
          round_to_cents, round_method, is_active, is_current_version,
          created_at, updated_at
        ) VALUES (
          ${COMPANY_ID}, :code, :name, :desc,
          :freq, 'monthly', :hours,
          8, 5,
          8, 12,
          '21:00', '06:00',
          true, 'half_up', true, true,
          NOW(), NOW()
        )
        RETURNING id
      `, {
        replacements: {
          code: conv.code,
          name: `Liquidación ${conv.name}`,
          desc: `Plantilla de liquidación según Convenio Colectivo ${conv.code} - ${conv.name}`,
          freq: conv.frequency,
          hours: conv.hoursPerMonth
        }
      });
      templateId = newTemplate.id;
      console.log(`   ✅ ${conv.code} creado (id: ${templateId})`);
    }
    templateIds[conv.code] = { id: templateId, ...conv };
  }

  // 3. Crear conceptos para cada plantilla
  console.log('\n═══ PASO 3: Crear Conceptos por Plantilla ═══');

  // Obtener IDs de concept_types existentes
  const [existingTypes] = await seq.query(`SELECT id, type_code FROM payroll_concept_types`);
  const typeMap = {};
  existingTypes.forEach(t => typeMap[t.type_code] = t.id);

  for (const [code, template] of Object.entries(templateIds)) {
    console.log(`\n   === ${code} - ${template.name} ===`);

    // Limpiar conceptos anteriores
    await seq.query(`DELETE FROM payroll_template_concepts WHERE template_id = ${template.id}`);

    const conceptos = [
      // HABERES
      { code: 'BASICO', name: 'Sueldo Básico', calcType: 'fixed', defaultValue: template.baseSalary, order: 1, typeCode: 'EARNING_FIXED' },
      { code: 'ANTIGUEDAD', name: `Antigüedad (${template.antiguedad}% x año)`, calcType: 'percentage', pctBase: 'BASICO', formula: `basic * years * ${template.antiguedad} / 100`, order: 2, typeCode: 'EARNING_SENIORITY' },
      { code: 'PRESENTISMO', name: `Presentismo (${template.presentismo}%)`, calcType: 'percentage', pctBase: 'BASICO', formula: `basic * ${template.presentismo} / 100`, order: 3, typeCode: 'EARNING_ATTENDANCE' },
      { code: 'HE50', name: 'Horas Extra 50%', calcType: 'formula', formula: `(basic / ${template.hoursPerMonth}) * overtime_50 * 1.5`, order: 4, typeCode: 'OVERTIME_REGULAR' },
      { code: 'HE100', name: 'Horas Extra 100%', calcType: 'formula', formula: `(basic / ${template.hoursPerMonth}) * overtime_100 * 2`, order: 5, typeCode: 'OVERTIME_REGULAR' },

      // DEDUCCIONES
      { code: 'JUB', name: 'Jubilación (11%)', calcType: 'percentage', pctBase: 'GROSS', empRate: 11, order: 10, typeCode: 'DEDUCTION_RETIREMENT' },
      { code: 'OS', name: 'Obra Social (3%)', calcType: 'percentage', pctBase: 'GROSS', empRate: 3, order: 11, typeCode: 'DEDUCTION_HEALTH' },
      { code: 'PAMI', name: 'PAMI (3%)', calcType: 'percentage', pctBase: 'GROSS', empRate: 3, order: 12, typeCode: 'DEDUCTION_HEALTH' },
      { code: 'SINDICATO', name: 'Cuota Sindical (2%)', calcType: 'percentage', pctBase: 'GROSS', empRate: 2, order: 13, typeCode: 'DEDUCTION_UNION' },

      // CONTRIB PATRONALES
      { code: 'PAT-JUB', name: 'Contrib. Jubilación (10.17%)', calcType: 'percentage', pctBase: 'GROSS', emplerRate: 10.17, order: 20, typeCode: 'EMPLOYER_RETIREMENT' },
      { code: 'PAT-OS', name: 'Contrib. Obra Social (6%)', calcType: 'percentage', pctBase: 'GROSS', emplerRate: 6, order: 21, typeCode: 'EMPLOYER_HEALTH' },
      { code: 'PAT-ASIG', name: 'Asig. Familiares (4.44%)', calcType: 'percentage', pctBase: 'GROSS', emplerRate: 4.44, order: 22, typeCode: 'EMPLOYER_FAMILY' },
      { code: 'PAT-FNE', name: 'Fondo Empleo (0.89%)', calcType: 'percentage', pctBase: 'GROSS', emplerRate: 0.89, order: 23, typeCode: 'EMPLOYER_OTHER' },
      { code: 'PAT-ART', name: 'ART (2.5%)', calcType: 'percentage', pctBase: 'GROSS', emplerRate: 2.5, order: 24, typeCode: 'EMPLOYER_RISK' }
    ];

    // Agregar conceptos específicos del convenio
    if (template.extras) {
      let extraOrder = 6;
      for (const [key, pct] of Object.entries(template.extras)) {
        conceptos.push({
          code: `EXTRA-${key.toUpperCase()}`,
          name: `${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')} (${pct}%)`,
          calcType: 'percentage',
          pctBase: 'BASICO',
          formula: `basic * ${pct} / 100`,
          order: extraOrder++,
          typeCode: 'EARNING_VARIABLE'
        });
      }
    }

    let created = 0;
    for (const c of conceptos) {
      const conceptTypeId = typeMap[c.typeCode] || 1; // Fallback a 1 si no existe

      await seq.query(`
        INSERT INTO payroll_template_concepts (
          template_id, concept_type_id, concept_code, concept_name,
          calculation_type, default_value, percentage_base, formula,
          employee_contribution_rate, employer_contribution_rate,
          display_order, is_active, is_visible_receipt, is_mandatory,
          applies_to_monthly, applies_to_hourly,
          created_at, updated_at
        ) VALUES (
          ${template.id}, ${conceptTypeId}, :code, :name,
          :calcType, :defaultVal, :pctBase, :formula,
          :empRate, :emplerRate,
          :order, true, true, false,
          true, false,
          NOW(), NOW()
        )
      `, {
        replacements: {
          code: `${code}-${c.code}`,
          name: c.name,
          calcType: c.calcType || 'fixed',
          defaultVal: c.defaultValue || null,
          pctBase: c.pctBase || null,
          formula: c.formula || null,
          empRate: c.empRate || null,
          emplerRate: c.emplerRate || null,
          order: c.order
        }
      });
      created++;
    }
    console.log(`      Conceptos creados: ${created}`);
  }

  // 4. Asignar empleados a plantillas según departamento
  console.log('\n═══ PASO 4: Asignar Empleados a Plantillas ═══');

  // Comercio = Administración, Comercial
  await seq.query(`
    UPDATE users SET salary_category_id = (SELECT id FROM salary_categories WHERE category_code = 'CAT-A' LIMIT 1)
    WHERE company_id = ${COMPANY_ID} AND department_id IN (
      SELECT id FROM departments WHERE company_id = ${COMPANY_ID} AND name LIKE '%Admin%' OR name LIKE '%Comercial%'
    )
  `);

  // Metalúrgicos = Producción, Logística, Calidad
  // Bancarios = Sistemas, Dirección

  // 5. Verificar
  console.log('\n═══ PASO 5: Verificar Configuración ═══');

  const [templates] = await seq.query(`
    SELECT pt.template_code, pt.template_name, pt.pay_frequency,
           COUNT(ptc.id) as conceptos
    FROM payroll_templates pt
    LEFT JOIN payroll_template_concepts ptc ON ptc.template_id = pt.id
    WHERE pt.company_id = ${COMPANY_ID}
    GROUP BY pt.id, pt.template_code, pt.template_name, pt.pay_frequency
    ORDER BY pt.template_code
  `);

  console.log('\n   Plantillas configuradas:');
  templates.forEach(t => {
    console.log(`   • ${t.template_code}: ${t.template_name}`);
    console.log(`     Frecuencia: ${t.pay_frequency} | Conceptos: ${t.conceptos}`);
  });

  console.log('\n✅ Plantillas de liquidación configuradas');
  await seq.close();
}

setup().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
