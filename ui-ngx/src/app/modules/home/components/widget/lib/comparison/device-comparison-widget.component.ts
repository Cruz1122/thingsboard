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
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { WidgetContext } from '@home/models/widget-component.models';
import { isDefinedAndNotNull } from '@core/utils';
import {
  backgroundStyle,
  ColorProcessor,
  ComponentStyle,
  textStyle
} from '@shared/models/widget-settings.models';
import {
  DeviceComparisonData,
  DeviceComparisonWidgetSettings,
  deviceComparisonDefaultSettings,
  ComparisonLayout,
  RankingCriteria,
  AlertLevel,
  MetricConfig
} from './device-comparison-widget.models';
import { WidgetComponent } from '@home/components/widget/widget.component';
import { Observable, Subject, interval, takeUntil, switchMap, of } from 'rxjs';
import { ImagePipe } from '@shared/pipe/image.pipe';
import { DomSanitizer } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'tb-device-comparison-widget',
  templateUrl: './device-comparison-widget.component.html',
  styleUrls: ['./device-comparison-widget.component.scss']
})
export class DeviceComparisonWidgetComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('comparisonPanel', {static: false})
  comparisonPanel: ElementRef<HTMLElement>;

  @ViewChild('searchInput', {static: false})
  searchInput: ElementRef<HTMLInputElement>;

  settings: DeviceComparisonWidgetSettings;

  @Input()
  ctx: WidgetContext;

  @Input()
  widgetTitlePanel: TemplateRef<any>;

  // Enums para el template
  ComparisonLayout = ComparisonLayout;
  AlertLevel = AlertLevel;

  // Datos
  devices: DeviceComparisonData[] = [];
  filteredDevices: DeviceComparisonData[] = [];
  searchTerm = '';
  
  // Estados
  loading = false;
  error: string | null = null;
  
  // Estilos
  backgroundStyle$: Observable<ComponentStyle>;
  headerStyle: ComponentStyle = {};
  valueStyle: ComponentStyle = {};
  labelStyle: ComponentStyle = {};
  
  // Colores
  primaryColor: ColorProcessor;
  successColor: ColorProcessor;
  warningColor: ColorProcessor;
  errorColor: ColorProcessor;
  offlineColor: ColorProcessor;
  outlierColor: ColorProcessor;

  private readonly destroy$ = new Subject<void>();
  private refreshTimer$: Observable<number>;

  constructor(
    private readonly imagePipe: ImagePipe,
    private readonly sanitizer: DomSanitizer,
    private readonly widgetComponent: WidgetComponent,
    private readonly cd: ChangeDetectorRef,
    private readonly dialog: MatDialog,
    private readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.ctx.$scope.deviceComparisonWidget = this;
    this.settings = {...deviceComparisonDefaultSettings(), ...this.ctx.settings};
    
    this.initializeStyles();
    this.initializeRefreshTimer();
  }

  ngAfterViewInit(): void {
    this.onResize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public onInit(): void {
    this.cd.detectChanges();
  }

  public onDataUpdated(): void {
    this.processDeviceData();
    this.cd.detectChanges();
  }

  private initializeStyles(): void {
    this.backgroundStyle$ = backgroundStyle(this.settings.background, this.imagePipe, this.sanitizer);
    this.headerStyle = textStyle(this.settings.headerFont);
    this.valueStyle = textStyle(this.settings.valueFont);
    this.labelStyle = textStyle(this.settings.labelFont);
    
    this.primaryColor = ColorProcessor.fromSettings(this.settings.primaryColor);
    this.successColor = ColorProcessor.fromSettings(this.settings.successColor);
    this.warningColor = ColorProcessor.fromSettings(this.settings.warningColor);
    this.errorColor = ColorProcessor.fromSettings(this.settings.errorColor);
    this.offlineColor = ColorProcessor.fromSettings(this.settings.offlineColor);
    this.outlierColor = ColorProcessor.fromSettings(this.settings.outlierColor);
  }

  private initializeRefreshTimer(): void {
    if (this.settings.autoRefresh && this.settings.refreshInterval > 0) {
      this.refreshTimer$ = interval(this.settings.refreshInterval * 1000);
      this.refreshTimer$.pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.loadDeviceData())
      ).subscribe();
    }
  }

  private processDeviceData(): void {
    this.loading = true;
    this.error = null;

    try {
      // Procesar datos de dispositivos desde el contexto
      const rawData = this.ctx.data || [];
      this.devices = this.transformRawDataToDevices(rawData);
      
      // Aplicar ranking si está habilitado
      if (this.settings.enableRanking) {
        this.calculateRanking();
      }
      
      // Detectar valores atípicos
      if (this.settings.enableOutlierDetection) {
        this.detectOutliers();
      }
      
      // Generar alertas
      this.generateAlerts();
      
      // Aplicar filtros
      this.applyFilters();
      
      this.loading = false;
    } catch (error) {
      this.error = 'Error procesando datos de dispositivos';
      this.loading = false;
      console.error('Error in processDeviceData:', error);
    }
  }

  private transformRawDataToDevices(rawData: any[]): DeviceComparisonData[] {
    const deviceMap = new Map<string, DeviceComparisonData>();
    
    rawData.forEach(dataPoint => {
      const deviceId = dataPoint.entityId;
      const deviceName = dataPoint.entityName || dataPoint.entityLabel || deviceId;
      
      if (!deviceMap.has(deviceId)) {
        deviceMap.set(deviceId, {
          deviceId,
          deviceName,
          deviceType: dataPoint.entityType || 'Device',
          isOnline: this.isDeviceOnline(dataPoint),
          lastSeen: this.getLastSeenTimestamp(dataPoint),
          metrics: {},
          score: 0,
          rank: 0,
          alerts: [],
          isOutlier: false
        });
      }
      
      const device = deviceMap.get(deviceId);
      
      if (device) {
        // Procesar métricas
        if (dataPoint.data && dataPoint.data.length > 0) {
          const latestData = dataPoint.data[dataPoint.data.length - 1];
          if (latestData && latestData.length >= 2) {
            const metricKey = dataPoint.dataKey?.name || dataPoint.key;
            const value = latestData[1];
            if (metricKey && isDefinedAndNotNull(value)) {
              device.metrics[metricKey] = Number(value);
            }
          }
        }
      }
    });
    
    return Array.from(deviceMap.values()).slice(0, this.settings.maxDevices);
  }

  private isDeviceOnline(dataPoint: any): boolean {
    const now = Date.now();
    const lastActivity = this.getLastSeenTimestamp(dataPoint);
    const offlineThresholdMs = this.settings.offlineThreshold * 60 * 1000;
    return (now - lastActivity) < offlineThresholdMs;
  }

  private getLastSeenTimestamp(dataPoint: any): number {
    if (dataPoint.data && dataPoint.data.length > 0) {
      const latestData = dataPoint.data[dataPoint.data.length - 1];
      if (latestData && latestData.length >= 1) {
        return Number(latestData[0]);
      }
    }
    return Date.now();
  }

  private calculateRanking(): void {
    // Calcular score para cada dispositivo
    this.devices.forEach(device => {
      device.score = this.calculateDeviceScore(device);
    });
    
    // Ordenar por score y asignar ranking
    this.devices.sort((a, b) => b.score - a.score);
    this.devices.forEach((device, index) => {
      device.rank = index + 1;
    });
  }

  private calculateDeviceScore(device: DeviceComparisonData): number {
    let score = 0;
    
    switch (this.settings.rankingCriteria) {
      case RankingCriteria.performance:
        score = this.calculatePerformanceScore(device);
        break;
      case RankingCriteria.uptime:
        score = this.calculateUptimeScore(device);
        break;
      case RankingCriteria.custom:
        score = this.calculateCustomScore(device);
        break;
    }
    
    return score;
  }

  private calculatePerformanceScore(device: DeviceComparisonData): number {
    let totalScore = 0;
    let totalWeight = 0;
    
    this.settings.metrics.forEach(metric => {
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

  private calculateUptimeScore(device: DeviceComparisonData): number {
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

  private calculateCustomScore(device: DeviceComparisonData): number {
    // Implementar fórmula personalizada
    // Por ahora, usar performance score como fallback
    return this.calculatePerformanceScore(device);
  }

  private normalizeMetricValue(value: number, metric: MetricConfig): number {
    // Normalizar valor entre 0 y 100 basado en umbrales
    if (value <= metric.thresholds.error) {
      return 0;
    } else if (value <= metric.thresholds.warning) {
      return 50;
    } else {
      return 100;
    }
  }

  private detectOutliers(): void {
    this.settings.metrics.forEach(metric => {
      if (metric.enabled) {
        const values = this.devices
          .map(d => d.metrics[metric.key])
          .filter(v => isDefinedAndNotNull(v));
        
        if (values.length > 2) {
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
          const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
          const stdDev = Math.sqrt(variance);
          
          this.devices.forEach(device => {
            if (device.metrics.hasOwnProperty(metric.key)) {
              const value = device.metrics[metric.key];
              const zScore = Math.abs((value - mean) / stdDev);
              if (zScore > this.settings.outlierThreshold) {
                device.isOutlier = true;
              }
            }
          });
        }
      }
    });
  }

  private generateAlerts(): void {
    this.devices.forEach(device => {
      device.alerts = [];
      
      // Alertas de offline
      if (this.settings.enableOfflineAlerts && !device.isOnline) {
        device.alerts.push({
          level: AlertLevel.error,
          message: this.translate.instant('widgets.device-comparison.alert-offline'),
          timestamp: Date.now()
        });
      }
      
      // Alertas de umbrales
      if (this.settings.enableThresholdAlerts) {
        this.settings.metrics.forEach(metric => {
          if (metric.enabled && device.metrics.hasOwnProperty(metric.key)) {
            const value = device.metrics[metric.key];
            
            if (value <= metric.thresholds.error) {
              device.alerts.push({
                level: AlertLevel.error,
                message: this.translate.instant('widgets.device-comparison.alert-threshold-error', 
                  { metric: metric.label, value, threshold: metric.thresholds.error }),
                timestamp: Date.now(),
                metricKey: metric.key
              });
            } else if (value <= metric.thresholds.warning) {
              device.alerts.push({
                level: AlertLevel.warning,
                message: this.translate.instant('widgets.device-comparison.alert-threshold-warning',
                  { metric: metric.label, value, threshold: metric.thresholds.warning }),
                timestamp: Date.now(),
                metricKey: metric.key
              });
            }
          }
        });
      }
      
      // Alertas de valores atípicos
      if (device.isOutlier) {
        device.alerts.push({
          level: AlertLevel.info,
          message: this.translate.instant('widgets.device-comparison.alert-outlier'),
          timestamp: Date.now()
        });
      }
    });
  }

  private applyFilters(): void {
    let filtered = [...this.devices];
    
    // Filtro por tipo de dispositivo
    if (this.settings.deviceTypeFilter.length > 0) {
      filtered = filtered.filter(device => 
        this.settings.deviceTypeFilter.includes(device.deviceType)
      );
    }
    
    // Filtro por búsqueda
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(device =>
        device.deviceName.toLowerCase().includes(searchLower) ||
        device.deviceId.toLowerCase().includes(searchLower) ||
        device.deviceType.toLowerCase().includes(searchLower)
      );
    }
    
    this.filteredDevices = filtered;
  }

  private loadDeviceData(): Observable<any> {
    // Implementar carga de datos si es necesario
    return of(null);
  }

  public onSearchChange(): void {
    if (this.searchInput) {
      this.searchTerm = this.searchInput.nativeElement.value;
      this.applyFilters();
      this.cd.detectChanges();
    }
  }

  public getDeviceIcon(device: DeviceComparisonData): string {
    // Retornar icono basado en tipo de dispositivo
    const iconMap: { [key: string]: string } = {
      'Temperature Sensor': 'thermostat',
      'Humidity Sensor': 'water_drop',
      'Gateway': 'router',
      'Smart Meter': 'electric_meter',
      'Default': 'device_hub'
    };
    
    return iconMap[device.deviceType] || iconMap['Default'];
  }

  public getAlertColor(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.error:
        return this.errorColor.color;
      case AlertLevel.warning:
        return this.warningColor.color;
      case AlertLevel.info:
      default:
        return this.primaryColor.color;
    }
  }

  public getDeviceStatusColor(device: DeviceComparisonData): string {
    if (!device.isOnline) {
      return this.offlineColor.color;
    } else if (device.isOutlier) {
      return this.outlierColor.color;
    } else if (device.alerts.some(a => a.level === AlertLevel.error)) {
      return this.errorColor.color;
    } else if (device.alerts.some(a => a.level === AlertLevel.warning)) {
      return this.warningColor.color;
    } else {
      return this.successColor.color;
    }
  }

  public trackByDeviceId(index: number, device: DeviceComparisonData): string {
    return device.deviceId;
  }

  public getDisplayedColumns(): string[] {
    const columns = ['device', 'status'];
    
    if (this.settings.enableRanking) {
      columns.unshift('rank');
    }
    
    this.settings.metrics.forEach(metric => {
      if (metric.enabled) {
        columns.push(metric.key);
      }
    });
    
    columns.push('alerts');
    
    return columns;
  }

  public exportData(): void {
    if (!this.settings.enableExport) return;
    
    // Implementar exportación
    const exportData = this.filteredDevices.map(device => ({
      nombre: device.deviceName,
      tipo: device.deviceType,
      estado: device.isOnline ? 'Online' : 'Offline',
      puntuacion: device.score.toFixed(2),
      ranking: device.rank,
      ...device.metrics
    }));
    
    // Por ahora, mostrar en consola
    console.log('Exportando datos:', exportData);
  }

  private onResize(): void {
    // Implementar lógica de redimensionamiento si es necesario
  }
}
