/**
 * Update Legal Dashboard Documents UI
 * Mejora la interfaz de documentos con acceso a PDFs, alertas y estado de respuesta
 */

const fs = require('fs');
const path = 'C:/Bio/sistema_asistencia_biometrico/backend/public/js/modules/legal-dashboard.js';

const oldCode = `    renderCaseDocuments(docs) {
        if (!docs || docs.length === 0) {
            return \`
                <div class="le-empty-state">
                    <p>No hay documentos adjuntos</p>
                    <button onclick="LegalEngine.uploadDocument()" class="le-btn le-btn-primary">
                        📤 Subir Documento
                    </button>
                </div>
            \`;
        }

        return \`
            <div class="le-documents-list">
                <button onclick="LegalEngine.uploadDocument()" class="le-btn le-btn-primary" style="margin-bottom: 16px;">
                    📤 Subir Documento
                </button>
                \${docs.map(doc => \`
                    <div class="le-document-item">
                        <div class="le-doc-icon">📄</div>
                        <div class="le-doc-info">
                            <div class="le-doc-name">\${doc.document_name}</div>
                            <div class="le-doc-type">\${doc.document_type || 'Documento'}</div>
                        </div>
                        <button class="le-btn-icon" onclick="LegalEngine.downloadDocument('\${doc.id}')" title="Descargar">
                            ⬇️
                        </button>
                    </div>
                \`).join('')}
            </div>
        \`;
    },`;

const newCode = `    // Iconos por tipo de documento legal
    docIcons: {
        'carta_documento':'📨','telegrama':'📬','acuse_recibo':'✅','demanda':'⚖️','contestacion':'📋',
        'sentencia':'🏛️','recurso':'📤','resolucion':'📜','termination_letter':'🚪','warning_letter':'⚠️',
        'employment_contract':'📑','salary_receipt':'💰','attendance_report':'🕐','expediente_completo':'📚',
        'prueba_testimonial':'👥','citacion_mediacion':'📅','medical_certificate':'🏥','other':'📄'
    },

    respTypes: {
        'acuse_recibo':'Espera acuse de recibo','contestacion_extrajudicial':'Espera contestacion extrajudicial',
        'contestacion_judicial':'Espera contestacion judicial','notificacion_judicial':'Espera notif. juzgado',
        'resolucion':'Espera resolucion','apelacion':'Espera apelacion'
    },

    renderCaseDocuments(docs) {
        if (!docs || docs.length === 0) {
            return '<div class="le-empty-state"><p>No hay documentos</p><button onclick="LegalEngine.uploadDocument()" class="le-btn le-btn-primary">📤 Subir</button></div>';
        }
        const pending = docs.filter(d => d.expects_response && !d.response_received);
        const locked = docs.filter(d => d.is_locked);
        return \`
            <div class="le-docs-panel">
                <div class="le-docs-toolbar">
                    <button onclick="LegalEngine.uploadDocument()" class="le-btn le-btn-primary le-btn-sm">📤 Subir Documento</button>
                    <div class="le-docs-counts">
                        <span class="le-count-item">📄 \${docs.length} docs</span>
                        \${locked.length ? '<span class="le-count-item le-count-locked">🔒 '+locked.length+'</span>' : ''}
                        \${pending.length ? '<span class="le-count-item le-count-pending">⏳ '+pending.length+'</span>' : ''}
                    </div>
                </div>
                \${pending.length ? '<div class="le-docs-warning">⚠️ <strong>'+pending.length+'</strong> documento(s) esperan respuesta/acuse</div>' : ''}
                <div class="le-docs-grid">\${docs.map(d => this.renderDocCard(d)).join('')}</div>
            </div>
        \`;
    },

    renderDocCard(doc) {
        const icon = this.docIcons[doc.document_type] || '📄';
        const locked = doc.is_locked;
        const pending = doc.expects_response && !doc.response_received;
        const respText = this.respTypes[doc.response_type] || '';
        const dt = doc.document_date ? new Date(doc.document_date).toLocaleDateString('es-AR') : '';
        const title = doc.title || doc.file_name || 'Documento';
        return \`
            <div class="le-doc-card \${locked?'le-card-locked':''} \${pending?'le-card-pending':''}">
                <div class="le-doc-header">
                    <span class="le-doc-icon-big">\${icon}</span>
                    <div class="le-doc-badges">
                        \${locked ? '<span class="le-badge-lock" title="Inmutable">🔒</span>' : ''}
                        \${pending ? '<span class="le-badge-wait" title="'+respText+'">⏳</span>' : ''}
                        \${doc.response_received ? '<span class="le-badge-done">✅</span>' : ''}
                    </div>
                </div>
                <div class="le-doc-body">
                    <div class="le-doc-type">\${this.fmtDocType(doc.document_type)}</div>
                    <div class="le-doc-name" title="\${title}">\${title.length>35?title.substring(0,35)+'...':title}</div>
                    \${dt ? '<div class="le-doc-date">📅 '+dt+'</div>' : ''}
                    \${pending ? '<div class="le-doc-pending-alert">⚠️ '+respText+(doc.response_deadline?' (vence: '+new Date(doc.response_deadline).toLocaleDateString('es-AR')+')':'')+'</div>' : ''}
                </div>
                <div class="le-doc-footer">
                    <button class="le-doc-action le-action-view" onclick="LegalEngine.openPdfViewer('\${doc.id}')" title="Ver PDF">👁️ PDF</button>
                    <button class="le-doc-action" onclick="LegalEngine.downloadDocument('\${doc.id}')" title="Descargar">⬇️</button>
                    \${pending ? '<button class="le-doc-action le-action-acuse" onclick="LegalEngine.openAcuseModal(\\''+doc.id+'\\')">📥 Acuse</button>' : ''}
                </div>
                \${locked ? '<div class="le-doc-lock-info">🔒 '+(doc.lock_reason||'Documento bloqueado')+'</div>' : ''}
            </div>
        \`;
    },

    fmtDocType(t) {
        const m = {'carta_documento':'Carta Documento','telegrama':'Telegrama','acuse_recibo':'Acuse Recibo',
            'demanda':'Demanda','contestacion':'Contestacion','sentencia':'Sentencia','recurso':'Recurso',
            'termination_letter':'Carta Despido','warning_letter':'Apercibimiento','salary_receipt':'Recibo Sueldo',
            'attendance_report':'Inf. Asistencia','expediente_completo':'Expediente','citacion_mediacion':'Citacion SECLO',
            'prueba_testimonial':'Testimonial','medical_certificate':'Certificado Medico'};
        return m[t] || (t||'').replace(/_/g,' ') || 'Documento';
    },

    openPdfViewer(docId) {
        const doc = LegalState.caseDocuments?.find(d => d.id == docId);
        if (!doc) return;
        const icon = this.docIcons[doc.document_type] || '📄';
        const m = document.createElement('div');
        m.className = 'le-modal-overlay';
        m.innerHTML = \`
            <div class="le-modal le-modal-wide">
                <div class="le-modal-header">
                    <h3>\${icon} \${doc.title || 'Documento'}</h3>
                    <button onclick="this.closest('.le-modal-overlay').remove()" class="le-modal-x">×</button>
                </div>
                <div class="le-modal-body le-pdf-body">
                    \${doc.file_path ? '<iframe src="'+doc.file_path+'" class="le-pdf-frame"></iframe>' :
                        '<div class="le-pdf-placeholder"><div class="le-pdf-icon">📄</div><p>Vista previa no disponible</p><p class="le-pdf-file">'+
                        (doc.file_name||'documento.pdf')+'</p><button class="le-btn le-btn-primary" onclick="LegalEngine.downloadDocument(\\''+docId+'\\')">⬇️ Descargar</button></div>'}
                </div>
                <div class="le-modal-footer le-pdf-footer">
                    <span>📅 \${doc.document_date?new Date(doc.document_date).toLocaleDateString('es-AR'):'-'} | \${this.fmtDocType(doc.document_type)}\${doc.is_locked?' | 🔒 Bloqueado':''}</span>
                    <button class="le-btn" onclick="this.closest('.le-modal-overlay').remove()">Cerrar</button>
                </div>
            </div>
        \`;
        document.body.appendChild(m);
    },

    openAcuseModal(docId) {
        const doc = LegalState.caseDocuments?.find(d => d.id == docId);
        if (!doc) return;
        const m = document.createElement('div');
        m.className = 'le-modal-overlay';
        m.innerHTML = \`
            <div class="le-modal">
                <div class="le-modal-header">
                    <h3>📥 Registrar Acuse/Respuesta</h3>
                    <button onclick="this.closest('.le-modal-overlay').remove()" class="le-modal-x">×</button>
                </div>
                <div class="le-modal-body">
                    <p style="margin-bottom:12px;"><strong>\${doc.title}</strong></p>
                    <p style="color:#999;margin-bottom:16px;">Esperado: \${this.respTypes[doc.response_type]||'Respuesta'}</p>
                    <div class="le-form-row"><label>Fecha recepcion</label><input type="date" id="acuse-date" value="\${new Date().toISOString().split('T')[0]}" class="le-input"></div>
                    <div class="le-form-row"><label>Adjuntar PDF (opcional)</label><input type="file" id="acuse-file" accept=".pdf,.jpg,.png" class="le-input"></div>
                    <div class="le-form-row"><label>Notas</label><textarea id="acuse-notes" class="le-input" rows="2" placeholder="Observaciones..."></textarea></div>
                </div>
                <div class="le-modal-footer">
                    <button class="le-btn" onclick="this.closest('.le-modal-overlay').remove()">Cancelar</button>
                    <button class="le-btn le-btn-primary" onclick="LegalEngine.submitAcuse('\${docId}')">✅ Registrar</button>
                </div>
            </div>
        \`;
        document.body.appendChild(m);
    },

    async submitAcuse(docId) {
        const dt = document.getElementById('acuse-date')?.value;
        const notes = document.getElementById('acuse-notes')?.value;
        try {
            await LegalAPI.request('/documents/'+docId+'/response',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({response_date:dt,notes:notes})});
            document.querySelector('.le-modal-overlay')?.remove();
            this.showCaseTab('documents');
            this.showNotification('✅ Acuse registrado','success');
        } catch(e) { this.showNotification('Error: '+e.message,'error'); }
    },`;

let content = fs.readFileSync(path, 'utf8');

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(path, content, 'utf8');
    console.log('✅ UI de documentos actualizada correctamente');
} else {
    console.log('❌ No se encontró el código a reemplazar');
    // Buscar si ya está actualizado
    if (content.includes('docIcons:') || content.includes('renderDocCard')) {
        console.log('ℹ️ Parece que ya está actualizado');
    }
}
