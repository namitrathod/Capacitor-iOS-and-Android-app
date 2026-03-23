import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { formatHttpError } from 'src/app/core/http-error.util';
import { FLASH_GROUP_CREATED_KEY, GroupsService } from '../groups.service';

@Component({
  selector: 'app-group-create',
  templateUrl: './group-create.component.html',
  styleUrls: ['./group-create.component.sass'],
})
export class GroupCreateComponent {
  newName = '';
  newMemberEmails = '';
  creating = false;
  error = '';

  constructor(
    private readonly groupsService: GroupsService,
    private readonly router: Router
  ) {}

  parseEmails(raw: string): string[] {
    return raw
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }

  create(): void {
    const name = this.newName.trim();
    if (!name) {
      this.error = 'Enter a group name';
      return;
    }
    this.creating = true;
    this.error = '';
    const emails = this.parseEmails(this.newMemberEmails);
    this.groupsService.create(name, emails).subscribe({
      next: (g) => {
        this.creating = false;
        try {
          sessionStorage.setItem(FLASH_GROUP_CREATED_KEY, '1');
        } catch {
          /* ignore */
        }
        this.router.navigate(['/groups', g.id]);
      },
      error: (err) => {
        this.creating = false;
        this.error = formatHttpError(err);
      },
    });
  }

  back(): void {
    this.router.navigate(['/groups']);
  }
}

