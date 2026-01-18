/**
 * ART Management Routes - CRUD Completo
 * Gestión de Aseguradoras de Riesgos del Trabajo
 */

const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');

// Datos en memoria para demo (en producción usar PostgreSQL)
let artProviders = [
    {
        id: 1,
        name: 'La Segunda ART',
        code: 'LS-ART',
        cuit: '30-50000001-5',
        phone: '0800-555-1234',
        email: 'contacto@lasegundaart.com.ar',
        address: 'Av. Corrientes 1234, CABA',
        website: 'https://www.lasegundaart.com.ar',
        contract_start: '2024-01-01',
        contract_end: '2025-12-31',
        coverage_level: 'premium',
        monthly_cost: 150000,
        employees_covered: 250,
        status: 'active',
        company_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 2,
        name: 'Provincia ART',
        code: 'PR-ART',
        cuit: '30-50000002-3',
        phone: '0800-222-4567',
        email: 'info@provinciaart.com.ar',
        address: 'Calle Falsa 456, Córdoba',
        website: 'https://www.provinciaart.com.ar',
        contract_start: '2024-06-01',
        contract_end: '2026-05-31',
        coverage_level: 'standard',
        monthly_cost: 120000,
        employees_covered: 180,
        status: 'active',
        company_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

let artAccidents = [];
let artExams = [];
let nextProviderId = 3;
let nextAccidentId = 1;
let nextExamId = 1;

// ============================================================================
// PROVIDERS CRUD
// ============================================================================

// GET /api/art/providers - Listar proveedores ART
router.get('/providers', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id || 1;
        const providers = artProviders.filter(p => p.company_id === companyId);

        res.json({
            success: true,
            data: providers,
            total: providers.length
        });
    } catch (error) {
        console.error('Error getting ART providers:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener proveedores ART'
        });
    }
});

// GET /api/art/providers/:id - Obtener proveedor específico
router.get('/providers/:id', auth, async (req, res) => {
    try {
        const provider = artProviders.find(p => p.id === parseInt(req.params.id));

        if (!provider) {
            return res.status(404).json({
                success: false,
                error: 'Proveedor no encontrado'
            });
        }

        res.json({
            success: true,
            data: provider
        });
    } catch (error) {
        console.error('Error getting ART provider:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener proveedor ART'
        });
    }
});

// POST /api/art/providers - Crear nuevo proveedor ART
router.post('/providers', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id || 1;
        const {
            name,
            code,
            cuit,
            phone,
            email,
            address,
            website,
            contract_start,
            contract_end,
            coverage_level,
            monthly_cost,
            employees_covered
        } = req.body;

        if (!name || !cuit) {
            return res.status(400).json({
                success: false,
                error: 'Nombre y CUIT son requeridos'
            });
        }

        const newProvider = {
            id: nextProviderId++,
            name,
            code: code || `ART-${nextProviderId}`,
            cuit,
            phone: phone || '',
            email: email || '',
            address: address || '',
            website: website || '',
            contract_start: contract_start || new Date().toISOString().split('T')[0],
            contract_end: contract_end || '',
            coverage_level: coverage_level || 'standard',
            monthly_cost: parseFloat(monthly_cost) || 0,
            employees_covered: parseInt(employees_covered) || 0,
            status: 'active',
            company_id: companyId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        artProviders.push(newProvider);

        console.log(`✅ [ART] Proveedor creado: ${name} (ID: ${newProvider.id})`);

        res.status(201).json({
            success: true,
            message: 'Proveedor ART creado exitosamente',
            data: newProvider
        });
    } catch (error) {
        console.error('Error creating ART provider:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear proveedor ART'
        });
    }
});

// PUT /api/art/providers/:id - Actualizar proveedor ART
router.put('/providers/:id', auth, async (req, res) => {
    try {
        const providerId = parseInt(req.params.id);
        const providerIndex = artProviders.findIndex(p => p.id === providerId);

        if (providerIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Proveedor no encontrado'
            });
        }

        const updatedProvider = {
            ...artProviders[providerIndex],
            ...req.body,
            id: providerId,
            updated_at: new Date().toISOString()
        };

        artProviders[providerIndex] = updatedProvider;

        console.log(`✅ [ART] Proveedor actualizado: ${updatedProvider.name} (ID: ${providerId})`);

        res.json({
            success: true,
            message: 'Proveedor ART actualizado exitosamente',
            data: updatedProvider
        });
    } catch (error) {
        console.error('Error updating ART provider:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar proveedor ART'
        });
    }
});

// DELETE /api/art/providers/:id - Eliminar proveedor ART
router.delete('/providers/:id', auth, async (req, res) => {
    try {
        const providerId = parseInt(req.params.id);
        const providerIndex = artProviders.findIndex(p => p.id === providerId);

        if (providerIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Proveedor no encontrado'
            });
        }

        const deleted = artProviders.splice(providerIndex, 1)[0];

        console.log(`✅ [ART] Proveedor eliminado: ${deleted.name} (ID: ${providerId})`);

        res.json({
            success: true,
            message: 'Proveedor ART eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error deleting ART provider:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar proveedor ART'
        });
    }
});

// ============================================================================
// ACCIDENTS CRUD
// ============================================================================

// GET /api/art/accidents - Listar accidentes
router.get('/accidents', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id || 1;
        const accidents = artAccidents.filter(a => a.company_id === companyId);

        res.json({
            success: true,
            data: accidents,
            total: accidents.length
        });
    } catch (error) {
        console.error('Error getting accidents:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener accidentes'
        });
    }
});

// POST /api/art/accidents - Reportar nuevo accidente
router.post('/accidents', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id || 1;
        const {
            employee_id,
            employee_name,
            accident_date,
            accident_time,
            location,
            accident_type,
            description,
            severity,
            witnesses,
            immediate_actions
        } = req.body;

        if (!employee_id || !accident_date || !description) {
            return res.status(400).json({
                success: false,
                error: 'Empleado, fecha y descripción son requeridos'
            });
        }

        const newAccident = {
            id: nextAccidentId++,
            case_number: `ACC-${new Date().getFullYear()}-${String(nextAccidentId).padStart(6, '0')}`,
            employee_id,
            employee_name: employee_name || `Empleado ${employee_id}`,
            accident_date,
            accident_time: accident_time || '',
            location: location || '',
            accident_type: accident_type || 'work',
            description,
            severity: severity || 'minor',
            witnesses: witnesses || '',
            immediate_actions: immediate_actions || '',
            status: 'reported',
            art_notified: false,
            srt_notified: false,
            company_id: companyId,
            reported_by: req.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        artAccidents.push(newAccident);

        console.log(`🚨 [ART] Accidente reportado: ${newAccident.case_number}`);

        res.status(201).json({
            success: true,
            message: 'Accidente reportado exitosamente',
            data: newAccident
        });
    } catch (error) {
        console.error('Error reporting accident:', error);
        res.status(500).json({
            success: false,
            error: 'Error al reportar accidente'
        });
    }
});

// PUT /api/art/accidents/:id - Actualizar accidente
router.put('/accidents/:id', auth, async (req, res) => {
    try {
        const accidentId = parseInt(req.params.id);
        const accidentIndex = artAccidents.findIndex(a => a.id === accidentId);

        if (accidentIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Accidente no encontrado'
            });
        }

        const updatedAccident = {
            ...artAccidents[accidentIndex],
            ...req.body,
            id: accidentId,
            updated_at: new Date().toISOString()
        };

        artAccidents[accidentIndex] = updatedAccident;

        res.json({
            success: true,
            message: 'Accidente actualizado exitosamente',
            data: updatedAccident
        });
    } catch (error) {
        console.error('Error updating accident:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar accidente'
        });
    }
});

// DELETE /api/art/accidents/:id - Eliminar accidente
router.delete('/accidents/:id', auth, async (req, res) => {
    try {
        const accidentId = parseInt(req.params.id);
        const accidentIndex = artAccidents.findIndex(a => a.id === accidentId);

        if (accidentIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Accidente no encontrado'
            });
        }

        artAccidents.splice(accidentIndex, 1);

        res.json({
            success: true,
            message: 'Accidente eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error deleting accident:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar accidente'
        });
    }
});

// ============================================================================
// EXAMS CRUD
// ============================================================================

// GET /api/art/exams - Listar exámenes programados
router.get('/exams', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id || 1;
        const exams = artExams.filter(e => e.company_id === companyId);

        res.json({
            success: true,
            data: exams,
            total: exams.length
        });
    } catch (error) {
        console.error('Error getting exams:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener exámenes'
        });
    }
});

// POST /api/art/exams - Programar nuevo examen
router.post('/exams', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id || 1;
        const {
            employee_id,
            employee_name,
            exam_type,
            scheduled_date,
            scheduled_time,
            location,
            provider_id,
            notes
        } = req.body;

        if (!employee_id || !exam_type || !scheduled_date) {
            return res.status(400).json({
                success: false,
                error: 'Empleado, tipo de examen y fecha son requeridos'
            });
        }

        const newExam = {
            id: nextExamId++,
            employee_id,
            employee_name: employee_name || `Empleado ${employee_id}`,
            exam_type,
            scheduled_date,
            scheduled_time: scheduled_time || '09:00',
            location: location || '',
            provider_id: provider_id || null,
            notes: notes || '',
            status: 'scheduled',
            result: null,
            company_id: companyId,
            created_by: req.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        artExams.push(newExam);

        console.log(`📅 [ART] Examen programado: ${exam_type} para empleado ${employee_id}`);

        res.status(201).json({
            success: true,
            message: 'Examen programado exitosamente',
            data: newExam
        });
    } catch (error) {
        console.error('Error scheduling exam:', error);
        res.status(500).json({
            success: false,
            error: 'Error al programar examen'
        });
    }
});

// PUT /api/art/exams/:id - Actualizar examen
router.put('/exams/:id', auth, async (req, res) => {
    try {
        const examId = parseInt(req.params.id);
        const examIndex = artExams.findIndex(e => e.id === examId);

        if (examIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Examen no encontrado'
            });
        }

        const updatedExam = {
            ...artExams[examIndex],
            ...req.body,
            id: examId,
            updated_at: new Date().toISOString()
        };

        artExams[examIndex] = updatedExam;

        res.json({
            success: true,
            message: 'Examen actualizado exitosamente',
            data: updatedExam
        });
    } catch (error) {
        console.error('Error updating exam:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar examen'
        });
    }
});

// DELETE /api/art/exams/:id - Cancelar examen
router.delete('/exams/:id', auth, async (req, res) => {
    try {
        const examId = parseInt(req.params.id);
        const examIndex = artExams.findIndex(e => e.id === examId);

        if (examIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Examen no encontrado'
            });
        }

        artExams.splice(examIndex, 1);

        res.json({
            success: true,
            message: 'Examen cancelado exitosamente'
        });
    } catch (error) {
        console.error('Error canceling exam:', error);
        res.status(500).json({
            success: false,
            error: 'Error al cancelar examen'
        });
    }
});

// ============================================================================
// DASHBOARD/STATS
// ============================================================================

// GET /api/art/dashboard - Dashboard con estadísticas
router.get('/dashboard', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id || 1;

        const providers = artProviders.filter(p => p.company_id === companyId);
        const accidents = artAccidents.filter(a => a.company_id === companyId);
        const exams = artExams.filter(e => e.company_id === companyId);

        const stats = {
            providers: {
                total: providers.length,
                active: providers.filter(p => p.status === 'active').length
            },
            accidents: {
                total: accidents.length,
                this_month: accidents.filter(a => {
                    const d = new Date(a.created_at);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }).length,
                pending: accidents.filter(a => a.status !== 'closed').length
            },
            exams: {
                total: exams.length,
                scheduled: exams.filter(e => e.status === 'scheduled').length,
                completed: exams.filter(e => e.status === 'completed').length
            },
            monthly_cost: providers.reduce((sum, p) => sum + (p.monthly_cost || 0), 0),
            employees_covered: providers.reduce((sum, p) => sum + (p.employees_covered || 0), 0)
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener dashboard'
        });
    }
});

module.exports = router;
