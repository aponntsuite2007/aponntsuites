/**
 * PAYSLIP TEMPLATE EDITOR - Editor Visual de Recibos de Sueldo
 * Sistema drag & drop para disenar recibos parametrizables
 */

console.log('%c PAYSLIP EDITOR v1.0 ', 'background: #9333ea; color: white; padding: 4px 8px; border-radius: 4px;');

const PayslipEditor = {
    // Estado
    currentTemplate: null,
    availableBlocks: [],
    isDragging: false,

    // API
    async loadBlockTypes() {
        try {
            const result = await PayrollAPI.getPayslipBlockTypes();
            this.availableBlocks = result.data || [];
            console.log('[PayslipEditor] Bloques cargados:', this.availableBlocks.length);
        } catch (e) {
            console.error('[PayslipEditor] Error cargando bloques:', e);
            this.availableBlocks = [];
        }
    },

    async loadTemplates() {
        try {
            const result = await PayrollAPI.getPayslipTemplates();
            return result.data || [];
        } catch (e) {
            console.error('[PayslipEditor] Error cargando templates:', e);
            return [];
        }
    },

    async loadTemplate(id) {
        try {
            const result = await PayrollAPI.getPayslipTemplate(id);
            this.currentTemplate = result.data;
            return this.currentTemplate;
        } catch (e) {
            console.error('[PayslipEditor] Error cargando template:', e);
            return null;
        }
    },

    async saveTemplate(template) {
        try {
            if (template.id) {
                await PayrollAPI.updatePayslipTemplate(template.id, template);
            } else {
                await PayrollAPI.createPayslipTemplate(template);
            }
            return true;
        } catch (e) {
            console.error('[PayslipEditor] Error guardando:', e);
            return false;
        }
    },

    // Render principal
    async render(containerId) {
        await this.loadBlockTypes();
        const templates = await this.loadTemplates();

        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="pse-container">
                <div class="pse-header">
                    <h2><i class="bi bi-file-earmark-richtext"></i> Editor de Recibos de Sueldo</h2>
                    <div class="pse-actions">
                        <button onclick="PayslipEditor.showNewTemplateModal()" class="pse-btn pse-btn-primary">
                            <i class="bi bi-plus-lg"></i> Nuevo Template
                        </button>
                    </div>
                </div>

                <div class="pse-templates-grid">
                    ${templates.map(t => this.renderTemplateCard(t)).join('')}
                </div>
            </div>
        `;

        this.injectStyles();
    },

    renderTemplateCard(template) {
        const blockCount = template.layout_config?.blocks?.length || 0;
        const isSystem = template.is_system;
        const isDefault = template.is_default;

        return `
            <div class="pse-template-card ${isDefault ? 'default' : ''}" data-id="${template.id}">
                <div class="pse-card-header">
                    <h3>${template.template_name}</h3>
                    ${isSystem ? '<span class="pse-badge system">Sistema</span>' : ''}
                    ${isDefault ? '<span class="pse-badge default">Por Defecto</span>' : ''}
                </div>
                <div class="pse-card-body">
                    <p class="pse-card-code">${template.template_code}</p>
                    <p class="pse-card-desc">${template.description || 'Sin descripcion'}</p>
                    <div class="pse-card-stats">
                        <span><i class="bi bi-grid-3x3"></i> ${blockCount} bloques</span>
                    </div>
                </div>
                <div class="pse-card-actions">
                    <button onclick="PayslipEditor.openEditor(${template.id})" class="pse-btn pse-btn-sm">
                        <i class="bi bi-pencil"></i> Editar
                    </button>
                    <button onclick="PayslipEditor.previewTemplate(${template.id})" class="pse-btn pse-btn-sm pse-btn-outline">
                        <i class="bi bi-eye"></i> Vista Previa
                    </button>
                    ${!isSystem ? `
                        <button onclick="PayslipEditor.duplicateTemplate(${template.id})" class="pse-btn pse-btn-sm pse-btn-outline">
                            <i class="bi bi-copy"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    // Modal para nuevo template
    showNewTemplateModal() {
        const modal = document.createElement('div');
        modal.className = 'pse-modal-overlay';
        modal.innerHTML = `
            <div class="pse-modal">
                <div class="pse-modal-header">
                    <h3>Nuevo Template de Recibo</h3>
                    <button onclick="this.closest('.pse-modal-overlay').remove()" class="pse-modal-close">&times;</button>
                </div>
                <div class="pse-modal-body">
                    <form id="pse-new-template-form">
                        <div class="pse-form-group">
                            <label>Codigo *</label>
                            <input type="text" name="template_code" required placeholder="Ej: CUSTOM_001">
                        </div>
                        <div class="pse-form-group">
                            <label>Nombre *</label>
                            <input type="text" name="template_name" required placeholder="Ej: Recibo Personalizado">
                        </div>
                        <div class="pse-form-group">
                            <label>Descripcion</label>
                            <textarea name="description" rows="2" placeholder="Descripcion opcional..."></textarea>
                        </div>
                        <div class="pse-form-group">
                            <label>Basado en</label>
                            <select name="base_template">
                                <option value="">-- Desde cero --</option>
                                ${this.availableBlocks.length > 0 ? '<option value="ARG_STANDARD">Argentina Estandar</option>' : ''}
                            </select>
                        </div>
                    </form>
                </div>
                <div class="pse-modal-footer">
                    <button onclick="PayslipEditor.createNewTemplate()" class="pse-btn pse-btn-primary">Crear y Editar</button>
                    <button onclick="this.closest('.pse-modal-overlay').remove()" class="pse-btn">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async createNewTemplate() {
        const form = document.getElementById('pse-new-template-form');
        const formData = new FormData(form);

        const template = {
            template_code: formData.get('template_code'),
            template_name: formData.get('template_name'),
            description: formData.get('description'),
            layout_config: {
                blocks: [],
                style: {
                    font_family: 'Arial',
                    font_size: 10,
                    primary_color: '#1a1a2e',
                    paper_size: 'A4'
                }
            }
        };

        const saved = await this.saveTemplate(template);
        if (saved) {
            document.querySelector('.pse-modal-overlay')?.remove();
            this.render('pe-content'); // Recargar lista
        }
    },

    // Editor visual completo
    async openEditor(templateId) {
        await this.loadTemplate(templateId);
        if (!this.currentTemplate) return;

        const container = document.getElementById('pe-content');
        container.innerHTML = `
            <div class="pse-editor">
                <div class="pse-editor-header">
                    <button onclick="PayslipEditor.render('pe-content')" class="pse-btn pse-btn-outline">
                        <i class="bi bi-arrow-left"></i> Volver
                    </button>
                    <h2>Editando: ${this.currentTemplate.template_name}</h2>
                    <div class="pse-editor-actions">
                        <button onclick="PayslipEditor.previewTemplate(${templateId})" class="pse-btn pse-btn-outline">
                            <i class="bi bi-eye"></i> Vista Previa
                        </button>
                        <button onclick="PayslipEditor.saveCurrentTemplate()" class="pse-btn pse-btn-primary">
                            <i class="bi bi-check-lg"></i> Guardar
                        </button>
                    </div>
                </div>

                <div class="pse-editor-main">
                    <!-- Panel de bloques disponibles -->
                    <div class="pse-blocks-panel">
                        <h4>Bloques Disponibles</h4>
                        <p class="pse-help-text">Arrastra los bloques al area de diseno</p>
                        <div class="pse-blocks-list">
                            ${this.availableBlocks.map(b => `
                                <div class="pse-block-item" draggable="true"
                                     ondragstart="PayslipEditor.handleDragStart(event, '${b.block_type}')"
                                     data-type="${b.block_type}">
                                    <i class="${b.icon || 'bi bi-square'}"></i>
                                    <span>${b.block_name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Area de diseno -->
                    <div class="pse-design-area">
                        <div class="pse-paper ${this.currentTemplate.layout_config?.style?.orientation || 'portrait'}"
                             ondragover="PayslipEditor.handleDragOver(event)"
                             ondrop="PayslipEditor.handleDrop(event)">
                            ${this.renderDesignBlocks()}
                        </div>
                    </div>

                    <!-- Panel de propiedades -->
                    <div class="pse-properties-panel">
                        <h4>Propiedades</h4>
                        <div id="pse-properties-content">
                            <p class="pse-help-text">Selecciona un bloque para editar sus propiedades</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.injectStyles();
    },

    renderDesignBlocks() {
        const blocks = this.currentTemplate.layout_config?.blocks || [];
        if (blocks.length === 0) {
            return `
                <div class="pse-empty-design">
                    <i class="bi bi-arrow-down-circle"></i>
                    <p>Arrastra bloques aqui para disenar tu recibo</p>
                </div>
            `;
        }

        // Agrupar bloques por fila
        const rows = {};
        blocks.forEach((block, index) => {
            const rowNum = block.row || index + 1;
            if (!rows[rowNum]) rows[rowNum] = [];
            rows[rowNum].push({ ...block, originalIndex: index });
        });

        // Ordenar filas
        const sortedRowNums = Object.keys(rows).map(Number).sort((a, b) => a - b);

        return sortedRowNums.map(rowNum => {
            const rowBlocks = rows[rowNum];
            return `
                <div class="pse-row" data-row="${rowNum}">
                    <div class="pse-row-label">Fila ${rowNum}</div>
                    <div class="pse-row-blocks">
                        ${rowBlocks.map(block => {
                            const blockType = this.availableBlocks.find(b => b.block_type === block.type);
                            const width = block.width || 12;
                            const widthPercent = Math.round((width / 12) * 100);
                            return `
                                <div class="pse-design-block pse-col-${width}"
                                     data-index="${block.originalIndex}"
                                     onclick="PayslipEditor.selectBlock(${block.originalIndex})"
                                     style="flex: 0 0 ${widthPercent}%; max-width: ${widthPercent}%;">
                                    <div class="pse-block-handle">
                                        <i class="bi bi-grip-vertical"></i>
                                    </div>
                                    <div class="pse-block-content">
                                        <span class="pse-block-type">${blockType?.block_name || block.type}</span>
                                        <span class="pse-block-width-badge">${widthPercent}%</span>
                                    </div>
                                    <div class="pse-block-actions">
                                        <button onclick="event.stopPropagation(); PayslipEditor.moveBlockToRow(${block.originalIndex}, -1)" title="Mover a fila anterior">
                                            <i class="bi bi-arrow-up"></i>
                                        </button>
                                        <button onclick="event.stopPropagation(); PayslipEditor.moveBlockToRow(${block.originalIndex}, 1)" title="Mover a siguiente fila">
                                            <i class="bi bi-arrow-down"></i>
                                        </button>
                                        <button onclick="event.stopPropagation(); PayslipEditor.removeBlock(${block.originalIndex})" title="Eliminar">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
    },

    // Mover bloque entre filas
    moveBlockToRow(index, direction) {
        const block = this.currentTemplate.layout_config.blocks[index];
        const currentRow = block.row || 1;
        const newRow = currentRow + direction;

        if (newRow < 1) return;

        block.row = newRow;
        this.refreshDesignArea();
    },

    // Drag & Drop
    handleDragStart(event, blockType) {
        event.dataTransfer.setData('blockType', blockType);
        this.isDragging = true;
    },

    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    },

    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');

        const blockType = event.dataTransfer.getData('blockType');
        if (!blockType) return;

        this.addBlock(blockType);
        this.isDragging = false;
    },

    addBlock(blockType) {
        if (!this.currentTemplate.layout_config) {
            this.currentTemplate.layout_config = { blocks: [], style: {} };
        }

        const blockDef = this.availableBlocks.find(b => b.block_type === blockType);
        const defaultConfig = {};

        // Extraer valores default de configurable_fields
        if (blockDef?.configurable_fields) {
            blockDef.configurable_fields.forEach(field => {
                if (field.default !== undefined) {
                    defaultConfig[field.field] = field.default;
                }
            });
        }

        // Calcular siguiente fila disponible
        const existingRows = this.currentTemplate.layout_config.blocks.map(b => b.row || 0);
        const nextRow = existingRows.length > 0 ? Math.max(...existingRows) + 1 : 1;

        const newBlock = {
            type: blockType,
            order: this.currentTemplate.layout_config.blocks.length + 1,
            config: defaultConfig,
            // Layout properties - Grid de 12 columnas
            width: 12,  // 12 = 100%, 6 = 50%, 4 = 33%, 3 = 25%
            row: nextRow
        };

        this.currentTemplate.layout_config.blocks.push(newBlock);
        this.refreshDesignArea();
    },

    removeBlock(index) {
        this.currentTemplate.layout_config.blocks.splice(index, 1);
        this.refreshDesignArea();
    },

    moveBlock(index, direction) {
        const blocks = this.currentTemplate.layout_config.blocks;
        const newIndex = index + direction;

        if (newIndex < 0 || newIndex >= blocks.length) return;

        [blocks[index], blocks[newIndex]] = [blocks[newIndex], blocks[index]];
        this.refreshDesignArea();
    },

    selectBlock(index) {
        document.querySelectorAll('.pse-design-block').forEach(b => b.classList.remove('selected'));
        document.querySelector(`.pse-design-block[data-index="${index}"]`)?.classList.add('selected');

        this.showBlockProperties(index);
    },

    showBlockProperties(index) {
        const block = this.currentTemplate.layout_config.blocks[index];
        const blockDef = this.availableBlocks.find(b => b.block_type === block.type);

        const propertiesContainer = document.getElementById('pse-properties-content');

        // Layout properties siempre visibles
        const layoutSection = `
            <div class="pse-layout-section">
                <h5><i class="bi bi-grid-3x3-gap"></i> Layout</h5>
                <div class="pse-prop-group">
                    <label>Ancho del bloque</label>
                    <select id="pse-block-width" onchange="PayslipEditor.updateBlockLayout(${index})">
                        <option value="12" ${(block.width || 12) === 12 ? 'selected' : ''}>100% (Ancho completo)</option>
                        <option value="9" ${block.width === 9 ? 'selected' : ''}>75%</option>
                        <option value="8" ${block.width === 8 ? 'selected' : ''}>66%</option>
                        <option value="6" ${block.width === 6 ? 'selected' : ''}>50% (Mitad)</option>
                        <option value="4" ${block.width === 4 ? 'selected' : ''}>33% (Tercio)</option>
                        <option value="3" ${block.width === 3 ? 'selected' : ''}>25% (Cuarto)</option>
                    </select>
                </div>
                <div class="pse-prop-group">
                    <label>Fila</label>
                    <input type="number" id="pse-block-row" min="1" value="${block.row || 1}"
                           onchange="PayslipEditor.updateBlockLayout(${index})">
                    <p class="pse-field-help">Bloques en la misma fila se muestran lado a lado</p>
                </div>
            </div>
        `;

        // Config properties si existen
        let configSection = '';
        if (blockDef?.configurable_fields?.length) {
            configSection = `
                <div class="pse-config-section">
                    <h5><i class="bi bi-sliders"></i> Configuracion</h5>
                    <form id="pse-block-props-form" data-index="${index}">
                        ${blockDef.configurable_fields.map(field => this.renderPropertyField(field, block.config)).join('')}
                    </form>
                </div>
            `;
        }

        propertiesContainer.innerHTML = layoutSection + configSection;

        // Event listeners para config
        propertiesContainer.querySelectorAll('#pse-block-props-form input, #pse-block-props-form select, #pse-block-props-form textarea').forEach(input => {
            input.addEventListener('change', () => this.updateBlockProperty(index));
        });
    },

    // Actualizar propiedades de layout
    updateBlockLayout(index) {
        const block = this.currentTemplate.layout_config.blocks[index];
        const widthSelect = document.getElementById('pse-block-width');
        const rowInput = document.getElementById('pse-block-row');

        if (widthSelect) {
            block.width = parseInt(widthSelect.value);
        }
        if (rowInput) {
            block.row = parseInt(rowInput.value) || 1;
        }

        this.refreshDesignArea();
    },

    renderPropertyField(field, currentConfig) {
        const value = currentConfig[field.field] ?? field.default ?? '';

        switch (field.type) {
            case 'boolean':
                return `
                    <div class="pse-prop-group">
                        <label>
                            <input type="checkbox" name="${field.field}" ${value ? 'checked' : ''}>
                            ${field.label}
                        </label>
                    </div>
                `;
            case 'select':
                return `
                    <div class="pse-prop-group">
                        <label>${field.label}</label>
                        <select name="${field.field}">
                            ${field.options.map(opt => `
                                <option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>
                            `).join('')}
                        </select>
                    </div>
                `;
            case 'number':
                return `
                    <div class="pse-prop-group">
                        <label>${field.label}</label>
                        <input type="number" name="${field.field}" value="${value}">
                    </div>
                `;
            case 'textarea':
                return `
                    <div class="pse-prop-group">
                        <label>${field.label}</label>
                        <textarea name="${field.field}" rows="3">${value}</textarea>
                    </div>
                `;
            default:
                return `
                    <div class="pse-prop-group">
                        <label>${field.label}</label>
                        <input type="text" name="${field.field}" value="${value}">
                    </div>
                `;
        }
    },

    updateBlockProperty(blockIndex) {
        const form = document.getElementById('pse-block-props-form');
        const formData = new FormData(form);

        const block = this.currentTemplate.layout_config.blocks[blockIndex];
        const blockDef = this.availableBlocks.find(b => b.block_type === block.type);

        blockDef.configurable_fields.forEach(field => {
            if (field.type === 'boolean') {
                block.config[field.field] = form.querySelector(`[name="${field.field}"]`).checked;
            } else {
                block.config[field.field] = formData.get(field.field);
            }
        });
    },

    refreshDesignArea() {
        const paper = document.querySelector('.pse-paper');
        if (paper) {
            paper.innerHTML = this.renderDesignBlocks();
        }
    },

    async saveCurrentTemplate() {
        const saved = await this.saveTemplate(this.currentTemplate);
        if (saved) {
            alert('Template guardado correctamente');
        } else {
            alert('Error al guardar el template');
        }
    },

    async previewTemplate(templateId) {
        try {
            // Mostrar mensaje de carga
            const loadingModal = document.createElement('div');
            loadingModal.className = 'pse-modal-overlay';
            loadingModal.innerHTML = `
                <div class="pse-modal" style="text-align: center; padding: 40px;">
                    <div class="pse-spinner" style="width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #9333ea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                    <p>Generando vista previa...</p>
                </div>
            `;
            document.body.appendChild(loadingModal);

            // Obtener PDF
            const blob = await PayrollAPI.previewPayslipPDF(templateId);

            // Crear URL y abrir en nueva ventana
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');

            // Limpiar
            loadingModal.remove();
        } catch (error) {
            console.error('[PayslipEditor] Error en vista previa:', error);
            alert('Error generando vista previa: ' + error.message);
            document.querySelector('.pse-modal-overlay')?.remove();
        }
    },

    async duplicateTemplate(templateId) {
        const template = await this.loadTemplate(templateId);
        if (!template) return;

        const newTemplate = {
            ...template,
            id: undefined,
            template_code: template.template_code + '_COPY',
            template_name: template.template_name + ' (Copia)',
            is_system: false,
            is_default: false
        };

        const saved = await this.saveTemplate(newTemplate);
        if (saved) {
            this.render('pe-content');
        }
    },

    // Estilos CSS
    injectStyles() {
        if (document.getElementById('pse-styles')) return;

        const style = document.createElement('style');
        style.id = 'pse-styles';
        style.textContent = `
            .pse-container { padding: 20px; }
            .pse-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
            .pse-header h2 { margin: 0; display: flex; align-items: center; gap: 10px; }

            .pse-btn { padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 14px; }
            .pse-btn:hover { background: #f3f4f6; }
            .pse-btn-primary { background: #9333ea; color: white; border-color: #9333ea; }
            .pse-btn-primary:hover { background: #7e22ce; }
            .pse-btn-outline { background: transparent; }
            .pse-btn-sm { padding: 4px 10px; font-size: 12px; }

            .pse-templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }

            .pse-template-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; transition: box-shadow 0.2s; }
            .pse-template-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .pse-template-card.default { border-color: #9333ea; }

            .pse-card-header { padding: 16px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 8px; }
            .pse-card-header h3 { margin: 0; flex: 1; font-size: 16px; }

            .pse-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
            .pse-badge.system { background: #dbeafe; color: #1e40af; }
            .pse-badge.default { background: #f3e8ff; color: #7e22ce; }

            .pse-card-body { padding: 16px; }
            .pse-card-code { font-family: monospace; color: #6b7280; margin: 0 0 8px; }
            .pse-card-desc { color: #4b5563; margin: 0 0 12px; font-size: 14px; }
            .pse-card-stats { color: #9ca3af; font-size: 12px; }

            .pse-card-actions { padding: 12px 16px; background: #f9fafb; display: flex; gap: 8px; }

            /* Editor */
            .pse-editor { height: calc(100vh - 180px); display: flex; flex-direction: column; }
            .pse-editor-header { display: flex; align-items: center; gap: 16px; padding: 16px; background: white; border-bottom: 1px solid #e5e7eb; }
            .pse-editor-header h2 { flex: 1; margin: 0; font-size: 18px; }
            .pse-editor-actions { display: flex; gap: 8px; }

            .pse-editor-main { flex: 1; display: flex; overflow: hidden; }

            .pse-blocks-panel { width: 220px; background: #f9fafb; border-right: 1px solid #e5e7eb; padding: 16px; overflow-y: auto; }
            .pse-blocks-panel h4 { margin: 0 0 8px; font-size: 14px; }
            .pse-help-text { color: #9ca3af; font-size: 12px; margin: 0 0 16px; }

            .pse-blocks-list { display: flex; flex-direction: column; gap: 8px; }
            .pse-block-item { padding: 10px 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; cursor: grab; display: flex; align-items: center; gap: 8px; font-size: 13px; }
            .pse-block-item:hover { border-color: #9333ea; background: #faf5ff; }
            .pse-block-item i { color: #9333ea; }

            .pse-design-area { flex: 1; background: #e5e7eb; padding: 24px; overflow: auto; display: flex; justify-content: center; }

            .pse-paper { width: 595px; min-height: 842px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.15); padding: 40px; }
            .pse-paper.landscape { width: 842px; min-height: 595px; }
            .pse-paper.drag-over { background: #faf5ff; border: 2px dashed #9333ea; }

            .pse-empty-design { text-align: center; padding: 60px 20px; color: #9ca3af; }
            .pse-empty-design i { font-size: 48px; margin-bottom: 16px; }

            /* Filas y Grid System */
            .pse-row { margin-bottom: 12px; border: 1px dashed #d1d5db; border-radius: 6px; padding: 8px; background: #fafafa; }
            .pse-row-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; padding-left: 4px; }
            .pse-row-blocks { display: flex; flex-wrap: wrap; gap: 8px; }

            .pse-design-block { display: flex; align-items: center; padding: 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; cursor: pointer; box-sizing: border-box; min-height: 44px; }
            .pse-design-block:hover { border-color: #9333ea; box-shadow: 0 2px 4px rgba(147, 51, 234, 0.1); }
            .pse-design-block.selected { border-color: #9333ea; background: #faf5ff; box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.1); }

            .pse-block-handle { cursor: grab; padding-right: 8px; color: #9ca3af; }
            .pse-block-content { flex: 1; display: flex; align-items: center; gap: 8px; }
            .pse-block-type { font-weight: 500; font-size: 12px; }
            .pse-block-width-badge { font-size: 10px; background: #e5e7eb; color: #4b5563; padding: 2px 6px; border-radius: 3px; }
            .pse-block-actions { display: flex; gap: 2px; }
            .pse-block-actions button { padding: 4px 6px; border: none; background: transparent; cursor: pointer; color: #6b7280; font-size: 12px; }
            .pse-block-actions button:hover { color: #9333ea; background: #f3e8ff; border-radius: 3px; }

            /* Layout section en propiedades */
            .pse-layout-section, .pse-config-section { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }
            .pse-layout-section h5, .pse-config-section h5 { margin: 0 0 12px; font-size: 13px; color: #4b5563; display: flex; align-items: center; gap: 6px; }
            .pse-field-help { font-size: 11px; color: #9ca3af; margin: 4px 0 0; }

            .pse-properties-panel { width: 280px; background: white; border-left: 1px solid #e5e7eb; padding: 16px; overflow-y: auto; }
            .pse-properties-panel h4 { margin: 0 0 16px; font-size: 14px; }

            .pse-prop-group { margin-bottom: 12px; }
            .pse-prop-group label { display: block; font-size: 12px; color: #4b5563; margin-bottom: 4px; }
            .pse-prop-group input[type="text"],
            .pse-prop-group input[type="number"],
            .pse-prop-group select,
            .pse-prop-group textarea { width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; }
            .pse-prop-group input[type="checkbox"] { margin-right: 8px; }

            /* Modal */
            .pse-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
            .pse-modal { background: white; border-radius: 8px; width: 90%; max-width: 500px; }
            .pse-modal-header { padding: 16px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
            .pse-modal-header h3 { margin: 0; }
            .pse-modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #9ca3af; }
            .pse-modal-body { padding: 20px; }
            .pse-modal-footer { padding: 16px 20px; background: #f9fafb; border-radius: 0 0 8px 8px; display: flex; gap: 8px; justify-content: flex-end; }

            .pse-form-group { margin-bottom: 16px; }
            .pse-form-group label { display: block; font-weight: 500; margin-bottom: 6px; font-size: 14px; }
            .pse-form-group input,
            .pse-form-group select,
            .pse-form-group textarea { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
        `;
        document.head.appendChild(style);
    }
};

// Exportar
if (typeof window !== 'undefined') {
    window.PayslipEditor = PayslipEditor;
}
