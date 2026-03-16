import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://10.0.0.155:8000/api/v1'; // FastAPI backend base URL

  /** For debugging: base URL used for API (no /api/v1). */
  get apiBaseUrl(): string {
    return this.apiUrl.replace(/\/api\/v1\/?$/, '');
  }

  constructor(private http: HttpClient) { }

  login(username: string, password: string): Observable<TokenResponse> {
    const body = new URLSearchParams();
    body.set('username', username);
    body.set('password', password);
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    return this.http
      .post<TokenResponse>(`${this.apiUrl}/login/access-token`, body.toString(), { headers })
      .pipe(
        tap((token) => {
          localStorage.setItem('access_token', token.access_token);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('access_token');
  }

  get accessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  register(username: string, email: string, password: string): Observable<any> {
    // Uses open registration endpoint from FastAPI template
    return this.http.post<any>(`${this.apiUrl}/users/open`, {
      email,
      password,
      full_name: username,
    });
  }

}
