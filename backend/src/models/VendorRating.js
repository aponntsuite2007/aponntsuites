const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const VendorRating = sequelize.define('VendorRating', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        vendorId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'vendor_id',
            references: {
                model: 'users',
                key: 'id'
            }
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'company_id',
            references: {
                model: 'companies',
                key: 'id'
            }
        },
        rating: {
            type: DataTypes.DECIMAL(3, 2),
            allowNull: false,
            validate: {
                min: 1.0,
                max: 5.0
            },
            comment: 'Calificación de 1.00 a 5.00 estrellas por paquete/empresa'
        },
        responseTimeScore: {
            type: DataTypes.DECIMAL(3, 2),
            allowNull: true,
            defaultValue: 5.0,
            comment: 'Puntuación automática por tiempo de respuesta'
        },
        resolutionQualityScore: {
            type: DataTypes.DECIMAL(3, 2),
            allowNull: true,
            defaultValue: 5.0,
            comment: 'Puntuación por calidad de resolución'
        },
        customerSatisfactionScore: {
            type: DataTypes.DECIMAL(3, 2),
            allowNull: true,
            defaultValue: 5.0,
            comment: 'Puntuación por satisfacción del cliente'
        },
        totalTickets: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Total de tickets atendidos para esta empresa'
        },
        resolvedTickets: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Tickets resueltos exitosamente'
        },
        averageResponseTimeMinutes: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Tiempo promedio de respuesta en minutos'
        },
        averageResolutionTimeHours: {
            type: DataTypes.DECIMAL(8, 2),
            allowNull: true,
            comment: 'Tiempo promedio de resolución en horas'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        is_under_review: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Marca si está bajo revisión por calificación baja'
        },
        reviewStartDate: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Fecha de inicio de revisión por calificación baja'
        },
        improvementPlan: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Plan de mejora para vendedores con baja calificación'
        },
        lastUpdated: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'vendor_ratings',
        timestamps: true,
        paranoid: false,
        indexes: [
            {
                fields: ['vendorId']
            },
            {
                fields: ['companyId']
            },
            {
                fields: ['rating']
            },
            {
                fields: ['is_active']
            },
            {
                fields: ['is_under_review']
            },
            {
                unique: true,
                fields: ['vendor_id', 'company_id']
            }
        ]
    });

    // Método para calcular calificación automática
    VendorRating.prototype.calculateAutomaticRating = function() {
        const responseWeight = 0.4;
        const resolutionWeight = 0.4;
        const satisfactionWeight = 0.2;

        return (
            (this.responseTimeScore * responseWeight) +
            (this.resolutionQualityScore * resolutionWeight) +
            (this.customerSatisfactionScore * satisfactionWeight)
        ).toFixed(2);
    };

    // Hook para recalcular rating automáticamente
    VendorRating.beforeSave((rating) => {
        if (rating.responseTimeScore || rating.resolutionQualityScore || rating.customerSatisfactionScore) {
            rating.rating = rating.calculateAutomaticRating();
        }
        rating.lastUpdated = new Date();
    });

    return VendorRating;
};