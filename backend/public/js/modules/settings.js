// Settings Module - v4.0 PROGRESSIVE
console.log('⚙️ [SETTINGS] Módulo settings cargado');

// Settings functions
async function showSettingsContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;

    content.innerHTML = `
        <div class="tab-content active" id="settings">
            <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <h2 data-translate="settings.server.title">📡 Configuración del Servidor para APK</h2>
                <p style="margin: 10px 0; font-size: 14px; opacity: 0.9;" data-translate="settings.server.subtitle">
                    Use esta información para configurar la APK Flutter manualmente
                </p>
                <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px; margin: 15px 0;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <label style="font-weight: bold; font-size: 12px; opacity: 0.9;" data-translate="settings.server.ip_label">DIRECCIÓN IP DEL SERVIDOR:</label>
                            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                                <span id="server-ip" style="font-family: monospace; font-size: 20px; font-weight: bold;" data-translate="settings.server.loading">Cargando...</span>
                                <button onclick="copyToClipboard('server-ip')" class="btn btn-sm" style="background: rgba(255,255,255,0.3); border: none; color: white;" data-translate="settings.server.copy_button">📋 Copiar</button>
                            </div>
                        </div>
                        <div>
                            <label style="font-weight: bold; font-size: 12px; opacity: 0.9;" data-translate="settings.server.port_label">PUERTO:</label>
                            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                                <span id="server-port" style="font-family: monospace; font-size: 20px; font-weight: bold;" data-translate="settings.server.loading">Cargando...</span>
                                <button onclick="copyToClipboard('server-port')" class="btn btn-sm" style="background: rgba(255,255,255,0.3); border: none; color: white;" data-translate="settings.server.copy_button">📋 Copiar</button>
                            </div>
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px; margin-top: 15px; text-align: center;">
                        <strong data-translate="settings.server.full_url_label">URL COMPLETA:</strong>
                        <span id="server-full-url" style="font-family: monospace; font-size: 16px; margin-left: 10px;">http://...</span>
                        <button onclick="copyToClipboard('server-full-url')" class="btn btn-sm" style="background: rgba(255,255,255,0.3); border: none; color: white; margin-left: 10px;" data-translate="settings.server.copy_url_button">📋 Copiar URL</button>
                    </div>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; font-size: 13px;">
                    <strong data-translate="settings.server.apk_config_title">📱 Para configurar la APK:</strong><br>
                    <span data-translate="settings.server.apk_step1">1. Abrir APK → Configuración</span><br>
                    <span data-translate="settings.server.apk_step2">2. Ingresar IP:</span> <span id="apk-ip-hint" style="font-family: monospace; font-weight: bold;">...</span><br>
                    <span data-translate="settings.server.apk_step3">3. Ingresar Puerto:</span> <span id="apk-port-hint" style="font-family: monospace; font-weight: bold;">...</span><br>
                    <span data-translate="settings.server.apk_step4">4. Guardar y usar</span>
                </div>
            </div>

            <div class="card">
                <h2 data-translate="settings.company.title">🏢 Datos de la Empresa</h2>
                <div class="form-group">
                    <label data-translate="settings.company.name_label">Nombre de la Empresa:</label>
                    <input type="text" id="companyName" data-translate-placeholder="settings.company.name_placeholder" placeholder="Nombre de la empresa">
                </div>
                <div class="form-group">
                    <label data-translate="settings.company.timezone_label">Zona Horaria:</label>
                    <select id="timezone">
                        <option value="America/Argentina/Buenos_Aires" data-translate="settings.company.timezone_argentina">Argentina/Buenos Aires</option>
                        <option value="America/Mexico_City" data-translate="settings.company.timezone_mexico">México/Ciudad de México</option>
                        <option value="America/Bogota" data-translate="settings.company.timezone_colombia">Colombia/Bogotá</option>
                        <option value="America/Lima" data-translate="settings.company.timezone_peru">Perú/Lima</option>
                        <option value="America/Santiago" data-translate="settings.company.timezone_chile">Chile/Santiago</option>
                    </select>
                </div>
                <button class="btn btn-success" onclick="saveCompanyConfig()" data-translate="settings.company.save_button">💾 Guardar Configuración</button>
            </div>

            <div class="card">
                <h2 data-translate="settings.biometric.title">🔐 Configuración Biométrica</h2>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="fingerprintEnabled" checked> <span data-translate="settings.biometric.fingerprint_label">Reconocimiento de Huella</span>
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="faceRecognitionEnabled" checked> <span data-translate="settings.biometric.face_recognition_label">Reconocimiento Facial</span>
                    </label>
                </div>
                <div class="form-group">
                    <label data-translate="settings.biometric.max_fingerprints_label">Máximo de Huellas por Usuario:</label>
                    <input type="number" id="maxFingerprints" value="5" min="1" max="10">
                </div>
                <button class="btn btn-success" onclick="saveBiometricConfig()" data-translate="settings.biometric.save_button">💾 Guardar Biométrica</button>
            </div>
            
            <div class="card">
                <h2 data-translate="settings.communications.title">📧 Configuración de Comunicaciones</h2>

                <h3 data-translate="settings.communications.email_section">📧 Email</h3>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="emailNotifications" checked> <span data-translate="settings.communications.email_notifications_label">Notificaciones por Email</span>
                    </label>
                </div>
                <div class="form-group">
                    <label data-translate="settings.communications.smtp_server_label">Servidor SMTP:</label>
                    <input type="text" id="smtpServer" data-translate-placeholder="settings.communications.smtp_server_placeholder" placeholder="smtp.gmail.com">
                </div>
                <div class="form-group">
                    <label data-translate="settings.communications.system_email_label">Email del Sistema:</label>
                    <input type="email" id="systemEmail" data-translate-placeholder="settings.communications.system_email_placeholder" placeholder="sistema@aponnt.com">
                </div>
                <button class="btn btn-success" onclick="saveNotificationConfig()" data-translate="settings.communications.save_notifications_button">💾 Guardar Notificaciones</button>
                <button class="btn btn-warning" onclick="testEmail()" data-translate="settings.communications.test_email_button">📧 Probar Email</button>

                <h3 data-translate="settings.communications.whatsapp_section">📱 WhatsApp Business</h3>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="whatsappEnabled" checked> <span data-translate="settings.communications.whatsapp_enabled_label">WhatsApp Activado</span>
                    </label>
                </div>
                <div class="form-group">
                    <label data-translate="settings.communications.whatsapp_token_label">Token de WhatsApp Business:</label>
                    <input type="password" id="whatsappToken" data-translate-placeholder="settings.communications.whatsapp_token_placeholder" placeholder="Token de la API">
                </div>
                <div class="form-group">
                    <label data-translate="settings.communications.whatsapp_number_label">Número de WhatsApp:</label>
                    <input type="tel" id="whatsappNumber" data-translate-placeholder="settings.communications.whatsapp_number_placeholder" placeholder="+54 2657 673741">
                </div>
                <button class="btn btn-success" onclick="saveWhatsAppConfig()" data-translate="settings.communications.save_whatsapp_button">💾 Guardar WhatsApp</button>
                <button class="btn btn-warning" onclick="testWhatsApp()" data-translate="settings.communications.test_whatsapp_button">📱 Probar WhatsApp</button>
            </div>
            
            <div class="card">
                <h2 data-translate="settings.medical.title">🏥 Configuración Médica General</h2>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="medicalModuleEnabled" checked> <span data-translate="settings.medical.module_enabled_label">Módulo Médico Activado</span>
                    </label>
                </div>
                <div class="form-group">
                    <label data-translate="settings.medical.max_certificate_days_label">Días máximos para certificados:</label>
                    <input type="number" id="maxCertificateDays" value="30" min="1" max="365">
                </div>
                <div class="form-group">
                    <label data-translate="settings.medical.requires_audit_label">Requiere auditoría médica:</label>
                    <select id="requiresAudit">
                        <option value="always" data-translate="settings.medical.requires_audit_always">Siempre</option>
                        <option value="over_days" data-translate="settings.medical.requires_audit_over_days">Solo más de X días</option>
                        <option value="never" data-translate="settings.medical.requires_audit_never">Nunca</option>
                    </select>
                </div>
                <div class="form-group">
                    <label data-translate="settings.medical.audit_days_limit_label">Días límite para auditoría:</label>
                    <input type="number" id="auditDaysLimit" value="7" min="1" max="30">
                </div>
                <button class="btn btn-success" onclick="saveMedicalGeneralConfig()" data-translate="settings.medical.save_button">💾 Guardar Configuración Médica</button>
            </div>

            <div class="card">
                <h2 data-translate="settings.questionnaires.title">📋 Cuestionarios Médicos</h2>
                <button class="btn btn-primary" onclick="showCreateQuestionnaireDialog()" data-translate="settings.questionnaires.create_button">➕ Crear Cuestionario</button>
                <div id="questionnaires-list" class="data-list" style="margin-top: 20px;">
                    <div class="questionnaire-item">
                        <strong data-translate="settings.questionnaires.covid_title">Cuestionario COVID-19</strong>
                        <span class="status-badge success" data-translate="settings.questionnaires.status_active">Activo</span>
                        <button class="btn btn-sm btn-primary" onclick="editQuestionnaire(1)" data-translate="settings.questionnaires.edit_button">✏️ Editar</button>
                    </div>
                    <div class="questionnaire-item">
                        <strong data-translate="settings.questionnaires.symptoms_title">Evaluación de Síntomas Generales</strong>
                        <span class="status-badge success" data-translate="settings.questionnaires.status_active">Activo</span>
                        <button class="btn btn-sm btn-primary" onclick="editQuestionnaire(2)" data-translate="settings.questionnaires.edit_button">✏️ Editar</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <h2 data-translate="settings.art.title">🚨 Configuración Multiple ART</h2>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="artNotificationsEnabled" checked> <span data-translate="settings.art.notifications_enabled_label">Notificaciones ART Activadas</span>
                    </label>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
                    <h4 style="color: #2c5aa0;" data-translate="settings.art.providers_title">Proveedores ART Configurados</h4>
                    <button class="btn btn-primary" onclick="addNewART()" data-translate="settings.art.add_button">➕ Agregar ART</button>
                </div>

                <div id="art-providers-list" style="margin: 15px 0;">
                    <div class="alert alert-info">
                        <i data-translate="settings.art.no_providers">No hay proveedores ART configurados. Haga clic en "Agregar ART" para comenzar.</i>
                    </div>
                </div>

                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                    <div class="form-group">
                        <label data-translate="settings.art.global_channel_label">Canal global de notificación:</label>
                        <select id="globalArtChannel">
                            <option value="email" data-translate="settings.art.channel_email">Email</option>
                            <option value="sms" data-translate="settings.art.channel_sms">SMS</option>
                            <option value="whatsapp" data-translate="settings.art.channel_whatsapp">WhatsApp</option>
                            <option value="all" data-translate="settings.art.channel_all">Todos los canales</option>
                        </select>
                    </div>
                    <button class="btn btn-success" onclick="saveMultipleARTConfig()" data-translate="settings.art.save_button">💾 Guardar Configuración</button>
                    <button class="btn btn-warning" onclick="testAllARTNotifications()" data-translate="settings.art.test_all_button">🚨 Probar Todas las ARTs</button>
                </div>
            </div>
            
            <div class="card">
                <h2 data-translate="settings.licenses.title">🏖️ Régimen de Licencias y Vacaciones</h2>

                <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
                    <h4 style="color: #2c5aa0;" data-translate="settings.licenses.vacation_config_title">Configuración de Vacaciones</h4>
                    <button class="btn btn-info" onclick="showVacationCalculator()" data-translate="settings.licenses.calculator_button">🧮 Calculadora</button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div style="background: #e8f5e8; padding: 15px; border-radius: 8px;">
                        <h6 data-translate="settings.licenses.vacation_scale_title">📅 Días de Vacaciones por Antigüedad</h6>
                        <div id="vacation-scale">
                            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 5px; margin: 5px 0; font-weight: bold;">
                                <span data-translate="settings.licenses.seniority_label">Antigüedad</span>
                                <span data-translate="settings.licenses.days_label">Días</span>
                                <span data-translate="settings.licenses.action_label">Acción</span>
                            </div>
                            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 5px; margin: 5px 0;">
                                <span data-translate="settings.licenses.seniority_0_5">6 meses - 5 años</span>
                                <input type="number" value="14" min="1" style="width: 50px;">
                                <button class="btn btn-sm btn-success" onclick="updateVacationScale(1)" data-translate="settings.licenses.update_button">✓</button>
                            </div>
                            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 5px; margin: 5px 0;">
                                <span data-translate="settings.licenses.seniority_5_10">5 - 10 años</span>
                                <input type="number" value="21" min="1" style="width: 50px;">
                                <button class="btn btn-sm btn-success" onclick="updateVacationScale(2)" data-translate="settings.licenses.update_button">✓</button>
                            </div>
                            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 5px; margin: 5px 0;">
                                <span data-translate="settings.licenses.seniority_10_20">10 - 20 años</span>
                                <input type="number" value="28" min="1" style="width: 50px;">
                                <button class="btn btn-sm btn-success" onclick="updateVacationScale(3)" data-translate="settings.licenses.update_button">✓</button>
                            </div>
                            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 5px; margin: 5px 0;">
                                <span data-translate="settings.licenses.seniority_20_plus">Más de 20 años</span>
                                <input type="number" value="35" min="1" style="width: 50px;">
                                <button class="btn btn-sm btn-success" onclick="updateVacationScale(4)" data-translate="settings.licenses.update_button">✓</button>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="addCustomVacationScale()" data-translate="settings.licenses.add_scale_button">➕ Agregar Escala</button>
                    </div>
                    
                    <div style="background: #fff3e0; padding: 15px; border-radius: 8px;">
                        <h6 data-translate="settings.licenses.extraordinary_title">🚨 Licencias Extraordinarias</h6>
                        <div id="extraordinary-licenses">
                            <div style="margin: 10px 0;">
                                <label data-translate="settings.licenses.family_death_label">Fallecimiento familiar:</label>
                                <div style="display: flex; gap: 5px; align-items: center;">
                                    <input type="number" value="3" min="1" style="width: 50px;">
                                    <span data-translate="settings.licenses.days_unit">días</span>
                                    <select style="width: 80px;">
                                        <option value="habil" data-translate="settings.licenses.day_type_habil">Hábiles</option>
                                        <option value="corrido" data-translate="settings.licenses.day_type_corrido">Corridos</option>
                                    </select>
                                </div>
                            </div>
                            <div style="margin: 10px 0;">
                                <label data-translate="settings.licenses.marriage_label">Matrimonio:</label>
                                <div style="display: flex; gap: 5px; align-items: center;">
                                    <input type="number" value="10" min="1" style="width: 50px;">
                                    <span data-translate="settings.licenses.days_unit">días</span>
                                    <select style="width: 80px;">
                                        <option value="corrido" selected data-translate="settings.licenses.day_type_corrido">Corridos</option>
                                        <option value="habil" data-translate="settings.licenses.day_type_habil">Hábiles</option>
                                    </select>
                                </div>
                            </div>
                            <div style="margin: 10px 0;">
                                <label data-translate="settings.licenses.paternity_label">Paternidad:</label>
                                <div style="display: flex; gap: 5px; align-items: center;">
                                    <input type="number" value="15" min="1" style="width: 50px;">
                                    <span data-translate="settings.licenses.days_unit">días</span>
                                    <select style="width: 80px;">
                                        <option value="corrido" selected data-translate="settings.licenses.day_type_corrido">Corridos</option>
                                        <option value="habil" data-translate="settings.licenses.day_type_habil">Hábiles</option>
                                    </select>
                                </div>
                            </div>
                            <div style="margin: 10px 0;">
                                <label data-translate="settings.licenses.medical_exam_label">Examen médico:</label>
                                <div style="display: flex; gap: 5px; align-items: center;">
                                    <input type="number" value="1" min="1" style="width: 50px;">
                                    <span data-translate="settings.licenses.day_unit">día</span>
                                    <select style="width: 80px;">
                                        <option value="habil" selected data-translate="settings.licenses.day_type_habil">Hábil</option>
                                        <option value="corrido" data-translate="settings.licenses.day_type_corrido">Corrido</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-success btn-sm" onclick="addCustomExtraordinaryLicense()" data-translate="settings.licenses.add_type_button">➕ Agregar Tipo</button>
                    </div>
                </div>
                
                <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h6 data-translate="settings.licenses.calculation_title">⚖️ Configuración de Cálculo</h6>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label>
                                <input type="checkbox" id="vacationInterruptible" checked>
                                <span data-translate="settings.licenses.interruptible_label">Las vacaciones pueden interrumpirse por enfermedad</span>
                            </label>
                            <div style="margin: 10px 0;">
                                <label data-translate="settings.licenses.min_continuous_label">Período mínimo de vacaciones continuas:</label>
                                <input type="number" id="minContinuousVacation" value="7" min="1"> <span data-translate="settings.licenses.days_unit">días</span>
                            </div>
                            <div style="margin: 10px 0;">
                                <label data-translate="settings.licenses.max_fractions_label">Período máximo de fraccionamiento:</label>
                                <input type="number" id="maxFractions" value="3" min="1"> <span data-translate="settings.licenses.fractions_unit">partes</span>
                            </div>
                        </div>
                        <div>
                            <label>
                                <input type="checkbox" id="autoScheduling" checked>
                                <span data-translate="settings.licenses.auto_scheduling_label">Programación automática por compatibilidad de tareas</span>
                            </label>
                            <div style="margin: 10px 0;">
                                <label data-translate="settings.licenses.min_advance_label">Antelación mínima para solicitar:</label>
                                <input type="number" id="minAdvanceNotice" value="15" min="1"> <span data-translate="settings.licenses.days_unit">días</span>
                            </div>
                            <div style="margin: 10px 0;">
                                <label data-translate="settings.licenses.max_simultaneous_label">Máximo de empleados simultáneos en vacaciones:</label>
                                <input type="number" id="maxSimultaneousVacations" value="30" min="1"><span data-translate="settings.licenses.team_percent">% del equipo</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                    <button class="btn btn-success" onclick="saveLicenseConfig()" data-translate="settings.licenses.save_config_button">💾 Guardar Configuración de Licencias</button>
                    <button class="btn btn-primary" onclick="generateVacationSchedule()" data-translate="settings.licenses.generate_schedule_button">📋 Generar Cronograma Automático</button>
                    <button class="btn btn-info" onclick="showCompatibilityMatrix()" data-translate="settings.licenses.compatibility_matrix_button">🔄 Ver Matriz de Compatibilidad</button>
                </div>
            </div>

            <div class="card">
                <h2 data-translate="settings.barcode.title">📱 Configuración de Código QR</h2>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="barcodeEnabled" checked> <span data-translate="settings.barcode.enabled_label">Permitir marcado con código de barras</span>
                    </label>
                </div>
                <div class="form-group">
                    <label data-translate="settings.barcode.format_label">Formato del código:</label>
                    <select id="barcodeFormat">
                        <option value="employee_id" data-translate="settings.barcode.format_employee_id">ID del Empleado</option>
                        <option value="custom" data-translate="settings.barcode.format_custom">Código personalizado</option>
                        <option value="qr_code" data-translate="settings.barcode.format_qr_json">QR Code con datos JSON</option>
                    </select>
                </div>
                <div class="form-group">
                    <label data-translate="settings.barcode.prefix_label">Prefijo del código (opcional):</label>
                    <input type="text" id="barcodePrefix" data-translate-placeholder="settings.barcode.prefix_placeholder" placeholder="EMP-">
                </div>
                <button class="btn btn-success" onclick="saveBarcodeConfig()" data-translate="settings.barcode.save_button">💾 Guardar Configuración</button>
                <button class="btn btn-primary" onclick="generateEmployeeBarcodes()" data-translate="settings.barcode.generate_button">📊 Generar Códigos</button>
                <button class="btn btn-warning" onclick="testBarcodeScanner()" data-translate="settings.barcode.test_button">📱 Probar Escáner</button>

                <div id="barcode-preview" style="margin-top: 20px;"></div>
            </div>

            <div class="card">
                <h2 data-translate="settings.alerts.title">⚠️ Sistema de Alertas Fuera de Turno</h2>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="outOfShiftAlerts" checked> <span data-translate="settings.alerts.enabled_label">Activar alertas para marcado fuera de turno</span>
                    </label>
                </div>
                <div class="form-group">
                    <label data-translate="settings.alerts.admins_label">Administradores a notificar:</label>
                    <div id="admin-notifications" style="margin-top: 10px;">
                        <label><input type="checkbox" id="notify-admin1" checked> <span data-translate="settings.alerts.admin_primary_label">Admin Principal - SMS:</span> +54 2657 673741</label><br>
                        <label><input type="checkbox" id="notify-admin2"> <span data-translate="settings.alerts.admin_secondary_label">Admin Secundario - Email:</span> admin2@empresa.com</label><br>
                        <label><input type="checkbox" id="notify-whatsapp" checked> <span data-translate="settings.alerts.whatsapp_label">WhatsApp:</span> +54 2657 673741</label>
                    </div>
                </div>
                <button class="btn btn-success" onclick="saveAlertConfig()" data-translate="settings.alerts.save_button">💾 Guardar Alertas</button>
                <button class="btn btn-warning" onclick="testOutOfShiftAlert()" data-translate="settings.alerts.test_button">⚠️ Probar Alerta</button>
            </div>
        </div>
    `;
    
    // Load current settings
    setTimeout(loadCurrentSettings, 300);
    setTimeout(loadServerInfo, 100);
}

// Copiar al portapapeles
async function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const text = element.textContent;
    navigator.clipboard.writeText(text).then(async () => {
        showSettingsMessage(await window.t('settings.messages.copied', { text }), 'success');
    }).catch(async err => {
        console.error('Error copiando:', err);
        showSettingsMessage(await window.t('settings.messages.copy_error'), 'error');
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
async function loadCurrentSettings() {
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

    showSettingsMessage(await window.t('settings.messages.config_loaded'), 'success');
}

// Save company configuration
async function saveCompanyConfig() {
    const companyName = document.getElementById('companyName').value;
    const timezone = document.getElementById('timezone').value;

    if (!companyName) {
        showSettingsMessage(await window.t('settings.messages.enter_company_name'), 'warning');
        return;
    }

    console.log('💾 [SETTINGS] Guardando configuración empresa:', { companyName, timezone });

    try {
        showSettingsMessage(await window.t('settings.messages.saving_company'), 'info');

        // Simulate API call
        setTimeout(async () => {
            showSettingsMessage(await window.t('settings.messages.company_saved'), 'success');
        }, 1000);

    } catch (error) {
        console.error('❌ [SETTINGS] Error:', error);
        showSettingsMessage(await window.t('settings.messages.error_saving', { message: error.message }), 'error');
    }
}

// Save biometric configuration
async function saveBiometricConfig() {
    const fingerprintEnabled = document.getElementById('fingerprintEnabled').checked;
    const faceEnabled = document.getElementById('faceRecognitionEnabled').checked;
    const maxFingerprints = document.getElementById('maxFingerprints').value;

    console.log('🔐 [SETTINGS] Guardando config biométrica:', { fingerprintEnabled, faceEnabled, maxFingerprints });

    try {
        showSettingsMessage(await window.t('settings.messages.saving_biometric'), 'info');

        // Simulate API call
        setTimeout(async () => {
            showSettingsMessage(await window.t('settings.messages.biometric_saved'), 'success');
        }, 1000);

    } catch (error) {
        console.error('❌ [SETTINGS] Error:', error);
        showSettingsMessage(await window.t('settings.messages.error_saving', { message: error.message }), 'error');
    }
}

// Save notification configuration
async function saveNotificationConfig() {
    const emailEnabled = document.getElementById('emailNotifications').checked;
    const smtpServer = document.getElementById('smtpServer').value;
    const systemEmail = document.getElementById('systemEmail').value;

    console.log('📧 [SETTINGS] Guardando config notificaciones:', { emailEnabled, smtpServer, systemEmail });

    showSettingsMessage(await window.t('settings.messages.saving_notifications'), 'info');

    setTimeout(async () => {
        showSettingsMessage(await window.t('settings.messages.notifications_saved'), 'success');
    }, 1000);
}

// Test email
async function testEmail() {
    const systemEmail = document.getElementById('systemEmail').value;

    if (!systemEmail) {
        showSettingsMessage(await window.t('settings.messages.enter_email'), 'error');
        return;
    }

    console.log('📧 [SETTINGS] Probando email:', systemEmail);
    showSettingsMessage(await window.t('settings.messages.sending_test_email'), 'info');

    setTimeout(async () => {
        showSettingsMessage(await window.t('settings.messages.test_email_sent'), 'success');
    }, 2000);
}

// Save WhatsApp configuration
async function saveWhatsAppConfig() {
    const whatsappEnabled = document.getElementById('whatsappEnabled').checked;
    const whatsappToken = document.getElementById('whatsappToken').value;
    const whatsappNumber = document.getElementById('whatsappNumber').value;

    console.log('📱 [SETTINGS] Guardando config WhatsApp:', { whatsappEnabled, whatsappNumber });

    showSettingsMessage(await window.t('settings.messages.saving_whatsapp'), 'info');

    setTimeout(async () => {
        showSettingsMessage(await window.t('settings.messages.whatsapp_saved'), 'success');
    }, 1000);
}

// Test WhatsApp
async function testWhatsApp() {
    const whatsappNumber = document.getElementById('whatsappNumber').value;

    if (!whatsappNumber) {
        showSettingsMessage(await window.t('settings.messages.enter_whatsapp_number'), 'error');
        return;
    }

    console.log('📱 [SETTINGS] Probando WhatsApp:', whatsappNumber);
    showSettingsMessage(await window.t('settings.messages.sending_test_whatsapp'), 'info');

    setTimeout(async () => {
        showSettingsMessage(await window.t('settings.messages.test_whatsapp_sent'), 'success');
    }, 2000);
}

// Save medical general configuration
async function saveMedicalGeneralConfig() {
    const medicalEnabled = document.getElementById('medicalModuleEnabled').checked;
    const maxCertDays = document.getElementById('maxCertificateDays').value;
    const requiresAudit = document.getElementById('requiresAudit').value;
    const auditDaysLimit = document.getElementById('auditDaysLimit').value;

    console.log('🏥 [SETTINGS] Guardando config médica general:', { medicalEnabled, maxCertDays, requiresAudit });

    showSettingsMessage(await window.t('settings.messages.saving_medical'), 'info');

    setTimeout(async () => {
        showSettingsMessage(await window.t('settings.messages.medical_saved'), 'success');
    }, 1000);
}

// Show create questionnaire dialog
async function showCreateQuestionnaireDialog() {
    console.log('📋 [SETTINGS] Creando nuevo cuestionario...');
    showSettingsMessage(await window.t('settings.messages.questionnaire_in_dev'), 'info');
}

// Edit questionnaire
async function editQuestionnaire(questionnaireId) {
    console.log('✏️ [SETTINGS] Editando cuestionario:', questionnaireId);
    showSettingsMessage(await window.t('settings.messages.edit_questionnaire_in_dev'), 'info');
}

// Save ART configuration
async function saveARTConfig() {
    const artEnabled = document.getElementById('artNotificationsEnabled').checked;
    const artChannel = document.getElementById('artNotificationChannel')?.value;
    const artEmail = document.getElementById('artEmail')?.value;
    const artPhone = document.getElementById('artPhone')?.value;

    console.log('🚨 [SETTINGS] Guardando config ART:', { artEnabled, artChannel, artEmail, artPhone });

    showSettingsMessage(await window.t('settings.messages.saving_art'), 'info');

    setTimeout(async () => {
        showSettingsMessage(await window.t('settings.messages.art_saved'), 'success');
    }, 1000);
}

// Test ART notification
async function testARTNotification() {
    console.log('🚨 [SETTINGS] Probando notificación ART...');
    showSettingsMessage(await window.t('settings.messages.sending_test_art'), 'info');

    setTimeout(async () => {
        showSettingsMessage(await window.t('settings.messages.test_art_sent'), 'success');
    }, 2000);
}

// Save barcode configuration
async function saveBarcodeConfig() {
    const barcodeEnabled = document.getElementById('barcodeEnabled').checked;
    const barcodeFormat = document.getElementById('barcodeFormat').value;
    const barcodePrefix = document.getElementById('barcodePrefix').value;

    console.log('📱 [SETTINGS] Guardando config QR/Barcode:', { barcodeEnabled, barcodeFormat, barcodePrefix });

    showSettingsMessage(await window.t('settings.messages.saving_barcode'), 'info');

    setTimeout(async () => {
        showSettingsMessage(await window.t('settings.messages.barcode_saved'), 'success');
    }, 1000);
}

// Generate employee barcodes
async function generateEmployeeBarcodes() {
    console.log('📊 [SETTINGS] Generando códigos de empleados...');
    showSettingsMessage(await window.t('settings.messages.generating_barcodes'), 'info');

    setTimeout(async () => {
        const preview = document.getElementById('barcode-preview');
        preview.innerHTML = `
            <h4 data-translate="settings.barcode.preview_title">📊 Códigos Generados</h4>
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
        showSettingsMessage(await window.t('settings.messages.barcodes_generated'), 'success');
    }, 2000);
}

// Test barcode scanner
async function testBarcodeScanner() {
    console.log('📱 [SETTINGS] Probando escáner...');
    showSettingsMessage(await window.t('settings.messages.test_scanner_in_dev'), 'info');
}

// Save alert configuration
async function saveAlertConfig() {
    const outOfShiftEnabled = document.getElementById('outOfShiftAlerts').checked;
    const admin1 = document.getElementById('notify-admin1').checked;
    const admin2 = document.getElementById('notify-admin2').checked;
    const whatsappAlert = document.getElementById('notify-whatsapp').checked;

    console.log('⚠️ [SETTINGS] Guardando config alertas:', { outOfShiftEnabled, admin1, admin2, whatsappAlert });

    showSettingsMessage(await window.t('settings.messages.saving_alerts'), 'info');

    setTimeout(async () => {
        showSettingsMessage(await window.t('settings.messages.alerts_saved'), 'success');
    }, 1000);
}

// Test out of shift alert
async function testOutOfShiftAlert() {
    console.log('⚠️ [SETTINGS] Probando alerta fuera de turno...');
    showSettingsMessage(await window.t('settings.messages.testing_alert'), 'info');

    setTimeout(async () => {
        showSettingsMessage(await window.t('settings.messages.test_alert_sent'), 'success');
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

async function addNewART() {
    if (document.getElementById('addARTModal')) {
        document.getElementById('addARTModal').remove();
    }

    const modal = document.createElement('div');
    modal.id = 'addARTModal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <form id="addARTForm" class="modal-content" style="background: #fff; padding: 25px; border-radius: 15px;">
                <h5 style="color: #dc3545; margin-bottom: 20px;" data-translate="settings.art.modal.title">🚨 Agregar Proveedor ART</h5>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label data-translate="settings.art.modal.name_label">Nombre del Proveedor ART:</label>
                        <input type="text" id="artProviderName" class="form-control" data-translate-placeholder="settings.art.modal.name_placeholder" placeholder="Ej: Galeno ART" required>
                    </div>
                    <div>
                        <label data-translate="settings.art.modal.client_code_label">Código/Número de Cliente:</label>
                        <input type="text" id="artClientCode" class="form-control" data-translate-placeholder="settings.art.modal.client_code_placeholder" placeholder="Cliente N°">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                    <div>
                        <label data-translate="settings.art.modal.email_label">Email Notificaciones:</label>
                        <input type="email" id="artProviderEmail" class="form-control" data-translate-placeholder="settings.art.modal.email_placeholder" placeholder="notificaciones@art.com" required>
                    </div>
                    <div>
                        <label data-translate="settings.art.modal.phone_label">Teléfono:</label>
                        <input type="tel" id="artProviderPhone" class="form-control" data-translate-placeholder="settings.art.modal.phone_placeholder" placeholder="+54 11 1234-5678">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                    <div>
                        <label data-translate="settings.art.modal.preferred_channel_label">Canal Preferido:</label>
                        <select id="artPreferredChannel" class="form-control">
                            <option value="email" data-translate="settings.art.channel_email">Email</option>
                            <option value="sms" data-translate="settings.art.channel_sms">SMS</option>
                            <option value="whatsapp" data-translate="settings.art.channel_whatsapp">WhatsApp</option>
                            <option value="phone">Llamada</option>
                        </select>
                    </div>
                    <div>
                        <label data-translate="settings.art.modal.priority_label">Prioridad:</label>
                        <select id="artPriority" class="form-control">
                            <option value="primary" data-translate="settings.art.modal.priority_primary">Principal</option>
                            <option value="secondary" data-translate="settings.art.modal.priority_secondary">Secundaria</option>
                            <option value="backup" data-translate="settings.art.modal.priority_backup">Respaldo</option>
                        </select>
                    </div>
                </div>

                <div style="margin: 15px 0;">
                    <label data-translate="settings.art.modal.emergency_contact_label">Contacto de Emergencia:</label>
                    <input type="text" id="artEmergencyContact" class="form-control" data-translate-placeholder="settings.art.modal.emergency_contact_placeholder" placeholder="Dr. Juan Pérez">
                </div>

                <div style="margin: 15px 0;">
                    <label data-translate="settings.art.modal.schedule_label">Horarios de Atención:</label>
                    <textarea id="artSchedule" class="form-control" rows="2" data-translate-placeholder="settings.art.modal.schedule_placeholder" placeholder="Lun-Vie: 8-18hs, Emergencias 24hs"></textarea>
                </div>

                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('addARTModal')" class="btn btn-secondary" data-translate="settings.art.modal.cancel_button">Cancelar</button>
                    <button type="submit" class="btn btn-danger" data-translate="settings.art.modal.add_button">Agregar ART</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('addARTForm').onsubmit = async (e) => {
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
        showSettingsMessage(await window.t('settings.messages.art_provider_added'), 'success');
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

async function editART(artId) {
    const art = artProviders.find(a => a.id === artId);
    if (!art) return;

    // Similar modal to addNewART but pre-filled
    showSettingsMessage(await window.t('settings.messages.edit_art_in_dev'), 'info');
}

async function removeART(artId) {
    if (confirm(await window.t('settings.messages.confirm_delete_art'))) {
        artProviders = artProviders.filter(a => a.id !== artId);
        renderARTProviders();
        showSettingsMessage(await window.t('settings.messages.art_provider_deleted'), 'warning');
    }
}

async function saveMultipleARTConfig() {
    const artEnabled = document.getElementById('artNotificationsEnabled').checked;
    const globalChannel = document.getElementById('globalArtChannel').value;

    const config = {
        enabled: artEnabled,
        globalChannel,
        providers: artProviders
    };

    console.log('🚨 [SETTINGS] Guardando configuración múltiple ART:', config);
    showSettingsMessage(await window.t('settings.messages.saving_multiple_art'), 'info');

    setTimeout(async () => {
        showSettingsMessage(await window.t('settings.messages.multiple_art_saved', { count: artProviders.length }), 'success');
    }, 1000);
}

async function testAllARTNotifications() {
    if (artProviders.length === 0) {
        showSettingsMessage(await window.t('settings.messages.no_art_providers'), 'warning');
        return;
    }

    showSettingsMessage(await window.t('settings.messages.testing_all_art', { count: artProviders.length }), 'info');

    setTimeout(async () => {
        showSettingsMessage(await window.t('settings.messages.all_art_tested'), 'success');
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

async function updateVacationScale(scaleId) {
    showSettingsMessage(await window.t('settings.messages.vacation_scale_updated'), 'success');
}

async function addCustomVacationScale() {
    if (document.getElementById('customVacationModal')) {
        document.getElementById('customVacationModal').remove();
    }

    const modal = document.createElement('div');
    modal.id = 'customVacationModal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-dialog">
            <form id="customVacationForm" class="modal-content" style="background: #fff; padding: 25px; border-radius: 15px;">
                <h5 style="color: #2c5aa0; margin-bottom: 20px;" data-translate="settings.licenses.modal_vacation_scale.title">📅 Agregar Escala de Vacaciones</h5>

                <div style="margin: 15px 0;">
                    <label data-translate="settings.licenses.modal_vacation_scale.range_label">Rango de Antigüedad:</label>
                    <input type="text" id="vacationRange" class="form-control" data-translate-placeholder="settings.licenses.modal_vacation_scale.range_placeholder" placeholder="Ej: 25-30 años" required>
                </div>

                <div style="margin: 15px 0;">
                    <label data-translate="settings.licenses.modal_vacation_scale.days_label">Días de Vacaciones:</label>
                    <input type="number" id="vacationDays" class="form-control" min="1" max="60" required>
                </div>

                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('customVacationModal')" class="btn btn-secondary" data-translate="settings.licenses.modal_vacation_scale.cancel_button">Cancelar</button>
                    <button type="submit" class="btn btn-primary" data-translate="settings.licenses.modal_vacation_scale.add_button">Agregar</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('customVacationForm').onsubmit = async (e) => {
        e.preventDefault();
        const range = document.getElementById('vacationRange').value;
        const days = document.getElementById('vacationDays').value;

        vacationScales.push({
            range,
            days: parseInt(days),
            id: Date.now()
        });

        closeModal('customVacationModal');
        showSettingsMessage(await window.t('settings.messages.vacation_scale_added'), 'success');
    };
}

async function addCustomExtraordinaryLicense() {
    if (document.getElementById('customLicenseModal')) {
        document.getElementById('customLicenseModal').remove();
    }

    const modal = document.createElement('div');
    modal.id = 'customLicenseModal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-dialog">
            <form id="customLicenseForm" class="modal-content" style="background: #fff; padding: 25px; border-radius: 15px;">
                <h5 style="color: #d84315; margin-bottom: 20px;" data-translate="settings.licenses.modal_extraordinary.title">🚨 Agregar Licencia Extraordinaria</h5>

                <div style="margin: 15px 0;">
                    <label data-translate="settings.licenses.modal_extraordinary.type_label">Tipo de Licencia:</label>
                    <input type="text" id="licenseType" class="form-control" data-translate-placeholder="settings.licenses.modal_extraordinary.type_placeholder" placeholder="Ej: Mudanza" required>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
                    <div>
                        <label data-translate="settings.licenses.modal_extraordinary.days_label">Días:</label>
                        <input type="number" id="licenseDays" class="form-control" min="1" required>
                    </div>
                    <div>
                        <label data-translate="settings.licenses.modal_extraordinary.day_type_label">Tipo de Días:</label>
                        <select id="licenseDayType" class="form-control">
                            <option value="habil" data-translate="settings.licenses.day_type_habil">Hábiles</option>
                            <option value="corrido" data-translate="settings.licenses.day_type_corrido">Corridos</option>
                        </select>
                    </div>
                </div>

                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('customLicenseModal')" class="btn btn-secondary" data-translate="settings.licenses.modal_extraordinary.cancel_button">Cancelar</button>
                    <button type="submit" class="btn btn-warning" data-translate="settings.licenses.modal_extraordinary.add_button">Agregar</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('customLicenseForm').onsubmit = async (e) => {
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
        showSettingsMessage(await window.t('settings.messages.extraordinary_license_added'), 'success');
    };
}

async function saveLicenseConfig() {
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
    showSettingsMessage(await window.t('settings.messages.saving_licenses'), 'info');

    setTimeout(async () => {
        showSettingsMessage(await window.t('settings.messages.licenses_saved'), 'success');
    }, 1000);
}

async function generateVacationSchedule() {
    showSettingsMessage(await window.t('settings.messages.generating_schedule'), 'info');

    // Simulación del algoritmo de programación automática
    setTimeout(async () => {
        showSettingsMessage(await window.t('settings.messages.schedule_generated'), 'success');

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

async function acceptVacationSchedule() {
    showSettingsMessage(await window.t('settings.messages.schedule_accepted'), 'success');
    closeModal('vacationScheduleModal');
}

async function modifyVacationSchedule() {
    showSettingsMessage(await window.t('settings.messages.schedule_modifications_enabled'), 'info');
    closeModal('vacationScheduleModal');
}

async function showCompatibilityMatrix() {
    showSettingsMessage(await window.t('settings.messages.showing_compatibility'), 'info');

    setTimeout(async () => {
        if (document.getElementById('compatibilityModal')) {
            document.getElementById('compatibilityModal').remove();
        }

        const modal = document.createElement('div');
        modal.id = 'compatibilityModal';
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content" style="background: #fff; padding: 25px; border-radius: 15px;">
                    <h5 style="color: #2c5aa0; margin-bottom: 20px;" data-translate="settings.licenses.modal_compatibility.title">🔄 Matriz de Compatibilidad de Tareas</h5>

                    <div style="background: #f3e5f5; padding: 15px; border-radius: 8px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #6c757d; color: white;">
                                    <th style="padding: 8px; border: 1px solid #ddd;" data-translate="settings.licenses.modal_compatibility.employee_col">Empleado</th>
                                    <th style="padding: 8px; border: 1px solid #ddd;" data-translate="settings.licenses.modal_compatibility.main_tasks_col">Tareas Principales</th>
                                    <th style="padding: 8px; border: 1px solid #ddd;" data-translate="settings.licenses.modal_compatibility.can_cover_col">Puede Cubrir</th>
                                    <th style="padding: 8px; border: 1px solid #ddd;" data-translate="settings.licenses.modal_compatibility.compatibility_col">Compatibilidad</th>
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
                        <button class="btn btn-secondary" onclick="closeModal('compatibilityModal')" data-translate="settings.licenses.modal_compatibility.close_button">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }, 1000);
}

async function showVacationCalculator() {
    showSettingsMessage(await window.t('settings.messages.calculator_opening'), 'info');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

console.log('✅ [SETTINGS] Módulo settings configurado');
// ✅ HACER FUNCIONES DISPONIBLES GLOBALMENTE
window.showSettingsContent = showSettingsContent;
window.copyToClipboard = copyToClipboard;
