import FleetTrackingSession from '../models/FleetTrackingSessionModel.js';
import FleetLocationPoint from '../models/FleetLocationPointModel.js';
import FleetTrip from '../models/FleetTripModel.js';
import FleetGeofence from '../models/FleetGeofenceModel.js';
import FleetAlert from '../models/FleetAlertModel.js';
import FleetVehicle from '../models/FleetVehicleModel.js';

// Fórmula de Haversine para calcular distância em km entre duas coordenadas GPS
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Verificar se um ponto está dentro de uma geofence circular
export const isPointInGeofence = (lat, lon, fence) => {
  const distKm = calculateDistanceKm(lat, lon, fence.centerLatitude, fence.centerLongitude);
  const distMeters = distKm * 1000;
  return distMeters <= fence.radiusMeters;
};

// Iniciar Sessão de Tracking (Quando o motorista fica ONLINE)
export const startTrackingSession = async (driverId, vehicleId, partnerId, lat, lon) => {
  // Encerrar sessão ativa prévia se existir
  const activeSession = await FleetTrackingSession.findOne({ driver: driverId, status: 'ACTIVE' });
  if (activeSession) {
    activeSession.status = 'COMPLETED';
    activeSession.endedAt = new Date();
    await activeSession.save();
  }

  // Tentar encontrar viatura se não foi enviada
  if (!vehicleId) {
    const v = await FleetVehicle.findOne({ assignedDriver: driverId, isDeleted: false });
    if (v) vehicleId = v._id;
  }

  if (!vehicleId) {
    // Buscar fallback partner ou veículo genérico do motorista
    const defaultVehicle = await FleetVehicle.findOne({ partner: partnerId, isDeleted: false });
    if (defaultVehicle) vehicleId = defaultVehicle._id;
  }

  const session = new FleetTrackingSession({
    driver: driverId,
    vehicle: vehicleId,
    partner: partnerId,
    startedAt: new Date(),
    startLatitude: lat || -25.9692,
    startLongitude: lon || 32.5732,
    status: 'ACTIVE',
  });

  await session.save();
  return session;
};

// Encerrar Sessão de Tracking (Quando o motorista fica OFFLINE)
export const endTrackingSession = async (driverId, endLat, endLon) => {
  const session = await FleetTrackingSession.findOne({ driver: driverId, status: 'ACTIVE' });
  if (!session) return null;

  const points = await FleetLocationPoint.find({ sessionId: session._id }).sort({ capturedAt: 1 });

  session.status = 'COMPLETED';
  session.endedAt = new Date();
  if (endLat && endLon) {
    session.endLatitude = endLat;
    session.endLongitude = endLon;
  } else if (points.length > 0) {
    const lastP = points[points.length - 1];
    session.endLatitude = lastP.latitude;
    session.endLongitude = lastP.longitude;
  }

  // Recalcular totais consolidados da sessão
  let totalDist = 0;
  let maxSpeed = 0;
  let speedSum = 0;
  let validSpeedCount = 0;

  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      const pPrev = points[i - 1];
      const pCurr = points[i];
      const d = calculateDistanceKm(pPrev.latitude, pPrev.longitude, pCurr.latitude, pCurr.longitude);
      if (d < 10) { // Ignorar saltos irreais de GPS (>10km entre pings)
        totalDist += d;
      }
    }

    const spd = points[i].speedKmh || 0;
    if (spd > maxSpeed) maxSpeed = spd;
    if (spd > 0) {
      speedSum += spd;
      validSpeedCount++;
    }
  }

  const totalSecs = Math.max(1, Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000));
  session.totalDurationSeconds = totalSecs;
  session.totalDistanceKm = Number(totalDist.toFixed(2));
  session.maxSpeedKmh = Math.round(maxSpeed);
  session.averageSpeedKmh = validSpeedCount > 0 ? Math.round(speedSum / validSpeedCount) : 0;

  // Finalizar qualquer viagem aberta nesta sessão
  const openTrip = await FleetTrip.findOne({ sessionId: session._id, status: 'MOVING' });
  if (openTrip) {
    openTrip.status = 'COMPLETED';
    openTrip.endedAt = new Date();
    openTrip.endLatitude = session.endLatitude;
    openTrip.endLongitude = session.endLongitude;
    openTrip.durationSeconds = Math.round((openTrip.endedAt.getTime() - openTrip.startedAt.getTime()) / 1000);
    await openTrip.save();
  }

  await session.save();
  return session;
};

// Processar Ingestão de Pontos de Localização (Um ou Em Lote)
export const ingestLocationPoints = async (driverId, pointsData, ioServer = null) => {
  if (!Array.isArray(pointsData)) {
    pointsData = [pointsData];
  }

  if (pointsData.length === 0) return { insertedCount: 0 };

  // Buscar sessão ativa do motorista ou criar automaticamente se necessário
  let session = await FleetTrackingSession.findOne({ driver: driverId, status: 'ACTIVE' });
  const firstP = pointsData[0];

  if (!session) {
    const driverVehicle = await FleetVehicle.findOne({ assignedDriver: driverId, isDeleted: false });
    const partnerId = driverVehicle ? driverVehicle.partner : firstP.partner || driverId;
    const vehicleId = driverVehicle ? driverVehicle._id : firstP.vehicleId;

    session = await startTrackingSession(
      driverId,
      vehicleId,
      partnerId,
      firstP.latitude || firstP.lat,
      firstP.longitude || firstP.lng
    );
  }

  const vehicle = await FleetVehicle.findById(session.vehicle);
  const speedLimit = vehicle?.speedLimitKmh || 80;
  const activeGeofences = await FleetGeofence.find({ partner: session.partner, active: true });

  const pointsToInsert = [];
  let lastSavedPoint = await FleetLocationPoint.findOne({ sessionId: session._id }).sort({ capturedAt: -1 });

  for (const rawP of pointsData) {
    const lat = Number(rawP.latitude ?? rawP.lat);
    const lon = Number(rawP.longitude ?? rawP.lng);
    const accuracy = Number(rawP.accuracy ?? 10);
    const speed = Number(rawP.speedKmh ?? rawP.speed ?? 0);
    const heading = Number(rawP.heading ?? 0);
    const altitude = Number(rawP.altitude ?? 0);
    const battery = rawP.batteryLevel !== undefined ? Number(rawP.batteryLevel) : null;
    const capturedAt = rawP.capturedAt ? new Date(rawP.capturedAt) : (rawP.timestamp ? new Date(rawP.timestamp) : new Date());

    // Filtragem de pontos claramente inválidos (precisão muito fraca > 100m ou lat/lon fora dos limites)
    if (isNaN(lat) || isNaN(lon) || accuracy > 100 || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      continue;
    }

    // Evitar salvar pontos exatamente idênticos duplicados
    if (lastSavedPoint && lastSavedPoint.latitude === lat && lastSavedPoint.longitude === lon && Math.abs(capturedAt.getTime() - lastSavedPoint.capturedAt.getTime()) < 3000) {
      continue;
    }

    const newPoint = {
      sessionId: session._id,
      driver: session.driver,
      vehicle: session.vehicle,
      partner: session.partner,
      latitude: lat,
      longitude: lon,
      accuracy,
      speedKmh: Math.round(speed),
      heading,
      altitude,
      batteryLevel: battery,
      provider: rawP.provider || 'gps',
      capturedAt,
      receivedAt: new Date(),
      syncStatus: 'SYNCED',
    };

    pointsToInsert.push(newPoint);

    // 1. Verificação de Excesso de Velocidade
    if (speed > speedLimit) {
      // Evitar registrar alertas repetidos a cada 5 segundos (deve haver 3 minutos de intervalo entre alertas de velocidade do mesmo tipo)
      const recentAlert = await FleetAlert.findOne({
        vehicle: session.vehicle,
        alertType: 'SPEED_LIMIT_EXCEEDED',
        createdAt: { $gte: new Date(Date.now() - 3 * 60 * 1000) },
      });

      if (!recentAlert) {
        await FleetAlert.create({
          vehicle: session.vehicle,
          driver: session.driver,
          partner: session.partner,
          alertType: 'SPEED_LIMIT_EXCEEDED',
          title: `Excesso de Velocidade: ${Math.round(speed)} km/h`,
          message: `O motorista registou velocidade de ${Math.round(speed)} km/h (Limite: ${speedLimit} km/h).`,
          status: 'PENDING',
          details: {
            speed: Math.round(speed),
            speedLimit,
            latitude: lat,
            longitude: lon,
          },
        });
      }
    }

    // 2. Verificação de Geofences (Entrada / Saída)
    for (const fence of activeGeofences) {
      const isInside = isPointInGeofence(lat, lon, fence);
      const wasInside = lastSavedPoint ? isPointInGeofence(lastSavedPoint.latitude, lastSavedPoint.longitude, fence) : false;

      if (isInside && !wasInside) {
        await FleetAlert.create({
          vehicle: session.vehicle,
          driver: session.driver,
          partner: session.partner,
          alertType: 'GEOFENCE_ENTER',
          title: `Entrada em Geofence: ${fence.name}`,
          message: `Veículo entrou na zona ${fence.name} (${fence.type}).`,
          status: 'PENDING',
          details: { geofenceId: fence._id, fenceName: fence.name, latitude: lat, longitude: lon },
        });
      } else if (!isInside && wasInside) {
        await FleetAlert.create({
          vehicle: session.vehicle,
          driver: session.driver,
          partner: session.partner,
          alertType: 'GEOFENCE_EXIT',
          title: `Saída de Geofence: ${fence.name}`,
          message: `Veículo saiu da zona ${fence.name} (${fence.type}).`,
          status: 'PENDING',
          details: { geofenceId: fence._id, fenceName: fence.name, latitude: lat, longitude: lon },
        });
      }
    }

    // 3. Detecção Automática de Viagem (Movimento vs Paragem)
    let activeTrip = await FleetTrip.findOne({ sessionId: session._id, status: 'MOVING' });

    if (speed > 5) { // Veículo em movimento (> 5 km/h)
      if (!activeTrip) {
        activeTrip = await FleetTrip.create({
          sessionId: session._id,
          driver: session.driver,
          vehicle: session.vehicle,
          partner: session.partner,
          startedAt: capturedAt,
          startLatitude: lat,
          startLongitude: lon,
          status: 'MOVING',
        });
      } else {
        // Atualizar estatísticas da viagem em curso
        const distAdd = lastSavedPoint ? calculateDistanceKm(lastSavedPoint.latitude, lastSavedPoint.longitude, lat, lon) : 0;
        activeTrip.distanceKm = Number((activeTrip.distanceKm + distAdd).toFixed(2));
        activeTrip.durationSeconds = Math.round((capturedAt.getTime() - activeTrip.startedAt.getTime()) / 1000);
        if (speed > activeTrip.maxSpeedKmh) activeTrip.maxSpeedKmh = Math.round(speed);
        await activeTrip.save();
      }
    } else if (speed === 0 && activeTrip) {
      // Se parado há mais de 3 minutos, encerra a viagem
      const secondsSinceLastMove = Math.round((capturedAt.getTime() - (lastSavedPoint ? lastSavedPoint.capturedAt.getTime() : capturedAt.getTime())) / 1000);
      if (secondsSinceLastMove > 180) {
        activeTrip.status = 'COMPLETED';
        activeTrip.endedAt = capturedAt;
        activeTrip.endLatitude = lat;
        activeTrip.endLongitude = lon;
        activeTrip.durationSeconds = Math.round((capturedAt.getTime() - activeTrip.startedAt.getTime()) / 1000);
        await activeTrip.save();
      }
    }

    lastSavedPoint = newPoint;
  }

  if (pointsToInsert.length > 0) {
    await FleetLocationPoint.insertMany(pointsToInsert);

    // Atualizar odómetro e posição da sessão
    const lastP = pointsToInsert[pointsToInsert.length - 1];
    let addedDist = 0;
    for (let i = 1; i < pointsToInsert.length; i++) {
      addedDist += calculateDistanceKm(pointsToInsert[i - 1].latitude, pointsToInsert[i - 1].longitude, pointsToInsert[i].latitude, pointsToInsert[i].longitude);
    }

    session.totalDistanceKm = Number((session.totalDistanceKm + addedDist).toFixed(2));
    session.endLatitude = lastP.latitude;
    session.endLongitude = lastP.longitude;
    await session.save();

    if (vehicle && addedDist > 0) {
      vehicle.currentOdometer = Number((vehicle.currentOdometer + addedDist).toFixed(2));
      await vehicle.save();
    }

    // Emitir Socket em tempo real se IO server estiver ativo
    if (ioServer) {
      ioServer.emit('fleet_location_update', {
        driverId: session.driver,
        vehicleId: session.vehicle,
        partnerId: session.partner,
        latitude: lastP.latitude,
        longitude: lastP.longitude,
        speedKmh: lastP.speedKmh,
        heading: lastP.heading,
        batteryLevel: lastP.batteryLevel,
        capturedAt: lastP.capturedAt,
      });
    }
  }

  return { insertedCount: pointsToInsert.length, sessionId: session._id };
};
