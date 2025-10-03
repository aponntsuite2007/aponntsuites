const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Archivo JSON para persistir vendedores
const VENDORS_FILE = path.join(__dirname, '../../data/vendors.json');

// Asegurar que el directorio data existe
const dataDir = path.dirname(VENDORS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Modelo Vendor en memoria
class VendorMemory {
  constructor() {
    this.vendors = this.loadVendors();
    this.nextId = this.getNextId();
  }

  loadVendors() {
    try {
      if (fs.existsSync(VENDORS_FILE)) {
        const data = fs.readFileSync(VENDORS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error cargando vendedores desde archivo:', error);
    }
    return [];
  }

  saveVendors() {
    try {
      fs.writeFileSync(VENDORS_FILE, JSON.stringify(this.vendors, null, 2));
    } catch (error) {
      console.error('Error guardando vendedores:', error);
    }
  }

  getNextId() {
    if (this.vendors.length === 0) return 1;
    return Math.max(...this.vendors.map(v => v.id)) + 1;
  }

  // Simular Sequelize findAll
  findAll(options = {}) {
    let result = [...this.vendors];
    
    // Aplicar filtros si existen
    if (options.where) {
      Object.keys(options.where).forEach(key => {
        const value = options.where[key];
        result = result.filter(vendor => vendor[key] === value);
      });
    }
    
    // Aplicar ordenamiento
    if (options.order) {
      const [field, direction] = options.order[0];
      result.sort((a, b) => {
        if (direction === 'DESC') {
          return b[field] > a[field] ? 1 : -1;
        }
        return a[field] > b[field] ? 1 : -1;
      });
    }
    
    return Promise.resolve(result);
  }

  // Simular Sequelize create
  create(data) {
    const newVendor = {
      id: this.nextId++,
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.vendors.push(newVendor);
    this.saveVendors();
    
    return Promise.resolve(newVendor);
  }

  // Simular Sequelize findByPk
  findByPk(id) {
    const vendor = this.vendors.find(v => v.id === parseInt(id));
    return Promise.resolve(vendor || null);
  }

  // Simular Sequelize update
  update(id, data) {
    const index = this.vendors.findIndex(v => v.id === parseInt(id));
    if (index === -1) {
      return Promise.resolve(null);
    }
    
    this.vendors[index] = {
      ...this.vendors[index],
      ...data,
      updated_at: new Date()
    };
    
    this.saveVendors();
    return Promise.resolve(this.vendors[index]);
  }

  // Simular Sequelize destroy
  destroy(id) {
    const index = this.vendors.findIndex(v => v.id === parseInt(id));
    if (index === -1) {
      return Promise.resolve(false);
    }
    
    this.vendors.splice(index, 1);
    this.saveVendors();
    return Promise.resolve(true);
  }

  // Buscar vendedor por email
  static findByEmail(email) {
    return vendorMemory.findAll({ 
      where: { email: email }
    }).then(vendors => vendors[0] || null);
  }

  // Buscar vendedor por CUIT
  static findByCuit(cuit) {
    return vendorMemory.findAll({ 
      where: { cuit: cuit }
    }).then(vendors => vendors[0] || null);
  }

  // Buscar vendedores activos
  static findActive() {
    return vendorMemory.findAll({ 
      where: { isActive: true },
      order: [['name', 'ASC']]
    });
  }

  // Crear vendedor con validaciones
  static async createVendor(vendorData) {
    try {
      // Validar email único
      const existingEmail = await VendorMemory.findByEmail(vendorData.email);
      if (existingEmail) {
        throw new Error('Ya existe un vendedor con este email');
      }

      // Validar CUIT único si se proporciona
      if (vendorData.cuit) {
        const existingCuit = await VendorMemory.findByCuit(vendorData.cuit);
        if (existingCuit) {
          throw new Error('Ya existe un vendedor con este CUIT');
        }
      }

      const vendor = {
        name: vendorData.name,
        email: vendorData.email,
        phone: vendorData.phone || '',
        whatsapp: vendorData.whatsapp || '',
        dni: vendorData.dni || '',
        cuit: vendorData.cuit || '',
        ingresosBrutos: vendorData.ingresosBrutos || '',
        condicionIva: vendorData.condicionIva || 'monotributo', // monotributo, responsable_inscripto, exento
        commissionPercentage: parseFloat(vendorData.commissionPercentage) || 0,
        isActive: vendorData.isActive !== false,
        observations: vendorData.observations || '',
        // Campos de autenticación
        username: vendorData.username || vendorData.dni || vendorData.email,
        password: vendorData.password ? VendorMemory.hashPassword(vendorData.password) : VendorMemory.hashPassword('123456'),
        lastLogin: null,
        loginAttempts: 0,
        isLocked: false
      };

      return await vendorMemory.create(vendor);
    } catch (error) {
      console.error('Error creando vendedor:', error);
      throw error;
    }
  }

  // Actualizar vendedor
  static async updateVendor(id, vendorData) {
    try {
      const vendor = await vendorMemory.findByPk(id);
      if (!vendor) {
        throw new Error('Vendedor no encontrado');
      }

      // Validar email único (excepto el propio)
      if (vendorData.email && vendorData.email !== vendor.email) {
        const existingEmail = await VendorMemory.findByEmail(vendorData.email);
        if (existingEmail) {
          throw new Error('Ya existe un vendedor con este email');
        }
      }

      // Validar CUIT único (excepto el propio)
      if (vendorData.cuit && vendorData.cuit !== vendor.cuit) {
        const existingCuit = await VendorMemory.findByCuit(vendorData.cuit);
        if (existingCuit) {
          throw new Error('Ya existe un vendedor con este CUIT');
        }
      }

      const updateData = {
        name: vendorData.name,
        email: vendorData.email,
        phone: vendorData.phone || '',
        whatsapp: vendorData.whatsapp || '',
        dni: vendorData.dni || '',
        cuit: vendorData.cuit || '',
        ingresosBrutos: vendorData.ingresosBrutos || '',
        condicionIva: vendorData.condicionIva || 'monotributo',
        commissionPercentage: parseFloat(vendorData.commissionPercentage) || 0,
        isActive: vendorData.isActive !== false,
        observations: vendorData.observations || '',
        // Campos de autenticación (solo actualizar si se proporcionan)
        username: vendorData.username || vendor.username,
        // Solo actualizar password si se proporciona una nueva
        ...(vendorData.password && { password: VendorMemory.hashPassword(vendorData.password) })
      };

      return await vendorMemory.update(id, updateData);
    } catch (error) {
      console.error('Error actualizando vendedor:', error);
      throw error;
    }
  }

  // Generar preliquidación de comisiones
  static async generateCommissionPreliquidation(vendorId, month, year) {
    try {
      const PaymentMemory = require('./PaymentMemory');
      const vendor = await vendorMemory.findByPk(vendorId);
      
      if (!vendor) {
        throw new Error('Vendedor no encontrado');
      }

      // Obtener pagos del vendedor que fueron pagados antes del día 10
      const payments = await PaymentMemory.findByVendor(vendor.name);
      
      // Filtrar pagos del mes especificado que fueron pagados antes del día 10
      const cutoffDate = new Date(year, month - 1, 10, 23, 59, 59); // Día 10 del mes a las 23:59:59
      
      const eligiblePayments = payments.filter(payment => {
        const paymentMonth = parseInt(payment.month);
        const paymentYear = parseInt(payment.year);
        const paidDate = new Date(payment.paymentDate || payment.created_at);
        
        return (paymentMonth === month && 
                paymentYear === year && 
                payment.isPaid && 
                paidDate <= cutoffDate);
      });

      // Calcular totales
      let totalCommissionBase = 0;
      let totalIva = 0;
      let totalCommissionWithIva = 0;

      const commissionDetails = eligiblePayments.map(payment => {
        const commissionBase = payment.commissionAmount || 0;
        let iva = 0;
        let commissionWithIva = commissionBase;

        // Si es responsable inscripto, agregar IVA (21%)
        if (vendor.condicionIva === 'responsable_inscripto') {
          iva = commissionBase * 0.21;
          commissionWithIva = commissionBase + iva;
        }

        totalCommissionBase += commissionBase;
        totalIva += iva;
        totalCommissionWithIva += commissionWithIva;

        return {
          companyName: payment.companyName,
          companyId: payment.companyId,
          paymentDate: payment.paymentDate,
          totalAmount: payment.totalAmount,
          commissionPercentage: payment.commissionPercentage,
          commissionBase: commissionBase,
          iva: iva,
          commissionWithIva: commissionWithIva
        };
      });

      const preliquidation = {
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorEmail: vendor.email,
        vendorCuit: vendor.cuit,
        vendorCondicionIva: vendor.condicionIva,
        month: month,
        year: year,
        cutoffDate: cutoffDate,
        totalCommissionBase: parseFloat(totalCommissionBase.toFixed(2)),
        totalIva: parseFloat(totalIva.toFixed(2)),
        totalCommissionWithIva: parseFloat(totalCommissionWithIva.toFixed(2)),
        commissionDetails: commissionDetails,
        generatedAt: new Date(),
        paymentCount: eligiblePayments.length
      };

      return preliquidation;
    } catch (error) {
      console.error('Error generando preliquidación:', error);
      throw error;
    }
  }

  // Obtener estadísticas del vendedor
  static async getVendorStats(vendorId) {
    try {
      const PaymentMemory = require('./PaymentMemory');
      const CompanyMemory = require('./CompanyMemory');
      
      const vendor = await vendorMemory.findByPk(vendorId);
      if (!vendor) {
        throw new Error('Vendedor no encontrado');
      }

      // Obtener empresas del vendedor
      const companies = await CompanyMemory.findAll({
        where: { vendor: vendor.name }
      });

      // Obtener pagos del vendedor
      const payments = await PaymentMemory.findByVendor(vendor.name);

      // Calcular estadísticas
      const stats = {
        totalCompanies: companies.length,
        activeCompanies: companies.filter(c => c.status === 'active' && c.isActive).length,
        totalPayments: payments.length,
        paidPayments: payments.filter(p => p.isPaid).length,
        totalCommissionsEarned: payments
          .filter(p => p.isPaid)
          .reduce((sum, p) => sum + (p.commissionAmount || 0), 0),
        pendingCommissions: payments
          .filter(p => !p.isPaid)
          .reduce((sum, p) => sum + (p.commissionAmount || 0), 0),
        currentMonthCommissions: payments
          .filter(p => {
            const now = new Date();
            return p.month === (now.getMonth() + 1) && 
                   p.year === now.getFullYear() && 
                   p.isPaid;
          })
          .reduce((sum, p) => sum + (p.commissionAmount || 0), 0)
      };

      return {
        vendor,
        stats,
        companies: companies.slice(0, 10), // Últimas 10 empresas
        recentPayments: payments
          .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
          .slice(0, 10) // Últimos 10 pagos
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas del vendedor:', error);
      throw error;
    }
  }

  // Métodos de autenticación
  static hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'vendor_salt_2025').digest('hex');
  }

  static verifyPassword(password, hashedPassword) {
    return VendorMemory.hashPassword(password) === hashedPassword;
  }

  // Buscar vendedor por username
  static findByUsername(username) {
    return vendorMemory.findAll({
      where: { username: username }
    }).then(vendors => vendors[0] || null);
  }

  // Autenticar vendedor
  static async authenticateVendor(username, password) {
    try {
      const vendor = await VendorMemory.findByUsername(username);

      if (!vendor) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      if (!vendor.isActive) {
        return { success: false, error: 'Usuario inactivo' };
      }

      if (vendor.isLocked) {
        return { success: false, error: 'Usuario bloqueado por múltiples intentos fallidos' };
      }

      const isValidPassword = VendorMemory.verifyPassword(password, vendor.password);

      if (!isValidPassword) {
        // Incrementar intentos fallidos
        await vendorMemory.update(vendor.id, {
          loginAttempts: (vendor.loginAttempts || 0) + 1,
          isLocked: (vendor.loginAttempts || 0) >= 4 // Bloquear después de 5 intentos
        });
        return { success: false, error: 'Contraseña incorrecta' };
      }

      // Reset intentos y actualizar último login
      await vendorMemory.update(vendor.id, {
        loginAttempts: 0,
        isLocked: false,
        lastLogin: new Date()
      });

      // No devolver la contraseña
      const { password: _, ...vendorData } = vendor;
      return { success: true, vendor: vendorData };

    } catch (error) {
      console.error('Error autenticando vendedor:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }

  // Cambiar contraseña
  static async changePassword(vendorId, currentPassword, newPassword) {
    try {
      const vendor = await vendorMemory.findByPk(vendorId);

      if (!vendor) {
        return { success: false, error: 'Vendedor no encontrado' };
      }

      if (!VendorMemory.verifyPassword(currentPassword, vendor.password)) {
        return { success: false, error: 'Contraseña actual incorrecta' };
      }

      await vendorMemory.update(vendorId, {
        password: VendorMemory.hashPassword(newPassword)
      });

      return { success: true, message: 'Contraseña actualizada exitosamente' };

    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }
}

// Instancia global
const vendorMemory = new VendorMemory();

// Exportar tanto la instancia como la clase
module.exports = vendorMemory;
module.exports.VendorMemory = VendorMemory;