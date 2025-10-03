const { VendorReferral, VendorCommission, User, Company } = require('../config/database');
const notificationService = require('./notificationService');
const { Op } = require('sequelize');

class VendorReferralService {
  constructor() {
    this.defaultReferralCommission = 5.0; // 5% por defecto
    this.maxPyramidLevels = 3; // Máximo 3 niveles de pirámide
    this.levelCommissions = {
      1: 5.0,  // Nivel 1: 5%
      2: 3.0,  // Nivel 2: 3%
      3: 2.0   // Nivel 3: 2%
    };
  }

  // Crear referido
  async createReferral(referrerId, referredId, commissionPercentage = null) {
    try {
      // Validar que no se auto-refiera
      if (referrerId === referredId) {
        throw new Error('Un vendedor no puede referirse a sí mismo');
      }

      // Verificar que no exista ya esta relación
      const existing = await VendorReferral.findOne({
        where: { referrerId, referredId }
      });

      if (existing) {
        throw new Error('Esta relación de referido ya existe');
      }

      // Calcular nivel basado en la cadena de referidos
      const level = await this.calculateReferralLevel(referrerId);

      if (level > this.maxPyramidLevels) {
        throw new Error('Se ha alcanzado el máximo de niveles en la pirámide');
      }

      // Crear referido
      const referral = await VendorReferral.create({
        referrerId,
        referredId,
        level,
        commissionPercentage: commissionPercentage || this.levelCommissions[level] || this.defaultReferralCommission,
        status: 'pending'
      });

      console.log(`✅ Referido creado: ${referrerId} -> ${referredId} (Nivel ${level})`);

      // Activar automáticamente si el referido ya tiene ventas
      await this.checkAndActivateReferral(referral.id);

      return referral;
    } catch (error) {
      console.error('❌ Error creando referido:', error);
      throw error;
    }
  }

  // Calcular nivel de referido en la pirámide
  async calculateReferralLevel(referrerId) {
    try {
      let currentLevel = 1;
      let currentReferrerId = referrerId;

      while (currentLevel <= this.maxPyramidLevels) {
        const parentReferral = await VendorReferral.findOne({
          where: { referredId: currentReferrerId }
        });

        if (!parentReferral) {
          break;
        }

        currentLevel++;
        currentReferrerId = parentReferral.referrerId;
      }

      return currentLevel;
    } catch (error) {
      console.error('❌ Error calculando nivel:', error);
      return 1;
    }
  }

  // Verificar y activar referido si tiene ventas
  async checkAndActivateReferral(referralId) {
    try {
      const referral = await VendorReferral.findByPk(referralId, {
        include: [
          { model: User, as: 'referred' }
        ]
      });

      if (!referral || referral.status !== 'pending') {
        return false;
      }

      // Verificar si el referido tiene comisiones activas
      const activeCommissions = await VendorCommission.count({
        where: {
          vendorId: referral.referredId,
          isActive: true,
          commissionType: { [Op.in]: ['sales', 'support'] }
        }
      });

      if (activeCommissions > 0) {
        await referral.activate();
        console.log(`🎉 Referido activado: ${referral.referralCode}`);

        // Crear comisiones automáticas para todos los niveles superiores
        await this.createReferralCommissions(referral.referredId);

        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error activando referido:', error);
      return false;
    }
  }

  // Crear comisiones de referido para toda la cadena
  async createReferralCommissions(newVendorId) {
    try {
      console.log(`💰 Creando comisiones de referido para vendedor ${newVendorId}`);

      // Obtener todas las comisiones del nuevo vendedor
      const vendorCommissions = await VendorCommission.findAll({
        where: {
          vendorId: newVendorId,
          isActive: true,
          commissionType: { [Op.in]: ['sales', 'support'] }
        }
      });

      // Buscar la cadena de referidos hacia arriba
      const referralChain = await this.getReferralChain(newVendorId);

      for (const commission of vendorCommissions) {
        for (const referral of referralChain) {
          // Crear comisión de referido
          await VendorCommission.create({
            vendorId: referral.referrerId,
            companyId: commission.companyId,
            commissionType: 'referral',
            percentage: referral.commissionPercentage,
            isActive: true,
            isTransferable: false,
            referralId: referral.id,
            baseCommissionAmount: commission.monthlyAmount,
            startDate: new Date(),
            notes: `Comisión por referido - Nivel ${referral.level} - Vendedor referido: ${newVendorId}`
          });

          console.log(`✅ Comisión de referido creada: ${referral.commissionPercentage}% para vendedor ${referral.referrerId}`);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error creando comisiones de referido:', error);
      return false;
    }
  }

  // Obtener cadena de referidos hacia arriba
  async getReferralChain(vendorId) {
    try {
      const chain = [];
      let currentVendorId = vendorId;
      let level = 1;

      while (level <= this.maxPyramidLevels) {
        const referral = await VendorReferral.findOne({
          where: {
            referredId: currentVendorId,
            status: 'active'
          }
        });

        if (!referral) {
          break;
        }

        chain.push(referral);
        currentVendorId = referral.referrerId;
        level++;
      }

      return chain;
    } catch (error) {
      console.error('❌ Error obteniendo cadena de referidos:', error);
      return [];
    }
  }

  // Calcular comisiones de referido mensuales
  async calculateMonthlyReferralCommissions(vendorId, month = null, year = null) {
    try {
      const targetDate = month && year ? new Date(year, month - 1) : new Date();
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

      // Obtener todas las comisiones de referido del vendedor
      const referralCommissions = await VendorCommission.findAll({
        where: {
          vendorId: vendorId,
          commissionType: 'referral',
          isActive: true
        },
        include: [
          {
            model: VendorReferral,
            as: 'referral',
            include: [
              { model: User, as: 'referred' }
            ]
          },
          { model: Company, as: 'company' }
        ]
      });

      const results = [];
      let totalReferralCommissions = 0;

      for (const commission of referralCommissions) {
        // Obtener comisiones base del referido en el mes
        const baseCommissions = await VendorCommission.findAll({
          where: {
            vendorId: commission.referral.referredId,
            commissionType: { [Op.in]: ['sales', 'support'] },
            isActive: true,
            lastCalculated: {
              [Op.between]: [startOfMonth, endOfMonth]
            }
          }
        });

        const baseAmount = baseCommissions.reduce((sum, bc) => sum + (parseFloat(bc.monthlyAmount) || 0), 0);
        const referralAmount = baseAmount * (commission.percentage / 100);

        results.push({
          referralId: commission.referral.id,
          referredVendor: `${commission.referral.referred.firstName} ${commission.referral.referred.lastName}`,
          company: commission.company.name,
          level: commission.referral.level,
          baseAmount: baseAmount,
          commissionPercentage: commission.percentage,
          referralAmount: referralAmount
        });

        totalReferralCommissions += referralAmount;

        // Actualizar comisión mensual
        await commission.update({
          monthlyAmount: referralAmount,
          lastCalculated: new Date()
        });
      }

      return {
        vendorId,
        month: targetDate.getMonth() + 1,
        year: targetDate.getFullYear(),
        totalReferralCommissions,
        details: results
      };
    } catch (error) {
      console.error('❌ Error calculando comisiones de referido:', error);
      throw error;
    }
  }

  // Obtener árbol de referidos de un vendedor
  async getReferralTree(vendorId, maxDepth = 3) {
    try {
      const buildTree = async (parentId, currentDepth = 0) => {
        if (currentDepth >= maxDepth) return [];

        const referrals = await VendorReferral.findAll({
          where: { referrerId: parentId },
          include: [
            {
              model: User,
              as: 'referred',
              attributes: ['id', 'firstName', 'lastName', 'email']
            }
          ]
        });

        const tree = [];
        for (const referral of referrals) {
          const children = await buildTree(referral.referredId, currentDepth + 1);

          tree.push({
            referralId: referral.id,
            vendorId: referral.referredId,
            vendor: referral.referred,
            level: referral.level,
            status: referral.status,
            commissionPercentage: referral.commissionPercentage,
            totalEarned: referral.totalCommissionEarned,
            activationDate: referral.activationDate,
            children: children
          });
        }

        return tree;
      };

      return await buildTree(vendorId);
    } catch (error) {
      console.error('❌ Error obteniendo árbol de referidos:', error);
      return [];
    }
  }

  // Obtener estadísticas de referidos
  async getReferralStats(vendorId) {
    try {
      const [
        directReferrals,
        totalReferrals,
        activeReferrals,
        totalEarnings,
        monthlyEarnings
      ] = await Promise.all([
        VendorReferral.count({
          where: { referrerId: vendorId, level: 1 }
        }),
        VendorReferral.count({
          where: { referrerId: vendorId }
        }),
        VendorReferral.count({
          where: { referrerId: vendorId, status: 'active' }
        }),
        VendorCommission.sum('monthlyAmount', {
          where: {
            vendorId: vendorId,
            commissionType: 'referral',
            isActive: true
          }
        }),
        VendorCommission.sum('monthlyAmount', {
          where: {
            vendorId: vendorId,
            commissionType: 'referral',
            isActive: true,
            lastCalculated: {
              [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        })
      ]);

      return {
        directReferrals,
        totalReferrals,
        activeReferrals,
        totalEarnings: totalEarnings || 0,
        monthlyEarnings: monthlyEarnings || 0
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        directReferrals: 0,
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        monthlyEarnings: 0
      };
    }
  }

  // Notificar nueva comisión de referido
  async notifyReferralCommission(referrerId, referredId, commissionAmount) {
    try {
      const [referrer, referred] = await Promise.all([
        User.findByPk(referrerId),
        User.findByPk(referredId)
      ]);

      if (!referrer || !referred) {
        throw new Error('Vendedor no encontrado');
      }

      await notificationService.notifyCommissionChange(
        referrer,
        {
          companyName: 'Sistema de Referidos',
          percentage: commissionAmount,
          effectiveDate: new Date(),
          reason: `Comisión por referido de ${referred.firstName} ${referred.lastName}`
        },
        'increase'
      );

      console.log(`📤 Notificación de comisión de referido enviada a ${referrer.firstName}`);
    } catch (error) {
      console.error('❌ Error enviando notificación:', error);
    }
  }

  // Procesar comisiones masivas mensuales
  async processMonthlyReferralCommissions() {
    try {
      console.log('🔄 Procesando comisiones de referido mensuales...');

      const vendorsWithReferrals = await User.findAll({
        where: {
          role: 'vendor',
          isActive: true
        },
        include: [
          {
            model: VendorReferral,
            as: 'referrals',
            where: { status: 'active' },
            required: true
          }
        ]
      });

      const results = [];
      for (const vendor of vendorsWithReferrals) {
        const commissionResult = await this.calculateMonthlyReferralCommissions(vendor.id);
        results.push(commissionResult);

        if (commissionResult.totalReferralCommissions > 0) {
          // Notificar al vendedor sobre sus comisiones
          await this.notifyReferralCommission(
            vendor.id,
            null,
            commissionResult.totalReferralCommissions
          );
        }
      }

      console.log(`✅ Procesadas comisiones para ${results.length} vendedores`);
      return results;
    } catch (error) {
      console.error('❌ Error procesando comisiones mensuales:', error);
      throw error;
    }
  }
}

module.exports = new VendorReferralService();