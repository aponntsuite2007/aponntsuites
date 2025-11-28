/**
 * CREAR CICLO COMPLETO DE LIQUIDACIÓN - v2 (Estructura BD Correcta)
 *
 * Columnas correctas:
 * - users: user_id (UUID), firstName, lastName (NO id, NO username)
 * - attendances: UserId (con U mayúscula), checkInTime, checkOutTime, workingHours
 * - user_shift_assignments: user_id, shift_id
 * - user_salary_config: user_id, base_salary, payment_frequency
 * - payroll_runs: run_code, period_year, period_month
 * - payroll_run_details: run_id, user_id, worked_hours, gross_earnings, net_salary
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
            SELECT user_id, "firstName", "lastName", email
            FROM users
            WHERE company_id = :companyId AND is_active = true
            ORDER BY user_id
            LIMIT 2
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        if (users.length < 2) {
            throw new Error('Se necesitan al menos 2 usuarios activos en ISI');
        }

        const empleadoQuincenal = users[0];
        const empleadoMensual = users[1];

        console.log('   ✅ Empleado Quincenal:', empleadoQuincenal.firstName, empleadoQuincenal.lastName, `(${empleadoQuincenal.user_id.substring(0,8)}...)`);
        console.log('   ✅ Empleado Mensual:', empleadoMensual.firstName, empleadoMensual.lastName, `(${empleadoMensual.user_id.substring(0,8)}...)`);

        // =================================================================
        // PASO 3: Asignar turno a empleados (user_shift_assignments)
        // =================================================================
        console.log('\n📋 PASO 3: Asignar turno a empleados...');

        for (const user of [empleadoQuincenal, empleadoMensual]) {
            const existing = await sequelize.query(`
                SELECT id FROM user_shift_assignments
                WHERE user_id = :userId AND company_id = :companyId
            `, { replacements: { userId: user.user_id, companyId }, type: QueryTypes.SELECT });

            if (existing.length === 0) {
                await sequelize.query(`
                    INSERT INTO user_shift_assignments (user_id, shift_id, company_id, join_date, assigned_phase, is_active, assigned_at, created_at, updated_at)
                    VALUES (:userId, :shiftId, :companyId, NOW(), 'mañana', true, NOW(), NOW(), NOW())
                `, { replacements: { userId: user.user_id, shiftId, companyId } });
                console.log(`   ✅ Turno asignado a ${user.firstName}`);
            } else {
                console.log(`   ⏭️  ${user.firstName} ya tiene turno asignado`);
            }
        }

        // =================================================================
        // PASO 4: Configurar salarios (user_salary_config)
        // =================================================================
        console.log('\n📋 PASO 4: Configurar salarios...');

        // Empleado Quincenal: $450,000 por quincena (tipo jornal/por hora)
        await upsertSalaryConfig(sequelize, empleadoQuincenal.user_id, companyId, {
            base_salary: 450000,
            payment_frequency: 'quincenal',
            salary_type: 'por_hora',
            overtime_rate_weekday: 1.5,
            overtime_rate_weekend: 2.0,
            overtime_rate_holiday: 2.5
        });
        console.log(`   ✅ ${empleadoQuincenal.firstName}: $450,000 quincenal (por hora)`);

        // Empleado Mensual: $650,000 por mes (tipo mensual fijo)
        await upsertSalaryConfig(sequelize, empleadoMensual.user_id, companyId, {
            base_salary: 650000,
            payment_frequency: 'mensual',
            salary_type: 'mensual',
            overtime_rate_weekday: 1.5,
            overtime_rate_weekend: 2.0,
            overtime_rate_holiday: 2.5
        });
        console.log(`   ✅ ${empleadoMensual.firstName}: $650,000 mensual (fijo)`);

        // =================================================================
        // PASO 5: Crear fichajes simulados (attendances)
        // =================================================================
        console.log('\n📋 PASO 5: Crear fichajes simulados...');

        // Limpiar fichajes anteriores para estos usuarios (este mes)
        await sequelize.query(`
            DELETE FROM attendances
            WHERE "UserId" IN (:user1, :user2)
            AND date >= :startDate
        `, {
            replacements: {
                user1: empleadoQuincenal.user_id,
                user2: empleadoMensual.user_id,
                startDate: new Date(currentYear, currentMonth, 1)
            }
        });

        const fichajes = [];

        // Función para crear timestamp combinando fecha y hora
        function createTimestamp(fecha, hora) {
            if (!hora) return null;
            const [h, m, s] = hora.split(':').map(Number);
            const ts = new Date(fecha);
            ts.setHours(h, m, s || 0, 0);
            return ts;
        }

        for (let day = 1; day <= 15; day++) {
            const fecha = new Date(currentYear, currentMonth, day);
            const dayOfWeek = fecha.getDay();

            // Saltar fines de semana
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;

            // === EMPLEADO QUINCENAL ===

            // Día 5: Llegada tarde (30 min)
            if (day === 5) {
                fichajes.push({
                    userId: empleadoQuincenal.user_id,
                    date: fecha,
                    checkIn: createTimestamp(fecha, '09:30:00'),
                    checkOut: createTimestamp(fecha, '18:00:00'),
                    status: 'late',
                    workingHours: 8.5
                });
            }
            // Día 8: Ausencia injustificada
            else if (day === 8) {
                fichajes.push({
                    userId: empleadoQuincenal.user_id,
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
                    userId: empleadoQuincenal.user_id,
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
                    userId: empleadoQuincenal.user_id,
                    date: fecha,
                    checkIn: createTimestamp(fecha, '09:00:00'),
                    checkOut: createTimestamp(fecha, '22:00:00'),
                    status: 'present',
                    workingHours: 13
                });
            }
            // Día 15: Feriado trabajado
            else if (day === 15) {
                fichajes.push({
                    userId: empleadoQuincenal.user_id,
                    date: fecha,
                    checkIn: createTimestamp(fecha, '09:00:00'),
                    checkOut: createTimestamp(fecha, '18:00:00'),
                    status: 'holiday_worked',
                    workingHours: 9
                });
            }
            // Días normales
            else {
                fichajes.push({
                    userId: empleadoQuincenal.user_id,
                    date: fecha,
                    checkIn: createTimestamp(fecha, '09:00:00'),
                    checkOut: createTimestamp(fecha, '18:00:00'),
                    status: 'present',
                    workingHours: 9
                });
            }

            // === EMPLEADO MENSUAL ===
            if (day !== 8 && day !== 10) {
                fichajes.push({
                    userId: empleadoMensual.user_id,
                    date: fecha,
                    checkIn: createTimestamp(fecha, day === 3 ? '09:15:00' : '09:00:00'),
                    checkOut: createTimestamp(fecha, day === 7 ? '20:00:00' : '18:00:00'),
                    status: day === 3 ? 'late' : 'present',
                    workingHours: day === 7 ? 11 : 9
                });
            }
        }

        // Insertar fichajes
        for (const f of fichajes) {
            await sequelize.query(`
                INSERT INTO attendances (
                    id, "UserId", company_id, date, "checkInTime", "checkOutTime",
                    status, "workingHours", is_justified, absence_type, absence_reason,
                    "createdAt", "updatedAt"
                ) VALUES (
                    gen_random_uuid(), :userId, :companyId, :date, :checkIn, :checkOut,
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
                    isJustified: f.isJustified !== undefined ? f.isJustified : null,
                    absenceType: f.absenceType || null,
                    absenceReason: f.absenceReason || null
                }
            });
        }

        console.log(`   ✅ ${fichajes.length} fichajes creados`);
        console.log('      - Llegadas tarde: 2 (días 3 y 5)');
        console.log('      - Ausencia injustificada: 1 (día 8)');
        console.log('      - Ausencia justificada (médica): 1 (día 10)');
        console.log('      - Días con horas extras: 2 (días 7 y 12)');
        console.log('      - Feriado trabajado: 1 (día 15)');

        // =================================================================
        // PASO 6: Calcular liquidaciones
        // =================================================================
        console.log('\n📋 PASO 6: Calcular liquidaciones...');

        // Obtener fichajes para cada empleado
        const fichajesQ = await sequelize.query(`
            SELECT date, "checkInTime", "checkOutTime", status, "workingHours"
            FROM attendances
            WHERE "UserId" = :userId AND date >= :startDate
            ORDER BY date
        `, {
            replacements: {
                userId: empleadoQuincenal.user_id,
                startDate: new Date(currentYear, currentMonth, 1)
            },
            type: QueryTypes.SELECT
        });

        // Cálculos empleado quincenal
        const salarioQuincenal = 450000;
        const valorHoraQ = salarioQuincenal / 96;

        let diasTrabajadosQ = fichajesQ.filter(f => f.status === 'present' || f.status === 'late' || f.status === 'holiday_worked').length;
        let horasNormalesQ = fichajesQ.reduce((sum, f) => sum + Math.min(f.workingHours || 0, 9), 0);
        let horasExtrasQ = fichajesQ.reduce((sum, f) => sum + Math.max((f.workingHours || 0) - 9, 0), 0);
        let diasAusentesQ = fichajesQ.filter(f => f.status === 'absent').length;
        let ausenciasInjustificadasQ = fichajesQ.filter(f => f.status === 'absent' && !f.is_justified).length;
        let feriadoTrabajadoQ = fichajesQ.filter(f => f.status === 'holiday_worked').length;

        const conceptosQ = {
            sueldoBasico: salarioQuincenal,
            horasExtras50: horasExtrasQ * valorHoraQ * 1.5,
            feriadoTrabajado: feriadoTrabajadoQ * 9 * valorHoraQ * 1.5, // Pago adicional 50%
            presentismo: ausenciasInjustificadasQ === 0 ? salarioQuincenal * 0.0833 : 0,
            jubilacion: salarioQuincenal * 0.11,
            obraSocial: salarioQuincenal * 0.03,
            ley19032: salarioQuincenal * 0.03,
            descuentoAusencia: ausenciasInjustificadasQ * 9 * valorHoraQ
        };

        const totalHaberesQ = conceptosQ.sueldoBasico + conceptosQ.horasExtras50 + conceptosQ.feriadoTrabajado + conceptosQ.presentismo;
        const totalDeduccionesQ = conceptosQ.jubilacion + conceptosQ.obraSocial + conceptosQ.ley19032 + conceptosQ.descuentoAusencia;
        const netoQuincenal = totalHaberesQ - totalDeduccionesQ;

        console.log('\n   ═══════════════════════════════════════════════════════');
        console.log(`   📊 LIQUIDACIÓN QUINCENAL - ${empleadoQuincenal.firstName} ${empleadoQuincenal.lastName}`);
        console.log('   ═══════════════════════════════════════════════════════');
        console.log(`   Período: 1/${currentMonth+1}/${currentYear} - 15/${currentMonth+1}/${currentYear}`);
        console.log(`   Días trabajados: ${diasTrabajadosQ} | Ausencias: ${diasAusentesQ} (${ausenciasInjustificadasQ} injust.)`);
        console.log(`   Horas normales: ${horasNormalesQ} | Horas extras: ${horasExtrasQ}`);
        console.log('   ───────────────────────────────────────────────────────');
        console.log('   HABERES:');
        console.log(`      Sueldo Básico:        $${formatNum(conceptosQ.sueldoBasico)}`);
        console.log(`      Horas Extras 50%:     $${formatNum(conceptosQ.horasExtras50)}`);
        console.log(`      Feriado Trabajado:    $${formatNum(conceptosQ.feriadoTrabajado)}`);
        console.log(`      Presentismo:          $${formatNum(conceptosQ.presentismo)}`);
        console.log(`      TOTAL HABERES:        $${formatNum(totalHaberesQ)}`);
        console.log('   DEDUCCIONES:');
        console.log(`      Jubilación (11%):     -$${formatNum(conceptosQ.jubilacion)}`);
        console.log(`      Obra Social (3%):     -$${formatNum(conceptosQ.obraSocial)}`);
        console.log(`      Ley 19032 (3%):       -$${formatNum(conceptosQ.ley19032)}`);
        console.log(`      Desc. Ausencia:       -$${formatNum(conceptosQ.descuentoAusencia)}`);
        console.log(`      TOTAL DEDUCCIONES:    -$${formatNum(totalDeduccionesQ)}`);
        console.log('   ───────────────────────────────────────────────────────');
        console.log(`   💰 NETO A PAGAR:         $${formatNum(netoQuincenal)}`);
        console.log('   ═══════════════════════════════════════════════════════');

        // Cálculos empleado mensual
        const fichajesM = await sequelize.query(`
            SELECT date, "checkInTime", "checkOutTime", status, "workingHours"
            FROM attendances
            WHERE "UserId" = :userId AND date >= :startDate
            ORDER BY date
        `, {
            replacements: {
                userId: empleadoMensual.user_id,
                startDate: new Date(currentYear, currentMonth, 1)
            },
            type: QueryTypes.SELECT
        });

        const salarioMensual = 650000;
        const valorHoraM = salarioMensual / 192;

        let diasTrabajadosM = fichajesM.filter(f => f.status === 'present' || f.status === 'late').length;
        let horasExtrasM = fichajesM.reduce((sum, f) => sum + Math.max((f.workingHours || 0) - 9, 0), 0);

        const conceptosM = {
            sueldoBasico: salarioMensual,
            horasExtras50: horasExtrasM * valorHoraM * 1.5,
            presentismo: salarioMensual * 0.0833,
            sacProporcional: salarioMensual * 0.0833,
            jubilacion: salarioMensual * 0.11,
            obraSocial: salarioMensual * 0.03,
            ley19032: salarioMensual * 0.03
        };

        const totalHaberesM = conceptosM.sueldoBasico + conceptosM.horasExtras50 + conceptosM.presentismo + conceptosM.sacProporcional;
        const totalDeduccionesM = conceptosM.jubilacion + conceptosM.obraSocial + conceptosM.ley19032;
        const netoMensual = totalHaberesM - totalDeduccionesM;

        console.log('\n   ═══════════════════════════════════════════════════════');
        console.log(`   📊 LIQUIDACIÓN MENSUAL - ${empleadoMensual.firstName} ${empleadoMensual.lastName}`);
        console.log('   ═══════════════════════════════════════════════════════');
        console.log(`   Período: ${currentMonth+1}/${currentYear} (mensual)`);
        console.log(`   Días trabajados: ${diasTrabajadosM} | Horas extras: ${horasExtrasM}`);
        console.log('   ───────────────────────────────────────────────────────');
        console.log('   HABERES:');
        console.log(`      Sueldo Básico:        $${formatNum(conceptosM.sueldoBasico)}`);
        console.log(`      Horas Extras 50%:     $${formatNum(conceptosM.horasExtras50)}`);
        console.log(`      Presentismo (8.33%):  $${formatNum(conceptosM.presentismo)}`);
        console.log(`      SAC Proporcional:     $${formatNum(conceptosM.sacProporcional)}`);
        console.log(`      TOTAL HABERES:        $${formatNum(totalHaberesM)}`);
        console.log('   DEDUCCIONES:');
        console.log(`      Jubilación (11%):     -$${formatNum(conceptosM.jubilacion)}`);
        console.log(`      Obra Social (3%):     -$${formatNum(conceptosM.obraSocial)}`);
        console.log(`      Ley 19032 (3%):       -$${formatNum(conceptosM.ley19032)}`);
        console.log(`      TOTAL DEDUCCIONES:    -$${formatNum(totalDeduccionesM)}`);
        console.log('   ───────────────────────────────────────────────────────');
        console.log(`   💰 NETO A PAGAR:         $${formatNum(netoMensual)}`);
        console.log('   ═══════════════════════════════════════════════════════');

        // =================================================================
        // PASO 7: Guardar liquidaciones en BD
        // =================================================================
        console.log('\n📋 PASO 7: Guardar liquidaciones en BD...');

        const runCodeQ = `LIQ-Q1-${currentYear}${String(currentMonth+1).padStart(2,'0')}-ISI`;
        const runCodeM = `LIQ-M-${currentYear}${String(currentMonth+1).padStart(2,'0')}-ISI`;

        // Crear payroll_run quincenal
        const [runQ] = await sequelize.query(`
            INSERT INTO payroll_runs (
                company_id, run_code, run_name, period_year, period_month, period_half,
                period_start, period_end, total_employees, total_gross, total_deductions, total_net,
                status, created_at, updated_at
            ) VALUES (
                :companyId, :runCode, :runName, :year, :month, 1,
                :periodStart, :periodEnd, 1, :gross, :deductions, :net,
                'calculated', NOW(), NOW()
            )
            RETURNING id
        `, {
            replacements: {
                companyId,
                runCode: runCodeQ,
                runName: `Liquidación Quincenal ${currentMonth+1}/${currentYear} - Primera`,
                year: currentYear,
                month: currentMonth + 1,
                periodStart: new Date(currentYear, currentMonth, 1),
                periodEnd: new Date(currentYear, currentMonth, 15),
                gross: totalHaberesQ,
                deductions: totalDeduccionesQ,
                net: netoQuincenal
            },
            type: QueryTypes.INSERT
        });

        // Crear payroll_run_details quincenal
        await sequelize.query(`
            INSERT INTO payroll_run_details (
                run_id, user_id, worked_days, worked_hours, overtime_50_hours,
                absent_days, gross_earnings, total_deductions, net_salary,
                earnings_detail, deductions_detail, status, created_at, updated_at
            ) VALUES (
                :runId, :userId, :workedDays, :workedHours, :overtime,
                :absentDays, :gross, :deductions, :net,
                :earningsDetail, :deductionsDetail, 'calculated', NOW(), NOW()
            )
        `, {
            replacements: {
                runId: runQ[0].id,
                userId: empleadoQuincenal.user_id,
                workedDays: diasTrabajadosQ,
                workedHours: horasNormalesQ,
                overtime: horasExtrasQ,
                absentDays: diasAusentesQ,
                gross: totalHaberesQ,
                deductions: totalDeduccionesQ,
                net: netoQuincenal,
                earningsDetail: JSON.stringify(conceptosQ),
                deductionsDetail: JSON.stringify({
                    jubilacion: conceptosQ.jubilacion,
                    obraSocial: conceptosQ.obraSocial,
                    ley19032: conceptosQ.ley19032,
                    descuentoAusencia: conceptosQ.descuentoAusencia
                })
            }
        });
        console.log(`   ✅ Liquidación quincenal guardada: ${runCodeQ}`);

        // Crear payroll_run mensual
        const [runM] = await sequelize.query(`
            INSERT INTO payroll_runs (
                company_id, run_code, run_name, period_year, period_month,
                period_start, period_end, total_employees, total_gross, total_deductions, total_net,
                status, created_at, updated_at
            ) VALUES (
                :companyId, :runCode, :runName, :year, :month,
                :periodStart, :periodEnd, 1, :gross, :deductions, :net,
                'calculated', NOW(), NOW()
            )
            RETURNING id
        `, {
            replacements: {
                companyId,
                runCode: runCodeM,
                runName: `Liquidación Mensual ${currentMonth+1}/${currentYear}`,
                year: currentYear,
                month: currentMonth + 1,
                periodStart: new Date(currentYear, currentMonth, 1),
                periodEnd: new Date(currentYear, currentMonth + 1, 0),
                gross: totalHaberesM,
                deductions: totalDeduccionesM,
                net: netoMensual
            },
            type: QueryTypes.INSERT
        });

        // Crear payroll_run_details mensual
        await sequelize.query(`
            INSERT INTO payroll_run_details (
                run_id, user_id, worked_days, worked_hours, overtime_50_hours,
                gross_earnings, total_deductions, net_salary,
                earnings_detail, deductions_detail, status, created_at, updated_at
            ) VALUES (
                :runId, :userId, :workedDays, :workedHours, :overtime,
                :gross, :deductions, :net,
                :earningsDetail, :deductionsDetail, 'calculated', NOW(), NOW()
            )
        `, {
            replacements: {
                runId: runM[0].id,
                userId: empleadoMensual.user_id,
                workedDays: diasTrabajadosM,
                workedHours: diasTrabajadosM * 9,
                overtime: horasExtrasM,
                gross: totalHaberesM,
                deductions: totalDeduccionesM,
                net: netoMensual,
                earningsDetail: JSON.stringify(conceptosM),
                deductionsDetail: JSON.stringify({
                    jubilacion: conceptosM.jubilacion,
                    obraSocial: conceptosM.obraSocial,
                    ley19032: conceptosM.ley19032
                })
            }
        });
        console.log(`   ✅ Liquidación mensual guardada: ${runCodeM}`);

        // =================================================================
        // RESUMEN FINAL
        // =================================================================
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║                    ✅ CICLO COMPLETO CREADO                     ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log('\n📊 RESUMEN DE DATOS PERSISTIDOS:');
        console.log('   ├─ Turno asignado a 2 empleados (user_shift_assignments)');
        console.log('   ├─ Configuración salarial de 2 empleados (user_salary_config)');
        console.log('   ├─ Fichajes simulados: ' + fichajes.length + ' registros (attendances)');
        console.log('   │    ├─ Llegadas tarde: 2');
        console.log('   │    ├─ Ausencia injustificada: 1');
        console.log('   │    ├─ Ausencia justificada (médica): 1');
        console.log('   │    ├─ Días con horas extras: 2');
        console.log('   │    └─ Feriado trabajado: 1');
        console.log('   └─ Liquidaciones guardadas: 2 (payroll_runs + payroll_run_details)');
        console.log(`        ├─ ${empleadoQuincenal.firstName}: $${formatNum(netoQuincenal)} (quincenal)`);
        console.log(`        └─ ${empleadoMensual.firstName}: $${formatNum(netoMensual)} (mensual)`);
        console.log('\n🎯 Los datos están persistidos y pueden verse en el módulo de Liquidación\n');

        await sequelize.close();

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        await sequelize.close();
        process.exit(1);
    }
}

function formatNum(num) {
    return Math.round(num).toLocaleString('es-AR');
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
