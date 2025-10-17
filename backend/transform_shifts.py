#!/usr/bin/env python3
"""
Script para transformar shifts.js agregando translation keys
"""

import re
import sys

def transform_shifts_js(input_file, output_file):
    """Transform shifts.js to use i18n translation keys"""

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # ========== PASO 1: HTML data-translate attributes ==========

    # Título principal
    content = re.sub(
        r'<h2>🕐 Sistema Avanzado de Turnos Flexibles</h2>',
        r'<h2 data-translate="shifts.title">🕐 Sistema Avanzado de Turnos Flexibles</h2>',
        content
    )

    # Botones principales
    button_replacements = {
        r'onclick="showAdvancedShiftCreator\(\)">➕ Crear Turno Avanzado':
            r'onclick="showAdvancedShiftCreator()" data-translate="shifts.buttons.create_advanced">➕ Crear Turno Avanzado',
        r'onclick="loadAdvancedShifts\(\)">📋 Lista de Turnos':
            r'onclick="loadAdvancedShifts()" data-translate="shifts.buttons.list">📋 Lista de Turnos',
        r'onclick="showShiftCalendar\(\)">📅 Calendario Visual':
            r'onclick="showShiftCalendar()" data-translate="shifts.buttons.calendar">📅 Calendario Visual',
        r'onclick="showHourlyConfiguration\(\)">💰 Config\. Horas':
            r'onclick="showHourlyConfiguration()" data-translate="shifts.buttons.config_hours">💰 Config. Horas',
        r'onclick="showFlashShiftCreator\(\)">⚡ Turno Flash':
            r'onclick="showFlashShiftCreator()" data-translate="shifts.buttons.flash_shift">⚡ Turno Flash',
    }

    for pattern, replacement in button_replacements.items():
        content = re.sub(pattern, replacement, content)

    # Tabs
    tab_replacements = {
        r'onclick="showShiftTab\(\'list\'\)">📋 Lista':
            r'onclick="showShiftTab(\'list\')" data-translate="shifts.tabs.list">📋 Lista',
        r'onclick="showShiftTab\(\'calendar\'\)">📅 Calendario':
            r'onclick="showShiftTab(\'calendar\')" data-translate="shifts.tabs.calendar">📅 Calendario',
        r'onclick="showShiftTab\(\'config\'\)">⚙️ Configuración':
            r'onclick="showShiftTab(\'config\')" data-translate="shifts.tabs.config">⚙️ Configuración',
    }

    for pattern, replacement in tab_replacements.items():
        content = re.sub(pattern, replacement, content)

    # Stats labels
    stat_replacements = {
        r'<div class="stat-label">Total Turnos</div>':
            r'<div class="stat-label" data-translate="shifts.stats.total_shifts">Total Turnos</div>',
        r'<div class="stat-label">Turnos Activos</div>':
            r'<div class="stat-label" data-translate="shifts.stats.active_shifts">Turnos Activos</div>',
        r'<div class="stat-label">Empleados Asignados</div>':
            r'<div class="stat-label" data-translate="shifts.stats.assigned_employees">Empleados Asignados</div>',
        r'<div class="stat-label">Turnos Flash</div>':
            r'<div class="stat-label" data-translate="shifts.stats.flash_shifts">Turnos Flash</div>',
    }

    for pattern, replacement in stat_replacements.items():
        content = re.sub(pattern, replacement, content)

    # Textos en lista
    content = re.sub(
        r'Presiona "Lista de Turnos" para cargar los turnos configurados\.\.\.',
        r'<span data-translate="shifts.list.load_prompt">Presiona "Lista de Turnos" para cargar los turnos configurados...</span>',
        content
    )

    # Table headers
    table_headers = {
        r'<th>🕐 Turno</th>': r'<th data-translate="shifts.table.shift">🕐 Turno</th>',
        r'<th>📊 Tipo</th>': r'<th data-translate="shifts.table.type">📊 Tipo</th>',
        r'<th>⏰ Horario</th>': r'<th data-translate="shifts.table.schedule">⏰ Horario</th>',
        r'<th>📅 Patrón/Días</th>': r'<th data-translate="shifts.table.pattern_days">📅 Patrón/Días</th>',
        r'<th>👥 Empleados</th>': r'<th data-translate="shifts.table.employees">👥 Empleados</th>',
        r'<th>💰 Tarifas</th>': r'<th data-translate="shifts.table.rates">💰 Tarifas</th>',
        r'<th>📍 Estado</th>': r'<th data-translate="shifts.table.status">📍 Estado</th>',
        r'<th>⚙️ Acciones</th>': r'<th data-translate="shifts.table.actions">⚙️ Acciones</th>',
    }

    for pattern, replacement in table_headers.items():
        content = re.sub(pattern, replacement, content)

    # ========== PASO 2: Convertir showShiftMessage a async/await ==========

    # Reemplazar todos los llamados a showShiftMessage
    message_patterns = [
        (r"showShiftMessage\(`✅ \$\{shifts\.length\} turnos cargados exitosamente`, 'success'\)",
         r"showShiftMessage(await window.t('shifts.messages.loaded_count', { count: shifts.length }), 'success')"),

        (r"showShiftMessage\('❌ Error: Modal no encontrado', 'error'\)",
         r"showShiftMessage(await window.t('shifts.messages.error_modal_not_found'), 'error')"),

        (r"showShiftMessage\('⚠️ El nombre del turno es obligatorio', 'warning'\)",
         r"showShiftMessage(await window.t('shifts.validation.name_required'), 'warning')"),

        (r"showShiftMessage\('⚠️ La hora de inicio es obligatoria \(formato 24hs\)', 'warning'\)",
         r"showShiftMessage(await window.t('shifts.validation.start_time_required'), 'warning')"),

        (r"showShiftMessage\('⚠️ La hora de fin es obligatoria \(formato 24hs\)', 'warning'\)",
         r"showShiftMessage(await window.t('shifts.validation.end_time_required'), 'warning')"),

        (r"showShiftMessage\('⚠️ Complete patrón y fecha de inicio para turno rotativo', 'warning'\)",
         r"showShiftMessage(await window.t('shifts.validation.rotative_pattern_required'), 'warning')"),

        (r"showShiftMessage\('⚠️ Complete fechas de inicio y fin para turno flash', 'warning'\)",
         r"showShiftMessage(await window.t('shifts.validation.flash_dates_required'), 'warning')"),

        (r"showShiftMessage\('⚠️ No hay token de autenticación', 'error'\)",
         r"showShiftMessage(await window.t('shifts.messages.no_auth_token'), 'error')"),

        (r"showShiftMessage\('❌ Error: Sistema no inicializado correctamente', 'error'\)",
         r"showShiftMessage(await window.t('shifts.messages.error_system_not_initialized'), 'error')"),

        (r"showShiftMessage\(`✅ Turno \"\$\{name\}\" creado exitosamente`, 'success'\)",
         r"showShiftMessage(await window.t('shifts.messages.success_created'), 'success')"),

        (r"showShiftMessage\('❌ Turno no encontrado', 'error'\)",
         r"showShiftMessage(await window.t('shifts.messages.error_not_found'), 'error')"),

        (r"showShiftMessage\('❌ Los campos obligatorios deben estar completos', 'warning'\)",
         r"showShiftMessage(await window.t('shifts.validation.required_fields'), 'warning')"),

        (r"showShiftMessage\(`✅ Turno \"\$\{name\}\" actualizado exitosamente`, 'success'\)",
         r"showShiftMessage(await window.t('shifts.messages.success_updated'), 'success')"),

        (r"showShiftMessage\('❌ Los turnos de ejemplo no pueden ser eliminados', 'error'\)",
         r"showShiftMessage(await window.t('shifts.messages.example_cannot_delete'), 'error')"),

        (r"showShiftMessage\(`🗑️ Turno \"\$\{shiftName\}\" eliminado exitosamente`, 'success'\)",
         r"showShiftMessage(await window.t('shifts.messages.success_deleted'), 'success')"),
    ]

    for pattern, replacement in message_patterns:
        content = re.sub(pattern, replacement, content)

    # ========== PASO 3: Convertir funciones a async ==========

    # Cambiar function a async function para las funciones que usan await
    functions_to_async = [
        'displayAdvancedShiftsTable',
        'updateShiftStats',
        'saveAdvancedShift',
        'updateAdvancedShift',
        'deleteAdvancedShift',
        'editAdvancedShift',
        'viewAdvancedShift',
    ]

    for func_name in functions_to_async:
        content = re.sub(
            rf'\bfunction {func_name}\(',
            rf'async function {func_name}(',
            content
        )

    # ========== PASO 4: Agregar data-translate a modales ==========

    # Modal de creación - título
    content = re.sub(
        r'<h3>➕ Crear Turno Avanzado</h3>',
        r'<h3 data-translate="shifts.form.modal_title_create">➕ Crear Turno Avanzado</h3>',
        content
    )

    # Tipos de turno
    type_labels = {
        r'<span style="margin-left: 8px;">📅 Estándar</span>':
            r'<span style="margin-left: 8px;" data-translate="shifts.types.standard">📅 Estándar</span>',
        r'<span style="margin-left: 8px;">🔄 Rotativo</span>':
            r'<span style="margin-left: 8px;" data-translate="shifts.types.rotative">🔄 Rotativo</span>',
        r'<span style="margin-left: 8px;">📌 Permanente</span>':
            r'<span style="margin-left: 8px;" data-translate="shifts.types.permanent">📌 Permanente</span>',
        r'<span style="margin-left: 8px;">⚡ Flash</span>':
            r'<span style="margin-left: 8px;" data-translate="shifts.types.flash">⚡ Flash</span>',
    }

    for pattern, replacement in type_labels.items():
        content = re.sub(pattern, replacement, content)

    # Botones
    content = re.sub(
        r'onclick="saveAdvancedShift\(\)".+?>💾 Crear Turno</button>',
        r'onclick="saveAdvancedShift()" data-translate="shifts.buttons.save_shift">💾 Crear Turno</button>',
        content
    )

    content = re.sub(
        r'onclick="closeAdvancedShiftModal\(\)">❌ Cancelar</button>',
        r'onclick="closeAdvancedShiftModal()" data-translate="shifts.buttons.cancel">❌ Cancelar</button>',
        content
    )

    print("✅ Transformación completada")
    print(f"📝 Total de líneas: {len(content.splitlines())}")

    # Guardar archivo transformado
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"💾 Archivo guardado: {output_file}")

if __name__ == "__main__":
    input_file = r"C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\shifts.js"
    output_file = r"C:\Bio\sistema_asistencia_biometrico\backend\public\js\modules\shifts.js.new"

    try:
        transform_shifts_js(input_file, output_file)
        print("\n✅ TRANSFORMACIÓN EXITOSA")
        print(f"📂 Archivo original: {input_file}")
        print(f"📂 Archivo nuevo: {output_file}")
        print("\n⚠️ PRÓXIMOS PASOS:")
        print("1. Revisar el archivo .new")
        print("2. Si está correcto, renombrar shifts.js a shifts.js.bak")
        print("3. Renombrar shifts.js.new a shifts.js")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        sys.exit(1)
