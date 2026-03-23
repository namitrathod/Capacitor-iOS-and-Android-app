import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { formatHttpError } from 'src/app/core/http-error.util';
import { GroupMemberOut, GroupsService } from '../../groups.service';

export interface AddExpenseDialogData {
  groupId: number;
  members: GroupMemberOut[];
  groupName: string;
  currentUserId: number | null;
  defaultPaidByUserId: number | null;
  defaultParticipantIds: number[];
}

@Component({
  selector: 'app-add-expense-dialog',
  templateUrl: './add-expense-dialog.component.html',
  styleUrls: ['./add-expense-dialog.component.sass'],
})
export class AddExpenseDialogComponent {
  error = '';
  saving = false;

  description = '';
  amount: number | null = null;
  currentUserId: number | null;
  paidByUserId: number | null;
  participantUserIds: Set<number>;

  constructor(
    private readonly dialogRef: MatDialogRef<AddExpenseDialogComponent, boolean>,
    private readonly groupsService: GroupsService,
    @Inject(MAT_DIALOG_DATA) public readonly data: AddExpenseDialogData
  ) {
    this.paidByUserId = data.defaultPaidByUserId;
    this.participantUserIds = new Set(data.defaultParticipantIds);
    this.currentUserId = data.currentUserId;
  }

  isParticipant(uid: number): boolean {
    return this.participantUserIds.has(uid);
  }

  setParticipant(uid: number, checked: boolean): void {
    if (checked) this.participantUserIds.add(uid);
    else this.participantUserIds.delete(uid);
    this.participantUserIds = new Set(this.participantUserIds);
  }

  memberLabel(m: GroupMemberOut): string {
    return m.full_name || m.email;
  }

  paidByLabel(m: GroupMemberOut): string {
    if (this.currentUserId != null && m.user_id === this.currentUserId) return 'You';
    return this.memberLabel(m);
  }

  submit(): void {
    if (this.paidByUserId == null) return;
    if (this.amount == null) return;

    const desc = this.description.trim();
    if (!desc) {
      this.error = 'Enter a description';
      return;
    }
    if (this.amount <= 0) {
      this.error = 'Amount must be positive';
      return;
    }

    const participantIds = [...this.participantUserIds];
    if (participantIds.length === 0) {
      this.error = 'Pick at least one person to split with';
      return;
    }

    this.error = '';
    this.saving = true;

    this.groupsService
      .createExpense(this.data.groupId, {
        description: desc,
        amount: this.amount,
        paid_by_user_id: this.paidByUserId,
        participant_user_ids: participantIds,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving = false;
          this.error = formatHttpError(err);
        },
      });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}

