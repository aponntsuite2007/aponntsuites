const fs = require('fs');
const path = require('path');

// Archivo JSON para persistir pagos
const PAYMENTS_FILE = path.join(__dirname, '../../data/payments.json');

// Asegurar que el directorio data existe
const dataDir = path.dirname(PAYMENTS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Modelo Payment en memoria
class PaymentMemory {
  constructor() {
    this.payments = this.loadPayments();
    this.nextId = this.getNextId();
  }

  loadPayments() {
    try {
      if (fs.existsSync(PAYMENTS_FILE)) {
        const data = fs.readFileSync(PAYMENTS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error cargando pagos desde archivo:', error);
    }
    return [];
  }

  savePayments() {
    try {
      fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(this.payments, null, 2));
    } catch (error) {
      console.error('Error guardando pagos:', error);
    }
  }

  getNextId() {
    if (this.payments.length === 0) return 1;
    return Math.max(...this.payments.map(p => p.id)) + 1;
  }

  // Simular Sequelize findAll
  findAll(options = {}) {
    let result = [...this.payments];
    
    // Aplicar filtros si existen
    if (options.where) {
      Object.keys(options.where).forEach(key => {
        const value = options.where[key];
        result = result.filter(payment => payment[key] === value);
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
    const newPayment = {
      id: this.nextId++,
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.payments.push(newPayment);
    this.savePayments();
    
    return Promise.resolve(newPayment);
  }

  // Simular Sequelize findByPk
  findByPk(id) {
    const payment = this.payments.find(p => p.id === parseInt(id));
    return Promise.resolve(payment || null);
  }

  // Simular Sequelize update
  update(id, data) {
    const index = this.payments.findIndex(p => p.id === parseInt(id));
    if (index === -1) {
      return Promise.resolve(null);
    }
    
    this.payments[index] = {
      ...this.payments[index],
      ...data,
      updated_at: new Date()
    };
    
    this.savePayments();
    return Promise.resolve(this.payments[index]);
  }

  // Simular Sequelize destroy
  destroy(id) {
    const index = this.payments.findIndex(p => p.id === parseInt(id));
    if (index === -1) {
      return Promise.resolve(false);
    }
    
    this.payments.splice(index, 1);
    this.savePayments();
    return Promise.resolve(true);
  }

  // Métodos específicos para pagos
  static findByCompany(companyId) {
    return paymentMemory.findAll({ 
      where: { companyId: parseInt(companyId) },
      order: [['paymentDate', 'DESC']]
    });
  }

  static findByVendor(vendorName) {
    return paymentMemory.findAll({ 
      where: { vendor: vendorName },
      order: [['paymentDate', 'DESC']]
    });
  }

  static findByDateRange(startDate, endDate) {
    return paymentMemory.findAll()
      .then(payments => payments.filter(payment => {
        const paymentDate = new Date(payment.paymentDate);
        return paymentDate >= new Date(startDate) && paymentDate <= new Date(endDate);
      }));
  }

  // Calcular totales para filtros
  static calculateTotals(payments) {
    const totals = {
      totalClientes: 0,
      totalDolares: 0,
      totalComisiones: 0,
      totalAponnt: 0
    };

    payments.forEach(payment => {
      totals.totalClientes += payment.totalAmount || 0;
      totals.totalDolares += payment.totalAmountUSD || 0;
      totals.totalComisiones += payment.commissionAmount || 0;
      totals.totalAponnt += payment.aponntAmount || 0;
    });

    return totals;
  }

  // Crear pago mensual para empresa
  static async createMonthlyPayment(paymentData) {
    try {
      const CompanyMemory = require('./CompanyMemory');
      const company = await CompanyMemory.findByPk(paymentData.companyId);
      
      if (!company) {
        throw new Error('Empresa no encontrada');
      }

      // Calcular subtotal sin impuestos (asumiendo 21% de IVA)
      const subtotal = paymentData.totalAmount / 1.21;
      const commissionPercentage = company.commissionPercentage || 0;
      const commissionAmount = subtotal * (commissionPercentage / 100);
      const aponntAmount = paymentData.totalAmount - commissionAmount;

      const payment = {
        companyId: parseInt(paymentData.companyId),
        companyName: company.name,
        vendor: company.vendor || paymentData.vendor,
        month: paymentData.month,
        year: paymentData.year,
        paymentDate: paymentData.paymentDate,
        totalAmount: parseFloat(paymentData.totalAmount),
        subtotal: parseFloat(subtotal.toFixed(2)),
        commissionPercentage: commissionPercentage,
        commissionAmount: parseFloat(commissionAmount.toFixed(2)),
        aponntAmount: parseFloat(aponntAmount.toFixed(2)),
        totalAmountUSD: paymentData.totalAmountUSD ? parseFloat(paymentData.totalAmountUSD) : 0,
        paymentMethod: paymentData.paymentMethod,
        isPaid: paymentData.isPaid || false,
        notes: paymentData.notes || ''
      };

      return await paymentMemory.create(payment);
    } catch (error) {
      console.error('Error creando pago mensual:', error);
      throw error;
    }
  }
}

// Instancia global
const paymentMemory = new PaymentMemory();

// Exportar tanto la instancia como la clase
module.exports = paymentMemory;
module.exports.PaymentMemory = PaymentMemory;