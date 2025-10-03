const OpenAI = require('openai');
const pdf = require('pdf-parse');
const fs = require('fs').promises;
const crypto = require('crypto-js');
const { sequelize } = require('../config/database');

class AIEvaluationGenerator {
    constructor() {
        this.openai = null;
        this.config = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Cargar configuración de IA desde la base de datos
            const [configData] = await sequelize.query(`
                SELECT * FROM ai_evaluation_config WHERE is_active = 1 LIMIT 1
            `);

            if (configData.length === 0) {
                throw new Error('No se encontró configuración activa de IA');
            }

            this.config = configData[0];
            
            // Configurar cliente OpenAI (o el provider configurado)
            if (this.config.ai_provider === 'openai') {
                const apiKey = process.env.OPENAI_API_KEY;
                if (!apiKey) {
                    throw new Error('OPENAI_API_KEY no configurada en variables de entorno');
                }
                
                this.openai = new OpenAI({
                    apiKey: apiKey
                });
            }

            this.initialized = true;
            console.log(`🤖 IA inicializada: ${this.config.ai_provider} - ${this.config.ai_model}`);

        } catch (error) {
            console.error('Error inicializando IA:', error);
            throw error;
        }
    }

    async extractTextFromPDF(pdfPath) {
        try {
            const dataBuffer = await fs.readFile(pdfPath);
            const data = await pdf(dataBuffer);
            
            return {
                text: data.text,
                pages: data.numpages,
                info: data.info
            };
        } catch (error) {
            console.error('Error extrayendo texto del PDF:', error);
            throw new Error(`Error procesando PDF: ${error.message}`);
        }
    }

    generateContentHash(content) {
        return crypto.SHA256(content).toString();
    }

    async generateEvaluationFromContent(courseId, content, options = {}) {
        await this.initialize();

        try {
            // Opciones por defecto
            const defaultOptions = {
                questionCount: this.config.default_question_count || 10,
                questionTypes: JSON.parse(this.config.question_types || '["multiple_choice", "true_false", "short_answer"]'),
                difficultyDistribution: JSON.parse(this.config.difficulty_distribution || '{"easy": 30, "medium": 50, "hard": 20}'),
                language: 'es',
                passingScore: 70
            };

            const finalOptions = { ...defaultOptions, ...options };

            // Calcular distribución de preguntas por tipo y dificultad
            const typeDistribution = this.calculateTypeDistribution(finalOptions.questionCount, finalOptions.questionTypes);
            const difficultyDistribution = this.calculateDifficultyDistribution(finalOptions.questionCount, finalOptions.difficultyDistribution);

            // Generar hash del contenido
            const contentHash = this.generateContentHash(content);

            // Crear prompt específico
            const prompt = this.buildEvaluationPrompt(content, typeDistribution, difficultyDistribution, finalOptions);

            // Llamar a la IA
            console.log('🤖 Generando evaluación con IA...');
            const aiResponse = await this.callAI(prompt);

            // Procesar respuesta
            const evaluation = this.processAIResponse(aiResponse, finalOptions);

            // Guardar en base de datos
            const evaluationId = `eval-${courseId}-${Date.now()}`;
            
            await sequelize.query(`
                INSERT INTO training_evaluations 
                (id, course_id, title, description, passing_score, max_attempts, questions, 
                 auto_generated, source_content_hash, ai_generation_date, ai_model_used, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, true, ?, NOW(), ?, 'ai-system')
            `, {
                replacements: [
                    evaluationId,
                    courseId,
                    evaluation.title,
                    evaluation.description,
                    finalOptions.passingScore,
                    3, // max attempts
                    JSON.stringify(evaluation.questions),
                    contentHash,
                    this.config.ai_model
                ]
            });

            console.log(`✅ Evaluación generada: ${evaluation.questions.length} preguntas`);

            return {
                success: true,
                evaluationId,
                evaluation,
                stats: {
                    totalQuestions: evaluation.questions.length,
                    typeDistribution,
                    difficultyDistribution,
                    contentHash
                }
            };

        } catch (error) {
            console.error('Error generando evaluación:', error);
            throw error;
        }
    }

    calculateTypeDistribution(totalQuestions, types) {
        const distribution = {};
        const baseCount = Math.floor(totalQuestions / types.length);
        const remainder = totalQuestions % types.length;

        types.forEach((type, index) => {
            distribution[type] = baseCount + (index < remainder ? 1 : 0);
        });

        return distribution;
    }

    calculateDifficultyDistribution(totalQuestions, percentages) {
        const distribution = {};
        
        distribution.easy = Math.round((percentages.easy / 100) * totalQuestions);
        distribution.hard = Math.round((percentages.hard / 100) * totalQuestions);
        distribution.medium = totalQuestions - distribution.easy - distribution.hard;

        return distribution;
    }

    buildEvaluationPrompt(content, typeDistribution, difficultyDistribution, options) {
        return `${this.config.system_prompt}

CONTENIDO A EVALUAR:
${content.substring(0, 8000)} ${content.length > 8000 ? '...' : ''}

INSTRUCCIONES:
- Genera exactamente ${options.questionCount} preguntas basadas en el contenido
- Distribución por tipo: ${JSON.stringify(typeDistribution)}
- Distribución por dificultad: ${JSON.stringify(difficultyDistribution)}
- Idioma: ${options.language === 'es' ? 'Español' : 'English'}

FORMATO REQUERIDO (JSON):
{
  "title": "Título de la evaluación",
  "description": "Descripción breve de la evaluación",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice|true_false|short_answer",
      "difficulty": "easy|medium|hard",
      "question": "Texto de la pregunta",
      "options": ["A", "B", "C", "D"] (solo para multiple_choice),
      "correct_answer": "respuesta correcta",
      "explanation": "Explicación de por qué es correcta",
      "points": 10
    }
  ]
}

IMPORTANTE:
- Las preguntas deben evaluar comprensión, no memorización
- Incluir preguntas de aplicación práctica
- Las explicaciones deben ser educativas
- Usar vocabulario apropiado para el nivel de la capacitación
- Evitar preguntas capciosas o ambiguas

Genera la evaluación en formato JSON válido:`;
    }

    async callAI(prompt) {
        if (this.config.ai_provider === 'openai') {
            const response = await this.openai.chat.completions.create({
                model: this.config.ai_model,
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 4000
            });

            return response.choices[0].message.content;
        }

        throw new Error(`Proveedor de IA no soportado: ${this.config.ai_provider}`);
    }

    processAIResponse(aiResponse, options) {
        try {
            // Limpiar la respuesta (remover markdown, etc.)
            let cleanedResponse = aiResponse;
            if (cleanedResponse.includes('```json')) {
                cleanedResponse = cleanedResponse.split('```json')[1].split('```')[0];
            } else if (cleanedResponse.includes('```')) {
                cleanedResponse = cleanedResponse.split('```')[1];
            }

            const evaluation = JSON.parse(cleanedResponse);

            // Validar estructura
            if (!evaluation.questions || !Array.isArray(evaluation.questions)) {
                throw new Error('Formato inválido: falta array de preguntas');
            }

            // Validar y procesar cada pregunta
            evaluation.questions = evaluation.questions.map((question, index) => {
                if (!question.question || !question.type || !question.correct_answer) {
                    throw new Error(`Pregunta ${index + 1} incompleta`);
                }

                return {
                    id: question.id || `q${index + 1}`,
                    type: question.type,
                    difficulty: question.difficulty || 'medium',
                    question: question.question,
                    options: question.options || [],
                    correct_answer: question.correct_answer,
                    explanation: question.explanation || '',
                    points: question.points || 10
                };
            });

            // Asegurar título y descripción
            evaluation.title = evaluation.title || 'Evaluación Generada Automáticamente';
            evaluation.description = evaluation.description || 'Evaluación creada por IA basada en el contenido del curso';

            return evaluation;

        } catch (error) {
            console.error('Error procesando respuesta de IA:', error);
            console.error('Respuesta original:', aiResponse);
            
            // Generar evaluación básica como fallback
            return this.generateFallbackEvaluation(options);
        }
    }

    generateFallbackEvaluation(options) {
        console.log('🔄 Generando evaluación de fallback...');
        
        return {
            title: 'Evaluación de Capacitación',
            description: 'Evaluación básica generada automáticamente',
            questions: [
                {
                    id: 'q1',
                    type: 'multiple_choice',
                    difficulty: 'easy',
                    question: '¿Cuál es el objetivo principal de esta capacitación?',
                    options: ['Cumplir con requisitos legales', 'Mejorar el desempeño', 'Reducir costos', 'Todas las anteriores'],
                    correct_answer: 'Todas las anteriores',
                    explanation: 'Las capacitaciones tienen múltiples objetivos que benefician tanto a la empresa como al empleado.',
                    points: 10
                },
                {
                    id: 'q2',
                    type: 'true_false',
                    difficulty: 'medium',
                    question: 'Es importante aplicar los conocimientos adquiridos en el trabajo diario.',
                    options: ['Verdadero', 'Falso'],
                    correct_answer: 'Verdadero',
                    explanation: 'La aplicación práctica de los conocimientos es fundamental para el éxito de cualquier capacitación.',
                    points: 10
                }
            ]
        };
    }

    async generateFromPDF(courseId, pdfPath, options = {}) {
        try {
            console.log('📄 Extrayendo texto del PDF...');
            const pdfContent = await this.extractTextFromPDF(pdfPath);
            
            console.log(`📊 PDF procesado: ${pdfContent.pages} páginas, ${pdfContent.text.length} caracteres`);
            
            if (pdfContent.text.length < 100) {
                throw new Error('El PDF no contiene suficiente texto para generar una evaluación');
            }

            return await this.generateEvaluationFromContent(courseId, pdfContent.text, options);

        } catch (error) {
            console.error('Error procesando PDF:', error);
            throw error;
        }
    }

    async regenerateEvaluation(evaluationId, options = {}) {
        try {
            // Buscar la evaluación existente
            const [existing] = await sequelize.query(`
                SELECT e.*, c.content_path 
                FROM training_evaluations e
                JOIN training_courses c ON e.course_id = c.id
                WHERE e.id = ?
            `, { replacements: [evaluationId] });

            if (existing.length === 0) {
                throw new Error('Evaluación no encontrada');
            }

            const evaluation = existing[0];

            if (evaluation.content_path && evaluation.content_path.endsWith('.pdf')) {
                // Regenerar desde PDF
                const result = await this.generateFromPDF(evaluation.course_id, evaluation.content_path, options);
                
                // Actualizar evaluación existente
                await sequelize.query(`
                    UPDATE training_evaluations 
                    SET questions = ?, source_content_hash = ?, ai_generation_date = NOW(), updated_at = NOW()
                    WHERE id = ?
                `, {
                    replacements: [
                        JSON.stringify(result.evaluation.questions),
                        result.stats.contentHash,
                        evaluationId
                    ]
                });

                return result;
            } else {
                throw new Error('No se puede regenerar: no hay contenido fuente disponible');
            }

        } catch (error) {
            console.error('Error regenerando evaluación:', error);
            throw error;
        }
    }

    async checkForContentChanges(courseId) {
        try {
            const [course] = await sequelize.query(`
                SELECT * FROM training_courses WHERE id = ?
            `, { replacements: [courseId] });

            if (course.length === 0 || !course[0].content_path) {
                return { hasChanges: false };
            }

            const currentContent = await this.extractTextFromPDF(course[0].content_path);
            const currentHash = this.generateContentHash(currentContent.text);

            const [evaluations] = await sequelize.query(`
                SELECT * FROM training_evaluations 
                WHERE course_id = ? AND auto_generated = 1
            `, { replacements: [courseId] });

            const hasChanges = evaluations.some(eval => eval.source_content_hash !== currentHash);

            return {
                hasChanges,
                currentHash,
                evaluations: evaluations.length
            };

        } catch (error) {
            console.error('Error verificando cambios:', error);
            return { hasChanges: false };
        }
    }
}

// Singleton instance
const aiEvaluationGenerator = new AIEvaluationGenerator();

module.exports = aiEvaluationGenerator;