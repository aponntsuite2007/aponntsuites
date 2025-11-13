/**
 * ========================================================================
 * MÓDULO: Gestor de Exámenes Médicos Ocupacionales
 * ========================================================================
 * Gestión completa de exámenes médicos con periodicidad configurable
 * Integrado con sistema de notificaciones automáticas
 * ========================================================================
 */

class MedicalExamsManager {
    constructor() {
        this.exams = [];
        this.currentUserId = null;
        this.currentCompanyId = null;
        this.editingExamId = null;

        console.log('🏥 [MEDICAL-EXAMS] Inicializando gestor de exámenes médicos...');
    }

    /**
     * Inicializa el módulo
     */
    async init(userId, companyId) {
        this.currentUserId = userId;
        this.currentCompanyId = companyId;

        await this.loadExams();
        this.bindEvents();

        console.log(`🏥 [MEDICAL-EXAMS] Inicializado para usuario ${userId}`);
    }

    /**
     * Carga exámenes médicos del usuario
     */
    async loadExams() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/v1/users/${this.currentUserId}/medical-exams`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar exámenes médicos');
            }

            this.exams = await response.json();
            this.renderExamsTable();

        } catch (error) {
            console.error('❌ Error cargando exámenes médicos:', error);
            this.showNotification('Error al cargar exámenes médicos', 'error');
        }
    }

    /**
     * Renderiza la tabla de exámenes
     */
    renderExamsTable() {
        const container = document.getElementById('medical-exams-list');
        if (!container) return;

        if (this.exams.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-notes-medical fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No hay exámenes médicos registrados</p>
                    <button class="btn btn-primary btn-sm" onclick="medicalExamsManager.showAddModal()">
                        <i class="fas fa-plus"></i> Agregar Examen
                    </button>
                </div>
            `;
            return;
        }

        const now = new Date();

        const html = `
            <div class="mb-3">
                <button class="btn btn-primary btn-sm" onclick="medicalExamsManager.showAddModal()">
                    <i class="fas fa-plus"></i> Agregar Examen
                </button>
            </div>
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Fecha Examen</th>
                            <th>Resultado</th>
                            <th>Próximo Examen</th>
                            <th>Periodicidad</th>
                            <th>Centro Médico</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.exams.map(exam => {
                            const nextExamDate = exam.next_exam_date ? new Date(exam.next_exam_date) : null;
                            const daysUntilNext = nextExamDate ?
                                Math.ceil((nextExamDate - now) / (1000 * 60 * 60 * 24)) : null;

                            let statusBadge = '<span class="badge badge-secondary">N/A</span>';
                            if (nextExamDate) {
                                if (daysUntilNext < 0) {
                                    statusBadge = '<span class="badge badge-danger">Vencido</span>';
                                } else if (daysUntilNext <= 7) {
                                    statusBadge = '<span class="badge badge-danger">Urgente</span>';
                                } else if (daysUntilNext <= 30) {
                                    statusBadge = '<span class="badge badge-warning">Próximo</span>';
                                } else {
                                    statusBadge = '<span class="badge badge-success">Al día</span>';
                                }
                            }

                            const resultBadge = this.getResultBadge(exam.result);

                            return `
                                <tr>
                                    <td>${this.getExamTypeLabel(exam.exam_type)}</td>
                                    <td>${new Date(exam.exam_date).toLocaleDateString('es-AR')}</td>
                                    <td>${resultBadge}</td>
                                    <td>
                                        ${nextExamDate ? new Date(nextExamDate).toLocaleDateString('es-AR') : 'N/A'}
                                        ${daysUntilNext !== null && daysUntilNext >= 0 ?
                                            `<br><small class="text-muted">(${daysUntilNext} días)</small>` : ''}
                                    </td>
                                    <td>${this.getFrequencyLabel(exam.exam_frequency)}</td>
                                    <td>${exam.medical_center || 'N/A'}</td>
                                    <td>${statusBadge}</td>
                                    <td>
                                        <button class="btn btn-sm btn-info" onclick="medicalExamsManager.editExam(${exam.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        ${exam.certificate_url ? `
                                            <a href="${exam.certificate_url}" target="_blank" class="btn btn-sm btn-secondary" title="Ver certificado">
                                                <i class="fas fa-file-medical"></i>
                                            </a>
                                        ` : ''}
                                        <button class="btn btn-sm btn-danger" onclick="medicalExamsManager.deleteExam(${exam.id})" title="Eliminar">
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
     * Muestra modal para agregar examen
     */
    showAddModal() {
        this.editingExamId = null;
        this.showExamModal();
    }

    /**
     * Edita un examen existente
     */
    editExam(examId) {
        this.editingExamId = examId;
        const exam = this.exams.find(e => e.id === examId);
        this.showExamModal(exam);
    }

    /**
     * Muestra el modal de examen
     */
    showExamModal(exam = null) {
        const isEdit = exam !== null;

        const modalHtml = `
            <div class="modal fade" id="medicalExamModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-notes-medical"></i>
                                ${isEdit ? 'Editar Examen Médico' : 'Registrar Examen Médico'}
                            </h5>
                            <button type="button" class="close text-white" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="medicalExamForm">
                                <!-- Tipo y Fecha -->
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label>
                                                Tipo de Examen *
                                                <i class="fas fa-info-circle text-info ml-1" data-toggle="tooltip" data-placement="top"
                                                   title="📋 Tipos legales: Preocupacional (antes de contratar), Periódico (según riesgo: bajo=anual, medio=semestral, alto=mensual), Reingreso (después ausencia prolongada), Retiro (al desvincularse), Especial (por exposición a riesgos)"
                                                   style="cursor: help;"></i>
                                            </label>
                                            <select class="form-control" id="exam_type" required onchange="medicalExamsManager.onExamTypeChange()">
                                                <option value="">Seleccionar...</option>
                                                <option value="preocupacional" ${exam?.exam_type === 'preocupacional' ? 'selected' : ''}>Preocupacional</option>
                                                <option value="periodico" ${exam?.exam_type === 'periodico' ? 'selected' : ''}>Periódico</option>
                                                <option value="reingreso" ${exam?.exam_type === 'reingreso' ? 'selected' : ''}>Reingreso</option>
                                                <option value="retiro" ${exam?.exam_type === 'retiro' ? 'selected' : ''}>Retiro</option>
                                                <option value="especial" ${exam?.exam_type === 'especial' ? 'selected' : ''}>Especial</option>
                                            </select>
                                            <small class="form-text text-muted">
                                                ⚕️ Solo los exámenes periódicos tienen renovación automática (Ley 24.557 - Art. 9)
                                            </small>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label>Fecha del Examen *</label>
                                            <input type="date" class="form-control" id="exam_date" required
                                                   value="${exam?.exam_date || ''}" max="${new Date().toISOString().split('T')[0]}">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label>
                                                Resultado *
                                                <i class="fas fa-info-circle text-warning ml-1" data-toggle="tooltip" data-placement="top"
                                                   title="⚠️ CRÍTICO: Si marca 'No Apto', se activará proceso legal de inaptitud laboral con notificación inmediata a RRHH, Legal y ART"
                                                   style="cursor: help;"></i>
                                            </label>
                                            <select class="form-control" id="result" required>
                                                <option value="">Seleccionar...</option>
                                                <option value="apto" ${exam?.result === 'apto' ? 'selected' : ''}>Apto</option>
                                                <option value="apto_con_observaciones" ${exam?.result === 'apto_con_observaciones' ? 'selected' : ''}>Apto con Observaciones</option>
                                                <option value="no_apto" ${exam?.result === 'no_apto' ? 'selected' : ''}>No Apto</option>
                                                <option value="pendiente" ${exam?.result === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                                            </select>
                                            <small class="form-text text-muted">
                                                🚨 'No Apto' dispara workflow legal automático (art. 43 LCT)
                                            </small>
                                        </div>
                                    </div>
                                </div>

                                <!-- Periodicidad (solo para exámenes periódicos) -->
                                <div class="row" id="frequencySection" style="display:none;">
                                    <div class="col-12">
                                        <div class="card border-info mb-3">
                                            <div class="card-header bg-info text-white">
                                                <i class="fas fa-calendar-alt"></i> Configuración de Periodicidad
                                            </div>
                                            <div class="card-body">
                                                <div class="row">
                                                    <div class="col-md-6">
                                                        <div class="form-group">
                                                            <label>
                                                                Periodicidad del Examen
                                                                <i class="fas fa-info-circle text-info ml-1" data-toggle="tooltip" data-placement="top"
                                                                   title="📅 Frecuencia según nivel de riesgo: Alto=Mensual, Medio=Semestral, Bajo=Anual. Configurable según Ley 24.557"
                                                                   style="cursor: help;"></i>
                                                            </label>
                                                            <select class="form-control" id="exam_frequency" onchange="medicalExamsManager.onFrequencyChange()">
                                                                <option value="">Sin periodicidad</option>
                                                                <option value="mensual" ${exam?.exam_frequency === 'mensual' ? 'selected' : ''}>Mensual</option>
                                                                <option value="trimestral" ${exam?.exam_frequency === 'trimestral' ? 'selected' : ''}>Trimestral</option>
                                                                <option value="semestral" ${exam?.exam_frequency === 'semestral' ? 'selected' : ''}>Semestral</option>
                                                                <option value="anual" ${exam?.exam_frequency === 'anual' ? 'selected' : ''}>Anual</option>
                                                                <option value="bienal" ${exam?.exam_frequency === 'bienal' ? 'selected' : ''}>Bienal (cada 2 años)</option>
                                                                <option value="personalizado" ${exam?.exam_frequency === 'personalizado' ? 'selected' : ''}>Personalizado</option>
                                                            </select>
                                                            <small class="form-text text-muted">
                                                                💡 El sistema calculará automáticamente la próxima fecha según periodicidad
                                                            </small>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6" id="customFrequencySection" style="display:none;">
                                                        <div class="form-group">
                                                            <label>Meses Personalizados</label>
                                                            <input type="number" class="form-control" id="frequency_months"
                                                                   min="1" max="120" value="${exam?.frequency_months || 12}"
                                                                   placeholder="Ej: 18 (año y medio)">
                                                            <small class="form-text text-muted">
                                                                Entre 1 y 120 meses (10 años)
                                                            </small>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="row">
                                                    <div class="col-md-6">
                                                        <div class="form-check">
                                                            <input type="checkbox" class="form-check-input" id="auto_calculate_next_exam"
                                                                   ${exam?.auto_calculate_next_exam !== false ? 'checked' : ''}>
                                                            <label class="form-check-label" for="auto_calculate_next_exam">
                                                                Calcular automáticamente fecha del próximo examen
                                                                <i class="fas fa-info-circle text-success ml-1" data-toggle="tooltip" data-placement="top"
                                                                   title="✅ Activado: El sistema calcula automáticamente según periodicidad seleccionada"
                                                                   style="cursor: help;"></i>
                                                            </label>
                                                            <small class="form-text text-muted d-block mt-1">
                                                                🔔 Notificación automática 30 días antes del próximo examen (scheduler diario 11:00 AM)
                                                            </small>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="form-group">
                                                            <label>Próximo Examen (manual)</label>
                                                            <input type="date" class="form-control" id="next_exam_date"
                                                                   value="${exam?.next_exam_date || ''}">
                                                            <small class="form-text text-muted">
                                                                Solo si el cálculo automático está desactivado
                                                            </small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Centro Médico y Doctor -->
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Centro Médico</label>
                                            <input type="text" class="form-control" id="medical_center"
                                                   value="${exam?.medical_center || ''}"
                                                   placeholder="Ej: Clínica Santa María">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Médico Examinador</label>
                                            <input type="text" class="form-control" id="examining_doctor"
                                                   value="${exam?.examining_doctor || ''}"
                                                   placeholder="Dr./Dra. ...">
                                        </div>
                                    </div>
                                </div>

                                <!-- Observaciones y Certificado -->
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Observaciones</label>
                                            <textarea class="form-control" id="observations" rows="4"
                                                      placeholder="Observaciones del examen médico...">${exam?.observations || ''}</textarea>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Certificado Médico (URL)</label>
                                            <input type="url" class="form-control" id="certificate_url"
                                                   value="${exam?.certificate_url || ''}"
                                                   placeholder="https://...">
                                            <small class="form-text text-muted mb-3">
                                                URL del certificado escaneado
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="medicalExamsManager.saveExam()">
                                <i class="fas fa-save"></i> Guardar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior
        $('#medicalExamModal').remove();

        // Agregar y mostrar
        $('body').append(modalHtml);
        $('#medicalExamModal').modal('show');

        // Inicializar estado de secciones condicionales y tooltips
        setTimeout(() => {
            this.onExamTypeChange();
            this.onFrequencyChange();
            $('[data-toggle="tooltip"]').tooltip();
        }, 100);
    }

    /**
     * Maneja cambio de tipo de examen
     */
    onExamTypeChange() {
        const examType = document.getElementById('exam_type')?.value;
        const frequencySection = document.getElementById('frequencySection');

        if (examType === 'periodico') {
            frequencySection.style.display = 'block';
        } else {
            frequencySection.style.display = 'none';
        }
    }

    /**
     * Maneja cambio de frecuencia
     */
    onFrequencyChange() {
        const frequency = document.getElementById('exam_frequency')?.value;
        const customSection = document.getElementById('customFrequencySection');

        if (frequency === 'personalizado') {
            customSection.style.display = 'block';
        } else {
            customSection.style.display = 'none';
        }
    }

    /**
     * Guarda el examen
     */
    async saveExam() {
        try {
            const formData = {
                user_id: this.currentUserId,
                company_id: this.currentCompanyId,
                exam_type: document.getElementById('exam_type').value,
                exam_date: document.getElementById('exam_date').value,
                result: document.getElementById('result').value,
                medical_center: document.getElementById('medical_center').value || null,
                examining_doctor: document.getElementById('examining_doctor').value || null,
                observations: document.getElementById('observations').value || null,
                certificate_url: document.getElementById('certificate_url').value || null
            };

            // Solo agregar campos de periodicidad si es examen periódico
            if (formData.exam_type === 'periodico') {
                formData.exam_frequency = document.getElementById('exam_frequency').value || null;
                formData.auto_calculate_next_exam = document.getElementById('auto_calculate_next_exam').checked;

                if (formData.exam_frequency === 'personalizado') {
                    formData.frequency_months = parseInt(document.getElementById('frequency_months').value) || null;
                }

                if (!formData.auto_calculate_next_exam) {
                    formData.next_exam_date = document.getElementById('next_exam_date').value || null;
                }
            }

            // Validaciones
            if (!formData.exam_type || !formData.exam_date || !formData.result) {
                this.showNotification('Debe completar todos los campos obligatorios', 'warning');
                return;
            }

            const token = localStorage.getItem('token');
            const url = this.editingExamId
                ? `/api/v1/users/${this.currentUserId}/medical-exams/${this.editingExamId}`
                : `/api/v1/users/${this.currentUserId}/medical-exams`;

            const method = this.editingExamId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Error al guardar examen');
            }

            $('#medicalExamModal').modal('hide');
            this.showNotification(
                this.editingExamId ? 'Examen actualizado correctamente' : 'Examen registrado correctamente',
                'success'
            );

            await this.loadExams();

        } catch (error) {
            console.error('❌ Error guardando examen:', error);
            this.showNotification('Error al guardar examen', 'error');
        }
    }

    /**
     * Elimina un examen
     */
    async deleteExam(examId) {
        if (!confirm('¿Está seguro de eliminar este examen médico?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/v1/users/${this.currentUserId}/medical-exams/${examId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al eliminar examen');
            }

            this.showNotification('Examen eliminado correctamente', 'success');
            await this.loadExams();

        } catch (error) {
            console.error('❌ Error eliminando examen:', error);
            this.showNotification('Error al eliminar examen', 'error');
        }
    }

    /**
     * Obtiene etiqueta del tipo de examen
     */
    getExamTypeLabel(type) {
        const labels = {
            'preocupacional': 'Preocupacional',
            'periodico': 'Periódico',
            'reingreso': 'Reingreso',
            'retiro': 'Retiro',
            'especial': 'Especial'
        };
        return labels[type] || type;
    }

    /**
     * Obtiene etiqueta de frecuencia
     */
    getFrequencyLabel(frequency) {
        const labels = {
            'mensual': 'Mensual',
            'trimestral': 'Trimestral',
            'semestral': 'Semestral',
            'anual': 'Anual',
            'bienal': 'Bienal',
            'personalizado': 'Personalizado'
        };
        return labels[frequency] || 'N/A';
    }

    /**
     * Obtiene badge de resultado
     */
    getResultBadge(result) {
        const badges = {
            'apto': '<span class="badge badge-success">Apto</span>',
            'apto_con_observaciones': '<span class="badge badge-warning">Apto c/Observ.</span>',
            'no_apto': '<span class="badge badge-danger">No Apto</span>',
            'pendiente': '<span class="badge badge-secondary">Pendiente</span>'
        };
        return badges[result] || '<span class="badge badge-secondary">N/A</span>';
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
const medicalExamsManager = new MedicalExamsManager();
