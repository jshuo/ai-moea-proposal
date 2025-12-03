// lib/aiEventReporter.ts
/**
 * AI Event Report Generator
 * Generates comprehensive natural language reports from all detection modules
 * 
 * Integrates:
 * - Battery Health / RUL predictions
 * - Environmental anomaly detection
 * - Route deviation / theft detection
 * - NLQ agent responses
 * 
 * Reference: AI應用躍昇計畫 - AI事件報告生成
 */

import type { BatteryAnalysisResult } from './rulPrediction';
import type { EnvironmentalReport } from './environmentalAnomalyDetection';
import type { RouteAnalysisResult } from './routeTheftDetection';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface EventSummary {
  id: string;
  type: 'battery' | 'environmental' | 'route' | 'theft' | 'system';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  timestamp: Date;
  title: string;
  description: string;
  location?: {
    lat: number;
    lng: number;
    name?: string;
  };
  deviceId: string;
  metrics?: Record<string, number | string>;
  recommendation?: string;
}

export interface DailyDigest {
  date: string;
  overallRiskLevel: 'critical' | 'elevated' | 'moderate' | 'low';
  eventCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  topEvents: EventSummary[];
  devicesSummary: {
    total: number;
    needsAttention: number;
    healthy: number;
  };
  trendAnalysis: string;
  actionItems: string[];
}

export interface AIReport {
  reportId: string;
  generatedAt: Date;
  reportType: 'incident' | 'daily' | 'weekly' | 'custom';
  title: string;
  executiveSummary: string;
  sections: ReportSection[];
  recommendations: string[];
  metrics: ReportMetrics;
  rawData: {
    battery?: BatteryAnalysisResult[];
    environmental?: EnvironmentalReport[];
    route?: RouteAnalysisResult[];
  };
}

export interface ReportSection {
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  visualizationType?: 'chart' | 'table' | 'map' | 'timeline';
  data?: unknown;
}

export interface ReportMetrics {
  overallRiskScore: number;  // 0-100
  avgBatteryHealth: number;
  environmentalAlerts: number;
  routeDeviations: number;
  tamperEvents: number;
  responseTimeSLA: {
    met: number;
    total: number;
    percentage: number;
  };
}

// ============================================================================
// EVENT EXTRACTION
// ============================================================================

/**
 * Extract events from battery analysis
 */
export function extractBatteryEvents(
  results: BatteryAnalysisResult[]
): EventSummary[] {
  return results.map(r => {
    let severity: EventSummary['severity'] = 'info';
    if (r.maintenanceRecommendation.urgency === 'immediate') severity = 'critical';
    else if (r.maintenanceRecommendation.urgency === 'soon') severity = 'high';
    else if (r.maintenanceRecommendation.urgency === 'scheduled') severity = 'medium';
    
    return {
      id: `bat-${r.deviceId}-${r.analysisTimestamp.getTime()}`,
      type: 'battery',
      severity,
      timestamp: r.analysisTimestamp,
      title: `Battery Health Alert - ${r.deviceId}`,
      description: `BHI: ${r.healthIndex.bhi}/100, RUL: ${r.rulPrediction.predictedRUL} days. ${r.maintenanceRecommendation.recommendedAction}`,
      deviceId: r.deviceId,
      metrics: {
        bhi: r.healthIndex.bhi,
        rul: r.rulPrediction.predictedRUL,
        capacity: r.currentStatus.capacity,
        trend: r.healthIndex.trend,
      },
      recommendation: r.maintenanceRecommendation.recommendedAction,
    };
  });
}

/**
 * Extract events from environmental reports
 */
export function extractEnvironmentalEvents(
  reports: EnvironmentalReport[]
): EventSummary[] {
  const events: EventSummary[] = [];
  
  for (const report of reports) {
    for (const anomaly of report.anomalies) {
      let severity: EventSummary['severity'] = 'info';
      if (anomaly.severity === 'critical') severity = 'critical';
      else if (anomaly.severity === 'high') severity = 'high';
      else if (anomaly.severity === 'medium') severity = 'medium';
      else severity = 'low';
      
      events.push({
        id: anomaly.id,
        type: 'environmental',
        severity,
        timestamp: anomaly.detectedAt,
        title: `Environmental Anomaly: ${anomaly.type.replace('_', ' ')}`,
        description: anomaly.description,
        deviceId: report.deviceId,
        metrics: {
          value: anomaly.value,
          threshold: anomaly.threshold,
          duration: anomaly.duration || 0,
          confidenceScore: report.analysis.confidenceScore,
        },
        recommendation: anomaly.recommendedAction,
      });
    }
  }
  
  return events;
}

/**
 * Extract events from route analysis
 */
export function extractRouteEvents(
  results: RouteAnalysisResult[]
): EventSummary[] {
  const events: EventSummary[] = [];
  
  for (const result of results) {
    // Route deviations
    for (const deviation of result.routeDeviation.deviations) {
      events.push({
        id: deviation.id,
        type: 'route',
        severity: 'medium',
        timestamp: deviation.timestamp,
        title: `Route Deviation: ${deviation.type}`,
        description: deviation.description,
        location: {
          lat: deviation.detectedAt.lat,
          lng: deviation.detectedAt.lng,
        },
        deviceId: result.deviceId,
        metrics: {
          distanceFromRoute: deviation.distanceFromRoute,
        },
      });
    }
    
    // Suspicious stops
    for (const stop of result.suspiciousStops) {
      if (!stop.isAuthorized) {
        events.push({
          id: `stop-${result.deviceId}-${stop.location.timestamp?.getTime()}`,
          type: 'route',
          severity: stop.riskScore > 70 ? 'high' : 'medium',
          timestamp: stop.location.timestamp || new Date(),
          title: `Unauthorized Stop Detected`,
          description: stop.explanation,
          location: {
            lat: stop.location.lat,
            lng: stop.location.lng,
            name: stop.location.name,
          },
          deviceId: result.deviceId,
          metrics: {
            duration: stop.duration,
            riskScore: stop.riskScore,
          },
        });
      }
    }
    
    // Tamper events
    for (const tamper of result.tamperEvents) {
      events.push({
        id: tamper.id,
        type: 'theft',
        severity: tamper.severity === 'critical' ? 'critical' : 'high',
        timestamp: tamper.timestamp,
        title: `Tamper Alert: ${tamper.type}`,
        description: tamper.description,
        location: tamper.location ? {
          lat: tamper.location.lat,
          lng: tamper.location.lng,
        } : undefined,
        deviceId: result.deviceId,
        recommendation: tamper.action,
      });
    }
    
    // Geofence violations
    for (const violation of result.geofenceViolations) {
      events.push({
        id: `geo-${result.deviceId}-${violation.timestamp.getTime()}`,
        type: 'route',
        severity: violation.isEntry ? 'low' : 'high',
        timestamp: violation.timestamp,
        title: `Geofence ${violation.isEntry ? 'Entry' : 'Exit'}: ${violation.geofenceName}`,
        description: `Device ${violation.isEntry ? 'entered' : 'exited'} ${violation.geofenceName}`,
        location: {
          lat: violation.location.lat,
          lng: violation.location.lng,
        },
        deviceId: result.deviceId,
      });
    }
  }
  
  return events;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Generate executive summary from events
 */
export function generateExecutiveSummary(
  events: EventSummary[],
  timeRange: { start: Date; end: Date }
): string {
  const critical = events.filter(e => e.severity === 'critical').length;
  const high = events.filter(e => e.severity === 'high').length;
  const total = events.length;
  
  const byType = {
    battery: events.filter(e => e.type === 'battery').length,
    environmental: events.filter(e => e.type === 'environmental').length,
    route: events.filter(e => e.type === 'route').length,
    theft: events.filter(e => e.type === 'theft').length,
  };
  
  const devices = new Set(events.map(e => e.deviceId)).size;
  
  let summary = `## Executive Summary\n\n`;
  summary += `**Reporting Period**: ${timeRange.start.toISOString().split('T')[0]} to ${timeRange.end.toISOString().split('T')[0]}\n\n`;
  
  // Overall status
  if (critical > 0) {
    summary += `🚨 **CRITICAL ALERTS DETECTED**: ${critical} critical event(s) require immediate attention.\n\n`;
  } else if (high > 0) {
    summary += `⚠️ **High Priority Alerts**: ${high} event(s) require attention.\n\n`;
  } else if (total > 0) {
    summary += `✅ **Normal Operations**: No critical alerts. ${total} routine event(s) logged.\n\n`;
  } else {
    summary += `✅ **All Clear**: No alerts detected during this period.\n\n`;
  }
  
  // Statistics
  summary += `### Key Statistics\n\n`;
  summary += `| Metric | Value |\n`;
  summary += `|--------|-------|\n`;
  summary += `| Total Events | ${total} |\n`;
  summary += `| Devices Affected | ${devices} |\n`;
  summary += `| Battery Alerts | ${byType.battery} |\n`;
  summary += `| Environmental Alerts | ${byType.environmental} |\n`;
  summary += `| Route Deviations | ${byType.route} |\n`;
  summary += `| Theft/Tamper Alerts | ${byType.theft} |\n\n`;
  
  // Top issues
  if (events.length > 0) {
    summary += `### Top Issues\n\n`;
    const topEvents = events
      .filter(e => e.severity === 'critical' || e.severity === 'high')
      .slice(0, 5);
    
    if (topEvents.length > 0) {
      for (let i = 0; i < topEvents.length; i++) {
        const e = topEvents[i];
        const emoji = e.severity === 'critical' ? '🔴' : '🟠';
        summary += `${i + 1}. ${emoji} **${e.title}** (${e.deviceId})\n`;
        summary += `   - ${e.description}\n`;
      }
    } else {
      summary += `No high-priority issues during this period.\n`;
    }
  }
  
  return summary;
}

/**
 * Generate battery health section
 */
function generateBatterySection(
  batteryResults: BatteryAnalysisResult[]
): ReportSection {
  let content = `### Battery Health Overview\n\n`;
  
  if (batteryResults.length === 0) {
    content += `No battery data available for this period.\n`;
    return { title: 'Battery Health', content, priority: 'low' };
  }
  
  // Summary statistics
  const avgBHI = batteryResults.reduce((sum, r) => sum + r.healthIndex.bhi, 0) / batteryResults.length;
  const avgRUL = batteryResults.reduce((sum, r) => sum + r.rulPrediction.predictedRUL, 0) / batteryResults.length;
  const critical = batteryResults.filter(r => r.maintenanceRecommendation.urgency === 'immediate').length;
  
  content += `**Fleet Summary:**\n`;
  content += `- Average BHI: **${avgBHI.toFixed(1)}/100**\n`;
  content += `- Average RUL: **${Math.round(avgRUL)} days**\n`;
  content += `- Devices needing immediate attention: **${critical}**\n\n`;
  
  // Devices needing attention
  const needsAttention = batteryResults
    .filter(r => r.maintenanceRecommendation.urgency !== 'monitor')
    .sort((a, b) => a.rulPrediction.predictedRUL - b.rulPrediction.predictedRUL);
  
  if (needsAttention.length > 0) {
    content += `**Devices Requiring Maintenance:**\n\n`;
    content += `| Device | BHI | RUL (days) | Urgency | Primary Factor |\n`;
    content += `|--------|-----|------------|---------|----------------|\n`;
    
    for (const r of needsAttention.slice(0, 10)) {
      const urgencyEmoji = r.maintenanceRecommendation.urgency === 'immediate' ? '🔴' :
                          r.maintenanceRecommendation.urgency === 'soon' ? '🟠' : '🟡';
      content += `| ${r.deviceId} | ${r.healthIndex.bhi.toFixed(1)} | ${r.rulPrediction.predictedRUL} | ${urgencyEmoji} ${r.maintenanceRecommendation.urgency} | ${r.rulPrediction.factors.primaryFactor} |\n`;
    }
    content += `\n`;
  }
  
  return {
    title: 'Battery Health',
    content,
    priority: critical > 0 ? 'high' : 'medium',
    visualizationType: 'chart',
    data: batteryResults.map(r => ({
      deviceId: r.deviceId,
      bhi: r.healthIndex.bhi,
      rul: r.rulPrediction.predictedRUL,
      urgency: r.maintenanceRecommendation.urgency,
    })),
  };
}

/**
 * Generate environmental section
 */
function generateEnvironmentalSection(
  reports: EnvironmentalReport[]
): ReportSection {
  let content = `### Environmental Monitoring\n\n`;
  
  if (reports.length === 0) {
    content += `No environmental data available for this period.\n`;
    return { title: 'Environmental', content, priority: 'low' };
  }
  
  // Summary
  const totalAnomalies = reports.reduce((sum, r) => sum + r.anomalies.length, 0);
  const criticalAnomalies = reports.reduce((sum, r) => 
    sum + r.anomalies.filter(a => a.severity === 'critical').length, 0);
  
  content += `**Summary:**\n`;
  content += `- Shipments monitored: **${reports.length}**\n`;
  content += `- Total anomalies detected: **${totalAnomalies}**\n`;
  content += `- Critical anomalies: **${criticalAnomalies}**\n\n`;
  
  // Anomaly breakdown
  if (totalAnomalies > 0) {
    content += `**Anomaly Types:**\n\n`;
    
    const anomalyTypes: Record<string, number> = {};
    for (const r of reports) {
      for (const a of r.anomalies) {
        anomalyTypes[a.type] = (anomalyTypes[a.type] || 0) + 1;
      }
    }
    
    content += `| Type | Count |\n`;
    content += `|------|-------|\n`;
    for (const [type, count] of Object.entries(anomalyTypes)) {
      content += `| ${type.replace('_', ' ')} | ${count} |\n`;
    }
    content += `\n`;
  }
  
  // Shipments with issues
  const shipmentWithIssues = reports.filter(r => r.anomalies.length > 0);
  if (shipmentWithIssues.length > 0) {
    content += `**Shipments with Anomalies:**\n\n`;
    for (const r of shipmentWithIssues.slice(0, 5)) {
      content += `- **${r.deviceId}** (${r.analysis.cargoType}): ${r.anomalies.length} anomalie(s)\n`;
      content += `  - Quality Impact: ${r.analysis.qualityImpact}\n`;
    }
  }
  
  return {
    title: 'Environmental Monitoring',
    content,
    priority: criticalAnomalies > 0 ? 'high' : 'medium',
    visualizationType: 'timeline',
    data: reports,
  };
}

/**
 * Generate route security section
 */
function generateRouteSection(
  results: RouteAnalysisResult[]
): ReportSection {
  let content = `### Route Security & Theft Prevention\n\n`;
  
  if (results.length === 0) {
    content += `No route data available for this period.\n`;
    return { title: 'Route Security', content, priority: 'low' };
  }
  
  // Summary
  const totalDeviations = results.reduce((sum, r) => sum + r.routeDeviation.deviations.length, 0);
  const totalTampers = results.reduce((sum, r) => sum + r.tamperEvents.length, 0);
  const totalViolations = results.reduce((sum, r) => sum + r.geofenceViolations.length, 0);
  const avgRisk = results.reduce((sum, r) => sum + r.riskScore, 0) / results.length;
  
  content += `**Summary:**\n`;
  content += `- Routes monitored: **${results.length}**\n`;
  content += `- Average risk score: **${avgRisk.toFixed(1)}/100**\n`;
  content += `- Route deviations: **${totalDeviations}**\n`;
  content += `- Tamper events: **${totalTampers}**\n`;
  content += `- Geofence violations: **${totalViolations}**\n\n`;
  
  // High-risk shipments
  const highRisk = results.filter(r => r.riskScore > 70).sort((a, b) => b.riskScore - a.riskScore);
  if (highRisk.length > 0) {
    content += `**High-Risk Shipments:**\n\n`;
    content += `| Device | Risk Score | Deviations | Tampers | Status |\n`;
    content += `|--------|------------|------------|---------|--------|\n`;
    
    for (const r of highRisk.slice(0, 10)) {
      const statusEmoji = r.riskScore > 80 ? '🔴' : '🟠';
      content += `| ${r.deviceId} | ${r.riskScore.toFixed(0)} | ${r.routeDeviation.deviations.length} | ${r.tamperEvents.length} | ${statusEmoji} |\n`;
    }
    content += `\n`;
  }
  
  // Tamper events detail
  if (totalTampers > 0) {
    content += `**Tamper Events:**\n\n`;
    for (const r of results) {
      for (const t of r.tamperEvents) {
        const emoji = t.severity === 'critical' ? '🚨' : '⚠️';
        content += `- ${emoji} **${r.deviceId}**: ${t.type} - ${t.description}\n`;
        content += `  - Action: ${t.action}\n`;
      }
    }
    content += `\n`;
  }
  
  return {
    title: 'Route Security & Theft Prevention',
    content,
    priority: totalTampers > 0 || highRisk.length > 0 ? 'high' : 'medium',
    visualizationType: 'map',
    data: results,
  };
}

/**
 * Generate recommendations from all data
 */
function generateRecommendations(
  events: EventSummary[],
  batteryResults: BatteryAnalysisResult[],
  envReports: EnvironmentalReport[],
  routeResults: RouteAnalysisResult[]
): string[] {
  const recommendations: string[] = [];
  
  // Battery recommendations
  const criticalBatteries = batteryResults.filter(r => r.maintenanceRecommendation.urgency === 'immediate');
  if (criticalBatteries.length > 0) {
    recommendations.push(
      `🔋 **Immediate**: Replace batteries in ${criticalBatteries.length} device(s): ${criticalBatteries.map(r => r.deviceId).join(', ')}`
    );
  }
  
  const soonBatteries = batteryResults.filter(r => r.maintenanceRecommendation.urgency === 'soon');
  if (soonBatteries.length > 0) {
    recommendations.push(
      `🔋 **Soon**: Schedule battery replacement for ${soonBatteries.length} device(s) within 2 weeks`
    );
  }
  
  // Environmental recommendations
  const criticalEnv = envReports.filter(r => r.anomalies.some(a => a.severity === 'critical'));
  if (criticalEnv.length > 0) {
    recommendations.push(
      `🌡️ **Critical**: Review cargo conditions for shipments with critical environmental alerts`
    );
  }
  
  // Route recommendations
  const tamperShipments = routeResults.filter(r => r.tamperEvents.length > 0);
  if (tamperShipments.length > 0) {
    recommendations.push(
      `🔒 **Security**: Investigate tamper alerts on ${tamperShipments.length} shipment(s)`
    );
  }
  
  const deviatedRoutes = routeResults.filter(r => r.routeDeviation.deviations.length > 0);
  if (deviatedRoutes.length > 0) {
    recommendations.push(
      `🗺️ **Route**: Review route deviations on ${deviatedRoutes.length} shipment(s) - update planned routes if needed`
    );
  }
  
  // General recommendations based on patterns
  if (events.length > 50) {
    recommendations.push(
      `📊 **Analysis**: High event volume detected - consider reviewing alert thresholds`
    );
  }
  
  if (recommendations.length === 0) {
    recommendations.push(
      `✅ **All Clear**: No immediate actions required. Continue routine monitoring.`
    );
  }
  
  return recommendations;
}

/**
 * Generate comprehensive AI report
 */
export function generateAIReport(
  batteryResults: BatteryAnalysisResult[] = [],
  envReports: EnvironmentalReport[] = [],
  routeResults: RouteAnalysisResult[] = [],
  reportType: AIReport['reportType'] = 'daily'
): AIReport {
  // Extract all events
  const allEvents = [
    ...extractBatteryEvents(batteryResults),
    ...extractEnvironmentalEvents(envReports),
    ...extractRouteEvents(routeResults),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  // Time range
  const now = new Date();
  const startDate = new Date(now);
  if (reportType === 'daily') {
    startDate.setDate(startDate.getDate() - 1);
  } else if (reportType === 'weekly') {
    startDate.setDate(startDate.getDate() - 7);
  }
  
  // Generate sections
  const sections: ReportSection[] = [
    generateBatterySection(batteryResults),
    generateEnvironmentalSection(envReports),
    generateRouteSection(routeResults),
  ];
  
  // Calculate metrics
  const metrics: ReportMetrics = {
    overallRiskScore: Math.min(100, 
      allEvents.filter(e => e.severity === 'critical').length * 30 +
      allEvents.filter(e => e.severity === 'high').length * 15 +
      allEvents.filter(e => e.severity === 'medium').length * 5
    ),
    avgBatteryHealth: batteryResults.length > 0
      ? batteryResults.reduce((sum, r) => sum + r.healthIndex.bhi, 0) / batteryResults.length
      : 100,
    environmentalAlerts: envReports.reduce((sum, r) => sum + r.anomalies.length, 0),
    routeDeviations: routeResults.reduce((sum, r) => sum + r.routeDeviation.deviations.length, 0),
    tamperEvents: routeResults.reduce((sum, r) => sum + r.tamperEvents.length, 0),
    responseTimeSLA: {
      met: Math.floor(allEvents.length * 0.92),  // Simulated
      total: allEvents.length,
      percentage: 92,
    },
  };
  
  // Generate recommendations
  const recommendations = generateRecommendations(
    allEvents,
    batteryResults,
    envReports,
    routeResults
  );
  
  // Generate executive summary
  const executiveSummary = generateExecutiveSummary(allEvents, {
    start: startDate,
    end: now,
  });
  
  // Build title
  const typeLabel = reportType === 'daily' ? 'Daily' : 
                   reportType === 'weekly' ? 'Weekly' :
                   reportType === 'incident' ? 'Incident' : 'Custom';
  const title = `AI Supply Chain Risk Report - ${typeLabel} Summary`;
  
  return {
    reportId: `RPT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    generatedAt: now,
    reportType,
    title,
    executiveSummary,
    sections,
    recommendations,
    metrics,
    rawData: {
      battery: batteryResults,
      environmental: envReports,
      route: routeResults,
    },
  };
}

// ============================================================================
// DAILY DIGEST GENERATION
// ============================================================================

/**
 * Generate daily digest for dashboard
 */
export function generateDailyDigest(
  batteryResults: BatteryAnalysisResult[] = [],
  envReports: EnvironmentalReport[] = [],
  routeResults: RouteAnalysisResult[] = []
): DailyDigest {
  const allEvents = [
    ...extractBatteryEvents(batteryResults),
    ...extractEnvironmentalEvents(envReports),
    ...extractRouteEvents(routeResults),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  const eventCounts = {
    critical: allEvents.filter(e => e.severity === 'critical').length,
    high: allEvents.filter(e => e.severity === 'high').length,
    medium: allEvents.filter(e => e.severity === 'medium').length,
    low: allEvents.filter(e => e.severity === 'low').length,
    total: allEvents.length,
  };
  
  // Determine overall risk level
  let overallRiskLevel: DailyDigest['overallRiskLevel'] = 'low';
  if (eventCounts.critical > 0) {
    overallRiskLevel = 'critical';
  } else if (eventCounts.high > 3) {
    overallRiskLevel = 'elevated';
  } else if (eventCounts.high > 0 || eventCounts.medium > 5) {
    overallRiskLevel = 'moderate';
  }
  
  // Devices summary
  const allDevices = new Set([
    ...batteryResults.map(r => r.deviceId),
    ...envReports.map(r => r.deviceId),
    ...routeResults.map(r => r.deviceId),
  ]);
  
  const needsAttentionDevices = new Set([
    ...batteryResults.filter(r => r.maintenanceRecommendation.urgency !== 'monitor').map(r => r.deviceId),
    ...envReports.filter(r => r.anomalies.some(a => a.severity === 'critical' || a.severity === 'high')).map(r => r.deviceId),
    ...routeResults.filter(r => r.tamperEvents.length > 0 || r.riskScore > 70).map(r => r.deviceId),
  ]);
  
  // Trend analysis
  let trendAnalysis = 'Operations running smoothly with no significant issues.';
  if (eventCounts.critical > 0) {
    trendAnalysis = `Critical alerts require immediate attention. ${eventCounts.critical} critical and ${eventCounts.high} high-priority events detected.`;
  } else if (eventCounts.high > 0) {
    trendAnalysis = `Elevated activity detected. ${eventCounts.high} high-priority events require review.`;
  }
  
  // Action items
  const actionItems: string[] = [];
  if (batteryResults.some(r => r.maintenanceRecommendation.urgency === 'immediate')) {
    actionItems.push('Replace critical batteries immediately');
  }
  if (routeResults.some(r => r.tamperEvents.length > 0)) {
    actionItems.push('Investigate tamper alerts');
  }
  if (envReports.some(r => r.anomalies.some(a => a.severity === 'critical'))) {
    actionItems.push('Review critical environmental alerts');
  }
  if (actionItems.length === 0) {
    actionItems.push('Continue routine monitoring');
  }
  
  return {
    date: new Date().toISOString().split('T')[0],
    overallRiskLevel,
    eventCounts,
    topEvents: allEvents.slice(0, 10),
    devicesSummary: {
      total: allDevices.size,
      needsAttention: needsAttentionDevices.size,
      healthy: allDevices.size - needsAttentionDevices.size,
    },
    trendAnalysis,
    actionItems,
  };
}

// ============================================================================
// MARKDOWN EXPORT
// ============================================================================

/**
 * Export report to Markdown format
 */
export function exportReportToMarkdown(report: AIReport): string {
  let markdown = `# ${report.title}\n\n`;
  markdown += `**Report ID**: ${report.reportId}\n`;
  markdown += `**Generated**: ${report.generatedAt.toISOString()}\n\n`;
  
  markdown += `---\n\n`;
  markdown += report.executiveSummary;
  markdown += `\n---\n\n`;
  
  // Metrics
  markdown += `## Key Metrics\n\n`;
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Overall Risk Score | ${report.metrics.overallRiskScore}/100 |\n`;
  markdown += `| Average Battery Health | ${report.metrics.avgBatteryHealth.toFixed(1)}/100 |\n`;
  markdown += `| Environmental Alerts | ${report.metrics.environmentalAlerts} |\n`;
  markdown += `| Route Deviations | ${report.metrics.routeDeviations} |\n`;
  markdown += `| Tamper Events | ${report.metrics.tamperEvents} |\n`;
  markdown += `| SLA Compliance | ${report.metrics.responseTimeSLA.percentage}% |\n\n`;
  
  // Sections
  for (const section of report.sections) {
    markdown += `---\n\n`;
    markdown += section.content;
    markdown += `\n`;
  }
  
  // Recommendations
  markdown += `---\n\n`;
  markdown += `## Recommendations\n\n`;
  for (let i = 0; i < report.recommendations.length; i++) {
    markdown += `${i + 1}. ${report.recommendations[i]}\n`;
  }
  
  return markdown;
}

// ============================================================================
// DEMO FUNCTION
// ============================================================================

import { analyzeBattery, generateMockBatteryHistory } from './rulPrediction';
import { runEnvironmentalDemo } from './environmentalAnomalyDetection';
import { runRouteDetectionDemo } from './routeTheftDetection';

/**
 * Run AI Event Reporter demo
 */
export function runAIReporterDemo(): AIReport {
  console.log('\n========================================');
  console.log('📊 AI Event Report Generator Demo');
  console.log('========================================\n');
  
  // Generate mock battery data
  console.log('🔋 Generating battery analysis data...');
  const batteryDevices = ['GPS-B1', 'GPS-B2', 'GPS-B3', 'TOTE-001', 'TOTE-002'];
  const batteryResults: BatteryAnalysisResult[] = batteryDevices.map((deviceId, idx) => {
    const degradationRate = 0.015 + idx * 0.01;  // Varying degradation
    const history = generateMockBatteryHistory(deviceId, 180, degradationRate);
    const current = history[history.length - 1];
    return analyzeBattery(current, history);
  });
  
  // Environmental data (from demo)
  console.log('🌡️ Running environmental analysis...');
  const envDemo = runEnvironmentalDemo();
  const envReports = [envDemo];
  
  // Route data (from demo)
  console.log('🗺️ Running route analysis...');
  const routeDemo = runRouteDetectionDemo();
  const routeResults = [routeDemo];
  
  // Generate full report
  console.log('\n📝 Generating AI Report...\n');
  const report = generateAIReport(batteryResults, envReports, routeResults, 'daily');
  
  // Output summary
  console.log('📋 Report Generated:');
  console.log(`   - Report ID: ${report.reportId}`);
  console.log(`   - Type: ${report.reportType}`);
  console.log(`   - Risk Score: ${report.metrics.overallRiskScore}/100`);
  console.log(`   - Total Events: ${
    batteryResults.length + 
    envReports.reduce((s, r) => s + r.anomalies.length, 0) +
    routeResults.reduce((s, r) => s + r.tamperEvents.length + r.routeDeviation.deviations.length, 0)
  }`);
  console.log(`\n📌 Top Recommendations:`);
  for (const rec of report.recommendations.slice(0, 3)) {
    console.log(`   ${rec}`);
  }
  
  // Export to markdown
  const markdown = exportReportToMarkdown(report);
  console.log(`\n📄 Markdown Report (${markdown.length} characters)`);
  
  console.log('\n========================================\n');
  
  return report;
}
