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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { Router } from '@angular/router';
import { DeviceComparisonService } from '@home/components/widget/lib/comparison/device-comparison.service';
import { 
  DeviceComparisonData, 
  DeviceComparisonWidgetSettings, 
  ComparisonLayout,
  RankingCriteria,
  MetricConfig,
  deviceComparisonDefaultSettings,
  AlertLevel
} from '@home/components/widget/lib/comparison/device-comparison-widget.models';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { DeviceComparisonConfigDialogComponent } from './device-comparison-config-dialog.component';
import { DeviceComparisonFiltersDialogComponent } from './device-comparison-filters-dialog.component';
import { DeviceComparisonSearchDialogComponent } from './device-comparison-search-dialog.component';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EntityService } from '@core/http/entity.service';
import { DeviceService } from '@core/http/device.service';
import { TelemetryWebsocketService } from '@core/ws/telemetry-websocket.service';
import { AttributeService } from '@core/http/attribute.service';
import { DataKeyType } from '@shared/models/telemetry/telemetry.models';
import { PageLink, TimePageLink } from '@shared/models/page/page-link';
import { Direction } from '@shared/models/page/sort-order';
import { AlarmService } from '@core/http/alarm.service';
import { AlarmInfo, AlarmSearchStatus, AlarmSeverity, AlarmQuery } from '@shared/models/alarm.models';

@Component({
  selector: 'tb-device-comparison-page',
  templateUrl: './device-comparison-page.component.html',
  styleUrls: ['./device-comparison-page.component.scss']
})
export class DeviceComparisonPageComponent extends PageComponent implements OnInit, OnDestroy {

  private readonly destroy$ = new Subject<void>();
  
  // Configuración
  settings: DeviceComparisonWidgetSettings = deviceComparisonDefaultSettings();
  configForm: FormGroup;
  
  // Datos
  deviceData: DeviceComparisonData[] = [];
  filteredData: DeviceComparisonData[] = [];
  loading = false;
  
  // UI State
  searchText = '';
  selectedDeviceType = '';
  // Filtros avanzados
  filters: {
    online?: boolean;
    outliersOnly?: boolean;
    withAlerts?: boolean;
    topRankOnly?: boolean;
    deviceType?: string;
  } = {};
  
  // Enums para template
  ComparisonLayout = ComparisonLayout;
  RankingCriteria = RankingCriteria;
  DataKeyType = DataKeyType;

  constructor(
    protected store: Store<AppState>,
    private readonly fb: FormBuilder,
    private readonly deviceComparisonService: DeviceComparisonService,
    private readonly entityService: EntityService,
    private readonly deviceService: DeviceService,
  private readonly telemetryService: TelemetryWebsocketService,
  private readonly attributeService: AttributeService,
  private readonly alarmService: AlarmService,
    private readonly router: Router,
    private readonly dialog: MatDialog
  ) {
    super(store);
  }

  ngOnInit() {
    this.initializeForm();
    this.loadDevices();
    this.setupFormSubscriptions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openFiltersDialog() {
    const dialogRef = this.dialog.open(DeviceComparisonFiltersDialogComponent, {
      disableClose: false,
      width: '520px',
      data: { filters: this.filters, deviceTypes: this.getDeviceTypes() }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.filters = { ...result };
        this.processDeviceData();
      }
    });
  }

  openSearchDialog() {
    const dialogRef = this.dialog.open(DeviceComparisonSearchDialogComponent, {
      disableClose: false,
      width: '520px',
      data: { searchText: this.searchText }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (typeof result === 'string') {
        this.searchText = result;
        this.processDeviceData();
      }
    });
  }

  openConfigDialog() {
    const dialogRef = this.dialog.open(DeviceComparisonConfigDialogComponent, {
      disableClose: true,
      width: '480px',
      data: { settings: this.settings }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.settings = { ...result };
        // Sync reactive form for consistency (if any other bindings rely on it)
        if (this.configForm) {
          this.configForm.patchValue({
            maxDevices: this.settings.maxDevices,
            layout: this.settings.layout,
            enableRanking: this.settings.enableRanking,
            rankingCriteria: this.settings.rankingCriteria,
            enableOutlierDetection: this.settings.enableOutlierDetection,
            outlierThreshold: this.settings.outlierThreshold,
            enableOfflineAlerts: this.settings.enableOfflineAlerts,
            refreshInterval: this.settings.refreshInterval
          }, { emitEvent: false });
        }
        this.processDeviceData();
      }
    });
  }

  private initializeForm() {
    this.configForm = this.fb.group({
      maxDevices: [this.settings.maxDevices, [Validators.min(1), Validators.max(50)]],
      layout: [this.settings.layout],
      enableRanking: [this.settings.enableRanking],
      rankingCriteria: [this.settings.rankingCriteria],
      enableOutlierDetection: [this.settings.enableOutlierDetection],
      outlierThreshold: [this.settings.outlierThreshold, [Validators.min(0.1), Validators.max(5.0)]],
      enableOfflineAlerts: [this.settings.enableOfflineAlerts],
      refreshInterval: [this.settings.refreshInterval, [Validators.min(1000)]]
    });
  }

  private setupFormSubscriptions() {
    this.configForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(values => {
        this.settings = { ...this.settings, ...values };
        this.processDeviceData();
      });
  }

  private loadDevices() {
    this.loading = true;
    
    // Cargar dispositivos reales del tenant
    const pageLink = new PageLink(100, 0, '', { property: 'name', direction: Direction.ASC });
    this.deviceService.getTenantDeviceInfos(pageLink, '')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (pageData) => {
          this.deviceData = pageData.data.map(device => this.mapDeviceToComparisonData(device));
          // Cargar telemetría más reciente para las métricas configuradas
          this.loadLatestMetricsForDevices(pageData.data);
        },
        error: (error) => {
          console.error('Error loading devices:', error);
          this.loading = false;
        }
      });
  }

  /**
   * Mapea un dispositivo real de ThingsBoard al formato de DeviceComparisonData
   */
  private mapDeviceToComparisonData(device: any): DeviceComparisonData {
    // Obtener el tipo de dispositivo desde los atributos o usar 'Device' por defecto
    const deviceType = device.type || 'Device';
    
    // Determinar si está online basado en la última actividad
    const lastActive = device.lastActivityTime ?? device.active ? Date.now() : 0;
    const isOnline = !!lastActive && (Date.now() - lastActive) < (5 * 60 * 1000); // 5 min
    
    // Cargar métricas de telemetría (esto se puede mejorar cargando datos reales)
    const metrics = this.getDeviceMetrics(device.id);
    
    return {
      deviceId: device.id.id,
      deviceName: device.name,
      deviceType: deviceType,
      isOnline: isOnline,
      lastSeen: device.lastActivityTime || Date.now(),
      metrics: metrics,
      score: 0,
      rank: 0,
      alerts: [],
      isOutlier: false
    };
  }

  /**
   * Obtiene las métricas de telemetría de un dispositivo
   */
  private getDeviceMetrics(deviceId: any): { [key: string]: number } {
    // Inicialmente sin datos; se rellenará con telemetría real en loadLatestMetricsForDevices
    return {};
  }

  /**
   * Carga la telemetría más reciente (latest timeseries) para las claves definidas en settings.metrics
   * y actualiza this.deviceData en su sitio.
   */
  private loadLatestMetricsForDevices(deviceInfos: any[]) {
    const keys = Array.from(new Set(this.settings.metrics.map(m => m.key).filter(Boolean)));
    if (!deviceInfos.length) {
      this.processDeviceData();
      this.loading = false;
      return;
    }
    if (!keys.length) {
      // Si no hay métricas configuradas, cargar solo alarmas
      this.loadActiveAlarmsForDevices(deviceInfos);
      return;
    }

    // Ejecutar solicitudes en paralelo; cada resultado se asigna por índice
    const requests = deviceInfos.map(info =>
      this.attributeService.getEntityTimeseriesLatest(info.id, keys).pipe(
        // No tipamos estrictamente el resultado para ser tolerantes al backend
        // y devolvemos objeto vacío en caso de error
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (source => source),
      )
    );

    // Suscribir y actualizar métricas (join de todas las solicitudes)
  forkJoin(requests).pipe(takeUntil(this.destroy$)).subscribe({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: (results: any[]) => {
        results.forEach((ts, idx) => {
          const metrics: { [key: string]: number } = {};
          keys.forEach(k => {
            const series = ts?.[k];
            if (Array.isArray(series) && series.length) {
              const v = series[0]?.value;
              const num = typeof v === 'number' ? v : parseFloat(v);
              if (!isNaN(num)) {
                metrics[k] = num;
              }
            }
          });
          this.deviceData[idx].metrics = { ...this.deviceData[idx].metrics, ...metrics };
        });
        // Después de cargar métricas, cargar alarmas reales
        this.loadActiveAlarmsForDevices(deviceInfos);
      },
      error: () => {
        // Si falló la carga de métricas, intentar aún así cargar alarmas
        this.loadActiveAlarmsForDevices(deviceInfos);
      }
    });
  }

  /**
   * Carga alarmas reales activas para cada dispositivo y las asigna a device.alerts
   */
  private loadActiveAlarmsForDevices(deviceInfos: any[]) {
    if (!deviceInfos?.length) {
      this.processDeviceData();
      this.loading = false;
      return;
    }

    const now = Date.now();
    const startTime = now - 7 * 24 * 60 * 60 * 1000; // última semana
    const timePage = new TimePageLink(10, 0, null, null, startTime, now);

    const alarmRequests = deviceInfos.map(info => {
      const entityId = info.id; // { entityType: 'DEVICE', id: '...' }
      const query = new AlarmQuery(entityId, timePage, AlarmSearchStatus.ACTIVE, null, true);
      return this.alarmService.getAlarms(query);
    });

    forkJoin(alarmRequests).pipe(takeUntil(this.destroy$)).subscribe({
      next: (pages) => {
        pages.forEach((page, idx) => {
          const alarms: AlarmInfo[] = page?.data || [];
          const mapped = alarms.map(a => ({
            level: this.mapSeverityToAlertLevel(a.severity),
            message: this.formatAlarmLabel(a),
            timestamp: a.startTs
          }));
          this.deviceData[idx].alerts = mapped;
        });
        this.processDeviceData();
        this.loading = false;
      },
      error: () => {
        // Si falló carga de alarmas, continuar sin ellas
        this.processDeviceData();
        this.loading = false;
      }
    });
  }

  private mapSeverityToAlertLevel(severity: AlarmSeverity): AlertLevel {
    switch (severity) {
      case AlarmSeverity.CRITICAL:
      case AlarmSeverity.MAJOR:
        return AlertLevel.error;
      case AlarmSeverity.MINOR:
      case AlarmSeverity.WARNING:
        return AlertLevel.warning;
      default:
        return AlertLevel.info;
    }
  }

  private formatAlarmLabel(a: AlarmInfo): string {
    // Preferir detalles.message si existe; si no, tipo + severidad
    const base = (a.details?.message) ? a.details.message : a.type || 'Alarma';
    const sev = a.severity ? a.severity.toString() : '';
    return sev ? `${base} (${sev})` : base;
  }

  private processDeviceData() {
    if (!this.deviceData.length) return;

    // Aplicar filtros
    this.filteredData = this.deviceData.filter(device => {
      const matchesSearch = !this.searchText || 
        device.deviceName.toLowerCase().includes(this.searchText.toLowerCase()) ||
        device.deviceType.toLowerCase().includes(this.searchText.toLowerCase());
      
      const effectiveType = this.filters.deviceType ?? this.selectedDeviceType;
      const matchesType = !effectiveType || device.deviceType === effectiveType;
      const matchesOnline = this.filters.online == null ? true : (device.isOnline === this.filters.online);
      const matchesOutliers = this.filters.outliersOnly ? device.isOutlier : true;
      const matchesAlerts = this.filters.withAlerts ? (device.alerts && device.alerts.length > 0) : true;
      const matchesTopRank = this.filters.topRankOnly ? (device.rank > 0 && device.rank <= 10) : true;

      return matchesSearch && matchesType && matchesOnline && matchesOutliers && matchesAlerts && matchesTopRank;
    });

    // Procesar con el servicio
    this.filteredData = this.deviceComparisonService.calculateDeviceRanking(
      this.filteredData,
      this.settings
    );
    
    this.filteredData = this.deviceComparisonService.detectOutliers(
      this.filteredData,
      this.settings
    );
    
    // Ya no generamos alertas sintéticas aquí; device.alerts proviene de alarmas reales

    // Aplicar límite máximo
    if (this.filteredData.length > this.settings.maxDevices) {
      this.filteredData = this.filteredData.slice(0, this.settings.maxDevices);
    }
  }

  onSearchChange(searchText: string) {
    this.searchText = searchText;
    this.processDeviceData();
  }

  onDeviceTypeChange(deviceType: string) {
    this.selectedDeviceType = deviceType;
    this.processDeviceData();
  }

  onRefresh() {
    this.loadDevices();
  }

  onExportData() {
    this.deviceComparisonService.exportDeviceData(this.filteredData, 'csv').subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `device-comparison-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  addMetric() {
    const newMetric: MetricConfig = {
      key: '',
      label: 'Nueva Métrica',
      unit: '',
      format: '0.1',
      enabled: true,
      weight: 1.0,
      thresholds: {
        warning: 80,
        error: 90
      }
    };
    
    this.settings.metrics.push(newMetric);
  }

  removeMetric(index: number) {
    this.settings.metrics.splice(index, 1);
    this.processDeviceData();
  }

  getDeviceTypes(): string[] {
    return [...new Set(this.deviceData.map(d => d.deviceType))];
  }

  getStatusColor(device: DeviceComparisonData): string {
    if (!device.isOnline) return 'warn';
    if (device.alerts.length > 0) return 'accent';
    return 'primary';
  }

  getStatusText(device: DeviceComparisonData): string {
    if (!device.isOnline) return 'Desconectado';
    if (device.alerts.length > 0) return 'Con alarmas';
    return 'En línea';
  }

  trackByDeviceId(index: number, device: DeviceComparisonData): string {
    return device.deviceId;
  }

  getDisplayedColumns(): string[] {
    const columns = ['device'];
    
    if (this.settings.enableRanking) {
      columns.unshift('rank');
    }
    
    // Add metric columns
    this.settings.metrics.slice(0, 5).forEach(metric => {
      columns.push(metric.key);
    });
    
    columns.push('alerts');
    
    return columns;
  }

  /**
   * Navega a la página de detalles del dispositivo
   */
  onDeviceDetails(device: DeviceComparisonData) {
    this.router.navigate(['/devices', device.deviceId]);
  }

  /**
   * Obtiene el icono apropiado según el tipo de dispositivo
   */
  getDeviceIcon(device: DeviceComparisonData): string {
    if (!device.isOnline) {
      return 'portable_wifi_off';
    }

    const deviceType = device.deviceType.toLowerCase();
    
    switch (deviceType) {
      case 'sensor':
        return 'sensors';
      case 'gateway':
        return 'router';
      case 'controller':
        return 'settings_input_component';
      case 'monitor':
        return 'monitor';
      case 'camera':
        return 'videocam';
      case 'actuator':
        return 'build';
      case 'meter':
        return 'speed';
      default:
        return 'device_hub';
    }
  }
}
