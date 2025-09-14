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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from '@shared/shared.module';
import { DeviceComparisonWidgetComponent } from './device-comparison-widget.component';
import { WidgetContext } from '@home/models/widget-component.models';
import { WidgetComponent } from '@home/components/widget/widget.component';
import {
  deviceComparisonDefaultSettings,
  ComparisonLayout,
  RankingCriteria,
  AlertLevel
} from './device-comparison-widget.models';

describe('DeviceComparisonWidgetComponent', () => {
  let component: DeviceComparisonWidgetComponent;
  let fixture: ComponentFixture<DeviceComparisonWidgetComponent>;
  let mockWidgetContext: jasmine.SpyObj<WidgetContext>;

  beforeEach(async () => {
    const widgetContextSpy = jasmine.createSpyObj('WidgetContext', ['registerLabelPattern'], {
      $scope: {},
      settings: deviceComparisonDefaultSettings(),
      data: [],
      datasources: []
    });

    const widgetComponentSpy = jasmine.createSpyObj('WidgetComponent', [''], {
      typeParameters: {}
    });

    await TestBed.configureTestingModule({
      declarations: [DeviceComparisonWidgetComponent],
      imports: [
        NoopAnimationsModule,
        SharedModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: WidgetComponent, useValue: widgetComponentSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DeviceComparisonWidgetComponent);
    component = fixture.componentInstance;
    mockWidgetContext = widgetContextSpy;
    component.ctx = mockWidgetContext;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default settings', () => {
    component.ngOnInit();
    
    expect(component.settings).toBeDefined();
    expect(component.settings.layout).toBe(ComparisonLayout.grid);
    expect(component.settings.enableRanking).toBe(true);
    expect(component.settings.enableOutlierDetection).toBe(true);
  });

  it('should process device data correctly', () => {
    const mockData = [
      {
        entityId: 'device1',
        entityName: 'Temperature Sensor 1',
        entityType: 'DEVICE',
        data: [[Date.now(), 25.5]],
        dataKey: { name: 'temperature' }
      },
      {
        entityId: 'device2',
        entityName: 'Temperature Sensor 2',
        entityType: 'DEVICE',
        data: [[Date.now(), 30.2]],
        dataKey: { name: 'temperature' }
      }
    ];

    component.ctx.data = mockData;
    component.ngOnInit();
    component.onDataUpdated();

    expect(component.devices.length).toBe(2);
    expect(component.devices[0].deviceName).toBe('Temperature Sensor 1');
    expect(component.devices[0].metrics['temperature']).toBe(25.5);
    expect(component.devices[1].metrics['temperature']).toBe(30.2);
  });

  it('should calculate ranking correctly', () => {
    const mockDevices = [
      {
        deviceId: 'device1',
        deviceName: 'Device 1',
        deviceType: 'Sensor',
        isOnline: true,
        lastSeen: Date.now(),
        metrics: { temperature: 20 },
        score: 0,
        rank: 0,
        alerts: [],
        isOutlier: false
      },
      {
        deviceId: 'device2',
        deviceName: 'Device 2',
        deviceType: 'Sensor',
        isOnline: true,
        lastSeen: Date.now(),
        metrics: { temperature: 35 },
        score: 0,
        rank: 0,
        alerts: [],
        isOutlier: false
      }
    ];

    component.devices = mockDevices;
    component.settings = deviceComparisonDefaultSettings();
    component.settings.enableRanking = true;
    component.settings.rankingCriteria = RankingCriteria.performance;

    // Simular cálculo de ranking
    component['calculateRanking']();

    expect(component.devices[0].rank).toBeDefined();
    expect(component.devices[1].rank).toBeDefined();
    expect(component.devices.find(d => d.rank === 1)).toBeDefined();
  });

  it('should detect outliers correctly', () => {
    const mockDevices = [
      {
        deviceId: 'device1',
        deviceName: 'Device 1',
        deviceType: 'Sensor',
        isOnline: true,
        lastSeen: Date.now(),
        metrics: { temperature: 25 },
        score: 0,
        rank: 0,
        alerts: [],
        isOutlier: false
      },
      {
        deviceId: 'device2',
        deviceName: 'Device 2',
        deviceType: 'Sensor',
        isOnline: true,
        lastSeen: Date.now(),
        metrics: { temperature: 26 },
        score: 0,
        rank: 0,
        alerts: [],
        isOutlier: false
      },
      {
        deviceId: 'device3',
        deviceName: 'Device 3',
        deviceType: 'Sensor',
        isOnline: true,
        lastSeen: Date.now(),
        metrics: { temperature: 100 }, // Valor atípico
        score: 0,
        rank: 0,
        alerts: [],
        isOutlier: false
      }
    ];

    component.devices = mockDevices;
    component.settings = deviceComparisonDefaultSettings();
    component.settings.enableOutlierDetection = true;
    component.settings.outlierThreshold = 2.0;

    component['detectOutliers']();

    const outlierDevice = component.devices.find(d => d.deviceId === 'device3');
    expect(outlierDevice?.isOutlier).toBe(true);
  });

  it('should generate offline alerts', () => {
    const mockDevices = [
      {
        deviceId: 'device1',
        deviceName: 'Device 1',
        deviceType: 'Sensor',
        isOnline: false,
        lastSeen: Date.now() - 10 * 60 * 1000, // 10 minutos atrás
        metrics: {},
        score: 0,
        rank: 0,
        alerts: [],
        isOutlier: false
      }
    ];

    component.devices = mockDevices;
    component.settings = deviceComparisonDefaultSettings();
    component.settings.enableOfflineAlerts = true;
    component.settings.offlineThreshold = 5; // 5 minutos

    component['generateAlerts']();

    expect(component.devices[0].alerts.length).toBeGreaterThan(0);
    expect(component.devices[0].alerts[0].level).toBe(AlertLevel.error);
  });

  it('should filter devices by search term', () => {
    const mockDevices = [
      {
        deviceId: 'device1',
        deviceName: 'Temperature Sensor',
        deviceType: 'Sensor',
        isOnline: true,
        lastSeen: Date.now(),
        metrics: {},
        score: 0,
        rank: 0,
        alerts: [],
        isOutlier: false
      },
      {
        deviceId: 'device2',
        deviceName: 'Humidity Sensor',
        deviceType: 'Sensor',
        isOnline: true,
        lastSeen: Date.now(),
        metrics: {},
        score: 0,
        rank: 0,
        alerts: [],
        isOutlier: false
      }
    ];

    component.devices = mockDevices;
    component.searchTerm = 'Temperature';

    component['applyFilters']();

    expect(component.filteredDevices.length).toBe(1);
    expect(component.filteredDevices[0].deviceName).toBe('Temperature Sensor');
  });

  it('should track devices by ID', () => {
    const device = {
      deviceId: 'device1',
      deviceName: 'Test Device',
      deviceType: 'Sensor',
      isOnline: true,
      lastSeen: Date.now(),
      metrics: {},
      score: 0,
      rank: 0,
      alerts: [],
      isOutlier: false
    };

    const trackingId = component.trackByDeviceId(0, device);
    expect(trackingId).toBe('device1');
  });

  it('should get correct device icon', () => {
    const temperatureDevice = {
      deviceId: 'device1',
      deviceName: 'Test Device',
      deviceType: 'Temperature Sensor',
      isOnline: true,
      lastSeen: Date.now(),
      metrics: {},
      score: 0,
      rank: 0,
      alerts: [],
      isOutlier: false
    };

    const icon = component.getDeviceIcon(temperatureDevice);
    expect(icon).toBe('thermostat');
  });

  it('should get correct alert color', () => {
    const errorColor = component.getAlertColor(AlertLevel.error);
    const warningColor = component.getAlertColor(AlertLevel.warning);
    const infoColor = component.getAlertColor(AlertLevel.info);

    expect(errorColor).toBeDefined();
    expect(warningColor).toBeDefined();
    expect(infoColor).toBeDefined();
  });

  it('should get correct device status color', () => {
    const onlineDevice = {
      deviceId: 'device1',
      deviceName: 'Test Device',
      deviceType: 'Sensor',
      isOnline: true,
      lastSeen: Date.now(),
      metrics: {},
      score: 0,
      rank: 0,
      alerts: [],
      isOutlier: false
    };

    const offlineDevice = {
      ...onlineDevice,
      isOnline: false
    };

    const onlineColor = component.getDeviceStatusColor(onlineDevice);
    const offlineColor = component.getDeviceStatusColor(offlineDevice);

    expect(onlineColor).toBeDefined();
    expect(offlineColor).toBeDefined();
    expect(onlineColor).not.toBe(offlineColor);
  });

  it('should return correct displayed columns for table layout', () => {
    component.settings = deviceComparisonDefaultSettings();
    component.settings.enableRanking = true;
    component.settings.metrics = [
      { key: 'temperature', label: 'Temperature', enabled: true, unit: '°C', format: '0.1', weight: 1, thresholds: { warning: 30, error: 40 } },
      { key: 'humidity', label: 'Humidity', enabled: false, unit: '%', format: '0.1', weight: 1, thresholds: { warning: 80, error: 90 } }
    ];

    const columns = component.getDisplayedColumns();

    expect(columns).toContain('rank');
    expect(columns).toContain('device');
    expect(columns).toContain('status');
    expect(columns).toContain('temperature');
    expect(columns).not.toContain('humidity'); // disabled metric
    expect(columns).toContain('alerts');
  });
});
