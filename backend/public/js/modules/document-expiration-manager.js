/**
 * ========================================================================
 * MÓDULO: Gestor de Documentos Vencibles
 * ========================================================================
 * Gestión completa de documentos personales con fechas de vencimiento
 * Integrado con el sistema de notificaciones automáticas
 * ========================================================================
 */

class DocumentExpirationManager {
    constructor() {
        this.documents = [];
        this.currentUserId = null;
        this.currentCompanyId = null;
        this.editingDocumentId = null;

        console.log('📄 [DOCUMENT-MANAGER] Inicializando gestor de documentos...');
    }

    /**
     * Inicializa el módulo para un usuario específico
     */
    async init(userId, companyId) {
        this.currentUserId = userId;
        this.currentCompanyId = companyId;

        await this.loadDocuments();
        this.bindEvents();

        console.log(`📄 [DOCUMENT-MANAGER] Inicializado para usuario ${userId}`);
    }

    /**
     * Carga documentos del usuario desde el servidor
     */
    async loadDocuments() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/v1/users/${this.currentUserId}/documents`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar documentos');
            }

            this.documents = await response.json();
            this.renderDocumentsTable();

        } catch (error) {
            console.error('❌ Error cargando documentos:', error);
            this.showNotification('Error al cargar documentos', 'error');
        }
    }

    /**
     * Renderiza la tabla de documentos
     */
    renderDocumentsTable() {
        const container = document.getElementById('user-documents-list');
        if (!container) return;

        if (this.documents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No hay documentos registrados</p>
                    <button class="btn btn-primary btn-sm" onclick="documentManager.showAddModal()">
                        <i class="fas fa-plus"></i> Agregar Documento
                    </button>
                </div>
            `;
            return;
        }

        const now = new Date();

        const html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Número</th>
                            <th>Fecha Emisión</th>
                            <th>Vencimiento</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.documents.map(doc => {
                            const expirationDate = doc.expiration_date ? new Date(doc.expiration_date) : null;
                            const daysUntilExpiration = expirationDate ?
                                Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24)) : null;

                            let statusBadge = '<span class="badge badge-secondary">Sin vencimiento</span>';
                            if (expirationDate) {
                                if (daysUntilExpiration < 0) {
                                    statusBadge = '<span class="badge badge-danger">Vencido</span>';
                                } else if (daysUntilExpiration <= 7) {
                                    statusBadge = '<span class="badge badge-danger">Vence pronto</span>';
                                } else if (daysUntilExpiration <= 30) {
                                    statusBadge = '<span class="badge badge-warning">Por vencer</span>';
                                } else {
                                    statusBadge = '<span class="badge badge-success">Vigente</span>';
                                }
                            }

                            return `
                                <tr>
                                    <td>${this.getDocumentTypeLabel(doc.document_type)}</td>
                                    <td>${doc.document_number || 'N/A'}</td>
                                    <td>${doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('es-AR') : 'N/A'}</td>
                                    <td>
                                        ${expirationDate ? new Date(expirationDate).toLocaleDateString('es-AR') : 'N/A'}
                                        ${daysUntilExpiration !== null && daysUntilExpiration >= 0 ?
                                            `<br><small class="text-muted">(${daysUntilExpiration} días)</small>` : ''}
                                    </td>
                                    <td>${statusBadge}</td>
                                    <td>
                                        <button class="btn btn-sm btn-info" onclick="documentManager.editDocument(${doc.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        ${doc.file_url ? `
                                            <a href="${doc.file_url}" target="_blank" class="btn btn-sm btn-secondary" title="Ver documento">
                                                <i class="fas fa-file-pdf"></i>
                                            </a>
                                        ` : ''}
                                        <button class="btn btn-sm btn-danger" onclick="documentManager.deleteDocument(${doc.id})" title="Eliminar">
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
     * Muestra modal para agregar documento
     */
    showAddModal() {
        this.editingDocumentId = null;
        this.showDocumentModal();
    }

    /**
     * Edita un documento existente
     */
    editDocument(documentId) {
        this.editingDocumentId = documentId;
        const doc = this.documents.find(d => d.id === documentId);
        this.showDocumentModal(doc);
    }

    /**
     * Muestra el modal de documento
     */
    showDocumentModal(document = null) {
        const isEdit = document !== null;

        const modalHtml = `
            <div class="modal fade" id="documentModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-file-alt"></i>
                                ${isEdit ? 'Editar Documento' : 'Agregar Documento'}
                            </h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="documentForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>
                                                Tipo de Documento *
                                                <i class="fas fa-info-circle text-info ml-1" data-toggle="tooltip" data-placement="top"
                                                   title="📋 Tipos: DNI (obligatorio para todos), Pasaporte (obligatorio si viaja), Licencia (obligatorio si conduce), Visa (obligatorio para extranjeros)"
                                                   style="cursor: help;"></i>
                                            </label>
                                            <select class="form-control" id="document_type" required>
                                                <option value="">Seleccionar...</option>
                                                <option value="dni" ${document?.document_type === 'dni' ? 'selected' : ''}>DNI</option>
                                                <option value="pasaporte" ${document?.document_type === 'pasaporte' ? 'selected' : ''}>Pasaporte</option>
                                                <option value="licencia_conducir" ${document?.document_type === 'licencia_conducir' ? 'selected' : ''}>Licencia de Conducir</option>
                                                <option value="visa" ${document?.document_type === 'visa' ? 'selected' : ''}>Visa de Trabajo</option>
                                                <option value="certificado_antecedentes" ${document?.document_type === 'certificado_antecedentes' ? 'selected' : ''}>Certificado de Antecedentes</option>
                                                <option value="otro" ${document?.document_type === 'otro' ? 'selected' : ''}>Otro</option>
                                            </select>
                                            <small class="form-text text-muted">
                                                💡 Seleccione el tipo de documento personal. Algunos son obligatorios según la función del empleado.
                                            </small>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Número de Documento</label>
                                            <input type="text" class="form-control" id="document_number"
                                                   value="${document?.document_number || ''}" placeholder="Ej: 12345678">
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Fecha de Emisión</label>
                                            <input type="date" class="form-control" id="issue_date"
                                                   value="${document?.issue_date || ''}">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>
                                                Fecha de Vencimiento
                                                <i class="fas fa-info-circle text-warning ml-1" data-toggle="tooltip" data-placement="top"
                                                   title="📅 Sistema notificará automáticamente 30 días antes del vencimiento"
                                                   style="cursor: help;"></i>
                                            </label>
                                            <input type="date" class="form-control" id="expiration_date"
                                                   value="${document?.expiration_date || ''}">
                                            <small class="form-text text-muted">
                                                🔔 Recibirá notificación automática 30 días antes del vencimiento (scheduler diario 10:00 AM)
                                            </small>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Autoridad Emisora</label>
                                            <input type="text" class="form-control" id="issuing_authority"
                                                   value="${document?.issuing_authority || ''}"
                                                   placeholder="Ej: Registro Civil">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Documento Escaneado (URL)</label>
                                            <input type="url" class="form-control" id="file_url"
                                                   value="${document?.file_url || ''}"
                                                   placeholder="https://...">
                                        </div>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>Notas</label>
                                    <textarea class="form-control" id="notes" rows="3"
                                              placeholder="Información adicional...">${document?.notes || ''}</textarea>
                                </div>

                                <div class="form-check mb-3">
                                    <input type="checkbox" class="form-check-input" id="is_verified"
                                           ${document?.is_verified ? 'checked' : ''}>
                                    <label class="form-check-label" for="is_verified">
                                        Documento verificado por RRHH
                                        <i class="fas fa-info-circle text-success ml-1" data-toggle="tooltip" data-placement="top"
                                           title="✅ Marcar cuando RRHH haya verificado físicamente el documento"
                                           style="cursor: help;"></i>
                                    </label>
                                    <small class="form-text text-muted ml-4">
                                        🔍 La verificación confirma que RRHH revisó el documento físico o escaneado
                                    </small>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="documentManager.saveDocument()">
                                <i class="fas fa-save"></i> Guardar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior si existe
        $('#documentModal').remove();

        // Agregar y mostrar nuevo modal
        $('body').append(modalHtml);
        $('#documentModal').modal('show');

        // Inicializar tooltips de Bootstrap
        setTimeout(() => {
            $('[data-toggle="tooltip"]').tooltip();
        }, 100);
    }

    /**
     * Guarda el documento (crear o actualizar)
     */
    async saveDocument() {
        try {
            const formData = {
                user_id: this.currentUserId,
                company_id: this.currentCompanyId,
                document_type: document.getElementById('document_type').value,
                document_number: document.getElementById('document_number').value || null,
                issue_date: document.getElementById('issue_date').value || null,
                expiration_date: document.getElementById('expiration_date').value || null,
                issuing_authority: document.getElementById('issuing_authority').value || null,
                file_url: document.getElementById('file_url').value || null,
                notes: document.getElementById('notes').value || null,
                is_verified: document.getElementById('is_verified').checked
            };

            // Validación básica
            if (!formData.document_type) {
                this.showNotification('Debe seleccionar un tipo de documento', 'warning');
                return;
            }

            const token = localStorage.getItem('token');
            const url = this.editingDocumentId
                ? `/api/v1/users/${this.currentUserId}/documents/${this.editingDocumentId}`
                : `/api/v1/users/${this.currentUserId}/documents`;

            const method = this.editingDocumentId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Error al guardar documento');
            }

            $('#documentModal').modal('hide');
            this.showNotification(
                this.editingDocumentId ? 'Documento actualizado correctamente' : 'Documento agregado correctamente',
                'success'
            );

            await this.loadDocuments();

        } catch (error) {
            console.error('❌ Error guardando documento:', error);
            this.showNotification('Error al guardar documento', 'error');
        }
    }

    /**
     * Elimina un documento
     */
    async deleteDocument(documentId) {
        if (!confirm('¿Está seguro de eliminar este documento?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/v1/users/${this.currentUserId}/documents/${documentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al eliminar documento');
            }

            this.showNotification('Documento eliminado correctamente', 'success');
            await this.loadDocuments();

        } catch (error) {
            console.error('❌ Error eliminando documento:', error);
            this.showNotification('Error al eliminar documento', 'error');
        }
    }

    /**
     * Obtiene etiqueta legible del tipo de documento
     */
    getDocumentTypeLabel(type) {
        const labels = {
            'dni': 'DNI',
            'pasaporte': 'Pasaporte',
            'licencia_conducir': 'Licencia de Conducir',
            'visa': 'Visa de Trabajo',
            'certificado_antecedentes': 'Certificado de Antecedentes',
            'otro': 'Otro'
        };
        return labels[type] || type;
    }

    /**
     * Bind de eventos
     */
    bindEvents() {
        // Aquí se pueden agregar listeners adicionales
    }

    /**
     * Muestra notificación
     */
    showNotification(message, type = 'info') {
        // Implementar con tu sistema de notificaciones existente
        console.log(`[${type.toUpperCase()}] ${message}`);

        // Si tienes toastr o similar:
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else {
            alert(message);
        }
    }
}

// Crear instancia global
const documentManager = new DocumentExpirationManager();
