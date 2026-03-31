import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { NetworkConnectivityService } from './base/service/network-connectivity.service';
import { NoInternetDialogComponent } from './share/no-internet-dialog/no-internet-dialog.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'dxweb';

  private offlineDialogRef?: MatDialogRef<NoInternetDialogComponent>;
  private networkSub?: Subscription;

  constructor(
    private readonly network: NetworkConnectivityService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.networkSub = this.network.isOnline$
      .pipe(distinctUntilChanged())
      .subscribe((online) => {
        if (!online) {
          this.openOfflineDialog();
        } else {
          this.offlineDialogRef?.close();
          this.offlineDialogRef = undefined;
        }
      });
  }

  private openOfflineDialog(): void {
    if (this.offlineDialogRef) {
      return;
    }
    this.offlineDialogRef = this.dialog.open(NoInternetDialogComponent, {
      width: 'min(420px, 92vw)',
      disableClose: true,
      autoFocus: 'dialog',
    });
    this.offlineDialogRef.afterClosed().subscribe(() => {
      this.offlineDialogRef = undefined;
    });
  }

  ngOnDestroy(): void {
    this.networkSub?.unsubscribe();
  }
}
