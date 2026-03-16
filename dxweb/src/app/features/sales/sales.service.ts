import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Sale {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  price: number;
}

export interface SalesPage {
  data: Sale[];
  count: number;
}

@Injectable({
  providedIn: 'root',
})
export class SalesService {
  private apiUrl = 'http://10.0.0.155:8000/api/v1/sales';

  constructor(private readonly http: HttpClient) {}

  getSales(): Observable<SalesPage> {
    return this.http.get<SalesPage>(this.apiUrl);
  }

  createSale(sale: Partial<Sale>): Observable<Sale> {
    return this.http.post<Sale>(this.apiUrl + '/', {
      user_id: sale.user_id,
      product_id: sale.product_id,
      quantity: sale.quantity,
      price: sale.price,
    });
  }
}

