# 🏗️ ARQUITECTURA: Facturación Dual-Mode con Presupuestos Recurrentes

## 📋 REFINAMIENTOS CLAVE (Basado en feedback)

### 1. ✅ FUENTE ÚNICA DE VERDAD - DIFERENCIACIÓN CRÍTICA

#### Modo APONNT (Facturación a Empresas Contratantes)

```javascript
// FUENTE DE VERDAD = CONTRATO VIGENTE (documento legal)

{
  // Catálogo de módulos: engineering-metadata.js (definición técnica)
  moduleCatalog: "backend/engineering-metadata.js",

  // QUÉ facturar: CONTRATO vigente (fuente legal)
  billingSource: "contracts table WHERE status = 'ACTIVE'",

  // Clientes: Empresas contratantes
  customers: "companies table",

  // Productos: Módulos según contrato
  products: "contract.selected_modules (JSON field)",

  // Plantilla fiscal: Según país de la empresa
  taxTemplate: "CompanyTaxConfig → company.country → TaxTemplate",

  // Por ahora: SIEMPRE Argentina
  forcedTaxTemplate: "AR (Argentina)",

  // Ciclo: Mensual automático
  billingCycle: "MONTHLY_AUTO"
}
```

#### Modo CLIENT (Facturación de Empresa a sus Clientes)

```javascript
// FUENTE DE VERDAD = PADRÓN PROPIO

{
  // Clientes: Padrón de clientes propio
  customers: "siac_clientes table (multi-tenant)",

  // Productos: Padrón de productos/servicios propio
  products: "siac_productos table (multi-tenant) ← CREAR",

  // Presupuestos: Presupuestos aprobados ← CREAR
  quotes: "siac_presupuestos table (multi-tenant) ← NUEVA FEATURE",

  // Plantilla fiscal: Según país de la empresa
  taxTemplate: "CompanyTaxConfig → TaxTemplate",

  // Ciclo: Manual o automático (según presupuesto)
  billingCycle: "MANUAL | MONTHLY_AUTO (if recurring_quote)"
}
```

---

## 🎯 IDEA BRILLANTE: PRESUPUESTOS RECURRENTES (REUTILIZABLE)

### Concepto Unificado

**Tanto Aponnt como Empresas usan el mismo concepto**:

```
Presupuesto Aprobado → Contrato/Acuerdo → Facturación Cíclica
```

**En Aponnt**:
1. Vendedor genera presupuesto (Budget) con módulos
2. Cliente acepta presupuesto
3. Se genera contrato automáticamente
4. **Contrato = base para facturación mensual recurrente**

**En Empresas** (NUEVA FEATURE):
1. Empresa genera presupuesto (siac_presupuestos) para cliente
2. Cliente acepta presupuesto
3. Presupuesto se marca como "recurrente" (opcional)
4. **Presupuesto recurrente = base para facturación automática**

---

## 🏗️ ARQUITECTURA TÉCNICA REFINADA

### Layer 1: Contratos como Fuente de Verdad

```javascript
// src/services/billing/ContractBillingService.js

class ContractBillingService {
  /**
   * Facturar según contrato vigente (NO según metadata)
   * El contrato es el documento LEGAL que define qué se factura
   */
  async generateInvoiceFromContract(contractId, billingMonth) {
    // 1. Obtener contrato VIGENTE
    const contract = await Contract.findOne({
      where: {
        id: contractId,
        status: 'ACTIVE',
        start_date: { [Op.lte]: new Date() },
        [Op.or]: [
          { end_date: null },
          { end_date: { [Op.gte]: new Date() } }
        ]
      }
    });

    if (!contract) {
      throw new Error('Contrato no vigente o no encontrado');
    }

    // 2. Obtener empresa contratante (cliente de Aponnt)
    const company = await Company.findByPk(contract.company_id);

    // 3. Obtener plantilla fiscal según país de la empresa
    const taxTemplate = await this.getTaxTemplateForCompany(company);

    // 4. Módulos a facturar según CONTRATO (no según metadata)
    const modulesToBill = contract.selected_modules; // JSON field

    // 5. Calcular totales según plantilla fiscal
    const invoiceData = await this.calculateInvoiceWithTaxes(
      company,
      modulesToBill,
      taxTemplate,
      billingMonth
    );

    // 6. Crear factura usando sistema SIAC
    return await this.createAponntInvoice(invoiceData);
  }

  /**
   * Obtener plantilla fiscal según país de la empresa
   * Por ahora: forzar Argentina
   */
  async getTaxTemplateForCompany(company) {
    // TODO: Cuando se expanda internacionalmente, usar:
    // const countryCode = company.country;

    // Por ahora: SIEMPRE Argentina
    const countryCode = 'AR';

    const template = await TaxTemplate.findOne({
      where: { countryCode },
      include: [
        {
          model: TaxCondition,
          as: 'conditions',
          where: { isActive: true }
        },
        {
          model: TaxConcept,
          as: 'concepts',
          where: { isActive: true },
          include: [{
            model: TaxRate,
            as: 'rates',
            where: { isActive: true }
          }]
        }
      ]
    });

    if (!template) {
      throw new Error(`Plantilla fiscal no encontrada para país: ${countryCode}`);
    }

    return template;
  }

  /**
   * Calcular factura con impuestos según plantilla fiscal
   */
  async calculateInvoiceWithTaxes(company, modules, taxTemplate, billingMonth) {
    const items = [];
    let subtotal = 0;

    // Preparar items de factura
    for (const module of modules) {
      const item = {
        productoDescripcion: `Módulo ${module.module_name}`,
        cantidad: 1,
        precioUnitario: parseFloat(module.monthly_price || module.total_price / 12),
        categoriaProducto: 'MODULO_APONNT'
      };

      item.subtotal = item.cantidad * item.precioUnitario;
      subtotal += item.subtotal;

      items.push(item);
    }

    // Aplicar conceptos impositivos de la plantilla
    const taxes = await this.applyTaxConcepts(
      subtotal,
      taxTemplate.concepts,
      company.condicion_iva || 'RESPONSABLE_INSCRIPTO'
    );

    const total = subtotal + taxes.totalTaxes;

    return {
      company,
      items,
      subtotal,
      taxes: taxes.breakdown,
      totalTaxes: taxes.totalTaxes,
      total,
      billingMonth,
      taxTemplate: {
        country: taxTemplate.country,
        templateName: taxTemplate.templateName
      }
    };
  }

  /**
   * Aplicar conceptos impositivos de la plantilla
   * (Similar a liquidación de sueldos)
   */
  async applyTaxConcepts(baseAmount, concepts, condicionIva) {
    const breakdown = [];
    let totalTaxes = 0;

    // Ordenar por orden de cálculo
    const sortedConcepts = concepts.sort((a, b) => a.calculationOrder - b.calculationOrder);

    for (const concept of sortedConcepts) {
      // Buscar alícuota según condición IVA
      const rate = concept.rates.find(r =>
        r.rateCode === condicionIva || r.isDefault
      );

      if (!rate) continue;

      // Calcular impuesto
      const taxAmount = (baseAmount * rate.ratePercentage) / 100;

      breakdown.push({
        conceptCode: concept.conceptCode,
        conceptName: concept.conceptName,
        baseAmount,
        ratePercentage: rate.ratePercentage,
        taxAmount
      });

      totalTaxes += taxAmount;

      // Si el concepto es acumulativo, actualizar base
      if (concept.baseAmount === 'acumulado') {
        baseAmount += taxAmount;
      }
    }

    return {
      breakdown,
      totalTaxes
    };
  }

  /**
   * Crear factura de Aponnt usando sistema SIAC
   */
  async createAponntInvoice(invoiceData) {
    const {
      company,
      items,
      subtotal,
      taxes,
      totalTaxes,
      total,
      billingMonth
    } = invoiceData;

    // Crear factura en sistema SIAC
    const factura = await Factura.create({
      // Caja/Punto de venta de Aponnt (especial)
      cajaId: await this.getAponntCajaId(),
      tipoComprobanteId: await this.getTipoComprobanteId(company.condicion_iva),

      // Cliente = Empresa contratante
      clienteId: company.company_id,
      clienteRazonSocial: company.legal_name || company.name,
      clienteDocumentoTipo: 'CUIT',
      clienteDocumentoNumero: company.tax_id,
      clienteDireccion: company.address,
      clienteEmail: company.contact_email,
      clienteTelefono: company.contact_phone,
      clienteCondicionIva: company.condicion_iva || 'RESPONSABLE_INSCRIPTO',

      // Totales
      subtotal,
      totalIva: totalTaxes,
      total,

      // Observaciones
      observaciones: `Factura mensual Aponnt - ${billingMonth}`,

      // Metadata
      metadata: {
        billing_mode: 'APONNT_INTERNAL',
        billing_month: billingMonth,
        tax_template: invoiceData.taxTemplate,
        tax_breakdown: taxes
      },

      estado: 'PENDIENTE',
      createdBy: 'APONNT_SYSTEM'
    });

    // Crear items
    for (const item of items) {
      await FacturaItem.create({
        facturaId: factura.id,
        ...item
      });
    }

    console.log(`✅ [APONNT BILLING] Factura creada para ${company.name}: ${factura.numeroCompleto}`);

    return factura;
  }

  /**
   * Obtener ID de caja especial de Aponnt
   * (Crear si no existe)
   */
  async getAponntCajaId() {
    let caja = await Caja.findOne({
      where: { metadata: { type: 'APONNT_INTERNAL' } }
    });

    if (!caja) {
      // Crear punto de venta de Aponnt
      const puntoVenta = await PuntoVenta.create({
        companyId: 0, // 0 = Aponnt (no es empresa cliente)
        nombrePuntoVenta: 'Aponnt - Facturación a Empresas',
        activo: true,
        metadata: { type: 'APONNT_INTERNAL' }
      });

      // Crear caja de Aponnt
      caja = await Caja.create({
        puntoVentaId: puntoVenta.id,
        nombreCaja: 'Caja Principal Aponnt',
        activo: true,
        metadata: { type: 'APONNT_INTERNAL' }
      });
    }

    return caja.id;
  }

  /**
   * Obtener tipo de comprobante según condición IVA
   */
  async getTipoComprobanteId(condicionIva) {
    // Factura A para Responsables Inscriptos
    // Factura B para consumidores finales
    const codigoComprobante = condicionIva === 'RESPONSABLE_INSCRIPTO' ? 'FA' : 'FB';

    let tipo = await TipoComprobante.findOne({
      where: { codigoTipo: codigoComprobante }
    });

    if (!tipo) {
      tipo = await TipoComprobante.create({
        companyId: 0, // 0 = Aponnt
        codigoTipo: codigoComprobante,
        nombreTipo: codigoComprobante === 'FA' ? 'Factura A' : 'Factura B',
        activo: true
      });
    }

    return tipo.id;
  }
}

module.exports = ContractBillingService;
```

---

## 🎯 NUEVA FEATURE: Presupuestos Recurrentes para Empresas

### Migración: Tabla de Presupuestos SIAC

```sql
-- migrations/20250109_create_siac_presupuestos.sql

CREATE TABLE IF NOT EXISTS siac_presupuestos (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Identificación
    codigo_presupuesto VARCHAR(50) NOT NULL,
    descripcion TEXT,

    -- Cliente
    cliente_id INTEGER REFERENCES siac_clientes(id) ON DELETE CASCADE,
    cliente_razon_social VARCHAR(200),
    cliente_documento VARCHAR(20),
    cliente_email VARCHAR(100),

    -- Vigencia
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_validez DATE, -- Hasta cuándo es válido
    estado VARCHAR(20) DEFAULT 'BORRADOR', -- BORRADOR, ENVIADO, ACEPTADO, RECHAZADO, VENCIDO

    -- Items (JSON)
    items JSONB NOT NULL DEFAULT '[]',

    -- Totales
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_impuestos DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    moneda VARCHAR(3) DEFAULT 'ARS',

    -- Facturación recurrente (NUEVA FEATURE)
    es_recurrente BOOLEAN DEFAULT false,
    frecuencia_facturacion VARCHAR(20), -- MONTHLY, QUARTERLY, YEARLY
    proximo_periodo_facturacion DATE,
    ultimo_periodo_facturado DATE,

    -- Metadata
    observaciones TEXT,
    metadata JSONB DEFAULT '{}',

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,

    UNIQUE(company_id, codigo_presupuesto)
);

-- Índices
CREATE INDEX idx_presupuestos_company ON siac_presupuestos(company_id);
CREATE INDEX idx_presupuestos_cliente ON siac_presupuestos(cliente_id);
CREATE INDEX idx_presupuestos_estado ON siac_presupuestos(estado);
CREATE INDEX idx_presupuestos_recurrente ON siac_presupuestos(es_recurrente);
CREATE INDEX idx_presupuestos_proximo_periodo ON siac_presupuestos(proximo_periodo_facturacion);

-- Trigger
CREATE TRIGGER update_siac_presupuestos_updated_at
    BEFORE UPDATE ON siac_presupuestos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para generar código automático
CREATE OR REPLACE FUNCTION generate_presupuesto_code(p_company_id INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_year VARCHAR(4);
    v_sequence INTEGER;
    v_code VARCHAR(50);
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(codigo_presupuesto FROM '\d+$') AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM siac_presupuestos
    WHERE company_id = p_company_id
      AND codigo_presupuesto LIKE 'PPTO-' || v_year || '-%';

    v_code := 'PPTO-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');

    RETURN v_code;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔄 SERVICIO: Facturación Recurrente desde Presupuestos

```javascript
// src/services/billing/RecurringQuoteBillingService.js

class RecurringQuoteBillingService {
  /**
   * Facturar presupuestos recurrentes (cron job)
   * Tanto para Aponnt como para empresas
   */
  async processRecurringQuotes() {
    console.log('📋 [RECURRING BILLING] Procesando presupuestos recurrentes...');

    // 1. Presupuestos de Aponnt (contratos vigentes)
    await this.processAponntContracts();

    // 2. Presupuestos de empresas clientes
    await this.processClientQuotes();
  }

  /**
   * Procesar contratos de Aponnt (facturación mensual)
   */
  async processAponntContracts() {
    const contractService = new ContractBillingService();

    // Obtener contratos activos que necesitan facturación este mes
    const contracts = await Contract.findAll({
      where: {
        status: 'ACTIVE',
        // Que no se haya facturado este mes
        [Op.or]: [
          { last_billing_date: null },
          {
            last_billing_date: {
              [Op.lt]: sequelize.literal("DATE_TRUNC('month', CURRENT_DATE)")
            }
          }
        ]
      }
    });

    console.log(`📋 [APONNT] ${contracts.length} contratos a facturar`);

    const results = {
      success: [],
      failed: []
    };

    for (const contract of contracts) {
      try {
        const billingMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        // Generar factura desde contrato
        const invoice = await contractService.generateInvoiceFromContract(
          contract.id,
          billingMonth
        );

        // Actualizar última fecha de facturación
        await contract.update({
          last_billing_date: new Date()
        });

        results.success.push({
          contractId: contract.id,
          companyId: contract.company_id,
          invoiceId: invoice.id
        });

      } catch (error) {
        console.error(`❌ Error facturando contrato ${contract.id}:`, error);
        results.failed.push({
          contractId: contract.id,
          error: error.message
        });
      }
    }

    console.log(`✅ [APONNT] Facturado: ${results.success.length} exitosos, ${results.failed.length} fallidos`);

    return results;
  }

  /**
   * Procesar presupuestos recurrentes de empresas
   */
  async processClientQuotes() {
    // Obtener presupuestos recurrentes que necesitan facturación
    const quotes = await sequelize.query(`
      SELECT *
      FROM siac_presupuestos
      WHERE es_recurrente = true
        AND estado = 'ACEPTADO'
        AND proximo_periodo_facturacion <= CURRENT_DATE
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`📋 [CLIENT QUOTES] ${quotes.length} presupuestos recurrentes a facturar`);

    const results = {
      success: [],
      failed: []
    };

    for (const quote of quotes) {
      try {
        // Crear factura desde presupuesto
        const invoice = await this.createInvoiceFromQuote(quote);

        // Actualizar próximo período
        const nextPeriod = this.calculateNextPeriod(
          quote.proximo_periodo_facturacion,
          quote.frecuencia_facturacion
        );

        await sequelize.query(`
          UPDATE siac_presupuestos
          SET ultimo_periodo_facturado = CURRENT_DATE,
              proximo_periodo_facturacion = :nextPeriod
          WHERE id = :quoteId
        `, {
          replacements: {
            nextPeriod,
            quoteId: quote.id
          }
        });

        results.success.push({
          quoteId: quote.id,
          invoiceId: invoice.id
        });

      } catch (error) {
        console.error(`❌ Error facturando presupuesto ${quote.id}:`, error);
        results.failed.push({
          quoteId: quote.id,
          error: error.message
        });
      }
    }

    console.log(`✅ [CLIENT QUOTES] Facturado: ${results.success.length} exitosos, ${results.failed.length} fallidos`);

    return results;
  }

  /**
   * Crear factura desde presupuesto
   */
  async createInvoiceFromQuote(quote) {
    const items = JSON.parse(quote.items);

    const factura = await Factura.create({
      cajaId: 1, // TODO: Obtener caja de la empresa
      tipoComprobanteId: 1, // TODO: Según condición IVA del cliente
      clienteId: quote.cliente_id,
      clienteRazonSocial: quote.cliente_razon_social,
      clienteDocumentoNumero: quote.cliente_documento,
      clienteEmail: quote.cliente_email,
      subtotal: quote.subtotal,
      totalIva: quote.total_impuestos,
      total: quote.total,
      observaciones: `Factura automática desde presupuesto ${quote.codigo_presupuesto}`,
      metadata: {
        billing_mode: 'CLIENT_BUSINESS',
        source_quote_id: quote.id,
        source_quote_code: quote.codigo_presupuesto
      },
      estado: 'PENDIENTE'
    });

    // Crear items
    for (const item of items) {
      await FacturaItem.create({
        facturaId: factura.id,
        ...item
      });
    }

    return factura;
  }

  /**
   * Calcular próximo período de facturación
   */
  calculateNextPeriod(currentPeriod, frequency) {
    const date = new Date(currentPeriod);

    switch (frequency) {
      case 'MONTHLY':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'QUARTERLY':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'YEARLY':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }

    return date.toISOString().split('T')[0];
  }
}

module.exports = RecurringQuoteBillingService;
```

---

## 🎨 FRONTEND: Pantalla Compartida con Modo

```javascript
// public/js/modules/unified-invoicing.js

class UnifiedInvoicingModule {
  constructor(mode = 'client') {
    this.mode = mode; // 'aponnt' o 'client'
    this.API_BASE = '/api/billing';
  }

  async init(containerId) {
    this.container = document.getElementById(containerId);

    // Configurar según modo
    if (this.mode === 'aponnt') {
      this.config = {
        title: 'Facturación Aponnt → Empresas',
        customersLabel: 'Empresas Contratantes',
        productsLabel: 'Módulos según Contrato',
        quotesLabel: 'Contratos Vigentes',
        sourceTable: 'contracts',
        allowRecurring: true,
        autoGenerate: true
      };
    } else {
      this.config = {
        title: 'Facturación a Clientes',
        customersLabel: 'Clientes',
        productsLabel: 'Productos / Servicios',
        quotesLabel: 'Presupuestos',
        sourceTable: 'siac_presupuestos',
        allowRecurring: true,
        autoGenerate: false // Por ahora manual
      };
    }

    await this.render();
  }

  async loadQuotes() {
    const endpoint = this.mode === 'aponnt'
      ? `${this.API_BASE}/aponnt/contracts`
      : `${this.API_BASE}/quotes`;

    const response = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });

    return await response.json();
  }

  renderQuotesList() {
    return `
      <div class="quotes-list">
        <h3>${this.config.quotesLabel}</h3>

        <div class="filters">
          <input type="text" placeholder="Buscar..." onkeyup="invoicing.filterQuotes(this.value)">

          ${this.mode === 'aponnt' ? `
            <label>
              <input type="checkbox" onchange="invoicing.toggleAutoGenerate(this.checked)">
              Facturación automática mensual
            </label>
          ` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>${this.config.customersLabel}</th>
              <th>Monto</th>
              <th>Estado</th>
              ${this.config.allowRecurring ? '<th>Recurrente</th>' : ''}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="quotes-tbody">
            <!-- Cargado dinámicamente -->
          </tbody>
        </table>
      </div>
    `;
  }

  async generateInvoiceFromQuote(quoteId) {
    if (!confirm('¿Generar factura desde este presupuesto/contrato?')) return;

    showLoading('Generando factura...');

    try {
      const endpoint = this.mode === 'aponnt'
        ? `${this.API_BASE}/aponnt/invoice-from-contract/${quoteId}`
        : `${this.API_BASE}/invoice-from-quote/${quoteId}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        showNotification(`✅ Factura generada: ${result.invoice.numeroCompleto}`);
        await this.loadInvoices();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Error generando factura: ' + error.message);
    } finally {
      hideLoading();
    }
  }
}
```

---

## 📊 RESUMEN DE ARQUITECTURA REFINADA

### Aponnt Mode:
1. **Catálogo**: `engineering-metadata.js` (definición técnica)
2. **Fuente legal**: `contracts` table (QUÉ facturar)
3. **Clientes**: `companies` table
4. **Productos**: `contract.selected_modules` (JSON)
5. **Plantilla fiscal**: Argentina (por ahora)
6. **Facturación**: Mensual automática desde contrato

### Client Mode:
1. **Clientes**: `siac_clientes` table
2. **Productos**: `siac_productos` table ← CREAR
3. **Presupuestos**: `siac_presupuestos` table ← CREAR
4. **Plantilla fiscal**: Según país de empresa
5. **Facturación**: Manual o recurrente desde presupuesto

---

## ✅ VENTAJAS DE ESTA ARQUITECTURA

1. ✅ **Contrato = Fuente Legal** (profesional y auditable)
2. ✅ **Plantillas Fiscales por País** (escalable internacionalmente)
3. ✅ **Presupuestos Recurrentes** (mismo concepto para Aponnt y clientes)
4. ✅ **Reutilización de Código** (90% compartido)
5. ✅ **3 Módulos Vendibles** (Facturación + Clientes + Presupuestos)

---

## 🎯 PRÓXIMOS PASOS

1. Crear tabla `siac_productos` (30 min)
2. Crear tabla `siac_presupuestos` (30 min)
3. Implementar `ContractBillingService` (3 horas)
4. Implementar `RecurringQuoteBillingService` (2 horas)
5. Frontend unificado (4 horas)
6. Cron job (1 hora)

**TOTAL: 6-7 días**

---

**¿Arrancamos con la implementación? 🚀**
