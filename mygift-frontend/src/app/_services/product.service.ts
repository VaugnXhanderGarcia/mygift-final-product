import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const API_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : 'https://mygift-backend.onrender.com';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<any[]>(`${API_URL}/products`);
  }

  getAvailable() {
    return this.http.get<any[]>(`${API_URL}/products/available`);
  }

  create(product: any) {
    return this.http.post<any>(`${API_URL}/products`, product);
  }

  update(id: number, product: any) {
    return this.http.put<any>(`${API_URL}/products/${id}`, product);
  }

  updateAvailability(id: number, isAvailable: boolean) {
    return this.http.patch<any>(`${API_URL}/products/${id}/availability`, {
      isAvailable
    });
  }

  delete(id: number) {
    return this.http.delete<any>(`${API_URL}/products/${id}`);
  }
}