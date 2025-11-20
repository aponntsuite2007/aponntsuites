# 🏗️ ARQUITECTURA COMPLETA - ERP DE COMISIONES Y NOTIFICACIONES

**Fecha de creación**: 2025-01-19
**Versión**: 1.0.0
**Estado**: DISEÑO COMPLETO - Listo para implementación

---

## 📋 ÍNDICE

1. [Visión General del Sistema](#visión-general-del-sistema)
2. [Circuitos de Notificación](#circuitos-de-notificación)
3. [Workflows Completos](#workflows-completos)
4. [Base de Datos](#base-de-datos)
5. [Servicios y APIs](#servicios-y-apis)
6. [Sistema de Firma Digital](#sistema-de-firma-digital)
7. [Transferencias Bancarias](#transferencias-bancarias)
8. [Trazabilidad Completa](#trazabilidad-completa)
9. [Roadmap de Implementación](#roadmap-de-implementación)

---

## 1. VISIÓN GENERAL DEL SISTEMA

### 🎯 Objetivo

Crear un **ERP completo** que gestione TODO el ciclo comercial de Aponnt:

```
EMPRESA (Cliente) ← contrata → PRESUPUESTO
         ↓
    CONTRATO (firmado con EULA)
         ↓
FACTURACIÓN MENSUAL (automática día 1)
         ↓
    PAGOS (registrados)
         ↓
COMISIONES (calculadas automáticamente)
         ↓
LIQUIDACIONES (transferencias bancarias)
         ↓
TRAZABILIDAD (todo auditado)
```

### 🌐 Ecosistema de Actores

```
┌──────────────────────────────────────────────────────────────┐
│                        APONNT STAFF                          │
│  (aponnt_staff table - 11 roles jerárquicos)                │
│                                                              │
│  CEO                                                         │
│   ├─ Regional Sales Manager                                 │
│   │   ├─ Sales Supervisor                                   │
│   │   │   ├─ Sales Leader                                   │
│   │   │   │   └─ Sales Rep (Vendedor)                       │
│   │                                                          │
│   ├─ Regional Support Manager                               │
│   │   ├─ Support Supervisor                                 │
│   │   │   └─ Support Agent                                  │
│   │                                                          │
│   ├─ Admin (Sistema)                                        │
│   ├─ Marketing                                              │
│   └─ Accounting (Contabilidad)                              │
└──────────────────────────────────────────────────────────────┘
         ↓ vende/soporta ↓
┌──────────────────────────────────────────────────────────────┐
│                      EMPRESAS (Clientes)                     │
│  (companies table)                                           │
│                                                              │
│  - Compran módulos (asistencia, nómina, etc.)              │
│  - Pagan facturas mensuales                                 │
│  - Generan comisiones al staff                              │
└──────────────────────────────────────────────────────────────┘
         ↓ pueden contratar ↓
┌──────────────────────────────────────────────────────────────┐
│                    ASOCIADOS (Partners)                      │
│  (partners table - médicos, abogados, ingenieros)           │
│                                                              │
│  - Brindan servicios a empresas                             │
│  - Cobran comisiones por servicios                          │
│  - Tienen estado activo/suspendido/baja                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. CIRCUITOS DE NOTIFICACIÓN

### 🔔 Sistemas de Notificación (SEPARADOS)

#### **A) NotificationEnterpriseService** (Existente)
- **Alcance**: Comunicaciones **DENTRO** de cada empresa
- **Usuarios**: Empleados de una misma empresa entre sí
- **Tabla**: `notifications` (con company_id)
- **Ejemplo**: "Tu solicitud de vacaciones fue aprobada"

#### **B) AponntNotificationService** (Nuevo - A implementar)
- **Alcance**: Comunicaciones **APONNT → Actores externos**
- **Circuitos**:
  - Aponnt → Empresas (facturas, cambios de módulos)
  - Aponnt → Vendedores (comisiones, liquidaciones)
  - Aponnt → Asociados (cambios de estado, nuevos clientes)
  - Bidireccional: Vendedor ↔ Aponnt (cambios de billetera)
- **Tabla**: `aponnt_external_notifications` (NUEVA)
- **Ejemplo**: "Tu comisión de $500 fue liquidada"

### 📧 Canales de Notificación

Cada notificación del circuito **Aponnt ↔ Externos** se envía por:

1. **Email** (OBLIGATORIO - siempre)
   - Registro de envío con `message_id`
   - Timestamps de envío/recepción
   - Contenido en HTML + plain text

2. **Notificación interna** (en la app)
   - Visible en dashboard
   - Badge de contador
   - Push notification (móvil)

3. **SMS** (OPCIONAL - solo para urgentes)
   - Cambios de billetera
   - Liquidaciones confirmadas
   - Alertas críticas

### ⏱️ Tipos de Notificaciones por Tiempo de Acción

#### **INSTANT** (Acción inmediata)
- Se envían en el momento del evento
- Ejemplos: pago registrado, comisión calculada

#### **PENDING_CONFIRMATION** (Requieren confirmación)
- Se envían con deadline
- Requieren acción del destinatario (aprobar/rechazar)
- Escalamiento automático si no hay respuesta
- Ejemplos:
  - Cambio de billetera (deadline: 48hs)
  - Modificación de contrato (deadline: 7 días)

#### **SCHEDULED** (Programadas)
- Se envían en fecha/hora específica
- Ejemplos: recordatorios de pago, avisos de vencimiento

---

## 3. WORKFLOWS COMPLETOS

### 🔄 WORKFLOW 1: Modificación de Contrato (10 Pasos)

**Trigger**: Empresa solicita cambiar módulos activos
**Actores**: Empresa, Vendedor, Aponnt Admin

```
PASO 1: DAR DE BAJA CONTRATO VIGENTE
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ - UPDATE contracts SET status = 'inactive',   │
│   end_date = NOW(), ended_by = 'modification' │
│   WHERE id = <contrato_actual>                 │
│                                                │
│ NOTIFICACIÓN:                                  │
│ → Email a empresa:                             │
│   "Contrato #123 dado de baja por            │
│    modificación solicitada"                    │
│                                                │
│ → Notificación a vendedor:                    │
│   "Empresa X solicitó modificación de        │
│    contrato - Se creará nuevo presupuesto"    │
│                                                │
│ BD:                                            │
│ - contracts.status = 'inactive'                │
│ - contracts.end_date = CURRENT_TIMESTAMP       │
│ - aponnt_external_notifications INSERT        │
└────────────────────────────────────────────────┘
         ↓
PASO 2: CREAR NUEVO PRESUPUESTO
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ - INSERT INTO quotes (company_id,             │
│   vendor_id, modules_requested, pricing...)   │
│ - Calcular pricing según módulos nuevos       │
│                                                │
│ NOTIFICACIÓN:                                  │
│ → Email a empresa:                             │
│   "Nuevo presupuesto #456 generado"          │
│   Adjunto: PDF con detalle de módulos/precios │
│                                                │
│ → Notificación a vendedor:                    │
│   "Presupuesto #456 generado - Pendiente     │
│    aprobación de empresa"                      │
│                                                │
│ BD:                                            │
│ - quotes INSERT                                │
│ - quote_items INSERT (uno por módulo)         │
│ - aponnt_external_notifications INSERT        │
└────────────────────────────────────────────────┘
         ↓
PASO 3: ENVIAR PRESUPUESTO A EMPRESA (PENDING_CONFIRMATION)
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ - Generar PDF del presupuesto                 │
│ - Crear notificación con deadline (7 días)    │
│                                                │
│ NOTIFICACIÓN:                                  │
│ → Email a empresa:                             │
│   Subject: "Nuevo presupuesto - Requiere     │
│             aprobación"                        │
│   Body: Detalle de cambios + link a aprobar   │
│   Adjunto: PDF presupuesto                     │
│   Deadline: 7 días                             │
│                                                │
│ → Recordatorio automático (día 5):            │
│   "Presupuesto pendiente de aprobación"       │
│                                                │
│ BD:                                            │
│ - quotes.status = 'sent'                       │
│ - quotes.sent_at = NOW()                       │
│ - aponnt_external_notifications INSERT        │
│   (notification_type = 'PENDING_CONFIRMATION', │
│    deadline = NOW() + INTERVAL '7 days')      │
└────────────────────────────────────────────────┘
         ↓
PASO 4: EMPRESA APRUEBA PRESUPUESTO
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ - UPDATE quotes SET status = 'approved',      │
│   approved_at = NOW(), approved_by = <user>   │
│                                                │
│ NOTIFICACIÓN:                                  │
│ → Email a vendedor:                            │
│   "✅ Presupuesto #456 APROBADO por Empresa X"│
│                                                │
│ → Notificación a Aponnt Admin:                │
│   "Nuevo presupuesto aprobado - Generar      │
│    contrato"                                   │
│                                                │
│ BD:                                            │
│ - quotes.status = 'approved'                   │
│ - quotes.approved_at = CURRENT_TIMESTAMP       │
│ - aponnt_external_notifications INSERT        │
│ - Marca notificación anterior como 'actioned' │
└────────────────────────────────────────────────┘
         ↓
PASO 5: GENERAR NUEVO CONTRATO
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ - INSERT INTO contracts (quote_id,            │
│   company_id, seller_id, support_id,          │
│   modules, pricing, status='pending_signature')│
│ - Generar PDF contrato con EULA               │
│                                                │
│ NOTIFICACIÓN:                                  │
│ → Email a empresa:                             │
│   "Contrato #789 generado - Firma digital    │
│    requerida"                                  │
│   Link: /contracts/789/sign                    │
│                                                │
│ BD:                                            │
│ - contracts INSERT                             │
│ - contracts.status = 'pending_signature'       │
│ - aponnt_external_notifications INSERT        │
└────────────────────────────────────────────────┘
         ↓
PASO 6: FIRMA DIGITAL (EULA - Cobertura mundial)
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ - Empresa acepta términos EULA                 │
│ - Timestamp + IP + User-Agent                  │
│ - Generar hash SHA-256 del contrato firmado    │
│                                                │
│ EULA (End User License Agreement):            │
│ - Válido internacionalmente                    │
│ - Aceptación electrónica = firma digital      │
│ - Registro de evidencia (IP, timestamp)       │
│                                                │
│ NOTIFICACIÓN:                                  │
│ → Email a empresa:                             │
│   "✅ Contrato firmado digitalmente"          │
│   Adjunto: PDF contrato firmado                │
│                                                │
│ → Email a vendedor:                            │
│   "Empresa X firmó contrato - Comisiones     │
│    se generarán automáticamente"               │
│                                                │
│ BD:                                            │
│ - contracts.status = 'signed'                  │
│ - contracts.signed_at = CURRENT_TIMESTAMP      │
│ - contracts.signed_by_user_id = <user>         │
│ - contracts.signature_ip = <ip>                │
│ - contracts.signature_hash = SHA256(...)       │
│ - aponnt_external_notifications INSERT        │
└────────────────────────────────────────────────┘
         ↓
PASO 7: ACTIVAR CONTRATO
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ - UPDATE contracts SET status = 'active',     │
│   activated_at = NOW()                         │
│ - UPDATE companies SET active_modules = [...],│
│   pricing = {...}                              │
│                                                │
│ NOTIFICACIÓN:                                  │
│ → Email a empresa:                             │
│   "Contrato activado - Módulos disponibles"   │
│   Lista: módulos activos                       │
│                                                │
│ BD:                                            │
│ - contracts.status = 'active'                  │
│ - contracts.activated_at = CURRENT_TIMESTAMP   │
│ - companies.active_modules UPDATE              │
│ - aponnt_external_notifications INSERT        │
└────────────────────────────────────────────────┘
         ↓
PASO 8: REGISTRAR COMISIONES DEL CONTRATO
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ - Registrar comisión por VENTA (una vez)      │
│ - Registrar comisión recurrente MENSUAL       │
│                                                │
│ COMISIONES:                                    │
│ 1. VENTA (one-time):                           │
│    - Al vendedor: X% del total 1er mes         │
│    - Al líder del vendedor: Y% de la comisión  │
│                                                │
│ 2. SOPORTE (mensual recurrente):               │
│    - Al support_agent: Z% del total mensual    │
│                                                │
│ NOTIFICACIÓN:                                  │
│ → Email a vendedor:                            │
│   "💰 Comisión registrada: $XXX (pendiente   │
│       liquidación)"                            │
│                                                │
│ BD:                                            │
│ - vendor_commissions INSERT                    │
│   (type='sale', status='pending')              │
│ - vendor_commissions INSERT                    │
│   (type='support', status='pending')           │
│ - aponnt_external_notifications INSERT        │
└────────────────────────────────────────────────┘
         ↓
PASO 9: PRIMERA FACTURA (PRO-RATA si no es día 1)
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ - Si contrato se activa en día != 1:          │
│   Generar factura PRO-RATA por días restantes │
│ - Si es día 1: factura completa mes actual    │
│                                                │
│ NOTIFICACIÓN:                                  │
│ → Email a empresa:                             │
│   "Factura #001 generada"                     │
│   Adjunto: PDF factura                         │
│   Link: pagar online                           │
│                                                │
│ BD:                                            │
│ - invoices INSERT                              │
│ - invoice_items INSERT                         │
│ - aponnt_external_notifications INSERT        │
└────────────────────────────────────────────────┘
         ↓
PASO 10: NOTIFICACIÓN MENSUAL RECURRENTE
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ - Programar CRON job mensual (día 1)          │
│ - Generar factura automática                   │
│                                                │
│ NOTIFICACIÓN:                                  │
│ → Email a empresa (día 1 cada mes):           │
│   "Nueva factura mensual generada"            │
│                                                │
│ → Email a vendedor (día 1 cada mes):          │
│   "Nueva comisión recurrente registrada"      │
│                                                │
│ BD:                                            │
│ - cron_jobs_history INSERT                     │
│ - (ver WORKFLOW 2 - Facturación)              │
└────────────────────────────────────────────────┘
```

---

### 💰 WORKFLOW 2: Facturación Mensual Automática

**Trigger**: CRON job ejecuta cada día 1 del mes a las 00:00
**Actores**: Sistema, Empresas, Vendedores

```
PASO 1: CRON JOB EJECUTA (Día 1, 00:00 AM)
┌────────────────────────────────────────────────┐
│ SERVICIO: InvoiceGenerationService             │
│                                                │
│ ACCIÓN:                                        │
│ 1. SELECT * FROM companies                    │
│    WHERE status = 'activo'                     │
│                                                │
│ 2. Por cada empresa:                           │
│    - Verificar si tiene contrato activo        │
│    - Verificar si tiene módulos activos        │
│    - Verificar si ya existe factura para      │
│      este mes (evitar duplicados)              │
│                                                │
│ BD:                                            │
│ - cron_jobs_history INSERT                     │
│   (job_name='monthly_invoicing',               │
│    started_at=NOW())                           │
└────────────────────────────────────────────────┘
         ↓
PASO 2: GENERAR FACTURA POR EMPRESA
┌────────────────────────────────────────────────┐
│ Por cada empresa activa:                       │
│                                                │
│ CÁLCULO:                                       │
│ 1. Obtener active_modules de companies        │
│ 2. Obtener pricing de companies               │
│ 3. Por cada módulo activo:                     │
│    - Precio base del módulo                    │
│    - Multiplicar por cantidad (ej: empleados)  │
│    - Aplicar descuentos si aplica              │
│ 4. Subtotal = suma de todos los ítems          │
│ 5. Impuestos = subtotal * tax_rate             │
│ 6. Total = subtotal + impuestos                │
│                                                │
│ EJEMPLO:                                       │
│ Empresa: "ACME Corp" (100 empleados)          │
│ Módulos activos:                               │
│  - Asistencia: $5/empleado = $500             │
│  - Nómina: $8/empleado = $800                 │
│  - Facturación: $600 (fijo)                   │
│                                                │
│ Subtotal: $1,900                               │
│ IVA (21%): $399                                │
│ TOTAL: $2,299                                  │
│                                                │
│ BD:                                            │
│ - invoices INSERT                              │
│   (invoice_number='2025-01-0001',              │
│    company_id=1,                               │
│    billing_period_month=1,                     │
│    billing_period_year=2025,                   │
│    subtotal=1900,                              │
│    tax_amount=399,                             │
│    total_amount=2299,                          │
│    currency='USD',                             │
│    status='pending',                           │
│    due_date=NOW() + INTERVAL '15 days')       │
│                                                │
│ - invoice_items INSERT (3 filas):             │
│   1. (module='attendance', qty=100,           │
│       unit_price=5, total=500)                │
│   2. (module='payroll', qty=100,              │
│       unit_price=8, total=800)                │
│   3. (module='billing', qty=1,                │
│       unit_price=600, total=600)              │
└────────────────────────────────────────────────┘
         ↓
PASO 3: GENERAR PDF DE LA FACTURA
┌────────────────────────────────────────────────┐
│ SERVICIO: PDFGenerationService                 │
│                                                │
│ CONTENIDO DEL PDF:                             │
│ - Logo Aponnt                                  │
│ - Número de factura                            │
│ - Fecha de emisión                             │
│ - Datos de la empresa cliente                  │
│ - Tabla de ítems (módulos)                     │
│ - Subtotal, impuestos, total                   │
│ - Métodos de pago disponibles                  │
│ - Fecha de vencimiento                         │
│ - Código QR para pago online                   │
│                                                │
│ ALMACENAMIENTO:                                │
│ - Guardar en: /uploads/invoices/2025/01/      │
│   nombre: invoice_2025-01-0001.pdf            │
│                                                │
│ BD:                                            │
│ - invoices.pdf_path UPDATE                     │
└────────────────────────────────────────────────┘
         ↓
PASO 4: ENVIAR NOTIFICACIÓN A EMPRESA
┌────────────────────────────────────────────────┐
│ NOTIFICACIÓN EMAIL:                            │
│                                                │
│ To: empresa_contactEmail                       │
│ Subject: "Nueva factura mensual - Enero 2025" │
│                                                │
│ Body:                                          │
│ "Estimado cliente ACME Corp,                  │
│                                                │
│  Su factura mensual ha sido generada:         │
│                                                │
│  Factura #: 2025-01-0001                      │
│  Período: Enero 2025                          │
│  Monto total: USD $2,299                      │
│  Vencimiento: 15 de Enero 2025                │
│                                                │
│  Puede pagar online ingresando a:             │
│  https://aponnt.com/invoices/2025-01-0001     │
│                                                │
│  O transferir a:                               │
│  Banco: XXX                                    │
│  Cuenta: XXXXXXXXX                             │
│  CBU: XXXXXXXXXXXXXXX                          │
│                                                │
│  Adjuntamos el PDF de la factura.             │
│                                                │
│  Saludos,                                      │
│  Equipo Aponnt"                                │
│                                                │
│ Attachments:                                   │
│ - invoice_2025-01-0001.pdf                    │
│                                                │
│ BD:                                            │
│ - aponnt_external_notifications INSERT        │
│   (recipient_type='company',                   │
│    recipient_id=1,                             │
│    notification_type='INVOICE_GENERATED',      │
│    related_entity_type='invoice',              │
│    related_entity_id=<invoice_id>,             │
│    sent_at=NOW(),                              │
│    email_message_id=<aws_ses_message_id>)     │
└────────────────────────────────────────────────┘
         ↓
PASO 5: NOTIFICACIÓN A VENDEDOR (Comisión pendiente)
┌────────────────────────────────────────────────┐
│ NOTIFICACIÓN EMAIL:                            │
│                                                │
│ To: vendedor_email                             │
│ Subject: "Nueva comisión registrada - ACME"   │
│                                                │
│ Body:                                          │
│ "Hola [Vendedor],                             │
│                                                │
│  Se generó factura para tu cliente ACME Corp: │
│                                                │
│  Factura #: 2025-01-0001                      │
│  Total facturado: USD $2,299                  │
│                                                │
│  Tu comisión (5%): USD $114.95                │
│  Estado: Pendiente de pago                     │
│                                                │
│  La comisión se liquidará una vez que el     │
│  cliente pague la factura.                     │
│                                                │
│  Saludos,                                      │
│  Equipo Aponnt"                                │
│                                                │
│ BD:                                            │
│ - aponnt_external_notifications INSERT        │
│   (recipient_type='vendor',                    │
│    recipient_id=<vendor_id>,                   │
│    notification_type='COMMISSION_REGISTERED')  │
└────────────────────────────────────────────────┘
         ↓
PASO 6: RECORDATORIO AUTOMÁTICO (Día 10)
┌────────────────────────────────────────────────┐
│ TRIGGER: CRON job diario verifica facturas    │
│          con vencimiento en 5 días             │
│                                                │
│ NOTIFICACIÓN EMAIL:                            │
│                                                │
│ To: empresa_contactEmail                       │
│ Subject: "Recordatorio: Factura vence en 5   │
│           días"                                │
│                                                │
│ Body:                                          │
│ "Le recordamos que su factura #2025-01-0001  │
│  vence el 15 de Enero.                        │
│                                                │
│  Monto pendiente: USD $2,299                  │
│                                                │
│  Link de pago: [...]"                         │
│                                                │
│ BD:                                            │
│ - aponnt_external_notifications INSERT        │
│   (notification_type='PAYMENT_REMINDER')       │
└────────────────────────────────────────────────┘
         ↓
PASO 7: EMPRESA PAGA FACTURA
┌────────────────────────────────────────────────┐
│ Ver: WORKFLOW 3 - Liquidación de Comisiones   │
└────────────────────────────────────────────────┘
```

---

### 💸 WORKFLOW 3: Liquidación de Comisiones

**Trigger**: Empresa paga una factura
**Actores**: Sistema, Vendedor, Líder, Support Agent

```
PASO 1: REGISTRO DE PAGO
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ - Admin de Aponnt registra pago manualmente    │
│   O pago automático via gateway               │
│                                                │
│ BD:                                            │
│ - payments INSERT                              │
│   (invoice_id=<id>,                            │
│    amount=2299,                                │
│    currency='USD',                             │
│    payment_method='bank_transfer',             │
│    payment_date=NOW(),                         │
│    status='completed')                         │
│                                                │
│ - invoices UPDATE                              │
│   SET status='paid', paid_at=NOW()            │
│   WHERE id=<invoice_id>                        │
└────────────────────────────────────────────────┘
         ↓
PASO 2: CÁLCULO AUTOMÁTICO DE COMISIONES
┌────────────────────────────────────────────────┐
│ SERVICIO: CommissionCalculationService         │
│                                                │
│ EJECUTA AL REGISTRAR PAGO:                     │
│                                                │
│ 1. COMISIÓN DE VENTA (al vendedor)            │
│    Base: $2,299                                │
│    Rate: 5% (company.seller_commission_rate)   │
│    Comisión: $114.95                           │
│                                                │
│ 2. COMISIÓN DE LÍDER (al líder del vendedor)  │
│    Base: $114.95 (comisión del vendedor)       │
│    Rate: 10% (leader.leader_commission_rate)   │
│    Comisión: $11.49                            │
│                                                │
│ 3. COMISIÓN DE SOPORTE (al support agent)     │
│    Base: $2,299                                │
│    Rate: 3% (company.support_commission_rate)  │
│    Comisión: $68.97                            │
│                                                │
│ TOTAL COMISIONES: $195.41                      │
│                                                │
│ BD:                                            │
│ - vendor_commissions INSERT (3 filas):        │
│                                                │
│   1. (partner_id=<vendedor>,                  │
│       commission_type='sale',                  │
│       base_amount=2299,                        │
│       commission_rate=5,                       │
│       commission_amount=114.95,                │
│       status='pending',                        │
│       invoice_id=<id>,                         │
│       payment_id=<id>)                         │
│                                                │
│   2. (partner_id=<líder>,                     │
│       commission_type='leader',                │
│       base_amount=114.95,                      │
│       commission_rate=10,                      │
│       commission_amount=11.49,                 │
│       status='pending',                        │
│       originated_from_partner_id=<vendedor>)   │
│                                                │
│   3. (partner_id=<support>,                   │
│       commission_type='support',               │
│       base_amount=2299,                        │
│       commission_rate=3,                       │
│       commission_amount=68.97,                 │
│       status='pending')                        │
└────────────────────────────────────────────────┘
         ↓
PASO 3: NOTIFICACIÓN DE COMISIÓN REGISTRADA
┌────────────────────────────────────────────────┐
│ NOTIFICACIÓN EMAIL (a cada uno):              │
│                                                │
│ To: vendedor_email                             │
│ Subject: "💰 Comisión registrada: $114.95"    │
│                                                │
│ Body:                                          │
│ "Hola [Vendedor],                             │
│                                                │
│  ¡Felicitaciones! Se registró una comisión:  │
│                                                │
│  Cliente: ACME Corp                            │
│  Factura: #2025-01-0001                       │
│  Monto facturado: USD $2,299                  │
│  Tu comisión (5%): USD $114.95                │
│                                                │
│  Estado: Pendiente de liquidación             │
│  Fecha estimada de transferencia: 30 Enero   │
│                                                │
│  Puedes ver el detalle en:                     │
│  https://aponnt.com/my-commissions            │
│                                                │
│  Saludos,                                      │
│  Equipo Aponnt"                                │
│                                                │
│ BD:                                            │
│ - aponnt_external_notifications INSERT (3x)   │
│   (uno para vendedor, líder, support)          │
└────────────────────────────────────────────────┘
         ↓
PASO 4: LIQUIDACIÓN MENSUAL (Fin de mes)
┌────────────────────────────────────────────────┐
│ TRIGGER: CRON job ejecuta último día del mes  │
│                                                │
│ ACCIÓN:                                        │
│ 1. SELECT * FROM vendor_commissions           │
│    WHERE status = 'pending'                    │
│    AND billing_period_month = <mes_actual>    │
│    GROUP BY partner_id                         │
│                                                │
│ 2. Por cada vendedor/líder/support:           │
│    - Sumar todas sus comisiones del mes        │
│    - Verificar datos de billetera válidos      │
│    - Generar orden de transferencia            │
│                                                │
│ EJEMPLO:                                       │
│ Vendedor Juan Pérez (ID: 123)                 │
│ Comisiones del mes:                            │
│  - Empresa A: $114.95                          │
│  - Empresa B: $200.00                          │
│  - Empresa C: $150.00                          │
│                                                │
│ TOTAL A LIQUIDAR: $464.95                      │
│                                                │
│ BD:                                            │
│ - commission_liquidations INSERT               │
│   (partner_id=123,                             │
│    liquidation_month=1,                        │
│    liquidation_year=2025,                      │
│    total_amount=464.95,                        │
│    currency='USD',                             │
│    status='pending_transfer',                  │
│    commission_ids=[1,2,3])                     │
│                                                │
│ - vendor_commissions UPDATE                    │
│   SET status='liquidated',                     │
│   liquidation_id=<id>                          │
│   WHERE id IN (1,2,3)                          │
└────────────────────────────────────────────────┘
         ↓
PASO 5: TRANSFERENCIA BANCARIA
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ 1. Obtener datos de billetera del vendedor    │
│    FROM aponnt_staff:                          │
│    - wallet_type ('mercado_pago', 'banco')    │
│    - wallet_cbu                                │
│    - wallet_alias                              │
│    - wallet_usd_enabled (DEBE ser true)       │
│                                                │
│ 2. Generar archivo para transferencia masiva  │
│    (formato según banco/plataforma)            │
│                                                │
│ 3. Admin ejecuta transferencias                │
│                                                │
│ 4. Registrar transferencia                     │
│                                                │
│ BD:                                            │
│ - bank_transfers INSERT                        │
│   (liquidation_id=<id>,                        │
│    recipient_partner_id=123,                   │
│    amount=464.95,                              │
│    currency='USD',                             │
│    wallet_cbu=<cbu>,                           │
│    wallet_alias=<alias>,                       │
│    transfer_date=NOW(),                        │
│    status='completed',                         │
│    transaction_id=<bank_ref>)                  │
│                                                │
│ - commission_liquidations UPDATE               │
│   SET status='transferred',                    │
│   transferred_at=NOW()                         │
└────────────────────────────────────────────────┘
         ↓
PASO 6: NOTIFICACIÓN DE LIQUIDACIÓN COMPLETADA
┌────────────────────────────────────────────────┐
│ NOTIFICACIÓN EMAIL + SMS:                      │
│                                                │
│ To: vendedor_email                             │
│ Subject: "✅ Comisiones liquidadas: $464.95"  │
│                                                │
│ Body:                                          │
│ "Hola Juan,                                   │
│                                                │
│  Tus comisiones de Enero 2025 fueron         │
│  transferidas:                                 │
│                                                │
│  Total liquidado: USD $464.95                 │
│  Destino: Mercado Pago (alias: juan.perez)   │
│  Fecha: 31 Enero 2025                         │
│  Referencia bancaria: #XXXXXXXXX              │
│                                                │
│  Deberías recibir el dinero en las próximas  │
│  24-48 horas hábiles.                         │
│                                                │
│  Detalle de comisiones:                        │
│  - ACME Corp: $114.95                         │
│  - TechStart Inc: $200.00                     │
│  - Global SA: $150.00                         │
│                                                │
│  Puedes ver el comprobante en:                 │
│  https://aponnt.com/my-liquidations/enero-2025│
│                                                │
│  Saludos,                                      │
│  Equipo Aponnt"                                │
│                                                │
│ SMS:                                           │
│ "Aponnt: Transferencia de $464.95 realizada  │
│  a tu billetera. Ref: #XXXXXXXXX"             │
│                                                │
│ BD:                                            │
│ - aponnt_external_notifications INSERT        │
│   (notification_type='LIQUIDATION_COMPLETED',  │
│    channels=['email', 'sms'])                  │
└────────────────────────────────────────────────┘
```

---

### 🏦 WORKFLOW 4: Cambio de Billetera (Con confirmación obligatoria)

**Trigger**: Vendedor solicita cambiar datos de billetera
**Actores**: Vendedor, Aponnt Admin

```
PASO 1: VENDEDOR SOLICITA CAMBIO
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ - Vendedor ingresa a su perfil                 │
│ - Modifica:                                     │
│   * wallet_type (mercado_pago/banco)           │
│   * wallet_cbu                                 │
│   * wallet_alias                               │
│   * wallet_usd_enabled (checkbox obligatorio)  │
│                                                │
│ VALIDACIONES FRONTEND:                         │
│ - CBU: formato 22 dígitos                      │
│ - Alias: formato válido                        │
│ - USD enabled: OBLIGATORIO marcar              │
│                                                │
│ BD:                                            │
│ - wallet_change_requests INSERT                │
│   (partner_id=123,                             │
│    old_wallet_cbu=<actual>,                    │
│    new_wallet_cbu=<nuevo>,                     │
│    new_wallet_alias=<nuevo>,                   │
│    new_wallet_type=<tipo>,                     │
│    status='pending_confirmation',              │
│    requested_at=NOW(),                         │
│    deadline=NOW() + INTERVAL '48 hours')      │
│                                                │
│ IMPORTANTE: Cambios NO se aplican todavía!     │
│ Quedan en tabla temporal                       │
└────────────────────────────────────────────────┘
         ↓
PASO 2: NOTIFICACIÓN DE CONFIRMACIÓN (PENDING_CONFIRMATION)
┌────────────────────────────────────────────────┐
│ NOTIFICACIÓN EMAIL + SMS:                      │
│                                                │
│ To: vendedor_email                             │
│ Subject: "⚠️ Confirma cambio de billetera"    │
│                                                │
│ Body:                                          │
│ "Hola Juan,                                   │
│                                                │
│  Recibimos una solicitud de cambio de        │
│  billetera para liquidación de comisiones.    │
│                                                │
│  DATOS ACTUALES:                               │
│  - Tipo: Mercado Pago                         │
│  - CBU: 0000003100012345678901                │
│  - Alias: juan.perez                          │
│                                                │
│  NUEVOS DATOS:                                 │
│  - Tipo: Banco Galicia                        │
│  - CBU: 0000022200123456789012                │
│  - Alias: juan.perez.galicia                  │
│  - USD habilitado: ✅ SÍ                      │
│                                                │
│  ⚠️ IMPORTANTE:                                │
│  Si NO realizaste este cambio, ignora este   │
│  email y los datos permanecerán sin cambios.  │
│                                                │
│  Si SÍ realizaste este cambio, debes         │
│  confirmarlo haciendo click en el botón:       │
│                                                │
│  [ CONFIRMAR CAMBIO DE BILLETERA ]            │
│                                                │
│  Este link expira en 48 horas.                │
│                                                │
│  Si no confirmas antes de 48hs, el cambio    │
│  será REVERTIDO automáticamente.               │
│                                                │
│  Fecha límite: 21 Enero 2025 14:30 hs        │
│                                                │
│  Saludos,                                      │
│  Equipo Aponnt"                                │
│                                                │
│ SMS:                                           │
│ "Aponnt: Solicitud de cambio de billetera.   │
│  Confirma en tu email antes de 48hs o será   │
│  rechazado. Ref: #XXXXXXXXX"                  │
│                                                │
│ BD:                                            │
│ - aponnt_external_notifications INSERT        │
│   (notification_type='WALLET_CHANGE_PENDING',  │
│    deadline=NOW() + INTERVAL '48 hours',      │
│    requires_action=true)                       │
└────────────────────────────────────────────────┘
         ↓
PASO 3A: VENDEDOR CONFIRMA (Dentro de 48hs)
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ - Vendedor hace click en link del email       │
│ - Sistema valida token y expiración           │
│ - Confirma autoría del cambio                  │
│                                                │
│ BD:                                            │
│ - wallet_change_requests UPDATE                │
│   SET status='confirmed',                      │
│   confirmed_at=NOW(),                          │
│   confirmed_ip=<ip>,                           │
│   confirmed_user_agent=<ua>                    │
│                                                │
│ - aponnt_staff UPDATE                          │
│   SET wallet_type=<new>,                       │
│   wallet_cbu=<new>,                            │
│   wallet_alias=<new>,                          │
│   wallet_updated_at=NOW()                      │
│   WHERE id=123                                 │
│                                                │
│ NOTIFICACIÓN:                                  │
│ → Email:                                       │
│   "✅ Cambio de billetera CONFIRMADO"         │
│   "Tus comisiones se transferirán a la       │
│    nueva billetera a partir de ahora."        │
│                                                │
│ → Notificación a Aponnt Admin:                │
│   "Vendedor Juan Pérez cambió su billetera   │
│    (confirmado)"                               │
│                                                │
│ BD:                                            │
│ - aponnt_external_notifications INSERT        │
│   (notification_type='WALLET_CHANGE_CONFIRMED')│
└────────────────────────────────────────────────┘

PASO 3B: VENDEDOR NO CONFIRMA (Después de 48hs)
┌────────────────────────────────────────────────┐
│ TRIGGER: CRON job verifica deadlines vencidos │
│                                                │
│ ACCIÓN:                                        │
│ - Detecta request con deadline vencido         │
│ - Revierte cambios (NO se aplican)             │
│                                                │
│ BD:                                            │
│ - wallet_change_requests UPDATE                │
│   SET status='expired',                        │
│   expired_at=NOW()                             │
│                                                │
│ NOTIFICACIÓN:                                  │
│ → Email:                                       │
│   "⏱️ Cambio de billetera EXPIRADO"           │
│   "No confirmaste el cambio en 48hs.          │
│    Tus datos de billetera permanecen sin      │
│    cambios.                                    │
│                                                │
│    Si deseas cambiarlos, vuelve a solicitar   │
│    el cambio desde tu perfil."                 │
│                                                │
│ BD:                                            │
│ - aponnt_external_notifications INSERT        │
│   (notification_type='WALLET_CHANGE_EXPIRED')  │
└────────────────────────────────────────────────┘
```

---

### 👤 WORKFLOW 5: Alta/Modificación de Vendedor

**Trigger**: Admin da de alta un nuevo vendedor o modifica datos
**Actores**: Aponnt Admin, Vendedor

```
PASO 1: ADMIN DA DE ALTA VENDEDOR
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ - Admin ingresa datos del vendedor:           │
│   * Datos personales (nombre, DNI, email)     │
│   * Rol (sales_rep, support_agent, etc.)      │
│   * Jerarquía (líder_id, supervisor_id)       │
│   * Datos de billetera (OBLIGATORIO)          │
│   * Username/password                          │
│                                                │
│ VALIDACIONES:                                  │
│ - Email único                                  │
│ - DNI único                                    │
│ - Username único                               │
│ - Billetera con USD habilitado                 │
│                                                │
│ BD:                                            │
│ - aponnt_staff INSERT                          │
│   (first_name, last_name, dni, email,         │
│    role, leader_id, supervisor_id,             │
│    wallet_type, wallet_cbu, wallet_alias,      │
│    wallet_usd_enabled=true,                    │
│    status='active')                            │
└────────────────────────────────────────────────┘
         ↓
PASO 2: NOTIFICACIÓN DE BIENVENIDA
┌────────────────────────────────────────────────┐
│ NOTIFICACIÓN EMAIL:                            │
│                                                │
│ To: vendedor_email                             │
│ Subject: "Bienvenido a Aponnt Staff"          │
│                                                │
│ Body:                                          │
│ "Hola Juan,                                   │
│                                                │
│  ¡Bienvenido al equipo de Aponnt!            │
│                                                │
│  Tu cuenta ha sido creada exitosamente:       │
│                                                │
│  Rol: Representante de Ventas                 │
│  Líder asignado: María González               │
│  Supervisor: Carlos Ramírez                   │
│                                                │
│  CREDENCIALES DE ACCESO:                       │
│  Username: juan.perez                          │
│  Password temporal: XXXXXXXXXX                 │
│                                                │
│  Por favor cambia tu contraseña en el primer  │
│  login ingresando a:                           │
│  https://aponnt.com/staff/login               │
│                                                │
│  DATOS DE LIQUIDACIÓN:                         │
│  Tus comisiones se transferirán a:            │
│  - Tipo: Mercado Pago                         │
│  - Alias: juan.perez                          │
│  - USD: ✅ Habilitado                         │
│                                                │
│  Liquidación: Último día de cada mes          │
│                                                │
│  Manual de vendedor:                           │
│  https://docs.aponnt.com/sales-guide          │
│                                                │
│  Saludos,                                      │
│  Equipo Aponnt"                                │
│                                                │
│ BD:                                            │
│ - aponnt_external_notifications INSERT        │
│   (notification_type='VENDOR_CREATED')         │
└────────────────────────────────────────────────┘
         ↓
PASO 3: MODIFICACIÓN DE DATOS (Si aplica)
┌────────────────────────────────────────────────┐
│ ACCIÓN:                                        │
│ - Admin modifica datos del vendedor            │
│ - Registra cambios en auditoría                │
│                                                │
│ CAMBIOS QUE REQUIEREN NOTIFICACIÓN:            │
│ ✅ Cambio de líder                             │
│ ✅ Cambio de rol                               │
│ ✅ Cambio de status (activo/inactivo)         │
│ ✅ Cambio de billetera (usar WORKFLOW 4)      │
│                                                │
│ BD:                                            │
│ - aponnt_staff UPDATE                          │
│ - staff_change_history INSERT                  │
│   (staff_id, field_changed, old_value,        │
│    new_value, changed_by, changed_at)         │
│                                                │
│ NOTIFICACIÓN:                                  │
│ → Email a vendedor:                            │
│   "Cambios en tu cuenta de Aponnt"           │
│   Detalle: qué cambió y por qué                │
│                                                │
│ BD:                                            │
│ - aponnt_external_notifications INSERT        │
│   (notification_type='VENDOR_UPDATED')         │
└────────────────────────────────────────────────┘
```

---

### 🏢 WORKFLOW 6: Cambios en Empresas (Módulos/Pricing)

**Trigger**: Empresa agrega/quita módulos o cambia pricing
**Actores**: Empresa, Vendedor, Aponnt Admin

```
PASO 1: EMPRESA SOLICITA CAMBIO DE MÓDULOS
┌────────────────────────────────────────────────┐
│ OPCIONES:                                      │
│ A) Agregar módulo nuevo                        │
│ B) Quitar módulo existente                     │
│ C) Cambiar cantidad (ej: más empleados)        │
│                                                │
│ Si es A o B: → Ver WORKFLOW 1 (Modificación   │
│              de Contrato)                      │
│                                                │
│ Si es C: → Proceso simplificado (abajo)        │
└────────────────────────────────────────────────┘
         ↓
PASO 2: CAMBIO DE CANTIDAD (Sin nuevo contrato)
┌────────────────────────────────────────────────┐
│ EJEMPLO: Empresa tenía 50 empleados, ahora    │
│          tiene 75                              │
│                                                │
│ ACCIÓN:                                        │
│ - Empresa actualiza cant_empleados             │
│ - Sistema recalcula pricing automáticamente    │
│                                                │
│ CÁLCULO:                                       │
│ Módulo Asistencia: $5/empleado                │
│ Antes: 50 x $5 = $250/mes                     │
│ Ahora: 75 x $5 = $375/mes                     │
│ Diferencia: +$125/mes                          │
│                                                │
│ BD:                                            │
│ - companies UPDATE                             │
│   SET contracted_employees=75,                 │
│   pricing=<recalculated>                       │
│                                                │
│ - pricing_change_history INSERT                │
│   (company_id, field='contracted_employees',   │
│    old_value=50, new_value=75,                │
│    monthly_impact=+125,                        │
│    changed_at=NOW())                           │
└────────────────────────────────────────────────┘
         ↓
PASO 3: NOTIFICACIÓN DE CAMBIO DE PRICING
┌────────────────────────────────────────────────┐
│ NOTIFICACIÓN EMAIL:                            │
│                                                │
│ To: empresa_contactEmail                       │
│ Subject: "Cambio en tu facturación mensual"   │
│                                                │
│ Body:                                          │
│ "Estimado cliente ACME Corp,                  │
│                                                │
│  Detectamos un cambio en la cantidad de       │
│  empleados de tu empresa:                      │
│                                                │
│  Empleados anteriores: 50                     │
│  Empleados actuales: 75                       │
│  Incremento: +25 empleados                     │
│                                                │
│  IMPACTO EN FACTURACIÓN:                       │
│  Módulo Asistencia:                            │
│  - Antes: $250/mes                            │
│  - Ahora: $375/mes                            │
│  - Diferencia: +$125/mes                       │
│                                                │
│  Este cambio se reflejará en tu próxima       │
│  factura (Febrero 2025).                       │
│                                                │
│  Si es un error, contáctanos de inmediato.    │
│                                                │
│  Saludos,                                      │
│  Equipo Aponnt"                                │
│                                                │
│ BD:                                            │
│ - aponnt_external_notifications INSERT        │
│   (notification_type='PRICING_CHANGED')        │
└────────────────────────────────────────────────┘
         ↓
PASO 4: NOTIFICACIÓN AL VENDEDOR (Comisión afectada)
┌────────────────────────────────────────────────┐
│ NOTIFICACIÓN EMAIL:                            │
│                                                │
│ To: vendedor_email                             │
│ Subject: "Cliente ACME aumentó empleados -    │
│           Mayor comisión"                      │
│                                                │
│ Body:                                          │
│ "Hola Juan,                                   │
│                                                │
│  ¡Buenas noticias! Tu cliente ACME Corp       │
│  aumentó la cantidad de empleados.            │
│                                                │
│  Empleados: 50 → 75 (+50%)                    │
│                                                │
│  IMPACTO EN TUS COMISIONES:                    │
│  Facturación mensual:                          │
│  - Antes: $2,299/mes                          │
│  - Ahora: $2,424/mes (+$125)                  │
│                                                │
│  Tu comisión mensual (5%):                     │
│  - Antes: $114.95/mes                         │
│  - Ahora: $121.20/mes (+$6.25)                │
│                                                │
│  Este cambio aplica desde Febrero 2025.       │
│                                                │
│  Saludos,                                      │
│  Equipo Aponnt"                                │
│                                                │
│ BD:                                            │
│ - aponnt_external_notifications INSERT        │
│   (notification_type='VENDOR_COMMISSION_      │
│    INCREASED')                                 │
└────────────────────────────────────────────────┘
```

---

## 4. BASE DE DATOS

### 📊 Nuevas Tablas Requeridas

#### **aponnt_external_notifications** (NUEVA)

```sql
CREATE TABLE aponnt_external_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Destinatario
  recipient_type VARCHAR(50) NOT NULL, -- 'company', 'vendor', 'partner', 'leader'
  recipient_id UUID NOT NULL, -- ID de company/aponnt_staff/partner
  recipient_email VARCHAR(255) NOT NULL,
  recipient_phone VARCHAR(20), -- Para SMS

  -- Tipo de notificación
  notification_type VARCHAR(100) NOT NULL,
  -- INVOICE_GENERATED, PAYMENT_REMINDER, COMMISSION_REGISTERED,
  -- LIQUIDATION_COMPLETED, WALLET_CHANGE_PENDING, VENDOR_CREATED, etc.

  category VARCHAR(50) NOT NULL, -- 'info', 'action_required', 'alert', 'success'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'

  -- Contenido
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  short_message VARCHAR(255), -- Para SMS
  html_body TEXT, -- HTML para email

  -- Relaciones
  related_entity_type VARCHAR(50), -- 'invoice', 'payment', 'commission', 'contract'
  related_entity_id UUID,

  -- Canales de envío
  channels JSONB DEFAULT '["email"]', -- ['email', 'sms', 'push']

  -- Email tracking
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  email_message_id VARCHAR(255), -- AWS SES message ID
  email_error TEXT,

  -- SMS tracking
  sms_sent BOOLEAN DEFAULT false,
  sms_sent_at TIMESTAMP,
  sms_message_id VARCHAR(255),
  sms_error TEXT,

  -- Push notification tracking
  push_sent BOOLEAN DEFAULT false,
  push_sent_at TIMESTAMP,
  push_error TEXT,

  -- Acciones (para notificaciones que requieren confirmación)
  requires_action BOOLEAN DEFAULT false,
  action_type VARCHAR(50), -- 'confirm_wallet', 'approve_quote', etc.
  action_url VARCHAR(500),
  action_deadline TIMESTAMP,
  action_taken BOOLEAN DEFAULT false,
  action_taken_at TIMESTAMP,
  action_result VARCHAR(50), -- 'approved', 'rejected', 'expired'

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,

  -- Índices
  CONSTRAINT check_recipient_type CHECK (recipient_type IN ('company', 'vendor', 'partner', 'leader', 'admin'))
);

CREATE INDEX idx_aponnt_notif_recipient ON aponnt_external_notifications(recipient_type, recipient_id);
CREATE INDEX idx_aponnt_notif_type ON aponnt_external_notifications(notification_type);
CREATE INDEX idx_aponnt_notif_created ON aponnt_external_notifications(created_at DESC);
CREATE INDEX idx_aponnt_notif_deadline ON aponnt_external_notifications(action_deadline) WHERE action_deadline IS NOT NULL;
```

#### **wallet_change_requests** (NUEVA)

```sql
CREATE TABLE wallet_change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  partner_id UUID NOT NULL REFERENCES aponnt_staff(id),

  -- Datos anteriores
  old_wallet_type VARCHAR(50),
  old_wallet_cbu VARCHAR(22),
  old_wallet_alias VARCHAR(100),

  -- Datos nuevos (solicitados)
  new_wallet_type VARCHAR(50) NOT NULL,
  new_wallet_cbu VARCHAR(22) NOT NULL,
  new_wallet_alias VARCHAR(100) NOT NULL,
  new_wallet_usd_enabled BOOLEAN DEFAULT true,

  -- Estado del cambio
  status VARCHAR(50) DEFAULT 'pending_confirmation',
  -- 'pending_confirmation', 'confirmed', 'expired', 'rejected'

  -- Timestamps y confirmación
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deadline TIMESTAMP NOT NULL, -- NOW() + 48 horas
  confirmed_at TIMESTAMP,
  expired_at TIMESTAMP,

  -- Auditoría de confirmación
  confirmed_ip VARCHAR(45),
  confirmed_user_agent TEXT,
  confirmation_token VARCHAR(255) UNIQUE,

  -- Metadata
  notes TEXT,

  CONSTRAINT check_status CHECK (status IN ('pending_confirmation', 'confirmed', 'expired', 'rejected'))
);

CREATE INDEX idx_wallet_change_partner ON wallet_change_requests(partner_id);
CREATE INDEX idx_wallet_change_status ON wallet_change_requests(status);
CREATE INDEX idx_wallet_change_deadline ON wallet_change_requests(deadline) WHERE status = 'pending_confirmation';
```

#### **commission_liquidations** (NUEVA)

```sql
CREATE TABLE commission_liquidations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  partner_id UUID NOT NULL REFERENCES aponnt_staff(id),

  -- Período de liquidación
  liquidation_month INTEGER NOT NULL, -- 1-12
  liquidation_year INTEGER NOT NULL,

  -- Monto total a liquidar
  total_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Comisiones incluidas (array de IDs)
  commission_ids UUID[] NOT NULL,

  -- Estado
  status VARCHAR(50) DEFAULT 'pending_transfer',
  -- 'pending_transfer', 'transferred', 'failed'

  -- Transferencia bancaria
  transferred_at TIMESTAMP,
  transfer_reference VARCHAR(255), -- Referencia bancaria

  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES aponnt_staff(id),

  CONSTRAINT check_status CHECK (status IN ('pending_transfer', 'transferred', 'failed'))
);

CREATE INDEX idx_liquidation_partner ON commission_liquidations(partner_id);
CREATE INDEX idx_liquidation_period ON commission_liquidations(liquidation_year, liquidation_month);
CREATE INDEX idx_liquidation_status ON commission_liquidations(status);
```

#### **bank_transfers** (NUEVA)

```sql
CREATE TABLE bank_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  liquidation_id UUID REFERENCES commission_liquidations(id),
  recipient_partner_id UUID NOT NULL REFERENCES aponnt_staff(id),

  -- Monto
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Datos de destino (snapshot al momento de transferencia)
  wallet_type VARCHAR(50) NOT NULL,
  wallet_cbu VARCHAR(22) NOT NULL,
  wallet_alias VARCHAR(100),

  -- Transferencia
  transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  transaction_id VARCHAR(255), -- ID de transacción del banco
  status VARCHAR(50) DEFAULT 'pending',
  -- 'pending', 'completed', 'failed', 'reversed'

  -- Errores
  error_message TEXT,

  -- Auditoría
  executed_by UUID REFERENCES aponnt_staff(id),

  CONSTRAINT check_status CHECK (status IN ('pending', 'completed', 'failed', 'reversed'))
);

CREATE INDEX idx_transfer_liquidation ON bank_transfers(liquidation_id);
CREATE INDEX idx_transfer_partner ON bank_transfers(recipient_partner_id);
CREATE INDEX idx_transfer_date ON bank_transfers(transfer_date DESC);
```

#### **pricing_change_history** (NUEVA)

```sql
CREATE TABLE pricing_change_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  company_id INTEGER NOT NULL REFERENCES companies(company_id),

  -- Campo modificado
  field_changed VARCHAR(100) NOT NULL,
  -- 'contracted_employees', 'active_modules', 'pricing', etc.

  -- Valores
  old_value TEXT,
  new_value TEXT,

  -- Impacto mensual en USD
  monthly_impact DECIMAL(12,2),

  -- Metadata
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by UUID, -- Si fue manual
  automatic BOOLEAN DEFAULT false, -- Si fue automático

  reason TEXT
);

CREATE INDEX idx_pricing_history_company ON pricing_change_history(company_id);
CREATE INDEX idx_pricing_history_date ON pricing_change_history(changed_at DESC);
```

---

### 🔄 Modificaciones a Tablas Existentes

#### **aponnt_staff** (Agregar campos de billetera)

```sql
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(50), -- 'mercado_pago', 'banco'
ADD COLUMN IF NOT EXISTS wallet_cbu VARCHAR(22),
ADD COLUMN IF NOT EXISTS wallet_alias VARCHAR(100),
ADD COLUMN IF NOT EXISTS wallet_usd_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wallet_updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS wallet_verified BOOLEAN DEFAULT false;

-- Índice
CREATE INDEX idx_staff_wallet ON aponnt_staff(wallet_cbu);
```

#### **contracts** (Agregar campos de firma digital)

```sql
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS signature_hash VARCHAR(64), -- SHA-256
ADD COLUMN IF NOT EXISTS signature_ip VARCHAR(45),
ADD COLUMN IF NOT EXISTS signature_user_agent TEXT,
ADD COLUMN IF NOT EXISTS eula_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eula_version VARCHAR(20);
```

#### **vendor_commissions** (Agregar estado de liquidación)

```sql
ALTER TABLE vendor_commissions
ADD COLUMN IF NOT EXISTS liquidation_id UUID REFERENCES commission_liquidations(id),
ADD COLUMN IF NOT EXISTS liquidated_at TIMESTAMP;

CREATE INDEX idx_commissions_liquidation ON vendor_commissions(liquidation_id);
```

---

## 5. SERVICIOS Y APIS

### 🛠️ Nuevos Servicios a Crear

#### **1. AponntExternalNotificationService**

```javascript
class AponntExternalNotificationService {
  /**
   * Enviar notificación multi-canal
   */
  async sendNotification({
    recipientType,
    recipientId,
    notificationType,
    title,
    message,
    channels = ['email'],
    requiresAction = false,
    actionDeadline = null,
    metadata = {}
  }) {
    // 1. Crear registro en aponnt_external_notifications
    // 2. Enviar por cada canal:
    //    - Email (AWS SES)
    //    - SMS (Twilio) si está en channels
    //    - Push (Firebase) si está en channels
    // 3. Registrar tracking de envío
    // 4. Si requiresAction, programar CRON para verificar deadline
  }

  /**
   * Procesar acción de notificación
   */
  async processAction(notificationId, action, userId) {
    // Marcar notificación como 'actioned'
    // Ejecutar lógica según action_type
  }

  /**
   * CRON: Verificar deadlines vencidos
   */
  async checkExpiredDeadlines() {
    // SELECT * FROM aponnt_external_notifications
    // WHERE requires_action = true
    // AND action_taken = false
    // AND action_deadline < NOW()

    // Por cada una:
    // - Marcar como 'expired'
    // - Revertir cambios si aplica (ej: wallet_change_requests)
    // - Enviar notificación de expiración
  }
}
```

#### **2. WalletManagementService**

```javascript
class WalletManagementService {
  /**
   * Solicitar cambio de billetera
   */
  async requestWalletChange(partnerId, newWalletData) {
    // 1. Validar formato CBU/Alias
    // 2. Verificar USD habilitado
    // 3. Crear registro en wallet_change_requests
    // 4. Generar token de confirmación
    // 5. Enviar notificación con deadline 48hs
    // 6. Programar expiración automática
  }

  /**
   * Confirmar cambio de billetera
   */
  async confirmWalletChange(token, ip, userAgent) {
    // 1. Validar token
    // 2. Verificar deadline no vencido
    // 3. Aplicar cambios en aponnt_staff
    // 4. Marcar request como 'confirmed'
    // 5. Enviar notificación de confirmación
  }

  /**
   * Expirar cambios no confirmados (CRON)
   */
  async expireUnconfirmedChanges() {
    // SELECT * FROM wallet_change_requests
    // WHERE status = 'pending_confirmation'
    // AND deadline < NOW()

    // Marcar como 'expired'
    // Enviar notificación
  }
}
```

#### **3. CommissionLiquidationService**

```javascript
class CommissionLiquidationService {
  /**
   * Liquidar comisiones mensuales (CRON - último día)
   */
  async liquidateMonthlyCommissions(year, month) {
    // 1. Agrupar comisiones pendientes por partner_id
    // 2. Por cada vendedor:
    //    - Sumar total del mes
    //    - Verificar billetera válida
    //    - Crear commission_liquidations
    //    - Marcar comisiones como 'liquidated'
    // 3. Generar archivo de transferencias masivas
    // 4. Enviar notificaciones
  }

  /**
   * Registrar transferencia bancaria
   */
  async registerBankTransfer(liquidationId, transactionId) {
    // 1. Crear registro en bank_transfers
    // 2. Marcar liquidation como 'transferred'
    // 3. Enviar notificación + SMS de confirmación
  }

  /**
   * Generar reporte de liquidaciones
   */
  async generateLiquidationReport(partnerId, year, month) {
    // PDF con detalle de comisiones liquidadas
  }
}
```

#### **4. ContractModificationService**

```javascript
class ContractModificationService {
  /**
   * Workflow completo de modificación de contrato
   */
  async modifyContract(companyId, newModules, reason) {
    // Ejecutar los 10 pasos del WORKFLOW 1
    // Retorna: { quoteId, contractId, status }
  }

  /**
   * Firma digital de contrato (EULA)
   */
  async signContract(contractId, userId, ip, userAgent) {
    // 1. Generar hash SHA-256 del contrato
    // 2. Registrar firma (timestamp, IP, user-agent)
    // 3. Marcar como 'signed'
    // 4. Activar contrato
    // 5. Enviar notificaciones
  }
}
```

---

### 🌐 Nuevos Endpoints API

```
POST   /api/notifications/external/send
GET    /api/notifications/external/my-notifications
POST   /api/notifications/external/:id/action

POST   /api/wallet/request-change
POST   /api/wallet/confirm-change/:token
GET    /api/wallet/pending-changes

POST   /api/commissions/liquidate-monthly
GET    /api/commissions/my-liquidations
GET    /api/commissions/liquidation-report/:id

POST   /api/contracts/modify
POST   /api/contracts/:id/sign
GET    /api/contracts/:id/pdf

GET    /api/vendors/my-commissions
GET    /api/vendors/my-clients
GET    /api/vendors/my-stats
```

---

## 6. SISTEMA DE FIRMA DIGITAL (EULA)

### ✍️ EULA (End User License Agreement)

#### ¿Por qué EULA es suficiente?

1. **Validez internacional**: EULA es reconocido mundialmente
2. **Evidencia digital**: Timestamp + IP + User-Agent
3. **Aceptación explícita**: Checkbox "Acepto términos y condiciones"
4. **Hash criptográfico**: SHA-256 del documento firmado
5. **No repudio**: Registro auditable en base de datos

#### Implementación

```javascript
// Al firmar contrato:
const contractData = {
  contractId: '123',
  companyId: '456',
  modules: [...],
  pricing: {...},
  termsVersion: 'EULA_2025_v1.0'
};

const contractString = JSON.stringify(contractData);
const hash = crypto.createHash('sha256').update(contractString).digest('hex');

await Contract.update({
  status: 'signed',
  signed_at: new Date(),
  signed_by_user_id: userId,
  signature_ip: req.ip,
  signature_user_agent: req.headers['user-agent'],
  signature_hash: hash,
  eula_accepted: true,
  eula_version: 'EULA_2025_v1.0'
}, {
  where: { id: contractId }
});
```

#### Contenido mínimo del EULA

```
CONTRATO DE LICENCIA DE USO DE SOFTWARE (EULA)

1. PARTES
   - Licenciante: Aponnt
   - Licenciatario: [Empresa]

2. OBJETO
   Licencia de uso del software de gestión biométrica

3. MÓDULOS CONTRATADOS
   [Lista de módulos]

4. PRECIO Y FORMA DE PAGO
   [Pricing mensual]

5. DURACIÓN
   Mensual, renovación automática

6. ACEPTACIÓN ELECTRÓNICA
   Al hacer click en "Acepto", el Licenciatario
   acepta todos los términos de este contrato.

   Evidencia de aceptación:
   - Fecha: [timestamp]
   - IP: [ip]
   - Usuario: [user]
   - Hash del documento: [sha256]

7. LEY APLICABLE
   Legislación de Argentina / Jurisdicción internacional
```

---

## 7. TRANSFERENCIAS BANCARIAS

### 💳 Requisitos de Billetera

#### Obligatorio para recibir liquidaciones:

1. **Tipo de billetera**: Mercado Pago o Banco
2. **CBU**: 22 dígitos (validado)
3. **Alias**: Formato válido
4. **USD habilitado**: OBLIGATORIO (checkbox marcado)

#### Proceso de liquidación:

```
1. Fin de mes: Sistema agrupa comisiones
2. Genera archivo CSV para banco:
   CBU, Monto, Referencia
3. Admin descarga CSV y ejecuta transferencia masiva
4. Admin registra transaction_id en sistema
5. Sistema envía notificaciones
```

#### Archivo CSV de transferencias:

```csv
cbu,monto,moneda,referencia,destinatario
0000003100012345678901,464.95,USD,COMM_2025_01_VENDOR_123,Juan Pérez
0000022200098765432109,89.50,USD,COMM_2025_01_LEADER_456,María González
```

---

## 8. TRAZABILIDAD COMPLETA

### 🔍 Auditoría de TODO el ciclo

```
PRESUPUESTO #456
  ↓
CONTRATO #789
  ├─ Firmado: 15/01/2025 14:30:15
  ├─ IP: 190.123.45.67
  ├─ Hash: a3f5b8c9d2e1f4...
  └─ EULA: v1.0
  ↓
FACTURAS
  ├─ #2025-01-0001 (Enero)   → $2,299
  ├─ #2025-02-0001 (Febrero) → $2,424 (+$125)
  └─ #2025-03-0001 (Marzo)   → $2,424
  ↓
PAGOS
  ├─ Pago #1 (15/01) → $2,299
  ├─ Pago #2 (10/02) → $2,424
  └─ Pago #3 (12/03) → $2,424
  ↓
COMISIONES
  ├─ Vendedor: $114.95 + $121.20 + $121.20 = $357.35
  ├─ Líder: $11.49 + $12.12 + $12.12 = $35.73
  └─ Soporte: $68.97 + $72.72 + $72.72 = $214.41
  ↓
LIQUIDACIONES
  ├─ Enero: $195.41 (3 comisiones)
  ├─ Febrero: $206.04 (3 comisiones)
  └─ Marzo: $206.04 (3 comisiones)
  ↓
TRANSFERENCIAS
  ├─ Transferencia #1 (31/01) → Ref: BANK_ABC_123
  ├─ Transferencia #2 (28/02) → Ref: BANK_ABC_456
  └─ Transferencia #3 (31/03) → Ref: BANK_ABC_789
```

### 📊 Queries de trazabilidad

```sql
-- Ver ciclo completo de una empresa
SELECT
  c.name AS empresa,
  co.id AS contract_id,
  co.status AS contract_status,
  i.invoice_number,
  i.total_amount AS facturado,
  p.amount AS pagado,
  vc.commission_amount AS comision,
  vc.commission_type,
  cl.total_amount AS liquidado,
  bt.transaction_id AS transferencia_ref
FROM companies c
LEFT JOIN contracts co ON c.company_id = co.company_id
LEFT JOIN invoices i ON co.company_id = i.company_id
LEFT JOIN payments p ON i.id = p.invoice_id
LEFT JOIN vendor_commissions vc ON p.id = vc.payment_id
LEFT JOIN commission_liquidations cl ON vc.liquidation_id = cl.id
LEFT JOIN bank_transfers bt ON cl.id = bt.liquidation_id
WHERE c.company_id = 123
ORDER BY i.billing_period_year DESC, i.billing_period_month DESC;
```

---

## 9. ROADMAP DE IMPLEMENTACIÓN

### 🗓️ Fases de Desarrollo

#### **FASE 1: Base de Datos y Servicios Core** (2 semanas)
- [ ] Crear nuevas tablas (aponnt_external_notifications, etc.)
- [ ] Modificar tablas existentes (aponnt_staff, contracts, etc.)
- [ ] Migrar datos de vendors.json → aponnt_staff (si aplica)
- [ ] Crear AponntExternalNotificationService
- [ ] Crear WalletManagementService
- [ ] Testing de servicios

#### **FASE 2: Workflows de Contratos y Facturación** (3 semanas)
- [ ] Implementar WORKFLOW 1 (Modificación de contratos - 10 pasos)
- [ ] Implementar WORKFLOW 2 (Facturación mensual automática)
- [ ] Sistema de firma digital (EULA)
- [ ] CRON jobs para facturación
- [ ] Testing end-to-end de contratos

#### **FASE 3: Comisiones y Liquidaciones** (2 semanas)
- [ ] Implementar WORKFLOW 3 (Liquidación de comisiones)
- [ ] CommissionLiquidationService
- [ ] CRON job de liquidación mensual
- [ ] Generación de archivos CSV para banco
- [ ] Testing de cálculos de comisiones

#### **FASE 4: Gestión de Billeteras** (1 semana)
- [ ] Implementar WORKFLOW 4 (Cambio de billetera con confirmación)
- [ ] Sistema de confirmación con deadline (48hs)
- [ ] CRON job para expirar cambios no confirmados
- [ ] Testing de flujo completo

#### **FASE 5: Alta/Modificación de Vendedores** (1 semana)
- [ ] Implementar WORKFLOW 5 (Alta/modificación de vendedor)
- [ ] Notificaciones de bienvenida
- [ ] Historial de cambios en vendedores
- [ ] Testing

#### **FASE 6: Cambios en Empresas** (1 semana)
- [ ] Implementar WORKFLOW 6 (Cambios en módulos/pricing)
- [ ] Pricing automático según cantidad
- [ ] Notificaciones de impacto en comisiones
- [ ] Testing

#### **FASE 7: Notificaciones Multi-Canal** (2 semanas)
- [ ] Integración con AWS SES (Email)
- [ ] Integración con Twilio (SMS)
- [ ] Integración con Firebase (Push)
- [ ] Templates de emails en HTML
- [ ] Testing de todos los canales

#### **FASE 8: Dashboards y Reportes** (2 semanas)
- [ ] Dashboard para vendedores (mis comisiones)
- [ ] Dashboard para admins (liquidaciones pendientes)
- [ ] Reportes en PDF (liquidaciones, comisiones)
- [ ] Exportación a Excel
- [ ] Testing de visualización

#### **FASE 9: Auditoría y Trazabilidad** (1 semana)
- [ ] Queries de trazabilidad completa
- [ ] Logs de cambios críticos
- [ ] Alertas automáticas de anomalías
- [ ] Testing de auditoría

#### **FASE 10: Testing Final y Deploy** (1 semana)
- [ ] Testing end-to-end completo
- [ ] Testing de carga (CRON jobs con muchos datos)
- [ ] Documentación final
- [ ] Deploy a producción
- [ ] Monitoreo post-deploy

---

## 🎯 TOTAL ESTIMADO: 16 semanas (4 meses)

---

## 📝 NOTAS FINALES

### ⚠️ Puntos Críticos

1. **Separación de notificaciones**:
   - `notifications` (Enterprise) → Comunicaciones DENTRO de empresas
   - `aponnt_external_notifications` → Comunicaciones Aponnt ↔ Externos

2. **Billeteras con USD**:
   - OBLIGATORIO tener USD habilitado
   - Validar en cada transferencia

3. **Confirmación de cambios críticos**:
   - Cambio de billetera: 48hs de deadline
   - Modificación de contrato: 7 días de deadline

4. **CRON jobs críticos**:
   - Facturación: Día 1 de cada mes (00:00)
   - Liquidación: Último día de cada mes (23:59)
   - Verificar deadlines: Diario (cada 1 hora)

5. **Trazabilidad**:
   - TODO debe ser auditable
   - Timestamps en UTC
   - IPs y User-Agents registrados

### 🚀 Próximos Pasos

1. ✅ Aprobar esta arquitectura
2. ✅ Crear issues/tickets por fase
3. ✅ Asignar prioridades
4. ✅ Comenzar implementación FASE 1

---

**FIN DEL DOCUMENTO**

Versión: 1.0.0
Fecha: 2025-01-19
Autor: Claude (Engineering Team)
Estado: ✅ LISTO PARA IMPLEMENTACIÓN
