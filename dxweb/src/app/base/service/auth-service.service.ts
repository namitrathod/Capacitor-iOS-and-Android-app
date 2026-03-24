import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  login(username: string, password: string): Observable<TokenResponse> {
    const body = new URLSearchParams();
    body.set('username', username);
    body.set('password', password);
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    return this.http
      .post<TokenResponse>(`${this.apiUrl}/login`, body.toString(), { headers })
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
    return this.http.post<any>(`${this.apiUrl}/register`, {
      username,
      email,
      password,
    });
  }

}
