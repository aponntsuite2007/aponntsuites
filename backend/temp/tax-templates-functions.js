        // ========================================
        // SISTEMA DE PLANTILLAS FISCALES
        // ========================================

        let taxTemplates = [];
        let currentTaxTemplate = null;

        /**
         * Cargar sistema de plantillas fiscales
         */
        async function loadTaxTemplatesSystem() {
            console.log('🔄 Cargando sistema de plantillas fiscales...');
            await loadTaxTemplates();
        }

        /**
         * Cargar todas las plantillas fiscales
         */
        async function loadTaxTemplates() {
            try {
                const response = await fetch(`${API_BASE}/api/siac/tax-templates`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                taxTemplates = result.templates || [];

                renderTaxTemplates();

            } catch (error) {
                console.error('❌ Error cargando plantillas fiscales:', error);
                showNotification('Error cargando plantillas fiscales', 'error');

                document.getElementById('taxTemplatesContainer').innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <h4>❌ Error cargando plantillas</h4>
                        <p>${error.message}</p>
                        <button class="btn btn-primary" onclick="loadTaxTemplates()">
                            🔄 Reintentar
                        </button>
                    </div>
                `;
            }
        }

        /**
         * Renderizar lista de plantillas fiscales
         */
        function renderTaxTemplates() {
            const container = document.getElementById('taxTemplatesContainer');

            if (taxTemplates.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <h4>🏛️ No hay plantillas fiscales configuradas</h4>
                        <p>Cree plantillas para configurar la matriz impositiva por país</p>
                        <button class="btn btn-success" onclick="openNewTaxTemplateModal()" style="margin-top: 1rem;">
                            ➕ Crear Primera Plantilla
                        </button>
                    </div>
                `;
                return;
            }

            let html = `
                <div class="tax-templates-grid">
            `;

            taxTemplates.forEach(template => {
                html += `
                    <div class="tax-template-card">
                        <div class="tax-template-header">
                            <div class="tax-template-title">
                                <h3>🏛️ ${template.templateName}</h3>
                                <span class="country-code">${template.countryCode}</span>
                            </div>
                            <div class="tax-template-actions">
                                <button class="btn btn-sm btn-info" onclick="viewTaxTemplate(${template.id})">
                                    👁️ Ver
                                </button>
                                <button class="btn btn-sm btn-warning" onclick="editTaxTemplate(${template.id})">
                                    ✏️ Editar
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteTaxTemplate(${template.id})">
                                    🗑️ Eliminar
                                </button>
                            </div>
                        </div>
                        <div class="tax-template-body">
                            <div class="tax-template-info">
                                <div class="info-item">
                                    <span class="info-label">País:</span>
                                    <span class="info-value">${template.country}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Campo ID:</span>
                                    <span class="info-value">${template.taxIdFieldName}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Formato:</span>
                                    <span class="info-value">${template.taxIdFormat || 'No configurado'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Moneda:</span>
                                    <span class="info-value">${template.defaultCurrency}</span>
                                </div>
                            </div>
                            <div class="tax-template-stats">
                                <div class="stat-item">
                                    <span class="stat-value">${template.conditionsCount}</span>
                                    <span class="stat-label">Condiciones</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">${template.conceptsCount}</span>
                                    <span class="stat-label">Conceptos</span>
                                </div>
                            </div>
                        </div>
                        <div class="tax-template-footer">
                            <button class="btn btn-sm btn-success" onclick="addTaxConcept(${template.id})">
                                ➕ Agregar Concepto
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="addTaxCondition(${template.id})">
                                ➕ Agregar Condición
                            </button>
                        </div>
                    </div>
                `;
            });

            html += `
                </div>
            `;

            container.innerHTML = html;
        }

        /**
         * Abrir modal para crear nueva plantilla fiscal
         */
        function openNewTaxTemplateModal() {
            const modalHtml = `
                <div id="taxTemplateModal" class="modal" style="display: flex;">
                    <div class="modal-content" style="max-width: 600px;">
                        <div class="modal-header">
                            <h3>🏛️ Nueva Plantilla Fiscal</h3>
                            <button class="close-btn" onclick="closeTaxTemplateModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="taxTemplateForm">
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label class="form-label">País *</label>
                                        <input type="text" class="form-input" id="templateCountry" required>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Código País *</label>
                                        <input type="text" class="form-input" id="templateCountryCode" required maxlength="3" placeholder="ARG">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Nombre Plantilla *</label>
                                        <input type="text" class="form-input" id="templateName" required>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Campo ID Tributario</label>
                                        <input type="text" class="form-input" id="taxIdFieldName" value="CUIT">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Formato ID</label>
                                        <input type="text" class="form-input" id="taxIdFormat" placeholder="XX-XXXXXXXX-X">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Moneda Base</label>
                                        <select class="form-input" id="defaultCurrency">
                                            <option value="ARS">Peso Argentino (ARS)</option>
                                            <option value="USD">Dólar Estadounidense (USD)</option>
                                            <option value="EUR">Euro (EUR)</option>
                                            <option value="BRL">Real Brasileño (BRL)</option>
                                            <option value="UYU">Peso Uruguayo (UYU)</option>
                                        </select>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" onclick="closeTaxTemplateModal()">Cancelar</button>
                            <button class="btn btn-success" onclick="saveTaxTemplate()">💾 Crear Plantilla</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        /**
         * Cerrar modal de plantilla fiscal
         */
        function closeTaxTemplateModal() {
            const modal = document.getElementById('taxTemplateModal');
            if (modal) {
                modal.remove();
            }
        }

        /**
         * Guardar nueva plantilla fiscal
         */
        async function saveTaxTemplate() {
            try {
                const templateData = {
                    country: document.getElementById('templateCountry').value.trim(),
                    countryCode: document.getElementById('templateCountryCode').value.trim().toUpperCase(),
                    templateName: document.getElementById('templateName').value.trim(),
                    taxIdFieldName: document.getElementById('taxIdFieldName').value.trim() || 'CUIT',
                    taxIdFormat: document.getElementById('taxIdFormat').value.trim(),
                    defaultCurrency: document.getElementById('defaultCurrency').value,
                    currencies: [document.getElementById('defaultCurrency').value]
                };

                if (!templateData.country || !templateData.countryCode || !templateData.templateName) {
                    showNotification('Complete todos los campos obligatorios', 'warning');
                    return;
                }

                const response = await fetch(`${API_BASE}/api/siac/tax-templates`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(templateData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || `Error ${response.status}`);
                }

                const result = await response.json();
                console.log('✅ Plantilla fiscal creada:', result);

                showNotification('Plantilla fiscal creada exitosamente', 'success');
                closeTaxTemplateModal();
                await loadTaxTemplates();

            } catch (error) {
                console.error('❌ Error creando plantilla fiscal:', error);
                showNotification(`Error creando plantilla: ${error.message}`, 'error');
            }
        }

        /**
         * Ver detalles de plantilla fiscal
         */
        async function viewTaxTemplate(templateId) {
            try {
                const response = await fetch(`${API_BASE}/api/siac/tax-templates/${templateId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                currentTaxTemplate = result.template;

                openTaxTemplateDetailModal(currentTaxTemplate);

            } catch (error) {
                console.error('❌ Error obteniendo plantilla fiscal:', error);
                showNotification(`Error cargando plantilla: ${error.message}`, 'error');
            }
        }

        /**
         * Abrir modal de detalle de plantilla fiscal
         */
        function openTaxTemplateDetailModal(template) {
            const modalHtml = `
                <div id="taxTemplateDetailModal" class="modal" style="display: flex;">
                    <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                        <div class="modal-header">
                            <h3>🏛️ ${template.templateName}</h3>
                            <button class="close-btn" onclick="closeTaxTemplateDetailModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="tax-template-detail">
                                <div class="detail-section">
                                    <h4>📋 Información General</h4>
                                    <div class="detail-grid">
                                        <div class="detail-item">
                                            <span class="detail-label">País:</span>
                                            <span class="detail-value">${template.country}</span>
                                        </div>
                                        <div class="detail-item">
                                            <span class="detail-label">Código:</span>
                                            <span class="detail-value">${template.countryCode}</span>
                                        </div>
                                        <div class="detail-item">
                                            <span class="detail-label">Campo ID:</span>
                                            <span class="detail-value">${template.taxIdFieldName}</span>
                                        </div>
                                        <div class="detail-item">
                                            <span class="detail-label">Formato:</span>
                                            <span class="detail-value">${template.taxIdFormat || 'No configurado'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="detail-section">
                                    <h4>⚖️ Condiciones Impositivas</h4>
                                    <div class="conditions-list">
                                        ${template.conditions && template.conditions.length > 0 ?
                                            template.conditions.map(condition => `
                                                <div class="condition-item">
                                                    <span class="condition-code">${condition.conditionCode}</span>
                                                    <span class="condition-name">${condition.conditionName}</span>
                                                </div>
                                            `).join('') :
                                            '<p class="no-data">No hay condiciones configuradas</p>'
                                        }
                                    </div>
                                </div>

                                <div class="detail-section">
                                    <h4>💰 Conceptos Impositivos</h4>
                                    <div class="concepts-list">
                                        ${template.concepts && template.concepts.length > 0 ?
                                            template.concepts.map(concept => `
                                                <div class="concept-item">
                                                    <div class="concept-header">
                                                        <span class="concept-name">${concept.conceptName}</span>
                                                        <span class="concept-order">Orden: ${concept.calculationOrder}</span>
                                                    </div>
                                                    <div class="concept-details">
                                                        <span>Base: ${concept.baseAmount}</span>
                                                        <span>Tipo: ${concept.conceptType}</span>
                                                    </div>
                                                    ${concept.rates && concept.rates.length > 0 ?
                                                        `<div class="rates-list">
                                                            ${concept.rates.map(rate => `
                                                                <div class="rate-item">
                                                                    <span>${rate.rateName}</span>
                                                                    <span class="rate-percentage">${rate.ratePercentage}%</span>
                                                                </div>
                                                            `).join('')}
                                                        </div>` :
                                                        '<p class="no-rates">Sin alícuotas configuradas</p>'
                                                    }
                                                </div>
                                            `).join('') :
                                            '<p class="no-data">No hay conceptos configurados</p>'
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" onclick="closeTaxTemplateDetailModal()">Cerrar</button>
                            <button class="btn btn-warning" onclick="editTaxTemplate(${template.id})">✏️ Editar</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        /**
         * Cerrar modal de detalle
         */
        function closeTaxTemplateDetailModal() {
            const modal = document.getElementById('taxTemplateDetailModal');
            if (modal) {
                modal.remove();
            }
        }

        /**
         * Editar plantilla fiscal
         */
        function editTaxTemplate(templateId) {
            showNotification('Funcionalidad de edición en desarrollo', 'info');
        }

        /**
         * Eliminar plantilla fiscal
         */
        async function deleteTaxTemplate(templateId) {
            const template = taxTemplates.find(t => t.id === templateId);
            if (!template) return;

            if (!confirm(`¿Está seguro de eliminar la plantilla fiscal de ${template.country}?`)) {
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/api/siac/tax-templates/${templateId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }

                showNotification('Plantilla fiscal eliminada exitosamente', 'success');
                await loadTaxTemplates();

            } catch (error) {
                console.error('❌ Error eliminando plantilla fiscal:', error);
                showNotification(`Error eliminando plantilla: ${error.message}`, 'error');
            }
        }

        /**
         * Agregar concepto impositivo
         */
        function addTaxConcept(templateId) {
            showNotification('Funcionalidad de agregar concepto en desarrollo', 'info');
        }

        /**
         * Agregar condición impositiva
         */
        function addTaxCondition(templateId) {
            showNotification('Funcionalidad de agregar condición en desarrollo', 'info');
        }

        /**
         * Exportar todas las plantillas fiscales
         */
        async function exportAllTaxTemplates() {
            try {
                const dataStr = JSON.stringify(taxTemplates, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);

                const link = document.createElement('a');
                link.href = url;
                link.download = `plantillas_fiscales_${new Date().toISOString().split('T')[0]}.json`;
                link.click();

                URL.revokeObjectURL(url);
                showNotification('Plantillas fiscales exportadas exitosamente', 'success');

            } catch (error) {
                console.error('❌ Error exportando plantillas:', error);
                showNotification(`Error exportando: ${error.message}`, 'error');
            }
        }