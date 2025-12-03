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
import { translations } from '@/lib/translations';
import type { Language } from '@/lib/translations';
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
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DemoState {
  activeTab: 'overview' | 'battery' | 'environmental' | 'route' | 'nlq' | 'report';
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
          <div className={`text-4xl font-black ${styles.accent} mb-2 animate-glow`}>{value}</div>
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
const NLQTab: React.FC<{ language: Language }> = ({ language }) => {
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      let response = '';
      
      if (input.includes('電池') || input.includes('更換') || input.includes('BHI') || 
          input.toLowerCase().includes('battery') || input.toLowerCase().includes('replace')) {
        response = t('batteryStatusReport');
      } else if (input.includes('異常') || input.includes('今天') || input.includes('警報') ||
                 input.toLowerCase().includes('anomal') || input.toLowerCase().includes('today') || input.toLowerCase().includes('alert')) {
        response = t('todayAnomaliesReport');
      } else if (input.includes('TOTE') || input.includes('路線') || input.toLowerCase().includes('route')) {
        response = t('routeAnalysisReport');
      } else {
        response = t('thankYouInquiry');
      }
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
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
            <div className={`max-w-[80%] rounded-xl p-4 shadow-md ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' 
                : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 border border-gray-200'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
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

  const generateReport = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const criticalBat = batteries.filter(b => b.urgency === 'immediate').length;
      const criticalEnv = envAlerts.filter(a => a.severity === 'critical').length;
      const criticalRoute = routeEvents.filter(e => e.severity === 'critical').length;
      const totalCritical = criticalBat + criticalEnv + criticalRoute;
      
      const avgBHI = batteries.reduce((s, b) => s + b.bhi, 0) / batteries.length;
      
      const riskScore = totalCritical > 0 ? t('high') : t('low');
      const executiveSummaryText = totalCritical > 0 
        ? `🚨 **${t('warning')}**: ${totalCritical} ${t('criticalEventsNeedAttention')}`
        : `✅ **${t('normalOperation')}**: ${t('noCriticalAlerts')}`;
      
      const markdown = language === 'zh' 
        ? `# AI 供應鏈風險日報

**${t('reportDate')}**: ${new Date().toISOString().split('T')[0]}
**${t('reportId')}**: RPT-${Date.now().toString().slice(-8)}

---

## ${t('executiveSummary')}

${executiveSummaryText}

### ${t('keyIndicators')}

| ${t('indicator')} | ${t('value')} |
|------|------|
| ${t('overallRiskScore')} | ${riskScore} |
| ${t('avgBatteryHealth')} | ${avgBHI.toFixed(1)}% |
| ${t('environmentalAnomalyCount')} | ${envAlerts.length} |
| ${t('routeEventCount')} | ${routeEvents.length} |
| ${t('tamperAlerts')} | ${routeEvents.filter(e => e.type === 'tamper').length} |

---

## ${t('batteryHealthAnalysis')}

**${t('needsReplacement')}**: ${criticalBat} ${t('devices')}

${batteries.filter(b => b.urgency !== 'monitor').map(b => 
  `- **${b.name}** (${b.id}): BHI ${b.bhi}%, RUL ${b.rul} ${t('days')} - ${b.urgency}`
).join('\n')}

---

## ${t('environmentalMonitoringTitle')}

${envAlerts.map(a => 
  `- **${a.severity.toUpperCase()}**: ${a.description} (${a.value}${a.unit} > ${a.threshold}${a.unit})`
).join('\n')}

---

## ${t('routeSecurityTitle')}

${routeEvents.map(e => 
  `- **${e.severity.toUpperCase()}** [${e.type}]: ${e.description} @ ${e.location.name}`
).join('\n')}

---

## ${t('recommendedActions')}

1. ${criticalBat > 0 ? t('replaceKeyBatteries') : t('continueMonitoring')}
2. ${criticalEnv > 0 ? t('investigateEnvAnomalies') : t('maintainEnvMonitoring')}
3. ${routeEvents.filter(e => e.type === 'tamper').length > 0 ? t('investigateTamper') : t('continueRouteMonitoring')}

---

*${t('autoGeneratedReport')} - ${new Date().toLocaleString('zh-TW')}*`
        : `# AI Supply Chain Risk Daily Report

**${t('reportDate')}**: ${new Date().toISOString().split('T')[0]}
**${t('reportId')}**: RPT-${Date.now().toString().slice(-8)}

---

## ${t('executiveSummary')}

${executiveSummaryText}

### ${t('keyIndicators')}

| ${t('indicator')} | ${t('value')} |
|------|------|
| ${t('overallRiskScore')} | ${riskScore} |
| ${t('avgBatteryHealth')} | ${avgBHI.toFixed(1)}% |
| ${t('environmentalAnomalyCount')} | ${envAlerts.length} |
| ${t('routeEventCount')} | ${routeEvents.length} |
| ${t('tamperAlerts')} | ${routeEvents.filter(e => e.type === 'tamper').length} |

---

## ${t('batteryHealthAnalysis')}

**${t('needsReplacement')}**: ${criticalBat} ${t('devices')}

${batteries.filter(b => b.urgency !== 'monitor').map(b => 
  `- **${b.name}** (${b.id}): BHI ${b.bhi}%, RUL ${b.rul} ${t('days')} - ${b.urgency}`
).join('\n')}

---

## ${t('environmentalMonitoringTitle')}

${envAlerts.map(a => 
  `- **${a.severity.toUpperCase()}**: ${a.description} (${a.value}${a.unit} > ${a.threshold}${a.unit})`
).join('\n')}

---

## ${t('routeSecurityTitle')}

${routeEvents.map(e => 
  `- **${e.severity.toUpperCase()}** [${e.type}]: ${e.description} @ ${e.location.name}`
).join('\n')}

---

## ${t('recommendedActions')}

1. ${criticalBat > 0 ? t('replaceKeyBatteries') : t('continueMonitoring')}
2. ${criticalEnv > 0 ? t('investigateEnvAnomalies') : t('maintainEnvMonitoring')}
3. ${routeEvents.filter(e => e.type === 'tamper').length > 0 ? t('investigateTamper') : t('continueRouteMonitoring')}

---

*${t('autoGeneratedReport')} - ${new Date().toLocaleString('en-US')}*`;
      
      setReport(markdown);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-semibold">{t('reportTitle')}</h3>
        </div>
        <button
          onClick={generateReport}
          disabled={isGenerating}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg font-medium transition-all"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              {t('generating')}
            </>
          ) : (
            <>
              <BarChart3 className="w-4 h-4" />
              {t('generateReport')}
            </>
          )}
        </button>
      </div>

      {report ? (
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{report}</ReactMarkdown>
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
  const [state, setState] = useState<DemoState>({
    activeTab: 'overview',
    isLoading: false,
    lastUpdate: null,
    language: 'zh',
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
        {state.activeTab === 'nlq' && <NLQTab language={state.language} />}
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
