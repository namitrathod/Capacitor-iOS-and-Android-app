import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Sale, SalesService } from '../sales.service';

@Component({
  selector: 'app-sales-list',
  templateUrl: './sales-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesListComponent implements OnInit, OnDestroy {
  sales: Sale[] = [];
  loading = false;
  private sub?: Subscription;

  constructor(
    private readonly salesService: SalesService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadSales();
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (e.urlAfterRedirects === '/sales' || e.urlAfterRedirects.startsWith('/sales?')) {
          this.loadSales();
        }
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  loadSales(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.salesService.getSales().subscribe({
      next: (page) => {
        this.sales = page.data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}

