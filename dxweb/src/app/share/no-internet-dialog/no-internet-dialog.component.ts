import { Component } from '@angular/core';
import { NetworkConnectivityService } from '../../base/service/network-connectivity.service';

@Component({
  selector: 'app-no-internet-dialog',
  templateUrl: './no-internet-dialog.component.html',
  styleUrls: ['./no-internet-dialog.component.sass'],
})
export class NoInternetDialogComponent {
  checking = false;

  constructor(private readonly network: NetworkConnectivityService) {}

  async retry(): Promise<void> {
    this.checking = true;
    await this.network.refresh();
    this.checking = false;
  }
}
