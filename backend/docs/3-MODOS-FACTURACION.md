# 🎯 ARQUITECTURA: 3 Modos de Facturación (Aponnt + Empresas)

## 📊 CASOS DE USO REALES

### APONNT puede facturar:

1. ✅ **Servicio mensual de módulos** (RECURRENTE desde CONTRATO)
   - Cliente contrata módulos → Contrato → Factura mensual automática
   - Ejemplo: Empresa ISI contrata users + attendance → $100/mes automático

2. ✅ **Servicios profesionales** (MANUAL directa)
   - Consultoría, capacitación, desarrollo custom
   - Ejemplo: Implementación personalizada → Factura manual $5000

3. ✅ **Servicios ocasionales** (OCASIONAL desde PRESUPUESTO)
   - Presupuesto aprobado → Factura UNA VEZ → Cierra
   - Ejemplo: Migración de datos → Presupuesto $3000 → Factura → Fin

---

### EMPRESAS pueden facturar:

1. ✅ **Servicios recurrentes** (RECURRENTE desde PRESUPUESTO)
   - Presupuesto aprobado → Facturas mensuales mientras esté vigente
   - Ejemplo: "Limpieza mensual de baños" → $500/mes por 12 meses

2. ✅ **Ventas directas** (MANUAL directa)
   - Venta de productos/servicios sin presupuesto
   - Ejemplo: Cliente compra 10 cajas → Factura directa

3. ✅ **Servicios ocasionales** (OCASIONAL desde PRESUPUESTO)
   - Presupuesto aprobado → Factura UNA VEZ → Cierra
   - Ejemplo: "Barrido y limpieza" → Presupuesto $800 → Factura → Fin

---

## 🏗️ ARQUITECTURA: 3 Flujos de Facturación

### Modo 1: MANUAL (Sin Presupuesto)

```
┌─────────────────────────────────────────────────────────────┐
│ FACTURACIÓN MANUAL DIRECTA                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Usuario ingresa:                                           │
│  • Cliente (seleccionar o crear)                            │
│  • Items de factura (productos/servicios)                   │
│  • Cantidades y precios                                     │
│                    ↓                                         │
│           Sistema calcula impuestos                         │
│           (según plantilla fiscal)                          │
│                    ↓                                         │
│            Genera factura SIAC                              │
│                    ↓                                         │
│  Metadata: { mode: 'MANUAL', source: null }                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Uso**: Ventas rápidas, servicios ad-hoc, productos físicos, etc.

---

### Modo 2: OCASIONAL (Presupuesto → Factura 1 vez)

```
┌─────────────────────────────────────────────────────────────┐
│ FACTURACIÓN DESDE PRESUPUESTO OCASIONAL                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Crear presupuesto:                                         │
│  • Cliente + Items                                          │
│  • Marca: es_recurrente = FALSE                            │
│                    ↓                                         │
│         Cliente acepta presupuesto                          │
│                    ↓                                         │
│    Botón: "Generar Factura desde Presupuesto"             │
│                    ↓                                         │
│  Genera factura SIAC con items del presupuesto            │
│                    ↓                                         │
│  Presupuesto.estado = 'FACTURADO'                         │
│  Presupuesto.factura_generada_id = factura.id             │
│                    ↓                                         │
│  Metadata: {                                                │
│    mode: 'QUOTE_ONETIME',                                   │
│    source_quote_id: xxx                                     │
│  }                                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Uso**: Proyectos one-time, servicios específicos, trabajos ocasionales.

---

### Modo 3: RECURRENTE (Presupuesto → Facturas mensuales)

```
┌─────────────────────────────────────────────────────────────┐
│ FACTURACIÓN RECURRENTE DESDE PRESUPUESTO/CONTRATO          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  APONNT:                                                    │
│  Contrato vigente → Factura mensual automática             │
│                                                             │
│  EMPRESAS:                                                  │
│  Crear presupuesto:                                         │
│  • Cliente + Items                                          │
│  • Marca: es_recurrente = TRUE                             │
│  • Frecuencia: MONTHLY / QUARTERLY / YEARLY                │
│  • Vigencia: fecha_inicio → fecha_fin                      │
│                    ↓                                         │
│         Cliente acepta presupuesto                          │
│                    ↓                                         │
│         Presupuesto.estado = 'ACTIVO'                      │
│         Presupuesto.proximo_periodo = fecha_inicio         │
│                    ↓                                         │
│      CRON JOB (día 1 de cada mes):                         │
│      • Busca presupuestos/contratos con                    │
│        proximo_periodo <= HOY                               │
│      • Genera factura automáticamente                      │
│      • Actualiza proximo_periodo (+1 mes)                  │
│                    ↓                                         │
│  Metadata: {                                                │
│    mode: 'QUOTE_RECURRING',                                 │
│    source_quote_id: xxx,                                    │
│    billing_period: 'YYYY-MM'                                │
│  }                                                          │
│                                                             │
│  Finaliza cuando:                                           │
│  • fecha_fin alcanzada                                      │
│  • Usuario cancela presupuesto                             │
│  • Contrato se termina                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Uso**: Servicios mensuales, suscripciones, mantenimientos periódicos.

---

## 🗄️ TABLA ACTUALIZADA: siac_presupuestos

```sql
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
    fecha_validez DATE, -- Hasta cuándo puede aceptarlo el cliente
    fecha_inicio_servicio DATE, -- Cuándo empieza el servicio
    fecha_fin_servicio DATE, -- Cuándo termina el servicio

    -- Estado
    estado VARCHAR(20) DEFAULT 'BORRADOR',
    -- Estados posibles:
    -- BORRADOR: Recién creado, en edición
    -- ENVIADO: Enviado al cliente, esperando respuesta
    -- ACEPTADO: Cliente aceptó (one-time SIN facturar aún)
    -- ACTIVO: Presupuesto recurrente activo (facturando)
    -- FACTURADO: One-time ya facturado (cerrado)
    -- FINALIZADO: Recurrente llegó a fecha_fin (cerrado)
    -- CANCELADO: Cancelado por usuario
    -- RECHAZADO: Cliente rechazó
    -- VENCIDO: Pasó fecha_validez sin respuesta

    -- Items (JSON)
    items JSONB NOT NULL DEFAULT '[]',
    -- Formato: [{
    --   productoId, descripcion, cantidad,
    --   precioUnitario, subtotal, alicuotaIva, importeIva, total
    -- }]

    -- Totales
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_impuestos DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    moneda VARCHAR(3) DEFAULT 'ARS',

    -- NUEVA SECCIÓN: Facturación Recurrente
    tipo_facturacion VARCHAR(20) DEFAULT 'OCASIONAL',
    -- Tipos posibles:
    -- OCASIONAL: Se factura UNA VEZ (default)
    -- RECURRENTE: Se factura periódicamente

    -- Solo para tipo_facturacion = 'RECURRENTE'
    frecuencia_facturacion VARCHAR(20),
    -- MONTHLY, QUARTERLY, YEARLY

    proximo_periodo_facturacion DATE,
    -- Próxima fecha en que debe generarse factura

    ultimo_periodo_facturado DATE,
    -- Última fecha en que se generó factura

    cantidad_facturas_generadas INTEGER DEFAULT 0,
    -- Contador de cuántas facturas se generaron

    -- Relación con facturas
    facturas_generadas JSONB DEFAULT '[]',
    -- Array de IDs de facturas generadas
    -- Formato: [{ factura_id, periodo, fecha }]

    -- Metadata
    observaciones TEXT,
    metadata JSONB DEFAULT '{}',

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    accepted_at TIMESTAMP,
    accepted_by VARCHAR(200),

    UNIQUE(company_id, codigo_presupuesto)
);

-- Índices
CREATE INDEX idx_presupuestos_company ON siac_presupuestos(company_id);
CREATE INDEX idx_presupuestos_cliente ON siac_presupuestos(cliente_id);
CREATE INDEX idx_presupuestos_estado ON siac_presupuestos(estado);
CREATE INDEX idx_presupuestos_tipo ON siac_presupuestos(tipo_facturacion);
CREATE INDEX idx_presupuestos_proximo_periodo ON siac_presupuestos(proximo_periodo_facturacion);

-- Trigger
CREATE TRIGGER update_siac_presupuestos_updated_at
    BEFORE UPDATE ON siac_presupuestos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 💻 SERVICIO UNIFICADO: UnifiedInvoiceService

```javascript
// src/services/billing/UnifiedInvoiceService.js

const { Factura, FacturaItem } = require('../../models/siac/FacturacionModels');
const ContractBillingService = require('./ContractBillingService');

class UnifiedInvoiceService {
  /**
   * MODO 1: Crear factura manual (sin presupuesto)
   */
  async createManualInvoice(companyId, invoiceData, mode = 'CLIENT_BUSINESS') {
    const {
      cliente,
      items,
      observaciones
    } = invoiceData;

    // Calcular totales
    const { subtotal, totalIva, total } = this.calculateTotals(items);

    // Crear factura SIAC
    const factura = await Factura.create({
      cajaId: await this.getCajaId(companyId, mode),
      tipoComprobanteId: await this.getTipoComprobanteId(cliente.condicionIva),

      // Cliente
      clienteId: cliente.id,
      clienteRazonSocial: cliente.razonSocial,
      clienteDocumentoNumero: cliente.documento,
      clienteEmail: cliente.email,
      clienteCondicionIva: cliente.condicionIva || 'CONSUMIDOR_FINAL',

      // Totales
      subtotal,
      totalIva,
      total,

      observaciones,

      // Metadata
      metadata: {
        billing_mode: mode,
        invoice_type: 'MANUAL',
        source: null
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

    console.log(`✅ [MANUAL INVOICE] Factura manual creada: ${factura.numeroCompleto}`);

    return factura;
  }

  /**
   * MODO 2: Crear factura desde presupuesto OCASIONAL (1 vez)
   */
  async createInvoiceFromOnetimeQuote(quoteId) {
    // Obtener presupuesto
    const quote = await sequelize.query(`
      SELECT * FROM siac_presupuestos
      WHERE id = :quoteId
        AND tipo_facturacion = 'OCASIONAL'
        AND estado = 'ACEPTADO'
    `, {
      replacements: { quoteId },
      type: sequelize.QueryTypes.SELECT
    });

    if (!quote || quote.length === 0) {
      throw new Error('Presupuesto no encontrado o no puede facturarse');
    }

    const presupuesto = quote[0];
    const items = JSON.parse(presupuesto.items);

    // Crear factura
    const factura = await Factura.create({
      cajaId: await this.getCajaId(presupuesto.company_id, 'CLIENT_BUSINESS'),
      tipoComprobanteId: 1, // TODO: según condición IVA

      // Cliente
      clienteId: presupuesto.cliente_id,
      clienteRazonSocial: presupuesto.cliente_razon_social,
      clienteDocumentoNumero: presupuesto.cliente_documento,
      clienteEmail: presupuesto.cliente_email,

      // Totales (del presupuesto)
      subtotal: presupuesto.subtotal,
      totalIva: presupuesto.total_impuestos,
      total: presupuesto.total,

      observaciones: `Factura desde presupuesto ${presupuesto.codigo_presupuesto}`,

      // Metadata
      metadata: {
        billing_mode: 'CLIENT_BUSINESS',
        invoice_type: 'QUOTE_ONETIME',
        source_quote_id: presupuesto.id,
        source_quote_code: presupuesto.codigo_presupuesto
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

    // Actualizar presupuesto
    await sequelize.query(`
      UPDATE siac_presupuestos
      SET estado = 'FACTURADO',
          facturas_generadas = jsonb_build_array(
            jsonb_build_object(
              'factura_id', :facturaId,
              'periodo', 'UNICO',
              'fecha', CURRENT_DATE
            )
          ),
          cantidad_facturas_generadas = 1
      WHERE id = :quoteId
    `, {
      replacements: {
        facturaId: factura.id,
        quoteId: presupuesto.id
      }
    });

    console.log(`✅ [ONETIME QUOTE] Factura creada desde presupuesto: ${factura.numeroCompleto}`);

    return factura;
  }

  /**
   * MODO 3: Facturación recurrente (CRON JOB)
   * Procesa tanto contratos Aponnt como presupuestos empresas
   */
  async processRecurringBilling() {
    console.log('📋 [RECURRING BILLING] Procesando facturación recurrente...');

    const results = {
      aponnt: { success: [], failed: [] },
      clients: { success: [], failed: [] }
    };

    // 1. Contratos Aponnt (mode APONNT_INTERNAL)
    const contractService = new ContractBillingService();

    const contracts = await Contract.findAll({
      where: {
        status: 'ACTIVE',
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

    for (const contract of contracts) {
      try {
        const invoice = await contractService.generateInvoiceFromContract(
          contract.id,
          new Date().toISOString().slice(0, 7)
        );

        await contract.update({ last_billing_date: new Date() });

        results.aponnt.success.push({
          contractId: contract.id,
          invoiceId: invoice.id
        });

      } catch (error) {
        console.error(`❌ Error facturando contrato ${contract.id}:`, error);
        results.aponnt.failed.push({
          contractId: contract.id,
          error: error.message
        });
      }
    }

    // 2. Presupuestos recurrentes de empresas
    const quotes = await sequelize.query(`
      SELECT *
      FROM siac_presupuestos
      WHERE tipo_facturacion = 'RECURRENTE'
        AND estado = 'ACTIVO'
        AND proximo_periodo_facturacion <= CURRENT_DATE
        AND (fecha_fin_servicio IS NULL OR fecha_fin_servicio >= CURRENT_DATE)
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    for (const quote of quotes) {
      try {
        const invoice = await this.createInvoiceFromRecurringQuote(quote);

        // Calcular próximo período
        const nextPeriod = this.calculateNextPeriod(
          quote.proximo_periodo_facturacion,
          quote.frecuencia_facturacion
        );

        // Actualizar presupuesto
        await sequelize.query(`
          UPDATE siac_presupuestos
          SET ultimo_periodo_facturado = CURRENT_DATE,
              proximo_periodo_facturacion = :nextPeriod,
              cantidad_facturas_generadas = cantidad_facturas_generadas + 1,
              facturas_generadas = facturas_generadas || jsonb_build_array(
                jsonb_build_object(
                  'factura_id', :facturaId,
                  'periodo', :periodo,
                  'fecha', CURRENT_DATE
                )
              ),
              estado = CASE
                WHEN :nextPeriod > fecha_fin_servicio THEN 'FINALIZADO'
                ELSE 'ACTIVO'
              END
          WHERE id = :quoteId
        `, {
          replacements: {
            nextPeriod,
            facturaId: invoice.id,
            periodo: new Date().toISOString().slice(0, 7),
            quoteId: quote.id
          }
        });

        results.clients.success.push({
          quoteId: quote.id,
          invoiceId: invoice.id
        });

      } catch (error) {
        console.error(`❌ Error facturando presupuesto ${quote.id}:`, error);
        results.clients.failed.push({
          quoteId: quote.id,
          error: error.message
        });
      }
    }

    console.log(`✅ [RECURRING BILLING] Completado`);
    console.log(`   Aponnt: ${results.aponnt.success.length} exitosos, ${results.aponnt.failed.length} fallidos`);
    console.log(`   Clientes: ${results.clients.success.length} exitosos, ${results.clients.failed.length} fallidos`);

    return results;
  }

  /**
   * Crear factura desde presupuesto RECURRENTE
   */
  async createInvoiceFromRecurringQuote(quote) {
    const items = JSON.parse(quote.items);

    const factura = await Factura.create({
      cajaId: await this.getCajaId(quote.company_id, 'CLIENT_BUSINESS'),
      tipoComprobanteId: 1,

      clienteId: quote.cliente_id,
      clienteRazonSocial: quote.cliente_razon_social,
      clienteDocumentoNumero: quote.cliente_documento,
      clienteEmail: quote.cliente_email,

      subtotal: quote.subtotal,
      totalIva: quote.total_impuestos,
      total: quote.total,

      observaciones: `Factura mensual - Presupuesto ${quote.codigo_presupuesto}`,

      metadata: {
        billing_mode: 'CLIENT_BUSINESS',
        invoice_type: 'QUOTE_RECURRING',
        source_quote_id: quote.id,
        source_quote_code: quote.codigo_presupuesto,
        billing_period: new Date().toISOString().slice(0, 7)
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

    console.log(`✅ [RECURRING QUOTE] Factura recurrente creada: ${factura.numeroCompleto}`);

    return factura;
  }

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

  calculateTotals(items) {
    let subtotal = 0;
    let totalIva = 0;

    for (const item of items) {
      subtotal += item.subtotal;
      totalIva += item.importeIva;
    }

    return {
      subtotal,
      totalIva,
      total: subtotal + totalIva
    };
  }

  async getCajaId(companyId, mode) {
    // TODO: Implementar lógica de cajas por empresa/modo
    return 1;
  }

  async getTipoComprobanteId(condicionIva) {
    // TODO: Implementar según condición IVA
    return 1;
  }
}

module.exports = UnifiedInvoiceService;
```

---

## 🎨 FRONTEND: Pantalla con 3 Botones

```javascript
// public/js/modules/unified-invoicing.js

renderActions() {
  return `
    <div class="invoicing-actions">
      <!-- Botón 1: Factura Manual -->
      <button onclick="invoicing.openManualInvoice()" class="btn-primary">
        📝 Nueva Factura Manual
      </button>

      <!-- Botón 2: Desde Presupuesto Ocasional -->
      <button onclick="invoicing.openQuotesList('OCASIONAL')" class="btn-secondary">
        📋 Facturar Presupuesto (1 vez)
      </button>

      <!-- Botón 3: Gestionar Recurrentes -->
      <button onclick="invoicing.openQuotesList('RECURRENTE')" class="btn-info">
        🔄 Gestionar Presupuestos Recurrentes
      </button>

      ${this.mode === 'aponnt' ? `
        <!-- Botón especial Aponnt: Facturación masiva -->
        <button onclick="invoicing.generateMonthlyInvoices()" class="btn-success">
          🤖 Generar Facturas Mensuales (Todas las Empresas)
        </button>
      ` : ''}
    </div>
  `;
}
```

---

## ✅ RESUMEN: 3 Modos de Facturación

| Modo | Trigger | Frecuencia | Cierre | Uso |
|------|---------|------------|--------|-----|
| **MANUAL** | Usuario crea factura | N/A | Inmediato | Ventas directas, ad-hoc |
| **OCASIONAL** | Usuario factura presupuesto | 1 vez | Después de facturar | Proyectos one-time |
| **RECURRENTE** | Cron job automático | Mensual/Trimestral/Anual | Al llegar fecha_fin | Servicios mensuales |

---

**¿Arranco con la implementación de las tablas? 🚀**
