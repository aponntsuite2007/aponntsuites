const express = require('express');
const router = express.Router();

// GET /api/pricing
router.get('/pricing', async (req, res) => {
    try {
        console.log('💰 Obteniendo información de precios...');

        // Mock data de precios del sistema
        const pricingData = {
            modules: {
                attendance: {
                    name: 'Control de Asistencia',
                    basePrice: 2500,
                    pricePerUser: 50,
                    features: ['Registro biométrico', 'Reportes en tiempo real', 'Horarios flexibles']
                },
                management: {
                    name: 'Gestión de Personal',
                    basePrice: 3500,
                    pricePerUser: 75,
                    features: ['Perfiles de empleado', 'Departamentos', 'Evaluaciones']
                },
                scheduling: {
                    name: 'Planificación de Turnos',
                    basePrice: 4000,
                    pricePerUser: 100,
                    features: ['Turnos rotativos', 'Planificación automática', 'Notificaciones']
                },
                payroll: {
                    name: 'Nómina y Pagos',
                    basePrice: 5000,
                    pricePerUser: 150,
                    features: ['Cálculo automático', 'Integración bancaria', 'Recibos digitales']
                }
            },
            packages: {
                basic: {
                    name: 'Paquete Básico',
                    modules: ['attendance'],
                    discount: 0,
                    totalPrice: 2500,
                    maxUsers: 50
                },
                standard: {
                    name: 'Paquete Estándar',
                    modules: ['attendance', 'management'],
                    discount: 10,
                    totalPrice: 5400, // (2500 + 3500) * 0.9
                    maxUsers: 100
                },
                premium: {
                    name: 'Paquete Premium',
                    modules: ['attendance', 'management', 'scheduling'],
                    discount: 15,
                    totalPrice: 8500, // (2500 + 3500 + 4000) * 0.85
                    maxUsers: 200
                },
                enterprise: {
                    name: 'Paquete Empresarial',
                    modules: ['attendance', 'management', 'scheduling', 'payroll'],
                    discount: 20,
                    totalPrice: 12000, // (2500 + 3500 + 4000 + 5000) * 0.8
                    maxUsers: 'unlimited'
                }
            },
            commissionRates: {
                vendor: {
                    sales: {
                        min: 5,
                        max: 15,
                        default: 10
                    },
                    support: {
                        min: 3,
                        max: 10,
                        default: 5
                    },
                    referral: {
                        level1: 5,
                        level2: 3,
                        level3: 2
                    }
                }
            },
            currency: 'ARS',
            vatIncluded: true,
            lastUpdate: new Date().toISOString()
        };

        res.json({
            success: true,
            modules: pricingData.modules,
            packages: pricingData.packages,
            commissionRates: pricingData.commissionRates,
            currency: pricingData.currency,
            vatIncluded: pricingData.vatIncluded,
            lastUpdate: pricingData.lastUpdate,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error obteniendo precios:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// GET /api/pricing/calculate
router.get('/pricing/calculate', async (req, res) => {
    try {
        const { modules, users, packageType } = req.query;

        if (!modules && !packageType) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere especificar módulos o tipo de paquete'
            });
        }

        const userCount = parseInt(users) || 1;
        let totalPrice = 0;
        let breakdown = {};

        // Precios base de módulos
        const modulePrices = {
            attendance: { base: 2500, perUser: 50 },
            management: { base: 3500, perUser: 75 },
            scheduling: { base: 4000, perUser: 100 },
            payroll: { base: 5000, perUser: 150 }
        };

        if (packageType) {
            // Cálculo por paquete
            const packageDiscounts = {
                basic: 0,
                standard: 0.1,
                premium: 0.15,
                enterprise: 0.2
            };

            const packageModules = {
                basic: ['attendance'],
                standard: ['attendance', 'management'],
                premium: ['attendance', 'management', 'scheduling'],
                enterprise: ['attendance', 'management', 'scheduling', 'payroll']
            };

            const selectedModules = packageModules[packageType] || [];
            let subtotal = 0;

            selectedModules.forEach(module => {
                const modulePrice = modulePrices[module];
                if (modulePrice) {
                    const moduleTotal = modulePrice.base + (modulePrice.perUser * userCount);
                    breakdown[module] = moduleTotal;
                    subtotal += moduleTotal;
                }
            });

            const discount = packageDiscounts[packageType] || 0;
            const discountAmount = subtotal * discount;
            totalPrice = subtotal - discountAmount;

            breakdown.subtotal = subtotal;
            breakdown.discount = discountAmount;
            breakdown.discountPercentage = discount * 100;

        } else {
            // Cálculo por módulos individuales
            const moduleList = modules.split(',');

            moduleList.forEach(module => {
                const modulePrice = modulePrices[module.trim()];
                if (modulePrice) {
                    const moduleTotal = modulePrice.base + (modulePrice.perUser * userCount);
                    breakdown[module.trim()] = moduleTotal;
                    totalPrice += moduleTotal;
                }
            });
        }

        res.json({
            success: true,
            data: {
                totalPrice: Math.round(totalPrice),
                breakdown,
                users: userCount,
                currency: 'ARS',
                vatIncluded: true
            }
        });

    } catch (error) {
        console.error('❌ Error calculando precios:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

module.exports = router;