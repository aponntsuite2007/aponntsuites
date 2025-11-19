const express = require('express');
const router = express.Router();
const { UserSalaryConfig, User } = require('../config/database');
const { auth, supervisorOrAdmin } = require('../middleware/auth');

/**
 * @route GET /api/v1/users/:userId/salary-config
 * @desc Obtener configuración salarial de un usuario
 * @access Private (supervisorOrAdmin - información sensible)
 */
router.get('/:userId/salary-config', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verificar que el usuario existe
    const user = await User.findOne({
      where: { user_id: userId }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    const salaryConfig = await UserSalaryConfig.findOne({
      where: {
        userId: userId,
        companyId: req.user.companyId,
        isActive: true
      }
    });

    if (!salaryConfig) {
      return res.status(404).json({
        error: 'Configuración salarial no encontrada'
      });
    }

    res.json({
      success: true,
      data: salaryConfig
    });

  } catch (error) {
    console.error('Error obteniendo configuración salarial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/users/:userId/salary-config
 * @desc Crear configuración salarial para un usuario
 * @access Private (supervisorOrAdmin)
 */
router.post('/:userId/salary-config', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      baseSalary,
      salaryCurrency,
      salaryType,
      paymentFrequency,
      paymentDay,
      bankName,
      bankAccountNumber,
      bankAccountType,
      cbu,
      aliasCbu,
      swiftCode,
      paymentMethod,
      paymentNotes,
      bonuses,
      allowances,
      deductions,
      hasObraSocial,
      obraSocialDeduction,
      hasSindicato,
      sindicatoDeduction,
      taxWithholdingPercentage,
      hasTaxExemption,
      taxExemptionReason,
      overtimeEnabled,
      overtimeRateWeekday,
      overtimeRateWeekend,
      overtimeRateHoliday,
      vacationDaysPerYear,
      sacEnabled,
      sacCalculationMethod,
      lastSalaryReviewDate,
      nextSalaryReviewDate,
      salaryIncreasePercentage,
      salaryIncreaseNotes,
      notes
    } = req.body;

    // Verificar que el usuario existe
    const user = await User.findOne({
      where: { user_id: userId }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Validaciones básicas
    if (!baseSalary || baseSalary <= 0) {
      return res.status(400).json({
        error: 'El salario base es obligatorio y debe ser mayor a 0'
      });
    }

    // Verificar que no exista ya una configuración ACTIVA para este usuario
    const existingConfig = await UserSalaryConfig.findOne({
      where: {
        userId: userId,
        companyId: req.user.companyId,
        isActive: true
      }
    });

    if (existingConfig) {
      return res.status(400).json({
        error: 'Ya existe una configuración salarial para este usuario. Use PUT para actualizar.'
      });
    }

    // Validar salaryType si viene
    if (salaryType && !['mensual', 'jornal', 'por_hora', 'comision'].includes(salaryType)) {
      return res.status(400).json({
        error: 'Tipo de salario inválido. Debe ser: mensual, jornal, por_hora o comision'
      });
    }

    // Validar paymentFrequency si viene
    if (paymentFrequency && !['mensual', 'quincenal', 'semanal', 'diario'].includes(paymentFrequency)) {
      return res.status(400).json({
        error: 'Frecuencia de pago inválida. Debe ser: mensual, quincenal, semanal o diario'
      });
    }

    // Validar bankAccountType si viene
    if (bankAccountType && !['caja_ahorro', 'cuenta_corriente'].includes(bankAccountType)) {
      return res.status(400).json({
        error: 'Tipo de cuenta bancaria inválido. Debe ser: caja_ahorro o cuenta_corriente'
      });
    }

    // Validar paymentMethod si viene
    if (paymentMethod && !['transferencia', 'cheque', 'efectivo', 'tarjeta'].includes(paymentMethod)) {
      return res.status(400).json({
        error: 'Método de pago inválido. Debe ser: transferencia, cheque, efectivo o tarjeta'
      });
    }

    // Validar CBU (debe tener 22 dígitos si se proporciona)
    if (cbu && (cbu.length !== 22 || isNaN(cbu))) {
      return res.status(400).json({
        error: 'El CBU debe tener exactamente 22 dígitos numéricos'
      });
    }

    // Validar sacCalculationMethod si viene
    if (sacCalculationMethod && !['average_salary', 'best_salary'].includes(sacCalculationMethod)) {
      return res.status(400).json({
        error: 'Método de cálculo de SAC inválido. Debe ser: average_salary o best_salary'
      });
    }

    // Crear nueva configuración salarial
    const newSalaryConfig = await UserSalaryConfig.create({
      userId: userId,
      companyId: req.user.companyId,
      baseSalary,
      salaryCurrency: salaryCurrency || 'ARS',
      salaryType,
      paymentFrequency,
      paymentDay,
      bankName,
      bankAccountNumber,
      bankAccountType,
      cbu,
      aliasCbu,
      swiftCode,
      paymentMethod: paymentMethod || 'transferencia',
      paymentNotes,
      bonuses: bonuses || [],
      allowances: allowances || [],
      deductions: deductions || [],
      hasObraSocial: hasObraSocial !== undefined ? hasObraSocial : true,
      obraSocialDeduction,
      hasSindicato: hasSindicato || false,
      sindicatoDeduction,
      taxWithholdingPercentage,
      hasTaxExemption: hasTaxExemption || false,
      taxExemptionReason,
      overtimeEnabled: overtimeEnabled !== undefined ? overtimeEnabled : true,
      overtimeRateWeekday: overtimeRateWeekday || 1.50,
      overtimeRateWeekend: overtimeRateWeekend || 2.00,
      overtimeRateHoliday: overtimeRateHoliday || 2.00,
      vacationDaysPerYear: vacationDaysPerYear || 14,
      vacationDaysUsed: 0,
      vacationDaysPending: vacationDaysPerYear || 14,
      sacEnabled: sacEnabled !== undefined ? sacEnabled : true,
      sacCalculationMethod: sacCalculationMethod || 'best_salary',
      lastSalaryReviewDate,
      nextSalaryReviewDate,
      salaryIncreasePercentage,
      salaryIncreaseNotes,
      notes,
      isActive: true,
      createdBy: req.user.user_id,
      lastUpdatedBy: req.user.user_id
    });

    console.log(`✅ [SALARY-CONFIG] Configuración salarial creada para usuario ${userId} - Salario base: ${baseSalary} ${salaryCurrency || 'ARS'}`);

    res.status(201).json({
      success: true,
      message: 'Configuración salarial creada exitosamente',
      data: newSalaryConfig
    });

  } catch (error) {
    console.error('Error creando configuración salarial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/users/:userId/salary-config
 * @desc Actualizar configuración salarial
 * @access Private (supervisorOrAdmin)
 */
router.put('/:userId/salary-config', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const salaryConfig = await UserSalaryConfig.findOne({
      where: {
        userId: userId,
        companyId: req.user.companyId,
        isActive: true
      }
    });

    if (!salaryConfig) {
      return res.status(404).json({
        error: 'Configuración salarial no encontrada'
      });
    }

    const updateData = { ...req.body };

    // Validaciones
    if (updateData.baseSalary !== undefined && updateData.baseSalary <= 0) {
      return res.status(400).json({
        error: 'El salario base debe ser mayor a 0'
      });
    }

    if (updateData.salaryType && !['mensual', 'jornal', 'por_hora', 'comision'].includes(updateData.salaryType)) {
      return res.status(400).json({
        error: 'Tipo de salario inválido'
      });
    }

    if (updateData.paymentFrequency && !['mensual', 'quincenal', 'semanal', 'diario'].includes(updateData.paymentFrequency)) {
      return res.status(400).json({
        error: 'Frecuencia de pago inválida'
      });
    }

    if (updateData.bankAccountType && !['caja_ahorro', 'cuenta_corriente'].includes(updateData.bankAccountType)) {
      return res.status(400).json({
        error: 'Tipo de cuenta bancaria inválido'
      });
    }

    if (updateData.paymentMethod && !['transferencia', 'cheque', 'efectivo', 'tarjeta'].includes(updateData.paymentMethod)) {
      return res.status(400).json({
        error: 'Método de pago inválido'
      });
    }

    if (updateData.cbu && (updateData.cbu.length !== 22 || isNaN(updateData.cbu))) {
      return res.status(400).json({
        error: 'El CBU debe tener exactamente 22 dígitos numéricos'
      });
    }

    if (updateData.sacCalculationMethod && !['average_salary', 'best_salary'].includes(updateData.sacCalculationMethod)) {
      return res.status(400).json({
        error: 'Método de cálculo de SAC inválido'
      });
    }

    // Validar días de vacaciones
    if (updateData.vacationDaysUsed !== undefined || updateData.vacationDaysPerYear !== undefined) {
      const usedDays = updateData.vacationDaysUsed !== undefined ? updateData.vacationDaysUsed : salaryConfig.vacationDaysUsed;
      const totalDays = updateData.vacationDaysPerYear !== undefined ? updateData.vacationDaysPerYear : salaryConfig.vacationDaysPerYear;

      if (usedDays < 0 || totalDays < 0) {
        return res.status(400).json({
          error: 'Los días de vacaciones no pueden ser negativos'
        });
      }

      if (usedDays > totalDays) {
        return res.status(400).json({
          error: 'Los días de vacaciones usados no pueden exceder el total'
        });
      }

      // Actualizar días pendientes
      updateData.vacationDaysPending = totalDays - usedDays;
    }

    // Si hay un aumento salarial, registrar la fecha de revisión
    if (updateData.baseSalary && updateData.baseSalary !== salaryConfig.baseSalary) {
      const increasePercentage = ((updateData.baseSalary - salaryConfig.baseSalary) / salaryConfig.baseSalary) * 100;
      updateData.salaryIncreasePercentage = parseFloat(increasePercentage.toFixed(2));
      updateData.lastSalaryReviewDate = new Date();
    }

    // Registrar quién hizo la última actualización
    updateData.lastUpdatedBy = req.user.user_id;

    // No permitir cambiar campos críticos
    delete updateData.userId;
    delete updateData.companyId;
    delete updateData.createdBy;

    await salaryConfig.update(updateData);

    console.log(`✅ [SALARY-CONFIG] Configuración salarial actualizada para usuario ${userId}`);

    res.json({
      success: true,
      message: 'Configuración salarial actualizada exitosamente',
      data: salaryConfig
    });

  } catch (error) {
    console.error('Error actualizando configuración salarial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route DELETE /api/v1/users/:userId/salary-config
 * @desc Desactivar configuración salarial (soft delete)
 * @access Private (supervisorOrAdmin)
 */
router.delete('/:userId/salary-config', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const salaryConfig = await UserSalaryConfig.findOne({
      where: {
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!salaryConfig) {
      return res.status(404).json({
        error: 'Configuración salarial no encontrada'
      });
    }

    // Soft delete: marcar como inactiva
    await salaryConfig.update({
      isActive: false,
      lastUpdatedBy: req.user.user_id
    });

    console.log(`✅ [SALARY-CONFIG] Configuración salarial desactivada para usuario ${userId}`);

    res.json({
      success: true,
      message: 'Configuración salarial desactivada exitosamente'
    });

  } catch (error) {
    console.error('Error desactivando configuración salarial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
