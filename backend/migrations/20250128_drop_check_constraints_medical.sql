/**
 * MIGRATION: Eliminar CHECK constraints problemáticos de tablas médicas
 *
 * Razón: Los constraints están en español pero el frontend usa valores en inglés.
 * Solución: Eliminar constraints para permitir ambos idiomas.
 */

-- user_education
ALTER TABLE user_education DROP CONSTRAINT IF EXISTS user_education_education_level_check;

-- user_chronic_conditions
ALTER TABLE user_chronic_conditions DROP CONSTRAINT IF EXISTS user_chronic_conditions_severity_check;

-- user_allergies
ALTER TABLE user_allergies DROP CONSTRAINT IF EXISTS user_allergies_allergy_type_check;
ALTER TABLE user_allergies DROP CONSTRAINT IF EXISTS user_allergies_severity_check;

-- user_medical_exams
ALTER TABLE user_medical_exams DROP CONSTRAINT IF EXISTS user_medical_exams_exam_type_check;
ALTER TABLE user_medical_exams DROP CONSTRAINT IF EXISTS user_medical_exams_result_check;

-- NOTE: user_vaccinations no tiene CHECK constraints
