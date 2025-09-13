///
/// Copyright © 2016-2025 The Thingsboard Authors
///
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface DeviceComparisonFiltersData {
  filters: {
    online?: boolean;
    outliersOnly?: boolean;
    withAlerts?: boolean;
    topRankOnly?: boolean;
    deviceType?: string;
  };
  deviceTypes: string[];
}

@Component({
  selector: 'tb-device-comparison-filters-dialog',
  templateUrl: './device-comparison-filters-dialog.component.html',
  styleUrls: ['./device-comparison-filters-dialog.component.scss']
})
export class DeviceComparisonFiltersDialogComponent {
  form: FormGroup;
  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DeviceComparisonFiltersDialogComponent, DeviceComparisonFiltersData['filters']>,
    @Inject(MAT_DIALOG_DATA) public data: DeviceComparisonFiltersData
  ) {
    this.form = this.fb.group({
      online: [data.filters?.online ?? null],
      outliersOnly: [data.filters?.outliersOnly ?? false],
      withAlerts: [data.filters?.withAlerts ?? false],
      topRankOnly: [data.filters?.topRankOnly ?? false],
      deviceType: [data.filters?.deviceType ?? '']
    });
  }

  cancel() { this.dialogRef.close(); }
  apply() { this.dialogRef.close(this.form.value); }
}
