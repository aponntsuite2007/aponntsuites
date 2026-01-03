# Integración de A MI ME PASO con Voice Platform

## Cambios Necesarios en `voice-platform.js`

### 1. Agregar botón en `renderDashboard()` (línea ~898)

**BUSCAR:**
```javascript
          <div>
            <button class="btn btn-primary" id="btnCreateExperience">
              <i class="bi bi-plus-circle"></i> Nueva Experiencia
            </button>
```

**REEMPLAZAR CON:**
```javascript
          <div>
            <button class="btn btn-warning" id="btnAMiMePaso" style="background: linear-gradient(135deg, #FF6B6B 0%, #FFA500 100%); border: none; color: white; font-weight: bold;">
              <i class="bi bi-search"></i> 🎯 A MI ME PASO
            </button>
            <button class="btn btn-primary" id="btnCreateExperience">
              <i class="bi bi-plus-circle"></i> Nueva Experiencia
            </button>
```

### 2. Agregar event listener en `attachEventListeners()` (línea ~1011)

**BUSCAR:**
```javascript
  attachEventListeners() {
    // Botones del header
    document.getElementById('btnCreateExperience')?.addEventListener('click', () => this.showCreateModal());
```

**REEMPLAZAR CON:**
```javascript
  attachEventListeners() {
    // Botones del header
    document.getElementById('btnAMiMePaso')?.addEventListener('click', () => {
      if (window.AMiMePaso) {
        window.AMiMePaso.showSearchModal();
      } else {
        console.error('[VOICE-PLATFORM] AMiMePaso no está cargado');
      }
    });
    document.getElementById('btnCreateExperience')?.addEventListener('click', () => this.showCreateModal());
```

## Comando para aplicar cambios automáticamente

```bash
cd /c/Bio/sistema_asistencia_biometrico/backend/public/js/modules

# 1. Agregar botón
sed -i '/<button class="btn btn-primary" id="btnCreateExperience">/i\            <button class="btn btn-warning" id="btnAMiMePaso" style="background: linear-gradient(135deg, #FF6B6B 0%, #FFA500 100%); border: none; color: white; font-weight: bold;">\n              <i class="bi bi-search"></i> 🎯 A MI ME PASO\n            </button>' voice-platform.js

# 2. Agregar event listener
sed -i "/document.getElementById('btnCreateExperience')/i\    document.getElementById('btnAMiMePaso')?.addEventListener('click', () => {\n      if (window.AMiMePaso) {\n        window.AMiMePaso.showSearchModal();\n      } else {\n        console.error('[VOICE-PLATFORM] AMiMePaso no está cargado');\n      }\n    });" voice-platform.js
```

## Archivos Modificados

✅ `backend/public/js/modules/a-mi-me-paso-search.js` - NUEVO (creado)
✅ `backend/public/panel-empresa.html` - Script incluido (línea ~7899)
⏳ `backend/public/js/modules/voice-platform.js` - Pendiente aplicar cambios arriba

## Testing

Una vez aplicados los cambios:

1. Abrir http://localhost:9998/panel-empresa.html
2. Login con credenciales de ISI (company_id: 11)
3. Ir a módulo "Voice Platform"
4. Verificar botón naranja "🎯 A MI ME PASO" en header
5. Click en botón → debe abrir modal de búsqueda
6. Buscar "entrega de turno" → debe mostrar resultados categorizados
7. Dar feedback con thumbs up/down

## Estado Actual

- ✅ Backend API funcionando (endpoints testeados)
- ✅ Frontend: Módulo `a-mi-me-paso-search.js` creado
- ✅ Frontend: Script incluido en panel-empresa.html
- ⏳ Frontend: Integración con voice-platform.js (aplicar comandos arriba)
- ⏳ Testing: Verificar UI completa

## Próximos Pasos (Fase 2)

Según `VOICE-PLATFORM-V2-A-MI-ME-PASO-PROGRESS.md`:

- [ ] Wizard de creación inteligente (4 pasos)
- [ ] Integración con Manual de Procedimientos
- [ ] IA de similitud en tiempo real
- [ ] Auto-resolución inteligente
- [ ] Sistema de referencias cruzadas
