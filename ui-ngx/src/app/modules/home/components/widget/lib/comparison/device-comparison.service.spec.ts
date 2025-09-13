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

import { TestBed } from '@angular/core/testing';
import { DeviceComparisonService } from './device-comparison.service';
import {
  DeviceComparisonData,
  DeviceComparisonWidgetSettings,
  deviceComparisonDefaultSettings,
  RankingCriteria,
  AlertLevel
} from './device-comparison-widget.models';

describe('DeviceComparisonService', () => {
  let service: DeviceComparisonService;
  let mockDevices: DeviceComparisonData[];
  let mockSettings: DeviceComparisonWidgetSettings;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeviceComparisonService);

    mockSettings = deviceComparisonDefaultSettings();
    
    mockDevices = [
      {
        deviceId: 'device1',
        deviceName: 'Temperature Sensor 1',
        deviceType: 'Temperature Sensor',
        isOnline: true,
        lastSeen: Date.now(),
        metrics: { temperature: 25.5, humidity: 60, battery: 85 },
        score: 0,
        rank: 0,
        alerts: [],
        isOutlier: false
      },
      {
        deviceId: 'device2',
        deviceName: 'Temperature Sensor 2',
        deviceType: 'Temperature Sensor',
        isOnline: true,
        lastSeen: Date.now(),
        metrics: { temperature: 30.2, humidity: 65, battery: 90 },
        score: 0,
        rank: 0,
        alerts: [],
        isOutlier: false
      },
      {
        deviceId: 'device3',
        deviceName: 'Temperature Sensor 3',
        deviceType: 'Temperature Sensor',
        isOnline: false,
        lastSeen: Date.now() - 10 * 60 * 1000,
        metrics: { temperature: 22.1, humidity: 55, battery: 15 },
        score: 0,
        rank: 0,
        alerts: [],
        isOutlier: false
      }
    ];
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateDeviceRanking', () => {
    it('should calculate ranking when enabled', () => {
      mockSettings.enableRanking = true;
      mockSettings.rankingCriteria = RankingCriteria.performance;

      const rankedDevices = service.calculateDeviceRanking(mockDevices, mockSettings);

      expect(rankedDevices.every(device => device.rank > 0)).toBe(true);
      expect(rankedDevices.every(device => device.score >= 0)).toBe(true);
      
      // Verificar que el ranking está ordenado correctamente
      for (let i = 0; i < rankedDevices.length - 1; i++) {
        expect(rankedDevices[i].score).toBeGreaterThanOrEqual(rankedDevices[i + 1].score);
      }
    });

    it('should not calculate ranking when disabled', () => {
      mockSettings.enableRanking = false;

      const rankedDevices = service.calculateDeviceRanking(mockDevices, mockSettings);

      expect(rankedDevices).toEqual(mockDevices);
    });

    it('should handle empty device list', () => {
      const rankedDevices = service.calculateDeviceRanking([], mockSettings);

      expect(rankedDevices).toEqual([]);
    });

    it('should penalize offline devices in performance ranking', () => {
      mockSettings.enableRanking = true;
      mockSettings.rankingCriteria = RankingCriteria.performance;

      const rankedDevices = service.calculateDeviceRanking(mockDevices, mockSettings);
      
      const offlineDevice = rankedDevices.find(d => !d.isOnline);
      const onlineDevices = rankedDevices.filter(d => d.isOnline);

      // El dispositivo offline debería tener un score menor
      expect(offlineDevice?.score).toBeLessThan(Math.max(...onlineDevices.map(d => d.score)));
    });
  });

  describe('detectOutliers', () => {
    it('should detect outliers when enabled', () => {
      // Agregar un dispositivo con valores atípicos
      const outlierDevice: DeviceComparisonData = {
        deviceId: 'outlier',
        deviceName: 'Outlier Device',
        deviceType: 'Temperature Sensor',
        isOnline: true,
        lastSeen: Date.now(),
        metrics: { temperature: 100, humidity: 95, battery: 5 }, // Valores extremos
        score: 0,
        rank: 0,
        alerts: [],
        isOutlier: false
      };

      const devicesWithOutlier = [...mockDevices, outlierDevice];
      mockSettings.enableOutlierDetection = true;
      mockSettings.outlierThreshold = 2.0;

      const processedDevices = service.detectOutliers(devicesWithOutlier, mockSettings);

      expect(processedDevices.some(device => device.isOutlier)).toBe(true);
    });

    it('should not detect outliers when disabled', () => {
      mockSettings.enableOutlierDetection = false;

      const processedDevices = service.detectOutliers(mockDevices, mockSettings);

      expect(processedDevices.every(device => !device.isOutlier)).toBe(true);
    });

    it('should not detect outliers with insufficient data', () => {
      const twoDevices = mockDevices.slice(0, 2);
      mockSettings.enableOutlierDetection = true;

      const processedDevices = service.detectOutliers(twoDevices, mockSettings);

      expect(processedDevices.every(device => !device.isOutlier)).toBe(true);
    });
  });

  describe('generateAlerts', () => {
    it('should generate offline alerts when enabled', () => {
      mockSettings.enableOfflineAlerts = true;
      mockSettings.offlineThreshold = 5;

      const devicesWithAlerts = service.generateAlerts(mockDevices, mockSettings);

      const offlineDevice = devicesWithAlerts.find(d => !d.isOnline);
      expect(offlineDevice?.alerts.length).toBeGreaterThan(0);
      expect(offlineDevice?.alerts.some(a => a.level === AlertLevel.error)).toBe(true);
    });

    it('should generate threshold alerts when enabled', () => {
      mockSettings.enableThresholdAlerts = true;
      mockSettings.metrics[2].thresholds = { warning: 20, error: 10 }; // Battery thresholds

      const devicesWithAlerts = service.generateAlerts(mockDevices, mockSettings);

      const lowBatteryDevice = devicesWithAlerts.find(d => d.metrics.battery <= 20);
      expect(lowBatteryDevice?.alerts.length).toBeGreaterThan(0);
    });

    it('should generate outlier alerts', () => {
      // Marcar un dispositivo como outlier
      mockDevices[0].isOutlier = true;

      const devicesWithAlerts = service.generateAlerts(mockDevices, mockSettings);

      const outlierDevice = devicesWithAlerts.find(d => d.isOutlier);
      expect(outlierDevice?.alerts.some(a => a.level === AlertLevel.info)).toBe(true);
    });
  });

  describe('filterDevices', () => {
    it('should filter by device type', () => {
      const filteredDevices = service.filterDevices(
        mockDevices,
        ['Temperature Sensor'],
        ''
      );

      expect(filteredDevices.length).toBe(mockDevices.length);
      expect(filteredDevices.every(d => d.deviceType === 'Temperature Sensor')).toBe(true);
    });

    it('should filter by search term', () => {
      const filteredDevices = service.filterDevices(
        mockDevices,
        [],
        'Sensor 1'
      );

      expect(filteredDevices.length).toBe(1);
      expect(filteredDevices[0].deviceName).toContain('Sensor 1');
    });

    it('should filter by both type and search term', () => {
      const filteredDevices = service.filterDevices(
        mockDevices,
        ['Temperature Sensor'],
        'Sensor 2'
      );

      expect(filteredDevices.length).toBe(1);
      expect(filteredDevices[0].deviceName).toContain('Sensor 2');
      expect(filteredDevices[0].deviceType).toBe('Temperature Sensor');
    });

    it('should return all devices when no filters applied', () => {
      const filteredDevices = service.filterDevices(mockDevices, [], '');

      expect(filteredDevices.length).toBe(mockDevices.length);
    });
  });

  describe('exportDeviceData', () => {
    it('should export to CSV format', (done) => {
      service.exportDeviceData(mockDevices, 'csv').subscribe(blob => {
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('text/csv;charset=utf-8;');
        done();
      });
    });

    it('should export to JSON format', (done) => {
      service.exportDeviceData(mockDevices, 'json').subscribe(blob => {
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('application/json;charset=utf-8;');
        done();
      });
    });

    it('should default to CSV format', (done) => {
      service.exportDeviceData(mockDevices).subscribe(blob => {
        expect(blob.type).toBe('text/csv;charset=utf-8;');
        done();
      });
    });
  });

  describe('private methods', () => {
    it('should normalize metric values correctly', () => {
      const metric = mockSettings.metrics[0]; // temperature metric
      
      // Test value below error threshold
      const errorValue = service['normalizeMetricValue'](5, metric);
      expect(errorValue).toBe(0);

      // Test value between error and warning thresholds
      const warningValue = service['normalizeMetricValue'](25, metric);
      expect(warningValue).toBeGreaterThan(0);
      expect(warningValue).toBeLessThanOrEqual(50);

      // Test value above warning threshold
      const goodValue = service['normalizeMetricValue'](35, metric);
      expect(goodValue).toBe(100);
    });

    it('should calculate uptime score correctly', () => {
      const onlineDevice = mockDevices[0];
      const offlineDevice = mockDevices[2];

      const onlineScore = service['calculateUptimeScore'](onlineDevice, mockSettings);
      const offlineScore = service['calculateUptimeScore'](offlineDevice, mockSettings);

      expect(onlineScore).toBe(100);
      expect(offlineScore).toBeLessThan(100);
    });
  });
});
