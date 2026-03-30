import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface DeleteExpenseDialogData {
  description?: string | null;
}

@Component({
  selector: 'app-delete-expense-dialog',
  templateUrl: './delete-expense-dialog.component.html',
  styleUrls: ['./delete-expense-dialog.component.sass'],
})
export class DeleteExpenseDialogComponent {
  constructor(
    private readonly ref: MatDialogRef<DeleteExpenseDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: DeleteExpenseDialogData
  ) {}

  cancel(): void {
    this.ref.close(false);
  }

  confirm(): void {
    this.ref.close(true);
  }
}

