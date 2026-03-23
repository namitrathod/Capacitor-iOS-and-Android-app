import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/base/service/auth-service.service';
import { FaceIdService } from 'src/app/base/service/face-id.service';
import { UserProfileService } from 'src/app/base/service/user-profile.service';
import { formatHttpError } from 'src/app/core/http-error.util';

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.sass'],
})
export class AccountSettingsComponent implements OnInit {
  loading = true;
  saving = false;
  error = '';
  showSecurity = false;
  faceIdEnabled = false;

  fullName = '';
  email = '';

  constructor(
    private readonly profile: UserProfileService,
    private readonly snack: MatSnackBar,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly faceId: FaceIdService
  ) {}

  ngOnInit(): void {
    this.load();
    this.faceIdEnabled = this.faceId.isEnabled();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.profile.getMe().subscribe({
      next: (u) => {
        this.loading = false;
        this.fullName = (u.full_name || '').trim();
        this.email = u.email || '';
      },
      error: (err) => {
        this.loading = false;
        this.error = formatHttpError(err);
      },
    });
  }

  save(): void {
    if (this.saving) return;
    const email = this.email.trim().toLowerCase();
    const fullName = this.fullName.trim();

    if (!email) {
      this.error = 'Email is required';
      return;
    }

    this.saving = true;
    this.error = '';
    this.profile
      .updateMe({
        email,
        full_name: fullName || undefined,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.profile.getMe().subscribe();
          this.snack.open('Account settings updated', 'OK', {
            duration: 3000,
            panelClass: ['splitkit-snack'],
          });
        },
        error: (err) => {
          this.saving = false;
          this.error = formatHttpError(err);
        },
      });
  }

  toggleSecurity(): void {
    this.showSecurity = !this.showSecurity;
  }

  async toggleFaceId(checked: boolean): Promise<void> {
    this.error = '';
    if (!checked) {
      this.faceIdEnabled = false;
      this.faceId.setEnabled(false);
      this.snack.open('Face ID disabled', 'OK', {
        duration: 2200,
        panelClass: ['splitkit-snack'],
      });
      return;
    }

    const available = await this.faceId.isAvailable();
    if (!available) {
      this.faceIdEnabled = false;
      this.faceId.setEnabled(false);
      this.error = 'Face ID is not available on this device.';
      return;
    }

    try {
      await this.faceId.authenticate('Authenticate with Face ID to enable this feature');
      this.faceIdEnabled = true;
      this.faceId.setEnabled(true);
      this.snack.open('Face ID enabled', 'OK', {
        duration: 2200,
        panelClass: ['splitkit-snack'],
      });
    } catch {
      this.faceIdEnabled = false;
      this.faceId.setEnabled(false);
      this.error = 'Face ID authentication failed.';
    }
  }

  contactUs(): void {
    this.snack.open('Contact us: support@splitkit.test', 'OK', {
      duration: 3200,
      panelClass: ['splitkit-snack'],
    });
  }

  goPrivacy(): void {
    this.router.navigate(['/privacy']);
  }

  goTerms(): void {
    this.router.navigate(['/terms']);
  }

  logout(): void {
    this.profile.clearCache();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

