/**
 * ONBOARDING SERVICE - Orchestrator Principal del Circuito de Comercialización
 *
 * Coordina las 6 fases del workflow altaEmpresa:
 * FASE 1: Presupuesto
 * FASE 2: Contrato EULA
 * FASE 3: Facturación y Pago
 * FASE 4: Alta Definitiva
 * FASE 5: Liquidación de Comisiones
 * FASE 6: Bienvenida al Cliente
 *
 * @author Sistema Biométrico Enterprise
 * @version 1.0.0
 */

const { v4: uuidv4 } = require('uuid');
const { Budget, Contract, Invoice, Company, CommissionLiquidation, CommissionPayment, AponntStaff } = require('../config/database');
const NotificationExternalService = require('./NotificationExternalService');
const BudgetService = require('./BudgetService');
const ContractService = require('./ContractService');
const InvoicingService = require('./InvoicingService');
const CommissionService = require('./CommissionService');

class OnboardingService {
  constructor() {
    this.notificationService = new NotificationExternalService();
  }

  /**
   * ============================================================================
   * FASE 1: PRESUPUESTO (8 pasos)
   * ============================================================================
   */

  /**
   * Iniciar workflow completo de onboarding desde panel-administrativo
   * @param {Object} companyData - Datos de la empresa (datosFiliatorios + módulos + sucursales)
   * @param {UUID} vendorId - ID del vendedor que crea la empresa
   * @returns {Object} { trace_id, budget_id, company_id }
   */
  async initiateOnboarding(companyData, vendorId) {
    const trace_id = `ONBOARDING-${uuidv4()}`;
    console.log(`🚀 [ONBOARDING] Iniciando workflow con trace_id: ${trace_id}`);

    try {
      // Step 1-3: Ya implementado (vendedor login + modal de alta)

      // Step 4: Generar PRESUPUESTO automático
      const budget = await BudgetService.create({
        trace_id,
        company_id: companyData.company_id || null, // Provisional si es nueva empresa
        vendor_id: vendorId,
        selected_modules: companyData.modules,
        contracted_employees: companyData.contractedEmployees,
        total_monthly: companyData.pricing.monthlyTotal,
        payment_terms: companyData.paymentTerms || 'MENSUAL',
        currency: 'USD',
        status: 'ENVIADO',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
      });

      console.log(`✅ [ONBOARDING] Presupuesto creado: ${budget.budget_code}`);

      // Step 5: Sistema de notificaciones proactivas
      await this.sendBudgetNotifications(budget, companyData, vendorId);

      // Step 6: Registrar en repositorio (ya hecho en Budget.create)

      // Step 7-8: Esperar respuesta del cliente (manejado por webhook/endpoint)

      return {
        success: true,
        trace_id,
        budget_id: budget.id,
        budget_code: budget.budget_code,
        company_id: companyData.company_id,
        message: 'Presupuesto enviado exitosamente. Esperando respuesta del cliente (30 días)',
        next_step: 'Cliente debe aceptar/rechazar presupuesto',
        status: 'PRESUPUESTO_ENVIADO'
      };
    } catch (error) {
      console.error(`❌ [ONBOARDING] Error en initiateOnboarding:`, error);
      throw error;
    }
  }

  /**
   * Enviar notificaciones de presupuesto (Step 5)
   */
  async sendBudgetNotifications(budget, companyData, vendorId) {
    try {
      // Obtener datos del vendedor
      const vendor = await AponntStaff.findByPk(vendorId);

      // Notificación 1: Al cliente
      await this.notificationService.send({
        to: companyData.contactEmail,
        type: 'PRESUPUESTO_RECIBIDO',
        title: `📊 Presupuesto Aponnt - ${companyData.name}`,
        body: `Hemos recibido tu solicitud. Total mensual: USD ${budget.total_monthly}`,
        actions: [
          { label: 'ACEPTA', action: 'approve_budget', budget_id: budget.id },
          { label: 'NO_ACEPTA', action: 'reject_budget', budget_id: budget.id }
        ],
        channels: ['email', 'app'],
        metadata: {
          trace_id: budget.trace_id,
          budget_id: budget.id,
          expires_at: budget.expires_at
        }
      });

      // Notificación 2: Al vendedor
      await this.notificationService.send({
        to: vendor.email,
        type: 'PRESUPUESTO_ENVIADO',
        title: `✅ Presupuesto enviado a ${companyData.name}`,
        body: `Esperando respuesta del cliente (expira: ${budget.expires_at.toISOString().split('T')[0]})`,
        channels: ['email', 'app']
      });

      // Notificación 3: Al equipo administrativo
      await this.notificationService.send({
        to: 'admin_team',
        type: 'NUEVO_PRESUPUESTO',
        title: `📋 Nuevo presupuesto generado`,
        body: `Vendedor: ${vendor.first_name} ${vendor.last_name}, Cliente: ${companyData.name}`,
        channels: ['app']
      });

      console.log(`✅ [ONBOARDING] 3 notificaciones enviadas para presupuesto ${budget.budget_code}`);
    } catch (error) {
      console.error(`⚠️ [ONBOARDING] Error enviando notificaciones:`, error.message);
      // No romper el flujo si fallan notificaciones
    }
  }

  /**
   * Manejar respuesta del cliente al presupuesto (Step 7)
   * @param {UUID} budgetId
   * @param {String} action - 'accept' | 'reject'
   * @param {Object} userData - Datos del usuario que responde
   */
  async handleBudgetResponse(budgetId, action, userData) {
    try {
      const budget = await Budget.findByPk(budgetId);
      if (!budget) throw new Error('Presupuesto no encontrado');

      if (action === 'accept') {
        // Cliente acepta → Actualizar estado
        await budget.update({
          status: 'ACEPTADO',
          accepted_at: new Date(),
          accepted_by: userData.email
        });

        // Step 8: Actualizar estado empresa
        await Company.update(
          { onboarding_status: 'PRESUPUESTO_APROBADO' },
          { where: { company_id: budget.company_id } }
        );

        console.log(`✅ [ONBOARDING] Presupuesto aceptado: ${budget.budget_code}`);

        // → Avanzar a FASE 2: Contrato
        return await this.generateContract(budget);
      } else if (action === 'reject') {
        // Cliente rechaza → Fin del workflow
        await budget.update({
          status: 'RECHAZADO',
          rejected_at: new Date(),
          rejected_by: userData.email
        });

        // Notificar vendedor y admin
        await this.notificationService.send({
          to: [budget.vendor.email, 'admin_team'],
          type: 'PRESUPUESTO_RECHAZADO',
          title: `❌ Presupuesto rechazado`,
          body: `Cliente: ${budget.company.name} rechazó el presupuesto ${budget.budget_code}`,
          channels: ['app', 'email']
        });

        console.log(`❌ [ONBOARDING] Presupuesto rechazado: ${budget.budget_code}`);

        return {
          success: true,
          status: 'PRESUPUESTO_RECHAZADO',
          message: 'Presupuesto rechazado. Workflow finalizado.',
          trace_id: budget.trace_id
        };
      }
    } catch (error) {
      console.error(`❌ [ONBOARDING] Error en handleBudgetResponse:`, error);
      throw error;
    }
  }

  /**
   * ============================================================================
   * FASE 2: CONTRATO DIGITAL (EULA) (3 pasos)
   * ============================================================================
   */

  /**
   * Generar contrato automático (Step 9)
   * @param {Object} budget - Presupuesto aceptado
   */
  async generateContract(budget) {
    try {
      console.log(`📄 [ONBOARDING] Generando contrato para presupuesto ${budget.budget_code}`);

      // Step 9: Generar contrato automático
      const contract = await ContractService.generate({
        trace_id: budget.trace_id,
        budget_id: budget.id,
        company_id: budget.company_id,
        vendor_id: budget.vendor_id,
        contract_type: 'EULA_DIGITAL',
        payment_terms: budget.payment_terms,
        total_monthly: budget.total_monthly,
        status: 'PENDING_SIGNATURE'
      });

      console.log(`✅ [ONBOARDING] Contrato generado: ${contract.contract_number}`);

      // Step 10: Enviar contrato para firma (EULA)
      await this.sendContractForSignature(contract, budget);

      return {
        success: true,
        contract_id: contract.id,
        contract_number: contract.contract_number,
        status: 'CONTRATO_ENVIADO_PARA_FIRMA',
        next_step: 'Cliente debe firmar contrato (7 días)',
        trace_id: budget.trace_id
      };
    } catch (error) {
      console.error(`❌ [ONBOARDING] Error en generateContract:`, error);
      throw error;
    }
  }

  /**
   * Enviar contrato para firma (Step 10)
   */
  async sendContractForSignature(contract, budget) {
    try {
      const company = await Company.findByPk(budget.company_id);

      await this.notificationService.send({
        to: company.contact_email,
        type: 'CONTRATO_FIRMA',
        title: `📄 Contrato Aponnt - Firma Digital`,
        body: `Por favor revisa y firma el contrato ${contract.contract_number}`,
        actions: [
          { label: 'ACEPTA', action: 'sign_contract', contract_id: contract.id },
          { label: 'NO_ACEPTA', action: 'reject_contract', contract_id: contract.id }
        ],
        attachment: contract.contract_pdf_url,
        channels: ['email', 'app'],
        metadata: {
          trace_id: contract.trace_id,
          contract_id: contract.id,
          timeout_days: 7
        }
      });

      console.log(`✅ [ONBOARDING] Contrato enviado para firma: ${contract.contract_number}`);
    } catch (error) {
      console.error(`⚠️ [ONBOARDING] Error enviando contrato para firma:`, error.message);
    }
  }

  /**
   * Manejar firma/rechazo de contrato (Step 11)
   * @param {UUID} contractId
   * @param {String} action - 'sign' | 'reject'
   * @param {Object} signatureData - IP, user agent, checkbox acceptance
   *
   * FLUJO CORRECTO:
   * 1. Cliente firma contrato
   * 2. SI no existe company_id → CREAR EMPRESA INACTIVA
   * 3. Actualizar Budget y Contract con company_id
   * 4. Generar factura
   */
  async handleContractSignature(contractId, action, signatureData) {
    try {
      const contract = await Contract.findByPk(contractId, {
        include: [{ model: Budget, as: 'budget' }]
      });
      if (!contract) throw new Error('Contrato no encontrado');

      if (action === 'sign') {
        // Cliente firma → Actualizar contrato
        await contract.update({
          status: 'signed',  // Cambiado a minúscula para consistencia
          signed_at: new Date(),
          signed_ip: signatureData.ip,
          signed_user_agent: signatureData.userAgent,
          acceptance_checkbox: true
        });

        console.log(`✅ [ONBOARDING] Contrato firmado: ${contract.contract_number}`);

        // ═══════════════════════════════════════════════════════════
        // PASO CRÍTICO: Si no hay empresa, CREARLA INACTIVA
        // ═══════════════════════════════════════════════════════════
        let companyId = contract.company_id;

        if (!companyId) {
          console.log(`🏢 [ONBOARDING] Creando empresa INACTIVA desde contrato firmado...`);

          // Obtener datos del lead/budget para crear la empresa
          const budget = contract.budget || await Budget.findByPk(contract.budget_id);
          if (!budget) throw new Error('No se encontró el presupuesto asociado al contrato');

          // Crear empresa INACTIVA
          const newCompany = await this.createInactiveCompany(budget, contract);
          companyId = newCompany.company_id;

          // Actualizar Budget y Contract con el nuevo company_id
          await budget.update({ company_id: companyId });
          await contract.update({ company_id: companyId });

          console.log(`✅ [ONBOARDING] Empresa INACTIVA creada: ${newCompany.name} (ID: ${companyId})`);
        } else {
          // Empresa ya existía → actualizar onboarding_status
          await Company.update(
            { onboarding_status: 'CONTRACT_SIGNED' },
            { where: { company_id: companyId } }
          );
        }

        // → Avanzar a FASE 3: Facturación
        return await this.generateInitialInvoice(contract);
      } else if (action === 'reject') {
        // Cliente rechaza contrato → Cancelación definitiva
        await contract.update({
          status: 'REJECTED',
          rejected_at: new Date()
        });

        await Company.update(
          { onboarding_status: 'ALTA_RECHAZADA, CONTRATO_RECHAZADO' },
          { where: { company_id: contract.company_id } }
        );

        // Notificar vendedor y admin
        await this.notificationService.send({
          to: [contract.vendor.email, 'admin_team'],
          type: 'CONTRATO_RECHAZADO',
          title: `❌ Contrato rechazado`,
          body: `Cliente: ${contract.company.name} rechazó el contrato ${contract.contract_number}`,
          channels: ['app', 'email']
        });

        console.log(`❌ [ONBOARDING] Contrato rechazado: ${contract.contract_number}. Alta cancelada definitivamente.`);

        return {
          success: true,
          status: 'CONTRATO_RECHAZADO',
          message: 'Contrato rechazado. Alta cancelada definitivamente.',
          trace_id: contract.trace_id
        };
      }
    } catch (error) {
      console.error(`❌ [ONBOARDING] Error en handleContractSignature:`, error);
      throw error;
    }
  }

  /**
   * ============================================================================
   * FASE 3: FACTURACIÓN Y PAGO (7 pasos)
   * ============================================================================
   */

  /**
   * Generar factura inicial automática (Step 12)
   * @param {Object} contract - Contrato firmado
   */
  async generateInitialInvoice(contract) {
    try {
      console.log(`💰 [ONBOARDING] Generando factura inicial para contrato ${contract.contract_number}`);

      const invoice = await InvoicingService.generate({
        trace_id: contract.trace_id,
        contract_id: contract.id,
        company_id: contract.company_id,
        period: new Date().toISOString().slice(0, 7), // YYYY-MM
        amount_usd: contract.total_monthly,
        status: 'DRAFT',
        invoice_type: 'INITIAL'
      });

      console.log(`✅ [ONBOARDING] Factura inicial generada: ${invoice.invoice_number}`);

      // Step 13: ¿Requiere supervisión administrativa?
      const company = await Company.findByPk(contract.company_id);

      if (company.requiere_supervision_factura) {
        // Crear tarea administrativa
        await this.createAdministrativeTask({
          task_type: 'FACTURA_APROBACION',
          company_id: company.company_id,
          vendor_id: contract.vendor_id,
          invoice_id: invoice.id,
          status: 'PENDING',
          priority: 'HIGH',
          trace_id: contract.trace_id
        });

        await invoice.update({ status: 'AWAITING_ADMIN_APPROVAL' });

        console.log(`⏳ [ONBOARDING] Factura enviada a aprobación administrativa`);

        return {
          success: true,
          invoice_id: invoice.id,
          status: 'AWAITING_ADMIN_APPROVAL',
          message: 'Factura requiere aprobación administrativa',
          next_step: 'Administración debe aprobar/rechazar factura',
          trace_id: contract.trace_id
        };
      } else {
        // No requiere supervisión → enviar directamente al cliente
        await invoice.update({ status: 'PENDING' });
        return await this.sendInvoiceToClient(invoice);
      }
    } catch (error) {
      console.error(`❌ [ONBOARDING] Error en generateInitialInvoice:`, error);
      throw error;
    }
  }

  /**
   * Enviar factura al cliente (Step 14)
   * @param {Object} invoice
   */
  async sendInvoiceToClient(invoice) {
    try {
      const company = await Company.findByPk(invoice.company_id);

      await this.notificationService.send({
        to: company.contact_email,
        type: 'FACTURA_RECIBIDA',
        title: `💰 Factura Aponnt - ${company.name}`,
        body: `Monto: USD ${invoice.amount_usd} - Vence: ${invoice.due_date}`,
        attachment: invoice.invoice_pdf_url,
        payment_link: `${process.env.APP_URL}/invoices/${invoice.id}/upload-payment`,
        channels: ['email', 'app'],
        metadata: {
          trace_id: invoice.trace_id,
          invoice_id: invoice.id,
          timeout_days: 15
        }
      });

      console.log(`✅ [ONBOARDING] Factura enviada al cliente: ${invoice.invoice_number}`);

      return {
        success: true,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        status: 'FACTURA_ENVIADA',
        message: 'Factura enviada al cliente. Esperando pago (15 días)',
        next_step: 'Cliente debe cargar comprobante de pago',
        trace_id: invoice.trace_id
      };
    } catch (error) {
      console.error(`❌ [ONBOARDING] Error en sendInvoiceToClient:`, error);
      throw error;
    }
  }

  /**
   * Confirmar pago de factura (Step 16)
   * @param {UUID} invoiceId
   * @param {Object} paymentData - Datos del pago confirmado por cobranzas
   */
  async confirmInvoicePayment(invoiceId, paymentData) {
    try {
      const invoice = await Invoice.findByPk(invoiceId);
      if (!invoice) throw new Error('Factura no encontrada');

      await invoice.update({
        status: 'PAID',
        paid_at: new Date(),
        payment_method: paymentData.method || 'TRANSFERENCIA',
        payment_proof_url: paymentData.proofUrl,
        confirmed_by: paymentData.confirmedBy
      });

      console.log(`✅ [ONBOARDING] Pago confirmado para factura: ${invoice.invoice_number}`);

      // Notificar cliente y vendedor
      await this.notificationService.send({
        to: [invoice.company.contact_email, invoice.contract.vendor.email],
        type: 'PAGO_CONFIRMADO',
        title: `✅ Pago confirmado`,
        body: `Factura ${invoice.invoice_number} pagada exitosamente`,
        channels: ['app', 'email']
      });

      // → Avanzar a FASE 4: Alta Definitiva
      return await this.activateCompanyDefinitively(invoice);
    } catch (error) {
      console.error(`❌ [ONBOARDING] Error en confirmInvoicePayment:`, error);
      throw error;
    }
  }

  /**
   * ============================================================================
   * FASE 4: ALTA DEFINITIVA (3 pasos)
   * ============================================================================
   */

  /**
   * Alta definitiva de empresa (Steps 17-19)
   * @param {Object} invoice - Factura pagada
   */
  async activateCompanyDefinitively(invoice) {
    try {
      console.log(`🚀 [ONBOARDING] Activando empresa definitivamente...`);

      const company = await Company.findByPk(invoice.company_id);

      // Step 17: Alta definitiva empresa
      // VALIDACIÓN CRÍTICA: Verificar que la factura esté PAGADA
      if (invoice.status !== 'PAID') {
        throw new Error(`No se puede activar empresa sin factura pagada. Estado actual: ${invoice.status}`);
      }

      await company.update({
        status: 'active',  // Minúscula para consistencia con modelo
        is_active: true,   // ACTIVAR el flag
        onboarding_status: 'ACTIVATED',
        activated_at: new Date()
      });

      console.log(`✅ [ONBOARDING] Empresa activada: ${company.name}`);

      // Step 18: Verificar entorno BD multi-tenant (ya existe con company_id)

      // Step 19: Creación usuario CORE (INMUTABLE)
      const adminUser = await this.createCoreAdminUser(company);

      console.log(`✅ [ONBOARDING] Usuario CORE creado: ${adminUser.username}`);

      // → Avanzar a FASE 5: Liquidación de Comisiones
      const commissionResult = await this.liquidateCommissions(invoice);

      // → Avanzar a FASE 6: Bienvenida
      await this.sendWelcomeEmail(company, adminUser);

      return {
        success: true,
        company_id: company.company_id,
        status: 'ONBOARDING_COMPLETED',
        message: 'Empresa activada exitosamente. Onboarding completo.',
        admin_user: {
          username: adminUser.username,
          password: 'admin123',
          email: adminUser.email
        },
        commission_liquidation_id: commissionResult.liquidation_id,
        trace_id: invoice.trace_id
      };
    } catch (error) {
      console.error(`❌ [ONBOARDING] Error en activateCompanyDefinitively:`, error);
      throw error;
    }
  }

  /**
   * Crear usuario CORE inmutable (Step 19)
   */
  async createCoreAdminUser(company) {
    const { User } = require('../config/database');
    const bcrypt = require('bcryptjs');

    const adminUser = await User.create({
      username: 'administrador',
      password: await bcrypt.hash('admin123', 12),
      first_name: 'Administrador',
      last_name: company.name,
      email: company.contact_email,
      role: 'admin',
      company_id: company.company_id,
      is_core_user: true,
      force_password_change: true,
      is_deletable: false
    });

    return adminUser;
  }

  /**
   * ============================================================================
   * CREAR EMPRESA INACTIVA (al firmar contrato, antes de facturar)
   * ============================================================================
   * Esta función se llama cuando el contrato se firma y aún no existe empresa.
   * La empresa se crea con status='pending' y is_active=false.
   * Solo se activará cuando se confirme el pago de la factura.
   */
  async createInactiveCompany(budget, contract) {
    const { sequelize } = require('../config/database');
    const { v4: uuidv4 } = require('uuid');

    // Obtener datos del lead si existe
    let leadData = {};
    if (budget.lead_id) {
      const leadResult = await sequelize.query(
        `SELECT * FROM sales_leads WHERE id = :leadId`,
        { replacements: { leadId: budget.lead_id }, type: sequelize.QueryTypes.SELECT }
      );
      if (leadResult.length > 0) {
        leadData = leadResult[0];
      }
    }

    // Generar slug único
    const baseName = leadData.company_name || `Empresa-${Date.now()}`;
    const slug = baseName
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Crear empresa INACTIVA
    const newCompany = await Company.create({
      name: leadData.company_name || baseName,
      slug: `${slug}-${uuidv4().substring(0, 8)}`,
      email: leadData.contact_email || budget.client_email,
      phone: leadData.contact_phone || null,
      address: leadData.address || null,
      city: leadData.city || null,
      country: leadData.country || 'Argentina',
      taxId: leadData.tax_id || null,

      // ESTADO INACTIVO
      status: 'pending',
      isActive: false,
      onboardingStatus: 'CONTRACT_SIGNED',
      traceId: budget.trace_id,

      // Módulos del presupuesto (pero NO activos aún)
      activeModules: this.convertModulesToActiveFormat(budget.selected_modules, false),

      // Configuración por defecto
      licenseType: 'professional',
      subscriptionType: 'professional',
      maxEmployees: budget.contracted_employees || 50,
      contractedEmployees: budget.contracted_employees || 1,

      // Vendedor
      assignedVendorId: budget.vendor_id
    });

    console.log(`🏢 [ONBOARDING] Empresa INACTIVA creada: ${newCompany.name} (ID: ${newCompany.company_id})`);
    console.log(`   - Status: ${newCompany.status}`);
    console.log(`   - isActive: ${newCompany.isActive}`);
    console.log(`   - trace_id: ${newCompany.traceId}`);

    // Crear sucursal CENTRAL (inactiva también) - solo si no existen branches ya creadas por formulario
    const { Branch } = require('../config/database');
    const existingBranches = await Branch.count({ where: { company_id: newCompany.company_id } });
    if (existingBranches === 0) {
      await Branch.create({
        name: 'CENTRAL',
        code: `CENTRAL-${newCompany.company_id}`,
        company_id: newCompany.company_id,
        is_main: true,
        isActive: false,  // Inactiva hasta que se active la empresa
        address: newCompany.address
      });
      console.log(`   - Sucursal CENTRAL creada`);
    } else {
      console.log(`   - ${existingBranches} sucursal(es) ya existen (creadas por formulario de alta)`);
    }

    // Marcar lead como convertido (si existe)
    if (budget.lead_id) {
      await sequelize.query(
        `UPDATE sales_leads SET
          lifecycle_stage = 'customer',
          converted_to_customer_at = NOW(),
          converted_company_id = :companyId
         WHERE id = :leadId`,
        { replacements: { leadId: budget.lead_id, companyId: newCompany.company_id } }
      );
      console.log(`   - Lead marcado como convertido`);
    }

    return newCompany;
  }

  /**
   * Convierte array de módulos del presupuesto a formato activeModules
   * @param {Array} selectedModules - [{module_key, module_name, price}, ...]
   * @param {Boolean} active - true si activar, false si solo "reservar"
   */
  convertModulesToActiveFormat(selectedModules, active = false) {
    if (!selectedModules || !Array.isArray(selectedModules)) {
      return {};
    }

    const result = {};
    selectedModules.forEach(mod => {
      const key = mod.module_key || mod.key || mod.name;
      if (key) {
        result[key] = active;  // false = módulo contratado pero no activo aún
      }
    });

    return result;
  }

  /**
   * ============================================================================
   * FASE 5: LIQUIDACIÓN INMEDIATA DE COMISIONES (7 pasos)
   * ============================================================================
   */

  /**
   * Liquidar comisiones inmediatamente (Steps 20-26)
   * @param {Object} invoice - Factura pagada
   */
  async liquidateCommissions(invoice) {
    try {
      console.log(`💰 [ONBOARDING] Iniciando liquidación de comisiones...`);

      const result = await CommissionService.liquidate({
        trace_id: invoice.trace_id,
        invoice_id: invoice.id,
        company_id: invoice.company_id,
        vendor_id: invoice.contract.vendor_id,
        amount_usd: invoice.amount_usd
      });

      console.log(`✅ [ONBOARDING] Liquidación de comisiones completada: ${result.liquidation_id}`);

      return result;
    } catch (error) {
      console.error(`❌ [ONBOARDING] Error en liquidateCommissions:`, error);
      throw error;
    }
  }

  /**
   * ============================================================================
   * FASE 6: BIENVENIDA AL CLIENTE (3 pasos)
   * ============================================================================
   */

  /**
   * Enviar mensaje de bienvenida (Step 27)
   */
  async sendWelcomeEmail(company, adminUser) {
    try {
      await this.notificationService.send({
        to: company.contact_email,
        type: 'BIENVENIDA',
        title: `🎉 ¡Bienvenido a Aponnt!`,
        body: `
          Bienvenido a Aponnt, ${company.name}!

          URL de acceso: ${company.slug}.aponnt.com
          Usuario: ${adminUser.username}
          Password temporal: admin123 (DEBES cambiarla al primer ingreso)

          Módulos activos: ${Object.keys(company.activeModules || {}).length}

          Contacto soporte: soporte@aponnt.com
        `,
        attachment: 'guia_inicio.pdf',
        channels: ['email']
      });

      console.log(`✅ [ONBOARDING] Email de bienvenida enviado a ${company.name}`);
    } catch (error) {
      console.error(`⚠️ [ONBOARDING] Error enviando email de bienvenida:`, error.message);
    }
  }

  /**
   * ============================================================================
   * INITIATE FROM QUOTE (puente Quote → Onboarding fases 2-6)
   * ============================================================================
   * Cuando un Quote pasa a 'active' (post-trial o directo), este método
   * ejecuta las fases 2-6 del onboarding usando datos del quote.
   */
  async initiateFromQuote(quote) {
    const trace_id = `ONBOARDING-QUOTE-${quote.id}-${uuidv4().substring(0, 8)}`;
    console.log(`🚀 [ONBOARDING] Iniciando desde Quote ${quote.quote_number} - trace: ${trace_id}`);

    try {
      // El quote ya tiene contrato creado por QuoteManagementService._createContractFromQuote
      const contract = await Contract.findOne({
        where: { quote_id: quote.id, status: 'active' }
      });

      if (!contract) {
        console.log(`⚠️ [ONBOARDING] No se encontró contrato activo para quote ${quote.id}. Fases 3-6 pendientes.`);
        return {
          success: true,
          trace_id,
          status: 'WAITING_CONTRACT',
          message: 'Quote activado. Contrato pendiente para continuar fases 3-6.'
        };
      }

      console.log(`📄 [ONBOARDING] Contrato encontrado: ${contract.contract_number}`);

      // FASE 3: Generar factura inicial
      let invoiceResult;
      try {
        invoiceResult = await this.generateInitialInvoice(contract);
        console.log(`✅ [ONBOARDING] Fase 3 (Factura) completada desde quote`);
      } catch (err) {
        console.warn(`⚠️ [ONBOARDING] Fase 3 (Factura) falló: ${err.message}`);
      }

      // FASES 4-6 se ejecutan cuando se confirma el pago (confirmInvoicePayment)
      // No se ejecutan aquí porque dependen del pago

      return {
        success: true,
        trace_id,
        quote_id: quote.id,
        contract_id: contract.id,
        invoice: invoiceResult || null,
        status: 'INVOICE_GENERATED',
        message: `Onboarding iniciado desde Quote ${quote.quote_number}. Factura generada. Fases 4-6 pendientes de pago.`
      };
    } catch (error) {
      console.error(`❌ [ONBOARDING] Error en initiateFromQuote:`, error);
      // No lanzar - el quote ya se activó, el onboarding es secundario
      return {
        success: false,
        trace_id,
        error: error.message
      };
    }
  }

  /**
   * ============================================================================
   * WRAPPERS BY TRACE_ID (para API REST)
   * ============================================================================
   */

  /**
   * Generar contrato buscando por trace_id
   */
  async generateContractByTrace(trace_id) {
    const budget = await Budget.findOne({ where: { trace_id } });
    if (!budget) throw new Error(`No se encontró presupuesto con trace_id: ${trace_id}`);
    return await this.generateContract(budget);
  }

  /**
   * Manejar firma de contrato buscando por trace_id
   */
  async handleContractSignatureByTrace(trace_id, action, signatureData) {
    const budget = await Budget.findOne({ where: { trace_id } });
    if (!budget) throw new Error(`No se encontró trace_id: ${trace_id}`);

    const contract = await Contract.findOne({ where: { quote_id: budget.id } });
    if (!contract) throw new Error(`No se encontró contrato para trace_id: ${trace_id}`);

    return await this.handleContractSignature(contract.id, action, signatureData);
  }

  /**
   * Generar factura buscando por trace_id
   */
  async generateInvoiceByTrace(trace_id) {
    const budget = await Budget.findOne({ where: { trace_id } });
    if (!budget) throw new Error(`No se encontró trace_id: ${trace_id}`);

    const contract = await Contract.findOne({ where: { quote_id: budget.id } });
    if (!contract) throw new Error(`No se encontró contrato para trace_id: ${trace_id}`);

    return await this.generateInitialInvoice(contract);
  }

  /**
   * Confirmar pago de factura buscando por trace_id
   */
  async confirmInvoicePaymentByTrace(trace_id, paymentData) {
    const invoice = await Invoice.findOne({ where: { internal_notes: { [require('sequelize').Op.like]: `%${trace_id}%` } } });
    if (!invoice) throw new Error(`No se encontró factura para trace_id: ${trace_id}`);

    return await this.confirmInvoicePayment(invoice.id, paymentData);
  }

  /**
   * Activar empresa buscando por trace_id
   */
  async activateCompanyByTrace(trace_id) {
    const invoice = await Invoice.findOne({ where: { internal_notes: { [require('sequelize').Op.like]: `%${trace_id}%` } } });
    if (!invoice) throw new Error(`No se encontró factura para trace_id: ${trace_id}`);

    return await this.activateCompanyDefinitively(invoice);
  }

  /**
   * Liquidar comisiones buscando por trace_id
   */
  async liquidateCommissionsByTrace(trace_id) {
    const invoice = await Invoice.findOne({ where: { internal_notes: { [require('sequelize').Op.like]: `%${trace_id}%` } } });
    if (!invoice) throw new Error(`No se encontró factura para trace_id: ${trace_id}`);

    return await this.liquidateCommissions(invoice);
  }

  /**
   * Enviar email de bienvenida buscando por trace_id
   */
  async sendWelcomeEmailByTrace(trace_id) {
    const budget = await Budget.findOne({ where: { trace_id } });
    if (!budget) throw new Error(`No se encontró trace_id: ${trace_id}`);

    const company = await Company.findByPk(budget.company_id);
    const adminUser = await require('../config/database').User.findOne({
      where: { company_id: company.company_id, role: 'admin', is_core_user: true }
    });

    await this.sendWelcomeEmail(company, adminUser);

    return { success: true, message: 'Email de bienvenida enviado' };
  }

  /**
   * ============================================================================
   * TRACKING & STATS
   * ============================================================================
   */

  /**
   * Obtener estado actual del onboarding por trace_id
   */
  async getOnboardingStatus(trace_id) {
    try {
      const budget = await Budget.findOne({ where: { trace_id } });
      if (!budget) throw new Error(`Trace ID no encontrado: ${trace_id}`);

      const contract = await Contract.findOne({ where: { quote_id: budget.id } });
      const invoice = contract ? await Invoice.findOne({ where: { company_id: budget.company_id } }) : null;
      const commission = invoice ? await CommissionLiquidation.findOne({ where: { invoice_id: invoice.id } }) : null;
      const company = await Company.findByPk(budget.company_id);

      // Determinar fase actual
      let current_phase = 'FASE_1_PRESUPUESTO';
      if (commission) current_phase = 'FASE_6_COMPLETADO';
      else if (company?.status === 'ACTIVE') current_phase = 'FASE_4_ACTIVA';
      else if (invoice) current_phase = 'FASE_3_FACTURACION';
      else if (contract) current_phase = 'FASE_2_CONTRATO';

      return {
        trace_id,
        current_phase,
        status: company?.onboarding_status || 'EN_PROCESO',
        budget: budget ? {
          budget_code: budget.budget_code,
          status: budget.status,
          total_monthly: budget.total_monthly,
          created_at: budget.created_at
        } : null,
        contract: contract ? {
          contract_number: contract.contract_number,
          status: contract.status,
          signed_at: contract.client_signature_date
        } : null,
        invoice: invoice ? {
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          paid_at: invoice.paid_at
        } : null,
        commission: commission ? {
          liquidation_code: commission.liquidation_code,
          total_commission_amount: commission.total_commission_amount,
          status: commission.status
        } : null,
        company: company ? {
          company_id: company.company_id,
          name: company.name,
          status: company.status,
          activated_at: company.activated_at
        } : null
      };
    } catch (error) {
      console.error('❌ [ONBOARDING] Error en getOnboardingStatus:', error);
      throw error;
    }
  }

  /**
   * Listar onboardings con filtros
   */
  async listOnboardings(filters = {}) {
    try {
      const where = {};

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.vendor_id) {
        where.vendor_id = filters.vendor_id;
      }

      const budgets = await Budget.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: filters.limit || 50,
        include: [
          { model: Company, as: 'company' },
          { model: AponntStaff, as: 'vendor' }
        ]
      });

      return budgets.map(b => ({
        trace_id: b.trace_id,
        budget_code: b.budget_code,
        company_name: b.company?.name,
        vendor_name: `${b.vendor?.first_name} ${b.vendor?.last_name}`,
        status: b.status,
        total_monthly: b.total_monthly,
        created_at: b.created_at
      }));
    } catch (error) {
      console.error('❌ [ONBOARDING] Error en listOnboardings:', error);
      throw error;
    }
  }

  /**
   * Cancelar onboarding en cualquier fase
   */
  async cancelOnboarding(trace_id, reason) {
    try {
      const budget = await Budget.findOne({ where: { trace_id } });
      if (!budget) throw new Error(`Trace ID no encontrado: ${trace_id}`);

      // Cancelar presupuesto
      await budget.update({
        status: 'CANCELLED',
        notes: (budget.notes || '') + `\n❌ CANCELADO: ${reason} (${new Date().toISOString()})`
      });

      // Cancelar contrato si existe
      const contract = await Contract.findOne({ where: { quote_id: budget.id } });
      if (contract) {
        await contract.update({
          status: 'cancelled',
          termination_reason: reason
        });
      }

      // Cancelar factura si existe
      const invoice = await Invoice.findOne({ where: { company_id: budget.company_id } });
      if (invoice && invoice.status !== 'paid') {
        await invoice.update({ status: 'cancelled' });
      }

      console.log(`❌ [ONBOARDING] Onboarding cancelado: ${trace_id} - Razón: ${reason}`);

      return { success: true, message: 'Onboarding cancelado exitosamente' };
    } catch (error) {
      console.error('❌ [ONBOARDING] Error en cancelOnboarding:', error);
      throw error;
    }
  }

  /**
   * Estadísticas globales de onboarding
   */
  async getOnboardingStats() {
    try {
      const [
        total,
        pending,
        accepted,
        rejected,
        completed
      ] = await Promise.all([
        Budget.count(),
        Budget.count({ where: { status: 'PENDING' } }),
        Budget.count({ where: { status: 'ACCEPTED' } }),
        Budget.count({ where: { status: 'REJECTED' } }),
        Company.count({ where: { onboarding_status: 'ONBOARDING_COMPLETED' } })
      ]);

      const conversionRate = total > 0 ? ((completed / total) * 100).toFixed(2) : 0;

      return {
        total,
        pending,
        accepted,
        rejected,
        completed,
        conversion_rate: parseFloat(conversionRate),
        by_phase: {
          phase_1_presupuesto: pending,
          phase_2_contrato: await Contract.count({ where: { status: 'active' } }),
          phase_3_facturacion: await Invoice.count({ where: { status: 'sent' } }),
          phase_4_activa: completed
        }
      };
    } catch (error) {
      console.error('❌ [ONBOARDING] Error en getOnboardingStats:', error);
      throw error;
    }
  }

  /**
   * ============================================================================
   * HELPERS
   * ============================================================================
   */

  async createAdministrativeTask(taskData) {
    const { AdministrativeTask } = require('../config/database');
    return await AdministrativeTask.create(taskData);
  }

  /**
   * ============================================================================
   * ACTIVACIÓN PARA TRIAL
   * ============================================================================
   */

  /**
   * Activa empresa cuando tiene período de prueba (trial).
   * No requiere factura pagada - activa inmediatamente con módulos bonificados.
   * @param {number} quoteId - ID del quote en estado 'in_trial'
   */
  async activateCompanyForTrial(quoteId) {
    const { Quote, Contract, Company, User, ModuleTrial } = require('../config/database');
    const bcrypt = require('bcryptjs');

    try {
      console.log(`🚀 [ONBOARDING] Activando empresa para TRIAL - Quote ID: ${quoteId}`);

      // 1. Obtener quote y validar
      const quote = await Quote.findByPk(quoteId, {
        include: [{ model: Company, as: 'company' }]
      });

      if (!quote) {
        throw new Error(`Quote ${quoteId} no encontrado`);
      }

      if (quote.status !== 'in_trial') {
        throw new Error(`Quote ${quote.quote_number} no está en estado trial (status: ${quote.status})`);
      }

      if (!quote.has_trial) {
        throw new Error(`Quote ${quote.quote_number} no tiene trial configurado`);
      }

      // 2. Verificar que existe contrato
      const contract = await Contract.findOne({ where: { quote_id: quoteId } });
      if (!contract) {
        throw new Error(`No existe contrato para el quote ${quote.quote_number}. El contrato debe existir antes de activar.`);
      }

      // 3. Obtener o crear empresa
      let company = quote.company;
      if (!company) {
        throw new Error('No hay empresa asociada al quote');
      }

      // 4. Activar empresa en modo trial
      await company.update({
        status: 'trial',
        is_active: true,
        is_trial: true,
        onboarding_status: 'TRIAL_ACTIVE',
        trial_ends_at: quote.trial_end_date,
        activated_at: new Date()
      });

      console.log(`✅ [ONBOARDING] Empresa ${company.name} activada en modo TRIAL`);

      // 5. Crear usuario admin si no existe
      let adminUser = await User.findOne({
        where: {
          company_id: company.company_id,
          is_core_user: true
        }
      });

      if (!adminUser) {
        adminUser = await User.create({
          username: 'administrador',
          password: await bcrypt.hash('admin123', 12),
          first_name: 'Administrador',
          last_name: company.name,
          email: company.contact_email,
          role: 'admin',
          company_id: company.company_id,
          is_core_user: true,
          force_password_change: true,
          is_deletable: false
        });
        console.log(`✅ [ONBOARDING] Usuario admin creado: administrador`);
      }

      // 6. Obtener info de trials activos
      const activeTrials = await ModuleTrial.findAll({
        where: {
          company_id: company.company_id,
          status: 'active'
        }
      });

      // 7. Enviar email de bienvenida con credenciales
      try {
        await this.sendWelcomeEmail(company, adminUser, {
          isTrial: true,
          trialEndDate: quote.trial_end_date,
          trialModules: activeTrials.map(t => t.module_name)
        });
      } catch (emailErr) {
        console.warn(`⚠️ [ONBOARDING] No se pudo enviar email de bienvenida: ${emailErr.message}`);
      }

      return {
        success: true,
        message: `Empresa ${company.name} activada en modo TRIAL hasta ${new Date(quote.trial_end_date).toLocaleDateString('es-AR')}`,
        company: {
          id: company.company_id,
          name: company.name,
          slug: company.slug,
          status: 'trial',
          is_active: true
        },
        admin_user: {
          username: 'administrador',
          password: 'admin123',
          email: adminUser.email,
          note: 'Contraseña temporal - se solicitará cambio en primer login'
        },
        trial_info: {
          start_date: quote.trial_start_date,
          end_date: quote.trial_end_date,
          bonification: quote.trial_bonification_percentage || 100,
          modules: activeTrials.map(t => ({
            name: t.module_name,
            key: t.module_key,
            end_date: t.end_date
          }))
        },
        contract: {
          id: contract.id,
          code: contract.contract_code,
          status: contract.status
        },
        quote: {
          id: quote.id,
          number: quote.quote_number,
          status: quote.status
        },
        login_url: `/panel-empresa.html?empresa=${company.slug}`
      };

    } catch (error) {
      console.error(`❌ [ONBOARDING] Error en activateCompanyForTrial:`, error);
      throw error;
    }
  }

  /**
   * Obtiene quotes en estado 'in_trial' que necesitan activación.
   */
  async getPendingTrialActivations() {
    const { Quote, Company, Contract, ModuleTrial } = require('../config/database');
    const { Op } = require('sequelize');

    try {
      const quotes = await Quote.findAll({
        where: {
          status: 'in_trial',
          has_trial: true
        },
        include: [
          {
            model: Company,
            as: 'company',
            attributes: ['company_id', 'name', 'slug', 'is_active', 'status', 'contact_email']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      const results = [];

      for (const quote of quotes) {
        // Verificar si tiene contrato
        const contract = await Contract.findOne({ where: { quote_id: quote.id } });

        // Verificar trials activos
        const trials = await ModuleTrial.findAll({
          where: {
            quote_id: quote.id,
            status: 'active'
          }
        });

        const companyIsActive = quote.company?.is_active || false;

        results.push({
          quote_id: quote.id,
          quote_number: quote.quote_number,
          company: quote.company ? {
            id: quote.company.company_id,
            name: quote.company.name,
            slug: quote.company.slug,
            is_active: quote.company.is_active,
            status: quote.company.status
          } : null,
          trial: {
            start_date: quote.trial_start_date,
            end_date: quote.trial_end_date,
            days_remaining: quote.trial_end_date
              ? Math.ceil((new Date(quote.trial_end_date) - new Date()) / (1000 * 60 * 60 * 24))
              : null,
            modules_count: trials.length
          },
          has_contract: !!contract,
          contract_code: contract?.contract_code || null,
          needs_activation: !companyIsActive && !!contract,
          action_required: !companyIsActive && !!contract
            ? 'ACTIVAR_EMPRESA'
            : companyIsActive
              ? 'YA_ACTIVA'
              : 'FALTA_CONTRATO'
        });
      }

      return {
        success: true,
        count: results.length,
        pending_activations: results.filter(r => r.needs_activation),
        all: results
      };

    } catch (error) {
      console.error(`❌ [ONBOARDING] Error en getPendingTrialActivations:`, error);
      throw error;
    }
  }
}

module.exports = new OnboardingService();
