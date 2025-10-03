const fs = require('fs');
const path = require('path');

// Archivo JSON para persistir sucursales
const BRANCHES_FILE = path.join(__dirname, '../../data/branches.json');

// Asegurar que el directorio data existe
const dataDir = path.dirname(BRANCHES_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Modelo de Sucursales en memoria
class BranchMemory {
  constructor() {
    this.branches = this.loadBranches();
    this.nextId = this.getNextId();
  }

  loadBranches() {
    try {
      if (fs.existsSync(BRANCHES_FILE)) {
        const data = fs.readFileSync(BRANCHES_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error cargando sucursales desde archivo:', error);
    }
    return [];
  }

  saveBranches() {
    try {
      fs.writeFileSync(BRANCHES_FILE, JSON.stringify(this.branches, null, 2));
    } catch (error) {
      console.error('Error guardando sucursales:', error);
    }
  }

  getNextId() {
    if (this.branches.length === 0) return 1;
    return Math.max(...this.branches.map(b => b.id)) + 1;
  }

  // Simular Sequelize findAll
  findAll(options = {}) {
    let result = [...this.branches];
    
    // Aplicar filtros si existen
    if (options.where) {
      Object.keys(options.where).forEach(key => {
        const value = options.where[key];
        result = result.filter(branch => branch[key] === value);
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
    const newBranch = {
      id: this.nextId++,
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.branches.push(newBranch);
    this.saveBranches();
    
    return Promise.resolve(newBranch);
  }

  // Simular Sequelize findByPk
  findByPk(id) {
    const branch = this.branches.find(b => b.id === parseInt(id));
    return Promise.resolve(branch || null);
  }

  // Simular Sequelize update
  update(id, data) {
    const index = this.branches.findIndex(b => b.id === parseInt(id));
    if (index === -1) {
      return Promise.resolve(null);
    }
    
    this.branches[index] = {
      ...this.branches[index],
      ...data,
      updated_at: new Date()
    };
    
    this.saveBranches();
    return Promise.resolve(this.branches[index]);
  }

  // Simular Sequelize destroy
  destroy(id) {
    const index = this.branches.findIndex(b => b.id === parseInt(id));
    if (index === -1) {
      return Promise.resolve(false);
    }
    
    this.branches.splice(index, 1);
    this.saveBranches();
    return Promise.resolve(true);
  }

  // Métodos de clase para búsquedas específicas
  static findByCompany(companyId) {
    return branchMemory.findAll({ 
      where: { companyId: parseInt(companyId), isActive: true },
      order: [['name', 'ASC']]
    });
  }

  // Crear sucursal central automática si la empresa no tiene sucursales
  static async ensureCentralBranch(companyId, companyName = 'Empresa') {
    const existingBranches = await BranchMemory.findByCompany(companyId);
    
    if (existingBranches.length === 0) {
      const centralBranch = {
        companyId: parseInt(companyId),
        name: 'Central',
        code: 'CENTRAL',
        description: 'Sucursal central creada automáticamente',
        country: 'Argentina',
        province: '',
        city: '',
        address: '',
        postalCode: '',
        latitude: null,
        longitude: null,
        autoGeolocation: false,
        phone: '',
        email: '',
        manager: '',
        isActive: true,
        isCentral: true,  // Marcar como sucursal central
        isMainBranch: true,
        allowedServices: [],
        businessHours: {},
        capacity: null,
        notes: `Sucursal central de ${companyName}`,
        metadata: { autoCreated: true, createdReason: 'company_without_branches' }
      };
      
      return branchMemory.create(centralBranch);
    }
    
    return null;
  }

  // Asegurar que solo hay una sucursal central por empresa
  static async ensureUniqueCentralBranch(companyId, newCentralBranchId = null) {
    const companyBranches = await BranchMemory.findByCompany(companyId);
    
    // Si se especifica una nueva sucursal central, quitar el flag de las demás
    if (newCentralBranchId) {
      for (const branch of companyBranches) {
        if (branch.id !== parseInt(newCentralBranchId) && branch.isCentral) {
          await branchMemory.update(branch.id, { isCentral: false });
        }
      }
    }
    
    // Verificar que hay exactamente una sucursal central
    const centralBranches = companyBranches.filter(b => b.isCentral);
    
    if (centralBranches.length === 0 && companyBranches.length > 0) {
      // Si no hay sucursal central, hacer central a la primera
      await branchMemory.update(companyBranches[0].id, { isCentral: true });
    } else if (centralBranches.length > 1) {
      // Si hay múltiples centrales, dejar solo la primera
      for (let i = 1; i < centralBranches.length; i++) {
        await branchMemory.update(centralBranches[i].id, { isCentral: false });
      }
    }
    
    return true;
  }

  static findActiveBranches() {
    return branchMemory.findAll({ 
      where: { isActive: true },
      order: [['name', 'ASC']]
    });
  }

  static findByLocation(country, province = null, city = null) {
    const where = { country, isActive: true };
    if (province) where.province = province;
    if (city) where.city = city;
    
    return branchMemory.findAll({ 
      where,
      order: [['name', 'ASC']]
    });
  }

  // Método para buscar sucursales cercanas por coordenadas (geolocalización)
  static findNearby(latitude, longitude, radiusKm = 10) {
    return branchMemory.findAll({ where: { isActive: true } })
      .then(branches => {
        return branches.filter(branch => {
          if (!branch.latitude || !branch.longitude) return false;
          
          const distance = calculateDistance(
            latitude, longitude,
            branch.latitude, branch.longitude
          );
          
          return distance <= radiusKm;
        }).sort((a, b) => {
          const distA = calculateDistance(latitude, longitude, a.latitude, a.longitude);
          const distB = calculateDistance(latitude, longitude, b.latitude, b.longitude);
          return distA - distB;
        });
      });
  }
}

// Función para calcular distancia entre dos puntos geográficos (fórmula de Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Instancia global
const branchMemory = new BranchMemory();

// Exportar tanto la instancia como la clase
module.exports = branchMemory;
module.exports.BranchMemory = BranchMemory;