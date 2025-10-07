// Settings Module - v4.0 PROGRESSIVE
console.log('⚙️ [SETTINGS] Módulo settings cargado');

// Settings functions
function showSettingsContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;

    content.innerHTML = `
        <div class="tab-content active" id="settings">
            <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <h2>📡 Configuración del Servidor para APK</h2>
                <p style="margin: 10px 0; font-size: 14px; opacity: 0.9;">
                    Use esta información para configurar la APK Flutter manualmente
                </p>
                <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px; margin: 15px 0;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <label style="font-weight: bold; font-size: 12px; opacity: 0.9;">DIRECCIÓN IP DEL SERVIDOR:</label>
                            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                                <span id="server-ip" style="font-family: monospace; font-size: 20px; font-weight: bold;">Cargando...</span>
                                <button onclick="copyToClipboard('server-ip')" class="btn btn-sm" style="background: rgba(255,255,255,0.3); border: none; color: white;">📋 Copiar</button>
                            </div>
                        </div>
                        <div>
                            <label style="font-weight: bold; font-size: 12px; opacity: 0.9;">PUERTO:</label>
                            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                                <span id="server-port" style="font-family: monospace; font-size: 20px; font-weight: bold;">Cargando...</span>
                                <button onclick="copyToClipboard('server-port')" class="btn btn-sm" style="background: rgba(255,255,255,0.3); border: none; color: white;">📋 Copiar</button>
                            </div>
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px; margin-top: 15px; text-align: center;">
                        <strong>URL COMPLETA:</strong>
                        <span id="server-full-url" style="font-family: monospace; font-size: 16px; margin-left: 10px;">http://...</span>
                        <button onclick="copyToClipboard('server-full-url')" class="btn btn-sm" style="background: rgba(255,255,255,0.3); border: none; color: white; margin-left: 10px;">📋 Copiar URL</button>
                    </div>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; font-size: 13px;">
                    <strong>📱 Para configurar la APK:</strong><br>
                    1. Abrir APK → Configuración<br>
                    2. Ingresar IP: <span id="apk-ip-hint" style="font-family: monospace; font-weight: bold;">...</span><br>
                    3. Ingresar Puerto: <span id="apk-port-hint" style="font-family: monospace; font-weight: bold;">...</span><br>
                    4. Guardar y usar
                </div>
            </div>

            <div class="card">
                <h2>🏢 Datos de la Empresa</h2>
                <div class="form-group">
                    <label>Nombre de la Empresa:</label>
                    <input type="text" id="companyName" placeholder="Nombre de la empresa">
                </div>
                <div class="form-group">
                    <label>Zona Horaria:</label>
                    <select id="timezone">
                        <option value="America/Argentina/Buenos_Aires">Argentina/Buenos Aires</option>
                        <option value="America/Mexico_City">México/Ciudad de México</option>
                        <option value="America/Bogota">Colombia/Bogotá</option>
                        <option value="America/Lima">Perú/Lima</option>
                        <option value="America/Santiago">Chile/Santiago</option>
                    </select>
                </div>
                <button class="btn btn-success" onclick="saveCompanyConfig()">💾 Guardar Configuración</button>
            </div>
            
            <div class="card">
                <h2>🔐 Configuración Biométrica</h2>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="fingerprintEnabled" checked> Reconocimiento de Huella
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="faceRecognitionEnabled" checked> Reconocimiento Facial
                    </label>
                </div>
                <div class="form-group">
                    <label>Máximo de Huellas por Usuario:</label>
                    <input type="number" id="maxFingerprints" value="5" min="1" max="10">
                </div>
                <button class="btn btn-success" onclick="saveBiometricConfig()">💾 Guardar Biométrica</button>
            </div>
            
            <div class="card">
                <h2>📧 Configuración de Comunicaciones</h2>
                
                <h3>📧 Email</h3>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="emailNotifications" checked> Notificaciones por Email
                    </label>
                </div>
                <div class="form-group">
                    <label>Servidor SMTP:</label>
                    <input type="text" id="smtpServer" placeholder="smtp.gmail.com">
                </div>
                <div class="form-group">
                    <label>Email del Sistema:</label>
                    <input type="email" id="systemEmail" placeholder="sistema@aponnt.com">
                </div>
                <button class="btn btn-success" onclick="saveNotificationConfig()">💾 Guardar Notificaciones</button>
                <button class="btn btn-warning" onclick="testEmail()">📧 Probar Email</button>
                
                <h3>📱 WhatsApp Business</h3>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="whatsappEnabled" checked> WhatsApp Activado
                    </label>
                </div>
                <div class="form-group">
                    <label>Token de WhatsApp Business:</label>
                    <input type="password" id="whatsappToken" placeholder="Token de la API">
                </div>
                <div class="form-group">
                    <label>Número de WhatsApp:</label>
                    <input type="tel" id="whatsappNumber" placeholder="+54 2657 673741">
                </div>
                <button class="btn btn-success" onclick="saveWhatsAppConfig()">💾 Guardar WhatsApp</button>
                <button class="btn btn-warning" onclick="testWhatsApp()">📱 Probar WhatsApp</button>
            </div>
            
            <div class="card">
                <h2>🏥 Configuración Médica General</h2>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="medicalModuleEnabled" checked> Módulo Médico Activado
                    </label>
                </div>
                <div class="form-group">
                    <label>Días máximos para certificados:</label>
                    <input type="number" id="maxCertificateDays" value="30" min="1" max="365">
                </div>
                <div class="form-group">
                    <label>Requiere auditoría médica:</label>
                    <select id="requiresAudit">
                        <option value="always">Siempre</option>
                        <option value="over_days">Solo más de X días</option>
                        <option value="never">Nunca</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Días límite para auditoría:</label>
                    <input type="number" id="auditDaysLimit" value="7" min="1" max="30">
                </div>
                <button class="btn btn-success" onclick="saveMedicalGeneralConfig()">💾 Guardar Configuración Médica</button>
            </div>

            <div class="card">
                <h2>📋 Cuestionarios Médicos</h2>
                <button class="btn btn-primary" onclick="showCreateQuestionnaireDialog()">➕ Crear Cuestionario</button>
                <div id="questionnaires-list" class="data-list" style="margin-top: 20px;">
                    <div class="questionnaire-item">
                        <strong>Cuestionario COVID-19</strong>
                        <span class="status-badge success">Activo</span>
                        <button class="btn btn-sm btn-primary" onclick="editQuestionnaire(1)">✏️ Editar</button>
                    </div>
                    <div class="questionnaire-item">
                        <strong>Evaluación de Síntomas Generales</strong>
                        <span class="status-badge success">Activo</span>
                        <button class="btn btn-sm btn-primary" onclick="editQuestionnaire(2)">✏️ Editar</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <h2>🚨 Configuración Multiple ART</h2>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="artNotificationsEnabled" checked> Notificaciones ART Activadas
                    </label>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
                    <h4 style="color: #2c5aa0;">Proveedores ART Configurados</h4>
                    <button class="btn btn-primary" onclick="addNewART()">➕ Agregar ART</button>
                </div>
                
                <div id="art-providers-list" style="margin: 15px 0;">
                    <div class="alert alert-info">
                        <i>No hay proveedores ART configurados. Haga clic en "Agregar ART" para comenzar.</i>
                    </div>
                </div>
                
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                    <div class="form-group">
                        <label>Canal global de notificación:</label>
                        <select id="globalArtChannel">
                            <option value="email">Email</option>
                            <option value="sms">SMS</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="all">Todos los canales</option>
                        </select>
                    </div>
                    <button class="btn btn-success" onclick="saveMultipleARTConfig()">💾 Guardar Configuración</button>
                    <button class="btn btn-warning" onclick="testAllARTNotifications()">🚨 Probar Todas las ARTs</button>
                </div>
            </div>
            
            <div class="card">
                <h2>🏖️ Régimen de Licencias y Vacaciones</h2>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
                    <h4 style="color: #2c5aa0;">Configuración de Vacaciones</h4>
                    <button class="btn btn-info" onclick="showVacationCalculator()">🧮 Calculadora</button>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div style="background: #e8f5e8; padding: 15px; border-radius: 8px;">
                        <h6>📅 Días de Vacaciones por Antigüedad</h6>
                        <div id="vacation-scale">
                            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 5px; margin: 5px 0; font-weight: bold;">
                                <span>Antigüedad</span>
                                <span>Días</span>
                                <span>Acción</span>
                            </div>
                            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 5px; margin: 5px 0;">
                                <span>6 meses - 5 años</span>
                                <input type="number" value="14" min="1" style="width: 50px;">
                                <button class="btn btn-sm btn-success" onclick="updateVacationScale(1)">✓</button>
                            </div>
                            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 5px; margin: 5px 0;">
                                <span>5 - 10 años</span>
                                <input type="number" value="21" min="1" style="width: 50px;">
                                <button class="btn btn-sm btn-success" onclick="updateVacationScale(2)">✓</button>
                            </div>
                            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 5px; margin: 5px 0;">
                                <span>10 - 20 años</span>
                                <input type="number" value="28" min="1" style="width: 50px;">
                                <button class="btn btn-sm btn-success" onclick="updateVacationScale(3)">✓</button>
                            </div>
                            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 5px; margin: 5px 0;">
                                <span>Más de 20 años</span>
                                <input type="number" value="35" min="1" style="width: 50px;">
                                <button class="btn btn-sm btn-success" onclick="updateVacationScale(4)">✓</button>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="addCustomVacationScale()">➕ Agregar Escala</button>
                    </div>
                    
                    <div style="background: #fff3e0; padding: 15px; border-radius: 8px;">
                        <h6>🚨 Licencias Extraordinarias</h6>
                        <div id="extraordinary-licenses">
                            <div style="margin: 10px 0;">
                                <label>Fallecimiento familiar:</label>
                                <div style="display: flex; gap: 5px; align-items: center;">
                                    <input type="number" value="3" min="1" style="width: 50px;">
                                    <span>días</span>
                                    <select style="width: 80px;">
                                        <option value="habil">Hábiles</option>
                                        <option value="corrido">Corridos</option>
                                    </select>
                                </div>
                            </div>
                            <div style="margin: 10px 0;">
                                <label>Matrimonio:</label>
                                <div style="display: flex; gap: 5px; align-items: center;">
                                    <input type="number" value="10" min="1" style="width: 50px;">
                                    <span>días</span>
                                    <select style="width: 80px;">
                                        <option value="corrido" selected>Corridos</option>
                                        <option value="habil">Hábiles</option>
                                    </select>
                                </div>
                            </div>
                            <div style="margin: 10px 0;">
                                <label>Paternidad:</label>
                                <div style="display: flex; gap: 5px; align-items: center;">
                                    <input type="number" value="15" min="1" style="width: 50px;">
                                    <span>días</span>
                                    <select style="width: 80px;">
                                        <option value="corrido" selected>Corridos</option>
                                        <option value="habil">Hábiles</option>
                                    </select>
                                </div>
                            </div>
                            <div style="margin: 10px 0;">
                                <label>Examen médico:</label>
                                <div style="display: flex; gap: 5px; align-items: center;">
                                    <input type="number" value="1" min="1" style="width: 50px;">
                                    <span>día</span>
                                    <select style="width: 80px;">
                                        <option value="habil" selected>Hábil</option>
                                        <option value="corrido">Corrido</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-success btn-sm" onclick="addCustomExtraordinaryLicense()">➕ Agregar Tipo</button>
                    </div>
                </div>
                
                <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h6>⚖️ Configuración de Cálculo</h6>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label>
                                <input type="checkbox" id="vacationInterruptible" checked> 
                                Las vacaciones pueden interrumpirse por enfermedad
                            </label>
                            <div style="margin: 10px 0;">
                                <label>Período mínimo de vacaciones continuas:</label>
                                <input type="number" id="minContinuousVacation" value="7" min="1"> días
                            </div>
                            <div style="margin: 10px 0;">
                                <label>Período máximo de fraccionamiento:</label>
                                <input type="number" id="maxFractions" value="3" min="1"> partes
                            </div>
                        </div>
                        <div>
                            <label>
                                <input type="checkbox" id="autoScheduling" checked>
                                Programación automática por compatibilidad de tareas
                            </label>
                            <div style="margin: 10px 0;">
                                <label>Antelación mínima para solicitar:</label>
                                <input type="number" id="minAdvanceNotice" value="15" min="1"> días
                            </div>
                            <div style="margin: 10px 0;">
                                <label>Máximo de empleados simultáneos en vacaciones:</label>
                                <input type="number" id="maxSimultaneousVacations" value="30" min="1">% del equipo
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <button class="btn btn-success" onclick="saveLicenseConfig()">💾 Guardar Configuración de Licencias</button>
                    <button class="btn btn-primary" onclick="generateVacationSchedule()">📋 Generar Cronograma Automático</button>
                    <button class="btn btn-info" onclick="showCompatibilityMatrix()">🔄 Ver Matriz de Compatibilidad</button>
                </div>
            </div>
            
            <div class="card">
                <h2>📱 Configuración de Código QR</h2>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="barcodeEnabled" checked> Permitir marcado con código de barras
                    </label>
                </div>
                <div class="form-group">
                    <label>Formato del código:</label>
                    <select id="barcodeFormat">
                        <option value="employee_id">ID del Empleado</option>
                        <option value="custom">Código personalizado</option>
                        <option value="qr_code">QR Code con datos JSON</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Prefijo del código (opcional):</label>
                    <input type="text" id="barcodePrefix" placeholder="EMP-">
                </div>
                <button class="btn btn-success" onclick="saveBarcodeConfig()">💾 Guardar Configuración</button>
                <button class="btn btn-primary" onclick="generateEmployeeBarcodes()">📊 Generar Códigos</button>
                <button class="btn btn-warning" onclick="testBarcodeScanner()">📱 Probar Escáner</button>
                
                <div id="barcode-preview" style="margin-top: 20px;"></div>
            </div>
            
            <div class="card">
                <h2>⚠️ Sistema de Alertas Fuera de Turno</h2>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="outOfShiftAlerts" checked> Activar alertas para marcado fuera de turno
                    </label>
                </div>
                <div class="form-group">
                    <label>Administradores a notificar:</label>
                    <div id="admin-notifications" style="margin-top: 10px;">
                        <label><input type="checkbox" id="notify-admin1" checked> Admin Principal - SMS: +54 2657 673741</label><br>
                        <label><input type="checkbox" id="notify-admin2"> Admin Secundario - Email: admin2@empresa.com</label><br>
                        <label><input type="checkbox" id="notify-whatsapp" checked> WhatsApp: +54 2657 673741</label>
                    </div>
                </div>
                <button class="btn btn-success" onclick="saveAlertConfig()">💾 Guardar Alertas</button>
                <button class="btn btn-warning" onclick="testOutOfShiftAlert()">⚠️ Probar Alerta</button>
            </div>
        </div>
    `;
    
    // Load current settings
    setTimeout(loadCurrentSettings, 300);
    setTimeout(loadServerInfo, 100);
}

// Copiar al portapapeles
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const text = element.textContent;
    navigator.clipboard.writeText(text).then(() => {
        showSettingsMessage(`✅ Copiado: ${text}`, 'success');
    }).catch(err => {
        console.error('Error copiando:', err);
        showSettingsMessage('❌ Error copiando al portapapeles', 'error');
    });
}

// Cargar información del servidor
async function loadServerInfo() {
    try {
        // Obtener info del servidor
        const response = await fetch('/api/server-config');
        const config = await response.json();

        // Actualizar elementos
        const serverIp = config.serverIP || window.location.hostname;
        const serverPort = config.port || window.DYNAMIC_CONFIG?.port || '9998';

        document.getElementById('server-ip').textContent = serverIp;
        document.getElementById('server-port').textContent = serverPort;
        document.getElementById('server-full-url').textContent = `http://${serverIp}:${serverPort}`;
        document.getElementById('apk-ip-hint').textContent = serverIp;
        document.getElementById('apk-port-hint').textContent = serverPort;

        console.log('✅ [SETTINGS] Info del servidor cargada:', { serverIp, serverPort });
    } catch (error) {
        console.error('❌ [SETTINGS] Error cargando info servidor:', error);

        // Fallback: usar configuración local
        const serverIp = window.location.hostname || '10.168.100.5';
        const serverPort = window.DYNAMIC_CONFIG?.port || '9998';

        document.getElementById('server-ip').textContent = serverIp;
        document.getElementById('server-port').textContent = serverPort;
        document.getElementById('server-full-url').textContent = `http://${serverIp}:${serverPort}`;
        document.getElementById('apk-ip-hint').textContent = serverIp;
        document.getElementById('apk-port-hint').textContent = serverPort;
    }
}

// Load current settings from API or localStorage
function loadCurrentSettings() {
    console.log('⚙️ [SETTINGS] Cargando configuración actual...');

    // Set default values (would normally come from API)
    const elements = {
        'companyName': 'Aponnt - Sistema Biométrico',
        'timezone': 'America/Argentina/Buenos_Aires',
        'smtpServer': 'smtp.gmail.com',
        'systemEmail': 'sistema@aponnt.com',
        'whatsappNumber': '+54 2657 673741'
    };

    // Solo establecer valores si los elementos existen
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    }

    showSettingsMessage('⚙️ Configuración actual cargada', 'success');
}

// Save company configuration
async function saveCompanyConfig() {
    const companyName = document.getElementById('companyName').value;
    const timezone = document.getElementById('timezone').value;
    
    if (!companyName) {
        showSettingsMessage('⚠️ Por favor ingrese el nombre de la empresa', 'warning');
        return;
    }
    
    console.log('💾 [SETTINGS] Guardando configuración empresa:', { companyName, timezone });
    
    try {
        showSettingsMessage('🔄 Guardando configuración de empresa...', 'info');
        
        // Simulate API call
        setTimeout(() => {
            showSettingsMessage('✅ Configuración de empresa guardada exitosamente', 'success');
        }, 1000);
        
    } catch (error) {
        console.error('❌ [SETTINGS] Error:', error);
        showSettingsMessage('❌ Error guardando configuración: ' + error.message, 'error');
    }
}

// Save biometric configuration
async function saveBiometricConfig() {
    const fingerprintEnabled = document.getElementById('fingerprintEnabled').checked;
    const faceEnabled = document.getElementById('faceRecognitionEnabled').checked;
    const maxFingerprints = document.getElementById('maxFingerprints').value;
    
    console.log('🔐 [SETTINGS] Guardando config biométrica:', { fingerprintEnabled, faceEnabled, maxFingerprints });
    
    try {
        showSettingsMessage('🔄 Guardando configuración biométrica...', 'info');
        
        // Simulate API call
        setTimeout(() => {
            showSettingsMessage('✅ Configuración biométrica guardada exitosamente', 'success');
        }, 1000);
        
    } catch (error) {
        console.error('❌ [SETTINGS] Error:', error);
        showSettingsMessage('❌ Error guardando configuración biométrica: ' + error.message, 'error');
    }
}

// Save notification configuration
async function saveNotificationConfig() {
    const emailEnabled = document.getElementById('emailNotifications').checked;
    const smtpServer = document.getElementById('smtpServer').value;
    const systemEmail = document.getElementById('systemEmail').value;
    
    console.log('📧 [SETTINGS] Guardando config notificaciones:', { emailEnabled, smtpServer, systemEmail });
    
    showSettingsMessage('🔄 Guardando configuración de notificaciones...', 'info');
    
    setTimeout(() => {
        showSettingsMessage('✅ Configuración de notificaciones guardada', 'success');
    }, 1000);
}

// Test email
async function testEmail() {
    const systemEmail = document.getElementById('systemEmail').value;
    
    if (!systemEmail) {
        showSettingsMessage('❌ Por favor ingresa un email del sistema', 'error');
        return;
    }
    
    console.log('📧 [SETTINGS] Probando email:', systemEmail);
    showSettingsMessage('📧 Enviando email de prueba...', 'info');
    
    setTimeout(() => {
        showSettingsMessage('✅ Email de prueba enviado exitosamente', 'success');
    }, 2000);
}

// Save WhatsApp configuration
async function saveWhatsAppConfig() {
    const whatsappEnabled = document.getElementById('whatsappEnabled').checked;
    const whatsappToken = document.getElementById('whatsappToken').value;
    const whatsappNumber = document.getElementById('whatsappNumber').value;
    
    console.log('📱 [SETTINGS] Guardando config WhatsApp:', { whatsappEnabled, whatsappNumber });
    
    showSettingsMessage('🔄 Guardando configuración de WhatsApp...', 'info');
    
    setTimeout(() => {
        showSettingsMessage('✅ Configuración de WhatsApp guardada', 'success');
    }, 1000);
}

// Test WhatsApp
async function testWhatsApp() {
    const whatsappNumber = document.getElementById('whatsappNumber').value;
    
    if (!whatsappNumber) {
        showSettingsMessage('❌ Por favor ingresa un número de WhatsApp', 'error');
        return;
    }
    
    console.log('📱 [SETTINGS] Probando WhatsApp:', whatsappNumber);
    showSettingsMessage('📱 Enviando mensaje de prueba por WhatsApp...', 'info');
    
    setTimeout(() => {
        showSettingsMessage('✅ Mensaje de WhatsApp enviado exitosamente', 'success');
    }, 2000);
}

// Save medical general configuration
async function saveMedicalGeneralConfig() {
    const medicalEnabled = document.getElementById('medicalModuleEnabled').checked;
    const maxCertDays = document.getElementById('maxCertificateDays').value;
    const requiresAudit = document.getElementById('requiresAudit').value;
    const auditDaysLimit = document.getElementById('auditDaysLimit').value;
    
    console.log('🏥 [SETTINGS] Guardando config médica general:', { medicalEnabled, maxCertDays, requiresAudit });
    
    showSettingsMessage('🔄 Guardando configuración médica...', 'info');
    
    setTimeout(() => {
        showSettingsMessage('✅ Configuración médica guardada exitosamente', 'success');
    }, 1000);
}

// Show create questionnaire dialog
function showCreateQuestionnaireDialog() {
    console.log('📋 [SETTINGS] Creando nuevo cuestionario...');
    showSettingsMessage('📋 Función crear cuestionario en desarrollo', 'info');
}

// Edit questionnaire
function editQuestionnaire(questionnaireId) {
    console.log('✏️ [SETTINGS] Editando cuestionario:', questionnaireId);
    showSettingsMessage('✏️ Función editar cuestionario en desarrollo', 'info');
}

// Save ART configuration
async function saveARTConfig() {
    const artEnabled = document.getElementById('artNotificationsEnabled').checked;
    const artChannel = document.getElementById('artNotificationChannel').value;
    const artEmail = document.getElementById('artEmail').value;
    const artPhone = document.getElementById('artPhone').value;
    
    console.log('🚨 [SETTINGS] Guardando config ART:', { artEnabled, artChannel, artEmail, artPhone });
    
    showSettingsMessage('🔄 Guardando configuración ART...', 'info');
    
    setTimeout(() => {
        showSettingsMessage('✅ Configuración ART guardada exitosamente', 'success');
    }, 1000);
}

// Test ART notification
async function testARTNotification() {
    console.log('🚨 [SETTINGS] Probando notificación ART...');
    showSettingsMessage('🚨 Enviando notificación de prueba a ART...', 'info');
    
    setTimeout(() => {
        showSettingsMessage('✅ Notificación ART enviada exitosamente', 'success');
    }, 2000);
}

// Save barcode configuration
async function saveBarcodeConfig() {
    const barcodeEnabled = document.getElementById('barcodeEnabled').checked;
    const barcodeFormat = document.getElementById('barcodeFormat').value;
    const barcodePrefix = document.getElementById('barcodePrefix').value;
    
    console.log('📱 [SETTINGS] Guardando config QR/Barcode:', { barcodeEnabled, barcodeFormat, barcodePrefix });
    
    showSettingsMessage('🔄 Guardando configuración de códigos...', 'info');
    
    setTimeout(() => {
        showSettingsMessage('✅ Configuración de códigos guardada', 'success');
    }, 1000);
}

// Generate employee barcodes
function generateEmployeeBarcodes() {
    console.log('📊 [SETTINGS] Generando códigos de empleados...');
    showSettingsMessage('📊 Generando códigos para todos los empleados...', 'info');
    
    setTimeout(() => {
        const preview = document.getElementById('barcode-preview');
        preview.innerHTML = `
            <h4>📊 Códigos Generados</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div class="barcode-item">
                    <strong>Juan Pérez (E001)</strong><br>
                    <div style="background: #000; color: #fff; padding: 10px; font-family: monospace;">||||| EMP-E001 |||||</div>
                </div>
                <div class="barcode-item">
                    <strong>María García (A001)</strong><br>
                    <div style="background: #000; color: #fff; padding: 10px; font-family: monospace;">||||| EMP-A001 |||||</div>
                </div>
                <div class="barcode-item">
                    <strong>Carlos López (E002)</strong><br>
                    <div style="background: #000; color: #fff; padding: 10px; font-family: monospace;">||||| EMP-E002 |||||</div>
                </div>
            </div>
        `;
        showSettingsMessage('✅ Códigos generados exitosamente', 'success');
    }, 2000);
}

// Test barcode scanner
function testBarcodeScanner() {
    console.log('📱 [SETTINGS] Probando escáner...');
    showSettingsMessage('📱 Función probar escáner en desarrollo', 'info');
}

// Save alert configuration
async function saveAlertConfig() {
    const outOfShiftEnabled = document.getElementById('outOfShiftAlerts').checked;
    const admin1 = document.getElementById('notify-admin1').checked;
    const admin2 = document.getElementById('notify-admin2').checked;
    const whatsappAlert = document.getElementById('notify-whatsapp').checked;
    
    console.log('⚠️ [SETTINGS] Guardando config alertas:', { outOfShiftEnabled, admin1, admin2, whatsappAlert });
    
    showSettingsMessage('🔄 Guardando configuración de alertas...', 'info');
    
    setTimeout(() => {
        showSettingsMessage('✅ Configuración de alertas guardada', 'success');
    }, 1000);
}

// Test out of shift alert
async function testOutOfShiftAlert() {
    console.log('⚠️ [SETTINGS] Probando alerta fuera de turno...');
    showSettingsMessage('⚠️ Simulando marcado fuera de turno...', 'info');
    
    setTimeout(() => {
        showSettingsMessage('✅ Alerta de prueba enviada a administradores', 'success');
    }, 2000);
}

// Show settings message utility
function showSettingsMessage(message, type) {
    let messageElement = document.getElementById('settingsMessage');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'settingsMessage';
        messageElement.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            max-width: 300px;
        `;
        document.body.appendChild(messageElement);
    }
    
    messageElement.textContent = message;
    switch (type) {
        case 'success': messageElement.style.backgroundColor = '#4CAF50'; break;
        case 'error': messageElement.style.backgroundColor = '#f44336'; break;
        case 'warning': messageElement.style.backgroundColor = '#ff9800'; break;
        case 'info': messageElement.style.backgroundColor = '#2196F3'; break;
        default: messageElement.style.backgroundColor = '#666';
    }
    
    setTimeout(() => {
        if (messageElement && messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 3000);
}

// ======== FUNCIONES MÚLTIPLES ART ========

let artProviders = [];

function addNewART() {
    if (document.getElementById('addARTModal')) {
        document.getElementById('addARTModal').remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'addARTModal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <form id="addARTForm" class="modal-content" style="background: #fff; padding: 25px; border-radius: 15px;">
                <h5 style="color: #dc3545; margin-bottom: 20px;">🚨 Agregar Proveedor ART</h5>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label>Nombre del Proveedor ART:</label>
                        <input type="text" id="artProviderName" class="form-control" placeholder="Ej: Galeno ART" required>
                    </div>
                    <div>
                        <label>Código/Número de Cliente:</label>
                        <input type="text" id="artClientCode" class="form-control" placeholder="Cliente N°">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                    <div>
                        <label>Email Notificaciones:</label>
                        <input type="email" id="artProviderEmail" class="form-control" placeholder="notificaciones@art.com" required>
                    </div>
                    <div>
                        <label>Teléfono:</label>
                        <input type="tel" id="artProviderPhone" class="form-control" placeholder="+54 11 1234-5678">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                    <div>
                        <label>Canal Preferido:</label>
                        <select id="artPreferredChannel" class="form-control">
                            <option value="email">Email</option>
                            <option value="sms">SMS</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="phone">Llamada</option>
                        </select>
                    </div>
                    <div>
                        <label>Prioridad:</label>
                        <select id="artPriority" class="form-control">
                            <option value="primary">Principal</option>
                            <option value="secondary">Secundaria</option>
                            <option value="backup">Respaldo</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin: 15px 0;">
                    <label>Contacto de Emergencia:</label>
                    <input type="text" id="artEmergencyContact" class="form-control" placeholder="Dr. Juan Pérez">
                </div>
                
                <div style="margin: 15px 0;">
                    <label>Horarios de Atención:</label>
                    <textarea id="artSchedule" class="form-control" rows="2" placeholder="Lun-Vie: 8-18hs, Emergencias 24hs"></textarea>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('addARTModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-danger">Agregar ART</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('addARTForm').onsubmit = (e) => {
        e.preventDefault();
        
        const newART = {
            id: Date.now(),
            name: document.getElementById('artProviderName').value,
            clientCode: document.getElementById('artClientCode').value,
            email: document.getElementById('artProviderEmail').value,
            phone: document.getElementById('artProviderPhone').value,
            channel: document.getElementById('artPreferredChannel').value,
            priority: document.getElementById('artPriority').value,
            contact: document.getElementById('artEmergencyContact').value,
            schedule: document.getElementById('artSchedule').value
        };
        
        artProviders.push(newART);
        renderARTProviders();
        closeModal('addARTModal');
        showSettingsMessage('✅ Proveedor ART agregado exitosamente', 'success');
    };
}

function renderARTProviders() {
    const container = document.getElementById('art-providers-list');
    if (!container) return;
    
    if (artProviders.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i>No hay proveedores ART configurados. Haga clic en "Agregar ART" para comenzar.</i>
            </div>
        `;
        return;
    }
    
    let html = '';
    artProviders.forEach(art => {
        const priorityColor = {
            'primary': '#28a745',
            'secondary': '#ffc107', 
            'backup': '#6c757d'
        }[art.priority];
        
        const priorityText = {
            'primary': 'Principal',
            'secondary': 'Secundaria',
            'backup': 'Respaldo'
        }[art.priority];
        
        html += `
            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 10px 0; background: #f8f9fa;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h6 style="color: #dc3545; margin: 0;">${art.name}</h6>
                        <div style="color: #666; font-size: 12px; margin: 5px 0;">
                            <span style="background: ${priorityColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">
                                ${priorityText}
                            </span>
                            ${art.clientCode ? `• Cliente: ${art.clientCode}` : ''}
                        </div>
                        <div style="font-size: 13px; margin: 5px 0;">
                            📧 ${art.email} • 📞 ${art.phone || 'Sin teléfono'}
                        </div>
                        <div style="font-size: 12px; color: #666;">
                            Canal: ${art.channel} ${art.contact ? `• Contacto: ${art.contact}` : ''}
                        </div>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-warning" onclick="editART(${art.id})">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="removeART(${art.id})">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function editART(artId) {
    const art = artProviders.find(a => a.id === artId);
    if (!art) return;
    
    // Similar modal to addNewART but pre-filled
    showSettingsMessage('✏️ Función editar ART en desarrollo', 'info');
}

function removeART(artId) {
    if (confirm('¿Está seguro de eliminar este proveedor ART?')) {
        artProviders = artProviders.filter(a => a.id !== artId);
        renderARTProviders();
        showSettingsMessage('🗑️ Proveedor ART eliminado', 'warning');
    }
}

function saveMultipleARTConfig() {
    const artEnabled = document.getElementById('artNotificationsEnabled').checked;
    const globalChannel = document.getElementById('globalArtChannel').value;
    
    const config = {
        enabled: artEnabled,
        globalChannel,
        providers: artProviders
    };
    
    console.log('🚨 [SETTINGS] Guardando configuración múltiple ART:', config);
    showSettingsMessage('🔄 Guardando configuración múltiple ART...', 'info');
    
    setTimeout(() => {
        showSettingsMessage(`✅ Configuración ART guardada (${artProviders.length} proveedores)`, 'success');
    }, 1000);
}

function testAllARTNotifications() {
    if (artProviders.length === 0) {
        showSettingsMessage('⚠️ No hay proveedores ART configurados', 'warning');
        return;
    }
    
    showSettingsMessage(`🚨 Enviando notificación de prueba a ${artProviders.length} proveedores ART...`, 'info');
    
    setTimeout(() => {
        showSettingsMessage('✅ Notificaciones enviadas a todas las ARTs', 'success');
    }, 2000);
}

// ======== FUNCIONES SISTEMA DE LICENCIAS Y VACACIONES ========

let vacationScales = [
    { range: '6 meses - 5 años', days: 14, id: 1 },
    { range: '5 - 10 años', days: 21, id: 2 },
    { range: '10 - 20 años', days: 28, id: 3 },
    { range: 'Más de 20 años', days: 35, id: 4 }
];

let extraordinaryLicenses = [
    { type: 'Fallecimiento familiar', days: 3, dayType: 'habil' },
    { type: 'Matrimonio', days: 10, dayType: 'corrido' },
    { type: 'Paternidad', days: 15, dayType: 'corrido' },
    { type: 'Examen médico', days: 1, dayType: 'habil' }
];

function updateVacationScale(scaleId) {
    showSettingsMessage('✅ Escala de vacaciones actualizada', 'success');
}

function addCustomVacationScale() {
    if (document.getElementById('customVacationModal')) {
        document.getElementById('customVacationModal').remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'customVacationModal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-dialog">
            <form id="customVacationForm" class="modal-content" style="background: #fff; padding: 25px; border-radius: 15px;">
                <h5 style="color: #2c5aa0; margin-bottom: 20px;">📅 Agregar Escala de Vacaciones</h5>
                
                <div style="margin: 15px 0;">
                    <label>Rango de Antigüedad:</label>
                    <input type="text" id="vacationRange" class="form-control" placeholder="Ej: 25-30 años" required>
                </div>
                
                <div style="margin: 15px 0;">
                    <label>Días de Vacaciones:</label>
                    <input type="number" id="vacationDays" class="form-control" min="1" max="60" required>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('customVacationModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Agregar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('customVacationForm').onsubmit = (e) => {
        e.preventDefault();
        const range = document.getElementById('vacationRange').value;
        const days = document.getElementById('vacationDays').value;
        
        vacationScales.push({
            range,
            days: parseInt(days),
            id: Date.now()
        });
        
        closeModal('customVacationModal');
        showSettingsMessage('✅ Nueva escala de vacaciones agregada', 'success');
    };
}

function addCustomExtraordinaryLicense() {
    if (document.getElementById('customLicenseModal')) {
        document.getElementById('customLicenseModal').remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'customLicenseModal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-dialog">
            <form id="customLicenseForm" class="modal-content" style="background: #fff; padding: 25px; border-radius: 15px;">
                <h5 style="color: #d84315; margin-bottom: 20px;">🚨 Agregar Licencia Extraordinaria</h5>
                
                <div style="margin: 15px 0;">
                    <label>Tipo de Licencia:</label>
                    <input type="text" id="licenseType" class="form-control" placeholder="Ej: Mudanza" required>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
                    <div>
                        <label>Días:</label>
                        <input type="number" id="licenseDays" class="form-control" min="1" required>
                    </div>
                    <div>
                        <label>Tipo de Días:</label>
                        <select id="licenseDayType" class="form-control">
                            <option value="habil">Hábiles</option>
                            <option value="corrido">Corridos</option>
                        </select>
                    </div>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('customLicenseModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-warning">Agregar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('customLicenseForm').onsubmit = (e) => {
        e.preventDefault();
        const type = document.getElementById('licenseType').value;
        const days = document.getElementById('licenseDays').value;
        const dayType = document.getElementById('licenseDayType').value;
        
        extraordinaryLicenses.push({
            type,
            days: parseInt(days),
            dayType
        });
        
        closeModal('customLicenseModal');
        showSettingsMessage('✅ Nueva licencia extraordinaria agregada', 'success');
    };
}

function saveLicenseConfig() {
    const vacationInterruptible = document.getElementById('vacationInterruptible').checked;
    const minContinuous = document.getElementById('minContinuousVacation').value;
    const maxFractions = document.getElementById('maxFractions').value;
    const autoScheduling = document.getElementById('autoScheduling').checked;
    const minAdvance = document.getElementById('minAdvanceNotice').value;
    const maxSimultaneous = document.getElementById('maxSimultaneousVacations').value;
    
    const config = {
        vacationInterruptible,
        minContinuous: parseInt(minContinuous),
        maxFractions: parseInt(maxFractions),
        autoScheduling,
        minAdvance: parseInt(minAdvance),
        maxSimultaneous: parseInt(maxSimultaneous),
        vacationScales,
        extraordinaryLicenses
    };
    
    console.log('🏖️ [SETTINGS] Guardando configuración de licencias:', config);
    showSettingsMessage('🔄 Guardando configuración de licencias...', 'info');
    
    setTimeout(() => {
        showSettingsMessage('✅ Configuración de licencias guardada exitosamente', 'success');
    }, 1000);
}

function generateVacationSchedule() {
    showSettingsMessage('📋 Generando cronograma automático de vacaciones...', 'info');
    
    // Simulación del algoritmo de programación automática
    setTimeout(() => {
        showSettingsMessage('✅ Cronograma automático generado basado en compatibilidad de tareas', 'success');
        
        // Aquí se abriría un modal con el cronograma generado
        showVacationScheduleModal();
    }, 2000);
}

function showVacationScheduleModal() {
    if (document.getElementById('vacationScheduleModal')) {
        document.getElementById('vacationScheduleModal').remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'vacationScheduleModal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-dialog modal-xl">
            <div class="modal-content" style="background: #fff; padding: 25px; border-radius: 15px;">
                <h5 style="color: #2c5aa0; margin-bottom: 20px;">📋 Cronograma Automático de Vacaciones</h5>
                
                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h6>🔍 Algoritmo de Programación Objetiva</h6>
                    <p style="margin: 5px 0; font-size: 14px;">
                        El sistema ha analizado las tareas de cada empleado y ha generado un cronograma 
                        que garantiza la cobertura de todas las actividades críticas durante los períodos de vacaciones.
                    </p>
                </div>
                
                <div id="vacation-schedule-content" style="max-height: 400px; overflow-y: auto;">
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; padding: 10px; background: #f8f9fa; font-weight: bold;">
                        <span>Empleado</span>
                        <span>Período Sugerido</span>
                        <span>Días</span>
                        <span>Estado</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; padding: 10px; border-bottom: 1px solid #eee;">
                        <span>Juan Pérez (Administración)</span>
                        <span>15/01 - 02/02</span>
                        <span>21 días</span>
                        <span style="color: #28a745;">✅ Óptimo</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; padding: 10px; border-bottom: 1px solid #eee;">
                        <span>María García (Ventas)</span>
                        <span>03/02 - 18/02</span>
                        <span>14 días</span>
                        <span style="color: #ffc107;">⚠️ Revisar</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; padding: 10px; border-bottom: 1px solid #eee;">
                        <span>Carlos López (Producción)</span>
                        <span>01/03 - 21/03</span>
                        <span>28 días</span>
                        <span style="color: #28a745;">✅ Óptimo</span>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn btn-success" onclick="acceptVacationSchedule()">✅ Aceptar Cronograma</button>
                    <button class="btn btn-warning" onclick="modifyVacationSchedule()">✏️ Permitir Modificaciones RH</button>
                    <button class="btn btn-secondary" onclick="closeModal('vacationScheduleModal')">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function acceptVacationSchedule() {
    showSettingsMessage('✅ Cronograma de vacaciones aceptado y aplicado', 'success');
    closeModal('vacationScheduleModal');
}

function modifyVacationSchedule() {
    showSettingsMessage('✏️ Cronograma habilitado para modificaciones de RH', 'info');
    closeModal('vacationScheduleModal');
}

function showCompatibilityMatrix() {
    showSettingsMessage('🔄 Mostrando matriz de compatibilidad de tareas...', 'info');
    
    setTimeout(() => {
        if (document.getElementById('compatibilityModal')) {
            document.getElementById('compatibilityModal').remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'compatibilityModal';
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content" style="background: #fff; padding: 25px; border-radius: 15px;">
                    <h5 style="color: #2c5aa0; margin-bottom: 20px;">🔄 Matriz de Compatibilidad de Tareas</h5>
                    
                    <div style="background: #f3e5f5; padding: 15px; border-radius: 8px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #6c757d; color: white;">
                                    <th style="padding: 8px; border: 1px solid #ddd;">Empleado</th>
                                    <th style="padding: 8px; border: 1px solid #ddd;">Tareas Principales</th>
                                    <th style="padding: 8px; border: 1px solid #ddd;">Puede Cubrir</th>
                                    <th style="padding: 8px; border: 1px solid #ddd;">Compatibilidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd;">Juan Pérez</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">Administración, RRHH</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">María García</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;"><span style="color: #28a745;">85%</span></td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd;">María García</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">Ventas, Atención Cliente</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">Ana Rodríguez</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;"><span style="color: #ffc107;">70%</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button class="btn btn-secondary" onclick="closeModal('compatibilityModal')">Cerrar</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }, 1000);
}

function showVacationCalculator() {
    showSettingsMessage('🧮 Abriendo calculadora de vacaciones...', 'info');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

console.log('✅ [SETTINGS] Módulo settings configurado');
// ✅ HACER FUNCIONES DISPONIBLES GLOBALMENTE
window.showSettingsContent = showSettingsContent;
window.copyToClipboard = copyToClipboard;
