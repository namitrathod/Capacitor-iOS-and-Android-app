import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface LeaveGroupDialogData {
  groupName?: string | null;
}

@Component({
  selector: 'app-leave-group-dialog',
  templateUrl: './leave-group-dialog.component.html',
  styleUrls: ['./leave-group-dialog.component.sass'],
})
export class LeaveGroupDialogComponent {
  constructor(
    private readonly ref: MatDialogRef<LeaveGroupDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: LeaveGroupDialogData
  ) {}

  cancel(): void {
    this.ref.close(false);
  }

  confirm(): void {
    this.ref.close(true);
  }
}

