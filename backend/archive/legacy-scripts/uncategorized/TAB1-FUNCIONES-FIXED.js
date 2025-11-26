// ============================================
// FUNCIONES TAB 1 - REHECHAS CORRECTAMENTE
// ============================================

// 1. TOGGLE ESTADO ACTIVO/INACTIVO
async function toggleUserStatus(userId) {
    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

        // GET estado actual
        const response = await fetch(`http://localhost:9998/api/v1/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            alert('Error obteniendo datos del usuario');
            return;
        }

        const data = await response.json();
        const user = data.user || data;
        const currentStatus = user.isActive;
        const newStatus = !currentStatus;

        if (!confirm(`¿Cambiar estado a ${newStatus ? 'ACTIVO' : 'INACTIVO'}?`)) return;

        // PUT nuevo estado
        const putResponse = await fetch(`http://localhost:9998/api/v1/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ isActive: newStatus })
        });

        if (!putResponse.ok) {
            alert('Error guardando cambios');
            return;
        }

        alert(`Usuario ${newStatus ? 'activado' : 'desactivado'} correctamente`);

        // REFRESCAR modal completo
        await closeEmployeeFile();
        await viewUser(userId);

    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// 2. TOGGLE GPS
async function toggleGPSRadius(userId) {
    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

        // GET estado actual
        const response = await fetch(`http://localhost:9998/api/v1/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            alert('Error obteniendo datos del usuario');
            return;
        }

        const data = await response.json();
        const user = data.user || data;
        const currentAllowOutside = user.allowOutsideRadius;
        const newAllowOutside = !currentAllowOutside;

        if (!confirm(`¿Cambiar GPS a ${newAllowOutside ? 'SIN restricción' : 'SOLO área autorizada'}?`)) return;

        // PUT nuevo estado
        const putResponse = await fetch(`http://localhost:9998/api/v1/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ allowOutsideRadius: newAllowOutside })
        });

        if (!putResponse.ok) {
            alert('Error guardando cambios');
            return;
        }

        alert('GPS actualizado correctamente');

        // REFRESCAR modal completo
        await closeEmployeeFile();
        await viewUser(userId);

    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// 3. EDITAR ROL (con dropdown)
async function editUserRole(userId, currentRole) {
    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

        // CREAR MODAL CON DROPDOWN
        const modal = document.createElement('div');
        modal.id = 'changeRoleModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; max-width: 400px; width: 90%; padding: 20px;">
                <h3 style="margin: 0 0 20px 0;">Cambiar Rol de Usuario</h3>
                <label style="display: block; margin-bottom: 10px;">Seleccionar nuevo rol:</label>
                <select id="newRoleSelect" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 2px solid #ddd; border-radius: 6px;">
                    <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>👑 Administrador</option>
                    <option value="supervisor" ${currentRole === 'supervisor' ? 'selected' : ''}>🔧 Supervisor</option>
                    <option value="employee" ${currentRole === 'employee' ? 'selected' : ''}>👤 Empleado</option>
                    <option value="medical" ${currentRole === 'medical' ? 'selected' : ''}>🏥 Médico</option>
                </select>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="document.getElementById('changeRoleModal').remove()" style="padding: 10px 20px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer;">
                        Cancelar
                    </button>
                    <button id="saveRoleBtn" style="padding: 10px 20px; border: none; border-radius: 6px; background: #28a745; color: white; cursor: pointer;">
                        Guardar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // EVENTO GUARDAR
        document.getElementById('saveRoleBtn').onclick = async () => {
            const newRole = document.getElementById('newRoleSelect').value;

            if (newRole === currentRole) {
                alert('No se realizaron cambios');
                modal.remove();
                return;
            }

            // PUT nuevo rol
            const putResponse = await fetch(`http://localhost:9998/api/v1/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (!putResponse.ok) {
                alert('Error guardando cambios');
                return;
            }

            alert('Rol actualizado correctamente');
            modal.remove();

            // REFRESCAR modal completo
            await closeEmployeeFile();
            await viewUser(userId);
        };

    } catch (error) {
        alert('Error: ' + error.message);
    }
}
