/**
 * Add document response endpoints to legalRoutes
 */
const fs = require('fs');
const path = 'C:/Bio/sistema_asistencia_biometrico/backend/src/routes/legalRoutes.js';
let content = fs.readFileSync(path, 'utf8');

const marker = `// GET /api/v1/legal/cases/:id/deadlines - Obtener vencimientos del caso
router.get('/cases/:id/deadlines', authenticateToken, async (req, res) => {`;

const newEndpoints = `// POST /api/v1/legal/documents/:docId/response - Registrar respuesta/acuse de documento
router.post('/documents/:docId/response', authenticateToken, async (req, res) => {
    try {
        const { docId } = req.params;
        const { response_date, notes, response_document_id } = req.body;

        const result = await pool.query(\`
            UPDATE legal_case_documents
            SET response_received = true,
                response_received_at = $1,
                response_document_id = $2,
                description = COALESCE(description, '') || CASE WHEN $3 IS NOT NULL THEN E'\\n[Acuse] ' || $3 ELSE '' END,
                updated_at = NOW()
            WHERE id = $4
            RETURNING *
        \`, [
            response_date ? new Date(response_date) : new Date(),
            response_document_id || null,
            notes || null,
            docId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Documento no encontrado' });
        }

        // Resolver alerta si existe
        await pool.query(\`
            UPDATE legal_document_alerts
            SET is_resolved = true, resolved_at = NOW(), resolved_by = $1
            WHERE document_id = $2 AND is_resolved = false
        \`, [req.user.id, docId]);

        console.log('[LEGAL] Respuesta/acuse registrado para documento ' + docId);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[LEGAL] Error registrando respuesta:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/legal/documents/alerts - Obtener alertas de documentos pendientes
router.get('/documents/alerts', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(\`
            SELECT a.*, d.title as document_title, d.document_type, c.case_number, c.title as case_title
            FROM legal_document_alerts a
            JOIN legal_case_documents d ON a.document_id = d.id
            JOIN legal_cases c ON a.case_id = c.id
            WHERE a.company_id = $1 AND a.is_resolved = false
            ORDER BY a.due_date ASC NULLS LAST
        \`, [req.user.company_id]);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('[LEGAL] Error obteniendo alertas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

` + marker;

if (content.includes(marker) && !content.includes('/documents/:docId/response')) {
    content = content.replace(marker, newEndpoints);
    fs.writeFileSync(path, content, 'utf8');
    console.log('✅ Endpoints de documentos agregados');
} else if (content.includes('/documents/:docId/response')) {
    console.log('ℹ️ Endpoints ya existen');
} else {
    console.log('❌ Marker no encontrado');
}
