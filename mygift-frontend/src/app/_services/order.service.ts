import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const API_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : 'https://mygift-backend.onrender.com';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(private http: HttpClient) {}

  createPublic(order: any) {
    return this.http.post<any>(`${API_URL}/orders/public`, order);
  }

  getAll() {
    return this.http.get<any[]>(`${API_URL}/orders`);
  }

  updateStatus(id: number, status: string) {
    return this.http.put<any>(`${API_URL}/orders/${id}/status`, {
      status
    });
  }

  trackByReference(orderCode: string, customerName: string) {
    return this.http.get<any>(
      `${API_URL}/orders/track/${encodeURIComponent(orderCode)}?customerName=${encodeURIComponent(customerName)}`
    );
  }

  trackByName(customerName: string) {
    return this.http.get<any>(
      `${API_URL}/orders/track-by-name?customerName=${encodeURIComponent(customerName)}`
    );
  }
}