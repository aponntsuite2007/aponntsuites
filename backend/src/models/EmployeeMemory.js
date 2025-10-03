const fs = require('fs');
const path = require('path');

// Archivo JSON para persistir empleados
const EMPLOYEES_FILE = path.join(__dirname, '../../data/employees.json');

// Asegurar que el directorio data existe
const dataDir = path.dirname(EMPLOYEES_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Modelo de Empleados en memoria
class EmployeeMemory {
  constructor() {
    this.employees = this.loadEmployees();
    this.nextId = this.getNextId();
  }

  loadEmployees() {
    try {
      if (fs.existsSync(EMPLOYEES_FILE)) {
        const data = fs.readFileSync(EMPLOYEES_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error cargando empleados desde archivo:', error);
    }
    return [];
  }

  saveEmployees() {
    try {
      fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(this.employees, null, 2));
    } catch (error) {
      console.error('Error guardando empleados:', error);
    }
  }

  getNextId() {
    if (this.employees.length === 0) return 1;
    return Math.max(...this.employees.map(e => e.id)) + 1;
  }

  // Simular Sequelize findAll
  findAll(options = {}) {
    let result = [...this.employees];
    
    // Aplicar filtros si existen
    if (options.where) {
      Object.keys(options.where).forEach(key => {
        const value = options.where[key];
        result = result.filter(employee => employee[key] === value);
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
    const newEmployee = {
      id: this.nextId++,
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.employees.push(newEmployee);
    this.saveEmployees();
    
    return Promise.resolve(newEmployee);
  }

  // Simular Sequelize findByPk
  findByPk(id) {
    const employee = this.employees.find(e => e.id === parseInt(id));
    return Promise.resolve(employee || null);
  }

  // Simular Sequelize update
  update(id, data) {
    const index = this.employees.findIndex(e => e.id === parseInt(id));
    if (index === -1) {
      return Promise.resolve(null);
    }
    
    this.employees[index] = {
      ...this.employees[index],
      ...data,
      updated_at: new Date()
    };
    
    this.saveEmployees();
    return Promise.resolve(this.employees[index]);
  }

  // Simular Sequelize destroy
  destroy(id) {
    const index = this.employees.findIndex(e => e.id === parseInt(id));
    if (index === -1) {
      return Promise.resolve(false);
    }
    
    this.employees.splice(index, 1);
    this.saveEmployees();
    return Promise.resolve(true);
  }

  // Métodos de clase para búsquedas específicas
  static findByCompany(companyId) {
    return employeeMemory.findAll({ 
      where: { companyId: parseInt(companyId), isActive: true },
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });
  }

  static findByBranch(branchId) {
    return employeeMemory.findAll({ 
      where: { branchId: parseInt(branchId), isActive: true },
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });
  }

  static findByDepartment(departmentId) {
    return employeeMemory.findAll({ 
      where: { departmentId: parseInt(departmentId), isActive: true },
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });
  }

  // Buscar empleados por número de empleado
  static findByEmployeeNumber(employeeNumber) {
    return employeeMemory.findAll({ 
      where: { employeeNumber, isActive: true }
    }).then(results => results[0] || null);
  }

  // Buscar empleados por email
  static findByEmail(email) {
    return employeeMemory.findAll({ 
      where: { email: email.toLowerCase(), isActive: true }
    }).then(results => results[0] || null);
  }

  // Buscar empleados por documento
  static findByDocument(documentNumber) {
    return employeeMemory.findAll({ 
      where: { documentNumber, isActive: true }
    }).then(results => results[0] || null);
  }

  // Generar número de empleado automático
  static async generateEmployeeNumber(companyId) {
    const companyEmployees = await EmployeeMemory.findByCompany(companyId);
    const maxNumber = companyEmployees.reduce((max, emp) => {
      const num = parseInt(emp.employeeNumber);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    
    return String(maxNumber + 1).padStart(4, '0');
  }

  // Validar unicidad de empleado en empresa
  static async validateUniqueness(companyId, field, value, excludeId = null) {
    const companyEmployees = await EmployeeMemory.findByCompany(companyId);
    return !companyEmployees.some(emp => 
      emp[field] === value && emp.id !== excludeId
    );
  }

  // Obtener estructura jerárquica (empresa -> sucursal -> departamento -> empleado)
  static async getHierarchy(companyId) {
    const employees = await EmployeeMemory.findByCompany(companyId);
    
    // Agrupar por sucursal y departamento
    const hierarchy = {};
    
    for (const employee of employees) {
      const branchId = employee.branchId || 'sin_sucursal';
      const departmentId = employee.departmentId || 'sin_departamento';
      
      if (!hierarchy[branchId]) {
        hierarchy[branchId] = {};
      }
      
      if (!hierarchy[branchId][departmentId]) {
        hierarchy[branchId][departmentId] = [];
      }
      
      hierarchy[branchId][departmentId].push(employee);
    }
    
    return hierarchy;
  }

  // Buscar empleados con filtros avanzados
  static async searchEmployees(filters = {}) {
    let employees = await employeeMemory.findAll();
    
    // Filtro por empresa
    if (filters.companyId) {
      employees = employees.filter(emp => emp.companyId === parseInt(filters.companyId));
    }
    
    // Filtro por sucursal
    if (filters.branchId) {
      employees = employees.filter(emp => emp.branchId === parseInt(filters.branchId));
    }
    
    // Filtro por departamento
    if (filters.departmentId) {
      employees = employees.filter(emp => emp.departmentId === parseInt(filters.departmentId));
    }
    
    // Filtro por texto (nombre, apellido, email, número empleado)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      employees = employees.filter(emp => 
        emp.firstName.toLowerCase().includes(searchTerm) ||
        emp.lastName.toLowerCase().includes(searchTerm) ||
        emp.email.toLowerCase().includes(searchTerm) ||
        emp.employeeNumber.includes(searchTerm)
      );
    }
    
    // Filtro por estado
    if (filters.isActive !== undefined) {
      employees = employees.filter(emp => emp.isActive === filters.isActive);
    }
    
    return employees;
  }
}

// Instancia global
const employeeMemory = new EmployeeMemory();

// Exportar tanto la instancia como la clase
module.exports = employeeMemory;
module.exports.EmployeeMemory = EmployeeMemory;