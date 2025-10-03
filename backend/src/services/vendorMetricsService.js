const { VendorCommission, VendorReferral, User, Company, CompanyModule, SystemModule } = require('../config/database');
const vendorReferralService = require('./vendorReferralService');
const { Op } = require('sequelize');

class VendorMetricsService {
  constructor() {
    // Precios base de módulos (estos deberían venir de configuración)
    this.moduleBasePrices = {
      'attendance': 1500,      // $1500 por mes por asistencia
      'medical': 2000,         // $2000 por mes por módulo médico
      'payroll': 1800,         // $1800 por mes por nóminas
      'reports': 800,          // $800 por mes por reportes
      'biometric': 1200,       // $1200 por mes por biométrico
      'geolocation': 900       // $900 por mes por geolocalización
    };
  }

  // Obtener métricas completas de un vendedor
  async getVendorCompleteMetrics(vendorId) {
    try {
      console.log(`📊 Calculando métricas completas para vendedor ${vendorId}`);

      const [
        basicInfo,
        companiesMetrics,
        commissionsMetrics,
        referralMetrics
      ] = await Promise.all([
        this.getVendorBasicInfo(vendorId),
        this.getCompaniesMetrics(vendorId),
        this.getCommissionsMetrics(vendorId),
        this.getReferralMetrics(vendorId)
      ]);

      return {
        vendorId,
        basicInfo,
        companies: companiesMetrics,
        commissions: commissionsMetrics,
        referrals: referralMetrics,
        calculatedAt: new Date()
      };
    } catch (error) {
      console.error('❌ Error calculando métricas del vendedor:', error);
      throw error;
    }
  }

  // Información básica del vendedor
  async getVendorBasicInfo(vendorId) {
    try {
      const vendor = await User.findByPk(vendorId, {
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'isActive', 'createdAt']
      });

      if (!vendor) {
        throw new Error('Vendedor no encontrado');
      }

      return {
        id: vendor.id,
        name: `${vendor.firstName} ${vendor.lastName}`,
        email: vendor.email,
        phone: vendor.phone,
        isActive: vendor.isActive,
        joinDate: vendor.createdAt
      };
    } catch (error) {
      console.error('❌ Error obteniendo info básica:', error);
      throw error;
    }
  }

  // Métricas de empresas
  async getCompaniesMetrics(vendorId) {
    try {
      // Obtener todas las comisiones activas del vendedor
      const commissions = await VendorCommission.findAll({
        where: {
          vendorId: vendorId,
          isActive: true
        },
        include: [
          {
            model: Company,
            as: 'company',
            include: [
              {
                model: CompanyModule,
                as: 'modules',
                include: [
                  { model: SystemModule, as: 'systemModule' }
                ]
              },
              {
                model: User,
                as: 'users',
                attributes: ['id']
              }
            ]
          }
        ]
      });

      const companiesMap = new Map();

      for (const commission of commissions) {
        const company = commission.company;
        const companyId = company.company_id;

        if (!companiesMap.has(companyId)) {
          companiesMap.set(companyId, {
            id: company.company_id,
            name: company.name,
            totalUsers: company.users ? company.users.length : 0,
            salesUsers: 0,
            supportUsers: 0,
            modules: company.modules || [],
            totalModuleValue: 0,
            commissions: {
              sales: { percentage: 0, amount: 0 },
              support: { percentage: 0, amount: 0 },
              referral: { percentage: 0, amount: 0 }
            }
          });
        }

        const companyData = companiesMap.get(companyId);

        // Calcular valor total de módulos
        if (company.modules && company.modules.length > 0) {
          companyData.totalModuleValue = company.modules.reduce((sum, module) => {
            const modulePrice = this.moduleBasePrices[module.systemModule?.name] || 1000;
            return sum + (modulePrice * companyData.totalUsers);
          }, 0);
        }

        // Agregar información de comisión
        if (commission.commissionType === 'sales') {
          companyData.salesUsers = companyData.totalUsers;
          companyData.commissions.sales.percentage = commission.percentage;
          companyData.commissions.sales.amount = (companyData.totalModuleValue * commission.percentage / 100);
        } else if (commission.commissionType === 'support') {
          companyData.supportUsers = companyData.totalUsers;
          companyData.commissions.support.percentage = commission.percentage;
          companyData.commissions.support.amount = (companyData.totalModuleValue * commission.percentage / 100);
        } else if (commission.commissionType === 'referral') {
          companyData.commissions.referral.percentage = commission.percentage;
          companyData.commissions.referral.amount = commission.monthlyAmount || 0;
        }
      }

      const companies = Array.from(companiesMap.values());

      return {
        totalCompanies: companies.length,
        totalUsers: companies.reduce((sum, c) => sum + c.totalUsers, 0),
        totalSalesUsers: companies.reduce((sum, c) => sum + c.salesUsers, 0),
        totalSupportUsers: companies.reduce((sum, c) => sum + c.supportUsers, 0),
        totalModuleValue: companies.reduce((sum, c) => sum + c.totalModuleValue, 0),
        companies: companies
      };
    } catch (error) {
      console.error('❌ Error calculando métricas de empresas:', error);
      return {
        totalCompanies: 0,
        totalUsers: 0,
        totalSalesUsers: 0,
        totalSupportUsers: 0,
        totalModuleValue: 0,
        companies: []
      };
    }
  }

  // Métricas de comisiones
  async getCommissionsMetrics(vendorId) {
    try {
      const commissions = await VendorCommission.findAll({
        where: {
          vendorId: vendorId,
          isActive: true
        }
      });

      const metrics = {
        sales: {
          totalPercentage: 0,
          totalAmount: 0,
          companies: 0
        },
        support: {
          totalPercentage: 0,
          totalAmount: 0,
          companies: 0
        },
        referral: {
          totalPercentage: 0,
          totalAmount: 0,
          referrals: 0
        },
        total: {
          percentage: 0,
          amount: 0
        }
      };

      for (const commission of commissions) {
        const amount = commission.monthlyAmount || 0;

        if (commission.commissionType === 'sales') {
          metrics.sales.totalPercentage += commission.percentage;
          metrics.sales.totalAmount += amount;
          metrics.sales.companies++;
        } else if (commission.commissionType === 'support') {
          metrics.support.totalPercentage += commission.percentage;
          metrics.support.totalAmount += amount;
          metrics.support.companies++;
        } else if (commission.commissionType === 'referral') {
          metrics.referral.totalPercentage += commission.percentage;
          metrics.referral.totalAmount += amount;
          metrics.referral.referrals++;
        }
      }

      // Calcular totales
      metrics.total.amount = metrics.sales.totalAmount + metrics.support.totalAmount + metrics.referral.totalAmount;
      metrics.total.percentage = (metrics.sales.totalPercentage + metrics.support.totalPercentage + metrics.referral.totalPercentage) / 3;

      // Calcular promedios
      if (metrics.sales.companies > 0) {
        metrics.sales.averagePercentage = metrics.sales.totalPercentage / metrics.sales.companies;
      }
      if (metrics.support.companies > 0) {
        metrics.support.averagePercentage = metrics.support.totalPercentage / metrics.support.companies;
      }
      if (metrics.referral.referrals > 0) {
        metrics.referral.averagePercentage = metrics.referral.totalPercentage / metrics.referral.referrals;
      }

      return metrics;
    } catch (error) {
      console.error('❌ Error calculando métricas de comisiones:', error);
      return {
        sales: { totalPercentage: 0, totalAmount: 0, companies: 0, averagePercentage: 0 },
        support: { totalPercentage: 0, totalAmount: 0, companies: 0, averagePercentage: 0 },
        referral: { totalPercentage: 0, totalAmount: 0, referrals: 0, averagePercentage: 0 },
        total: { percentage: 0, amount: 0 }
      };
    }
  }

  // Métricas de referidos
  async getReferralMetrics(vendorId) {
    try {
      const [
        stats,
        tree
      ] = await Promise.all([
        vendorReferralService.getReferralStats(vendorId),
        vendorReferralService.getReferralTree(vendorId)
      ]);

      return {
        ...stats,
        tree: tree
      };
    } catch (error) {
      console.error('❌ Error calculando métricas de referidos:', error);
      return {
        directReferrals: 0,
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        monthlyEarnings: 0,
        tree: []
      };
    }
  }

  // Obtener métricas para todos los vendedores (para la grilla)
  async getAllVendorsMetrics() {
    try {
      console.log('📊 Calculando métricas para todos los vendedores...');

      const vendors = await User.findAll({
        where: {
          role: 'vendor'
        },
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'isActive']
      });

      const vendorsMetrics = [];

      for (const vendor of vendors) {
        try {
          const metrics = await this.getVendorCompleteMetrics(vendor.id);
          vendorsMetrics.push({
            id: vendor.id,
            name: `${vendor.firstName} ${vendor.lastName}`,
            email: vendor.email,
            phone: vendor.phone,
            isActive: vendor.isActive,
            companies: metrics.companies.totalCompanies,
            totalUsers: metrics.companies.totalUsers,
            salesUsers: metrics.companies.totalSalesUsers,
            supportUsers: metrics.companies.totalSupportUsers,
            totalModuleValue: metrics.companies.totalModuleValue,
            salesCommission: {
              percentage: metrics.commissions.sales.averagePercentage || 0,
              amount: metrics.commissions.sales.totalAmount
            },
            supportCommission: {
              percentage: metrics.commissions.support.averagePercentage || 0,
              amount: metrics.commissions.support.totalAmount
            },
            referralCommission: {
              percentage: metrics.commissions.referral.averagePercentage || 0,
              amount: metrics.commissions.referral.totalAmount,
              referrals: metrics.referrals.activeReferrals
            },
            totalCommission: metrics.commissions.total.amount
          });
        } catch (error) {
          console.error(`❌ Error calculando métricas para vendedor ${vendor.id}:`, error);
          // Agregar vendedor con valores por defecto
          vendorsMetrics.push({
            id: vendor.id,
            name: `${vendor.firstName} ${vendor.lastName}`,
            email: vendor.email,
            phone: vendor.phone,
            isActive: vendor.isActive,
            companies: 0,
            totalUsers: 0,
            salesUsers: 0,
            supportUsers: 0,
            totalModuleValue: 0,
            salesCommission: { percentage: 0, amount: 0 },
            supportCommission: { percentage: 0, amount: 0 },
            referralCommission: { percentage: 0, amount: 0, referrals: 0 },
            totalCommission: 0
          });
        }
      }

      console.log(`✅ Métricas calculadas para ${vendorsMetrics.length} vendedores`);
      return vendorsMetrics;
    } catch (error) {
      console.error('❌ Error calculando métricas de todos los vendedores:', error);
      throw error;
    }
  }

  // Recalcular métricas de un vendedor específico
  async recalculateVendorMetrics(vendorId) {
    try {
      console.log(`🔄 Recalculando métricas para vendedor ${vendorId}`);

      // Recalcular comisiones mensuales
      const commissions = await VendorCommission.findAll({
        where: {
          vendorId: vendorId,
          isActive: true
        },
        include: [
          { model: Company, as: 'company' }
        ]
      });

      for (const commission of commissions) {
        if (commission.commissionType === 'sales' || commission.commissionType === 'support') {
          // Obtener usuarios actuales de la empresa
          const userCount = await User.count({
            where: {
              companyId: commission.companyId,
              isActive: true
            }
          });

          // Calcular valor de módulos
          const modules = await CompanyModule.findAll({
            where: { companyId: commission.companyId },
            include: [{ model: SystemModule, as: 'systemModule' }]
          });

          let moduleValue = 0;
          for (const module of modules) {
            const modulePrice = this.moduleBasePrices[module.systemModule?.name] || 1000;
            moduleValue += modulePrice * userCount;
          }

          const commissionAmount = moduleValue * (commission.percentage / 100);

          await commission.update({
            monthlyAmount: commissionAmount,
            totalUsers: userCount,
            lastCalculated: new Date()
          });
        }
      }

      // Recalcular comisiones de referido
      await vendorReferralService.calculateMonthlyReferralCommissions(vendorId);

      console.log(`✅ Métricas recalculadas para vendedor ${vendorId}`);
      return true;
    } catch (error) {
      console.error('❌ Error recalculando métricas:', error);
      return false;
    }
  }

  // Recalcular métricas para todos los vendedores
  async recalculateAllVendorsMetrics() {
    try {
      console.log('🔄 Recalculando métricas para todos los vendedores...');

      const vendors = await User.findAll({
        where: {
          role: 'vendor',
          isActive: true
        },
        attributes: ['id']
      });

      const results = [];
      for (const vendor of vendors) {
        const success = await this.recalculateVendorMetrics(vendor.id);
        results.push({ vendorId: vendor.id, success });
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Métricas recalculadas: ${successCount}/${vendors.length} vendedores`);

      return results;
    } catch (error) {
      console.error('❌ Error recalculando todas las métricas:', error);
      throw error;
    }
  }

  // Obtener resumen de rendimiento del sistema
  async getSystemPerformanceSummary() {
    try {
      const [
        totalVendors,
        activeVendors,
        totalCommissions,
        totalReferrals,
        monthlyRevenue
      ] = await Promise.all([
        User.count({ where: { role: 'vendor' } }),
        User.count({ where: { role: 'vendor', isActive: true } }),
        VendorCommission.sum('monthlyAmount', { where: { isActive: true } }),
        VendorReferral.count({ where: { status: 'active' } }),
        VendorCommission.sum('monthlyAmount', {
          where: {
            isActive: true,
            lastCalculated: {
              [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        })
      ]);

      return {
        totalVendors,
        activeVendors,
        totalCommissions: totalCommissions || 0,
        totalReferrals,
        monthlyRevenue: monthlyRevenue || 0,
        averageCommissionPerVendor: activeVendors > 0 ? (totalCommissions / activeVendors) : 0
      };
    } catch (error) {
      console.error('❌ Error obteniendo resumen de rendimiento:', error);
      return {
        totalVendors: 0,
        activeVendors: 0,
        totalCommissions: 0,
        totalReferrals: 0,
        monthlyRevenue: 0,
        averageCommissionPerVendor: 0
      };
    }
  }
}

module.exports = new VendorMetricsService();