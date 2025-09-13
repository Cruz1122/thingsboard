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

import { ChangeDetectorRef, Component, Injector } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { BasicWidgetConfigComponent } from '@home/components/widget/config/widget-config.component.models';
import { WidgetConfigComponentData } from '@home/models/widget-component.models';
import { DataKey } from '@shared/models/widget.models';
import { WidgetConfigComponent } from '@home/components/widget/widget-config.component';
import { DataKeyType } from '@shared/models/telemetry/telemetry.models';
import { getSourceTbUnitSymbol } from '@shared/models/unit.models';
import {
  DeviceComparisonWidgetSettings,
  deviceComparisonDefaultSettings,
  ComparisonLayout,
  comparisonLayoutTranslations,
  RankingCriteria,
  rankingCriteriaTranslations
} from '@home/components/widget/lib/comparison/device-comparison-widget.models';

@Component({
  selector: 'tb-device-comparison-basic-config',
  templateUrl: './device-comparison-basic-config.component.html',
  styleUrls: ['../basic-config.scss']
})
export class DeviceComparisonBasicConfigComponent extends BasicWidgetConfigComponent {

  ComparisonLayout = ComparisonLayout;
  RankingCriteria = RankingCriteria;

  comparisonLayoutTranslationMap = comparisonLayoutTranslations;
  rankingCriteriaTranslationMap = rankingCriteriaTranslations;

  comparisonLayouts = Object.keys(ComparisonLayout) as ComparisonLayout[];
  rankingCriterias = Object.keys(RankingCriteria) as RankingCriteria[];

  deviceComparisonWidgetConfigForm: UntypedFormGroup;

  constructor(protected store: Store<AppState>,
              private readonly fb: UntypedFormBuilder,
              protected widgetConfigComponent: WidgetConfigComponent,
              private readonly cd: ChangeDetectorRef,
              protected injector: Injector) {
    super(store, widgetConfigComponent);
  }

  protected configForm(): UntypedFormGroup {
    return this.fb.group({
      // Layout
      layout: [null, []],
      maxDevices: [null, [Validators.min(1), Validators.max(50)]],
      
      // Refresh
      autoRefresh: [null, []],
      refreshInterval: [null, [Validators.min(5), Validators.max(3600)]],
      
      // Ranking
      enableRanking: [null, []],
      rankingCriteria: [null, []],
      
      // Outlier detection
      enableOutlierDetection: [null, []],
      outlierThreshold: [null, [Validators.min(1), Validators.max(5)]],
      
      // Alerts
      enableOfflineAlerts: [null, []],
      offlineThreshold: [null, [Validators.min(1), Validators.max(1440)]],
      enableThresholdAlerts: [null, []],
      
      // Display options
      showDeviceIcons: [null, []],
      showRankingBadges: [null, []],
      showAlertIndicators: [null, []],
      
      // Search and export
      enableDeviceSearch: [null, []],
      enableExport: [null, []]
    });
  }

  protected defaultDataKeys(configData: WidgetConfigComponentData): DataKey[] {
    return [
      { 
        name: 'temperature', 
        type: DataKeyType.timeseries, 
        label: 'Temperatura', 
        color: '#2196F3', 
        settings: {}, 
        _hash: Math.random() 
      },
      { 
        name: 'humidity', 
        type: DataKeyType.timeseries, 
        label: 'Humedad', 
        color: '#4CAF50', 
        settings: {}, 
        _hash: Math.random() 
      },
      { 
        name: 'battery', 
        type: DataKeyType.timeseries, 
        label: 'Batería', 
        color: '#FF9800', 
        settings: {}, 
        _hash: Math.random() 
      }
    ];
  }

  protected defaultSettings(): DeviceComparisonWidgetSettings {
    return deviceComparisonDefaultSettings();
  }

  protected onConfigSet(configData: WidgetConfigComponentData) {
    this.deviceComparisonWidgetConfigForm = this.configForm();
    // Configurar el formulario con los valores iniciales
    
    const settings: DeviceComparisonWidgetSettings = {...this.defaultSettings(), ...configData.config.settings};
    
    // Actualizar métricas basadas en las data keys
    if (configData.config.datasources && configData.config.datasources.length > 0) {
      const datasource = configData.config.datasources[0];
      if (datasource.dataKeys && datasource.dataKeys.length > 0) {
        settings.metrics = datasource.dataKeys.map((dataKey) => ({
          key: dataKey.name,
          label: dataKey.label || dataKey.name,
          unit: getSourceTbUnitSymbol(dataKey.units),
          format: '0.1',
          enabled: true,
          weight: 1,
          thresholds: {
            warning: 30,
            error: 10
          }
        }));
      }
    }
    
    this.deviceComparisonWidgetConfigForm.patchValue({
      layout: settings.layout,
      maxDevices: settings.maxDevices,
      autoRefresh: settings.autoRefresh,
      refreshInterval: settings.refreshInterval,
      enableRanking: settings.enableRanking,
      rankingCriteria: settings.rankingCriteria,
      enableOutlierDetection: settings.enableOutlierDetection,
      outlierThreshold: settings.outlierThreshold,
      enableOfflineAlerts: settings.enableOfflineAlerts,
      offlineThreshold: settings.offlineThreshold,
      enableThresholdAlerts: settings.enableThresholdAlerts,
      showDeviceIcons: settings.showDeviceIcons,
      showRankingBadges: settings.showRankingBadges,
      showAlertIndicators: settings.showAlertIndicators,
      enableDeviceSearch: settings.enableDeviceSearch,
      enableExport: settings.enableExport
    });

    this.widgetConfig.config.settings = settings;
  }

  protected validatorTriggers(): string[] {
    return [];
  }

  protected updateValidators(emitEvent: boolean) {
    // No hay validaciones específicas necesarias por ahora
  }

  public onLayoutChanged(): void {
    this.updateWidgetSettings();
  }

  public onRankingCriteriaChanged(): void {
    this.updateWidgetSettings();
  }

  updateWidgetSettings(): void {
    if (this.deviceComparisonWidgetConfigForm.valid) {
      const formValue = this.deviceComparisonWidgetConfigForm.value;
      const settings: DeviceComparisonWidgetSettings = {
        ...this.widgetConfig.config.settings,
        ...formValue
      };
      this.widgetConfig.config.settings = settings;
      this.updateModel();
    }
  }

  protected updateModel() {
    this.widgetConfigChangedEmitter.emit(this.widgetConfig);
  }

  public get targetDeviceAliasIds(): Array<string> {
    const targetDeviceAliasIds: Array<string> = [];
    if (this.widgetConfig.config.targetDeviceAliasIds) {
      targetDeviceAliasIds.push(...this.widgetConfig.config.targetDeviceAliasIds);
    }
    return targetDeviceAliasIds;
  }

  public set targetDeviceAliasIds(targetDeviceAliasIds: Array<string>) {
    this.widgetConfig.config.targetDeviceAliasIds = targetDeviceAliasIds;
    this.updateModel();
  }
}