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
  deviceComparisonDefaultSettings 
} from '@home/components/widget/lib/comparison/device-comparison-widget.models';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EntityService } from '@core/http/entity.service';
import { DeviceService } from '@core/http/device.service';
import { TelemetryWebsocketService } from '@core/ws/telemetry-websocket.service';
import { DataKeyType } from '@shared/models/telemetry/telemetry.models';
import { PageLink } from '@shared/models/page/page-link';
import { Direction } from '@shared/models/page/sort-order';

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
  
  // Enums para template
  ComparisonLayout = ComparisonLayout;
  RankingCriteria = RankingCriteria;
  DataKeyType = DataKeyType;

  constructor(
    protected store: Store<AppState>,
    private fb: FormBuilder,
    private deviceComparisonService: DeviceComparisonService,
    private entityService: EntityService,
    private deviceService: DeviceService,
    private telemetryService: TelemetryWebsocketService,
    private router: Router
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
      .subscribe(
        (pageData) => {
          this.deviceData = pageData.data.map(device => this.mapDeviceToComparisonData(device));
          this.processDeviceData();
          this.loading = false;
        },
        (error) => {
          console.error('Error loading devices:', error);
          this.loading = false;
        }
      );
  }

  /**
   * Mapea un dispositivo real de ThingsBoard al formato de DeviceComparisonData
   */
  private mapDeviceToComparisonData(device: any): DeviceComparisonData {
    // Obtener el tipo de dispositivo desde los atributos o usar 'Device' por defecto
    const deviceType = device.type || 'Device';
    
    // Determinar si está online basado en la última actividad
    const isOnline = device.lastActivityTime && 
      (Date.now() - device.lastActivityTime) < (5 * 60 * 1000); // 5 minutos
    
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
    // Por ahora retornamos métricas vacías, pero aquí se pueden cargar datos reales
    // de telemetría usando el TelemetryWebsocketService
    return {
      temperature: Math.random() * 100, // Temporal - reemplazar con datos reales
      humidity: Math.random() * 100,    // Temporal - reemplazar con datos reales
      battery: Math.random() * 100,     // Temporal - reemplazar con datos reales
      signal: Math.random() * 100       // Temporal - reemplazar con datos reales
    };
  }

  private processDeviceData() {
    if (!this.deviceData.length) return;

    // Aplicar filtros
    this.filteredData = this.deviceData.filter(device => {
      const matchesSearch = !this.searchText || 
        device.deviceName.toLowerCase().includes(this.searchText.toLowerCase()) ||
        device.deviceType.toLowerCase().includes(this.searchText.toLowerCase());
      
      const matchesType = !this.selectedDeviceType || 
        device.deviceType === this.selectedDeviceType;
      
      return matchesSearch && matchesType;
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
    
    // Generar alertas
    this.filteredData = this.deviceComparisonService.generateAlerts(
      this.filteredData,
      this.settings
    );

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
    this.deviceComparisonService.exportDeviceData(this.filteredData, 'csv');
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
    if (device.alerts.length > 0) return 'Con alertas';
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
