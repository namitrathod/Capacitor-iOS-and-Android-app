import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { User } from 'src/app/models/user';
export interface UserActivityRow {
  expense_id: number;
  group_id: number;
  group_name: string;
  description: string;
  created_at: string;
  total_amount: number;
  paid_by_user_id: number;
  paid_by_name: string;
  user_share_amount: number;
  user_net_amount: number;
  direction: 'you_lent' | 'you_owe' | 'settled';
}

export interface UserContact {
  id: number;
  email: string;
  full_name: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly base = `${environment.apiUrl}/users`;
  private cache$: Observable<User> | null = null;

  constructor(private readonly http: HttpClient) {}

  /** Current user (cached per session for group balance UI). */
  getMe(): Observable<User> {
    if (!this.cache$) {
      this.cache$ = this.http.get<User>(`${this.base}/me`).pipe(shareReplay(1));
    }
    return this.cache$;
  }

  updateMe(body: { full_name?: string; email?: string }): Observable<User> {
    return this.http.patch<User>(`${this.base}/me`, body).pipe(
      tap(() => {
        this.clearCache();
      })
    );
  }

  getMyActivity(limit = 50): Observable<UserActivityRow[]> {
    return this.http.get<UserActivityRow[]>(`${this.base}/me/activity`, {
      params: { limit },
    });
  }

  getMyContacts(): Observable<UserContact[]> {
    return this.http.get<UserContact[]>(`${this.base}/me/contacts`);
  }

  clearCache(): void {
    this.cache$ = null;
  }
}
