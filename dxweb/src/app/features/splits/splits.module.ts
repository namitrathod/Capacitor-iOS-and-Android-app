import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MaterialModule } from 'src/app/share/material.module';
import { GroupListComponent } from './group-list/group-list.component';
import { GroupDetailComponent } from './group-detail/group-detail.component';
import { GroupCreateComponent } from './group-create/group-create.component';
import { AddExpenseDialogComponent } from './group-detail/add-expense-dialog/add-expense-dialog.component';
import { SettleUpDialogComponent } from './group-detail/settle-up-dialog/settle-up-dialog.component';
import { LeaveGroupDialogComponent } from './group-detail/leave-group-dialog.component';

const routes: Routes = [
  { path: '', component: GroupListComponent },
  { path: 'new', component: GroupCreateComponent },
  { path: ':id', component: GroupDetailComponent },
];

@NgModule({
  declarations: [
    GroupListComponent,
    GroupDetailComponent,
    GroupCreateComponent,
    AddExpenseDialogComponent,
    SettleUpDialogComponent,
    LeaveGroupDialogComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    RouterModule.forChild(routes),
  ],
})
export class SplitsModule {}
