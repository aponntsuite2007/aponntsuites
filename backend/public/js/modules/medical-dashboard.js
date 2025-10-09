// Medical Dashboard Module - v4.0 PROGRESSIVE
console.log('👩‍⚕️ [MEDICAL-DASHBOARD] Módulo medical-dashboard cargado');

// Mock employees data for medical dashboard
let mockEmployees = [
    { id: 1, name: 'Juan Pérez', legajo: 'EMP001', department: 'Administración' },
    { id: 2, name: 'María González', legajo: 'EMP002', department: 'Ventas' },
    { id: 3, name: 'Carlos Rodriguez', legajo: 'EMP003', department: 'Técnico' },
    { id: 4, name: 'Ana Martínez', legajo: 'EMP004', department: 'RRHH' },
    { id: 5, name: 'Luis López', legajo: 'EMP005', department: 'Logística' }
];

// Mock bidirectional medical documents (empleado ↔ médico)
let mockMedicalDocuments = {
    1: {
        certificates: [
            {
                id: 'CERT-001',
                title: 'Certificado Reposo - Lumbalgia',
                type: 'reposo',
                direction: 'medico_to_empleado',
                from: 'Dr. Ramírez (Traumatología)',
                to: 'Juan Pérez',
                date: '2025-09-01',
                time: '14:30',
                status: 'entregado',
                content: 'Certificado médico por lumbalgia aguda. Reposo 3 días.',
                attachments: ['cert_lumbalgia_001.pdf']
            },
            {
                id: 'CERT-REQ-002',
                title: 'Solicitud Certificado Aptitud',
                type: 'solicitud_aptitud',
                direction: 'empleado_to_medico',
                from: 'Juan Pérez',
                to: 'Medicina Laboral',
                date: '2025-08-28',
                time: '09:15',
                status: 'pendiente',
                content: 'Solicito certificado de aptitud para trabajo en altura.',
                attachments: []
            }
        ],
        studies: [
            {
                id: 'STUDY-001',
                title: 'Radiografía Columna Lumbar',
                type: 'radiografia',
                direction: 'medico_to_empleado',
                from: 'Dr. Ramírez (Traumatología)',
                to: 'Juan Pérez',
                date: '2025-08-30',
                time: '16:45',
                status: 'completado',
                content: 'Resultado: Rectificación de lordosis lumbar. Recomiendo fisioterapia.',
                attachments: ['rx_lumbar_001.jpg', 'informe_rx_001.pdf']
            }
        ],
        photos: [
            {
                id: 'PHOTO-001',
                title: 'Foto Lesión Mano Derecha',
                type: 'lesion',
                direction: 'empleado_to_medico',
                from: 'Juan Pérez',
                to: 'Dr. García (Cirugía)',
                date: '2025-08-25',
                time: '11:20',
                status: 'revisado',
                content: 'Corte superficial en dedo índice por herramienta de trabajo.',
                attachments: ['foto_mano_001.jpg']
            }
        ],
        prescriptions: [
            {
                id: 'PRESC-001',
                title: 'Receta - Antiinflamatorio',
                type: 'medicamento',
                direction: 'medico_to_empleado',
                from: 'Dr. Ramírez (Traumatología)',
                to: 'Juan Pérez',
                date: '2025-09-01',
                time: '14:35',
                status: 'vigente',
                content: 'Ibuprofeno 600mg cada 8 horas por 5 días.',
                attachments: ['receta_001.pdf']
            }
        ]
    },
    2: {
        certificates: [
            {
                id: 'CERT-003',
                title: 'Certificado Embarazo',
                type: 'embarazo',
                direction: 'medico_to_empleado',
                from: 'Dra. López (Ginecología)',
                to: 'María González',
                date: '2025-08-20',
                time: '10:15',
                status: 'entregado',
                content: 'Certificado de embarazo. Semana 12. Restricciones laborales.',
                attachments: ['cert_embarazo_003.pdf']
            }
        ],
        studies: [],
        photos: [],
        prescriptions: []
    },
    3: {
        certificates: [],
        studies: [
            {
                id: 'STUDY-002',
                title: 'Radiografía de Rodilla',
                type: 'radiografia',
                direction: 'medico_to_empleado',
                from: 'Dr. Martín (Traumatología)',
                to: 'Carlos Rodriguez',
                date: '2025-09-02',
                time: '15:20',
                status: 'completado',
                content: 'Estudio normal. Sin signos de lesión ósea.',
                attachments: ['rx_rodilla_002.jpg']
            }
        ],
        photos: [],
        prescriptions: []
    },
    4: {
        certificates: [],
        studies: [],
        photos: [
            {
                id: 'PHOTO-002',
                title: 'Foto Erupción Cutánea',
                type: 'dermatologia',
                direction: 'empleado_to_medico',
                from: 'Ana Martínez',
                to: 'Dra. Silva (Dermatología)',
                date: '2025-08-27',
                time: '13:40',
                status: 'revisado',
                content: 'Erupción en brazo después de usar nuevo uniforme.',
                attachments: ['foto_brazo_002.jpg']
            }
        ],
        prescriptions: []
    },
    5: {
        certificates: [],
        studies: [],
        photos: [],
        prescriptions: [
            {
                id: 'PRESC-002',
                title: 'Receta - Vitaminas',
                type: 'suplemento',
                direction: 'medico_to_empleado',
                from: 'Dr. Fernández (Medicina General)',
                to: 'Luis López',
                date: '2025-08-22',
                time: '11:15',
                status: 'vigente',
                content: 'Complejo vitamínico B. 1 comprimido diario por 30 días.',
                attachments: ['receta_002.pdf']
            }
        ]
    }
};

// Mock conversational timeline (solicitudes y respuestas cronológicas)
let mockConversations = {
    1: [
        {
            id: 'CONV-001',
            timestamp: '2025-08-25 11:20',
            type: 'solicitud',
            from: 'Juan Pérez',
            to: 'Dr. García (Cirugía)',
            subject: '🩹 Consulta por corte en dedo',
            message: 'Doctor, me corté el dedo índice con una herramienta. Adjunto foto. ¿Necesito puntos?',
            attachments: ['foto_mano_001.jpg'],
            status: 'enviado'
        },
        {
            id: 'CONV-002',
            timestamp: '2025-08-25 13:45',
            type: 'respuesta',
            from: 'Dr. García (Cirugía)',
            to: 'Juan Pérez',
            subject: '↩️ Re: Consulta por corte en dedo',
            message: 'Juan, el corte es superficial. Limpieza con agua y jabón, desinfectante y vendaje. Control en 3 días.',
            attachments: ['instrucciones_curacion.pdf'],
            status: 'leido'
        },
        {
            id: 'CONV-003',
            timestamp: '2025-08-28 09:15',
            type: 'solicitud',
            from: 'Juan Pérez',
            to: 'Medicina Laboral',
            subject: '📋 Solicitud Certificado Aptitud',
            message: 'Solicito certificado de aptitud psicofísica para trabajos en altura según nueva asignación.',
            attachments: [],
            status: 'pendiente'
        },
        {
            id: 'CONV-004',
            timestamp: '2025-08-30 16:45',
            type: 'resultado',
            from: 'Dr. Ramírez (Traumatología)',
            to: 'Juan Pérez',
            subject: '📊 Resultado Radiografía Lumbar',
            message: 'Juan, la radiografía muestra rectificación de lordosis. Recomiendo fisioterapia y ejercicios específicos.',
            attachments: ['rx_lumbar_001.jpg', 'plan_fisioterapia.pdf'],
            status: 'leido'
        },
        {
            id: 'CONV-005',
            timestamp: '2025-09-01 14:30',
            type: 'certificado',
            from: 'Dr. Ramírez (Traumatología)',
            to: 'Juan Pérez',
            subject: '🏥 Certificado Reposo Emitido',
            message: 'Emito certificado de reposo por 3 días debido a lumbalgia aguda. Adjunto certificado y receta.',
            attachments: ['cert_lumbalgia_001.pdf', 'receta_001.pdf'],
            status: 'entregado'
        }
    ],
    2: [
        {
            id: 'CONV-006',
            timestamp: '2025-08-15 14:20',
            type: 'consulta',
            from: 'María González',
            to: 'Dra. López (Ginecología)',
            subject: '🤰 Consulta Síntomas Embarazo',
            message: 'Doctora, tengo náuseas matutinas y fatiga. ¿Es normal en esta etapa?',
            attachments: [],
            status: 'respondido'
        },
        {
            id: 'CONV-007',
            timestamp: '2025-08-15 16:10',
            type: 'respuesta',
            from: 'Dra. López (Ginecología)',
            to: 'María González',
            subject: '↩️ Re: Consulta Síntomas Embarazo',
            message: 'María, son síntomas completamente normales del primer trimestre. Recomiendo descanso y hidratación.',
            attachments: ['guia_embarazo_primer_trimestre.pdf'],
            status: 'leido'
        },
        {
            id: 'CONV-008',
            timestamp: '2025-08-20 10:15',
            type: 'certificado',
            from: 'Dra. López (Ginecología)',
            to: 'María González',
            subject: '📋 Certificado Embarazo Emitido',
            message: 'María, adjunto certificado de embarazo semana 12. Incluyo restricciones laborales según tu puesto.',
            attachments: ['cert_embarazo_003.pdf', 'restricciones_laborales.pdf'],
            status: 'entregado'
        }
    ],
    3: [
        {
            id: 'CONV-009',
            timestamp: '2025-09-01 08:30',
            type: 'solicitud',
            from: 'Carlos Rodriguez',
            to: 'Dr. Martín (Traumatología)',
            subject: '🦵 Dolor de rodilla',
            message: 'Doctor, tengo dolor en la rodilla derecha desde hace una semana. ¿Necesito radiografía?',
            attachments: [],
            status: 'respondido'
        },
        {
            id: 'CONV-010',
            timestamp: '2025-09-02 15:20',
            type: 'resultado',
            from: 'Dr. Martín (Traumatología)',
            to: 'Carlos Rodriguez',
            subject: '📊 Resultado Radiografía Rodilla',
            message: 'Carlos, la radiografía salió normal. Recomiendo fisioterapia y antiinflamatorios.',
            attachments: ['rx_rodilla_002.jpg', 'plan_fisioterapia_rodilla.pdf'],
            status: 'leido'
        }
    ],
    4: [
        {
            id: 'CONV-011',
            timestamp: '2025-08-27 13:40',
            type: 'consulta',
            from: 'Ana Martínez',
            to: 'Dra. Silva (Dermatología)',
            subject: '🔴 Erupción cutánea',
            message: 'Doctora, me salió una erupción en el brazo. Adjunto foto. ¿Puede ser alergia al uniforme nuevo?',
            attachments: ['foto_brazo_002.jpg'],
            status: 'revisado'
        }
    ],
    5: [
        {
            id: 'CONV-012',
            timestamp: '2025-08-22 11:15',
            type: 'consulta',
            from: 'Luis López',
            to: 'Dr. Fernández (Medicina General)',
            subject: '😴 Fatiga constante',
            message: 'Doctor, me siento muy cansado últimamente. ¿Puede ser falta de vitaminas?',
            attachments: [],
            status: 'respondido'
        },
        {
            id: 'CONV-013',
            timestamp: '2025-08-22 14:30',
            type: 'respuesta',
            from: 'Dr. Fernández (Medicina General)',
            to: 'Luis López',
            subject: '↩️ Re: Fatiga constante',
            message: 'Luis, puede ser déficit vitamínico. Te receto un complejo B y sugiero análisis de sangre.',
            attachments: ['receta_002.pdf'],
            status: 'entregado'
        }
    ]
};

// Medical Dashboard functions - IMPORTANTE: nombre correcto sin mayúscula en 'dashboard'
function showMedicalDashboardContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="tab-content active" id="medical-dashboard">
            <!-- Medical Configuration Header -->
            <div class="card" style="margin-bottom: 20px; background: linear-gradient(135deg, #00BCD4 0%, #00ACC1 100%); color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="margin: 0; color: white;">👩‍⚕️ Dashboard Médico</h2>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Gestión completa del sistema médico</p>
                    </div>
                    <button class="btn" onclick="openMedicalConfigModal()" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 12px 20px; border-radius: 8px; font-weight: 600;">
                        ⚙️ Configuración Médica
                    </button>
                </div>
            </div>

            <!-- Date Range Filter -->
            <div class="card" style="margin-bottom: 20px;">
                <h2>📅 Filtros de Rango de Fechas</h2>
                <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                    <div class="form-group" style="margin: 0;">
                        <label style="font-weight: 500; color: #333; margin-bottom: 5px;">📅 Desde:</label>
                        <input type="date" id="medicalDateStart" value="" style="margin-top: 5px; padding: 12px; border: 2px solid #E0E7FF; border-radius: 6px; font-size: 14px; background: linear-gradient(135deg, #F8FAFF 0%, #F0F4FF 100%); color: #333; box-shadow: 0 2px 4px rgba(0,102,204,0.1); height: 48px; box-sizing: border-box;">
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label style="font-weight: 500; color: #333; margin-bottom: 5px;">📅 Hasta:</label>
                        <input type="date" id="medicalDateEnd" value="" style="margin-top: 5px; padding: 12px; border: 2px solid #E0E7FF; border-radius: 6px; font-size: 14px; background: linear-gradient(135deg, #F8FAFF 0%, #F0F4FF 100%); color: #333; box-shadow: 0 2px 4px rgba(0,102,204,0.1); height: 48px; box-sizing: border-box;">
                    </div>
                    <button class="btn btn-primary" onclick="loadEmployeesWithMedicalRecords()" style="margin-top: 20px; margin-left: 15px; height: 48px; align-self: flex-end; padding: 10px 20px; font-size: 14px; border-radius: 6px; background: linear-gradient(135deg, #0066CC 0%, #004499 100%); border: none; color: white; font-weight: 500; box-shadow: 0 2px 8px rgba(0,102,204,0.3);">🔍 Buscar Empleados con Carpeta Médica</button>
                </div>
            </div>

            <!-- Medical Statistics Overview -->
            <div class="stats-grid" style="margin-bottom: 30px;">
                <div class="stat-card">
                    <h3>👥 Empleados con Carpeta</h3>
                    <div class="stat-number" id="employeesWithRecords">-</div>
                </div>
                <div class="stat-card">
                    <h3>📋 Certificados Activos</h3>
                    <div class="stat-number" id="activeCertificates">-</div>
                </div>
                <div class="stat-card">
                    <h3>🩺 Con Estudios</h3>
                    <div class="stat-number" id="withStudies">-</div>
                </div>
                <div class="stat-card">
                    <h3>⚡ Requieren Auditoría</h3>
                    <div class="stat-number" id="requiresAudit">-</div>
                </div>
            </div>

            <!-- Integrated Employee Medical Dashboard -->
            <div class="card">
                <h2>👩‍⚕️ Empleados con Carpeta Médica - Vista Integrada</h2>
                
                <div id="employees-medical-list" class="medical-employees-container">
                    <!-- Employee cards will be loaded here -->
                    <div style="text-align: center; padding: 40px; color: #6c757d;">
                        <div style="font-size: 4rem; margin-bottom: 20px;">👩‍⚕️</div>
                        <p>Presiona "🔍 Buscar Empleados con Carpeta Médica" para cargar los datos</p>
                    </div>
                </div>
            </div>

            <!-- Quick Actions for Selected Employees -->
            <div class="card" style="margin-top: 30px;" id="quick-actions-card">
                <h2>⚡ Acciones Rápidas</h2>
                <p id="quick-actions-info" style="color: #6c757d; margin-bottom: 20px;">
                    👆 Haz clic en la tarjeta de un empleado de arriba para ver sus detalles completos, o usa las acciones rápidas aquí.
                </p>
                
                <div class="quick-actions">
                    <button class="btn btn-info" onclick="showAllEmployeesPhotoRequests()">📷 Ver Todas las Fotos Solicitadas</button>
                    <button class="btn btn-warning" onclick="showAllEmployeesStudies()">🩺 Ver Todos los Estudios</button>
                    <button class="btn btn-success" onclick="showPendingAudits()">⚡ Auditorías Pendientes</button>
                    <button class="btn btn-primary" onclick="generateGlobalMedicalReport()">📊 Reporte General</button>
                </div>
            </div>

            <!-- Medical Alerts and Notifications -->
            <div class="card" style="margin-top: 30px;">
                <h2>🚨 Alertas Médicas</h2>
                <div id="medical-alerts" class="alerts-container">
                    <div class="alert alert-warning">
                        <strong>⚠️ Certificados por Vencer:</strong> 3 certificados vencen en los próximos 7 días
                    </div>
                    <div class="alert alert-info">
                        <strong>📋 Estudios Pendientes:</strong> 5 empleados tienen estudios médicos pendientes
                    </div>
                    <div class="alert alert-danger">
                        <strong>🚨 Auditorías Urgentes:</strong> 2 casos requieren auditoría médica inmediata
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Initialize dates to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('medicalDateStart').value = firstDay.toISOString().split('T')[0];
    document.getElementById('medicalDateEnd').value = lastDay.toISOString().split('T')[0];
    
    // Auto load medical statistics
    setTimeout(loadMedicalStatistics, 300);
}

// Load medical statistics
function loadMedicalStatistics() {
    console.log('👩‍⚕️ [MEDICAL-DASHBOARD] Cargando estadísticas médicas...');

    // Simulate loading stats
    setTimeout(() => {
        document.getElementById('employeesWithRecords').textContent = '18';
        document.getElementById('activeCertificates').textContent = '12';
        document.getElementById('withStudios').textContent = '8';
        document.getElementById('requiresAudit').textContent = '2';

        showMedicalMessage('📊 Estadísticas médicas actualizadas', 'success');
    }, 800);
}

// Load employees with medical records
async function loadEmployeesWithMedicalRecords() {
    console.log('👩‍⚕️ [MEDICAL-DASHBOARD] Cargando empleados con carpeta médica...');
    
    const container = document.getElementById('employees-medical-list');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align: center; padding: 40px;">🔄 Cargando empleados con carpeta médica...</div>';
    
    try {
        const dateStart = document.getElementById('medicalDateStart').value;
        const dateEnd = document.getElementById('medicalDateEnd').value;

        // Simulate API call
        setTimeout(() => {
            const employees = [
                {
                    id: 1,
                    name: 'Juan Pérez',
                    legajo: 'E001',
                    department: 'IT',
                    lastMedicalCheck: '2025-08-15',
                    certificates: { active: 2, expired: 0, expiringSoon: 1 },
                    studies: { pending: 1, completed: 5 },
                    requiresAudit: false,
                    medicalStatus: 'Apto',
                    photoRequested: false
                },
                {
                    id: 2,
                    name: 'María García',
                    legajo: 'A001',
                    department: 'RRHH',
                    lastMedicalCheck: '2025-07-20',
                    certificates: { active: 1, expired: 1, expiringSoon: 0 },
                    studies: { pending: 2, completed: 3 },
                    requiresAudit: true,
                    medicalStatus: 'Con Observaciones',
                    photoRequested: true
                },
                {
                    id: 3,
                    name: 'Carlos López',
                    legajo: 'E002',
                    department: 'Ventas',
                    lastMedicalCheck: '2025-09-01',
                    certificates: { active: 3, expired: 0, expiringSoon: 0 },
                    studies: { pending: 0, completed: 8 },
                    requiresAudit: false,
                    medicalStatus: 'Apto',
                    photoRequested: false
                }
            ];

            displayMedicalEmployees(employees);
        }, 1000);
        
    } catch (error) {
        console.error('❌ [MEDICAL-DASHBOARD] Error cargando empleados:', error);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #dc3545;">❌ Error cargando empleados</div>';
    }
}

// Display medical employees - FUNCIONALIDAD ORIGINAL COMPLETA
function displayMedicalEmployees(employees) {
    const container = document.getElementById('employees-medical-list');
    if (!container) return;
    
    if (!employees || employees.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <div style="font-size: 3rem; margin-bottom: 20px;">📋</div>
                <h3>No hay empleados con carpeta médica</h3>
                <p>No se encontraron empleados con registros médicos en el rango de fechas seleccionado.</p>
            </div>
        `;
        return;
    }
    
    // Función auxiliar para obtener texto de estado
    function getStatusText(status) {
        switch(status) {
            case 'on-leave': return 'Con Licencia';
            case 'active': return 'Activo';
            default: return 'Activo';
        }
    }
    
    container.innerHTML = employees.map(emp => `
        <div class="employee-medical-card-improved" style="border: 2px solid #e9ecef; padding: 25px; margin-bottom: 20px; border-radius: 12px; background: white; box-shadow: 0 3px 15px rgba(0,0,0,0.1); cursor: default;">
            <!-- Header mejorado del empleado -->
            <div class="employee-header-improved" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f8f9fa;">
                <div class="employee-info-improved">
                    <h4 style="margin: 0; color: #2c3e50; font-size: 1.4rem; display: flex; align-items: center; gap: 10px;">
                        <span style="background: #3498db; color: white; padding: 8px; border-radius: 50%; font-size: 1.2rem;">👤</span>
                        ${emp.name}
                    </h4>
                    <div style="color: #7f8c8d; font-size: 0.95rem; margin-top: 8px; display: flex; gap: 20px;">
                        <span><strong>Legajo:</strong> ${emp.legajo}</span>
                        <span><strong>Depto:</strong> ${emp.department}</span>
                        <span><strong>Estado:</strong> <span class="status-badge" style="padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; background: #d4edda; color: #155724;">Activo</span></span>
                    </div>
                </div>
                <div class="medical-priority-badge" style="text-align: center;">
                    <div style="background: ${emp.requiresAudit ? '#dc3545' : emp.certificates?.expiringSoon > 0 ? '#ffc107' : '#28a745'}; color: white; padding: 12px 16px; border-radius: 8px; font-weight: 600; font-size: 0.9rem;">
                        ${emp.requiresAudit ? '🚨 REQUIERE AUDITORÍA' : emp.certificates?.expiringSoon > 0 ? '⚠️ CERTIFICADOS POR VENCER' : '✅ ESTADO NORMAL'}
                    </div>
                    <small style="color: #6c757d; margin-top: 5px; display: block;">
                        Última revisión: ${emp.lastMedicalCheck}
                    </small>
                </div>
            </div>
            
            <!-- Resumen médico visual -->
            <div class="medical-visual-summary" style="background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h5 style="margin: 0 0 15px 0; color: #495057; display: flex; align-items: center; gap: 8px;">
                    <span style="color: #17a2b8;">📊</span> Resumen de Carpeta Médica
                </h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px;">
                    <div class="metric-card clickable-metric" onclick="openEmployeeDocuments('${emp.id}', 'certificates')" style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #28a745; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.3s ease;">
                        <div style="font-size: 1.8rem; margin-bottom: 5px;">📄</div>
                        <div style="font-size: 1.4rem; font-weight: bold; color: #28a745;">${emp.certificates?.active || 0}</div>
                        <small style="color: #666; font-weight: 500;">Certificados</small>
                        <div style="font-size: 0.7rem; color: #6c757d; margin-top: 5px;">Clic para ver documentos</div>
                    </div>
                    <div class="metric-card clickable-metric" onclick="openEmployeeDocuments('${emp.id}', 'studies')" style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #17a2b8; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.3s ease;">
                        <div style="font-size: 1.8rem; margin-bottom: 5px;">🩺</div>
                        <div style="font-size: 1.4rem; font-weight: bold; color: #17a2b8;">${emp.studies?.completed || 0}</div>
                        <small style="color: #666; font-weight: 500;">Estudios Médicos</small>
                        <div style="font-size: 0.7rem; color: #6c757d; margin-top: 5px;">Clic para ver documentos</div>
                    </div>
                    <div class="metric-card clickable-metric" onclick="openEmployeeDocuments('${emp.id}', 'photos')" style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #ffc107; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.3s ease;">
                        <div style="font-size: 1.8rem; margin-bottom: 5px;">📷</div>
                        <div style="font-size: 1.4rem; font-weight: bold; color: #ffc107;">${emp.photoRequested ? '✓' : '✗'}</div>
                        <small style="color: #666; font-weight: 500;">Fotos Médicas</small>
                        <div style="font-size: 0.7rem; color: #6c757d; margin-top: 5px;">Clic para ver documentos</div>
                    </div>
                    <div class="metric-card clickable-metric" onclick="openEmployeeDocuments('${emp.id}', 'recipes')" style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #6f42c1; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.3s ease;">
                        <div style="font-size: 1.8rem; margin-bottom: 5px;">💊</div>
                        <div style="font-size: 1.4rem; font-weight: bold; color: #6f42c1;">${Math.random() > 0.5 ? '✓' : '✗'}</div>
                        <small style="color: #666; font-weight: 500;">Recetas Médicas</small>
                        <div style="font-size: 0.7rem; color: #6c757d; margin-top: 5px;">Clic para ver documentos</div>
                    </div>
                </div>
            </div>
            
            <!-- Solo botón principal - acciones disponibles desde los cuadros de documentos -->
            <div class="employee-quick-actions" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; padding-top: 15px; border-top: 1px solid #e9ecef;">
                <button class="btn btn-sm btn-primary" onclick="viewFullEmployeeDetails('${emp.id}')" style="width: 100%;">👁️ Ver Detalles Completos</button>
            </div>
        </div>
    `).join('');
    
    showMedicalMessage(`✅ ${employees.length} empleados con carpeta médica cargados`, 'success');
}

// Función para abrir documentos por tipo (MODAL DIRECTO SIN TABS)
function openEmployeeDocuments(employeeId, documentType) {
    console.log(`📁 [MEDICAL-DASHBOARD] Abriendo documentos tipo ${documentType} para empleado ${employeeId}`);
    
    const employee = mockEmployees.find(emp => emp.id == employeeId) || { name: `Empleado ${employeeId}` };
    
    // Mapear tipos de documento
    const typeMapping = {
        'certificates': 'certificates',
        'studies': 'studies', 
        'photos': 'photos',
        'recipes': 'prescriptions'
    };
    
    const mappedType = typeMapping[documentType] || documentType;
    
    // Datos del tipo de documento
    const typeData = {
        certificates: { icon: '🏥', title: 'Certificados Médicos', action: 'requestEmployeeCertificate' },
        studies: { icon: '🩺', title: 'Estudios Médicos', action: 'requestEmployeeStudy' },
        photos: { icon: '📷', title: 'Fotos Médicas', action: 'requestEmployeePhoto' },
        prescriptions: { icon: '💊', title: 'Recetas Médicas', action: 'requestEmployeePrescription' }
    };
    
    const data = typeData[mappedType];
    
    // Crear modal directo SIN tabs duplicados
    const modalContent = `
        <div class="modal employee-direct-modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; overflow-y: auto;">
            <div class="modal-content" style="background: white; margin: 2% auto; padding: 0; border-radius: 10px; max-width: 95%; max-height: 90vh; overflow: hidden;">
                <div style="padding: 20px; border-bottom: 2px solid #e9ecef; background: linear-gradient(135deg, #1565C0 0%, #2196F3 100%); color: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; color: white;">${data.icon} ${data.title} - ${employee.name}</h2>
                            <p style="margin: 5px 0 0 0; opacity: 0.9;">Legajo: ${employee.legajo || `EMP00${employeeId}`} • ${employee.department || 'Sin especificar'}</p>
                        </div>
                        <button onclick="closeDirectModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 30px; max-height: 70vh; overflow-y: auto;">
                    <!-- Panel izquierdo: SOLO documentos del tipo seleccionado -->
                    <div class="documents-panel">
                        <h3 style="color: #495057; display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                            ${data.icon} ${data.title}
                        </h3>
                        
                        <div id="direct-document-content-${employeeId}" class="document-type-content">
                            <div style="text-align: center; padding: 40px; color: #6c757d;">
                                <div style="font-size: 3rem; margin-bottom: 15px;">${data.icon}</div>
                                <p>Cargando ${data.title.toLowerCase()}...</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Panel derecho: SOLO conversaciones del tipo -->
                    <div class="requests-panel">
                        <h3 style="color: #495057; display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                            💬 ${data.title} - Actividad
                        </h3>
                        
                        <!-- Solicitudes pendientes filtradas -->
                        <div class="pending-requests-section" style="margin-bottom: 30px;">
                            <h4 style="color: #495057; font-size: 1.1rem; margin-bottom: 15px;">⏳ Solicitudes Pendientes</h4>
                            <div id="direct-pending-requests-${employeeId}">
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                                    <p style="margin: 0; color: #6c757d;">Cargando...</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Timeline filtrado -->
                        <div class="activity-timeline-section">
                            <h4 style="color: #495057; font-size: 1.1rem; margin-bottom: 15px;">⏱️ Historial de ${data.title}</h4>
                            <div id="direct-activity-timeline-${employeeId}">
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                                    <p style="margin: 0; color: #6c757d;">Cargando...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Cargar solo el contenido del tipo específico
    setTimeout(() => {
        loadDirectDocumentContent(mappedType, employeeId);
        loadDirectPendingRequests(employeeId, mappedType);
        loadDirectActivityTimeline(employeeId, mappedType);
    }, 300);
    
    showMedicalMessage(`📁 Abriendo ${data.title.toLowerCase()} de ${employee.name}`, 'info');
}

// Funciones avanzadas de solicitudes médicas
async function requestEmployeePhoto(employeeId) {
    const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };
    
    const modalContent = `
        <div class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; overflow-y: auto;">
            <div class="modal-content" style="background: white; margin: 2% auto; padding: 30px; border-radius: 10px; max-width: 500px; max-height: 90vh; overflow-y: auto; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; margin: 0;">📷 Solicitar Foto Médica</h2>
                    <button onclick="closePhotoModal()" style="background: none; border: none; font-size: 24px; color: #6c757d; cursor: pointer; padding: 5px; line-height: 1;" title="Cerrar">×</button>
                </div>
                <p><strong>Empleado:</strong> ${employee.name}</p>
                
                <form id="photoRequestForm">
                    <div class="form-group">
                        <label><strong>Parte del cuerpo a fotografiar:</strong></label>
                        <select id="bodyPart" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" required>
                            <option value="">Seleccionar...</option>
                            <option value="mano_derecha">Mano derecha</option>
                            <option value="mano_izquierda">Mano izquierda</option>
                            <option value="pie_derecho">Pie derecho</option>
                            <option value="pie_izquierdo">Pie izquierdo</option>
                            <option value="brazo_derecho">Brazo derecho</option>
                            <option value="brazo_izquierdo">Brazo izquierdo</option>
                            <option value="pierna_derecha">Pierna derecha</option>
                            <option value="pierna_izquierda">Pierna izquierda</option>
                            <option value="rostro">Rostro</option>
                            <option value="torso">Torso</option>
                            <option value="espalda">Espalda</option>
                            <option value="otro">Otro (especificar en observaciones)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Observaciones médicas:</strong></label>
                        <textarea id="photoObservations" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Detalles específicos de qué fotografiar y por qué..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Prioridad:</strong></label>
                        <select id="photoPriority" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="normal">Normal</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Urgente</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="button" onclick="closePhotoModal()" class="btn btn-secondary" style="flex: 1;">❌ Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="flex: 1;">📧 Enviar Solicitud</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    document.getElementById('photoRequestForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const bodyPart = document.getElementById('bodyPart').value;
        const observations = document.getElementById('photoObservations').value;
        const priority = document.getElementById('photoPriority').value;
        
        if (!bodyPart) {
            showMedicalMessage('❌ Debe seleccionar la parte del cuerpo', 'error');
            return;
        }
        
        try {
            // Simular envío de solicitud
            showMedicalMessage(`📧 Enviando solicitud de foto a ${employee.name}...`, 'info');
            
            // Simular delay de envío
            setTimeout(() => {
                const requestId = 'PHOTO-REQ-' + Date.now();
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                const timeStr = now.toTimeString().split(' ')[0].substring(0,5);
                
                // Agregar el documento a los datos mock
                if (!mockMedicalDocuments[employeeId]) {
                    mockMedicalDocuments[employeeId] = { certificates: [], studies: [], photos: [], prescriptions: [] };
                }
                
                const newPhoto = {
                    id: requestId,
                    title: `Solicitud Foto - ${bodyPart.replace('_', ' ')}`,
                    type: 'solicitud_foto',
                    direction: 'empleado_to_medico',
                    from: employee.name,
                    to: 'Personal Médico',
                    date: dateStr,
                    time: timeStr,
                    status: 'pendiente',
                    content: `Solicitud de fotografía médica de ${bodyPart.replace('_', ' ')}. ${observations || 'Sin observaciones adicionales'}`,
                    attachments: []
                };
                
                mockMedicalDocuments[employeeId].photos.push(newPhoto);
                
                // Agregar también a conversaciones
                if (!mockConversations[employeeId]) {
                    mockConversations[employeeId] = [];
                }
                
                const newConversation = {
                    id: 'CONV-' + Date.now(),
                    timestamp: `${dateStr} ${timeStr}`,
                    type: 'solicitud',
                    from: employee.name,
                    to: 'Personal Médico',
                    subject: `📷 Solicitud Foto Médica - ${bodyPart.replace('_', ' ')}`,
                    message: `Solicito fotografía médica de ${bodyPart.replace('_', ' ')}. ${observations || 'Sin observaciones adicionales'} Prioridad: ${priority}`,
                    attachments: [],
                    status: 'pendiente'
                };
                
                mockConversations[employeeId].push(newConversation);
                
                showMedicalMessage(`✅ Solicitud de foto enviada a ${employee.name} (ID: ${requestId})`, 'success');
                closePhotoModal();
                
                // Actualizar modal si está abierto
                if (document.getElementById(`document-type-content-${employeeId}`)) {
                    setTimeout(() => {
                        loadDocumentsByType('photos', employeeId);
                        loadPendingRequestsForEmployee(employeeId);
                        loadActivityTimelineForEmployee(employeeId);
                    }, 500);
                }
            }, 1000);
            
        } catch (error) {
            showMedicalMessage('❌ Error al enviar solicitud: ' + error.message, 'error');
        }
    };
}

function closePhotoModal() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

async function requestEmployeeStudy(employeeId) {
    const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };
    
    const modalContent = `
        <div class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; overflow-y: auto;">
            <div class="modal-content" style="background: white; margin: 2% auto; padding: 30px; border-radius: 10px; max-width: 600px; max-height: 90vh; overflow-y: auto; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; margin: 0;">🩺 Solicitar Estudio Médico</h2>
                    <button onclick="closeStudyModal()" style="background: none; border: none; font-size: 24px; color: #6c757d; cursor: pointer; padding: 5px; line-height: 1;" title="Cerrar">×</button>
                </div>
                <p><strong>Empleado:</strong> ${employee.name}</p>
                
                <form id="studyRequestForm">
                    <div class="form-group">
                        <label><strong>Tipo de estudio:</strong></label>
                        <select id="studyType" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" required>
                            <option value="">Seleccionar...</option>
                            <option value="radiografia">Radiografía</option>
                            <option value="resonancia">Resonancia Magnética</option>
                            <option value="tomografia">Tomografía</option>
                            <option value="ecografia">Ecografía</option>
                            <option value="analisis_sangre">Análisis de Sangre</option>
                            <option value="analisis_orina">Análisis de Orina</option>
                            <option value="electrocardiograma">Electrocardiograma</option>
                            <option value="espirometria">Espirometría</option>
                            <option value="audiometria">Audiometría</option>
                            <option value="oftalmologia">Examen Oftalmológico</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Área anatómica:</strong></label>
                        <input type="text" id="studyArea" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Ej: Rodilla derecha, Columna lumbar, etc.">
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Motivo del estudio:</strong></label>
                        <textarea id="studyReason" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Razón médica para solicitar el estudio..." required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Prioridad:</strong></label>
                        <select id="studyPriority" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="normal">Normal</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Urgente</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="button" onclick="closeStudyModal()" class="btn btn-secondary" style="flex: 1;">❌ Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="flex: 1;">📧 Enviar Solicitud</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    document.getElementById('studyRequestForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const studyType = document.getElementById('studyType').value;
        const studyArea = document.getElementById('studyArea').value;
        const reason = document.getElementById('studyReason').value;
        const priority = document.getElementById('studyPriority').value;
        
        if (!studyType || !reason) {
            showMedicalMessage('❌ Debe completar los campos obligatorios', 'error');
            return;
        }
        
        try {
            showMedicalMessage(`🩺 Enviando solicitud de estudio a ${employee.name}...`, 'info');
            
            setTimeout(() => {
                const requestId = 'study-' + Date.now();
                showMedicalMessage(`✅ Solicitud de ${studyType} enviada a ${employee.name} (ID: ${requestId})`, 'success');
                closeStudyModal();
                setTimeout(() => loadEmployeesWithMedicalRecords(), 1500);
            }, 2000);
            
        } catch (error) {
            showMedicalMessage('❌ Error al enviar solicitud: ' + error.message, 'error');
        }
    };
}

function closeStudyModal() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

async function requestEmployeeCertificate(employeeId) {
    const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };
    
    const modalContent = `
        <div class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; overflow-y: auto;">
            <div class="modal-content" style="background: white; margin: 2% auto; padding: 30px; border-radius: 10px; max-width: 600px; max-height: 90vh; overflow-y: auto; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; margin: 0;">📄 Solicitar Certificado Médico</h2>
                    <button onclick="closeCertificateModal()" style="background: none; border: none; font-size: 24px; color: #6c757d; cursor: pointer; padding: 5px; line-height: 1;" title="Cerrar">×</button>
                </div>
                <p><strong>Empleado:</strong> ${employee.name}</p>
                
                <form id="certificateRequestForm">
                    <div class="form-group">
                        <label><strong>Tipo de certificado:</strong></label>
                        <select id="certificateType" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" required>
                            <option value="">Seleccionar...</option>
                            <option value="aptitud_fisica">Certificado de Aptitud Física</option>
                            <option value="reposo_medico">Certificado de Reposo Médico</option>
                            <option value="enfermedad">Certificado de Enfermedad</option>
                            <option value="accidente_trabajo">Certificado por Accidente de Trabajo</option>
                            <option value="control_medico">Certificado de Control Médico</option>
                            <option value="discapacidad">Certificado de Discapacidad</option>
                            <option value="vacunacion">Certificado de Vacunación</option>
                            <option value="salud_mental">Certificado de Salud Mental</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Días de reposo (si aplica):</strong></label>
                        <input type="number" id="certificateDays" min="1" max="365" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Número de días">
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Diagnóstico o motivo:</strong></label>
                        <textarea id="certificateReason" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Diagnóstico médico o motivo del certificado..." required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Observaciones adicionales:</strong></label>
                        <textarea id="certificateNotes" rows="2" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Restricciones, indicaciones especiales, etc."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Prioridad:</strong></label>
                        <select id="certificatePriority" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="normal">Normal</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Urgente</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="button" onclick="closeCertificateModal()" class="btn btn-secondary" style="flex: 1;">❌ Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="flex: 1;">📧 Enviar Solicitud</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    document.getElementById('certificateRequestForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const certificateType = document.getElementById('certificateType').value;
        const days = document.getElementById('certificateDays').value;
        const reason = document.getElementById('certificateReason').value;
        const notes = document.getElementById('certificateNotes').value;
        const priority = document.getElementById('certificatePriority').value;
        
        if (!certificateType || !reason) {
            showMedicalMessage('❌ Debe completar los campos obligatorios', 'error');
            return;
        }
        
        try {
            showMedicalMessage(`📄 Enviando solicitud de certificado a ${employee.name}...`, 'info');
            
            setTimeout(() => {
                const requestId = 'CERT-REQ-' + Date.now();
                const typeText = certificateType.replace('_', ' ').toLowerCase();
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                const timeStr = now.toTimeString().split(' ')[0].substring(0,5);
                
                // Agregar el documento a los datos mock
                if (!mockMedicalDocuments[employeeId]) {
                    mockMedicalDocuments[employeeId] = { certificates: [], studies: [], photos: [], prescriptions: [] };
                }
                
                const newCertificate = {
                    id: requestId,
                    title: `Solicitud ${certificateType.replace('_', ' ')}`,
                    type: certificateType,
                    direction: 'empleado_to_medico',
                    from: employee.name,
                    to: 'Medicina Laboral',
                    date: dateStr,
                    time: timeStr,
                    status: 'pendiente',
                    content: `Solicitud de ${typeText}. ${reason}${days ? ` (${days} días)` : ''}${notes ? ` Observaciones: ${notes}` : ''}`,
                    attachments: []
                };
                
                mockMedicalDocuments[employeeId].certificates.push(newCertificate);
                
                // Agregar también a conversaciones
                if (!mockConversations[employeeId]) {
                    mockConversations[employeeId] = [];
                }
                
                const newConversation = {
                    id: 'CONV-' + Date.now(),
                    timestamp: `${dateStr} ${timeStr}`,
                    type: 'solicitud',
                    from: employee.name,
                    to: 'Medicina Laboral',
                    subject: `📄 Solicitud ${certificateType.replace('_', ' ')}`,
                    message: `${reason}${days ? ` Días solicitados: ${days}` : ''}${notes ? ` Observaciones: ${notes}` : ''}`,
                    attachments: [],
                    status: 'pendiente'
                };
                
                mockConversations[employeeId].push(newConversation);
                
                showMedicalMessage(`✅ Solicitud de ${typeText} enviada a ${employee.name} (ID: ${requestId})`, 'success');
                closeCertificateModal();
                
                // Actualizar modal si está abierto
                if (document.getElementById(`document-type-content-${employeeId}`)) {
                    setTimeout(() => {
                        loadDocumentsByType('certificates', employeeId);
                        loadPendingRequestsForEmployee(employeeId);
                        loadActivityTimelineForEmployee(employeeId);
                    }, 500);
                }
            }, 1000);
            
        } catch (error) {
            showMedicalMessage('❌ Error al enviar solicitud: ' + error.message, 'error');
        }
    };
}

function closeCertificateModal() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

function viewFullEmployeeDetails(employeeId) {
    console.log(`👁️ [MEDICAL-DASHBOARD] Viendo detalles completos del empleado ${employeeId}`);
    
    const employee = mockEmployees.find(emp => emp.id === employeeId) || { 
        id: employeeId, 
        name: `Empleado ${employeeId}`, 
        legajo: `EMP00${employeeId}`,
        department: 'Sin especificar'
    };
    
    const modalContent = `
        <div class="modal employee-documents-modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000;">
            <div class="modal-content" style="background: white; margin: 2% auto; padding: 0; border-radius: 10px; max-width: 95%; max-height: 90vh; overflow: hidden;">
                <div style="padding: 20px; border-bottom: 2px solid #e9ecef; background: linear-gradient(135deg, #1565C0 0%, #2196F3 100%); color: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; color: white;">👤 ${employee.name}</h2>
                            <p style="margin: 5px 0 0 0; opacity: 0.9;">Legajo: ${employee.legajo} • ${employee.department}</p>
                        </div>
                        <button onclick="closeEmployeeDetailsModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 30px; max-height: 70vh; overflow-y: auto;">
                    <!-- Panel izquierdo: Documentos y archivos -->
                    <div class="documents-panel">
                        <h3 style="color: #495057; display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                            📁 Documentos Médicos
                            <small style="margin-left: auto; color: #6c757d; font-weight: normal;">Archivos disponibles</small>
                        </h3>
                        
                        <!-- Tipos de documentos con navegación por tabs -->
                        <div class="document-tabs" style="display: flex; border-bottom: 1px solid #dee2e6; margin-bottom: 20px;">
                            <button onclick="showDocumentType('certificates', ${employeeId})" class="doc-tab active" data-type="certificates" style="padding: 10px 15px; border: none; background: #f8f9fa; color: #495057; cursor: pointer; font-size: 0.9rem; border-radius: 5px 5px 0 0; margin-right: 2px;">🏥 Certificados</button>
                            <button onclick="showDocumentType('studies', ${employeeId})" class="doc-tab" data-type="studies" style="padding: 10px 15px; border: none; background: transparent; color: #6c757d; cursor: pointer; font-size: 0.9rem;">🩺 Estudios</button>
                            <button onclick="showDocumentType('photos', ${employeeId})" class="doc-tab" data-type="photos" style="padding: 10px 15px; border: none; background: transparent; color: #6c757d; cursor: pointer; font-size: 0.9rem;">📷 Fotos</button>
                            <button onclick="showDocumentType('prescriptions', ${employeeId})" class="doc-tab" data-type="prescriptions" style="padding: 10px 15px; border: none; background: transparent; color: #6c757d; cursor: pointer; font-size: 0.9rem;">💊 Recetas</button>
                        </div>
                        
                        <!-- Contenido de documentos -->
                        <div id="document-type-content-${employeeId}" class="document-type-content">
                            <div style="text-align: center; padding: 40px; color: #6c757d;">
                                <div style="font-size: 3rem; margin-bottom: 15px;">🏥</div>
                                <h4>Certificados Médicos</h4>
                                <p>Cargando certificados médicos disponibles...</p>
                                <div style="margin-top: 20px;">
                                    <button onclick="requestEmployeeCertificate(${employeeId})" class="btn btn-primary btn-sm">📄 Solicitar Nuevo Certificado</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Panel derecho: Solicitudes pendientes y timeline -->
                    <div class="requests-panel">
                        <h3 style="color: #495057; display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                            📋 Solicitudes y Actividad
                            <small style="margin-left: auto; color: #6c757d; font-weight: normal;">Estado actual</small>
                        </h3>
                        
                        <!-- Solicitudes pendientes -->
                        <div class="pending-requests-section" style="margin-bottom: 30px;">
                            <h4 style="color: #495057; font-size: 1.1rem; margin-bottom: 15px;">⏳ Solicitudes Pendientes</h4>
                            <div id="pending-requests-${employeeId}" class="pending-requests-list">
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 1.5rem; margin-bottom: 10px;">📋</div>
                                    <p style="margin: 0; color: #6c757d;">Cargando solicitudes pendientes...</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Timeline de actividad -->
                        <div class="activity-timeline-section">
                            <h4 style="color: #495057; font-size: 1.1rem; margin-bottom: 15px;">⏱️ Timeline de Actividad</h4>
                            <div id="activity-timeline-${employeeId}" class="activity-timeline">
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 1.5rem; margin-bottom: 10px;">⏰</div>
                                    <p style="margin: 0; color: #6c757d;">Cargando historial de actividad...</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Acciones rápidas -->
                        <div class="quick-actions-section" style="margin-top: 30px;">
                            <h4 style="color: #495057; font-size: 1.1rem; margin-bottom: 15px;">⚡ Acciones Rápidas</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <button onclick="requestEmployeePhoto(${employeeId})" class="btn btn-warning btn-sm">📷 Solicitar Foto</button>
                                <button onclick="requestEmployeeStudy(${employeeId})" class="btn btn-info btn-sm">🩺 Solicitar Estudio</button>
                                <button onclick="requestEmployeeCertificate(${employeeId})" class="btn btn-success btn-sm">📄 Solicitar Certificado</button>
                                <button onclick="sendInstructions(${employeeId})" class="btn btn-secondary btn-sm">📝 Enviar Instrucciones</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Cargar contenido dinámico
    setTimeout(() => {
        loadPendingRequestsForEmployee(employeeId);
        loadActivityTimelineForEmployee(employeeId);
        loadDocumentsByType('certificates', employeeId);
    }, 300);
    
    showMedicalMessage(`👁️ Mostrando detalles completos de ${employee.name}`, 'info');
}

// Funciones auxiliares para el modal de detalles completos
function closeEmployeeDetailsModal() {
    const modal = document.querySelector('.employee-documents-modal');
    if (modal) modal.remove();
}

function showDocumentType(type, employeeId) {
    // Actualizar tabs activos
    document.querySelectorAll('.doc-tab').forEach(tab => {
        tab.style.background = 'transparent';
        tab.style.color = '#6c757d';
    });
    document.querySelector(`[data-type="${type}"]`).style.background = '#f8f9fa';
    document.querySelector(`[data-type="${type}"]`).style.color = '#495057';
    
    // Cargar contenido del tipo seleccionado
    loadDocumentsByType(type, employeeId);
    
    // NUEVO: También actualizar el panel derecho con datos relacionados al tipo seleccionado
    setTimeout(() => {
        loadPendingRequestsForEmployee(employeeId, type);
        loadActivityTimelineForEmployee(employeeId, type);
    }, 100);
}

function loadDocumentsByType(type, employeeId) {
    const container = document.getElementById(`document-type-content-${employeeId}`);
    const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };
    
    const typeData = {
        certificates: { icon: '🏥', title: 'Certificados Médicos', action: 'requestEmployeeCertificate' },
        studies: { icon: '🩺', title: 'Estudios Médicos', action: 'requestEmployeeStudy' },
        photos: { icon: '📷', title: 'Fotos Médicas', action: 'requestEmployeePhoto' },
        prescriptions: { icon: '💊', title: 'Recetas Médicas', action: 'requestEmployeePrescription' }
    };
    
    const data = typeData[type];
    
    // Obtener documentos del empleado por tipo
    const employeeDocuments = mockMedicalDocuments[employeeId] || {};
    const documents = employeeDocuments[type] || [];
    
    if (documents.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <div style="font-size: 3rem; margin-bottom: 15px;">${data.icon}</div>
                <h4>${data.title}</h4>
                <p>No hay documentos de este tipo para ${employee.name}</p>
                <div style="margin-top: 20px;">
                    <button onclick="${data.action}(${employeeId})" class="btn btn-primary btn-sm">➕ Solicitar Nuevo</button>
                </div>
            </div>
        `;
        return;
    }
    
    // Mostrar documentos existentes (bidireccionales empleado ↔ médico)
    const documentsHtml = documents.map(doc => {
        const directionIcon = doc.direction === 'empleado_to_medico' ? '📤' : '📥';
        const directionText = doc.direction === 'empleado_to_medico' ? 'Enviado a' : 'Recibido de';
        const directionColor = doc.direction === 'empleado_to_medico' ? '#17a2b8' : '#28a745';
        const statusColor = doc.status === 'entregado' ? '#28a745' : 
                           doc.status === 'pendiente' ? '#ffc107' : 
                           doc.status === 'revisado' ? '#17a2b8' : 
                           doc.status === 'vigente' ? '#28a745' : 
                           doc.status === 'completado' ? '#6f42c1' : '#6c757d';
        
        const attachmentsHtml = doc.attachments.length > 0 ? 
            `<div style="margin-top: 10px;">
                ${doc.attachments.map(att => 
                    `<span onclick="openFileViewer('${att}', '${doc.id}')" style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; margin-right: 5px; display: inline-block; margin-bottom: 3px; cursor: pointer; transition: all 0.3s ease;" title="Clic para abrir archivo" onmouseover="this.style.background='#007bff'; this.style.color='white'" onmouseout="this.style.background='#e9ecef'; this.style.color='inherit'">
                        📎 ${att}
                    </span>`
                ).join('')}
            </div>` : '';
        
        return `
            <div style="border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="font-size: 1.2rem;">${directionIcon}</span>
                            <strong style="color: #2c3e50; font-size: 1rem;">${doc.title}</strong>
                        </div>
                        <p style="margin: 8px 0; font-size: 0.9rem;">
                            <span style="color: ${directionColor}; font-weight: 600;">${directionText}:</span> 
                            <span style="color: #495057;">${doc.direction === 'empleado_to_medico' ? doc.to : doc.from}</span>
                        </p>
                        <p style="margin: 8px 0; color: #6c757d; font-size: 0.85rem;">
                            📅 ${doc.date} • ⏰ ${doc.time}
                        </p>
                        <p style="margin: 10px 0; color: #495057; line-height: 1.4; background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 0.9rem;">
                            ${doc.content}
                        </p>
                        ${attachmentsHtml}
                    </div>
                    <div style="text-align: right; flex-shrink: 0;">
                        <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; text-transform: uppercase; font-weight: bold; display: inline-block;">
                            ${doc.status}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h4 style="margin: 0; color: #495057;">${data.icon} ${data.title}</h4>
                <button onclick="${data.action}(${employeeId})" class="btn btn-primary btn-sm">+ Nuevo</button>
            </div>
            <div style="max-height: 400px; overflow-y: auto; padding-right: 10px;">
                ${documentsHtml}
            </div>
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 15px; text-align: center; font-size: 0.85rem; color: #6c757d;">
                📊 Total: ${documents.length} documento${documents.length !== 1 ? 's' : ''} • 
                📤 Enviados: ${documents.filter(d => d.direction === 'empleado_to_medico').length} • 
                📥 Recibidos: ${documents.filter(d => d.direction === 'medico_to_empleado').length}
            </div>
        </div>
    `;
}

function loadPendingRequestsForEmployee(employeeId, filterType = null) {
    const container = document.getElementById(`pending-requests-${employeeId}`);
    const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };
    
    // Obtener conversaciones pendientes del empleado
    const conversations = mockConversations[employeeId] || [];
    let pendingRequests = conversations.filter(conv => conv.status === 'pendiente' || conv.status === 'enviado');
    
    // Filtrar por tipo si se especifica
    if (filterType) {
        const typeMap = {
            'certificates': ['solicitud', 'certificado'],
            'studies': ['resultado', 'estudio'],
            'photos': ['foto', 'imagen'],
            'prescriptions': ['receta', 'medicamento']
        };
        
        const relevantTypes = typeMap[filterType] || [];
        pendingRequests = pendingRequests.filter(conv => 
            relevantTypes.some(type => 
                conv.subject.toLowerCase().includes(type) || 
                conv.type.toLowerCase().includes(type) ||
                conv.message.toLowerCase().includes(type)
            )
        );
    }
    
    if (pendingRequests.length === 0) {
        container.innerHTML = `
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #c3e6cb;">
                <div style="font-size: 1.5rem; margin-bottom: 10px; color: #155724;">✅</div>
                <p style="margin: 0; color: #155724;"><strong>Sin solicitudes pendientes</strong></p>
                <small style="color: #155724;">Todas las consultas han sido respondidas</small>
            </div>
        `;
        return;
    }
    
    const requestsHtml = pendingRequests.map(req => {
        const typeIcon = req.type === 'solicitud' ? '📤' : 
                        req.type === 'consulta' ? '💬' : '📋';
        const statusColor = req.status === 'pendiente' ? '#ffc107' : '#fd7e14';
        const daysDiff = Math.floor((new Date() - new Date(req.timestamp)) / (1000 * 60 * 60 * 24));
        
        return `
            <div style="background: white; border: 1px solid ${statusColor}; border-left: 4px solid ${statusColor}; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="font-size: 1rem;">${typeIcon}</span>
                            <strong style="color: #495057; font-size: 0.9rem;">${req.subject}</strong>
                        </div>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #6c757d;">
                            <strong>Para:</strong> ${req.to}
                        </p>
                        <p style="margin: 8px 0; font-size: 0.8rem; color: #495057; line-height: 1.3;">
                            ${req.message.substring(0, 80)}${req.message.length > 80 ? '...' : ''}
                        </p>
                        <small style="color: #6c757d; font-size: 0.75rem;">
                            📅 ${req.timestamp} • Hace ${daysDiff} día${daysDiff !== 1 ? 's' : ''}
                        </small>
                    </div>
                    <div style="text-align: right; flex-shrink: 0;">
                        <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase;">
                            ${req.status}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div style="max-height: 280px; overflow-y: auto;">
            ${requestsHtml}
        </div>
        <div style="background: #fff3cd; padding: 8px; border-radius: 5px; margin-top: 10px; text-align: center; font-size: 0.8rem; color: #856404;">
            ⏳ ${pendingRequests.length} solicitud${pendingRequests.length !== 1 ? 'es' : ''} esperando respuesta
        </div>
    `;
}

function loadActivityTimelineForEmployee(employeeId, filterType = null) {
    const container = document.getElementById(`activity-timeline-${employeeId}`);
    const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };
    
    // Obtener conversaciones del empleado ordenadas cronológicamente
    const conversations = mockConversations[employeeId] || [];
    let filteredConversations = conversations;
    
    // Filtrar por tipo si se especifica
    if (filterType) {
        const typeMap = {
            'certificates': ['solicitud', 'certificado'],
            'studies': ['resultado', 'estudio'], 
            'photos': ['foto', 'imagen'],
            'prescriptions': ['receta', 'medicamento']
        };
        
        const relevantTypes = typeMap[filterType] || [];
        filteredConversations = conversations.filter(conv => 
            relevantTypes.some(type => 
                conv.subject.toLowerCase().includes(type) || 
                conv.type.toLowerCase().includes(type) ||
                conv.message.toLowerCase().includes(type)
            )
        );
    }
    
    const sortedConversations = filteredConversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (sortedConversations.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <div style="font-size: 2rem; margin-bottom: 15px;">📭</div>
                <p style="margin: 0;">No hay actividad registrada</p>
                <small style="color: #6c757d;">Las conversaciones aparecerán aquí</small>
            </div>
        `;
        return;
    }
    
    const timelineHtml = sortedConversations.map((conv, index) => {
        const typeConfig = {
            'solicitud': { icon: '📤', color: '#17a2b8', bgColor: '#e3f2fd' },
            'respuesta': { icon: '📥', color: '#28a745', bgColor: '#e8f5e8' },
            'consulta': { icon: '💬', color: '#6f42c1', bgColor: '#f3e5f5' },
            'resultado': { icon: '📊', color: '#fd7e14', bgColor: '#fff3e0' },
            'certificado': { icon: '🏥', color: '#dc3545', bgColor: '#f8d7da' }
        };
        
        const config = typeConfig[conv.type] || { icon: '📝', color: '#6c757d', bgColor: '#f8f9fa' };
        const isFromEmployee = conv.from.includes(employee.name);
        const directionText = isFromEmployee ? 'Enviado a' : 'Recibido de';
        const participantName = isFromEmployee ? conv.to : conv.from;
        
        // Status indicator
        const statusConfig = {
            'pendiente': { color: '#ffc107', text: 'Pendiente' },
            'enviado': { color: '#fd7e14', text: 'Enviado' },
            'leido': { color: '#28a745', text: 'Leído' },
            'respondido': { color: '#17a2b8', text: 'Respondido' },
            'entregado': { color: '#6f42c1', text: 'Entregado' }
        };
        
        const status = statusConfig[conv.status] || { color: '#6c757d', text: conv.status };
        
        // Attachments
        const attachmentsHtml = conv.attachments && conv.attachments.length > 0 ? 
            `<div style="margin-top: 8px; display: flex; gap: 5px; flex-wrap: wrap;">
                ${conv.attachments.map(att => 
                    `<span style="background: ${config.bgColor}; color: ${config.color}; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; border: 1px solid ${config.color}20;">
                        📎 ${att}
                    </span>`
                ).join('')}
            </div>` : '';
        
        return `
            <div style="display: flex; gap: 15px; margin-bottom: 20px; position: relative;">
                <!-- Timeline line -->
                ${index < sortedConversations.length - 1 ? 
                    '<div style="position: absolute; left: 8px; top: 20px; bottom: -20px; width: 2px; background: #e9ecef; z-index: 1;"></div>' : ''}
                
                <!-- Timeline dot -->
                <div style="width: 16px; height: 16px; border-radius: 50%; background: ${config.color}; margin-top: 4px; flex-shrink: 0; z-index: 2; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative;">
                    <div style="position: absolute; top: -1px; left: -1px; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 0.6rem;">
                        ${config.icon}
                    </div>
                </div>
                
                <!-- Content -->
                <div style="flex: 1; background: white; border: 1px solid #e9ecef; border-radius: 10px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #2c3e50; font-size: 0.9rem; margin-bottom: 4px;">
                                ${conv.subject}
                            </div>
                            <div style="font-size: 0.8rem; color: #6c757d; margin-bottom: 8px;">
                                <span style="color: ${config.color};">${directionText}:</span> ${participantName}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span style="background: ${status.color}; color: white; padding: 3px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: bold;">
                                ${status.text}
                            </span>
                        </div>
                    </div>
                    
                    <div style="color: #495057; font-size: 0.85rem; line-height: 1.4; margin-bottom: 8px;">
                        ${conv.message}
                    </div>
                    
                    ${attachmentsHtml}
                    
                    <div style="margin-top: 10px; font-size: 0.75rem; color: #6c757d; text-align: right;">
                        📅 ${conv.timestamp}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div style="max-height: 400px; overflow-y: auto; padding-right: 10px;">
            <div style="background: linear-gradient(135deg, #1565C0 0%, #2196F3 100%); color: white; padding: 10px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                <strong>💬 Conversaciones con Personal Médico</strong>
                <br><small style="opacity: 0.9;">Historial cronológico de intercambios</small>
            </div>
            ${timelineHtml}
        </div>
    `;
}

function sendInstructions(employeeId) {
    const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };
    showMedicalMessage(`📝 Enviando instrucciones médicas a ${employee.name}...`, 'info');
    
    setTimeout(() => {
        showMedicalMessage(`✅ Instrucciones enviadas a ${employee.name}`, 'success');
    }, 2000);
}

// Quick actions functions
function showAllEmployeesPhotoRequests() {
    console.log('📷 [MEDICAL-DASHBOARD] Mostrando fotos solicitadas...');
    showMedicalMessage('📷 Función ver fotos en desarrollo', 'info');
}

function showAllEmployeesStudies() {
    console.log('🩺 [MEDICAL-DASHBOARD] Mostrando estudios...');
    showMedicalMessage('🩺 Función ver estudios en desarrollo', 'info');
}

function showPendingAudits() {
    console.log('⚡ [MEDICAL-DASHBOARD] Mostrando auditorías pendientes...');
    showMedicalMessage('⚡ Función auditorías pendientes en desarrollo', 'info');
}

function generateGlobalMedicalReport() {
    console.log('📊 [MEDICAL-DASHBOARD] Generando reporte...');
    showMedicalMessage('📊 Generando reporte general...', 'info');
    
    setTimeout(() => {
        showMedicalMessage('✅ Reporte generado (función en desarrollo)', 'success');
    }, 2000);
}

// Employee actions
function viewEmployeeMedicalDetails(employeeId) {
    console.log('👁️ [MEDICAL-DASHBOARD] Viendo detalles:', employeeId);
    showMedicalMessage('👁️ Función ver detalles en desarrollo', 'info');
}

function editEmployeeMedical(employeeId) {
    console.log('✏️ [MEDICAL-DASHBOARD] Editando empleado:', employeeId);
    showMedicalMessage('✏️ Función editar en desarrollo', 'info');
}

function viewMedicalHistory(employeeId) {
    console.log('📋 [MEDICAL-DASHBOARD] Viendo historial:', employeeId);
    showMedicalMessage('📋 Función historial en desarrollo', 'info');
}

function addMedicalRecord(employeeId) {
    console.log('➕ [MEDICAL-DASHBOARD] Agregando registro:', employeeId);
    showMedicalMessage('➕ Función agregar registro en desarrollo', 'info');
}

// Utility functions
function showMedicalMessage(message, type) {
    let messageElement = document.getElementById('medicalDashboardMessage');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'medicalDashboardMessage';
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

// Función para abrir visor de archivos
function openFileViewer(fileName, documentId) {
    console.log(`📁 [MEDICAL-DASHBOARD] Abriendo archivo: ${fileName} del documento ${documentId}`);
    
    // Determinar tipo de archivo por extensión
    const fileExt = fileName.split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExt);
    const isPDF = fileExt === 'pdf';
    const isDoc = ['doc', 'docx'].includes(fileExt);
    
    let contentHtml = '';
    let title = `📄 ${fileName}`;
    
    if (isImage) {
        title = `📷 ${fileName}`;
        contentHtml = `
            <div style="text-align: center; padding: 20px;">
                <div style="width: 400px; height: 300px; margin: 0 auto; background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%); border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; border-radius: 8px; position: relative;">
                    <div style="text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 10px;">📷</div>
                        <p style="color: #6c757d; margin: 0; font-weight: 500;">Imagen Médica</p>
                        <small style="color: #999;">${fileName}</small>
                    </div>
                </div>
                <p style="margin-top: 15px; color: #6c757d; font-size: 0.9rem;">
                    📸 Vista previa de imagen médica<br>
                    <small>En el sistema real, aquí se mostraría la imagen actual del archivo</small>
                </p>
            </div>
        `;
    } else if (isPDF) {
        title = `📋 ${fileName}`;
        contentHtml = `
            <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 20px;">
                <div style="font-size: 4rem; margin-bottom: 15px; color: #dc3545;">📄</div>
                <h3 style="color: #2c3e50; margin-bottom: 10px;">Documento PDF</h3>
                <p style="color: #6c757d; margin-bottom: 20px;">${fileName}</p>
                <div style="background: white; padding: 20px; border-radius: 5px; border: 1px solid #dee2e6; text-align: left; max-height: 300px; overflow-y: auto;">
                    <h4 style="color: #495057; margin-bottom: 15px;">📋 Contenido del documento</h4>
                    <div style="color: #6c757d; line-height: 1.8; font-family: monospace; background: #f8f9fa; padding: 15px; border-radius: 3px;">
                        <strong>CERTIFICADO MÉDICO</strong><br>
                        ========================<br><br>
                        Paciente: [Nombre del empleado]<br>
                        Fecha: ${new Date().toLocaleDateString('es-ES')}<br>
                        Médico: Dr. [Nombre]<br><br>
                        Diagnóstico: [Información médica]<br>
                        Tratamiento: [Indicaciones]<br><br>
                        ✓ Documento válido<br>
                        ✓ Firmado digitalmente<br>
                    </div>
                    <small style="color: #999; font-style: italic; display: block; margin-top: 10px;">
                        Simulación del contenido real del PDF
                    </small>
                </div>
            </div>
        `;
    } else {
        contentHtml = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 4rem; margin-bottom: 15px; color: #6c757d;">📁</div>
                <h3 style="color: #2c3e50; margin-bottom: 10px;">Archivo médico</h3>
                <p style="color: #6c757d; margin-bottom: 20px;">${fileName}</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;">
                    <p style="color: #495057; margin-bottom: 10px;">
                        📄 Tipo: .${fileExt.toUpperCase()}<br>
                        📅 Documento médico disponible
                    </p>
                    <small style="color: #6c757d;">
                        El archivo está disponible para descarga.<br>
                        En el sistema real se abriría con la aplicación correspondiente.
                    </small>
                </div>
            </div>
        `;
    }
    
    const modalContent = `
        <div class="modal file-viewer-modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; overflow-y: auto;">
            <div class="modal-content" style="background: white; margin: 2% auto; padding: 0; border-radius: 10px; max-width: 80%; max-height: 90vh; overflow-y: auto; position: relative;">
                <div style="padding: 20px; border-bottom: 1px solid #e9ecef; background: linear-gradient(135deg, #87CEEB 0%, #B0E0E6 100%); color: white; border-radius: 10px 10px 0 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; color: white;">${title}</h3>
                        <button onclick="closeFileViewer()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 5px; line-height: 1;" title="Cerrar">×</button>
                    </div>
                </div>
                
                <div style="padding: 20px;">
                    ${contentHtml}
                </div>
                
                <div style="padding: 20px; border-top: 1px solid #e9ecef; background: #f8f9fa; text-align: center; border-radius: 0 0 10px 10px;">
                    <button onclick="downloadFile('${fileName}')" class="btn btn-primary" style="margin-right: 10px;">📥 Descargar</button>
                    <button onclick="closeFileViewer()" class="btn btn-secondary">❌ Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    showMedicalMessage(`📁 Abriendo ${fileName}...`, 'info');
}

function closeFileViewer() {
    const modal = document.querySelector('.file-viewer-modal');
    if (modal) modal.remove();
}

function downloadFile(fileName) {
    showMedicalMessage(`📥 Descargando ${fileName}...`, 'info');
    
    // Simular descarga creando un enlace temporal
    const link = document.createElement('a');
    const fileExt = fileName.split('.').pop().toLowerCase();
    
    // Crear contenido simulado según el tipo
    let content = '';
    let mimeType = 'text/plain';
    
    if (fileExt === 'pdf') {
        content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Documento médico simulado) Tj
ET
endstream
endobj
trailer
<< /Size 5 /Root 1 0 R >>
startxref
%%EOF`;
        mimeType = 'application/pdf';
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) {
        // Para imágenes, crear un pequeño SVG como placeholder
        content = `<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="150" fill="#f0f0f0"/>
  <text x="100" y="75" text-anchor="middle" fill="#666">Imagen médica</text>
  <text x="100" y="95" text-anchor="middle" fill="#999" font-size="12">${fileName}</text>
</svg>`;
        mimeType = 'image/svg+xml';
    } else {
        content = `Documento médico simulado - ${fileName}
        
Fecha: ${new Date().toLocaleDateString('es-ES')}
Hora: ${new Date().toLocaleTimeString('es-ES')}

Este es un archivo de prueba generado por el sistema de gestión médica.

Contenido simulado para fines de demostración.`;
    }
    
    // Crear blob y descarga
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = fileName;
    link.style.setProperty('display', 'none', 'important');
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpiar URL temporal
    setTimeout(() => {
        URL.revokeObjectURL(url);
        showMedicalMessage(`✅ ${fileName} descargado exitosamente`, 'success');
    }, 1000);
}

// Funciones para el modal directo (sin duplicación de tabs)
function closeDirectModal() {
    const modal = document.querySelector('.employee-direct-modal');
    if (modal) modal.remove();
}

function loadDirectDocumentContent(type, employeeId) {
    const container = document.getElementById(`direct-document-content-${employeeId}`);
    if (!container) {
        console.log('❌ Container not found:', `direct-document-content-${employeeId}`);
        return;
    }
    
    console.log(`📦 Cargando contenido directo tipo: ${type} para empleado: ${employeeId}`);
    
    const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };
    
    const typeData = {
        certificates: { icon: '🏥', title: 'Certificados Médicos', action: 'requestEmployeeCertificate' },
        studies: { icon: '🩺', title: 'Estudios Médicos', action: 'requestEmployeeStudy' },
        photos: { icon: '📷', title: 'Fotos Médicas', action: 'requestEmployeePhoto' },
        prescriptions: { icon: '💊', title: 'Recetas Médicas', action: 'requestEmployeePrescription' }
    };
    
    const data = typeData[type];
    
    // Obtener documentos del tipo específico
    const documents = mockMedicalDocuments[employeeId]?.[type] || [];
    
    if (documents.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <div style="font-size: 3rem; margin-bottom: 15px;">${data.icon}</div>
                <h4>${data.title}</h4>
                <p>No hay ${data.title.toLowerCase()} registrados</p>
                <div style="margin-top: 20px;">
                    <button onclick="${data.action}(${employeeId})" class="btn btn-primary btn-sm">+ Solicitar Nuevo</button>
                </div>
            </div>
        `;
        return;
    }
    
    // Mostrar documentos existentes
    const documentsHtml = documents.map(doc => `
        <div style="border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 10px; background: white;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <h5 style="margin: 0; color: #495057; flex-grow: 1;">${doc.title}</h5>
                <span style="font-size: 0.8rem; color: #6c757d; margin-left: 10px;">${doc.date}</span>
            </div>
            <p style="margin: 8px 0; font-size: 0.9rem; color: #666;">${doc.content}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <span class="status-badge status-${doc.status}" style="font-size: 0.8rem; padding: 3px 8px; border-radius: 12px;">
                    ${doc.status === 'pendiente' ? '⏳ Pendiente' : doc.status === 'enviado' ? '📤 Enviado' : '✅ Completado'}
                </span>
                ${doc.attachments?.length > 0 ? `<button onclick="openFileViewer('${doc.attachments[0]}', '${doc.id}')" style="font-size: 0.8rem; padding: 5px 10px; border: 1px solid #007bff; background: white; color: #007bff; border-radius: 4px; cursor: pointer;">📎 Ver Archivo</button>` : ''}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div style="max-height: 400px; overflow-y: auto;">
            ${documentsHtml}
        </div>
        <div style="text-align: center; margin-top: 15px;">
            <button onclick="${data.action}(${employeeId})" class="btn btn-primary btn-sm">+ Nuevo ${data.title}</button>
        </div>
    `;
}

function loadDirectPendingRequests(employeeId, filterType) {
    const container = document.getElementById(`direct-pending-requests-${employeeId}`);
    const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };
    
    // Usar la misma lógica de filtrado
    const conversations = mockConversations[employeeId] || [];
    let pendingRequests = conversations.filter(conv => conv.status === 'pendiente' || conv.status === 'enviado');
    
    if (filterType) {
        const typeMap = {
            'certificates': ['solicitud', 'certificado'],
            'studies': ['resultado', 'estudio'],
            'photos': ['foto', 'imagen'],
            'prescriptions': ['receta', 'medicamento']
        };
        
        const relevantTypes = typeMap[filterType] || [];
        pendingRequests = pendingRequests.filter(conv => 
            relevantTypes.some(type => 
                conv.subject.toLowerCase().includes(type) || 
                conv.type.toLowerCase().includes(type) ||
                conv.message.toLowerCase().includes(type)
            )
        );
    }
    
    if (pendingRequests.length === 0) {
        container.innerHTML = `
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #c3e6cb;">
                <div style="font-size: 1.5rem; margin-bottom: 10px; color: #155724;">✅</div>
                <p style="margin: 0; color: #155724;"><strong>Sin solicitudes pendientes</strong></p>
                <small style="color: #155724;">Todo al día en esta categoría</small>
            </div>
        `;
        return;
    }
    
    // Mostrar solicitudes filtradas (copiar lógica existente pero simplificada)
    const requestsHtml = pendingRequests.slice(0, 3).map(req => `
        <div style="background: white; border: 1px solid #ffc107; border-left: 4px solid #ffc107; padding: 10px; border-radius: 5px; margin-bottom: 8px;">
            <div style="font-size: 0.85rem; color: #495057; margin-bottom: 5px;">
                <strong>${req.subject}</strong>
            </div>
            <small style="color: #6c757d;">${req.timestamp}</small>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div style="max-height: 200px; overflow-y: auto;">
            ${requestsHtml}
        </div>
        ${pendingRequests.length > 3 ? `<div style="text-align: center; margin-top: 10px; color: #6c757d; font-size: 0.8rem;">... y ${pendingRequests.length - 3} más</div>` : ''}
    `;
}

function loadDirectActivityTimeline(employeeId, filterType) {
    const container = document.getElementById(`direct-activity-timeline-${employeeId}`);
    
    // Usar la misma lógica de filtrado que la función principal
    const conversations = mockConversations[employeeId] || [];
    let filteredConversations = conversations;
    
    if (filterType) {
        const typeMap = {
            'certificates': ['solicitud', 'certificado'],
            'studies': ['resultado', 'estudio'], 
            'photos': ['foto', 'imagen'],
            'prescriptions': ['receta', 'medicamento']
        };
        
        const relevantTypes = typeMap[filterType] || [];
        filteredConversations = conversations.filter(conv => 
            relevantTypes.some(type => 
                conv.subject.toLowerCase().includes(type) || 
                conv.type.toLowerCase().includes(type) ||
                conv.message.toLowerCase().includes(type)
            )
        );
    }
    
    const sortedConversations = filteredConversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (sortedConversations.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #6c757d;">
                <div style="font-size: 2rem; margin-bottom: 10px;">📭</div>
                <p style="margin: 0;">No hay actividad de este tipo</p>
            </div>
        `;
        return;
    }
    
    // Mostrar solo los primeros 4 elementos del timeline
    const timelineHtml = sortedConversations.slice(0, 4).map(conv => `
        <div style="display: flex; gap: 10px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e9ecef;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #17a2b8; margin-top: 4px; flex-shrink: 0;"></div>
            <div style="font-size: 0.8rem;">
                <div style="font-weight: 500; color: #495057;">${conv.subject}</div>
                <small style="color: #6c757d;">${conv.timestamp}</small>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div style="max-height: 250px; overflow-y: auto;">
            ${timelineHtml}
        </div>
        ${sortedConversations.length > 4 ? `<div style="text-align: center; margin-top: 10px; color: #6c757d; font-size: 0.8rem;">... y ${sortedConversations.length - 4} eventos más</div>` : ''}
    `;
}

// Función faltante para recetas médicas
async function requestEmployeePrescription(employeeId) {
    const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };
    
    const modalContent = `
        <div class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; overflow-y: auto;">
            <div class="modal-content" style="background: white; margin: 2% auto; padding: 30px; border-radius: 10px; max-width: 500px; max-height: 90vh; overflow-y: auto; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; margin: 0;">💊 Solicitar Receta Médica</h2>
                    <button onclick="closePrescriptionModal()" style="background: none; border: none; font-size: 24px; color: #6c757d; cursor: pointer; padding: 5px; line-height: 1;" title="Cerrar">×</button>
                </div>
                <p><strong>Empleado:</strong> ${employee.name}</p>
                
                <form id="prescriptionRequestForm">
                    <div class="form-group">
                        <label><strong>Tipo de medicamento:</strong></label>
                        <select id="medicationType" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" required>
                            <option value="">Seleccionar...</option>
                            <option value="analgesico">Analgésico</option>
                            <option value="antiinflamatorio">Antiinflamatorio</option>
                            <option value="antibiotico">Antibiótico</option>
                            <option value="vitaminas">Vitaminas</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-top: 15px;">
                        <label><strong>Síntomas o diagnóstico:</strong></label>
                        <textarea id="symptoms" placeholder="Describa los síntomas o el diagnóstico médico..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; min-height: 80px;" required></textarea>
                    </div>
                    
                    <div class="form-group" style="margin-top: 15px;">
                        <label><strong>Observaciones adicionales:</strong></label>
                        <textarea id="prescriptionNotes" placeholder="Observaciones para el médico..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; min-height: 60px;"></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px;">
                        <button type="button" onclick="closePrescriptionModal()" style="padding: 10px 20px; border: 1px solid #6c757d; background: white; color: #6c757d; border-radius: 5px; cursor: pointer;">Cancelar</button>
                        <button type="button" onclick="submitPrescriptionRequest(${employeeId})" style="padding: 10px 20px; background: linear-gradient(135deg, #1565C0 0%, #2196F3 100%); color: white; border: none; border-radius: 5px; cursor: pointer;">💊 Solicitar Receta</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
}

function closePrescriptionModal() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

function submitPrescriptionRequest(employeeId) {
    const medicationType = document.getElementById('medicationType').value;
    const symptoms = document.getElementById('symptoms').value;
    const notes = document.getElementById('prescriptionNotes').value;
    
    if (!medicationType || !symptoms) {
        showMedicalMessage('❌ Por favor complete todos los campos requeridos', 'error');
        return;
    }
    
    showMedicalMessage('📤 Enviando solicitud de receta médica...', 'info');
    
    // Simular delay de envío
    setTimeout(() => {
        const requestId = 'PRESC-REQ-' + Date.now();
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };
        
        // Agregar a mockMedicalDocuments
        if (!mockMedicalDocuments[employeeId]) {
            mockMedicalDocuments[employeeId] = { certificates: [], studies: [], photos: [], prescriptions: [] };
        }
        
        const newPrescription = {
            id: requestId,
            title: `Solicitud Receta - ${medicationType}`,
            type: 'solicitud_receta',
            direction: 'empleado_to_medico',
            from: employee.name,
            to: 'Medicina Laboral',
            date: dateStr,
            time: timeStr,
            status: 'pendiente',
            content: `Solicitud de receta médica: ${medicationType}. Síntomas: ${symptoms}${notes ? ` Observaciones: ${notes}` : ''}`,
            attachments: []
        };
        
        mockMedicalDocuments[employeeId].prescriptions.push(newPrescription);
        
        // Agregar también a conversaciones
        if (!mockConversations[employeeId]) {
            mockConversations[employeeId] = [];
        }
        
        const newConversation = {
            id: 'CONV-' + Date.now(),
            timestamp: `${dateStr} ${timeStr}`,
            type: 'solicitud',
            from: employee.name,
            to: 'Medicina Laboral',
            subject: `💊 Solicitud Receta Médica - ${medicationType}`,
            message: `Solicitud de receta médica para ${medicationType}. ${symptoms}`,
            status: 'pendiente',
            attachments: []
        };
        
        mockConversations[employeeId].push(newConversation);
        
        showMedicalMessage(`✅ Solicitud de receta médica enviada (ID: ${requestId})`, 'success');
        closePrescriptionModal();
        
        // Refrescar el dashboard médico si está visible
        if (typeof loadMedicalEmployeesWithRecords === 'function') {
            loadMedicalEmployeesWithRecords();
        }
    }, 2000);
}

// ===============================================
// 🚨 INTEGRACIÓN DE NOTIFICACIONES BIDIRECCIONALES 100%
// ===============================================

// Función para integrar con el sistema de notificaciones global
function integrateWithNotificationSystem() {
    console.log('🔗 [MEDICAL-DASHBOARD] Integrando con sistema de notificaciones...');

    // Función para enviar notificación médica bidireccional
    window.sendMedicalNotification = function(fromUserId, toUserId, type, title, message, attachments = []) {
        const medicalNotification = {
            id: `MEDICAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            priority: 'high',
            title: title,
            message: message,
            fromUserId: fromUserId,
            toUserId: toUserId,
            status: 'pending',
            createdAt: new Date(),
            attachments: attachments,
            medicalCategory: true,
            bidirectional: true
        };

        // Integrar con módulo de notificaciones si está disponible
        if (typeof addNotificationToQueue === 'function') {
            addNotificationToQueue(medicalNotification);
            console.log('📨 [MEDICAL-DASHBOARD] Notificación médica enviada:', medicalNotification);
        } else {
            console.log('⚠️ [MEDICAL-DASHBOARD] Sistema de notificaciones no disponible');
        }

        return medicalNotification;
    };

    // Función para procesar alertas críticas del sistema biométrico
    window.processMedicalAlert = function(employeeId, alertType, riskLevel, details) {
        console.log(`🚨 [MEDICAL-DASHBOARD] Procesando alerta médica crítica: ${alertType} - Riesgo: ${riskLevel}%`);

        const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };

        // Crear notificación de alerta médica
        const medicalAlert = {
            id: `MEDICAL-ALERT-${Date.now()}`,
            type: 'medical_emergency',
            priority: 'critical',
            title: `🚨 Alerta Médica Crítica - ${alertType}`,
            message: `Se ha detectado una alerta médica de ${alertType} en el empleado ${employee.name}. Nivel de riesgo: ${riskLevel}%. ${details}`,
            fromUserId: 'biometric-system',
            toUserId: 'medical-team',
            status: 'pending',
            createdAt: new Date(),
            employeeId: employeeId,
            alertType: alertType,
            riskLevel: riskLevel,
            details: details,
            requiresImmediateAction: riskLevel > 80
        };

        // Enviar a sistema de notificaciones
        if (typeof addNotificationToQueue === 'function') {
            addNotificationToQueue(medicalAlert);
        }

        // Crear entrada en documentos médicos
        if (!mockMedicalDocuments[employeeId]) {
            mockMedicalDocuments[employeeId] = { certificates: [], studies: [], photos: [], prescriptions: [] };
        }

        const alertDocument = {
            id: `ALERT-DOC-${Date.now()}`,
            title: `Alerta Biométrica - ${alertType}`,
            type: 'alerta_biometrica',
            direction: 'system_to_medico',
            from: 'Sistema Biométrico IA',
            to: 'Equipo Médico',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            status: 'critico',
            content: `Alerta automática: ${alertType}. Nivel de riesgo: ${riskLevel}%. ${details}`,
            attachments: []
        };

        mockMedicalDocuments[employeeId].certificates.push(alertDocument);

        console.log('✅ [MEDICAL-DASHBOARD] Alerta médica procesada y documentada');
    };

    // Función para sincronizar con evaluaciones psicológicas
    window.syncWithPsychologicalAssessment = function(employeeId, assessmentData) {
        console.log(`🧠 [MEDICAL-DASHBOARD] Sincronizando con evaluación psicológica: empleado ${employeeId}`);

        const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };

        // Crear documento médico basado en evaluación psicológica
        if (!mockMedicalDocuments[employeeId]) {
            mockMedicalDocuments[employeeId] = { certificates: [], studies: [], photos: [], prescriptions: [] };
        }

        const psychDocument = {
            id: `PSYCH-DOC-${Date.now()}`,
            title: `Evaluación Psicológica - ${assessmentData.type}`,
            type: 'evaluacion_psicologica',
            direction: 'psych_to_medico',
            from: assessmentData.psychologist || 'Equipo Psicológico',
            to: 'Medicina Laboral',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            status: assessmentData.riskLevel === 'critical' ? 'critico' : 'normal',
            content: `Evaluación psicológica tipo ${assessmentData.type}. Score: ${assessmentData.score}/100. Nivel de riesgo: ${assessmentData.riskLevel}.`,
            attachments: []
        };

        mockMedicalDocuments[employeeId].studies.push(psychDocument);

        // Enviar notificación si hay riesgo alto
        if (assessmentData.riskLevel === 'high' || assessmentData.riskLevel === 'critical') {
            const psychNotification = {
                id: `PSYCH-NOTIF-${Date.now()}`,
                type: 'psychological_alert',
                priority: assessmentData.riskLevel === 'critical' ? 'critical' : 'high',
                title: `🧠 Alerta Psicológica - ${employee.name}`,
                message: `Evaluación psicológica muestra riesgo ${assessmentData.riskLevel}. Score: ${assessmentData.score}/100. Requiere seguimiento médico.`,
                fromUserId: 'psych-team',
                toUserId: 'medical-team',
                status: 'pending',
                createdAt: new Date(),
                employeeId: employeeId,
                assessmentData: assessmentData
            };

            if (typeof addNotificationToQueue === 'function') {
                addNotificationToQueue(psychNotification);
            }
        }

        console.log('✅ [MEDICAL-DASHBOARD] Sincronización con evaluación psicológica completada');
    };

    // Función para integrar con sistema de sanciones médicas
    window.processeMedicalSanction = function(employeeId, sanctionType, medicalReason) {
        console.log(`⚖️ [MEDICAL-DASHBOARD] Procesando sanción médica: ${sanctionType} para empleado ${employeeId}`);

        const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };

        // Crear documento de sanción médica
        if (!mockMedicalDocuments[employeeId]) {
            mockMedicalDocuments[employeeId] = { certificates: [], studies: [], photos: [], prescriptions: [] };
        }

        const sanctionDocument = {
            id: `MED-SANCTION-${Date.now()}`,
            title: `Sanción Médica - ${sanctionType}`,
            type: 'sancion_medica',
            direction: 'medico_to_empleado',
            from: 'Medicina Laboral',
            to: employee.name,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            status: 'activa',
            content: `Sanción médica aplicada: ${sanctionType}. Motivo médico: ${medicalReason}`,
            attachments: []
        };

        mockMedicalDocuments[employeeId].certificates.push(sanctionDocument);

        // Notificar sanción médica
        const sanctionNotification = {
            id: `MED-SANCTION-NOTIF-${Date.now()}`,
            type: 'medical_sanction',
            priority: 'high',
            title: `⚖️ Sanción Médica Aplicada`,
            message: `Se ha aplicado una sanción médica de tipo "${sanctionType}" por motivos de salud laboral: ${medicalReason}`,
            fromUserId: 'medical-team',
            toUserId: employeeId,
            status: 'pending',
            createdAt: new Date(),
            sanctionType: sanctionType,
            medicalReason: medicalReason
        };

        if (typeof addNotificationToQueue === 'function') {
            addNotificationToQueue(sanctionNotification);
        }

        console.log('✅ [MEDICAL-DASHBOARD] Sanción médica procesada y notificada');
    };

    console.log('✅ [MEDICAL-DASHBOARD] Integración con notificaciones bidireccionales completada');
}

// Función para cargar notificaciones médicas pendientes
function loadMedicalNotifications() {
    console.log('📨 [MEDICAL-DASHBOARD] Cargando notificaciones médicas...');

    // Simular notificaciones médicas pendientes
    const mockMedicalNotifications = [
        {
            id: 'MED-NOTIF-001',
            type: 'medical_request',
            priority: 'medium',
            title: '📋 Solicitud de Certificado Médico',
            message: 'Juan Pérez solicita certificado de aptitud para trabajo en altura',
            fromUserId: 1,
            toUserId: 'medical-team',
            status: 'pending',
            createdAt: new Date('2025-09-20T14:30:00'),
            employeeId: 1
        },
        {
            id: 'MED-NOTIF-002',
            type: 'medical_emergency',
            priority: 'critical',
            title: '🚨 Alerta Médica Crítica',
            message: 'Detección de estrés severo en Carlos Rodriguez - Requiere evaluación inmediata',
            fromUserId: 'biometric-system',
            toUserId: 'medical-team',
            status: 'pending',
            createdAt: new Date('2025-09-21T09:15:00'),
            employeeId: 3
        }
    ];

    // Mostrar notificaciones en el dashboard
    const notifContainer = document.getElementById('medical-notifications');
    if (notifContainer) {
        notifContainer.innerHTML = mockMedicalNotifications.map(notif => `
            <div class="medical-notification ${notif.priority}" style="border-left: 4px solid ${notif.priority === 'critical' ? '#e74c3c' : '#f39c12'}; padding: 15px; margin-bottom: 10px; background: white; border-radius: 6px;">
                <h5 style="margin: 0 0 8px 0; color: ${notif.priority === 'critical' ? '#e74c3c' : '#f39c12'};">${notif.title}</h5>
                <p style="margin: 0 0 8px 0; color: #666;">${notif.message}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <small style="color: #999;">${notif.createdAt.toLocaleString('es-ES')}</small>
                    <button onclick="processMedicalNotification('${notif.id}')"
                            style="background: ${notif.priority === 'critical' ? '#e74c3c' : '#28a745'}; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                        ${notif.priority === 'critical' ? '🚨 Atender' : '✅ Procesar'}
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Función para procesar notificación médica
function processMedicalNotification(notificationId) {
    console.log('⚡ [MEDICAL-DASHBOARD] Procesando notificación médica:', notificationId);

    showMedicalMessage('✅ Notificación médica procesada correctamente', 'success');

    // Refrescar notificaciones
    setTimeout(() => {
        loadMedicalNotifications();
    }, 1000);
}

// Inicializar integraciones al cargar el módulo
integrateWithNotificationSystem();

console.log('✅ [MEDICAL-DASHBOARD] Módulo medical-dashboard configurado con notificaciones bidireccionales 100%');

// ==================== MEDICAL CONFIGURATION INTEGRATION ====================
// Integración completa de medical-config dentro de medical-dashboard

// Global medical configuration data
let medicalConfiguration = {
    center: { name: '', address: '', phone: '' },
    doctors: [
        { id: 1, name: 'Dr. Juan Pérez', specialty: 'Medicina General', license: 'MP12345' },
        { id: 2, name: 'Dra. María García', specialty: 'Cardiología', license: 'MP67890' }
    ],
    certificateTypes: [
        { id: 1, name: 'Certificado de Aptitud Física', duration: '365 días' },
        { id: 2, name: 'Certificado de Reposo', duration: '30 días' },
        { id: 3, name: 'Certificado de Tratamiento', duration: '90 días' }
    ],
    api: { endpoint: '', key: '' }
};

// Open Medical Configuration Modal
function openMedicalConfigModal() {
    console.log('⚙️ [MEDICAL-CONFIG] Abriendo modal de configuración médica');

    const modal = document.createElement('div');
    modal.id = 'medicalConfigModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; justify-content: center;
        align-items: center; z-index: 10000; overflow-y: auto; padding: 20px;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; width: 90%; max-width: 1000px;
                    max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">

            <div style="background: linear-gradient(135deg, #00BCD4 0%, #00ACC1 100%);
                        color: white; padding: 20px; border-radius: 16px 16px 0 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="margin: 0; color: white;">⚙️ Configuración Médica</h2>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Centro médico, doctores y certificados</p>
                    </div>
                    <button onclick="closeMedicalConfigModal()" style="background: rgba(255,255,255,0.2);
                            border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 8px;
                            padding: 8px 12px; cursor: pointer; font-size: 18px;">✕</button>
                </div>
            </div>

            <div style="padding: 30px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">

                    <!-- Centro Médico -->
                    <div style="background: #F8FAFF; padding: 20px; border-radius: 12px; border: 2px solid #E0E7FF;">
                        <h3 style="margin: 0 0 15px 0; color: #00BCD4;">🏥 Centro Médico</h3>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px;">Nombre:</label>
                            <input type="text" id="centerName" placeholder="Hospital Central"
                                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px;">Dirección:</label>
                            <input type="text" id="centerAddress" placeholder="Av. Principal 123"
                                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px;">Teléfono:</label>
                            <input type="tel" id="centerPhone" placeholder="+54 11 1234-5678"
                                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        </div>
                    </div>

                    <!-- Doctores -->
                    <div style="background: #F8FAFF; padding: 20px; border-radius: 12px; border: 2px solid #E0E7FF;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h3 style="margin: 0; color: #00BCD4;">👨‍⚕️ Doctores</h3>
                            <button onclick="addDoctorModal()" style="background: #00BCD4; color: white;
                                    border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">➕ Agregar</button>
                        </div>
                        <div id="doctorsList" style="max-height: 200px; overflow-y: auto;">
                            <!-- Doctors will be loaded here -->
                        </div>
                    </div>

                    <!-- Tipos de Certificados -->
                    <div style="background: #F8FAFF; padding: 20px; border-radius: 12px; border: 2px solid #E0E7FF;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h3 style="margin: 0; color: #00BCD4;">📋 Tipos de Certificados</h3>
                            <button onclick="addCertificateTypeModal()" style="background: #00BCD4; color: white;
                                    border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">➕ Agregar</button>
                        </div>
                        <div id="certificateTypesList" style="max-height: 200px; overflow-y: auto;">
                            <!-- Certificate types will be loaded here -->
                        </div>
                    </div>

                    <!-- API Configuration -->
                    <div style="background: #F8FAFF; padding: 20px; border-radius: 12px; border: 2px solid #E0E7FF;">
                        <h3 style="margin: 0 0 15px 0; color: #00BCD4;">🔗 Configuración API</h3>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px;">Endpoint:</label>
                            <input type="text" id="apiEndpoint" placeholder="https://api.medical.com"
                                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px;">API Key:</label>
                            <input type="password" id="apiKey" placeholder="••••••••••••••••"
                                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        </div>
                    </div>

                </div>

                <!-- Botones de acción -->
                <div style="margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                    <button onclick="saveMedicalConfig()" style="background: #28a745; color: white;
                            border: none; padding: 12px 24px; border-radius: 8px; margin: 0 10px;
                            font-weight: 600; cursor: pointer;">💾 Guardar Configuración</button>
                    <button onclick="exportMedicalConfig()" style="background: #007bff; color: white;
                            border: none; padding: 12px 24px; border-radius: 8px; margin: 0 10px;
                            font-weight: 600; cursor: pointer;">📤 Exportar</button>
                    <button onclick="loadDefaultMedicalConfig()" style="background: #6c757d; color: white;
                            border: none; padding: 12px 24px; border-radius: 8px; margin: 0 10px;
                            font-weight: 600; cursor: pointer;">🔄 Restaurar</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    loadMedicalConfigData();

    // Close modal on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeMedicalConfigModal();
    });
}

// Close Medical Configuration Modal
function closeMedicalConfigModal() {
    const modal = document.getElementById('medicalConfigModal');
    if (modal) modal.remove();
}

// Load Medical Configuration Data
function loadMedicalConfigData() {
    // Load center data
    document.getElementById('centerName').value = medicalConfiguration.center.name;
    document.getElementById('centerAddress').value = medicalConfiguration.center.address;
    document.getElementById('centerPhone').value = medicalConfiguration.center.phone;

    // Load API data
    document.getElementById('apiEndpoint').value = medicalConfiguration.api.endpoint;
    document.getElementById('apiKey').value = medicalConfiguration.api.key;

    // Load doctors and certificates
    loadDoctorsListModal();
    loadCertificateTypesListModal();
}

// Load Doctors List
function loadDoctorsListModal() {
    const container = document.getElementById('doctorsList');
    if (!container) return;

    container.innerHTML = medicalConfiguration.doctors.map(doctor => `
        <div style="background: white; padding: 12px; margin-bottom: 8px; border-radius: 8px;
                    border: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong style="color: #333;">${doctor.name}</strong><br>
                <small style="color: #666;">${doctor.specialty} • MP: ${doctor.license}</small>
            </div>
            <div>
                <button onclick="editDoctorModal(${doctor.id})" style="background: #ffc107; color: #333;
                        border: none; padding: 4px 8px; border-radius: 4px; margin-right: 4px; cursor: pointer;">✏️</button>
                <button onclick="deleteDoctor(${doctor.id})" style="background: #dc3545; color: white;
                        border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">🗑️</button>
            </div>
        </div>
    `).join('') || '<p style="text-align: center; color: #666;">No hay doctores configurados</p>';
}

// Load Certificate Types List
function loadCertificateTypesListModal() {
    const container = document.getElementById('certificateTypesList');
    if (!container) return;

    container.innerHTML = medicalConfiguration.certificateTypes.map(type => `
        <div style="background: white; padding: 12px; margin-bottom: 8px; border-radius: 8px;
                    border: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong style="color: #333;">${type.name}</strong><br>
                <small style="color: #666;">Duración: ${type.duration}</small>
            </div>
            <div>
                <button onclick="editCertificateTypeModal(${type.id})" style="background: #ffc107; color: #333;
                        border: none; padding: 4px 8px; border-radius: 4px; margin-right: 4px; cursor: pointer;">✏️</button>
                <button onclick="deleteCertificateType(${type.id})" style="background: #dc3545; color: white;
                        border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">🗑️</button>
            </div>
        </div>
    `).join('') || '<p style="text-align: center; color: #666;">No hay tipos de certificados configurados</p>';
}

// Save Medical Configuration
async function saveMedicalConfig() {
    console.log('💾 [MEDICAL-CONFIG] Guardando configuración médica...');

    medicalConfiguration.center = {
        name: document.getElementById('centerName').value,
        address: document.getElementById('centerAddress').value,
        phone: document.getElementById('centerPhone').value
    };

    medicalConfiguration.api = {
        endpoint: document.getElementById('apiEndpoint').value,
        key: document.getElementById('apiKey').value
    };

    // Show success message
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #28a745; color: white;
        padding: 15px 20px; border-radius: 8px; z-index: 20000; font-weight: 600;
    `;
    successDiv.textContent = '✅ Configuración médica guardada exitosamente';
    document.body.appendChild(successDiv);

    setTimeout(() => successDiv.remove(), 3000);
}

// Export Medical Configuration
function exportMedicalConfig() {
    const config = JSON.stringify(medicalConfiguration, null, 2);
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'configuracion-medica.json';
    link.style.setProperty('display', 'none', 'important');

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Load Default Medical Configuration
function loadDefaultMedicalConfig() {
    medicalConfiguration = {
        center: { name: '', address: '', phone: '' },
        doctors: [
            { id: 1, name: 'Dr. Juan Pérez', specialty: 'Medicina General', license: 'MP12345' },
            { id: 2, name: 'Dra. María García', specialty: 'Cardiología', license: 'MP67890' }
        ],
        certificateTypes: [
            { id: 1, name: 'Certificado de Aptitud Física', duration: '365 días' },
            { id: 2, name: 'Certificado de Reposo', duration: '30 días' },
            { id: 3, name: 'Certificado de Tratamiento', duration: '90 días' }
        ],
        api: { endpoint: '', key: '' }
    };

    loadMedicalConfigData();
}

// Add Doctor Modal
function addDoctorModal() {
    const doctorModal = document.createElement('div');
    doctorModal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); display: flex; justify-content: center;
        align-items: center; z-index: 15000;
    `;

    doctorModal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; width: 400px;">
            <h3 style="margin: 0 0 20px 0; color: #00BCD4;">➕ Agregar Doctor</h3>
            <div style="margin-bottom: 15px;">
                <label style="display: block; font-weight: 600; margin-bottom: 5px;">Nombre:</label>
                <input type="text" id="newDoctorName" placeholder="Dr. Juan Pérez" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; font-weight: 600; margin-bottom: 5px;">Especialidad:</label>
                <input type="text" id="newDoctorSpecialty" placeholder="Medicina General" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-weight: 600; margin-bottom: 5px;">Matrícula:</label>
                <input type="text" id="newDoctorLicense" placeholder="MP12345" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            </div>
            <div style="text-align: center;">
                <button onclick="saveDoctorModal()" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-right: 10px; cursor: pointer;">💾 Guardar</button>
                <button onclick="this.closest('.modal').remove()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Cancelar</button>
            </div>
        </div>
    `;

    doctorModal.className = 'modal';
    document.body.appendChild(doctorModal);
}

// Save Doctor
function saveDoctorModal() {
    const name = document.getElementById('newDoctorName').value.trim();
    const specialty = document.getElementById('newDoctorSpecialty').value.trim();
    const license = document.getElementById('newDoctorLicense').value.trim();

    if (!name || !specialty || !license) {
        alert('Complete todos los campos');
        return;
    }

    const newId = Math.max(...medicalConfiguration.doctors.map(d => d.id), 0) + 1;
    medicalConfiguration.doctors.push({ id: newId, name, specialty, license });

    loadDoctorsListModal();
    document.querySelector('.modal').remove();
}

// Delete Doctor
function deleteDoctor(id) {
    if (confirm('¿Eliminar este doctor?')) {
        medicalConfiguration.doctors = medicalConfiguration.doctors.filter(d => d.id !== id);
        loadDoctorsListModal();
    }
}

// Add Certificate Type Modal
function addCertificateTypeModal() {
    const certModal = document.createElement('div');
    certModal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); display: flex; justify-content: center;
        align-items: center; z-index: 15000;
    `;

    certModal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; width: 400px;">
            <h3 style="margin: 0 0 20px 0; color: #00BCD4;">➕ Agregar Tipo de Certificado</h3>
            <div style="margin-bottom: 15px;">
                <label style="display: block; font-weight: 600; margin-bottom: 5px;">Nombre:</label>
                <input type="text" id="newCertName" placeholder="Certificado de Aptitud" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-weight: 600; margin-bottom: 5px;">Duración:</label>
                <input type="text" id="newCertDuration" placeholder="365 días" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            </div>
            <div style="text-align: center;">
                <button onclick="saveCertificateTypeModal()" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-right: 10px; cursor: pointer;">💾 Guardar</button>
                <button onclick="this.closest('.modal').remove()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Cancelar</button>
            </div>
        </div>
    `;

    certModal.className = 'modal';
    document.body.appendChild(certModal);
}

// Save Certificate Type
function saveCertificateTypeModal() {
    const name = document.getElementById('newCertName').value.trim();
    const duration = document.getElementById('newCertDuration').value.trim();

    if (!name || !duration) {
        alert('Complete todos los campos');
        return;
    }

    const newId = Math.max(...medicalConfiguration.certificateTypes.map(c => c.id), 0) + 1;
    medicalConfiguration.certificateTypes.push({ id: newId, name, duration });

    loadCertificateTypesListModal();
    document.querySelector('.modal').remove();
}

// Delete Certificate Type
function deleteCertificateType(id) {
    if (confirm('¿Eliminar este tipo de certificado?')) {
        medicalConfiguration.certificateTypes = medicalConfiguration.certificateTypes.filter(c => c.id !== id);
        loadCertificateTypesListModal();
    }
}

console.log('✅ [MEDICAL-CONFIG] Integración completa agregada al dashboard médico');

// Export main functions
window.showMedicalDashboardContent = showMedicalDashboardContent;
window.sendMedicalNotification = window.sendMedicalNotification;
window.processMedicalAlert = window.processMedicalAlert;
window.syncWithPsychologicalAssessment = window.syncWithPsychologicalAssessment;
window.processeMedicalSanction = window.processeMedicalSanction;
window.loadMedicalNotifications = loadMedicalNotifications;

// Compatibility function for generic module loader
window.showModuleContent = function(moduleId) {
    if (moduleId === 'medical-dashboard' || moduleId === 'medical') {
        showMedicalDashboardContent();
    }
};

console.log('✅ [MEDICAL-DASHBOARD] Módulo completamente inicializado con showModuleContent');