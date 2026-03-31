import { Injectable, NgZone } from '@angular/core';
import { Network, type ConnectionStatus } from '@capacitor/network';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NetworkConnectivityService {
  private readonly online$ = new BehaviorSubject<boolean>(this.browserOnline());

  constructor(private readonly zone: NgZone) {
    void this.init();
  }

  private browserOnline(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine;
  }

  private async init(): Promise<void> {
    try {
      const status = await Network.getStatus();
      this.emit(status.connected);
    } catch {
      this.emit(this.browserOnline());
    }

    void Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
      this.emit(status.connected);
    });
  }

  private emit(connected: boolean): void {
    this.zone.run(() => this.online$.next(connected));
  }

  readonly isOnline$: Observable<boolean> = this.online$.asObservable();

  get isOnlineSnapshot(): boolean {
    return this.online$.value;
  }

  async refresh(): Promise<boolean> {
    try {
      const status = await Network.getStatus();
      this.emit(status.connected);
      return status.connected;
    } catch {
      const online = this.browserOnline();
      this.emit(online);
      return online;
    }
  }
}
