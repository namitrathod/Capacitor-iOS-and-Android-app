import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Product, ProductService } from '../../product/product.service';
import { UserService, UsersPage } from '../../../base/service/user.service';
import { SalesService } from '../sales.service';

@Component({
  selector: 'app-sales-add',
  templateUrl: './sales-add.component.html',
})
export class SalesAddComponent implements OnInit {
  user_id: number | null = null;
  product_id: number | null = null;
  quantity = 1;
  price = 0;
  users: { id: number; email: string }[] = [];
  products: Product[] = [];
  error = '';

  constructor(
    private readonly salesService: SalesService,
    private readonly productService: ProductService,
    private readonly userService: UserService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.userService.getUsers(0, 100).subscribe({
      next: (p: UsersPage) => {
        this.users = p.data.map((u) => ({ id: u.id, email: u.email }));
        if (this.users.length && this.user_id == null) this.user_id = this.users[0].id;
      },
    });
    this.productService.getProducts().subscribe({
      next: (p) => {
        this.products = p.data;
        if (this.products.length && this.product_id == null) this.product_id = this.products[0].id;
      },
    });
  }

  submit(): void {
    this.error = '';
    if (this.user_id == null || this.product_id == null) {
      this.error = 'User and Product are required';
      return;
    }
    if (this.quantity < 1 || this.price < 0) {
      this.error = 'Quantity must be ≥ 1 and Price ≥ 0';
      return;
    }
    this.salesService
      .createSale({
        user_id: this.user_id,
        product_id: this.product_id,
        quantity: this.quantity,
        price: this.price,
      })
      .subscribe({
        next: () => this.router.navigate(['/sales']),
        error: (err) => (this.error = err.error?.detail || 'Failed to create sale'),
      });
  }

  cancel(): void {
    this.router.navigate(['/sales']);
  }
}
