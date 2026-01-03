/**
 * Medical Prescriptions - Panel de Asociados (Médicos)
 *
 * Módulo para que médicos del marketplace puedan:
 * - Prescribir medicamentos a empleados
 * - Firmar recetas electrónicas
 * - Ver historial de recetas emitidas
 * - Soporte multi-país (ARG, BR, MX, US)
 *
 * Integración con:
 * - Electronic Prescriptions Service (backend)
 * - Notification Center (SSOT)
 * - Manual de Procedimientos (SSOT)
 * - Medical Dashboard Professional (historial médico empleado)
 *
 * @version 1.0.0
 * @date 2026-01-01
 * @author Sistema Médico Modular
 */

const MedicalPrescriptionsAssociate = {
    currentDoctorId: null,
    currentPatientId: null,
    currentPrescription: null,
    prescriptions: [],
    medications: [], // Catálogo de medicamentos

    // Configuración por país
    COUNTRY_CONFIG: {
        'AR': {
            name: 'Argentina',
            regulation: 'Resolución 1560/2011',
            regulatory_body: 'ANMAT',
            signature_type: 'afip',
            requires_digital_signature: true,
            controlled_levels: ['Lista I', 'Lista II', 'Lista III', 'Lista IV', 'Lista V']
        },
        'BR': {
            name: 'Brasil',
            regulation: 'Portaria 344/1998',
            regulatory_body: 'ANVISA',
            signature_type: 'icp_brasil',
            requires_digital_signature: true,
            controlled_levels: ['A1', 'A2', 'A3', 'B1', 'B2', 'C1', 'C2']
        },
        'MX': {
            name: 'México',
            regulation: 'NOM-072-SSA1-2012',
            regulatory_body: 'COFEPRIS',
            signature_type: 'fiel_mexico',
            requires_digital_signature: true,
            controlled_levels: ['Grupo I', 'Grupo II', 'Grupo III', 'Grupo IV']
        },
        'US': {
            name: 'Estados Unidos',
            regulation: 'e-Prescribing',
            regulatory_body: 'DEA',
            signature_type: 'dea_usa',
            requires_digital_signature: true,
            controlled_levels: ['Schedule I', 'Schedule II', 'Schedule III', 'Schedule IV', 'Schedule V']
        }
    },

    /**
     * Inicializar módulo
     */
    async init() {
        console.log('💊 [PRESCRIPTIONS] Inicializando módulo de recetas para médicos asociados...');

        try {
            // Obtener ID del doctor actual (del localStorage o sesión)
            this.currentDoctorId = await this.getCurrentDoctorId();

            if (!this.currentDoctorId) {
                throw new Error('No se pudo identificar al médico asociado');
            }

            // Cargar catálogo de medicamentos
            await this.loadMedicationsCatalog();

            // Renderizar UI
            this.render();

            // Cargar recetas del médico
            await this.loadMyPrescriptions();

            console.log('✅ [PRESCRIPTIONS] Módulo inicializado correctamente');
        } catch (error) {
            console.error('❌ [PRESCRIPTIONS] Error al inicializar:', error);
            this.showError('Error al cargar el módulo de recetas');
        }
    },

    /**
     * Obtener ID del médico actual
     */
    async getCurrentDoctorId() {
        // Primero intentar desde localStorage
        const cachedDoctor = localStorage.getItem('currentAssociateDoctor');
        if (cachedDoctor) {
            return JSON.parse(cachedDoctor).id;
        }

        // Si no, obtener desde API
        try {
            const response = await fetch('/api/associates/auth/me', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('No autorizado');

            const data = await response.json();

            // Cachear información del doctor
            localStorage.setItem('currentAssociateDoctor', JSON.stringify(data.partner));

            return data.partner.id;
        } catch (error) {
            console.error('Error al obtener doctor actual:', error);
            return null;
        }
    },

    /**
     * Renderizar UI principal
     */
    render() {
        const container = document.getElementById('mainContent');

        container.innerHTML = `
            <div class="prescriptions-associate-container">
                <!-- Header -->
                <div class="prescriptions-header">
                    <div class="header-left">
                        <h2>
                            <i class="fas fa-prescription"></i>
                            Recetas Electrónicas
                        </h2>
                        <p class="text-muted">
                            Sistema de prescripción digital multi-país con firma electrónica
                        </p>
                    </div>
                    <div class="header-right">
                        <button class="btn btn-primary" onclick="MedicalPrescriptionsAssociate.openNewPrescriptionModal()">
                            <i class="fas fa-plus"></i>
                            Nueva Receta
                        </button>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div class="stats-cards">
                    <div class="stat-card">
                        <div class="stat-icon" style="background: #3498db;">
                            <i class="fas fa-prescription-bottle"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="stat-total-prescriptions">0</h3>
                            <p>Total Recetas</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon" style="background: #e74c3c;">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="stat-controlled">0</h3>
                            <p>Controlados</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon" style="background: #f39c12;">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="stat-pending-signature">0</h3>
                            <p>Pendientes Firma</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon" style="background: #27ae60;">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="stat-signed">0</h3>
                            <p>Firmadas</p>
                        </div>
                    </div>
                </div>

                <!-- Filters -->
                <div class="prescriptions-filters">
                    <input
                        type="text"
                        id="search-prescriptions"
                        class="form-control search-input"
                        placeholder="Buscar por paciente o medicamento..."
                        onkeyup="MedicalPrescriptionsAssociate.handleSearch()"
                    />

                    <select
                        id="filter-status"
                        class="form-select filter-select"
                        onchange="MedicalPrescriptionsAssociate.applyFilters()"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="pending">Pendientes</option>
                        <option value="signed">Firmadas</option>
                        <option value="dispensed">Dispensadas</option>
                        <option value="expired">Vencidas</option>
                        <option value="cancelled">Canceladas</option>
                    </select>

                    <select
                        id="filter-country"
                        class="form-select filter-select"
                        onchange="MedicalPrescriptionsAssociate.applyFilters()"
                    >
                        <option value="all">Todos los países</option>
                        <option value="AR">🇦🇷 Argentina</option>
                        <option value="BR">🇧🇷 Brasil</option>
                        <option value="MX">🇲🇽 México</option>
                        <option value="US">🇺🇸 USA</option>
                    </select>

                    <select
                        id="filter-controlled"
                        class="form-select filter-select"
                        onchange="MedicalPrescriptionsAssociate.applyFilters()"
                    >
                        <option value="all">Todos</option>
                        <option value="controlled">Solo controlados</option>
                        <option value="non-controlled">Solo no controlados</option>
                    </select>
                </div>

                <!-- Prescriptions List -->
                <div class="prescriptions-list" id="prescriptions-list">
                    <div class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Cargando recetas...</p>
                    </div>
                </div>
            </div>

            <!-- Modal: Nueva Receta -->
            <div class="modal fade" id="newPrescriptionModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-prescription"></i>
                                Nueva Receta Electrónica
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="newPrescriptionModalBody">
                            <!-- Se renderiza dinámicamente -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Ver Receta -->
            <div class="modal fade" id="viewPrescriptionModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-file-prescription"></i>
                                Detalle de Receta
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="viewPrescriptionModalBody">
                            <!-- Se renderiza dinámicamente -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.injectStyles();
    },

    /**
     * Cargar catálogo de medicamentos
     */
    async loadMedicationsCatalog() {
        try {
            const response = await fetch('/api/prescriptions/medications/catalog', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Error al cargar catálogo');

            const data = await response.json();
            this.medications = data.medications || [];

            console.log(`✅ Catálogo cargado: ${this.medications.length} medicamentos`);
        } catch (error) {
            console.error('Error al cargar catálogo:', error);
            // Usar catálogo por defecto si falla
            this.medications = this.getDefaultMedicationsCatalog();
        }
    },

    /**
     * Catálogo por defecto (fallback)
     */
    getDefaultMedicationsCatalog() {
        return [
            { id: 1, name: 'Ibuprofeno', active_ingredient: 'Ibuprofeno', is_controlled: false, common_dosages: ['400mg', '600mg', '800mg'] },
            { id: 2, name: 'Paracetamol', active_ingredient: 'Paracetamol', is_controlled: false, common_dosages: ['500mg', '1g'] },
            { id: 3, name: 'Amoxicilina', active_ingredient: 'Amoxicilina', is_controlled: false, common_dosages: ['500mg', '875mg'] },
            { id: 4, name: 'Omeprazol', active_ingredient: 'Omeprazol', is_controlled: false, common_dosages: ['20mg', '40mg'] },
            { id: 5, name: 'Tramadol', active_ingredient: 'Tramadol', is_controlled: true, control_level: 'level_2', common_dosages: ['50mg', '100mg'] }
        ];
    },

    /**
     * Cargar recetas del médico
     */
    async loadMyPrescriptions() {
        try {
            const response = await fetch(`/api/prescriptions/electronic/doctor/${this.currentDoctorId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Error al cargar recetas');

            const data = await response.json();
            this.prescriptions = data.prescriptions || [];

            this.updateStats();
            this.renderPrescriptionsList();

            console.log(`✅ Recetas cargadas: ${this.prescriptions.length}`);
        } catch (error) {
            console.error('Error al cargar recetas:', error);
            this.showError('Error al cargar tus recetas');
        }
    },

    /**
     * Actualizar estadísticas
     */
    updateStats() {
        const total = this.prescriptions.length;
        const controlled = this.prescriptions.filter(p => p.is_controlled).length;
        const pending = this.prescriptions.filter(p => p.status === 'pending').length;
        const signed = this.prescriptions.filter(p => p.status === 'signed').length;

        document.getElementById('stat-total-prescriptions').textContent = total;
        document.getElementById('stat-controlled').textContent = controlled;
        document.getElementById('stat-pending-signature').textContent = pending;
        document.getElementById('stat-signed').textContent = signed;
    },

    /**
     * Renderizar lista de recetas
     */
    renderPrescriptionsList() {
        const container = document.getElementById('prescriptions-list');

        if (this.prescriptions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-prescription-bottle"></i>
                    <h3>No hay recetas aún</h3>
                    <p>Comienza prescribiendo tu primera receta electrónica</p>
                    <button class="btn btn-primary" onclick="MedicalPrescriptionsAssociate.openNewPrescriptionModal()">
                        <i class="fas fa-plus"></i>
                        Nueva Receta
                    </button>
                </div>
            `;
            return;
        }

        const html = this.prescriptions.map(prescription => this.renderPrescriptionCard(prescription)).join('');
        container.innerHTML = html;
    },

    /**
     * Renderizar tarjeta de receta
     */
    renderPrescriptionCard(prescription) {
        const statusConfig = {
            'pending': { icon: 'fa-clock', color: '#f39c12', label: 'Pendiente' },
            'signed': { icon: 'fa-check-circle', color: '#27ae60', label: 'Firmada' },
            'dispensed': { icon: 'fa-prescription-bottle-alt', color: '#3498db', label: 'Dispensada' },
            'expired': { icon: 'fa-times-circle', color: '#95a5a6', label: 'Vencida' },
            'cancelled': { icon: 'fa-ban', color: '#e74c3c', label: 'Cancelada' }
        };

        const status = statusConfig[prescription.status] || statusConfig['pending'];
        const countryConfig = this.COUNTRY_CONFIG[prescription.country];

        return `
            <div class="prescription-card" data-prescription-id="${prescription.id}">
                <div class="prescription-header">
                    <div class="prescription-info">
                        <h4>${prescription.employee_name}</h4>
                        <p class="text-muted">
                            <i class="fas fa-calendar"></i>
                            ${new Date(prescription.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <div class="prescription-status" style="background: ${status.color}20; color: ${status.color};">
                        <i class="fas ${status.icon}"></i>
                        ${status.label}
                    </div>
                </div>

                <div class="prescription-body">
                    <div class="medication-info">
                        <h5>
                            ${prescription.medication_name}
                            ${prescription.is_controlled ? '<span class="badge bg-danger"><i class="fas fa-exclamation-triangle"></i> Controlado</span>' : ''}
                        </h5>
                        <p><strong>Dosis:</strong> ${prescription.dosage}</p>
                        <p><strong>Cantidad:</strong> ${prescription.quantity} unidades</p>
                        <p><strong>Duración:</strong> ${prescription.duration_days} días</p>
                    </div>

                    <div class="prescription-metadata">
                        <p><strong>País:</strong> ${countryConfig.name}</p>
                        <p><strong>N° Receta:</strong> <code>${prescription.prescription_number}</code></p>
                        ${prescription.digital_signature ? '<p class="text-success"><i class="fas fa-signature"></i> Firmada digitalmente</p>' : ''}
                        <p><strong>Válida hasta:</strong> ${new Date(prescription.valid_until).toLocaleDateString()}</p>
                    </div>
                </div>

                <div class="prescription-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="MedicalPrescriptionsAssociate.viewPrescription(${prescription.id})">
                        <i class="fas fa-eye"></i>
                        Ver Detalle
                    </button>

                    ${prescription.status === 'pending' && prescription.is_controlled ? `
                        <button class="btn btn-sm btn-warning" onclick="MedicalPrescriptionsAssociate.signPrescription(${prescription.id})">
                            <i class="fas fa-signature"></i>
                            Firmar Digitalmente
                        </button>
                    ` : ''}

                    ${prescription.status === 'signed' ? `
                        <button class="btn btn-sm btn-success" onclick="MedicalPrescriptionsAssociate.downloadPDF(${prescription.id})">
                            <i class="fas fa-download"></i>
                            Descargar PDF
                        </button>
                    ` : ''}

                    ${prescription.qr_code ? `
                        <button class="btn btn-sm btn-info" onclick="MedicalPrescriptionsAssociate.showQR(${prescription.id})">
                            <i class="fas fa-qrcode"></i>
                            Ver QR
                        </button>
                    ` : ''}

                    ${prescription.status === 'pending' ? `
                        <button class="btn btn-sm btn-danger" onclick="MedicalPrescriptionsAssociate.cancelPrescription(${prescription.id})">
                            <i class="fas fa-ban"></i>
                            Cancelar
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Abrir modal de nueva receta
     */
    async openNewPrescriptionModal() {
        const modal = new bootstrap.Modal(document.getElementById('newPrescriptionModal'));
        const modalBody = document.getElementById('newPrescriptionModalBody');

        // Renderizar formulario
        modalBody.innerHTML = `
            <form id="newPrescriptionForm">
                <!-- Paso 1: Seleccionar Paciente -->
                <div class="form-step" id="step-patient">
                    <h5 class="step-title">
                        <span class="step-number">1</span>
                        Seleccionar Paciente
                    </h5>

                    <div class="mb-3">
                        <label class="form-label">Buscar empleado/paciente</label>
                        <input
                            type="text"
                            id="search-patient"
                            class="form-control"
                            placeholder="Nombre, DNI o número de empleado..."
                            onkeyup="MedicalPrescriptionsAssociate.searchPatients(this.value)"
                        />
                    </div>

                    <div id="patients-results" class="patients-results">
                        <!-- Se llena con resultados de búsqueda -->
                    </div>

                    <div class="selected-patient" id="selected-patient-display" style="display: none;">
                        <!-- Se muestra el paciente seleccionado -->
                    </div>

                    <input type="hidden" id="selected-patient-id" />
                </div>

                <!-- Paso 2: Datos de la Receta -->
                <div class="form-step" id="step-prescription" style="display: none;">
                    <h5 class="step-title">
                        <span class="step-number">2</span>
                        Datos de la Receta
                    </h5>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">País *</label>
                            <select
                                id="prescription-country"
                                class="form-select"
                                required
                                onchange="MedicalPrescriptionsAssociate.onCountryChange(this.value)"
                            >
                                <option value="">Seleccionar...</option>
                                <option value="AR">🇦🇷 Argentina (ANMAT)</option>
                                <option value="BR">🇧🇷 Brasil (ANVISA)</option>
                                <option value="MX">🇲🇽 México (COFEPRIS)</option>
                                <option value="US">🇺🇸 USA (DEA)</option>
                            </select>
                        </div>

                        <div class="col-md-6 mb-3">
                            <label class="form-label">Medicamento *</label>
                            <select
                                id="prescription-medication"
                                class="form-select"
                                required
                                onchange="MedicalPrescriptionsAssociate.onMedicationChange(this.value)"
                            >
                                <option value="">Seleccionar...</option>
                                ${this.medications.map(med => `
                                    <option value="${med.id}" data-controlled="${med.is_controlled}">
                                        ${med.name} ${med.is_controlled ? '⚠️' : ''}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <div class="col-md-6 mb-3">
                            <label class="form-label">Dosis *</label>
                            <input
                                type="text"
                                id="prescription-dosage"
                                class="form-control"
                                placeholder="ej: 500mg cada 8 horas"
                                required
                            />
                        </div>

                        <div class="col-md-6 mb-3">
                            <label class="form-label">Cantidad *</label>
                            <input
                                type="number"
                                id="prescription-quantity"
                                class="form-control"
                                min="1"
                                placeholder="ej: 20"
                                required
                            />
                        </div>

                        <div class="col-md-6 mb-3">
                            <label class="form-label">Duración (días) *</label>
                            <input
                                type="number"
                                id="prescription-duration"
                                class="form-control"
                                min="1"
                                placeholder="ej: 7"
                                required
                            />
                        </div>

                        <div class="col-md-12 mb-3">
                            <label class="form-label">Instrucciones</label>
                            <textarea
                                id="prescription-instructions"
                                class="form-control"
                                rows="3"
                                placeholder="Indicaciones adicionales para el paciente..."
                            ></textarea>
                        </div>

                        <div class="col-md-12" id="controlled-warning" style="display: none;">
                            <div class="alert alert-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                <strong>Medicamento Controlado</strong>
                                <p>Este medicamento requiere firma digital y autorización según normativa del país.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Botones de navegación -->
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="btn-prev-step" style="display: none;" onclick="MedicalPrescriptionsAssociate.prevStep()">
                        <i class="fas fa-arrow-left"></i>
                        Anterior
                    </button>

                    <button type="button" class="btn btn-primary" id="btn-next-step" onclick="MedicalPrescriptionsAssociate.nextStep()">
                        Siguiente
                        <i class="fas fa-arrow-right"></i>
                    </button>

                    <button type="submit" class="btn btn-success" id="btn-submit-prescription" style="display: none;">
                        <i class="fas fa-check"></i>
                        Emitir Receta
                    </button>
                </div>
            </form>
        `;

        // Event listener para submit
        document.getElementById('newPrescriptionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitPrescription();
        });

        modal.show();
    },

    /**
     * Buscar pacientes
     */
    async searchPatients(query) {
        if (!query || query.length < 3) {
            document.getElementById('patients-results').innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`/api/associates/medical/patients/search?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();
            const container = document.getElementById('patients-results');

            if (data.patients && data.patients.length > 0) {
                container.innerHTML = data.patients.map(patient => `
                    <div class="patient-result" onclick="MedicalPrescriptionsAssociate.selectPatient(${patient.id}, '${patient.full_name}', '${patient.company_name}')">
                        <div class="patient-info">
                            <strong>${patient.full_name}</strong>
                            <small class="text-muted">${patient.company_name}</small>
                        </div>
                        <div class="patient-meta">
                            <span class="badge bg-secondary">${patient.document_number || 'Sin DNI'}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="text-muted">No se encontraron resultados</p>';
            }
        } catch (error) {
            console.error('Error buscando pacientes:', error);
        }
    },

    /**
     * Seleccionar paciente
     */
    selectPatient(patientId, patientName, companyName) {
        this.currentPatientId = patientId;

        document.getElementById('selected-patient-id').value = patientId;
        document.getElementById('patients-results').innerHTML = '';
        document.getElementById('search-patient').value = '';

        const display = document.getElementById('selected-patient-display');
        display.style.display = 'block';
        display.innerHTML = `
            <div class="alert alert-success">
                <strong>Paciente seleccionado:</strong>
                <p class="mb-0">${patientName} - ${companyName}</p>
                <button type="button" class="btn btn-sm btn-outline-danger mt-2" onclick="MedicalPrescriptionsAssociate.clearPatientSelection()">
                    <i class="fas fa-times"></i>
                    Cambiar paciente
                </button>
            </div>
        `;
    },

    /**
     * Limpiar selección de paciente
     */
    clearPatientSelection() {
        this.currentPatientId = null;
        document.getElementById('selected-patient-id').value = '';
        document.getElementById('selected-patient-display').style.display = 'none';
    },

    /**
     * Siguiente paso del formulario
     */
    nextStep() {
        // Validar que haya paciente seleccionado
        if (!this.currentPatientId) {
            alert('Por favor selecciona un paciente');
            return;
        }

        // Ocultar paso 1, mostrar paso 2
        document.getElementById('step-patient').style.display = 'none';
        document.getElementById('step-prescription').style.display = 'block';

        // Mostrar botón anterior y submit, ocultar siguiente
        document.getElementById('btn-prev-step').style.display = 'inline-block';
        document.getElementById('btn-next-step').style.display = 'none';
        document.getElementById('btn-submit-prescription').style.display = 'inline-block';
    },

    /**
     * Paso anterior
     */
    prevStep() {
        document.getElementById('step-patient').style.display = 'block';
        document.getElementById('step-prescription').style.display = 'none';

        document.getElementById('btn-prev-step').style.display = 'none';
        document.getElementById('btn-next-step').style.display = 'inline-block';
        document.getElementById('btn-submit-prescription').style.display = 'none';
    },

    /**
     * Cambio de país
     */
    onCountryChange(country) {
        if (!country) return;

        const config = this.COUNTRY_CONFIG[country];
        console.log(`País seleccionado: ${config.name} (${config.regulatory_body})`);

        // Mostrar info de normativa
        // TODO: Agregar tooltip o info box con regulación aplicable
    },

    /**
     * Cambio de medicamento
     */
    onMedicationChange(medicationId) {
        const medication = this.medications.find(m => m.id == medicationId);

        if (medication && medication.is_controlled) {
            document.getElementById('controlled-warning').style.display = 'block';
        } else {
            document.getElementById('controlled-warning').style.display = 'none';
        }
    },

    /**
     * Enviar receta
     */
    async submitPrescription() {
        const medicationId = document.getElementById('prescription-medication').value;
        const medication = this.medications.find(m => m.id == medicationId);

        const data = {
            employeeId: this.currentPatientId,
            doctorId: this.currentDoctorId,
            country: document.getElementById('prescription-country').value,
            medication: medication.name,
            activeIngredient: medication.active_ingredient,
            dosage: document.getElementById('prescription-dosage').value,
            quantity: parseInt(document.getElementById('prescription-quantity').value),
            durationDays: parseInt(document.getElementById('prescription-duration').value),
            instructions: document.getElementById('prescription-instructions').value,
            isControlled: medication.is_controlled || false,
            controlLevel: medication.control_level || 'none'
        };

        try {
            const response = await fetch('/api/prescriptions/electronic', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Error al crear receta');

            const result = await response.json();

            // Cerrar modal
            bootstrap.Modal.getInstance(document.getElementById('newPrescriptionModal')).hide();

            // Recargar lista
            await this.loadMyPrescriptions();

            this.showSuccess('Receta emitida correctamente');
        } catch (error) {
            console.error('Error al crear receta:', error);
            this.showError('Error al emitir la receta');
        }
    },

    /**
     * Ver detalle de receta
     */
    async viewPrescription(prescriptionId) {
        const prescription = this.prescriptions.find(p => p.id === prescriptionId);
        if (!prescription) return;

        const modal = new bootstrap.Modal(document.getElementById('viewPrescriptionModal'));
        const modalBody = document.getElementById('viewPrescriptionModalBody');

        modalBody.innerHTML = `
            <div class="prescription-detail">
                <div class="detail-section">
                    <h6>Información del Paciente</h6>
                    <p><strong>Nombre:</strong> ${prescription.employee_name}</p>
                    <p><strong>Empresa:</strong> ${prescription.company_name}</p>
                </div>

                <div class="detail-section">
                    <h6>Medicamento</h6>
                    <p><strong>Nombre:</strong> ${prescription.medication_name}</p>
                    <p><strong>Dosis:</strong> ${prescription.dosage}</p>
                    <p><strong>Cantidad:</strong> ${prescription.quantity} unidades</p>
                    <p><strong>Duración:</strong> ${prescription.duration_days} días</p>
                    ${prescription.instructions ? `<p><strong>Instrucciones:</strong> ${prescription.instructions}</p>` : ''}
                </div>

                <div class="detail-section">
                    <h6>Información de la Receta</h6>
                    <p><strong>Número:</strong> <code>${prescription.prescription_number}</code></p>
                    <p><strong>País:</strong> ${this.COUNTRY_CONFIG[prescription.country].name}</p>
                    <p><strong>Normativa:</strong> ${prescription.regulation}</p>
                    <p><strong>Estado:</strong> ${prescription.status}</p>
                    <p><strong>Válida desde:</strong> ${new Date(prescription.valid_from).toLocaleDateString()}</p>
                    <p><strong>Válida hasta:</strong> ${new Date(prescription.valid_until).toLocaleDateString()}</p>
                </div>

                ${prescription.digital_signature ? `
                    <div class="detail-section">
                        <h6>Firma Digital</h6>
                        <p class="text-success">
                            <i class="fas fa-check-circle"></i>
                            Firmada digitalmente el ${new Date(prescription.signature_timestamp).toLocaleString()}
                        </p>
                        <p><strong>Tipo:</strong> ${prescription.signature_type.toUpperCase()}</p>
                    </div>
                ` : ''}

                ${prescription.qr_code ? `
                    <div class="detail-section text-center">
                        <h6>Código QR</h6>
                        <img src="${prescription.qr_code}" alt="QR Code" style="max-width: 200px;" />
                    </div>
                ` : ''}
            </div>
        `;

        modal.show();
    },

    /**
     * Firmar receta
     */
    async signPrescription(prescriptionId) {
        if (!confirm('¿Confirmas que deseas firmar digitalmente esta receta?')) return;

        try {
            const response = await fetch(`/api/prescriptions/electronic/${prescriptionId}/sign`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Error al firmar');

            await this.loadMyPrescriptions();
            this.showSuccess('Receta firmada correctamente');
        } catch (error) {
            console.error('Error al firmar:', error);
            this.showError('Error al firmar la receta');
        }
    },

    /**
     * Descargar PDF
     */
    async downloadPDF(prescriptionId) {
        window.open(`/api/prescriptions/electronic/${prescriptionId}/pdf`, '_blank');
    },

    /**
     * Mostrar QR
     */
    showQR(prescriptionId) {
        const prescription = this.prescriptions.find(p => p.id === prescriptionId);
        if (!prescription || !prescription.qr_code) return;

        // Crear modal temporal con QR grande
        alert('QR Code: ' + prescription.qr_code.substring(0, 50) + '...');
        // TODO: Implementar modal con QR más grande
    },

    /**
     * Cancelar receta
     */
    async cancelPrescription(prescriptionId) {
        const reason = prompt('Motivo de cancelación:');
        if (!reason) return;

        try {
            const response = await fetch(`/api/prescriptions/electronic/${prescriptionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ reason })
            });

            if (!response.ok) throw new Error('Error al cancelar');

            await this.loadMyPrescriptions();
            this.showSuccess('Receta cancelada');
        } catch (error) {
            console.error('Error al cancelar:', error);
            this.showError('Error al cancelar la receta');
        }
    },

    /**
     * Aplicar filtros
     */
    applyFilters() {
        // TODO: Implementar filtrado
        console.log('Aplicando filtros...');
    },

    /**
     * Buscar
     */
    handleSearch() {
        // TODO: Implementar búsqueda
        console.log('Buscando...');
    },

    /**
     * Mostrar error
     */
    showError(message) {
        alert('❌ ' + message);
        // TODO: Usar sistema de notificaciones
    },

    /**
     * Mostrar éxito
     */
    showSuccess(message) {
        alert('✅ ' + message);
        // TODO: Usar sistema de notificaciones
    },

    /**
     * Inyectar estilos
     */
    injectStyles() {
        if (document.getElementById('prescriptions-associate-styles')) return;

        const style = document.createElement('style');
        style.id = 'prescriptions-associate-styles';
        style.textContent = `
            .prescriptions-associate-container {
                padding: 20px;
                max-width: 1400px;
                margin: 0 auto;
            }

            .prescriptions-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
            }

            .stats-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .stat-card {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .stat-icon {
                width: 50px;
                height: 50px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 24px;
            }

            .prescriptions-filters {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }

            .prescriptions-filters .search-input {
                flex: 1;
                min-width: 200px;
            }

            .prescription-card {
                background: white;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 15px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .prescription-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .prescription-status {
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 500;
            }

            .prescription-body {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 15px;
            }

            .prescription-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .patients-results {
                max-height: 300px;
                overflow-y: auto;
            }

            .patient-result {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .patient-result:hover {
                background: #f8f9fa;
            }

            .form-step {
                min-height: 300px;
            }

            .step-title {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 20px;
            }

            .step-number {
                background: #3498db;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            }

            .empty-state {
                text-align: center;
                padding: 60px 20px;
            }

            .empty-state i {
                font-size: 64px;
                color: #ddd;
                margin-bottom: 20px;
            }

            .loading-state {
                text-align: center;
                padding: 40px;
            }

            .loading-state i {
                font-size: 48px;
                color: #3498db;
            }
        `;

        document.head.appendChild(style);
    }
};

// Auto-inicializar si estamos en panel-asociados
if (window.location.pathname.includes('panel-asociados')) {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof MedicalPrescriptionsAssociate !== 'undefined') {
            // Esperar a que el usuario haga click en el módulo médico
            console.log('💊 Módulo de recetas listo para inicializar');
        }
    });
}
