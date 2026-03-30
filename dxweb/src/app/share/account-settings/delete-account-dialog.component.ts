import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface DeleteAccountDialogData {
  email?: string;
}

@Component({
  selector: 'app-delete-account-dialog',
  templateUrl: './delete-account-dialog.component.html',
  styleUrls: ['./delete-account-dialog.component.sass'],
})
export class DeleteAccountDialogComponent {
  constructor(
    private readonly ref: MatDialogRef<DeleteAccountDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: DeleteAccountDialogData
  ) {}

  cancel(): void {
    this.ref.close(false);
  }

  confirm(): void {
    this.ref.close(true);
  }
}

