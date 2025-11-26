/**
 * Modelos Sequelize para Sistema Médico Avanzado
 * Incluye: Datos Antropométricos, Condiciones Crónicas, Cirugías,
 * Tratamientos Psiquiátricos, Deportes y Hábitos Saludables
 */

const { DataTypes } = require('sequelize');

// ============================================================================
// DATOS ANTROPOMÉTRICOS
// ============================================================================
const UserAnthropometricData = (sequelize) => {
    return sequelize.define('UserAnthropometricData', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        measurement_date: {
            type: DataTypes.DATEONLY,
            defaultValue: DataTypes.NOW
        },
        weight_kg: DataTypes.DECIMAL(5, 2),
        height_cm: DataTypes.DECIMAL(5, 2),
        bmi: DataTypes.DECIMAL(4, 2),
        waist_circumference_cm: DataTypes.DECIMAL(5, 2),
        hip_circumference_cm: DataTypes.DECIMAL(5, 2),
        body_fat_percentage: DataTypes.DECIMAL(4, 2),
        muscle_mass_kg: DataTypes.DECIMAL(5, 2),
        blood_pressure_systolic: DataTypes.INTEGER,
        blood_pressure_diastolic: DataTypes.INTEGER,
        heart_rate_bpm: DataTypes.INTEGER,
        blood_type: DataTypes.STRING(5),
        rh_factor: DataTypes.STRING(10),
        measured_by: DataTypes.STRING(200),
        notes: DataTypes.TEXT
    }, {
        tableName: 'user_anthropometric_data',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

// ============================================================================
// CATÁLOGO DE CONDICIONES CRÓNICAS
// ============================================================================
const ChronicConditionsCatalog = (sequelize) => {
    return sequelize.define('ChronicConditionsCatalog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        code: {
            type: DataTypes.STRING(20),
            unique: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        category: DataTypes.STRING(100),
        description: DataTypes.TEXT,
        severity_default: {
            type: DataTypes.STRING(20),
            defaultValue: 'moderate'
        },
        requires_medication: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        requires_monitoring: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'chronic_conditions_catalog',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });
};

// ============================================================================
// CONDICIONES CRÓNICAS DEL USUARIO V2
// ============================================================================
const UserChronicConditionsV2 = (sequelize) => {
    return sequelize.define('UserChronicConditionsV2', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        condition_catalog_id: {
            type: DataTypes.INTEGER,
            references: { model: 'chronic_conditions_catalog', key: 'id' }
        },
        condition_name: DataTypes.STRING(200),
        diagnosis_date: DataTypes.DATEONLY,
        diagnosed_by: DataTypes.STRING(200),
        severity: {
            type: DataTypes.STRING(20),
            defaultValue: 'moderate'
        },
        current_status: {
            type: DataTypes.STRING(30),
            defaultValue: 'active'
        },
        treatment_status: DataTypes.STRING(30),
        affects_work_capacity: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        work_restrictions: DataTypes.TEXT,
        medications_required: DataTypes.TEXT,
        monitoring_frequency: DataTypes.STRING(50),
        last_checkup_date: DataTypes.DATEONLY,
        next_checkup_date: DataTypes.DATEONLY,
        specialist_doctor: DataTypes.STRING(200),
        specialist_phone: DataTypes.STRING(50),
        notes: DataTypes.TEXT,
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'user_chronic_conditions_v2',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

// ============================================================================
// CIRUGÍAS DEL USUARIO
// ============================================================================
const UserSurgeries = (sequelize) => {
    return sequelize.define('UserSurgeries', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        surgery_type: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        surgery_date: DataTypes.DATEONLY,
        hospital_clinic: DataTypes.STRING(200),
        surgeon_name: DataTypes.STRING(200),
        reason: DataTypes.TEXT,
        complications: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        complications_details: DataTypes.TEXT,
        recovery_days: DataTypes.INTEGER,
        return_to_work_date: DataTypes.DATEONLY,
        has_permanent_effects: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        permanent_effects_details: DataTypes.TEXT,
        follow_up_required: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        follow_up_frequency: DataTypes.STRING(50),
        last_follow_up_date: DataTypes.DATEONLY,
        documents_attached: DataTypes.ARRAY(DataTypes.TEXT),
        notes: DataTypes.TEXT
    }, {
        tableName: 'user_surgeries',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

// ============================================================================
// TRATAMIENTOS PSIQUIÁTRICOS
// ============================================================================
const UserPsychiatricTreatments = (sequelize) => {
    return sequelize.define('UserPsychiatricTreatments', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        treatment_type: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        condition_treated: DataTypes.STRING(200),
        diagnosis_date: DataTypes.DATEONLY,
        treatment_start_date: DataTypes.DATEONLY,
        treatment_end_date: DataTypes.DATEONLY,
        is_current: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        treating_professional: DataTypes.STRING(200),
        professional_type: DataTypes.STRING(50),
        professional_license: DataTypes.STRING(50),
        professional_phone: DataTypes.STRING(50),
        session_frequency: DataTypes.STRING(50),
        takes_psychiatric_medication: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        medication_details: DataTypes.TEXT,
        medication_side_effects: DataTypes.TEXT,
        affects_work_performance: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        work_accommodations_needed: DataTypes.TEXT,
        emergency_protocol: DataTypes.TEXT,
        hospitalization_history: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        hospitalization_details: DataTypes.TEXT,
        last_crisis_date: DataTypes.DATEONLY,
        crisis_frequency: DataTypes.STRING(50),
        confidentiality_level: {
            type: DataTypes.STRING(20),
            defaultValue: 'restricted'
        },
        notes: DataTypes.TEXT
    }, {
        tableName: 'user_psychiatric_treatments',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

// ============================================================================
// CATÁLOGO DE DEPORTES
// ============================================================================
const SportsCatalog = (sequelize) => {
    return sequelize.define('SportsCatalog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        category: DataTypes.STRING(50),
        is_extreme: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        risk_level: {
            type: DataTypes.STRING(20),
            defaultValue: 'low'
        },
        requires_medical_clearance: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        description: DataTypes.TEXT,
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'sports_catalog',
        timestamps: false
    });
};

// ============================================================================
// ACTIVIDADES DEPORTIVAS DEL USUARIO
// ============================================================================
const UserSportsActivities = (sequelize) => {
    return sequelize.define('UserSportsActivities', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        sport_catalog_id: {
            type: DataTypes.INTEGER,
            references: { model: 'sports_catalog', key: 'id' }
        },
        sport_name: DataTypes.STRING(100),
        practice_level: {
            type: DataTypes.STRING(30),
            allowNull: false
        },
        frequency: DataTypes.STRING(30),
        hours_per_week: DataTypes.DECIMAL(4, 1),
        years_practicing: DataTypes.INTEGER,
        is_federated: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        federation_name: DataTypes.STRING(200),
        license_number: DataTypes.STRING(50),
        team_club_name: DataTypes.STRING(200),
        participates_in_competitions: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        competition_level: DataTypes.STRING(50),
        competitions_per_year: DataTypes.INTEGER,
        last_competition_date: DataTypes.DATEONLY,
        achievements: DataTypes.TEXT,
        has_coach: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        coach_name: DataTypes.STRING(200),
        training_location: DataTypes.STRING(200),
        medical_clearance_required: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        medical_clearance_date: DataTypes.DATEONLY,
        medical_clearance_expiry: DataTypes.DATEONLY,
        is_extreme_sport: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        insurance_required: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        insurance_company: DataTypes.STRING(200),
        insurance_policy: DataTypes.STRING(100),
        notes: DataTypes.TEXT,
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'user_sports_activities',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

// ============================================================================
// HÁBITOS SALUDABLES
// ============================================================================
const UserHealthyHabits = (sequelize) => {
    return sequelize.define('UserHealthyHabits', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        does_regular_exercise: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        exercise_minutes_per_week: DataTypes.INTEGER,
        sedentary_hours_per_day: DataTypes.INTEGER,
        smoking_status: DataTypes.STRING(30),
        cigarettes_per_day: DataTypes.INTEGER,
        smoking_years: DataTypes.INTEGER,
        quit_date: DataTypes.DATEONLY,
        alcohol_consumption: DataTypes.STRING(30),
        drinks_per_week: DataTypes.INTEGER,
        diet_type: DataTypes.STRING(50),
        diet_restrictions: DataTypes.TEXT,
        meals_per_day: DataTypes.INTEGER,
        drinks_water_liters: DataTypes.DECIMAL(3, 1),
        average_sleep_hours: DataTypes.DECIMAL(3, 1),
        sleep_quality: DataTypes.STRING(30),
        has_sleep_disorders: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        sleep_disorder_details: DataTypes.TEXT,
        stress_level: DataTypes.STRING(30),
        stress_management_activities: DataTypes.TEXT,
        last_general_checkup: DataTypes.DATEONLY,
        last_dental_checkup: DataTypes.DATEONLY,
        last_vision_checkup: DataTypes.DATEONLY,
        last_gynecological_checkup: DataTypes.DATEONLY,
        last_urological_checkup: DataTypes.DATEONLY,
        notes: DataTypes.TEXT,
        last_updated: {
            type: DataTypes.DATEONLY,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'user_healthy_habits',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

module.exports = {
    UserAnthropometricData,
    ChronicConditionsCatalog,
    UserChronicConditionsV2,
    UserSurgeries,
    UserPsychiatricTreatments,
    SportsCatalog,
    UserSportsActivities,
    UserHealthyHabits
};
