const { DataTypes } = require('sequelize');

// Modelo Sequelize para Empleados (PostgreSQL-ready)
const Employee = (sequelize) => {
  return sequelize.define('Employee', {
    // Identificación
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    employeeNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'employee_number'
    },
    
    // Relaciones
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      },
      field: 'company_id'
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id'
      },
      field: 'branch_id'
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id'
      },
      field: 'department_id'
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'roles',
        key: 'id'
      },
      field: 'role_id'
    },
    
    // Información Personal
    firstName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'first_name'
    },
    lastName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'last_name'
    },
    fullName: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.firstName} ${this.lastName}`;
      }
    },
    displayName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'display_name'
    },
    
    // Documentación
    documentType: {
      type: DataTypes.ENUM('DNI', 'CUIT', 'CUIL', 'LE', 'LC', 'CI', 'PASSPORT'),
      allowNull: false,
      defaultValue: 'DNI',
      field: 'document_type'
    },
    documentNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'document_number'
    },
    
    // Contacto
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    mobilePhone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'mobile_phone'
    },
    emergencyContact: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      field: 'emergency_contact'
    },
    
    // Dirección
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    province: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'Argentina'
    },
    postalCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'postal_code'
    },
    
    // Fechas Importantes
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'birth_date'
    },
    hireDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'hire_date'
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'start_date'
    },
    terminationDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'termination_date'
    },
    
    // Información Laboral
    position: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    jobTitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'job_title'
    },
    contractType: {
      type: DataTypes.ENUM('FULL_TIME', 'PART_TIME', 'TEMPORARY', 'CONTRACTOR', 'INTERN'),
      allowNull: false,
      defaultValue: 'FULL_TIME',
      field: 'contract_type'
    },
    employmentStatus: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED', 'ON_LEAVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
      field: 'employment_status'
    },
    
    // Salario y Beneficios
    salary: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: true,
      defaultValue: 'ARS'
    },
    payFrequency: {
      type: DataTypes.ENUM('HOURLY', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY'),
      allowNull: true,
      defaultValue: 'MONTHLY',
      field: 'pay_frequency'
    },
    
    // Horarios y Turnos
    workSchedule: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      field: 'work_schedule'
    },
    shiftId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'shifts',
        key: 'id'
      },
      field: 'shift_id'
    },
    
    // Biometría y Acceso
    biometricData: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      field: 'biometric_data'
    },
    accessLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'access_level'
    },
    canAccessMobile: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'can_access_mobile'
    },
    
    // Estado y Configuración
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_verified'
    },
    requiresFaceRecognition: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'requires_face_recognition'
    },
    
    // Configuración de Notificaciones
    notificationSettings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        email: true,
        sms: false,
        push: true
      },
      field: 'notification_settings'
    },
    
    // Permisos y Vacaciones
    vacationDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'vacation_days'
    },
    sickDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sick_days'
    },
    
    // Información Legal y Compliance
    workPermit: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'work_permit'
    },
    socialSecurityNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'social_security_number'
    },
    taxId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'tax_id'
    },
    
    // Metadatos
    profilePicture: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'profile_picture'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    
    // Auditoría
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'created_by'
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'updated_by'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login'
    },
    
    // Timestamps
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'employees',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['company_id', 'employee_number']
      },
      {
        unique: true,
        fields: ['company_id', 'document_number']
      },
      {
        fields: ['company_id', 'branch_id']
      },
      {
        fields: ['company_id', 'department_id']
      },
      {
        fields: ['company_id', 'is_active']
      },
      {
        fields: ['employment_status']
      },
      {
        fields: ['hire_date']
      }
    ],
    hooks: {
      beforeValidate: (employee) => {
        // Generar displayName si no existe
        if (!employee.displayName) {
          employee.displayName = `${employee.firstName} ${employee.lastName}`;
        }
        
        // Convertir email a minúsculas
        if (employee.email) {
          employee.email = employee.email.toLowerCase();
        }
        
        // Asegurar que hireDate no sea futuro
        if (employee.hireDate && new Date(employee.hireDate) > new Date()) {
          throw new Error('La fecha de contratación no puede ser en el futuro');
        }
      },
      
      beforeCreate: async (employee, options) => {
        // Generar número de empleado automáticamente si no existe
        if (!employee.employeeNumber) {
          const companyEmployees = await Employee.findAll({
            where: { companyId: employee.companyId },
            order: [['employeeNumber', 'DESC']],
            limit: 1
          });
          
          let nextNumber = 1;
          if (companyEmployees.length > 0) {
            const lastNumber = parseInt(companyEmployees[0].employeeNumber);
            nextNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
          }
          
          employee.employeeNumber = String(nextNumber).padStart(4, '0');
        }
      }
    }
  });
};

// Definir asociaciones
Employee.associate = (models) => {
  // Empleado pertenece a una empresa
  Employee.belongsTo(models.Company, {
    foreignKey: 'companyId',
    as: 'company'
  });
  
  // Empleado pertenece a una sucursal
  Employee.belongsTo(models.Branch, {
    foreignKey: 'branchId',
    as: 'branch'
  });
  
  // Empleado pertenece a un departamento
  Employee.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'department'
  });
  
  // Empleado tiene un rol
  Employee.belongsTo(models.Role, {
    foreignKey: 'roleId',
    as: 'role'
  });
  
  // Empleado tiene un turno
  Employee.belongsTo(models.Shift, {
    foreignKey: 'shiftId',
    as: 'shift'
  });
  
  // Empleado tiene muchos registros de asistencia
  Employee.hasMany(models.Attendance, {
    foreignKey: 'employeeId',
    as: 'attendances'
  });
  
  // Empleado tiene muchas solicitudes de permiso
  Employee.hasMany(models.LeaveRequest, {
    foreignKey: 'employeeId',
    as: 'leaveRequests'
  });
  
  // Empleado fue creado/actualizado por usuario
  Employee.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
  
  Employee.belongsTo(models.User, {
    foreignKey: 'updatedBy',
    as: 'updater'
  });
};

module.exports = Employee;