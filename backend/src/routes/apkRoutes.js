const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const QRCode = require('qrcode');
const { sequelize } = require('../config/database');

// 📱 Ruta para descargar la APK preconfigurada
router.get('/download/:companyId?', async (req, res) => {
    try {
        const { companyId } = req.params;

        console.log('📱 [APK] Solicitud de descarga de APK', companyId ? `para empresa: ${companyId}` : 'genérica');

        const apkPath = path.join(__dirname, '../../public/downloads/attendance-system.apk');

        // Verificar que el archivo existe
        if (!fs.existsSync(apkPath)) {
            console.log('❌ [APK] Archivo APK no encontrado:', apkPath);
            return res.status(404).json({
                success: false,
                error: 'APK no encontrada'
            });
        }

        // Si se especifica empresa, generar configuración específica
        if (companyId) {
            try {
                // Obtener datos de la empresa
                const [companies] = await sequelize.query(`
                    SELECT company_id, name, slug, legal_name
                    FROM companies
                    WHERE id = ? AND is_active = true
                `, {
                    replacements: [companyId],
                    type: sequelize.QueryTypes.SELECT
                });

                if (companies && companies.length > 0) {
                    const company = companies[0];

                    // Crear configuración embebida
                    const serverHost = req.get('host');
                    const [serverIp, serverPort] = serverHost.split(':');

                    const configData = {
                        companyId: company.company_id,
                        companyName: company.name,
                        companySlug: company.slug,
                        serverUrl: `http://${serverIp === 'localhost' ? '192.168.1.10' : serverIp}:${serverPort || '9999'}`,
                        preconfigured: true,
                        configVersion: '1.0.0',
                        generatedAt: new Date().toISOString()
                    };

                    // Crear directorio temporal para configuración
                    const configDir = path.join(__dirname, '../../public/downloads/configs');
                    if (!fs.existsSync(configDir)) {
                        fs.mkdirSync(configDir, { recursive: true });
                    }

                    // Escribir archivo de configuración
                    const configPath = path.join(configDir, `company-${companyId}-config.json`);
                    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

                    console.log('✅ [APK] Configuración creada para empresa:', company.name);
                }
            } catch (configError) {
                console.error('⚠️ [APK] Error generando configuración:', configError);
                // Continuar con descarga normal si falla la configuración
            }
        }

        // Configurar headers para descarga
        const filename = companyId ? `attendance-system-empresa-${companyId}.apk` : 'attendance-system.apk';
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');

        console.log('✅ [APK] Enviando archivo APK para descarga:', filename);

        // Enviar el archivo
        res.sendFile(apkPath);

    } catch (error) {
        console.error('❌ [APK] Error en descarga:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// 📱 Información de la APK
router.get('/info', (req, res) => {
    try {
        const apkPath = path.join(__dirname, '../../public/downloads/attendance-system.apk');
        const exists = fs.existsSync(apkPath);

        let fileSize = 0;
        let lastModified = null;

        if (exists) {
            const stats = fs.statSync(apkPath);
            fileSize = stats.size;
            lastModified = stats.mtime;
        }

        res.json({
            success: true,
            data: {
                available: exists,
                filename: 'attendance-system.apk',
                size: fileSize,
                sizeFormatted: formatBytes(fileSize),
                lastModified: lastModified,
                version: '1.0.0',
                features: [
                    'Autenticación biométrica completa',
                    'Sistema multi-tenant',
                    'Reconocimiento de voz',
                    'Notificaciones bidireccionales',
                    'Conexión a base de datos real'
                ],
                downloadUrl: '/api/apk/download'
            }
        });

    } catch (error) {
        console.error('❌ [APK] Error obteniendo info:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// 📱 Envío por WhatsApp
router.post('/send-whatsapp', async (req, res) => {
    try {
        const { employeeId, phone, message } = req.body;

        console.log('📱 [WHATSAPP] Solicitud de envío de APK por WhatsApp');
        console.log('📱 [WHATSAPP] Empleado:', employeeId, 'Teléfono:', phone);

        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Número de teléfono requerido'
            });
        }

        // Verificar que el archivo APK existe
        const apkPath = path.join(__dirname, '../../public/downloads/attendance-system.apk');
        if (!fs.existsSync(apkPath)) {
            return res.status(404).json({
                success: false,
                error: 'APK no encontrada'
            });
        }

        // Crear mensaje de WhatsApp
        const whatsappMessage = message || `🏢 *Sistema de Asistencia Biométrico*

📱 Hola! Te enviamos la aplicación móvil de control de asistencia.

✨ *Características:*
• Autenticación biométrica completa
• Reconocimiento facial y de huella
• Códigos QR temporales
• Reconocimiento de voz (accesibilidad)
• Notificaciones en tiempo real

📥 *Descarga:* ${req.protocol}://${req.get('host')}/api/apk/download

🔒 *Seguridad:* Datos completamente aislados por empresa

¿Necesitas ayuda con la instalación? ¡Contáctanos!`;

        // Formatear número de teléfono
        let formattedPhone = phone.replace(/\D/g, ''); // Remover caracteres no numéricos

        // Si no empieza con código de país, agregar +54 (Argentina)
        if (!formattedPhone.startsWith('54') && formattedPhone.length <= 10) {
            formattedPhone = '54' + formattedPhone;
        }

        // URL de WhatsApp Web/API
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappMessage)}`;

        console.log('✅ [WHATSAPP] URL generada:', whatsappUrl);

        // En un escenario real, aquí se integraría con una API de WhatsApp Business
        // Por ahora, devolvemos la URL para abrir WhatsApp Web

        res.json({
            success: true,
            data: {
                whatsappUrl: whatsappUrl,
                phone: formattedPhone,
                message: whatsappMessage,
                employeeId: employeeId,
                timestamp: new Date().toISOString()
            },
            message: 'URL de WhatsApp generada correctamente'
        });

        console.log('✅ [WHATSAPP] Respuesta enviada exitosamente');

    } catch (error) {
        console.error('❌ [WHATSAPP] Error enviando por WhatsApp:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// 📱 Configuración de WhatsApp empresarial
router.get('/whatsapp-config', (req, res) => {
    try {
        // En un escenario real, esto vendría de la configuración de la empresa
        res.json({
            success: true,
            data: {
                businessPhone: '5491123456789',
                businessName: 'Sistema de Asistencia',
                isConfigured: true,
                apiIntegration: false, // Cambiar a true cuando se integre API real
                supportedFeatures: [
                    'Envío de enlaces',
                    'Mensajes de texto',
                    'Configuración personalizada'
                ]
            }
        });

    } catch (error) {
        console.error('❌ [WHATSAPP-CONFIG] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// 📱 Configuración APK específica por empresa
router.get('/config/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;

        console.log('📱 [APK-CONFIG] Generando configuración para empresa:', companyId);

        // Obtener datos de la empresa
        const [companies] = await sequelize.query(`
            SELECT company_id, name, slug, legal_name, contact_email, phone, address
            FROM companies
            WHERE id = ? AND is_active = true
        `, {
            replacements: [companyId],
            type: sequelize.QueryTypes.SELECT
        });

        if (!companies || companies.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Empresa no encontrada'
            });
        }

        const company = companies[0];

        // Detectar IP y puerto del servidor actual
        const serverHost = req.get('host'); // localhost:9999 o IP:puerto
        const [serverIp, serverPort] = serverHost.split(':');

        // Configuración específica para esta empresa
        const apkConfig = {
            company: {
                id: company.company_id,
                name: company.name,
                slug: company.slug,
                legalName: company.legal_name,
                logo: null // Se puede agregar después
            },
            server: {
                host: serverIp === 'localhost' ? '192.168.1.10' : serverIp, // IP real para APK
                port: serverPort || '9999',
                protocol: 'http',
                baseUrl: `http://${serverIp === 'localhost' ? '192.168.1.10' : serverIp}:${serverPort || '9999'}`
            },
            endpoints: {
                login: '/api/v1/auth/login',
                companies: '/api/v1/auth/companies',
                attendance: '/api/v1/attendance',
                biometric: '/api/v2/biometric',
                profile: '/api/v1/auth/me'
            },
            features: {
                biometricAuth: true,
                faceRecognition: true,
                voiceCommands: true,
                gpsTracking: true,
                offlineMode: false
            },
            ui: {
                theme: 'default',
                companyColors: {
                    primary: '#2196F3',
                    secondary: '#FFC107',
                    accent: '#4CAF50'
                }
            },
            version: '1.0.0',
            buildDate: new Date().toISOString(),
            preconfigured: true
        };

        console.log('✅ [APK-CONFIG] Configuración generada para:', company.name);

        res.json({
            success: true,
            config: apkConfig
        });

    } catch (error) {
        console.error('❌ [APK-CONFIG] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// 📱 Registro de descargas/envíos
router.post('/log-action', (req, res) => {
    try {
        const { action, employeeId, userAgent, ip } = req.body;

        console.log('📊 [APK-LOG] Acción registrada:', {
            action: action, // 'download' o 'whatsapp_sent'
            employeeId: employeeId,
            timestamp: new Date().toISOString(),
            userAgent: userAgent,
            ip: ip
        });

        // Aquí se podría guardar en base de datos para estadísticas

        res.json({
            success: true,
            message: 'Acción registrada correctamente'
        });

    } catch (error) {
        console.error('❌ [APK-LOG] Error registrando acción:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// 📱 Generar QRs para empleados (Descarga + Configuración)
router.get('/generate-qrs/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;

        console.log('📱 [QR-GEN] Generando QRs para empresa:', companyId);

        // Obtener datos de la empresa
        const [companies] = await sequelize.query(`
            SELECT company_id, name, slug, legal_name, contact_email, phone
            FROM companies
            WHERE id = ? AND is_active = true
        `, {
            replacements: [companyId],
            type: sequelize.QueryTypes.SELECT
        });

        if (!companies || companies.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Empresa no encontrada'
            });
        }

        const company = companies[0];

        // Detectar IP y puerto del servidor actual
        const serverHost = req.get('host');
        const [serverIp, serverPort] = serverHost.split(':');
        const realServerIp = serverIp === 'localhost' ? '172.24.0.1' : serverIp;
        const realServerPort = serverPort || '9999';

        // QR 1: Link directo para descarga de APK desde internet
        const downloadURL = `http://${realServerIp}:${realServerPort}/api/apk/download`;
        console.log('📱 [QR-GEN] URL de descarga:', downloadURL);

        const downloadQROptions = {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            width: 300
        };

        const downloadQR = await QRCode.toDataURL(downloadURL, downloadQROptions);

        // QR 2: Configuración de empresa (para usar después de instalar)
        const setupCode = `${company.slug.toUpperCase()}-2025-${company.company_id}`;
        const configData = {
            type: 'company_setup',
            companyId: parseInt(company.company_id),
            companyName: company.name,
            companySlug: company.slug,
            serverUrl: `http://${realServerIp}:${realServerPort}`,
            setupCode: setupCode,
            generatedAt: new Date().toISOString(),
            version: '1.0'
        };

        console.log('📱 [QR-GEN] Configuración generada:', configData);

        const configQR = await QRCode.toDataURL(JSON.stringify(configData), downloadQROptions);

        // Preparar respuesta completa
        const response = {
            success: true,
            company: {
                id: company.company_id,
                name: company.name,
                slug: company.slug,
                legalName: company.legal_name
            },
            qrs: {
                downloadQR: downloadQR,
                configQR: configQR
            },
            urls: {
                downloadURL: downloadURL,
                serverURL: `http://${realServerIp}:${realServerPort}`
            },
            setupCode: setupCode,
            instructions: {
                step1: {
                    title: "QR 1: Descargar Aplicación",
                    description: "Escanear para descargar la app desde internet",
                    action: "Descarga automática del archivo APK"
                },
                step2: {
                    title: "Instalar Aplicación",
                    description: "Instalar el archivo APK descargado en el teléfono",
                    action: "Permitir instalación de fuentes desconocidas si es necesario"
                },
                step3: {
                    title: "QR 2: Configurar Empresa",
                    description: "Abrir app y escanear este QR para configurar automáticamente",
                    action: "App queda lista para usar con datos de la empresa"
                },
                step4: {
                    title: "Iniciar Sesión",
                    description: "Ingresar usuario y contraseña asignados por RRHH",
                    action: "Comenzar a usar el sistema de asistencia"
                }
            },
            generatedAt: new Date().toISOString(),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 año
        };

        console.log('✅ [QR-GEN] QRs generados exitosamente para:', company.name);

        res.json(response);

    } catch (error) {
        console.error('❌ [QR-GEN] Error generando QRs:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// 📱 Endpoint para validar código de setup manual
router.get('/setup/:setupCode', async (req, res) => {
    try {
        const { setupCode } = req.params;
        console.log('📱 [SETUP] Validando código:', setupCode);

        // Parsear código: EMPRESA-2025-ID
        const parts = setupCode.split('-');
        if (parts.length !== 3) {
            return res.status(400).json({
                success: false,
                error: 'Formato de código inválido. Use: EMPRESA-2025-ID'
            });
        }

        const [slugUpper, year, companyId] = parts;
        const slug = slugUpper.toLowerCase();

        // Buscar empresa
        const [companies] = await sequelize.query(`
            SELECT company_id, name, slug, legal_name
            FROM companies
            WHERE id = ? AND slug = ? AND is_active = true
        `, {
            replacements: [companyId, slug],
            type: sequelize.QueryTypes.SELECT
        });

        if (!companies || companies.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Código inválido o empresa no encontrada'
            });
        }

        const company = companies[0];

        // Detectar servidor
        const serverHost = req.get('host');
        const [serverIp, serverPort] = serverHost.split(':');
        const realServerIp = serverIp === 'localhost' ? '172.24.0.1' : serverIp;
        const realServerPort = serverPort || '9999';

        const configData = {
            type: 'company_setup',
            companyId: parseInt(company.company_id),
            companyName: company.name,
            companySlug: company.slug,
            serverUrl: `http://${realServerIp}:${realServerPort}`,
            setupCode: setupCode,
            valid: true,
            generatedAt: new Date().toISOString()
        };

        console.log('✅ [SETUP] Código validado para:', company.name);

        res.json(configData);

    } catch (error) {
        console.error('❌ [SETUP] Error validando código:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Función auxiliar para formatear bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;