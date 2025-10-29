# 🔑 GUÍA: CONTRATAR CLAUDE API PARA INTEGRACIÓN

**Versión:** 1.0
**Fecha:** Enero 2025
**Requisito previo:** Tener cuenta de Anthropic (claude.ai)

---

## 📋 DIFERENCIA: CLAUDE PRO vs CLAUDE API

| Característica | Claude Pro ($20/mes) | Claude API (Pay-as-you-go) |
|----------------|----------------------|----------------------------|
| **Acceso a claude.ai** | ✅ Sí | ❌ No (solo API) |
| **Claude Code** | ✅ Sí | ❌ No |
| **Uso interactivo** | ✅ Ilimitado | ❌ No aplica |
| **Integración programática** | ❌ No | ✅ Sí |
| **API Keys** | ❌ No incluidas | ✅ Sí |
| **Facturación** | Fija $20/mes | Por uso (tokens) |
| **Para qué sirve** | Uso personal | Apps/bots/automación |

**IMPORTANTE**: Son productos diferentes. Claude Pro NO incluye API keys.

---

## 🚀 PASO A PASO: CONTRATAR CLAUDE API

### PASO 1: Ir a Anthropic Console

1. Abrir navegador
2. Ir a: **https://console.anthropic.com/**
3. Click en "Sign In" (arriba derecha)

### PASO 2: Iniciar sesión

**Opciones**:
- Si tienes cuenta Claude Pro: Usar mismo email
- Si no: Crear cuenta nueva

**Datos a ingresar**:
- Email (el mismo de Claude Pro si tienes)
- Contraseña
- Verificar email

### PASO 3: Configurar método de pago

**⚠️ IMPORTANTE**: Claude API requiere tarjeta de crédito/débito

1. En la consola, ir a "Billing" o "Settings"
2. Click "Add payment method"
3. Ingresar datos de tarjeta:
   - Número de tarjeta
   - Fecha vencimiento
   - CVV
   - Dirección de facturación

**Tarjetas aceptadas**:
- ✅ Visa
- ✅ Mastercard
- ✅ American Express
- ✅ Tarjetas internacionales

**NO se acepta**:
- ❌ PayPal
- ❌ Criptomonedas
- ❌ Transferencias bancarias

### PASO 4: Agregar créditos iniciales (opcional)

**Opción A: Plan de créditos prepagos**
- Mínimo: $5 USD
- Recomendado para empezar: $10-20 USD
- Los créditos NO vencen

**Opción B: Facturación mensual**
- Sin mínimo inicial
- Se cobra a fin de mes según uso
- Mejor si usas regularmente

**Recomendación**: Empezar con $10 prepagos para probar.

### PASO 5: Crear API Key

1. En la consola, ir a "API Keys"
2. Click "Create Key"
3. Asignar nombre: `sistema-auditor-biometrico`
4. Click "Create"
5. **⚠️ COPIAR LA KEY INMEDIATAMENTE**
   - Se muestra UNA SOLA VEZ
   - Formato: `sk-ant-api03-...` (muy larga)
   - Guardar en lugar seguro (como .env)

**Ejemplo de API Key**:
```
sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### PASO 6: Configurar límites (recomendado)

Para evitar sorpresas en la factura:

1. En "Settings" → "Usage limits"
2. Configurar:
   - **Monthly spend limit**: $50 USD (o menos)
   - **Daily spend limit**: $10 USD
   - **Email alerts**: Activar al 50%, 75%, 90%

**Esto protege de**:
- Bugs que generen requests infinitos
- Uso excesivo accidental
- Facturas inesperadas

### PASO 7: Probar la API Key

En tu terminal:

```bash
# Instalar curl o usar el que tienes
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: sk-ant-api03-TU_KEY_AQUI" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 100,
    "messages": [{
      "role": "user",
      "content": "Hola, esto es una prueba"
    }]
  }'
```

**Respuesta esperada**:
```json
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [{
    "type": "text",
    "text": "¡Hola! La prueba fue exitosa. ¿En qué puedo ayudarte?"
  }],
  "model": "claude-3-5-sonnet-20241022",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 10,
    "output_tokens": 15
  }
}
```

Si ves esto: ✅ **API Key funciona correctamente**

---

## 💰 COSTOS DETALLADOS

### PRICING CLAUDE API (Enero 2025)

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|----------------------|------------------------|
| **Claude 3.5 Sonnet** | $3 USD | $15 USD |
| Claude 3 Opus | $15 USD | $75 USD |
| Claude 3 Haiku | $0.25 USD | $1.25 USD |

**Recomendado para auditor**: Claude 3.5 Sonnet

### 📊 ESTIMACIÓN DE COSTOS

**Escenario**: Sistema auditor haciendo diagnósticos

**Supuestos**:
- 30 errores por auditoría
- Cada error = 1 diagnóstico
- 1 diagnóstico = ~500 input tokens + ~200 output tokens
- 1 auditoría por día

**Cálculo mensual** (30 auditorías/mes):

```
Input tokens:
30 auditorías × 30 errores × 500 tokens = 450,000 tokens/mes
450,000 / 1,000,000 × $3 = $1.35 USD

Output tokens:
30 auditorías × 30 errores × 200 tokens = 180,000 tokens/mes
180,000 / 1,000,000 × $15 = $2.70 USD

Total mensual = $1.35 + $2.70 = $4.05 USD/mes
```

**Costo estimado real**: **$4-8 USD/mes** (con margen de seguridad)

### 💡 COMPARACIÓN CON ALTERNATIVAS

| Solución | Costo mensual | Calidad |
|----------|--------------|---------|
| **Ollama Local** | $0 (ya lo tienes) | 70-80% |
| **Claude API** | $4-8 | 95-98% ⭐ |
| **OpenAI GPT-4** | $10-20 | 90-95% |
| **OpenAI GPT-4o-mini** | $2-5 | 85-90% |

**Recomendación**: Claude API ofrece mejor relación calidad/precio.

---

## 🔒 SEGURIDAD: GUARDAR API KEY

### ❌ NUNCA HACER

```javascript
// ❌ MAL: Hard-coded en el código
const apiKey = 'sk-ant-api03-xxxxx';

// ❌ MAL: Commit en Git
// .env commiteado al repositorio
```

### ✅ FORMA CORRECTA

**1. Guardar en .env**

```bash
# backend/.env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

**2. Agregar .env a .gitignore**

```bash
# .gitignore
.env
.env.local
.env.production
```

**3. Crear .env.example (sin keys reales)**

```bash
# backend/.env.example
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

**4. Usar en el código**

```javascript
// src/auditor/core/ClaudeAnalyzer.js
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

---

## 🎯 CHECKLIST DE CONFIGURACIÓN

- [ ] Ir a https://console.anthropic.com/
- [ ] Iniciar sesión (con email de Claude Pro si tienes)
- [ ] Agregar método de pago (tarjeta)
- [ ] Agregar $10-20 USD de créditos (opcional)
- [ ] Crear API Key con nombre descriptivo
- [ ] Copiar y guardar API Key en lugar seguro
- [ ] Configurar límites de gasto ($50/mes máximo)
- [ ] Activar alertas de uso (50%, 75%, 90%)
- [ ] Probar API Key con curl
- [ ] Agregar key a .env
- [ ] Verificar que .env está en .gitignore
- [ ] Instalar SDK: `npm install @anthropic-ai/sdk`

---

## 📞 SOPORTE

**Si tienes problemas**:

1. **Documentación oficial**: https://docs.anthropic.com/
2. **Consola**: https://console.anthropic.com/
3. **Support**: support@anthropic.com
4. **Comunidad**: https://discord.gg/anthropic

**Preguntas frecuentes**:

**Q: ¿Puedo usar mi cuenta Claude Pro?**
A: Sí, mismo email, pero debes agregar método de pago para API.

**Q: ¿Se me cobrará $20/mes adicional?**
A: No. Claude Pro ($20/mes) y Claude API (pay-as-you-go) son independientes.

**Q: ¿Cuánto gastaré realmente?**
A: Para este proyecto: $4-8/mes estimado.

**Q: ¿Puedo cancelar cuando quiera?**
A: Sí, solo dejas de usar la API. Solo pagas lo que usaste.

**Q: ¿Los créditos prepagos vencen?**
A: No, nunca vencen.

---

## 🚀 PRÓXIMO PASO

Una vez tengas la API Key:

1. Guardar en `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
   ```

2. Instalar SDK:
   ```bash
   npm install @anthropic-ai/sdk
   ```

3. Decirme para implementar la integración (1-2 horas)

**¿Listo para empezar?** 🎉
