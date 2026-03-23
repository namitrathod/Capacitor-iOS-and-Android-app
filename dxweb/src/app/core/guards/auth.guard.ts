import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../../base/service/auth-service.service';
import { FaceIdService } from '../../base/service/face-id.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly faceId: FaceIdService
  ) {}

  async canActivate(): Promise<boolean | UrlTree> {
    const token = this.authService.accessToken;
    if (!token) {
      return this.router.parseUrl('/login');
    }

    // If user enabled Face ID, prompt every time before accessing protected routes.
    if (this.faceId.isEnabled()) {
      const available = await this.faceId.isAvailable();
      if (available) {
        try {
          await this.faceId.authenticate('Unlock SplitKit with Face ID');
        } catch {
          // User cancelled/failed biometrics -> treat as unauthenticated.
          this.authService.logout();
          return this.router.parseUrl('/login');
        }
      }
    }

    return true;
  }
}

