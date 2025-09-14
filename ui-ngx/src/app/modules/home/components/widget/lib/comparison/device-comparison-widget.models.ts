///
/// Copyright © 2016-2025 The Thingsboard Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import {
  BackgroundSettings,
  BackgroundType,
  ColorSettings,
  constantColor,
  Font
} from '@shared/models/widget-settings.models';

export enum ComparisonLayout {
  grid = 'grid',
  list = 'list',
  table = 'table'
}

export enum RankingCriteria {
  performance = 'performance',
  uptime = 'uptime',
  custom = 'custom'
}

export enum AlertLevel {
  info = 'info',
  warning = 'warning',
  error = 'error'
}

export interface MetricConfig {
  key: string;
  label: string;
  unit: string;
  format: string;
  enabled: boolean;
  weight: number; // Para el ranking
  thresholds: {
    warning: number;
    error: number;
  };
}

export interface DeviceComparisonData {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  isOnline: boolean;
  lastSeen: number;
  metrics: { [key: string]: number };
  score: number;
  rank: number;
  alerts: DeviceAlert[];
  isOutlier: boolean;
}

export interface DeviceAlert {
  level: AlertLevel;
  message: string;
  timestamp: number;
  metricKey?: string;
}

export interface DeviceComparisonWidgetSettings {
  layout: ComparisonLayout;
  maxDevices: number;
  autoRefresh: boolean;
  refreshInterval: number; // en segundos
  
  // Configuración de métricas
  metrics: MetricConfig[];
  
  // Ranking
  enableRanking: boolean;
  rankingCriteria: RankingCriteria;
  customRankingFormula: string;
  
  // Detección de valores atípicos
  enableOutlierDetection: boolean;
  outlierThreshold: number; // Desviaciones estándar
  
  // Alertas
  enableOfflineAlerts: boolean;
  offlineThreshold: number; // minutos
  enableThresholdAlerts: boolean;
  
  // Estilos
  showDeviceIcons: boolean;
  showRankingBadges: boolean;
  showAlertIndicators: boolean;
  
  // Colores
  primaryColor: ColorSettings;
  successColor: ColorSettings;
  warningColor: ColorSettings;
  errorColor: ColorSettings;
  offlineColor: ColorSettings;
  outlierColor: ColorSettings;
  
  // Tipografía
  headerFont: Font;
  valueFont: Font;
  labelFont: Font;
  
  // Fondo
  background: BackgroundSettings;
  padding: string;
  
  // Filtros
  deviceTypeFilter: string[];
  enableDeviceSearch: boolean;
  
  // Exportación
  enableExport: boolean;
  exportFormats: string[];
}

export const deviceComparisonDefaultSettings = (): DeviceComparisonWidgetSettings => ({
  layout: ComparisonLayout.grid,
  maxDevices: 12,
  autoRefresh: true,
  refreshInterval: 30,
  
  metrics: [
    {
      key: 'temperature',
      label: 'Temperatura',
      unit: '°C',
      format: '0.1',
      enabled: true,
      weight: 1,
      thresholds: { warning: 30, error: 40 }
    },
    {
      key: 'humidity',
      label: 'Humedad',
      unit: '%',
      format: '0.1',
      enabled: true,
      weight: 1,
      thresholds: { warning: 80, error: 90 }
    },
    {
      key: 'battery',
      label: 'Batería',
      unit: '%',
      format: '0',
      enabled: true,
      weight: 2,
      thresholds: { warning: 20, error: 10 }
    }
  ],
  
  enableRanking: true,
  rankingCriteria: RankingCriteria.performance,
  customRankingFormula: '',
  
  enableOutlierDetection: true,
  outlierThreshold: 2.0,
  
  enableOfflineAlerts: true,
  offlineThreshold: 5,
  enableThresholdAlerts: true,
  
  showDeviceIcons: true,
  showRankingBadges: true,
  showAlertIndicators: true,
  
  primaryColor: constantColor('#5469FF'),
  successColor: constantColor('#00C853'),
  warningColor: constantColor('#FF9800'),
  errorColor: constantColor('#F44336'),
  offlineColor: constantColor('#9E9E9E'),
  outlierColor: constantColor('#E91E63'),
  
  headerFont: {
    family: 'Roboto',
    size: 16,
    sizeUnit: 'px',
    style: 'normal',
    weight: '500',
    lineHeight: '1.5'
  },
  valueFont: {
    family: 'Roboto',
    size: 24,
    sizeUnit: 'px',
    style: 'normal',
    weight: '400',
    lineHeight: '1.2'
  },
  labelFont: {
    family: 'Roboto',
    size: 12,
    sizeUnit: 'px',
    style: 'normal',
    weight: '400',
    lineHeight: '1.33'
  },
  
  background: {
    type: BackgroundType.color,
    color: '#fff',
    overlay: {
      enabled: false,
      color: 'rgba(255,255,255,0.72)',
      blur: 3
    }
  },
  padding: '16px',
  
  deviceTypeFilter: [],
  enableDeviceSearch: true,
  
  enableExport: true,
  exportFormats: ['csv', 'json']
});

export const comparisonLayoutTranslations = new Map<ComparisonLayout, string>(
  [
    [ComparisonLayout.grid, 'widgets.device-comparison.layout-grid'],
    [ComparisonLayout.list, 'widgets.device-comparison.layout-list'],
    [ComparisonLayout.table, 'widgets.device-comparison.layout-table']
  ]
);

export const rankingCriteriaTranslations = new Map<RankingCriteria, string>(
  [
    [RankingCriteria.performance, 'widgets.device-comparison.ranking-performance'],
    [RankingCriteria.uptime, 'widgets.device-comparison.ranking-uptime'],
    [RankingCriteria.custom, 'widgets.device-comparison.ranking-custom']
  ]
);
