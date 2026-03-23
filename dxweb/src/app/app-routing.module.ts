import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './base/login/login.component';
import { RegisterComponent } from './base/register/register.component';
import { MainShellComponent } from './share/fragments/main-shell/main-shell.component';
import { DashboardComponent } from './share/dashboard/dashboard.component';
import { AccountSettingsComponent } from './share/account-settings/account-settings.component';
import { ActivityComponent } from './share/activity/activity.component';
import { FriendsComponent } from './share/friends/friends.component';
import { AuthGuard } from './core/guards/auth.guard';
import { PrivacyComponent } from './share/privacy/privacy.component';
import { TermsComponent } from './share/privacy/terms.component';

export const routes: Routes = [
  {
    path: '',
    component: MainShellComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
      { path: 'friends', component: FriendsComponent, canActivate: [AuthGuard] },
      { path: 'activity', component: ActivityComponent, canActivate: [AuthGuard] },
      { path: 'account', component: AccountSettingsComponent, canActivate: [AuthGuard] },
      { path: 'privacy', component: PrivacyComponent },
      { path: 'terms', component: TermsComponent },
      {
        path: 'groups',
        loadChildren: () =>
          import('./features/splits/splits.module').then((m) => m.SplitsModule),
        canActivate: [AuthGuard],
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      { path: '**', redirectTo: 'login' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
