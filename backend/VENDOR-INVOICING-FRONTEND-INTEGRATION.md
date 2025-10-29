# 📋 SISTEMA DE VENDEDORES, FACTURACIÓN Y SCORING - Integración Frontend COMPLETA

## ✅ RESUMEN EJECUTIVO

Se ha implementado la integración frontend COMPLETA del sistema de vendedores, facturación, pagos, comisiones, scoring de partners y subastas automáticas de paquetes de soporte.

---

## 🎨 FRONT

END IMPLEMENTADO

### 1. ✅ PESTAÑA VENDEDORES - 6 Sub-Tabs

#### 📋 **Sub-Tab 1: Lista de Vendedores**
- Grid con todos los vendedores
- **Funcionalidad existente** mantenida

#### 📋 **Sub-Tab 2: Presupuestos/Cotizaciones**
**Tabla con columnas:**
- Nº Presupuesto
- Empresa
- Vendedor
- Fecha Emisión
- Válido Hasta
- Total
- Estado (draft, sent, accepted, rejected, expired)
- Acciones (Ver, Editar, PDF, Email)

**Filtros:**
- Por estado
- Por mes

**Acciones:**
- Botón "Generar Presupuesto"

#### 📜 **Sub-Tab 3: Contratos**
**Tabla con columnas:**
- Nº Contrato
- Empresa
- País
- Fecha Inicio
- Fecha Fin
- Monto Mensual
- Estado (pending_signature, active, expired, cancelled)
- Acciones

**Filtros:**
- Por estado
- Por país

#### 📄 **Sub-Tab 4: Facturas**
**Tabla con columnas:**
- Nº Factura
- Empresa
- Fecha Emisión
- Vencimiento
- Total
- Pagado
- Saldo
- Estado (pending, paid, overdue, cancelled)
- Acciones (Ver, PDF, Marcar Pagada)

**Filtros:**
- Por estado
- Por mes

#### 💳 **Sub-Tab 5: Pagos**
**Tabla con columnas:**
- ID
- Fecha
- Empresa
- Factura
- Monto
- Método (transferencia, efectivo, cheque, tarjeta)
- Referencia
- Comprobante (link/download)
- Estado

**Filtros:**
- Por método de pago
- Por mes

**Funcionalidad:**
- Upload de comprobante de pago
- Al registrar pago → activa empresa automáticamente
- Al registrar pago → genera comisiones triple-nivel

#### 💰 **Sub-Tab 6: Comisiones**
**Tabla con columnas:**
- Checkbox (selección múltiple)
- ID
- Fecha
- Partner
- Tipo (sale, support, leader)
- Empresa
- Monto
- Estado (pending, approved, paid)
- Acciones

**Filtros:**
- Por tipo de comisión
- Por estado

**Acciones:**
- Botón "Marcar como Pagadas" (batch operation)

---

### 2. ✅ PESTAÑA ASOCIADOS (PARTNERS) - 5 Sub-Tabs

#### 👥 **Sub-Tab 1: Lista de Partners**
- Grid con todos los partners
- **Funcionalidad existente** mantenida
- **NUEVO:** Checkbox "Acepta Subastas" (campo: `acepta_subastas`)

#### ⭐ **Sub-Tab 2: Scoring Dashboard**
**Tabla con columnas:**
- Partner
- **Score Total** (0-5)
- ⭐ Rating Clientes (40%) - con desglose
- ⏱️ Tiempo Respuesta (20%) - con desglose
- ✅ Resolución (20%) - con desglose
- 💼 Ventas (10%) - con desglose
- 📅 Antigüedad (10%) - con desglose
- Estado (excellent, good, medium, low, critical)
- Última Actualización

**Filtros:**
- Por rango de score
  - Excelente (≥ 4.5)
  - Bueno (3.5 - 4.5)
  - Medio (2.5 - 3.5)
  - Bajo (2.0 - 2.5)
  - Crítico (< 2.0)

**Acciones:**
- Botón "Calcular Scoring" (ejecuta CRON manualmente)
- Botón "Partners Bajo Scoring" (filtro rápido)
- Botón "Exportar Reporte"

#### 📦 **Sub-Tab 3: Paquetes de Soporte**
**Tabla con columnas:**
- ID
- Empresa
- Partner Actual
- Partner Original
- Vendedor
- Rating Actual (0-5)
- Comisión Mensual (%)
- Monto Estimado
- Estado (active, lost, in_auction)
- Acciones (Ver detalles, Transferir, Marcar como perdido)

**Filtros:**
- Por estado
- Por rating (low < 2.0, medium 2.0-3.5, high > 3.5)

#### 🔨 **Sub-Tab 4: Subastas Automáticas**

**⚠️ IMPORTANTE - GENERACIÓN AUTOMÁTICA:**
```
Las subastas NO se crean manualmente.
Se generan AUTOMÁTICAMENTE cuando un partner alcanza < 2.0 ⭐ de valoración.

FLUJO AUTOMÁTICO:
1. Partner llega a < 2.0 estrellas → Trigger automático
2. Sistema crea subasta del paquete de soporte (duración: 7 días)
3. Notificación MASIVA a todos los partners con acepta_subastas = true
4. Partners ofertan con comisión más baja
5. Al finalizar → Paquete se transfiere al ganador
```

**Tabla con columnas:**
- ID
- **Información del Paquete** (expandible con todos los datos)
- Empresa (nombre completo)
- Empleados (contratados / máx)
- **Módulos Contratados** (lista completa con precios)
- Partner Actual
- Rating Actual
- Razón (ej: "Scoring bajo: 1.8 estrellas")
- Comisión Inicial (%)
- Mejor Oferta (%)
- Cantidad de Ofertas
- Tiempo Restante (countdown timer)
- Estado (active, completed, cancelled)
- Acciones (Ver detalles, Hacer oferta)

**Filtros:**
- Por estado

**Info Box:**
> ℹ️ **Generación Automática:** Las subastas se crean automáticamente cuando un partner alcanza **< 2.0 ⭐** de valoración.
> Todos los partners con *"Acepta Subastas"* activado reciben notificación instantánea.

#### ⭐ **Sub-Tab 5: Valoraciones**
**Tabla con columnas:**
- ID
- Fecha
- Partner
- Empresa
- Rating (1-5 estrellas)
- Categoría (soporte, venta, técnico)
- Comentarios
- Valorado por

**Filtros:**
- Por cantidad de estrellas
- Por mes

---

## 🎨 ESTILOS CSS IMPLEMENTADOS

### Nuevas Clases CSS (314 líneas agregadas)

```css
/* Secondary Tabs */
.nav-tabs-secondary - Tabs internos con gradientes
.nav-tab-secondary - Botones de tabs secundarios
.nav-tab-secondary.active - Tab activo con sombra

/* Subtab Content */
.vendor-subtab-content - Contenido de vendor tabs
.partner-subtab-content - Contenido de partner tabs
.vendor-subtab-content.active - Con animación fadeIn
.partner-subtab-content.active - Con animación fadeIn

/* Data Tables */
.data-table - Tablas profesionales
.data-table thead - Header con gradiente
.data-table tbody tr:hover - Efecto hover

/* Status Badges */
.status-badge.pending - Amarillo (fff3cd)
.status-badge.paid - Verde (d4edda)
.status-badge.overdue - Rojo (f8d7da)
.status-badge.cancelled - Gris (e2e3e5)
.status-badge.active - Azul (d1ecf1)
.status-badge.draft - Gris claro
.status-badge.sent - Azul claro
.status-badge.accepted - Verde
.status-badge.rejected - Rojo
.status-badge.expired - Rojo

/* Score Badges */
.score-badge.excellent - Verde (≥ 4.5)
.score-badge.good - Azul (3.5 - 4.5)
.score-badge.medium - Amarillo (2.5 - 3.5)
.score-badge.low - Rojo claro (2.0 - 2.5)
.score-badge.critical - Rojo oscuro (< 2.0)

/* Commission Type Badges */
.commission-type.sale - Verde
.commission-type.support - Azul
.commission-type.leader - Amarillo

/* Action Buttons */
.btn-action.btn-view - Azul
.btn-action.btn-edit - Amarillo
.btn-action.btn-delete - Rojo
.btn-action.btn-download - Verde

/* Auction Timer */
.auction-timer - Timer con padding
.auction-timer.ending-soon - Animación pulse (< 24h)

/* Star Rating */
.star-rating - Estrellas amarillas (#ffc107)
```

---

## 🔧 BACKEND YA IMPLEMENTADO (Sesión Anterior)

### Servicios Completos
1. **PaymentService.js** (465 líneas)
2. **CommissionCalculationService.js** (307 líneas)
3. **InvoiceGenerationService.js** (340+ líneas)
4. **ScoringCalculationService.js** (528 líneas)
5. **SupportPackageService.js** (423 líneas)

### CRON Jobs Activos
```javascript
// 1. Generación mensual de facturas - Día 1, 00:05 AM
cron.schedule('5 0 1 * *', async () => {
  await InvoiceGenerationService.generateMonthlyInvoices(year, month);
});

// 2. Cálculo diario de scoring - 02:00 AM
cron.schedule('0 2 * * *', async () => {
  await ScoringCalculationService.calculateAllScores();
  // → Si score < 2.0 → Crea subasta automáticamente
});

// 3. Marcado de facturas vencidas - 03:00 AM
cron.schedule('0 3 * * *', async () => {
  await InvoiceGenerationService.markOverdueInvoices();
});
```

### API Endpoints
```
POST   /api/vendor-automation/payments
GET    /api/vendor-automation/payments
GET    /api/vendor-automation/invoices
POST   /api/vendor-automation/invoices/generate
GET    /api/vendor-automation/commissions
POST   /api/vendor-automation/commissions/:id/mark-paid

// Nuevos endpoints necesarios para frontend
GET    /api/vendor-automation/quotes
POST   /api/vendor-automation/quotes
GET    /api/vendor-automation/contracts
POST   /api/vendor-automation/contracts

GET    /api/partner-scoring/scores
POST   /api/partner-scoring/calculate
GET    /api/partner-scoring/support-packages
GET    /api/partner-scoring/auctions
POST   /api/partner-scoring/auctions/:id/bid
GET    /api/partner-scoring/ratings
```

### Base de Datos - 7 Tablas
1. `invoices` - Facturas mensuales
2. `invoice_items` - Items de facturas
3. `payments` - Registro de pagos
4. `commissions` - Triple-nivel (sale/support/leader)
5. `support_packages` - Paquetes de soporte
6. `support_package_auctions` - Subastas automáticas
7. `partner_ratings` - Valoraciones de clientes

---

## ⚠️ CAMPO FALTANTE EN BD

### Migración Necesaria:

```sql
-- Archivo: migrations/20251024_add_acepta_subastas_to_partners.sql

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS acepta_subastas BOOLEAN DEFAULT false;

COMMENT ON COLUMN partners.acepta_subastas IS
'Indica si el partner desea recibir notificaciones de subastas automáticas cuando un paquete de soporte entra en subasta por bajo scoring';

-- Actualizar partners existentes
UPDATE partners
SET acepta_subastas = false
WHERE acepta_subastas IS NULL;
```

---

## 📊 INFORMACIÓN DEL PAQUETE EN SUBASTAS

**Datos que debe mostrar cada fila de subasta:**

```javascript
{
  auction_id: 123,
  support_package_id: 456,

  // Información de la Empresa
  company_name: "ACME Corp",
  company_slug: "acme-corp",
  company_tax_id: "30-12345678-9",
  company_address: "Av. Corrientes 1234, CABA",

  // Empleados
  contracted_employees: 150,
  max_employees: 200,

  // Módulos Contratados (array completo)
  active_modules: [
    { key: "usuarios", name: "Usuarios", price: 1500.00 },
    { key: "asistencia", name: "Asistencia", price: 2000.00 },
    { key: "reportes", name: "Reportes", price: 800.00 }
  ],

  // Partners
  current_support_partner_name: "Juan Pérez",
  current_support_partner_email: "juan@example.com",
  current_rating: 1.8,

  original_support_partner_name: "María González",

  seller_partner_name: "Carlos Rodríguez",

  // Comisiones
  initial_commission_rate: 15.00, // % mensual
  estimated_monthly_amount: 5000.00, // Estimado de facturación mensual
  commission_from_attendance: 1200.00, // Comisión generada por asistencia

  // Subasta
  auction_reason: "Scoring bajo: 1.8 estrellas",
  auction_start_date: "2025-01-20T00:00:00Z",
  auction_end_date: "2025-01-27T00:00:00Z",
  current_best_bid: 12.00, // % (mejor oferta actual)
  total_bids: 5,
  auction_status: "active",

  // Tiempo
  time_remaining: "2 días, 14 horas" // Calculado dinámicamente
}
```

---

## 📱 JAVASCRIPT PENDIENTE (PRÓXIMA TAREA)

### Funciones a Implementar

```javascript
// ===== VENDOR TAB FUNCTIONS =====

// Sub-tab switching
function switchVendorSubTab(tabId) { /* ... */ }

// Quotes
function loadQuotes() { /* fetch + render */ }
function openQuoteGenerator() { /* modal */ }
function generateQuotePDF(quoteId) { /* ... */ }
function sendQuoteByEmail(quoteId) { /* ... */ }

// Contracts
function loadContracts() { /* fetch + render */ }
function viewContract(contractId) { /* modal */ }
function downloadContractPDF(contractId) { /* ... */ }

// Invoices
function loadInvoices() { /* fetch + render */ }
function viewInvoiceDetails(invoiceId) { /* modal con items */ }
function generateMonthlyInvoices() { /* API call */ }

// Payments
function loadPayments() { /* fetch + render */ }
function openPaymentRegisterModal() { /* modal con file upload */ }
function registerPayment(formData) { /* API + activa empresa + genera comisiones */ }
function downloadReceipt(paymentId) { /* ... */ }

// Commissions
function loadCommissions() { /* fetch + render */ }
function toggleAllCommissions() { /* checkbox select all */ }
function markSelectedCommissionsAsPaid() { /* batch update */ }

// ===== PARTNER TAB FUNCTIONS =====

// Sub-tab switching
function switchPartnerSubTab(tabId) { /* ... */ }

// Scoring
function loadScoringDashboard() { /* fetch + render con desglose */ }
function calculateAllScoring() { /* ejecuta CRON manualmente */ }
function viewLowScorePartners() { /* filtro rápido */ }
function exportScoringReport() { /* Excel/PDF */ }

// Support Packages
function loadSupportPackages() { /* fetch + render */ }
function viewPackageDetails(packageId) { /* modal con info completa */ }
function transferPackage(packageId) { /* modal + API */ }
function markPackageAsLost(packageId) { /* confirmación + API */ }

// Auctions
function loadAuctions() { /* fetch + render CON TODA LA INFO */ }
function viewAuctionDetails(auctionId) {
  /* Modal mostrando:
     - Info completa empresa
     - Empleados
     - Módulos contratados (tabla)
     - Partners (actual/original/vendedor)
     - Comisiones
     - Historial de ofertas
     - Countdown timer
  */
}
function placeBid(auctionId) {
  /* Modal para ingresar % de comisión (debe ser < current_best_bid) */
}
function showAuctionHelp() {
  /* Modal explicando el flujo automático */
}

// Ratings
function loadRatings() { /* fetch + render */ }

// ===== SHARED FUNCTIONS =====

function renderStars(rating) {
  /* Retorna HTML con ⭐⭐⭐⭐⭐ */
}

function getScoreBadgeClass(score) {
  if (score >= 4.5) return 'excellent';
  if (score >= 3.5) return 'good';
  if (score >= 2.5) return 'medium';
  if (score >= 2.0) return 'low';
  return 'critical';
}

function formatCurrency(amount) {
  /* Formato: $1,234.56 */
}

function formatDate(dateString) {
  /* Formato: DD/MM/YYYY */
}

function calculateTimeRemaining(endDate) {
  /* Retorna: "2 días, 14 horas" o "FINALIZADA" */
}
```

---

## 🔔 SISTEMA DE NOTIFICACIONES (PENDIENTE)

### Tipos de Notificaciones

1. **Pago Registrado**
   - Destinatario: Vendedor + Admin
   - Mensaje: "Pago de $X registrado para empresa Y"

2. **Empresa Activada**
   - Destinatario: Vendedor + Soporte
   - Mensaje: "Empresa X activada automáticamente por primer pago"

3. **Comisiones Generadas**
   - Destinatario: Partners (sale/support/leader)
   - Mensaje: "Comisión de $X generada por empresa Y"

4. **Factura Generada**
   - Destinatario: Empresa
   - Mensaje: "Factura N° XXX generada - Vence: DD/MM/YYYY"

5. **Factura Vencida**
   - Destinatario: Empresa + Vendedor
   - Mensaje: "Factura N° XXX VENCIDA"

6. **⭐ Subasta Creada (CRÍTICA)**
   - Destinatario: **TODOS los partners con acepta_subastas = true**
   - Mensaje: "🔨 Nueva subasta disponible - Empresa X - Comisión inicial: 15%"
   - Datos adjuntos: Toda la info del paquete

7. **Nueva Oferta en Subasta**
   - Destinatario: Partner actual + Oferentes previos
   - Mensaje: "Nueva oferta en subasta de empresa X: 12%"

8. **Subasta Finalizada**
   - Destinatario: Ganador + Perdedor actual
   - Mensaje: "Subasta finalizada - Ganador: Partner X con 10%"

9. **Paquete Transferido**
   - Destinatario: Partner anterior + Partner nuevo
   - Mensaje: "Paquete de soporte de empresa X transferido"

10. **Scoring Bajo Alerta**
    - Destinatario: Partner con score < 2.5
    - Mensaje: "⚠️ Tu scoring es 2.3 - Riesgo de perder paquetes"

---

## 🚀 PRÓXIMOS PASOS

### 1. ✅ Completado
- [x] HTML de pestañas Vendedores (6 sub-tabs)
- [x] HTML de pestañas Partners (5 sub-tabs)
- [x] CSS completo (314 líneas)
- [x] Backend services (5 archivos)
- [x] CRON jobs (3 tareas automatizadas)
- [x] Modelos BD (7 tablas)

### 2. 🔄 En Progreso
- [ ] JavaScript para Vendor tabs
- [ ] JavaScript para Partner tabs
- [ ] Modals HTML (Payment, Quotes, Contracts, Auctions)

### 3. ⏳ Pendiente
- [ ] Migración `acepta_subastas` field
- [ ] Sistema de notificaciones unificado
- [ ] Testing completo del flujo
- [ ] Documentación de usuario final

---

## 📝 NOTAS IMPORTANTES

1. **Subastas NO se crean manualmente** - Solo automáticas por scoring < 2.0
2. **Notificación masiva** a partners con `acepta_subastas = true`
3. **Información completa del paquete** debe mostrarse en tabla de subastas
4. **Timer countdown** debe actualizarse en tiempo real
5. **Triple-nivel de comisiones** al registrar pago
6. **Activación automática** de empresa al primer pago

---

## 🎯 OBJETIVO FINAL

Tener un sistema completamente funcional donde:
1. Vendedor registra pago → Empresa se activa + Comisiones generadas
2. CRON calcula scoring diario
3. Si partner < 2.0 ⭐ → Subasta automática
4. Partners reciben notificación
5. Partners ofertan
6. Al finalizar → Transferencia automática
7. Todo visible y gestionable desde el panel administrativo

---

**Archivo:** `VENDOR-INVOICING-FRONTEND-INTEGRATION.md`
**Fecha:** 2025-01-24
**Estado:** Frontend UI Completo - JavaScript Pendiente
