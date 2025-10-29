/**
 * partners-admin-panel.js
 *
 * Complete Partners Management Panel for Admin Dashboard
 * Includes: Filters, Listing, Approval/Rejection, Rubro/Subrubro Management
 */

class PartnersAdminPanel {
    constructor() {
        this.partners = [];
        this.filteredPartners = [];
        this.partnerRoles = [];
        this.rubros = [];
        this.subrubros = [];
        this.currentFilters = {
            status: 'all',
            role: '',
            country: '',
            province: '',
            city: '',
            rubro: '',
            subrubro: '',
            paymentModel: '',
            search: ''
        };

        this.apiBase = `${window.API_BASE_URL || ''}/api/partners`;
        this.init();
    }

    async init() {
        console.log('🤝 Initializing Partners Admin Panel...');
        await this.loadPartnerRoles();
        await this.loadPartners();
        await this.loadRubros();
        this.renderFilters();
        this.renderPartnersList();
        this.setupEventListeners();
    }

    async loadPartnerRoles() {
        try {
            // For now, we'll use the roles from the seed data
            this.partnerRoles = [
                { id: 1, role_name: 'Abogado Laboralista', category: 'legal' },
                { id: 2, role_name: 'Médico Laboral', category: 'medical' },
                { id: 3, role_name: 'Responsable de Seguridad e Higiene', category: 'safety' },
                { id: 4, role_name: 'Coach Empresarial', category: 'coaching' },
                { id: 5, role_name: 'Auditor Externo', category: 'audit' },
                { id: 6, role_name: 'Contador Público', category: 'audit' },
                { id: 7, role_name: 'Especialista en RRHH', category: 'coaching' },
                { id: 8, role_name: 'Técnico en Sistemas Biométricos', category: 'safety' },
                { id: 9, role_name: 'Consultor de Compliance', category: 'legal' },
                { id: 10, role_name: 'Psicólogo Organizacional', category: 'health' }
            ];
        } catch (error) {
            console.error('Error loading partner roles:', error);
        }
    }

    async loadPartners() {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.apiBase}?status=all&limit=1000`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to load partners');

            const data = await response.json();
            this.partners = data.partners || [];
            this.applyFilters();

            console.log(`✅ Loaded ${this.partners.length} partners`);
        } catch (error) {
            console.error('Error loading partners:', error);
            this.partners = [];
            this.filteredPartners = [];
        }
    }

    async loadRubros() {
        // For now, we'll use a predefined list
        // In production, this would come from a database table
        this.rubros = [
            { id: 1, name: 'Legal y Cumplimiento', description: 'Servicios legales y de compliance' },
            { id: 2, name: 'Recursos Humanos', description: 'Gestión de RRHH y desarrollo' },
            { id: 3, name: 'Salud y Seguridad', description: 'Medicina laboral y seguridad' },
            { id: 4, name: 'Auditoría y Finanzas', description: 'Auditorías y servicios contables' },
            { id: 5, name: 'Tecnología', description: 'Servicios tecnológicos y sistemas' },
            { id: 6, name: 'Capacitación', description: 'Formación y desarrollo profesional' }
        ];

        this.subrubros = [
            { id: 1, rubro_id: 1, name: 'Derecho Laboral' },
            { id: 2, rubro_id: 1, name: 'Compliance Regulatorio' },
            { id: 3, rubro_id: 2, name: 'Selección de Personal' },
            { id: 4, rubro_id: 2, name: 'Coaching Ejecutivo' },
            { id: 5, rubro_id: 3, name: 'Medicina del Trabajo' },
            { id: 6, rubro_id: 3, name: 'Higiene y Seguridad' },
            { id: 7, rubro_id: 4, name: 'Auditoría Externa' },
            { id: 8, rubro_id: 4, name: 'Contabilidad' },
            { id: 9, rubro_id: 5, name: 'Sistemas Biométricos' },
            { id: 10, rubro_id: 5, name: 'IT Consulting' },
            { id: 11, rubro_id: 6, name: 'Capacitación Técnica' },
            { id: 12, rubro_id: 6, name: 'Desarrollo Organizacional' }
        ];
    }

    renderFilters() {
        const container = document.getElementById('partners-filters-container');
        if (!container) return;

        const uniqueCountries = [...new Set(this.partners.map(p => p.country).filter(Boolean))];
        const uniqueProvinces = [...new Set(this.partners.map(p => p.province).filter(Boolean))];
        const uniqueCities = [...new Set(this.partners.map(p => p.city).filter(Boolean))];

        container.innerHTML = `
            <div class="filters-panel">
                <div class="filters-header">
                    <div class="filters-title">🔍 Filtros de Búsqueda</div>
                    <button class="filters-toggle" onclick="partnersAdmin.toggleFilters()" id="partnersFiltersToggle">
                        Ocultar Filtros
                    </button>
                </div>
                <div class="filters-content" id="partnersFiltersContent">
                    <div class="filter-group">
                        <label class="filter-label">Buscar</label>
                        <input type="text" class="filter-input" id="filter-partner-search"
                               placeholder="Nombre, email, empresa..."
                               oninput="partnersAdmin.onFilterChange('search', this.value)">
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">Estado</label>
                        <select class="filter-input" id="filter-partner-status"
                                onchange="partnersAdmin.onFilterChange('status', this.value)">
                            <option value="all">Todos</option>
                            <option value="pendiente_aprobacion">⏳ Pendiente Aprobación</option>
                            <option value="activo">✅ Activo</option>
                            <option value="suspendido">⚠️ Suspendido</option>
                            <option value="baja">🚫 Baja</option>
                            <option value="renuncia">👋 Renuncia</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">Rol/Especialidad</label>
                        <select class="filter-input" id="filter-partner-role"
                                onchange="partnersAdmin.onFilterChange('role', this.value)">
                            <option value="">Todos los roles</option>
                            ${this.partnerRoles.map(role => `
                                <option value="${role.id}">${role.role_name}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">Rubro</label>
                        <select class="filter-input" id="filter-partner-rubro"
                                onchange="partnersAdmin.onFilterChange('rubro', this.value); partnersAdmin.loadSubrubrosForFilter();">
                            <option value="">Todos los rubros</option>
                            ${this.rubros.map(rubro => `
                                <option value="${rubro.id}">${rubro.name}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">Subrubro</label>
                        <select class="filter-input" id="filter-partner-subrubro"
                                onchange="partnersAdmin.onFilterChange('subrubro', this.value)">
                            <option value="">Todos los subrubros</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">País</label>
                        <select class="filter-input" id="filter-partner-country"
                                onchange="partnersAdmin.onFilterChange('country', this.value)">
                            <option value="">Todos los países</option>
                            ${uniqueCountries.map(country => `
                                <option value="${country}">${country}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">Provincia</label>
                        <select class="filter-input" id="filter-partner-province"
                                onchange="partnersAdmin.onFilterChange('province', this.value)">
                            <option value="">Todas las provincias</option>
                            ${uniqueProvinces.map(province => `
                                <option value="${province}">${province}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">Ciudad</label>
                        <select class="filter-input" id="filter-partner-city"
                                onchange="partnersAdmin.onFilterChange('city', this.value)">
                            <option value="">Todas las ciudades</option>
                            ${uniqueCities.map(city => `
                                <option value="${city}">${city}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">Modalidad de Cobro</label>
                        <select class="filter-input" id="filter-partner-payment"
                                onchange="partnersAdmin.onFilterChange('paymentModel', this.value)">
                            <option value="">Todas las modalidades</option>
                            <option value="per_module_user">Por módulo/usuario</option>
                            <option value="per_employee">Por empleado</option>
                            <option value="per_company">Por empresa</option>
                            <option value="per_service">Por servicio</option>
                            <option value="hourly">Por hora</option>
                            <option value="monthly">Mensual</option>
                            <option value="fixed_project">Precio fijo</option>
                        </select>
                    </div>

                    <div class="filter-group" style="display: flex; gap: 10px; align-items: flex-end;">
                        <button class="btn btn-secondary" onclick="partnersAdmin.clearFilters()" style="flex: 1;">
                            🔄 Limpiar Filtros
                        </button>
                        <button class="btn btn-primary" onclick="partnersAdmin.exportToExcel()" style="flex: 1;">
                            📊 Exportar Excel
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    loadSubrubrosForFilter() {
        const rubroSelect = document.getElementById('filter-partner-rubro');
        const subrubroSelect = document.getElementById('filter-partner-subrubro');

        if (!rubroSelect || !subrubroSelect) return;

        const selectedRubro = rubroSelect.value;
        subrubroSelect.innerHTML = '<option value="">Todos los subrubros</option>';

        if (selectedRubro) {
            const filteredSubrubros = this.subrubros.filter(sr => sr.rubro_id === parseInt(selectedRubro));
            filteredSubrubros.forEach(subrubro => {
                const option = document.createElement('option');
                option.value = subrubro.id;
                option.textContent = subrubro.name;
                subrubroSelect.appendChild(option);
            });
        }
    }

    toggleFilters() {
        const content = document.getElementById('partnersFiltersContent');
        const toggle = document.getElementById('partnersFiltersToggle');

        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = 'Ocultar Filtros';
        } else {
            content.style.display = 'none';
            toggle.textContent = 'Mostrar Filtros';
        }
    }

    onFilterChange(filterName, value) {
        this.currentFilters[filterName] = value;
        this.applyFilters();
        this.renderPartnersList();
    }

    applyFilters() {
        this.filteredPartners = this.partners.filter(partner => {
            // Status filter
            if (this.currentFilters.status !== 'all' && partner.status !== this.currentFilters.status) {
                return false;
            }

            // Role filter
            if (this.currentFilters.role && partner.partner_role_id !== parseInt(this.currentFilters.role)) {
                return false;
            }

            // Country filter
            if (this.currentFilters.country && partner.country !== this.currentFilters.country) {
                return false;
            }

            // Province filter
            if (this.currentFilters.province && partner.province !== this.currentFilters.province) {
                return false;
            }

            // City filter
            if (this.currentFilters.city && partner.city !== this.currentFilters.city) {
                return false;
            }

            // Payment model filter
            if (this.currentFilters.paymentModel && partner.payment_model !== this.currentFilters.paymentModel) {
                return false;
            }

            // Search filter
            if (this.currentFilters.search) {
                const searchLower = this.currentFilters.search.toLowerCase();
                const searchableText = `${partner.first_name} ${partner.last_name} ${partner.email} ${partner.company_name || ''}`.toLowerCase();
                if (!searchableText.includes(searchLower)) {
                    return false;
                }
            }

            return true;
        });
    }

    clearFilters() {
        this.currentFilters = {
            status: 'all',
            role: '',
            country: '',
            province: '',
            city: '',
            rubro: '',
            subrubro: '',
            paymentModel: '',
            search: ''
        };

        // Reset form inputs
        document.getElementById('filter-partner-search').value = '';
        document.getElementById('filter-partner-status').value = 'all';
        document.getElementById('filter-partner-role').value = '';
        document.getElementById('filter-partner-rubro').value = '';
        document.getElementById('filter-partner-subrubro').value = '';
        document.getElementById('filter-partner-country').value = '';
        document.getElementById('filter-partner-province').value = '';
        document.getElementById('filter-partner-city').value = '';
        document.getElementById('filter-partner-payment').value = '';

        this.applyFilters();
        this.renderPartnersList();
    }

    renderPartnersList() {
        const container = document.getElementById('partners-list-container');
        if (!container) return;

        if (this.filteredPartners.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 64px; margin-bottom: 20px;">🤝</div>
                    <h3>No se encontraron asociados</h3>
                    <p>No hay asociados que coincidan con los filtros seleccionados</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <div style="margin-bottom: 20px; color: #666;">
                Mostrando ${this.filteredPartners.length} de ${this.partners.length} asociados
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Rol/Especialidad</th>
                        <th>Ubicación</th>
                        <th>Modalidad de Cobro</th>
                        <th>Rating</th>
                        <th>Antigüedad</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredPartners.map(partner => this.renderPartnerRow(partner)).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = tableHTML;
    }

    renderPartnerRow(partner) {
        const role = this.partnerRoles.find(r => r.id === partner.partner_role_id);
        const roleName = role ? role.role_name : 'N/A';

        const statusColors = {
            pendiente_aprobacion: '#f39c12',
            activo: '#27ae60',
            suspendido: '#e67e22',
            baja: '#e74c3c',
            renuncia: '#95a5a6'
        };

        const statusLabels = {
            pendiente_aprobacion: '⏳ Pendiente Aprobación',
            activo: '✅ Activo',
            suspendido: '⚠️ Suspendido',
            baja: '🚫 Baja',
            renuncia: '👋 Renuncia'
        };

        const paymentModelLabels = {
            per_module_user: 'Por módulo/usuario',
            per_employee: 'Por empleado',
            per_company: 'Por empresa',
            per_service: 'Por servicio',
            hourly: 'Por hora',
            monthly: 'Mensual',
            fixed_project: 'Precio fijo'
        };

        const createdDate = new Date(partner.created_at);
        const now = new Date();
        const daysSinceCreated = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
        const antiguedad = daysSinceCreated < 30 ? `${daysSinceCreated} días` :
                          daysSinceCreated < 365 ? `${Math.floor(daysSinceCreated / 30)} meses` :
                          `${Math.floor(daysSinceCreated / 365)} años`;

        const rating = partner.average_rating || 0;
        const ratingStars = '⭐'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

        return `
            <tr>
                <td>${partner.id}</td>
                <td>
                    <strong>${partner.first_name} ${partner.last_name}</strong>
                    ${partner.company_name ? `<br><small>${partner.company_name}</small>` : ''}
                </td>
                <td>${partner.email}</td>
                <td>${roleName}</td>
                <td>
                    ${partner.city || 'N/A'}, ${partner.province || 'N/A'}
                    <br><small>${partner.country || 'N/A'}</small>
                </td>
                <td>${paymentModelLabels[partner.payment_model] || partner.payment_model || 'N/A'}</td>
                <td title="${rating.toFixed(1)} / 5">
                    ${ratingStars}
                    <br><small>(${partner.total_reviews || 0} reseñas)</small>
                </td>
                <td>${antiguedad}</td>
                <td>
                    <span class="status-badge" style="background: ${statusColors[partner.status]}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                        ${statusLabels[partner.status]}
                    </span>
                </td>
                <td>
                    <button class="btn-icon" onclick="partnersAdmin.viewPartner(${partner.id})" title="Ver detalles">👁️</button>
                    <button class="btn-icon" onclick="partnersAdmin.editPartner(${partner.id})" title="Editar">✏️</button>
                    ${partner.status === 'pendiente_aprobacion' ? `
                        <button class="btn-icon" onclick="partnersAdmin.changeStatus(${partner.id}, 'activo')" title="Aprobar" style="color: #27ae60;">✅</button>
                        <button class="btn-icon" onclick="partnersAdmin.changeStatus(${partner.id}, 'baja')" title="Rechazar" style="color: #e74c3c;">❌</button>
                    ` : ''}
                    ${partner.status === 'activo' ? `
                        <button class="btn-icon" onclick="partnersAdmin.changeStatus(${partner.id}, 'suspendido')" title="Suspender" style="color: #e67e22;">⏸️</button>
                        <button class="btn-icon" onclick="partnersAdmin.changeStatus(${partner.id}, 'baja')" title="Dar de baja" style="color: #e74c3c;">🚫</button>
                    ` : ''}
                    ${partner.status === 'suspendido' ? `
                        <button class="btn-icon" onclick="partnersAdmin.changeStatus(${partner.id}, 'activo')" title="Reactivar" style="color: #27ae60;">🔄</button>
                        <button class="btn-icon" onclick="partnersAdmin.changeStatus(${partner.id}, 'baja')" title="Dar de baja" style="color: #e74c3c;">🚫</button>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    async viewPartner(partnerId) {
        const partner = this.partners.find(p => p.id === partnerId);
        if (!partner) return;

        const role = this.partnerRoles.find(r => r.id === partner.partner_role_id);

        const modalContent = `
            <div class="partner-detail-modal">
                <h3>📋 Detalles del Asociado</h3>

                <div class="detail-section">
                    <h4>Información Personal</h4>
                    <p><strong>Nombre:</strong> ${partner.first_name} ${partner.last_name}</p>
                    <p><strong>Email:</strong> ${partner.email}</p>
                    <p><strong>Teléfono:</strong> ${partner.phone || 'N/A'}</p>
                    <p><strong>CUIT/CUIL:</strong> ${partner.tax_id || 'N/A'}</p>
                </div>

                <div class="detail-section">
                    <h4>Información Profesional</h4>
                    <p><strong>Rol:</strong> ${role ? role.role_name : 'N/A'}</p>
                    <p><strong>Empresa:</strong> ${partner.company_name || 'N/A'}</p>
                    <p><strong>Experiencia:</strong> ${partner.years_experience} años</p>
                    <p><strong>Modalidad de Cobro:</strong> ${partner.payment_model || 'N/A'}</p>
                </div>

                <div class="detail-section">
                    <h4>Ubicación</h4>
                    <p><strong>País:</strong> ${partner.country || 'N/A'}</p>
                    <p><strong>Provincia:</strong> ${partner.province || 'N/A'}</p>
                    <p><strong>Ciudad:</strong> ${partner.city || 'N/A'}</p>
                    <p><strong>Código Postal:</strong> ${partner.postal_code || 'N/A'}</p>
                    <p><strong>Dirección:</strong> ${partner.address || 'N/A'}</p>
                    ${partner.latitude && partner.longitude ? `
                        <p><strong>Coordenadas:</strong> ${partner.latitude}, ${partner.longitude}</p>
                    ` : ''}
                </div>

                <div class="detail-section">
                    <h4>Biografía</h4>
                    <p>${partner.bio || 'Sin biografía'}</p>
                </div>

                <div class="detail-section">
                    <h4>Estado y Estadísticas</h4>
                    <p><strong>Estado:</strong> ${partner.status}</p>
                    <p><strong>Rating:</strong> ${partner.average_rating || 0} / 5 (${partner.total_reviews || 0} reseñas)</p>
                    <p><strong>Servicios completados:</strong> ${partner.completed_services || 0}</p>
                    <p><strong>Fecha de registro:</strong> ${new Date(partner.created_at).toLocaleDateString('es-AR')}</p>
                </div>
            </div>
        `;

        this.showModal('Detalles del Asociado', modalContent);
    }

    async approvePartner(partnerId) {
        if (!confirm('¿Está seguro de aprobar este asociado?')) return;

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.apiBase}/${partnerId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to approve partner');

            alert('✅ Asociado aprobado exitosamente');
            await this.loadPartners();
            this.renderPartnersList();
        } catch (error) {
            console.error('Error approving partner:', error);
            alert('❌ Error al aprobar el asociado');
        }
    }

    async rejectPartner(partnerId) {
        const reason = prompt('Ingrese el motivo del rechazo:');
        if (!reason) return;

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.apiBase}/${partnerId}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            if (!response.ok) throw new Error('Failed to reject partner');

            alert('❌ Asociado rechazado');
            await this.loadPartners();
            this.renderPartnersList();
        } catch (error) {
            console.error('Error rejecting partner:', error);
            alert('❌ Error al rechazar el asociado');
        }
    }

    async suspendPartner(partnerId) {
        if (!confirm('¿Está seguro de suspender este asociado?')) return;

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.apiBase}/${partnerId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'suspended' })
            });

            if (!response.ok) throw new Error('Failed to suspend partner');

            alert('⏸️ Asociado suspendido');
            await this.loadPartners();
            this.renderPartnersList();
        } catch (error) {
            console.error('Error suspending partner:', error);
            alert('❌ Error al suspender el asociado');
        }
    }

    async deletePartner(partnerId) {
        if (!confirm('¿Está seguro de eliminar este asociado? Esta acción no se puede deshacer.')) return;

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.apiBase}/${partnerId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete partner');

            alert('🗑️ Asociado eliminado');
            await this.loadPartners();
            this.renderPartnersList();
        } catch (error) {
            console.error('Error deleting partner:', error);
            alert('❌ Error al eliminar el asociado');
        }
    }

    exportToExcel() {
        // Simple CSV export
        const headers = ['ID', 'Nombre', 'Email', 'Rol', 'País', 'Provincia', 'Ciudad', 'Modalidad de Cobro', 'Rating', 'Estado'];
        const rows = this.filteredPartners.map(partner => {
            const role = this.partnerRoles.find(r => r.id === partner.partner_role_id);
            return [
                partner.id,
                `${partner.first_name} ${partner.last_name}`,
                partner.email,
                role ? role.role_name : 'N/A',
                partner.country || '',
                partner.province || '',
                partner.city || '',
                partner.payment_model || '',
                partner.average_rating || 0,
                partner.status
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `asociados_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async changeStatus(partnerId, newStatus) {
        const partner = this.partners.find(p => p.id === partnerId);
        if (!partner) {
            alert('❌ Partner no encontrado');
            return;
        }

        // Get current user info from localStorage
        const userId = localStorage.getItem('adminUserId');
        const userRole = localStorage.getItem('adminUserRole') || 'admin';
        const userName = localStorage.getItem('adminUserName') || 'Administrador';

        // Status labels for confirmation message
        const statusLabels = {
            pendiente_aprobacion: '⏳ Pendiente Aprobación',
            activo: '✅ Activo',
            suspendido: '⚠️ Suspendido',
            baja: '🚫 Baja',
            renuncia: '👋 Renuncia'
        };

        // Prompt for change reason if required
        let changeReason = null;
        if (['baja', 'suspendido', 'renuncia'].includes(newStatus)) {
            changeReason = prompt(`⚠️ MOTIVO REQUERIDO\n\nIngrese el motivo para cambiar el estado a "${statusLabels[newStatus]}":\n\n(Este motivo será enviado al partner por email)`);
            if (!changeReason || changeReason.trim() === '') {
                alert('❌ El motivo es obligatorio para este cambio de estado');
                return;
            }
        }

        // Confirm action
        const confirmMessage = changeReason
            ? `¿Confirma cambiar el estado de ${partner.first_name} ${partner.last_name} a "${statusLabels[newStatus]}"?\n\nMotivo: ${changeReason}\n\n✉️ Se enviará un email automático al partner y a los clientes con contratos activos.`
            : `¿Confirma cambiar el estado de ${partner.first_name} ${partner.last_name} a "${statusLabels[newStatus]}"?\n\n✉️ Se enviará un email automático al partner.`;

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.apiBase}/${partnerId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'x-user-id': userId,
                    'x-user-role': userRole
                },
                body: JSON.stringify({
                    newStatus,
                    changeReason: changeReason || '',
                    changeNotes: ''
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to change status');
            }

            const result = await response.json();

            // Show success message with notification details
            const successMessage = `✅ Estado actualizado exitosamente!\n\n` +
                `📧 Email enviado al partner: ${result.data.notifications.emailSentToPartner ? 'Sí ✅' : 'No ❌'}\n` +
                `👥 Clientes notificados: ${result.data.notifications.clientsNotified}\n` +
                `📄 Contratos activos: ${result.data.notifications.activeContractsCount}\n\n` +
                `📝 Entrada registrada en historial de cambios (ID: ${result.data.historyId})`;

            alert(successMessage);

            // Reload partners
            await this.loadPartners();
            this.renderPartnersList();

        } catch (error) {
            console.error('Error changing partner status:', error);
            alert(`❌ Error al cambiar estado: ${error.message}`);
        }
    }

    async editPartner(partnerId) {
        const partner = this.partners.find(p => p.id === partnerId);
        if (!partner) {
            alert('❌ Partner no encontrado');
            return;
        }

        const modalContent = `
            <div class="partner-edit-modal">
                <form id="editPartnerForm" onsubmit="return false;">
                    <div class="form-section">
                        <h4>Información Personal</h4>
                        <div class="form-group">
                            <label>Nombre *</label>
                            <input type="text" id="edit_first_name" value="${partner.first_name}" required>
                        </div>
                        <div class="form-group">
                            <label>Apellido *</label>
                            <input type="text" id="edit_last_name" value="${partner.last_name}" required>
                        </div>
                        <div class="form-group">
                            <label>Email *</label>
                            <input type="email" id="edit_email" value="${partner.email}" required>
                        </div>
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="text" id="edit_phone" value="${partner.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label>CUIT/CUIL</label>
                            <input type="text" id="edit_tax_id" value="${partner.tax_id || ''}">
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Información Profesional</h4>
                        <div class="form-group">
                            <label>Rol *</label>
                            <select id="edit_partner_role_id" required>
                                ${this.partnerRoles.map(role => `
                                    <option value="${role.id}" ${role.id === partner.partner_role_id ? 'selected' : ''}>
                                        ${role.role_name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Empresa</label>
                            <input type="text" id="edit_company_name" value="${partner.company_name || ''}">
                        </div>
                        <div class="form-group">
                            <label>Años de Experiencia *</label>
                            <input type="number" id="edit_years_experience" value="${partner.years_experience}" min="0" required>
                        </div>
                        <div class="form-group">
                            <label>Modalidad de Cobro</label>
                            <select id="edit_payment_model">
                                <option value="per_hour" ${partner.payment_model === 'per_hour' ? 'selected' : ''}>Por Hora</option>
                                <option value="per_project" ${partner.payment_model === 'per_project' ? 'selected' : ''}>Por Proyecto</option>
                                <option value="fixed_fee" ${partner.payment_model === 'fixed_fee' ? 'selected' : ''}>Tarifa Fija</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Ubicación</h4>
                        <div class="form-group">
                            <label>País</label>
                            <input type="text" id="edit_country" value="${partner.country || ''}">
                        </div>
                        <div class="form-group">
                            <label>Provincia</label>
                            <input type="text" id="edit_province" value="${partner.province || ''}">
                        </div>
                        <div class="form-group">
                            <label>Ciudad</label>
                            <input type="text" id="edit_city" value="${partner.city || ''}">
                        </div>
                        <div class="form-group">
                            <label>Código Postal</label>
                            <input type="text" id="edit_postal_code" value="${partner.postal_code || ''}">
                        </div>
                        <div class="form-group">
                            <label>Dirección</label>
                            <textarea id="edit_address" rows="2">${partner.address || ''}</textarea>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Biografía</h4>
                        <div class="form-group">
                            <label>Biografía Profesional</label>
                            <textarea id="edit_bio" rows="4">${partner.bio || ''}</textarea>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="this.closest('.modal').remove()">
                            ❌ Cancelar
                        </button>
                        <button type="button" class="btn-primary" onclick="partnersAdmin.submitEditPartner(${partnerId})">
                            💾 Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        `;

        this.showModal('✏️ Editar Asociado', modalContent);
    }

    async submitEditPartner(partnerId) {
        // Get form values
        const updatedData = {
            first_name: document.getElementById('edit_first_name').value,
            last_name: document.getElementById('edit_last_name').value,
            email: document.getElementById('edit_email').value,
            phone: document.getElementById('edit_phone').value,
            tax_id: document.getElementById('edit_tax_id').value,
            partner_role_id: parseInt(document.getElementById('edit_partner_role_id').value),
            company_name: document.getElementById('edit_company_name').value,
            years_experience: parseInt(document.getElementById('edit_years_experience').value),
            payment_model: document.getElementById('edit_payment_model').value,
            country: document.getElementById('edit_country').value,
            province: document.getElementById('edit_province').value,
            city: document.getElementById('edit_city').value,
            postal_code: document.getElementById('edit_postal_code').value,
            address: document.getElementById('edit_address').value,
            bio: document.getElementById('edit_bio').value
        };

        // Validate required fields
        if (!updatedData.first_name || !updatedData.last_name || !updatedData.email) {
            alert('❌ Por favor complete todos los campos obligatorios (*)');
            return;
        }

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.apiBase}/${partnerId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update partner');
            }

            alert('✅ Asociado actualizado exitosamente');

            // Close modal
            document.querySelector('.modal')?.remove();

            // Reload partners
            await this.loadPartners();
            this.renderPartnersList();

        } catch (error) {
            console.error('Error updating partner:', error);
            alert(`❌ Error al actualizar asociado: ${error.message}`);
        }
    }

    setupEventListeners() {
        // Add any additional event listeners here
        console.log('✅ Partners Admin Panel initialized successfully');
    }
}

// Initialize global instance
let partnersAdmin;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        partnersAdmin = new PartnersAdminPanel();
    });
} else {
    partnersAdmin = new PartnersAdminPanel();
}
