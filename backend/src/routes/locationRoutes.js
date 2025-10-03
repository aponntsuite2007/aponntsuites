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
router.get('/current', auth, async (req, res) => {
  try {
    // Only admin/supervisor can view all locations
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores y supervisores pueden ver ubicaciones de empleados'
      });
    }

    // Get latest location for each user in working hours
    const currentLocations = await EmployeeLocation.findAll({
      attributes: [
        'id', 'userId', 'latitude', 'longitude', 'accuracy', 
        'currentActivity', 'isWorkingHours', 'isOnBreak', 'isInGeofence',
        'batteryLevel', 'connectionType', 'address', 'reportedAt'
      ],
      where: {
        isWorkingHours: true,
        reportedAt: {
          [require('sequelize').Op.gte]: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        }
      },
      include: [{
        model: User,
        as: 'employee',
        attributes: ['id', 'firstName', 'lastName', 'employeeId', 'role']
      }],
      order: [['reportedAt', 'DESC']],
      limit: 100 // Limit for performance
    });

    // Group by userId to get latest location per employee
    const latestLocations = {};
    currentLocations.forEach(location => {
      if (!latestLocations[location.userId] || 
          location.reportedAt > latestLocations[location.userId].reportedAt) {
        latestLocations[location.userId] = location;
      }
    });

    const result = Object.values(latestLocations).map(loc => ({
      id: loc.id,
      employee: {
        id: loc.employee.id,
        name: `${loc.employee.firstName} ${loc.employee.lastName}`,
        employeeId: loc.employee.employeeId,
        role: loc.employee.role
      },
      location: {
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        accuracy: loc.accuracy,
        address: loc.address
      },
      status: {
        activity: loc.currentActivity,
        isOnBreak: loc.isOnBreak,
        isInGeofence: loc.isInGeofence,
        batteryLevel: loc.batteryLevel,
        connectionType: loc.connectionType
      },
      reportedAt: loc.reportedAt
    }));

    res.json({
      success: true,
      data: result,
      count: result.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error obteniendo ubicaciones actuales:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
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