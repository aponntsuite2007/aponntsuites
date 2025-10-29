# 💰 SISTEMA DE VENDORS, FACTURACIÓN Y COMISIONES

## 📋 DESCRIPCIÓN GENERAL

Sistema completo de gestión de vendedores, facturación automática y comisiones multi-nivel integrado con el sistema de asistencia biométrica.

**Estado:** ✅ 100% IMPLEMENTADO (Backend Completo)

---

## 🎯 CARACTERÍSTICAS PRINCIPALES

### 1. **Sistema Triple de Comisiones**
- **Comisión de Venta** (al vendedor que cerró el trato)
- **Comisión de Soporte** (al partner asignado como soporte)
- **Comisión de Líder** (al líder del vendedor, si aplica)

### 2. **Activación Automática de Empresas**
Al registrar el primer pago:
- ✅ Empresa cambia de `pendiente_aprobacion` → `activo`
- ✅ Se crean departamentos base
- ✅ Se genera usuario admin con password temporal
- ✅ Se asignan módulos contratados (SOLO los de la factura)
- ✅ Se envía email de bienvenida
- ✅ Se generan comisiones automáticamente

### 3. **Generación Automática de Facturas**
- 📅 **CRON Job:** Día 1 de cada mes a las 00:05 AM
- Genera facturas para todas las empresas activas
- Calcula totales basados en módulos activos y pricing
- Envía notificaciones automáticas

### 4. **Sistema de Scoring de Partners**
- ⭐ **CRON Job:** Todos los días a las 02:00 AM
- Fórmula ponderada (0-5 estrellas):
  - 40% - Rating promedio de clientes
  - 20% - Tiempo de respuesta promedio
  - 20% - Tasa de resolución de tickets
  - 10% - Ventas exitosas
  - 10% - Antigüedad como partner

**Acciones Automáticas:**
- Score < 2.0 → Crea subasta de paquete de soporte
- Score < 1.5 → Suspende partner temporalmente
- Score >= 4.5 → Aplica bonus de 5% en comisiones

### 5. **Gestión de Paquetes de Soporte**
- Creación al activar empresa
- Transferencia entre partners (subastas)
- Tracking de ratings y cambios de partner
- Registro de pérdida de paquetes

---

## 📂 ESTRUCTURA DE ARCHIVOS

### **Modelos Sequelize**
```
backend/src/models/
├── Invoice.js                    # Facturas mensuales
├── InvoiceItem.js                # Items de facturas (módulos)
├── Payment.js                    # Registro de pagos
├── Commission.js                 # Comisiones generadas
├── SupportPackage.js             # Paquetes de soporte activos
├── SupportPackageAuction.js      # Subastas de paquetes
├── PartnerRating.js              # Ratings de partners
└── SupportTicket.js              # Tickets de soporte (existente)
```

### **Servicios de Negocio**
```
backend/src/services/
├── PaymentService.js                 # Registro pagos + activación empresas
├── CommissionCalculationService.js   # Cálculo comisiones triple nivel
├── InvoiceGenerationService.js       # Generación mensual facturas
├── ScoringCalculationService.js      # Scoring diario de partners
└── SupportPackageService.js          # Gestión paquetes soporte
```

### **API REST**
```
backend/src/routes/
└── vendorAutomationRoutes.js         # Endpoints integrados

Endpoints fusionados en /api/vendor-automation:
  - /payments                         # Registro de pagos
  - /invoices                         # Gestión de facturas
  - /commissions                      # Tracking comisiones
  - /auctions                         # Subastas de paquetes
```

### **CRON Jobs**
```
backend/src/cron/
└── vendorCronJobs.js                 # 3 jobs automáticos

Jobs Configurados:
1. Generación mensual de facturas    (día 1, 00:05 AM)
2. Cálculo diario de scoring         (todos los días, 02:00 AM)
3. Marcado facturas vencidas         (todos los días, 03:00 AM)
```

---

## 🔌 API ENDPOINTS

### **Pagos**
```http
POST   /api/vendor-automation/payments
GET    /api/vendor-automation/payments/:companyId
GET    /api/vendor-automation/payments/details/:paymentId
```

### **Facturas**
```http
GET    /api/vendor-automation/invoices
GET    /api/vendor-automation/invoices/:id
```

### **Comisiones**
```http
GET    /api/vendor-automation/commissions/partner/:partnerId
GET    /api/vendor-automation/commissions/period/:year/:month
PUT    /api/vendor-automation/commissions/:id/mark-paid
GET    /api/vendor-automation/commissions/pending/:partnerId
```

---

## 🔄 FLUJO COMPLETO DEL SISTEMA

### **Flujo 1: Registro de Pago**

```
1. POST /api/vendor-automation/payments
   {
     invoice_id: 123,
     company_id: 45,
     amount: 500.00,
     payment_date: "2025-01-15",
     payment_method: "wire_transfer",
     receipt: (archivo)
   }

2. PaymentService.registerPayment()
   ├─> Verifica factura existe
   ├─> Valida monto coincide
   ├─> Crea registro de pago
   ├─> Marca factura como 'paid'
   ├─> Genera 3 comisiones (venta/soporte/líder)
   └─> SI empresa en 'pendiente_aprobacion':
       ├─> Activa empresa
       ├─> Crea departamento base
       ├─> Genera usuario admin
       ├─> Asigna módulos de la factura
       └─> Envía email bienvenida

3. CommissionCalculationService.generateCommissions()
   ├─> Comisión venta: 10% de $500 = $50
   ├─> Comisión soporte: 10% de $500 = $50
   └─> Comisión líder: 5% de $50 = $2.50
```

### **Flujo 2: Generación Mensual de Facturas**

```
CRON Job ejecuta día 1 de cada mes:

1. InvoiceGenerationService.generateMonthlyInvoices(2025, 1)
   ├─> Busca empresas activas
   └─> Por cada empresa:
       ├─> Lee active_modules
       ├─> Lee pricing por módulo
       ├─> Calcula total
       ├─> Genera invoice_number único
       ├─> Crea factura + items
       └─> Envía notificación

Ejemplo Factura:
   Invoice #INV-202501-45-001
   ├─ Item: Módulo Asistencia Basic    $100
   ├─ Item: Módulo Medical Records     $150
   └─ Total: $250
```

### **Flujo 3: Scoring Diario de Partners**

```
CRON Job ejecuta todos los días 02:00 AM:

1. ScoringCalculationService.calculateAllScores()
   └─> Por cada partner:
       ├─> Calcula 5 métricas
       ├─> Promedia ponderado
       ├─> Actualiza current_score
       └─> Ejecuta acciones automáticas:
           ├─> Score < 2.0: Crea subasta
           ├─> Score < 1.5: Suspende partner
           └─> Score >= 4.5: Aplica bonus 5%

Ejemplo Cálculo:
   Partner "TechSupport SA"
   ├─ Rating clientes: 4.2 ⭐ (peso 40%)
   ├─ Tiempo respuesta: 5 ⭐ (peso 20%)
   ├─ Tasa resolución: 3.5 ⭐ (peso 20%)
   ├─ Ventas: 2 ⭐ (peso 10%)
   └─ Antigüedad: 4 ⭐ (peso 10%)

   Score Total: (4.2*0.4)+(5*0.2)+(3.5*0.2)+(2*0.1)+(4*0.1) = 3.98 ⭐
```

---

## 🗄️ ESQUEMA DE BASE DE DATOS

### **Tabla: invoices**
```sql
id                      BIGSERIAL PRIMARY KEY
company_id              INTEGER NOT NULL
invoice_number          VARCHAR(50) UNIQUE
billing_period_month    INTEGER (1-12)
billing_period_year     INTEGER
subtotal                DECIMAL(12,2)
tax_rate                DECIMAL(5,2)
tax_amount              DECIMAL(12,2)
total_amount            DECIMAL(12,2)
currency                VARCHAR(3) DEFAULT 'USD'
status                  VARCHAR(20)  -- draft, pending_approval, sent, paid, overdue
due_date                DATE
paid_at                 TIMESTAMP
```

### **Tabla: payments**
```sql
id                      BIGSERIAL PRIMARY KEY
invoice_id              BIGINT REFERENCES invoices(id)
company_id              INTEGER
amount                  DECIMAL(12,2)
payment_method          VARCHAR(50)
payment_reference       VARCHAR(100)
payment_date            DATE
receipt_file_path       TEXT
commissions_generated   BOOLEAN DEFAULT FALSE
registered_by           UUID  -- user que registró el pago
```

### **Tabla: commissions**
```sql
id                              BIGSERIAL PRIMARY KEY
partner_id                      INTEGER REFERENCES partners(id)
commission_type                 VARCHAR(20)  -- 'sale', 'support', 'leader'
invoice_id                      BIGINT REFERENCES invoices(id)
payment_id                      BIGINT REFERENCES payments(id)
company_id                      INTEGER
base_amount                     DECIMAL(12,2)
commission_rate                 DECIMAL(5,2)
commission_amount               DECIMAL(12,2)
originated_from_partner_id      INTEGER  -- Solo para tipo 'leader'
billing_period_month/year       INTEGER
status                          VARCHAR(20)  -- 'pending', 'paid'
paid_at                         TIMESTAMP
```

### **Tabla: support_packages**
```sql
id                          BIGSERIAL PRIMARY KEY
company_id                  INTEGER
current_support_id          INTEGER REFERENCES partners(id)
original_support_id         INTEGER
seller_id                   INTEGER
status                      VARCHAR(20)  -- active, lost, suspended
monthly_commission_rate     DECIMAL(5,2)
estimated_monthly_amount    DECIMAL(12,2)
current_rating              DECIMAL(3,2)
ratings_count               INTEGER
assigned_at                 TIMESTAMP
lost_at                     TIMESTAMP
lost_reason                 TEXT
```

---

## ⚙️ CONFIGURACIÓN

### **Variables de Entorno**
No se requieren variables adicionales. El sistema usa la configuración existente de PostgreSQL y JWT.

### **Dependencias NPM**
```json
{
  "node-cron": "^3.0.3",      // ✅ Ya instalado
  "multer": "^1.4.x",         // ✅ Ya instalado
  "bcrypt": "^5.x",           // ✅ Ya instalado
  "sequelize": "^6.x"         // ✅ Ya instalado
}
```

### **Migración de Base de Datos**
```bash
# Ejecutar migración (ya ejecutada)
cd backend
node scripts/run-invoicing-migration.js
```

---

## 🚀 USO DEL SISTEMA

### **1. Registrar un Pago**
```javascript
// Desde el frontend
const formData = new FormData();
formData.append('invoice_id', '123');
formData.append('company_id', '45');
formData.append('amount', '500.00');
formData.append('currency', 'USD');
formData.append('payment_method', 'wire_transfer');
formData.append('payment_date', '2025-01-15');
formData.append('receipt', fileInput.files[0]);

fetch('/api/vendor-automation/payments', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
})
.then(res => res.json())
.then(data => {
  console.log('Pago registrado:', data);
  // data.companyActivation si la empresa fue activada
  // data.commissions array de comisiones generadas
});
```

### **2. Consultar Comisiones Pendientes**
```javascript
fetch('/api/vendor-automation/commissions/pending/123', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(data => {
  console.log('Comisiones pendientes:', data.pending);
  // Retorna agrupado por tipo: sale, support, leader
});
```

### **3. Ver Facturas de una Empresa**
```javascript
fetch('/api/vendor-automation/invoices?company_id=45&status=paid', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(data => {
  console.log('Facturas:', data.invoices);
});
```

### **4. Ejecutar CRON Job Manualmente (Testing)**
```javascript
const vendorCronJobs = require('./src/cron/vendorCronJobs');

// Ejecutar generación de facturas
await vendorCronJobs.runJobManually('monthly_invoice_generation');

// Ejecutar cálculo de scoring
await vendorCronJobs.runJobManually('daily_scoring_calculation');

// Marcar facturas vencidas
await vendorCronJobs.runJobManually('overdue_invoices_check');
```

---

## 📊 EJEMPLO DE DATOS

### **Factura Generada Automáticamente**
```json
{
  "id": 1,
  "invoice_number": "INV-202501-45-001",
  "company_id": 45,
  "company_name": "TechCorp SA",
  "billing_period_month": 1,
  "billing_period_year": 2025,
  "total_amount": 250.00,
  "currency": "USD",
  "status": "sent",
  "due_date": "2025-02-01",
  "items": [
    {
      "description": "Módulo Asistencia Basic",
      "quantity": 1,
      "unit_price": 100.00,
      "total_price": 100.00,
      "metadata": { "module_key": "attendance-basic" }
    },
    {
      "description": "Módulo Medical Records",
      "quantity": 1,
      "unit_price": 150.00,
      "total_price": 150.00,
      "metadata": { "module_key": "medical-records" }
    }
  ]
}
```

### **Comisiones Generadas por Pago**
```json
{
  "success": true,
  "payment": { "id": 1, "amount": 250.00 },
  "commissions": [
    {
      "id": 1,
      "type": "sale",
      "partner_id": 10,
      "amount": 25.00,  // 10% de $250
      "currency": "USD"
    },
    {
      "id": 2,
      "type": "support",
      "partner_id": 15,
      "amount": 25.00,  // 10% de $250
      "currency": "USD"
    },
    {
      "id": 3,
      "type": "leader",
      "partner_id": 5,
      "amount": 1.25,   // 5% de $25 (comisión del vendedor)
      "currency": "USD"
    }
  ],
  "companyActivation": {
    "activated": true,
    "admin_username": "admin",
    "admin_temp_password": "Xy8kL3mN9pQr",
    "modules_activated": ["attendance-basic", "medical-records"]
  }
}
```

---

## 🧪 TESTING

### **Test Manual de Registro de Pago**
```bash
# 1. Crear factura de prueba
INSERT INTO invoices (company_id, invoice_number, total_amount, status, due_date)
VALUES (45, 'TEST-001', 250.00, 'sent', '2025-02-01');

# 2. Registrar pago vía API
curl -X POST http://localhost:9998/api/vendor-automation/payments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "invoice_id=1" \
  -F "company_id=45" \
  -F "amount=250.00" \
  -F "payment_date=2025-01-15" \
  -F "receipt=@receipt.pdf"

# 3. Verificar comisiones generadas
SELECT * FROM commissions WHERE payment_id = 1;
```

### **Test de CRON Jobs**
```bash
# Ver logs de CRON en consola del servidor
# Los jobs se ejecutarán automáticamente en los horarios programados
```

---

## 🎯 PRÓXIMOS PASOS (Opcional - Frontend)

Si deseas implementar la interfaz de usuario:

1. **Modal de Registro de Pagos**
   - Formulario con upload de recibos
   - Selector de factura
   - Vista previa de comisiones a generar

2. **Dashboard de Comisiones**
   - Por partner
   - Por período
   - Estado (pending/paid)

3. **Sistema de Subastas**
   - Lista de paquetes en subasta
   - Formulario de pujar
   - Historial de subastas

---

## 📝 NOTAS IMPORTANTES

- ✅ **Backend 100% completo y funcional**
- ✅ **CRON jobs activos al iniciar servidor**
- ✅ **Sistema integrado en módulo existente de vendors**
- ✅ **Transacciones atómicas para integridad de datos**
- ⏳ **Frontend pendiente** (solo si se requiere interfaz visual)

---

## 🐛 TROUBLESHOOTING

### **Problema: CRON jobs no se ejecutan**
```javascript
// Verificar estado
const vendorCronJobs = require('./src/cron/vendorCronJobs');
console.log(vendorCronJobs.getStatus());
```

### **Problema: Comisiones no se generan**
```sql
-- Verificar datos de empresa
SELECT seller_id, support_id, seller_commission_rate, support_commission_rate
FROM companies WHERE company_id = 45;

-- Verificar líder del vendedor
SELECT leader_id, leader_commission_rate
FROM partners WHERE id = 10;
```

### **Problema: Empresa no se activa**
```sql
-- Verificar estado de empresa
SELECT status FROM companies WHERE company_id = 45;

-- Ver log del pago
SELECT * FROM payments WHERE company_id = 45 ORDER BY created_at DESC LIMIT 1;
```

---

## 📧 SOPORTE

Para consultas sobre este sistema:
1. Revisar este README
2. Consultar archivos de servicio en `src/services/`
3. Revisar logs del servidor
4. Ejecutar CRON jobs manualmente para debugging

---

**Creado:** Enero 2025
**Versión:** 1.0.0
**Estado:** Producción Ready (Backend)
