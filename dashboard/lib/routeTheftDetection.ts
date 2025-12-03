// lib/routeTheftDetection.ts
/**
 * Route Anomaly and Theft Detection Module (Sub-project D)
 * 
 * Implements GPS-based route monitoring and theft detection for Smart TOTE.
 * Features:
 * - Route deviation detection using Haversine distance
 * - Geofencing with polygon-based zones
 * - Suspicious stop detection
 * - BLE Padlock/pressure sensor integration simulation
 * - ETA prediction with weather/traffic context
 * - Learning-to-rank alert prioritization
 * 
 * Reference: AI應用躍昇計畫 - 分項計畫D
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GPSPoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
  speed?: number;         // km/h
  heading?: number;       // degrees (0-360)
  altitude?: number;      // meters
  accuracy?: number;      // meters
}

export interface RouteWaypoint extends GPSPoint {
  waypointId: string;
  name: string;
  type: 'origin' | 'destination' | 'checkpoint' | 'port' | 'warehouse' | 'customs';
  expectedArrival?: Date;
  actualArrival?: Date;
  dwellTime?: number;     // minutes
}

export interface Geofence {
  id: string;
  name: string;
  type: 'authorized' | 'restricted' | 'high_risk';
  polygon: GPSPoint[];    // Vertices of the polygon
  radius?: number;        // For circular geofences (meters)
  center?: GPSPoint;      // For circular geofences
}

export interface SmartTOTEStatus {
  deviceId: string;
  timestamp: Date;
  padlockStatus: 'locked' | 'unlocked' | 'tampered';
  pressureSensor: number;         // 0-100 (normalized)
  lightSensor: number;            // 0-100 (0=dark, 100=bright)
  accelerometer: {
    x: number;
    y: number;
    z: number;
  };
  bleSignalStrength: number;      // dBm
  batteryLevel: number;           // percentage
}

export interface RouteAnomaly {
  id: string;
  shipmentId: string;
  deviceId: string;
  timestamp: Date;
  type: 'route_deviation' | 'unauthorized_stop' | 'geofence_violation' | 
        'speed_anomaly' | 'unauthorized_opening' | 'tamper_detected' |
        'extended_stop' | 'off_schedule';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: GPSPoint;
  description: string;
  confidence: number;             // 0-1
  contextFactors: string[];       // e.g., ['heavy_traffic', 'night_time']
  recommendation: string;
  isLegitimate?: boolean;         // After investigation
}

export interface ETAPrediction {
  shipmentId: string;
  destination: RouteWaypoint;
  predictedArrival: Date;
  confidence: number;
  maeHours: number;               // Mean Absolute Error
  factors: {
    weather: string;
    traffic: string;
    historicalDelay: number;      // hours
  };
}

export interface AlertPriority {
  anomalyId: string;
  priorityScore: number;          // 0-100
  rank: number;
  factors: {
    severity: number;
    cargoValue: number;
    timeInAnomaly: number;
    historyScore: number;
    contextScore: number;
  };
}

// ============================================================================
// HAVERSINE DISTANCE CALCULATION
// ============================================================================

/**
 * Calculate the great-circle distance between two points
 * @returns Distance in kilometers
 */
export function haversineDistance(
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth's radius in km
  
  const lat1 = point1.latitude * Math.PI / 180;
  const lat2 = point2.latitude * Math.PI / 180;
  const deltaLat = (point2.latitude - point1.latitude) * Math.PI / 180;
  const deltaLon = (point2.longitude - point1.longitude) * Math.PI / 180;
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Calculate distance from point to route segment
 */
export function distanceToRouteSegment(
  point: GPSPoint,
  segmentStart: GPSPoint,
  segmentEnd: GPSPoint
): number {
  // Project point onto the line segment
  const dx = segmentEnd.longitude - segmentStart.longitude;
  const dy = segmentEnd.latitude - segmentStart.latitude;
  
  if (dx === 0 && dy === 0) {
    // Segment is a point
    return haversineDistance(point, segmentStart);
  }
  
  // Parameter t for the projection
  const t = Math.max(0, Math.min(1, (
    (point.longitude - segmentStart.longitude) * dx +
    (point.latitude - segmentStart.latitude) * dy
  ) / (dx * dx + dy * dy)));
  
  const projection = {
    latitude: segmentStart.latitude + t * dy,
    longitude: segmentStart.longitude + t * dx,
  };
  
  return haversineDistance(point, projection);
}

// ============================================================================
// GEOFENCING
// ============================================================================

/**
 * Check if a point is inside a polygon (Ray casting algorithm)
 */
export function isPointInPolygon(
  point: GPSPoint,
  polygon: GPSPoint[]
): boolean {
  if (polygon.length < 3) return false;
  
  let inside = false;
  const x = point.longitude;
  const y = point.latitude;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;
    
    if (((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

/**
 * Check if a point is inside a circular geofence
 */
export function isPointInCircle(
  point: GPSPoint,
  center: GPSPoint,
  radiusKm: number
): boolean {
  const distance = haversineDistance(point, center);
  return distance <= radiusKm;
}

/**
 * Check geofence violations
 */
export function checkGeofenceViolation(
  point: GPSPoint,
  geofences: Geofence[]
): Geofence | null {
  for (const geofence of geofences) {
    if (geofence.type === 'restricted' || geofence.type === 'high_risk') {
      // Check polygon
      if (geofence.polygon && geofence.polygon.length >= 3) {
        if (isPointInPolygon(point, geofence.polygon)) {
          return geofence;
        }
      }
      // Check circle
      if (geofence.center && geofence.radius) {
        if (isPointInCircle(point, geofence.center, geofence.radius / 1000)) {
          return geofence;
        }
      }
    }
  }
  return null;
}

// ============================================================================
// ROUTE DEVIATION DETECTION
// ============================================================================

/**
 * Check if current position deviates from planned route
 */
export function detectRouteDeviation(
  currentPosition: GPSPoint,
  plannedRoute: GPSPoint[],
  thresholdKm: number = 5.0
): { isDeviated: boolean; distanceKm: number; nearestSegmentIndex: number } {
  if (plannedRoute.length < 2) {
    return { isDeviated: false, distanceKm: 0, nearestSegmentIndex: 0 };
  }
  
  let minDistance = Infinity;
  let nearestSegmentIndex = 0;
  
  for (let i = 0; i < plannedRoute.length - 1; i++) {
    const distance = distanceToRouteSegment(
      currentPosition,
      plannedRoute[i],
      plannedRoute[i + 1]
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestSegmentIndex = i;
    }
  }
  
  return {
    isDeviated: minDistance > thresholdKm,
    distanceKm: minDistance,
    nearestSegmentIndex,
  };
}

// ============================================================================
// SUSPICIOUS STOP DETECTION
// ============================================================================

export interface StopEvent {
  startTime: Date;
  endTime?: Date;
  location: GPSPoint;
  durationMinutes: number;
  isAuthorized: boolean;
  nearestWaypoint?: RouteWaypoint;
}

/**
 * Detect stops from GPS track
 */
export function detectStops(
  gpsTrack: GPSPoint[],
  speedThreshold: number = 2,    // km/h to consider stopped
  minDurationMinutes: number = 5
): StopEvent[] {
  const stops: StopEvent[] = [];
  let stopStart: GPSPoint | null = null;
  
  for (let i = 0; i < gpsTrack.length; i++) {
    const point = gpsTrack[i];
    const speed = point.speed ?? 0;
    
    if (speed < speedThreshold) {
      if (!stopStart) {
        stopStart = point;
      }
    } else {
      if (stopStart) {
        const duration = (point.timestamp.getTime() - stopStart.timestamp.getTime()) / 60000;
        
        if (duration >= minDurationMinutes) {
          stops.push({
            startTime: stopStart.timestamp,
            endTime: point.timestamp,
            location: stopStart,
            durationMinutes: duration,
            isAuthorized: false, // Will be checked against waypoints
          });
        }
        stopStart = null;
      }
    }
  }
  
  // Handle ongoing stop
  if (stopStart && gpsTrack.length > 0) {
    const lastPoint = gpsTrack[gpsTrack.length - 1];
    const duration = (lastPoint.timestamp.getTime() - stopStart.timestamp.getTime()) / 60000;
    
    if (duration >= minDurationMinutes) {
      stops.push({
        startTime: stopStart.timestamp,
        location: stopStart,
        durationMinutes: duration,
        isAuthorized: false,
      });
    }
  }
  
  return stops;
}

/**
 * Check if stop is at an authorized waypoint
 */
export function isAuthorizedStop(
  stop: StopEvent,
  waypoints: RouteWaypoint[],
  toleranceKm: number = 1.0
): boolean {
  for (const waypoint of waypoints) {
    const distance = haversineDistance(stop.location, waypoint);
    if (distance <= toleranceKm) {
      stop.nearestWaypoint = waypoint;
      return true;
    }
  }
  return false;
}

// ============================================================================
// SMART TOTE TAMPER DETECTION
// ============================================================================

/**
 * Analyze Smart TOTE sensor data for tamper detection
 */
export function detectTamperEvent(
  current: SmartTOTEStatus,
  previous: SmartTOTEStatus | null,
  thresholds: {
    pressureDropThreshold: number;    // Significant pressure drop (%)
    lightThreshold: number;           // Light indicating box opening
    accelerometerThreshold: number;   // Shock/impact detection
  } = {
    pressureDropThreshold: 20,
    lightThreshold: 30,
    accelerometerThreshold: 2.0,  // g-force
  }
): RouteAnomaly | null {
  const anomalyBase = {
    shipmentId: '', // Will be filled by caller
    deviceId: current.deviceId,
    timestamp: current.timestamp,
    location: { latitude: 0, longitude: 0, timestamp: current.timestamp }, // Will be filled
    contextFactors: [],
    confidence: 0,
  };
  
  // Check padlock status
  if (current.padlockStatus === 'tampered') {
    return {
      ...anomalyBase,
      id: `TAMPER_PADLOCK_${current.timestamp.getTime()}`,
      type: 'tamper_detected',
      severity: 'critical',
      description: 'BLE Padlock tamper detected - possible forced entry',
      confidence: 0.95,
      recommendation: 'IMMEDIATE: Contact driver, verify cargo integrity, alert security',
    };
  }
  
  // Check unauthorized unlock
  if (current.padlockStatus === 'unlocked' && 
      previous?.padlockStatus === 'locked') {
    return {
      ...anomalyBase,
      id: `UNAUTHORIZED_UNLOCK_${current.timestamp.getTime()}`,
      type: 'unauthorized_opening',
      severity: 'high',
      description: 'Padlock unlocked without scheduled stop - investigate',
      confidence: 0.85,
      recommendation: 'Verify if this is an authorized access',
    };
  }
  
  // Check sudden pressure drop (box opening)
  if (previous && (previous.pressureSensor - current.pressureSensor) > thresholds.pressureDropThreshold) {
    return {
      ...anomalyBase,
      id: `PRESSURE_DROP_${current.timestamp.getTime()}`,
      type: 'unauthorized_opening',
      severity: 'high',
      description: `Sudden pressure drop detected (${previous.pressureSensor}% → ${current.pressureSensor}%) - possible box opening`,
      confidence: 0.80,
      recommendation: 'Check if box was opened for authorized reasons',
    };
  }
  
  // Check light sensor (box opened)
  if (current.lightSensor > thresholds.lightThreshold && 
      (!previous || previous.lightSensor <= 5)) {
    return {
      ...anomalyBase,
      id: `LIGHT_DETECTED_${current.timestamp.getTime()}`,
      type: 'unauthorized_opening',
      severity: 'medium',
      description: `Light detected inside container (${current.lightSensor}%) - box may be open`,
      confidence: 0.75,
      recommendation: 'Verify container seal status',
    };
  }
  
  // Check for impact/shock
  const acceleration = Math.sqrt(
    Math.pow(current.accelerometer.x, 2) +
    Math.pow(current.accelerometer.y, 2) +
    Math.pow(current.accelerometer.z, 2)
  );
  
  if (acceleration > thresholds.accelerometerThreshold) {
    return {
      ...anomalyBase,
      id: `SHOCK_${current.timestamp.getTime()}`,
      type: 'tamper_detected',
      severity: 'medium',
      description: `Significant impact detected (${acceleration.toFixed(2)}g) - possible rough handling or collision`,
      confidence: 0.70,
      recommendation: 'Review for cargo damage upon delivery',
    };
  }
  
  return null;
}

// ============================================================================
// ETA PREDICTION
// ============================================================================

/**
 * Simple ETA prediction based on distance and historical data
 */
export function predictETA(
  currentPosition: GPSPoint,
  destination: RouteWaypoint,
  averageSpeed: number,              // km/h
  weatherDelay: number = 0,          // hours
  trafficDelay: number = 0,          // hours
  historicalDelay: number = 0        // hours
): ETAPrediction {
  const remainingDistance = haversineDistance(currentPosition, destination);
  const baseHours = remainingDistance / averageSpeed;
  
  const totalDelay = weatherDelay + trafficDelay + historicalDelay;
  const totalHours = baseHours + totalDelay;
  
  const predictedArrival = new Date(
    currentPosition.timestamp.getTime() + totalHours * 3600000
  );
  
  // Confidence decreases with distance and delays
  const confidence = Math.max(0.5, 1 - (totalDelay / 10) - (remainingDistance / 10000));
  
  return {
    shipmentId: '', // Will be filled by caller
    destination,
    predictedArrival,
    confidence,
    maeHours: 0.5 + totalDelay * 0.2, // Simplified MAE estimation
    factors: {
      weather: weatherDelay > 0 ? 'adverse' : 'clear',
      traffic: trafficDelay > 0 ? 'congested' : 'normal',
      historicalDelay,
    },
  };
}

// ============================================================================
// ALERT PRIORITIZATION (Learning-to-Rank inspired)
// ============================================================================

/**
 * Calculate priority score for an anomaly
 */
export function calculateAlertPriority(
  anomaly: RouteAnomaly,
  cargoValueUSD: number = 10000,
  timeInAnomalyMinutes: number = 0,
  historicalFalsePositiveRate: number = 0.1
): AlertPriority {
  // Severity weights
  const severityScores: Record<string, number> = {
    critical: 40,
    high: 30,
    medium: 20,
    low: 10,
  };
  
  // Cargo value factor (normalized, log scale)
  const cargoFactor = Math.min(25, Math.log10(cargoValueUSD + 1) * 5);
  
  // Time in anomaly factor (escalates with time)
  const timeFactor = Math.min(20, timeInAnomalyMinutes / 3);
  
  // Historical accuracy (penalize if high false positive rate)
  const historyScore = Math.max(0, 15 * (1 - historicalFalsePositiveRate));
  
  // Context factors
  let contextScore = 0;
  if (anomaly.contextFactors.includes('night_time')) contextScore += 5;
  if (anomaly.contextFactors.includes('remote_area')) contextScore += 5;
  if (anomaly.contextFactors.includes('high_crime_area')) contextScore += 10;
  
  const priorityScore = 
    severityScores[anomaly.severity] +
    cargoFactor +
    timeFactor +
    historyScore +
    contextScore;
  
  return {
    anomalyId: anomaly.id,
    priorityScore: Math.min(100, priorityScore),
    rank: 0, // Will be set after sorting
    factors: {
      severity: severityScores[anomaly.severity],
      cargoValue: cargoFactor,
      timeInAnomaly: timeFactor,
      historyScore,
      contextScore,
    },
  };
}

/**
 * Rank alerts by priority
 */
export function rankAlerts(
  anomalies: RouteAnomaly[],
  cargoValueUSD: number = 10000
): AlertPriority[] {
  const priorities = anomalies.map((anomaly, index) => {
    // Calculate time since anomaly
    const timeInAnomaly = (Date.now() - anomaly.timestamp.getTime()) / 60000;
    return calculateAlertPriority(anomaly, cargoValueUSD, timeInAnomaly, 0.1);
  });
  
  // Sort by priority score descending
  priorities.sort((a, b) => b.priorityScore - a.priorityScore);
  
  // Assign ranks
  priorities.forEach((p, index) => {
    p.rank = index + 1;
  });
  
  return priorities;
}

// ============================================================================
// COMPREHENSIVE ROUTE ANALYSIS
// ============================================================================

export interface RouteAnalysisResult {
  shipmentId: string;
  deviceId: string;
  analysisTimestamp: Date;
  currentPosition: GPSPoint;
  routeStatus: 'on_track' | 'minor_deviation' | 'major_deviation' | 'anomaly_detected';
  anomalies: RouteAnomaly[];
  alerts: AlertPriority[];
  eta: ETAPrediction | null;
  statistics: {
    totalDistance: number;
    distanceTraveled: number;
    progressPercent: number;
    averageSpeed: number;
    stopsCount: number;
    unauthorizedStops: number;
    deviationCount: number;
  };
  aiSummary: string;
}

/**
 * Perform comprehensive route analysis
 */
export function analyzeRoute(
  shipmentId: string,
  deviceId: string,
  gpsTrack: GPSPoint[],
  plannedRoute: GPSPoint[],
  waypoints: RouteWaypoint[],
  geofences: Geofence[],
  toteStatus: SmartTOTEStatus[],
  cargoValueUSD: number = 10000
): RouteAnalysisResult {
  const anomalies: RouteAnomaly[] = [];
  
  if (gpsTrack.length === 0) {
    return {
      shipmentId,
      deviceId,
      analysisTimestamp: new Date(),
      currentPosition: { latitude: 0, longitude: 0, timestamp: new Date() },
      routeStatus: 'anomaly_detected',
      anomalies: [{
        id: 'NO_GPS_DATA',
        shipmentId,
        deviceId,
        timestamp: new Date(),
        type: 'off_schedule',
        severity: 'critical',
        location: { latitude: 0, longitude: 0, timestamp: new Date() },
        description: 'No GPS data received - possible device failure or signal loss',
        confidence: 1.0,
        contextFactors: [],
        recommendation: 'Contact driver immediately to verify shipment status',
      }],
      alerts: [],
      eta: null,
      statistics: {
        totalDistance: 0,
        distanceTraveled: 0,
        progressPercent: 0,
        averageSpeed: 0,
        stopsCount: 0,
        unauthorizedStops: 0,
        deviationCount: 0,
      },
      aiSummary: 'Critical: No GPS data available for this shipment.',
    };
  }
  
  const currentPosition = gpsTrack[gpsTrack.length - 1];
  
  // ========================================================================
  // Route Deviation Analysis
  // ========================================================================
  
  let deviationCount = 0;
  for (const point of gpsTrack) {
    const deviation = detectRouteDeviation(point, plannedRoute, 5.0);
    if (deviation.isDeviated) {
      deviationCount++;
      
      // Only create anomaly for significant deviations
      if (deviation.distanceKm > 10) {
        anomalies.push({
          id: `DEVIATION_${point.timestamp.getTime()}`,
          shipmentId,
          deviceId,
          timestamp: point.timestamp,
          type: 'route_deviation',
          severity: deviation.distanceKm > 20 ? 'high' : 'medium',
          location: point,
          description: `Route deviation of ${deviation.distanceKm.toFixed(1)} km from planned route`,
          confidence: 0.85,
          contextFactors: [],
          recommendation: 'Verify with driver if this is an authorized detour',
        });
      }
    }
  }
  
  // ========================================================================
  // Stop Analysis
  // ========================================================================
  
  const stops = detectStops(gpsTrack);
  let unauthorizedStops = 0;
  
  for (const stop of stops) {
    stop.isAuthorized = isAuthorizedStop(stop, waypoints);
    
    if (!stop.isAuthorized) {
      unauthorizedStops++;
      
      if (stop.durationMinutes > 30) {
        anomalies.push({
          id: `UNAUTH_STOP_${stop.startTime.getTime()}`,
          shipmentId,
          deviceId,
          timestamp: stop.startTime,
          type: 'unauthorized_stop',
          severity: stop.durationMinutes > 60 ? 'high' : 'medium',
          location: stop.location,
          description: `Unauthorized stop for ${stop.durationMinutes.toFixed(0)} minutes`,
          confidence: 0.80,
          contextFactors: [],
          recommendation: 'Contact driver to verify reason for stop',
        });
      }
    }
  }
  
  // ========================================================================
  // Geofence Analysis
  // ========================================================================
  
  for (const point of gpsTrack) {
    const violation = checkGeofenceViolation(point, geofences);
    if (violation) {
      anomalies.push({
        id: `GEOFENCE_${point.timestamp.getTime()}`,
        shipmentId,
        deviceId,
        timestamp: point.timestamp,
        type: 'geofence_violation',
        severity: violation.type === 'high_risk' ? 'critical' : 'high',
        location: point,
        description: `Entered ${violation.type} zone: ${violation.name}`,
        confidence: 0.95,
        contextFactors: [violation.type === 'high_risk' ? 'high_crime_area' : 'restricted_area'],
        recommendation: violation.type === 'high_risk' 
          ? 'IMMEDIATE: Alert security and verify driver safety'
          : 'Verify if entry to restricted zone was authorized',
      });
    }
  }
  
  // ========================================================================
  // Smart TOTE Tamper Detection
  // ========================================================================
  
  for (let i = 0; i < toteStatus.length; i++) {
    const current = toteStatus[i];
    const previous = i > 0 ? toteStatus[i - 1] : null;
    
    const tamperAnomaly = detectTamperEvent(current, previous);
    if (tamperAnomaly) {
      tamperAnomaly.shipmentId = shipmentId;
      // Try to associate with GPS location
      const nearestGPS = gpsTrack.reduce((nearest, point) => {
        const timeDiff = Math.abs(point.timestamp.getTime() - current.timestamp.getTime());
        const nearestDiff = Math.abs(nearest.timestamp.getTime() - current.timestamp.getTime());
        return timeDiff < nearestDiff ? point : nearest;
      });
      tamperAnomaly.location = nearestGPS;
      anomalies.push(tamperAnomaly);
    }
  }
  
  // ========================================================================
  // Calculate Statistics
  // ========================================================================
  
  let distanceTraveled = 0;
  for (let i = 1; i < gpsTrack.length; i++) {
    distanceTraveled += haversineDistance(gpsTrack[i - 1], gpsTrack[i]);
  }
  
  const totalDistance = plannedRoute.length >= 2
    ? plannedRoute.reduce((sum, point, i) => {
        if (i === 0) return 0;
        return sum + haversineDistance(plannedRoute[i - 1], point);
      }, 0)
    : distanceTraveled;
  
  const timeSpanHours = gpsTrack.length >= 2
    ? (gpsTrack[gpsTrack.length - 1].timestamp.getTime() - gpsTrack[0].timestamp.getTime()) / 3600000
    : 0;
  
  const averageSpeed = timeSpanHours > 0 ? distanceTraveled / timeSpanHours : 0;
  
  // ========================================================================
  // ETA Prediction
  // ========================================================================
  
  const destination = waypoints.find(w => w.type === 'destination');
  let eta: ETAPrediction | null = null;
  
  if (destination) {
    eta = predictETA(
      currentPosition,
      destination,
      Math.max(averageSpeed, 30), // Assume at least 30 km/h
      0, // Weather delay - would come from external service
      0, // Traffic delay - would come from external service
      0  // Historical delay
    );
    eta.shipmentId = shipmentId;
  }
  
  // ========================================================================
  // Priority Ranking
  // ========================================================================
  
  const alerts = rankAlerts(anomalies, cargoValueUSD);
  
  // ========================================================================
  // Determine Route Status
  // ========================================================================
  
  let routeStatus: RouteAnalysisResult['routeStatus'] = 'on_track';
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
  const highAnomalies = anomalies.filter(a => a.severity === 'high');
  
  if (criticalAnomalies.length > 0) {
    routeStatus = 'anomaly_detected';
  } else if (highAnomalies.length > 0 || deviationCount > 5) {
    routeStatus = 'major_deviation';
  } else if (anomalies.length > 0) {
    routeStatus = 'minor_deviation';
  }
  
  // ========================================================================
  // Generate AI Summary
  // ========================================================================
  
  let aiSummary = `**Route Analysis Summary**\n\n`;
  aiSummary += `📍 **Current Status**: ${routeStatus.replace('_', ' ').toUpperCase()}\n`;
  aiSummary += `📊 **Progress**: ${((distanceTraveled / totalDistance) * 100).toFixed(1)}% complete\n`;
  aiSummary += `🚗 **Distance Traveled**: ${distanceTraveled.toFixed(1)} km / ${totalDistance.toFixed(1)} km\n`;
  aiSummary += `⏱️ **Average Speed**: ${averageSpeed.toFixed(1)} km/h\n\n`;
  
  if (eta) {
    aiSummary += `⏰ **Predicted Arrival**: ${eta.predictedArrival.toISOString()}\n`;
    aiSummary += `   Confidence: ${(eta.confidence * 100).toFixed(0)}%\n\n`;
  }
  
  if (criticalAnomalies.length > 0) {
    aiSummary += `🚨 **CRITICAL ALERTS (${criticalAnomalies.length})**:\n`;
    for (const anomaly of criticalAnomalies) {
      aiSummary += `- ${anomaly.description}\n`;
      aiSummary += `  → ${anomaly.recommendation}\n`;
    }
    aiSummary += `\n`;
  }
  
  if (highAnomalies.length > 0) {
    aiSummary += `⚠️ **High Priority (${highAnomalies.length})**:\n`;
    for (const anomaly of highAnomalies.slice(0, 3)) {
      aiSummary += `- ${anomaly.description}\n`;
    }
    aiSummary += `\n`;
  }
  
  aiSummary += `📈 **Statistics**:\n`;
  aiSummary += `- Stops: ${stops.length} (${unauthorizedStops} unauthorized)\n`;
  aiSummary += `- Route Deviations: ${deviationCount}\n`;
  aiSummary += `- Total Anomalies: ${anomalies.length}\n`;
  
  return {
    shipmentId,
    deviceId,
    analysisTimestamp: new Date(),
    currentPosition,
    routeStatus,
    anomalies,
    alerts,
    eta,
    statistics: {
      totalDistance,
      distanceTraveled,
      progressPercent: (distanceTraveled / totalDistance) * 100,
      averageSpeed,
      stopsCount: stops.length,
      unauthorizedStops,
      deviationCount,
    },
    aiSummary,
  };
}

// ============================================================================
// MOCK DATA GENERATOR (for demo)
// ============================================================================

/**
 * Generate mock GPS track with anomalies for demo
 */
export function generateMockGPSTrack(
  startLat: number = 25.0330,    // Taipei
  startLon: number = 121.5654,
  endLat: number = 51.9225,      // Rotterdam
  endLon: number = 4.4792,
  hoursOfTravel: number = 168,   // 7 days
  injectAnomalies: boolean = true
): GPSPoint[] {
  const track: GPSPoint[] = [];
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - 7);
  
  const latStep = (endLat - startLat) / hoursOfTravel;
  const lonStep = (endLon - startLon) / hoursOfTravel;
  
  for (let hour = 0; hour <= hoursOfTravel; hour++) {
    let lat = startLat + latStep * hour + (Math.random() - 0.5) * 0.1;
    let lon = startLon + lonStep * hour + (Math.random() - 0.5) * 0.1;
    let speed = 30 + Math.random() * 20; // 30-50 km/h average for ship/truck
    
    // Inject anomalies
    if (injectAnomalies) {
      // Day 2: Route deviation
      if (hour >= 48 && hour <= 52) {
        lat += 2; // 2 degree deviation (~200km)
        lon += 1;
      }
      
      // Day 4: Unauthorized stop (low speed)
      if (hour >= 96 && hour <= 99) {
        speed = 0;
      }
      
      // Day 5: High-risk area entry (simulated coordinates)
      if (hour >= 120 && hour <= 122) {
        lat = 10.0; // Simulated high-risk area
        lon = 70.0;
      }
    }
    
    track.push({
      latitude: lat,
      longitude: lon,
      timestamp: new Date(startTime.getTime() + hour * 3600000),
      speed,
      heading: Math.atan2(lonStep, latStep) * 180 / Math.PI,
    });
  }
  
  return track;
}

/**
 * Generate mock Smart TOTE status with anomalies
 */
export function generateMockTOTEStatus(
  deviceId: string,
  hours: number = 168,
  injectAnomalies: boolean = true
): SmartTOTEStatus[] {
  const statuses: SmartTOTEStatus[] = [];
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - 7);
  
  for (let hour = 0; hour <= hours; hour++) {
    let padlockStatus: 'locked' | 'unlocked' | 'tampered' = 'locked';
    let pressureSensor = 85 + Math.random() * 5;
    let lightSensor = 2 + Math.random() * 3;
    
    // Inject anomalies
    if (injectAnomalies) {
      // Day 3: Unauthorized unlock
      if (hour === 72) {
        padlockStatus = 'unlocked';
        lightSensor = 50;
        pressureSensor = 60;
      }
      
      // Day 5: Tamper attempt
      if (hour === 120) {
        padlockStatus = 'tampered';
      }
    }
    
    statuses.push({
      deviceId,
      timestamp: new Date(startTime.getTime() + hour * 3600000),
      padlockStatus,
      pressureSensor,
      lightSensor,
      accelerometer: {
        x: (Math.random() - 0.5) * 0.2,
        y: (Math.random() - 0.5) * 0.2,
        z: 1 + (Math.random() - 0.5) * 0.1,
      },
      bleSignalStrength: -50 + Math.random() * 10,
      batteryLevel: 95 - hour * 0.1,
    });
  }
  
  return statuses;
}

// ============================================================================
// DEMO FUNCTION
// ============================================================================

/**
 * Run route/theft detection demo
 */
export function runRouteDetectionDemo(): RouteAnalysisResult {
  console.log('\n========================================');
  console.log('🗺️  Route & Theft Detection Demo');
  console.log('========================================\n');
  
  const shipmentId = 'SHP-2024-002';
  const deviceId = 'SMART-TOTE-42';
  
  // Generate mock data
  const gpsTrack = generateMockGPSTrack(25.0330, 121.5654, 51.9225, 4.4792, 168, true);
  const toteStatus = generateMockTOTEStatus(deviceId, 168, true);
  
  // Create planned route (simplified)
  const plannedRoute: GPSPoint[] = [
    { latitude: 25.0330, longitude: 121.5654, timestamp: new Date() }, // Taipei
    { latitude: 22.3193, longitude: 114.1694, timestamp: new Date() }, // Hong Kong
    { latitude: 1.3521, longitude: 103.8198, timestamp: new Date() },  // Singapore
    { latitude: 30.0444, longitude: 31.2357, timestamp: new Date() },  // Suez
    { latitude: 51.9225, longitude: 4.4792, timestamp: new Date() },   // Rotterdam
  ];
  
  // Create waypoints
  const waypoints: RouteWaypoint[] = [
    { ...plannedRoute[0], waypointId: 'WP-1', name: 'Taipei Port', type: 'origin' },
    { ...plannedRoute[2], waypointId: 'WP-2', name: 'Singapore Port', type: 'checkpoint' },
    { ...plannedRoute[4], waypointId: 'WP-3', name: 'Rotterdam Port', type: 'destination' },
  ];
  
  // Create geofences
  const geofences: Geofence[] = [
    {
      id: 'GF-HIGH-RISK-1',
      name: 'Gulf of Aden (High Piracy Risk)',
      type: 'high_risk',
      center: { latitude: 12.0, longitude: 48.0, timestamp: new Date() },
      radius: 300000, // 300km
      polygon: [],
    },
  ];
  
  console.log(`📦 Shipment: ${shipmentId}`);
  console.log(`📡 Device: ${deviceId}`);
  console.log(`📊 GPS Points: ${gpsTrack.length}`);
  console.log(`🔐 TOTE Status Records: ${toteStatus.length}\n`);
  
  // Run analysis
  const result = analyzeRoute(
    shipmentId,
    deviceId,
    gpsTrack,
    plannedRoute,
    waypoints,
    geofences,
    toteStatus,
    50000 // Cargo value: $50,000
  );
  
  console.log('📋 Analysis Results:');
  console.log(`   - Status: ${result.routeStatus}`);
  console.log(`   - Progress: ${result.statistics.progressPercent.toFixed(1)}%`);
  console.log(`   - Distance: ${result.statistics.distanceTraveled.toFixed(1)} / ${result.statistics.totalDistance.toFixed(1)} km`);
  console.log(`   - Anomalies: ${result.anomalies.length}`);
  console.log(`   - Unauthorized Stops: ${result.statistics.unauthorizedStops}`);
  
  if (result.eta) {
    console.log(`   - ETA: ${result.eta.predictedArrival.toISOString()}`);
  }
  
  console.log('\n🚨 Top Priority Alerts:');
  for (const alert of result.alerts.slice(0, 5)) {
    const anomaly = result.anomalies.find(a => a.id === alert.anomalyId);
    console.log(`   [Rank ${alert.rank}] Score: ${alert.priorityScore.toFixed(0)} - ${anomaly?.description}`);
  }
  
  console.log('\n========================================\n');
  
  return result;
}
