import { Component, OnInit } from '@angular/core';
import { UserActivityRow, UserProfileService } from 'src/app/base/service/user-profile.service';
import { formatHttpError } from 'src/app/core/http-error.util';

@Component({
  selector: 'app-activity',
  templateUrl: './activity.component.html',
  styleUrls: ['./activity.component.sass'],
})
export class ActivityComponent implements OnInit {
  loading = true;
  error = '';
  items: UserActivityRow[] = [];

  constructor(private readonly profile: UserProfileService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.profile.getMyActivity(80).subscribe({
      next: (rows) => {
        this.loading = false;
        this.items = rows;
      },
      error: (err) => {
        this.loading = false;
        this.error = formatHttpError(err);
      },
    });
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  }
}

