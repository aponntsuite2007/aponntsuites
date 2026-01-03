# 💰 ESTRATEGIA DE PRICING COMPLETA - APONNT 2025

**Fecha**: 2025-12-24
**Análisis**: Basado en 28 módulos activos de empresa ISI
**Modelo de comercialización**: **Por Usuario (Per Employee Per Month - PEPM)**
**Mercados analizados**: Argentina, LATAM, Europa, Estados Unidos

---

## 📊 RESUMEN EJECUTIVO

### Sistema Analizado
- **Módulos totales**: 28 (9 CORE + 19 COMERCIALES)
- **Líneas de código frontend**: ~50,000+ líneas
- **Líneas de código backend**: ~30,000+ líneas
- **Base de datos**: PostgreSQL con +80 tablas
- **4 Páginas web principales**:
  1. `panel-empresa.html` (7,969 líneas) - Portal empleados
  2. `panel-administrativo.html` (795 líneas) - APONNT Admin
  3. `panel-asociados.html` (2,223 líneas) - Marketplace partners
  4. `siac-panel-empresa.html` - SIAC Comercial

- **4 APKs móviles**:
  1. **APK Kiosk Biométrico** - Fichaje con reconocimiento facial
  2. **APK Empleado** - App móvil para empleados
  3. **APK Supervisor** - Autorizaciones y gestión
  4. **APK Médico** - Gestión médica ocupacional

### Tecnologías Enterprise Identificadas
✅ **Backend**: Node.js + Express + Sequelize + PostgreSQL
✅ **Frontend**: Vanilla JS modular + Bootstrap 5
✅ **Inteligencia Artificial**: Ollama + Llama 3.1 (Voice Platform)
✅ **Biometría**: Face-api.js + Azure Face API
✅ **Tiempo Real**: Socket.IO (WebSockets)
✅ **Workflows**: Sistema de flujos con SLA monitoring
✅ **Gamificación**: Sistema de puntos y niveles (Voice Platform)
✅ **Clustering semántico**: NLP para categorización automática
✅ **Integraciones**: AFIP, email, SMS, WhatsApp
✅ **DMS**: Sistema de gestión documental completo
✅ **Cumplimiento**: GDPR, ART, normativas argentinas

---

## 🎯 ANÁLISIS TÉCNICO POR MÓDULO

### CATEGORÍA: CORE (Incluidos en todos los planes)

#### 1. **ATTENDANCE** - Control de Asistencia
**Archivos**:
- Frontend: `attendance.js` (5,156 líneas)
- Backend: `attendanceRoutes.js` (1,873 líneas)
- Stats: `attendanceAdvancedStatsRoutes.js`
- Analytics: `attendanceAnalyticsRoutes.js`

**Complejidad**: ⭐⭐⭐⭐ (Alta)

**Tecnologías**:
- CRUD completo de marcaciones
- Reportes avanzados con charts
- Cálculo de horas trabajadas, extras, tardanzas
- Integración con biométrico
- Autorizaciones de llegadas tardías
- Modo offline con sincronización

**Comparable a**:
- Jibble (gratuito básico, $8-12/usuario premium)
- Clockify ($10-15/usuario)
- BambooHR Attendance ($10-15/usuario)

**Pricing sugerido**: CORE (incluido en base)

---

#### 2. **USERS** - Gestión de Usuarios
**Archivos**:
- Frontend: `users.js` (15,249 líneas) ⚠️ **MÓDULO MÁS GRANDE**
- Backend: `userRoutes.js` (1,592 líneas)
- Sub-módulos:
  - `userProfileRoutes.js`
  - `userDocumentsRoutes.js`
  - `user-calendar-routes.js`
  - `userWorkHistoryRoutes.js`
  - `userSalaryConfigRoutes.js`
  - `userMedicalExamsRoutes.js`
  - Y 8 más...

**Complejidad**: ⭐⭐⭐⭐⭐ (Muy Alta - Enterprise)

**Tecnologías**:
- CRUD completo multi-tenant
- 9 tabs de información (General, Experiencia, Educación, Médica, Salario, etc.)
- Gestión de documentos (upload, vencimientos)
- Historial laboral completo
- Configuración de sueldos por convenio
- Calendario visual de turnos
- Licencias profesionales (médicos, choferes)
- Afiliaciones sindicales
- Datos socio-ambientales

**Comparable a**:
- BambooHR Core HR ($8-12/usuario)
- Personio ($10-15/usuario)
- Gusto People ($6-12/usuario)

**Pricing sugerido**: CORE (incluido en base)

---

#### 3. **MI-ESPACIO** - Portal del Empleado
**Archivos**:
- Frontend: `mi-espacio.js` (~3,000 líneas estimadas)
- Integrado con Voice Platform

**Complejidad**: ⭐⭐⭐ (Media-Alta)

**Funcionalidades**:
- Dashboard personal del empleado
- Ver recibos de sueldo
- Solicitar vacaciones
- Ver calendario de turnos
- Acceso a documentación
- Voice Platform (sugerencias, problemas, soluciones)
- Feed de experiencias
- Noticias de la empresa

**Comparable a**:
- Employee self-service portals (incluido en HRIS)

**Pricing sugerido**: CORE (incluido en base)

---

#### 4. **DMS-DASHBOARD** - Gestión Documental
**Archivos**:
- Frontend: `dms-dashboard.js` (estimado ~2,500 líneas)
- Backend: DMS service

**Complejidad**: ⭐⭐⭐⭐ (Alta)

**Tecnologías**:
- Upload/download de archivos
- Versionado de documentos
- Control de acceso por roles
- Alertas de vencimientos
- Categorización automática
- Búsqueda full-text

**Comparable a**:
- DocuWare ($20-75/usuario)
- M-Files ($50-200/usuario)
- Box Business ($35/usuario)

**Pricing sugerido**: CORE (incluido en base, valor agregado alto)

---

#### 5. **BIOMETRIC-CONSENT** - Consentimientos GDPR
**Archivos**:
- Frontend: `biometric-consent.js` (3,449 líneas)
- Backend: `biometricConsentRoutes.js` (1,327 líneas)

**Complejidad**: ⭐⭐⭐⭐ (Alta - Compliance)

**Tecnologías**:
- Gestión de consentimientos GDPR
- Registro de aceptaciones/rechazos
- Auditoría completa
- Generación de formularios legales
- Vencimientos y renovaciones

**Comparable a**:
- Compliance modules en sistemas enterprise ($15-30/usuario)
- OneTrust (Enterprise, pricing custom)

**Pricing sugerido**: CORE (crítico para cumplimiento legal)

---

#### 6. **ORGANIZATIONAL-STRUCTURE** - Estructura Organizacional
**Archivos**:
- Frontend: `organizational-structure.js` (estimado ~2,000 líneas)
- Backend: Departamentos, sucursales, jerarquías

**Complejidad**: ⭐⭐⭐ (Media)

**Funcionalidades**:
- Organigrama visual
- Gestión de departamentos
- Jerarquías y reportes
- Asignación de supervisores

**Comparable a**:
- Org chart modules (incluido en HRIS)

**Pricing sugerido**: CORE (incluido en base)

---

#### 7. **NOTIFICATION-CENTER** - Centro de Notificaciones Enterprise
**Archivos**:
- Frontend: `notification-center.js` (1,930 líneas)
- Backend:
  - `notificationUnifiedRoutes.js` (734 líneas)
  - `notificationWorkflowRoutes.js`
  - `notificationsEnterprise.js`

**Complejidad**: ⭐⭐⭐⭐ (Alta - Enterprise)

**Tecnologías**:
- Sistema unificado de notificaciones
- **Workflows** personalizables
- **SLA monitoring** (acuerdos de nivel de servicio)
- Multi-canal: In-app, Email, SMS, WhatsApp
- Priorización automática
- Notificaciones proactivas

**Comparable a**:
- Notification systems en plataformas enterprise ($10-20/usuario)
- Twilio ($15-25/usuario para comunicaciones)

**Pricing sugerido**: CORE (valor diferencial enterprise)

---

#### 8. **COMPANY-ACCOUNT** - Cuenta Comercial
**Archivos**:
- Frontend: `company-account.js` (estimado ~1,500 líneas)
- Backend: Companies management

**Complejidad**: ⭐⭐ (Media-Baja)

**Funcionalidades**:
- Configuración de empresa
- Datos fiscales (CUIT, AFIP)
- Preferencias del sistema
- Gestión de módulos contratados

**Comparable a**:
- Settings/admin modules (incluido)

**Pricing sugerido**: CORE

---

#### 9. **USER-SUPPORT** - Soporte / Tickets
**Archivos**:
- Frontend: `user-support.js` (estimado ~2,000 líneas)
- Backend: Tickets + IA integration

**Complejidad**: ⭐⭐⭐ (Media-Alta)

**Tecnologías**:
- Sistema de tickets
- Integración con IA (Asistente Ollama)
- Priorización automática
- SLA tracking
- Knowledge base

**Comparable a**:
- Zendesk Support ($19-99/agente)
- Freshdesk ($15-49/agente)

**Pricing sugerido**: CORE (soporte incluido para todos los usuarios)

---

### CATEGORÍA: COMERCIALES (Add-ons pagos)

#### 10. **PAYROLL-LIQUIDATION** - Liquidación de Sueldos ⭐ **PREMIUM**
**Archivos**:
- Frontend: `payroll-liquidation.js` (6,074 líneas)
- Backend: `payrollRoutes.js` (3,560 líneas)
- Templates: `payrollTemplates.js`

**Complejidad**: ⭐⭐⭐⭐⭐ (Muy Alta - Enterprise)

**Tecnologías**:
- Cálculo de haberes automático
- **170+ convenios colectivos** pre-configurados
- Deducciones (jubilación, obra social, sindicato, etc.)
- Generación de recibos PDF
- Libro de sueldos digital
- Cálculo de aguinaldo
- Liquidación final
- Impuesto 4ta categoría
- Integración AFIP (F931, SIRADIG)
- Exportación a contabilidad

**Comparable a**:
- **Argentina**: e-Sueldos, Tango Sueldos, Visual Sueldos (pricing no público, estimado $15-30/empleado)
- **USA**: Gusto Payroll ($39 base + $6/empleado), ADP ($5-14/empleado + base)
- **Europa**: Personio Payroll ($10-15/empleado)

**Pricing sugerido**: **$12-18 USD por empleado/mes**
- Justificación: Complejidad muy alta, 170+ convenios, integración AFIP, ahorro de horas de trabajo manual

---

#### 11. **VOICE-PLATFORM** - Plataforma de Experiencias del Empleado con IA ⭐ **INNOVADOR**
**Archivos**:
- Frontend:
  - `employee-voice-platform.js` (940 líneas)
  - `voice-platform-feed.js` (350 líneas)
  - `company-news.js` (500 líneas)
  - `a-mi-me-paso-search.js`
  - `voice-platform-wizard.js`
- Backend: `voicePlatformRoutes.js` (879 líneas)

**Complejidad**: ⭐⭐⭐⭐⭐ (Muy Alta - IA/ML)

**Tecnologías**:
- **Ollama + Llama 3.1** (LLM local)
- **RAG** (Retrieval Augmented Generation)
- **Clustering semántico** automático
- **NLP** para categorización
- **Gamificación** (puntos, niveles, badges)
- Sistema de votaciones (upvotes/downvotes)
- Comentarios y discusiones
- Feed público de experiencias
- Wizard de 4 pasos para captura
- Búsqueda inteligente "A mi me pasó"
- Analytics de tendencias
- Generación automática de noticias

**Comparable a**:
- **No hay competencia directa en Argentina/LATAM**
- Similar a: Glint (Microsoft - $5-15/empleado), Culture Amp ($5-12/empleado), Peakon (Workday - enterprise pricing)
- Employee engagement platforms: $3-10/empleado generalmente NO incluyen IA generativa

**Pricing sugerido**: **$8-12 USD por empleado/mes**
- Justificación: IA generativa es único en LATAM, clustering semántico, gamificación completa, valor estratégico alto

---

#### 12. **SIAC-COMMERCIAL-DASHBOARD** - Sistema Comercial Completo ⭐ **ENTERPRISE**
**Archivos**:
- Frontend: `siac-commercial-dashboard.js` (4,353 líneas)
- Backend (subdirectorio `/siac/`):
  - `facturacion.js`
  - `clientes.js`
  - `remitosRoutes.js`
  - `cuentaCorrienteRoutes.js`
  - `cobranzasRoutes.js`
  - `cajaRoutes.js`
  - `taxTemplates.js`
  - **Total**: 4,453 líneas

**Complejidad**: ⭐⭐⭐⭐⭐ (Muy Alta - ERP)

**Funcionalidades**:
- Gestión de clientes (CRM integrado)
- **Facturación electrónica AFIP** (A, B, C, E, M, etc.)
- Remitos
- Cuentas corrientes
- Cobranzas
- Caja y bancos
- Plantillas fiscales
- Reportes de ventas
- Integración contable

**Comparable a**:
- **Argentina**: Bejerman ($30-50/usuario), Tango Gestión ($25-45/usuario), ContaWin ($20-40/usuario)
- **Internacional**: Zoho CRM + Invoice ($45-65/usuario), Salesforce + CPQ (enterprise)
- ERP modules: SAP Business One ($68+/usuario), Odoo ERP ($24+/usuario)

**Pricing sugerido**: **$25-35 USD por usuario/mes**
- Justificación: Es un ERP comercial completo, facturación AFIP, cuentas corrientes, comparable a Tango Gestión

---

#### 13. **MEDICAL** - Gestión Médica Ocupacional
**Archivos**:
- Frontend: `medical-dashboard-professional.js` (5,322 líneas) ⚠️ **2do módulo más grande**
- Backend:
  - `medicalRoutes.js` (1,682 líneas)
  - `medicalAdvancedRoutes.js`
  - `medicalRecordsRoutes.js`
  - `medicalAuthorizationsRoutes.js`
  - `medicalCaseRoutes.js`
  - `medicalDoctorRoutes.js`
  - `medicalTemplatesRoutes.js`

**Complejidad**: ⭐⭐⭐⭐⭐ (Muy Alta - Healthcare)

**Funcionalidades**:
- Exámenes preocupacionales
- Exámenes periódicos
- Historial médico completo
- Gestión de aptitudes (apto/no apto/apto con restricciones)
- Protocolos médicos
- Vencimientos de exámenes
- Alertas automáticas
- Integración con ART
- Seguimiento de casos
- Agenda médica
- Templates de informes

**Comparable a**:
- **Occupational Health Software**: $15-40/empleado (USA)
- **Medgate/Occucare**: $12-25/empleado (Europa)
- **Argentina**: No hay sistemas especializados comparables (mercado sin desarrollar)

**Pricing sugerido**: **$10-15 USD por empleado/mes**
- Justificación: Alta complejidad, compliance laboral, escasa competencia en LATAM

---

#### 14. **EMPLOYEE-360** - Expediente 360°
**Archivos**:
- Frontend: `employee-360.js` (4,234 líneas)
- Backend: `employee360Routes.js` (393 líneas)

**Complejidad**: ⭐⭐⭐⭐ (Alta)

**Funcionalidades**:
- Vista completa del empleado
- Timeline de eventos
- Evaluaciones de desempeño
- Historial disciplinario
- Capacitaciones completadas
- Documentos adjuntos
- Notas y observaciones
- 360° feedback

**Comparable a**:
- Performance management modules: $5-15/empleado
- BambooHR Performance ($8-12/empleado)
- Lattice ($11-15/empleado)

**Pricing sugerido**: **$6-10 USD por empleado/mes**
- Justificación: Integra múltiples fuentes de datos, valor estratégico para RRHH

---

#### 15. **JOB-POSTINGS** - Búsquedas Laborales (ATS)
**Archivos**:
- Frontend: `job-postings.js` (2,968 líneas)
- Backend: `jobPostingsRoutes.js` (3,088 líneas)

**Complejidad**: ⭐⭐⭐⭐ (Alta)

**Funcionalidades**:
- Publicación de búsquedas
- Recepción de postulaciones
- CV parsing automático
- Pipeline de candidatos
- Evaluaciones y scoring
- Comunicación con candidatos
- Integración con portales de empleo
- Reportes de sourcing

**Comparable a**:
- **ATS systems**: $60-100/reclutador o $250-3,000/año para PYMES
- Zoho Recruit ($90/reclutador), Recruit CRM ($85/reclutador)
- BambooHR ATS ($8-12/empleado como parte del HR suite)

**Pricing sugerido**: **$5-8 USD por empleado/mes** O **$60-90 por reclutador/mes**
- Justificación: Modelo híbrido - cobrar por empleado es más predecible que por reclutador

---

#### 16. **VACATION-MANAGEMENT** - Gestión de Vacaciones
**Archivos**:
- Frontend: `vacation-management.js` (estimado ~2,000 líneas)
- Backend: Vacation routes + workflows

**Complejidad**: ⭐⭐⭐ (Media-Alta)

**Funcionalidades**:
- Solicitud de vacaciones
- Aprobación por jerarquía
- Calendario de ausencias
- Cálculo de días disponibles
- Integración con liquidación de sueldos
- Alertas de vencimientos

**Comparable a**:
- Time-off modules: $3-8/empleado
- Calamari ($2.40/empleado), Timetastic ($1.50/empleado)

**Pricing sugerido**: **$3-5 USD por empleado/mes**

---

#### 17. **TRAINING-MANAGEMENT** - Gestión de Capacitaciones
**Archivos**:
- Frontend: `training-management.js` (estimado ~2,500 líneas)
- Backend: Training routes

**Complejidad**: ⭐⭐⭐ (Media-Alta)

**Funcionalidades**:
- Catálogo de cursos
- Inscripciones
- Asistencia
- Certificaciones
- Vencimientos
- Proveedores de capacitación
- Costos y presupuestos

**Comparable a**:
- LMS básicos: $5-15/empleado
- TalentLMS ($59+ para 40 usuarios), Absorb LMS ($800+ base)

**Pricing sugerido**: **$4-7 USD por empleado/mes**

---

#### 18. **SANCTIONS-MANAGEMENT** - Gestión de Sanciones
**Archivos**:
- Frontend: `sanctions-management.js` (estimado ~1,800 líneas)
- Backend: Sanctions routes

**Complejidad**: ⭐⭐⭐ (Media)

**Funcionalidades**:
- Registro de sanciones
- Amonestaciones, suspensiones
- Workflow de aprobación
- Historial disciplinario
- Descargos
- Integración con expediente 360°

**Comparable a**:
- Disciplinary action modules: $3-6/empleado (parte de HR suites)

**Pricing sugerido**: **$3-5 USD por empleado/mes**

---

#### 19. **HOUR-BANK** - Banco de Horas
**Archivos**:
- Frontend: `hour-bank.js` (estimado ~2,000 líneas)
- Backend: Hour bank calculation engine

**Complejidad**: ⭐⭐⭐⭐ (Alta)

**Funcionalidades**:
- Acumulación de horas extra
- Redención (pago o compensación)
- Cálculo automático
- Reglas por convenio
- Reportes
- Integración con liquidación

**Comparable a**:
- Overtime management: $3-8/empleado
- Parte de Time & Attendance systems avanzados

**Pricing sugerido**: **$4-6 USD por empleado/mes**

---

#### 20. **KIOSKS** - Gestión de Kioscos Biométricos
**Archivos**:
- Frontend: `kiosks.js` (estimado ~1,500 líneas)
- Backend: Kiosks management routes

**Complejidad**: ⭐⭐⭐ (Media)

**Funcionalidades**:
- Administración de terminales de fichaje
- Configuración remota
- Monitoring de estado
- Logs y auditoría
- Asignación a departamentos

**Comparable a**:
- Hardware management modules (incluido en systems con biométrico)

**Pricing sugerido**: **$2-4 USD por empleado/mes** + Costo de hardware

---

#### 21. **HSE-MANAGEMENT** - Seguridad e Higiene Laboral
**Archivos**:
- Frontend: `hse-management.js` (estimado ~2,500 líneas)
- Backend: HSE routes

**Complejidad**: ⭐⭐⭐⭐ (Alta)

**Funcionalidades**:
- Gestión de EPP (elementos de protección personal)
- Inspecciones de seguridad
- Registro de incidentes
- Matrices de riesgo
- Capacitaciones obligatorias
- Auditorías

**Comparable a**:
- EHS Software: $15-40/empleado (USA)
- SafetyCulture ($24-44/usuario), iAuditor ($19+/usuario)

**Pricing sugerido**: **$8-12 USD por empleado/mes**
- Justificación: Compliance crítico, software especializado

---

#### 22. **ART-MANAGEMENT** - Gestión de ART
**Archivos**:
- Frontend: `art-management.js` (estimado ~2,000 líneas)
- Backend: ART routes

**Complejidad**: ⭐⭐⭐ (Media-Alta)

**Funcionalidades**:
- Registro de accidentes laborales
- Denuncias a ART
- Seguimiento de casos
- Integración con médica
- Estadísticas de siniestralidad

**Comparable a**:
- Workers' comp management: $5-12/empleado
- Específico de Argentina (no hay competencia directa)

**Pricing sugerido**: **$5-8 USD por empleado/mes**

---

#### 23. **LEGAL-DASHBOARD** - Gestión Legal
**Archivos**:
- Frontend: `legal-dashboard.js` (estimado ~2,000 líneas)
- Backend: Legal routes

**Complejidad**: ⭐⭐⭐ (Media-Alta)

**Funcionalidades**:
- Gestión de contratos
- Vencimientos legales
- Alertas automáticas
- Documentación laboral
- Compliance legal

**Comparable a**:
- Legal management modules: $8-15/empleado
- Contract lifecycle management: $10-20/usuario

**Pricing sugerido**: **$6-10 USD por empleado/mes**

---

#### 24. **COMPLIANCE-DASHBOARD** - Risk Intelligence
**Archivos**:
- Frontend: `compliance-dashboard.js` (estimado ~2,500 líneas)
- Backend: Compliance routes + audit engine

**Complejidad**: ⭐⭐⭐⭐ (Alta)

**Funcionalidades**:
- Cumplimiento normativo
- Auditorías internas
- Gestión de riesgos
- Reportes de compliance
- Dashboard ejecutivo

**Comparable a**:
- GRC platforms: $15-50/empleado (enterprise)
- OneTrust, ComplyAdvantage (enterprise pricing)

**Pricing sugerido**: **$10-15 USD por empleado/mes**

---

#### 25. **BENEFITS-MANAGEMENT** - Beneficios Laborales
**Archivos**:
- Frontend: `benefits-management.js` (estimado ~2,000 líneas)
- Backend: Benefits routes

**Complejidad**: ⭐⭐⭐ (Media-Alta)

**Funcionalidades**:
- Catálogo de beneficios
- Asignación por rol/antigüedad
- Gestión de amenidades
- Costos y presupuestos
- Reportes de uso

**Comparable a**:
- Benefits administration: $3-8/empleado
- Benefitfocus ($3-6/empleado), Zenefits ($10/empleado)

**Pricing sugerido**: **$4-7 USD por empleado/mes**

---

#### 26. **PROCEDURES-MANUAL** - Manual de Procedimientos
**Archivos**:
- Frontend: `procedures-manual.js` (estimado ~1,500 líneas)
- Backend: Procedures routes

**Complejidad**: ⭐⭐ (Media-Baja)

**Funcionalidades**:
- Documentación de procesos
- Versionado
- Aprobación de procedimientos
- Búsqueda
- Integración con DMS

**Comparable a**:
- Process documentation tools: $2-5/usuario
- Parte de Knowledge Management systems

**Pricing sugerido**: **$2-4 USD por empleado/mes**

---

#### 27. **EMPLOYEE-MAP** - Mapa de Empleados
**Archivos**:
- Frontend: `employee-map.js` (estimado ~1,000 líneas)
- Backend: Geolocation routes

**Complejidad**: ⭐⭐ (Media-Baja)

**Funcionalidades**:
- Geolocalización de empleados
- Mapa visual
- Distribución geográfica
- Analytics de ubicación

**Comparable a**:
- Location tracking: $2-5/empleado
- Parte de field service management

**Pricing sugerido**: **$2-4 USD por empleado/mes**

---

#### 28. **ASSOCIATE-MARKETPLACE** - Asociados APONNT
**Archivos**:
- Frontend: `associate-marketplace.js` (estimado ~2,000 líneas)
- Backend: Marketplace routes

**Complejidad**: ⭐⭐⭐ (Media)

**Funcionalidades**:
- Marketplace de servicios
- Partners APONNT
- Catálogo de servicios
- Solicitudes
- Gestión de proveedores

**Comparable a**:
- Marketplace modules: $3-8/usuario
- Servicios agregados por partners

**Pricing sugerido**: **$3-6 USD por empleado/mes** O **Revenue share con partners**

---

## 📱 ANÁLISIS DE 4 APKs MÓVILES

### APK 1: **Kiosk Biométrico** (Fichaje con Reconocimiento Facial)
**Ubicación**: `frontend_flutter/` (si existe) o documentado en `APK-KIOSK-IMPLEMENTATION-GUIDE.md`

**Tecnologías**:
- Flutter/Dart
- Face-api.js o Azure Face API
- Liveness detection
- Offline mode con SQLite
- WebSocket para tiempo real
- Hardware profile service (30+ dispositivos)
- Geofencing

**Funcionalidades**:
- Fichaje facial biométrico
- Autenticación por contraseña (fallback)
- Modo offline con cola de sincronización
- Autorizaciones de llegadas tardías
- Multi-dispositivo
- Supervisión remota

**Comparable a**:
- **Biometric time clocks**: $100-500/terminal (hardware) + $5-15/empleado software
- Kronos InTouch ($200-400 hardware), ADP Time Clock ($150-300)
- **Argentina**: Sistemas de fichaje biométrico $8,000-25,000 ARS/terminal + software

**Pricing sugerido**:
- **Hardware**: Venta o alquiler de terminales ($150-300 USD/terminal)
- **Software**: Incluido en plan Biometric ($8-12/empleado) o cargo adicional $3-5/empleado

---

### APK 2: **App Empleado** (Portal Móvil)
**Funcionalidades estimadas**:
- Ver recibos de sueldo
- Solicitar vacaciones
- Ver turnos asignados
- Marcar asistencia (geolocalizada)
- Notificaciones push
- Acceso a Mi Espacio
- Voice Platform móvil

**Comparable a**:
- Employee apps (incluidas en HR suites)
- No pricing separado típicamente

**Pricing sugerido**: **Incluido en plan base CORE**

---

### APK 3: **App Supervisor** (Gestión y Autorizaciones)
**Funcionalidades estimadas**:
- Aprobar/rechazar vacaciones
- Autorizar llegadas tardías
- Ver equipo
- Notificaciones de eventos
- Dashboard de métricas
- Gestión de turnos

**Comparable a**:
- Manager apps (incluidas en HR suites)

**Pricing sugerido**: **Incluido en plan Professional o superior**

---

### APK 4: **App Médico** (Gestión Médica Ocupacional)
**Funcionalidades estimadas**:
- Agenda de exámenes
- Registro de resultados
- Historial médico del empleado
- Generación de aptitudes
- Alertas de vencimientos
- Protocolos médicos

**Comparable a**:
- Occupational health mobile apps: $10-20/médico o incluido en medical module

**Pricing sugerido**: **Incluido en módulo Medical** ($10-15/empleado)

---

## 🌐 ANÁLISIS DE 4 PÁGINAS WEB

### 1. **panel-empresa.html** (7,969 líneas)
**Descripción**: Portal principal de la empresa
**Usuarios**: Administradores, RRHH, supervisores, empleados

**Módulos incluidos**: TODOS los 28 módulos

**Tecnologías**:
- Vanilla JavaScript modular (~50 módulos JS)
- Bootstrap 5
- Chart.js para gráficos
- Socket.IO para tiempo real
- Dynamic module loading
- Multi-tenant security

**Valor**: **Plataforma completa enterprise**

---

### 2. **panel-administrativo.html** (795 líneas)
**Descripción**: Panel de administración APONNT (superadmin)
**Usuarios**: Staff APONNT

**Funcionalidades**:
- Gestión de empresas clientes
- Activación/desactivación de módulos
- Configuración de pricing
- Vendor dashboard
- Engineering dashboard
- Reportes globales

**Valor**: **Plataforma de gestión del negocio**

---

### 3. **panel-asociados.html** (2,223 líneas)
**Descripción**: Portal para partners APONNT
**Usuarios**: Asociados/Partners

**Funcionalidades**:
- Dashboard de servicios
- Gestión de solicitudes
- Reportes de facturación
- Catálogo de servicios

**Valor**: **Plataforma de ecosystem partners**

---

### 4. **siac-panel-empresa.html** (estimado ~3,000 líneas)
**Descripción**: Panel SIAC Comercial
**Usuarios**: Empresas con módulo SIAC activo

**Funcionalidades**:
- Facturación AFIP
- Clientes, remitos, cobranzas
- Caja y bancos
- Reportes comerciales

**Valor**: **ERP comercial completo** (incluido en módulo SIAC $25-35/usuario)

---

## 💰 MODELO DE PRICING FINAL - SISTEMA POR USUARIOS

### TIER 1: **STARTER** (PYMES 1-50 empleados)
**Precio**: **$8 USD por empleado/mes** (facturación anual)

**Incluye (CORE)**:
✅ Attendance (Control de Asistencia)
✅ Users (Gestión de Usuarios)
✅ Mi-Espacio (Portal Empleado)
✅ Organizational Structure
✅ DMS Dashboard (Gestión Documental)
✅ Biometric Consent (GDPR Compliance)
✅ Notification Center
✅ Company Account
✅ User Support (Tickets con IA)
✅ 1 APK Empleado
✅ Panel web principal

**Add-ons disponibles**:
- Vacation Management: +$3/empleado
- Sanctions Management: +$3/empleado
- Kiosks Management: +$3/empleado + Hardware

**Total mínimo**: $8/empleado x 10 empleados = **$80/mes** (facturado anualmente: $960/año)

**Comparable a**:
- BambooHR Essentials: $8-10/empleado
- Gusto Core: $6/empleado + $39 base
- Zoho People: $1.25-3/empleado (básico)

---

### TIER 2: **PROFESSIONAL** (PYMES 50-200 empleados)
**Precio**: **$18 USD por empleado/mes** (facturación anual)

**Incluye TODO de STARTER +**:
✅ Payroll Liquidation (con 170+ convenios)
✅ Vacation Management
✅ Training Management
✅ Sanctions Management
✅ Kiosks Management
✅ Benefits Management
✅ Employee Map
✅ Procedures Manual
✅ APK Supervisor
✅ APK Kiosk Biométrico (software)

**Add-ons disponibles**:
- Voice Platform (IA): +$8/empleado
- Medical: +$10/empleado
- Employee 360: +$6/empleado
- Job Postings (ATS): +$5/empleado
- Hour Bank: +$4/empleado

**Total promedio**: $18/empleado x 100 empleados = **$1,800/mes** (facturado anualmente: $21,600/año)

**Comparable a**:
- BambooHR Standard + Payroll: $15-25/empleado
- Gusto Complete: $12/empleado + $149 base
- Personio Core: $10-15/empleado

---

### TIER 3: **ENTERPRISE** (Empresas 200+ empleados)
**Precio**: **$35 USD por empleado/mes** (facturación anual, descuentos por volumen)

**Incluye TODO de PROFESSIONAL +**:
✅ Voice Platform con IA (Ollama + Llama 3.1)
✅ Medical (Gestión Médica completa)
✅ Employee 360
✅ Job Postings (ATS)
✅ Hour Bank
✅ HSE Management
✅ ART Management
✅ Legal Dashboard
✅ Compliance Dashboard (Risk Intelligence)
✅ Associate Marketplace
✅ APK Médico
✅ Todas las 4 APKs
✅ Todas las 4 páginas web
✅ Onboarding dedicado
✅ Customer Success Manager

**Add-ons disponibles**:
- SIAC Commercial (ERP): +$25/usuario activo
- Customizaciones: Pricing custom

**Total promedio**: $35/empleado x 500 empleados = **$17,500/mes** (facturado anualmente: $210,000/año)

**Descuentos por volumen**:
- 200-500 empleados: 10% descuento
- 500-1000 empleados: 15% descuento
- 1000+ empleados: 20% descuento + pricing custom

**Comparable a**:
- BambooHR Advantage + Add-ons: $25-40/empleado
- ADP Workforce Now: $30-50/empleado
- Workday HCM: $50-100+/empleado (enterprise)
- SAP SuccessFactors: $40-80+/empleado

---

## 🎯 MÓDULOS VENDIBLES SEPARADAMENTE (À LA CARTE)

Para empresas que ya tienen HRIS y solo quieren módulos específicos:

| Módulo | Precio/empleado/mes | Precio/usuario/mes | Mínimo |
|--------|---------------------|---------------------|---------|
| **Payroll Liquidation** | $15 | - | 20 empleados |
| **Voice Platform** | $10 | - | 30 empleados |
| **SIAC Commercial** | - | $30 | 5 usuarios |
| **Medical** | $12 | - | 25 empleados |
| **Job Postings (ATS)** | $7 | $80 | 10 empleados o 2 reclutadores |
| **HSE Management** | $10 | - | 20 empleados |
| **Compliance Dashboard** | $12 | - | 50 empleados |
| **Employee 360** | $8 | - | 20 empleados |

---

## 📊 COMPARACIÓN CON MERCADO INTERNACIONAL

### Argentina/LATAM
**Competidores locales**:
- **Tango Gestión**: $25-45/usuario (ERP)
- **e-Sueldos**: Pricing no público, estimado $15-25/empleado (solo liquidación)
- **Bejerman**: $30-50/usuario (ERP + RRHH)
- **Visual Sueldos** (Logosoft): Pricing no público

**APONNT Ventaja competitiva**:
✅ **Más económico** que ERPs completos ($35 vs $45-50)
✅ **Más completo** que sistemas solo de liquidación
✅ **IA incluida** (único en el mercado con Voice Platform)
✅ **170+ convenios** pre-cargados (vs 50-80 de competidores)
✅ **Modelo PEPM** (predecible vs licenses perpetuas)

---

### Estados Unidos
**Competidores**:
- **BambooHR**: $8-40/empleado según plan
- **Gusto**: $6-22/empleado + base fee
- **ADP**: $5-50/empleado según módulos
- **Rippling**: $8+/empleado + $40 base
- **Paycor**: $5-14/empleado + base
- **Workday**: $50-100+/empleado (enterprise)

**APONNT Posicionamiento**:
- **TIER STARTER ($8)**: Competitivo con BambooHR Essentials, más barato que Gusto
- **TIER PROFESSIONAL ($18)**: En el rango medio, mejor value (más módulos incluidos)
- **TIER ENTERPRISE ($35)**: Más económico que Workday, comparable a ADP mid-tier

---

### Europa
**Competidores**:
- **Personio**: $10-15/empleado (Alemania)
- **Factorial**: $5-10/empleado (España)
- **Sesame HR**: $4-8/empleado (España)
- **Sage HR**: $5-9/empleado (UK)

**APONNT Posicionamiento**:
- Comparable en precio a soluciones europeas
- **Más completo** en funcionalidades (IA, Medical, Compliance)

---

## 💡 ESTRATEGIAS DE MONETIZACIÓN ADICIONALES

### 1. **HARDWARE** (Kiosks Biométricos)
**Modelo**:
- **Venta directa**: $200-400 USD/terminal (one-time)
- **Alquiler**: $15-25 USD/mes por terminal
- **Leasing**: 24-36 meses con opción de compra

**Margen**: 30-40% sobre costo de hardware

---

### 2. **SERVICIOS PROFESIONALES**
**Implementación**:
- Básica (1-50 empleados): $500-1,500 USD flat
- Standard (50-200 empleados): $2,000-5,000 USD
- Enterprise (200+ empleados): $5,000-20,000 USD

**Capacitación**:
- Online (grabada): Incluida
- Live webinar: $200/sesión
- Presencial: $1,500/día + gastos

**Customizaciones**:
- Minor (reportes, campos): $500-2,000
- Major (workflows, integraciones): $3,000-15,000
- API integrations: $1,000-5,000 por integración

---

### 3. **ASSOCIATE MARKETPLACE** (Revenue Share)
**Modelo**:
- APONNT toma **15-25%** de comisión en servicios vendidos
- Partners pagan fee anual: $500-2,000 USD
- Promociones destacadas: $200-500/mes

**Servicios potenciales**:
- Estudios contables
- Estudios jurídicos
- Consultoras de RRHH
- Servicios médicos ocupacionales
- Seguros de vida/salud
- Capacitaciones

---

## 🎁 ESTRATEGIA DE DESCUENTOS

### Descuentos por Volumen
- 1-50 empleados: Precio de lista
- 51-100: 5% descuento
- 101-200: 10% descuento
- 201-500: 15% descuento
- 501-1000: 20% descuento
- 1000+: 25% descuento + pricing custom

### Descuentos por Compromiso
- Mensual: Precio de lista
- Anual (1 año): 10% descuento
- Bianual (2 años): 15% descuento
- Trianual (3 años): 20% descuento

### Descuentos Promocionales
- Early adopters: 30% descuento primer año
- Referidos: 20% descuento primer año (ambas empresas)
- Nonprofit/Educación: 25% descuento permanente
- Startups (<2 años): 40% descuento primer año

---

## 📈 PROYECCIÓN DE INGRESOS

### Escenario Conservador (Año 1)

**Objetivo**: 100 empresas clientes

| Tier | Empresas | Promedio empleados | PEPM | MRR/empresa | Total MRR |
|------|----------|-------------------|------|-------------|-----------|
| Starter | 60 | 25 | $8 | $200 | $12,000 |
| Professional | 30 | 80 | $18 | $1,440 | $43,200 |
| Enterprise | 10 | 300 | $28* | $8,400 | $84,000 |

**Total MRR**: $139,200
**ARR**: $1,670,400 USD

*Precio promedio considerando descuentos por volumen

**+ Add-ons estimados**: $20,000 MRR adicional
**+ Hardware**: $15,000 MRR (alquileres)
**+ Servicios profesionales**: $10,000 MRR promedio

**Total proyectado Año 1**: ~$184,000 MRR = **$2.2M ARR**

---

### Escenario Optimista (Año 3)

**Objetivo**: 500 empresas clientes

| Tier | Empresas | Promedio empleados | PEPM | MRR/empresa | Total MRR |
|------|----------|-------------------|------|-------------|-----------|
| Starter | 250 | 30 | $8 | $240 | $60,000 |
| Professional | 180 | 100 | $18 | $1,800 | $324,000 |
| Enterprise | 70 | 400 | $25* | $10,000 | $700,000 |

**Total MRR**: $1,084,000
**ARR**: **$13M USD**

---

## 🔑 CONCLUSIONES Y RECOMENDACIONES

### Fortalezas del Sistema
1. ✅ **Único en LATAM con IA generativa** (Voice Platform)
2. ✅ **170+ convenios colectivos** (más que cualquier competidor local)
3. ✅ **DMS incluido** (valor agregado vs competidores)
4. ✅ **Biométrico facial** (tecnología de punta)
5. ✅ **Compliance argentino** (AFIP, ART, convenios)
6. ✅ **Multi-tenant enterprise grade**
7. ✅ **50,000+ líneas de código** (producto maduro)

### Pricing Strategy
1. **TIER STARTER ($8)**: Agresivo para captar mercado, competitivo con BambooHR
2. **TIER PROFESSIONAL ($18)**: Sweet spot - mejor value que competencia
3. **TIER ENTERPRISE ($35)**: Premium pero justificado (IA, Medical, Compliance)

### Go-to-Market
1. **Mercado primario**: Argentina (compliance + convenios + AFIP)
2. **Mercado secundario**: LATAM (Chile, Uruguay, Colombia)
3. **Diferenciación clave**: "El único HRIS en LATAM con IA generativa"

### Próximos Pasos
1. ✅ Crear pricing calculator en web
2. ✅ Página de comparación vs competidores
3. ✅ Free trial 30 días (hasta 10 empleados)
4. ✅ Casos de éxito / ROI calculators
5. ✅ Partner program para estudios contables

---

**Documento generado**: 2025-12-24
**Próxima revisión**: Trimestral o cuando mercado cambie

**Contacto**: APONNT Business Development
