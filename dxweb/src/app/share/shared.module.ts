import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FooterComponent } from './fragments/footer/footer.component';
import { SidebarComponent } from './fragments/sidebar/sidebar.component';
import { MainShellComponent } from './fragments/main-shell/main-shell.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MaterialModule } from './material.module';

@NgModule({
  declarations: [FooterComponent, SidebarComponent, MainShellComponent, DashboardComponent],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule,
  ],
  exports: [DashboardComponent],
})
export class SharedModule {}
