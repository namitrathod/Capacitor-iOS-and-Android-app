import { FormBuilder, FormGroup } from '@angular/forms';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { FormField } from 'src/app/web/component/base/form/interface/form-field.interface';
import { UserService, UsersPage } from '../../service/user.service';
import { TableColumn } from 'src/app/web/component/base/mat-custom-table/models/tableColumn';
import { TableConsts } from 'src/app/web/component/base/mat-custom-table/consts/table';
import { TableButtonAction } from 'src/app/web/component/base/mat-custom-table/models/tableButtonAction';
import { User } from 'src/app/models/user';

@Component({
  selector: 'app-user-table',
  templateUrl: './user-table.component.html',
  styleUrls: ['./user-table.component.sass'],
})
export class UserTableComponent implements OnInit{
  @Input() data: FormField[] = [];

  userList: User[] = [];

  tableColumns: TableColumn[] = [
    { columnDef: 'id', header: 'id'},
    { columnDef: 'full_name',    header: 'Name' },
    { columnDef: 'email', header: 'Email'},
  ];

  selectedRecordData: any;
  selectedRecordForm: FormGroup;
  showFormView: boolean = false;
  isAddMode: boolean = false;
  userId: number | undefined;
  createError = '';
  createEmail = '';
  createPassword = '';
  createFullName = '';
  loading = false;

  selectedRecordFields: FormField[] = [
    { key: 'id', label: 'id', type: 'text', required: true },
    { key: 'full_name', label: 'Name', type: 'text', required: true },
    { key: 'email', label: 'email', type: 'email', required: true },
  ];

  formFields: FormlyFieldConfig[] = [];
  ////////////////////////////////////////////

  constructor(
    private userService: UserService,
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.selectedRecordForm = this.formBuilder.group({});
    this.getUsers();
    console.log('UserTableComponent', this.userList);
  }

  /** Exposed for template (avoids TS2341 when route is private). */
  get hasChildRoute(): boolean {
    return !!this.route?.firstChild;
  }

  ngOnInit(): void {
    console.log('UserTableComponent ngOnInit');
    this.getUsers();
    console.log('UserTableComponent', this.userList);
    this.route.url.subscribe((urlSegments) => {
      this.isAddMode = urlSegments.some((segment) => segment.path === 'add');
      this.showFormView =
        this.isAddMode || urlSegments.some((segment) => segment.path === 'edit');
    });

    this.route.params.subscribe((params) => {
      this.userId = +params['id'];
      this.getUsers();
    });
    this.formFields = this.generateFormlyFields();
  }

  getUsers() {
    this.loading = true;
    this.userService.getUsers(0, 100).subscribe({
      next: (page: UsersPage) => {
        this.userList = page.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onCreate(): void {
    this.router.navigate(['/user/add']);
  }

  onViewRecord(record: any) {
    const userId = record.id;
    this.router.navigate(['/user/edit', userId]);
  }

  onFormSubmit(formData: any) {
    // Lógica para manejar la submisión del formulario
  }

  onCreateUserSubmit(): void {
    this.createError = '';
    if (!this.createEmail.trim()) {
      this.createError = 'Email is required';
      return;
    }
    if (!this.createPassword) {
      this.createError = 'Password is required';
      return;
    }
    this.userService
      .createUser({
        email: this.createEmail.trim(),
        password: this.createPassword,
        full_name: this.createFullName.trim() || null,
      })
      .subscribe({
        next: () => {
          this.getUsers();
          this.router.navigate(['/user']);
        },
        error: (err) =>
          (this.createError = err.error?.detail || 'Failed to create user'),
      });
  }

  cancelCreate(): void {
    this.router.navigate(['/user']);
  }

  onRowAction(row: any) {
    console.log('Row action:', row);
  }

  generateFormlyFields(): any[] {
    const formlyFields: any[] = [];
    let fieldGroup: any[] = [];

    // Itera sobre las columnas de la tabla
    this.tableColumns.forEach((column, index) => {
      // Crea un campo de ngx-formly para cada columna
      const field = {
        key: column.columnDef, // Usa el dataKey como clave del campo
        type: 'input', // Tipo de campo, puedes personalizar según tus necesidades
        className: index % 2 === 0 ? 'col-6' : 'col-6', // Alterna entre columnas de 6 y 3 basado en el índice
        templateOptions: {
          label: column.header, // Nombre de la columna como etiqueta del campo
          placeholder: column.header, // Nombre de la columna como marcador de posición del campo
          required: false, // Puedes definir la propiedad requerida según tus necesidades
        },
      };

      // Agrega el campo al array de campos de ngx-formly
      fieldGroup.push(field);

      // Si es el último elemento de la fila o el último elemento en general, agrupa los campos en una fila
      if ((index + 1) % 2 === 0 || index === this.tableColumns.length - 1) {
        formlyFields.push({
          fieldGroupClassName: 'row',
          fieldGroup: [...fieldGroup],
        });
        // Reinicia el grupo de campos
        fieldGroup = [];
      }
    });

    return formlyFields;
  }

  generateFormlyFields2(): any[] {
    const formlyFields: any[] = [];

    // Itera sobre las columnas de la tabla
    this.tableColumns.forEach((column) => {
      // Crea un campo de ngx-formly para cada columna
      const field = {
        key: column.columnDef, // Usa el dataKey como clave del campo
        type: 'input', // Tipo de campo, puedes personalizar según tus necesidades
        templateOptions: {
          label: column.header, // Nombre de la columna como etiqueta del campo
          placeholder: column.header, // Nombre de la columna como marcador de posición del campo
          required: false, // Puedes definir la propiedad requerida según tus necesidades
        },
      };

      // Agrega el campo al array de campos de ngx-formly
      formlyFields.push(field);
    });

    return formlyFields;
  }

  onTableAction(event: TableButtonAction) {
    if (!event || !event.name) {
      return;
    }

    if (event.name === TableConsts.actionButton.delete && event.value?.id != null) {
      const id = event.value.id;
      if (confirm(`Are you sure you want to delete user with id ${id}?`)) {
        this.userService.deleteUser(id).subscribe({
          next: () => this.getUsers(),
          error: (err) => console.error('Error deleting user', err),
        });
      }
      return;
    }

    if (event.name === TableConsts.actionButton.view && event.value?.id != null) {
      const userId = event.value.id;
      this.router.navigate(['/user/edit', userId]);
      return;
    }

    if (event.name === TableConsts.actionButton.edit && event.value?.id != null) {
      const userId = event.value.id;
      this.router.navigate(['/user/edit', userId]);
    }
  }
}
