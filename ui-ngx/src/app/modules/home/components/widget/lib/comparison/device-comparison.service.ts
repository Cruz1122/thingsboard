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

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  DeviceComparisonData,
  DeviceComparisonWidgetSettings,
  MetricConfig,
  RankingCriteria,
  AlertLevel,
} from './device-comparison-widget.models';
import { isDefinedAndNotNull } from '@core/utils';

@Injectable({
  providedIn: 'root'
})
export class DeviceComparisonService {

  constructor() {}

  /**
   * Calcula el ranking de dispositivos basado en los criterios configurados
   */
  calculateDeviceRanking(
    devices: DeviceComparisonData[],
    settings: DeviceComparisonWidgetSettings
  ): DeviceComparisonData[] {
    if (!settings.enableRanking || devices.length === 0) {
      return devices;
    }

    // Calcular score para cada dispositivo
    devices.forEach(device => {
      device.score = this.calculateDeviceScore(device, settings);
    });

    // Ordenar por score descendente y asignar ranking
    const sortedDevices = [...devices].sort((a, b) => b.score - a.score);
    sortedDevices.forEach((device, index) => {
      device.rank = index + 1;
    });

    return sortedDevices;
  }

  /**
   * Detecta valores atípicos en las métricas de dispositivos
   */
  detectOutliers(
    devices: DeviceComparisonData[],
    settings: DeviceComparisonWidgetSettings
  ): DeviceComparisonData[] {
    if (!settings.enableOutlierDetection || devices.length < 3) {
      return devices;
    }

    // Resetear flag de outlier
    devices.forEach(device => device.isOutlier = false);

    settings.metrics.forEach(metric => {
      if (metric.enabled) {
        this.detectOutliersForMetric(devices, metric, settings.outlierThreshold);
      }
    });

    return devices;
  }

  /**
   * Genera alertas para los dispositivos
   */
  generateAlerts(
    devices: DeviceComparisonData[],
    settings: DeviceComparisonWidgetSettings
  ): DeviceComparisonData[] {
    devices.forEach(device => {
      device.alerts = [];

      // Alertas de offline
      if (settings.enableOfflineAlerts && !device.isOnline) {
        device.alerts.push({
          level: AlertLevel.error,
          message: 'Dispositivo desconectado',
          timestamp: Date.now()
        });
      }

      // Alertas de umbrales
      if (settings.enableThresholdAlerts) {
        this.generateThresholdAlerts(device, settings);
      }

      // Alertas de valores atípicos
      if (device.isOutlier) {
        device.alerts.push({
          level: AlertLevel.info,
          message: 'Valor atípico detectado',
          timestamp: Date.now()
        });
      }
    });

    return devices;
  }

  /**
   * Exporta los datos de dispositivos en diferentes formatos
   */
  exportDeviceData(
    devices: DeviceComparisonData[],
    format: 'csv' | 'json' = 'csv'
  ): Observable<Blob> {
    if (format === 'csv') {
      return of(this.exportToCsv(devices));
    } else {
      return of(this.exportToJson(devices));
    }
  }

  /**
   * Filtra dispositivos por tipo y término de búsqueda
   */
  filterDevices(
    devices: DeviceComparisonData[],
    deviceTypeFilter: string[],
    searchTerm: string
  ): DeviceComparisonData[] {
    let filtered = [...devices];

    // Filtro por tipo de dispositivo
    if (deviceTypeFilter.length > 0) {
      filtered = filtered.filter(device =>
        deviceTypeFilter.includes(device.deviceType)
      );
    }

    // Filtro por búsqueda
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(device =>
        device.deviceName.toLowerCase().includes(searchLower) ||
        device.deviceId.toLowerCase().includes(searchLower) ||
        device.deviceType.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  private calculateDeviceScore(
    device: DeviceComparisonData,
    settings: DeviceComparisonWidgetSettings
  ): number {
    switch (settings.rankingCriteria) {
      case RankingCriteria.performance:
        return this.calculatePerformanceScore(device, settings);
      case RankingCriteria.uptime:
        return this.calculateUptimeScore(device, settings);
      case RankingCriteria.custom:
        return this.calculateCustomScore(device, settings);
      default:
        return 0;
    }
  }

  private calculatePerformanceScore(
    device: DeviceComparisonData,
    settings: DeviceComparisonWidgetSettings
  ): number {
    let totalScore = 0;
    let totalWeight = 0;

    settings.metrics.forEach(metric => {
      if (metric.enabled && device.metrics.hasOwnProperty(metric.key)) {
        const value = device.metrics[metric.key];
        const metricScore = this.normalizeMetricValue(value, metric);
        totalScore += metricScore * metric.weight;
        totalWeight += metric.weight;
      }
    });

    // Penalizar dispositivos offline
    if (!device.isOnline) {
      totalScore *= 0.5;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private calculateUptimeScore(
    device: DeviceComparisonData,
    settings: DeviceComparisonWidgetSettings
  ): number {
    const now = Date.now();
    const timeSinceLastSeen = now - device.lastSeen;
    const maxOfflineTime = 24 * 60 * 60 * 1000; // 24 horas

    if (device.isOnline) {
      return 100;
    } else {
      const uptimeRatio = Math.max(0, 1 - (timeSinceLastSeen / maxOfflineTime));
      return uptimeRatio * 100;
    }
  }

  private calculateCustomScore(
    device: DeviceComparisonData,
    settings: DeviceComparisonWidgetSettings
  ): number {
    // Implementar evaluación de fórmula personalizada en el futuro
    // Por ahora, usar performance score como fallback
    return this.calculatePerformanceScore(device, settings);
  }

  private normalizeMetricValue(value: number, metric: MetricConfig): number {
    // Normalizar valor entre 0 y 100 basado en umbrales
    if (value <= metric.thresholds.error) {
      return 0;
    } else if (value <= metric.thresholds.warning) {
      const range = metric.thresholds.warning - metric.thresholds.error;
      const position = value - metric.thresholds.error;
      return (position / range) * 50;
    } else {
      // Valores por encima del umbral de warning obtienen puntaje completo
      return 100;
    }
  }

  private detectOutliersForMetric(
    devices: DeviceComparisonData[],
    metric: MetricConfig,
    threshold: number
  ): void {
    const values = devices
      .map(d => d.metrics[metric.key])
      .filter(v => isDefinedAndNotNull(v));

    if (values.length < 3) return;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return; // Todos los valores son iguales

    devices.forEach(device => {
      if (device.metrics.hasOwnProperty(metric.key)) {
        const value = device.metrics[metric.key];
        const zScore = Math.abs((value - mean) / stdDev);
        if (zScore > threshold) {
          device.isOutlier = true;
        }
      }
    });
  }

  private generateThresholdAlerts(
    device: DeviceComparisonData,
    settings: DeviceComparisonWidgetSettings
  ): void {
    settings.metrics.forEach(metric => {
      if (metric.enabled && device.metrics.hasOwnProperty(metric.key)) {
        const value = device.metrics[metric.key];

        if (value <= metric.thresholds.error) {
          device.alerts.push({
            level: AlertLevel.error,
            message: `${metric.label} por debajo del umbral crítico (${value.toFixed(2)} < ${metric.thresholds.error})`,
            timestamp: Date.now(),
            metricKey: metric.key
          });
        } else if (value <= metric.thresholds.warning) {
          device.alerts.push({
            level: AlertLevel.warning,
            message: `${metric.label} por debajo del umbral de advertencia (${value.toFixed(2)} < ${metric.thresholds.warning})`,
            timestamp: Date.now(),
            metricKey: metric.key
          });
        }
      }
    });
  }

  private exportToCsv(devices: DeviceComparisonData[]): Blob {
    const headers = ['Nombre', 'Tipo', 'Estado', 'Puntuación', 'Ranking', 'Alertas'];
    
    // Agregar headers de métricas
    const metricKeys = new Set<string>();
    devices.forEach(device => {
      Object.keys(device.metrics).forEach(key => metricKeys.add(key));
    });
    headers.push(...Array.from(metricKeys));

    const csvContent = [
      headers.join(','),
      ...devices.map(device => {
        const row = [
          `"${device.deviceName}"`,
          `"${device.deviceType}"`,
          device.isOnline ? 'Online' : 'Offline',
          device.score.toFixed(2),
          device.rank.toString(),
          device.alerts.length.toString()
        ];
        
        // Agregar valores de métricas
        Array.from(metricKeys).forEach(key => {
          row.push(device.metrics[key]?.toString() || 'N/A');
        });
        
        return row.join(',');
      })
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  private exportToJson(devices: DeviceComparisonData[]): Blob {
    const exportData = devices.map(device => ({
      nombre: device.deviceName,
      tipo: device.deviceType,
      estado: device.isOnline ? 'Online' : 'Offline',
      puntuacion: device.score,
      ranking: device.rank,
      metricas: device.metrics,
      alertas: device.alerts.map(alert => ({
        nivel: alert.level,
        mensaje: alert.message,
        timestamp: alert.timestamp
      }))
    }));

    return new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json;charset=utf-8;' 
    });
  }
}
