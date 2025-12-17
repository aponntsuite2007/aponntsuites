/**
 * ROUTES: Benefits (Beneficios y Amenidades Laborales)
 *
 * Endpoints REST para gestión completa del sistema de beneficios:
 * - Catálogo de tipos de beneficios
 * - Políticas de beneficios por empresa
 * - Asignación de beneficios a empleados
 * - Workflow de aprobación
 * - Documentación requerida
 * - Activos asignados (vehículos, teléfonos, laptops)
 * - Generación de contratos/comodatos
 * - Allowances (límites de gastos)
 * - Rendiciones de gastos
 *
 * Base URL: /api/benefits
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { auth: authMiddleware } = require('../middleware/auth');
const { QueryTypes } = require('sequelize');

// ================================================================
// PARTE 1: CATÁLOGO DE TIPOS DE BENEFICIOS
// ================================================================

/**
 * GET /api/benefits/types
 * Obtiene todos los tipos de beneficios disponibles
 *
 * Query params:
 *  - category: Filtrar por categoría (CHILDCARE, EDUCATION, HOUSING, etc.)
 *  - active: true/false - Solo activos
 */
router.get('/types', authMiddleware, async (req, res) => {
  try {
    const { category, active } = req.query;

    let where = [];
    if (category) where.push(`category = :category`);
    if (active === 'true') where.push(`is_active = true`);

    const sql = `
      SELECT
        id, code, name, category,
        benefit_nature, recurrence_period,
        requires_approval, requires_documentation, has_expiration,
        default_duration_months, requires_renewal,
        integrates_with_payroll, payroll_concept_type_id,
        description, is_active
      FROM benefit_types
      ${where.length > 0 ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY category, name
    `;

    const types = await sequelize.query(sql, {
      type: QueryTypes.SELECT,
      replacements: { category }
    });

    res.json({
      success: true,
      types,
      count: types.length
    });

  } catch (error) {
    console.error('❌ [BENEFITS API] Error obteniendo tipos de beneficios:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/benefits/types/:id
 * Obtiene un tipo de beneficio específico
 */
router.get('/types/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const [type] = await sequelize.query(`
      SELECT * FROM benefit_types WHERE id = :id
    `, {
      type: QueryTypes.SELECT,
      replacements: { id }
    });

    if (!type) {
      return res.status(404).json({
        success: false,
        error: `Tipo de beneficio ${id} no encontrado`
      });
    }

    res.json({
      success: true,
      type
    });

  } catch (error) {
    console.error('❌ [BENEFITS API] Error obteniendo tipo de beneficio:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================================================
// PARTE 2: POLÍTICAS DE BENEFICIOS POR EMPRESA
// ================================================================

/**
 * GET /api/benefits/policies/:companyId
 * Obtiene todas las políticas de beneficios de una empresa
 */
router.get('/policies/:companyId', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { enabled } = req.query;

    let where = 'WHERE cbp.company_id = :companyId';
    if (enabled === 'true') where += ' AND cbp.is_enabled = true AND cbp.is_active = true';

    const policies = await sequelize.query(`
      SELECT
        cbp.*,
        bt.code as benefit_code,
        bt.name as benefit_name,
        bt.category,
        bt.benefit_nature
      FROM company_benefit_policies cbp
      JOIN benefit_types bt ON cbp.benefit_type_id = bt.id
      ${where}
      ORDER BY bt.category, bt.name
    `, {
      type: QueryTypes.SELECT,
      replacements: { companyId }
    });

    res.json({
      success: true,
      policies,
      count: policies.length
    });

  } catch (error) {
    console.error('❌ [BENEFITS API] Error obteniendo políticas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/benefits/policies
 * Crea o actualiza una política de beneficio para la empresa
 *
 * Body:
 *  - company_id: INTEGER
 *  - benefit_type_id: INTEGER
 *  - is_enabled: BOOLEAN
 *  - max_amount: DECIMAL (opcional)
 *  - max_quantity: INTEGER (opcional)
 *  - duration_months: INTEGER (opcional)
 *  - requires_approval: BOOLEAN
 *  - approval_levels: INTEGER
 *  - eligible_roles: INTEGER[] (opcional)
 *  - min_seniority_months: INTEGER (opcional)
 */
router.post('/policies', authMiddleware, async (req, res) => {
  try {
    const {
      company_id,
      benefit_type_id,
      is_enabled = true,
      max_amount,
      max_quantity,
      duration_months,
      requires_approval = true,
      approval_levels = 1,
      eligible_roles,
      min_seniority_months,
      terms_and_conditions
    } = req.body;

    // Verificar si ya existe
    const [existing] = await sequelize.query(`
      SELECT id FROM company_benefit_policies
      WHERE company_id = :company_id AND benefit_type_id = :benefit_type_id
    `, {
      type: QueryTypes.SELECT,
      replacements: { company_id, benefit_type_id }
    });

    let sql, replacements;

    if (existing) {
      // UPDATE
      sql = `
        UPDATE company_benefit_policies
        SET
          is_enabled = :is_enabled,
          max_amount = :max_amount,
          max_quantity = :max_quantity,
          duration_months = :duration_months,
          requires_approval = :requires_approval,
          approval_levels = :approval_levels,
          eligible_roles = :eligible_roles,
          min_seniority_months = :min_seniority_months,
          terms_and_conditions = :terms_and_conditions,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
        RETURNING *
      `;
      replacements = {
        id: existing.id,
        is_enabled,
        max_amount,
        max_quantity,
        duration_months,
        requires_approval,
        approval_levels,
        eligible_roles: eligible_roles ? `{${eligible_roles.join(',')}}` : null,
        min_seniority_months,
        terms_and_conditions
      };
    } else {
      // INSERT
      sql = `
        INSERT INTO company_benefit_policies (
          company_id, benefit_type_id, is_enabled,
          max_amount, max_quantity, duration_months,
          requires_approval, approval_levels,
          eligible_roles, min_seniority_months,
          terms_and_conditions, created_by
        ) VALUES (
          :company_id, :benefit_type_id, :is_enabled,
          :max_amount, :max_quantity, :duration_months,
          :requires_approval, :approval_levels,
          :eligible_roles, :min_seniority_months,
          :terms_and_conditions, :created_by
        )
        RETURNING *
      `;
      replacements = {
        company_id,
        benefit_type_id,
        is_enabled,
        max_amount,
        max_quantity,
        duration_months,
        requires_approval,
        approval_levels,
        eligible_roles: eligible_roles ? `{${eligible_roles.join(',')}}` : null,
        min_seniority_months,
        terms_and_conditions,
        created_by: req.user.user_id
      };
    }

    const [policy] = await sequelize.query(sql, {
      type: QueryTypes.SELECT,
      replacements
    });

    res.json({
      success: true,
      policy,
      action: existing ? 'updated' : 'created'
    });

  } catch (error) {
    console.error('❌ [BENEFITS API] Error creando/actualizando política:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================================================
// PARTE 3: BENEFICIOS ASIGNADOS A EMPLEADOS
// ================================================================

/**
 * GET /api/benefits/employee/:userId
 * Obtiene todos los beneficios asignados a un empleado
 *
 * Query params:
 *  - status: pending_approval, approved, active, suspended, cancelled, expired, rejected
 */
router.get('/employee/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    let where = 'WHERE eb.user_id = :userId';
    if (status) where += ' AND eb.status = :status';

    const benefits = await sequelize.query(`
      SELECT
        eb.*,
        bt.code as benefit_code,
        bt.name as benefit_name,
        bt.category,
        bt.benefit_nature,
        CASE
          WHEN eb.effective_until IS NOT NULL AND eb.effective_until < CURRENT_DATE THEN 'Vencido'
          WHEN eb.effective_until IS NOT NULL AND eb.effective_until - CURRENT_DATE <= 30 THEN 'Por vencer'
          ELSE 'Vigente'
        END as expiration_status,
        (eb.effective_until - CURRENT_DATE) as days_until_expiration
      FROM employee_benefits eb
      JOIN company_benefit_policies cbp ON eb.company_benefit_policy_id = cbp.id
      JOIN benefit_types bt ON cbp.benefit_type_id = bt.id
      ${where}
      ORDER BY eb.created_at DESC
    `, {
      type: QueryTypes.SELECT,
      replacements: { userId, status }
    });

    res.json({
      success: true,
      benefits,
      count: benefits.length
    });

  } catch (error) {
    console.error('❌ [BENEFITS API] Error obteniendo beneficios del empleado:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/benefits/assign
 * Asigna un beneficio a un empleado
 *
 * Body:
 *  - user_id: UUID
 *  - company_id: INTEGER
 *  - benefit_type_id: INTEGER
 *  - assigned_amount: DECIMAL (opcional)
 *  - assigned_quantity: INTEGER (opcional)
 *  - effective_from: DATE
 *  - effective_until: DATE (opcional)
 *  - notes: TEXT (opcional)
 */
router.post('/assign', authMiddleware, async (req, res) => {
  try {
    const {
      user_id,
      company_id,
      benefit_type_id,
      assigned_amount,
      assigned_quantity,
      effective_from,
      effective_until,
      notes
    } = req.body;

    // 1. Verificar elegibilidad
    const eligibility = await sequelize.query(`
      SELECT * FROM is_employee_eligible_for_benefit(:user_id, :benefit_type_id, :company_id)
    `, {
      type: QueryTypes.SELECT,
      replacements: { user_id, benefit_type_id, company_id }
    });

    const { is_eligible, reason, policy_id } = eligibility[0];

    if (!is_eligible) {
      return res.status(400).json({
        success: false,
        error: reason
      });
    }

    // 2. Obtener política
    const [policy] = await sequelize.query(`
      SELECT * FROM company_benefit_policies WHERE id = :policy_id
    `, {
      type: QueryTypes.SELECT,
      replacements: { policy_id }
    });

    // 3. Crear asignación
    const initial_status = policy.requires_approval ? 'pending_approval' : 'approved';

    const [benefit] = await sequelize.query(`
      INSERT INTO employee_benefits (
        user_id, company_id, company_benefit_policy_id,
        assigned_amount, assigned_quantity,
        effective_from, effective_until,
        status, notes, created_by
      ) VALUES (
        :user_id, :company_id, :policy_id,
        :assigned_amount, :assigned_quantity,
        :effective_from, :effective_until,
        :status, :notes, :created_by
      )
      RETURNING *
    `, {
      type: QueryTypes.SELECT,
      replacements: {
        user_id,
        company_id,
        policy_id,
        assigned_amount,
        assigned_quantity,
        effective_from,
        effective_until,
        status: initial_status,
        notes,
        created_by: req.user.user_id
      }
    });

    res.json({
      success: true,
      benefit,
      requires_approval: policy.requires_approval,
      message: policy.requires_approval
        ? 'Beneficio creado. Requiere aprobación.'
        : 'Beneficio asignado exitosamente.'
    });

  } catch (error) {
    console.error('❌ [BENEFITS API] Error asignando beneficio:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/benefits/approve/:benefitId
 * Aprobar o rechazar un beneficio
 *
 * Body:
 *  - decision: 'approved' | 'rejected'
 *  - comments: TEXT (opcional)
 */
router.post('/approve/:benefitId', authMiddleware, async (req, res) => {
  try {
    const { benefitId } = req.params;
    const { decision, comments } = req.body;

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'decision debe ser "approved" o "rejected"'
      });
    }

    // 1. Actualizar estado del beneficio
    const new_status = decision === 'approved' ? 'approved' : 'rejected';

    await sequelize.query(`
      UPDATE employee_benefits
      SET
        status = :new_status,
        status_reason = :comments,
        status_changed_at = CURRENT_TIMESTAMP,
        status_changed_by = :user_id
      WHERE id = :benefitId
    `, {
      type: QueryTypes.UPDATE,
      replacements: {
        benefitId,
        new_status,
        comments,
        user_id: req.user.user_id
      }
    });

    // 2. Registrar en historial de aprobaciones (si hay workflow configurado)
    // TODO: Implementar lógica de workflow multi-nivel si es necesario

    // 3. Obtener beneficio actualizado
    const [benefit] = await sequelize.query(`
      SELECT eb.*, bt.name as benefit_name
      FROM employee_benefits eb
      JOIN company_benefit_policies cbp ON eb.company_benefit_policy_id = cbp.id
      JOIN benefit_types bt ON cbp.benefit_type_id = bt.id
      WHERE eb.id = :benefitId
    `, {
      type: QueryTypes.SELECT,
      replacements: { benefitId }
    });

    res.json({
      success: true,
      benefit,
      message: decision === 'approved'
        ? 'Beneficio aprobado exitosamente'
        : 'Beneficio rechazado'
    });

  } catch (error) {
    console.error('❌ [BENEFITS API] Error aprobando/rechazando beneficio:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================================================
// PARTE 4: ACTIVOS ASIGNADOS (Vehículos, Teléfonos, Laptops)
// ================================================================

/**
 * GET /api/benefits/assets/:userId
 * Obtiene todos los activos asignados a un empleado
 */
router.get('/assets/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    let where = 'WHERE eaa.user_id = :userId';
    if (status) where += ' AND eaa.status = :status';

    const assets = await sequelize.query(`
      SELECT
        eaa.*,
        bt.name as benefit_name,
        ac.contract_number,
        ac.contract_type,
        ac.status as contract_status
      FROM employee_assigned_assets eaa
      JOIN employee_benefits eb ON eaa.employee_benefit_id = eb.id
      JOIN company_benefit_policies cbp ON eb.company_benefit_policy_id = cbp.id
      JOIN benefit_types bt ON cbp.benefit_type_id = bt.id
      LEFT JOIN asset_contracts ac ON ac.asset_assignment_id = eaa.id
      ${where}
      ORDER BY eaa.assignment_date DESC
    `, {
      type: QueryTypes.SELECT,
      replacements: { userId, status }
    });

    res.json({
      success: true,
      assets,
      count: assets.length
    });

  } catch (error) {
    console.error('❌ [BENEFITS API] Error obteniendo activos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/benefits/assets
 * Asignar un activo a un empleado (vehículo, teléfono, laptop, etc.)
 *
 * Body:
 *  - employee_benefit_id: INTEGER
 *  - user_id: UUID
 *  - asset_type: 'VEHICLE' | 'MOBILE_PHONE' | 'LAPTOP' | 'DESKTOP' | 'TABLET'
 *  - asset_brand: VARCHAR
 *  - asset_model: VARCHAR
 *  - asset_serial_number: VARCHAR
 *  - asset_plate_number: VARCHAR (solo vehículos)
 *  - asset_vin: VARCHAR (solo vehículos)
 *  - asset_value: DECIMAL
 *  - assignment_date: DATE
 *  - expected_return_date: DATE (opcional)
 */
router.post('/assets', authMiddleware, async (req, res) => {
  try {
    const {
      employee_benefit_id,
      user_id,
      asset_type,
      asset_brand,
      asset_model,
      asset_serial_number,
      asset_plate_number,
      asset_vin,
      asset_value,
      assignment_date,
      expected_return_date
    } = req.body;

    const [asset] = await sequelize.query(`
      INSERT INTO employee_assigned_assets (
        employee_benefit_id, user_id, asset_type,
        asset_brand, asset_model, asset_serial_number,
        asset_plate_number, asset_vin, asset_value,
        assignment_date, expected_return_date,
        status, assigned_by
      ) VALUES (
        :employee_benefit_id, :user_id, :asset_type,
        :asset_brand, :asset_model, :asset_serial_number,
        :asset_plate_number, :asset_vin, :asset_value,
        :assignment_date, :expected_return_date,
        'assigned', :assigned_by
      )
      RETURNING *
    `, {
      type: QueryTypes.SELECT,
      replacements: {
        employee_benefit_id,
        user_id,
        asset_type,
        asset_brand,
        asset_model,
        asset_serial_number,
        asset_plate_number,
        asset_vin,
        asset_value,
        assignment_date,
        expected_return_date,
        assigned_by: req.user.user_id
      }
    });

    res.json({
      success: true,
      asset,
      message: 'Activo asignado exitosamente. Puede generar el contrato de comodato.'
    });

  } catch (error) {
    console.error('❌ [BENEFITS API] Error asignando activo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================================================
// PARTE 5: GENERACIÓN DE CONTRATOS
// ================================================================

/**
 * POST /api/benefits/contract/generate
 * Genera un contrato de comodato/deslinde basado en template del país
 *
 * Body:
 *  - template_type_code: 'COMODATO_VEHICULO' | 'DESLINDE_RESPONSABILIDAD_VEHICULO' | 'CONTRATO_VIVIENDA'
 *  - country_code: 'ARG' | 'MEX' | 'CHL' (ISO 3166-1 alpha-3)
 *  - variables: Object con placeholders a reemplazar
 *
 * Example variables for COMODATO_VEHICULO:
 * {
 *   "CITY": "Buenos Aires",
 *   "DAY": "15",
 *   "MONTH": "diciembre",
 *   "YEAR": "2025",
 *   "COMPANY_NAME": "Aponnt S.A.",
 *   "COMPANY_TAX_ID": "30-12345678-9",
 *   "EMPLOYEE_NAME": "Juan Pérez",
 *   "EMPLOYEE_DNI": "12.345.678",
 *   "ASSET_BRAND": "Toyota",
 *   "ASSET_MODEL": "Corolla 2024",
 *   "ASSET_PLATE": "AB123CD",
 *   "ASSET_VIN": "1HGBH41JXMN109186"
 * }
 */
router.post('/contract/generate', authMiddleware, async (req, res) => {
  try {
    const { template_type_code, country_code = 'ARG', variables } = req.body;

    // 1. Obtener template
    const [template] = await sequelize.query(`
      SELECT ct.*
      FROM contract_templates ct
      JOIN contract_template_types ctt ON ct.template_type_id = ctt.id
      WHERE ctt.code = :template_type_code
        AND ct.country_code = :country_code
        AND ct.status = 'active'
      ORDER BY ct.version DESC
      LIMIT 1
    `, {
      type: QueryTypes.SELECT,
      replacements: { template_type_code, country_code }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: `Template ${template_type_code} para país ${country_code} no encontrado`
      });
    }

    // 2. Generar contrato usando función PostgreSQL
    const [result] = await sequelize.query(`
      SELECT generate_contract_from_template(:template_id, :variables::jsonb) as contract_html
    `, {
      type: QueryTypes.SELECT,
      replacements: {
        template_id: template.id,
        variables: JSON.stringify(variables)
      }
    });

    res.json({
      success: true,
      contract_html: result.contract_html,
      template_info: {
        id: template.id,
        title: template.title,
        version: template.version,
        legal_references: template.legal_references
      }
    });

  } catch (error) {
    console.error('❌ [BENEFITS API] Error generando contrato:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/benefits/contract/templates
 * Lista todos los templates de contratos disponibles
 *
 * Query params:
 *  - country_code: Filtrar por país
 *  - category: Filtrar por categoría (COMODATO, LIABILITY_WAIVER, etc.)
 */
router.get('/contract/templates', authMiddleware, async (req, res) => {
  try {
    const { country_code, category } = req.query;

    let where = 'WHERE ct.status = \'active\'';
    if (country_code) where += ' AND ct.country_code = :country_code';
    if (category) where += ' AND ctt.category = :category';

    const templates = await sequelize.query(`
      SELECT
        ct.id,
        ct.country_code,
        ct.version,
        ct.title,
        ct.legal_references,
        ctt.code as template_type_code,
        ctt.name as template_type_name,
        ctt.category
      FROM contract_templates ct
      JOIN contract_template_types ctt ON ct.template_type_id = ctt.id
      ${where}
      ORDER BY ct.country_code, ctt.category, ctt.name
    `, {
      type: QueryTypes.SELECT,
      replacements: { country_code, category }
    });

    res.json({
      success: true,
      templates,
      count: templates.length
    });

  } catch (error) {
    console.error('❌ [BENEFITS API] Error obteniendo templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================================================
// PARTE 6: DOCUMENTOS PRÓXIMOS A VENCER
// ================================================================

/**
 * GET /api/benefits/expiring/:days
 * Obtiene beneficios con documentos próximos a vencer
 *
 * @param days - Días de anticipación (default: 30)
 */
router.get('/expiring/:days?', authMiddleware, async (req, res) => {
  try {
    const { days = 30 } = req.params;
    const { companyId } = req.query;

    let where = '';
    if (companyId) where = 'WHERE eb.company_id = :companyId';

    const expiringBenefits = await sequelize.query(`
      SELECT
        eb.id as benefit_id,
        eb.user_id,
        u."firstName" || ' ' || u."lastName" as employee_name,
        bt.name as benefit_name,
        eb.effective_until,
        (eb.effective_until - CURRENT_DATE) as days_until_expiration
      FROM employee_benefits eb
      JOIN users u ON eb.user_id = u.user_id
      JOIN company_benefit_policies cbp ON eb.company_benefit_policy_id = cbp.id
      JOIN benefit_types bt ON cbp.benefit_type_id = bt.id
      ${where}
        AND eb.status = 'active'
        AND eb.effective_until IS NOT NULL
        AND eb.effective_until BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
      ORDER BY eb.effective_until ASC
    `, {
      type: QueryTypes.SELECT,
      replacements: { companyId }
    });

    res.json({
      success: true,
      expiring_benefits: expiringBenefits,
      count: expiringBenefits.length,
      days_ahead: parseInt(days)
    });

  } catch (error) {
    console.error('❌ [BENEFITS API] Error obteniendo beneficios próximos a vencer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/benefits/renew/:benefitId
 * Renovar un beneficio (extiende effective_until)
 *
 * Body:
 *  - new_effective_until: DATE
 */
router.post('/renew/:benefitId', authMiddleware, async (req, res) => {
  try {
    const { benefitId } = req.params;
    const { new_effective_until } = req.body;

    const [benefit] = await sequelize.query(`
      UPDATE employee_benefits
      SET
        effective_until = :new_effective_until,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = :benefitId
      RETURNING *
    `, {
      type: QueryTypes.SELECT,
      replacements: { benefitId, new_effective_until }
    });

    if (!benefit) {
      return res.status(404).json({
        success: false,
        error: `Beneficio ${benefitId} no encontrado`
      });
    }

    res.json({
      success: true,
      benefit,
      message: 'Beneficio renovado exitosamente'
    });

  } catch (error) {
    console.error('❌ [BENEFITS API] Error renovando beneficio:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================================================
// PARTE 7: ESTADÍSTICAS
// ================================================================

/**
 * GET /api/benefits/stats/:companyId
 * Obtiene estadísticas de beneficios de la empresa
 */
router.get('/stats/:companyId', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;

    const stats = await sequelize.query(`
      SELECT
        COUNT(*) as total_benefits,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_benefits,
        COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending_approval,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_benefits,
        COUNT(DISTINCT user_id) as employees_with_benefits,
        SUM(CASE WHEN assigned_amount IS NOT NULL THEN assigned_amount ELSE 0 END) as total_amount
      FROM employee_benefits
      WHERE company_id = :companyId
    `, {
      type: QueryTypes.SELECT,
      replacements: { companyId }
    });

    // Beneficios por categoría
    const byCategory = await sequelize.query(`
      SELECT
        bt.category,
        COUNT(*) as count,
        SUM(CASE WHEN eb.assigned_amount IS NOT NULL THEN eb.assigned_amount ELSE 0 END) as total_amount
      FROM employee_benefits eb
      JOIN company_benefit_policies cbp ON eb.company_benefit_policy_id = cbp.id
      JOIN benefit_types bt ON cbp.benefit_type_id = bt.id
      WHERE eb.company_id = :companyId
        AND eb.status = 'active'
      GROUP BY bt.category
      ORDER BY count DESC
    `, {
      type: QueryTypes.SELECT,
      replacements: { companyId }
    });

    res.json({
      success: true,
      stats: stats[0],
      by_category: byCategory
    });

  } catch (error) {
    console.error('❌ [BENEFITS API] Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
