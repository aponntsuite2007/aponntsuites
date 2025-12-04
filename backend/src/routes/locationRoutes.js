const express = require('express');
const router = express.Router();
const { EmployeeLocation, User } = require('../config/database');
const { auth } = require('../middleware/auth');

// 📍 Report employee location
router.post('/report', auth, async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      accuracy,
      altitude,
      heading,
      speed,
      isWorkingHours,
      isOnBreak,
      currentActivity,
      deviceId,
      appVersion,
      batteryLevel,
      connectionType,
      address,
      nearbyLandmarks,
      weatherConditions,
      sharingLevel
    } = req.body;

    const userId = req.user.user_id; // Get from authenticated user
    const companyId = req.user?.company_id || 11;

    // Validate required fields
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitud y longitud son requeridas'
      });
    }

    // Check if location is within valid range
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'Coordenadas GPS inválidas'
      });
    }

    // Simple geofence check (this could be more sophisticated)
    const isInGeofence = checkGeofence(latitude, longitude);

    // Create location record
    const location = await EmployeeLocation.create({
      userId,
      company_id: companyId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : null,
      altitude: altitude ? parseFloat(altitude) : null,
      heading: heading ? parseFloat(heading) : null,
      speed: speed ? parseFloat(speed) : null,
      isWorkingHours: isWorkingHours || false,
      isOnBreak: isOnBreak || false,
      isInGeofence,
      currentActivity: currentActivity || 'idle',
      deviceId: deviceId || null,
      appVersion: appVersion || null,
      batteryLevel: batteryLevel ? parseInt(batteryLevel) : null,
      connectionType: connectionType || 'unknown',
      address: address || null,
      nearbyLandmarks: nearbyLandmarks || null,
      weatherConditions: weatherConditions || null,
      sharingLevel: sharingLevel || 'full',
      reportedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Ubicación reportada exitosamente',
      data: {
        id: location.id,
        isInGeofence,
        reportedAt: location.reportedAt
      }
    });

  } catch (error) {
    console.error('Error reportando ubicación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 🗺️ Get current locations of all employees in working hours
// ACTUALIZADO: Obtiene ubicaciones desde attendances (empleados con turno abierto)
router.get('/current', auth, async (req, res) => {
  try {
    // Only admin/supervisor can view all locations
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores y supervisores pueden ver ubicaciones de empleados'
      });
    }

    const { sequelize } = require('../config/database');
    const companyId = req.user?.company_id || 11;

    console.log(`📍 [LOCATION] Consultando empleados activos para empresa ${companyId}`);

    // Query para obtener empleados con turno abierto (check-in sin check-out)
    const activeEmployees = await sequelize.query(`
      SELECT
        a.id as attendance_id,
        a."UserId" as user_id,
        a."checkInTime" as check_in_time,
        a.check_in_latitude,
        a.check_in_longitude,
        a.check_in_accuracy,
        a.kiosk_id,
        a.origin_type,
        u."firstName",
        u."lastName",
        u."employeeId",
        u.biometric_photo_url,
        u.gps_enabled,
        u.position,
        u.role,
        u.department_id,
        k.gps_lat as kiosk_lat,
        k.gps_lng as kiosk_lng,
        k.location as kiosk_location,
        k.name as kiosk_name,
        d.name as department_name
      FROM attendances a
      INNER JOIN users u ON a."UserId" = u.user_id
      LEFT JOIN kiosks k ON a.kiosk_id = k.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE a.company_id = :companyId
        AND a."checkInTime" IS NOT NULL
        AND a."checkOutTime" IS NULL
        AND u."isActive" = true
      ORDER BY a."checkInTime" DESC
    `, {
      replacements: { companyId },
      type: sequelize.QueryTypes.SELECT
    });

    // Procesar y formatear ubicaciones
    const result = activeEmployees.map(emp => {
      // Determinar coordenadas GPS
      let latitude = null;
      let longitude = null;
      let accuracy = null;
      let locationSource = 'unknown';
      let address = null;

      // Prioridad 1: GPS del fichaje desde APK
      if (emp.check_in_latitude && emp.check_in_longitude) {
        latitude = parseFloat(emp.check_in_latitude);
        longitude = parseFloat(emp.check_in_longitude);
        accuracy = emp.check_in_accuracy ? parseFloat(emp.check_in_accuracy) : 10;
        locationSource = 'mobile_gps';
      }
      // Prioridad 2: GPS del kiosko
      else if (emp.kiosk_lat && emp.kiosk_lng) {
        latitude = parseFloat(emp.kiosk_lat);
        longitude = parseFloat(emp.kiosk_lng);
        accuracy = 5; // Kioskos tienen ubicación fija, muy precisa
        locationSource = 'kiosk';
        address = emp.kiosk_location || emp.kiosk_name;
      }

      // Solo incluir si tenemos ubicación
      if (!latitude || !longitude) {
        return null;
      }

      // Calcular tiempo desde check-in
      const checkInTime = new Date(emp.check_in_time);
      const now = new Date();
      const minutesSinceCheckIn = Math.floor((now - checkInTime) / (1000 * 60));

      return {
        id: `loc_${emp.attendance_id}`,
        employee: {
          id: emp.user_id,
          name: `${emp.firstName} ${emp.lastName}`,
          employeeId: emp.employeeId,
          role: emp.role,
          position: emp.position,
          department: emp.department_name,
          photoUrl: emp.biometric_photo_url,
          photo_url: emp.biometric_photo_url,
          biometric_photo_url: emp.biometric_photo_url
        },
        location: {
          latitude,
          longitude,
          accuracy,
          address: address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          source: locationSource,
          kioskName: emp.kiosk_name
        },
        status: {
          activity: 'working',
          isOnBreak: false,
          isInGeofence: true, // TODO: calcular real
          batteryLevel: 100,
          connectionType: emp.origin_type === 'mobile_app' ? '4g' : 'wifi'
        },
        reportedAt: emp.check_in_time,
        minutesWorking: minutesSinceCheckIn
      };
    }).filter(Boolean); // Eliminar nulls

    console.log(`✅ [LOCATION] ${result.length} empleados con ubicación activa`);

    res.json({
      success: true,
      data: result,
      count: result.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ [LOCATION] Error obteniendo ubicaciones actuales:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// 📊 Get location history for a user
router.get('/history/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;

    // Only admin/supervisor can view any user's history, users can only view their own
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor' && req.user.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver este historial de ubicaciones'
      });
    }

    const whereClause = { userId };

    // Add date filters if provided
    if (startDate || endDate) {
      whereClause.reportedAt = {};
      if (startDate) {
        whereClause.reportedAt[require('sequelize').Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.reportedAt[require('sequelize').Op.lte] = new Date(endDate);
      }
    }

    const locations = await EmployeeLocation.findAll({
      where: whereClause,
      attributes: [
        'id', 'latitude', 'longitude', 'accuracy', 'currentActivity',
        'isWorkingHours', 'isOnBreak', 'isInGeofence', 'address', 'reportedAt'
      ],
      include: [{
        model: User,
        as: 'employee',
        attributes: ['id', 'firstName', 'lastName', 'employeeId']
      }],
      order: [['reportedAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: locations,
      count: locations.length
    });

  } catch (error) {
    console.error('Error obteniendo historial de ubicaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 📈 Get location statistics
router.get('/stats', auth, async (req, res) => {
  try {
    // Only admin/supervisor can view location statistics
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores y supervisores pueden ver estadísticas de ubicación'
      });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get stats for today
    const todayStats = await EmployeeLocation.findAll({
      attributes: [
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalReports'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN isWorkingHours = true THEN 1 END')), 'workingHoursReports'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN isInGeofence = true THEN 1 END')), 'insideGeofence'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN isOnBreak = true THEN 1 END')), 'onBreakReports'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('DISTINCT userId')), 'activeEmployees'],
        [require('sequelize').fn('AVG', require('sequelize').col('accuracy')), 'avgAccuracy']
      ],
      where: {
        reportedAt: {
          [require('sequelize').Op.gte]: todayStart
        }
      },
      raw: true
    });

    // Get activity breakdown
    const activityStats = await EmployeeLocation.findAll({
      attributes: [
        'currentActivity',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: {
        reportedAt: {
          [require('sequelize').Op.gte]: todayStart
        }
      },
      group: ['currentActivity'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        today: todayStats[0],
        activities: activityStats,
        timestamp: now
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de ubicación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 🏢 Set geofence boundaries (admin only)
router.post('/geofence', auth, async (req, res) => {
  try {
    // Only admin can set geofence
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores pueden configurar geofences'
      });
    }

    const { name, type, coordinates, radius, isActive } = req.body;

    // This would typically be stored in a separate geofences table
    // For now, we'll return a success response
    res.json({
      success: true,
      message: 'Geofence configurado exitosamente',
      data: {
        name,
        type,
        coordinates,
        radius,
        isActive: isActive !== false
      }
    });

  } catch (error) {
    console.error('Error configurando geofence:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 🏢 Get ALL branches for company (multi-sucursal view)
router.get('/branches', auth, async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const companyId = req.user?.company_id || 11;

    const branches = await sequelize.query(`
      SELECT
        id, name, address, latitude, longitude, radius, is_main, "isActive"
      FROM branches
      WHERE company_id = :companyId
        AND "isActive" = true
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND latitude != 0
        AND longitude != 0
      ORDER BY is_main DESC, name ASC
    `, {
      replacements: { companyId },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: branches.map(b => ({
        id: b.id,
        name: b.name,
        address: b.address,
        latitude: parseFloat(b.latitude),
        longitude: parseFloat(b.longitude),
        radius: b.radius || 50,
        isMain: b.is_main,
        isActive: b.isActive
      })),
      count: branches.length
    });
  } catch (error) {
    console.error('Error obteniendo sucursales:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// 🏢 Get departments for company (filter)
router.get('/departments', auth, async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const companyId = req.user?.company_id || 11;

    const departments = await sequelize.query(`
      SELECT DISTINCT id, name
      FROM departments
      WHERE company_id = :companyId AND is_active = true
      ORDER BY name ASC
    `, {
      replacements: { companyId },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({ success: true, data: departments });
  } catch (error) {
    console.error('Error obteniendo departamentos:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// 📍 Get location history for route tracking (with path)
router.get('/track/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query; // Optional: specific date
    const { sequelize } = require('../config/database');
    const companyId = req.user?.company_id || 11;

    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor' && req.user.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Sin permisos' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    // Obtener todos los fichajes del día con GPS
    const trackPoints = await sequelize.query(`
      SELECT
        a.id,
        a."checkInTime" as timestamp,
        a.check_in_latitude as latitude,
        a.check_in_longitude as longitude,
        'check_in' as event_type,
        u."firstName" || ' ' || u."lastName" as employee_name
      FROM attendances a
      INNER JOIN users u ON a."UserId" = u.user_id
      WHERE a."UserId" = :userId
        AND a.company_id = :companyId
        AND DATE(a."checkInTime") = :targetDate
        AND a.check_in_latitude IS NOT NULL
        AND a.check_in_longitude IS NOT NULL
      UNION ALL
      SELECT
        a.id,
        a."checkOutTime" as timestamp,
        a.check_out_latitude as latitude,
        a.check_out_longitude as longitude,
        'check_out' as event_type,
        u."firstName" || ' ' || u."lastName" as employee_name
      FROM attendances a
      INNER JOIN users u ON a."UserId" = u.user_id
      WHERE a."UserId" = :userId
        AND a.company_id = :companyId
        AND DATE(a."checkOutTime") = :targetDate
        AND a.check_out_latitude IS NOT NULL
        AND a.check_out_longitude IS NOT NULL
      ORDER BY timestamp ASC
    `, {
      replacements: { userId, companyId, targetDate },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: trackPoints.map(p => ({
        id: p.id,
        timestamp: p.timestamp,
        latitude: parseFloat(p.latitude),
        longitude: parseFloat(p.longitude),
        eventType: p.event_type,
        employeeName: p.employee_name
      })),
      date: targetDate
    });
  } catch (error) {
    console.error('Error obteniendo track:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// 👥 Get active visitors with GPS (for map display)
router.get('/visitors', auth, async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const companyId = req.user?.company_id || 11;

    // Solo admin/supervisor pueden ver ubicaciones de visitas
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores y supervisores pueden ver ubicaciones de visitantes'
      });
    }

    console.log(`👥 [LOCATION] Consultando visitantes activos para empresa ${companyId}`);

    // Query para obtener visitantes actualmente en las instalaciones (con check_in pero sin check_out)
    const activeVisitors = await sequelize.query(`
      SELECT
        v.id,
        v.dni,
        v.first_name,
        v.last_name,
        v.email,
        v.phone,
        v.visit_reason,
        v.authorization_status,
        v.check_in,
        v.check_out,
        v.photo_url,
        v.keyring_id,
        v.gps_tracking_enabled,
        v.expected_duration_minutes,
        v.notes,
        v.visiting_department_id,
        d.name as department_name,
        u."firstName" || ' ' || u."lastName" as responsible_name,
        u."employeeId" as responsible_employee_id,
        -- Obtener última ubicación GPS si existe (columnas reales: latitude, longitude, recorded_at)
        vgt.latitude as last_latitude,
        vgt.longitude as last_longitude,
        vgt.accuracy,
        vgt.is_inside_facility,
        vgt.battery_level,
        vgt.recorded_at as last_gps_time,
        -- Ubicación del kiosko de check-in como fallback
        k.gps_lat as kiosk_lat,
        k.gps_lng as kiosk_lng,
        k.name as kiosk_name,
        k.location as kiosk_location
      FROM visitors v
      LEFT JOIN departments d ON v.visiting_department_id = d.id
      LEFT JOIN users u ON v.responsible_employee_id = u.user_id
      LEFT JOIN kiosks k ON v.kiosk_id = k.id
      LEFT JOIN LATERAL (
        SELECT vgps.latitude, vgps.longitude, vgps.accuracy, vgps.is_inside_facility, vgps.battery_level, vgps.recorded_at
        FROM visitor_gps_tracking vgps
        WHERE vgps.visitor_id = v.id
        ORDER BY vgps.recorded_at DESC
        LIMIT 1
      ) vgt ON true
      WHERE v.company_id = :companyId
        AND v.is_active = true
        AND v.authorization_status = 'authorized'
        AND v.check_in IS NOT NULL
        AND v.check_out IS NULL
      ORDER BY v.check_in DESC
    `, {
      replacements: { companyId },
      type: sequelize.QueryTypes.SELECT
    });

    // Procesar y formatear ubicaciones de visitantes
    const result = activeVisitors.map(visitor => {
      let latitude = null;
      let longitude = null;
      let accuracy = null;
      let locationSource = 'unknown';
      let address = null;

      // Prioridad 1: GPS tracking del llavero
      if (visitor.last_latitude && visitor.last_longitude) {
        latitude = parseFloat(visitor.last_latitude);
        longitude = parseFloat(visitor.last_longitude);
        accuracy = visitor.accuracy ? parseFloat(visitor.accuracy) : 15;
        locationSource = 'gps_tracker';
      }
      // Prioridad 2: Ubicación del kiosko de check-in
      else if (visitor.kiosk_lat && visitor.kiosk_lng) {
        latitude = parseFloat(visitor.kiosk_lat);
        longitude = parseFloat(visitor.kiosk_lng);
        accuracy = 5;
        locationSource = 'kiosk';
        address = visitor.kiosk_location || visitor.kiosk_name;
      }

      // Si no hay ubicación, no incluir
      if (!latitude || !longitude) {
        return null;
      }

      // Calcular tiempo desde check-in
      const checkInTime = new Date(visitor.check_in);
      const now = new Date();
      const minutesSinceCheckIn = Math.floor((now - checkInTime) / (1000 * 60));
      const isOverdue = minutesSinceCheckIn > (visitor.expected_duration_minutes || 60);

      return {
        id: `visitor_${visitor.id}`,
        type: 'visitor', // Diferenciador clave para el frontend
        visitor: {
          id: visitor.id,
          dni: visitor.dni,
          name: `${visitor.first_name} ${visitor.last_name}`,
          email: visitor.email,
          phone: visitor.phone,
          photoUrl: visitor.photo_url,
          keyringId: visitor.keyring_id
        },
        visit: {
          reason: visitor.visit_reason,
          department: visitor.department_name,
          responsibleName: visitor.responsible_name,
          responsibleEmployeeId: visitor.responsible_employee_id,
          checkIn: visitor.check_in,
          expectedDuration: visitor.expected_duration_minutes,
          notes: visitor.notes
        },
        location: {
          latitude,
          longitude,
          accuracy,
          address: address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          source: locationSource,
          kioskName: visitor.kiosk_name,
          lastGpsTime: visitor.last_gps_time
        },
        status: {
          isInsideFacility: visitor.is_inside_facility !== false,
          isOverdue,
          hasAlert: !!visitor.alert_type,
          alertType: visitor.alert_type,
          batteryLevel: visitor.battery_level || null,
          gpsEnabled: visitor.gps_tracking_enabled
        },
        reportedAt: visitor.last_gps_time || visitor.check_in,
        minutesInside: minutesSinceCheckIn
      };
    }).filter(Boolean);

    console.log(`✅ [LOCATION] ${result.length} visitantes con ubicación activa`);

    res.json({
      success: true,
      data: result,
      count: result.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ [LOCATION] Error obteniendo ubicaciones de visitantes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// 🏢 Get main branch location for company (map center)
router.get('/branch-center', auth, async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const companyId = req.user?.company_id || 11;

    console.log(`📍 [LOCATION] Obteniendo ubicación de sucursal principal para empresa ${companyId}`);

    // Buscar sucursal principal (is_main = true) o la primera sucursal activa con coordenadas
    const branchResult = await sequelize.query(`
      SELECT
        id,
        name,
        address,
        latitude,
        longitude,
        radius,
        is_main
      FROM branches
      WHERE company_id = :companyId
        AND "isActive" = true
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND latitude != 0
        AND longitude != 0
      ORDER BY is_main DESC, "createdAt" ASC
      LIMIT 1
    `, {
      replacements: { companyId },
      type: sequelize.QueryTypes.SELECT
    });

    if (branchResult.length === 0) {
      console.log(`⚠️ [LOCATION] No se encontró sucursal con coordenadas para empresa ${companyId}`);
      return res.json({
        success: true,
        data: null,
        message: 'No hay sucursal con coordenadas configuradas'
      });
    }

    const branch = branchResult[0];
    console.log(`✅ [LOCATION] Sucursal encontrada: ${branch.name} (${branch.latitude}, ${branch.longitude})`);

    res.json({
      success: true,
      data: {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        latitude: parseFloat(branch.latitude),
        longitude: parseFloat(branch.longitude),
        radius: branch.radius || 50,
        isMain: branch.is_main
      }
    });

  } catch (error) {
    console.error('❌ [LOCATION] Error obteniendo ubicación de sucursal:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Simple geofence check function (to be enhanced)
function checkGeofence(latitude, longitude) {
  // For demo purposes, define a simple circular geofence
  // In production, this would check against configured geofences
  const workplaceCenter = {
    lat: -34.6037,  // Example: Buenos Aires coordinates
    lng: -58.3816
  };
  const radiusKm = 1.0; // 1km radius

  const distance = calculateDistance(latitude, longitude, workplaceCenter.lat, workplaceCenter.lng);
  return distance <= radiusKm;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

module.exports = router;