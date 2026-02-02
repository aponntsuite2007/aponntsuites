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
    const JWT_SECRET = process.env.JWT_SECRET;

    const getCompanyId = (req, res, next) => {
        try {
            if (!JWT_SECRET) {
                console.error('❌ [KIOSKS] JWT_SECRET no configurado en variables de entorno');
                return res.status(500).json({ error: 'Configuración de seguridad no disponible' });
            }

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
                    // Campos adicionales de la BD
                    'has_external_reader',
                    'reader_model',
                    'reader_config',
                    'ip_address',
                    'port',
                    'last_seen',
                    'apk_version',
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
                // Campos adicionales de hardware externo
                has_external_reader,
                reader_model,
                reader_config,
                ip_address,
                port,
                // Campos de perfiles de hardware (reconocimiento facial/huella)
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
                // Campos de hardware externo
                has_external_reader: has_external_reader || false,
                reader_model: reader_model?.trim() || null,
                reader_config: reader_config || {},
                ip_address: ip_address?.trim() || null,
                port: port || 9998,
                // Campos de perfiles de hardware (reconocimiento facial/huella)
                hardware_profile: hardware_profile?.trim() || null,
                hardware_category: hardware_category?.trim() || null,
                detection_method_facial: detection_method_facial?.trim() || null,
                detection_method_fingerprint: detection_method_fingerprint?.trim() || null,
                performance_score: performance_score || 0,
                supports_walkthrough: supports_walkthrough || false,
                supports_liveness: supports_liveness || false,
                biometric_modes: biometric_modes || [],
                hardware_specs: hardware_specs || {}
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
                // Campos de hardware externo
                has_external_reader,
                reader_model,
                reader_config,
                ip_address,
                port,
                // Campos de perfiles de hardware (reconocimiento facial/huella)
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
                // Campos de hardware externo
                has_external_reader: has_external_reader !== undefined ? has_external_reader : kiosk.has_external_reader,
                reader_model: reader_model !== undefined ? reader_model?.trim() : kiosk.reader_model,
                reader_config: reader_config !== undefined ? reader_config : kiosk.reader_config,
                ip_address: ip_address !== undefined ? ip_address?.trim() : kiosk.ip_address,
                port: port !== undefined ? port : kiosk.port,
                // Campos de perfiles de hardware (reconocimiento facial/huella)
                hardware_profile: hardware_profile !== undefined ? hardware_profile?.trim() : kiosk.hardware_profile,
                hardware_category: hardware_category !== undefined ? hardware_category?.trim() : kiosk.hardware_category,
                detection_method_facial: detection_method_facial !== undefined ? detection_method_facial?.trim() : kiosk.detection_method_facial,
                detection_method_fingerprint: detection_method_fingerprint !== undefined ? detection_method_fingerprint?.trim() : kiosk.detection_method_fingerprint,
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
                    is_active: kiosk.is_active,
                    is_configured: kiosk.is_configured,
                    device_id: kiosk.device_id,
                    gps_lat: kiosk.gps_lat,
                    gps_lng: kiosk.gps_lng,
                    last_seen: kiosk.last_seen,
                    apk_version: kiosk.apk_version
                },
                stats: {
                    total_registrations_today: 0, // TODO: implementar con query a attendances
                    total_registrations_month: 0, // TODO: implementar con query a attendances
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

    // ========================================================================
    // POST /api/kiosks/:id/update-gps - Actualizar GPS del kiosk (desde Flutter APK)
    // ========================================================================
    // ⚠️ CRÍTICO: Este endpoint es llamado por Flutter en config_service.dart:413

    router.post('/:id/update-gps', async (req, res) => {
        try {
            const kioskId = req.params.id;
            const { company_id, gps_lat, gps_lng, device_id } = req.body;

            if (!company_id) {
                return res.status(400).json({ success: false, error: 'company_id es requerido' });
            }

            if (gps_lat === undefined || gps_lng === undefined) {
                return res.status(400).json({ success: false, error: 'gps_lat y gps_lng son requeridos' });
            }

            const lat = parseFloat(gps_lat);
            const lng = parseFloat(gps_lng);

            if (isNaN(lat) || lat < -90 || lat > 90) {
                return res.status(400).json({ success: false, error: 'gps_lat debe estar entre -90 y 90' });
            }

            if (isNaN(lng) || lng < -180 || lng > 180) {
                return res.status(400).json({ success: false, error: 'gps_lng debe estar entre -180 y 180' });
            }

            const kiosk = await Kiosk.findOne({
                where: { id: kioskId, company_id: parseInt(company_id) }
            });

            if (!kiosk) {
                return res.status(404).json({ success: false, error: 'Kiosk no encontrado' });
            }

            const updateData = { gps_lat: lat, gps_lng: lng, is_configured: true };
            if (device_id) updateData.device_id = device_id.trim();

            await kiosk.update(updateData);
            console.log(`📍 [KIOSK] GPS actualizado para kiosk ${kioskId}: ${lat}, ${lng}`);

            res.json({
                success: true,
                message: 'GPS actualizado correctamente',
                kiosk: { id: kiosk.id, name: kiosk.name, gps_lat: kiosk.gps_lat, gps_lng: kiosk.gps_lng, is_configured: kiosk.is_configured }
            });

        } catch (error) {
            console.error('❌ Error actualizando GPS de kiosk:', error);
            res.status(500).json({ success: false, error: 'Error al actualizar GPS', details: error.message });
        }
    });

    // ========================================================================
    // POST /api/kiosks/:id/activate - Activar kiosk (desde Flutter APK)
    // ========================================================================

    router.post('/:id/activate', async (req, res) => {
        try {
            const kioskId = req.params.id;
            const { device_id, company_id, gps_lat, gps_lng } = req.body;

            if (!device_id || !company_id) {
                return res.status(400).json({ success: false, error: 'device_id y company_id son requeridos' });
            }

            const kiosk = await Kiosk.findOne({
                where: { id: kioskId, company_id: parseInt(company_id) }
            });

            if (!kiosk) {
                return res.status(404).json({ success: false, error: 'Kiosk no encontrado' });
            }

            if (kiosk.is_active && kiosk.device_id && kiosk.device_id !== device_id) {
                return res.status(409).json({ success: false, error: 'Kiosk ya está activado en otro dispositivo', code: 'ALREADY_ACTIVATED' });
            }

            await kiosk.update({
                device_id: device_id.trim(),
                is_active: true,
                is_configured: true,
                gps_lat: gps_lat || kiosk.gps_lat,
                gps_lng: gps_lng || kiosk.gps_lng,
                last_seen: new Date()
            });

            console.log(`✅ [KIOSK] Kiosk ${kioskId} activado con device_id: ${device_id}`);
            res.status(200).json({ success: true, message: 'Kiosk activado correctamente', kiosk: { id: kiosk.id, name: kiosk.name, device_id: kiosk.device_id, is_active: kiosk.is_active } });

        } catch (error) {
            console.error('❌ Error activando kiosk:', error);
            res.status(500).json({ success: false, error: 'Error al activar kiosk', details: error.message });
        }
    });

    // ========================================================================
    // POST /api/kiosks/:id/deactivate - Desactivar kiosk (desde Flutter APK)
    // ========================================================================

    router.post('/:id/deactivate', async (req, res) => {
        try {
            const kioskId = req.params.id;
            const { company_id } = req.body;

            if (!company_id) {
                return res.status(400).json({ success: false, error: 'company_id es requerido' });
            }

            const kiosk = await Kiosk.findOne({
                where: { id: kioskId, company_id: parseInt(company_id) }
            });

            if (!kiosk) {
                return res.status(404).json({ success: false, error: 'Kiosk no encontrado' });
            }

            await kiosk.update({ device_id: null, is_active: false, is_configured: false });
            console.log(`🔒 [KIOSK] Kiosk ${kioskId} desactivado`);

            res.json({ success: true, message: 'Kiosk desactivado correctamente' });

        } catch (error) {
            console.error('❌ Error desactivando kiosk:', error);
            res.status(500).json({ success: false, error: 'Error al desactivar kiosk', details: error.message });
        }
    });

    // ========================================================================
    // GET /api/kiosks/:id/geofence-zones - Obtener zonas de geofencing del kiosk
    // ========================================================================

    router.get('/:id/geofence-zones', async (req, res) => {
        try {
            const kioskId = req.params.id;
            const company_id = req.query.company_id;

            if (!company_id) {
                return res.status(400).json({ success: false, error: 'company_id es requerido como query param' });
            }

            const kiosk = await Kiosk.findOne({
                where: { id: kioskId, company_id: parseInt(company_id) }
            });

            if (!kiosk) {
                return res.status(404).json({ success: false, error: 'Kiosk no encontrado' });
            }

            const geofenceZones = [];
            if (kiosk.gps_lat && kiosk.gps_lng) {
                geofenceZones.push({
                    id: `kiosk_${kiosk.id}_zone`,
                    name: `Zona ${kiosk.name}`,
                    type: 'circle',
                    center: { lat: parseFloat(kiosk.gps_lat), lng: parseFloat(kiosk.gps_lng) },
                    radius: 100,
                    is_active: true
                });
            }

            res.json({
                success: true,
                kiosk: { id: kiosk.id, name: kiosk.name, gps_lat: kiosk.gps_lat, gps_lng: kiosk.gps_lng },
                geofenceZones: geofenceZones,
                defaultRadius: 100
            });

        } catch (error) {
            console.error('❌ Error obteniendo geofence zones:', error);
            res.status(500).json({ success: false, error: 'Error al obtener zonas de geofencing', details: error.message });
        }
    });

    return router;
};
