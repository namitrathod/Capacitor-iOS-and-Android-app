import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FooterComponent } from './fragments/footer/footer.component';
import { SidebarComponent } from './fragments/sidebar/sidebar.component';
import { MainShellComponent } from './fragments/main-shell/main-shell.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MaterialModule } from './material.module';
import { AccountSettingsComponent } from './account-settings/account-settings.component';
import { DeleteAccountDialogComponent } from './account-settings/delete-account-dialog.component';
import { ActivityComponent } from './activity/activity.component';
import { FriendsComponent } from './friends/friends.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { TermsComponent } from './privacy/terms.component';

@NgModule({
  declarations: [
    FooterComponent,
    SidebarComponent,
    MainShellComponent,
    DashboardComponent,
    AccountSettingsComponent,
    DeleteAccountDialogComponent,
    ActivityComponent,
    FriendsComponent,
    PrivacyComponent,
    TermsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    RouterModule,
  ],
  exports: [
    DashboardComponent,
    AccountSettingsComponent,
    ActivityComponent,
    FriendsComponent,
    PrivacyComponent,
    TermsComponent,
  ],
})
export class SharedModule {}
