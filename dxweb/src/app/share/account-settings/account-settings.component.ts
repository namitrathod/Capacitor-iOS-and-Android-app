import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/base/service/auth-service.service';
import { FaceIdService } from 'src/app/base/service/face-id.service';
import { UserService } from 'src/app/base/service/user.service';
import { UserProfileService } from 'src/app/base/service/user-profile.service';
import { formatHttpError } from 'src/app/core/http-error.util';
import { DeleteAccountDialogComponent } from './delete-account-dialog.component';

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.sass'],
})
export class AccountSettingsComponent implements OnInit {
  loading = true;
  saving = false;
  error = '';
  deleting = false;
  deleteError = '';
  showSecurity = false;
  faceIdEnabled = false;

  fullName = '';
  email = '';
  private userId: number | null = null;

  constructor(
    private readonly profile: UserProfileService,
    private readonly snack: MatSnackBar,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly faceId: FaceIdService,
    private readonly users: UserService,
    private readonly dialog: MatDialog
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
        this.userId = u.id;
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

  deleteAccount(): void {
    if (this.deleting || this.userId == null) return;

    this.dialog
      .open<DeleteAccountDialogComponent, { email: string }, boolean>(
        DeleteAccountDialogComponent,
        {
          width: '420px',
          data: { email: this.email },
          disableClose: true,
        }
      )
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.deleting = true;
        this.deleteError = '';

        this.users.deleteUser(this.userId!).subscribe({
          next: () => {
            this.deleting = false;
            this.snack.open('Account deleted successfully', 'OK', {
              duration: 3000,
              panelClass: ['splitkit-snack'],
            });
            this.logout();
          },
          error: (err) => {
            this.deleting = false;
            this.deleteError = this.mapDeleteError(err);
          },
        });
      });
  }

  private mapDeleteError(err: unknown): string {
    const raw = formatHttpError(err);
    const lower = raw.toLowerCase();

    if (lower.includes('recorded payer on expenses')) {
      return 'You cannot delete your account yet because you are the payer on one or more expenses. Delete or reassign those expenses first.';
    }
    if (lower.includes('created split groups')) {
      return 'You cannot delete your account yet because you created one or more groups. Transfer ownership or delete those groups first.';
    }
    if (lower.includes("doesn't have enough privileges") || lower.includes('enough privileges')) {
      return 'You can only delete your own account while signed in as that account.';
    }
    if (lower.includes('super users are not allowed to delete themselves')) {
      return 'Superuser accounts cannot self-delete. Use another admin account to delete this user.';
    }

    return raw;
  }

  logout(): void {
    this.profile.clearCache();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

