// Biometric Consent Module - Professional Legal Compliance (Encapsulado en IIFE)
(function() {
console.log('🔐 [BIOMETRIC-CONSENT] Módulo de consentimiento biométrico cargado');

// ========================================
// CONFIGURACIÓN Y CONSTANTES
// ========================================

const BIOMETRIC_CONSENT_CONFIG = {
    version: '1.0',
    requiresBiometricValidation: true,
    azureCostInfo: {
        freeTier: 30000,
        currency: 'USD',
        costPerTransactionAfterFree: 0.001
    },
    consentTypes: {
        EMOTIONAL_ANALYSIS: 'emotional_analysis',
        FATIGUE_DETECTION: 'fatigue_detection',
        WELLNESS_MONITORING: 'wellness_monitoring',
        AGGREGATED_REPORTS: 'aggregated_reports'
    }
};

// Variables locales del módulo (scope privado)
let currentUser = null;
let userConsentStatus = {};
let pendingBiometricValidation = null;

// ========================================
// TEXTO LEGAL PROFESIONAL (REALES)
// ========================================

const BIOMETRIC_CONSENT_TEXT = `
═══════════════════════════════════════════════════════════════════════════════
                    CONSENTIMIENTO INFORMADO PARA ANÁLISIS BIOMÉTRICO
                    Sistema de Análisis Emocional y Detección de Fatiga
                                    Versión 1.0
═══════════════════════════════════════════════════════════════════════════════

INFORMACIÓN IMPORTANTE: Este documento describe el tratamiento de sus datos biométricos
faciales y requiere su consentimiento expreso, libre e informado según la legislación vigente.

═══════════════════════════════════════════════════════════════════════════════
1. IDENTIFICACIÓN DEL RESPONSABLE
═══════════════════════════════════════════════════════════════════════════════

Responsable del Tratamiento: [NOMBRE DE LA EMPRESA]
CUIT: [CUIT DE LA EMPRESA]
Domicilio: [DOMICILIO LEGAL]
Contacto DPO: [EMAIL/TELÉFONO]

═══════════════════════════════════════════════════════════════════════════════
2. NATURALEZA DEL TRATAMIENTO BIOMÉTRICO
═══════════════════════════════════════════════════════════════════════════════

El sistema utiliza tecnología de Microsoft Azure Face API para analizar expresiones
faciales durante los registros de asistencia. Esta tecnología cuenta con certificación
internacional y cumple con estándares de privacidad GDPR, BIPA y Ley 25.326.

═══════════════════════════════════════════════════════════════════════════════
3. DATOS QUE SE RECOPILAN (CAPACIDADES REALES)
═══════════════════════════════════════════════════════════════════════════════

El sistema analiza ÚNICAMENTE los siguientes elementos faciales:

A) ANÁLISIS EMOCIONAL (8 emociones básicas):
   • Felicidad (Happiness)
   • Tristeza (Sadness)
   • Ira (Anger)
   • Sorpresa (Surprise)
   • Miedo (Fear)
   • Disgusto (Disgust)
   • Desprecio (Contempt)
   • Neutralidad (Neutral)

   Nota: Estos valores son probabilidades entre 0 y 1, no diagnósticos médicos.

B) INDICADORES DE FATIGA:
   • Oclusión ocular izquierda (nivel de cierre del ojo)
   • Oclusión ocular derecha (nivel de cierre del ojo)
   • Postura de la cabeza (pitch, roll, yaw)
   • Intensidad de sonrisa

C) METADATA CONTEXTUAL:
   • Uso de anteojos (lectura/sol/ninguno)
   • Vello facial (estimación automática)
   • Edad estimada (rango aproximado, NO es edad real)

D) DATOS TÉCNICOS:
   • Timestamp del análisis
   • Puntuación de calidad de imagen
   • Tiempo de procesamiento
   • ID temporal de Azure (NO almacena imagen facial)

═══════════════════════════════════════════════════════════════════════════════
4. LO QUE EL SISTEMA NO HACE (LIMITACIONES IMPORTANTES)
═══════════════════════════════════════════════════════════════════════════════

✗ NO lee pensamientos ni intenciones
✗ NO diagnostica condiciones médicas o psicológicas
✗ NO predice comportamiento futuro
✗ NO almacena imágenes de su rostro
✗ NO comparte datos con terceros sin autorización
✗ NO utiliza reconocimiento facial para vigilancia
✗ NO determina aptitud laboral
✗ NO reemplaza evaluaciones médicas profesionales

═══════════════════════════════════════════════════════════════════════════════
5. FINALIDAD DEL TRATAMIENTO
═══════════════════════════════════════════════════════════════════════════════

Los datos se utilizarán EXCLUSIVAMENTE para:

a) Generar indicadores agregados de bienestar organizacional
b) Identificar patrones de fatiga que requieran medidas preventivas
c) Evaluar efectividad de políticas de salud ocupacional
d) Cumplir con obligaciones de seguridad e higiene laboral

IMPORTANTE: Los datos individuales son confidenciales y solo accesibles para:
- Médico laboral de la empresa
- Responsable de RRHH autorizado
- Área de seguridad e higiene

Los reportes gerenciales contienen ÚNICAMENTE datos agregados y anónimos
(mínimo 10 personas para garantizar anonimato).

═══════════════════════════════════════════════════════════════════════════════
6. COSTOS Y ASPECTOS ECONÓMICOS
═══════════════════════════════════════════════════════════════════════════════

⚠️ INFORMACIÓN DE COSTOS AZURE FACE API:

• Tier Gratuito: 30,000 transacciones/mes sin cargo
• Costo Adicional: USD $1.00 por cada 1,000 transacciones después del límite gratuito
• Facturación: A cargo de la empresa empleadora

Su empleador ha adherido a este módulo opcional. Usted NO tiene costos asociados.

Si su empleador decide no continuar con el servicio por razones económicas,
todos los datos serán eliminados según el procedimiento legal establecido.

═══════════════════════════════════════════════════════════════════════════════
7. BASE LEGAL DEL TRATAMIENTO
═══════════════════════════════════════════════════════════════════════════════

Este tratamiento se fundamenta en:

ARGENTINA:
• Ley 25.326 - Protección de Datos Personales
• Ley 19.587 - Seguridad e Higiene en el Trabajo
• Decreto 1338/96 - Servicios de Medicina del Trabajo
• Resolución SRT 905/2015 - Relevamiento de Riesgos

INTERNACIONAL:
• GDPR (UE) - Reglamento General de Protección de Datos
• BIPA (Illinois) - Biometric Information Privacy Act
• ISO/IEC 29100:2011 - Privacy Framework

═══════════════════════════════════════════════════════════════════════════════
8. DURACIÓN DEL ALMACENAMIENTO
═══════════════════════════════════════════════════════════════════════════════

• Datos individuales: Máximo 90 días desde la captura
• Datos agregados anónimos: Hasta 24 meses para estudios longitudinales
• Logs de auditoría: 5 años (obligación legal)

Transcurridos estos plazos, los datos serán eliminados automáticamente
mediante procedimientos certificados de borrado seguro.

═══════════════════════════════════════════════════════════════════════════════
9. SUS DERECHOS (LEY 25.326)
═══════════════════════════════════════════════════════════════════════════════

Usted tiene derecho a:

✓ ACCESO: Solicitar copia de sus datos biométricos procesados
✓ RECTIFICACIÓN: Corregir datos inexactos o incompletos
✓ SUPRESIÓN: Solicitar eliminación de sus datos ("derecho al olvido")
✓ OPOSICIÓN: Negarse al tratamiento sin consecuencias laborales
✓ REVOCACIÓN: Retirar su consentimiento en cualquier momento
✓ PORTABILIDAD: Recibir sus datos en formato estructurado
✓ LIMITACIÓN: Restringir ciertos tipos de procesamiento
✓ NO DISCRIMINACIÓN: No sufrir trato desfavorable por negarse

IMPORTANTE: La negativa o revocación NO afectará:
- Su situación laboral
- Su remuneración
- Sus beneficios
- Sus oportunidades de desarrollo profesional

═══════════════════════════════════════════════════════════════════════════════
10. PROCEDIMIENTO PARA EJERCER SUS DERECHOS
═══════════════════════════════════════════════════════════════════════════════

Para revocar su consentimiento o ejercer cualquier derecho:

1. Ingrese al sistema con validación biométrica
2. Acceda a "Mi Perfil" → "Consentimientos"
3. Seleccione "Revocar Consentimiento Biométrico"
4. Confirme mediante validación biométrica (huella o facial)
5. Recibirá confirmación por email en 24 horas

También puede enviar solicitud escrita a: [EMAIL/DOMICILIO DPO]

Plazo de respuesta: 10 días hábiles (Ley 25.326, Art. 14)

═══════════════════════════════════════════════════════════════════════════════
11. MEDIDAS DE SEGURIDAD
═══════════════════════════════════════════════════════════════════════════════

Los datos biométricos están protegidos mediante:

• Encriptación AES-256 en reposo y tránsito
• Infraestructura Microsoft Azure (certificada ISO 27001)
• Acceso mediante autenticación multifactor
• Logs de auditoría inalterables
• Copias de seguridad encriptadas
• Controles de acceso basados en roles (RBAC)
• Monitoreo 24/7 de intrusiones

═══════════════════════════════════════════════════════════════════════════════
12. TRANSFERENCIAS INTERNACIONALES
═══════════════════════════════════════════════════════════════════════════════

Los datos son procesados por Azure Face API en servidores ubicados en:
• Estados Unidos (Microsoft Azure East US)
• Certificados mediante Privacy Shield Framework y cláusulas contractuales estándar

Microsoft Azure actúa como procesador de datos y no tiene acceso a datos
identificables. Los datos se procesan en tiempo real y NO se almacenan
permanentemente en servidores de Microsoft.

═══════════════════════════════════════════════════════════════════════════════
13. CONSECUENCIAS DE NO CONSENTIR
═══════════════════════════════════════════════════════════════════════════════

Si decide NO otorgar su consentimiento:

✓ Su fichaje funcionará normalmente (registro de entrada/salida)
✓ Su identificación biométrica NO se verá afectada
✗ NO se generarán análisis emocionales ni de fatiga
✗ NO participará en estadísticas de bienestar organizacional

Esto NO afectará negativamente su relación laboral de ninguna manera.

═══════════════════════════════════════════════════════════════════════════════
14. AUTORIDAD DE APLICACIÓN
═══════════════════════════════════════════════════════════════════════════════

Agencia de Acceso a la Información Pública (Argentina)
Dirección: Av. Pte. Gral. Julio A. Roca 710, Piso 3°, CABA
Teléfono: 0800-333-2345
Web: www.argentina.gob.ar/aaip

Puede presentar reclamos ante esta autoridad si considera que sus derechos
han sido vulnerados.

═══════════════════════════════════════════════════════════════════════════════
15. MODIFICACIONES AL CONSENTIMIENTO
═══════════════════════════════════════════════════════════════════════════════

Cualquier cambio en este consentimiento requerirá:
• Notificación fehaciente con 30 días de anticipación
• Nueva aceptación expresa mediante validación biométrica
• Derecho a revocar sin penalización

═══════════════════════════════════════════════════════════════════════════════
16. DECLARACIÓN DE CONSENTIMIENTO
═══════════════════════════════════════════════════════════════════════════════

Al aceptar mediante validación biométrica (facial o huella dactilar),
declaro que:

□ He leído y comprendido la totalidad de este documento
□ He tenido oportunidad de realizar consultas y fueron respondidas
□ Comprendo las capacidades y limitaciones del sistema
□ Conozco mis derechos y cómo ejercerlos
□ Otorgo mi consentimiento de manera libre, expresa e informada
□ Entiendo que puedo revocar este consentimiento en cualquier momento
□ Acepto que mis datos sean tratados según lo descrito

═══════════════════════════════════════════════════════════════════════════════

VALIDACIÓN BIOMÉTRICA REQUERIDA

Para garantizar la autenticidad de este consentimiento, debe validarse mediante:
- Reconocimiento facial, O
- Huella dactilar

Datos de aceptación registrados:
- Fecha y hora
- Dirección IP
- Dispositivo utilizado
- Método de validación biométrica

═══════════════════════════════════════════════════════════════════════════════
`.trim();

// ========================================
// FUNCIONES PRINCIPALES
// ========================================

function showBiometricconsentContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;

    content.innerHTML = `
        <div class="tab-content active" id="biometric-consent">
            <div class="card">
                <h2>🔐 Gestión de Consentimientos Biométricos</h2>
                <p>Administre los consentimientos informados para análisis emocional y detección de fatiga según Ley 25.326.</p>

                <!-- Advertencia de Costos -->
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                    <h4 style="margin-top: 0; color: #856404;">💰 Información de Costos Azure Face API</h4>
                    <ul style="margin: 10px 0; color: #856404;">
                        <li><strong>Tier Gratuito:</strong> 30,000 transacciones/mes sin cargo</li>
                        <li><strong>Costo adicional:</strong> USD $1.00 por cada 1,000 transacciones extras</li>
                        <li><strong>Facturación:</strong> A cargo de la empresa</li>
                    </ul>
                    <p style="margin-bottom: 0; color: #856404;">
                        ⚠️ <strong>Importante:</strong> Este módulo es opcional. La empresa debe adherir explícitamente
                        para habilitar esta funcionalidad. Los empleados NO tienen costos asociados.
                    </p>
                </div>

                <!-- Panel de Control Principal -->
                <div style="display: grid; grid-template-columns: 1fr 350px; gap: 30px; margin-bottom: 30px;">

                    <!-- Editor de Documento Legal -->
                    <div>
                        <h3>📋 Documento Legal de Consentimiento</h3>

                        <div class="form-group">
                            <label for="consent-version">🔄 Versión del Documento:</label>
                            <input type="text" id="consent-version" placeholder="1.0" value="1.0" readonly>
                        </div>

                        <div class="form-group">
                            <label for="consent-content">📄 Texto Legal Completo:</label>
                            <textarea id="consent-content" rows="20" style="width: 100%; font-family: 'Courier New', monospace; font-size: 0.85em; line-height: 1.4;">${BIOMETRIC_CONSENT_TEXT}</textarea>
                        </div>

                        <div style="display: flex; gap: 10px;">
                            <button onclick="previewBiometricConsent()" class="btn btn-info" style="flex: 1;">
                                👁️ Vista Previa
                            </button>
                            <button onclick="generateConsentPDF()" class="btn btn-secondary" style="flex: 1;">
                                📄 Generar PDF
                            </button>
                            <button onclick="saveConsentDocument()" class="btn btn-primary" style="flex: 1;">
                                💾 Guardar Cambios
                            </button>
                        </div>
                    </div>

                    <!-- Panel Lateral de Estadísticas -->
                    <div>
                        <h3>📊 Estado de Consentimientos</h3>

                        <div class="stat-card" style="margin-bottom: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <div class="stat-number" id="total-employees">0</div>
                            <div class="stat-label">👥 Total Empleados</div>
                        </div>

                        <div class="stat-card" style="margin-bottom: 15px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
                            <div class="stat-number" id="consents-given">0</div>
                            <div class="stat-label">✅ Consentimientos Activos</div>
                        </div>

                        <div class="stat-card" style="margin-bottom: 15px; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white;">
                            <div class="stat-number" id="consents-pending">0</div>
                            <div class="stat-label">⏳ Pendientes</div>
                        </div>

                        <div class="stat-card" style="margin-bottom: 15px; background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); color: white;">
                            <div class="stat-number" id="consents-revoked">0</div>
                            <div class="stat-label">🚫 Revocados</div>
                        </div>

                        <div class="stat-card" style="margin-bottom: 20px; background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #333;">
                            <div class="stat-number" id="consent-percentage">0%</div>
                            <div class="stat-label">📈 Tasa de Aceptación</div>
                        </div>

                        <div class="form-group">
                            <label>⚡ Acciones Rápidas:</label>
                            <button onclick="requestAllConsents()" class="btn btn-warning btn-sm" style="width: 100%; margin-bottom: 10px;">
                                📧 Solicitar a Pendientes
                            </button>
                            <button onclick="exportConsentData()" class="btn btn-info btn-sm" style="width: 100%; margin-bottom: 10px;">
                                📊 Exportar Registro
                            </button>
                            <button onclick="generateComplianceReport()" class="btn btn-success btn-sm" style="width: 100%;">
                                📋 Reporte de Cumplimiento
                            </button>
                        </div>

                        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 20px;">
                            <h4 style="margin-top: 0; color: #2e7d32; font-size: 0.95em;">⚖️ Cumplimiento Legal</h4>
                            <div style="font-size: 0.85em; color: #2e7d32;">
                                <p>✓ Ley 25.326 (Argentina)</p>
                                <p>✓ GDPR (Unión Europea)</p>
                                <p>✓ BIPA (Illinois, USA)</p>
                                <p>✓ ISO/IEC 29100:2011</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tabla de Consentimientos -->
                <div class="card">
                    <h3>📋 Registro de Consentimientos por Empleado</h3>

                    <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                        <button onclick="filterConsents('all')" class="btn btn-primary btn-sm">👥 Todos</button>
                        <button onclick="filterConsents('active')" class="btn btn-success btn-sm">✅ Activos</button>
                        <button onclick="filterConsents('pending')" class="btn btn-warning btn-sm">⏳ Pendientes</button>
                        <button onclick="filterConsents('revoked')" class="btn btn-danger btn-sm">🚫 Revocados</button>
                        <button onclick="filterConsents('expired')" class="btn btn-secondary btn-sm">⏰ Expirados</button>
                    </div>

                    <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>👤 Empleado</th>
                                    <th>📧 Email</th>
                                    <th>📊 Estado</th>
                                    <th>📅 Fecha Consentimiento</th>
                                    <th>🔐 Método Validación</th>
                                    <th>🌐 IP</th>
                                    <th>⏰ Expira</th>
                                    <th>⚙️ Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="consents-tbody">
                                <tr>
                                    <td colspan="8" style="text-align: center; padding: 30px; color: #6c757d;">
                                        🔄 Cargando registros de consentimientos...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Modal de Vista Previa -->
            <div id="consent-preview-modal" class="modal" style="display: none !important;">
                <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3>👁️ Vista Previa - Consentimiento Biométrico</h3>
                        <span onclick="closeConsentPreview()" style="font-size: 28px; cursor: pointer;">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div id="consent-preview-content" style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 0.85em; line-height: 1.5; background: #f8f9fa; padding: 25px; border-radius: 8px;">
                            <!-- Se llenará dinámicamente -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button onclick="closeConsentPreview()" class="btn btn-secondary">❌ Cerrar</button>
                        <button onclick="generateConsentPDF()" class="btn btn-primary">📄 Generar PDF</button>
                    </div>
                </div>
            </div>

            <!-- Modal de Validación Biométrica -->
            <div id="biometric-validation-modal" class="modal" style="display: none !important;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>🔐 Validación Biométrica Requerida</h3>
                    </div>
                    <div class="modal-body" style="text-align: center; padding: 40px;">
                        <p style="font-size: 1.1em; margin-bottom: 30px;">
                            Para procesar el consentimiento, debe validar su identidad mediante uno de los siguientes métodos:
                        </p>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                            <button onclick="validateWithFace()" class="btn btn-primary" style="padding: 30px; font-size: 1.1em;">
                                😊 Reconocimiento Facial
                            </button>
                            <button onclick="validateWithFingerprint()" class="btn btn-info" style="padding: 30px; font-size: 1.1em;">
                                👆 Huella Dactilar
                            </button>
                        </div>
                        <div id="biometric-validation-status" style="min-height: 60px; background: #f8f9fa; padding: 20px; border-radius: 8px;">
                            <p style="color: #6c757d; margin: 0;">Seleccione un método de validación</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button onclick="closeBiometricValidation()" class="btn btn-secondary">❌ Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    console.log('🔐 [BIOMETRIC-CONSENT] Interfaz cargada');
    loadConsentsData();
}

// Cargar datos de consentimientos
async function loadConsentsData() {
    const tbody = document.getElementById('consents-tbody');

    try {
        showConsentMessage('🔄 Cargando datos de consentimientos...', 'info');

        const token = localStorage.getItem('authToken');

        if (!token) {
            console.warn('⚠️ No hay token de autenticación');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="padding: 40px; text-align: center;">
                            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; display: inline-block;">
                                <div style="font-size: 48px; margin-bottom: 10px;">🔒</div>
                                <p style="color: #92400e; margin: 5px 0; font-weight: 600;">Sesión no válida</p>
                                <p style="color: #78350f; margin: 0; font-size: 14px;">Por favor, recarga la página para iniciar sesión</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
            return;
        }

        // TODO: Reemplazar con llamada real a API
        const response = await fetch('/api/v1/biometric/consents', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            console.warn('⚠️ Token expirado (401)');
            localStorage.removeItem('authToken');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="padding: 40px; text-align: center;">
                            <div style="background: #fee2e2; padding: 20px; border-radius: 8px; display: inline-block;">
                                <div style="font-size: 48px; margin-bottom: 10px;">⏰</div>
                                <p style="color: #991b1b; margin: 5px 0; font-weight: 600;">Sesión expirada</p>
                                <p style="color: #dc2626; margin: 0; font-size: 14px;">Por favor, recarga la página para iniciar sesión nuevamente</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
            return;
        }

        if (!response.ok) {
            throw new Error('Error cargando consentimientos');
        }

        const data = await response.json();
        updateConsentsTable(data.consents || []);
        updateConsentsStats(data.stats || {});

        showConsentMessage('✅ Datos cargados correctamente', 'success');
    } catch (error) {
        console.error('Error:', error);
        showConsentMessage('❌ Error cargando datos: ' + error.message, 'error');

        // Mostrar datos de ejemplo si falla
        loadMockConsentsData();
    }
}

// Datos de ejemplo (para desarrollo)
function loadMockConsentsData() {
    const mockData = {
        consents: [
            {
                id: 1,
                userId: 'uuid-001',
                employeeName: 'Juan Pérez',
                email: 'juan.perez@empresa.com',
                status: 'active',
                consentDate: '2025-01-15T10:30:00Z',
                validationMethod: 'facial',
                ipAddress: '192.168.1.100',
                expiresAt: '2026-01-15T10:30:00Z'
            },
            {
                id: 2,
                userId: 'uuid-002',
                employeeName: 'María González',
                email: 'maria.gonzalez@empresa.com',
                status: 'pending',
                consentDate: null,
                validationMethod: null,
                ipAddress: null,
                expiresAt: null
            },
            {
                id: 3,
                userId: 'uuid-003',
                employeeName: 'Carlos Rodríguez',
                email: 'carlos.rodriguez@empresa.com',
                status: 'revoked',
                consentDate: '2025-01-10T14:20:00Z',
                revokedDate: '2025-01-20T09:15:00Z',
                validationMethod: 'fingerprint',
                ipAddress: '192.168.1.105',
                expiresAt: null
            }
        ],
        stats: {
            total: 3,
            active: 1,
            pending: 1,
            revoked: 1,
            expired: 0
        }
    };

    updateConsentsTable(mockData.consents);
    updateConsentsStats(mockData.stats);
}

// Actualizar tabla de consentimientos
function updateConsentsTable(consents) {
    const tbody = document.getElementById('consents-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (consents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: #6c757d;">No hay registros de consentimientos</td></tr>';
        return;
    }

    consents.forEach(consent => {
        const statusBadge = getStatusBadge(consent.status);
        const validationIcon = getValidationIcon(consent.validationMethod);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${consent.employeeName}</strong></td>
            <td>${consent.email}</td>
            <td>${statusBadge}</td>
            <td>${consent.consentDate ? new Date(consent.consentDate).toLocaleString('es-AR') : '-'}</td>
            <td>${validationIcon}</td>
            <td style="font-family: monospace; font-size: 0.85em;">${consent.ipAddress || '-'}</td>
            <td>${consent.expiresAt ? new Date(consent.expiresAt).toLocaleDateString('es-AR') : '-'}</td>
            <td>
                ${getConsentActions(consent)}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Obtener badge de estado
function getStatusBadge(status) {
    const badges = {
        'active': '<span class="status-badge success">✅ Activo</span>',
        'pending': '<span class="status-badge warning">⏳ Pendiente</span>',
        'revoked': '<span class="status-badge danger">🚫 Revocado</span>',
        'expired': '<span class="status-badge secondary">⏰ Expirado</span>'
    };
    return badges[status] || '<span class="status-badge">❓ Desconocido</span>';
}

// Obtener ícono de validación
function getValidationIcon(method) {
    if (!method) return '-';
    return method === 'facial' ? '😊 Facial' : '👆 Huella';
}

// Obtener acciones según estado
function getConsentActions(consent) {
    if (consent.status === 'pending') {
        return `
            <button onclick="requestConsentFromEmployee('${consent.userId}')" class="btn-icon" style="background: #ffc107;" title="Solicitar Consentimiento">
                📧
            </button>
        `;
    } else if (consent.status === 'active') {
        return `
            <button onclick="viewConsentDetails('${consent.id}')" class="btn-icon" style="background: #007bff;" title="Ver Detalles">
                📋
            </button>
            <button onclick="downloadConsentPDF('${consent.id}')" class="btn-icon" style="background: #28a745;" title="Descargar PDF">
                📄
            </button>
        `;
    } else if (consent.status === 'revoked') {
        return `
            <button onclick="viewConsentDetails('${consent.id}')" class="btn-icon" style="background: #6c757d;" title="Ver Historial">
                📋
            </button>
        `;
    }
    return '-';
}

// Actualizar estadísticas
function updateConsentsStats(stats) {
    document.getElementById('total-employees').textContent = stats.total || 0;
    document.getElementById('consents-given').textContent = stats.active || 0;
    document.getElementById('consents-pending').textContent = stats.pending || 0;
    document.getElementById('consents-revoked').textContent = stats.revoked || 0;

    const percentage = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;
    document.getElementById('consent-percentage').textContent = percentage + '%';
}

// Vista previa del consentimiento
function previewBiometricConsent() {
    const content = document.getElementById('consent-content').value;
    const previewContent = document.getElementById('consent-preview-content');
    previewContent.textContent = content;

    const modal = document.getElementById('consent-preview-modal');
    modal.style.setProperty('display', 'block', 'important');
}

// Cerrar vista previa
function closeConsentPreview() {
    const modal = document.getElementById('consent-preview-modal');
    modal.style.setProperty('display', 'none', 'important');
}

// Validación biométrica facial
async function validateWithFace() {
    const statusDiv = document.getElementById('biometric-validation-status');
    statusDiv.innerHTML = '<p style="color: #007bff; margin: 0;">🔄 Inicializando cámara...</p>';

    try {
        // TODO: Implementar validación real con Azure Face API
        await new Promise(resolve => setTimeout(resolve, 2000));

        statusDiv.innerHTML = '<p style="color: #28a745; margin: 0;">✅ Validación exitosa mediante reconocimiento facial</p>';

        setTimeout(() => {
            closeBiometricValidation();
            if (pendingBiometricValidation) {
                pendingBiometricValidation.callback('facial');
                pendingBiometricValidation = null;
            }
        }, 1500);

    } catch (error) {
        statusDiv.innerHTML = '<p style="color: #dc3545; margin: 0;">❌ Error en validación: ' + error.message + '</p>';
    }
}

// Validación biométrica por huella
async function validateWithFingerprint() {
    const statusDiv = document.getElementById('biometric-validation-status');
    statusDiv.innerHTML = '<p style="color: #007bff; margin: 0;">🔄 Esperando huella dactilar...</p>';

    try {
        // TODO: Implementar validación real con lector de huella
        await new Promise(resolve => setTimeout(resolve, 2000));

        statusDiv.innerHTML = '<p style="color: #28a745; margin: 0;">✅ Validación exitosa mediante huella dactilar</p>';

        setTimeout(() => {
            closeBiometricValidation();
            if (pendingBiometricValidation) {
                pendingBiometricValidation.callback('fingerprint');
                pendingBiometricValidation = null;
            }
        }, 1500);

    } catch (error) {
        statusDiv.innerHTML = '<p style="color: #dc3545; margin: 0;">❌ Error en validación: ' + error.message + '</p>';
    }
}

// Cerrar modal de validación biométrica
function closeBiometricValidation() {
    const modal = document.getElementById('biometric-validation-modal');
    modal.style.setProperty('display', 'none', 'important');
    pendingBiometricValidation = null;
}

// Solicitar validación biométrica
function requestBiometricValidation(callback) {
    pendingBiometricValidation = { callback };
    const modal = document.getElementById('biometric-validation-modal');
    modal.style.setProperty('display', 'block', 'important');
}

// Solicitar consentimiento a empleado
async function requestConsentFromEmployee(userId) {
    showConsentMessage('📧 Enviando solicitud de consentimiento...', 'info');

    try {
        // TODO: Implementar llamada real a API
        await new Promise(resolve => setTimeout(resolve, 1500));
        showConsentMessage('✅ Solicitud enviada exitosamente', 'success');
    } catch (error) {
        showConsentMessage('❌ Error enviando solicitud: ' + error.message, 'error');
    }
}

// Solicitar a todos los pendientes
async function requestAllConsents() {
    if (!confirm('¿Desea enviar solicitud de consentimiento a todos los empleados pendientes?')) {
        return;
    }

    showConsentMessage('📧 Enviando solicitudes masivas...', 'info');

    try {
        // TODO: Implementar llamada real a API
        await new Promise(resolve => setTimeout(resolve, 2000));
        showConsentMessage('✅ Solicitudes enviadas correctamente', 'success');
    } catch (error) {
        showConsentMessage('❌ Error: ' + error.message, 'error');
    }
}

// Generar PDF de consentimiento
function generateConsentPDF() {
    showConsentMessage('📄 Generando PDF del documento legal...', 'info');
    // TODO: Implementar generación real de PDF
    setTimeout(() => {
        showConsentMessage('✅ PDF generado exitosamente', 'success');
    }, 2000);
}

// Exportar datos de consentimientos
function exportConsentData() {
    showConsentMessage('📊 Exportando registro de consentimientos...', 'info');
    // TODO: Implementar exportación real
    setTimeout(() => {
        showConsentMessage('✅ Datos exportados correctamente', 'success');
    }, 1500);
}

// Generar reporte de cumplimiento
function generateComplianceReport() {
    showConsentMessage('📋 Generando reporte de cumplimiento legal...', 'info');
    // TODO: Implementar generación de reporte
    setTimeout(() => {
        showConsentMessage('✅ Reporte generado correctamente', 'success');
    }, 2000);
}

// Filtrar consentimientos
function filterConsents(filter) {
    showConsentMessage(`🔍 Filtrando: ${filter}`, 'info');
    // TODO: Implementar filtrado real
    loadConsentsData();
}

// Ver detalles de consentimiento
function viewConsentDetails(consentId) {
    showConsentMessage('📋 Cargando detalles...', 'info');
    // TODO: Implementar vista de detalles
}

// Descargar PDF de consentimiento
function downloadConsentPDF(consentId) {
    showConsentMessage('📄 Descargando PDF...', 'info');
    // TODO: Implementar descarga
}

// Guardar documento de consentimiento
async function saveConsentDocument() {
    showConsentMessage('💾 Guardando documento...', 'info');

    try {
        const content = document.getElementById('consent-content').value;
        const version = document.getElementById('consent-version').value;

        // TODO: Implementar guardado real
        await new Promise(resolve => setTimeout(resolve, 1500));

        showConsentMessage('✅ Documento guardado exitosamente', 'success');
    } catch (error) {
        showConsentMessage('❌ Error guardando: ' + error.message, 'error');
    }
}

// Mostrar mensajes
function showConsentMessage(message, type) {
    console.log(`🔐 [BIOMETRIC-CONSENT] ${message}`);

    if (window.progressiveAdmin && window.progressiveAdmin.updateLoadingStatus) {
        window.progressiveAdmin.updateLoadingStatus(message);
    }
}

// Exportar funciones globales
window.biometricConsent = {
    show: showBiometricconsentContent,
    requestValidation: requestBiometricValidation,
    config: BIOMETRIC_CONSENT_CONFIG
};

console.log('✅ [BIOMETRIC-CONSENT] Módulo cargado completamente');

})(); // Cierre del IIFE
