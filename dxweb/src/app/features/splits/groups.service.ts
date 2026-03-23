import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/** sessionStorage key: one-shot “group just created” toast on group detail */
export const FLASH_GROUP_CREATED_KEY = 'splitkit_flash_group_created';

export interface GroupOut {
  id: number;
  name: string;
  created_by_id: number;
}

export interface GroupMemberOut {
  user_id: number;
  email: string;
  full_name: string | null;
}

export interface GroupDetailOut extends GroupOut {
  members: GroupMemberOut[];
}

export interface ExpenseShareOut {
  user_id: number;
  amount: number;
}

export interface ExpenseOut {
  id: number;
  group_id: number;
  description: string;
  amount: number;
  paid_by_user_id: number;
  created_at: string;
  shares: ExpenseShareOut[];
}

export interface ExpensesPageOut {
  data: ExpenseOut[];
  count: number;
}

export interface BalanceRow {
  user_id: number;
  email: string;
  full_name: string | null;
  balance: number;
}

export interface SettlementRow {
  from_user_id: number;
  from_email: string;
  to_user_id: number;
  to_email: string;
  amount: number;
}

export interface SettlementTransferIn {
  from_user_id: number;
  to_user_id: number;
  amount: number;
}

export interface BalancesOut {
  balances: BalanceRow[];
  settlements: SettlementRow[];
}

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private readonly base = `${environment.apiUrl}/groups`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<GroupOut[]> {
    return this.http.get<GroupOut[]>(`${this.base}/`);
  }

  create(name: string, memberEmails: string[]): Observable<GroupDetailOut> {
    return this.http.post<GroupDetailOut>(`${this.base}/`, {
      name,
      member_emails: memberEmails,
    });
  }

  get(id: number): Observable<GroupDetailOut> {
    return this.http.get<GroupDetailOut>(`${this.base}/${id}`);
  }

  addMember(groupId: number, email: string): Observable<GroupDetailOut> {
    return this.http.post<GroupDetailOut>(`${this.base}/${groupId}/members`, {
      email,
    });
  }

  leaveGroup(groupId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.base}/${groupId}/members/me`
    );
  }

  listExpenses(groupId: number): Observable<ExpensesPageOut> {
    return this.http.get<ExpensesPageOut>(`${this.base}/${groupId}/expenses`);
  }

  createExpense(
    groupId: number,
    body: {
      description: string;
      amount: number;
      paid_by_user_id: number;
      participant_user_ids: number[];
    }
  ): Observable<ExpenseOut> {
    return this.http.post<ExpenseOut>(
      `${this.base}/${groupId}/expenses`,
      body
    );
  }

  deleteExpense(groupId: number, expenseId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.base}/${groupId}/expenses/${expenseId}`
    );
  }

  balances(groupId: number): Observable<BalancesOut> {
    return this.http.get<BalancesOut>(`${this.base}/${groupId}/balances`);
  }

  settleUp(
    groupId: number,
    payload?: { amount?: number; transfers?: SettlementTransferIn[] }
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${groupId}/settle`, payload ?? {});
  }
}
