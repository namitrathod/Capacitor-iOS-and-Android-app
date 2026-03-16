import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../models/user';

export interface UsersPage {
  data: User[];
  count: number;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = 'http://10.0.0.155:8000/api/v1'; // FastAPI backend base URL

  constructor(private http: HttpClient) {}

  getUsers(skip = 0, limit = 100): Observable<UsersPage> {
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    return this.http.get<UsersPage>(`${this.apiUrl}/users/`, { params });
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`);
  }

  createUser(user: { email: string; password: string; full_name?: string | null; is_superuser?: boolean }): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users/`, user);
  }
}
