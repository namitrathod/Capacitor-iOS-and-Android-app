import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { formatHttpError } from 'src/app/core/http-error.util';
import { GroupsService, SettlementTransferIn, SettlementRow } from '../../groups.service';

export interface SettleUpDialogData {
  groupId: number;
  settlements: SettlementRow[];
  maxAmount: number;
}

@Component({
  selector: 'app-settle-up-dialog',
  templateUrl: './settle-up-dialog.component.html',
  styleUrls: ['./settle-up-dialog.component.sass'],
})
export class SettleUpDialogComponent {
  error = '';
  settling = false;

  currencySymbol = '$';

  mode: 'full' | 'partial' | 'custom' = 'full';
  partialAmount = 0;

  customDraft: Array<{
    enabled: boolean;
    transfer: SettlementTransferIn & { from_email: string; to_email: string };
    maxAmount: number;
  }> = [];

  constructor(
    private readonly dialogRef: MatDialogRef<SettleUpDialogComponent, boolean>,
    private readonly groupsService: GroupsService,
    @Inject(MAT_DIALOG_DATA) public readonly data: SettleUpDialogData
  ) {
    this.partialAmount = data.maxAmount;
    this.customDraft = data.settlements.map((s) => ({
      enabled: true,
      transfer: {
        from_user_id: s.from_user_id,
        to_user_id: s.to_user_id,
        amount: s.amount,
        // Keep these strings for display.
        from_email: s.from_email,
        to_email: s.to_email,
      },
      maxAmount: s.amount,
    }));
  }

  get previewTransfers(): SettlementRow[] {
    if (this.mode === 'full') return this.data.settlements;

    if (this.mode === 'partial') {
      const max = Math.max(0, this.partialAmount);
      if (max <= 0) return [];
      let remaining = max;
      const out: SettlementRow[] = [];
      for (const s of this.data.settlements) {
        if (remaining <= 0.005) break;
        const amt = Math.min(s.amount, remaining);
        if (amt > 0.005) {
          out.push({ ...s, amount: Math.round(amt * 100) / 100 });
        }
        remaining = Math.round((remaining - amt) * 100) / 100;
      }
      return out;
    }

    // custom
    return this.customDraft
      .filter((d) => d.enabled && d.transfer.amount > 0.005)
      .map((d) => ({
        from_user_id: d.transfer.from_user_id,
        from_email: d.transfer.from_email,
        to_user_id: d.transfer.to_user_id,
        to_email: d.transfer.to_email,
        amount: Math.round(d.transfer.amount * 100) / 100,
      }));
  }

  get previewTotal(): number {
    return this.previewTransfers.reduce((sum, t) => sum + t.amount, 0);
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  get maxAllowed(): number {
    return this.round2(Math.max(0, this.data.maxAmount));
  }

  get customTotal(): number {
    return this.round2(
      this.customDraft
        .filter((d) => d.enabled && d.transfer.amount > 0.005)
        .reduce((sum, d) => sum + (d.transfer.amount || 0), 0)
    );
  }

  confirm(): void {
    if (this.settling) return;
    this.error = '';
    this.settling = true;

    let payload: { amount?: number; transfers?: SettlementTransferIn[] } = {};
    if (this.mode === 'partial') {
      const amt = this.round2(this.partialAmount ?? 0);
      if (amt <= 0) {
        this.error = 'Enter an amount greater than 0';
        this.settling = false;
        return;
      }
      if (amt - this.maxAllowed > 0.005) {
        this.error = `Amount cannot be greater than ${this.maxAllowed.toFixed(2)}`;
        this.settling = false;
        return;
      }
      payload = { amount: amt };
    } else if (this.mode === 'custom') {
      const transfers = this.customDraft
        .filter((d) => d.enabled && d.transfer.amount > 0.005)
        .map((d) => ({
          from_user_id: d.transfer.from_user_id,
          to_user_id: d.transfer.to_user_id,
          amount: this.round2(d.transfer.amount),
        }));
      if (transfers.length === 0) {
        this.error = 'Choose at least one transfer amount';
        this.settling = false;
        return;
      }
      const total = this.round2(transfers.reduce((sum, t) => sum + t.amount, 0));
      if (total - this.maxAllowed > 0.005) {
        this.error = `Total custom amount cannot be greater than ${this.maxAllowed.toFixed(2)}`;
        this.settling = false;
        return;
      }
      payload = { transfers };
    }

    this.groupsService.settleUp(this.data.groupId, payload).subscribe({
      next: () => {
        this.settling = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.settling = false;
        this.error = formatHttpError(err);
      },
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}

