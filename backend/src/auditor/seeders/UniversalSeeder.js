/**
 * UNIVERSAL SEEDER - Genera datos de prueba realistas
 *
 * - Usa Faker.js para datos realistas
 * - Respeta relaciones entre módulos
 * - Multi-tenant (datos aislados por empresa)
 * - Limpieza automática después de tests
 *
 * @version 1.0.0
 */

const { faker } = require('@faker-js/faker/locale/es');

class UniversalSeeder {
  constructor(database, systemRegistry) {
    this.database = database;
    this.registry = systemRegistry;
    this.seededData = new Map(); // Para cleanup
  }

  /**
   * Genera datos de prueba para un módulo
   */
  async seedModule(moduleId, count, options = {}) {
    console.log(`  🌱 [SEEDER] Generando ${count} registros para ${moduleId}...`);

    const module = this.registry.getModule(moduleId);
    if (!module) {
      throw new Error(`Módulo ${moduleId} no encontrado en registry`);
    }

    // Verificar dependencias y generar datos necesarios primero
    await this._ensureDependencies(module, options);

    const records = [];

    switch (moduleId) {
      case 'users':
        records.push(...await this._seedUsers(count, options));
        break;

      case 'attendance':
        records.push(...await this._seedAttendance(count, options));
        break;

      case 'medical':
        records.push(...await this._seedMedical(count, options));
        break;

      case 'vacation':
        records.push(...await this._seedVacation(count, options));
        break;

      case 'departments':
        records.push(...await this._seedDepartments(count, options));
        break;

      case 'kiosks':
        records.push(...await this._seedKiosks(count, options));
        break;

      default:
        console.warn(`  ⚠️  [SEEDER] No hay seeder para ${moduleId}`);
    }

    // Guardar para cleanup
    this.seededData.set(moduleId, records);

    console.log(`  ✅ [SEEDER] ${records.length} registros creados para ${moduleId}`);
    return records;
  }

  async _seedUsers(count, options) {
    const { User, Company } = this.database;
    const users = [];

    // Obtener o crear company
    const companyId = options.company_id || await this._ensureCompany();

    for (let i = 0; i < count; i++) {
      const user = await User.create({
        id: faker.string.uuid(),
        company_id: companyId,
        email: faker.internet.email(),
        password: 'test123', // Hasheado en el modelo
        name: faker.person.fullName(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        dni: faker.number.int({ min: 10000000, max: 99999999 }).toString(),
        phone: faker.phone.number(),
        role: faker.helpers.arrayElement(['admin', 'rrhh', 'employee', 'supervisor']),
        status: 'Activo',
        department_id: null, // Se llenará si departments está activo
        is_active: true,
        allow_outside_radius: faker.datatype.boolean(),
        created_at: faker.date.past({ years: 2 })
      });

      users.push(user);
    }

    return users;
  }

  async _seedAttendance(count, options) {
    const { Attendance, User } = this.database;
    const records = [];

    // Necesitamos usuarios primero
    let users = await User.findAll({ limit: 10 });
    if (users.length === 0) {
      users = await this._seedUsers(10, options);
    }

    for (let i = 0; i < count; i++) {
      const user = faker.helpers.arrayElement(users);
      const type = faker.helpers.arrayElement(['checkin', 'checkout']);
      const timestamp = faker.date.recent({ days: 30 });

      const attendance = await Attendance.create({
        id: faker.string.uuid(),
        user_id: user.id,
        company_id: user.company_id,
        type,
        timestamp,
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
        accuracy: faker.number.int({ min: 5, max: 50 }),
        method: faker.helpers.arrayElement(['gps', 'biometric', 'manual']),
        status: 'approved',
        created_at: timestamp
      });

      records.push(attendance);
    }

    return records;
  }

  async _seedMedical(count, options) {
    const { MedicalCertificate, User } = this.database;
    const records = [];

    let users = await User.findAll({ limit: 10 });
    if (users.length === 0) {
      users = await this._seedUsers(10, options);
    }

    for (let i = 0; i < count; i++) {
      const user = faker.helpers.arrayElement(users);
      const startDate = faker.date.soon({ days: 5 });
      const days = faker.number.int({ min: 1, max: 7 });
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days);

      const cert = await MedicalCertificate.create({
        id: faker.string.uuid(),
        user_id: user.id,
        company_id: user.company_id,
        start_date: startDate,
        end_date: endDate,
        days: days,
        diagnosis: faker.helpers.arrayElement(['Gripe', 'Gastroenteritis', 'Fractura', 'Estrés']),
        medical_document: 'test-certificate.pdf',
        status: faker.helpers.arrayElement(['pending', 'approved', 'rejected']),
        created_at: faker.date.recent({ days: 10 })
      });

      records.push(cert);
    }

    return records;
  }

  async _seedVacation(count, options) {
    const { VacationRequest, User } = this.database;
    const records = [];

    let users = await User.findAll({ limit: 10 });
    if (users.length === 0) {
      users = await this._seedUsers(10, options);
    }

    for (let i = 0; i < count; i++) {
      const user = faker.helpers.arrayElement(users);
      const startDate = faker.date.future({ years: 1 });
      const days = faker.number.int({ min: 5, max: 21 });
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days);

      const vacation = await VacationRequest.create({
        id: faker.string.uuid(),
        user_id: user.id,
        company_id: user.company_id,
        start_date: startDate,
        end_date: endDate,
        days_requested: days,
        type: faker.helpers.arrayElement(['regular', 'extraordinary']),
        reason: faker.lorem.sentence(),
        status: faker.helpers.arrayElement(['pending', 'approved', 'rejected']),
        created_at: faker.date.recent({ days: 30 })
      });

      records.push(vacation);
    }

    return records;
  }

  async _seedDepartments(count, options) {
    const { Department, Company } = this.database;
    const departments = [];

    const companyId = options.company_id || await this._ensureCompany();

    const deptNames = ['Administración', 'Ventas', 'Producción', 'RRHH', 'IT', 'Marketing', 'Logística'];

    for (let i = 0; i < Math.min(count, deptNames.length); i++) {
      const dept = await Department.create({
        id: faker.string.uuid(),
        company_id: companyId,
        name: deptNames[i],
        description: `Departamento de ${deptNames[i]}`,
        is_active: true,
        created_at: faker.date.past({ years: 1 })
      });

      departments.push(dept);
    }

    return departments;
  }

  async _seedKiosks(count, options) {
    const { Kiosk, Company } = this.database;
    const kiosks = [];

    const companyId = options.company_id || await this._ensureCompany();

    for (let i = 0; i < count; i++) {
      const kiosk = await Kiosk.create({
        id: faker.string.uuid(),
        company_id: companyId,
        name: `Kiosk ${i + 1} - ${faker.location.street()}`,
        location: faker.location.streetAddress(),
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
        is_active: true,
        hardware_profile: faker.helpers.arrayElement(['ipad_pro_m2', 'samsung_tab_s9_ultra']),
        detection_method_facial: true,
        supports_walkthrough: faker.datatype.boolean(),
        created_at: faker.date.past({ months: 6 })
      });

      kiosks.push(kiosk);
    }

    return kiosks;
  }

  async _ensureDependencies(module, options) {
    for (const dep of module.dependencies.required) {
      // Verificar si ya hay datos
      const depModule = this.registry.getModule(dep);
      if (!depModule || !depModule.database_tables) continue;

      const tableName = depModule.database_tables[0]?.table;
      if (!tableName) continue;

      const [result] = await this.database.sequelize.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const count = parseInt(result[0].count);

      if (count === 0) {
        console.log(`  🔗 [SEEDER] Generando dependencia: ${dep}`);
        await this.seedModule(dep, 5, options);
      }
    }
  }

  async _ensureCompany() {
    const { Company } = this.database;

    let company = await Company.findOne({ where: { slug: 'test-company' } });

    if (!company) {
      company = await Company.create({
        id: faker.number.int({ min: 1000, max: 9999 }),
        name: 'Empresa de Prueba',
        slug: 'test-company',
        contact_email: 'test@test.com',
        is_active: true
      });
    }

    return company.id;
  }

  /**
   * Limpia todos los datos generados
   */
  async cleanup() {
    console.log('🧹 [SEEDER] Limpiando datos de prueba...');

    for (const [moduleId, records] of this.seededData) {
      try {
        const Model = this.database[this._capitalizeFirst(moduleId)];
        if (Model) {
          const ids = records.map(r => r.id);
          await Model.destroy({ where: { id: ids } });
          console.log(`  ✅ [SEEDER] ${moduleId}: ${records.length} registros eliminados`);
        }
      } catch (error) {
        console.error(`  ❌ [SEEDER] Error limpiando ${moduleId}:`, error.message);
      }
    }

    this.seededData.clear();
  }

  _capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = UniversalSeeder;
