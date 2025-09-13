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

import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DeviceComparisonWidgetSettings, RankingCriteria, ComparisonLayout } from '@home/components/widget/lib/comparison/device-comparison-widget.models';

export interface DeviceComparisonConfigDialogData {
  settings: DeviceComparisonWidgetSettings;
}

@Component({
  selector: 'tb-device-comparison-config-dialog',
  templateUrl: './device-comparison-config-dialog.component.html',
  styleUrls: ['./device-comparison-config-dialog.component.scss']
})
export class DeviceComparisonConfigDialogComponent implements OnInit {

  form: FormGroup;

  ComparisonLayout = ComparisonLayout;
  RankingCriteria = RankingCriteria;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DeviceComparisonConfigDialogData,
    private dialogRef: MatDialogRef<DeviceComparisonConfigDialogComponent, DeviceComparisonWidgetSettings>,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    const s = this.data.settings;
    this.form = this.fb.group({
      maxDevices: [s.maxDevices, [Validators.min(1), Validators.max(50)]],
      layout: [s.layout, []],
      refreshInterval: [s.refreshInterval, [Validators.min(1)]],
      enableRanking: [s.enableRanking, []],
      rankingCriteria: [s.rankingCriteria, []],
  customRankingFormula: [s.customRankingFormula || '', [Validators.pattern(/^[\w+\-*/().\s]*$/)]],
      enableOutlierDetection: [s.enableOutlierDetection, []],
      outlierThreshold: [s.outlierThreshold, [Validators.min(0.1), Validators.max(5.0)]],
      enableOfflineAlerts: [s.enableOfflineAlerts, []]
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  apply(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const newSettings: DeviceComparisonWidgetSettings = {
      ...this.data.settings,
      ...this.form.value
    };
    this.dialogRef.close(newSettings);
  }
}
