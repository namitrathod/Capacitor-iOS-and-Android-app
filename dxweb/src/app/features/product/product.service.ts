import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Product {
  id: number;
  title: string;
  description?: string | null;
}

export interface ProductsPage {
  data: Product[];
  count: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = 'http://10.0.0.155:8000/api/v1/items';

  constructor(private readonly http: HttpClient) {}

  getProducts(skip = 0, limit = 100): Observable<ProductsPage> {
    return this.http.get<ProductsPage>(`${this.apiUrl}/?skip=${skip}&limit=${limit}`);
  }

  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.apiUrl + '/', {
      title: product.title,
      description: product.description ?? null,
    });
  }
}

