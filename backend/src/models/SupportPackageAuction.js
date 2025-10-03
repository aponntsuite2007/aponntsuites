const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SupportPackageAuction = sequelize.define('SupportPackageAuction', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'id'
            }
        },
        originalVendorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'Vendedor que perdió el paquete por baja calificación'
        },
        currentVendorId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'Vendedor que actualmente tiene el paquete'
        },
        newVendorId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'Vendedor seleccionado en la subasta'
        },
        originalRating: {
            type: DataTypes.DECIMAL(3, 2),
            allowNull: false,
            comment: 'Calificación que causó la pérdida del paquete'
        },
        triggerRating: {
            type: DataTypes.DECIMAL(3, 2),
            defaultValue: 2.0,
            comment: 'Calificación mínima que disparó la subasta'
        },
        monthlyCommissionValue: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: 'Valor mensual de la comisión de soporte'
        },
        status: {
            type: DataTypes.ENUM('pending', 'in_auction', 'bidding_closed', 'assigned', 'cancelled'),
            defaultValue: 'pending'
        },
        auctionStartDate: {
            type: DataTypes.DATE,
            allowNull: true
        },
        auctionEndDate: {
            type: DataTypes.DATE,
            allowNull: true
        },
        biddingPeriodHours: {
            type: DataTypes.INTEGER,
            defaultValue: 72,
            comment: 'Período de subasta en horas (default 72h)'
        },
        eligibleVendors: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Array de vendedores elegibles con sus calificaciones globales'
        },
        auctionBids: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Array de ofertas de vendedores interesados'
        },
        selectionCriteria: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Criterios de selección aplicados'
        },
        winnerReason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Razón por la cual se seleccionó al ganador'
        },
        notificationsSent: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Registro de notificaciones enviadas'
        },
        isAutomatic: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Si la subasta es automática o manual'
        },
        adminNotes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        transferDate: {
            type: DataTypes.DATE,
            allowNull: true
        },
        transferConfirmed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'support_package_auctions',
        timestamps: true,
        paranoid: false,
        indexes: [
            {
                fields: ['companyId']
            },
            {
                fields: ['originalVendorId']
            },
            {
                fields: ['currentVendorId']
            },
            {
                fields: ['newVendorId']
            },
            {
                fields: ['status']
            },
            {
                fields: ['auctionStartDate']
            },
            {
                fields: ['auctionEndDate']
            }
        ]
    });

    // Métodos de instancia
    SupportPackageAuction.prototype.startAuction = async function() {
        const now = new Date();
        this.status = 'in_auction';
        this.auctionStartDate = now;
        this.auctionEndDate = new Date(now.getTime() + (this.biddingPeriodHours * 60 * 60 * 1000));

        // Aquí se obtienen los vendedores elegibles
        // TODO: Implementar lógica para obtener vendedores con calificación >= 3.0

        await this.save();

        // TODO: Enviar notificaciones a vendedores elegibles
        console.log(`🔔 Subasta iniciada para empresa ${this.companyId}`);
    };

    SupportPackageAuction.prototype.addBid = async function(vendorId, proposedCommission, notes) {
        if (this.status !== 'in_auction') {
            throw new Error('La subasta no está activa');
        }

        if (new Date() > this.auctionEndDate) {
            throw new Error('El período de subasta ha terminado');
        }

        const bids = this.auctionBids || [];
        const existingBidIndex = bids.findIndex(bid => bid.vendorId === vendorId);

        const newBid = {
            vendorId,
            proposedCommission,
            notes,
            bidDate: new Date(),
            isActive: true
        };

        if (existingBidIndex >= 0) {
            bids[existingBidIndex] = newBid;
        } else {
            bids.push(newBid);
        }

        this.auctionBids = bids;
        await this.save();
    };

    SupportPackageAuction.prototype.selectWinner = async function() {
        if (this.status !== 'in_auction' && this.status !== 'bidding_closed') {
            throw new Error('La subasta no está en estado válido para seleccionar ganador');
        }

        const bids = this.auctionBids || [];
        if (bids.length === 0) {
            throw new Error('No hay ofertas para evaluar');
        }

        // Lógica de selección: prioridad por calificación global, luego por comisión propuesta
        const eligibleVendors = this.eligibleVendors || [];

        let bestBid = null;
        let bestScore = -1;

        for (const bid of bids.filter(b => b.isActive)) {
            const vendor = eligibleVendors.find(v => v.vendorId === bid.vendorId);
            if (!vendor) continue;

            // Calcular score: 70% calificación, 30% comisión competitiva
            const ratingScore = (vendor.globalRating / 5.0) * 0.7;
            const commissionScore = (1 - (bid.proposedCommission / 100)) * 0.3;
            const totalScore = ratingScore + commissionScore;

            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestBid = bid;
            }
        }

        if (bestBid) {
            this.newVendorId = bestBid.vendorId;
            this.status = 'assigned';
            this.winnerReason = `Seleccionado por mejor puntuación: ${bestScore.toFixed(3)}`;
            this.transferDate = new Date();

            await this.save();

            // TODO: Crear nueva comisión para el vendedor ganador
            // TODO: Desactivar comisión anterior
            // TODO: Enviar notificaciones

            return bestBid;
        }

        throw new Error('No se pudo seleccionar un ganador válido');
    };

    // Métodos estáticos
    SupportPackageAuction.checkForLowRatings = async function() {
        // TODO: Implementar verificación automática de calificaciones bajas
        // Se ejecutará como tarea programada
        console.log('🔍 Verificando calificaciones bajas...');
    };

    return SupportPackageAuction;
};