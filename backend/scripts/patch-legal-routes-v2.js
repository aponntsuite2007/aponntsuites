const fs = require('fs');
const path = 'C:/Bio/sistema_asistencia_biometrico/backend/src/routes/legalRoutes.js';

let content = fs.readFileSync(path, 'utf8');

// Ya existe?
if (content.includes('/documents/:docId/response')) {
    console.log('✅ Endpoints ya existen');
    process.exit(0);
}

// Código a insertar
const newEndpoints = `
// POST /api/v1/legal/documents/:docId/response - Registrar respuesta/acuse
router.post('/documents/:docId/response', authenticateToken, async (req, res) => {
    try {
        const { docId } = req.params;
        const { response_date, notes } = req.body;
        const result = await pool.query(\`UPDATE legal_case_documents SET response_received = true, response_received_at = $1, updated_at = NOW() WHERE id = $2 RETURNING *\`, [response_date ? new Date(response_date) : new Date(), docId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Documento no encontrado' });
        await pool.query(\`UPDATE legal_document_alerts SET is_resolved = true, resolved_at = NOW() WHERE document_id = $1 AND is_resolved = false\`, [docId]);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[LEGAL] Error registrando respuesta:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/legal/documents/alerts - Alertas pendientes
router.get('/documents/alerts', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(\`SELECT a.*, d.title as document_title FROM legal_document_alerts a LEFT JOIN legal_case_documents d ON a.document_id = d.id WHERE a.company_id = $1 AND a.is_resolved = false ORDER BY a.due_date\`, [req.user.company_id]);
        res.json({ success: true, data: result.rows });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});
`;

// Buscar por línea
const lines = content.split('\n');
let insertIndex = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// GET /api/v1/legal/cases/:id/deadlines')) {
        insertIndex = i;
        break;
    }
}

if (insertIndex > 0) {
    // Insertar antes de esa línea
    lines.splice(insertIndex, 0, newEndpoints);
    fs.writeFileSync(path, lines.join('\n'), 'utf8');
    console.log('✅ Endpoints agregados en línea ' + insertIndex);
} else {
    console.log('❌ No se encontró el punto de inserción');
}
