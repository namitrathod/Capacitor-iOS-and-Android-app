import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './base/login/login.component';
import { UserTableComponent } from './base/user/user-table/user-table.component';
import { RegisterComponent } from './base/register/register.component';
import { MainShellComponent } from './share/fragments/main-shell/main-shell.component';
import { DashboardComponent } from './share/dashboard/dashboard.component';
import { AuthGuard } from './core/guards/auth.guard';

/*
const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'user', component: UserTableComponent },
  { path: 'user/edit/:id', component: UserTableComponent },
  { path: 'user/add', component: UserTableComponent },
  { path: '**', redirectTo: '' }
];*/

export const routes: Routes = [
  {
    path: '',
    component: MainShellComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
      {
        path: 'user',
        component: UserTableComponent,
        canActivate: [AuthGuard],
        children: [
          { path: 'edit/:id', component: UserTableComponent },
          { path: 'add', component: UserTableComponent },
        ],
      },
      {
        path: 'products',
        loadChildren: () =>
          import('./features/product/product.module').then((m) => m.ProductModule),
        canActivate: [AuthGuard],
      },
      {
        path: 'sales',
        loadChildren: () =>
          import('./features/sales/sales.module').then((m) => m.SalesModule),
        canActivate: [AuthGuard],
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      { path: '**', redirectTo: 'login' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }