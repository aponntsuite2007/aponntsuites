// Job Postings Module - Sistema de Postulaciones Laborales
console.log('💼 [JOB-POSTINGS] Módulo de postulaciones laborales cargado');

// Main function to show job postings content
function showJobPostingsContent() {
    console.log('💼 [JOB-POSTINGS] Ejecutando showJobPostingsContent()');
    
    const content = document.getElementById('mainContent');
    if (!content) {
        console.error('❌ [JOB-POSTINGS] mainContent no encontrado');
        return;
    }
    
    content.style.setProperty('display', 'block', 'important');
    
    content.innerHTML = `
        <div class="tab-content active">
            <div class="card" style="padding: 0; overflow: hidden;">
                <!-- Header del módulo -->
                <div style="background: linear-gradient(135deg, #6f42c1 0%, #5a2d91 100%); color: white; padding: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; font-size: 28px;">💼 Sistema de Postulaciones</h2>
                            <p style="margin: 5px 0 0 0; opacity: 0.9;">Gestión integral de ofertas laborales y candidatos</p>
                        </div>
                        <button onclick="showCreateJobModal()" 
                                style="background: rgba(255,255,255,0.2); border: 2px solid white; color: white; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            ➕ Nueva Oferta
                        </button>
                    </div>
                </div>

                <!-- Tabs de navegación -->
                <div style="background: #f8f9fa; border-bottom: 1px solid #e9ecef;">
                    <div style="display: flex; padding: 0 25px;">
                        <button onclick="switchJobTab('offers')" id="tab-offers" 
                                class="job-tab active-job-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid #6f42c1;">
                            📋 Ofertas Activas
                        </button>
                        <button onclick="switchJobTab('applications')" id="tab-applications" 
                                class="job-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            👥 Postulaciones
                        </button>
                        <button onclick="switchJobTab('candidates')" id="tab-candidates" 
                                class="job-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            🎯 Candidatos
                        </button>
                        <button onclick="switchJobTab('analytics')" id="tab-analytics" 
                                class="job-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            📊 Analytics
                        </button>
                    </div>
                </div>

                <!-- Contenido de las pestañas -->
                <div style="padding: 25px;" id="jobTabContent">
                    ${getJobOffersContent()}
                </div>
            </div>
        </div>

        <!-- Modal para crear oferta laboral -->
        <div id="createJobModal" class="modal" style="display: none !important; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9997;">
            <div class="modal-content" style="position: relative; margin: 2% auto; width: 95%; max-width: 1200px; background: white; border-radius: 12px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #6f42c1 0%, #5a2d91 100%); color: white; padding: 20px 30px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">💼 Crear Nueva Oferta Laboral</h3>
                    <button onclick="closeCreateJobModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    ${getCreateJobForm()}
                </div>
            </div>
        </div>

        <!-- Modal para postularse -->
        <div id="applyJobModal" class="modal" style="display: none !important; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9997;">
            <div class="modal-content" style="position: relative; margin: 2% auto; width: 95%; max-width: 800px; background: white; border-radius: 12px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); color: white; padding: 20px 30px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">🎯 Postularme a Oferta</h3>
                    <button onclick="closeApplyJobModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 30px;" id="applyJobContent">
                    <!-- Content will be populated when opening -->
                </div>
            </div>
        </div>
    `;
    
    console.log('✅ [JOB-POSTINGS] Contenido renderizado exitosamente');
}

// Switch between job tabs
function switchJobTab(tabName) {
    // Update tab styles
    document.querySelectorAll('.job-tab').forEach(tab => {
        tab.style.borderBottom = '3px solid transparent';
        tab.classList.remove('active-job-tab');
    });
    
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) {
        activeTab.style.borderBottom = '3px solid #6f42c1';
        activeTab.classList.add('active-job-tab');
    }
    
    // Update content
    const contentDiv = document.getElementById('jobTabContent');
    if (contentDiv) {
        switch(tabName) {
            case 'offers':
                contentDiv.innerHTML = getJobOffersContent();
                break;
            case 'applications':
                contentDiv.innerHTML = getApplicationsContent();
                break;
            case 'candidates':
                contentDiv.innerHTML = getCandidatesContent();
                break;
            case 'analytics':
                contentDiv.innerHTML = getAnalyticsContent();
                break;
        }
    }
}

// Get job offers content
function getJobOffersContent() {
    return `
        <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <div>
                    <h3 style="margin: 0; color: #333;">Ofertas Laborales Activas</h3>
                    <p style="color: #666; margin: 5px 0 0 0;">Gestiona las ofertas de trabajo publicadas</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <select style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option>Todas las áreas</option>
                        <option>Tecnología</option>
                        <option>Recursos Humanos</option>
                        <option>Ventas</option>
                        <option>Marketing</option>
                        <option>Administración</option>
                    </select>
                    <select style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option>Estado: Todos</option>
                        <option>Activa</option>
                        <option>Pausada</option>
                        <option>Cerrada</option>
                    </select>
                </div>
            </div>

            <!-- Lista de ofertas -->
            <div style="display: grid; gap: 20px;">
                ${generateJobOfferCards()}
            </div>
        </div>
    `;
}

// Generate job offer cards
function generateJobOfferCards() {
    const sampleJobs = [
        {
            id: 1,
            title: 'Desarrollador Full Stack Senior',
            department: 'Tecnología',
            type: 'Tiempo completo',
            location: 'Buenos Aires / Remoto',
            salary: '$180.000 - $220.000',
            posted: '2024-01-15',
            applications: 23,
            status: 'active',
            requirements: ['React', 'Node.js', '+3 años experiencia'],
            description: 'Buscamos desarrollador con experiencia en tecnologías modernas para liderar proyectos innovadores.'
        },
        {
            id: 2,
            title: 'Analista de Recursos Humanos',
            department: 'Recursos Humanos',
            type: 'Tiempo completo',
            location: 'Buenos Aires',
            salary: '$120.000 - $140.000',
            posted: '2024-01-12',
            applications: 15,
            status: 'active',
            requirements: ['Psicología/RR.HH.', 'Excel avanzado', '+2 años experiencia'],
            description: 'Únete a nuestro equipo de RRHH para gestionar procesos de selección y desarrollo organizacional.'
        },
        {
            id: 3,
            title: 'Especialista en Marketing Digital',
            department: 'Marketing',
            type: 'Medio tiempo',
            location: 'Remoto',
            salary: '$80.000 - $100.000',
            posted: '2024-01-10',
            applications: 31,
            status: 'active',
            requirements: ['Google Ads', 'Facebook Ads', 'Analytics'],
            description: 'Oportunidad para especialista en marketing digital con enfoque en performance y ROI.'
        }
    ];

    return sampleJobs.map(job => `
        <div style="border: 1px solid #e9ecef; border-radius: 12px; padding: 20px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: between; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                        <h4 style="margin: 0; color: #333; font-size: 20px;">${job.title}</h4>
                        <span style="background: ${job.status === 'active' ? '#28a745' : '#6c757d'}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px;">
                            ${job.status === 'active' ? 'Activa' : 'Pausada'}
                        </span>
                    </div>
                    <div style="color: #666; font-size: 14px; margin-bottom: 10px;">
                        📍 ${job.location} • 💼 ${job.type} • 🏢 ${job.department}
                    </div>
                    <div style="color: #28a745; font-weight: 600; margin-bottom: 10px;">
                        💰 ${job.salary}
                    </div>
                    <div style="margin-bottom: 15px;">
                        <p style="margin: 0; color: #555; line-height: 1.5;">${job.description}</p>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <strong style="color: #333;">Requisitos:</strong>
                        <div style="display: flex; gap: 8px; margin-top: 5px; flex-wrap: wrap;">
                            ${job.requirements.map(req => `
                                <span style="background: #f8f9fa; color: #495057; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                    ${req}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px; margin-left: 20px;">
                    <div style="text-align: right;">
                        <div style="color: #666; font-size: 12px;">Postulaciones</div>
                        <div style="font-size: 24px; font-weight: bold; color: #6f42c1;">${job.applications}</div>
                    </div>
                    <div style="color: #666; font-size: 12px;">
                        Publicada: ${job.posted}
                    </div>
                </div>
            </div>
            
            <div style="border-top: 1px solid #e9ecef; padding-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 10px;">
                    <button onclick="viewJobApplications(${job.id})" 
                            style="background: #007bff; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        👥 Ver Postulaciones (${job.applications})
                    </button>
                    <button onclick="editJobOffer(${job.id})" 
                            style="background: #ffc107; color: #212529; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        ✏️ Editar
                    </button>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="toggleJobStatus(${job.id})" 
                            style="background: #6c757d; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        ${job.status === 'active' ? '⏸️ Pausar' : '▶️ Activar'}
                    </button>
                    <button onclick="simulateJobApplication(${job.id})" 
                            style="background: #28a745; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        🎯 Simular Postulación
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Get applications content
function getApplicationsContent() {
    return `
        <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <div>
                    <h3 style="margin: 0; color: #333;">Postulaciones Recibidas</h3>
                    <p style="color: #666; margin: 5px 0 0 0;">Gestiona las postulaciones de candidatos</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <select style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option>Todas las ofertas</option>
                        <option>Desarrollador Full Stack Senior</option>
                        <option>Analista de Recursos Humanos</option>
                        <option>Especialista en Marketing Digital</option>
                    </select>
                    <select style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option>Estado: Todos</option>
                        <option>Nuevo</option>
                        <option>En revisión</option>
                        <option>Entrevista</option>
                        <option>Contratado</option>
                        <option>Rechazado</option>
                    </select>
                </div>
            </div>

            <!-- Lista de postulaciones -->
            <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px;">
                <div style="display: grid; grid-template-columns: 200px 1fr 120px 120px 100px 120px; gap: 20px; padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057;">
                    <div>Candidato</div>
                    <div>Oferta</div>
                    <div>Fecha</div>
                    <div>Score</div>
                    <div>Estado</div>
                    <div>Acciones</div>
                </div>
                ${generateApplicationRows()}
            </div>
        </div>
    `;
}

// Generate application rows
function generateApplicationRows() {
    const applications = [
        {
            id: 1,
            candidate: 'María González',
            email: 'maria.gonzalez@email.com',
            job: 'Desarrollador Full Stack Senior',
            date: '2024-01-16',
            score: 95,
            status: 'nuevo',
            cv: 'cv_maria_gonzalez.pdf'
        },
        {
            id: 2,
            candidate: 'Carlos Ruiz',
            email: 'carlos.ruiz@email.com',
            job: 'Desarrollador Full Stack Senior',
            date: '2024-01-15',
            score: 87,
            status: 'revision',
            cv: 'cv_carlos_ruiz.pdf'
        },
        {
            id: 3,
            candidate: 'Ana Martínez',
            email: 'ana.martinez@email.com',
            job: 'Analista de Recursos Humanos',
            date: '2024-01-14',
            score: 92,
            status: 'entrevista',
            cv: 'cv_ana_martinez.pdf'
        }
    ];

    return applications.map(app => `
        <div style="display: grid; grid-template-columns: 200px 1fr 120px 120px 100px 120px; gap: 20px; padding: 15px 20px; border-bottom: 1px solid #e9ecef; align-items: center;">
            <div>
                <div style="font-weight: 600; color: #333;">${app.candidate}</div>
                <div style="font-size: 12px; color: #666;">${app.email}</div>
            </div>
            <div style="color: #555;">${app.job}</div>
            <div style="color: #666; font-size: 14px;">${app.date}</div>
            <div>
                <div style="background: ${app.score >= 90 ? '#28a745' : app.score >= 70 ? '#ffc107' : '#dc3545'}; color: white; padding: 4px 8px; border-radius: 20px; text-align: center; font-size: 12px; font-weight: 600;">
                    ${app.score}%
                </div>
            </div>
            <div>
                <span style="background: ${getStatusColor(app.status)}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px;">
                    ${getStatusText(app.status)}
                </span>
            </div>
            <div style="display: flex; gap: 5px;">
                <button onclick="viewCandidate(${app.id})" title="Ver detalles" 
                        style="background: #007bff; color: white; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                    👁️
                </button>
                <button onclick="downloadCV('${app.cv}', ${app.id})" title="Descargar CV" 
                        style="background: #28a745; color: white; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                    📄
                </button>
                <button onclick="updateApplicationStatus(${app.id}, 'revision')" title="Marcar en revisión" 
                        style="background: #ffc107; color: #212529; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                    📋
                </button>
                <button onclick="updateApplicationStatus(${app.id}, 'entrevista')" title="Citar a entrevista" 
                        style="background: #fd7e14; color: white; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                    🗣️
                </button>
            </div>
        </div>
    `).join('');
}

// Get status color
function getStatusColor(status) {
    const colors = {
        'nuevo': '#17a2b8',
        'revision': '#ffc107', 
        'entrevista': '#fd7e14',
        'contratado': '#28a745',
        'rechazado': '#dc3545'
    };
    return colors[status] || '#6c757d';
}

// Get status text
function getStatusText(status) {
    const texts = {
        'nuevo': 'Nuevo',
        'revision': 'Revisión',
        'entrevista': 'Entrevista', 
        'contratado': 'Contratado',
        'rechazado': 'Rechazado'
    };
    return texts[status] || 'Desconocido';
}

// Get candidates content
function getCandidatesContent() {
    return `
        <div>
            <h3 style="color: #333; margin-bottom: 20px;">🎯 Base de Candidatos</h3>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                <div style="font-size: 3em; margin-bottom: 10px;">👥</div>
                <h4>Base de Candidatos</h4>
                <p style="color: #666;">Gestiona tu base de datos de candidatos registrados</p>
                <button onclick="alert('Funcionalidad en desarrollo')" 
                        style="background: #6f42c1; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                    Ver Candidatos Registrados
                </button>
            </div>
        </div>
    `;
}

// Get analytics content  
function getAnalyticsContent() {
    return `
        <div>
            <h3 style="color: #333; margin-bottom: 20px;">📊 Analytics y Reportes</h3>
            
            <!-- Métricas principales -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center;">
                    <div style="font-size: 32px; color: #6f42c1; font-weight: bold;">47</div>
                    <div style="color: #666; font-size: 14px;">Ofertas Publicadas</div>
                </div>
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center;">
                    <div style="font-size: 32px; color: #28a745; font-weight: bold;">189</div>
                    <div style="color: #666; font-size: 14px;">Postulaciones Recibidas</div>
                </div>
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center;">
                    <div style="font-size: 32px; color: #007bff; font-weight: bold;">23</div>
                    <div style="color: #666; font-size: 14px;">Contrataciones</div>
                </div>
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center;">
                    <div style="font-size: 32px; color: #ffc107; font-weight: bold;">4.2</div>
                    <div style="color: #666; font-size: 14px;">Calificación Promedio</div>
                </div>
            </div>

            <!-- Gráficos placeholder -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h4 style="margin-top: 0;">📈 Postulaciones por Mes</h4>
                    <div style="height: 200px; background: #f8f9fa; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #666;">
                        Gráfico de tendencias
                    </div>
                </div>
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h4 style="margin-top: 0;">🎯 Áreas Más Demandadas</h4>
                    <div style="height: 200px; background: #f8f9fa; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #666;">
                        Gráfico circular
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Get create job form
function getCreateJobForm() {
    return `
        <form id="createJobForm" onsubmit="createJobOffer(event)">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <!-- Información básica -->
                <div>
                    <h4 style="color: #333; margin-bottom: 15px;">📋 Información Básica</h4>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Título del Puesto *</label>
                        <input type="text" id="jobTitle" required 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                               placeholder="Ej: Desarrollador Full Stack Senior">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Departamento *</label>
                        <select id="jobDepartment" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">Seleccionar departamento</option>
                            <option value="tecnologia">Tecnología</option>
                            <option value="rrhh">Recursos Humanos</option>
                            <option value="ventas">Ventas</option>
                            <option value="marketing">Marketing</option>
                            <option value="administracion">Administración</option>
                            <option value="operaciones">Operaciones</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo de Empleo *</label>
                        <select id="jobType" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">Seleccionar tipo</option>
                            <option value="tiempo-completo">Tiempo Completo</option>
                            <option value="medio-tiempo">Medio Tiempo</option>
                            <option value="contrato">Por Contrato</option>
                            <option value="freelance">Freelance</option>
                            <option value="practicas">Prácticas</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Ubicación *</label>
                        <input type="text" id="jobLocation" required 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                               placeholder="Ej: Buenos Aires / Remoto">
                    </div>
                </div>

                <!-- Compensación y requisitos -->
                <div>
                    <h4 style="color: #333; margin-bottom: 15px;">💰 Compensación y Requisitos</h4>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 600;">Salario Mínimo</label>
                            <input type="number" id="salaryMin" 
                                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                                   placeholder="120000">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 600;">Salario Máximo</label>
                            <input type="number" id="salaryMax" 
                                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                                   placeholder="180000">
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Experiencia Requerida *</label>
                        <select id="experienceLevel" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">Seleccionar nivel</option>
                            <option value="sin-experiencia">Sin experiencia</option>
                            <option value="junior">Junior (1-2 años)</option>
                            <option value="semi-senior">Semi Senior (2-4 años)</option>
                            <option value="senior">Senior (4-7 años)</option>
                            <option value="lead">Lead (+7 años)</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Educación Mínima</label>
                        <select id="educationLevel" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">No especificado</option>
                            <option value="secundaria">Secundaria Completa</option>
                            <option value="terciario">Terciario</option>
                            <option value="universitario">Universitario</option>
                            <option value="posgrado">Posgrado</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Fecha de Cierre</label>
                        <input type="date" id="closingDate" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    </div>
                </div>
            </div>

            <!-- Descripción -->
            <div style="margin-bottom: 20px;">
                <h4 style="color: #333; margin-bottom: 15px;">📝 Descripción del Puesto</h4>
                <textarea id="jobDescription" required 
                          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; min-height: 120px;"
                          placeholder="Describe las responsabilidades, objetivos y características del puesto..."></textarea>
            </div>

            <!-- Requisitos -->
            <div style="margin-bottom: 20px;">
                <h4 style="color: #333; margin-bottom: 15px;">✅ Requisitos y Habilidades</h4>
                <textarea id="jobRequirements" required 
                          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; min-height: 100px;"
                          placeholder="Lista los requisitos técnicos y habilidades necesarias (uno por línea)..."></textarea>
            </div>

            <!-- Formulario dinámico -->
            <div style="margin-bottom: 20px;">
                <h4 style="color: #333; margin-bottom: 15px;">📋 Formulario de Postulación Personalizado</h4>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                    <p style="color: #666; margin: 0;">Define campos adicionales que los candidatos deberán completar al postularse</p>
                </div>
                
                <div id="customFields">
                    <!-- Los campos personalizados se agregarán aquí -->
                </div>
                
                <button type="button" onclick="addCustomField()" 
                        style="background: #17a2b8; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; margin-top: 10px;">
                    ➕ Agregar Campo Personalizado
                </button>
            </div>

            <!-- Botones -->
            <div style="display: flex; gap: 15px; justify-content: flex-end; border-top: 1px solid #e9ecef; padding-top: 20px;">
                <button type="button" onclick="closeCreateJobModal()" 
                        style="background: #6c757d; color: white; border: none; padding: 12px 25px; border-radius: 6px; cursor: pointer;">
                    Cancelar
                </button>
                <button type="submit" 
                        style="background: #6f42c1; color: white; border: none; padding: 12px 25px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    🚀 Publicar Oferta
                </button>
            </div>
        </form>
    `;
}

// Modal functions
function showCreateJobModal() {
    document.getElementById('createJobModal').style.setProperty('display', 'block', 'important');
}

function closeCreateJobModal() {
    document.getElementById('createJobModal').style.setProperty('display', 'none', 'important');
}

function showApplyJobModal(jobId) {
    const modal = document.getElementById('applyJobModal');
    const content = document.getElementById('applyJobContent');
    
    content.innerHTML = getApplicationForm(jobId);
    modal.style.setProperty('display', 'block', 'important');
}

function closeApplyJobModal() {
    document.getElementById('applyJobModal').style.setProperty('display', 'none', 'important');
}

// Get application form for candidates
function getApplicationForm(jobId) {
    return `
        <form id="applyJobForm" onsubmit="submitApplication(event, ${jobId})">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 3em; margin-bottom: 10px;">🎯</div>
                <h4>Postulación para: Desarrollador Full Stack Senior</h4>
                <p style="color: #666;">Complete el formulario para enviar su postulación</p>
            </div>

            <!-- Datos personales -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Nombre Completo *</label>
                    <input type="text" name="candidateName" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Email *</label>
                    <input type="email" name="candidateEmail" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Teléfono *</label>
                    <input type="tel" name="candidatePhone" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Ubicación *</label>
                    <input type="text" name="candidateLocation" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;" placeholder="Ciudad, País">
                </div>
            </div>

            <!-- CV Upload -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Curriculum Vitae (PDF) *</label>
                <div style="border: 2px dashed #ddd; padding: 20px; text-align: center; border-radius: 6px; cursor: pointer;" onclick="document.getElementById('cvFile').click()">
                    <input type="file" id="cvFile" accept=".pdf,.doc,.docx" required style="display: none;">
                    <div style="font-size: 2em; margin-bottom: 10px;">📄</div>
                    <div>Click para subir tu CV (PDF, DOC, DOCX)</div>
                    <div style="font-size: 12px; color: #666; margin-top: 5px;">Tamaño máximo: 5MB</div>
                </div>
            </div>

            <!-- Experiencia -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Años de Experiencia en Desarrollo *</label>
                <select name="experienceYears" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    <option value="">Seleccionar experiencia</option>
                    <option value="0-1">Menos de 1 año</option>
                    <option value="1-2">1-2 años</option>
                    <option value="2-4">2-4 años</option>
                    <option value="4-7">4-7 años</option>
                    <option value="7+">Más de 7 años</option>
                </select>
            </div>

            <!-- Tecnologías -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tecnologías que Dominas *</label>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <label style="display: flex; align-items: center;">
                        <input type="checkbox" value="react" style="margin-right: 8px;"> React
                    </label>
                    <label style="display: flex; align-items: center;">
                        <input type="checkbox" value="nodejs" style="margin-right: 8px;"> Node.js
                    </label>
                    <label style="display: flex; align-items: center;">
                        <input type="checkbox" value="javascript" style="margin-right: 8px;"> JavaScript
                    </label>
                    <label style="display: flex; align-items: center;">
                        <input type="checkbox" value="typescript" style="margin-right: 8px;"> TypeScript
                    </label>
                    <label style="display: flex; align-items: center;">
                        <input type="checkbox" value="postgresql" style="margin-right: 8px;"> PostgreSQL
                    </label>
                    <label style="display: flex; align-items: center;">
                        <input type="checkbox" value="mongodb" style="margin-right: 8px;"> MongoDB
                    </label>
                </div>
            </div>

            <!-- Disponibilidad -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Disponibilidad *</label>
                <select name="availability" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    <option value="">Seleccionar disponibilidad</option>
                    <option value="inmediata">Inmediata</option>
                    <option value="2-semanas">2 semanas</option>
                    <option value="1-mes">1 mes</option>
                    <option value="2-meses">2 meses</option>
                    <option value="a-convenir">A convenir</option>
                </select>
            </div>

            <!-- Pretensión salarial -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Pretensión Salarial (ARS)</label>
                <input type="number" name="salaryExpectation" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;" placeholder="150000">
            </div>

            <!-- Carta de presentación -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Carta de Presentación</label>
                <textarea name="coverLetter" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; min-height: 120px;" 
                          placeholder="Cuéntanos por qué eres el candidato ideal para este puesto..."></textarea>
            </div>

            <!-- Botones -->
            <div style="display: flex; gap: 15px; justify-content: flex-end; border-top: 1px solid #e9ecef; padding-top: 20px;">
                <button type="button" onclick="closeApplyJobModal()" 
                        style="background: #6c757d; color: white; border: none; padding: 12px 25px; border-radius: 6px; cursor: pointer;">
                    Cancelar
                </button>
                <button type="submit" 
                        style="background: #28a745; color: white; border: none; padding: 12px 25px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    🚀 Enviar Postulación
                </button>
            </div>
        </form>
    `;
}

// Form functions
let customFieldCounter = 0;

function addCustomField() {
    customFieldCounter++;
    const fieldsContainer = document.getElementById('customFields');
    
    const fieldDiv = document.createElement('div');
    fieldDiv.id = `customField${customFieldCounter}`;
    fieldDiv.style.cssText = 'border: 1px solid #e9ecef; padding: 15px; border-radius: 6px; margin-bottom: 10px; background: white;';
    
    fieldDiv.innerHTML = `
        <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
            <h5 style="margin: 0; color: #333;">Campo Personalizado #${customFieldCounter}</h5>
            <button type="button" onclick="removeCustomField(${customFieldCounter})" 
                    style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                ✕ Eliminar
            </button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            <div>
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Etiqueta del Campo</label>
                <input type="text" placeholder="Ej: Nivel de inglés" 
                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div>
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo de Campo</label>
                <select style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="text">Texto</option>
                    <option value="textarea">Área de Texto</option>
                    <option value="select">Lista Desplegable</option>
                    <option value="radio">Opción Múltiple</option>
                    <option value="checkbox">Casilla de Verificación</option>
                    <option value="number">Número</option>
                    <option value="date">Fecha</option>
                </select>
            </div>
            <div>
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Obligatorio</label>
                <select style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="no">No</option>
                    <option value="yes">Sí</option>
                </select>
            </div>
        </div>
        
        <div style="margin-top: 10px;">
            <label style="display: block; margin-bottom: 5px; font-weight: 600;">Opciones (para listas/radio - separadas por coma)</label>
            <input type="text" placeholder="Básico, Intermedio, Avanzado, Nativo" 
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
    `;
    
    fieldsContainer.appendChild(fieldDiv);
}

function removeCustomField(fieldId) {
    const field = document.getElementById(`customField${fieldId}`);
    if (field) {
        field.remove();
    }
}

// Action functions
function createJobOffer(event) {
    event.preventDefault();
    
    // Get form data
    const formData = new FormData(event.target);
    const currentCompany = getCurrentCompany();
    
    const jobData = {
        company_id: currentCompany.id,
        title: formData.get('jobTitle') || document.getElementById('jobTitle').value,
        department: formData.get('jobDepartment') || document.getElementById('jobDepartment').value,
        type: formData.get('jobType') || document.getElementById('jobType').value,
        location: formData.get('jobLocation') || document.getElementById('jobLocation').value,
        salary_min: formData.get('salaryMin') || document.getElementById('salaryMin').value,
        salary_max: formData.get('salaryMax') || document.getElementById('salaryMax').value,
        experience_level: formData.get('experienceLevel') || document.getElementById('experienceLevel').value,
        education_level: formData.get('educationLevel') || document.getElementById('educationLevel').value,
        closing_date: formData.get('closingDate') || document.getElementById('closingDate').value,
        description: formData.get('jobDescription') || document.getElementById('jobDescription').value,
        requirements: formData.get('jobRequirements') || document.getElementById('jobRequirements').value,
        status: 'active',
        created_date: new Date().toISOString().split('T')[0]
    };
    
    console.log('💼 [JOB-POSTINGS] Creando oferta para empresa:', currentCompany.name);
    console.log('💼 [JOB-POSTINGS] Datos de la oferta:', jobData);
    
    // API call to save job offer
    fetch('/api/job-postings/offers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
            'Company-ID': currentCompany.id
        },
        body: JSON.stringify(jobData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ [JOB-POSTINGS] Oferta creada:', data);
        alert('✅ Oferta laboral creada exitosamente!\n\nLa oferta ha sido publicada y estará visible para los candidatos.');
        closeCreateJobModal();
        switchJobTab('offers');
    })
    .catch(error => {
        console.error('❌ [JOB-POSTINGS] Error creando oferta:', error);
        alert('⚠️ Error al crear la oferta. Inténtelo nuevamente.');
    });
}

function submitApplication(event, jobId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const currentCompany = getCurrentCompany();
    
    const applicationData = {
        job_id: jobId,
        company_id: currentCompany.id,
        candidate_name: formData.get('candidateName') || event.target.querySelector('input[type="text"]').value,
        candidate_email: formData.get('candidateEmail') || event.target.querySelector('input[type="email"]').value,
        candidate_phone: formData.get('candidatePhone') || event.target.querySelector('input[type="tel"]').value,
        candidate_location: formData.get('candidateLocation') || event.target.querySelectorAll('input[type="text"]')[1].value,
        experience_years: formData.get('experienceYears') || event.target.querySelector('select').value,
        technologies: Array.from(event.target.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value),
        availability: formData.get('availability'),
        salary_expectation: formData.get('salaryExpectation'),
        cover_letter: formData.get('coverLetter') || event.target.querySelector('textarea').value,
        application_date: new Date().toISOString().split('T')[0],
        status: 'nuevo'
    };
    
    console.log('🎯 [JOB-POSTINGS] Enviando postulación para empresa:', currentCompany.name);
    console.log('🎯 [JOB-POSTINGS] Datos de postulación:', applicationData);
    
    // API call to save application
    fetch('/api/job-postings/applications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
            'Company-ID': currentCompany.id
        },
        body: JSON.stringify(applicationData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ [JOB-POSTINGS] Postulación enviada:', data);
        alert('✅ ¡Postulación enviada exitosamente!\n\nHemos recibido tu postulación. Te contactaremos pronto si cumples con el perfil buscado.');
        closeApplyJobModal();
    })
    .catch(error => {
        console.error('❌ [JOB-POSTINGS] Error enviando postulación:', error);
        alert('⚠️ Error al enviar la postulación. Inténtelo nuevamente.');
    });
}

function simulateJobApplication(jobId) {
    showApplyJobModal(jobId);
}

function editJobOffer(jobId) {
    const currentCompany = getCurrentCompany();
    console.log(`✏️ [JOB-POSTINGS] Editando oferta ${jobId} de empresa ${currentCompany.name}`);
    
    // This would load the job offer data and populate the edit form
    alert(`✏️ Editar oferta laboral #${jobId}\n\nEmpresa: ${currentCompany.name}\nEsta funcionalidad abriría un formulario con los datos actuales de la oferta para su modificación.`);
}

function viewJobApplications(jobId) {
    const currentCompany = getCurrentCompany();
    console.log(`👥 [JOB-POSTINGS] Viendo postulaciones para oferta ${jobId} de empresa ${currentCompany.name}`);
    
    // Switch to applications tab and filter by job
    switchJobTab('applications');
    // Here we would filter applications by jobId and company_id
    alert(`👥 Mostrando postulaciones para oferta #${jobId}\nEmpresa: ${currentCompany.name}`);
}

function toggleJobStatus(jobId) {
    const currentCompany = getCurrentCompany();
    console.log(`⚠️ [JOB-POSTINGS] Cambiando estado de oferta ${jobId} de empresa ${currentCompany.name}`);
    
    // API call to toggle offer status
    fetch(`/api/job-postings/offers/${jobId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
            'Company-ID': currentCompany.id
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ [JOB-POSTINGS] Estado cambiado:', data);
        alert(`⚠️ Estado de oferta #${jobId} cambiado\nEmpresa: ${currentCompany.name}\nNuevo estado: ${data.status}`);
        switchJobTab('offers'); // Refresh the offers view
    })
    .catch(error => {
        console.error('❌ [JOB-POSTINGS] Error cambiando estado:', error);
        alert('⚠️ Error al cambiar el estado de la oferta.');
    });
}

function viewCandidate(applicationId) {
    const currentCompany = getCurrentCompany();
    console.log(`👁️ [JOB-POSTINGS] Viendo candidato de postulación ${applicationId} para empresa ${currentCompany.name}`);
    
    // Fetch candidate details for this specific company
    fetch(`/api/job-postings/applications/${applicationId}`, {
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Company-ID': currentCompany.id
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('👁️ [JOB-POSTINGS] Datos del candidato:', data);
        showCandidateModal(data);
    })
    .catch(error => {
        console.error('❌ [JOB-POSTINGS] Error cargando candidato:', error);
        alert(`👁️ Ver detalles del candidato (Postulación #${applicationId})\nEmpresa: ${currentCompany.name}\nEsta funcionalidad mostraría el perfil completo del candidato.`);
    });
}

function downloadCV(filename, applicationId) {
    const currentCompany = getCurrentCompany();
    console.log(`📄 [JOB-POSTINGS] Descargando CV ${filename} de empresa ${currentCompany.name}`);
    
    // Secure download with company verification
    const downloadUrl = `/api/job-applications/${applicationId}/cv?company_id=${currentCompany.id}&token=${getAuthToken()}`;
    
    // Create a temporary link to download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.style.setProperty('display', 'none', 'important');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('📄 [JOB-POSTINGS] Descarga iniciada para:', filename);
}

function updateApplicationStatus(applicationId, newStatus) {
    const currentCompany = getCurrentCompany();
    console.log(`🔄 [JOB-POSTINGS] Actualizando estado de postulación ${applicationId} a ${newStatus} para empresa ${currentCompany.name}`);
    
    fetch(`/api/job-postings/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
            'Company-ID': currentCompany.id
        },
        body: JSON.stringify({ status: newStatus })
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ [JOB-POSTINGS] Estado actualizado:', data);
        alert(`✅ Estado actualizado a: ${getStatusText(newStatus)}\nEmpresa: ${currentCompany.name}`);
        switchJobTab('applications'); // Refresh applications view
    })
    .catch(error => {
        console.error('❌ [JOB-POSTINGS] Error actualizando estado:', error);
        alert('⚠️ Error al actualizar el estado de la postulación.');
    });
}

function showCandidateModal(candidateData) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000;';
    
    modal.innerHTML = `
        <div class="modal-content" style="position: relative; margin: 3% auto; width: 90%; max-width: 800px; background: white; border-radius: 12px; max-height: 85vh; overflow-y: auto;">
            <div class="modal-header" style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 20px 30px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0;">👤 Perfil del Candidato</h3>
                <button onclick="this.closest('.modal').remove()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 30px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <h4>📋 Información Personal</h4>
                        <p><strong>Nombre:</strong> ${candidateData.candidate_name || 'N/A'}</p>
                        <p><strong>Email:</strong> ${candidateData.candidate_email || 'N/A'}</p>
                        <p><strong>Teléfono:</strong> ${candidateData.candidate_phone || 'N/A'}</p>
                        <p><strong>Ubicación:</strong> ${candidateData.candidate_location || 'N/A'}</p>
                    </div>
                    <div>
                        <h4>💼 Información Profesional</h4>
                        <p><strong>Experiencia:</strong> ${candidateData.experience_years || 'N/A'}</p>
                        <p><strong>Disponibilidad:</strong> ${candidateData.availability || 'N/A'}</p>
                        <p><strong>Pretensión Salarial:</strong> $${candidateData.salary_expectation || 'No especificada'}</p>
                        <p><strong>Tecnologías:</strong> ${candidateData.technologies ? candidateData.technologies.join(', ') : 'N/A'}</p>
                    </div>
                </div>
                
                ${candidateData.cover_letter ? `
                    <div style="margin-top: 20px;">
                        <h4>💬 Carta de Presentación</h4>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff;">
                            ${candidateData.cover_letter}
                        </div>
                    </div>
                ` : ''}
                
                <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: center;">
                    <button onclick="updateApplicationStatus(${candidateData.id}, 'revision')" 
                            style="background: #ffc107; color: #212529; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                        📋 Pasar a Revisión
                    </button>
                    <button onclick="updateApplicationStatus(${candidateData.id}, 'entrevista')" 
                            style="background: #fd7e14; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                        🗣️ Citar a Entrevista
                    </button>
                    <button onclick="updateApplicationStatus(${candidateData.id}, 'contratado')" 
                            style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                        ✅ Contratar
                    </button>
                    <button onclick="updateApplicationStatus(${candidateData.id}, 'rechazado')" 
                            style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                        ❌ Rechazar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Utility functions for company context
function getCurrentCompany() {
    // This should get the current company context from the main app
    // For now, simulating with sample data
    return {
        id: window.currentCompanyId || 1,
        name: window.currentCompanyName || 'Empresa Demo',
        slug: window.currentCompanySlug || 'empresa-demo'
    };
}

function getAuthToken() {
    // This should get the auth token from the main app
    return window.authToken || localStorage.getItem('auth_token') || 'demo-token';
}

// Export function to window
window.showJobPostingsContent = showJobPostingsContent;
window.switchJobTab = switchJobTab;
window.showCreateJobModal = showCreateJobModal;
window.closeCreateJobModal = closeCreateJobModal;
window.showApplyJobModal = showApplyJobModal;
window.closeApplyJobModal = closeApplyJobModal;
window.addCustomField = addCustomField;
window.removeCustomField = removeCustomField;
window.createJobOffer = createJobOffer;
window.submitApplication = submitApplication;
window.simulateJobApplication = simulateJobApplication;
window.editJobOffer = editJobOffer;
window.viewJobApplications = viewJobApplications;
window.toggleJobStatus = toggleJobStatus;
window.viewCandidate = viewCandidate;
window.downloadCV = downloadCV;
window.updateApplicationStatus = updateApplicationStatus;
window.showCandidateModal = showCandidateModal;

console.log('✅ [JOB-POSTINGS] Todas las funciones exportadas a window');
console.log('✅ [JOB-POSTINGS] typeof window.showJobPostingsContent:', typeof window.showJobPostingsContent);