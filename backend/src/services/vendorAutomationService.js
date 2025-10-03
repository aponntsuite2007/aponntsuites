const notificationService = require('./notificationService');
const { VendorRating, SupportPackageAuction, VendorCommission, User, Company } = require('../config/database');
const { Op } = require('sequelize');

class VendorAutomationService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 60 * 60 * 1000; // Verificar cada hora
    this.criticalRatingThreshold = 2.0;
  }

  // Método principal para iniciar el sistema automatizado
  async startAutomationSystem() {
    if (this.isRunning) {
      console.log('🤖 Sistema de automatización ya está corriendo');
      return;
    }

    console.log('🤖 Iniciando sistema de automatización de vendedores');
    this.isRunning = true;

    // Ejecutar verificación inicial
    await this.performFullCheck();

    // Programar verificaciones periódicas
    this.intervalId = setInterval(async () => {
      await this.performFullCheck();
    }, this.checkInterval);

    console.log('✅ Sistema de automatización iniciado correctamente');
  }

  // Detener el sistema de automatización
  stopAutomationSystem() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Sistema de automatización detenido');
  }

  // Verificación completa del sistema
  async performFullCheck() {
    try {
      console.log('🔍 Iniciando verificación completa del sistema de vendedores');

      // 1. Verificar calificaciones bajas
      await this.checkLowRatings();

      // 2. Procesar subastas vencidas
      await this.processExpiredAuctions();

      // 3. Iniciar nuevas subastas si es necesario
      await this.checkForNewAuctions();

      // 4. Actualizar métricas globales
      await this.updateGlobalMetrics();

      console.log('✅ Verificación completa finalizada');
    } catch (error) {
      console.error('❌ Error en verificación completa:', error);
    }
  }

  // Verificar calificaciones bajas y crear subastas
  async checkLowRatings() {
    try {
      console.log('📊 Verificando calificaciones bajas...');

      const lowRatings = await VendorRating.findAll({
        where: {
          rating: { [Op.lt]: this.criticalRatingThreshold },
          is_active: true,
          is_under_review: false
        },
        include: [
          { model: User, as: 'vendor' },
          { model: Company, as: 'company' }
        ]
      });

      for (const rating of lowRatings) {
        await this.processLowRating(rating);
      }

      console.log(`📈 Procesadas ${lowRatings.length} calificaciones bajas`);
    } catch (error) {
      console.error('❌ Error verificando calificaciones bajas:', error);
    }
  }

  // Procesar una calificación baja específica
  async processLowRating(rating) {
    try {
      console.log(`⚠️ Procesando calificación baja: Vendedor ${rating.vendor.first_name} ${rating.vendor.last_name} - Empresa ${rating.company.name} - Rating: ${rating.rating}`);

      // Marcar como bajo revisión
      await rating.update({
        is_under_review: true,
        reviewStartDate: new Date()
      });

      // Buscar comisión de soporte asociada
      const supportCommission = await VendorCommission.findOne({
        where: {
          vendorId: rating.vendorId,
          companyId: rating.companyId,
          commissionType: 'support',
          is_active: true
        }
      });

      if (supportCommission) {
        // Verificar si ya existe una subasta para este paquete
        const existingAuction = await SupportPackageAuction.findOne({
          where: {
            companyId: rating.companyId,
            originalVendorId: rating.vendorId,
            status: { [Op.in]: ['pending', 'in_auction'] }
          }
        });

        if (!existingAuction) {
          // Crear nueva subasta
          const auction = await SupportPackageAuction.create({
            companyId: rating.companyId,
            originalVendorId: rating.vendorId,
            currentVendorId: rating.vendorId,
            originalRating: rating.rating,
            monthlyCommissionValue: supportCommission.percentage,
            status: 'pending',
            biddingPeriodHours: 72,
            isAutomatic: true
          });

          console.log(`🔔 Subasta creada automáticamente: ID ${auction.id}`);

          // Iniciar subasta inmediatamente
          await this.startAuction(auction.id);
        }
      }

      // Enviar notificación al vendedor
      await notificationService.notifyVendorRatingDrop(
        rating.vendor,
        rating.company,
        rating
      );

      console.log(`✅ Calificación baja procesada: ${rating.vendor.first_name} ${rating.vendor.last_name}`);
    } catch (error) {
      console.error('❌ Error procesando calificación baja:', error);
    }
  }

  // Iniciar subasta
  async startAuction(auctionId) {
    try {
      const auction = await SupportPackageAuction.findByPk(auctionId, {
        include: [
          { model: Company, as: 'company' },
          { model: User, as: 'originalVendor' }
        ]
      });

      if (!auction) {
        throw new Error('Subasta no encontrada');
      }

      console.log(`🚀 Iniciando subasta: ${auctionId} para empresa ${auction.company.name}`);

      // Obtener vendedores elegibles (calificación >= 3.0, acepta subastas)
      const eligibleVendors = await this.getEligibleVendors();

      if (eligibleVendors.length === 0) {
        console.log('⚠️ No hay vendedores elegibles para la subasta');
        await auction.update({ status: 'cancelled', adminNotes: 'No hay vendedores elegibles' });
        return;
      }

      // Actualizar información de vendedores elegibles
      const vendorInfo = eligibleVendors.map(vendor => ({
        vendorId: vendor.id,
        globalRating: vendor.globalRating || 3.0,
        firstName: vendor.first_name,
        lastName: vendor.last_name
      }));

      await auction.update({
        status: 'in_auction',
        auctionStartDate: new Date(),
        auctionEndDate: new Date(Date.now() + auction.biddingPeriodHours * 60 * 60 * 1000),
        eligibleVendors: vendorInfo
      });

      // Enviar notificaciones a vendedores elegibles
      await notificationService.notifyAuctionStarted(
        {
          id: auction.id,
          companyName: auction.company.name,
          monthlyCommissionValue: auction.monthlyCommissionValue,
          auctionEndDate: auction.auctionEndDate
        },
        eligibleVendors
      );

      console.log(`✅ Subasta iniciada: ${eligibleVendors.length} vendedores notificados`);
    } catch (error) {
      console.error('❌ Error iniciando subasta:', error);
    }
  }

  // Obtener vendedores elegibles para subastas
  async getEligibleVendors() {
    try {
      // Obtener vendedores con calificación >= 3.0 y que acepten subastas
      const vendors = await User.findAll({
        where: {
          role: 'vendor',
          is_active: true,
          acceptsAuctions: true
        }
      });

      // Filtrar por calificación global
      const eligibleVendors = [];
      for (const vendor of vendors) {
        const globalRating = await this.calculateGlobalRating(vendor.id);
        if (globalRating >= 3.0) {
          vendor.globalRating = globalRating;
          eligibleVendors.push(vendor);
        }
      }

      return eligibleVendors;
    } catch (error) {
      console.error('❌ Error obteniendo vendedores elegibles:', error);
      return [];
    }
  }

  // Calcular calificación global de un vendedor
  async calculateGlobalRating(vendorId) {
    try {
      const ratings = await VendorRating.findAll({
        where: {
          vendorId: vendorId,
          is_active: true
        }
      });

      if (ratings.length === 0) return 3.0; // Rating por defecto

      const totalRating = ratings.reduce((sum, rating) => sum + parseFloat(rating.rating), 0);
      return totalRating / ratings.length;
    } catch (error) {
      console.error('❌ Error calculando calificación global:', error);
      return 3.0;
    }
  }

  // Procesar subastas vencidas
  async processExpiredAuctions() {
    try {
      console.log('⏰ Procesando subastas vencidas...');

      const expiredAuctions = await SupportPackageAuction.findAll({
        where: {
          status: 'in_auction',
          auctionEndDate: { [Op.lt]: new Date() }
        },
        include: [
          { model: Company, as: 'company' },
          { model: User, as: 'originalVendor' }
        ]
      });

      for (const auction of expiredAuctions) {
        await this.selectAuctionWinner(auction);
      }

      console.log(`⚡ Procesadas ${expiredAuctions.length} subastas vencidas`);
    } catch (error) {
      console.error('❌ Error procesando subastas vencidas:', error);
    }
  }

  // Seleccionar ganador de subasta
  async selectAuctionWinner(auction) {
    try {
      console.log(`🏆 Seleccionando ganador para subasta ${auction.id}`);

      const bids = auction.auctionBids || [];
      const eligibleVendors = auction.eligibleVendors || [];

      if (bids.length === 0) {
        console.log('❌ No hay ofertas para la subasta');
        await auction.update({
          status: 'cancelled',
          adminNotes: 'No se recibieron ofertas'
        });
        return;
      }

      // Aplicar algoritmo de selección: 70% calificación, 30% comisión
      let bestBid = null;
      let bestScore = -1;

      for (const bid of bids.filter(b => b.isActive)) {
        const vendor = eligibleVendors.find(v => v.vendorId === bid.vendorId);
        if (!vendor) continue;

        const ratingScore = (vendor.globalRating / 5.0) * 0.7;
        const commissionScore = (1 - (bid.proposedCommission / 100)) * 0.3;
        const totalScore = ratingScore + commissionScore;

        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestBid = bid;
        }
      }

      if (bestBid) {
        // Actualizar subasta con ganador
        await auction.update({
          newVendorId: bestBid.vendorId,
          status: 'assigned',
          winnerReason: `Mejor puntuación: ${bestScore.toFixed(3)} (Rating: 70%, Comisión: 30%)`,
          transferDate: new Date()
        });

        // Transferir comisión
        await this.transferSupportCommission(auction, bestBid.vendorId, bestBid.proposedCommission);

        // Obtener datos del ganador
        const winner = await User.findByPk(bestBid.vendorId);

        // Notificar al ganador
        await notificationService.notifyAuctionWinner(
          {
            id: auction.id,
            monthlyCommissionValue: bestBid.proposedCommission,
            winnerScore: bestScore.toFixed(3)
          },
          winner,
          auction.company
        );

        // Notificar pérdida al vendedor original
        await notificationService.notifyPackageLoss(
          auction.originalVendor,
          auction.company,
          `Calificación inferior a ${this.criticalRatingThreshold} estrellas`
        );

        console.log(`✅ Ganador seleccionado: ${winner.first_name} ${winner.last_name} con puntuación ${bestScore.toFixed(3)}`);
      } else {
        await auction.update({
          status: 'cancelled',
          adminNotes: 'No se pudo seleccionar un ganador válido'
        });
      }
    } catch (error) {
      console.error('❌ Error seleccionando ganador de subasta:', error);
    }
  }

  // Transferir comisión de soporte
  async transferSupportCommission(auction, newVendorId, newCommissionPercentage) {
    try {
      console.log(`💰 Transfiriendo comisión de soporte: Empresa ${auction.companyId} a vendedor ${newVendorId}`);

      // Desactivar comisión anterior
      await VendorCommission.update(
        { isActive: false, endDate: new Date() },
        {
          where: {
            vendorId: auction.originalVendorId,
            companyId: auction.companyId,
            commissionType: 'support',
            is_active: true
          }
        }
      );

      // Crear nueva comisión
      await VendorCommission.create({
        vendorId: newVendorId,
        companyId: auction.companyId,
        commissionType: 'support',
        percentage: newCommissionPercentage,
        startDate: new Date(),
        isActive: true,
        transferredFromAuctionId: auction.id
      });

      console.log(`✅ Comisión transferida exitosamente`);
    } catch (error) {
      console.error('❌ Error transfiriendo comisión:', error);
    }
  }

  // Verificar si se necesitan nuevas subastas
  async checkForNewAuctions() {
    try {
      console.log('🔍 Verificando necesidad de nuevas subastas...');

      // Esta función puede expandirse para otros criterios
      // Por ahora, las subastas se crean automáticamente en checkLowRatings

      console.log('✅ Verificación de nuevas subastas completada');
    } catch (error) {
      console.error('❌ Error verificando nuevas subastas:', error);
    }
  }

  // Actualizar métricas globales
  async updateGlobalMetrics() {
    try {
      console.log('📊 Actualizando métricas globales...');

      // Actualizar calificaciones globales de todos los vendedores
      const vendors = await User.findAll({
        where: { role: 'vendor', isActive: true }
      });

      for (const vendor of vendors) {
        const globalRating = await this.calculateGlobalRating(vendor.id);
        await vendor.update({ globalRating });
      }

      console.log(`✅ Métricas globales actualizadas para ${vendors.length} vendedores`);
    } catch (error) {
      console.error('❌ Error actualizando métricas globales:', error);
    }
  }

  // Método manual para agregar oferta a subasta
  async addBidToAuction(auctionId, vendorId, proposedCommission, notes = '') {
    try {
      const auction = await SupportPackageAuction.findByPk(auctionId);
      if (!auction) {
        throw new Error('Subasta no encontrada');
      }

      if (auction.status !== 'in_auction') {
        throw new Error('La subasta no está activa');
      }

      if (new Date() > new Date(auction.auctionEndDate)) {
        throw new Error('El período de subasta ha terminado');
      }

      // Verificar que el vendedor sea elegible
      const eligibleVendors = auction.eligibleVendors || [];
      const isEligible = eligibleVendors.some(v => v.vendorId === vendorId);

      if (!isEligible) {
        throw new Error('Vendedor no elegible para esta subasta');
      }

      const bids = auction.auctionBids || [];
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

      await auction.update({ auctionBids: bids });

      console.log(`✅ Oferta agregada: Vendedor ${vendorId} - ${proposedCommission}%`);
      return { success: true, bid: newBid };
    } catch (error) {
      console.error('❌ Error agregando oferta:', error);
      return { success: false, error: error.message };
    }
  }

  // Método para obtener estado del sistema
  getSystemStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      criticalRatingThreshold: this.criticalRatingThreshold,
      lastCheck: this.lastCheckTime || null
    };
  }

  // Método para configurar parámetros del sistema
  updateSystemConfiguration(config) {
    if (config.checkInterval) {
      this.checkInterval = config.checkInterval;
    }
    if (config.criticalRatingThreshold) {
      this.criticalRatingThreshold = config.criticalRatingThreshold;
    }

    console.log('⚙️ Configuración del sistema actualizada:', config);
  }
}

module.exports = new VendorAutomationService();