/**
 * 🖥️ RUTAS API - KIOSKS BIOMÉTRICOS
 * ===================================
 * Gestión completa de kiosks con perfiles de hardware
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

module.exports = (db) => {
    const { Kiosk, Company } = db;

    // ========================================================================
    // MIDDLEWARE: Extraer company_id del token JWT
    // ========================================================================

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'aponnt_2024_secret_key_ultra_secure';

    const getCompanyId = (req, res, next) => {
        try {
            const authHeader = req.headers['authorization'];
            if (!authHeader) {
                return res.status(401).json({ error: 'No se proporcionó token de autenticación' });
            }

            const token = authHeader.split(' ')[1]; // "Bearer TOKEN"
            if (!token) {
                return res.status(401).json({ error: 'Token mal formado' });
            }

            const decoded = jwt.verify(token, JWT_SECRET);
            req.companyId = decoded.company_id || decoded.companyId;
            req.user = decoded; // Por compatibilidad

            if (!req.companyId) {
                return res.status(401).json({ error: 'Token no contiene company_id' });
            }

            next();
        } catch (error) {
            console.error('❌ Error verificando token:', error.message);
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }
    };

    // ========================================================================
    // GET /api/kiosks - Listar todos los kiosks de la empresa
    // ========================================================================

    router.get('/', getCompanyId, async (req, res) => {
        try {
            const kiosks = await Kiosk.findAll({
                where: {
                    company_id: req.companyId
                },
                order: [['created_at', 'DESC']],
                attributes: [
                    'id',
                    'name',
                    'description',
                    'location',
                    'device_id',
                    'gps_lat',
                    'gps_lng',
                    'is_configured',
                    'is_active',
                    'company_id',
                    'authorized_departments',
                    // Hardware fields
                    'hardware_profile',
                    'hardware_category',
                    'detection_method_facial',
                    'detection_method_fingerprint',
                    'performance_score',
                    'supports_walkthrough',
                    'supports_liveness',
                    'biometric_modes',
                    'hardware_specs',
                    'created_at',
                    'updated_at'
                ]
            });

            res.json(kiosks);

        } catch (error) {
            console.error('❌ Error obteniendo kiosks:', error);
            res.status(500).json({
                error: 'Error al obtener kiosks',
                details: error.message
            });
        }
    });

    // ========================================================================
    // GET /api/kiosks/:id - Obtener un kiosk específico
    // ========================================================================

    router.get('/:id', getCompanyId, async (req, res) => {
        try {
            const kiosk = await Kiosk.findOne({
                where: {
                    id: req.params.id,
                    company_id: req.companyId
                }
            });

            if (!kiosk) {
                return res.status(404).json({ error: 'Kiosk no encontrado' });
            }

            res.json(kiosk);

        } catch (error) {
            console.error('❌ Error obteniendo kiosk:', error);
            res.status(500).json({
                error: 'Error al obtener kiosk',
                details: error.message
            });
        }
    });

    // ========================================================================
    // POST /api/kiosks - Crear nuevo kiosk
    // ========================================================================

    router.post('/', getCompanyId, async (req, res) => {
        try {
            const {
                name,
                description,
                location,
                device_id,
                gps_lat,
                gps_lng,
                is_active,
                authorized_departments,
                // Hardware fields
                hardware_profile,
                hardware_category,
                detection_method_facial,
                detection_method_fingerprint,
                performance_score,
                supports_walkthrough,
                supports_liveness,
                biometric_modes,
                hardware_specs
            } = req.body;

            // Validaciones
            if (!name || name.trim() === '') {
                return res.status(400).json({ error: 'El nombre del kiosk es obligatorio' });
            }

            if (!hardware_profile) {
                return res.status(400).json({ error: 'Debe seleccionar un hardware de reconocimiento facial' });
            }

            // Verificar que no exista un kiosk con el mismo nombre en la misma empresa
            const existingKiosk = await Kiosk.findOne({
                where: {
                    name: name.trim(),
                    company_id: req.companyId
                }
            });

            if (existingKiosk) {
                return res.status(400).json({
                    error: 'Ya existe un kiosk con ese nombre en su empresa'
                });
            }

            // Crear kiosk
            const newKiosk = await Kiosk.create({
                name: name.trim(),
                description: description?.trim() || '',
                location: location?.trim() || '',
                device_id: device_id?.trim() || null,
                gps_lat: gps_lat || null,
                gps_lng: gps_lng || null,
                is_active: is_active !== undefined ? is_active : true,
                is_configured: false, // Se configura desde la app
                company_id: req.companyId,
                authorized_departments: authorized_departments || [],
                // Hardware fields
                hardware_profile,
                hardware_category: hardware_category || null,
                detection_method_facial: detection_method_facial || null,
                detection_method_fingerprint: detection_method_fingerprint || null,
                performance_score: performance_score || 0,
                supports_walkthrough: supports_walkthrough || false,
                supports_liveness: supports_liveness || false,
                biometric_modes: biometric_modes || ['facial'],
                hardware_specs: hardware_specs || null
            });

            console.log('✅ Kiosk creado:', newKiosk.id, newKiosk.name);

            res.status(201).json({
                message: 'Kiosk creado exitosamente',
                kiosk: newKiosk
            });

        } catch (error) {
            console.error('❌ Error creando kiosk:', error);
            res.status(500).json({
                error: 'Error al crear kiosk',
                details: error.message
            });
        }
    });

    // ========================================================================
    // PUT /api/kiosks/:id - Actualizar kiosk
    // ========================================================================

    router.put('/:id', getCompanyId, async (req, res) => {
        try {
            const kiosk = await Kiosk.findOne({
                where: {
                    id: req.params.id,
                    company_id: req.companyId
                }
            });

            if (!kiosk) {
                return res.status(404).json({ error: 'Kiosk no encontrado' });
            }

            const {
                name,
                description,
                location,
                device_id,
                gps_lat,
                gps_lng,
                is_active,
                authorized_departments,
                // Hardware fields
                hardware_profile,
                hardware_category,
                detection_method_facial,
                detection_method_fingerprint,
                performance_score,
                supports_walkthrough,
                supports_liveness,
                biometric_modes,
                hardware_specs
            } = req.body;

            // Validar nombre único si se está cambiando
            if (name && name.trim() !== kiosk.name) {
                const existingKiosk = await Kiosk.findOne({
                    where: {
                        name: name.trim(),
                        company_id: req.companyId,
                        id: { [Op.ne]: req.params.id }
                    }
                });

                if (existingKiosk) {
                    return res.status(400).json({
                        error: 'Ya existe otro kiosk con ese nombre'
                    });
                }
            }

            // Actualizar campos
            await kiosk.update({
                name: name?.trim() || kiosk.name,
                description: description !== undefined ? description?.trim() : kiosk.description,
                location: location !== undefined ? location?.trim() : kiosk.location,
                device_id: device_id !== undefined ? device_id?.trim() : kiosk.device_id,
                gps_lat: gps_lat !== undefined ? gps_lat : kiosk.gps_lat,
                gps_lng: gps_lng !== undefined ? gps_lng : kiosk.gps_lng,
                is_active: is_active !== undefined ? is_active : kiosk.is_active,
                authorized_departments: authorized_departments !== undefined ? authorized_departments : kiosk.authorized_departments,
                // Hardware fields
                hardware_profile: hardware_profile || kiosk.hardware_profile,
                hardware_category: hardware_category !== undefined ? hardware_category : kiosk.hardware_category,
                detection_method_facial: detection_method_facial !== undefined ? detection_method_facial : kiosk.detection_method_facial,
                detection_method_fingerprint: detection_method_fingerprint !== undefined ? detection_method_fingerprint : kiosk.detection_method_fingerprint,
                performance_score: performance_score !== undefined ? performance_score : kiosk.performance_score,
                supports_walkthrough: supports_walkthrough !== undefined ? supports_walkthrough : kiosk.supports_walkthrough,
                supports_liveness: supports_liveness !== undefined ? supports_liveness : kiosk.supports_liveness,
                biometric_modes: biometric_modes !== undefined ? biometric_modes : kiosk.biometric_modes,
                hardware_specs: hardware_specs !== undefined ? hardware_specs : kiosk.hardware_specs
            });

            console.log('✅ Kiosk actualizado:', kiosk.id, kiosk.name);

            res.json({
                message: 'Kiosk actualizado exitosamente',
                kiosk
            });

        } catch (error) {
            console.error('❌ Error actualizando kiosk:', error);
            res.status(500).json({
                error: 'Error al actualizar kiosk',
                details: error.message
            });
        }
    });

    // ========================================================================
    // DELETE /api/kiosks/:id - Eliminar kiosk (soft delete)
    // ========================================================================

    router.delete('/:id', getCompanyId, async (req, res) => {
        try {
            const kiosk = await Kiosk.findOne({
                where: {
                    id: req.params.id,
                    company_id: req.companyId
                }
            });

            if (!kiosk) {
                return res.status(404).json({ error: 'Kiosk no encontrado' });
            }

            // Soft delete (paranoid: true en el modelo)
            await kiosk.destroy();

            console.log('✅ Kiosk eliminado:', kiosk.id, kiosk.name);

            res.json({
                message: 'Kiosk eliminado exitosamente'
            });

        } catch (error) {
            console.error('❌ Error eliminando kiosk:', error);
            res.status(500).json({
                error: 'Error al eliminar kiosk',
                details: error.message
            });
        }
    });

    // ========================================================================
    // GET /api/kiosks/:id/stats - Obtener estadísticas de un kiosk
    // ========================================================================

    router.get('/:id/stats', getCompanyId, async (req, res) => {
        try {
            const kiosk = await Kiosk.findOne({
                where: {
                    id: req.params.id,
                    company_id: req.companyId
                }
            });

            if (!kiosk) {
                return res.status(404).json({ error: 'Kiosk no encontrado' });
            }

            // TODO: Aquí se pueden agregar estadísticas de registros de asistencia
            // Por ahora, devolver info básica del kiosk

            res.json({
                kiosk: {
                    id: kiosk.id,
                    name: kiosk.name,
                    location: kiosk.location,
                    hardware_profile: kiosk.hardware_profile,
                    performance_score: kiosk.performance_score,
                    is_active: kiosk.is_active
                },
                stats: {
                    total_registrations_today: 0, // TODO: implementar
                    total_registrations_month: 0, // TODO: implementar
                    avg_response_time: 0 // TODO: implementar
                }
            });

        } catch (error) {
            console.error('❌ Error obteniendo stats de kiosk:', error);
            res.status(500).json({
                error: 'Error al obtener estadísticas',
                details: error.message
            });
        }
    });

    return router;
};
