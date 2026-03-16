import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-main-shell',
  templateUrl: './main-shell.component.html',
  styleUrls: ['./main-shell.component.css'],
})
export class MainShellComponent implements OnInit {
  @ViewChild(SidebarComponent) sidebar!: SidebarComponent;
  showSidebar = true;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateSidebarVisibility();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.updateSidebarVisibility());
  }

  toggleSidebar(): void {
    this.sidebar?.toggle();
  }

  private updateSidebarVisibility(): void {
    const url = this.router.url.split('?')[0];
    this.showSidebar = !url.endsWith('/login') && !url.endsWith('/register');
  }
}
