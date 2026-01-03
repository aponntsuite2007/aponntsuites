/**
 * ========================================================================
 * RUTAS API: Recetas Electrónicas
 * ========================================================================
 * Endpoints REST para gestión de recetas electrónicas multi-país
 *
 * Base path: /api/prescriptions/electronic
 *
 * Autenticación: Requiere JWT token
 * Roles permitidos: doctor (crear/firmar), employee (ver), admin (admin)
 * ========================================================================
 */

const express = require('express');
const router = express.Router();

module.exports = (database, notificationService) => {
    const ElectronicPrescriptionService = require('./ElectronicPrescriptionService');
    const prescriptionService = new ElectronicPrescriptionService(database, notificationService);

    /**
     * POST /api/prescriptions/electronic
     * Crear nueva receta electrónica
     *
     * Body:
     * {
     *   employee_id: number,
     *   doctor_id: number,
     *   company_id: number,
     *   medical_case_id?: number,
     *   medication_name: string,
     *   medication_type?: 'brand' | 'generic',
     *   active_ingredient?: string,
     *   dosage: string,
     *   quantity: number,
     *   duration_days: number,
     *   instructions?: string,
     *   is_controlled?: boolean,
     *   control_level?: 'none' | 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5',
     *   country: 'AR' | 'BR' | 'MX' | 'US',
     *   anmat_registration?: string,
     *   anvisa_registration?: string,
     *   notification_b?: boolean,
     *   cofepris_registration?: string,
     *   dea_number?: string
     * }
     */
    router.post('/', async (req, res) => {
        try {
            const userId = req.user?.user_id || req.user?.id;

            // Validar que el usuario sea médico (partner) o admin
            const isDoctor = req.user?.role === 'medical' || req.user?.partner_id;
            const isAdmin = req.user?.role === 'admin';

            if (!isDoctor && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'Solo médicos pueden crear recetas electrónicas'
                });
            }

            const prescriptionData = {
                ...req.body,
                created_by: userId
            };

            const prescription = await prescriptionService.createPrescription(prescriptionData);

            res.status(201).json({
                success: true,
                message: 'Receta electrónica creada exitosamente',
                data: prescription
            });

        } catch (error) {
            console.error('❌ [API] Error creando receta:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error creando receta electrónica',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * GET /api/prescriptions/electronic/:id
     * Obtener receta electrónica por ID
     */
    router.get('/:id', async (req, res) => {
        try {
            const prescriptionId = req.params.id;

            const prescription = await database.ElectronicPrescription.findByPk(prescriptionId, {
                include: [
                    {
                        model: database.User,
                        as: 'employee',
                        attributes: ['id', 'firstName', 'lastName', 'email']
                    },
                    {
                        model: database.Partner,
                        as: 'doctor',
                        attributes: ['id', 'firstName', 'lastName', 'specialty', 'licenseNumber']
                    },
                    {
                        model: database.Company,
                        as: 'company',
                        attributes: ['id', 'name']
                    }
                ]
            });

            if (!prescription) {
                return res.status(404).json({
                    success: false,
                    message: 'Receta no encontrada'
                });
            }

            // Verificar permisos (solo el empleado, el médico o admin)
            const userId = req.user?.user_id || req.user?.id;
            const isOwner = prescription.employee_id === parseInt(userId);
            const isDoctor = prescription.doctor_id === req.user?.partner_id;
            const isAdmin = req.user?.role === 'admin';

            if (!isOwner && !isDoctor && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para ver esta receta'
                });
            }

            res.json({
                success: true,
                data: prescription
            });

        } catch (error) {
            console.error('❌ [API] Error obteniendo receta:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo receta',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * GET /api/prescriptions/electronic/employee/:employeeId
     * Obtener todas las recetas de un empleado
     */
    router.get('/employee/:employeeId', async (req, res) => {
        try {
            const employeeId = req.params.employeeId;

            // Verificar permisos
            const userId = req.user?.user_id || req.user?.id;
            const isOwner = parseInt(employeeId) === parseInt(userId);
            const isAdmin = req.user?.role === 'admin';

            if (!isOwner && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para ver estas recetas'
                });
            }

            const filters = {
                status: req.query.status,
                is_controlled: req.query.is_controlled === 'true',
                country: req.query.country
            };

            const prescriptions = await prescriptionService.getEmployeePrescriptions(employeeId, filters);

            res.json({
                success: true,
                count: prescriptions.length,
                data: prescriptions
            });

        } catch (error) {
            console.error('❌ [API] Error obteniendo recetas:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo recetas',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * GET /api/prescriptions/electronic/doctor/:doctorId
     * Obtener todas las recetas de un médico
     */
    router.get('/doctor/:doctorId', async (req, res) => {
        try {
            const doctorId = req.params.doctorId;

            // Verificar permisos
            const isDoctor = parseInt(doctorId) === req.user?.partner_id;
            const isAdmin = req.user?.role === 'admin';

            if (!isDoctor && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para ver estas recetas'
                });
            }

            const filters = {
                status: req.query.status,
                date_from: req.query.date_from,
                limit: req.query.limit ? parseInt(req.query.limit) : 100
            };

            const prescriptions = await prescriptionService.getDoctorPrescriptions(doctorId, filters);

            res.json({
                success: true,
                count: prescriptions.length,
                data: prescriptions
            });

        } catch (error) {
            console.error('❌ [API] Error obteniendo recetas del médico:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo recetas',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * PUT /api/prescriptions/electronic/:id/sign
     * Firmar receta digitalmente
     *
     * Body:
     * {
     *   signature: string,
     *   certificate: string,
     *   signature_type?: 'afip' | 'icp_brasil' | 'fiel_mexico' | 'dea_usa'
     * }
     */
    router.put('/:id/sign', async (req, res) => {
        try {
            const prescriptionId = req.params.id;

            // Verificar que el usuario sea el médico que emitió la receta
            const prescription = await database.ElectronicPrescription.findByPk(prescriptionId);
            if (!prescription) {
                return res.status(404).json({
                    success: false,
                    message: 'Receta no encontrada'
                });
            }

            const isDoctor = prescription.doctor_id === req.user?.partner_id;
            const isAdmin = req.user?.role === 'admin';

            if (!isDoctor && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'Solo el médico emisor puede firmar la receta'
                });
            }

            const signatureData = {
                signature: req.body.signature,
                certificate: req.body.certificate,
                signature_type: req.body.signature_type
            };

            const signedPrescription = await prescriptionService.signPrescription(prescriptionId, signatureData);

            res.json({
                success: true,
                message: 'Receta firmada digitalmente',
                data: signedPrescription
            });

        } catch (error) {
            console.error('❌ [API] Error firmando receta:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error firmando receta',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * PUT /api/prescriptions/electronic/:id/dispense
     * Dispensar receta (farmacia)
     *
     * Body:
     * {
     *   pharmacy_id?: number,
     *   dispensed_by: string
     * }
     */
    router.put('/:id/dispense', async (req, res) => {
        try {
            const prescriptionId = req.params.id;

            const dispensingData = {
                pharmacy_id: req.body.pharmacy_id,
                dispensed_by: req.body.dispensed_by
            };

            const dispensedPrescription = await prescriptionService.dispensePrescription(prescriptionId, dispensingData);

            res.json({
                success: true,
                message: 'Receta dispensada exitosamente',
                data: dispensedPrescription
            });

        } catch (error) {
            console.error('❌ [API] Error dispensando receta:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error dispensando receta',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * DELETE /api/prescriptions/electronic/:id
     * Cancelar receta
     *
     * Body:
     * {
     *   reason: string
     * }
     */
    router.delete('/:id', async (req, res) => {
        try {
            const prescriptionId = req.params.id;

            // Verificar que el usuario sea el médico que emitió la receta o admin
            const prescription = await database.ElectronicPrescription.findByPk(prescriptionId);
            if (!prescription) {
                return res.status(404).json({
                    success: false,
                    message: 'Receta no encontrada'
                });
            }

            const isDoctor = prescription.doctor_id === req.user?.partner_id;
            const isAdmin = req.user?.role === 'admin';

            if (!isDoctor && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'Solo el médico emisor puede cancelar la receta'
                });
            }

            const reason = req.body.reason || 'Cancelada por el médico';
            const cancelledPrescription = await prescriptionService.cancelPrescription(prescriptionId, reason);

            res.json({
                success: true,
                message: 'Receta cancelada',
                data: cancelledPrescription
            });

        } catch (error) {
            console.error('❌ [API] Error cancelando receta:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error cancelando receta',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * GET /api/prescriptions/electronic/:id/pdf
     * Descargar receta en PDF
     * TODO: Implementar generación de PDF con PDFKit o Puppeteer
     */
    router.get('/:id/pdf', async (req, res) => {
        try {
            const prescriptionId = req.params.id;

            const prescription = await database.ElectronicPrescription.findByPk(prescriptionId, {
                include: [
                    { model: database.User, as: 'employee' },
                    { model: database.Partner, as: 'doctor' },
                    { model: database.Company, as: 'company' }
                ]
            });

            if (!prescription) {
                return res.status(404).json({
                    success: false,
                    message: 'Receta no encontrada'
                });
            }

            if (prescription.status !== 'signed' && prescription.status !== 'dispensed') {
                return res.status(400).json({
                    success: false,
                    message: 'La receta debe estar firmada para generar PDF'
                });
            }

            // TODO: Implementar generación de PDF
            // Por ahora retornar placeholder
            res.json({
                success: true,
                message: 'Generación de PDF - Funcionalidad pendiente',
                data: {
                    prescription_number: prescription.prescription_number,
                    pdf_url: prescription.pdf_url || null,
                    qr_code: prescription.qr_code
                }
            });

        } catch (error) {
            console.error('❌ [API] Error generando PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando PDF',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * GET /api/prescriptions/electronic/:id/qr
     * Obtener QR Code de la receta
     */
    router.get('/:id/qr', async (req, res) => {
        try {
            const prescriptionId = req.params.id;

            const prescription = await database.ElectronicPrescription.findByPk(prescriptionId);

            if (!prescription) {
                return res.status(404).json({
                    success: false,
                    message: 'Receta no encontrada'
                });
            }

            if (!prescription.qr_code) {
                return res.status(400).json({
                    success: false,
                    message: 'Receta no tiene QR Code (debe estar firmada)'
                });
            }

            // Retornar QR Code como data URL
            res.json({
                success: true,
                data: {
                    qr_code: prescription.qr_code,
                    prescription_number: prescription.prescription_number,
                    format: 'image/png'
                }
            });

        } catch (error) {
            console.error('❌ [API] Error obteniendo QR Code:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo QR Code',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    return router;
};
