/**
 * ========================================================================
 * MÓDULO: Gestor de Antecedentes Laborales con Desvinculación y Litigios
 * ========================================================================
 * Gestión completa del historial laboral con tracking detallado de
 * desvinculaciones, indemnizaciones, acuerdos y litigios judiciales
 * ========================================================================
 */

class WorkHistoryManager {
    constructor() {
        this.workHistory = [];
        this.currentUserId = null;
        this.currentCompanyId = null;
        this.editingHistoryId = null;

        console.log('💼 [WORK-HISTORY] Inicializando gestor de antecedentes laborales...');
    }

    /**
     * Inicializa el módulo
     */
    async init(userId, companyId) {
        this.currentUserId = userId;
        this.currentCompanyId = companyId;

        await this.loadWorkHistory();
        this.bindEvents();

        console.log(`💼 [WORK-HISTORY] Inicializado para usuario ${userId}`);
    }

    /**
     * Carga historial laboral
     */
    async loadWorkHistory() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/v1/users/${this.currentUserId}/work-history`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar historial laboral');
            }

            this.workHistory = await response.json();
            this.renderWorkHistoryTable();

        } catch (error) {
            console.error('❌ Error cargando historial laboral:', error);
            this.showNotification('Error al cargar historial laboral', 'error');
        }
    }

    /**
     * Renderiza la tabla de historial laboral
     */
    renderWorkHistoryTable() {
        const container = document.getElementById('work-history-list');
        if (!container) return;

        if (this.workHistory.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-briefcase fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No hay antecedentes laborales registrados</p>
                    <button class="btn btn-primary btn-sm" onclick="workHistoryManager.showAddModal()">
                        <i class="fas fa-plus"></i> Agregar Experiencia
                    </button>
                </div>
            `;
            return;
        }

        const html = `
            <div class="mb-3">
                <button class="btn btn-primary btn-sm" onclick="workHistoryManager.showAddModal()">
                    <i class="fas fa-plus"></i> Agregar Experiencia
                </button>
            </div>
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Empresa</th>
                            <th>Cargo</th>
                            <th>Período</th>
                            <th>Desvinculación</th>
                            <th>Indemnización</th>
                            <th>Litigio</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.workHistory.map(job => {
                            const startDate = new Date(job.start_date).toLocaleDateString('es-AR');
                            const endDate = job.end_date ? new Date(job.end_date).toLocaleDateString('es-AR') : 'Actual';
                            const period = `${startDate} - ${endDate}`;

                            let terminationBadge = '<span class="badge badge-secondary">N/A</span>';
                            if (job.termination_type) {
                                terminationBadge = `<span class="badge badge-info">${this.getTerminationTypeLabel(job.termination_type)}</span>`;
                            }

                            let severanceBadge = '<span class="badge badge-secondary">No</span>';
                            if (job.received_severance) {
                                severanceBadge = `<span class="badge badge-success">Sí</span>`;
                            }

                            let litigationBadge = '<span class="badge badge-secondary">No</span>';
                            if (job.has_litigation) {
                                const statusClass = job.litigation_status === 'en_tramite' ? 'danger' :
                                                   job.litigation_status === 'finalizado' ? 'success' : 'warning';
                                litigationBadge = `<span class="badge badge-${statusClass}">${this.getLitigationStatusLabel(job.litigation_status)}</span>`;
                            }

                            return `
                                <tr ${job.currently_working ? 'class="table-success"' : ''}>
                                    <td>
                                        <strong>${job.company_name}</strong>
                                        ${job.currently_working ? '<br><small class="badge badge-success">Empleo actual</small>' : ''}
                                    </td>
                                    <td>${job.position}</td>
                                    <td>${period}</td>
                                    <td>${terminationBadge}</td>
                                    <td>${severanceBadge}</td>
                                    <td>${litigationBadge}</td>
                                    <td>
                                        <button class="btn btn-sm btn-info" onclick="workHistoryManager.viewDetails(${job.id})" title="Ver detalles">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-sm btn-warning" onclick="workHistoryManager.editJob(${job.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="workHistoryManager.deleteJob(${job.id})" title="Eliminar">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Muestra modal para agregar experiencia
     */
    showAddModal() {
        this.editingHistoryId = null;
        this.showJobModal();
    }

    /**
     * Edita una experiencia laboral
     */
    editJob(jobId) {
        this.editingHistoryId = jobId;
        const job = this.workHistory.find(j => j.id === jobId);
        this.showJobModal(job);
    }

    /**
     * Ver detalles completos
     */
    viewDetails(jobId) {
        const job = this.workHistory.find(j => j.id === jobId);
        this.showJobModal(job, true); // Modo solo lectura
    }

    /**
     * Muestra el modal de experiencia laboral
     */
    showJobModal(job = null, readOnly = false) {
        const isEdit = job !== null;
        const disabled = readOnly ? 'disabled' : '';

        const modalHtml = `
            <div class="modal fade" id="workHistoryModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header ${readOnly ? 'bg-info' : 'bg-primary'} text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-briefcase"></i>
                                ${readOnly ? 'Detalles de Experiencia Laboral' :
                                  isEdit ? 'Editar Experiencia Laboral' : 'Agregar Experiencia Laboral'}
                            </h5>
                            <button type="button" class="close text-white" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                            ${this.renderJobForm(job, disabled)}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">
                                ${readOnly ? 'Cerrar' : 'Cancelar'}
                            </button>
                            ${!readOnly ? `
                                <button type="button" class="btn btn-primary" onclick="workHistoryManager.saveJob()">
                                    <i class="fas fa-save"></i> Guardar
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        $('#workHistoryModal').remove();
        $('body').append(modalHtml);
        $('#workHistoryModal').modal('show');

        // Inicializar collapsibles, estados condicionales y tooltips
        setTimeout(() => {
            this.initFormInteractions();
            $('[data-toggle="tooltip"]').tooltip();
        }, 100);
    }

    /**
     * Renderiza el formulario completo
     */
    renderJobForm(job, disabled) {
        return `
            <form id="workHistoryForm">
                <!-- SECCIÓN 1: INFORMACIÓN BÁSICA -->
                <div class="card mb-3">
                    <div class="card-header bg-light">
                        <h6 class="mb-0"><i class="fas fa-building"></i> Información Básica</h6>
                    </div>
                    <div class="card-body">
                        ${this.renderBasicInfo(job, disabled)}
                    </div>
                </div>

                <!-- SECCIÓN 2: DESVINCULACIÓN (solo si no es empleo actual) -->
                <div class="card mb-3" id="terminationSection" style="${job?.currently_working ? 'display:none;' : ''}">
                    <div class="card-header bg-warning text-dark">
                        <h6 class="mb-0"><i class="fas fa-handshake-slash"></i> Información de Desvinculación</h6>
                    </div>
                    <div class="card-body">
                        ${this.renderTerminationInfo(job, disabled)}
                    </div>
                </div>

                <!-- SECCIÓN 3: INDEMNIZACIÓN -->
                <div class="card mb-3" id="severanceSection">
                    <div class="card-header bg-success text-white" data-toggle="collapse" data-target="#severanceCollapse">
                        <h6 class="mb-0">
                            <i class="fas fa-dollar-sign"></i> Indemnización / Liquidación
                            <i class="fas fa-chevron-down float-right"></i>
                        </h6>
                    </div>
                    <div id="severanceCollapse" class="collapse">
                        <div class="card-body">
                            ${this.renderSeveranceInfo(job, disabled)}
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 4: ACUERDOS EXTRAJUDICIALES -->
                <div class="card mb-3" id="settlementSection">
                    <div class="card-header bg-info text-white" data-toggle="collapse" data-target="#settlementCollapse">
                        <h6 class="mb-0">
                            <i class="fas fa-file-contract"></i> Acuerdos Extrajudiciales
                            <i class="fas fa-chevron-down float-right"></i>
                        </h6>
                    </div>
                    <div id="settlementCollapse" class="collapse">
                        <div class="card-body">
                            ${this.renderSettlementInfo(job, disabled)}
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 5: LITIGIOS JUDICIALES -->
                <div class="card mb-3" id="litigationSection">
                    <div class="card-header bg-danger text-white" data-toggle="collapse" data-target="#litigationCollapse">
                        <h6 class="mb-0">
                            <i class="fas fa-gavel"></i> Litigios Judiciales
                            <i class="fas fa-chevron-down float-right"></i>
                        </h6>
                    </div>
                    <div id="litigationCollapse" class="collapse">
                        <div class="card-body">
                            ${this.renderLitigationInfo(job, disabled)}
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 6: DOCUMENTACIÓN Y NOTAS -->
                <div class="card mb-3">
                    <div class="card-header bg-secondary text-white" data-toggle="collapse" data-target="#docsCollapse">
                        <h6 class="mb-0">
                            <i class="fas fa-folder-open"></i> Documentación y Notas Internas
                            <i class="fas fa-chevron-down float-right"></i>
                        </h6>
                    </div>
                    <div id="docsCollapse" class="collapse">
                        <div class="card-body">
                            ${this.renderDocumentationAndNotes(job, disabled)}
                        </div>
                    </div>
                </div>
            </form>
        `;
    }

    /**
     * Renderiza información básica
     */
    renderBasicInfo(job, disabled) {
        return `
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Empresa *</label>
                        <input type="text" class="form-control" id="company_name" required ${disabled}
                               value="${job?.company_name || ''}" placeholder="Nombre de la empresa">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Cargo / Posición *</label>
                        <input type="text" class="form-control" id="position" required ${disabled}
                               value="${job?.position || ''}" placeholder="Ej: Gerente de Ventas">
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-4">
                    <div class="form-group">
                        <label>Fecha de Inicio *</label>
                        <input type="date" class="form-control" id="start_date" required ${disabled}
                               value="${job?.start_date || ''}">
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label>Fecha de Fin</label>
                        <input type="date" class="form-control" id="end_date" ${disabled}
                               value="${job?.end_date || ''}">
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-check mt-4 pt-2">
                        <input type="checkbox" class="form-check-input" id="currently_working" ${disabled}
                               ${job?.currently_working ? 'checked' : ''}
                               onchange="workHistoryManager.onCurrentlyWorkingChange()">
                        <label class="form-check-label" for="currently_working">
                            Trabajo aquí actualmente
                        </label>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Nombre del Supervisor</label>
                        <input type="text" class="form-control" id="supervisor_name" ${disabled}
                               value="${job?.supervisor_name || ''}">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Contacto del Supervisor</label>
                        <input type="text" class="form-control" id="supervisor_contact" ${disabled}
                               value="${job?.supervisor_contact || ''}" placeholder="Email o teléfono">
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>Responsabilidades</label>
                <textarea class="form-control" id="responsibilities" rows="3" ${disabled}
                          placeholder="Descripción de responsabilidades...">${job?.responsibilities || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Motivo de Salida</label>
                <textarea class="form-control" id="reason_for_leaving" rows="2" ${disabled}
                          placeholder="Motivo general...">${job?.reason_for_leaving || ''}</textarea>
            </div>
        `;
    }

    /**
     * Renderiza información de desvinculación
     */
    renderTerminationInfo(job, disabled) {
        return `
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Tipo de Desvinculación</label>
                        <select class="form-control" id="termination_type" ${disabled}>
                            <option value="">Seleccionar...</option>
                            <option value="renuncia_voluntaria" ${job?.termination_type === 'renuncia_voluntaria' ? 'selected' : ''}>Renuncia Voluntaria</option>
                            <option value="despido_con_causa" ${job?.termination_type === 'despido_con_causa' ? 'selected' : ''}>Despido con Causa</option>
                            <option value="despido_sin_causa" ${job?.termination_type === 'despido_sin_causa' ? 'selected' : ''}>Despido sin Causa</option>
                            <option value="jubilacion" ${job?.termination_type === 'jubilacion' ? 'selected' : ''}>Jubilación</option>
                            <option value="mutual_agreement" ${job?.termination_type === 'mutual_agreement' ? 'selected' : ''}>Acuerdo Mutuo</option>
                            <option value="fin_contrato" ${job?.termination_type === 'fin_contrato' ? 'selected' : ''}>Fin de Contrato</option>
                            <option value="abandono" ${job?.termination_type === 'abandono' ? 'selected' : ''}>Abandono de Trabajo</option>
                            <option value="fallecimiento" ${job?.termination_type === 'fallecimiento' ? 'selected' : ''}>Fallecimiento</option>
                            <option value="otro" ${job?.termination_type === 'otro' ? 'selected' : ''}>Otro</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Subcategoría</label>
                        <input type="text" class="form-control" id="termination_subcategory" ${disabled}
                               value="${job?.termination_subcategory || ''}" placeholder="Detalle específico">
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-4">
                    <div class="form-group">
                        <label>Fecha Efectiva de Desvinculación</label>
                        <input type="date" class="form-control" id="termination_date" ${disabled}
                               value="${job?.termination_date || ''}">
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label>Período de Preaviso (días)</label>
                        <input type="number" class="form-control" id="notice_period_days" ${disabled}
                               value="${job?.notice_period_days || ''}" min="0">
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-check mt-4 pt-2">
                        <input type="checkbox" class="form-check-input" id="notice_period_completed" ${disabled}
                               ${job?.notice_period_completed !== false ? 'checked' : ''}>
                        <label class="form-check-label" for="notice_period_completed">
                            Preaviso completado
                        </label>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>Notas del Preaviso</label>
                <textarea class="form-control" id="notice_period_notes" rows="2" ${disabled}>${job?.notice_period_notes || ''}</textarea>
            </div>
        `;
    }

    /**
     * Renderiza información de indemnización
     */
    renderSeveranceInfo(job, disabled) {
        return `
            <div class="form-check mb-3">
                <input type="checkbox" class="form-check-input" id="received_severance" ${disabled}
                       ${job?.received_severance ? 'checked' : ''}
                       onchange="workHistoryManager.toggleSeveranceFields()">
                <label class="form-check-label" for="received_severance">
                    <strong>Recibió indemnización</strong>
                    <i class="fas fa-info-circle text-success ml-1" data-toggle="tooltip" data-placement="top"
                       title="💰 Indemnización por antigüedad: 1 mes de sueldo por cada año trabajado (Art. 245 LCT)"
                       style="cursor: help;"></i>
                </label>
                <small class="form-text text-muted ml-4">
                    📋 Incluye: Antigüedad, Preaviso, Vacaciones no gozadas, SAC proporcional
                </small>
            </div>
            <div id="severanceFields" style="${job?.received_severance ? '' : 'display:none;'}">
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label>Monto Total</label>
                            <input type="number" class="form-control" id="severance_amount" ${disabled}
                                   value="${job?.severance_amount || ''}" step="0.01" min="0">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label>Moneda</label>
                            <select class="form-control" id="severance_currency" ${disabled}>
                                <option value="ARS" ${job?.severance_currency === 'ARS' || !job ? 'selected' : ''}>ARS (Pesos Argentinos)</option>
                                <option value="USD" ${job?.severance_currency === 'USD' ? 'selected' : ''}>USD (Dólares)</option>
                                <option value="EUR" ${job?.severance_currency === 'EUR' ? 'selected' : ''}>EUR (Euros)</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label>Fecha de Pago</label>
                            <input type="date" class="form-control" id="severance_payment_date" ${disabled}
                                   value="${job?.severance_payment_date || ''}">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Método de Pago</label>
                            <select class="form-control" id="severance_payment_method" ${disabled}>
                                <option value="">Seleccionar...</option>
                                <option value="transferencia" ${job?.severance_payment_method === 'transferencia' ? 'selected' : ''}>Transferencia Bancaria</option>
                                <option value="cheque" ${job?.severance_payment_method === 'cheque' ? 'selected' : ''}>Cheque</option>
                                <option value="efectivo" ${job?.severance_payment_method === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                                <option value="compensacion" ${job?.severance_payment_method === 'compensacion' ? 'selected' : ''}>Compensación</option>
                                <option value="otro" ${job?.severance_payment_method === 'otro' ? 'selected' : ''}>Otro</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Recibo de Liquidación (URL)</label>
                            <input type="url" class="form-control" id="severance_receipt_url" ${disabled}
                                   value="${job?.severance_receipt_url || ''}" placeholder="https://...">
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>Desglose de Conceptos (JSON)</label>
                    <textarea class="form-control" id="severance_breakdown" rows="3" ${disabled}
                              placeholder='{"antiguedad": 15000, "preaviso": 8000, "vacaciones": 3000}'>${job?.severance_breakdown ? JSON.stringify(job.severance_breakdown, null, 2) : ''}</textarea>
                    <small class="form-text text-muted">
                        Formato JSON: {"concepto": monto, ...}
                    </small>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza información de acuerdos extrajudiciales
     */
    renderSettlementInfo(job, disabled) {
        return `
            <div class="form-check mb-3">
                <input type="checkbox" class="form-check-input" id="has_settlement_agreement" ${disabled}
                       ${job?.has_settlement_agreement ? 'checked' : ''}
                       onchange="workHistoryManager.toggleSettlementFields()">
                <label class="form-check-label" for="has_settlement_agreement">
                    <strong>Hubo acuerdo extrajudicial</strong>
                    <i class="fas fa-info-circle text-info ml-1" data-toggle="tooltip" data-placement="top"
                       title="📝 Acuerdo firmado fuera de juicio. Tipos: Conciliatorio (SECLO), Transaccional, Homologación Ministerial, Privado"
                       style="cursor: help;"></i>
                </label>
                <small class="form-text text-muted ml-4">
                    ⚖️ Homologación por SECLO (Art. 15 Ley 24.635) da validez legal al acuerdo
                </small>
            </div>
            <div id="settlementFields" style="${job?.has_settlement_agreement ? '' : 'display:none;'}">
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Tipo de Acuerdo</label>
                            <select class="form-control" id="settlement_type" ${disabled}>
                                <option value="">Seleccionar...</option>
                                <option value="conciliatorio" ${job?.settlement_type === 'conciliatorio' ? 'selected' : ''}>Conciliatorio</option>
                                <option value="transaccional" ${job?.settlement_type === 'transaccional' ? 'selected' : ''}>Transaccional</option>
                                <option value="homologacion_ministerial" ${job?.settlement_type === 'homologacion_ministerial' ? 'selected' : ''}>Homologación Ministerial</option>
                                <option value="privado" ${job?.settlement_type === 'privado' ? 'selected' : ''}>Privado</option>
                                <option value="otro" ${job?.settlement_type === 'otro' ? 'selected' : ''}>Otro</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Fecha del Acuerdo</label>
                            <input type="date" class="form-control" id="settlement_date" ${disabled}
                                   value="${job?.settlement_date || ''}">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label>Monto del Acuerdo</label>
                            <input type="number" class="form-control" id="settlement_amount" ${disabled}
                                   value="${job?.settlement_amount || ''}" step="0.01" min="0">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label>Organismo Homologador</label>
                            <input type="text" class="form-control" id="settlement_authority" ${disabled}
                                   value="${job?.settlement_authority || ''}" placeholder="Ej: Ministerio de Trabajo">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label>Nº Expediente</label>
                            <input type="text" class="form-control" id="settlement_file_number" ${disabled}
                                   value="${job?.settlement_file_number || ''}">
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>Términos del Acuerdo</label>
                    <textarea class="form-control" id="settlement_terms" rows="3" ${disabled}>${job?.settlement_terms || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Documento del Acuerdo (URL)</label>
                    <input type="url" class="form-control" id="settlement_document_url" ${disabled}
                           value="${job?.settlement_document_url || ''}" placeholder="https://...">
                </div>
            </div>
        `;
    }

    /**
     * Renderiza información de litigios
     */
    renderLitigationInfo(job, disabled) {
        return `
            <div class="form-check mb-3">
                <input type="checkbox" class="form-check-input" id="has_litigation" ${disabled}
                       ${job?.has_litigation ? 'checked' : ''}
                       onchange="workHistoryManager.toggleLitigationFields()">
                <label class="form-check-label" for="has_litigation">
                    <strong>Hubo litigio judicial</strong>
                    <i class="fas fa-info-circle text-danger ml-1" data-toggle="tooltip" data-placement="top"
                       title="🚨 CRÍTICO: Demanda judicial laboral. Notificación automática urgente a Legal, CFO, ART y CEO"
                       style="cursor: help;"></i>
                </label>
                <small class="form-text text-muted ml-4">
                    ⚠️ Litigio activo dispara alertas de alto impacto con reporte a directorio
                </small>
            </div>
            <div id="litigationFields" style="${job?.has_litigation ? '' : 'display:none;'}">
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Estado del Litigio</label>
                            <select class="form-control" id="litigation_status" ${disabled}>
                                <option value="">Seleccionar...</option>
                                <option value="en_tramite" ${job?.litigation_status === 'en_tramite' ? 'selected' : ''}>En Trámite</option>
                                <option value="mediacion" ${job?.litigation_status === 'mediacion' ? 'selected' : ''}>Mediación</option>
                                <option value="conciliacion" ${job?.litigation_status === 'conciliacion' ? 'selected' : ''}>Conciliación</option>
                                <option value="sentencia_favorable" ${job?.litigation_status === 'sentencia_favorable' ? 'selected' : ''}>Sentencia Favorable</option>
                                <option value="sentencia_desfavorable" ${job?.litigation_status === 'sentencia_desfavorable' ? 'selected' : ''}>Sentencia Desfavorable</option>
                                <option value="apelacion" ${job?.litigation_status === 'apelacion' ? 'selected' : ''}>Apelación</option>
                                <option value="finalizado" ${job?.litigation_status === 'finalizado' ? 'selected' : ''}>Finalizado</option>
                                <option value="desistido" ${job?.litigation_status === 'desistido' ? 'selected' : ''}>Desistido</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label>Fecha Inicio Litigio</label>
                            <input type="date" class="form-control" id="litigation_start_date" ${disabled}
                                   value="${job?.litigation_start_date || ''}">
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label>Fecha Fin/Sentencia</label>
                            <input type="date" class="form-control" id="litigation_end_date" ${disabled}
                                   value="${job?.litigation_end_date || ''}">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Juzgado/Tribunal</label>
                            <input type="text" class="form-control" id="litigation_court" ${disabled}
                                   value="${job?.litigation_court || ''}" placeholder="Ej: Juzgado Laboral Nº 12">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Nº Expediente Judicial</label>
                            <input type="text" class="form-control" id="litigation_case_number" ${disabled}
                                   value="${job?.litigation_case_number || ''}">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div class="form-group">
                            <label>Materia del Reclamo</label>
                            <input type="text" class="form-control" id="litigation_subject" ${disabled}
                                   value="${job?.litigation_subject || ''}"
                                   placeholder="Ej: Despido arbitrario, Diferencias salariales">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Monto Reclamado</label>
                            <input type="number" class="form-control" id="litigation_claimed_amount" ${disabled}
                                   value="${job?.litigation_claimed_amount || ''}" step="0.01" min="0">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Monto de la Sentencia</label>
                            <input type="number" class="form-control" id="litigation_awarded_amount" ${disabled}
                                   value="${job?.litigation_awarded_amount || ''}" step="0.01" min="0">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Representante Legal de la Empresa</label>
                            <input type="text" class="form-control" id="company_legal_representative" ${disabled}
                                   value="${job?.company_legal_representative || ''}"
                                   placeholder="Estudio jurídico o abogado">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Representante Legal del Empleado</label>
                            <input type="text" class="form-control" id="employee_legal_representative" ${disabled}
                                   value="${job?.employee_legal_representative || ''}">
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>Resumen del Resultado</label>
                    <textarea class="form-control" id="litigation_outcome_summary" rows="4" ${disabled}>${job?.litigation_outcome_summary || ''}</textarea>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza documentación y notas
     */
    renderDocumentationAndNotes(job, disabled) {
        return `
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Telegrama Despido / Carta Renuncia (URL)</label>
                        <input type="url" class="form-control" id="termination_letter_url" ${disabled}
                               value="${job?.termination_letter_url || ''}" placeholder="https://...">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Certificado de Trabajo (URL)</label>
                        <input type="url" class="form-control" id="work_certificate_url" ${disabled}
                               value="${job?.work_certificate_url || ''}" placeholder="https://...">
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Certificación de Haberes (URL)</label>
                        <input type="url" class="form-control" id="salary_certification_url" ${disabled}
                               value="${job?.salary_certification_url || ''}" placeholder="https://...">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Carta de Recomendación (URL)</label>
                        <input type="url" class="form-control" id="recommendation_letter_url" ${disabled}
                               value="${job?.recommendation_letter_url || ''}" placeholder="https://...">
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>Documentos Adicionales (JSON Array)</label>
                <textarea class="form-control" id="additional_documents" rows="3" ${disabled}
                          placeholder='[{"name": "Acta notarial", "url": "..."}, ...]'>${job?.additional_documents ? JSON.stringify(job.additional_documents, null, 2) : ''}</textarea>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="form-check mb-3">
                        <input type="checkbox" class="form-check-input" id="eligible_for_rehire" ${disabled}
                               ${job?.eligible_for_rehire !== false ? 'checked' : ''}>
                        <label class="form-check-label" for="eligible_for_rehire">
                            Elegible para recontratación
                            <i class="fas fa-info-circle text-info ml-1" data-toggle="tooltip" data-placement="top"
                               title="✅ Marca si el ex-empleado puede ser recontratado en el futuro. Útil para referencias internas"
                               style="cursor: help;"></i>
                        </label>
                        <small class="form-text text-muted d-block ml-4">
                            💼 Si NO es elegible, especifique el motivo abajo
                        </small>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-check mb-3">
                        <input type="checkbox" class="form-check-input" id="recommendation_letter_sent" ${disabled}
                               ${job?.recommendation_letter_sent ? 'checked' : ''}>
                        <label class="form-check-label" for="recommendation_letter_sent">
                            Carta de recomendación enviada
                        </label>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>Razón de No Elegibilidad para Recontratación</label>
                <textarea class="form-control" id="rehire_ineligibility_reason" rows="2" ${disabled}>${job?.rehire_ineligibility_reason || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Notas Internas (Confidenciales)</label>
                <textarea class="form-control" id="internal_notes" rows="4" ${disabled}
                          placeholder="Notas internas de RRHH...">${job?.internal_notes || ''}</textarea>
                <small class="form-text text-muted">
                    Estas notas son confidenciales y solo visibles para RRHH
                </small>
            </div>
        `;
    }

    /**
     * Inicializa interacciones del formulario
     */
    initFormInteractions() {
        this.onCurrentlyWorkingChange();
        this.toggleSeveranceFields();
        this.toggleSettlementFields();
        this.toggleLitigationFields();
    }

    /**
     * Maneja cambio de "Trabajo actualmente"
     */
    onCurrentlyWorkingChange() {
        const isCurrently = document.getElementById('currently_working')?.checked;
        const terminationSection = document.getElementById('terminationSection');

        if (isCurrently) {
            terminationSection.style.display = 'none';
            document.getElementById('end_date').value = '';
        } else {
            terminationSection.style.display = 'block';
        }
    }

    /**
     * Toggle campos de indemnización
     */
    toggleSeveranceFields() {
        const hasSeverance = document.getElementById('received_severance')?.checked;
        const fields = document.getElementById('severanceFields');
        if (fields) {
            fields.style.display = hasSeverance ? 'block' : 'none';
        }
    }

    /**
     * Toggle campos de acuerdo extrajudicial
     */
    toggleSettlementFields() {
        const hasSettlement = document.getElementById('has_settlement_agreement')?.checked;
        const fields = document.getElementById('settlementFields');
        if (fields) {
            fields.style.display = hasSettlement ? 'block' : 'none';
        }
    }

    /**
     * Toggle campos de litigio
     */
    toggleLitigationFields() {
        const hasLitigation = document.getElementById('has_litigation')?.checked;
        const fields = document.getElementById('litigationFields');
        if (fields) {
            fields.style.display = hasLitigation ? 'block' : 'none';
        }
    }

    /**
     * Guarda la experiencia laboral
     */
    async saveJob() {
        try {
            // Recopilar todos los datos del formulario
            const formData = {
                user_id: this.currentUserId,
                company_id: this.currentCompanyId,
                company_name: document.getElementById('company_name').value,
                position: document.getElementById('position').value,
                start_date: document.getElementById('start_date').value,
                end_date: document.getElementById('end_date').value || null,
                currently_working: document.getElementById('currently_working').checked,
                supervisor_name: document.getElementById('supervisor_name').value || null,
                supervisor_contact: document.getElementById('supervisor_contact').value || null,
                responsibilities: document.getElementById('responsibilities').value || null,
                reason_for_leaving: document.getElementById('reason_for_leaving').value || null,

                // Desvinculación
                termination_type: document.getElementById('termination_type').value || null,
                termination_subcategory: document.getElementById('termination_subcategory').value || null,
                termination_date: document.getElementById('termination_date').value || null,
                notice_period_days: parseInt(document.getElementById('notice_period_days').value) || null,
                notice_period_completed: document.getElementById('notice_period_completed').checked,
                notice_period_notes: document.getElementById('notice_period_notes').value || null,

                // Indemnización
                received_severance: document.getElementById('received_severance').checked,
                severance_amount: parseFloat(document.getElementById('severance_amount').value) || null,
                severance_currency: document.getElementById('severance_currency').value,
                severance_payment_date: document.getElementById('severance_payment_date').value || null,
                severance_payment_method: document.getElementById('severance_payment_method').value || null,
                severance_breakdown: this.parseJSON(document.getElementById('severance_breakdown').value),
                severance_receipt_url: document.getElementById('severance_receipt_url').value || null,

                // Acuerdos
                has_settlement_agreement: document.getElementById('has_settlement_agreement').checked,
                settlement_date: document.getElementById('settlement_date').value || null,
                settlement_type: document.getElementById('settlement_type').value || null,
                settlement_amount: parseFloat(document.getElementById('settlement_amount').value) || null,
                settlement_terms: document.getElementById('settlement_terms').value || null,
                settlement_document_url: document.getElementById('settlement_document_url').value || null,
                settlement_authority: document.getElementById('settlement_authority').value || null,
                settlement_file_number: document.getElementById('settlement_file_number').value || null,

                // Litigios
                has_litigation: document.getElementById('has_litigation').checked,
                litigation_status: document.getElementById('litigation_status').value || null,
                litigation_start_date: document.getElementById('litigation_start_date').value || null,
                litigation_end_date: document.getElementById('litigation_end_date').value || null,
                litigation_court: document.getElementById('litigation_court').value || null,
                litigation_case_number: document.getElementById('litigation_case_number').value || null,
                litigation_subject: document.getElementById('litigation_subject').value || null,
                litigation_claimed_amount: parseFloat(document.getElementById('litigation_claimed_amount').value) || null,
                litigation_awarded_amount: parseFloat(document.getElementById('litigation_awarded_amount').value) || null,
                litigation_outcome_summary: document.getElementById('litigation_outcome_summary').value || null,
                company_legal_representative: document.getElementById('company_legal_representative').value || null,
                employee_legal_representative: document.getElementById('employee_legal_representative').value || null,

                // Documentación
                termination_letter_url: document.getElementById('termination_letter_url').value || null,
                work_certificate_url: document.getElementById('work_certificate_url').value || null,
                salary_certification_url: document.getElementById('salary_certification_url').value || null,
                recommendation_letter_url: document.getElementById('recommendation_letter_url').value || null,
                additional_documents: this.parseJSON(document.getElementById('additional_documents').value),

                // Notas
                eligible_for_rehire: document.getElementById('eligible_for_rehire').checked,
                recommendation_letter_sent: document.getElementById('recommendation_letter_sent').checked,
                rehire_ineligibility_reason: document.getElementById('rehire_ineligibility_reason').value || null,
                internal_notes: document.getElementById('internal_notes').value || null
            };

            // Validaciones
            if (!formData.company_name || !formData.position || !formData.start_date) {
                this.showNotification('Debe completar los campos obligatorios', 'warning');
                return;
            }

            const token = localStorage.getItem('token');
            const url = this.editingHistoryId
                ? `/api/v1/users/${this.currentUserId}/work-history/${this.editingHistoryId}`
                : `/api/v1/users/${this.currentUserId}/work-history`;

            const method = this.editingHistoryId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Error al guardar experiencia laboral');
            }

            $('#workHistoryModal').modal('hide');
            this.showNotification(
                this.editingHistoryId ? 'Experiencia actualizada correctamente' : 'Experiencia agregada correctamente',
                'success'
            );

            await this.loadWorkHistory();

        } catch (error) {
            console.error('❌ Error guardando experiencia laboral:', error);
            this.showNotification('Error al guardar experiencia laboral', 'error');
        }
    }

    /**
     * Elimina una experiencia laboral
     */
    async deleteJob(jobId) {
        if (!confirm('¿Está seguro de eliminar esta experiencia laboral?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/v1/users/${this.currentUserId}/work-history/${jobId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al eliminar experiencia');
            }

            this.showNotification('Experiencia eliminada correctamente', 'success');
            await this.loadWorkHistory();

        } catch (error) {
            console.error('❌ Error eliminando experiencia:', error);
            this.showNotification('Error al eliminar experiencia', 'error');
        }
    }

    /**
     * Parse seguro de JSON
     */
    parseJSON(str) {
        if (!str) return null;
        try {
            return JSON.parse(str);
        } catch (e) {
            return null;
        }
    }

    /**
     * Obtiene etiqueta de tipo de desvinculación
     */
    getTerminationTypeLabel(type) {
        const labels = {
            'renuncia_voluntaria': 'Renuncia',
            'despido_con_causa': 'Despido c/Causa',
            'despido_sin_causa': 'Despido s/Causa',
            'jubilacion': 'Jubilación',
            'mutual_agreement': 'Acuerdo Mutuo',
            'fin_contrato': 'Fin Contrato',
            'abandono': 'Abandono',
            'fallecimiento': 'Fallecimiento',
            'otro': 'Otro'
        };
        return labels[type] || type;
    }

    /**
     * Obtiene etiqueta de estado de litigio
     */
    getLitigationStatusLabel(status) {
        const labels = {
            'en_tramite': 'En Trámite',
            'mediacion': 'Mediación',
            'conciliacion': 'Conciliación',
            'sentencia_favorable': 'Favorable',
            'sentencia_desfavorable': 'Desfavorable',
            'apelacion': 'Apelación',
            'finalizado': 'Finalizado',
            'desistido': 'Desistido'
        };
        return labels[status] || status;
    }

    /**
     * Bind de eventos
     */
    bindEvents() {
        // Eventos adicionales
    }

    /**
     * Muestra notificación
     */
    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);

        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else {
            alert(message);
        }
    }
}

// Crear instancia global
const workHistoryManager = new WorkHistoryManager();
