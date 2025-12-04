"use client";
/**
 * CES 2026 AI Supply Chain Risk Prediction Dashboard
 * Ultra High-Tech Version with Advanced Animations
 * 
 * Enhanced with:
 * - Glassmorphism & Holographic Effects
 * - Particle Animations & Data Streams
 * - Neon Accents & Gradient Flows
 * - Real-time Pulse Indicators
 * - Interactive 3D-style Cards
 */

import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import { translations } from '@/lib/translations';
import type { Language } from '@/lib/translations';

const ChartRenderer = dynamic(() => import('../components/ChartRenderer'), {
  ssr: false,
});

import {
  Battery,
  Thermometer,
  MapPin,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  MessageSquare,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Zap,
  Truck,
  Lock,
  Radio,
  BarChart3,
  Settings,
  Sparkles,
  Cpu,
  Globe2,
  Leaf,
  Trees,
  Package,
  Car,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DemoState {
  activeTab: 'overview' | 'battery' | 'environmental' | 'route' | 'nlq' | 'co2' | 'report';
  isLoading: boolean;
  lastUpdate: Date | null;
  language: Language;
}

interface BatteryDevice {
  id: string;
  name: string;
  bhi: number;
  rul: number;
  capacity: number;
  voltage: number;
  temperature: number;
  cycles: number;
  trend: 'improving' | 'stable' | 'degrading' | 'critical';
  urgency: 'immediate' | 'soon' | 'scheduled' | 'monitor';
}

interface EnvironmentalAlert {
  id: string;
  deviceId: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  value: number;
  threshold: number;
  unit: string;
  timestamp: Date;
  description: string;
}

interface RouteEvent {
  id: string;
  deviceId: string;
  type: 'deviation' | 'stop' | 'tamper' | 'geofence';
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: { lat: number; lng: number; name?: string };
  timestamp: Date;
  description: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chartData?: {
    type: 'line' | 'bar' | 'pie' | 'area';
    data: any[];
    title: string;
  };
}

// ============================================================================
// ANIMATION COMPONENTS
// ============================================================================

const ParticleBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(0,0,0,0))]" />
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 10}s`,
          }}
        />
      ))}
    </div>
  );
};

const DataStream: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden opacity-20 ${className || ''}`}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute h-px w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-stream"
          style={{
            top: `${i * 20}%`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
};

const PulseRing: React.FC<{ color?: string }> = ({ color = 'cyan' }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className={`absolute w-full h-full rounded-full bg-${color}-500/20 animate-ping`} />
      <div className={`absolute w-3/4 h-3/4 rounded-full bg-${color}-500/20 animate-ping delay-75`} />
      <div className={`absolute w-1/2 h-1/2 rounded-full bg-${color}-500/20 animate-ping delay-150`} />
    </div>
  );
};

// CO2 Animated Counter Component
const CO2Counter: React.FC<{ value: number; language: Language }> = ({ value, language }) => {
  const [count, setCount] = React.useState(0);
  
  React.useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return (
    <div className="relative">
      <div className="text-5xl font-black text-green-400 mb-2 animate-pulse-subtle">
        {count.toLocaleString()}
        <span className="text-3xl ml-1">kg</span>
      </div>
      <div className="absolute -inset-4 bg-green-500/10 rounded-full blur-xl animate-pulse" />
    </div>
  );
};

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

const generateMockBatteryDevices = (language: Language): BatteryDevice[] => {
  const t = (key: keyof typeof translations.en) => translations[language][key];
  return [
  {
    id: 'GPS-TRACKER-B1',
    name: `${t('cargoTracker')} #1`,
    bhi: 92,
    rul: 845,
    capacity: 95,
    voltage: 3.85,
    temperature: 24,
    cycles: 450,
    trend: 'stable',
    urgency: 'monitor',
  },
  {
    id: 'GPS-TRACKER-B2',
    name: `${t('cargoTracker')} #2`,
    bhi: 62,
    rul: 120,
    capacity: 68,
    voltage: 3.45,
    temperature: 28,
    cycles: 2890,
    trend: 'degrading',
    urgency: 'soon',
  },
  {
    id: 'TOTE-001',
    name: `${t('smartTote')} #1`,
    bhi: 28,
    rul: 14,
    capacity: 35,
    voltage: 3.15,
    temperature: 32,
    cycles: 3200,
    trend: 'critical',
    urgency: 'immediate',
  },
  {
    id: 'TOTE-002',
    name: `${t('smartTote')} #2`,
    bhi: 78,
    rul: 340,
    capacity: 82,
    voltage: 3.68,
    temperature: 22,
    cycles: 1560,
    trend: 'stable',
    urgency: 'scheduled',
  },
  {
    id: 'ENV-SENSOR-001',
    name: `${t('envSensor')} #1`,
    bhi: 85,
    rul: 560,
    capacity: 88,
    voltage: 3.72,
    temperature: 25,
    cycles: 890,
    trend: 'stable',
    urgency: 'monitor',
  },
];
};

const generateMockEnvironmentalAlerts = (language: Language): EnvironmentalAlert[] => {
  const t = (key: keyof typeof translations.en) => translations[language][key];
  return [
  {
    id: 'ENV-001',
    deviceId: 'COFFEE-SHIP-001',
    type: 'temperature_spike',
    severity: 'high',
    value: 32,
    threshold: 25,
    unit: '°C',
    timestamp: new Date(Date.now() - 2 * 3600000),
    description: t('coffeeTemp'),
  },
  {
    id: 'ENV-002',
    deviceId: 'PHARMA-SHIP-001',
    type: 'humidity_high',
    severity: 'critical',
    value: 85,
    threshold: 60,
    unit: '%',
    timestamp: new Date(Date.now() - 30 * 60000),
    description: t('pharmaHumidity'),
  },
  {
    id: 'ENV-003',
    deviceId: 'ELEC-SHIP-001',
    type: 'vibration_excessive',
    severity: 'medium',
    value: 2.5,
    threshold: 1.5,
    unit: 'g',
    timestamp: new Date(Date.now() - 4 * 3600000),
    description: t('electronicsVibration'),
  },
];
};

const generateMockRouteEvents = (language: Language): RouteEvent[] => {
  const t = (key: keyof typeof translations.en) => translations[language][key];
  return [
  {
    id: 'RT-001',
    deviceId: 'TOTE-001',
    type: 'deviation',
    severity: 'medium',
    location: { lat: 25.0478, lng: 121.5318, name: t('taipeiZhongzheng') },
    timestamp: new Date(Date.now() - 1 * 3600000),
    description: t('routeDeviation'),
  },
  {
    id: 'RT-002',
    deviceId: 'TOTE-002',
    type: 'tamper',
    severity: 'critical',
    location: { lat: 24.9998, lng: 121.4928, name: t('newTaipeiZhonghe') },
    timestamp: new Date(Date.now() - 15 * 60000),
    description: t('unauthorizedAccess'),
  },
  {
    id: 'RT-003',
    deviceId: 'TRUCK-005',
    type: 'stop',
    severity: 'low',
    location: { lat: 25.0329, lng: 121.5654, name: t('taipeiSongshan') },
    timestamp: new Date(Date.now() - 45 * 60000),
    description: t('unexpectedStop'),
  },
  {
    id: 'RT-004',
    deviceId: 'TOTE-001',
    type: 'geofence',
    severity: 'high',
    location: { lat: 25.0418, lng: 121.5678, name: t('nangangLogistics') },
    timestamp: new Date(Date.now() - 2 * 3600000),
    description: t('leftAuthorizedZone'),
  },
];
};

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const colors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    critical: { 
      bg: 'bg-gradient-to-r from-red-500/20 to-pink-500/20', 
      text: 'text-red-300', 
      border: 'border-red-400/50',
      glow: 'shadow-lg shadow-red-500/50'
    },
    high: { 
      bg: 'bg-gradient-to-r from-orange-500/20 to-amber-500/20', 
      text: 'text-orange-300', 
      border: 'border-orange-400/50',
      glow: 'shadow-lg shadow-orange-500/50'
    },
    medium: { 
      bg: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20', 
      text: 'text-yellow-300', 
      border: 'border-yellow-400/50',
      glow: 'shadow-lg shadow-yellow-500/50'
    },
    low: { 
      bg: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20', 
      text: 'text-blue-300', 
      border: 'border-blue-400/50',
      glow: 'shadow-lg shadow-blue-500/50'
    },
    info: { 
      bg: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20', 
      text: 'text-gray-300', 
      border: 'border-gray-400/50',
      glow: 'shadow-lg shadow-gray-500/50'
    },
  };
  const style = colors[severity] || colors.info;
  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${style.bg} ${style.text} ${style.border} ${style.glow} animate-pulse-subtle`}>
      {severity.toUpperCase()}
    </span>
  );
};

const TrendIndicator: React.FC<{ trend: string }> = ({ trend }) => {
  if (trend === 'improving') 
    return <div className="relative"><PulseRing color="green" /><TrendingUp className="w-5 h-5 text-green-400 relative z-10 drop-shadow-glow-green" /></div>;
  if (trend === 'degrading' || trend === 'critical') 
    return <div className="relative"><PulseRing color="red" /><TrendingDown className="w-5 h-5 text-red-400 relative z-10 drop-shadow-glow-red animate-bounce-subtle" /></div>;
  return <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />;
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
}> = ({ title, value, subtitle, icon, trend, color = 'blue' }) => {
  const colorClasses: Record<string, { card: string; icon: string; accent: string }> = {
    blue: { 
      card: 'from-blue-500/10 via-cyan-500/10 to-blue-500/10 border-cyan-400/30 hover:border-cyan-400/60', 
      icon: 'from-blue-500 to-cyan-600', 
      accent: 'text-cyan-400' 
    },
    green: { 
      card: 'from-green-500/10 via-emerald-500/10 to-green-500/10 border-emerald-400/30 hover:border-emerald-400/60', 
      icon: 'from-green-500 to-emerald-600', 
      accent: 'text-emerald-400' 
    },
    red: { 
      card: 'from-red-500/10 via-pink-500/10 to-red-500/10 border-red-400/30 hover:border-red-400/60', 
      icon: 'from-red-500 to-pink-600', 
      accent: 'text-red-400' 
    },
    orange: { 
      card: 'from-orange-500/10 via-amber-500/10 to-orange-500/10 border-orange-400/30 hover:border-orange-400/60', 
      icon: 'from-orange-500 to-amber-600', 
      accent: 'text-orange-400' 
    },
    purple: { 
      card: 'from-purple-500/10 via-violet-500/10 to-purple-500/10 border-purple-400/30 hover:border-purple-400/60', 
      icon: 'from-purple-500 to-violet-600', 
      accent: 'text-purple-400' 
    },
  };

  const styles = colorClasses[color];

  return (
    <div className={`group relative p-6 rounded-2xl border bg-gradient-to-br ${styles.card} hover:shadow-2xl hover:shadow-${color}-500/30 transition-all duration-500 hover:scale-105 overflow-hidden`}>
      <DataStream />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-4 rounded-xl bg-gradient-to-br ${styles.icon} shadow-2xl shadow-${color}-500/50 group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs backdrop-blur-sm ${
              trend === 'up' ? 'bg-green-500/20 text-green-300 border border-green-400/50' : 
              trend === 'down' ? 'bg-red-500/20 text-red-300 border border-red-400/50' : 
              'bg-gray-500/20 text-gray-300 border border-gray-400/50'
            }`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
               trend === 'down' ? <TrendingDown className="w-4 h-4" /> : 
               <Activity className="w-4 h-4" />}
              <span>{trend === 'up' ? '上升' : trend === 'down' ? '下降' : '穩定'}</span>
            </div>
          )}
        </div>
        <div>
          <div className={`text-4xl font-black ${styles.accent} mb-2`}>{value}</div>
          <div className="text-sm font-semibold text-white/90">{title}</div>
          {subtitle && <div className="text-xs text-white/60 mt-1">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TAB COMPONENTS
// ============================================================================

// Overview Tab
const OverviewTab: React.FC<{
  batteries: BatteryDevice[];
  envAlerts: EnvironmentalAlert[];
  routeEvents: RouteEvent[];
  language: Language;
}> = ({ batteries, envAlerts, routeEvents, language }) => {
  const t = (key: keyof typeof translations.en) => translations[language][key];
  const criticalBatteries = batteries.filter(b => b.urgency === 'immediate').length;
  const criticalEnv = envAlerts.filter(a => a.severity === 'critical').length;
  const criticalRoute = routeEvents.filter(e => e.severity === 'critical').length;
  const totalCritical = criticalBatteries + criticalEnv + criticalRoute;
  
  const avgBHI = batteries.reduce((sum, b) => sum + b.bhi, 0) / batteries.length;
  
  // MOEA/ESG CO₂e Reduction Calculation Framework
  // Baseline: 216 tCO₂e per site/year (traditional operations without AI)
  // Target: Achieve ~70-85% reduction of baseline through AI optimization
  // Measurement Method: ISO 14064-1 + GHG Protocol + 環保署碳足跡計算指引
  // Data Source: Real-time IoT sensors + EPA emission factors + Industry baselines
  
  // Baseline Parameters (Traditional Operations - No AI)
  const monthlyShipments = 120; // Average shipments per site per month
  const baselineEmissionsPerShipment = 150; // kg CO₂e per shipment (環保署 baseline)
  const baselineMonthlyEmissions = monthlyShipments * baselineEmissionsPerShipment; // 18,000 kg CO₂e/month
  const baselineAnnualEmissions = baselineMonthlyEmissions * 12; // ~216 tCO₂e/year
  
  // AI-Optimized Emissions Reduction Components
  // 1. Battery Lifecycle Management (Scope 3 - Purchased Goods)
  //    Method: Avoided replacement emissions through predictive maintenance
  //    Data: Real-time BHI monitoring + manufacturer EPD data
  const batteryEmissionsSaved = batteries.reduce((sum, b) => {
    const replacementAvoided = b.bhi > 80 ? 0.8 : b.bhi > 50 ? 0.5 : 0;
    return sum + (replacementAvoided * 75); // 75kg CO₂e per battery (EPD certified)
  }, 0) * 10; // 50-device fleet
  
  // 2. Route Optimization (Scope 1 - Direct Emissions)
  //    Method: Fuel consumption reduction through AI route planning
  //    Data: GPS tracking + fuel sensors + 環保署 diesel emission factor (2.68 kg CO₂e/L)
  const routeDeviations = routeEvents.filter(e => e.type === 'deviation' || e.type === 'stop').length;
  const baseDeviations = 45;
  const deviationsAvoided = Math.max(0, baseDeviations - routeDeviations);
  const routeEmissionsSaved = deviationsAvoided * 15 * 2.68; // 15L fuel per deviation
  
  // 3. Cold Chain Waste Prevention (Scope 3 - Waste)
  //    Method: Environmental monitoring prevents product spoilage
  //    Data: Temperature/humidity sensors + 環保署 food waste LCA (2.5 kg CO₂e/kg)
  const baseEnvIssues = 25;
  const issuesPrevented = Math.max(0, baseEnvIssues - envAlerts.length);
  const wasteEmissionsSaved = issuesPrevented * 200 * 2.5; // 200kg product per incident
  
  // 4. IoT Device Circularity (Scope 3 - Capital Goods)
  //    Method: Extended device lifetime reduces e-waste manufacturing
  //    Data: Device health metrics + electronics industry LCA (45 kg CO₂e/device)
  const deviceLifetimeExtension = avgBHI > 75 ? 0.35 : avgBHI > 60 ? 0.25 : avgBHI > 50 ? 0.15 : 0;
  const devicesInFleet = 50;
  const deviceManufacturingCO2 = 45;
  const monthlyDeviceEmissionsSaved = (devicesInFleet * deviceManufacturingCO2 * deviceLifetimeExtension) / 12;
  
  // Total Reduction Calculation
  const totalMonthlyReduction = batteryEmissionsSaved + routeEmissionsSaved + wasteEmissionsSaved + monthlyDeviceEmissionsSaved;
  const co2Saved = Math.floor(totalMonthlyReduction);
  const annualReduction = Math.floor(totalMonthlyReduction * 12 / 1000); // Convert to tCO₂e/year
  const reductionPerShipment = Math.floor(totalMonthlyReduction / monthlyShipments * 10) / 10; // kg CO₂e per shipment
  const reductionPercentage = Math.floor((totalMonthlyReduction / baselineMonthlyEmissions) * 100);
  
  // Equivalent metrics for context
  const kmEquivalent = Math.floor(co2Saved * 4.2); // Average car: 0.24kg CO₂/km
  const treesEquivalent = Math.floor(co2Saved / 21); // One tree absorbs ~21kg CO₂/year

  return (
    <div className="space-y-6">
      {/* Risk Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title={t('overallRisk')}
          value={totalCritical > 0 ? t('highRisk') : t('normal')}
          subtitle={`${totalCritical} ${t('criticalAlerts')}`}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={totalCritical > 0 ? 'red' : 'green'}
        />
        <MetricCard
          title={t('avgBatteryHealth')}
          value={`${avgBHI.toFixed(0)}%`}
          subtitle={`${criticalBatteries} ${t('needsReplacement')}`}
          icon={<Battery className="w-5 h-5" />}
          color={avgBHI < 50 ? 'red' : avgBHI < 70 ? 'orange' : 'green'}
        />
        <MetricCard
          title={t('environmentalAnomalies')}
          value={envAlerts.length}
          subtitle={`${criticalEnv} ${t('criticalAnomalies')}`}
          icon={<Thermometer className="w-5 h-5" />}
          color={criticalEnv > 0 ? 'red' : 'blue'}
        />
        <MetricCard
          title={t('routeEvents')}
          value={routeEvents.length}
          subtitle={`${routeEvents.filter(e => e.type === 'tamper').length} ${t('tamperAlerts')}`}
          icon={<MapPin className="w-5 h-5" />}
          color={criticalRoute > 0 ? 'red' : 'blue'}
        />
      </div>

      {/* Sub-project Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project A - Battery */}
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
              <Battery className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{t('projectA')}</h3>
              <p className="text-sm text-gray-600">{t('projectADesc')}</p>
            </div>
          </div>
          <div className="space-y-3">
            {batteries.slice(0, 3).map(b => (
              <div key={b.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">{b.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    b.bhi < 50 ? 'text-red-600' : b.bhi < 70 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    BHI: {b.bhi}%
                  </span>
                  <TrendIndicator trend={b.trend} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project B - NLQ */}
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{t('projectB')}</h3>
              <p className="text-sm text-gray-600">{t('projectBDesc')}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <div className="text-sm text-gray-600 mb-2">{t('tryAsking')}</div>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• {t('sampleQuestion1')}</li>
              <li>• {t('sampleQuestion2')}</li>
              <li>• {t('sampleQuestion3')}</li>
              <li>• {t('sampleQuestion4')}</li>
              <li>• {t('sampleQuestion5')}</li>
              <li>• {t('sampleQuestion6')}</li>
            </ul>
          </div>
        </div>

        {/* Project C - Environmental */}
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md">
              <Thermometer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{t('projectC')}</h3>
              <p className="text-sm text-gray-600">{t('projectCDesc')}</p>
            </div>
          </div>
          <div className="space-y-3">
            {envAlerts.slice(0, 3).map(a => (
              <div key={a.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <div className="text-sm font-medium">{a.type.replace('_', ' ')}</div>
                  <div className="text-xs text-gray-500">{a.deviceId}</div>
                </div>
                <SeverityBadge severity={a.severity} />
              </div>
            ))}
          </div>
        </div>

        {/* Project D - Route */}
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{t('projectD')}</h3>
              <p className="text-sm text-gray-600">{t('projectDDesc')}</p>
            </div>
          </div>
          <div className="space-y-3">
            {routeEvents.slice(0, 3).map(e => (
              <div key={e.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <div className="text-sm font-medium">{e.type}</div>
                  <div className="text-xs text-gray-500">{e.location.name}</div>
                </div>
                <SeverityBadge severity={e.severity} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Battery Tab
const BatteryTab: React.FC<{ devices: BatteryDevice[]; language: Language }> = ({ devices, language }) => {
  const t = (key: keyof typeof translations.en) => translations[language][key];
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title={t('totalDevices')}
          value={devices.length}
          icon={<Battery className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          title={t('immediateReplacement')}
          value={devices.filter(d => d.urgency === 'immediate').length}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
        />
        <MetricCard
          title={t('avgRUL')}
          value={`${Math.round(devices.reduce((s, d) => s + d.rul, 0) / devices.length)} ${t('days')}`}
          icon={<Clock className="w-5 h-5" />}
          color="green"
        />
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">{t('batteryStatus')}</h3>
        </div>
        <div className="divide-y">
          {devices.map(device => (
            <div key={device.id} className="p-4">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedDevice(expandedDevice === device.id ? null : device.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    device.urgency === 'immediate' ? 'bg-red-500' :
                    device.urgency === 'soon' ? 'bg-orange-500' :
                    device.urgency === 'scheduled' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />
                  <div>
                    <div className="font-medium">{device.name}</div>
                    <div className="text-sm text-gray-500">{device.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-semibold">BHI: {device.bhi}%</div>
                    <div className="text-sm text-gray-500">RUL: {device.rul} {t('days')}</div>
                  </div>
                  <TrendIndicator trend={device.trend} />
                  {expandedDevice === device.id ? 
                    <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </div>
              
              {expandedDevice === device.id && (
                <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500">{t('capacity')}</div>
                    <div className="font-medium">{device.capacity}%</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500">{t('voltage')}</div>
                    <div className="font-medium">{device.voltage}V</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500">{t('temperature')}</div>
                    <div className="font-medium">{device.temperature}°C</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500">{t('chargeCycles')}</div>
                    <div className="font-medium">{device.cycles}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Environmental Tab
const EnvironmentalTab: React.FC<{ alerts: EnvironmentalAlert[]; language: Language }> = ({ alerts, language }) => {
  const t = (key: keyof typeof translations.en) => translations[language][key];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title={t('totalAnomalies')}
          value={alerts.length}
          icon={<Thermometer className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          title={t('critical')}
          value={alerts.filter(a => a.severity === 'critical').length}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
        />
        <MetricCard
          title={t('temperatureAnomalies')}
          value={alerts.filter(a => a.type.includes('temperature')).length}
          icon={<Thermometer className="w-5 h-5" />}
          color="orange"
        />
        <MetricCard
          title={t('humidityAnomalies')}
          value={alerts.filter(a => a.type.includes('humidity')).length}
          icon={<Activity className="w-5 h-5" />}
          color="blue"
        />
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">{t('environmentalAlerts')}</h3>
        </div>
        <div className="divide-y">
          {alerts.map(alert => (
            <div key={alert.id} className="p-4 flex items-start gap-4">
              <div className={`p-2 rounded-lg ${
                alert.severity === 'critical' ? 'bg-red-100' :
                alert.severity === 'high' ? 'bg-orange-100' :
                alert.severity === 'medium' ? 'bg-yellow-100' :
                'bg-blue-100'
              }`}>
                <Thermometer className={`w-5 h-5 ${
                  alert.severity === 'critical' ? 'text-red-600' :
                  alert.severity === 'high' ? 'text-orange-600' :
                  alert.severity === 'medium' ? 'text-yellow-600' :
                  'text-blue-600'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{alert.description}</span>
                  <SeverityBadge severity={alert.severity} />
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {alert.deviceId} | {t('valueLabel')}: {alert.value}{alert.unit} ({t('threshold')}: {alert.threshold}{alert.unit})
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {alert.timestamp.toLocaleString('zh-TW')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Route Tab
const RouteTab: React.FC<{ events: RouteEvent[]; language: Language }> = ({ events, language }) => {
  const t = (key: keyof typeof translations.en) => translations[language][key];
  const typeIcons: Record<string, React.ReactNode> = {
    deviation: <MapPin className="w-5 h-5" />,
    stop: <Clock className="w-5 h-5" />,
    tamper: <Lock className="w-5 h-5" />,
    geofence: <Radio className="w-5 h-5" />,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title={t('totalEvents')}
          value={events.length}
          icon={<Truck className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          title={t('routeDeviations')}
          value={events.filter(e => e.type === 'deviation').length}
          icon={<MapPin className="w-5 h-5" />}
          color="orange"
        />
        <MetricCard
          title={t('tamperEvents')}
          value={events.filter(e => e.type === 'tamper').length}
          icon={<Lock className="w-5 h-5" />}
          color="red"
        />
        <MetricCard
          title={t('geofenceViolations')}
          value={events.filter(e => e.type === 'geofence').length}
          icon={<Radio className="w-5 h-5" />}
          color="purple"
        />
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">{t('routeSecurityEvents')}</h3>
        </div>
        <div className="divide-y">
          {events.map(event => (
            <div key={event.id} className="p-4 flex items-start gap-4">
              <div className={`p-2 rounded-lg ${
                event.type === 'tamper' ? 'bg-red-100' :
                event.type === 'geofence' ? 'bg-purple-100' :
                event.type === 'deviation' ? 'bg-orange-100' :
                'bg-blue-100'
              }`}>
                {typeIcons[event.type]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{event.type}</span>
                  <SeverityBadge severity={event.severity} />
                </div>
                <div className="text-sm text-gray-700 mt-1">{event.description}</div>
                <div className="text-sm text-gray-500 mt-1">
                  📍 {event.location.name || `${event.location.lat.toFixed(4)}, ${event.location.lng.toFixed(4)}`}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {event.deviceId} | {event.timestamp.toLocaleString('zh-TW')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// NLQ Tab
const NLQTab: React.FC<{ language: Language; batteries: BatteryDevice[]; envAlerts: EnvironmentalAlert[]; routeEvents: RouteEvent[] }> = ({ language, batteries, envAlerts, routeEvents }) => {
  const t = (key: keyof typeof translations.en) => translations[language][key];
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: t('greeting'),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateChartData = (query: string) => {
    const lowerQuery = query.toLowerCase();
    
    // Battery trend chart
    if (lowerQuery.includes('battery') || lowerQuery.includes('電池') || lowerQuery.includes('trend') || lowerQuery.includes('趨勢')) {
      const chartData = batteries.map(b => ({
        name: b.name,
        BHI: b.bhi,
        RUL: b.rul,
      }));
      return {
        type: 'bar' as const,
        data: chartData,
        title: language === 'zh' ? '電池健康狀況' : 'Battery Health Status',
      };
    }
    
    // Environmental alerts distribution
    if (lowerQuery.includes('environment') || lowerQuery.includes('環境') || lowerQuery.includes('alert') || lowerQuery.includes('警報') || lowerQuery.includes('distribution') || lowerQuery.includes('分布')) {
      const alertTypes: { [key: string]: number } = {};
      envAlerts.forEach(alert => {
        alertTypes[alert.type] = (alertTypes[alert.type] || 0) + 1;
      });
      const chartData = Object.entries(alertTypes).map(([type, count]) => ({
        name: type,
        value: count,
      }));
      return {
        type: 'pie' as const,
        data: chartData,
        title: language === 'zh' ? '環境警報分布' : 'Environmental Alert Distribution',
      };
    }
    
    // Route events timeline
    if (lowerQuery.includes('route') || lowerQuery.includes('路線') || lowerQuery.includes('event') || lowerQuery.includes('事件') || lowerQuery.includes('timeline') || lowerQuery.includes('時間')) {
      const severityCounts: { [key: string]: number } = { critical: 0, high: 0, medium: 0, low: 0 };
      routeEvents.forEach(event => {
        severityCounts[event.severity] = (severityCounts[event.severity] || 0) + 1;
      });
      const chartData = Object.entries(severityCounts).map(([severity, count]) => ({
        name: severity.charAt(0).toUpperCase() + severity.slice(1),
        count: count,
      }));
      return {
        type: 'bar' as const,
        data: chartData,
        title: language === 'zh' ? '路線事件嚴重程度' : 'Route Event Severity',
      };
    }
    
    return null;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      let response = '';
      const chartData = generateChartData(currentInput);
      
      if (currentInput.includes('電池') || currentInput.includes('更換') || currentInput.includes('BHI') || 
          currentInput.toLowerCase().includes('battery') || currentInput.toLowerCase().includes('replace')) {
        response = t('batteryStatusReport');
      } else if (currentInput.includes('異常') || currentInput.includes('今天') || currentInput.includes('警報') ||
                 currentInput.toLowerCase().includes('anomal') || currentInput.toLowerCase().includes('today') || currentInput.toLowerCase().includes('alert')) {
        response = t('todayAnomaliesReport');
      } else if (currentInput.includes('TOTE') || currentInput.includes('路線') || currentInput.toLowerCase().includes('route')) {
        response = t('routeAnalysisReport');
      } else if (chartData) {
        response = language === 'zh' ? '這是您請求的數據可視化圖表：' : 'Here is the data visualization you requested:';
      } else {
        response = t('thankYouInquiry');
      }
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        chartData: chartData || undefined,
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-purple-100 flex items-center gap-3">
        <div className="p-2 bg-purple-600 rounded-lg">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg">{t('nlqTitle')}</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`${msg.role === 'user' ? 'max-w-[80%]' : 'w-[68%]'} rounded-xl p-4 shadow-md ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' 
                : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 border border-gray-200'
            }`}>
              {msg.role === 'assistant' ? (
                <>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.chartData && (
                    <ChartRenderer chartData={msg.chartData} />
                  )}
                </>
              ) : (
                <p>{msg.content}</p>
              )}
              <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString('zh-TW')}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-gray-600">{t('analyzing')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('nlqPlaceholder')}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md font-medium transition-all"
          >
            {t('send')}
          </button>
        </div>
      </div>
    </div>
  );
};

// CO2 Tab
const CO2Tab: React.FC<{
  batteries: BatteryDevice[];
  envAlerts: EnvironmentalAlert[];
  routeEvents: RouteEvent[];
  language: Language;
}> = ({ batteries, envAlerts, routeEvents, language }) => {
  const t = (key: keyof typeof translations.en) => translations[language][key];
  
  const avgBHI = batteries.reduce((sum, b) => sum + b.bhi, 0) / batteries.length;
  
  // MOEA/ESG Framework: 216 tCO₂e baseline per site/year
  const monthlyShipments = 120;
  const baselineEmissionsPerShipment = 150; // kg CO₂e (環保署)
  const baselineMonthlyEmissions = monthlyShipments * baselineEmissionsPerShipment;
  
  // Reduction Components (ISO 14064-1 + GHG Protocol)
  const batteryEmissionsSaved = batteries.reduce((sum, b) => {
    const replacementAvoided = b.bhi > 80 ? 0.8 : b.bhi > 50 ? 0.5 : 0;
    return sum + (replacementAvoided * 75);
  }, 0) * 10;
  
  const routeDeviations = routeEvents.filter(e => e.type === 'deviation' || e.type === 'stop').length;
  const baseDeviations = 45;
  const deviationsAvoided = Math.max(0, baseDeviations - routeDeviations);
  const routeEmissionsSaved = deviationsAvoided * 15 * 2.68;
  
  const baseEnvIssues = 25;
  const issuesPrevented = Math.max(0, baseEnvIssues - envAlerts.length);
  const wasteEmissionsSaved = issuesPrevented * 200 * 2.5;
  
  const deviceLifetimeExtension = avgBHI > 75 ? 0.35 : avgBHI > 60 ? 0.25 : avgBHI > 50 ? 0.15 : 0;
  const devicesInFleet = 50;
  const deviceManufacturingCO2 = 45;
  const monthlyDeviceEmissionsSaved = (devicesInFleet * deviceManufacturingCO2 * deviceLifetimeExtension) / 12;
  
  const totalMonthlyReduction = batteryEmissionsSaved + routeEmissionsSaved + wasteEmissionsSaved + monthlyDeviceEmissionsSaved;
  const co2Saved = Math.floor(totalMonthlyReduction);
  const annualReduction = Math.floor(totalMonthlyReduction * 12 / 1000); // tCO₂e/year
  const reductionPerShipment = Math.floor(totalMonthlyReduction / monthlyShipments * 10) / 10;
  const reductionPercentage = Math.floor((totalMonthlyReduction / baselineMonthlyEmissions) * 100);
  const kmEquivalent = Math.floor(co2Saved * 4.2);
  const treesEquivalent = Math.floor(co2Saved / 21);

  return (
    <div className="space-y-6">
      {/* Main CO2 Impact Banner */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-2xl shadow-lg p-8 border border-slate-700/50 relative overflow-hidden">
        <DataStream className="opacity-10" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <Leaf className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">{language === 'zh' ? 'CO₂ 減量成效' : 'CO₂ Reduction Impact'}</h2>
                <p className="text-slate-300 text-base">{language === 'zh' ? 'MOEA/ESG 試點計畫' : 'MOEA/ESG Pilot Program'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-2.5 bg-green-500/20 rounded-full border border-green-400/50">
              <TrendingDown className="w-6 h-6 text-green-400" />
              <span className="text-green-400 font-bold text-lg">-{reductionPercentage}%</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {/* Monthly Reduction */}
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl p-5 shadow-xl text-center">
              <div className="flex items-center justify-center mb-2">
                <Leaf className="w-7 h-7 text-white animate-float" />
              </div>
              <div className="text-4xl font-bold text-white mb-1">
                {Math.floor(co2Saved / 1000 * 10) / 10}
                <span className="text-xl ml-1">tCO₂e</span>
              </div>
              <div className="text-sm text-green-100 font-medium">{language === 'zh' ? '試點期間（本月）' : 'Pilot Period (Monthly)'}</div>
              <div className="text-xs text-green-200 mt-1 opacity-80">{language === 'zh' ? `年化: ${annualReduction} tCO₂e/年` : `Annualized: ${annualReduction} tCO₂e/yr`}</div>
            </div>
            
            {/* Per Shipment Reduction */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-5 shadow-xl text-center border border-slate-600">
              <div className="flex items-center justify-center mb-2">
                <Package className="w-7 h-7 text-blue-400" />
              </div>
              <div className="text-4xl font-bold text-blue-400 mb-1">
                {reductionPerShipment}
                <span className="text-xl ml-1">kg</span>
              </div>
              <div className="text-sm text-slate-300 font-medium">{language === 'zh' ? '每批次減量' : 'Per Shipment'}</div>
              <div className="text-xs text-slate-400 mt-1">{language === 'zh' ? `定義: end-to-end 運送批次` : `Def: end-to-end shipment`}</div>
            </div>
            
            {/* Reduction Percentage */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-5 shadow-xl text-center border border-slate-600">
              <div className="flex items-center justify-center mb-2">
                <TrendingDown className="w-7 h-7 text-emerald-400" />
              </div>
              <div className="text-4xl font-bold text-emerald-400 mb-1">
                {reductionPercentage}
                <span className="text-xl ml-1">%</span>
              </div>
              <div className="text-sm text-slate-300 font-medium">{language === 'zh' ? '相對基準減少' : 'vs Baseline'}</div>
              <div className="text-xs text-slate-400 mt-1">{language === 'zh' ? '環保署方法' : 'EPA Method'}</div>
            </div>
            
            {/* Baseline Emissions */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-5 shadow-xl text-center border border-slate-600">
              <div className="flex items-center justify-center mb-2">
                <Activity className="w-7 h-7 text-slate-400" />
              </div>
              <div className="text-4xl font-bold text-slate-300 mb-1">
                {baselineEmissionsPerShipment}
                <span className="text-xl ml-1">kg</span>
              </div>
              <div className="text-sm text-slate-300 font-medium">{language === 'zh' ? '傳統作業基準' : 'Traditional Baseline'}</div>
              <div className="text-xs text-slate-400 mt-1">{language === 'zh' ? '每批次排放' : 'per shipment'}</div>
            </div>
            
            {/* Trees Equivalent */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-5 shadow-xl text-center border border-slate-600">
              <div className="flex items-center justify-center mb-2">
                <Trees className="w-7 h-7 text-green-400 animate-pulse" />
              </div>
              <div className="text-4xl font-bold text-green-400 mb-1">
                {treesEquivalent}
                <span className="text-xl ml-1">{language === 'zh' ? '棵' : ''}</span>
              </div>
              <div className="text-sm text-slate-300 font-medium">{t('treesEquivalent')}</div>
              <div className="text-xs text-slate-400 mt-1">{language === 'zh' ? '年吸收量當量' : 'Annual Absorption'}</div>
            </div>
          </div>
          
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <p className="text-base text-green-400 text-center">
              {language === 'zh' 
                ? `🌱 本月減量: ${Math.floor(co2Saved / 1000 * 10) / 10} tCO₂e | 年化推估: ${annualReduction} tCO₂e/年/站點（以每月 ${monthlyShipments} 批 end-to-end 運送推估）| 相較傳統作業減少 ${reductionPercentage}%`
                : `🌱 Monthly: ${Math.floor(co2Saved / 1000 * 10) / 10} tCO₂e | Annualized: ${annualReduction} tCO₂e/yr/site (based on ${monthlyShipments} end-to-end shipments/mo) | ${reductionPercentage}% vs traditional`}
            </p>
          </div>
        </div>
      </div>

      {/* CO2 Formula Breakdown */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-8 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-6 h-6 text-blue-400" />
          <h3 className="text-2xl font-bold text-white">
            {language === 'zh' ? 'CO₂ 計算公式' : 'CO₂ Calculation Formula'}
          </h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border-l-4 border-blue-400">
            <div>
              <span className="text-slate-300 text-lg font-medium block mb-1">
                {language === 'zh' ? '🔋 電池優化' : '🔋 Battery Optimization'}
              </span>
              <span className="text-slate-400 text-sm">
                {language === 'zh' ? '減少電池製造碳排' : 'Reduced battery manufacturing emissions'}
              </span>
            </div>
            <span className="font-mono text-blue-400 font-bold text-2xl">
              {Math.floor(batteryEmissionsSaved)} kg
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border-l-4 border-cyan-400">
            <div>
              <span className="text-slate-300 text-lg font-medium block mb-1">
                {language === 'zh' ? '🚛 路線優化' : '🚛 Route Optimization'}
              </span>
              <span className="text-slate-400 text-sm">
                {language === 'zh' ? '減少燃油消耗' : 'Reduced fuel consumption'}
              </span>
            </div>
            <span className="font-mono text-cyan-400 font-bold text-2xl">
              {Math.floor(routeEmissionsSaved)} kg
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border-l-4 border-green-400">
            <div>
              <span className="text-slate-300 text-lg font-medium block mb-1">
                {language === 'zh' ? '📦 廢棄物防止' : '📦 Waste Prevention'}
              </span>
              <span className="text-slate-400 text-sm">
                {language === 'zh' ? '防止產品損壞' : 'Prevented product spoilage'}
              </span>
            </div>
            <span className="font-mono text-green-400 font-bold text-2xl">
              {Math.floor(wasteEmissionsSaved)} kg
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border-l-4 border-purple-400">
            <div>
              <span className="text-slate-300 text-lg font-medium block mb-1">
                {language === 'zh' ? '📱 IoT 設備延壽' : '📱 IoT Device Lifecycle'}
              </span>
              <span className="text-slate-400 text-sm">
                {language === 'zh' ? '延長設備使用壽命' : 'Extended device lifetime'}
              </span>
            </div>
            <span className="font-mono text-purple-400 font-bold text-2xl">
              {Math.floor(monthlyDeviceEmissionsSaved)} kg
            </span>
          </div>
          <div className="flex items-center justify-between p-5 bg-green-500/20 rounded-lg border-l-4 border-green-400 mt-4">
            <span className="text-green-300 font-bold text-xl">
              {language === 'zh' ? '= 總減量' : '= Total Reduction'}
            </span>
            <span className="font-mono text-green-400 font-bold text-3xl">
              {co2Saved.toLocaleString()} kg
            </span>
          </div>
        </div>
        
        {/* Double Counting Prevention Notice */}
        <div className="bg-amber-500/10 rounded-lg border border-amber-500/30 p-4 mt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200">
              <div className="font-bold mb-1">{language === 'zh' ? '計算邊界聲明' : 'Calculation Boundary Statement'}</div>
              <div className="text-amber-300/90 space-y-1">
                <div>{language === 'zh' 
                  ? '• 四項減碳分項彼此互斥，同一事件僅計算一次，避免重複計算'
                  : '• Four reduction components are mutually exclusive; each event counted once to prevent double counting'}</div>
                <div>{language === 'zh' 
                  ? '• 每批次定義：從起運點到終點的完整 end-to-end 運送任務'
                  : '• Per shipment definition: Complete end-to-end delivery from origin to destination'}</div>
                <div>{language === 'zh' 
                  ? '• 廢棄物防止僅計產品損失，不含運輸能耗（已列於路線優化）'
                  : '• Waste prevention counts product loss only, excludes transport energy (covered in route optimization)'}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-slate-700">
          <h4 className="text-lg font-bold text-white mb-4">
            {language === 'zh' ? '� 量測方法與數據來源' : '📊 Measurement Method & Data Sources'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div className="text-green-400 font-bold mb-2">{language === 'zh' ? '🎯 計算標準' : '🎯 Standards'}</div>
              <div className="text-slate-300 text-sm space-y-1">
                <div>• ISO 14064-1 {language === 'zh' ? '溫室氣體盤查' : 'GHG Inventory'}</div>
                <div>• GHG Protocol {language === 'zh' ? '(範疇 1-3)' : '(Scope 1-3)'}</div>
                <div>• {language === 'zh' ? '環保署碳足跡計算指引' : 'Taiwan EPA Carbon Footprint Guide'}</div>
              </div>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div className="text-blue-400 font-bold mb-2">{language === 'zh' ? '📡 數據來源' : '📡 Data Sources'}</div>
              <div className="text-slate-300 text-sm space-y-1">
                <div>• {language === 'zh' ? '即時 IoT 感測器' : 'Real-time IoT Sensors'}</div>
                <div>• {language === 'zh' ? '環保署排放係數' : 'EPA Emission Factors'}</div>
                <div>• {language === 'zh' ? '產業基準數據 (環境宣告)' : 'Industry EPD Data'}</div>
              </div>
            </div>
          </div>
          <h4 className="text-lg font-bold text-white mb-4 mt-6">
            {language === 'zh' ? '💡 排放係數基準' : '💡 Emission Factors'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <div className="text-blue-400 font-bold mb-2">{language === 'zh' ? '電池製造' : 'Battery Mfg'}</div>
              <div className="text-slate-300 text-sm">75 kg CO₂e / {language === 'zh' ? '個' : 'unit'}</div>
              <div className="text-slate-500 text-xs mt-1">{language === 'zh' ? '來源: EPD' : 'Source: EPD'}</div>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <div className="text-cyan-400 font-bold mb-2">{language === 'zh' ? '柴油燃燒' : 'Diesel'}</div>
              <div className="text-slate-300 text-sm">2.68 kg CO₂e / L</div>
              <div className="text-slate-500 text-xs mt-1">{language === 'zh' ? '來源: 環保署' : 'Source: EPA'}</div>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <div className="text-green-400 font-bold mb-2">{language === 'zh' ? '食品廢棄' : 'Food Waste'}</div>
              <div className="text-slate-300 text-sm">2.5 kg CO₂e / kg</div>
              <div className="text-slate-500 text-xs mt-1">{language === 'zh' ? '來源: LCA' : 'Source: LCA'}</div>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <div className="text-purple-400 font-bold mb-2">{language === 'zh' ? 'IoT 設備' : 'IoT Device'}</div>
              <div className="text-slate-300 text-sm">45 kg CO₂e / {language === 'zh' ? '個' : 'unit'}</div>
              <div className="text-slate-500 text-xs mt-1">{language === 'zh' ? '來源: 產業' : 'Source: Industry'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Report Tab
const ReportTab: React.FC<{
  batteries: BatteryDevice[];
  envAlerts: EnvironmentalAlert[];
  routeEvents: RouteEvent[];
  language: Language;
}> = ({ batteries, envAlerts, routeEvents, language }) => {
  const t = (key: keyof typeof translations.en) => translations[language][key];
  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const criticalBat = batteries.filter(b => b.urgency === 'immediate').length;
      const criticalEnv = envAlerts.filter(a => a.severity === 'critical').length;
      const criticalRoute = routeEvents.filter(e => e.severity === 'critical').length;
      const totalCritical = criticalBat + criticalEnv + criticalRoute;
      const avgBHI = batteries.reduce((s, b) => s + b.bhi, 0) / batteries.length;

      // Prepare context for LLM
      const context = {
        date: new Date().toISOString().split('T')[0],
        reportId: `RPT-${Date.now().toString().slice(-8)}`,
        language: language,
        metrics: {
          totalCritical,
          criticalBat,
          criticalEnv,
          criticalRoute,
          avgBHI: avgBHI.toFixed(1),
          totalBatteries: batteries.length,
          totalEnvAlerts: envAlerts.length,
          totalRouteEvents: routeEvents.length,
          tamperAlerts: routeEvents.filter(e => e.type === 'tamper').length,
        },
        batteries: batteries.filter(b => b.urgency !== 'monitor').map(b => ({
          name: b.name,
          id: b.id,
          bhi: b.bhi,
          rul: b.rul,
          urgency: b.urgency,
          trend: b.trend,
        })),
        envAlerts: envAlerts.map(a => ({
          severity: a.severity,
          type: a.type,
          description: a.description,
          value: a.value,
          threshold: a.threshold,
          unit: a.unit,
          deviceId: a.deviceId,
        })),
        routeEvents: routeEvents.map(e => ({
          severity: e.severity,
          type: e.type,
          description: e.description,
          location: e.location.name,
          deviceId: e.deviceId,
        })),
      };

      // Call LLM API
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.statusText}`);
      }

      const data = await response.json();
      setReport(data.report);
    } catch (err) {
      console.error('Error generating report:', err);
      setError(language === 'zh' ? '生成報告時發生錯誤' : 'Error generating report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50 p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{t('reportTitle')}</h3>
            <p className="text-sm text-gray-600 mt-1">AI-powered risk analysis and insights</p>
          </div>
        </div>
        <button
          onClick={generateReport}
          disabled={isGenerating}
          className="flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg hover:shadow-xl font-semibold text-sm transition-all duration-200 hover:scale-105 disabled:hover:scale-100 border border-blue-500/50"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              {t('generating')}
            </>
          ) : (
            <>
              <BarChart3 className="w-5 h-5" />
              {t('generateReport')}
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900">{language === 'zh' ? '錯誤' : 'Error'}</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {report ? (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-2xl p-10 border border-gray-200">
          <div style={{fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', lineHeight: '1.7', color: '#1a1a1a'}}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({node, ...props}) => <h1 style={{fontSize: '2.5em', fontWeight: '800', margin: '0 0 1.5rem 0', background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', paddingBottom: '0.5rem', borderBottom: '3px solid #3b82f6'}} {...props} />,
                h2: ({node, ...props}) => <h2 style={{fontSize: '1.875em', fontWeight: '700', margin: '2.5rem 0 1rem 0', color: '#1e40af', paddingBottom: '0.5rem', borderBottom: '2px solid #e5e7eb'}} {...props} />,
                h3: ({node, ...props}) => <h3 style={{fontSize: '1.5em', fontWeight: '600', margin: '1.5rem 0 0.75rem 0', color: '#2563eb'}} {...props} />,
                p: ({node, ...props}) => <p style={{margin: '0 0 1.25rem 0', fontSize: '1.05rem', lineHeight: '1.8', color: '#374151'}} {...props} />,
                ul: ({node, ...props}) => <ul style={{margin: '1rem 0 1.5rem 0', paddingLeft: '2rem', listStyleType: 'disc'}} {...props} />,
                ol: ({node, ...props}) => <ol style={{margin: '1rem 0 1.5rem 0', paddingLeft: '2rem'}} {...props} />,
                li: ({node, ...props}) => <li style={{margin: '0.5rem 0', lineHeight: '1.8', color: '#374151'}} {...props} />,
                table: ({node, ...props}) => <table style={{borderCollapse: 'separate', borderSpacing: '0', width: '100%', margin: '2rem 0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', borderRadius: '0.75rem', overflow: 'hidden'}} {...props} />,
                thead: ({node, ...props}) => <thead style={{background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'}} {...props} />,
                th: ({node, ...props}) => <th style={{padding: '1rem 1.25rem', textAlign: 'left', color: '#ffffff', fontWeight: '700', fontSize: '0.95rem', letterSpacing: '0.025em', textTransform: 'uppercase'}} {...props} />,
                td: ({node, ...props}) => <td style={{padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', color: '#1f2937', fontSize: '1rem', backgroundColor: '#ffffff'}} {...props} />,
                tbody: ({node, ...props}) => <tbody style={{backgroundColor: '#ffffff'}} {...props} />,
                strong: ({node, ...props}) => <strong style={{fontWeight: '700', color: '#1e40af'}} {...props} />,
                hr: ({node, ...props}) => <hr style={{border: 'none', height: '2px', background: 'linear-gradient(to right, transparent, #e5e7eb, transparent)', margin: '2.5rem 0'}} {...props} />,
              }}
            >
              {report}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-600">{t('noReport')}</h4>
          <p className="text-gray-500 mt-2">{t('clickToGenerate')}</p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AISupplyChainDemo() {
  // Detect user's timezone and set default language
  const getDefaultLanguage = (): Language => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Taiwan timezones: Asia/Taipei
    return timezone === 'Asia/Taipei' ? 'zh' : 'en';
  };

  const [state, setState] = useState<DemoState>({
    activeTab: 'overview',
    isLoading: false,
    lastUpdate: null,
    language: getDefaultLanguage(),
  });

  const [batteries, setBatteries] = useState<BatteryDevice[]>([]);
  const [envAlerts, setEnvAlerts] = useState<EnvironmentalAlert[]>([]);
  const [routeEvents, setRouteEvents] = useState<RouteEvent[]>([]);

  const t = (key: keyof typeof translations.en) => translations[state.language][key];

  useEffect(() => {
    setState(s => ({ ...s, lastUpdate: new Date() }));
    // Regenerate mock data when language changes
    setBatteries(generateMockBatteryDevices(state.language));
    setEnvAlerts(generateMockEnvironmentalAlerts(state.language));
    setRouteEvents(generateMockRouteEvents(state.language));
  }, [state.language]);

  const tabs = [
    { id: 'overview', label: t('overview'), icon: <BarChart3 className="w-5 h-5" />, color: 'cyan' },
    { id: 'battery', label: t('batteryHealth'), icon: <Battery className="w-5 h-5" />, color: 'green' },
    { id: 'environmental', label: t('environmentalMonitoring'), icon: <Thermometer className="w-5 h-5" />, color: 'orange' },
    { id: 'route', label: t('routeSecurity'), icon: <Shield className="w-5 h-5" />, color: 'blue' },
    { id: 'nlq', label: t('aiAssistant'), icon: <MessageSquare className="w-5 h-5" />, color: 'purple' },
    { id: 'co2', label: t('co2Tab'), icon: <Leaf className="w-5 h-5" />, color: 'green' },
    { id: 'report', label: t('reportGeneration'), icon: <FileText className="w-5 h-5" />, color: 'pink' },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <ParticleBackground />
      
      {/* Animated Grid Background */}
      <div className="fixed inset-0 bg-grid-pattern opacity-5 animate-grid-flow z-0" />
      
      {/* Header */}
      <header className="relative z-20 border-b border-slate-700/50 bg-slate-900 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
            <div className="flex items-center gap-5">
              <div className="relative p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <Sparkles className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {t('appTitle')}
                </h1>
                <p className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  {t('appSubtitle')} | CES 2026
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Language Switcher */}
              <div className="flex gap-2 bg-slate-800 rounded-lg p-1.5 border border-slate-600">
                <button
                  onClick={() => setState(s => ({ ...s, language: 'zh' }))}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    state.language === 'zh'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  中文
                </button>
                <button
                  onClick={() => setState(s => ({ ...s, language: 'en' }))}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    state.language === 'en'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  EN
                </button>
              </div>
              {state.lastUpdate && (
                <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-800 rounded-lg border border-slate-600">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-200 font-mono font-medium">
                    {state.lastUpdate.toLocaleTimeString('zh-TW')}
                  </span>
                </div>
              )}
              <button className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200">
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-slate-700/50 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex space-x-2 overflow-x-auto py-4 scrollbar-hide">
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => setState(s => ({ ...s, activeTab: tab.id }))}
                className={`group relative flex items-center gap-2.5 px-5 py-3 text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap ${
                  state.activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div>
                  {tab.icon}
                </div>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-10">
        {state.activeTab === 'overview' && (
          <OverviewTab batteries={batteries} envAlerts={envAlerts} routeEvents={routeEvents} language={state.language} />
        )}
        {state.activeTab === 'battery' && <BatteryTab devices={batteries} language={state.language} />}
        {state.activeTab === 'environmental' && <EnvironmentalTab alerts={envAlerts} language={state.language} />}
        {state.activeTab === 'route' && <RouteTab events={routeEvents} language={state.language} />}
        {state.activeTab === 'nlq' && <NLQTab language={state.language} batteries={batteries} envAlerts={envAlerts} routeEvents={routeEvents} />}
        {state.activeTab === 'co2' && (
          <CO2Tab batteries={batteries} envAlerts={envAlerts} routeEvents={routeEvents} language={state.language} />
        )}
        {state.activeTab === 'report' && (
          <ReportTab batteries={batteries} envAlerts={envAlerts} routeEvents={routeEvents} language={state.language} />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-700/50 bg-slate-900 mt-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="text-center">
            <p className="text-white font-bold text-xl mb-3">
              {t('footerTitle')}
            </p>
            <p className="text-slate-300 font-medium">{t('footerProjects')}</p>
            <div className="flex items-center justify-center gap-2 mt-6">
              <Globe2 className="w-4 h-4 text-slate-400" />
              <p className="text-slate-400 text-sm font-medium">CES 2026 | Las Vegas</p>
            </div>
            <p className="text-slate-500 text-xs mt-4">{t('footerCopyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
