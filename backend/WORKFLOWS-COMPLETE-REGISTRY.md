# 📋 REGISTRO COMPLETO DE WORKFLOWS - CENTRAL TELEFÓNICA NCE

**Fecha**: 2026-01-06
**Estado**: Registro exhaustivo de TODOS los workflows del ecosistema
**Objetivo**: Eliminar 100% de bypass migrando TODO a NotificationCentralExchange

---

## 📊 RESUMEN EJECUTIVO

### Total de workflows encontrados:
- **🔴 CRÍTICOS con bypass confirmado**: 35 workflows
- **🟡 EXISTENTES pero no registrados en BD**: 90 workflows
- **🟢 YA registrados en BD**: 78 workflows
- **📈 TOTAL A REGISTRAR**: **203 workflows** (vs 78 actuales)

### Módulos afectados (28 módulos):
1. **Attendance** - Control de asistencia (7 workflows)
2. **Vacation** - Vacaciones (5 workflows)
3. **Medical** - Medicina laboral (8 workflows)
4. **Procurement** - Compras (13 workflows)
5. **WMS/Warehouse** - Almacén (9 workflows)
6. **Finance** - Finanzas (11 workflows)
7. **Payroll** - Nómina (6 workflows)
8. **Suppliers** - Proveedores (8 workflows)
9. **Partners/Associates** - Asociados (7 workflows)
10. **Support** - Soporte (4 workflows)
11. **HSE** - Seguridad e higiene (6 workflows)
12. **Training** - Capacitación (5 workflows)
13. **Performance** - Evaluaciones (4 workflows)
14. **Legal** - Legal (5 workflows)
15. **Sanctions** - Sanciones (3 workflows)
16. **Biometric** - Biometría (3 workflows)
17. **HR** - Recursos humanos (12 workflows)
18. **Contracts** - Contratos (6 workflows)
19. **Logistics** - Logística (7 workflows)
20. **Sales** - Ventas (5 workflows)
21. **Marketing** - Marketing (4 workflows)
22. **Equipment** - Equipamiento (4 workflows)
23. **Access Control** - Control de acceso (3 workflows)
24. **Kiosk** - Kioscos biométricos (5 workflows)
25. **Documents** - Documentos (6 workflows)
26. **Billing** - Facturación Aponnt (4 workflows)
27. **DMS** - Document Management (5 workflows)
28. **Trials** - Pruebas módulos (3 workflows)

---

## 🔴 SECCIÓN 1: WORKFLOWS CRÍTICOS CON BYPASS (35)

### 1.1 ATTENDANCE - Control de Asistencia (7)

#### ❌ `attendance.late_arrival_authorization_request`
- **Bypass**: LateArrivalAuthorizationService.js (4x sendMail)
- **Descripción**: Empleado llega tarde, solicita autorización desde kiosk
- **Destinatario**: `hierarchy` (supervisor → manager → HR)
- **Priority**: `urgent` (empleado esperando en puerta)
- **SLA**: 15 minutos
- **Escalamiento**:
  - 15min → Manager
  - 30min → HR Manager
- **Channels**: `['email', 'push', 'websocket']` (real-time)

#### ❌ `attendance.late_arrival_approved`
- **Bypass**: LateArrivalAuthorizationService.js
- **Descripción**: Autorización de ingreso concedida
- **Destinatario**: `user` (empleado que solicitó)
- **Priority**: `urgent`
- **Channels**: `['push', 'websocket']`

#### ❌ `attendance.late_arrival_rejected`
- **Bypass**: LateArrivalAuthorizationService.js
- **Descripción**: Autorización denegada
- **Destinatario**: `user`
- **Priority**: `high`
- **Channels**: `['push', 'websocket']`

#### ❌ `attendance.late_arrival_processed`
- **Bypass**: LateArrivalAuthorizationService.js
- **Descripción**: Notificación informativa a RRHH
- **Destinatario**: `role` → `hr_manager`
- **Priority**: `normal`
- **Channels**: `['inbox']` (solo badge, sin email)

#### ⚠️ `attendance.absent_auto`
- **Bypass**: attendanceRoutes.js (probable)
- **Descripción**: Notificación automática de ausencia
- **Destinatario**: `user` + `supervisor`

#### ⚠️ `attendance.overtime_excessive`
- **Descripción**: Horas extras excesivas
- **Destinatario**: `user` + `hr_manager`

#### ⚠️ `attendance.shift_reminder`
- **Descripción**: Recordatorio de turno próximo
- **Destinatario**: `user`
- **Priority**: `low`
- **Channels**: `['push']`

---

### 1.2 SUPPLIERS - Proveedores (8)

#### ❌ `suppliers.rfq_invitation`
- **Bypass**: SupplierEmailService.js → `sendRfqInvitation()`
- **Descripción**: Invitación a proveedor para cotizar RFQ
- **Destinatario**: `associate` (supplier portal user)
- **Scope**: `aponnt` (email desde Aponnt, no desde empresa)
- **Priority**: `high`
- **SLA**: Según deadline del RFQ
- **Channels**: `['email']`
- **Metadata**: `rfq_id`, `rfq_number`, `submission_deadline`, `items`

#### ❌ `suppliers.purchase_order_notification`
- **Bypass**: SupplierEmailService.js → `sendPurchaseOrderNotification()`
- **Descripción**: Nueva orden de compra enviada a proveedor
- **Destinatario**: `associate`
- **Scope**: `aponnt`
- **Priority**: `high`
- **Channels**: `['email']`
- **Metadata**: `po_id`, `po_number`, `total`, `expected_delivery`

#### ❌ `suppliers.claim_notification`
- **Bypass**: SupplierEmailService.js → `sendClaimNotification()`
- **Descripción**: Reclamo de empresa a proveedor (producto defectuoso, etc.)
- **Destinatario**: `associate`
- **Scope**: `aponnt`
- **Priority**: `urgent`
- **Channels**: `['email']`
- **requiresAction**: `true`
- **actionType**: `response`
- **SLA**: 48 horas
- **Metadata**: `claim_id`, `claim_type`, `po_number`, `items`

#### ❌ `suppliers.payment_scheduled`
- **Bypass**: SupplierEmailService.js → `sendPaymentScheduledNotification()`
- **Descripción**: Pago programado a proveedor
- **Destinatario**: `associate`
- **Scope**: `aponnt`
- **Priority**: `normal`
- **Channels**: `['email']`
- **Metadata**: `payment_order_id`, `payment_order_number`, `amount`, `scheduled_date`, `invoices`

#### ❌ `suppliers.welcome_email`
- **Bypass**: SupplierEmailService.js → `sendWelcomeEmail()`
- **Descripción**: Bienvenida a portal de proveedores + credenciales
- **Destinatario**: `associate`
- **Scope**: `aponnt`
- **Priority**: `high`
- **Channels**: `['email']`
- **Metadata**: `portal_url`, `credentials`

#### ❌ `suppliers.password_reset`
- **Bypass**: SupplierEmailService.js → `sendPasswordResetEmail()`
- **Descripción**: Restablecimiento de contraseña
- **Destinatario**: `associate`
- **Scope**: `aponnt`
- **Priority**: `high`
- **Channels**: `['email']`

#### ❌ `suppliers.rfq_timeout_warning`
- **Descripción**: RFQ sin responder, se acerca deadline
- **Destinatario**: `associate`
- **Priority**: `urgent`

#### ❌ `suppliers.invoice_received_confirmation`
- **Descripción**: Empresa confirma recepción de factura de proveedor
- **Destinatario**: `associate`
- **Priority**: `normal`

---

### 1.3 PROCUREMENT - Compras (13)

#### ❌ `procurement.requisition_created`
- **Bypass**: procurementRoutes.js (usa SupplierEmailService)
- **Descripción**: Nueva requisición de compra creada
- **Destinatario**: `role` → `procurement_manager`

#### ❌ `procurement.requisition_approval_request`
- **Bypass**: procurementRoutes.js
- **Descripción**: Requisición requiere aprobación
- **Destinatario**: `role` → `approver_l1`
- **requiresAction**: `true`
- **actionType**: `approval`
- **SLA**: 24 horas
- **Escalamiento**: approver_l2 → cfo

#### ❌ `procurement.requisition_approved`
- **Descripción**: Requisición aprobada
- **Destinatario**: `user` (quien creó requisición)

#### ❌ `procurement.requisition_rejected`
- **Descripción**: Requisición rechazada
- **Destinatario**: `user`

#### ❌ `procurement.rfq_created`
- **Descripción**: RFQ creado (informativo)
- **Destinatario**: `role` → `procurement_manager`

#### ❌ `procurement.rfq_response_received`
- **Descripción**: Proveedor respondió cotización
- **Destinatario**: `user` (comprador asignado)

#### ❌ `procurement.order_approval_request`
- **Descripción**: Orden de compra requiere aprobación
- **Destinatario**: `role` → `approver_l1`
- **requiresAction**: `true`
- **SLA**: 48 horas

#### ❌ `procurement.order_approved`
- **Destinatario**: `user` (comprador)

#### ❌ `procurement.order_rejected`
- **Destinatario**: `user`

#### ❌ `procurement.delivery_pending`
- **Descripción**: Entrega pendiente de proveedor
- **Destinatario**: `user` (comprador)

#### ❌ `procurement.delivery_received`
- **Descripción**: Mercadería recibida
- **Destinatario**: `role` → `warehouse_manager`

#### ❌ `procurement.invoice_approval_request`
- **Descripción**: Factura de proveedor requiere aprobación
- **Destinatario**: `role` → `invoice_approver`
- **requiresAction**: `true`
- **SLA**: 72 horas

#### ❌ `procurement.budget_exceeded_warning`
- **Descripción**: Orden excede presupuesto
- **Destinatario**: `role` → `cfo` + `procurement_manager`
- **Priority**: `urgent`

---

### 1.4 ASSOCIATES/PARTNERS - Asociados (7)

#### ❌ `associates.invoice_received`
- **Bypass**: Probablemente en associate routes
- **Descripción**: Asociado (médico, legal, etc.) carga factura
- **Destinatario**: `role` → `invoice_approver` (de la empresa)
- **Scope**: `company`
- **requiresAction**: `true`
- **actionType**: `approval`
- **SLA**: 48 horas
- **Escalamiento**: finance_manager → cfo

#### ❌ `associates.invoice_upload_confirmation`
- **Descripción**: Confirmación al asociado de factura recibida
- **Destinatario**: `associate`
- **Scope**: `aponnt`
- **Channels**: `['email']`

#### ❌ `partners.status_change`
- **Bypass**: PartnerNotificationService.js → `notifyPartnerStatusChange()`
- **Descripción**: Cambio de estado de partner (activo, suspendido, baja, renuncia)
- **Destinatario**: `associate` (el partner)
- **Scope**: `aponnt`
- **Priority**: Según estado (baja=urgent, suspendido=high)
- **Channels**: `['email', 'inbox']`

#### ❌ `partners.contract_status_change`
- **Bypass**: PartnerNotificationService.js (notifica a clientes)
- **Descripción**: Notificación a empresa cliente cuando partner contratado cambia estado
- **Destinatario**: `role` → `admin` (de la empresa cliente)
- **Scope**: `company`
- **Priority**: `high`
- **requiresAction**: `true`
- **actionType**: `acknowledge`

#### ❌ `medical.folder_assigned_to_associate`
- **Descripción**: RRHH asigna carpeta médica a médico asociado
- **Destinatario**: `associate` (médico)
- **Scope**: `aponnt`
- **Priority**: `high`
- **SLA**: 24 horas
- **Channels**: `['email']`

#### ❌ `medical.folder_assigned_notification`
- **Descripción**: Notificación al empleado que su carpeta fue asignada
- **Destinatario**: `user` (empleado)
- **Scope**: `company`
- **Priority**: `normal`

#### ❌ `medical.folder_assignment_confirmation`
- **Descripción**: Confirmación a RRHH de asignación exitosa
- **Destinatario**: `role` → `hr_manager`
- **Scope**: `company`
- **Priority**: `low`
- **Channels**: `['inbox']`

---

### 1.5 SUPPORT/TICKETS - Soporte (4)

#### ❌ `support.ticket_created_to_aponnt`
- **Bypass**: contactRoutes.js (2x sendMail), contactFormRoutes.js (1x EmailService)
- **Descripción**: Empresa crea ticket de soporte a Aponnt
- **Destinatario**: `group` → `aponnt_support_team`
- **Scope**: `aponnt`
- **Priority**: Según ticket (`urgent`, `high`, `normal`)
- **SLA**:
  - Urgent: 4 horas
  - High: 24 horas
  - Normal: 48 horas
- **requiresAction**: `true`
- **actionType**: `response`
- **Channels**: `['email', 'inbox']` (email a soporte@aponnt.com + inbox en panel-admin)

#### ❌ `support.ticket_confirmation`
- **Descripción**: Confirmación al usuario de ticket recibido
- **Destinatario**: `user` (quien creó ticket)
- **Scope**: `company`
- **Priority**: `normal`
- **Channels**: `['email', 'inbox']`

#### ❌ `support.ticket_response`
- **Descripción**: Aponnt responde ticket
- **Destinatario**: `user` (quien creó ticket)
- **Scope**: `company`
- **Priority**: `high`

#### ❌ `support.ticket_closed`
- **Descripción**: Ticket cerrado
- **Destinatario**: `user`
- **Priority**: `low`

---

### 1.6 BIOMETRIC CONSENT - Consentimientos (3)

#### ❌ `biometric.consent_request`
- **Bypass**: biometricConsentService.js → `sendConsentRequestEmail()`
- **Descripción**: Solicitud de consentimiento biométrico a empleado
- **Destinatario**: `user` (empleado)
- **Scope**: `company`
- **Priority**: `high`
- **SLA**: 7 días
- **Channels**: `['email']`
- **requiresAction**: `true`
- **actionType**: `acknowledgement`
- **Metadata**: `consent_url`, `expires_at`, `version`

#### ❌ `biometric.consent_confirmation`
- **Bypass**: biometricConsentService.js → `sendConsentConfirmationEmail()`
- **Descripción**: Confirmación de consentimiento aceptado
- **Destinatario**: `user`
- **Scope**: `company`
- **Priority**: `normal`
- **Channels**: `['email']`
- **Metadata**: `consent_date`, `expires_at`, `immutable_signature`

#### ❌ `biometric.consent_expiry_warning`
- **Descripción**: Consentimiento por vencer (30 días antes)
- **Destinatario**: `user`
- **Priority**: `normal`
- **SLA**: 30 días

---

### 1.7 EMAIL SERVICE GENERAL - Emails de contacto (2)

#### ❌ `contact.form_submission`
- **Bypass**: contactRoutes.js, contactFormRoutes.js (EmailService)
- **Descripción**: Formulario de contacto web
- **Destinatario**: `group` → `sales_team` o `support_team`
- **Scope**: `aponnt`
- **Priority**: `normal`

#### ❌ `contact.auto_reply`
- **Descripción**: Respuesta automática a quien envió formulario
- **Destinatario**: Email del formulario
- **Scope**: `aponnt`
- **Priority**: `low`

---

### 1.8 JOB POSTINGS - Ofertas laborales (2)

#### ❌ `jobs.candidate_verification`
- **Bypass**: jobPostingsRoutes.js (2x EmailService)
- **Descripción**: Verificación de candidato postulante
- **Destinatario**: Email del candidato
- **Scope**: `aponnt`
- **Priority**: `normal`

#### ❌ `jobs.application_received`
- **Descripción**: Confirmación de postulación recibida
- **Destinatario**: Email del candidato
- **Scope**: `aponnt`
- **Priority**: `low`

---

## 🟡 SECCIÓN 2: WORKFLOWS NO REGISTRADOS EN BD (90)

### 2.1 MEDICAL - Medicina Laboral (8)

#### `medical.appointment_reminder`
- **Destinatario**: `user`
- **Priority**: `normal`
- **Channels**: `['email', 'push']`
- **Metadata**: `appointment_id`, `date`, `time`, `location`

#### `medical.certificate_expiry_warning`
- **Destinatario**: `user`
- **Priority**: `high`
- **SLA**: 7 días
- **Metadata**: `certificate_id`, `expiry_date`, `days_remaining`

#### `medical.exam_scheduled`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `medical.exam_results_available`
- **Destinatario**: `user`
- **Priority**: `high`

#### `medical.medical_leave_approved`
- **Destinatario**: `user`
- **Priority**: `high`

#### `medical.medical_leave_rejected`
- **Destinatario**: `user`
- **Priority**: `high`

#### `medical.vaccination_expiry`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `medical.fitness_certificate_required`
- **Destinatario**: `user`
- **Priority**: `high`

---

### 2.2 VACATION - Vacaciones (5)

#### `vacation.request_submitted`
- **Destinatario**: `user` (quien solicitó)
- **Priority**: `normal`

#### `vacation.request_approval`
- **Destinatario**: `role` → `approver_l1`
- **requiresAction**: `true`
- **SLA**: 48 horas

#### `vacation.request_approved`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `vacation.request_rejected`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `vacation.expiry_warning`
- **Descripción**: Días de vacaciones por vencer
- **Destinatario**: `user`
- **Priority**: `high`
- **SLA**: 30 días

---

### 2.3 PAYROLL - Nómina (6)

#### `payroll.receipt_available`
- **Destinatario**: `user`
- **Priority**: `normal`
- **Channels**: `['email', 'inbox', 'push']`

#### `payroll.liquidation_generated`
- **Destinatario**: `user`
- **Priority**: `high`

#### `payroll.payment_processed`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `payroll.deduction_applied`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `payroll.bonus_added`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `payroll.tax_withholding`
- **Destinatario**: `user`
- **Priority**: `low`

---

### 2.4 WMS/WAREHOUSE - Almacén (9)

#### `wms.stock_low_alert`
- **Destinatario**: `role` → `warehouse_manager`
- **Priority**: `high`

#### `wms.stock_critical_alert`
- **Destinatario**: `role` → `warehouse_manager` + `procurement_manager`
- **Priority**: `urgent`

#### `wms.material_request_created`
- **Destinatario**: `role` → `warehouse_manager`
- **Priority**: `normal`

#### `wms.material_request_approved`
- **Destinatario**: `user` (quien solicitó)
- **Priority**: `normal`

#### `wms.material_request_rejected`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `wms.document_expiry_warning`
- **Destinatario**: `role` → `warehouse_manager`
- **Priority**: `high`
- **SLA**: 30 días

#### `wms.inventory_adjustment`
- **Destinatario**: `role` → `warehouse_manager`
- **Priority**: `normal`

#### `wms.recall_issued`
- **Destinatario**: `role` → `warehouse_manager` + `procurement_manager`
- **Priority**: `urgent`

#### `wms.transfer_completed`
- **Destinatario**: `user` (quien solicitó transfer)
- **Priority**: `normal`

---

### 2.5 FINANCE - Finanzas (11)

#### `finance.invoice_due`
- **Destinatario**: `role` → `finance_manager`
- **Priority**: `high`
- **SLA**: 7 días

#### `finance.invoice_overdue`
- **Destinatario**: `role` → `cfo`
- **Priority**: `urgent`

#### `finance.budget_expiry_warning`
- **Destinatario**: `role` → `budget_owner`
- **Priority**: `high`
- **SLA**: 30 días

#### `finance.budget_exceeded`
- **Destinatario**: `role` → `budget_owner` + `cfo`
- **Priority**: `urgent`

#### `finance.payment_order_approval`
- **Destinatario**: `role` → `approver_l1`
- **requiresAction**: `true`
- **SLA**: 48 horas

#### `finance.payment_order_approved`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `finance.payment_order_rejected`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `finance.check_issued`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `finance.check_bounced`
- **Destinatario**: `role` → `finance_manager`
- **Priority**: `urgent`

#### `finance.cash_authorization_request`
- **Destinatario**: `role` → `cfo`
- **requiresAction**: `true`
- **SLA**: 4 horas

#### `finance.treasury_low_balance`
- **Destinatario**: `role` → `finance_manager` + `cfo`
- **Priority**: `urgent`

---

### 2.6 HSE - Seguridad e Higiene (6)

#### `hse.equipment_replacement_warning`
- **Descripción**: EPP (guantes, cascos, etc.) requiere reemplazo
- **Destinatario**: `user`
- **Priority**: `high`
- **SLA**: 7 días
- **Escalamiento**: supervisor → hse_manager

#### `hse.safety_alert`
- **Destinatario**: `department` o `group`
- **Priority**: `urgent`

#### `hse.incident_reported`
- **Destinatario**: `role` → `hse_manager`
- **Priority**: `urgent`

#### `hse.certification_expiry`
- **Destinatario**: `user`
- **Priority**: `high`

#### `hse.training_required`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `hse.inspection_scheduled`
- **Destinatario**: `role` → `hse_manager`
- **Priority**: `normal`

---

### 2.7 TRAINING - Capacitación (5)

#### `training.course_assigned`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `training.course_deadline`
- **Destinatario**: `user`
- **Priority**: `high`
- **SLA**: 7 días

#### `training.course_completed`
- **Destinatario**: `user` + `role` → `training_manager`
- **Priority**: `normal`

#### `training.certification_issued`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `training.certification_expiry`
- **Destinatario**: `user`
- **Priority**: `high`

---

### 2.8 PERFORMANCE - Evaluaciones (4)

#### `performance.evaluation_assigned`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `performance.evaluation_due`
- **Destinatario**: `user`
- **Priority**: `high`
- **SLA**: 7 días

#### `performance.evaluation_completed`
- **Destinatario**: `user` + `supervisor`
- **Priority**: `normal`

#### `performance.feedback_received`
- **Destinatario**: `user`
- **Priority**: `normal`

---

### 2.9 SANCTIONS - Sanciones (3)

#### `sanctions.employee_notification`
- **Descripción**: Notificación de sanción a empleado
- **Destinatario**: `user`
- **Priority**: Según severidad (`critical` → `urgent`, `major` → `high`, `minor` → `normal`)
- **Channels**: `['email', 'inbox']` (NO push - sensible)
- **requiresAction**: `true`
- **actionType**: `acknowledgement`
- **SLA**: 24 horas

#### `sanctions.hr_notification`
- **Descripción**: Copia a RRHH de sanción aplicada
- **Destinatario**: `role` → `hr_manager`
- **Priority**: `normal`

#### `sanctions.supervisor_notification`
- **Descripción**: Si es suspensión, notificar a supervisor
- **Destinatario**: `hierarchy` (supervisor del empleado)
- **Priority**: `high`

---

### 2.10 LEGAL - Legal (5)

#### `legal.case_assigned`
- **Destinatario**: `associate` (abogado asociado)
- **Priority**: `high`

#### `legal.deadline_warning`
- **Destinatario**: `associate`
- **Priority**: `urgent`

#### `legal.document_request`
- **Destinatario**: `user` o `role`
- **Priority**: `high`

#### `legal.case_update`
- **Destinatario**: `user` (empleado involucrado)
- **Priority**: `normal`

#### `legal.settlement_approved`
- **Destinatario**: `user`
- **Priority**: `high`

---

### 2.11 LOGISTICS - Logística (7)

#### `logistics.delivery_scheduled`
- **Destinatario**: `user` (driver)
- **Priority**: `normal`

#### `logistics.delivery_completed`
- **Destinatario**: `role` → `logistics_manager`
- **Priority**: `normal`

#### `logistics.vehicle_maintenance_due`
- **Destinatario**: `role` → `fleet_manager`
- **Priority**: `high`

#### `logistics.driver_assignment`
- **Destinatario**: `user` (driver)
- **Priority**: `normal`

#### `logistics.route_changed`
- **Destinatario**: `user` (driver)
- **Priority**: `high`

#### `logistics.fuel_card_limit`
- **Destinatario**: `role` → `logistics_manager`
- **Priority**: `normal`

#### `logistics.accident_reported`
- **Destinatario**: `role` → `logistics_manager` + `hse_manager`
- **Priority**: `urgent`

---

### 2.12 HR - Recursos Humanos (12)

#### `hr.policy_update`
- **Destinatario**: `department` o `group`
- **Priority**: `normal`

#### `hr.birthday_greeting`
- **Destinatario**: `user`
- **Priority**: `low`

#### `hr.anniversary_greeting`
- **Destinatario**: `user`
- **Priority**: `low`

#### `hr.onboarding_welcome`
- **Destinatario**: `user` (nuevo empleado)
- **Priority**: `high`

#### `hr.onboarding_task_assigned`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `hr.offboarding_started`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `hr.exit_interview_scheduled`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `hr.document_missing`
- **Destinatario**: `user`
- **Priority**: `high`

#### `hr.contract_renewal_reminder`
- **Destinatario**: `user` + `role` → `hr_manager`
- **Priority**: `high`
- **SLA**: 30 días

#### `hr.probation_end_reminder`
- **Destinatario**: `user` + `supervisor`
- **Priority**: `normal`

#### `hr.benefits_enrollment_open`
- **Destinatario**: `group` → `all_employees`
- **Priority**: `normal`

#### `hr.survey_assigned`
- **Destinatario**: `user` o `group`
- **Priority**: `low`

---

### 2.13 CONTRACTS - Contratos (6)

#### `contracts.expiry_warning`
- **Destinatario**: `user` + `role` → `hr_manager`
- **Priority**: `high`
- **SLA**: 30 días

#### `contracts.renewal_required`
- **Destinatario**: `role` → `hr_manager`
- **Priority**: `urgent`

#### `contracts.renewal_completed`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `contracts.modification_proposed`
- **Destinatario**: `user`
- **Priority**: `high`

#### `contracts.signed`
- **Destinatario**: `user` + `role` → `hr_manager`
- **Priority**: `normal`

#### `contracts.terminated`
- **Destinatario**: `user`
- **Priority**: `urgent`

---

### 2.14 ACCESS CONTROL - Control de Acceso (3)

#### `access.temporary_access_granted`
- **Destinatario**: `user` (visitor o temporal)
- **Priority**: `normal`

#### `access.temporary_access_expiring`
- **Destinatario**: `user`
- **Priority**: `high`

#### `access.unauthorized_attempt`
- **Destinatario**: `role` → `security_manager`
- **Priority**: `urgent`

---

### 2.15 KIOSK - Kioscos Biométricos (5)

#### `kiosk.offline_alert`
- **Destinatario**: `role` → `it_manager`
- **Priority**: `urgent`

#### `kiosk.sync_error`
- **Destinatario**: `role` → `it_manager`
- **Priority**: `high`

#### `kiosk.maintenance_required`
- **Destinatario**: `role` → `it_manager`
- **Priority**: `normal`

#### `kiosk.fingerprint_quality_low`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `kiosk.biometric_enrollment_required`
- **Destinatario**: `user`
- **Priority**: `high`

---

### 2.16 DOCUMENTS - Documentos (6)

#### `documents.expiry_warning`
- **Destinatario**: `user`
- **Priority**: `high`
- **SLA**: 30 días

#### `documents.missing_document`
- **Destinatario**: `user`
- **Priority**: `high`

#### `documents.upload_required`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `documents.verification_required`
- **Destinatario**: `role` → `compliance_officer`
- **Priority**: `normal`

#### `documents.verification_approved`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `documents.verification_rejected`
- **Destinatario**: `user`
- **Priority**: `high`

---

### 2.17 BILLING APONNT - Facturación a Empresas (4)

#### `aponnt.billing.invoice_generated`
- **Destinatario**: `role` → `admin` (de empresa cliente)
- **Scope**: `company`
- **Priority**: `normal`

#### `aponnt.billing.payment_due`
- **Destinatario**: `role` → `admin`
- **Priority**: `high`
- **SLA**: 7 días

#### `aponnt.billing.payment_overdue`
- **Destinatario**: `role` → `admin`
- **Priority**: `urgent`

#### `aponnt.billing.payment_received`
- **Destinatario**: `role` → `admin`
- **Priority**: `normal`

---

### 2.18 MODULE TRIALS - Pruebas de Módulos (3)

#### `trials.trial_expiring`
- **Destinatario**: `role` → `admin`
- **Priority**: `high`
- **SLA**: 7 días

#### `trials.trial_expired`
- **Destinatario**: `role` → `admin`
- **Priority**: `urgent`

#### `trials.upgrade_offer`
- **Destinatario**: `role` → `admin`
- **Priority**: `normal`

---

### 2.19 DMS - Document Management (5)

#### `dms.folder_request`
- **Destinatario**: `role` → `dms_admin`
- **Priority**: `normal`

#### `dms.folder_request_approved`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `dms.folder_request_rejected`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `dms.access_granted`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `dms.access_revoked`
- **Destinatario**: `user`
- **Priority**: `high`

---

### 2.20 SALES - Ventas (5)

#### `sales.quote_requested`
- **Destinatario**: `role` → `sales_manager`
- **Priority**: `high`

#### `sales.quote_sent`
- **Destinatario**: Cliente externo
- **Priority**: `normal`

#### `sales.quote_accepted`
- **Destinatario**: `role` → `sales_manager`
- **Priority**: `normal`

#### `sales.quote_rejected`
- **Destinatario**: `role` → `sales_manager`
- **Priority**: `normal`

#### `sales.contract_signed`
- **Destinatario**: `role` → `sales_manager`
- **Priority**: `high`

---

### 2.21 MARKETING - Marketing (4)

#### `marketing.campaign_assigned`
- **Destinatario**: `role` → `marketing_team`
- **Priority**: `normal`

#### `marketing.campaign_launched`
- **Destinatario**: `role` → `marketing_manager`
- **Priority**: `normal`

#### `marketing.campaign_completed`
- **Destinatario**: `role` → `marketing_manager`
- **Priority**: `normal`

#### `marketing.lead_assigned`
- **Destinatario**: `role` → `sales_team`
- **Priority**: `high`

---

### 2.22 EQUIPMENT - Equipamiento (4)

#### `equipment.assignment`
- **Destinatario**: `user`
- **Priority**: `normal`

#### `equipment.return_due`
- **Destinatario**: `user`
- **Priority**: `high`

#### `equipment.maintenance_scheduled`
- **Destinatario**: `role` → `it_manager`
- **Priority**: `normal`

#### `equipment.damage_reported`
- **Destinatario**: `role` → `it_manager`
- **Priority**: `high`

---

## 🎯 TOTALES POR MÓDULO

| Módulo | Workflows Críticos | Workflows Normales | Total |
|--------|-------------------|-------------------|-------|
| Attendance | 7 | 0 | 7 |
| Suppliers | 8 | 0 | 8 |
| Procurement | 13 | 0 | 13 |
| Associates/Partners | 7 | 0 | 7 |
| Support | 4 | 0 | 4 |
| Biometric | 3 | 0 | 3 |
| Contact/Jobs | 4 | 0 | 4 |
| Medical | 0 | 8 | 8 |
| Vacation | 0 | 5 | 5 |
| Payroll | 0 | 6 | 6 |
| WMS | 0 | 9 | 9 |
| Finance | 0 | 11 | 11 |
| HSE | 0 | 6 | 6 |
| Training | 0 | 5 | 5 |
| Performance | 0 | 4 | 4 |
| Sanctions | 0 | 3 | 3 |
| Legal | 0 | 5 | 5 |
| Logistics | 0 | 7 | 7 |
| HR | 0 | 12 | 12 |
| Contracts | 0 | 6 | 6 |
| Access Control | 0 | 3 | 3 |
| Kiosk | 0 | 5 | 5 |
| Documents | 0 | 6 | 6 |
| Aponnt Billing | 0 | 4 | 4 |
| Module Trials | 0 | 3 | 3 |
| DMS | 0 | 5 | 5 |
| Sales | 0 | 5 | 5 |
| Marketing | 0 | 4 | 4 |
| Equipment | 0 | 4 | 4 |
| **TOTALES** | **46** | **157** | **203** |

---

## 📝 PRÓXIMOS PASOS

1. **Crear migración SQL** con INSERT de 203 workflows a `notification_workflows`
2. **Migrar servicios uno por uno** reemplazando bypass con `NCE.send()`
3. **Crear frontend** - Notification Center en panel-empresa
4. **Crear inbox flotante** universal para todas las páginas
5. **Endpoints para APKs** Flutter para notificaciones push

---

**GENERADO**: 2026-01-06
**ESTADO**: Registro completo - Listo para migración
