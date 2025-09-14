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
    // Si hay fórmula personalizada, intentar evaluarla de manera segura
    const formula = (settings.customRankingFormula || '').trim();
    if (formula) {
      const val = this.evaluateCustomFormula(formula, device, settings);
      if (!isNaN(val)) {
        // Escalar rudimentariamente a 0..100 si parece estar en 0..1
        const scaled = val <= 1 ? val * 100 : val;
        return Math.max(0, Math.min(100, scaled));
      }
    }

    // Estrategia mejorada para "Personalizado" sin fórmula:
    // - Normaliza cada métrica con una función suave basada en thresholds
    // - Promedia ponderado por weight

    const enabledMetrics = settings.metrics.filter(m => m.enabled);
    if (enabledMetrics.length === 0) {
      return this.calculatePerformanceScore(device, settings);
    }

    // Requiere un contexto poblacional; como este servicio no lo tiene, derivamos
    // una aproximación usando thresholds para normalizar el valor individual.
    // Si hay valores > warning se mapean hacia 100, entre error y warning a [0..50], por debajo de error a 0.
    let total = 0;
    let weights = 0;
    enabledMetrics.forEach(metric => {
      const value = device.metrics[metric.key];
      if (isDefinedAndNotNull(value)) {
        const normalized = this.normalizeMetricValueAdvanced(value, metric);
        total += normalized * metric.weight;
        weights += metric.weight;
      }
    });
    if (weights === 0) {
      return this.calculatePerformanceScore(device, settings);
    }
    let score = total / weights;
    if (!device.isOnline) {
      score *= 0.8; // penalización menor que performance
    }
    return score;
  }

  // Evaluación básica de fórmula personalizada con whitelisting de caracteres
  private evaluateCustomFormula(
    formula: string,
    device: DeviceComparisonData,
    settings: DeviceComparisonWidgetSettings
  ): number {
    try {
      // Reemplaza claves de métricas por sus valores numéricos
      let expr = formula;
      settings.metrics.forEach(m => {
        const re = new RegExp(`\\b${m.key}\\b`, 'g');
        const v = isDefinedAndNotNull(device.metrics[m.key]) ? device.metrics[m.key] : 0;
        expr = expr.replace(re, String(v));
      });
      // Whitelist: dígitos, operadores, espacios, paréntesis y punto
      if (!/^[0-9+\-*/().\s]*$/.test(expr)) {
        return NaN;
      }
      // Evalúa de forma aislada
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${expr});`);
      const result = Number(fn());
      return isNaN(result) ? NaN : result;
    } catch {
      return NaN;
    }
  }

  private normalizeMetricValue(value: number, metric: MetricConfig): number {
    // Normalización básica por umbrales (0..100)
    if (value <= metric.thresholds.error) {
      return 0;
    } else if (value <= metric.thresholds.warning) {
      const range = Math.max(1e-6, metric.thresholds.warning - metric.thresholds.error);
      const position = value - metric.thresholds.error;
      return (position / range) * 50;
    } else {
      // Valores por encima del umbral de warning obtienen puntaje completo
      return 100;
    }
  }

  // Normalización avanzada para ranking personalizado
  private normalizeMetricValueAdvanced(value: number, metric: MetricConfig): number {
    // Similar a normalizeMetricValue pero con suavizado:
    // - por debajo de error: decae de forma exponencial a 0
    // - entre error y warning: interpolación suave (easeInOut)
    // - por encima de warning: se usa una curva logarítmica hasta 100 con saturación
    const e = metric.thresholds.error;
    const w = metric.thresholds.warning;
    if (value <= e) {
      const diff = e - value;
      return Math.max(0, 50 * Math.exp(-diff / Math.max(1e-6, e)) - 50); // ~0..0
    }
    if (value <= w) {
      const t = (value - e) / Math.max(1e-6, (w - e));
      // easeInOutQuad
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      return 50 * eased; // 0..50
    }
    // value > w
    const over = value - w;
    const scaled = 50 + 50 * Math.tanh(over / Math.max(1e-3, w)); // 50..~100 con saturación
    return Math.min(100, Math.max(0, scaled));
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
