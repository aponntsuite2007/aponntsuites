# 🏗️ EMPLOYEE VOICE PLATFORM - ARQUITECTURA TÉCNICA COMPLETA

**Versión**: 1.0.0
**Fecha**: 2025-12-22
**Sistema**: APONNT Employee Experience & Voice Platform

---

## 📐 ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Formulario  │  │  Dashboard   │  │  Analytics   │              │
│  │  Sugerencias │  │  Admin       │  │  & Reports   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Express)                        │
│                      /api/voice-platform/*                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│   NODE.JS BACKEND        │   │  PYTHON NLP SERVICE      │
│   (Express + Sequelize)  │   │  (Flask + ML Models)     │
│                          │   │                          │
│  • CRUD APIs             │   │  • S-BERT Embeddings     │
│  • Clustering Service    │   │  • LDA Topic Modeling    │
│  • Gamification          │   │  • Sentiment Analysis    │
│  • Recognition           │   │  • Keyword Extraction    │
└──────────────────────────┘   └──────────────────────────┘
                │                           │
                │                           ▼
                │              ┌──────────────────────────┐
                │              │   FAISS VECTOR DB        │
                │              │   (Similarity Search)    │
                │              └──────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                               │
│                                                                      │
│  Tables:                                                             │
│  • employee_experiences (main)                                       │
│  • experience_clusters                                               │
│  • experience_votes                                                  │
│  • experience_comments                                               │
│  • experience_recognitions                                           │
│  • experience_topics (LDA results)                                   │
│                                                                      │
│  Extensions:                                                         │
│  • pgvector (vector similarity search)                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 COMPONENTES PRINCIPALES

### **1. Frontend Components** (`public/js/modules/voice-platform/`)

```
voice-platform/
├── VoiceForm.js                    # Formulario de sugerencias
├── VoiceDashboard.js               # Dashboard admin
├── VoiceEmployeeView.js            # Vista empleado
├── VoiceAnalytics.js               # Analytics & charts
├── VoiceClusterViewer.js           # Visualización de clusters
└── VoiceGamification.js            # Puntos, badges, leaderboard
```

### **2. Backend Node.js** (`backend/src/`)

```
src/
├── models/
│   ├── EmployeeExperience.js      # Modelo principal
│   ├── ExperienceCluster.js        # Clusters de similitudes
│   ├── ExperienceVote.js           # Votos (upvote/downvote)
│   ├── ExperienceComment.js        # Comentarios threading
│   ├── ExperienceRecognition.js    # Reconocimientos
│   └── ExperienceTopic.js          # LDA topics
│
├── routes/
│   └── voicePlatformRoutes.js      # API REST completa
│
├── services/
│   ├── VoiceDeduplicationService.js    # Deduplicación inteligente
│   ├── VoiceClusteringService.js       # Clustering automático
│   ├── VoiceGamificationService.js     # Puntos y badges
│   ├── VoiceRankingService.js          # Ranking de sugerencias
│   ├── VoiceAnalyticsService.js        # Métricas y analytics
│   └── VoiceNotificationService.js     # Notificaciones
│
└── nlp/
    └── nlpClient.js                # Cliente para Python NLP service
```

### **3. Python NLP Microservice** (`backend/nlp-service/`)

```
nlp-service/
├── app.py                          # Flask API
├── requirements.txt                # Dependencies
├── models/
│   ├── sentence_bert.py            # S-BERT embeddings
│   ├── topic_modeling.py           # LDA implementation
│   ├── sentiment_analyzer.py       # Sentiment analysis
│   └── keyword_extractor.py        # Keyword extraction
│
├── services/
│   ├── embedding_service.py        # Generate embeddings
│   ├── similarity_service.py       # Cosine similarity
│   └── clustering_service.py       # DBSCAN clustering
│
└── storage/
    ├── faiss_index.py              # Faiss vector DB
    └── models/                     # Pre-trained models
        ├── sbert-multilingual/
        └── sentiment-spanish/
```

---

## 📊 SCHEMA DE BASE DE DATOS

### **Tabla 1: employee_experiences**

```sql
CREATE TABLE employee_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INT NOT NULL REFERENCES companies(id),
  employee_id INT REFERENCES users(user_id),  -- NULL si anónimo total

  -- Contenido
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,

  -- Categorización manual (opcional)
  type VARCHAR(50),              -- SUGERENCIA, PROBLEMA, SOLUCION, RECONOCIMIENTO
  area VARCHAR(50),              -- PRODUCCION, ADMINISTRACION, LOGISTICA, etc.
  priority VARCHAR(20),          -- CRITICO, ALTO, MEDIO, BAJO
  impact_scope VARCHAR(20),      -- INDIVIDUAL, EQUIPO, PLANTA, EMPRESA

  -- IA/ML resultados
  embedding VECTOR(384),         -- S-BERT embedding (pgvector)
  topics JSONB,                  -- LDA topics: ["palletizado", "seguridad"]
  sentiment_score FLOAT,         -- -1 (negativo) a +1 (positivo)
  sentiment_label VARCHAR(20),   -- POSITIVE, NEUTRAL, NEGATIVE
  keywords TEXT[],               -- Extracted keywords

  -- Clustering
  cluster_id UUID REFERENCES experience_clusters(id),
  similarity_to_cluster FLOAT,  -- 0-1
  is_cluster_original BOOLEAN DEFAULT false,

  -- Visibilidad
  visibility VARCHAR(20) NOT NULL DEFAULT 'ADMIN_ONLY',
  -- ANONYMOUS: nadie ve autor (ni admin)
  -- ADMIN_ONLY: solo admin ve autor
  -- PUBLIC: todos ven autor

  -- Estado workflow
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  -- PENDING → IN_REVIEW → APPROVED → PILOT → IMPLEMENTED
  -- También: REJECTED, DUPLICATE

  -- Implementación
  approved_by INT REFERENCES users(user_id),
  approved_date TIMESTAMP,
  implementation_start_date TIMESTAMP,
  implementation_complete_date TIMESTAMP,
  implementation_notes TEXT,

  -- Métricas de impacto
  estimated_savings DECIMAL(12,2),
  actual_savings DECIMAL(12,2),
  estimated_time_saved VARCHAR(100),
  actual_time_saved VARCHAR(100),
  quality_improvement_pct FLOAT,
  safety_impact_notes TEXT,

  -- Engagement
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  views INT DEFAULT 0,

  -- Reconocimiento
  total_points_awarded INT DEFAULT 0,
  badges_earned TEXT[],

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Índices
  CONSTRAINT check_visibility CHECK (visibility IN ('ANONYMOUS', 'ADMIN_ONLY', 'PUBLIC')),
  CONSTRAINT check_status CHECK (status IN ('PENDING', 'IN_REVIEW', 'APPROVED', 'PILOT',
                                             'IMPLEMENTED', 'REJECTED', 'DUPLICATE'))
);

-- Índices para performance
CREATE INDEX idx_experiences_company ON employee_experiences(company_id);
CREATE INDEX idx_experiences_employee ON employee_experiences(employee_id);
CREATE INDEX idx_experiences_cluster ON employee_experiences(cluster_id);
CREATE INDEX idx_experiences_status ON employee_experiences(status);
CREATE INDEX idx_experiences_created ON employee_experiences(created_at DESC);

-- Vector similarity search (requiere pgvector)
CREATE INDEX idx_experiences_embedding
  ON employee_experiences
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### **Tabla 2: experience_clusters**

```sql
CREATE TABLE experience_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INT NOT NULL REFERENCES companies(id),

  -- Metadata del cluster
  name VARCHAR(200) NOT NULL,
  description TEXT,
  auto_generated BOOLEAN DEFAULT true,

  -- Centroid del cluster (promedio de embeddings)
  centroid_embedding VECTOR(384),

  -- Categorización del cluster
  type VARCHAR(50),
  area VARCHAR(50),
  priority VARCHAR(20),

  -- LDA topics del cluster
  dominant_topics JSONB,

  -- Estadísticas
  member_count INT DEFAULT 0,
  total_upvotes INT DEFAULT 0,
  total_downvotes INT DEFAULT 0,
  avg_sentiment FLOAT,

  -- Estado
  status VARCHAR(20) DEFAULT 'PENDING',
  merged_into_cluster_id UUID REFERENCES experience_clusters(id),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_cluster_status CHECK (status IN ('PENDING', 'IN_REVIEW', 'APPROVED',
                                                     'IMPLEMENTED', 'REJECTED', 'MERGED'))
);

CREATE INDEX idx_clusters_company ON experience_clusters(company_id);
CREATE INDEX idx_clusters_status ON experience_clusters(status);
```

### **Tabla 3: experience_votes**

```sql
CREATE TABLE experience_votes (
  id SERIAL PRIMARY KEY,
  experience_id UUID NOT NULL REFERENCES employee_experiences(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(user_id),
  company_id INT NOT NULL REFERENCES companies(id),

  vote_type VARCHAR(10) NOT NULL,  -- UPVOTE, DOWNVOTE

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(experience_id, user_id),
  CONSTRAINT check_vote_type CHECK (vote_type IN ('UPVOTE', 'DOWNVOTE'))
);

CREATE INDEX idx_votes_experience ON experience_votes(experience_id);
CREATE INDEX idx_votes_user ON experience_votes(user_id);
```

### **Tabla 4: experience_comments**

```sql
CREATE TABLE experience_comments (
  id SERIAL PRIMARY KEY,
  experience_id UUID NOT NULL REFERENCES employee_experiences(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(user_id),  -- NULL si anónimo
  company_id INT NOT NULL REFERENCES companies(id),

  parent_comment_id INT REFERENCES experience_comments(id),  -- Threading

  content TEXT NOT NULL,

  -- Visibilidad del comentario
  visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',

  -- Engagement
  upvotes INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_comment_visibility CHECK (visibility IN ('ANONYMOUS', 'PUBLIC'))
);

CREATE INDEX idx_comments_experience ON experience_comments(experience_id);
CREATE INDEX idx_comments_parent ON experience_comments(parent_comment_id);
CREATE INDEX idx_comments_user ON experience_comments(user_id);
```

### **Tabla 5: experience_recognitions**

```sql
CREATE TABLE experience_recognitions (
  id SERIAL PRIMARY KEY,
  experience_id UUID NOT NULL REFERENCES employee_experiences(id),
  user_id INT NOT NULL REFERENCES users(user_id),
  company_id INT NOT NULL REFERENCES companies(id),

  -- Tipo de reconocimiento
  recognition_type VARCHAR(50) NOT NULL,
  -- QUICK_WIN, IMPACT_SAVER, SAFETY_STAR, INNOVATION_AWARD, TEAM_BOOSTER

  -- Recompensas
  points_awarded INT NOT NULL,
  badge_name VARCHAR(50),
  monetary_reward DECIMAL(10,2),

  -- Metadata
  awarded_by INT NOT NULL REFERENCES users(user_id),
  awarded_date TIMESTAMP DEFAULT NOW(),

  notes TEXT,

  CONSTRAINT check_recognition_type CHECK (
    recognition_type IN ('QUICK_WIN', 'IMPACT_SAVER', 'SAFETY_STAR',
                        'INNOVATION_AWARD', 'TEAM_BOOSTER', 'CLUSTER_CONTRIBUTOR')
  )
);

CREATE INDEX idx_recognitions_experience ON experience_recognitions(experience_id);
CREATE INDEX idx_recognitions_user ON experience_recognitions(user_id);
CREATE INDEX idx_recognitions_company ON experience_recognitions(company_id);
```

### **Tabla 6: experience_topics**

```sql
CREATE TABLE experience_topics (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),

  -- LDA topic info
  topic_id INT NOT NULL,
  topic_name VARCHAR(100),
  keywords TEXT[],

  -- Stats
  document_count INT DEFAULT 0,
  avg_sentiment FLOAT,

  -- Metadata
  model_version VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(company_id, topic_id, model_version)
);

CREATE INDEX idx_topics_company ON experience_topics(company_id);
```

### **Tabla 7: voice_gamification_config**

```sql
CREATE TABLE voice_gamification_config (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),

  -- Configuración de puntos
  points_config JSONB NOT NULL DEFAULT '{
    "SUBMIT_SUGGESTION": 10,
    "UPVOTE_RECEIVED": 5,
    "COMMENT_ON_SUGGESTION": 2,
    "SUGGESTION_IMPLEMENTED": 100,
    "INNOVATION_BADGE": 50,
    "HELP_COWORKER": 15,
    "SHARE_KNOWLEDGE": 20
  }'::jsonb,

  -- Configuración de badges
  badges_config JSONB NOT NULL DEFAULT '{
    "BRONZE": {"min_points": 0, "max_points": 100, "title": "Contributor"},
    "SILVER": {"min_points": 100, "max_points": 500, "title": "Active Innovator"},
    "GOLD": {"min_points": 500, "max_points": 1000, "title": "Innovation Leader"},
    "PLATINUM": {"min_points": 1000, "max_points": null, "title": "Change Agent"}
  }'::jsonb,

  -- Configuración de reconocimientos monetarios
  monetary_rewards_enabled BOOLEAN DEFAULT false,
  recognition_rewards JSONB DEFAULT '{
    "QUICK_WIN": 100,
    "IMPACT_SAVER": 500,
    "SAFETY_STAR": 300,
    "INNOVATION_AWARD": 1000,
    "TEAM_BOOSTER": 200
  }'::jsonb,

  -- Leaderboard settings
  leaderboard_reset_frequency VARCHAR(20) DEFAULT 'MONTHLY',
  show_top_n INT DEFAULT 10,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(company_id)
);
```

### **Tabla 8: voice_user_stats**

```sql
CREATE TABLE voice_user_stats (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(user_id),
  company_id INT NOT NULL REFERENCES companies(id),

  -- Estadísticas
  total_suggestions INT DEFAULT 0,
  total_problems INT DEFAULT 0,
  total_solutions INT DEFAULT 0,

  suggestions_pending INT DEFAULT 0,
  suggestions_in_review INT DEFAULT 0,
  suggestions_approved INT DEFAULT 0,
  suggestions_implemented INT DEFAULT 0,
  suggestions_rejected INT DEFAULT 0,

  -- Clustering
  clustered_with_others INT DEFAULT 0,
  cluster_original_count INT DEFAULT 0,

  -- Engagement
  total_upvotes_given INT DEFAULT 0,
  total_upvotes_received INT DEFAULT 0,
  total_comments_posted INT DEFAULT 0,

  -- Gamificación
  total_points INT DEFAULT 0,
  current_level VARCHAR(20) DEFAULT 'BRONZE',
  badges JSONB DEFAULT '[]'::jsonb,

  -- Impacto
  total_estimated_savings DECIMAL(12,2) DEFAULT 0,
  total_actual_savings DECIMAL(12,2) DEFAULT 0,

  -- Rankings
  global_rank INT,
  department_rank INT,
  monthly_rank INT,

  -- Metadata
  last_contribution_date TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, company_id)
);

CREATE INDEX idx_user_stats_company ON voice_user_stats(company_id);
CREATE INDEX idx_user_stats_points ON voice_user_stats(total_points DESC);
CREATE INDEX idx_user_stats_rank ON voice_user_stats(global_rank);
```

---

## 🔌 API ENDPOINTS

### **Base URL**: `/api/voice-platform`

#### **1. Sugerencias/Experiencias**

```
POST   /experiences                    # Crear sugerencia
GET    /experiences                    # Listar (filtros: status, area, type, etc.)
GET    /experiences/:id                # Ver detalle
PUT    /experiences/:id                # Actualizar
DELETE /experiences/:id                # Eliminar
PATCH  /experiences/:id/status         # Cambiar estado (admin)

GET    /experiences/my                 # Mis sugerencias
GET    /experiences/trending           # Top trending
GET    /experiences/similar/:id        # Sugerencias similares
```

#### **2. Clustering**

```
GET    /clusters                       # Listar clusters
GET    /clusters/:id                   # Ver cluster con miembros
POST   /clusters/:id/merge             # Merge manual de clusters
GET    /clusters/:id/suggestions       # Sugerencias en cluster
```

#### **3. Votación**

```
POST   /experiences/:id/vote           # Upvote/downvote
DELETE /experiences/:id/vote           # Remover voto
GET    /experiences/:id/votes          # Ver votos
```

#### **4. Comentarios**

```
POST   /experiences/:id/comments       # Agregar comentario
GET    /experiences/:id/comments       # Listar comentarios
PUT    /comments/:id                   # Editar comentario
DELETE /comments/:id                   # Eliminar comentario
POST   /comments/:id/upvote            # Upvote comentario
```

#### **5. Reconocimiento**

```
POST   /experiences/:id/recognize      # Otorgar reconocimiento (admin)
GET    /recognitions                   # Listar reconocimientos
GET    /recognitions/my                # Mis reconocimientos
```

#### **6. Analytics**

```
GET    /analytics/overview             # Overview general
GET    /analytics/topics               # LDA topics + stats
GET    /analytics/sentiment            # Sentiment trends
GET    /analytics/implementation-rate  # % implementación
GET    /analytics/savings              # Ahorros totales
GET    /analytics/top-contributors     # Top usuarios
GET    /analytics/hot-topics           # Temas emergentes
```

#### **7. Gamificación**

```
GET    /gamification/leaderboard       # Leaderboard global
GET    /gamification/leaderboard/dept/:dept  # Por departamento
GET    /gamification/my-stats          # Mis stats
GET    /gamification/badges            # Lista de badges
GET    /gamification/config            # Config de empresa (admin)
PUT    /gamification/config            # Actualizar config (admin)
```

#### **8. NLP Processing (interno)**

```
POST   /nlp/process                    # Procesar texto (genera embedding, topics, etc.)
POST   /nlp/find-similar               # Buscar similares en Faiss
POST   /nlp/cluster                    # Ejecutar clustering
GET    /nlp/topics                     # LDA topics actuales
```

---

## 🐍 PYTHON NLP SERVICE - API

### **Base URL**: `http://localhost:5000/api/nlp`

```python
# Endpoints del microservicio Python

POST   /embed                          # Generar S-BERT embedding
{
  "text": "Envolver pallets con film",
  "language": "es"
}
→ { "embedding": [0.123, -0.456, ...], "dimensions": 384 }


POST   /similarity                     # Calcular similarity
{
  "text1": "Envolver pallets con film",
  "text2": "Podríamos usar cinta para pallets"
}
→ { "similarity": 0.87, "is_duplicate": true }


POST   /find-similar                   # Buscar en Faiss
{
  "text": "Envolver pallets con film",
  "company_id": 11,
  "threshold": 0.85,
  "top_k": 5
}
→ {
  "similar": [
    {"id": "uuid-123", "similarity": 0.92, "text": "..."},
    {"id": "uuid-456", "similarity": 0.87, "text": "..."}
  ]
}


POST   /topics                         # LDA topic modeling
{
  "texts": ["texto 1", "texto 2", ...],
  "num_topics": 10,
  "language": "es"
}
→ {
  "topics": [
    {
      "id": 0,
      "keywords": ["pallets", "film", "envolver"],
      "coherence": 0.67
    },
    ...
  ]
}


POST   /sentiment                      # Sentiment analysis
{
  "text": "La ventilación es pésima",
  "language": "es"
}
→ {
  "score": -0.8,
  "label": "NEGATIVE",
  "confidence": 0.92
}


POST   /keywords                       # Extract keywords
{
  "text": "Sugerencia para envolver pallets...",
  "top_n": 5
}
→ {
  "keywords": ["pallets", "film", "envolver", "seguridad", "producción"]
}


POST   /cluster                        # DBSCAN clustering
{
  "embeddings": [[...], [...], ...],
  "eps": 0.3,
  "min_samples": 2
}
→ {
  "labels": [0, 0, 1, -1, 1],  # -1 = outlier
  "n_clusters": 2,
  "outliers": [3]
}


POST   /batch-process                  # Procesar batch completo
{
  "texts": ["texto 1", "texto 2", ...],
  "company_id": 11,
  "operations": ["embed", "topics", "sentiment", "keywords"]
}
→ {
  "results": [
    {
      "text": "texto 1",
      "embedding": [...],
      "topics": [...],
      "sentiment": {...},
      "keywords": [...]
    },
    ...
  ]
}
```

---

## 🔄 FLUJOS DE TRABAJO

### **Flujo 1: Crear Sugerencia**

```
1. Usuario llena formulario
   └─> Frontend: VoiceForm.js
   └─> POST /api/voice-platform/experiences

2. Backend recibe request
   └─> Valida datos
   └─> Guarda en DB (status: PENDING)
   └─> Dispara job de NLP processing

3. NLP Processing (async)
   └─> POST http://localhost:5000/api/nlp/batch-process
   └─> Obtiene: embedding, topics, sentiment, keywords
   └─> Actualiza experience en DB

4. Deduplicación
   └─> VoiceDeduplicationService.findSimilar()
   └─> Busca en Faiss con threshold 0.85
   └─> Si encuentra similar:
       ├─> Agregar a cluster existente
       └─> Notificar autor original: "3 personas sugirieron lo mismo"
   └─> Si NO encuentra:
       └─> Crear nuevo cluster con esta sugerencia como original

5. Notificaciones
   └─> Notificar autor: "Sugerencia recibida"
   └─> Notificar admin: "Nueva sugerencia pendiente de revisión"
```

### **Flujo 2: Implementar Sugerencia (Reconocimiento)**

```
1. Admin aprueba sugerencia
   └─> PATCH /api/voice-platform/experiences/:id/status
   └─> { status: "APPROVED" }

2. Admin marca como implementada
   └─> PATCH /api/voice-platform/experiences/:id/status
   └─> {
       status: "IMPLEMENTED",
       actual_savings: 15000,
       actual_time_saved: "2 hours/day"
     }

3. Sistema auto-reconoce
   └─> VoiceGamificationService.awardImplementationRecognition()
   └─> Otorga puntos:
       • Autor original: 100 pts + badge "INNOVATOR"
       • Cluster members: 50 pts c/u
   └─> Si configurado, reward monetario: $500

4. Actualiza stats
   └─> voice_user_stats: total_points, suggestions_implemented
   └─> Recalcula rankings (global, dept, monthly)

5. Notificaciones
   └─> Notificar autor: "¡Tu sugerencia fue implementada! +100 pts"
   └─> Notificar cluster members: "Sugerencia relacionada implementada +50 pts"
   └─> Broadcast empresa: "Nueva implementación de [Usuario]"
```

### **Flujo 3: Clustering Automático (Background Job)**

```
# Ejecutar diariamente (cron job)

1. Obtener todas las sugerencias sin cluster
   └─> WHERE cluster_id IS NULL AND embedding IS NOT NULL

2. Generar matriz de embeddings
   └─> embeddings = experiences.map(e => e.embedding)

3. Ejecutar DBSCAN
   └─> POST http://localhost:5000/api/nlp/cluster
   └─> { embeddings, eps: 0.3, min_samples: 2 }

4. Crear/actualizar clusters
   └─> Para cada cluster detectado:
       ├─> Calcular centroid (avg de embeddings)
       ├─> Detectar dominant topics (LDA en textos del cluster)
       ├─> Nombrar cluster (ej: "Mejora Palletizado")
       └─> Asignar miembros

5. Notificar participantes
   └─> "Tu sugerencia fue agrupada con 3 similares"
   └─> Mostrar cluster en dashboard
```

---

## 🎮 SISTEMA DE GAMIFICACIÓN

### **Puntos Base**

```javascript
const POINTS_CONFIG = {
  // Contribución
  SUBMIT_SUGGESTION: 10,
  SUBMIT_PROBLEM: 8,
  SUBMIT_SOLUTION: 12,

  // Engagement
  UPVOTE_RECEIVED: 5,
  COMMENT_ON_SUGGESTION: 2,
  HELPFUL_COMMENT: 5,

  // Implementación
  SUGGESTION_APPROVED: 25,
  SUGGESTION_IN_PILOT: 50,
  SUGGESTION_IMPLEMENTED: 100,

  // Clustering
  CLUSTER_ORIGINAL: 15,
  CLUSTER_CONTRIBUTOR: 10,

  // Especiales
  FIRST_SUGGESTION: 20,
  MONTHLY_CONTRIBUTOR: 30,
  HELP_COWORKER: 15
};
```

### **Badges/Niveles**

```javascript
const LEVELS = {
  BRONZE: {
    min: 0,
    max: 100,
    title: "Contributor",
    perks: ["Puede comentar", "Puede votar"]
  },
  SILVER: {
    min: 100,
    max: 500,
    title: "Active Innovator",
    perks: ["Destacado en leaderboard", "Notificaciones prioritarias"]
  },
  GOLD: {
    min: 500,
    max: 1000,
    title: "Innovation Leader",
    perks: ["Badge dorado", "Mención en newsletter"]
  },
  PLATINUM: {
    min: 1000,
    max: null,
    title: "Change Agent",
    perks: ["Reconocimiento público", "Invitación a comité de innovación"]
  }
};

const SPECIAL_BADGES = {
  FIRST_BLOOD: "Primera sugerencia",
  QUICK_WIN: "Implementación en < 1 mes",
  IMPACT_SAVER: "Ahorro > $10k/año",
  SAFETY_STAR: "Mejora de seguridad",
  INNOVATOR: "Idea disruptiva",
  TEAM_BOOSTER: "Mejora clima laboral",
  SERIAL_CONTRIBUTOR: "10+ sugerencias",
  IMPLEMENTATION_MASTER: "5+ implementadas"
};
```

### **Leaderboards**

```javascript
// Global
SELECT u.name, vs.total_points, vs.suggestions_implemented, vs.global_rank
FROM voice_user_stats vs
JOIN users u ON vs.user_id = u.user_id
WHERE vs.company_id = ?
ORDER BY vs.total_points DESC
LIMIT 10;

// Por departamento
SELECT u.name, vs.total_points, vs.department_rank
FROM voice_user_stats vs
JOIN users u ON vs.user_id = u.user_id
WHERE vs.company_id = ? AND u.department_id = ?
ORDER BY vs.total_points DESC
LIMIT 10;

// Mensual (resetea cada mes)
SELECT u.name, COUNT(*) as monthly_contributions,
       SUM(CASE WHEN e.status = 'IMPLEMENTED' THEN 1 ELSE 0 END) as implemented
FROM employee_experiences e
JOIN users u ON e.employee_id = u.user_id
WHERE e.company_id = ?
  AND e.created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY u.name
ORDER BY monthly_contributions DESC
LIMIT 10;
```

---

## 📊 ANALYTICS QUERIES

### **Overview Dashboard**

```sql
-- Métricas principales
SELECT
  COUNT(*) as total_experiences,
  COUNT(DISTINCT employee_id) as unique_contributors,
  COUNT(*) FILTER (WHERE status = 'IMPLEMENTED') as implemented_count,
  ROUND(COUNT(*) FILTER (WHERE status = 'IMPLEMENTED')::numeric / COUNT(*) * 100, 2) as implementation_rate,
  SUM(actual_savings) FILTER (WHERE actual_savings IS NOT NULL) as total_savings,
  AVG(sentiment_score) as avg_sentiment
FROM employee_experiences
WHERE company_id = ?;
```

### **Topic Trends**

```sql
-- Top 10 topics más mencionados
SELECT
  topic_name,
  document_count,
  avg_sentiment,
  keywords
FROM experience_topics
WHERE company_id = ?
ORDER BY document_count DESC
LIMIT 10;
```

### **Implementation Rate by Area**

```sql
SELECT
  area,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'IMPLEMENTED') as implemented,
  ROUND(COUNT(*) FILTER (WHERE status = 'IMPLEMENTED')::numeric / COUNT(*) * 100, 2) as rate
FROM employee_experiences
WHERE company_id = ?
GROUP BY area
ORDER BY rate DESC;
```

### **Sentiment Over Time**

```sql
SELECT
  DATE_TRUNC('month', created_at) as month,
  AVG(sentiment_score) as avg_sentiment,
  COUNT(*) as count
FROM employee_experiences
WHERE company_id = ?
  AND created_at >= NOW() - INTERVAL '1 year'
GROUP BY month
ORDER BY month;
```

---

## 🔐 SEGURIDAD & PRIVACIDAD

### **Anonimato**

```javascript
// Lógica de visibilidad
function getVisibleAuthor(experience, currentUser) {
  if (experience.visibility === 'PUBLIC') {
    return experience.employee;  // Todos ven
  }

  if (experience.visibility === 'ADMIN_ONLY') {
    if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
      return experience.employee;  // Solo admin ve
    }
    return null;  // Otros no ven
  }

  if (experience.visibility === 'ANONYMOUS') {
    return null;  // Nadie ve (ni admin)
  }
}
```

### **Permisos por Rol**

```javascript
const PERMISSIONS = {
  employee: {
    create: true,
    read: true,
    update: 'own',      // Solo sus propias sugerencias
    delete: 'own',
    vote: true,
    comment: true,
    changeStatus: false
  },

  manager: {
    create: true,
    read: 'department',  // Solo su departamento
    update: 'department',
    delete: false,
    vote: true,
    comment: true,
    changeStatus: ['PENDING', 'IN_REVIEW']  // Aprobar solo hasta IN_REVIEW
  },

  admin: {
    create: true,
    read: true,         // Todas las sugerencias
    update: true,
    delete: true,
    vote: true,
    comment: true,
    changeStatus: true,  // Puede cambiar a cualquier estado
    seeAnonymous: 'ADMIN_ONLY'  // Ve ADMIN_ONLY, no ANONYMOUS
  }
};
```

---

## 🚀 DEPLOYMENT

### **Desarrollo Local**

```bash
# 1. Instalar dependencias Python
cd backend/nlp-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Descargar modelos
python -m spacy download es_core_news_sm
python download_models.py  # Descarga S-BERT y sentiment

# 2. Iniciar NLP service
python app.py
# Escucha en http://localhost:5000

# 3. Instalar pgvector en PostgreSQL
# Ver: https://github.com/pgvector/pgvector
psql -U postgres -d attendance_system
CREATE EXTENSION vector;

# 4. Ejecutar migraciones
cd backend
node scripts/run-voice-platform-migration.js

# 5. Iniciar backend Node.js
PORT=9998 npm start

# 6. Acceder a
http://localhost:9998/panel-empresa.html → Employee Voice Platform
```

### **Producción (Render)**

```yaml
# render.yaml (configuración)

services:
  # Backend Node.js (ya existe)
  - type: web
    name: aponnt-backend
    env: node
    buildCommand: npm install
    startCommand: npm start

  # Nuevo: Python NLP Service
  - type: web
    name: aponnt-nlp-service
    env: python
    buildCommand: pip install -r requirements.txt && python download_models.py
    startCommand: gunicorn app:app
    envVars:
      - key: FLASK_ENV
        value: production
      - key: MODEL_CACHE_DIR
        value: /opt/render/project/.models

# Configurar variable de entorno en backend Node.js
NLP_SERVICE_URL=https://aponnt-nlp-service.onrender.com
```

---

## 📦 DEPENDENCIAS

### **Python (nlp-service/requirements.txt)**

```txt
Flask==3.0.0
flask-cors==4.0.0
sentence-transformers==2.2.2
scikit-learn==1.3.2
numpy==1.24.3
faiss-cpu==1.7.4
gensim==4.3.2
spacy==3.7.2
transformers==4.35.2
torch==2.1.0
```

### **Node.js (package.json - agregar)**

```json
{
  "dependencies": {
    "axios": "^1.6.2",
    "bull": "^4.12.0",
    "node-cron": "^3.0.3"
  }
}
```

---

## 🔧 CONFIGURACIÓN

### **Backend (.env - agregar)**

```bash
# Python NLP Service
NLP_SERVICE_URL=http://localhost:5000
NLP_SERVICE_TIMEOUT=30000

# Faiss Configuration
FAISS_INDEX_PATH=/var/data/faiss_indices
FAISS_REBUILD_INTERVAL=86400  # 24 hours

# Clustering
CLUSTERING_ENABLED=true
CLUSTERING_CRON=0 2 * * *  # Daily at 2 AM
CLUSTERING_THRESHOLD=0.85
CLUSTERING_MIN_SAMPLES=2

# Gamification
GAMIFICATION_ENABLED=true
LEADERBOARD_CACHE_TTL=300  # 5 minutes
```

---

Esta es la arquitectura completa del sistema. ¿Continúo con la implementación del código?
