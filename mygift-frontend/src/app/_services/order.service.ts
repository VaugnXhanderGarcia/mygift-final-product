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

  updateStatus(
    id: number,
    status: string,
    preparedItemIds: number[] = [],
    bypassChecklist: boolean = false
  ) {
    return this.http.put<any>(`${API_URL}/orders/${id}/status`, {
      status,
      preparedItemIds,
      bypassChecklist
    });
  }

  addOrderItem(orderId: number, item: any) {
    return this.http.post<any>(`${API_URL}/orders/${orderId}/items`, item);
  }

  updateOrderItem(orderId: number, itemId: number, item: any) {
    return this.http.put<any>(
      `${API_URL}/orders/${orderId}/items/${itemId}`,
      item
    );
  }

  cancelOrderItem(orderId: number, itemId: number) {
    return this.http.patch<any>(
      `${API_URL}/orders/${orderId}/items/${itemId}/cancel`,
      {}
    );
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