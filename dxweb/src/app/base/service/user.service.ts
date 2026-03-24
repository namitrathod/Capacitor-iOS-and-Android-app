import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { User } from '../../models/user';
import { environment } from 'src/environments/environment';

export interface UsersPage {
  data: User[];
  count: number;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUsers(skip = 0, limit = 100): Observable<UsersPage> {
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    return this.http.get<User[]>(`${this.apiUrl}/users`, { params }).pipe(
      // API returns an array; keep existing table consumer contract.
      // This avoids touching multiple callers while adapting to this backend.
      map((users) => ({ data: users, count: users.length }))
    );
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`);
  }

  createUser(user: { email: string; password: string; full_name?: string | null; is_superuser?: boolean }): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, {
      username: user.full_name?.trim() || user.email,
      email: user.email,
      password: user.password,
    });
  }
}
