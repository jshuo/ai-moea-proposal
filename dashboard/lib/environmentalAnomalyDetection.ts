// lib/environmentalAnomalyDetection.ts
/**
 * Environmental Anomaly Detection Module (Sub-project C)
 * 
 * Implements temperature/humidity anomaly detection for sensitive cargo monitoring.
 * Features:
 * - CUSUM (Cumulative Sum) change point detection
 * - Statistical threshold monitoring
 * - Event correlation with box opening/route segments
 * - AI-powered event report generation
 * 
 * Reference: AI應用躍昇計畫 - 分項計畫C
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface EnvironmentTelemetry {
  shipmentId: string;
  containerId: string;
  timestamp: Date;
  temperature: number;      // Celsius
  humidity: number;         // Percentage (0-100)
  latitude?: number;
  longitude?: number;
  doorStatus: 'open' | 'closed';
  routeSegment: string;     // e.g., "Taipei_Port", "Sea_Transit", "Rotterdam_Port"
}

export interface AnomalyThreshold {
  temperatureMin: number;
  temperatureMax: number;
  humidityMin: number;
  humidityMax: number;
  temperatureChangeRate: number;  // Max degrees per hour
  humidityChangeRate: number;     // Max percentage points per hour
}

export interface CUSUMState {
  upperSum: number;
  lowerSum: number;
  mean: number;
  threshold: number;
  changePoints: Date[];
}

export interface EnvironmentalAnomaly {
  id: string;
  shipmentId: string;
  containerId: string;
  timestamp: Date;
  type: 'temperature_high' | 'temperature_low' | 'humidity_high' | 'humidity_low' | 
        'rapid_change' | 'change_point' | 'door_open_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  value: number;
  threshold: number;
  description: string;
  correlatedEvent?: string;
  routeSegment: string;
  recommendation: string;
}

export interface EnvironmentalReport {
  shipmentId: string;
  containerId: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalReadings: number;
    anomalyCount: number;
    criticalAnomalies: number;
    avgTemperature: number;
    avgHumidity: number;
    maxTemperature: number;
    minTemperature: number;
    maxHumidity: number;
    minHumidity: number;
    doorOpenCount: number;
    violationRate: number;
  };
  anomalies: EnvironmentalAnomaly[];
  riskScore: number;
  complianceStatus: 'compliant' | 'warning' | 'violation';
  aiSummary: string;
  recommendations: string[];
}

// ============================================================================
// DEFAULT THRESHOLDS (configurable per cargo type)
// ============================================================================

export const CARGO_THRESHOLDS: Record<string, AnomalyThreshold> = {
  // Coffee beans - highly sensitive to humidity
  coffee: {
    temperatureMin: 15,
    temperatureMax: 25,
    humidityMin: 50,
    humidityMax: 65,
    temperatureChangeRate: 3,  // Max 3°C/hour
    humidityChangeRate: 5,     // Max 5%/hour
  },
  // Pharmaceuticals - strict temperature control
  pharma: {
    temperatureMin: 2,
    temperatureMax: 8,
    humidityMin: 30,
    humidityMax: 70,
    temperatureChangeRate: 1,  // Max 1°C/hour
    humidityChangeRate: 10,
  },
  // Electronics - wide range but humidity sensitive
  electronics: {
    temperatureMin: 0,
    temperatureMax: 40,
    humidityMin: 10,
    humidityMax: 60,
    temperatureChangeRate: 5,
    humidityChangeRate: 8,
  },
  // Default thresholds
  default: {
    temperatureMin: 5,
    temperatureMax: 35,
    humidityMin: 20,
    humidityMax: 80,
    temperatureChangeRate: 5,
    humidityChangeRate: 10,
  },
};

// ============================================================================
// CUSUM CHANGE POINT DETECTION
// ============================================================================

/**
 * Initialize CUSUM detector state
 */
export function initCUSUM(
  initialMean: number,
  threshold: number = 5.0
): CUSUMState {
  return {
    upperSum: 0,
    lowerSum: 0,
    mean: initialMean,
    threshold,
    changePoints: [],
  };
}

/**
 * Update CUSUM with new observation
 * Detects both upward and downward shifts in the mean
 */
export function updateCUSUM(
  state: CUSUMState,
  observation: number,
  timestamp: Date,
  slack: number = 0.5
): CUSUMState {
  // Update cumulative sums
  const deviation = observation - state.mean;
  
  // Upper CUSUM (detects increase)
  const newUpperSum = Math.max(0, state.upperSum + deviation - slack);
  
  // Lower CUSUM (detects decrease)  
  const newLowerSum = Math.max(0, state.lowerSum - deviation - slack);
  
  // Check for change point
  const changePoints = [...state.changePoints];
  if (newUpperSum > state.threshold || newLowerSum > state.threshold) {
    changePoints.push(timestamp);
    
    // Reset after detecting change point
    return {
      ...state,
      upperSum: 0,
      lowerSum: 0,
      mean: observation, // Update mean to new level
      changePoints,
    };
  }
  
  return {
    ...state,
    upperSum: newUpperSum,
    lowerSum: newLowerSum,
    changePoints,
  };
}

/**
 * Apply CUSUM to a time series and detect all change points
 */
export function detectChangePoints(
  data: { value: number; timestamp: Date }[],
  threshold: number = 5.0,
  slack: number = 0.5
): Date[] {
  if (data.length < 3) return [];
  
  // Initialize with mean of first few observations
  const initialMean = data.slice(0, 5).reduce((sum, d) => sum + d.value, 0) / 
                      Math.min(5, data.length);
  
  let state = initCUSUM(initialMean, threshold);
  
  for (const { value, timestamp } of data) {
    state = updateCUSUM(state, value, timestamp, slack);
  }
  
  return state.changePoints;
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

/**
 * Detect anomalies in environmental telemetry
 */
export function detectEnvironmentalAnomalies(
  telemetry: EnvironmentTelemetry[],
  thresholds: AnomalyThreshold,
  cargoType: string = 'default'
): EnvironmentalAnomaly[] {
  const anomalies: EnvironmentalAnomaly[] = [];
  
  if (telemetry.length === 0) return anomalies;
  
  // Sort by timestamp
  const sorted = [...telemetry].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  
  // Track door open duration
  let lastDoorOpen: Date | null = null;
  
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = i > 0 ? sorted[i - 1] : null;
    
    // ========================================================================
    // Temperature Threshold Violations
    // ========================================================================
    
    if (current.temperature > thresholds.temperatureMax) {
      const severity = current.temperature > thresholds.temperatureMax + 5 ? 'critical' :
                       current.temperature > thresholds.temperatureMax + 2 ? 'high' : 'medium';
      anomalies.push({
        id: `TEMP_HIGH_${current.timestamp.getTime()}`,
        shipmentId: current.shipmentId,
        containerId: current.containerId,
        timestamp: current.timestamp,
        type: 'temperature_high',
        severity,
        value: current.temperature,
        threshold: thresholds.temperatureMax,
        description: `Temperature ${current.temperature}°C exceeds maximum ${thresholds.temperatureMax}°C for ${cargoType} cargo`,
        routeSegment: current.routeSegment,
        recommendation: severity === 'critical' 
          ? 'IMMEDIATE: Activate emergency cooling or relocate cargo'
          : 'Monitor closely and prepare cooling measures',
        correlatedEvent: current.doorStatus === 'open' ? 'Door was open during violation' : undefined,
      });
    }
    
    if (current.temperature < thresholds.temperatureMin) {
      const severity = current.temperature < thresholds.temperatureMin - 5 ? 'critical' :
                       current.temperature < thresholds.temperatureMin - 2 ? 'high' : 'medium';
      anomalies.push({
        id: `TEMP_LOW_${current.timestamp.getTime()}`,
        shipmentId: current.shipmentId,
        containerId: current.containerId,
        timestamp: current.timestamp,
        type: 'temperature_low',
        severity,
        value: current.temperature,
        threshold: thresholds.temperatureMin,
        description: `Temperature ${current.temperature}°C below minimum ${thresholds.temperatureMin}°C for ${cargoType} cargo`,
        routeSegment: current.routeSegment,
        recommendation: severity === 'critical'
          ? 'IMMEDIATE: Activate heating or relocate cargo'
          : 'Monitor closely and prepare heating measures',
      });
    }
    
    // ========================================================================
    // Humidity Threshold Violations
    // ========================================================================
    
    if (current.humidity > thresholds.humidityMax) {
      const severity = current.humidity > thresholds.humidityMax + 10 ? 'critical' :
                       current.humidity > thresholds.humidityMax + 5 ? 'high' : 'medium';
      anomalies.push({
        id: `HUM_HIGH_${current.timestamp.getTime()}`,
        shipmentId: current.shipmentId,
        containerId: current.containerId,
        timestamp: current.timestamp,
        type: 'humidity_high',
        severity,
        value: current.humidity,
        threshold: thresholds.humidityMax,
        description: `Humidity ${current.humidity}% exceeds maximum ${thresholds.humidityMax}% - risk of mold/spoilage`,
        routeSegment: current.routeSegment,
        recommendation: 'Activate dehumidifier or improve ventilation',
        correlatedEvent: current.doorStatus === 'open' ? 'Door open may have allowed moisture ingress' : undefined,
      });
    }
    
    if (current.humidity < thresholds.humidityMin) {
      anomalies.push({
        id: `HUM_LOW_${current.timestamp.getTime()}`,
        shipmentId: current.shipmentId,
        containerId: current.containerId,
        timestamp: current.timestamp,
        type: 'humidity_low',
        severity: 'medium',
        value: current.humidity,
        threshold: thresholds.humidityMin,
        description: `Humidity ${current.humidity}% below minimum ${thresholds.humidityMin}% - risk of dehydration/cracking`,
        routeSegment: current.routeSegment,
        recommendation: 'Consider adding moisture packs',
      });
    }
    
    // ========================================================================
    // Rapid Change Detection
    // ========================================================================
    
    if (previous) {
      const timeDiffHours = (current.timestamp.getTime() - previous.timestamp.getTime()) / 3600000;
      
      if (timeDiffHours > 0) {
        const tempChangeRate = Math.abs(current.temperature - previous.temperature) / timeDiffHours;
        const humidityChangeRate = Math.abs(current.humidity - previous.humidity) / timeDiffHours;
        
        if (tempChangeRate > thresholds.temperatureChangeRate) {
          anomalies.push({
            id: `RAPID_TEMP_${current.timestamp.getTime()}`,
            shipmentId: current.shipmentId,
            containerId: current.containerId,
            timestamp: current.timestamp,
            type: 'rapid_change',
            severity: tempChangeRate > thresholds.temperatureChangeRate * 2 ? 'high' : 'medium',
            value: tempChangeRate,
            threshold: thresholds.temperatureChangeRate,
            description: `Rapid temperature change: ${tempChangeRate.toFixed(1)}°C/hour (max: ${thresholds.temperatureChangeRate}°C/hour)`,
            routeSegment: current.routeSegment,
            recommendation: 'Investigate cause - possible door breach or HVAC malfunction',
            correlatedEvent: current.doorStatus === 'open' ? 'Door status changed' : undefined,
          });
        }
        
        if (humidityChangeRate > thresholds.humidityChangeRate) {
          anomalies.push({
            id: `RAPID_HUM_${current.timestamp.getTime()}`,
            shipmentId: current.shipmentId,
            containerId: current.containerId,
            timestamp: current.timestamp,
            type: 'rapid_change',
            severity: humidityChangeRate > thresholds.humidityChangeRate * 2 ? 'high' : 'medium',
            value: humidityChangeRate,
            threshold: thresholds.humidityChangeRate,
            description: `Rapid humidity change: ${humidityChangeRate.toFixed(1)}%/hour (max: ${thresholds.humidityChangeRate}%/hour)`,
            routeSegment: current.routeSegment,
            recommendation: 'Check for leaks or ventilation issues',
          });
        }
      }
    }
    
    // ========================================================================
    // Door Open Violations
    // ========================================================================
    
    if (current.doorStatus === 'open' && (!previous || previous.doorStatus === 'closed')) {
      lastDoorOpen = current.timestamp;
    }
    
    if (current.doorStatus === 'closed' && lastDoorOpen) {
      const openDurationMinutes = (current.timestamp.getTime() - lastDoorOpen.getTime()) / 60000;
      
      if (openDurationMinutes > 30) {  // Door open > 30 minutes
        anomalies.push({
          id: `DOOR_OPEN_${lastDoorOpen.getTime()}`,
          shipmentId: current.shipmentId,
          containerId: current.containerId,
          timestamp: lastDoorOpen,
          type: 'door_open_violation',
          severity: openDurationMinutes > 60 ? 'high' : 'medium',
          value: openDurationMinutes,
          threshold: 30,
          description: `Container door open for ${openDurationMinutes.toFixed(0)} minutes (exceeds 30 min threshold)`,
          routeSegment: current.routeSegment,
          recommendation: 'Review door opening records and verify cargo integrity',
        });
      }
      lastDoorOpen = null;
    }
  }
  
  // ========================================================================
  // CUSUM Change Point Detection for Temperature
  // ========================================================================
  
  const tempData = sorted.map(t => ({ value: t.temperature, timestamp: t.timestamp }));
  const tempChangePoints = detectChangePoints(tempData, 5.0, 0.5);
  
  for (const changePoint of tempChangePoints) {
    // Find the telemetry record closest to this change point
    const record = sorted.find(
      t => Math.abs(t.timestamp.getTime() - changePoint.getTime()) < 3600000
    );
    
    if (record) {
      anomalies.push({
        id: `CHANGE_POINT_${changePoint.getTime()}`,
        shipmentId: record.shipmentId,
        containerId: record.containerId,
        timestamp: changePoint,
        type: 'change_point',
        severity: 'medium',
        value: record.temperature,
        threshold: 0,
        description: `Statistical change point detected - possible environmental shift`,
        routeSegment: record.routeSegment,
        recommendation: 'Review route segment transition or external conditions',
        correlatedEvent: record.doorStatus === 'open' ? 'Door was open at change point' : undefined,
      });
    }
  }
  
  return anomalies.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Calculate risk score based on anomalies
 */
function calculateRiskScore(anomalies: EnvironmentalAnomaly[]): number {
  const severityWeights = {
    critical: 40,
    high: 25,
    medium: 10,
    low: 5,
  };
  
  let totalScore = 0;
  for (const anomaly of anomalies) {
    totalScore += severityWeights[anomaly.severity];
  }
  
  // Normalize to 0-100
  return Math.min(100, totalScore);
}

/**
 * Generate compliance status
 */
function determineComplianceStatus(
  riskScore: number,
  criticalCount: number
): 'compliant' | 'warning' | 'violation' {
  if (criticalCount > 0 || riskScore >= 60) return 'violation';
  if (riskScore >= 30) return 'warning';
  return 'compliant';
}

/**
 * Generate AI summary for the report
 */
function generateAISummary(
  summary: EnvironmentalReport['summary'],
  anomalies: EnvironmentalAnomaly[],
  riskScore: number,
  complianceStatus: string
): string {
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
  const highAnomalies = anomalies.filter(a => a.severity === 'high');
  
  let summaryText = `**Environmental Monitoring Report Summary**\n\n`;
  
  // Overall status
  summaryText += `📊 **Overall Status**: ${complianceStatus.toUpperCase()}\n`;
  summaryText += `🎯 **Risk Score**: ${riskScore}/100\n\n`;
  
  // Key metrics
  summaryText += `**Key Metrics:**\n`;
  summaryText += `- Temperature Range: **${summary.minTemperature.toFixed(1)}°C** to **${summary.maxTemperature.toFixed(1)}°C** (avg: ${summary.avgTemperature.toFixed(1)}°C)\n`;
  summaryText += `- Humidity Range: **${summary.minHumidity.toFixed(1)}%** to **${summary.maxHumidity.toFixed(1)}%** (avg: ${summary.avgHumidity.toFixed(1)}%)\n`;
  summaryText += `- Violation Rate: **${(summary.violationRate * 100).toFixed(1)}%**\n`;
  summaryText += `- Door Open Events: **${summary.doorOpenCount}**\n\n`;
  
  // Critical issues
  if (criticalAnomalies.length > 0) {
    summaryText += `🚨 **Critical Issues (${criticalAnomalies.length}):**\n`;
    for (const anomaly of criticalAnomalies.slice(0, 3)) {
      summaryText += `- ${anomaly.description}\n`;
    }
    summaryText += `\n`;
  }
  
  // High priority issues
  if (highAnomalies.length > 0) {
    summaryText += `⚠️ **High Priority Issues (${highAnomalies.length}):**\n`;
    for (const anomaly of highAnomalies.slice(0, 3)) {
      summaryText += `- ${anomaly.description}\n`;
    }
    summaryText += `\n`;
  }
  
  // Conclusion
  if (complianceStatus === 'violation') {
    summaryText += `**Conclusion**: Cargo has experienced significant environmental deviations. Immediate inspection and damage assessment recommended.`;
  } else if (complianceStatus === 'warning') {
    summaryText += `**Conclusion**: Some environmental parameters exceeded thresholds. Monitor closely and review handling procedures.`;
  } else {
    summaryText += `**Conclusion**: Cargo maintained within acceptable environmental parameters throughout transit.`;
  }
  
  return summaryText;
}

/**
 * Generate recommendations based on anomalies
 */
function generateRecommendations(
  anomalies: EnvironmentalAnomaly[],
  complianceStatus: string
): string[] {
  const recommendations: string[] = [];
  const uniqueRecommendations = new Set<string>();
  
  // Add unique recommendations from anomalies
  for (const anomaly of anomalies) {
    if (!uniqueRecommendations.has(anomaly.recommendation)) {
      uniqueRecommendations.add(anomaly.recommendation);
      recommendations.push(anomaly.recommendation);
    }
  }
  
  // Add status-based recommendations
  if (complianceStatus === 'violation') {
    recommendations.unshift('URGENT: Conduct immediate cargo inspection upon arrival');
    recommendations.push('Document all environmental excursions for insurance claims');
    recommendations.push('Review route planning and carrier selection for future shipments');
  } else if (complianceStatus === 'warning') {
    recommendations.push('Schedule preventive maintenance on monitoring equipment');
    recommendations.push('Review threshold settings for this cargo type');
  }
  
  return recommendations.slice(0, 10);  // Limit to top 10
}

/**
 * Generate comprehensive environmental report
 */
export function generateEnvironmentalReport(
  telemetry: EnvironmentTelemetry[],
  cargoType: string = 'default'
): EnvironmentalReport {
  if (telemetry.length === 0) {
    throw new Error('No telemetry data provided');
  }
  
  const thresholds = CARGO_THRESHOLDS[cargoType] || CARGO_THRESHOLDS.default;
  const anomalies = detectEnvironmentalAnomalies(telemetry, thresholds, cargoType);
  
  // Sort telemetry by timestamp
  const sorted = [...telemetry].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  
  // Calculate statistics
  const temperatures = telemetry.map(t => t.temperature);
  const humidities = telemetry.map(t => t.humidity);
  const doorOpenCount = telemetry.filter(t => t.doorStatus === 'open').length;
  
  const summary = {
    totalReadings: telemetry.length,
    anomalyCount: anomalies.length,
    criticalAnomalies: anomalies.filter(a => a.severity === 'critical').length,
    avgTemperature: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
    avgHumidity: humidities.reduce((a, b) => a + b, 0) / humidities.length,
    maxTemperature: Math.max(...temperatures),
    minTemperature: Math.min(...temperatures),
    maxHumidity: Math.max(...humidities),
    minHumidity: Math.min(...humidities),
    doorOpenCount,
    violationRate: anomalies.length / telemetry.length,
  };
  
  const riskScore = calculateRiskScore(anomalies);
  const complianceStatus = determineComplianceStatus(riskScore, summary.criticalAnomalies);
  
  return {
    shipmentId: telemetry[0].shipmentId,
    containerId: telemetry[0].containerId,
    period: {
      start: sorted[0].timestamp,
      end: sorted[sorted.length - 1].timestamp,
    },
    summary,
    anomalies,
    riskScore,
    complianceStatus,
    aiSummary: generateAISummary(summary, anomalies, riskScore, complianceStatus),
    recommendations: generateRecommendations(anomalies, complianceStatus),
  };
}

// ============================================================================
// MOCK DATA GENERATOR (for demo)
// ============================================================================

/**
 * Generate realistic mock telemetry data for demo purposes
 */
export function generateMockTelemetry(
  shipmentId: string,
  containerId: string,
  cargoType: string = 'coffee',
  daysOfData: number = 14,
  anomalyInjection: boolean = true
): EnvironmentTelemetry[] {
  const telemetry: EnvironmentTelemetry[] = [];
  const thresholds = CARGO_THRESHOLDS[cargoType] || CARGO_THRESHOLDS.default;
  
  const baseTemp = (thresholds.temperatureMin + thresholds.temperatureMax) / 2;
  const baseHumidity = (thresholds.humidityMin + thresholds.humidityMax) / 2;
  
  const routeSegments = [
    'Taipei_Warehouse',
    'Taipei_Port',
    'Sea_Transit_Pacific',
    'Singapore_Port',
    'Sea_Transit_Indian',
    'Suez_Canal',
    'Sea_Transit_Med',
    'Rotterdam_Port',
    'Hamburg_Warehouse',
  ];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysOfData);
  
  // Generate readings every hour
  const totalReadings = daysOfData * 24;
  const readingsPerSegment = Math.floor(totalReadings / routeSegments.length);
  
  for (let i = 0; i < totalReadings; i++) {
    const timestamp = new Date(startDate.getTime() + i * 3600000);
    const segmentIndex = Math.min(
      Math.floor(i / readingsPerSegment),
      routeSegments.length - 1
    );
    
    // Base values with slight random variation
    let temperature = baseTemp + (Math.random() - 0.5) * 2;
    let humidity = baseHumidity + (Math.random() - 0.5) * 5;
    let doorStatus: 'open' | 'closed' = 'closed';
    
    // Inject anomalies for demo
    if (anomalyInjection) {
      // Day 3: High temperature event during port transfer
      if (i >= 72 && i <= 78) {
        temperature = thresholds.temperatureMax + 3 + Math.random() * 2;
        doorStatus = i === 74 || i === 75 ? 'open' : 'closed';
      }
      
      // Day 7: Humidity spike during sea transit
      if (i >= 168 && i <= 174) {
        humidity = thresholds.humidityMax + 8 + Math.random() * 5;
      }
      
      // Day 10: Rapid temperature drop
      if (i === 240) {
        temperature = thresholds.temperatureMin - 5;
      }
      
      // Day 12: Extended door open event
      if (i >= 288 && i <= 292) {
        doorStatus = 'open';
        temperature += 2;  // Temperature rise from open door
        humidity += 10;    // Humidity rise from ambient air
      }
    }
    
    telemetry.push({
      shipmentId,
      containerId,
      timestamp,
      temperature: Math.round(temperature * 10) / 10,
      humidity: Math.round(humidity * 10) / 10,
      doorStatus,
      routeSegment: routeSegments[segmentIndex],
    });
  }
  
  return telemetry;
}

// ============================================================================
// DEMO FUNCTION
// ============================================================================

/**
 * Run environmental anomaly detection demo
 */
export function runEnvironmentalDemo(): {
  telemetry: EnvironmentTelemetry[];
  report: EnvironmentalReport;
} {
  console.log('\n========================================');
  console.log('🌡️  Environmental Anomaly Detection Demo');
  console.log('========================================\n');
  
  // Generate mock data
  const telemetry = generateMockTelemetry(
    'SHP-2024-001',
    'CONT-SMART-TOTE-42',
    'coffee',
    14,
    true
  );
  
  console.log(`📊 Generated ${telemetry.length} telemetry readings over 14 days`);
  console.log(`📦 Cargo Type: Coffee (sensitive to humidity)\n`);
  
  // Generate report
  const report = generateEnvironmentalReport(telemetry, 'coffee');
  
  console.log('📋 Report Generated:');
  console.log(`   - Shipment ID: ${report.shipmentId}`);
  console.log(`   - Container ID: ${report.containerId}`);
  console.log(`   - Period: ${report.period.start.toISOString()} to ${report.period.end.toISOString()}`);
  console.log(`   - Total Anomalies: ${report.anomalies.length}`);
  console.log(`   - Critical: ${report.summary.criticalAnomalies}`);
  console.log(`   - Risk Score: ${report.riskScore}/100`);
  console.log(`   - Compliance: ${report.complianceStatus.toUpperCase()}\n`);
  
  console.log('🚨 Top Anomalies:');
  for (const anomaly of report.anomalies.filter(a => a.severity === 'critical' || a.severity === 'high').slice(0, 5)) {
    console.log(`   [${anomaly.severity.toUpperCase()}] ${anomaly.description}`);
    console.log(`      → ${anomaly.recommendation}`);
  }
  
  console.log('\n💡 Recommendations:');
  for (const rec of report.recommendations.slice(0, 5)) {
    console.log(`   • ${rec}`);
  }
  
  console.log('\n========================================\n');
  
  return { telemetry, report };
}
