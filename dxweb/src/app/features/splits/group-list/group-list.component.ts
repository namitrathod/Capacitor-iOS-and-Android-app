import { Component, OnInit } from '@angular/core';
import { formatHttpError } from 'src/app/core/http-error.util';
import { GroupOut, GroupsService } from '../groups.service';

/** Subtle accent stripes per group id (Splitwise-ish colored tiles) */
const GROUP_ACCENTS: ReadonlyArray<readonly [string, string]> = [
  ['#1cc29f', '#12a886'],
  ['#5b8def', '#3d6fd4'],
  ['#e8a838', '#d4922a'],
  ['#c084fc', '#a855f7'],
  ['#f472b6', '#db2777'],
  ['#34d399', '#059669'],
];

@Component({
  selector: 'app-group-list',
  templateUrl: './group-list.component.html',
  styleUrls: ['./group-list.component.sass'],
})
export class GroupListComponent implements OnInit {
  groups: GroupOut[] = [];
  loading = false;
  error = '';

  constructor(
    private readonly groupsService: GroupsService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  groupAccent(id: number): { [key: string]: string } {
    const [from, to] = GROUP_ACCENTS[Math.abs(id) % GROUP_ACCENTS.length];
    return {
      '--g-accent-from': from,
      '--g-accent-to': to,
    };
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.groupsService.list().subscribe({
      next: (g) => {
        this.groups = g;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = formatHttpError(err);
      },
    });
  }
}
