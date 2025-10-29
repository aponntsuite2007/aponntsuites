#!/usr/bin/env python3
"""Fix de sintaxis definitivo para EmployeeProfileCollector.js"""

import re

file_path = 'src/auditor/collectors/EmployeeProfileCollector.js'

print('🔧 Aplicando fix definitivo de sintaxis...\n')

# Leer archivo
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Definir reemplazos (búsqueda literal -> reemplazo)
replacements = [
    # Línea 228
    (
        'await this.page.click(\'a[onclick*="showSection(\\\\'users\\\\')"]' + '\');',
        'await this.page.click("a[onclick*=\\"showSection\\"]");'
    ),
    # Línea 286
    (
        'await this.page.click(\'button[onclick*="showUserTab(\\\\'work-history\\\\')"' + '\');',
        'await this.page.click("button[onclick*=\\"showUserTab\\"][onclick*=\\"work-history\\"]");'
    ),
    # Línea 354
    (
        'await this.page.click(\'button[onclick*="showUserTab(\\\\'family\\\\')"]' + '\');',
        'await this.page.click("button[onclick*=\\"showUserTab\\"][onclick*=\\"family\\"]");'
    ),
    # Línea 394
    (
        'await this.page.click(\'button[onclick*="showUserTab(\\\\'education\\\\')"]' + '\');',
        'await this.page.click("button[onclick*=\\"showUserTab\\"][onclick*=\\"education\\"]");'
    ),
    # Línea 434
    (
        'await this.page.click(\'button[onclick*="showUserTab(\\\\'health\\\\')"]' + '\');',
        'await this.page.click("button[onclick*=\\"showUserTab\\"][onclick*=\\"health\\"]");'
    ),
    # Línea 437
    (
        'await this.page.click(\'button[onclick*="showHealthSubTab(\\\\'chronic\\\\')"]' + '\');',
        'await this.page.click("button[onclick*=\\"showHealthSubTab\\"][onclick*=\\"chronic\\"]");'
    ),
    # Línea 476
    (
        'await this.page.click(\'button[onclick*="showHealthSubTab(\\\\'medications\\\\')"]' + '\');',
        'await this.page.click("button[onclick*=\\"showHealthSubTab\\"][onclick*=\\"medications\\"]");'
    ),
    # Línea 514
    (
        'await this.page.click(\'button[onclick*="showHealthSubTab(\\\\'allergies\\\\')"]' + '\');',
        'await this.page.click("button[onclick*=\\"showHealthSubTab\\"][onclick*=\\"allergies\\"]");'
    ),
    # Línea 552
    (
        'await this.page.click(\'button[onclick*="showUserTab(\\\\'restrictions\\\\')"]' + '\');',
        'await this.page.click("button[onclick*=\\"showUserTab\\"][onclick*=\\"restrictions\\"]");'
    ),
    # Línea 555
    (
        'await this.page.click(\'button[onclick*="showRestrictionsSubTab(\\\\'activity\\\\')"]' + '\');',
        'await this.page.click("button[onclick*=\\"showRestrictionsSubTab\\"][onclick*=\\"activity\\"]");'
    ),
    # Línea 593
    (
        'await this.page.click(\'button[onclick*="showRestrictionsSubTab(\\\\'work\\\\')"]' + '\');',
        'await this.page.click("button[onclick*=\\"showRestrictionsSubTab\\"][onclick*=\\"work\\"]");'
    ),
    # Línea 630
    (
        'await this.page.click(\'button[onclick*="showHealthSubTab(\\\\'vaccinations\\\\')"]' + '\');',
        'await this.page.click("button[onclick*=\\"showHealthSubTab\\"][onclick*=\\"vaccinations\\"]");'
    ),
    # Línea 668
    (
        'await this.page.click(\'button[onclick*="showHealthSubTab(\\\\'exams\\\\')"]' + '\');',
        'await this.page.click("button[onclick*=\\"showHealthSubTab\\"][onclick*=\\"exams\\"]");'
    ),
]

# Aplicar reemplazos
fixes_applied = 0
for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        fixes_applied += 1
        print(f'✅ Fix {fixes_applied}/13 aplicado')

# Guardar archivo
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\n✅ COMPLETADO: {fixes_applied}/13 fixes aplicados')
print('📝 Archivo guardado correctamente\n')
