import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'tb-device-comparison-search-dialog',
  templateUrl: './device-comparison-search-dialog.component.html'
})
export class DeviceComparisonSearchDialogComponent {
  form: FormGroup;
  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DeviceComparisonSearchDialogComponent, string>,
    @Inject(MAT_DIALOG_DATA) public data: { searchText: string }
  ) {
    this.form = this.fb.group({ searchText: [data.searchText || ''] });
  }
  cancel() { this.dialogRef.close(); }
  apply() { this.dialogRef.close(this.form.value.searchText || ''); }
}
