import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { UserContact, UserProfileService } from 'src/app/base/service/user-profile.service';
import { GroupsService } from 'src/app/features/splits/groups.service';
import { formatHttpError } from 'src/app/core/http-error.util';

@Component({
  selector: 'app-friends',
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.sass'],
})
export class FriendsComponent implements OnInit {
  loading = true;
  creatingForId: number | null = null;
  error = '';
  q = '';
  contacts: UserContact[] = [];

  constructor(
    private readonly profile: UserProfileService,
    private readonly groupsService: GroupsService,
    private readonly router: Router,
    private readonly snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get filtered(): UserContact[] {
    const v = this.q.trim().toLowerCase();
    if (!v) return this.contacts;
    return this.contacts.filter((c) =>
      `${c.full_name || ''} ${c.email}`.toLowerCase().includes(v)
    );
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.profile.getMyContacts().subscribe({
      next: (rows) => {
        this.loading = false;
        this.contacts = rows;
      },
      error: (err) => {
        this.loading = false;
        this.error = formatHttpError(err);
      },
    });
  }

  splitWith(c: UserContact): void {
    if (this.creatingForId != null) return;
    this.creatingForId = c.id;
    this.error = '';
    const display = c.full_name || c.email;
    this.groupsService.create(`You & ${display}`, [c.email]).subscribe({
      next: (g) => {
        this.creatingForId = null;
        this.snack.open(`Started split with ${display}`, 'OK', {
          duration: 2200,
          panelClass: ['splitkit-snack'],
        });
        this.router.navigate(['/groups', g.id]);
      },
      error: (err) => {
        this.creatingForId = null;
        this.error = formatHttpError(err);
      },
    });
  }
}

