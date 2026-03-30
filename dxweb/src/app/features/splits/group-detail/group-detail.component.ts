import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { formatHttpError } from 'src/app/core/http-error.util';
import { UserProfileService } from 'src/app/base/service/user-profile.service';
import {
  BalanceRow,
  BalancesOut,
  ExpenseOut,
  FLASH_GROUP_CREATED_KEY,
  GroupDetailOut,
  GroupMemberOut,
  SettlementRow,
  GroupsService,
} from '../groups.service';
import { AddExpenseDialogComponent } from './add-expense-dialog/add-expense-dialog.component';
import { SettleUpDialogComponent } from './settle-up-dialog/settle-up-dialog.component';
import { LeaveGroupDialogComponent } from './leave-group-dialog.component';

@Component({
  selector: 'app-group-detail',
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.sass'],
})
export class GroupDetailComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  groupId = 0;
  group: GroupDetailOut | null = null;
  expenses: ExpenseOut[] = [];
  balances: BalancesOut | null = null;
  currentUserId: number | null = null;

  loading = true;
  error = '';
  memberError = '';

  /** Desktop: keep add form visible; mobile: FAB toggles */
  isDesktop = false;
  showAddExpense = false;

  addEmail = '';
  addingMember = false;

  expDescription = '';
  expAmount: number | null = null;
  expPaidBy: number | null = null;
  expParticipantIds = new Set<number>();
  savingExpense = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly groupsService: GroupsService,
    private readonly snack: MatSnackBar,
    private readonly userProfile: UserProfileService,
    private readonly bp: BreakpointObserver,
    private readonly dialog: MatDialog
  ) {
    this.bp
      .observe('(min-width: 768px)')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.isDesktop = state.matches;
        this.showAddExpense = this.isDesktop;
      });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((pm) => {
      const id = pm.get('id');
      this.groupId = id ? +id : 0;
      if (this.groupId) {
        this.reloadAll();
      }
    });
  }

  get sortedExpenses(): ExpenseOut[] {
    return [...this.expenses].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  get myBalanceAmount(): number {
    if (!this.balances || this.currentUserId == null) return 0;
    const row = this.balances.balances.find((x) => x.user_id === this.currentUserId);
    return row?.balance ?? 0;
  }

  /** Positive = you are owed; negative = you owe (matches API). */
  get myBalanceState(): 'owed' | 'owe' | 'settled' {
    const b = this.myBalanceAmount;
    if (b > 0.005) return 'owed';
    if (b < -0.005) return 'owe';
    return 'settled';
  }

  get myBalanceAbs(): number {
    return Math.abs(this.myBalanceAmount);
  }

  get myBalanceHeadline(): string {
    switch (this.myBalanceState) {
      case 'owed':
        return 'Overall, you are owed';
      case 'owe':
        return 'Overall, you owe';
      default:
        return 'All settled up';
    }
  }

  /** Settle-only-for-me preview. Positive = you get money; negative = you send money. */
  get mySettlements(): SettlementRow[] {
    if (!this.balances || this.currentUserId == null) return [];

    const meId = this.currentUserId;
    const meRow = this.balances.balances.find((x) => x.user_id === meId);
    const meBal = meRow?.balance ?? 0;
    const meName = meRow?.full_name || meRow?.email || 'You';

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const threshold = 0.005;

    if (Math.abs(meBal) <= threshold) return [];

    const settlements: SettlementRow[] = [];

    if (meBal > threshold) {
      // Others owe me: debtors pay me.
      let remaining = round2(meBal);
      const debtors = this.balances.balances
        .filter((r) => r.user_id !== meId && r.balance < -threshold)
        .map((r) => ({ uid: r.user_id, amt: round2(-r.balance), name: r.full_name || r.email }))
        .sort((a, b) => b.amt - a.amt);

      for (const d of debtors) {
        if (remaining <= threshold) break;
        const pay = round2(Math.min(remaining, d.amt));
        if (pay <= threshold) break;
        settlements.push({
          from_user_id: d.uid,
          from_email: d.name,
          to_user_id: meId,
          to_email: meName,
          amount: pay,
        });
        remaining = round2(remaining - pay);
      }
    } else {
      // I owe others: I pay creditors.
      let remaining = round2(-meBal);
      const creditors = this.balances.balances
        .filter((r) => r.user_id !== meId && r.balance > threshold)
        .map((r) => ({ uid: r.user_id, amt: round2(r.balance), name: r.full_name || r.email }))
        .sort((a, b) => b.amt - a.amt);

      for (const c of creditors) {
        if (remaining <= threshold) break;
        const pay = round2(Math.min(remaining, c.amt));
        if (pay <= threshold) break;
        settlements.push({
          from_user_id: meId,
          from_email: meName,
          to_user_id: c.uid,
          to_email: c.name,
          amount: pay,
        });
        remaining = round2(remaining - pay);
      }
    }

    return settlements;
  }

  get mySettlementsMaxAmount(): number {
    return this.mySettlements.reduce((sum, s) => sum + s.amount, 0);
  }

  orderedBalances(rows: BalanceRow[]): BalanceRow[] {
    const copy = [...rows];
    if (this.currentUserId == null) return copy;
    return copy.sort((a, b) => {
      const aMe = a.user_id === this.currentUserId ? 0 : 1;
      const bMe = b.user_id === this.currentUserId ? 0 : 1;
      return aMe - bMe;
    });
  }

  reloadAll(): void {
    this.loading = true;
    this.error = '';
    this.expParticipantIds.clear();
    this.expPaidBy = null;
    this.userProfile.getMe().subscribe({
      next: (u) => (this.currentUserId = u.id),
      error: () => (this.currentUserId = null),
    });
    this.groupsService.get(this.groupId).subscribe({
      next: (g) => {
        this.group = g;
        this.expPaidBy = g.members[0]?.user_id ?? null;
        for (const m of g.members) {
          this.expParticipantIds.add(m.user_id);
        }
        this.loading = false;
        this.loadExpenses();
        this.loadBalances();
        this.maybeShowCreatedFlash();
      },
      error: (err) => {
        this.loading = false;
        this.error = formatHttpError(err);
      },
    });
  }

  loadExpenses(): void {
    this.groupsService.listExpenses(this.groupId).subscribe({
      next: (p) => (this.expenses = p.data),
      error: () => {},
    });
  }

  loadBalances(): void {
    this.groupsService.balances(this.groupId).subscribe({
      next: (b) => (this.balances = b),
      error: () => {},
    });
  }

  setParticipant(uid: number, checked: boolean): void {
    if (checked) {
      this.expParticipantIds.add(uid);
    } else {
      this.expParticipantIds.delete(uid);
    }
    this.expParticipantIds = new Set(this.expParticipantIds);
  }

  isParticipant(uid: number): boolean {
    return this.expParticipantIds.has(uid);
  }

  addMember(): void {
    const email = this.addEmail.trim().toLowerCase();
    if (!email || !this.group) return;
    this.addingMember = true;
    this.memberError = '';
    this.groupsService.addMember(this.groupId, email).subscribe({
      next: (g) => {
        this.group = g;
        this.addEmail = '';
        this.addingMember = false;
        const addedMember = g.members.find((m) => (m.email || '').toLowerCase() === email);
        const displayName = addedMember?.full_name || addedMember?.email || email;
        for (const m of g.members) {
          this.expParticipantIds.add(m.user_id);
        }
        this.expParticipantIds = new Set(this.expParticipantIds);
        this.loadBalances();
        this.snack.open(
          `${displayName} (${email}) was added to this group.`,
          'OK',
          { duration: 6000, panelClass: ['splitkit-snack'] }
        );
        this.memberError = '';
      },
      error: (err) => {
        this.addingMember = false;
        const msg = formatHttpError(err);
        const lower = msg.toLowerCase();
        if (
          lower.includes('user not found for that email') ||
          lower.includes('no user registered with email')
        ) {
          this.memberError = 'Not registered in SplitKit';
          return;
        }
        this.memberError = msg;
      },
    });
  }

  submitExpense(): void {
    if (!this.group || this.expPaidBy == null || this.expAmount == null) return;
    const desc = this.expDescription.trim();
    if (!desc) {
      this.error = 'Enter a description';
      return;
    }
    if (this.expAmount <= 0) {
      this.error = 'Amount must be positive';
      return;
    }
    const pids = [...this.expParticipantIds];
    if (pids.length === 0) {
      this.error = 'Pick at least one person to split with';
      return;
    }
    this.savingExpense = true;
    this.error = '';
    this.groupsService
      .createExpense(this.groupId, {
        description: desc,
        amount: this.expAmount,
        paid_by_user_id: this.expPaidBy,
        participant_user_ids: pids,
      })
      .subscribe({
        next: () => {
          this.savingExpense = false;
          this.expDescription = '';
          this.expAmount = null;
          this.loadExpenses();
          this.loadBalances();
        },
        error: (err) => {
          this.savingExpense = false;
          this.error = formatHttpError(err);
        },
      });
  }

  removeExpense(e: ExpenseOut): void {
    if (!confirm(`Delete “${e.description}”?`)) return;
    this.groupsService.deleteExpense(this.groupId, e.id).subscribe({
      next: () => {
        this.loadExpenses();
        this.loadBalances();
      },
      error: (err) => {
        this.error = formatHttpError(err);
      },
    });
  }

  leave(): void {
    this.dialog
      .open<LeaveGroupDialogComponent, { groupName?: string | null }, boolean>(
        LeaveGroupDialogComponent,
        {
          width: '420px',
          data: { groupName: this.group?.name },
          disableClose: true,
        }
      )
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.groupsService.leaveGroup(this.groupId).subscribe({
          next: () => this.router.navigate(['/groups']),
          error: (err) => {
            this.error = formatHttpError(err);
          },
        });
      });
  }

  memberLabel(uid: number): string {
    const m = this.group?.members.find((x) => x.user_id === uid);
    return m ? m.full_name || m.email : `#${uid}`;
  }

  formatDateShort(iso: string): string {
    try {
      const d = new Date(iso);
      const y = d.getFullYear();
      const nowY = new Date().getFullYear();
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        ...(y !== nowY ? { year: 'numeric' } : {}),
      });
    } catch {
      return iso;
    }
  }

  expenseInitial(e: ExpenseOut): string {
    const t = e.description?.trim();
    if (!t) return '?';
    return t.slice(0, 1).toUpperCase();
  }

  back(): void {
    this.router.navigate(['/groups']);
  }

  openAddExpenseDialog(): void {
    if (!this.group) return;

    const dialogRef = this.dialog.open(AddExpenseDialogComponent, {
      width: '100vw',
      maxWidth: '100vw',
      height: '100dvh',
      maxHeight: '100dvh',
      panelClass: ['sw-fullscreen-dialog'],
      disableClose: this.savingExpense,
      data: {
        groupId: this.groupId,
        members: this.group.members,
        groupName: this.group.name,
        currentUserId: this.currentUserId,
        defaultPaidByUserId: this.expPaidBy,
        defaultParticipantIds: [...this.expParticipantIds],
      },
    });

    dialogRef.afterClosed().subscribe((ok) => {
      if (ok) {
        this.loadExpenses();
        this.loadBalances();
      }
    });
  }

  openSettleUpDialog(): void {
    if (this.mySettlements.length === 0) return;

    const dialogRef = this.dialog.open(SettleUpDialogComponent, {
      width: '100vw',
      maxWidth: '100vw',
      height: '100dvh',
      maxHeight: '100dvh',
      panelClass: ['sw-fullscreen-dialog'],
      data: {
        groupId: this.groupId,
        settlements: this.mySettlements,
        maxAmount: this.mySettlementsMaxAmount,
      },
    });

    dialogRef.afterClosed().subscribe((ok) => {
      if (ok) {
        this.loadExpenses();
        this.loadBalances();
      }
    });
  }

  memberInitials(m: GroupMemberOut): string {
    const name = m.full_name?.trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    const local = m.email.split('@')[0] || m.email;
    return local.slice(0, 2).toUpperCase();
  }

  private maybeShowCreatedFlash(): void {
    try {
      if (sessionStorage.getItem(FLASH_GROUP_CREATED_KEY) === '1') {
        sessionStorage.removeItem(FLASH_GROUP_CREATED_KEY);
        this.snack.open(
          'Group created. Add an expense from the + button, or invite people in the People tab.',
          'Got it',
          { duration: 5500, panelClass: ['splitkit-snack'] }
        );
      }
    } catch {
      /* private mode */
    }
  }
}
