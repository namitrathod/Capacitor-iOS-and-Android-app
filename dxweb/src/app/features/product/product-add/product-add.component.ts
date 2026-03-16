import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ProductService } from '../product.service';

@Component({
  selector: 'app-product-add',
  templateUrl: './product-add.component.html',
})
export class ProductAddComponent {
  title = '';
  description = '';
  error = '';

  constructor(
    private readonly productService: ProductService,
    private readonly router: Router
  ) {}

  submit(): void {
    this.error = '';
    if (!this.title.trim()) {
      this.error = 'Title is required';
      return;
    }
    this.productService
      .createProduct({ title: this.title.trim(), description: this.description.trim() || undefined })
      .subscribe({
        next: () => this.router.navigate(['/products']),
        error: (err) => (this.error = err.error?.detail || 'Failed to create product'),
      });
  }

  cancel(): void {
    this.router.navigate(['/products']);
  }
}
