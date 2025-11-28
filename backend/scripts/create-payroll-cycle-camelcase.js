/**
 * CREAR CICLO COMPLETO DE LIQUIDACIÓN - Versión CamelCase
 *
 * Este script crea datos REALES para probar el ciclo completo de liquidación:
 * - Turno con calendario
 * - Asignación de turno a empleados
 * - Configuración salarial
 * - Fichajes simulados (tardanzas, horas extras, ausencias)
 * - Liquidación quincenal y mensual
 */

const { Sequelize, QueryTypes } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
});

async function createPayrollCycle() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  CREAR CICLO COMPLETO DE LIQUIDACIÓN - ISI (company_id=11)     ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a BD establecida\n');

        const companyId = 11; // ISI
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // =================================================================
        // PASO 1: Verificar/Crear Turno para ISI
        // =================================================================
        console.log('📋 PASO 1: Verificar/Crear Turno para ISI...');

        let shift = await sequelize.query(`
            SELECT id, name, "startTime", "endTime", "toleranceMinutes"
            FROM shifts
            WHERE company_id = :companyId AND "isActive" = true
            LIMIT 1
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        if (shift.length === 0) {
            // Crear turno si no existe
            const [newShift] = await sequelize.query(`
                INSERT INTO shifts (name, "startTime", "endTime", "toleranceMinutes", "isActive", company_id, "createdAt", "updatedAt")
                VALUES ('Turno Oficina 9-18', '09:00', '18:00', 15, true, :companyId, NOW(), NOW())
                RETURNING id, name, "startTime", "endTime"
            `, { replacements: { companyId }, type: QueryTypes.INSERT });
            shift = [newShift[0]];
            console.log('   ✅ Turno creado:', shift[0].name);
        } else {
            console.log('   ✅ Turno existente:', shift[0].name, `(${shift[0].startTime} - ${shift[0].endTime})`);
        }
        const shiftId = shift[0].id;

        // =================================================================
        // PASO 2: Seleccionar 2 empleados de ISI
        // =================================================================
        console.log('\n📋 PASO 2: Seleccionar empleados de ISI...');

        const users = await sequelize.query(`
            SELECT id, username, first_name, last_name, email
            FROM users
            WHERE company_id = :companyId AND is_active = true
            ORDER BY id
            LIMIT 2
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        if (users.length < 2) {
            throw new Error('Se necesitan al menos 2 usuarios activos en ISI');
        }

        const empleadoQuincenal = users[0];
        const empleadoMensual = users[1];

        console.log('   ✅ Empleado Quincenal:', empleadoQuincenal.username, `(ID: ${empleadoQuincenal.id})`);
        console.log('   ✅ Empleado Mensual:', empleadoMensual.username, `(ID: ${empleadoMensual.id})`);

        // =================================================================
        // PASO 3: Asignar turno a empleados (user_shift_assignments)
        // =================================================================
        console.log('\n📋 PASO 3: Asignar turno a empleados...');

        for (const user of [empleadoQuincenal, empleadoMensual]) {
            // Verificar si ya existe asignación
            const existing = await sequelize.query(`
                SELECT id FROM user_shift_assignments
                WHERE user_id = :userId AND company_id = :companyId
            `, { replacements: { userId: user.id, companyId }, type: QueryTypes.SELECT });

            if (existing.length === 0) {
                await sequelize.query(`
                    INSERT INTO user_shift_assignments (user_id, shift_id, company_id, join_date, is_active, assigned_at, created_at, updated_at)
                    VALUES (:userId, :shiftId, :companyId, NOW(), true, NOW(), NOW(), NOW())
                `, { replacements: { userId: user.id, shiftId, companyId } });
                console.log(`   ✅ Turno asignado a ${user.username}`);
            } else {
                console.log(`   ⏭️  ${user.username} ya tiene turno asignado`);
            }
        }

        // =================================================================
        // PASO 4: Configurar salarios (user_salary_config)
        // =================================================================
        console.log('\n📋 PASO 4: Configurar salarios...');

        // Empleado Quincenal: $450,000 por quincena
        await upsertSalaryConfig(sequelize, empleadoQuincenal.id, companyId, {
            base_salary: 450000,
            payment_frequency: 'biweekly',
            salary_type: 'hourly_based',
            overtime_rate_weekday: 1.5,
            overtime_rate_weekend: 2.0,
            overtime_rate_holiday: 2.5
        });
        console.log(`   ✅ ${empleadoQuincenal.username}: $450,000 quincenal`);

        // Empleado Mensual: $650,000 por mes
        await upsertSalaryConfig(sequelize, empleadoMensual.id, companyId, {
            base_salary: 650000,
            payment_frequency: 'monthly',
            salary_type: 'fixed',
            overtime_rate_weekday: 1.5,
            overtime_rate_weekend: 2.0,
            overtime_rate_holiday: 2.5
        });
        console.log(`   ✅ ${empleadoMensual.username}: $650,000 mensual`);

        // =================================================================
        // PASO 5: Crear categorías salariales Argentina
        // =================================================================
        console.log('\n📋 PASO 5: Verificar categorías salariales Argentina...');

        const existingCategories = await sequelize.query(`
            SELECT id, name FROM salary_categories WHERE country_code = 'AR' LIMIT 5
        `, { type: QueryTypes.SELECT });

        if (existingCategories.length === 0) {
            await sequelize.query(`
                INSERT INTO salary_categories (name, description, base_hourly_rate, country_code, created_at, updated_at)
                VALUES
                ('Administrativo A', 'Personal administrativo categoría A', 2500, 'AR', NOW(), NOW()),
                ('Administrativo B', 'Personal administrativo categoría B', 2200, 'AR', NOW(), NOW()),
                ('Técnico I', 'Personal técnico nivel I', 3000, 'AR', NOW(), NOW()),
                ('Profesional', 'Personal profesional', 3500, 'AR', NOW(), NOW())
            `);
            console.log('   ✅ Categorías Argentina creadas');
        } else {
            console.log('   ✅ Categorías existentes:', existingCategories.map(c => c.name).join(', '));
        }

        // =================================================================
        // PASO 6: Crear fichajes simulados (attendances)
        // =================================================================
        console.log('\n📋 PASO 6: Crear fichajes simulados...');

        // Limpiar fichajes anteriores de prueba para estos usuarios
        await sequelize.query(`
            DELETE FROM attendances
            WHERE "UserId" IN (:user1, :user2)
            AND date >= :startDate
        `, {
            replacements: {
                user1: empleadoQuincenal.id,
                user2: empleadoMensual.id,
                startDate: new Date(currentYear, currentMonth, 1)
            }
        });

        // Crear fichajes para los primeros 15 días del mes (quincena)
        const fichajes = [];

        for (let day = 1; day <= 15; day++) {
            const fecha = new Date(currentYear, currentMonth, day);
            const dayOfWeek = fecha.getDay();

            // Saltar fines de semana
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;

            // Día 5: Llegada tarde (30 min)
            if (day === 5) {
                fichajes.push({
                    userId: empleadoQuincenal.id,
                    date: fecha,
                    checkIn: '09:30',
                    checkOut: '18:00',
                    status: 'late',
                    lateMinutes: 30,
                    workingHours: 8.5
                });
            }
            // Día 8: Ausencia injustificada
            else if (day === 8) {
                fichajes.push({
                    userId: empleadoQuincenal.id,
                    date: fecha,
                    checkIn: null,
                    checkOut: null,
                    status: 'absent',
                    isJustified: false,
                    absenceType: 'unexcused',
                    workingHours: 0
                });
            }
            // Día 10: Ausencia justificada (médica)
            else if (day === 10) {
                fichajes.push({
                    userId: empleadoQuincenal.id,
                    date: fecha,
                    checkIn: null,
                    checkOut: null,
                    status: 'absent',
                    isJustified: true,
                    absenceType: 'medical',
                    absenceReason: 'Certificado médico presentado',
                    workingHours: 0
                });
            }
            // Día 12: Horas extras (4 horas)
            else if (day === 12) {
                fichajes.push({
                    userId: empleadoQuincenal.id,
                    date: fecha,
                    checkIn: '09:00',
                    checkOut: '22:00',
                    status: 'present',
                    workingHours: 13,
                    overtimeHours: 4
                });
            }
            // Día 15: Feriado trabajado (Argentina - Navidad ejemplo)
            else if (day === 15) {
                fichajes.push({
                    userId: empleadoQuincenal.id,
                    date: fecha,
                    checkIn: '09:00',
                    checkOut: '18:00',
                    status: 'holiday_worked',
                    isHoliday: true,
                    workingHours: 9
                });
            }
            // Días normales
            else {
                fichajes.push({
                    userId: empleadoQuincenal.id,
                    date: fecha,
                    checkIn: '09:00',
                    checkOut: '18:00',
                    status: 'present',
                    workingHours: 9
                });
            }

            // Fichajes para empleado mensual (normal excepto algunos casos)
            if (day !== 8 && day !== 10) { // Sin ausencias
                fichajes.push({
                    userId: empleadoMensual.id,
                    date: fecha,
                    checkIn: day === 3 ? '09:15' : '09:00', // Llegada tarde día 3
                    checkOut: day === 7 ? '20:00' : '18:00', // Horas extra día 7
                    status: day === 3 ? 'late' : 'present',
                    lateMinutes: day === 3 ? 15 : 0,
                    workingHours: day === 7 ? 11 : 9,
                    overtimeHours: day === 7 ? 2 : 0
                });
            }
        }

        // Insertar fichajes
        for (const f of fichajes) {
            await sequelize.query(`
                INSERT INTO attendances (
                    "UserId", company_id, date, "checkInTime", "checkOutTime",
                    status, "workingHours", is_justified, absence_type, absence_reason,
                    "createdAt", "updatedAt"
                ) VALUES (
                    :userId, :companyId, :date, :checkIn, :checkOut,
                    :status, :workingHours, :isJustified, :absenceType, :absenceReason,
                    NOW(), NOW()
                )
            `, {
                replacements: {
                    userId: f.userId,
                    companyId,
                    date: f.date,
                    checkIn: f.checkIn,
                    checkOut: f.checkOut,
                    status: f.status,
                    workingHours: f.workingHours || 0,
                    isJustified: f.isJustified || null,
                    absenceType: f.absenceType || null,
                    absenceReason: f.absenceReason || null
                }
            });
        }

        console.log(`   ✅ ${fichajes.length} fichajes creados`);
        console.log('      - Llegadas tarde: 2 (días 3 y 5)');
        console.log('      - Ausencia injustificada: 1 (día 8)');
        console.log('      - Ausencia justificada (médica): 1 (día 10)');
        console.log('      - Horas extras: 2 días (día 7 y 12)');
        console.log('      - Feriado trabajado: 1 (día 15)');

        // =================================================================
        // PASO 7: Crear plantilla de conceptos Argentina
        // =================================================================
        console.log('\n📋 PASO 7: Verificar plantilla de conceptos Argentina...');

        const existingTemplate = await sequelize.query(`
            SELECT id, name FROM payroll_templates WHERE country_code = 'AR' LIMIT 1
        `, { type: QueryTypes.SELECT });

        let templateId;
        if (existingTemplate.length === 0) {
            const [template] = await sequelize.query(`
                INSERT INTO payroll_templates (name, description, country_code, is_default, created_at, updated_at)
                VALUES ('Plantilla Argentina Estándar', 'Conceptos estándar para liquidación Argentina', 'AR', true, NOW(), NOW())
                RETURNING id
            `, { type: QueryTypes.INSERT });
            templateId = template[0].id;
            console.log('   ✅ Plantilla Argentina creada');
        } else {
            templateId = existingTemplate[0].id;
            console.log('   ✅ Plantilla existente:', existingTemplate[0].name);
        }

        // Verificar conceptos
        const existingConcepts = await sequelize.query(`
            SELECT id, name, type FROM payroll_concept_types WHERE country_code = 'AR' LIMIT 10
        `, { type: QueryTypes.SELECT });

        if (existingConcepts.length < 5) {
            await sequelize.query(`
                INSERT INTO payroll_concept_types (name, description, type, calculation_type, percentage, country_code, is_mandatory, created_at, updated_at)
                VALUES
                ('Sueldo Básico', 'Salario base según categoría', 'earning', 'fixed', NULL, 'AR', true, NOW(), NOW()),
                ('Horas Extras 50%', 'Horas extras días hábiles', 'earning', 'percentage', 50, 'AR', false, NOW(), NOW()),
                ('Horas Extras 100%', 'Horas extras feriados/fines de semana', 'earning', 'percentage', 100, 'AR', false, NOW(), NOW()),
                ('Presentismo', 'Adicional por asistencia perfecta', 'earning', 'percentage', 8.33, 'AR', false, NOW(), NOW()),
                ('SAC Proporcional', 'Sueldo Anual Complementario proporcional', 'earning', 'percentage', 8.33, 'AR', true, NOW(), NOW()),
                ('Jubilación', 'Aporte jubilatorio', 'deduction', 'percentage', 11, 'AR', true, NOW(), NOW()),
                ('Obra Social', 'Aporte obra social', 'deduction', 'percentage', 3, 'AR', true, NOW(), NOW()),
                ('Ley 19032', 'Aporte PAMI', 'deduction', 'percentage', 3, 'AR', true, NOW(), NOW()),
                ('Sindicato', 'Cuota sindical', 'deduction', 'percentage', 2, 'AR', false, NOW(), NOW()),
                ('Descuento Tardanza', 'Descuento por llegada tarde', 'deduction', 'calculated', NULL, 'AR', false, NOW(), NOW()),
                ('Descuento Ausencia', 'Descuento por ausencia injustificada', 'deduction', 'calculated', NULL, 'AR', false, NOW(), NOW())
                ON CONFLICT DO NOTHING
            `);
            console.log('   ✅ Conceptos Argentina creados');
        } else {
            console.log('   ✅ Conceptos existentes:', existingConcepts.length);
        }

        // =================================================================
        // PASO 8: Calcular y crear liquidaciones
        // =================================================================
        console.log('\n📋 PASO 8: Calcular liquidaciones...');

        // Liquidación QUINCENAL - Empleado 1
        const salarioQuincenal = 450000;
        const valorHoraQ = salarioQuincenal / 96; // 96 horas quincenales aprox

        const conceptosQ = {
            sueldoBasico: salarioQuincenal,
            horasExtras50: valorHoraQ * 4 * 1.5, // 4 horas al 50%
            feriadoTrabajado: valorHoraQ * 9 * 2.5, // 9 horas al 250%
            presentismo: 0, // No aplica por ausencias
            jubilacion: salarioQuincenal * 0.11,
            obraSocial: salarioQuincenal * 0.03,
            ley19032: salarioQuincenal * 0.03,
            descuentoTardanza: valorHoraQ * 0.5, // 30 min
            descuentoAusencia: valorHoraQ * 9 // 1 día ausencia injustificada
        };

        const totalHaberesQ = conceptosQ.sueldoBasico + conceptosQ.horasExtras50 + conceptosQ.feriadoTrabajado;
        const totalDeduccionesQ = conceptosQ.jubilacion + conceptosQ.obraSocial + conceptosQ.ley19032 +
                                   conceptosQ.descuentoTardanza + conceptosQ.descuentoAusencia;
        const netoQuincenal = totalHaberesQ - totalDeduccionesQ;

        console.log('\n   ═══════════════════════════════════════════════════════');
        console.log(`   📊 LIQUIDACIÓN QUINCENAL - ${empleadoQuincenal.username}`);
        console.log('   ═══════════════════════════════════════════════════════');
        console.log('   HABERES:');
        console.log(`      Sueldo Básico:        $${conceptosQ.sueldoBasico.toLocaleString()}`);
        console.log(`      Horas Extras 50%:     $${conceptosQ.horasExtras50.toLocaleString()}`);
        console.log(`      Feriado Trabajado:    $${conceptosQ.feriadoTrabajado.toLocaleString()}`);
        console.log(`      TOTAL HABERES:        $${totalHaberesQ.toLocaleString()}`);
        console.log('   DEDUCCIONES:');
        console.log(`      Jubilación (11%):     -$${conceptosQ.jubilacion.toLocaleString()}`);
        console.log(`      Obra Social (3%):     -$${conceptosQ.obraSocial.toLocaleString()}`);
        console.log(`      Ley 19032 (3%):       -$${conceptosQ.ley19032.toLocaleString()}`);
        console.log(`      Desc. Tardanza:       -$${conceptosQ.descuentoTardanza.toLocaleString()}`);
        console.log(`      Desc. Ausencia:       -$${conceptosQ.descuentoAusencia.toLocaleString()}`);
        console.log(`      TOTAL DEDUCCIONES:    -$${totalDeduccionesQ.toLocaleString()}`);
        console.log('   ───────────────────────────────────────────────────────');
        console.log(`   💰 NETO A PAGAR:         $${netoQuincenal.toLocaleString()}`);
        console.log('   ═══════════════════════════════════════════════════════');

        // Liquidación MENSUAL - Empleado 2
        const salarioMensual = 650000;
        const valorHoraM = salarioMensual / 192; // 192 horas mensuales

        const conceptosM = {
            sueldoBasico: salarioMensual,
            horasExtras50: valorHoraM * 2 * 1.5, // 2 horas al 50%
            presentismo: salarioMensual * 0.0833, // 8.33% presentismo (tiene 1 tardanza leve)
            sacProporcional: salarioMensual * 0.0833,
            jubilacion: salarioMensual * 0.11,
            obraSocial: salarioMensual * 0.03,
            ley19032: salarioMensual * 0.03,
            descuentoTardanza: valorHoraM * 0.25 // 15 min
        };

        const totalHaberesM = conceptosM.sueldoBasico + conceptosM.horasExtras50 + conceptosM.presentismo + conceptosM.sacProporcional;
        const totalDeduccionesM = conceptosM.jubilacion + conceptosM.obraSocial + conceptosM.ley19032 + conceptosM.descuentoTardanza;
        const netoMensual = totalHaberesM - totalDeduccionesM;

        console.log('\n   ═══════════════════════════════════════════════════════');
        console.log(`   📊 LIQUIDACIÓN MENSUAL - ${empleadoMensual.username}`);
        console.log('   ═══════════════════════════════════════════════════════');
        console.log('   HABERES:');
        console.log(`      Sueldo Básico:        $${conceptosM.sueldoBasico.toLocaleString()}`);
        console.log(`      Horas Extras 50%:     $${conceptosM.horasExtras50.toLocaleString()}`);
        console.log(`      Presentismo (8.33%):  $${conceptosM.presentismo.toLocaleString()}`);
        console.log(`      SAC Proporcional:     $${conceptosM.sacProporcional.toLocaleString()}`);
        console.log(`      TOTAL HABERES:        $${totalHaberesM.toLocaleString()}`);
        console.log('   DEDUCCIONES:');
        console.log(`      Jubilación (11%):     -$${conceptosM.jubilacion.toLocaleString()}`);
        console.log(`      Obra Social (3%):     -$${conceptosM.obraSocial.toLocaleString()}`);
        console.log(`      Ley 19032 (3%):       -$${conceptosM.ley19032.toLocaleString()}`);
        console.log(`      Desc. Tardanza:       -$${conceptosM.descuentoTardanza.toLocaleString()}`);
        console.log(`      TOTAL DEDUCCIONES:    -$${totalDeduccionesM.toLocaleString()}`);
        console.log('   ───────────────────────────────────────────────────────');
        console.log(`   💰 NETO A PAGAR:         $${netoMensual.toLocaleString()}`);
        console.log('   ═══════════════════════════════════════════════════════');

        // =================================================================
        // PASO 9: Guardar liquidaciones en payroll_runs
        // =================================================================
        console.log('\n📋 PASO 9: Guardar liquidaciones en BD...');

        const periodoQuincenal = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-Q1`;
        const periodoMensual = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

        // Guardar liquidación quincenal
        await sequelize.query(`
            INSERT INTO payroll_runs (
                company_id, user_id, period, payment_type,
                gross_salary, total_deductions, net_salary,
                details, status, created_at, updated_at
            ) VALUES (
                :companyId, :userId, :period, 'biweekly',
                :gross, :deductions, :net,
                :details, 'calculated', NOW(), NOW()
            )
        `, {
            replacements: {
                companyId,
                userId: empleadoQuincenal.id,
                period: periodoQuincenal,
                gross: totalHaberesQ,
                deductions: totalDeduccionesQ,
                net: netoQuincenal,
                details: JSON.stringify(conceptosQ)
            }
        });
        console.log(`   ✅ Liquidación quincenal guardada (${periodoQuincenal})`);

        // Guardar liquidación mensual
        await sequelize.query(`
            INSERT INTO payroll_runs (
                company_id, user_id, period, payment_type,
                gross_salary, total_deductions, net_salary,
                details, status, created_at, updated_at
            ) VALUES (
                :companyId, :userId, :period, 'monthly',
                :gross, :deductions, :net,
                :details, 'calculated', NOW(), NOW()
            )
        `, {
            replacements: {
                companyId,
                userId: empleadoMensual.id,
                period: periodoMensual,
                gross: totalHaberesM,
                deductions: totalDeduccionesM,
                net: netoMensual,
                details: JSON.stringify(conceptosM)
            }
        });
        console.log(`   ✅ Liquidación mensual guardada (${periodoMensual})`);

        // =================================================================
        // RESUMEN FINAL
        // =================================================================
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║                    ✅ CICLO COMPLETO CREADO                     ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log('\n📊 RESUMEN DE DATOS CREADOS:');
        console.log('   ├─ Turno: "Turno Oficina 9-18" (09:00 - 18:00)');
        console.log('   ├─ Empleados con turno asignado: 2');
        console.log('   ├─ Configuraciones salariales: 2');
        console.log('   ├─ Fichajes simulados: ' + fichajes.length);
        console.log('   │    ├─ Llegadas tarde: 2');
        console.log('   │    ├─ Ausencias injustificadas: 1');
        console.log('   │    ├─ Ausencias justificadas (médica): 1');
        console.log('   │    ├─ Días con horas extras: 2');
        console.log('   │    └─ Feriados trabajados: 1');
        console.log('   └─ Liquidaciones guardadas: 2');
        console.log('        ├─ Quincenal: $' + netoQuincenal.toLocaleString());
        console.log('        └─ Mensual: $' + netoMensual.toLocaleString());
        console.log('\n🎯 Los datos están persistidos y pueden verse en la UI\n');

        await sequelize.close();

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        await sequelize.close();
        process.exit(1);
    }
}

async function upsertSalaryConfig(sequelize, userId, companyId, config) {
    const existing = await sequelize.query(`
        SELECT id FROM user_salary_config WHERE user_id = :userId AND company_id = :companyId
    `, { replacements: { userId, companyId }, type: QueryTypes.SELECT });

    if (existing.length > 0) {
        await sequelize.query(`
            UPDATE user_salary_config SET
                base_salary = :baseSalary,
                payment_frequency = :paymentFrequency,
                salary_type = :salaryType,
                overtime_rate_weekday = :overtimeWeekday,
                overtime_rate_weekend = :overtimeWeekend,
                overtime_rate_holiday = :overtimeHoliday,
                updated_at = NOW()
            WHERE user_id = :userId AND company_id = :companyId
        `, {
            replacements: {
                userId,
                companyId,
                baseSalary: config.base_salary,
                paymentFrequency: config.payment_frequency,
                salaryType: config.salary_type,
                overtimeWeekday: config.overtime_rate_weekday,
                overtimeWeekend: config.overtime_rate_weekend,
                overtimeHoliday: config.overtime_rate_holiday
            }
        });
    } else {
        await sequelize.query(`
            INSERT INTO user_salary_config (
                user_id, company_id, base_salary, salary_currency, salary_type,
                payment_frequency, overtime_rate_weekday, overtime_rate_weekend,
                overtime_rate_holiday, created_at, updated_at
            ) VALUES (
                :userId, :companyId, :baseSalary, 'ARS', :salaryType,
                :paymentFrequency, :overtimeWeekday, :overtimeWeekend,
                :overtimeHoliday, NOW(), NOW()
            )
        `, {
            replacements: {
                userId,
                companyId,
                baseSalary: config.base_salary,
                salaryType: config.salary_type,
                paymentFrequency: config.payment_frequency,
                overtimeWeekday: config.overtime_rate_weekday,
                overtimeWeekend: config.overtime_rate_weekend,
                overtimeHoliday: config.overtime_rate_holiday
            }
        });
    }
}

createPayrollCycle();
