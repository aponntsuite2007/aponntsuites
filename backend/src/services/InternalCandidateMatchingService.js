/**
 * InternalCandidateMatchingService
 *
 * Servicio que escanea empleados internos para encontrar candidatos
 * potenciales basándose en:
 * - Antecedentes laborales (work_history)
 * - Capacitaciones y certificaciones (certifications, trainings)
 * - Skills declarados
 * - Nivel educativo
 *
 * Envía notificaciones proactivas invitando a postularse
 */

const { Op } = require('sequelize');
const { User, sequelize } = require('../config/database');
const inboxService = require('./inboxService');

class InternalCandidateMatchingService {
    constructor(companyId) {
        this.companyId = companyId;
    }

    /**
     * Ejecutar matching para una oferta laboral
     * @param {object} jobPosting - Instancia de JobPosting
     * @param {object} options - Opciones de matching
     * @returns {object} Resultado del matching
     */
    async executeMatching(jobPosting, options = {}) {
        const {
            forceResend = false,
            notifyImmediately = true,
            minScore = 50
        } = options;

        try {
            // Verificar que la búsqueda incluya candidatos internos
            if (jobPosting.search_scope === 'external') {
                return {
                    success: false,
                    message: 'Esta oferta es solo para búsqueda externa',
                    candidatesFound: 0,
                    candidatesNotified: 0
                };
            }

            // Verificar si ya se ejecutó el matching (a menos que se fuerce)
            if (jobPosting.internal_matching_executed_at && !forceResend) {
                // Buscar nuevos empleados que no hayan sido notificados
                const alreadyNotified = jobPosting.internal_candidates_notified || [];
                console.log(`🔍 [MATCHING] Re-escaneo incremental (${alreadyNotified.length} ya notificados)`);
            }

            console.log(`🔍 [MATCHING] Iniciando búsqueda de candidatos internos para oferta #${jobPosting.id}`);

            // Obtener criterios de matching
            const criteria = jobPosting.internal_matching_criteria || {};
            const effectiveMinScore = minScore || criteria.min_match_score || 50;

            // Buscar empleados de la misma empresa
            const employees = await User.findAll({
                where: {
                    company_id: this.companyId,
                    is_active: true,
                    role: { [Op.in]: ['employee', 'supervisor', 'operator'] }
                },
                attributes: [
                    'user_id', 'firstName', 'lastName', 'email',
                    'department_id', 'position', 'hireDate'
                ]
            });

            console.log(`   📊 Empleados activos encontrados: ${employees.length}`);

            // Analizar cada empleado
            const candidates = [];
            const alreadyNotified = jobPosting.internal_candidates_notified || [];

            for (const employee of employees) {
                // Saltar si ya fue notificado (a menos que se fuerce)
                if (alreadyNotified.includes(employee.user_id) && !forceResend) {
                    continue;
                }

                // Calcular score de matching
                const matchResult = await this.calculateMatchScore(
                    employee,
                    jobPosting,
                    criteria
                );

                if (matchResult.score >= effectiveMinScore) {
                    candidates.push({
                        user_id: employee.user_id,
                        name: `${employee.firstName} ${employee.lastName}`,
                        email: employee.email,
                        current_position: employee.position,
                        department_id: employee.department_id,
                        score: matchResult.score,
                        matchDetails: matchResult.details
                    });
                }
            }

            // Ordenar por score descendente
            candidates.sort((a, b) => b.score - a.score);

            console.log(`   ✅ Candidatos potenciales encontrados: ${candidates.length}`);

            // Enviar notificaciones si está habilitado
            let notificationsSent = 0;
            if (notifyImmediately && candidates.length > 0) {
                notificationsSent = await this.sendInvitations(
                    jobPosting,
                    candidates
                );
            }

            // Actualizar la oferta
            const updatedNotified = [
                ...new Set([
                    ...alreadyNotified,
                    ...candidates.map(c => c.user_id)
                ])
            ];

            await jobPosting.update({
                internal_matching_executed_at: new Date(),
                internal_candidates_count: updatedNotified.length,
                internal_candidates_notified: updatedNotified
            });

            return {
                success: true,
                message: `Matching completado. ${candidates.length} candidatos encontrados.`,
                candidatesFound: candidates.length,
                candidatesNotified: notificationsSent,
                candidates: candidates.map(c => ({
                    name: c.name,
                    score: c.score,
                    position: c.current_position
                }))
            };

        } catch (error) {
            console.error('❌ [MATCHING] Error:', error);
            throw error;
        }
    }

    /**
     * Obtener candidatos que hacen match sin enviar notificaciones (preview)
     */
    async getMatchingCandidates(jobPosting, options = {}) {
        const { showAll = false, includeNotified = false } = options;
        const criteria = jobPosting.internal_matching_criteria || {};
        const minScore = showAll ? 0 : (criteria.min_match_score || 50);

        // Buscar empleados de la misma empresa
        const employees = await User.findAll({
            where: {
                company_id: this.companyId,
                is_active: true,
                role: { [Op.in]: ['employee', 'supervisor', 'operator'] }
            },
            attributes: [
                'user_id', 'firstName', 'lastName', 'email',
                'department_id', 'position', 'hireDate'
            ]
        });

        const alreadyNotified = jobPosting.internal_candidates_notified || [];
        const candidates = [];

        for (const employee of employees) {
            // Saltar notificados si no se incluyen
            if (alreadyNotified.includes(employee.user_id) && !includeNotified) {
                continue;
            }

            const matchResult = await this.calculateMatchScore(
                employee,
                jobPosting,
                criteria
            );

            if (matchResult.score >= minScore) {
                candidates.push({
                    user_id: employee.user_id,
                    name: `${employee.firstName} ${employee.lastName}`,
                    email: employee.email,
                    current_position: employee.position,
                    department_id: employee.department_id,
                    score: matchResult.score,
                    matchDetails: matchResult.details
                });
            }
        }

        // Ordenar por score descendente
        candidates.sort((a, b) => b.score - a.score);

        return candidates;
    }

    /**
     * Calcular score de matching entre empleado y oferta
     */
    async calculateMatchScore(employee, jobPosting, criteria) {
        let score = 0;
        const details = [];
        const maxScore = 100;

        try {
            // 1. Matching de Skills (30 puntos)
            if (criteria.match_skills !== false) {
                const skillScore = await this.matchSkills(employee, jobPosting);
                score += skillScore.points;
                if (skillScore.points > 0) {
                    details.push({
                        category: 'skills',
                        points: skillScore.points,
                        description: skillScore.description
                    });
                }
            }

            // 2. Matching de Experiencia/Antecedentes (25 puntos)
            if (criteria.match_experience !== false) {
                const expScore = await this.matchExperience(employee, jobPosting);
                score += expScore.points;
                if (expScore.points > 0) {
                    details.push({
                        category: 'experience',
                        points: expScore.points,
                        description: expScore.description
                    });
                }
            }

            // 3. Matching de Certificaciones/Capacitaciones (25 puntos)
            if (criteria.match_certifications !== false) {
                const certScore = await this.matchCertifications(employee, jobPosting);
                score += certScore.points;
                if (certScore.points > 0) {
                    details.push({
                        category: 'certifications',
                        points: certScore.points,
                        description: certScore.description
                    });
                }
            }

            // 4. Matching de Educación (10 puntos)
            if (criteria.match_education !== false) {
                const eduScore = await this.matchEducation(employee, jobPosting);
                score += eduScore.points;
                if (eduScore.points > 0) {
                    details.push({
                        category: 'education',
                        points: eduScore.points,
                        description: eduScore.description
                    });
                }
            }

            // 5. Bonus por mismo departamento (10 puntos)
            if (employee.department_id === jobPosting.department_id) {
                score += 10;
                details.push({
                    category: 'department',
                    points: 10,
                    description: 'Mismo departamento'
                });
            }

        } catch (error) {
            console.error(`   ⚠️ Error calculando score para ${employee.user_id}:`, error.message);
        }

        return {
            score: Math.min(score, maxScore),
            details
        };
    }

    /**
     * Match de skills
     */
    async matchSkills(employee, jobPosting) {
        const requiredSkills = jobPosting.skills_required || [];
        if (requiredSkills.length === 0) {
            return { points: 0, description: 'Sin skills requeridos' };
        }

        // Buscar skills del empleado en su perfil o historial
        let employeeSkills = [];

        // Intentar obtener del perfil extendido
        try {
            const profile = await sequelize.query(`
                SELECT skills, technical_skills
                FROM user_profiles
                WHERE user_id = :userId
            `, {
                replacements: { userId: employee.user_id },
                type: sequelize.QueryTypes.SELECT
            });

            if (profile[0]) {
                employeeSkills = [
                    ...(profile[0].skills || []),
                    ...(profile[0].technical_skills || [])
                ];
            }
        } catch (e) {
            // Tabla puede no existir
        }

        // Calcular coincidencias
        const matchedSkills = requiredSkills.filter(skill =>
            employeeSkills.some(es =>
                es.toLowerCase().includes(skill.toLowerCase()) ||
                skill.toLowerCase().includes(es.toLowerCase())
            )
        );

        const matchPercentage = requiredSkills.length > 0
            ? matchedSkills.length / requiredSkills.length
            : 0;
        const points = Math.round(matchPercentage * 30);

        return {
            points,
            description: `${matchedSkills.length}/${requiredSkills.length} skills coinciden`
        };
    }

    /**
     * Match de experiencia/antecedentes laborales
     */
    async matchExperience(employee, jobPosting) {
        try {
            // Buscar antecedentes laborales del empleado
            const workHistory = await sequelize.query(`
                SELECT position, company, responsibilities, skills_used
                FROM work_history
                WHERE user_id = :userId
                ORDER BY end_date DESC NULLS FIRST
            `, {
                replacements: { userId: employee.user_id },
                type: sequelize.QueryTypes.SELECT
            });

            if (!workHistory.length) {
                // Si no hay historial, dar puntos por antigüedad en la empresa
                const hireDate = new Date(employee.hireDate);
                const yearsInCompany = (Date.now() - hireDate.getTime()) / (365 * 24 * 60 * 60 * 1000);

                if (yearsInCompany >= 2) {
                    return { points: 15, description: `${Math.floor(yearsInCompany)} años en la empresa` };
                }
                return { points: 5, description: 'Empleado actual' };
            }

            // Analizar relevancia del historial con el puesto
            const jobTitle = jobPosting.title.toLowerCase();
            const requirements = (jobPosting.requirements || '').toLowerCase();

            let relevanceScore = 0;
            let relevantPositions = [];

            for (const job of workHistory) {
                const position = (job.position || '').toLowerCase();
                const responsibilities = (job.responsibilities || '').toLowerCase();

                // Verificar similitud de título
                if (this.textSimilarity(position, jobTitle) > 0.3) {
                    relevanceScore += 10;
                    relevantPositions.push(job.position);
                }

                // Verificar keywords en responsabilidades
                if (this.containsKeywords(responsibilities, requirements)) {
                    relevanceScore += 5;
                }
            }

            const points = Math.min(relevanceScore, 25);
            return {
                points,
                description: relevantPositions.length > 0
                    ? `Experiencia relevante: ${relevantPositions.join(', ')}`
                    : `${workHistory.length} experiencias previas`
            };

        } catch (e) {
            // Tabla puede no existir
            return { points: 5, description: 'Empleado actual' };
        }
    }

    /**
     * Match de certificaciones y capacitaciones
     */
    async matchCertifications(employee, jobPosting) {
        try {
            // Buscar certificaciones del empleado
            const certifications = await sequelize.query(`
                SELECT name, type, expiry_date, status
                FROM user_certifications
                WHERE user_id = :userId AND (status = 'active' OR status IS NULL)
            `, {
                replacements: { userId: employee.user_id },
                type: sequelize.QueryTypes.SELECT
            });

            // Buscar capacitaciones completadas
            const trainings = await sequelize.query(`
                SELECT training_name, category, completion_date
                FROM user_trainings
                WHERE user_id = :userId AND status = 'completed'
            `, {
                replacements: { userId: employee.user_id },
                type: sequelize.QueryTypes.SELECT
            });

            const totalItems = certifications.length + trainings.length;
            if (totalItems === 0) {
                return { points: 0, description: 'Sin certificaciones registradas' };
            }

            // Buscar relevancia con requisitos del puesto
            const requirements = (jobPosting.requirements || '').toLowerCase();
            let relevantItems = [];

            for (const cert of certifications) {
                if (cert.name && this.containsKeywords(requirements, cert.name.toLowerCase())) {
                    relevantItems.push(cert.name);
                }
            }

            for (const training of trainings) {
                if (training.training_name && this.containsKeywords(requirements, training.training_name.toLowerCase())) {
                    relevantItems.push(training.training_name);
                }
            }

            // Puntuación: 5 pts por certificación relevante, max 25
            const points = Math.min(relevantItems.length * 8 + totalItems * 2, 25);

            return {
                points,
                description: relevantItems.length > 0
                    ? `Certificaciones relevantes: ${relevantItems.slice(0, 3).join(', ')}`
                    : `${totalItems} certificaciones/capacitaciones`
            };

        } catch (e) {
            return { points: 0, description: 'Sin datos de certificaciones' };
        }
    }

    /**
     * Match de educación
     */
    async matchEducation(employee, jobPosting) {
        try {
            const education = await sequelize.query(`
                SELECT degree, field_of_study, institution
                FROM user_education
                WHERE user_id = :userId
                ORDER BY graduation_year DESC
            `, {
                replacements: { userId: employee.user_id },
                type: sequelize.QueryTypes.SELECT
            });

            if (!education.length) {
                return { points: 0, description: 'Sin datos educativos' };
            }

            const requirements = (jobPosting.requirements || '').toLowerCase();
            const highestDegree = education[0];

            // Puntos base por tener educación registrada
            let points = 5;

            // Bonus si el campo de estudio es relevante
            if (highestDegree.field_of_study &&
                this.containsKeywords(requirements, highestDegree.field_of_study.toLowerCase())) {
                points += 5;
            }

            return {
                points: Math.min(points, 10),
                description: `${highestDegree.degree} en ${highestDegree.field_of_study || 'N/A'}`
            };

        } catch (e) {
            return { points: 0, description: 'Sin datos educativos' };
        }
    }

    /**
     * Enviar invitaciones a candidatos potenciales
     */
    async sendInvitations(jobPosting, candidates) {
        let sent = 0;

        for (const candidate of candidates) {
            try {
                // Crear grupo de notificación
                const notificationGroup = await inboxService.createNotificationGroup(this.companyId, {
                    group_type: 'internal_job_opportunity',
                    initiator_type: 'system',
                    subject: `🎯 Oportunidad Interna: ${jobPosting.title}`,
                    priority: 'high',
                    metadata: {
                        job_posting_id: jobPosting.id,
                        job_title: jobPosting.title,
                        match_score: candidate.score,
                        match_details: candidate.matchDetails
                    }
                });

                // Enviar mensaje al candidato
                await inboxService.sendMessage(notificationGroup.id, this.companyId, {
                    sender_type: 'system',
                    sender_name: 'Sistema de Oportunidades Internas',
                    recipient_type: 'user',
                    recipient_id: candidate.user_id,
                    recipient_name: candidate.name,
                    message_type: 'action_required',
                    subject: `Oportunidad Interna: ${jobPosting.title}`,
                    content: this.buildInvitationMessage(jobPosting, candidate),
                    requires_response: true,
                    deadline_at: jobPosting.auto_close_date || null,
                    channels: ['web', 'email']
                });

                sent++;
                console.log(`   📧 Invitación enviada a ${candidate.name} (Score: ${candidate.score}%)`);

            } catch (error) {
                console.error(`   ⚠️ Error enviando a ${candidate.email}:`, error.message);
            }
        }

        return sent;
    }

    /**
     * Construir mensaje de invitación personalizado
     */
    buildInvitationMessage(jobPosting, candidate) {
        const matchDetails = candidate.matchDetails || [];
        const matchSummary = matchDetails
            .map(d => `• **${d.category}**: ${d.description} (+${d.points} pts)`)
            .join('\n');

        return `
Hola ${candidate.name.split(' ')[0]},

Hemos identificado una **oportunidad laboral interna** que podría interesarte:

## 📋 ${jobPosting.title}
${jobPosting.description ? jobPosting.description.substring(0, 300) + '...' : ''}

**📊 Tu compatibilidad: ${candidate.score}%**

${matchSummary ? `\n### ¿Por qué eres un buen candidato?\n${matchSummary}` : ''}

${jobPosting.salary_min ? `\n**💰 Rango salarial:** $${jobPosting.salary_min} - $${jobPosting.salary_max} ${jobPosting.salary_currency}` : ''}

${jobPosting.location ? `**📍 Ubicación:** ${jobPosting.location}` : ''}

---

Si estás interesado/a, puedes **postularte directamente** desde el módulo de **Búsquedas Laborales**.

⚠️ Esta es una comunicación automática basada en tu perfil profesional.
        `.trim();
    }

    /**
     * Utilidades de texto
     */
    textSimilarity(str1, str2) {
        const words1 = str1.split(/\s+/);
        const words2 = str2.split(/\s+/);
        const common = words1.filter(w => words2.includes(w));
        return common.length / Math.max(words1.length, words2.length);
    }

    containsKeywords(text, keywords) {
        const keywordList = typeof keywords === 'string'
            ? keywords.split(/\s+/).filter(k => k.length > 3)
            : keywords;
        return keywordList.some(kw => text.includes(kw.toLowerCase()));
    }
}

module.exports = InternalCandidateMatchingService;
